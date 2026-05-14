# api/pdf_upload.py
"""
Module pour gérer l'upload de PDFs en live par les utilisateurs.
Chaque upload crée une collection ChromaDB temporaire (par session).
"""

from __future__ import annotations

import os
import shutil
import tempfile
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Réutilise les fonctions existantes de pdf_ingest
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pdf_ingest import extract_pdf_text_pymupdf, extract_pdf_tables_pdfplumber


# Configuration
EMBEDDING_MODEL_PATH = "./models/attijari-model-v2"
UPLOAD_DIR = Path("./uploads_temp")
CHROMA_UPLOADS_DIR = Path("./chroma_uploads")
SESSION_TTL_HOURS = 24  # Les collections expirent après 24h

UPLOAD_DIR.mkdir(exist_ok=True)
CHROMA_UPLOADS_DIR.mkdir(exist_ok=True)

# Cache de l'embedding model (singleton)
_embeddings = None


def get_embeddings():
    """Lazy-load le model V2 (une seule fois)."""
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_PATH)
        print(f"[PDF_UPLOAD] ✅ Embedding model loaded: {EMBEDDING_MODEL_PATH}")
    return _embeddings


def session_collection_name(user_id: str, session_id: str) -> str:
    """Génère un nom de collection unique pour cette session."""
    # ChromaDB: collection name must be 3-63 chars, alphanumeric + underscores
    raw = f"{user_id}_{session_id}"
    h = hashlib.md5(raw.encode()).hexdigest()[:16]
    return f"upload_{h}"


def extract_pdf_as_documents(pdf_path: Path, user_id: str, session_id: str, display_name: str = None) -> list[Document]:
    """
    Extrait le texte + tables d'un PDF et retourne des Documents LangChain.
    Similaire à load_pdf_documents dans pdf_ingest.py mais adapté pour upload.
    """
    docs: list[Document] = []

    display_name = display_name or pdf_path.name

    base_metadata = {
        "source": "pdf_upload",
        "source_type": "user_upload",
        "user_id": user_id,
        "session_id": session_id,
        "file_name": display_name,
        "upload_time": datetime.utcnow().isoformat(),
    }

    # 1. Texte des pages
    for item in extract_pdf_text_pymupdf(pdf_path):
        docs.append(Document(
            page_content=item["text"],
            metadata={**base_metadata, "page": item["page"], "content_type": "text"},
        ))

    # 2. Tables
    for item in extract_pdf_tables_pdfplumber(pdf_path):
        docs.append(Document(
            page_content=f"TABLE ({item['table_id']})\n{item['table_text']}",
            metadata={
                **base_metadata,
                "page": item["page"],
                "table_id": item["table_id"],
                "content_type": "table",
            },
        ))

    return docs


def chunk_documents(documents: list[Document], chunk_size: int = 800, chunk_overlap: int = 100) -> list[Document]:
    """Split documents into chunks (sauf les tables qu'on garde entières)."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )
    chunked = []
    for doc in documents:
        if doc.metadata.get("content_type") == "table":
            chunked.append(doc)
            continue
        chunked.extend(splitter.split_documents([doc]))
    return chunked


def ingest_pdf(file_path: str, user_id: str, session_id: str, original_file_name: str = None) -> dict:
    """
    Ingère un PDF dans une collection ChromaDB temporaire.

    Returns:
        dict avec {collection_name, num_chunks, num_pages, file_name}
    """
    pdf_path = Path(file_path)

    # Use original name if provided, else use the file path name
    display_name = original_file_name or pdf_path.name

    # 1. Extract + chunk
    docs = extract_pdf_as_documents(pdf_path, user_id, session_id, display_name)
    if not docs:
        raise ValueError("Le PDF est vide ou illisible.")

    num_pages = max((d.metadata.get("page", 0) for d in docs), default=0)
    chunks = chunk_documents(docs)

    # 2. Créer la collection ChromaDB
    collection_name = session_collection_name(user_id, session_id)
    embeddings = get_embeddings()

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=str(CHROMA_UPLOADS_DIR),
        collection_name=collection_name,
    )

    print(f"[PDF_UPLOAD] ✅ Ingested {display_name}: {num_pages} pages, {len(chunks)} chunks, collection={collection_name}")

    return {
        "collection_name": collection_name,
        "num_chunks": len(chunks),
        "num_pages": num_pages,
        "file_name": display_name,
    }


def get_upload_vectorstore(user_id: str, session_id: str) -> Optional[Chroma]:
    """Récupère le vectorstore d'une session utilisateur (si existe)."""
    collection_name = session_collection_name(user_id, session_id)
    try:
        embeddings = get_embeddings()
        vs = Chroma(
            persist_directory=str(CHROMA_UPLOADS_DIR),
            embedding_function=embeddings,
            collection_name=collection_name,
        )
        count = vs._collection.count()
        if count == 0:
            return None
        return vs
    except Exception as e:
        print(f"[PDF_UPLOAD] ⚠️ No collection for session {session_id}: {e}")
        return None


def search_in_uploaded_pdf(user_id: str, session_id: str, query: str, k: int = 5) -> list[Document]:
    """Recherche sémantique dans le PDF uploadé d'une session."""
    vs = get_upload_vectorstore(user_id, session_id)
    if vs is None:
        return []
    try:
        return vs.similarity_search(query, k=k)
    except Exception as e:
        print(f"[PDF_UPLOAD] ❌ Search error: {e}")
        return []


def delete_session_collection(user_id: str, session_id: str) -> bool:
    """Supprime la collection d'une session (quand user supprime son PDF)."""
    collection_name = session_collection_name(user_id, session_id)
    try:
        embeddings = get_embeddings()
        vs = Chroma(
            persist_directory=str(CHROMA_UPLOADS_DIR),
            embedding_function=embeddings,
            collection_name=collection_name,
        )
        vs.delete_collection()
        print(f"[PDF_UPLOAD] 🗑️ Deleted collection {collection_name}")
        return True
    except Exception as e:
        print(f"[PDF_UPLOAD] ⚠️ Delete failed: {e}")
        return False


def cleanup_old_uploads():
    """Supprime les uploads plus vieux que SESSION_TTL_HOURS."""
    cutoff = datetime.utcnow() - timedelta(hours=SESSION_TTL_HOURS)
    for f in UPLOAD_DIR.glob("*.pdf"):
        try:
            mtime = datetime.utcfromtimestamp(f.stat().st_mtime)
            if mtime < cutoff:
                f.unlink()
                print(f"[PDF_UPLOAD] 🧹 Cleaned up old upload: {f.name}")
        except Exception as e:
            print(f"[PDF_UPLOAD] ⚠️ Cleanup error: {e}")