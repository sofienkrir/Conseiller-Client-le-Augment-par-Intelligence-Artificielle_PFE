# api/pdf_upload.py
"""
Module pour gérer l'upload de PDFs en live par les utilisateurs.
Chaque upload crée une collection ChromaDB temporaire (par session).
"""

from __future__ import annotations

import os
import re
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


# ══════════════════════════════════════════════════════════════════════
# FILTRE DE DOMAINE BANCAIRE
# L'application est destinée à une banque : on n'accepte que les PDF
# dont le contenu relève clairement du domaine bancaire/financier.
# ══════════════════════════════════════════════════════════════════════

class NonBankingPDFError(ValueError):
    """Levée quand un PDF uploadé n'appartient pas au domaine bancaire."""
    def __init__(self, matched_terms: list[str]):
        self.matched_terms = matched_terms
        super().__init__(
            "Ce PDF ne semble pas relever du domaine bancaire. "
            "Seuls les documents bancaires/financiers sont acceptés."
        )


# Le lexique est divisé en DEUX niveaux pour éviter les faux positifs :
#
#  • STRONG = vocabulaire propre à un *document bancaire réel* (relevé,
#    contrat de prêt, brochure produit...). On en trouve plusieurs dans un
#    vrai document bancaire, mais quasiment aucun dans un CV, une lettre de
#    motivation ou une plaquette marketing qui se contente de "citer" une banque.
#
#  • WEAK = mots contextuels qui apparaissent aussi hors du domaine bancaire
#    (un nom d'entreprise, un pays, un intitulé de poste...). Ils comptent,
#    mais ne suffisent JAMAIS à eux seuls à valider un document.
STRONG_BANKING_TERMS = {
    # Comptes & opérations bancaires
    "solde", "relevé", "rib", "iban", "bic", "swift", "virement",
    "prélèvement", "découvert", "agios", "domiciliation", "guichet",
    "chèque", "chéquier", "débit",
    # Crédits & financements
    "crédit immobilier", "crédit consommation", "crédit à la consommation",
    "prêt", "emprunt", "mensualité", "échéance", "amortissement",
    "hypothèque", "remboursement", "endettement", "leasing", "rééchelonnement",
    # Épargne & placements
    "épargne", "livret", "dépôt à terme", "compte épargne", "rendement",
    # Cartes & paiement
    "carte bancaire", "carte de crédit", "carte de paiement", "plafond",
    # Taux & assurance
    "taux d'intérêt", "taux d'interet", "assurance-vie", "cotisation",
    "prime d'assurance", "sinistre", "souscription",
}

WEAK_BANKING_TERMS = {
    "banque", "bancaire", "compte", "compte courant", "agence",
    "conseiller", "client", "clientèle", "dépôt", "retrait", "crédit",
    "financement", "capital", "investissement", "placement", "épargnant",
    "assurance", "frais", "commission", "taux", "intérêt", "intérêts",
    "paiement", "transaction", "visa", "mastercard", "bourse", "action",
    "obligation", "titres", "portefeuille", "dividende", "dinar", "dinars",
    "tnd", "devise", "monnaie", "liquidité", "kyc", "attijari", "tunisie",
}


def _compile_terms(terms: set[str]) -> "re.Pattern":
    # Alternance triée du plus long au plus court → priorité aux expressions
    # composées ("carte bancaire" avant "carte"). \b = mots entiers.
    return re.compile(
        r"\b(?:" + "|".join(
            re.escape(t) for t in sorted(terms, key=len, reverse=True)
        ) + r")\b",
        re.IGNORECASE,
    )


_STRONG_REGEX = _compile_terms(STRONG_BANKING_TERMS)
_WEAK_REGEX = _compile_terms(WEAK_BANKING_TERMS)

# Règles d'acceptation :
#  - au moins MIN_STRONG termes FORTS distincts, OU
#  - au moins 1 terme fort ET un total (forts+faibles) >= MIN_TOTAL_WITH_STRONG.
# Un document sans aucun terme fort (CV, marketing...) est toujours rejeté.
MIN_STRONG = 2
MIN_TOTAL_WITH_STRONG = 6


def _distinct(regex, text: str) -> list[str]:
    return sorted({m.group(0).lower() for m in regex.finditer(text)})


def is_banking_document(text: str) -> tuple[bool, list[str]]:
    """
    Détermine si un texte relève réellement du domaine bancaire.

    Returns:
        (ok, matched_terms) — matched_terms = tous les termes (forts + faibles)
        distincts trouvés, pour le logging.
    """
    if not text:
        return False, []
    strong = _distinct(_STRONG_REGEX, text)
    weak = _distinct(_WEAK_REGEX, text)
    ok = (len(strong) >= MIN_STRONG) or (
        len(strong) >= 1 and (len(strong) + len(weak)) >= MIN_TOTAL_WITH_STRONG
    )
    return ok, strong + weak


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

    # 1bis. Filtre domaine bancaire : on rejette les PDF hors-sujet
    full_text = " ".join(
        d.page_content for d in docs if d.metadata.get("content_type") == "text"
    )
    ok, matched_terms = is_banking_document(full_text)
    if not ok:
        print(f"[PDF_UPLOAD] 🚫 PDF rejeté (hors domaine bancaire): "
              f"{display_name} — termes trouvés: {matched_terms}")
        raise NonBankingPDFError(matched_terms)
    print(f"[PDF_UPLOAD] ✅ PDF bancaire validé ({len(matched_terms)} termes): {matched_terms}")

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