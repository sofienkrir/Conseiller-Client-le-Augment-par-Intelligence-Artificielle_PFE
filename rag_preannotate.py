"""
rag_preannotate.py
─────────────────────────────────────────────────────────────────────────────
PRÉ-ANNOTATION ASSISTÉE PAR LLM du fichier `rag_gold_template.json`.

But : accélérer l'annotation de la vérité-terrain RAG. Le script interroge un
LLM UNE fois par question (question + objectif + tous les candidats) et lui
demande de décider quels passages sont réellement pertinents.

Backends :
    • groq   (défaut) : Llama-3.3-70b via get_llm() — quota large, fiable.
    • gemini          : gemini-2.5-flash (free tier → quota 429 rapidement).

Reprise automatique : si `rag_gold_preannotated.json` existe déjà, les
questions DÉJÀ annotées avec succès sont conservées ; seules les questions en
erreur (ou non traitées) sont (re)faites. Utiliser --force pour tout refaire.

➜  Sortie : `rag_gold_preannotated.json` — À VÉRIFIER À LA MAIN avant rag_metrics.py.
⚠️  Ce script ne calcule PAS les métriques.

Champs ajoutés par candidat (pid/rang/titre/source/extrait JAMAIS modifiés) :
    "pertinent" (bool) · "justification_auto" (str) · "confidence" (0.0–1.0)
Champs question : "aucun_pertinent", "hors_corpus", "a_verifier".

Usage :
    python rag_preannotate.py                      # backend groq, reprise auto
    python rag_preannotate.py --backend gemini      # forcer Gemini
    python rag_preannotate.py --force               # tout re-annoter
    python rag_preannotate.py --limit 3             # test rapide
    python rag_preannotate.py --delay 1.5           # délai (s) entre appels
"""
import argparse
import json
import os
import re
import sys
import time

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from dotenv import load_dotenv
load_dotenv(override=True)

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

SRC = "rag_gold_template.json"
OUT = "rag_gold_preannotated.json"
CONF_THRESHOLD = 0.6  # en dessous → à vérifier manuellement


PROMPT_TEMPLATE = """Tu es un évaluateur expert chargé de constituer une vérité-terrain pour évaluer la RÉCUPÉRATION documentaire d'un système RAG bancaire (Attijari Bank Tunisie).

On te donne une QUESTION, son OBJECTIF, et une liste de PASSAGES CANDIDATS récupérés par le système. Pour CHAQUE passage, décide s'il est réellement PERTINENT, c'est-à-dire s'il contient une information utile pour répondre DIRECTEMENT à la question.

RÈGLES STRICTES :
1. Ne marque PAS un passage pertinent uniquement parce qu'il appartient à la même catégorie ou au même thème.
2. Question GÉNÉRALE (ex. "quelles cartes proposez-vous ?") → plusieurs passages peuvent être pertinents.
3. Question PRÉCISE sur un produit → seuls les passages parlant DIRECTEMENT de ce produit sont pertinents.
4. Question COMPARATIVE (produit A vs produit B) → les passages des DEUX produits comparés sont pertinents.
5. Question sur un TAUX / PLAFOND / DURÉE / CONDITION → le passage est pertinent uniquement s'il contient réellement cette information (ou décrit directement le produit concerné).
6. En cas de doute, laisse pertinent=false avec une confidence faible.
7. Sois cohérent : la "confidence" reflète ta certitude sur la décision (1.0 = certain, 0.5 = hésitant).

DÉCISIONS NIVEAU QUESTION :
- "aucun_pertinent" = true UNIQUEMENT si AUCUN des passages ci-dessous ne répond à la question.
- "hors_corpus" = true UNIQUEMENT si la question demande une information manifestement ABSENTE du corpus (ex. un taux/montant précis qui n'apparaît dans aucun passage), donc à laquelle le système ne PEUT pas répondre à partir de ces passages.

═══════════════════════════════════════
QUESTION : {question}
OBJECTIF : {objectif}
═══════════════════════════════════════
PASSAGES CANDIDATS :
{candidats}
═══════════════════════════════════════

Réponds UNIQUEMENT en JSON strict (pas de markdown, pas de texte autour), au format :
{{
  "candidats": [
    {{"rang": <int>, "pertinent": <true|false>, "justification_auto": "<1 phrase courte>", "confidence": <float 0.0-1.0>}}
  ],
  "aucun_pertinent": <true|false>,
  "hors_corpus": <true|false>
}}
Donne EXACTEMENT une entrée par passage candidat, avec le bon "rang"."""


