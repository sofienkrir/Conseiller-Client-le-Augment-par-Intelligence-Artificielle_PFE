# build_vector_store.py
from __future__ import annotations

import shutil
from pathlib import Path

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

from load_documents import load_corpus_documents, chunk_documents
from pdf_ingest import load_all_pdfs


# ✅ CHEMIN VERS LE MODEL FINE-TUNÉ
EMBEDDING_MODEL_PATH = "./models/attijari-model-v2"


def build_vector_store(
    json_path: str,
    persist_dir: str = "./chroma_db",
    collection_name: str = "attijari",
    rebuild: bool = True,
):
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

    vectorstore = Chroma.from_documents(
        documents=chunked_docs,
        embedding=embeddings,
        persist_directory=persist_dir,
        collection_name=collection_name,
    )

    return vectorstore


if __name__ == "__main__":
    vs = build_vector_store(
        "data/processed/corpus_clean.json",
        persist_dir="./chroma_db",
        collection_name="attijari",
        rebuild=True,
    )

    try:
        print(f"[DEBUG] Chroma count = {vs._collection.count()}")
    except Exception as e:
        print("[DEBUG] Could not read Chroma count:", e)

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
