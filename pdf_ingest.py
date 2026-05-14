# pdf_ingest.py
from __future__ import annotations

from pathlib import Path
from typing import List, Optional

import fitz  # PyMuPDF
import pdfplumber

from langchain_core.documents import Document


def category_from_path(pdf_path: Path, pdf_root: Path) -> str:
    """
    Category = first folder under pdf_root:
      data/pdfs/credit/file.pdf -> "credit"
    """
    try:
        rel = pdf_path.relative_to(pdf_root)
        parts = rel.parts
        return parts[0] if len(parts) >= 2 else "pdf_general"
    except Exception:
        return "pdf_general"


def clean_text(s: str) -> str:
    return (s or "").replace("\x00", "").strip()


def extract_pdf_text_pymupdf(pdf_path: Path) -> List[dict]:
    """Return list of {page, text} for pages with text."""
    doc = fitz.open(str(pdf_path))
    out = []
    for i in range(len(doc)):
        txt = clean_text(doc[i].get_text("text"))
        if txt:
            out.append({"page": i + 1, "text": txt})
    return out


def extract_pdf_tables_pdfplumber(pdf_path: Path) -> List[dict]:
    """
    Extract tables and serialize them as markdown-ish text.
    Returns list of {page, table_text}.
    """
    out = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for i, page in enumerate(pdf.pages):
            tables = page.extract_tables() or []
            for t_idx, table in enumerate(tables):
                # table is list[list[str|None]]
                rows = []
                for row in table:
                    row = [(cell or "").strip() for cell in row]
                    # skip completely empty rows
                    if not any(row):
                        continue
                    rows.append(row)

                if not rows:
                    continue

                # Convert to a simple pipe table (good for retrieval)
                # header = first row (best-effort)
                header = rows[0]
                body = rows[1:] if len(rows) > 1 else []
                table_lines = []
                table_lines.append("| " + " | ".join(header) + " |")
                table_lines.append("| " + " | ".join(["---"] * len(header)) + " |")
                for r in body[:200]:  # safety cap
                    table_lines.append("| " + " | ".join(r) + " |")

                table_text = "\n".join(table_lines).strip()
                if table_text:
                    out.append({"page": i + 1, "table_text": table_text, "table_id": f"p{i+1}_t{t_idx}"})
    return out


def load_pdf_documents(pdf_path: str | Path, pdf_root: str | Path) -> List[Document]:
    pdf_path = Path(pdf_path)
    pdf_root = Path(pdf_root)

    category = category_from_path(pdf_path, pdf_root)

    docs: List[Document] = []

    # 1) Page text
    for item in extract_pdf_text_pymupdf(pdf_path):
        docs.append(
            Document(
                page_content=item["text"],
                metadata={
                    "title": pdf_path.stem,
                    "category": category,
                    "source": "pdf",
                    "source_type": "pdf_text",
                    "file_path": str(pdf_path),
                    "file_name": pdf_path.name,
                    "page": item["page"],
                },
            )
        )

    # 2) Tables
    for item in extract_pdf_tables_pdfplumber(pdf_path):
        docs.append(
            Document(
                page_content=f"TABLE ({item['table_id']})\n{item['table_text']}",
                metadata={
                    "title": pdf_path.stem,
                    "category": category,
                    "source": "pdf",
                    "source_type": "pdf_table",
                    "file_path": str(pdf_path),
                    "file_name": pdf_path.name,
                    "page": item["page"],
                    "table_id": item["table_id"],
                },
            )
        )

    return docs


def load_all_pdfs(pdf_root: str | Path) -> List[Document]:
    pdf_root = Path(pdf_root)
    all_docs: List[Document] = []
    for pdf_path in pdf_root.rglob("*.pdf"):
        all_docs.extend(load_pdf_documents(pdf_path, pdf_root))
    return all_docs


if __name__ == "__main__":
    docs = load_all_pdfs("data/pdfs")
    print(f"Loaded PDF docs: {len(docs)}")
    if docs:
        print(docs[0].metadata)
        print(docs[0].page_content[:300])
