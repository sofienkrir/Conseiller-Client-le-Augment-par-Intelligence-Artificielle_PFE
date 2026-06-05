# api/auth_db.py

from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
import os
from dotenv import load_dotenv
from bson import ObjectId
from .crypto_utils import decrypt_client_doc

load_dotenv(override=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24h

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["attijari_chatbot"]
users_collection   = db["users"]
clients_collection = db["clients"]

# Index unique sur email
users_collection.create_index("email", unique=True)

# Index unique PARTIEL sur client_code (les admins sans client_code ne sont pas contraints)
users_collection.create_index(
    "client_code",
    unique=True,
    partialFilterExpression={"client_code": {"$exists": True}},
    name="uq_user_client_code",
)


def _serialize_user(user: dict) -> dict:
    """Convertit un doc MongoDB en dict serialisable (sans password_hash)."""
    return {
        "id":                  str(user["_id"]),
        "nom":                 user.get("nom", ""),
        "prenom":              user.get("prenom", ""),
        "email":               user.get("email", ""),
        "segment":             user.get("segment"),
        "telephone":           user.get("telephone"),
        "is_admin":            user.get("is_admin", False),
        "client_code":         user.get("client_code"),
        "client_id":           str(user["client_id"]) if user.get("client_id") else None,
        "force_relogin":       user.get("force_relogin", False),
        "must_reset_password": user.get("must_reset_password", False),
    }


def _serialize_client(c: dict) -> dict:
    """Retourne les infos client utiles pour la reponse de login (dechiffrees)."""
    c = decrypt_client_doc(c)
    return {
        "id":          str(c["_id"]),
        "client_code": c.get("client_code"),
        "nom":         c.get("nom", ""),
        "prenom":      c.get("prenom", ""),
        "segment":     c.get("segment"),
        "ville":       c.get("ville"),
        "profession":  c.get("profession"),
        "revenus_mensuels": c.get("revenus_mensuels"),
        "anciennete_annees": c.get("anciennete_annees"),
    }


class AuthDB:

    # ── Crypto ────────────────────────────────────────────────────────────

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    # ── JWT ───────────────────────────────────────────────────────────────

    @staticmethod
    def create_access_token(data: dict, expires_delta: timedelta = None):
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    @staticmethod
    def verify_token(token: str):
        try:
            return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except JWTError:
            return None

    # ── Users ─────────────────────────────────────────────────────────────

    @staticmethod
    def create_user(user_data: dict):
        """
        Cree un user lie a un client.
        user_data doit contenir: email, password, client_code, client_id,
                                 nom, prenom, segment (tous injectes par auth_routes).
        """
        try:
            user = {
                "nom":           user_data.get("nom", ""),
                "prenom":        user_data.get("prenom", ""),
                "email":         user_data["email"],
                "telephone":     user_data.get("telephone"),
                "segment":       user_data.get("segment", "particulier"),
                "client_code":   user_data.get("client_code"),
                "client_id":     user_data.get("client_id"),  # ObjectId
                "password_hash": AuthDB.hash_password(user_data["password"]),
                "created_at":    datetime.utcnow(),
                "updated_at":    datetime.utcnow(),
                "is_active":     True,
                "is_admin":      False,
            }
            result = users_collection.insert_one(user)
            user["_id"] = result.inserted_id
            return _serialize_user(user)

        except DuplicateKeyError:
            return {"error": "Email already exists"}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def get_user_by_email(email: str):
        return users_collection.find_one({"email": email})

    @staticmethod
    def authenticate_user(email: str, password: str):
        user = AuthDB.get_user_by_email(email)
        if not user:
            return None
        if not AuthDB.verify_password(password, user.get("password_hash", "")):
            return None
        return _serialize_user(user)

    @staticmethod
    def get_user_by_id(user_id: str):
        try:
            user = users_collection.find_one({"_id": ObjectId(user_id)})
            if user:
                return _serialize_user(user)
        except Exception:
            pass
        return None

    # ── Helpers client_code ───────────────────────────────────────────────

    @staticmethod
    def find_user_by_client_code(client_code: str):
        """Cherche un user par son client_code."""
        user = users_collection.find_one({"client_code": client_code})
        return _serialize_user(user) if user else None

    @staticmethod
    def get_user_with_client(user_id: str):
        """Retourne le user + le document client lie (si present)."""
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return None, None
        client_doc = None
        if user.get("client_id"):
            client_doc = clients_collection.find_one({"_id": user["client_id"]})
        return _serialize_user(user), (_serialize_client(client_doc) if client_doc else None)

    # ── Admin helpers ──────────────────────────────────────────────────────

    @staticmethod
    def set_admin(email: str, is_admin: bool = True) -> bool:
        result = users_collection.update_one(
            {"email": email},
            {"$set": {"is_admin": is_admin, "updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

    # ── 2FA email management ──────────────────────────────────────────────

    @staticmethod
    def get_user_2fa_email(user_id: str) -> str:
        """
        Retourne l'email a utiliser pour la 2FA:
        - Si two_fa_email existe et non vide → two_fa_email
        - Sinon → email de login (fallback)
        """
        try:
            u = users_collection.find_one({"_id": ObjectId(user_id)}, {"email": 1, "two_fa_email": 1})
            if u:
                custom = u.get("two_fa_email", "")
                if custom and custom.strip():
                    return custom.strip()
                return u.get("email", "")
        except Exception:
            pass
        return ""

    @staticmethod
    def update_user_2fa_email(user_id: str, new_email: str, admin_id: str) -> dict:
        """Met a jour le two_fa_email d'un user. Logge qui/quand."""
        import re
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", new_email):
            return {"error": "Format email invalide"}
        try:
            result = users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {
                    "two_fa_email":            new_email.strip(),
                    "two_fa_email_updated_at": datetime.utcnow(),
                    "two_fa_email_updated_by": ObjectId(admin_id),
                    "updated_at":              datetime.utcnow(),
                }}
            )
            if result.matched_count == 0:
                return {"error": "Utilisateur introuvable"}
            print(f"[2FA-EMAIL] two_fa_email mis a jour pour user {user_id} par admin {admin_id} → {new_email}")
            return {"success": True}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def clear_user_2fa_email(user_id: str, admin_id: str) -> dict:
        """Supprime le two_fa_email custom (retour au fallback email de login)."""
        try:
            u = users_collection.find_one({"_id": ObjectId(user_id)}, {"email": 1})
            if not u:
                return {"error": "Utilisateur introuvable"}
            users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$unset": {"two_fa_email": ""},
                 "$set": {
                    "two_fa_email_updated_at": datetime.utcnow(),
                    "two_fa_email_updated_by": ObjectId(admin_id),
                    "updated_at":              datetime.utcnow(),
                }}
            )
            print(f"[2FA-EMAIL] two_fa_email supprime pour user {user_id} par admin {admin_id}")
            return {"success": True, "fallback_email": u.get("email", "")}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def clear_force_relogin(user_id: str) -> None:
        """Efface le flag force_relogin (après 2FA validée sur un compte sain)."""
        try:
            users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"force_relogin": False, "updated_at": datetime.utcnow()}}
            )
        except Exception as e:
            print(f"[AUTH] Erreur clear_force_relogin: {e}")

    @staticmethod
    def reset_password_after_incident(user_id: str, new_password: str) -> dict:
        """
        Réinitialise le mot de passe suite à un incident 'Ce n'était pas moi'.
        Lève les flags force_relogin et must_reset_password.
        """
        try:
            result = users_collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {
                    "password_hash":       pwd_context.hash(new_password),
                    "force_relogin":       False,
                    "must_reset_password": False,
                    "updated_at":          datetime.utcnow(),
                    "password_reset_at":   datetime.utcnow(),
                }}
            )
            if result.matched_count == 0:
                return {"error": "Utilisateur introuvable"}
            return {"success": True}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def list_all_users_for_sharing() -> list:
        users = []
        for u in users_collection.find(
            {"is_active": True},
            {"_id": 1, "email": 1, "nom": 1, "prenom": 1, "segment": 1, "is_admin": 1, "client_code": 1}
        ):
            users.append({
                "id":          str(u["_id"]),
                "email":       u["email"],
                "nom":         u.get("nom", ""),
                "prenom":      u.get("prenom", ""),
                "segment":     u.get("segment"),
                "is_admin":    u.get("is_admin", False),
                "client_code": u.get("client_code"),
            })
        return users
