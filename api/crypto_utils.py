# api/crypto_utils.py
"""
Chiffrement Fernet (AES-128 CBC + HMAC-SHA256) pour les donnees client sensibles.

La cle ENCRYPTION_KEY doit etre presente dans .env.
Pour en generer une:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""

import os
from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv

load_dotenv(override=True)

_ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

if not _ENCRYPTION_KEY:
    import sys
    print(
        "\n[CRYPTO] ERREUR: ENCRYPTION_KEY manquante dans .env\n"
        "  Generez une cle avec:\n"
        "  python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"\n"
        "  Puis ajoutez ENCRYPTION_KEY=votre_cle dans .env\n",
        file=sys.stderr,
    )


def _get_fernet() -> Fernet:
    if not _ENCRYPTION_KEY:
        raise RuntimeError(
            "ENCRYPTION_KEY manquante dans .env. "
            "Generez-en une avec: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    return Fernet(_ENCRYPTION_KEY.encode())


# ════════════════════════════════════════════════════
# Champs sensibles — top level
# Decision de minimisation (RGPD):
#   - telephone, date_naissance, situation_familiale : PII directes
#   - revenus_mensuels : donnee financiere critique
#   - email, nom, prenom, ville, profession : NON chiffres (necessaires pour recherche admin)
#   - segment, client_code, _id : NON chiffres (cles operationnelles)
# ════════════════════════════════════════════════════
SENSITIVE_FIELDS = [
    "telephone",
    "date_naissance",
    "situation_familiale",
    "revenus_mensuels",   # int/float — stocke chiffre comme str, reconverti au dechiffrement
]

# Champs sensibles dans chaque objet produit
PRODUCT_SENSITIVE_FIELDS = [
    "solde",             # float
    "capital_restant",   # float
    "mensualite",        # float
    "montant_initial",   # float/int
    "contribution_mensuelle",  # float
    "prime_annuelle",    # float
]

# Champs sensibles dans chaque transaction
TRANSACTION_SENSITIVE_FIELDS = [
    "montant",           # float/int
]


# ════════════════════════════════════════════════════
# Primitives chiffrement / dechiffrement
# ════════════════════════════════════════════════════

def encrypt_value(value) -> str:
    """
    Chiffre une valeur (str, int, float).
    Retourne la chaine chiffree base64 Fernet.
    Retourne None/'' intact.
    """
    if value is None or value == "":
        return value
    fernet = _get_fernet()
    return fernet.encrypt(str(value).encode()).decode()


def decrypt_value(encrypted, original_type=str):
    """
    Dechiffre une valeur Fernet.
    - original_type : type Python attendu (str, int, float) pour reconversion.
    - Si la valeur n'est pas chiffree (ancienne donnee), la retourne telle quelle.
    - Retourne None/'' intact.
    """
    if encrypted is None or encrypted == "":
        return encrypted
    try:
        fernet = _get_fernet()
        decrypted_str = fernet.decrypt(encrypted.encode()).decode()
        if original_type == int:
            return int(float(decrypted_str))
        if original_type == float:
            return float(decrypted_str)
        return decrypted_str
    except (InvalidToken, Exception):
        # Valeur non chiffree (donnee anterieure) — retourner telle quelle
        return encrypted


# ════════════════════════════════════════════════════
# Document client complet
# ════════════════════════════════════════════════════

# Types attendus apres dechiffrement pour chaque champ
_FIELD_TYPES = {
    "telephone":          str,
    "date_naissance":     str,
    "situation_familiale": str,
    "revenus_mensuels":   int,    # toujours un entier (salaire en DT)
    "solde":              float,
    "capital_restant":    float,
    "mensualite":         float,
    "montant_initial":    int,   # montant initial credit (entier)
    "contribution_mensuelle": float,
    "prime_annuelle":     float,
    "montant":            float,
}


def encrypt_client_doc(client: dict) -> dict:
    """
    Chiffre les champs sensibles d'un document client MongoDB.
    Ne modifie PAS le dict original — retourne une copie.
    """
    result = dict(client)
    for field in SENSITIVE_FIELDS:
        if field in result and result[field] is not None:
            result[field] = encrypt_value(result[field])

    if "produits" in result and isinstance(result["produits"], list):
        result["produits"] = _encrypt_list(result["produits"], PRODUCT_SENSITIVE_FIELDS)

    if "transactions_recentes" in result and isinstance(result["transactions_recentes"], list):
        result["transactions_recentes"] = _encrypt_list(
            result["transactions_recentes"], TRANSACTION_SENSITIVE_FIELDS
        )

    result["_encrypted"] = True
    return result


def decrypt_client_doc(client: dict) -> dict:
    """
    Dechiffre les champs sensibles d'un document client.
    Si un champ n'est pas chiffre (InvalidToken), il est retourne tel quel.
    Ne modifie PAS le dict original — retourne une copie.
    """
    if not client:
        return client

    result = dict(client)
    for field in SENSITIVE_FIELDS:
        if field in result and result[field] is not None:
            result[field] = decrypt_value(result[field], _FIELD_TYPES.get(field, str))

    if "produits" in result and isinstance(result["produits"], list):
        result["produits"] = _decrypt_list(result["produits"], PRODUCT_SENSITIVE_FIELDS)

    if "transactions_recentes" in result and isinstance(result["transactions_recentes"], list):
        result["transactions_recentes"] = _decrypt_list(
            result["transactions_recentes"], TRANSACTION_SENSITIVE_FIELDS
        )

    return result


# ════════════════════════════════════════════════════
# Helpers listes imbriquees
# ════════════════════════════════════════════════════

def _encrypt_list(items: list, fields: list) -> list:
    encrypted = []
    for item in items:
        enc_item = dict(item)
        for f in fields:
            if f in enc_item and enc_item[f] is not None:
                enc_item[f] = encrypt_value(enc_item[f])
        encrypted.append(enc_item)
    return encrypted


def _decrypt_list(items: list, fields: list) -> list:
    decrypted = []
    for item in items:
        dec_item = dict(item)
        for f in fields:
            if f in dec_item and dec_item[f] is not None:
                dec_item[f] = decrypt_value(dec_item[f], _FIELD_TYPES.get(f, str))
        decrypted.append(dec_item)
    return decrypted