# ════════════════════════════════════════
# Backends LLM
# ════════════════════════════════════════
def make_caller(backend: str):
    """Retourne (label, fn) où fn(prompt)->str (texte brut du LLM)."""
    if backend == "gemini":
        from dotenv import load_dotenv as _ld
        _ld(override=True)
        import google.generativeai as genai
        key = os.getenv("GEMINI_API_KEY")
        if not key:
            print("❌ GEMINI_API_KEY manquante dans .env"); sys.exit(1)
        genai.configure(api_key=key)
        model = genai.GenerativeModel("models/gemini-2.5-flash")

        def call(prompt):
            resp = model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.1,
                    "max_output_tokens": 4000,
                    "response_mime_type": "application/json",
                },
            )
            return resp.text
        return "models/gemini-2.5-flash", call

    # backend groq (défaut)
    from chatbot import get_llm
    llm = get_llm("french")  # ChatOpenAI -> Groq llama-3.3-70b
    if not os.getenv("GROQ_API_KEY"):
        print("❌ GROQ_API_KEY manquante dans .env"); sys.exit(1)

    def call(prompt):
        resp = llm.invoke(prompt)
        return getattr(resp, "content", None) or str(resp)
    return "groq/llama-3.3-70b-versatile", call


def _parse_json(raw: str) -> dict:
    raw = (raw or "").strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.IGNORECASE).strip()
    try:
        return json.loads(raw)
    except Exception:
        m = re.search(r"\{.*\}", raw, flags=re.DOTALL)
        if m:
            return json.loads(m.group(0))
        raise


def annotate_question(item: dict, call_fn, delay: float) -> dict:
    candidats = item.get("candidats", [])
    cand_txt = "\n".join(
        f"[rang {c['rang']}] Titre: {c.get('titre','?')} | Extrait: {c.get('extrait','')}"
        for c in candidats
    )
    prompt = PROMPT_TEMPLATE.format(
        question=item.get("question", ""),
        objectif=item.get("objectif", "") or "(non précisé)",
        candidats=cand_txt or "(aucun candidat)",
    )

    decisions, llm_hors_corpus, last_err = {}, False, None
    for attempt in range(4):  # plus de tentatives + backoff
        try:
            raw = call_fn(prompt)
            data = _parse_json(raw)
            for d in data.get("candidats", []):
                if isinstance(d, dict) and "rang" in d:
                    decisions[int(d["rang"])] = d
            llm_hors_corpus = bool(data.get("hors_corpus", False))
            last_err = None
            break
        except Exception as e:
            last_err = e
            time.sleep(delay * (attempt + 1))  # backoff progressif

    low_conf, has_pertinent = 0, False
    for c in candidats:
        d = decisions.get(c["rang"], {})
        if last_err is not None:
            c["pertinent"] = False
            c["justification_auto"] = f"[ERREUR LLM: {str(last_err)[:80]}] — à annoter manuellement"
            c["confidence"] = 0.0
        else:
            try:
                conf = max(0.0, min(1.0, float(d.get("confidence", 0.0))))
            except Exception:
                conf = 0.0
            c["pertinent"] = bool(d.get("pertinent", False))
            c["justification_auto"] = str(d.get("justification_auto", "")).strip()[:200] or "(pas de justification)"
            c["confidence"] = round(conf, 2)
        if c["pertinent"]:
            has_pertinent = True
        if c["confidence"] < CONF_THRESHOLD:
            low_conf += 1

    item["hors_corpus"] = llm_hors_corpus and not has_pertinent
    item["aucun_pertinent"] = (not has_pertinent) and not item["hors_corpus"]
    item["a_verifier"] = bool(last_err is not None or low_conf > 0 or item["aucun_pertinent"] or item["hors_corpus"])
    item["_n_low_confidence"] = low_conf
    item["_llm_error"] = str(last_err)[:120] if last_err else None
    if delay:
        time.sleep(delay)
    return item


