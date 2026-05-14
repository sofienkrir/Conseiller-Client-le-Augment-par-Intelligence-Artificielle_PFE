# api/routes.py

from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import sys
import os
import json
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient, DESCENDING
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks

from .clients import (
    list_clients,
    get_client_details,
    generate_client_synthesis,
    get_clients_stats,
)

load_dotenv()

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chatbot import answer_question, setup_rag, detect_category_and_rewrite, \
                    retrieve_docs, dedupe_docs, get_llm
from .gemini_model import get_gemini_response, gemini_model as gemini_available
from .auth_routes import get_current_user_dependency
from .chat_history import ChatHistory

from .pdf_upload import (
    ingest_pdf,
    search_in_uploaded_pdf,
    delete_session_collection,
    cleanup_old_uploads,
    UPLOAD_DIR,
) 

from .pdf_shared import (
    ingest_shared_pdf,
    list_shared_pdfs_for_user,
    list_all_shared_pdfs,
    search_in_shared_pdf,
    delete_shared_pdf,
    update_shared_with,
)
from .auth_db import AuthDB
from .auth_routes import get_current_admin_dependency
from .evaluation import compute_auto_score, save_evaluation
from .llm_judge import evaluate_and_save

# MongoDB collections for admin queries
_mongo_client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
_db = _mongo_client["attijari_chatbot"]
_users_col = _db["users"]
_conv_col  = _db["conversations"]

router = APIRouter()

print("🚀 Loading RAG pipeline...")
vectorstore, valid_categories = setup_rag()
print("✅ RAG pipeline loaded!")

if gemini_available is not None:
    print("✅ Gemini model loaded successfully!")
else:
    print("⚠️ Gemini model not available, will use Groq only")


# ── Models ──

class ChatRequest(BaseModel):
    message: str
    history: list = []
    segment: str = "particulier"
    language: str = "auto"
    dataset: str = "particulier"
    pdf_session_id: Optional[str] = None  # Session PDF uploadé
    shared_pdf_id: Optional[str] = None
    client_id: Optional[str] = None
    conversation_id: Optional[str] = None
class HistorySaveRequest(BaseModel):
    messages: list


class HistoryUpdateRequest(BaseModel):
    messages: list


def build_sources(docs: list) -> list[dict]:
    """Build deduplicated sources list from docs."""
    sources = []
    seen_urls = set()
    for d in docs:
        title = d.metadata.get("title") or d.metadata.get("titre", "Unknown")
        url = d.metadata.get("url", "#")
        if url not in seen_urls:
            seen_urls.add(url)
            sources.append({"title": title, "url": url})
    return sources


# ═══════════════════════════════════════
# Chat Endpoint (SSE Streaming)
# ═══════════════════════════════════════

