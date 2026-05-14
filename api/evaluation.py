"""
api/evaluation.py
Module de scoring automatique des réponses du chatbot.

Score AUTO calculé en moins de 50ms, sans appel LLM externe.
Quatre métriques déterministes:
  1. Groundedness   — % de mots de la réponse présents dans les sources
  2. Source citation — nombre de sources effectivement citées
  3. Coverage        — % de sources sur le total retourné par le RAG
  4. Length consistency — longueur de la réponse cohérente avec la question
"""

import os
import re
from datetime import datetime
from typing import Optional
from bson import ObjectId
from pymongo import MongoClient, DESCENDING, ASCENDING

# ════════════════════════════════════════
# Connexion MongoDB
# ════════════════════════════════════════
_client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
_db = _client["attijari_chatbot"]
_evaluations_col = _db["evaluations"]

# Index pour performance
_evaluations_col.create_index([("conversation_id", ASCENDING)])
_evaluations_col.create_index([("created_at", DESCENDING)])
_evaluations_col.create_index([("score_global", ASCENDING)])
_evaluations_col.create_index([("flags.hallucination", ASCENDING)])


# ════════════════════════════════════════
# Configuration des seuils
# ════════════════════════════════════════
CONFIDENCE_LEVELS = {
    "ELEVE":  {"min": 7.5, "max": 10.0, "color": "green",  "icon": "✅", "label": "Élevé"},
    "MOYEN":  {"min": 5.0, "max": 7.5,  "color": "amber",  "icon": "⚠️", "label": "Moyen"},
    "FAIBLE": {"min": 0.0, "max": 5.0,  "color": "red",    "icon": "🚨", "label": "Faible"},
}


# ════════════════════════════════════════
# 1. SCORING AUTOMATIQUE (synchrone, rapide)
# ════════════════════════════════════════

def compute_auto_score(
    question: str,
    answer: str,
    retrieved_sources: list,
    used_sources: list,
) -> dict:
    """
    Calcule un score automatique de qualité (0-10) en quelques millisecondes.
    
    Args:
        question: question utilisateur
        answer: réponse générée par le chatbot
        retrieved_sources: passages retournés par le RAG (list de dicts avec 'content', 'metadata')
        used_sources: passages effectivement cités dans la réponse (list de dicts)
    
    Returns:
        dict avec:
          - score_global (0-10)
          - sub_scores (dict des 4 métriques)
          - level (ELEVE | MOYEN | FAIBLE)
    """
    # 1. Groundedness — la réponse s'appuie-t-elle sur les sources?
    groundedness = _compute_groundedness(answer, retrieved_sources)
    
    # 2. Source citation — combien de sources citées?
    citation_score = _compute_citation_score(used_sources, retrieved_sources)
    
    # 3. Coverage — utilise-t-on assez de sources?
    coverage = _compute_coverage(used_sources, retrieved_sources)
    
    # 4. Length consistency — longueur cohérente?
    length_score = _compute_length_score(question, answer)
    
    # Score global pondéré
    score_global = round(
        groundedness * 0.45 +
        citation_score * 0.25 +
        coverage * 0.15 +
        length_score * 0.15,
        2
    )
    
    return {
        "score_global": score_global,
        "sub_scores": {
            "groundedness": round(groundedness, 2),
            "citation": round(citation_score, 2),
            "coverage": round(coverage, 2),
            "length_consistency": round(length_score, 2),
        },
        "level": _get_confidence_level(score_global),
    }


def _compute_groundedness(answer: str, retrieved_sources: list) -> float:
    """
    Mesure si les n-grams de la réponse sont présents dans les sources.
    Plus la réponse est ancrée dans les sources, plus le score est élevé.
    Retourne un score entre 0 et 10.
    """
    if not retrieved_sources or not answer:
        return 5.0  # neutre si pas de sources
    
    # Concaténer toutes les sources
    sources_text = " ".join([
        s.get("content", "") if isinstance(s, dict) else str(s)
        for s in retrieved_sources
    ]).lower()
    
    # Extraire les mots significatifs de la réponse (>3 caractères, non stopwords)
    answer_lower = answer.lower()
    words = re.findall(r"\b[a-zàâäéèêëïîôöùûüç]{4,}\b", answer_lower)
    
    # Stopwords français + Derja courants (filtrage léger)
    stopwords = {
        "dans", "pour", "avec", "vous", "votre", "cette", "leur", "leurs",
        "comme", "mais", "sont", "être", "avoir", "plus", "moins", "très",
        "fait", "faire", "elle", "ils", "nous", "alors", "donc", "ainsi",
        "tres", "tout", "tous", "tout", "même", "encore", "aussi", "bien",
        "kima", "wala", "lakin", "mte3", "fih", "alli", "elli", "hedha",
    }
    significant_words = [w for w in words if w not in stopwords]
    
    if not significant_words:
        return 5.0
    
    # Compter combien sont dans les sources
    matched = sum(1 for w in significant_words if w in sources_text)
    ratio = matched / len(significant_words)
    
    # Score = ratio * 10, mais avec saturation douce
    # 60% match = score 6, 80% = score 9, 100% = score 10
    if ratio >= 0.8:
        return 9.0 + (ratio - 0.8) * 5  # 0.8→9, 1.0→10
    elif ratio >= 0.5:
        return 6.0 + (ratio - 0.5) * 10  # 0.5→6, 0.8→9
    else:
        return ratio * 12  # 0→0, 0.5→6


