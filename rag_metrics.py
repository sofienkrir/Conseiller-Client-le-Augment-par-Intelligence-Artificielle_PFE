"""
rag_metrics.py
─────────────────────────────────────────────────────────────────────────────
ÉTAPE 2/2 — Calcul des métriques de RETRIEVAL du pipeline RAG.

Lit `rag_gold_template.json` (annoté à la main) et calcule, à partir du
classement déjà enregistré par le système :
    • Recall@k     — part des passages pertinents retrouvés dans le top-k
    • Precision@k  — part de passages pertinents parmi les k premiers
    • MRR          — moyenne de 1/rang du premier passage pertinent

k ∈ {1, 3, 5, 10}  (borné par la taille du pool annoté).

Sortie : récapitulatif console + tableau LaTeX dans `rag_metrics_table.tex`.

Convention :
    - question "hors_corpus": true        → exclue (sert au test de refus, non couvert ici)
    - question "aucun_pertinent": true     → échec de récupération : Recall=Prec=RR=0
    - question sans aucune annotation       → ignorée + avertissement
    - "pooling" : pour k = pool_k, Recall@k ≈ 1 par construction (cf. rag_build_gold.py)

Usage :  python rag_metrics.py
"""
import json
import os
import sys

# Force UTF-8 sur la sortie console (évite les UnicodeEncodeError emoji sous Windows)
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

SRC = "rag_gold_template.json"
TEX = "rag_metrics_table.tex"
K_VALUES = [1, 3, 5, 10]


def main():
    if not os.path.exists(SRC):
        print(f"❌ {SRC} introuvable. Lance d'abord : python rag_build_gold.py")
        return

    with open(SRC, encoding="utf-8") as f:
        data = json.load(f)

    pool_k = data.get("pool_k", 10)
    ks = [k for k in K_VALUES if k <= pool_k]
    questions = data["questions"]

    included = []        # questions répondables et annotées
    n_hors_corpus = 0
    n_miss = 0           # aucun_pertinent
    n_unannotated = 0

    per_q = []  # (id, {recall@k}, {prec@k}, rr)

    for item in questions:
        if item.get("hors_corpus"):
            n_hors_corpus += 1
            continue

        relevant_ranks = [c["rang"] for c in item.get("candidats", []) if c.get("pertinent")]
        is_miss = bool(item.get("aucun_pertinent"))

        if not relevant_ranks and not is_miss:
            n_unannotated += 1
            print(f"  [!] non annotée : [{item['id']}] {item['question'][:55]}")
            continue

        recall_k, prec_k = {}, {}
        if is_miss or not relevant_ranks:
            # échec de récupération : aucun passage pertinent dans le pool
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

        per_q.append((item["id"], recall_k, prec_k, rr))
        included.append(item["id"])

    n = len(per_q)
    if n == 0:
        print("\n❌ Aucune question annotée. Ouvre rag_gold_template.json et coche")
        print("   'pertinent': true sur les bons passages (ou 'aucun_pertinent'/'hors_corpus').")
        return

    avg = lambda vals: sum(vals) / len(vals)
    recall = {k: avg([rk[k] for _, rk, _, _ in per_q]) for k in ks}
    precision = {k: avg([pk[k] for _, _, pk, _ in per_q]) for k in ks}
    mrr = avg([rr for *_, rr in per_q])

    # ── Récapitulatif console ────────────────────────────────────────────
    print("\n" + "═" * 60)
    print("  MÉTRIQUES RETRIEVAL DU PIPELINE RAG")
    print("═" * 60)
    print(f"  Questions évaluées (in-corpus, annotées) : {n}")
    print(f"    dont échecs de récupération (Recall=0)  : {n_miss}")
    print(f"  Questions hors-corpus (refus, exclues)    : {n_hors_corpus}")
    print(f"  Questions non annotées (ignorées)         : {n_unannotated}")
    print(f"  Taille du pool annoté (N)                 : {pool_k}")
    print("─" * 60)
    print(f"  {'k':>3} | {'Recall@k':>10} | {'Precision@k':>12}")
    print("─" * 60)
    for k in ks:
        print(f"  {k:>3} | {recall[k]*100:>9.1f}% | {precision[k]*100:>11.1f}%")
    print("─" * 60)
    print(f"  MRR : {mrr:.3f}")
    print("═" * 60)

    # ── Export LaTeX ─────────────────────────────────────────────────────
    rows = "\n".join(
        f"{k} & {recall[k]*100:.1f}\\,\\% & {precision[k]*100:.1f}\\,\\% \\\\\n\\hline"
        for k in ks
    )
    tex = f"""% Généré par rag_metrics.py — {n} questions évaluées (MRR = {mrr:.3f})
\\begin{{table}}[H]
\\centering \\small
\\renewcommand{{\\arraystretch}}{{1.25}}
\\caption{{Métriques de récupération documentaire du pipeline RAG (top-{pool_k}, {n} questions)}}
\\label{{tab:rag_retrieval}}
\\begin{{tabular}}{{|c|c|c|}}
\\hline
\\textbf{{$k$}} & \\textbf{{Recall@$k$}} & \\textbf{{Precision@$k$}} \\\\
\\hline
{rows}
\\end{{tabular}}

\\vspace{{0.4em}}
\\footnotesize Mean Reciprocal Rank (MRR) = {mrr:.3f}.
\\end{{table}}
"""
    with open(TEX, "w", encoding="utf-8") as f:
        f.write(tex)
    print(f"\n✅ Tableau LaTeX écrit dans : {TEX}")


if __name__ == "__main__":
    main()