@router.post("/chat")
async def chat(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user_dependency)
):
    lang = "derja" if request.language == "derja" else "french"

    try:
        print(f"📨 User '{current_user['email']}' asked: {request.message}")
        print(f"🌐 Language mode: {lang}")

        # ━━━ Charger le contexte client si fourni (admin only) ━━━
        client_context = ""
        if request.client_id and current_user.get("is_admin", False):
            from .clients import get_client_details, format_client_for_llm
            client_data = get_client_details(request.client_id)
            if client_data:
                client_context = format_client_for_llm(client_data)
                print(f"👤 Client context: {client_data.get('prenom')} {client_data.get('nom')}")

        if request.pdf_session_id:
            print(f"📄 PDF session: {request.pdf_session_id}")

        # ━━━ NOUVEAU: Recherche dans le PDF uploadé si session fournie ━━━
        pdf_docs = []
        if request.pdf_session_id:
            pdf_docs = search_in_uploaded_pdf(
                user_id=current_user["id"],
                session_id=request.pdf_session_id,
                query=request.message,
                k=5,
            )
            print(f"📄 PDF docs retrieved: {len(pdf_docs)}")
        elif request.shared_pdf_id:
            pdf_docs = search_in_shared_pdf(
                pdf_id=request.shared_pdf_id,
                user_id=current_user["id"],
                query=request.message,
                k=5,
            )
            print(f"📄 Shared PDF docs retrieved: {len(pdf_docs)}")

        answer = None
        sources = []
        category = "unknown"
        model_used = None
        raw_docs = []

        # ━━━ Si le user a uploadé un PDF, on utilise UNIQUEMENT le PDF ━━━
        if pdf_docs:
            from chatbot import format_docs, PROMPT_DERJA, PROMPT_FRENCH
            from langchain_core.output_parsers import StrOutputParser
            from langchain_core.runnables import RunnablePassthrough

            active_llm = get_llm(lang)
            active_prompt = PROMPT_DERJA if lang == "derja" else PROMPT_FRENCH

            chain = (
                {"context": (lambda _q: format_docs(pdf_docs)), "question": RunnablePassthrough()}
                | active_prompt
                | active_llm
                | StrOutputParser()
            )
            answer = chain.invoke(request.message)
            raw_docs = pdf_docs
            model_used = f"groq_pdf_{lang}"

            # Build sources depuis le PDF (page + file)
            sources = []
            seen = set()
            for d in pdf_docs:
                key = f"{d.metadata.get('file_name')}_p{d.metadata.get('page')}"
                if key not in seen:
                    seen.add(key)
                    sources.append({
                        "title": f"{d.metadata.get('file_name', 'PDF')} — page {d.metadata.get('page', '?')}",
                        "url": "#pdf",
                    })
            print(f"✅ PDF-based answer ready ({model_used})")

        # ━━━ Sinon, flow normal (Gemini ou Groq RAG) ━━━
        else:
            if gemini_available is not None and lang == "french":
                print("🤖 Trying Gemini model...")
                french_llm = get_llm("french")
                ds = request.dataset
                if ds == "professionnel":
                    category, q2 = "professionnel", request.message
                else:
                    cats = [c for c in valid_categories if c != "professionnel"]
                    category, q2 = detect_category_and_rewrite(
                        french_llm, request.message, cats, vectorstore
                    )
                docs1 = retrieve_docs(vectorstore, request.message, category, k=5, dataset=ds)
                docs2 = retrieve_docs(vectorstore, q2, category, k=5, dataset=ds)
                gemini_docs = dedupe_docs(docs1 + docs2)[:6]

                context = ""
                for d in gemini_docs:
                    titre = d.metadata.get("titre") or d.metadata.get("title") or ""
                    context += (f"[{titre}]\n" if titre else "") + d.page_content[:1000] + "\n\n"

                gemini_answer = get_gemini_response(request.message, context)
                if gemini_answer:
                    print("✅ Gemini response generated")
                    answer = gemini_answer
                    model_used = "gemini"
                    sources = build_sources(gemini_docs)
                    raw_docs = gemini_docs
                else:
                    print("⚠️ Gemini failed, falling back to RAG")

            if answer is None:
                model_used = "groq_derja" if lang == "derja" else "groq"
                print(f"🤖 Using {model_used} model...")

                # Si contexte client → prompt enrichi
                if client_context:
                    #from chatbot import get_llm, retrieve_docs, format_docs
                    from langchain_core.prompts import ChatPromptTemplate
                    from langchain_core.output_parsers import StrOutputParser

                    docs = retrieve_docs(vectorstore, request.message, None, k=5, dataset=request.dataset)
                    rag_context = format_docs(docs) if docs else "Aucun produit pertinent."

                    enhanced_prompt = ChatPromptTemplate.from_template(
                        "Tu es un assistant pour un conseiller bancaire Attijari Bank Tunisie.\n"
                        "Le conseiller prépare/gère un RDV avec un client spécifique.\n"
                        "Utilise les DONNÉES DU CLIENT + le CATALOGUE ATTIJARI pour répondre.\n"
                        "Sois PRÉCIS (montants exacts), PERSONNALISÉ (selon le profil), CONCIS.\n\n"
                        "👤 DONNÉES DU CLIENT:\n{client_data}\n\n"
                        "📦 PRODUITS ATTIJARI:\n{products_catalog}\n\n"
                        "Question du conseiller: {question}\n\n"
                        "Réponse:"
                    )

                    chain = enhanced_prompt | get_llm(lang) | StrOutputParser()
                    answer = chain.invoke({
                        "client_data": client_context,
                        "products_catalog": rag_context,
                        "question": request.message,
                    })
                    sources = build_sources(docs) if docs else []
                    raw_docs = docs or []
                    model_used = f"groq_client_{lang}"
                else:
                    # Flow normal
                    answer, rag_docs, category, q2, latency, _eval_id_internal, _auto_score_internal = answer_question(
                        vectorstore, valid_categories, request.message, lang,
                        dataset=request.dataset
                    )
                    sources = build_sources(rag_docs)
                    raw_docs = rag_docs or []

            print(f"✅ Answer ready ({model_used})")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

    # ── Scoring automatique ──────────────────────────────────
    retrieved_sources = [
        {"content": d.page_content, "metadata": d.metadata}
        for d in raw_docs
    ]
    auto_score = compute_auto_score(
        question=request.message,
        answer=answer or "",
        retrieved_sources=retrieved_sources,
        used_sources=retrieved_sources,
    )
    eval_id = save_evaluation(
        conversation_id=request.conversation_id or "",
        user_id=current_user["id"],
        question=request.message,
        answer=answer or "",
        auto_score=auto_score,
        retrieved_sources=retrieved_sources,
        used_sources=retrieved_sources,
        category=category,
        language=lang,
    )
    background_tasks.add_task(
        evaluate_and_save,
        eval_id=eval_id,
        question=request.message,
        answer=answer or "",
        sources=retrieved_sources,
    )
    # ────────────────────────────────────────────────────────

    # SSE streaming
    async def event_stream():
        yield f"data: {json.dumps({'type': 'meta', 'sources': sources, 'eval_id': eval_id, 'auto_score': auto_score})}\n\n"
        words = answer.split(" ")
        for i, word in enumerate(words):
            text = word if i == 0 else " " + word
            yield f"data: {json.dumps({'type': 'token', 'text': text})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )


