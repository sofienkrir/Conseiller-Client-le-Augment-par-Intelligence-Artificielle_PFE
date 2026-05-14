from __future__ import annotations

import time
import re
import os

<<<<<<< HEAD
=======
import database

>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.documents import Document


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
# Prompts
# ─────────────────────────────────────────────
PROMPT_FRENCH = PromptTemplate.from_template("""Tu es un conseiller bancaire officiel d'Attijari Bank Tunisie.

RÈGLES ABSOLUES :
<<<<<<< HEAD
1. Réponds à la question de façon COMPLÈTE et DÉTAILLÉE. N'omets aucune information disponible dans le contexte.
2. Utilise EXCLUSIVEMENT les informations du contexte. N'invente rien.
3. Si l'information est absente : "Cette information n'est pas disponible. Appelez le 71 111 345."
4. Si plusieurs produits ou options correspondent, liste-les TOUS avec leurs détails (montants, taux, conditions, avantages…).
5. Structure ta réponse clairement : utilise des tirets ou des points pour les listes, et des sauts de ligne entre les produits.
=======
1. Réponds UNIQUEMENT à la question posée. Rien de plus.
2. Utilise EXCLUSIVEMENT les informations du contexte. N'invente rien.
3. Si l'information est absente : "Cette information n'est pas disponible. Appelez le 71 111 345."
4. Sois concis. Pas de répétition.
5. Si plusieurs produits correspondent, liste-les tous.
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
6. IMPORTANT: Réponds TOUJOURS en français, peu importe la langue de la question.
7. Termine toujours par : "Pour plus d'informations, appelez le 71 111 345."

CONTEXTE :
{context}

QUESTION : {question}

RÉPONSE EN FRANÇAIS :""")


PROMPT_DERJA = PromptTemplate.from_template("""Enti moustachaar bancaire rasmi mte3 Attijari Bank Tounès — khabbar w mriguel w t7eb tnajjem el client.

STYLE mte3ek:
- Ta7ki tounsi franco (darija + chwaya français lil banking terms)
- El banking terms (virement, crédit, RIB, solde, plafond, taux, compte) khallihom bel français — el klayen yefhmouhom
- Uslob simple, direct, w wa9f — mch formal zbala
- Ta7ki kima wa7ed mel 3aylia yeshre7 lil 3ammo, mch kima robot

QWA3ED:
1. Jaweb BAS 3al so2el elli t7el. La tzel3ech fi 7ajet okhra.
2. Istefed BAS mel contexte (bel français). Traducih bel tounsi franco.
3. Ken el ma3louma manhouch fil contexte: "Wallahi ma3andi ma3louma 3ala hadhika. Itassel 3al 71 111 345 w yes3dek."
4. La tkrr klem. Jaweb direct w mriguel.
5. Khtim DIMA b: "Itassel 3al moustachaar mte3ek walla 71 111 345."
6. La tkhater3 7atta examples wala use cases manhoumch fil contexte. Traducih bas, la tzid 7aja.

EXEMPLES (style mte3ek):

So2el: "شنية القروض اللي عندكم؟"
Contexte: [Crédit Taksit: financement 100%, durée 12-84 mois. Crédit CREDEX: plafonné à 10 000 TND, durée 3 ans.]
Jaweb: "3andna barsha options ya sa7bi! Crédit Taksit — yghati 7atta 100% w تقدر تسدد من 12 لـ 84 شهر. Crédit CREDEX — للمصاريف الشخصية، plafonné bـ10 000 DT w تسدد على 3 سنين. أنهي واحد يهمك؟ Itassel 3al moustachaar mte3ek walla 71 111 345."

So2el: "كيفاش نعمل كارط بدون حساب؟"
Contexte: [Carte TAWA TAWA: carte rechargeable sans compte bancaire, accessible via GAB Attijari 24h/24.]
Jaweb: "Sahla! Carte TAWA TAWA — rechargeable w ma t7tajch compte bancaire. Tnajem t7atha w tkhdem biha directement. Itassel 3al moustachaar mte3ek walla 71 111 345."

So2el: "نسيت كلمة السر تاع Attijari UP"
Contexte: [Mot de passe oublié: cliquer sur "Mot de passe oublié", saisir identifiant, recevoir mot de passe temporaire par SMS/mail.]
Jaweb: "Mazel3ech! Rou7 l'application, klik 3la 'Mot de passe oublié', dakhel identifiant mte3ek, w yb3athoulek code provisoire bel SMS walla mail. Ba3dha ta3mel klem siri jdid. Itassel 3al moustachaar mte3ek walla 71 111 345."

So2el: "شنية الفرق بين Offre Exclusive و Offre Signature؟"
Contexte: [Offre Exclusive: carte Platinium Dual, accès 25 lounges. Offre Signature: carte Signature Dual, accès 1000 lounges.]
Jaweb: "El farq el kbir: Offre Signature 3andha accès lـ1000 lounges d'aéroports fel 3alam, ama Offre Exclusive bas 25. W Signature 3andha carte Signature Dual, Exclusive 3andha Platinium Dual. Ken tsafer barsha, Signature hiya el a7sen. Itassel 3al moustachaar mte3ek walla 71 111 345."

---

Contexte (bel français — traducih bel tounsi):
{context}

So2el: {question}

Jaweb bel tounsi franco, direct, w mriguel:""")


