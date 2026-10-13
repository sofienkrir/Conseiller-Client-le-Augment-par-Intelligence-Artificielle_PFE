"""
run_evaluation.py
Pose automatiquement les 65 questions de evaluation_set.json au chatbot
et remplit le champ 'reponse_chatbot' de chacune.

-> TOI tu n'as plus qu'a ouvrir le fichier rempli et noter (review_humain).

Usage :  python run_evaluation.py
Sortie :  evaluation_set_rempli.json  (l'original n'est PAS ecrase)
"""
import json
import time
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from chatbot import setup_rag, answer_question

SRC = "evaluation_set.json"
OUT = "evaluation_set_rempli.json"


def main():
    print("[1/3] Chargement du RAG (embeddings + ChromaDB)...")
    vectorstore, valid_categories = setup_rag()

    with open(SRC, encoding="utf-8") as f:
        data = json.load(f)

    questions = data["questions"]
    total = len(questions)
    print(f"[2/3] {total} questions a poser au chatbot.\n")

    for i, item in enumerate(questions, 1):
        q = item["question"]
        # le chatbot auto-detecte le derja ; on passe french par defaut
        lang = "derja" if item["langue"] in ("derja", "mixte") else "french"
        print(f"  ({i:>2}/{total}) [{item['id']}] {q[:60]}")
        try:
            t0 = time.time()
            result = answer_question(
                vectorstore,
                valid_categories,
                query=q,
                language=lang,
            )
            # answer_question -> (answer, docs, category, q2, latency, eval_id, auto_score)
            answer = result[0]
            latency = result[4] if len(result) > 4 else (time.time() - t0)
            auto_score = result[6] if len(result) > 6 else None

            item["reponse_chatbot"] = answer
            # champs d'aide pour le review (pre-remplis automatiquement)
            item["_auto_score"] = (auto_score or {}).get("score_global") if isinstance(auto_score, dict) else None
            item["_categorie_detectee"] = result[2] if len(result) > 2 else None
            item["_latence_s"] = round(float(latency), 2) if latency else None
        except Exception as e:
            item["reponse_chatbot"] = f"[ERREUR: {e}]"
            item["_auto_score"] = None
            print(f"       !! erreur: {e}")

        # sauvegarde incrementale (en cas d'interruption on ne perd rien)
        with open(OUT, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n[3/3] Termine. Reponses ecrites dans : {OUT}")
    print("      -> Ouvre ce fichier et remplis 'review_humain' pour chaque question.")


if __name__ == "__main__":
    main()
