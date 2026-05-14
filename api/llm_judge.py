"""
api/llm_judge.py
LLM-as-a-Judge: utilise Gemini Flash pour évaluer la qualité des réponses du chatbot.

S'exécute en ASYNC (background) pour ne pas ralentir l'expérience user.
Stocke le résultat dans la collection 'evaluations' via evaluation.update_llm_judge_score().
"""

# Chargement du .env AVANT tout autre import
from dotenv import load_dotenv
from pymongo import response
load_dotenv(override=True)

import os
import json
import asyncio
import logging
from typing import Optional
import google.generativeai as genai

from .evaluation import update_llm_judge_score

# ════════════════════════════════════════
# Configuration
# ════════════════════════════════════════
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
JUDGE_MODEL_NAME = "models/gemini-2.5-flash"  # rapide et gratuit

# Logger pour tracer les évaluations
logger = logging.getLogger("llm_judge")
logger.setLevel(logging.INFO)

# Configuration de Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    _judge_model = genai.GenerativeModel(JUDGE_MODEL_NAME)
else:
    _judge_model = None
    logger.warning("GEMINI_API_KEY non configurée — LLM-Judge désactivé")


# ════════════════════════════════════════
# Prompt du juge
# ════════════════════════════════════════

JUDGE_PROMPT_TEMPLATE = """Tu es un évaluateur expert et impartial des réponses d'un chatbot bancaire d'Attijari Bank Tunisie.

Ton rôle est d'évaluer rigoureusement chaque réponse selon des critères objectifs, dans un contexte bancaire où la précision et la fiabilité des informations sont CRITIQUES.

═══════════════════════════════════════
QUESTION DU CLIENT
═══════════════════════════════════════
{question}

═══════════════════════════════════════
RÉPONSE DU CHATBOT
═══════════════════════════════════════
{answer}

═══════════════════════════════════════
SOURCES UTILISÉES (passages réels du catalogue Attijari)
═══════════════════════════════════════
{sources}

═══════════════════════════════════════
ÉVALUE selon 4 critères (note de 0 à 10 chacun)
═══════════════════════════════════════

1. VÉRACITÉ (poids le plus fort)
   La réponse est-elle factuellement correcte par rapport aux sources fournies ?
   - 10 = Parfaitement aligné aux sources, aucune affirmation non sourcée
   - 7-9 = Globalement correct, quelques détails non sourcés mais plausibles
   - 4-6 = Quelques erreurs ou imprécisions notables
   - 0-3 = Information inventée, contradictoire ou dangereuse

2. PERTINENCE
   La réponse répond-elle directement à la question posée ?
   - 10 = Répond précisément et entièrement à la question
   - 7-9 = Répond correctement, peut-être un peu hors-sujet sur certains points
   - 4-6 = Répond partiellement
   - 0-3 = Hors-sujet ou évite la question

3. CLARTÉ
   La réponse est-elle bien structurée, compréhensible pour un client tunisien ?
   - 10 = Très claire, bien organisée, facilement compréhensible
   - 4-7 = Compréhensible mais peut être améliorée
   - 0-3 = Confuse, mal structurée, jargon excessif

4. CONFORMITÉ LINGUISTIQUE
   La langue de la réponse correspond-elle à celle de la question ?
   (FR → réponse FR ; Derja → réponse Derja-Français mix ; Mix → réponse Mix)
   - 10 = Langue parfaitement respectée
   - 5 = Langue partiellement respectée
   - 0 = Mauvaise langue choisie

═══════════════════════════════════════
DÉTECTE également (true/false)
═══════════════════════════════════════
- hallucination : la réponse mentionne-t-elle des produits/services/données qui ne sont PAS dans les sources ?
- donnees_inventees : la réponse mentionne-t-elle des chiffres (taux, montants, dates) qui ne sont PAS dans les sources ?
- recommandation_risquee : la réponse donne-t-elle un conseil financier potentiellement dangereux ou inadapté ?

═══════════════════════════════════════
RÉPONDS UNIQUEMENT EN JSON STRICT (pas de markdown, pas de texte avant/après)
═══════════════════════════════════════

{{
  "scores": {{
    "veracite": <int 0-10>,
    "pertinence": <int 0-10>,
    "clarte": <int 0-10>,
    "conformite_linguistique": <int 0-10>
  }},
  "score_global": <float 0-10, moyenne pondérée: véracité*0.4 + pertinence*0.3 + clarté*0.15 + conformité*0.15>,
  "flags": {{
    "hallucination": <true|false>,
    "donnees_inventees": <true|false>,
    "recommandation_risquee": <true|false>
  }},
  "justification": "<2-3 phrases concises expliquant ton évaluation et les points critiques>",
  "niveau_confiance": "<ELEVE | MOYEN | FAIBLE>"
}}

IMPORTANT:
- Sois STRICT sur la véracité. Toute affirmation non présente dans les sources mérite une pénalité.
- Si tu détectes une hallucination, score véracité ≤ 4.
- Le score_global doit refléter l'ensemble: si véracité < 5, niveau_confiance = FAIBLE.
- Réponds UNIQUEMENT le JSON, rien d'autre."""