def _compute_citation_score(used_sources: list, retrieved_sources: list) -> float:
    """
    Évalue le nombre de sources effectivement utilisées.
    Une réponse sans aucune source citée est suspecte.
    """
    if not retrieved_sources:
        return 5.0
    
    n_used = len(used_sources) if used_sources else 0
    n_retrieved = len(retrieved_sources)
    
    # Idéal: 2-4 sources citées
    if n_used == 0:
        return 2.0  # mauvais signe
    elif n_used == 1:
        return 6.0  # acceptable
    elif n_used <= 4:
        return 9.0  # idéal
    elif n_used <= 6:
        return 7.0  # un peu trop
    else:
        return 5.0  # surcharge de sources, suspect


def _compute_coverage(used_sources: list, retrieved_sources: list) -> float:
    """
    Pourcentage de sources retournées par le RAG qui sont effectivement utilisées.
    """
    if not retrieved_sources:
        return 5.0
    
    n_used = len(used_sources) if used_sources else 0
    n_retrieved = len(retrieved_sources)
    
    ratio = n_used / n_retrieved if n_retrieved > 0 else 0
    
    # 30-60% est idéal (utiliser toutes les sources est suspect)
    if 0.3 <= ratio <= 0.6:
        return 9.0
    elif 0.2 <= ratio < 0.3 or 0.6 < ratio <= 0.75:
        return 7.0
    elif ratio < 0.2:
        return max(3.0, ratio * 15)
    else:  # ratio > 0.75
        return 6.0


def _compute_length_score(question: str, answer: str) -> float:
    """
    Vérifie que la longueur de la réponse est cohérente avec la question.
    Une question simple → réponse courte. Question complexe → réponse longue.
    """
    if not answer:
        return 0.0
    
    q_words = len(question.split())
    a_words = len(answer.split())
    
    # Ratio idéal: 5-25x la longueur de la question
    if a_words < 5:
        return 2.0  # trop court
    if a_words > 500:
        return 5.0  # trop long
    
    ratio = a_words / max(q_words, 1)
    
    if 5 <= ratio <= 25:
        return 9.0  # idéal
    elif 3 <= ratio < 5 or 25 < ratio <= 40:
        return 7.0
    elif ratio < 3:
        return 5.0
    else:
        return 6.0


def _get_confidence_level(score: float) -> str:
    """Détermine le niveau de confiance (ELEVE/MOYEN/FAIBLE)."""
    if score >= 7.5:
        return "ELEVE"
    elif score >= 5.0:
        return "MOYEN"
    else:
        return "FAIBLE"


def get_level_info(level: str) -> dict:
    """Retourne les infos d'affichage pour un niveau."""
    return CONFIDENCE_LEVELS.get(level, CONFIDENCE_LEVELS["MOYEN"])


# ════════════════════════════════════════
# 2. PERSISTENCE DES ÉVALUATIONS
# ════════════════════════════════════════

def save_evaluation(
    conversation_id: str,
    user_id: str,
    question: str,
    answer: str,
    auto_score: dict,
    retrieved_sources: list,
    used_sources: list,
    category: Optional[str] = None,
    language: Optional[str] = None,
) -> str:
    """
    Enregistre l'évaluation initiale (avec score AUTO uniquement).
    Le score LLM-Judge sera ajouté plus tard via update_llm_judge_score().
    
    Returns:
        eval_id (str): l'ID de l'évaluation créée
    """
    doc = {
        "conversation_id": conversation_id,
        "user_id": ObjectId(user_id) if user_id else None,
        
        "question": question,
        "answer": answer,
        "category": category,
        "language": language,
        
        # Score automatique (immédiat)
        "auto_score": auto_score,
        
        # Score LLM-Judge (rempli plus tard async)
        "llm_judge_score": None,
        "llm_judge_status": "pending",  # pending | completed | failed
        "llm_judge_completed_at": None,
        
        # Feedback utilisateur (rempli quand user clique 👍/👎)
        "user_feedback": None,
        
        # Sources
        "n_retrieved_sources": len(retrieved_sources) if retrieved_sources else 0,
        "n_used_sources": len(used_sources) if used_sources else 0,
        "used_sources_titles": [
            s.get("metadata", {}).get("title", "?") if isinstance(s, dict) else str(s)
            for s in (used_sources or [])
        ][:5],
        
        # Flags (peuvent être mis à jour par LLM-Judge)
        "flags": {
            "hallucination_detected": False,
            "invented_data": False,
            "risky_recommendation": False,
            "needs_review": auto_score["score_global"] < 5.0,
        },
        
        "created_at": datetime.utcnow(),
    }
    
    result = _evaluations_col.insert_one(doc)
    return str(result.inserted_id)


