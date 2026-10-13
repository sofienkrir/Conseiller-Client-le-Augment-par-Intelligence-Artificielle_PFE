"""
rag_build_gold.py
─────────────────────────────────────────────────────────────────────────────
ÉTAPE 1/2 — Évaluation du RETRIEVAL du pipeline RAG.

Pour chaque question de evaluation_set.json, exécute la récupération RÉELLE
(ChromaDB + recherche hybride, identique à celle du chatbot) et écrit un fichier
d'annotation `rag_gold_template.json` qui liste, pour chaque question, les
passages candidats (top-N) DÉJÀ CLASSÉS par le système.

➜  TOI, ensuite, tu ouvres rag_gold_template.json et pour chaque question :
     • mets  "pertinent": true  sur le(s) passage(s) qui répond(ent) vraiment ;
     • si AUCUN candidat ne convient        →  "aucun_pertinent": true
       (= échec de récupération, compté comme Recall = 0) ;
     • si la question n'a PAS de réponse
       dans le corpus (test de refus)        →  "hors_corpus": true.

Puis :  python rag_metrics.py

Note méthodologique : on annote le top-N réellement récupéré (méthode de
"pooling" classique en RI). Les métriques Recall@k / Precision@k / MRR pour
k < N sont donc fiables ; pour k = N, le rappel vaut 1 par construction.

Usage :  python rag_build_gold.py
"""
import json
import os
import sys

# Force UTF-8 sur la sortie console (évite les UnicodeEncodeError emoji sous Windows)
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from chatbot import (
    setup_rag, hybrid_search, is_derja,
    get_llm, detect_category_and_rewrite,
)

SRC = "evaluation_set.json"
OUT = "rag_gold_template.json"
POOL_K = 10  # nombre de passages candidats proposés à l'annotation


def retrieve_ranked(vectorstore, valid_categories, query, k):
    """Réplique la récupération de answer_question (sans génération), k réglable."""
    q_fr = None
    if is_derja(query):
        try:
            _, q_fr = detect_category_and_rewrite(
                get_llm("french"), query, valid_categories, vectorstore
            )
        except Exception as e:
            print(f"      [warn] réécriture derja échouée: {e}")
            q_fr = None
    docs = hybrid_search(vectorstore, query, category=None, k=k, semantic_query=q_fr)
    if len(docs) < 2:
        docs = hybrid_search(vectorstore, query, category=None, k=k)
    return docs


def main():
    print("[1/2] Chargement du RAG (embeddings + ChromaDB)...")
    vectorstore, valid_categories = setup_rag()

    with open(SRC, encoding="utf-8") as f:
        data = json.load(f)
    questions = data["questions"]
    total = len(questions)
    print(f"[2/2] Récupération pour {total} questions (top-{POOL_K})...\n")

    out = []
    for i, item in enumerate(questions, 1):
        q = item["question"]
        print(f"  ({i:>2}/{total}) [{item['id']}] {q[:58]}")
        try:
            docs = retrieve_ranked(vectorstore, valid_categories, q, POOL_K)
        except Exception as e:
            print(f"       !! erreur récupération: {e}")
            docs = []

        candidats = []
        for rang, d in enumerate(docs, 1):
            candidats.append({
                "rang": rang,
                "pertinent": False,  # ← À COCHER : true si ce passage répond à la question
                "titre": d.metadata.get("titre") or d.metadata.get("title") or "?",
                "source": d.metadata.get("source", ""),
                "extrait": d.page_content[:220].replace("\n", " ").strip(),
                "pid": d.page_content[:300],  # identifiant technique (ne pas modifier)
            })

        out.append({
            "id": item["id"],
            "langue": item.get("langue"),
            "question": q,
            "objectif": item.get("objectif"),
            "hors_corpus": False,       # ← true si la réponse n'existe pas dans le corpus
            "aucun_pertinent": False,   # ← true si AUCUN candidat ci-dessous n'est pertinent
            "n_candidats": len(candidats),
            "candidats": candidats,
        })

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"pool_k": POOL_K, "questions": out}, f, ensure_ascii=False, indent=2)

    n_empty = sum(1 for o in out if o["n_candidats"] == 0)
    print(f"\n✅ Écrit : {OUT}  ({len(out)} questions, {n_empty} sans aucun candidat)")
    print("   → Ouvre ce fichier, coche 'pertinent': true, puis lance : python rag_metrics.py")


if __name__ == "__main__":
    main()
