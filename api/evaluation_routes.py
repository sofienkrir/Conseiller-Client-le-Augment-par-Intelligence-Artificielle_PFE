"""
api/evaluation_routes.py
Endpoints REST pour la gestion des évaluations et du dashboard admin.
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional

from .evaluation import (
    save_user_feedback,
    get_evaluation,
    get_evaluation_by_conversation,
    list_problematic_evaluations,
    get_global_stats,
    get_daily_scores,
    get_level_info,
)
from .auth_routes import get_current_user_dependency, get_current_admin_dependency


router = APIRouter()


# ════════════════════════════════════════
# Pydantic models
# ════════════════════════════════════════

class FeedbackRequest(BaseModel):
    rating: str = Field(..., description="'up' ou 'down'")
    comment: Optional[str] = Field(None, max_length=500)
    issue_type: Optional[str] = Field(None, description="incorrect | incomplete | irrelevant | other")


# ════════════════════════════════════════
# Routes USER (feedback)
# ════════════════════════════════════════

@router.post("/evaluations/{eval_id}/feedback")
async def submit_feedback(
    eval_id: str,
    req: FeedbackRequest,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Le user soumet son feedback 👍/👎 sur une réponse."""
    if req.rating not in ["up", "down"]:
        raise HTTPException(status_code=400, detail="Rating doit être 'up' ou 'down'")
    
    success = save_user_feedback(
        eval_id=eval_id,
        user_id=current_user["id"],
        rating=req.rating,
        comment=req.comment,
        issue_type=req.issue_type,
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Évaluation introuvable")
    
    return {"ok": True, "message": "Merci pour votre retour"}


@router.get("/evaluations/{eval_id}")
async def get_evaluation_detail(
    eval_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Récupère le détail d'une évaluation (pour affichage côté user)."""
    evaluation = get_evaluation(eval_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Évaluation introuvable")
    
    # Enrichir avec les infos d'affichage
    if evaluation.get("auto_score"):
        level = evaluation["auto_score"].get("level", "MOYEN")
        evaluation["auto_score"]["level_info"] = get_level_info(level)
    
    return evaluation


@router.get("/evaluations/by-conversation/{conversation_id}")
async def get_evaluation_for_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user_dependency),
):
    """Récupère l'évaluation associée à un message de conversation."""
    evaluation = get_evaluation_by_conversation(conversation_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="Pas d'évaluation pour cette conversation")
    
    if evaluation.get("auto_score"):
        level = evaluation["auto_score"].get("level", "MOYEN")
        evaluation["auto_score"]["level_info"] = get_level_info(level)
    
    return evaluation


# ════════════════════════════════════════
# Routes ADMIN (dashboard)
# ════════════════════════════════════════

@router.get("/admin/evaluations/stats")
async def admin_evaluations_stats(
    days: int = 30,
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """Statistiques globales pour le dashboard admin."""
    if days < 1 or days > 365:
        raise HTTPException(status_code=400, detail="days doit être entre 1 et 365")
    
    return get_global_stats(days=days)


@router.get("/admin/evaluations/daily")
async def admin_daily_scores(
    days: int = 7,
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """Évolution quotidienne des scores (pour graphique)."""
    if days < 1 or days > 90:
        raise HTTPException(status_code=400, detail="days doit être entre 1 et 90")
    
    return {"daily_scores": get_daily_scores(days=days)}


@router.get("/admin/evaluations/problematic")
async def admin_problematic(
    limit: int = 20,
    current_admin: dict = Depends(get_current_admin_dependency),
):
    """Liste des évaluations problématiques (score < 5 ou feedback négatif)."""
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="limit doit être entre 1 et 100")
    
    items = list_problematic_evaluations(limit=limit)
    return {"items": items, "total": len(items)}