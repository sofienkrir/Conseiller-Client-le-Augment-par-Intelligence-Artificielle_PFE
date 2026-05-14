#!/usr/bin/env python3
"""
Script pour générer 30 clients Attijari Bank fictifs mais réalistes.

Usage:
    python generate_fake_clients.py          # génère 30 clients
    python generate_fake_clients.py --list   # liste les clients existants
    python generate_fake_clients.py --clear  # supprime tous les clients
"""

import sys
import os
import random
from datetime import datetime, timedelta
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["attijari_chatbot"]
clients_collection = db["clients"]

# ════════════════════════════════════════════════════
# DATA RÉALISTE TUNISIENNE
# ════════════════════════════════════════════════════

PRENOMS_H = ["Ahmed", "Mohamed", "Sofien", "Aziz", "Karim", "Hassen", "Nabil", "Walid", "Mehdi", "Sami",
             "Youssef", "Amine", "Wassim", "Anis", "Rached", "Bilel", "Chokri", "Hedi", "Fares", "Oussama"]
PRENOMS_F = ["Sonia", "Leila", "Nadia", "Amina", "Meriem", "Salma", "Rim", "Imen", "Ines", "Nour",
             "Farah", "Khadija", "Yasmine", "Amel", "Dorra", "Sabrine", "Hanene", "Maha", "Ilhem", "Syrine"]
NOMS = ["Ben Ali", "Ben Salah", "Trabelsi", "Bouazizi", "Mejri", "Gharbi", "Hamdi", "Jebali", "Khlifi",
        "Mabrouk", "Mansour", "Sassi", "Zouari", "Chaabane", "Dridi", "Fekih", "Ghorbel", "Haddad",
        "Jlassi", "Kammoun", "Lahmar", "Msakni", "Romdhani", "Souissi", "Tlili", "Yahyaoui", "Zaafrane"]

VILLES = ["Tunis", "Sfax", "Sousse", "Bizerte", "Gabes", "Ariana", "Kairouan", "Nabeul", "Monastir", "Ben Arous"]

PROFESSIONS = {
    "etudiant": {"revenus": (0, 300), "segment": "jeune"},
    "employé": {"revenus": (800, 1800), "segment": "particulier"},
    "cadre": {"revenus": (1800, 3500), "segment": "particulier"},
    "cadre supérieur": {"revenus": (3500, 7000), "segment": "particulier"},
    "médecin": {"revenus": (3000, 8000), "segment": "professionnel"},
    "avocat": {"revenus": (2500, 6000), "segment": "professionnel"},
    "architecte": {"revenus": (2800, 6500), "segment": "professionnel"},
    "enseignant": {"revenus": (1200, 2500), "segment": "particulier"},
    "commerçant": {"revenus": (1500, 4500), "segment": "professionnel"},
    "ingénieur": {"revenus": (2200, 4500), "segment": "particulier"},
    "retraité": {"revenus": (700, 1800), "segment": "particulier"},
}

PRODUITS_BANCAIRES = {
    "Compte courant": {"required": True, "min_age": 18},
    "Carte Classic": {"required_if_salary": 800, "min_age": 18},
    "Carte Gold": {"required_if_salary": 2000, "min_age": 21},
    "Carte Platinum": {"required_if_salary": 4000, "min_age": 25},
    "Compte épargne Hissab": {"min_age": 18, "probability": 0.4},
    "Épargne AWLEDI (enfants)": {"min_age": 28, "requires_children": True, "probability": 0.5},
    "Crédit immobilier Melki": {"min_age": 28, "min_salary": 1500, "probability": 0.25},
    "Crédit auto": {"min_age": 25, "min_salary": 1200, "probability": 0.2},
    "Crédit consommation Taksit": {"min_age": 22, "min_salary": 800, "probability": 0.3},
    "Assurance Rahet Beli": {"min_age": 30, "probability": 0.15},
    "Attijari Mobile": {"min_age": 18, "probability": 0.7},
    "Attijari Real Time": {"min_age": 18, "probability": 0.6},
}