def update_llm_judge_score(eval_id: str, judge_result: dict) -> bool:
    """
    Met à jour l'évaluation avec le résultat du LLM-Judge.
    
    Args:
        eval_id: ID de l'évaluation
        judge_result: dict du résultat (de llm_judge.evaluate_response)
    """
    if "error" in judge_result:
        _evaluations_col.update_one(
            {"_id": ObjectId(eval_id)},
            {"$set": {
                "llm_judge_status": "failed",
                "llm_judge_error": judge_result["error"],
                "llm_judge_completed_at": datetime.utcnow(),
            }}
        )
        return False
    
    # Update avec les scores et flags
    flags_update = {
        "flags.hallucination_detected": judge_result.get("flags", {}).get("hallucination", False),
        "flags.invented_data": judge_result.get("flags", {}).get("donnees_inventees", False),
        "flags.risky_recommendation": judge_result.get("flags", {}).get("recommandation_risquee", False),
    }
    
    # Recalculer needs_review si LLM-Judge < 5
    judge_score = judge_result.get("score_global", 5.0)
    if judge_score < 5.0 or any(flags_update[k] for k in flags_update):
        flags_update["flags.needs_review"] = True
    
    _evaluations_col.update_one(
        {"_id": ObjectId(eval_id)},
        {"$set": {
            "llm_judge_score": judge_result,
            "llm_judge_status": "completed",
            "llm_judge_completed_at": datetime.utcnow(),
            **flags_update,
        }}
    )
    return True


def save_user_feedback(
    eval_id: str,
    user_id: str,
    rating: str,        # "up" | "down"
    comment: Optional[str] = None,
    issue_type: Optional[str] = None,  # "incorrect" | "incomplete" | "irrelevant" | "other"
) -> bool:
    """Enregistre le feedback utilisateur (👍/👎)."""
    if rating not in ["up", "down"]:
        return False
    
    feedback = {
        "rating": rating,
        "comment": comment.strip() if comment else None,
        "issue_type": issue_type,
        "submitted_at": datetime.utcnow(),
        "submitted_by": ObjectId(user_id) if user_id else None,
    }
    
    result = _evaluations_col.update_one(
        {"_id": ObjectId(eval_id)},
        {"$set": {
            "user_feedback": feedback,
            # Si feedback négatif, flag pour review
            **({"flags.needs_review": True} if rating == "down" else {}),
        }}
    )
    return result.modified_count > 0


# ════════════════════════════════════════
# 3. LECTURE / STATS
# ════════════════════════════════════════

def get_evaluation(eval_id: str) -> Optional[dict]:
    """Récupère une évaluation par ID."""
    doc = _evaluations_col.find_one({"_id": ObjectId(eval_id)})
    return _format_evaluation(doc) if doc else None


def get_evaluation_by_conversation(conversation_id: str) -> Optional[dict]:
    """Récupère l'évaluation associée à un message de conversation."""
    doc = _evaluations_col.find_one(
        {"conversation_id": conversation_id},
        sort=[("created_at", DESCENDING)]
    )
    return _format_evaluation(doc) if doc else None


def list_problematic_evaluations(limit: int = 20) -> list:
    """Liste des évaluations à reviewer (score < 5 ou feedback négatif)."""
    cursor = _evaluations_col.find({
        "$or": [
            {"flags.needs_review": True},
            {"auto_score.score_global": {"$lt": 5.0}},
            {"user_feedback.rating": "down"},
        ]
    }).sort("created_at", DESCENDING).limit(limit)
    return [_format_evaluation(doc) for doc in cursor]


