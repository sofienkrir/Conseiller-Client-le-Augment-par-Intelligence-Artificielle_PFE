# build_vector_store.py
from __future__ import annotations

import shutil
from pathlib import Path

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

from load_documents import load_corpus_documents, chunk_documents
from pdf_ingest import load_all_pdfs


<<<<<<< HEAD
# ✅ CHEMIN VERS LE MODEL FINE-TUNÉ
EMBEDDING_MODEL_PATH = "./models/attijari-model-v2"


=======
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
def build_vector_store(
    json_path: str,
    persist_dir: str = "./chroma_db",
    collection_name: str = "attijari",
    rebuild: bool = True,
):
<<<<<<< HEAD
    persist_path = Path(persist_dir)

    if rebuild and persist_path.exists():
        shutil.rmtree(persist_path)

    docs_json = load_corpus_documents(json_path)
    docs_professionnel = load_corpus_documents("data/processed/professionnel.json")
    docs_pdf = load_all_pdfs("data/pdfs")
    all_docs = docs_json + docs_professionnel + docs_pdf
    chunked_docs = chunk_documents(all_docs)

    # ✅ CHANGEMENT: utiliser le model fine-tuné au lieu de bge-m3
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_PATH)
    print(f"[INFO] ✅ Using fine-tuned embedding model: {EMBEDDING_MODEL_PATH}")

=======
    """
    Build (or rebuild) a persistent Chroma vector store from corpus_clean.json.

    - Loads Documents with normalized metadata (title, category, url, doc_id, etc.)
    - Chunks with RecursiveCharacterTextSplitter
    - Embeds with intfloat/multilingual-e5-large
    - Stores in Chroma with a fixed collection_name

    IMPORTANT:
    - chatbot.py must use the SAME persist_dir + collection_name + embedding model
    """
    persist_path = Path(persist_dir)

    # Rebuild cleanly (recommended when metadata/embeddings changed)
    if rebuild and persist_path.exists():
        shutil.rmtree(persist_path)

    # Load and chunk documents
    docs_json = load_corpus_documents(json_path)
    docs_pdf = load_all_pdfs("data/pdfs")
    all_docs = docs_json + docs_pdf
    chunked_docs = chunk_documents(all_docs)

    # Embeddings (must match at query time)
    embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")

    # Create persistent Chroma store
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
    vectorstore = Chroma.from_documents(
        documents=chunked_docs,
        embedding=embeddings,
        persist_directory=persist_dir,
        collection_name=collection_name,
    )

<<<<<<< HEAD
=======
    # langchain-chroma persists automatically; no need to call persist()

>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
    return vectorstore


if __name__ == "__main__":
<<<<<<< HEAD
    vs = build_vector_store(
        "data/processed/corpus_clean.json",
        persist_dir="./chroma_db",
        collection_name="attijari",
        rebuild=True,
    )

=======
    vs = build_vector_store("data/processed/corpus_clean.json", persist_dir="./chroma_db", collection_name="attijari", rebuild=True)

    # Quick sanity check: count + sample retrieval
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
    try:
        print(f"[DEBUG] Chroma count = {vs._collection.count()}")
    except Exception as e:
        print("[DEBUG] Could not read Chroma count:", e)

<<<<<<< HEAD
    # Test: cette fois avec une query en Derja!
    retriever = vs.as_retriever(search_kwargs={"k": 5})
    
    # Test 1: Français (doit marcher)
    query = "Quelles sont les offres packagées ?"
    results = retriever.invoke(query)
    print(f"\n🇫🇷 Query: {query}")
    for i, doc in enumerate(results, start=1):
        title = doc.metadata.get("title") or doc.metadata.get("titre") or "Unknown"
        cat = doc.metadata.get("category") or "unknown"
        print(f"  {i}. {title} | category={cat}")
    
    # Test 2: Derja (LE test important!)
    query = "n7eb nebni dar"
    results = retriever.invoke(query)
    print(f"\n🇹🇳 Query Derja: {query}")
    for i, doc in enumerate(results, start=1):
        title = doc.metadata.get("title") or doc.metadata.get("titre") or "Unknown"
        cat = doc.metadata.get("category") or "unknown"
        print(f"  {i}. {title} | category={cat}")
=======
    retriever = vs.as_retriever(search_kwargs={"k": 5})
    query = "Quelles sont les offres packagées ?"
    results = retriever.invoke(query)

    print(f"\nQuery: {query}")
    for i, doc in enumerate(results, start=1):
        title = doc.metadata.get("title") or doc.metadata.get("titre") or "Unknown"
        cat = doc.metadata.get("category") or "unknown"
        url = doc.metadata.get("url") or "N/A"
        print(f"\nResult {i}: {title} | category={cat} | url={url}")
        print(doc.page_content[:220].replace("\n", " ") + " ...")
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