# ════════════════════════════════════════
# Fonction principale d'évaluation
# ════════════════════════════════════════

async def evaluate_response(
    question: str,
    answer: str,
    sources: list,
) -> dict:
    """
    Évalue une réponse de chatbot via Gemini Flash.
    
    Args:
        question: question utilisateur originale
        answer: réponse générée par le chatbot
        sources: liste des passages utilisés (chaque passage est un dict avec 'content' et 'metadata')
    
    Returns:
        dict avec scores, flags, justification, niveau_confiance
        OU {"error": "..."} si problème
    """
    if not _judge_model:
        return {"error": "LLM-Judge non disponible (GEMINI_API_KEY manquante)"}
    
    # Formatter les sources pour le prompt
    sources_text = _format_sources_for_prompt(sources)
    
    # Construire le prompt
    prompt = JUDGE_PROMPT_TEMPLATE.format(
        question=question.strip(),
        answer=answer.strip(),
        sources=sources_text,
    )
    
    try:
        # Appel asynchrone à Gemini
        response = await asyncio.to_thread(
            _judge_model.generate_content,
            prompt,
            generation_config={
                "temperature": 0.1,  # déterministe pour évaluation
                "max_output_tokens": 3000,
                "response_mime_type": "application/json",  # force JSON
            },
        )
        
        raw_text = response.text.strip()
        logger.info("LLM-Judge raw response length: %s", len(raw_text))
        logger.info("LLM-Judge raw response preview: %r", raw_text[:1500])

        try:
            candidate = response.candidates[0]
            logger.info("LLM-Judge finish_reason: %s", getattr(candidate, "finish_reason", None))
        except Exception:
            logger.error("Erreur lors de la récupération du finish_reason")
            pass
        
        # Parser le JSON
        result = _parse_judge_response(raw_text)
        
        # Validation et normalisation
        result = _validate_result(result)
        
        return result
        
    except Exception as e:
        logger.error(f"Erreur LLM-Judge: {e}")
        return {"error": f"Erreur évaluation: {str(e)[:200]}"}


def _format_sources_for_prompt(sources: list) -> str:
    """Formate les sources pour le prompt du juge."""
    if not sources:
        return "(Aucune source utilisée)"
    
    formatted = []
    for i, src in enumerate(sources[:8], 1):  # max 8 sources pour ne pas exploser le contexte
        if isinstance(src, dict):
            content = src.get("content", "") or src.get("page_content", "")
            title = src.get("metadata", {}).get("title", f"Source {i}")
            content = content[:600]  # limiter chaque source
            formatted.append(f"[Source {i} - {title}]\n{content}")
        else:
            formatted.append(f"[Source {i}]\n{str(src)[:600]}")
    
    return "\n\n".join(formatted)