TYPES_TRANSACTIONS = [
    ("Virement reçu", "credit", "Salaire mensuel"),
    ("Virement reçu", "credit", "Remboursement"),
    ("Virement émis", "debit", "Loyer"),
    ("Virement émis", "debit", "Transfert famille"),
    ("Paiement carte", "debit", "Carrefour"),
    ("Paiement carte", "debit", "MG Restaurant"),
    ("Paiement carte", "debit", "Station Agil"),
    ("Paiement carte", "debit", "Pharmacie Centrale"),
    ("Paiement carte", "debit", "STEG"),
    ("Paiement carte", "debit", "SONEDE"),
    ("Paiement carte", "debit", "Tunisie Telecom"),
    ("Retrait DAB", "debit", "DAB Habib Bourguiba"),
    ("Retrait DAB", "debit", "DAB Agence"),
    ("Virement émis", "debit", "Agence immobilière BONANZA"),
    ("Prélèvement", "debit", "Assurance auto STAR"),
    ("Prélèvement", "debit", "Mutuelle CNAM"),
]

NOTES_CLIENT = [
    "Client fidèle depuis plusieurs années, aucun incident majeur.",
    "A exprimé un intérêt pour l'achat immobilier lors du dernier contact.",
    "Prévoit un voyage à l'étranger prochainement, peut avoir besoin de services internationaux.",
    "Famille en croissance, 2 enfants. A manifesté intérêt pour produits d'épargne jeunesse.",
    "Entreprise en expansion, pourrait bénéficier de solutions de financement.",
    "Utilise principalement l'agence physique, faible adoption du digital.",
    "Bonne situation financière, candidat pour upsell produits premium.",
    "A eu un découvert temporaire il y a 6 mois, situation rétablie depuis.",
    "Client multi-bancarisé, à fidéliser.",
    "Nouveau client, en phase de découverte des services.",
]


