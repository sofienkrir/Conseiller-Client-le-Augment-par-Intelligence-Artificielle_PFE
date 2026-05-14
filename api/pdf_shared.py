# api/pdf_shared.py
"""
Module pour gérer les PDFs partagés par l'admin avec d'autres users.

Architecture:
- L'admin upload un PDF
- Il sélectionne les users avec qui partager
- Un document MongoDB est créé (collection shared_pdfs)
- Une collection ChromaDB est créée pour ce PDF
- Les users concernés peuvent voir + questionner ce PDF
- Système de notifications: viewed_by track qui a lu quoi
"""

from __future__ import annotations

import os
import sys
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional

from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pdf_ingest import extract_pdf_text_pymupdf, extract_pdf_tables_pdfplumber

load_dotenv()

# Configuration
EMBEDDING_MODEL_PATH = "./models/attijari-model-v2"
SHARED_UPLOAD_DIR = Path("./uploads_shared")
CHROMA_SHARED_DIR = Path("./chroma_shared")

SHARED_UPLOAD_DIR.mkdir(exist_ok=True)
CHROMA_SHARED_DIR.mkdir(exist_ok=True)

# MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
_client = MongoClient(MONGO_URI)
_db = _client["attijari_chatbot"]
shared_pdfs_collection = _db["shared_pdfs"]

# Cache embeddings (singleton)
_embeddings = None


def get_embeddings():
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL_PATH)
        print(f"[PDF_SHARED] ✅ Embedding model loaded")
    return _embeddings


def shared_collection_name(pdf_id: str) -> str:
    """Nom unique pour la collection ChromaDB de ce PDF partagé."""
    h = hashlib.md5(pdf_id.encode()).hexdigest()[:16]
    return f"shared_{h}"


def extract_pdf_as_documents(pdf_path: Path, pdf_id: str, display_name: str) -> list[Document]:
    """Extrait texte + tables d'un PDF en Documents LangChain."""
    docs: list[Document] = []

    base_metadata = {
        "source": "pdf_shared",
        "source_type": "admin_shared",
        "pdf_id": pdf_id,
        "file_name": display_name,
        "upload_time": datetime.utcnow().isoformat(),
    }

    for item in extract_pdf_text_pymupdf(pdf_path):
        docs.append(Document(
            page_content=item["text"],
            metadata={**base_metadata, "page": item["page"], "content_type": "text"},
        ))

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
    """Split documents en chunks (sauf les tables)."""
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


def ingest_shared_pdf(
    file_path: str,
    original_file_name: str,
    uploaded_by_id: str,
    uploaded_by_name: str,
    shared_with: list[str],
    description: str = "",
) -> dict:
    """
    Ingère un PDF partagé:
    1. Crée un document MongoDB (avec viewed_by: [])
    2. Extrait le texte et l'ingère dans ChromaDB
    3. Retourne les métadonnées
    """
    pdf_path = Path(file_path)

    pdf_doc = {
        "file_name": original_file_name,
        "description": description,
        "uploaded_by_id": uploaded_by_id,
        "uploaded_by_name": uploaded_by_name,
        "uploaded_at": datetime.utcnow(),
        "shared_with": shared_with,
        "viewed_by": [],  # ← NOUVEAU: qui a déjà vu ce PDF
        "num_pages": 0,
        "num_chunks": 0,
        "status": "processing",
    }
    result = shared_pdfs_collection.insert_one(pdf_doc)
    pdf_id = str(result.inserted_id)

    try:
        docs = extract_pdf_as_documents(pdf_path, pdf_id, original_file_name)
        if not docs:
            raise ValueError("Le PDF est vide ou illisible.")

        num_pages = max((d.metadata.get("page", 0) for d in docs), default=0)
        chunks = chunk_documents(docs)

        collection_name = shared_collection_name(pdf_id)
        embeddings = get_embeddings()

        Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            persist_directory=str(CHROMA_SHARED_DIR),
            collection_name=collection_name,
        )

        shared_pdfs_collection.update_one(
            {"_id": ObjectId(pdf_id)},
            {"$set": {
                "num_pages": num_pages,
                "num_chunks": len(chunks),
                "collection_name": collection_name,
                "status": "ready",
            }}
        )

        print(f"[PDF_SHARED] ✅ Ingested '{original_file_name}' for {len(shared_with)} users")

        return {
            "pdf_id": pdf_id,
            "file_name": original_file_name,
            "num_pages": num_pages,
            "num_chunks": len(chunks),
            "shared_with_count": len(shared_with),
        }

    except Exception as e:
        shared_pdfs_collection.delete_one({"_id": ObjectId(pdf_id)})
        raise e


def list_shared_pdfs_for_user(user_id: str = None, segment: str = None) -> list[dict]:
    """
    Liste des PDFs partagés avec ce user, avec indicateur 'is_new'.
    Supporte aussi l'ancien paramètre `segment` pour compatibilité.
    """
    pdfs = []

    if user_id:
        query_filter = {"shared_with": user_id, "status": "ready"}
    else:
        # Fallback compatibilité (retourne tout)
        query_filter = {"status": "ready"}

    for doc in shared_pdfs_collection.find(query_filter, sort=[("uploaded_at", -1)]):
        viewed_by = doc.get("viewed_by", [])
        pdfs.append({
            "pdf_id": str(doc["_id"]),
            "file_name": doc["file_name"],
            "description": doc.get("description", ""),
            "uploaded_by": doc.get("uploaded_by_name", "Admin"),
            "uploaded_at": doc["uploaded_at"].isoformat(),
            "num_pages": doc.get("num_pages", 0),
            "is_new": (user_id not in viewed_by) if user_id else True,
        })
    return pdfs


