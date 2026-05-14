"""
chatbot.py
À placer à la RACINE du projet: D:\\attijari-chatbot\\chatbot.py

Ce fichier est importé par api/clients.py via "from chatbot import get_llm"
donc imports ABSOLUS (api.evaluation, pas .evaluation)
"""

from __future__ import annotations

import time
import re
import os
import asyncio

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.documents import Document

# ═══════════════════════════════════════════════════════
# ✨ IMPORTS ABSOLUS — Module Évaluation (situé dans api/)
# ═══════════════════════════════════════════════════════
from api.evaluation import compute_auto_score, save_evaluation
from api.llm_judge import evaluate_and_save


HAS_GPU = False
_model_cache: dict = {}


# ─────────────────────────────────────────────
# Lazy LLM loader
# ─────────────────────────────────────────────
def get_llm(language: str):
    if language not in ("french", "derja"):
        language = "french"

    key = f"llm_{language}"
    if key in _model_cache:
        return _model_cache[key]

    temperature = 0.3 if language == "derja" else 0.1

    llm = ChatOpenAI(
        model="llama-3.3-70b-versatile",
        temperature=temperature,
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1",
        timeout=60,
    )
    _model_cache[key] = llm
    print(f"[INFO] ✅ Groq LLM ready for language: {language}")
    return llm


# ─────────────────────────────────────────────
# Prompts (INCHANGÉS)
# ─────────────────────────────────────────────
PROMPT_FRENCH = PromptTemplate.from_template("""Tu es un conseiller bancaire officiel d'Attijari Bank Tunisie.

RÈGLES ABSOLUES :
1. Réponds à la question de façon COMPLÈTE et DÉTAILLÉE. N'omets aucune information disponible dans le contexte.
2. Utilise EXCLUSIVEMENT les informations du contexte. N'invente rien.
3. Si l'information est absente : "Cette information n'est pas disponible. Appelez le 71 111 345."
4. Si plusieurs produits ou options correspondent, liste-les TOUS avec leurs détails (montants, taux, conditions, avantages…).
5. Structure ta réponse clairement : utilise des tirets ou des points pour les listes, et des sauts de ligne entre les produits.
6. IMPORTANT: Réponds TOUJOURS en français, peu importe la langue de la question.
7. Termine toujours par : "Pour plus d'informations, appelez le 71 111 345."

CONTEXTE :
{context}

QUESTION : {question}

RÉPONSE EN FRANÇAIS :""")


PROMPT_DERJA = PromptTemplate.from_template("""Enta moustachaar bancaire mou7tarif mte3 Attijari Bank Tounès. Mehmtek: t3awen el client b ma3louma sahiha w mfhouma, b style rasmi w mou7taram, kima moustachaar fi agence haqiqiyya.

STYLE mte3ek:
- Ta7ki tounsi franco (darija khafifa + les termes bancaires bel français)
- El banking terms (virement, crédit, RIB, solde, plafond, taux, compte, carte, agence) khallihom bel français
- Uslob mou7taram w rasmi, mais wadheh w mfhoum — kima conseiller fi banque mch kima sa7eb
- Évite el klem el familier: "enti", "enta", "sa7bi", "ya khou", "t7eb", "ta7ki" — yetbe3doum 3al style mte3 conseiller bancaire

QWA3ED LINGUISTIQUES IMPORTANT:
1. Ibda el réponse direct b el ma3louma walla b "Attijari Bank twafer..." — mat9oulch "Enti..." walla "Enta..."
2. Ist3mel el style impersonnel walla 3ème personne ki tnajjem
3. Ki lazem tkhatib el client direct, ist3mel "votre" / "vos" bel français walla formule mou7taramah
4. Évite el verbes el familiers

QWA3ED FONCTIONNELLES:
1. Jaweb direct 3al so2el. Matzidch ma3loumet zeyda manhoumch mat9oulou.
2. Istefed BAS mel contexte (bel français). Traducih bel tounsi franco rasmi.
3. Ken el ma3louma manhouch fil contexte: "Asef, hadhi el ma3louma matahtech fi base mte3i. Nansa7kom tatasslou b moustachaar Attijari 3al 71 111 345 walla trou7ou l agence el 9rib."
4. Jaweb structuré b bullets w **gras** 3al asma' el produits.
5. Khtim DIMA b: "Ken bich tafsil akther, el équipe Attijari fi khidmetkom 3al 71 111 345."

---

Contexte (bel français — traducih bel tounsi franco rasmi):
{context}

So2el: {question}

Jaweb bel tounsi franco professionnel, structuré w mou7taram (mat9oulch "Enti" walla "Enta" fil bidaya):""")


