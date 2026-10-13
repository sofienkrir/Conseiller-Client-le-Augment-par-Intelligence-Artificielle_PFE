"""
rag_metrics_success_only.py
─────────────────────────────────────────────────────────────────────────────
Calcule Recall@k, Precision@k et MRR UNIQUEMENT sur les questions pré-annotées
avec succès (fichier `rag_gold_success_only.json`).

Différences avec rag_metrics.py :
    • lit rag_gold_success_only.json (pas le template complet) ;
    • ignore par sécurité toute question avec `_llm_error` (ne doit pas exister
      dans le fichier succès) → les 14 questions en erreur ne sont NI comptées
      comme des échecs de retrieval, NI incluses ;
    • caption LaTeX dédiée.

Conventions de calcul (identiques) :
    • hors_corpus=true            → exclue des métriques retrieval ;
    • aucun_pertinent=true         → échec de récupération réel : Recall=Prec=RR=0 ;
    • ≥1 passage pertinent          → Recall@k / Precision@k / MRR standard.
    • "pooling" : pour k = pool_k, Recall@k ≈ 1 par construction.

⚠️  Ces chiffres reposent sur une PRÉ-ANNOTATION LLM non encore vérifiée à la
    main. Vérifie les décisions de faible confiance avant usage dans le rapport.

Usage :  python rag_metrics_success_only.py
"""
import json
import os
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

SRC = "rag_gold_success_only.json"
TEX = "rag_metrics_success_only_table.tex"
K_VALUES = [1, 3, 5, 10]


def main():
    if not os.path.exists(SRC):
        print(f"❌ {SRC} introuvable.")
        return

    with open(SRC, encoding="utf-8") as f:
        data = json.load(f)
    pool_k = data.get("pool_k", 10)
    ks = [k for k in K_VALUES if k <= pool_k]
    questions = data["questions"]

    per_q = []
    n_hors_corpus = 0
    n_miss = 0
    n_skipped_error = 0

    for item in questions:
        if item.get("_llm_error"):          # sécurité : ne jamais inclure une erreur
            n_skipped_error += 1
            continue
        if item.get("hors_corpus"):
            n_hors_corpus += 1
            continue

        relevant_ranks = [c["rang"] for c in item.get("candidats", []) if c.get("pertinent")]
        recall_k, prec_k = {}, {}
        if not relevant_ranks:               # aucun_pertinent → échec de récupération
            for k in ks:
                recall_k[k] = 0.0
                prec_k[k] = 0.0
            rr = 0.0
            n_miss += 1
        else:
            total_rel = len(relevant_ranks)
            for k in ks:
                hits = sum(1 for r in relevant_ranks if r <= k)
                recall_k[k] = hits / total_rel
                prec_k[k] = hits / k
            rr = 1.0 / min(relevant_ranks)
        per_q.append((recall_k, prec_k, rr))

    n = len(per_q)
    if n == 0:
        print("❌ Aucune question exploitable pour le calcul.")
        return

    avg = lambda vals: sum(vals) / len(vals)
    recall = {k: avg([rk[k] for rk, _, _ in per_q]) for k in ks}
    precision = {k: avg([pk[k] for _, pk, _ in per_q]) for k in ks}
    mrr = avg([rr for _, _, rr in per_q])

    # ── Console ──────────────────────────────────────────────────────────
    print("\n" + "═" * 60)
    print("  MÉTRIQUES RETRIEVAL — QUESTIONS ANNOTÉES EXPLOITABLES")
    print("═" * 60)
    print(f"  Questions évaluées (in-corpus)             : {n}")
    print(f"    dont échecs de récupération (Recall=0)    : {n_miss}")
    print(f"  Questions hors-corpus (exclues)            : {n_hors_corpus}")
    print(f"  Questions en erreur LLM (ignorées)         : {n_skipped_error}")
    print(f"  Taille du pool annoté (N)                  : {pool_k}")
    print("─" * 60)
    print(f"  {'k':>3} | {'Recall@k':>10} | {'Precision@k':>12}")
    print("─" * 60)
    for k in ks:
        print(f"  {k:>3} | {recall[k]*100:>9.1f}% | {precision[k]*100:>11.1f}%")
    print("─" * 60)
    print(f"  MRR : {mrr:.3f}")
    print("═" * 60)

    # ── LaTeX ────────────────────────────────────────────────────────────
    rows = "\n".join(
        f"{k} & {recall[k]*100:.1f}\\,\\% & {precision[k]*100:.1f}\\,\\% \\\\\n\\hline"
        for k in ks
    )
    tex = f"""% Généré par rag_metrics_success_only.py — {n} questions exploitables (MRR = {mrr:.3f})
\\begin{{table}}[H]
\\centering \\small
\\renewcommand{{\\arraystretch}}{{1.25}}
\\caption{{Métriques de récupération documentaire du pipeline RAG sur les questions annotées exploitables}}
\\label{{tab:rag_retrieval_success}}
\\begin{{tabular}}{{|c|c|c|}}
\\hline
\\textbf{{$k$}} & \\textbf{{Recall@$k$}} & \\textbf{{Precision@$k$}} \\\\
\\hline
{rows}
\\end{{tabular}}

\\vspace{{0.4em}}
\\footnotesize Mean Reciprocal Rank (MRR) = {mrr:.3f}. Évaluation réalisée sur
{n} questions exploitables (passages de référence annotés par pooling sur le
top-{pool_k}) ; {n_hors_corpus} questions hors-corpus exclues.
\\end{{table}}
"""
    with open(TEX, "w", encoding="utf-8") as f:
        f.write(tex)
    print(f"\n✅ Tableau LaTeX écrit dans : {TEX}")


if __name__ == "__main__":
    main()
