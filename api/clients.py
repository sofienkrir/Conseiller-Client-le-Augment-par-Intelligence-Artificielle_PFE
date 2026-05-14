# api/clients.py
"""
Module pour gérer les clients Attijari Bank (fiches, synthèses RDV).

Architecture:
- Collection MongoDB `clients` (générée par generate_fake_clients.py)
- Fonctions de récupération + recherche
- Agent IA qui génère des synthèses de préparation RDV via Groq LLaMA
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta
from typing import Optional

from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from chatbot import get_llm  # réutilise le LLM déjà configuré

load_dotenv()

# MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
_client = MongoClient(MONGO_URI)
_db = _client["attijari_chatbot"]
clients_collection = _db["clients"]


# ════════════════════════════════════════════════════
# FONCTIONS DE RÉCUPÉRATION
# ════════════════════════════════════════════════════

def list_clients(search: str = "", segment: str = None, limit: int = 100) -> list[dict]:
    """Liste les clients avec filtre optionnel par recherche/segment."""
    query = {}
    
    if search:
        # Recherche sur nom, prenom, email, ville, profession
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"nom": regex}, {"prenom": regex},
            {"email": regex}, {"ville": regex},
            {"profession": regex},
        ]
    
    if segment and segment != "all":
        query["segment"] = segment
    
    clients = []
    for c in clients_collection.find(query).limit(limit):
        clients.append({
            "id": str(c["_id"]),
            "prenom": c.get("prenom", ""),
            "nom": c.get("nom", ""),
            "civilite": c.get("civilite", ""),
            "email": c.get("email", ""),
            "telephone": c.get("telephone", ""),
            "ville": c.get("ville", ""),
            "profession": c.get("profession", ""),
            "segment": c.get("segment", ""),
            "age": c.get("age", 0),
            "revenus_mensuels": c.get("revenus_mensuels", 0),
            "anciennete_annees": c.get("anciennete_annees", 0),
            "num_produits": len(c.get("produits", [])),
            "num_alertes": len(c.get("alertes", [])),
        })
    return clients


def get_client_details(client_id: str) -> Optional[dict]:
    """Récupère les détails complets d'un client."""
    try:
        c = clients_collection.find_one({"_id": ObjectId(client_id)})
        if not c:
            return None
        
        c["id"] = str(c["_id"])
        del c["_id"]
        
        # Convertir les datetime en strings pour JSON
        for key in ["created_at", "updated_at", "date_ouverture", "date_naissance"]:
            if key in c and isinstance(c[key], datetime):
                c[key] = c[key].isoformat()
        
        return c
    except Exception as e:
        print(f"[CLIENTS] ❌ get_client_details error: {e}")
        return None


# ════════════════════════════════════════════════════
# AGENT IA — SYNTHÈSE RDV
# ════════════════════════════════════════════════════