# ─────────────────────────────────────────────
# Vectorstore helpers (INCHANGÉS)
# ─────────────────────────────────────────────
def get_categories_from_vectorstore(vectorstore: Chroma) -> list[str]:
    results = vectorstore._collection.get(include=["metadatas"])
    categories = set()
    for meta in results["metadatas"]:
        cat = meta.get("category") or meta.get("source") or ""
        if cat and cat != "unknown":
            categories.add(cat)
    return list(categories)


CATEGORY_MAP = {
    "carte":           "carte_bancaire",
    "credit":          "credit",
    "offre_packagee":  "offre_packagee",
    "banque_distance": "banque_distance",
    "assurance":       "assurance_prevoyance",
    "epargne":         "epargne_et_placement",
    "professionnel":   "professionnel",
}

VALID_CATEGORIES = list(CATEGORY_MAP.keys()) + ["unknown"]


def retrieve_docs(vectorstore: Chroma, query: str, category: str, k: int = 3, dataset: str = None):
    """Used by routes.py for Gemini context building."""
    if dataset == "professionnel":
        db_category = "professionnel"
    else:
        db_category = CATEGORY_MAP.get(category)

    if db_category:
        try:
            retriever = vectorstore.as_retriever(
                search_kwargs={"k": k, "filter": {"source": {"$eq": db_category}}}
            )
            docs = retriever.invoke(query)
            if docs:
                return docs
        except Exception as e:
            print(f"[WARNING] Filtered retrieval failed: {e}")

    if dataset == "particulier":
        try:
            retriever = vectorstore.as_retriever(
                search_kwargs={"k": k, "filter": {"source": {"$ne": "professionnel"}}}
            )
            docs = retriever.invoke(query)
            if docs:
                return docs
        except Exception:
            pass

    return vectorstore.as_retriever(search_kwargs={"k": k}).invoke(query)


def dedupe_docs(docs):
    seen = set()
    out = []
    for d in docs:
        did = d.page_content[:300]
        if did not in seen:
            seen.add(did)
            out.append(d)
    return out


def format_docs(docs, max_docs: int = 6, max_chars: int = 1500) -> str:
    formatted = []
    for d in docs[:max_docs]:
        content = d.page_content
        titre = d.metadata.get("titre") or d.metadata.get("title") or ""

        lines = content.split('\n')
        key_lines = [
            line for line in lines
            if any(kw in line.lower() for kw in [
                'montant', 'durée', "jusqu'à", 'plafonné', '%',
                'taux', 'frais', 'condition', 'avantage', 'bénéfici',
                'remboursement', 'plafond', 'souscription',
                'financer', 'achats', 'permet', 'disponible'
            ])
        ]

        if key_lines and len('\n'.join(key_lines)) > 60:
            chunk = '\n'.join(key_lines)[:max_chars]
        else:
            chunk = content[:max_chars]

        if titre:
            chunk = f"[{titre}]\n{chunk}"

        formatted.append(chunk)

    return "\n\n---\n\n".join(formatted)


# ─────────────────────────────────────────────
# Broad question detection
# ─────────────────────────────────────────────
BROAD_KEYWORDS = [
    'tous', 'toutes', 'liste', 'disponible', 'proposez',
    'différents', 'différentes', 'quels', 'quelles', 'comparer',
    'كل', 'الأنواع', 'عندكم', 'اللي عندكم',
    'شنية القروض', 'شنية البطاقات', 'شنية العروض',
    'all', 'list', 'compare'
]


