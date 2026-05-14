import json
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

import hashlib

CATEGORY_MAP = {
    "carte_bancaire": "carte",
    "credit": "credit",
    "credit_fournisseurs": "credit",
    "offre_packagee": "offre_packagee",
    "banque_distance": "banque_distance",
    "epargne_et_placement": "epargne",
    "assurance_prevoyance": "assurance",
<<<<<<< HEAD
    "professionnel": "professionnel",
=======
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
}

def normalize_category(source: str) -> str:
    return CATEGORY_MAP.get((source or "").lower().strip(), "unknown")

def stable_doc_id(title: str, url: str, source: str) -> str:
    raw = f"{source}||{title}||{url}"
    return hashlib.sha1(raw.encode("utf-8", errors="ignore")).hexdigest()[:16]

def load_corpus_documents(json_path: str):
    """
<<<<<<< HEAD
    Load a processed JSON dataset into LangChain Documents with clean metadata.

    Supports two formats:
    - corpus_clean format:     { "text": "...", "metadata": { "source": "...", ... } }
    - professionnel format:    { "text_for_embedding": "...", "titre": "...", "categorie": "...", ... }

    Each returned Document has:
    - page_content: the text content
    - metadata: dict with 'title', 'category', 'url', 'source', 'doc_id'
=======
    Load corpus_clean.json into LangChain Documents with clean metadata.

    Each document has:
    - page_content: the 'text' field (user-facing content)
    - metadata: dict with 'title', 'category', 'url', 'source', etc.
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
    """
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    documents = []
    for item in data:
<<<<<<< HEAD
        # corpus_clean format
        if "text" in item and "metadata" in item:
            text = item.get('text', '')
            metadata = item.get('metadata', {})
            source = metadata.get("source", "")
            title = metadata.get("titre", "") or metadata.get("title", "")
            url = metadata.get("url", "")

        # professionnel format
        elif "text_for_embedding" in item:
            text = item.get("text_for_embedding", "")
            # Append extra detail data (FAQ, steps, etc.) not covered by text_for_embedding
            details = (item.get("extra") or {}).get("details", {})
            if details.get("presentation"):
                text += f"\n\nPrésentation : {details['presentation']}"
            if details.get("migration_steps"):
                text += "\n\nÉtapes :\n" + "\n".join(details["migration_steps"])
            if details.get("faq"):
                faq_lines = [
                    f"Q : {e.get('question', '')} R : {e.get('reponse', '')}"
                    for e in details["faq"]
                ]
                text += "\n\nFAQ :\n" + "\n".join(faq_lines)
            title = item.get("titre", "")
            source = "professionnel"
            url = ""
            metadata = {
                "source": source,
                "titre": title,
                "theme": item.get("theme", ""),
                "categorie": item.get("categorie", ""),
            }

        else:
            continue
=======
        text = item.get('text', '')
        metadata = item.get('metadata', {})

        source = metadata.get("source", "")
        title = metadata.get("titre", "") or metadata.get("title", "")
        url = metadata.get("url", "")
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9

        metadata["category"] = normalize_category(source)
        metadata["title"] = title
        metadata["url"] = url
        metadata["doc_id"] = stable_doc_id(title, url, source)

<<<<<<< HEAD
        documents.append(Document(page_content=text, metadata=metadata))

    return documents


=======
        doc = Document(page_content=text, metadata=metadata)
        documents.append(doc)

    return documents

>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
def chunk_documents(documents, chunk_size=800, chunk_overlap=100):
    """
    Split documents into chunks using RecursiveCharacterTextSplitter.

    Args:
    - chunk_size: ~600-1000 characters (baseline 800)
    - chunk_overlap: ~80-150 characters (baseline 100)
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""],  # Default separators, good for Arabic/French
        length_function=len  # Character-based
    )

    chunked_docs = []
    for doc in documents:
        if doc.metadata.get("source_type") == "pdf_table":
            chunked_docs.append(doc)
            continue
        chunks = text_splitter.split_documents([doc])
        chunked_docs.extend(chunks)

    return chunked_docs

if __name__ == "__main__":
    # Example usage
    docs = load_corpus_documents('data/processed/corpus_clean.json')
    print(f"Loaded {len(docs)} documents.")

    chunked = chunk_documents(docs)
    print(f"After chunking: {len(chunked)} chunks.")
    print(f"Sample chunk: {chunked[0].page_content[:200]}...")
    print(f"Metadata: {chunked[0].metadata}")