def get_global_stats(days: int = 30) -> dict:
    """Statistiques globales sur les N derniers jours pour le dashboard admin."""
    from datetime import timedelta
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Agrégation MongoDB
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "avg_auto_score": {"$avg": "$auto_score.score_global"},
            "avg_judge_score": {"$avg": "$llm_judge_score.score_global"},
            "n_hallucinations": {
                "$sum": {"$cond": [{"$eq": ["$flags.hallucination_detected", True]}, 1, 0]}
            },
            "n_needs_review": {
                "$sum": {"$cond": [{"$eq": ["$flags.needs_review", True]}, 1, 0]}
            },
            "n_thumbs_up": {
                "$sum": {"$cond": [{"$eq": ["$user_feedback.rating", "up"]}, 1, 0]}
            },
            "n_thumbs_down": {
                "$sum": {"$cond": [{"$eq": ["$user_feedback.rating", "down"]}, 1, 0]}
            },
            "n_feedback": {
                "$sum": {"$cond": [{"$ne": ["$user_feedback", None]}, 1, 0]}
            },
        }},
    ]
    
    result = list(_evaluations_col.aggregate(pipeline))
    if not result:
        return _empty_stats(days)
    
    r = result[0]
    n_feedback = r.get("n_feedback", 0) or 0
    n_up = r.get("n_thumbs_up", 0) or 0
    
    # Distribution des scores
    distribution = _get_score_distribution(start_date)
    
    return {
        "period_days": days,
        "total_evaluations": r.get("total", 0),
        "avg_auto_score": round(r.get("avg_auto_score") or 0, 2),
        "avg_judge_score": round(r.get("avg_judge_score") or 0, 2),
        "hallucinations": r.get("n_hallucinations", 0),
        "needs_review": r.get("n_needs_review", 0),
        "user_feedback": {
            "thumbs_up": n_up,
            "thumbs_down": r.get("n_thumbs_down", 0) or 0,
            "total": n_feedback,
            "satisfaction_rate": round((n_up / n_feedback * 100) if n_feedback > 0 else 0, 1),
        },
        "score_distribution": distribution,
    }


def _get_score_distribution(since: datetime) -> dict:
    """Distribution des scores par tranche (0-2, 2-4, 4-6, 6-8, 8-10)."""
    ranges = [
        {"min": 0, "max": 2, "label": "0-2"},
        {"min": 2, "max": 4, "label": "2-4"},
        {"min": 4, "max": 6, "label": "4-6"},
        {"min": 6, "max": 8, "label": "6-8"},
        {"min": 8, "max": 10.1, "label": "8-10"},
    ]
    
    distribution = {}
    for r in ranges:
        count = _evaluations_col.count_documents({
            "created_at": {"$gte": since},
            "auto_score.score_global": {"$gte": r["min"], "$lt": r["max"]},
        })
        distribution[r["label"]] = count
    
    return distribution


def get_daily_scores(days: int = 7) -> list:
    """Score moyen par jour sur les N derniers jours (pour graphique)."""
    from datetime import timedelta
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": {
                "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
            },
            "avg_auto": {"$avg": "$auto_score.score_global"},
            "avg_judge": {"$avg": "$llm_judge_score.score_global"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    
    results = list(_evaluations_col.aggregate(pipeline))
    return [
        {
            "date": r["_id"],
            "avg_auto_score": round(r.get("avg_auto") or 0, 2),
            "avg_judge_score": round(r.get("avg_judge") or 0, 2),
            "count": r["count"],
        }
        for r in results
    ]


def _empty_stats(days: int) -> dict:
    return {
        "period_days": days,
        "total_evaluations": 0,
        "avg_auto_score": 0,
        "avg_judge_score": 0,
        "hallucinations": 0,
        "needs_review": 0,
        "user_feedback": {
            "thumbs_up": 0,
            "thumbs_down": 0,
            "total": 0,
            "satisfaction_rate": 0,
        },
        "score_distribution": {"0-2": 0, "2-4": 0, "4-6": 0, "6-8": 0, "8-10": 0},
    }


# ════════════════════════════════════════
# 4. FORMATAGE pour le frontend
# ════════════════════════════════════════

def _format_evaluation(doc: dict) -> Optional[dict]:
    if not doc:
        return None
    return {
        "id": str(doc["_id"]),
        "conversation_id": doc.get("conversation_id"),
        "user_id": str(doc["user_id"]) if doc.get("user_id") else None,
        "question": doc.get("question"),
        "answer": doc.get("answer"),
        "category": doc.get("category"),
        "language": doc.get("language"),
        "auto_score": doc.get("auto_score"),
        "llm_judge_score": doc.get("llm_judge_score"),
        "llm_judge_status": doc.get("llm_judge_status"),
        "user_feedback": _format_feedback(doc.get("user_feedback")),
        "flags": doc.get("flags", {}),
        "n_retrieved_sources": doc.get("n_retrieved_sources", 0),
        "n_used_sources": doc.get("n_used_sources", 0),
        "used_sources_titles": doc.get("used_sources_titles", []),
        "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
    }


def _format_feedback(fb: Optional[dict]) -> Optional[dict]:
    if not fb:
        return None
    return {
        "rating": fb.get("rating"),
        "comment": fb.get("comment"),
        "issue_type": fb.get("issue_type"),
        "submitted_at": fb["submitted_at"].isoformat() if fb.get("submitted_at") else None,
    }