def is_broad_question(query: str) -> bool:
    q = query.lower()
    return any(kw in q for kw in BROAD_KEYWORDS)


# ─────────────────────────────────────────────
# Hybrid search (INCHANGÉ)
# ─────────────────────────────────────────────
def hybrid_search(vectorstore, question: str, category: str = None, k: int = 5, dataset: str = None):
    question_lower = question.lower()

    if is_broad_question(question):
        k = 10
        print("[DEBUG] Broad question detected — expanded k to 10")

    if dataset == "professionnel":
        db_category = "professionnel"
    else:
        db_category = CATEGORY_MAP.get(category) if category else None

    if db_category:
        try:
            retriever = vectorstore.as_retriever(
                search_kwargs={"k": k, "filter": {"source": {"$eq": db_category}}}
            )
            semantic_docs = retriever.invoke(question)
            print(f"[DEBUG] Filtered semantic search: {len(semantic_docs)} docs for source={db_category}")
        except Exception as e:
            print(f"[WARNING] Filtered retrieval failed: {e} — falling back to unfiltered")
            semantic_docs = vectorstore.similarity_search(question, k=k)
    elif dataset == "particulier":
        try:
            retriever = vectorstore.as_retriever(
                search_kwargs={"k": k, "filter": {"source": {"$ne": "professionnel"}}}
            )
            semantic_docs = retriever.invoke(question)
            print(f"[DEBUG] Particulier unfiltered semantic: {len(semantic_docs)} docs")
        except Exception as e:
            print(f"[WARNING] Particulier filter failed: {e} — falling back to unfiltered")
            semantic_docs = vectorstore.similarity_search(question, k=k)
    else:
        semantic_docs = vectorstore.similarity_search(question, k=k)

    all_docs = vectorstore.get()
    keyword_docs = []
    keywords = [w for w in re.findall(r'\w{4,}', question_lower)]

    for i, _ in enumerate(all_docs['ids']):
        metadata = all_docs['metadatas'][i]
        content = all_docs['documents'][i].lower() if i < len(all_docs['documents']) else ""
        titre = metadata.get("titre", "").lower()
        theme = metadata.get("theme", "").lower()
        doc_source = metadata.get("source", "")

        if dataset == "particulier" and doc_source == "professionnel":
            continue
        if db_category and doc_source != db_category:
            continue

        score = 0
        for kw in keywords:
            if kw in titre:
                score += 3
            elif kw in theme:
                score += 2
            elif kw in content[:500]:
                score += 1

        if score >= 1:
            doc = Document(
                page_content=all_docs['documents'][i],
                metadata=metadata
            )
            keyword_docs.append((score, doc))

    keyword_docs.sort(key=lambda x: x[0], reverse=True)
    top_keyword = [doc for _, doc in keyword_docs[:k]]

    seen_ids: set = set()
    final_docs = []
    for doc in semantic_docs + top_keyword:
        doc_id = doc.page_content[:300]
        if doc_id not in seen_ids:
            seen_ids.add(doc_id)
            final_docs.append(doc)

    print(f"[DEBUG] hybrid_search final: {len(final_docs)} docs")
    return final_docs[:k]


# ─────────────────────────────────────────────
# RAG setup
# ─────────────────────────────────────────────
EMBEDDING_MODEL_PATH = "./models/attijari-model-v2"

def setup_rag():
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_PATH)
    print(f"[INFO] ✅ Using fine-tuned embedding model: {EMBEDDING_MODEL_PATH}")
    vectorstore = Chroma(
        persist_directory="./chroma_db",
        embedding_function=embeddings,
        collection_name="attijari",
    )
    valid_categories = get_categories_from_vectorstore(vectorstore)
    print(f"[DEBUG] categories in DB = {valid_categories}")
    try:
        print(f"[DEBUG] Chroma count = {vectorstore._collection.count()}")
    except Exception as e:
        print(f"[DEBUG] Chroma count error: {e}")

    return vectorstore, valid_categories