def _parse_judge_response(raw_text: str) -> dict:
    """
     "justification": "Évaluation non disponible (réponse JSON Gemini incomplète ou invalide)",
    """
    import re
    import ast

    def fallback(reason: str = "parsing échoué") -> dict:
        return {
            "scores": {
                "veracite": 5,
                "pertinence": 5,
                "clarte": 5,
                "conformite_linguistique": 5,
            },
            "score_global": 5.0,
            "flags": {
                "hallucination": False,
                "donnees_inventees": False,
                "recommandation_risquee": False,
            },
            "justification": f"Évaluation non disponible ({reason})",
            "niveau_confiance": "MOYEN",
            "parse_error": True,
        }

    def extract_first_json_object(text: str) -> str | None:
        """
        Extrait le premier objet JSON équilibré {...}
        sans être trompé par des accolades dans les strings.
        """
        start = text.find("{")
        if start == -1:
            return None

        depth = 0
        in_string = False
        escape = False

        for i in range(start, len(text)):
            ch = text[i]

            if in_string:
                if escape:
                    escape = False
                elif ch == "\\":
                    escape = True
                elif ch == '"':
                    in_string = False
            else:
                if ch == '"':
                    in_string = True
                elif ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
                    if depth == 0:
                        return text[start:i + 1]

        return None

    if not raw_text or not raw_text.strip():
        return fallback("réponse vide")

    text = raw_text.strip().lstrip("\ufeff")

    # Enlever les blocs markdown ```json ... ```
    text_no_fence = re.sub(r"^\s*```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text_no_fence = re.sub(r"\s*```\s*$", "", text_no_fence).strip()

    candidates = [
        text,
        text_no_fence,
    ]

    extracted = extract_first_json_object(text_no_fence)
    if extracted:
        candidates.append(extracted)

    last_error = None

    for candidate in candidates:
        candidate = candidate.strip()

        # Supprimer les virgules finales invalides : {"a": 1,}
        candidate_clean = re.sub(r",(\s*[}\]])", r"\1", candidate)

        try:
            return json.loads(candidate_clean)
        except json.JSONDecodeError as e:
            last_error = e

        # Fallback si Gemini répond avec un dict style Python :
        # {'score_global': 8, 'flags': {'hallucination': False}}
        try:
            obj = ast.literal_eval(candidate_clean)
            if isinstance(obj, dict):
                return obj
        except Exception:
            pass

    logger.warning(
        "LLM-Judge parse failed. error=%s | raw_preview=%r",
        last_error,
        raw_text[:1000],
    )

    return fallback("JSON invalide")


def _validate_result(result: dict) -> dict:
    """Valide et normalise le résultat du juge."""
    # Assurer la présence des champs
    result.setdefault("scores", {})
    result.setdefault("flags", {})
    result.setdefault("justification", "")
    result.setdefault("niveau_confiance", "MOYEN")
    
    # Clamp des scores
    scores = result["scores"]
    for key in ["veracite", "pertinence", "clarte", "conformite_linguistique"]:
        val = scores.get(key, 5)
        scores[key] = max(0, min(10, int(val) if isinstance(val, (int, float)) else 5))
    
    # Score global pondéré si manquant ou incohérent
    computed_global = (
        scores["veracite"] * 0.4 +
        scores["pertinence"] * 0.3 +
        scores["clarte"] * 0.15 +
        scores["conformite_linguistique"] * 0.15
    )
    
    given_global = result.get("score_global")
    if not isinstance(given_global, (int, float)) or abs(given_global - computed_global) > 2:
        result["score_global"] = round(computed_global, 2)
    else:
        result["score_global"] = round(float(given_global), 2)
    
    # Validation des flags
    flags = result["flags"]
    for k in ["hallucination", "donnees_inventees", "recommandation_risquee"]:
        flags[k] = bool(flags.get(k, False))
    
    # Validation du niveau
    if result["niveau_confiance"] not in ["ELEVE", "MOYEN", "FAIBLE"]:
        score = result["score_global"]
        if score >= 7.5:
            result["niveau_confiance"] = "ELEVE"
        elif score >= 5.0:
            result["niveau_confiance"] = "MOYEN"
        else:
            result["niveau_confiance"] = "FAIBLE"
    
    # Si flag hallucination → forcer FAIBLE
    if flags["hallucination"] or flags["donnees_inventees"]:
        if result["niveau_confiance"] == "ELEVE":
            result["niveau_confiance"] = "MOYEN"
    
    return result


# ════════════════════════════════════════
# Wrapper async pour appel depuis FastAPI BackgroundTasks
# ════════════════════════════════════════

async def evaluate_and_save(
    eval_id: str,
    question: str,
    answer: str,
    sources: list,
):
    """
    Évalue la réponse + met à jour l'évaluation en base.
    À appeler via BackgroundTasks de FastAPI pour ne pas bloquer la réponse user.
    """
    try:
        result = await evaluate_response(question, answer, sources)
        update_llm_judge_score(eval_id, result)
        
        if "error" not in result:
            logger.info(
                f"LLM-Judge OK | eval={eval_id} | "
                f"score={result.get('score_global')} | "
                f"niveau={result.get('niveau_confiance')}"
            )
        else:
            logger.warning(f"LLM-Judge ERROR | eval={eval_id} | {result['error']}")
            
    except Exception as e:
        logger.error(f"LLM-Judge CRASH | eval={eval_id} | {e}")
        update_llm_judge_score(eval_id, {"error": str(e)})