SYNTHESIS_PROMPT = """Tu es un assistant expert pour les conseillers bancaires d'Attijari Bank Tunisie.
Ton rôle est de générer une fiche de préparation pour un rendez-vous client, en analysant ses données.

Tu dois produire une fiche STRUCTURÉE, CONCISE et ACTIONNABLE en français, qui aide le conseiller à:
1. Comprendre rapidement le profil du client
2. Identifier des opportunités commerciales pertinentes
3. Anticiper les points d'attention
4. Préparer des recommandations personnalisées

Format de sortie OBLIGATOIRE (respecte exactement cette structure, utilise les emojis):

## 👤 PROFIL CLIENT
[2-3 phrases: qui est ce client, situation familiale, profession, ancienneté]

## 💰 SITUATION FINANCIÈRE
- **Revenus mensuels:** [montant]
- **Solde compte courant:** [montant]
- **Épargne totale:** [montant si applicable]
- **Engagements (crédits):** [montant total capital restant si applicable]

## 💳 RELATION BANCAIRE ACTUELLE
[Liste des produits actifs avec une phrase par produit]

## 📊 INSIGHTS COMPORTEMENTAUX (derniers 3 mois)
[2-4 observations sur les transactions: habitudes, tendances intéressantes, opportunités détectées]

## 💡 RECOMMANDATIONS POUR LE RDV
[3-4 recommandations CONCRÈTES de produits/services à proposer avec justification brève]
Utilise le format: "1. **[Produit]** — [pourquoi c'est pertinent pour ce client]"

## ⚠️ POINTS D'ATTENTION
[Alertes éventuelles: découvert, expirations, refus, retards - si applicable]

## 🎯 OBJECTIFS SUGGÉRÉS POUR LE RDV
[2-3 objectifs concrets pour la rencontre]

IMPORTANT:
- Sois PRÉCIS avec les chiffres (utilise les montants réels des données)
- Propose des produits Attijari existants: Crédit Melki (immobilier), Crédit Auto, Crédit Taksit (consommation), Carte Gold/Platinum, Épargne AWLEDI, Assurance Rahet Beli, Attijari Mobile, Attijari Real Time, Compte épargne Hissab
- Adapte le ton: professionnel mais engageant
- Ne PAS inventer d'informations non présentes dans les données

═══════════════════════════════════════════
DONNÉES DU CLIENT:

{client_data}

═══════════════════════════════════════════

Génère maintenant la fiche de préparation RDV:"""


def format_client_for_llm(client: dict) -> str:
    """Formate les données client en texte pour le LLM."""
    lines = []
    
    # Identité
    lines.append(f"=== IDENTITÉ ===")
    lines.append(f"Nom: {client.get('civilite', '')} {client.get('prenom', '')} {client.get('nom', '')}")
    lines.append(f"Âge: {client.get('age')} ans")
    lines.append(f"Profession: {client.get('profession', '')}")
    lines.append(f"Situation: {client.get('situation_familiale', '')}, {client.get('enfants', 0)} enfant(s)")
    lines.append(f"Ville: {client.get('ville', '')}")
    lines.append(f"Segment: {client.get('segment', '')}")
    lines.append(f"Revenus mensuels: {client.get('revenus_mensuels', 0)} DT")
    lines.append(f"Ancienneté chez Attijari: {client.get('anciennete_annees', 0)} ans")
    lines.append("")
    
    # Produits
    lines.append(f"=== PRODUITS BANCAIRES ===")
    produits = client.get("produits", [])
    for p in produits:
        desc = f"• {p['nom']}"
        if p.get("statut"):
            desc += f" ({p['statut']})"
        if "solde" in p:
            desc += f" — Solde: {p['solde']:.2f} DT"
        if "capital_restant" in p:
            desc += f" — Capital restant: {p['capital_restant']:.2f} DT"
        if "mensualite" in p:
            desc += f" — Mensualité: {p['mensualite']:.2f} DT"
        if "montant_initial" in p:
            desc += f" — Montant initial: {p['montant_initial']} DT"
        if "contribution_mensuelle" in p:
            desc += f" — Contribution: {p['contribution_mensuelle']} DT/mois"
        if "prime_annuelle" in p:
            desc += f" — Prime: {p['prime_annuelle']} DT/an"
        if "date_expiration" in p:
            try:
                exp = datetime.fromisoformat(p["date_expiration"])
                days_left = (exp - datetime.utcnow()).days
                desc += f" — Expire dans {days_left} jours"
            except:
                pass
        lines.append(desc)
    lines.append("")
    
    # Transactions récentes (top 15)
    lines.append(f"=== TRANSACTIONS RÉCENTES (15 dernières) ===")
    transactions = client.get("transactions_recentes", [])[:15]
    for t in transactions:
        try:
            date = datetime.fromisoformat(t["date"]).strftime("%d/%m/%Y")
        except:
            date = t.get("date", "")
        sens = "+" if t.get("sens") == "credit" else "-"
        lines.append(f"• {date} | {t.get('type', '')} | {sens}{t.get('montant', 0)} DT | {t.get('description', '')}")
    lines.append("")
    
    # Analyse rapide
    lines.append(f"=== ANALYSE RAPIDE ===")
    
    # Total épargne
    total_epargne = sum(p.get("solde", 0) for p in produits if "épargne" in p["nom"].lower() or "hissab" in p["nom"].lower() or "awledi" in p["nom"].lower())
    lines.append(f"Épargne totale: {total_epargne:.2f} DT")
    
    # Total crédits
    total_credits = sum(p.get("capital_restant", 0) for p in produits if "crédit" in p["nom"].lower() or "credit" in p["nom"].lower())
    lines.append(f"Capital restant crédits: {total_credits:.2f} DT")
    
    # Mensualités
    total_mensualites = sum(p.get("mensualite", 0) for p in produits if "mensualite" in p)
    if total_mensualites > 0:
        lines.append(f"Mensualités crédits: {total_mensualites:.2f} DT/mois")
        if client.get("revenus_mensuels", 0) > 0:
            taux = (total_mensualites / client["revenus_mensuels"]) * 100
            lines.append(f"Taux d'endettement: {taux:.1f}%")
    
    # Transactions credit/debit sur le mois
    now = datetime.utcnow()

    def _parse_date(val):
        if isinstance(val, datetime):
            return val
        try:
            return datetime.fromisoformat(str(val))
        except Exception:
            return now  # fallback: treat as today

    last_30d = [t for t in transactions if (now - _parse_date(t.get("date", now))).days <= 30]
    total_in = sum(t["montant"] for t in last_30d if t.get("sens") == "credit")
    total_out = sum(t["montant"] for t in last_30d if t.get("sens") == "debit")
    lines.append(f"Flux 30 derniers jours: +{total_in:.0f} DT entrée / -{total_out:.0f} DT sortie")
    
    lines.append("")
    
    # Alertes
    alertes = client.get("alertes", [])
    if alertes:
        lines.append(f"=== ALERTES ===")
        for a in alertes:
            lines.append(f"• [{a.get('niveau', '').upper()}] {a.get('message', '')}")
        lines.append("")
    
    # Notes conseiller
    notes = client.get("notes_conseiller", [])
    if notes:
        lines.append(f"=== NOTES CONSEILLER PRÉCÉDENTES ===")
        for n in notes:
            lines.append(f"• {n}")
    
    return "\n".join(lines)