# ─────────────────────────────────────────────
# Category detection helpers (INCHANGÉS)
# ─────────────────────────────────────────────
def build_category_descriptions(vectorstore: Chroma) -> dict[str, list[str]]:
    results = vectorstore._collection.get(include=["metadatas"])
    category_titles: dict[str, list[str]] = {}

    for meta in results["metadatas"]:
        source = meta.get("source", "")
        cat = next(
            (k for k, v in CATEGORY_MAP.items() if v == source),
            None
        )
        if not cat:
            continue

        title = (
            meta.get("titre") or
            meta.get("theme") or
            meta.get("title") or
            ""
        ).strip()

        if title and title not in category_titles.get(cat, []):
            category_titles.setdefault(cat, []).append(title)

    return category_titles


def detect_category_and_rewrite(
    llm, q: str, valid_categories: list[str],
    vectorstore: Chroma = None
) -> tuple[str, str]:

    if vectorstore is not None:
        category_descriptions = build_category_descriptions(vectorstore)
        desc_lines = []
        for cat, titles in category_descriptions.items():
            samples = ", ".join(titles[:6])
            desc_lines.append(f"- {cat}: {samples}")
        descriptions_block = "\n".join(desc_lines)
    else:
        descriptions_block = f"Categories: {', '.join(valid_categories)}"

    prompt = (
        f"You are a Tunisian bank assistant. "
        f"The customer question may be in Darja, Arabizi, French, or Arabic.\n\n"
        f"Classify into exactly one of these categories based on their contents:\n"
        f"{descriptions_block}\n\n"
        f"Rules:\n"
        f"1. Choose the category whose products/features best match the question.\n"
        f"2. Rewrite the question as a short French banking search query (5-10 words).\n\n"
        f"Respond in EXACTLY this format:\n"
        f"CATEGORY: <category>\n"
        f"QUERY: <rewritten query>\n\n"
        f"Question: {q}"
    )

    try:
        result = llm.invoke(prompt).content.strip()
    except Exception as e:
        print(f"[WARNING] Category detection failed: {e}")
        return "unknown", q

    category = "unknown"
    rewritten = q

    for line in result.splitlines():
        if line.startswith("CATEGORY:"):
            cat = line.replace("CATEGORY:", "").strip().lower()
            if cat in valid_categories:
                category = cat
        elif line.startswith("QUERY:"):
            rewritten = line.replace("QUERY:", "").strip()

    print(f"[DEBUG] category={category}, rewritten='{rewritten}'")
    return category, rewritten