def generate_client():
    """Génère un client fictif cohérent."""
    gender = random.choice(["H", "F"])
    prenom = random.choice(PRENOMS_H if gender == "H" else PRENOMS_F)
    nom = random.choice(NOMS)
    age = random.randint(22, 68)
    profession = random.choice(list(PROFESSIONS.keys()))
    
    # Cohérence âge/profession
    if profession == "etudiant" and age > 28:
        profession = "employé"
    if profession == "retraité" and age < 58:
        age = random.randint(58, 72)
    
    prof_data = PROFESSIONS[profession]
    revenus_min, revenus_max = prof_data["revenus"]
    revenus = random.randint(revenus_min, revenus_max) if revenus_max > 0 else 0
    segment = prof_data["segment"]
    
    ville = random.choice(VILLES)
    anciennete_annees = random.randint(1, 15)
    date_ouverture = datetime.utcnow() - timedelta(days=365 * anciennete_annees)
    
    # Situation familiale
    marie = age >= 25 and random.random() < 0.7
    enfants = random.randint(0, 3) if marie and age >= 28 else 0
    
    # Téléphone tunisien
    telephone = f"+216 {random.choice(['20','22','23','24','25','26','27','28','29','50','51','52','53','54','55','56','58'])} {random.randint(100,999)} {random.randint(100,999)}"
    
    # Email
    email = f"{prenom.lower().replace(' ','.')}.{nom.lower().replace(' ','')}@{'gmail.com' if random.random() < 0.6 else 'yahoo.fr'}"
    
    # Produits bancaires cohérents
    produits = []
    produits.append({
        "nom": "Compte courant",
        "date_souscription": date_ouverture.isoformat(),
        "statut": "actif",
        "solde": round(random.uniform(-200, 8000), 2),
    })
    
    # Carte bancaire selon revenus
    if revenus >= 4000 and age >= 25 and random.random() < 0.5:
        carte = "Carte Platinum"
    elif revenus >= 2000 and age >= 21 and random.random() < 0.7:
        carte = "Carte Gold"
    elif revenus >= 800 and age >= 18:
        carte = "Carte Classic"
    else:
        carte = None
    
    if carte:
        produits.append({
            "nom": carte,
            "date_souscription": (date_ouverture + timedelta(days=random.randint(30, 365))).isoformat(),
            "statut": "actif",
            "date_expiration": (datetime.utcnow() + timedelta(days=random.randint(60, 1460))).isoformat(),
        })
    
    # Épargne
    if random.random() < 0.4:
        produits.append({
            "nom": "Compte épargne Hissab",
            "date_souscription": (date_ouverture + timedelta(days=random.randint(90, 730))).isoformat(),
            "statut": "actif",
            "solde": round(random.uniform(500, 25000), 2),
        })
    
    # Épargne enfants
    if enfants > 0 and random.random() < 0.5:
        produits.append({
            "nom": "Épargne AWLEDI (enfants)",
            "date_souscription": (date_ouverture + timedelta(days=random.randint(180, 730))).isoformat(),
            "statut": "actif",
            "solde": round(random.uniform(200, 8000), 2),
            "contribution_mensuelle": random.choice([50, 75, 100, 150, 200]),
        })
    
    # Crédits
    if age >= 28 and revenus >= 1500 and random.random() < 0.25:
        montant_credit = random.randint(80000, 350000)
        produits.append({
            "nom": "Crédit immobilier Melki",
            "date_souscription": (datetime.utcnow() - timedelta(days=random.randint(365, 2555))).isoformat(),
            "statut": "en cours",
            "montant_initial": montant_credit,
            "capital_restant": round(montant_credit * random.uniform(0.3, 0.9), 2),
            "mensualite": round(montant_credit / (20 * 12), 2),
        })
    
    if age >= 25 and revenus >= 1200 and random.random() < 0.2:
        montant = random.randint(15000, 60000)
        produits.append({
            "nom": "Crédit auto",
            "date_souscription": (datetime.utcnow() - timedelta(days=random.randint(180, 1460))).isoformat(),
            "statut": "en cours",
            "montant_initial": montant,
            "capital_restant": round(montant * random.uniform(0.2, 0.85), 2),
            "mensualite": round(montant / (60), 2),
        })
    
    # Services digitaux
    if random.random() < 0.7:
        produits.append({"nom": "Attijari Mobile", "date_souscription": date_ouverture.isoformat(), "statut": "actif"})
    if random.random() < 0.6:
        produits.append({"nom": "Attijari Real Time", "date_souscription": date_ouverture.isoformat(), "statut": "actif"})
    
    # Assurance
    if age >= 30 and random.random() < 0.15:
        produits.append({
            "nom": "Assurance Rahet Beli",
            "date_souscription": (date_ouverture + timedelta(days=random.randint(365, 1095))).isoformat(),
            "statut": "actif",
            "prime_annuelle": random.randint(500, 2500),
        })
    
    # Transactions récentes (30 derniers jours)
    transactions = []
    num_trans = random.randint(15, 40)
    
    # Salaire mensuel
    if revenus > 0:
        salary_date = datetime.utcnow() - timedelta(days=random.randint(1, 30))
        transactions.append({
            "date": salary_date.isoformat(),
            "type": "Virement reçu",
            "sens": "credit",
            "description": f"Salaire {profession}",
            "montant": revenus,
        })
    
    for _ in range(num_trans):
        date_trans = datetime.utcnow() - timedelta(days=random.randint(1, 90))
        type_t, sens, desc = random.choice(TYPES_TRANSACTIONS)
        
        if sens == "credit":
            montant = random.randint(50, 2000)
        else:
            # Loyer = gros montant
            if "Loyer" in desc:
                montant = random.randint(500, 1500)
            elif "Agence immobilière" in desc:
                montant = random.randint(200, 800)
            else:
                montant = random.randint(10, 400)
        
        transactions.append({
            "date": date_trans.isoformat(),
            "type": type_t,
            "sens": sens,
            "description": desc,
            "montant": montant,
        })
    
    # Trier par date descendante
    transactions.sort(key=lambda x: x["date"], reverse=True)
    
    # Alertes
    alertes = []
    solde_courant = next((p["solde"] for p in produits if p["nom"] == "Compte courant"), 0)
    if solde_courant < 0:
        alertes.append({"type": "decouvert", "niveau": "warning", "message": f"Compte courant en découvert de {abs(solde_courant):.2f} DT"})
    if solde_courant < 50 and solde_courant >= 0:
        alertes.append({"type": "solde_faible", "niveau": "info", "message": "Solde du compte courant faible"})
    
    # Carte qui expire bientôt
    for p in produits:
        if "Carte" in p["nom"] and "date_expiration" in p:
            exp = datetime.fromisoformat(p["date_expiration"])
            if (exp - datetime.utcnow()).days < 90:
                alertes.append({"type": "carte_expiration", "niveau": "info", "message": f"{p['nom']} expire dans {(exp - datetime.utcnow()).days} jours"})
    
    # Notes conseiller
    notes = random.sample(NOTES_CLIENT, k=random.randint(1, 2))
    
    client_data = {
        "nom": nom,
        "prenom": prenom,
        "civilite": "M." if gender == "H" else "Mme",
        "age": age,
        "date_naissance": (datetime.utcnow() - timedelta(days=age * 365 + random.randint(0, 364))).isoformat(),
        "telephone": telephone,
        "email": email,
        "ville": ville,
        "profession": profession,
        "situation_familiale": "Marié(e)" if marie else "Célibataire",
        "enfants": enfants,
        "revenus_mensuels": revenus,
        "segment": segment,
        "anciennete_annees": anciennete_annees,
        "date_ouverture": date_ouverture.isoformat(),
        "produits": produits,
        "transactions_recentes": transactions[:30],  # 30 plus récentes
        "alertes": alertes,
        "notes_conseiller": notes,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    return client_data


def main():
    args = sys.argv[1:]
    
    if "--list" in args:
        count = clients_collection.count_documents({})
        print(f"\n📊 {count} client(s) dans la base.\n")
        for c in clients_collection.find({}, {"prenom": 1, "nom": 1, "segment": 1, "revenus_mensuels": 1}).limit(10):
            print(f"  • {c['prenom']} {c['nom']} — {c.get('segment')} — {c.get('revenus_mensuels')} DT/mois")
        if count > 10:
            print(f"  ... et {count - 10} autres")
        print()
        return
    
    if "--clear" in args:
        result = clients_collection.delete_many({})
        print(f"🗑️ {result.deleted_count} client(s) supprimé(s).")
        return
    
    # Génération
    num_clients = 30
    if args and args[0].isdigit():
        num_clients = int(args[0])
    
    print(f"\n🎲 Génération de {num_clients} clients fictifs...\n")
    
    clients_collection.delete_many({})  # Clear existing
    
    generated = []
    for i in range(num_clients):
        client_data = generate_client()
        result = clients_collection.insert_one(client_data)
        generated.append({
            "id": str(result.inserted_id),
            "name": f"{client_data['prenom']} {client_data['nom']}",
            "segment": client_data["segment"],
            "revenus": client_data["revenus_mensuels"],
        })
        print(f"  ✓ {client_data['prenom']} {client_data['nom']} ({client_data['profession']}) — {client_data['revenus_mensuels']} DT")
    
    print(f"\n✅ {num_clients} clients créés avec succès dans MongoDB!")
    print(f"   Collection: attijari_chatbot.clients")
    print(f"\n💡 Pour voir la liste: python generate_fake_clients.py --list")


if __name__ == "__main__":
    main()