def generate_client_synthesis(client_id: str) -> dict:
    """
    Génère la synthèse RDV pour un client via Groq LLaMA.
    Retourne: {synthesis: str, metadata: {...}}
    """
    client = get_client_details(client_id)
    if not client:
        return {"error": "Client non trouvé"}
    
    # Formater pour le LLM
    client_data_text = format_client_for_llm(client)
    
    # Construire le prompt
    full_prompt = SYNTHESIS_PROMPT.format(client_data=client_data_text)
    
    # Appeler Groq
    try:
        llm = get_llm("french")
        response = llm.invoke(full_prompt)
        
        # Extraire le contenu (selon le format de retour du LLM)
        if hasattr(response, "content"):
            synthesis_text = response.content
        else:
            synthesis_text = str(response)
        
        return {
            "synthesis": synthesis_text,
            "metadata": {
                "client_name": f"{client.get('prenom', '')} {client.get('nom', '')}".strip(),
                "generated_at": datetime.utcnow().isoformat(),
                "model": "llama-3.3-70b",
                "client_id": client_id,
            }
        }
    except Exception as e:
        print(f"[CLIENTS] ❌ Synthesis error: {e}")
        return {"error": f"Erreur de génération: {str(e)}"}


def get_clients_stats() -> dict:
    """Statistiques globales pour dashboard."""
    total = clients_collection.count_documents({})
    by_segment = {}
    for segment in ["particulier", "professionnel", "jeune", "tre"]:
        by_segment[segment] = clients_collection.count_documents({"segment": segment})
    
    # Clients avec alertes
    with_alerts = clients_collection.count_documents({"alertes": {"$exists": True, "$ne": []}})
    
    return {
        "total": total,
        "by_segment": by_segment,
        "with_alerts": with_alerts,
    }