def _is_done(item: dict) -> bool:
    """Question déjà annotée AVEC SUCCÈS (à conserver en mode reprise)."""
    if item.get("_llm_error"):
        return False
    cands = item.get("candidats", [])
    return bool(cands) and all("confidence" in c for c in cands)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--backend", choices=["groq", "gemini"], default="groq")
    ap.add_argument("--limit", type=int, default=0, help="ne traiter que les N premières questions")
    ap.add_argument("--delay", type=float, default=None, help="délai (s) entre appels (def. groq=1.5, gemini=4)")
    ap.add_argument("--force", action="store_true", help="tout re-annoter (ignore le fichier existant)")
    args = ap.parse_args()

    delay = args.delay if args.delay is not None else (4.0 if args.backend == "gemini" else 1.5)

    # Reprise : repartir du fichier de sortie s'il existe (sinon du template)
    base = OUT if (os.path.exists(OUT) and not args.force) else SRC
    if not os.path.exists(base):
        print(f"❌ {base} introuvable. Lance d'abord : python rag_build_gold.py")
        return
    with open(base, encoding="utf-8") as f:
        data = json.load(f)
    questions = data["questions"]
    if args.limit:
        questions = questions[: args.limit]

    todo = [q for q in questions if args.force or not _is_done(q)]
    label, call_fn = make_caller(args.backend)
    print(f"Backend = {label} | source = {base}")
    print(f"{len(todo)}/{len(questions)} question(s) à (re)traiter (les autres déjà OK sont conservées)\n")

    for i, item in enumerate(todo, 1):
        print(f"  ({i:>2}/{len(todo)}) [{item['id']}] {item['question'][:52]}")
        annotate_question(item, call_fn, delay)
        if item.get("_llm_error"):
            print(f"        → ❌ ERREUR LLM (à réessayer) : {item['_llm_error'][:60]}")
        else:
            npert = sum(1 for c in item["candidats"] if c["pertinent"])
            tag = "HORS-CORPUS" if item["hors_corpus"] else ("AUCUN PERTINENT" if item["aucun_pertinent"] else f"{npert} pertinent(s)")
            flag = "  ⚠️ à vérifier" if item["a_verifier"] else ""
            print(f"        → {tag}{flag}")

    data["questions"] = questions
    data["_preannotated_by"] = label
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # ── Résumé ───────────────────────────────────────────────────────────
    n_with_pert = sum(1 for q in questions if any(c.get("pertinent") for c in q["candidats"]))
    n_aucun = sum(1 for q in questions if q.get("aucun_pertinent"))
    n_hors = sum(1 for q in questions if q.get("hors_corpus"))
    n_low = sum(q.get("_n_low_confidence", 0) for q in questions)
    n_err = sum(1 for q in questions if q.get("_llm_error"))
    a_verifier = [q["id"] for q in questions if q.get("a_verifier")]

    print("\n" + "═" * 60)
    print("  RÉSUMÉ PRÉ-ANNOTATION")
    print("═" * 60)
    print(f"  Questions traitées (total fichier)          : {len(questions)}")
    print(f"  Questions avec ≥1 passage pertinent         : {n_with_pert}")
    print(f"  Questions 'aucun_pertinent'                 : {n_aucun}")
    print(f"  Questions 'hors_corpus'                     : {n_hors}")
    print(f"  Décisions confidence < {CONF_THRESHOLD} (à vérifier)   : {n_low}")
    if n_err:
        print(f"  ❌ Questions ENCORE en erreur LLM           : {n_err}  → relance le script")
    print("─" * 60)
    print(f"  Fichier écrit : {OUT}")
    print(f"  Questions à VÉRIFIER manuellement ({len(a_verifier)}) :")
    print("   ", ", ".join(a_verifier) if a_verifier else "(aucune)")
    print("═" * 60)
    if n_err:
        print("  ⚠️  Des questions sont en erreur — relance simplement :  python rag_preannotate.py")
    else:
        print("  ✅ Vérifie rag_gold_preannotated.json, renomme-le en rag_gold_template.json, puis rag_metrics.py")


if __name__ == "__main__":
    main()