# ─────────────────────────────────────────────
# Vectorstore helpers
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
<<<<<<< HEAD
    "professionnel":   "professionnel",
=======
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
}

VALID_CATEGORIES = list(CATEGORY_MAP.keys()) + ["unknown"]


<<<<<<< HEAD
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
=======
def retrieve_docs(vectorstore: Chroma, query: str, category: str, k: int = 3):
    """Used by routes.py for Gemini context building."""
    db_category = CATEGORY_MAP.get(category)
    if db_category:
        try:
            retriever = vectorstore.as_retriever(
                search_kwargs={
                    "k": k,
                    "filter": {"source": {"$eq": db_category}}
                }
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
            )
            docs = retriever.invoke(query)
            if docs:
                return docs
        except Exception as e:
            print(f"[WARNING] Filtered retrieval failed: {e}")
<<<<<<< HEAD

    # Fallback: exclude professionnel docs when in particulier mode
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

=======
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
    return vectorstore.as_retriever(search_kwargs={"k": k}).invoke(query)


def dedupe_docs(docs):
    """Deduplicate docs using content slice as unique ID."""
    seen = set()
    out = []
    for d in docs:
        did = d.page_content[:300]
        if did not in seen:
            seen.add(did)
            out.append(d)
    return out


<<<<<<< HEAD
def format_docs(docs, max_docs: int = 6, max_chars: int = 1500) -> str:
=======
def format_docs(docs, max_docs: int = 4, max_chars: int = 600) -> str:
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
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
                'financer', 'achats', 'permet', 'disponible'  # ← add these
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
# Hybrid search
# ─────────────────────────────────────────────
<<<<<<< HEAD
def hybrid_search(vectorstore, question: str, category: str = None, k: int = 5, dataset: str = None):
=======
def hybrid_search(vectorstore, question: str, category: str = None, k: int = 5):
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
    question_lower = question.lower()

    if is_broad_question(question):
        k = 10
        print("[DEBUG] Broad question detected — expanded k to 10")

<<<<<<< HEAD
    # When dataset is professionnel, source filter overrides the category filter
    if dataset == "professionnel":
        db_category = "professionnel"
    else:
        db_category = CATEGORY_MAP.get(category) if category else None

    # ── Semantic search ──────────────────────────────────────────────────────
    if db_category:
        try:
            retriever = vectorstore.as_retriever(
                search_kwargs={"k": k, "filter": {"source": {"$eq": db_category}}}
=======
    db_category = CATEGORY_MAP.get(category) if category else None

    # Semantic search
    if db_category:
        try:
            retriever = vectorstore.as_retriever(
                search_kwargs={
                    "k": k,
                    "filter": {"source": {"$eq": db_category}}
                }
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
            )
            semantic_docs = retriever.invoke(question)
            print(f"[DEBUG] Filtered semantic search: {len(semantic_docs)} docs for source={db_category}")
        except Exception as e:
            print(f"[WARNING] Filtered retrieval failed: {e} — falling back to unfiltered")
            semantic_docs = vectorstore.similarity_search(question, k=k)
<<<<<<< HEAD
    elif dataset == "particulier":
        # No category match but still exclude professionnel docs
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

    # ── Keyword search ───────────────────────────────────────────────────────
=======
    else:
        semantic_docs = vectorstore.similarity_search(question, k=k)

    # Keyword search
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
    all_docs = vectorstore.get()
    keyword_docs = []
    keywords = [w for w in re.findall(r'\w{4,}', question_lower)]

    for i, _ in enumerate(all_docs['ids']):
        metadata = all_docs['metadatas'][i]
        content = all_docs['documents'][i].lower() if i < len(all_docs['documents']) else ""
        titre = metadata.get("titre", "").lower()
        theme = metadata.get("theme", "").lower()
<<<<<<< HEAD
        doc_source = metadata.get("source", "")

        # Dataset-level filter
        if dataset == "particulier" and doc_source == "professionnel":
            continue
        if db_category and doc_source != db_category:
            continue
=======
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9

        score = 0
        for kw in keywords:
            if kw in titre:
                score += 3
            elif kw in theme:
                score += 2
            elif kw in content[:500]:
                score += 1

<<<<<<< HEAD
=======
        if db_category and metadata.get("source") != db_category:
            continue

>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
        if score >= 1:
            doc = Document(
                page_content=all_docs['documents'][i],
                metadata=metadata
            )
            keyword_docs.append((score, doc))

    keyword_docs.sort(key=lambda x: x[0], reverse=True)
    top_keyword = [doc for _, doc in keyword_docs[:k]]

    # Merge and deduplicate using content slice
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
<<<<<<< HEAD
# En haut du fichier, après les imports, ajouter:
EMBEDDING_MODEL_PATH = "./models/attijari-model-v2"

def setup_rag():
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_PATH)
    print(f"[INFO] ✅ Using fine-tuned embedding model: {EMBEDDING_MODEL_PATH}")