# ═══════════════════════════════════════════════════════
# ✨ ANSWER FUNCTION — MODIFIÉE pour intégrer le scoring
# ═══════════════════════════════════════════════════════
def answer_question(
    vectorstore,
    valid_categories,
    query: str,
    language: str = "french",
    dataset: str = None,
    conversation_id: str = None,    # ← NOUVEAU paramètre
    user_id: str = None,             # ← NOUVEAU paramètre
):
    """
    Returns:
        tuple: (answer, docs, category, q2, latency, eval_id, auto_score)
        
        - eval_id: ID de l'évaluation MongoDB (ou None si pas de scoring)
        - auto_score: dict avec score_global, sub_scores, level (ou None)
    """
    french_llm = get_llm("french")
    active_llm = get_llm(language)

    print(f"[DEBUG] active LLM type = {type(active_llm).__name__}")

    if dataset == "professionnel":
        category, q2 = "professionnel", query
        docs = hybrid_search(vectorstore, query, category=category, k=8, dataset=dataset)
    else:
        category, q2 = None, query
        docs = hybrid_search(vectorstore, query, category=None, k=8, dataset=dataset)

    if len(docs) < 2:
        print("[DEBUG] Few results — trying rewritten query")
        docs = hybrid_search(vectorstore, q2, category=category, k=8, dataset=dataset)

    if len(docs) < 2:
        print("[DEBUG] Still few results — removing category filter")
        docs = hybrid_search(vectorstore, query, category=None, k=8, dataset=dataset)

    print(f"[DEBUG] language          = {language}")
    print(f"[DEBUG] dataset           = {dataset}")
    print(f"[DEBUG] detected_category = {category}")
    print(f"[DEBUG] rewritten_query   = {q2}")
    print(f"[DEBUG] retrieved_docs    = {len(docs)}")
    for d in docs:
        print(f"  → {d.metadata.get('titre') or d.metadata.get('title') or '?'}")

    if not docs:
        no_info = (
            "Wallahi ma3andi ma3louma 3ala hadhika. Itassel 3al 71 111 345 w yes3dek."
            if language == "derja"
            else "Cette information n'est pas disponible. Veuillez contacter le 71 111 345."
        )
        return no_info, [], category, q2, 0, None, None

    active_prompt = PROMPT_DERJA if language == "derja" else PROMPT_FRENCH

    chain = (
        {
            "context": (lambda _q: format_docs(docs)),
            "question": RunnablePassthrough(),
        }
        | active_prompt
        | active_llm
        | StrOutputParser()
    )

    start = time.time()
    try:
        answer = chain.invoke(query)

        # Post-process
        contradiction_markers = (
            ["manhouch 3andna", "ma3loumet manhouch"]
            if language == "derja"
            else ["n'est pas disponible", "pas dans notre catalogue"]
        )
        lines = answer.strip().splitlines()
        has_real_content = any(
            len(line.strip()) > 20
            and not any(m in line for m in contradiction_markers)
            for line in lines
        )
        if has_real_content:
            lines = [l for l in lines
                     if not any(m in l for m in contradiction_markers)]
            answer = "\n".join(lines).strip()

    except Exception as e:
        print(f"[ERROR] LLM failed: {e}")
        answer = docs[0].page_content[:300] if docs else "Erreur de génération."

    latency = time.time() - start

    # ═══════════════════════════════════════════════════════
    # ✨ NOUVEAU — SCORING DE LA RÉPONSE
    # ═══════════════════════════════════════════════════════
    eval_id = None
    auto_score = None

    if conversation_id and user_id:
        try:
            # 1. Préparer les sources pour le scoring
            retrieved_sources = [
                {
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                }
                for doc in docs
            ]

            # 2. Calculer le score AUTO (rapide, < 50ms)
            auto_score = compute_auto_score(
                question=query,
                answer=answer,
                retrieved_sources=retrieved_sources,
                used_sources=retrieved_sources,
            )

            # 3. Sauvegarder l'évaluation initiale
            eval_id = save_evaluation(
                conversation_id=conversation_id,
                user_id=user_id,
                question=query,
                answer=answer,
                auto_score=auto_score,
                retrieved_sources=retrieved_sources,
                used_sources=retrieved_sources,
                category=category,
                language=language,
            )

            # 4. Lancer le LLM-Judge en background (non bloquant)
            try:
                loop = asyncio.get_event_loop()
                loop.create_task(
                    evaluate_and_save(
                        eval_id=eval_id,
                        question=query,
                        answer=answer,
                        sources=retrieved_sources,
                    )
                )
            except RuntimeError:
                # Si pas d'event loop actif, on lance dans un nouveau thread
                import threading
                def _run_judge():
                    asyncio.run(
                        evaluate_and_save(
                            eval_id=eval_id,
                            question=query,
                            answer=answer,
                            sources=retrieved_sources,
                        )
                    )
                threading.Thread(target=_run_judge, daemon=True).start()

            print(f"[EVAL] ✅ Auto-score: {auto_score['score_global']}/10 ({auto_score['level']}) | eval_id={eval_id}")

        except Exception as e:
            print(f"[EVAL] ⚠️ Scoring failed (non-blocking): {e}")
            eval_id = None
            auto_score = None
    else:
        print(f"[EVAL] ⚠️ Skipped (conversation_id={conversation_id}, user_id={user_id})")

    return answer, docs, category, q2, latency, eval_id, auto_score