# ═══════════════════════════════════════
# PDF Upload Endpoints
# ═══════════════════════════════════════

@router.post("/upload_pdf")
async def upload_pdf(
    pdf: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_dependency),
):
    """
    Upload un PDF et l'ingère dans ChromaDB (collection par session).
    Retourne un session_id à utiliser dans les questions suivantes.
    """
    if not pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Le fichier doit être un PDF.")

    MAX_SIZE = 20 * 1024 * 1024
    content = await pdf.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="PDF trop volumineux (max 20 MB).")

    session_id = f"{current_user['id']}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"

    file_path = UPLOAD_DIR / f"{session_id}_{pdf.filename}"
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        result = ingest_pdf(
            file_path=str(file_path),
            user_id=current_user["id"],
            session_id=session_id,
            original_file_name=pdf.filename,
        )
        cleanup_old_uploads()
        return {
            "ok": True,
            "pdf_session_id": session_id,
            "file_name": result["file_name"],
            "num_pages": result["num_pages"],
            "num_chunks": result["num_chunks"],
            "message": f"PDF '{result['file_name']}' ingéré avec succès ({result['num_pages']} pages).",
        }
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        print(f"❌ PDF ingestion error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur d'ingestion: {str(e)}")


@router.delete("/upload_pdf/{pdf_session_id}")
async def delete_uploaded_pdf(
    pdf_session_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Supprime un PDF uploadé et sa collection ChromaDB."""
    success = delete_session_collection(current_user["id"], pdf_session_id)
    if not success:
        raise HTTPException(status_code=404, detail="PDF session non trouvée.")
    return {"ok": True, "message": "PDF supprimé."}


# ═══════════════════════════════════════
# History Endpoints (for new frontend)
# ═══════════════════════════════════════

@router.get("/history/list")
async def history_list(current_user: dict = Depends(get_current_user_dependency)):
    try:
        sessions = ChatHistory.get_user_sessions(current_user["id"])
        conversations = [
            {
                "id": s["session_id"],
                "title": s["session_name"],
                "updated_at": s["updated_at"].isoformat() if hasattr(s["updated_at"], "isoformat") else str(s["updated_at"]),
                "message_count": s["messages_count"],
            }
            for s in sessions
        ]
        return {"conversations": conversations}
    except Exception as e:
        print(f"❌ Error listing history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{conv_id}")
async def history_get(conv_id: str, current_user: dict = Depends(get_current_user_dependency)):
    try:
        raw = ChatHistory.get_session_messages(conv_id)
        messages = [
            {
                "role": m["role"],
                "content": m["content"],
                "sources": m.get("sources", []),
            }
            for m in raw
        ]
        return {"messages": messages}
    except Exception as e:
        print(f"❌ Error fetching conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history/{conv_id}")
async def history_delete(conv_id: str, current_user: dict = Depends(get_current_user_dependency)):
    try:
        ChatHistory.delete_session(conv_id)
        return {"ok": True}
    except Exception as e:
        print(f"❌ Error deleting conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/history/save")
async def history_save(req: HistorySaveRequest, current_user: dict = Depends(get_current_user_dependency)):
    try:
        first_user_msg = next(
            (m["content"] for m in req.messages if m.get("role") == "user"), "Conversation"
        )
        title = first_user_msg[:50] + "..." if len(first_user_msg) > 50 else first_user_msg

        new_session = ChatHistory.create_session(
            user_id=current_user["id"],
            user_info=current_user,
            session_name=title
        )
        session_id = new_session["session_id"]

        ChatHistory.replace_messages(session_id, req.messages)

        return {"id": session_id}
    except Exception as e:
        print(f"❌ Error saving conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/history/update/{conv_id}")
async def history_update(
    conv_id: str,
    req: HistoryUpdateRequest,
    current_user: dict = Depends(get_current_user_dependency)
):
    try:
        ChatHistory.replace_messages(conv_id, req.messages)
        return {"ok": True}
    except Exception as e:
        print(f"❌ Error updating conversation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "rag_loaded": True,
        "gemini_loaded": gemini_available is not None,
        "groq_available": True,
        "chat_history_enabled": True,
        "pdf_upload_enabled": True,  # ← NOUVEAU
    }


# ═══════════════════════════════════════
# Shared PDF Endpoints
# ═══════════════════════════════════════

@router.post("/admin/upload_shared_pdf")
async def admin_upload_shared_pdf(
    pdf: UploadFile = File(...),
    shared_with: str = Form(...),
    description: str = Form(""),
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """
    Admin upload un PDF et le partage avec des users spécifiques.
    
    - `pdf`: fichier PDF
    - `shared_with`: soit JSON array '["id1","id2"]', soit liste séparée par virgules 'id1,id2', soit un seul ID 'id1'
    - `description`: description optionnelle
    """
    if not pdf.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Le fichier doit être un PDF.")

    MAX_SIZE = 30 * 1024 * 1024
    content = await pdf.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="PDF trop volumineux (max 30 MB).")

    # Parse shared_with — accepte plusieurs formats
    user_ids = []
    shared_with = shared_with.strip()
    
    try:
        # Essayer JSON d'abord
        parsed = json.loads(shared_with)
        if isinstance(parsed, list):
            user_ids = [str(x).strip() for x in parsed if str(x).strip()]
        else:
            user_ids = [str(parsed).strip()]
    except json.JSONDecodeError:
        # Fallback: traiter comme string simple ou liste séparée par virgules
        user_ids = [x.strip() for x in shared_with.split(",") if x.strip()]
    
    if not user_ids:
        raise HTTPException(status_code=400, detail="Sélectionnez au moins un utilisateur.")

    # Sauvegarder temporairement
    from .pdf_shared import SHARED_UPLOAD_DIR
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    file_path = SHARED_UPLOAD_DIR / f"{timestamp}_{pdf.filename}"
    with open(file_path, "wb") as f:
        f.write(content)

    try:
        result = ingest_shared_pdf(
            file_path=str(file_path),
            original_file_name=pdf.filename,
            uploaded_by_id=current_admin["id"],
            uploaded_by_name=f"{current_admin.get('prenom', '')} {current_admin.get('nom', '')}".strip() or "Admin",
            shared_with=user_ids,
            description=description,
        )
        return {
            "ok": True,
            **result,
            "message": f"PDF partagé avec {result['shared_with_count']} utilisateur(s).",
        }
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        print(f"❌ Shared PDF error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur d'ingestion: {str(e)}")

@router.get("/shared_pdfs")
async def get_shared_pdfs(
    current_user: dict = Depends(get_current_user_dependency),
):
    """Retourne les PDFs partagés avec ce user + indicateur is_new."""
    pdfs = list_shared_pdfs_for_user(user_id=current_user["id"])
    return {"pdfs": pdfs, "count": len(pdfs)}


@router.post("/shared_pdfs/{pdf_id}/mark_viewed")
async def mark_shared_pdf_viewed(
    pdf_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Marquer un PDF partagé comme vu par le user courant."""
    from .pdf_shared import mark_pdf_as_viewed
    success = mark_pdf_as_viewed(pdf_id, current_user["id"])
    return {"ok": success}


@router.get("/shared_pdfs/unread_count")
async def get_unread_pdfs_count(
    current_user: dict = Depends(get_current_user_dependency),
):
    """Retourne le nombre de PDFs partagés non lus."""
    from .pdf_shared import count_unread_pdfs_for_user
    count = count_unread_pdfs_for_user(current_user["id"])
    return {"unread_count": count}


@router.get("/admin/shared_pdfs")
async def admin_list_shared_pdfs(
    current_user: dict = Depends(get_current_admin_dependency),
):
    """Admin: Liste tous les PDFs partagés."""
    pdfs = list_all_shared_pdfs()
    return {"pdfs": pdfs}


@router.delete("/admin/shared_pdfs/{pdf_id}")
async def admin_delete_shared_pdf(
    pdf_id: str,
    current_user: dict = Depends(get_current_admin_dependency),
):
    """Admin: Supprime un PDF partagé et sa collection ChromaDB."""
    success = delete_shared_pdf(pdf_id)
    if not success:
        raise HTTPException(status_code=404, detail="PDF partagé non trouvé.")
    return {"ok": True, "message": "PDF partagé supprimé."}


@router.put("/admin/shared_pdfs/{pdf_id}/share")
async def admin_update_shared_pdf_sharing(
    pdf_id: str,
    shared_with: str = Form(...),
    current_user: dict = Depends(get_current_admin_dependency),
):
    """Admin: Met à jour le partage d'un PDF partagé."""
    success = update_shared_with(pdf_id, shared_with)
    if not success:
        raise HTTPException(status_code=404, detail="PDF partagé non trouvé.")
    return {"ok": True, "message": f"Partage mis à jour: {shared_with}"}


@router.get("/admin/users_list")
async def admin_users_list(
    current_user: dict = Depends(get_current_admin_dependency),
):
    """Admin: Liste tous les utilisateurs (pour sélection partage PDF)."""
    try:
        users = []
        for u in _users_col.find({}, {"_id": 1, "nom": 1, "prenom": 1, "email": 1, "segment": 1}):
            users.append({
                "id": str(u["_id"]),
                "nom": u.get("nom", ""),
                "prenom": u.get("prenom", ""),
                "email": u.get("email", ""),
                "segment": u.get("segment", ""),
            })
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════
# Clients Endpoints (Admin only)
# ═══════════════════════════════════════

@router.get("/admin/clients")
async def admin_list_clients(
    search: str = "",
    segment: str = None,
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """Liste les clients avec filtre recherche/segment (admin only)."""
    try:
        clients = list_clients(search=search, segment=segment)
        stats = get_clients_stats()
        return {
            "clients": clients,
            "total": len(clients),
            "stats": stats,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/clients/{client_id}")
async def admin_get_client(
    client_id: str,
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """Récupère les détails complets d'un client (admin only)."""
    client = get_client_details(client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé.")
    return client


@router.post("/admin/clients/{client_id}/synthesis")
async def admin_generate_synthesis(
    client_id: str,
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """
    Génère une synthèse RDV pour ce client via Groq LLaMA.
    Retourne une fiche de préparation structurée.
    """
    result = generate_client_synthesis(client_id)
    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])
    return result


# ═══════════════════════════════════════
# Admin Endpoints
# ═══════════════════════════════════════

@router.get("/admin/stats")
async def admin_stats(current_user: dict = Depends(get_current_user_dependency)):
    try:
        total_users = _users_col.count_documents({})
        total_conversations = _conv_col.count_documents({})
        total_messages = sum(
            len(c.get("messages", []))
            for c in _conv_col.find({}, {"messages": 1})
        )
        return {
            "total_users": total_users,
            "total_conversations": total_conversations,
            "total_messages": total_messages,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/users")
async def admin_users(current_user: dict = Depends(get_current_user_dependency)):
    try:
        users = []
        for u in _users_col.find({}).sort("created_at", DESCENDING):
            uid = str(u["_id"])
            users.append({
                "id": uid,
                "nom": u.get("nom", ""),
                "prenom": u.get("prenom", ""),
                "email": u.get("email", ""),
                "telephone": u.get("telephone"),
                "segment": u.get("segment"),
                "created_at": u.get("created_at").isoformat() if isinstance(u.get("created_at"), datetime) else None,
            })
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, current_user: dict = Depends(get_current_user_dependency)):
    try:
        _users_col.delete_one({"_id": ObjectId(user_id)})
        _conv_col.delete_many({"user_id": user_id})
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/users/{user_id}/stats")
async def admin_user_stats(user_id: str, current_user: dict = Depends(get_current_user_dependency)):
    try:
        conversations = list(_conv_col.find({"user_id": user_id}, {"messages": 1}))
        total_conversations = len(conversations)
        total_messages = sum(len(c.get("messages", [])) for c in conversations)
        return {
            "total_conversations": total_conversations,
            "total_messages": total_messages,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════
# Transcription Endpoint (stub)
# ═══════════════════════════════════════

@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_dependency)
):
    """Audio transcription endpoint — returns 501 if no transcription model is configured."""
    raise HTTPException(
        status_code=501,
        detail="Transcription non disponible. Configurez Whisper API pour activer cette fonctionnalité."
    )