def list_all_shared_pdfs() -> list[dict]:
    """Liste complète pour l'admin (tous les PDFs partagés)."""
    pdfs = []
    for doc in shared_pdfs_collection.find(sort=[("uploaded_at", -1)]):
        pdfs.append({
            "pdf_id": str(doc["_id"]),
            "file_name": doc["file_name"],
            "description": doc.get("description", ""),
            "uploaded_by": doc.get("uploaded_by_name", "Admin"),
            "uploaded_at": doc["uploaded_at"].isoformat(),
            "num_pages": doc.get("num_pages", 0),
            "num_chunks": doc.get("num_chunks", 0),
            "shared_with_count": len(doc.get("shared_with", [])),
            "shared_with": doc.get("shared_with", []),
            "viewed_by_count": len(doc.get("viewed_by", [])),
            "status": doc.get("status", "unknown"),
        })
    return pdfs


def search_in_shared_pdf(pdf_id: str, user_id: str, query: str, k: int = 5) -> list[Document]:
    """Recherche dans un PDF partagé — vérifie l'accès d'abord."""
    doc = shared_pdfs_collection.find_one({"_id": ObjectId(pdf_id)})
    if not doc:
        print(f"[PDF_SHARED] ❌ PDF {pdf_id} not found")
        return []

    if user_id not in doc.get("shared_with", []):
        print(f"[PDF_SHARED] ❌ User {user_id} has no access to PDF {pdf_id}")
        return []

    collection_name = doc.get("collection_name")
    if not collection_name:
        return []

    try:
        embeddings = get_embeddings()
        vs = Chroma(
            persist_directory=str(CHROMA_SHARED_DIR),
            embedding_function=embeddings,
            collection_name=collection_name,
        )
        return vs.similarity_search(query, k=k)
    except Exception as e:
        print(f"[PDF_SHARED] ❌ Search error: {e}")
        return []


def delete_shared_pdf(pdf_id: str) -> bool:
    """Supprime un PDF partagé (MongoDB + ChromaDB)."""
    doc = shared_pdfs_collection.find_one({"_id": ObjectId(pdf_id)})
    if not doc:
        return False

    collection_name = doc.get("collection_name")
    if collection_name:
        try:
            embeddings = get_embeddings()
            vs = Chroma(
                persist_directory=str(CHROMA_SHARED_DIR),
                embedding_function=embeddings,
                collection_name=collection_name,
            )
            vs.delete_collection()
        except Exception as e:
            print(f"[PDF_SHARED] ⚠️ ChromaDB delete failed: {e}")

    shared_pdfs_collection.delete_one({"_id": ObjectId(pdf_id)})
    print(f"[PDF_SHARED] 🗑️ Deleted shared PDF {pdf_id}")
    return True


def update_shared_with(pdf_id: str, new_shared_with) -> bool:
    """
    Met à jour la liste des users. Accepte:
      - liste: ["id1", "id2"]
      - string JSON: '["id1","id2"]'
      - string séparée par virgules: "id1,id2"
    """
    import json as _json

    if isinstance(new_shared_with, list):
        user_ids = [str(x).strip() for x in new_shared_with if str(x).strip()]
    elif isinstance(new_shared_with, str):
        try:
            parsed = _json.loads(new_shared_with.strip())
            if isinstance(parsed, list):
                user_ids = [str(x).strip() for x in parsed if str(x).strip()]
            else:
                user_ids = [str(parsed).strip()]
        except _json.JSONDecodeError:
            user_ids = [x.strip() for x in new_shared_with.split(",") if x.strip()]
    else:
        user_ids = []

    result = shared_pdfs_collection.update_one(
        {"_id": ObjectId(pdf_id)},
        {"$set": {"shared_with": user_ids}}
    )
    return result.modified_count > 0


# ════════════════════════════════════════════════════
# NOTIFICATIONS — viewed_by tracking
# ════════════════════════════════════════════════════

def mark_pdf_as_viewed(pdf_id: str, user_id: str) -> bool:
    """Marque un PDF comme vu par ce user."""
    try:
        shared_pdfs_collection.update_one(
            {"_id": ObjectId(pdf_id)},
            {"$addToSet": {"viewed_by": user_id}}
        )
        return True
    except Exception as e:
        print(f"[PDF_SHARED] ❌ mark_viewed error: {e}")
        return False


def count_unread_pdfs_for_user(user_id: str) -> int:
    """Compte les PDFs non lus pour ce user."""
    try:
        return shared_pdfs_collection.count_documents({
            "shared_with": user_id,
            "status": "ready",
            "viewed_by": {"$ne": user_id},
        })
    except Exception as e:
        print(f"[PDF_SHARED] ❌ count_unread error: {e}")
        return 0