=======
def setup_rag():
    embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
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
# Category detection helpers
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


# ─────────────────────────────────────────────
# Answer function
# ─────────────────────────────────────────────
def answer_question(
<<<<<<< HEAD
    vectorstore, valid_categories, query: str, language: str = "french", dataset: str = None
=======
    vectorstore, valid_categories, query: str, language: str = "french"
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
):
    french_llm = get_llm("french")
    active_llm = get_llm(language)

    print(f"[DEBUG] active LLM type = {type(active_llm).__name__}")

<<<<<<< HEAD
    if dataset == "professionnel":
        category, q2 = "professionnel", query
        docs = hybrid_search(vectorstore, query, category=category, k=8, dataset=dataset)
    else:
    # Fait confiance au model V2 — pas de pre-filter
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
=======
    category, q2 = detect_category_and_rewrite(
        french_llm, query, valid_categories, vectorstore
    )

    docs = hybrid_search(vectorstore, query, category=category, k=5)

    if len(docs) < 2:
        print("[DEBUG] Few results — trying rewritten query")
        docs = hybrid_search(vectorstore, q2, category=category, k=5)

    if len(docs) < 2:
        print("[DEBUG] Still few results — removing category filter")
        docs = hybrid_search(vectorstore, query, category=None, k=5)

    print(f"[DEBUG] language          = {language}")
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
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
        return no_info, [], category, q2, 0

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

        # Post-process: remove contradiction lines if real content exists
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
    return answer, docs, category, q2, latency

<<<<<<< HEAD
=======

# ─────────────────────────────────────────────
# Voice helpers (placeholder)
# ─────────────────────────────────────────────
def get_voice_input() -> str:
    return input("Voice input (simulated): ").strip()


def speak_text(text: str):
    print(f"[SPEAK] {text}")


# ─────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────
def run_chatbot():
    vectorstore, valid_categories = setup_rag()

    user_id = "default_user"
    session_id = database.start_session(user_id)

    print("\n=== Attijari Bank Chatbot  ===")
    print("\nChoose language:")
    print("  1. French")
    print("  2. Tunisian Dialect (Darija)")
    lang_choice = input("Language (french/derja): ").strip().lower()
    language = "derja" if lang_choice in ("derja", "2", "darija") else "french"
    print(f"[INFO] Language: {language}\n")

    print("Choose input mode:")
    print("  1. text")
    print("  2. voice")
    mode = input("Mode (text/voice): ").strip().lower()

    try:
        if mode == "voice":
            query = get_voice_input()
            if not query:
                return
            database.add_message(session_id, "user", query)
            try:
                answer, docs, category, q2, latency = answer_question(
                    vectorstore, valid_categories, query, language
                )
                print("Answer:", answer)
                speak_text(answer)
                retrieved_titles = [
                    d.metadata.get("title") or d.metadata.get("titre") or "Unknown"
                    for d in docs
                ]
                database.log_rag_query(session_id, query, retrieved_titles, answer, latency)
                database.add_message(session_id, "assistant", answer)
            except Exception as e:
                print(f"Error: {e}")
                database.log_rag_query(session_id, query, [], "", 0.0, str(e))

        elif mode == "text":
            print("Type 'quit' to exit.\n")
            while True:
                query = input("💰 Your question: ").strip()
                if not query:
                    continue
                if query.lower() == "quit":
                    break
                database.add_message(session_id, "user", query)
                try:
                    answer, docs, category, q2, latency = answer_question(
                        vectorstore, valid_categories, query, language
                    )
                    print(f"\n🤖 Answer: {answer}\n")
                    retrieved_titles = [
                        d.metadata.get("title") or d.metadata.get("titre") or "Unknown"
                        for d in docs
                    ]
                    database.log_rag_query(session_id, query, retrieved_titles, answer, latency)
                    database.add_message(session_id, "assistant", answer)
                    print("📚 Sources:")
                    for d in docs:
                        title = d.metadata.get("title") or d.metadata.get("titre") or "Unknown"
                        url = d.metadata.get("url") or "N/A"
                        print(f"  - {title} ({url})")
                    print()
                except Exception as e:
                    print(f"Error: {e}")
                    database.log_rag_query(session_id, query, [], "", 0.0, str(e))
        else:
            print("Invalid mode.")
    finally:
        database.end_session(session_id)


if __name__ == "__main__":
    run_chatbot()
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
