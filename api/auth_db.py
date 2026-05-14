# api/auth_db.py

from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
import os
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv(override=True)

# إعدادات التشفير
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# إعدادات JWT
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 ساعة

# الاتصال بـ MongoDB
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["attijari_chatbot"]
users_collection = db["users"]

# إنشاء index فريد على email
users_collection.create_index("email", unique=True)

class AuthDB:
    @staticmethod
    def hash_password(password: str) -> str:
        """تشفير كلمة السر"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """التحقق من كلمة السر"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: timedelta = None):
        """إنشاء JWT token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str):
        """التحقق من صحة الـ token وإرجاع البيانات"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except JWTError:
            return None
    
    @staticmethod
    def create_user(user_data: dict):
        """إنشاء مستخدم جديد في قاعدة البيانات"""
        try:
            user = {
                "nom": user_data["nom"],
                "prenom": user_data["prenom"],
                "email": user_data["email"],
                "telephone": user_data.get("telephone"),
                "segment": user_data.get("segment", "particulier"),
                "password_hash": AuthDB.hash_password(user_data["password"]),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "is_active": True,
                "is_admin": False,
            }

            result = users_collection.insert_one(user)

            created_user = {
                "id": str(result.inserted_id),
                "nom": user["nom"],
                "prenom": user["prenom"],
                "email": user["email"],
                "segment": user.get("segment"),
                "telephone": user.get("telephone"),
                "is_admin": False,
            }

            return created_user

        except DuplicateKeyError:
            return {"error": "Email already exists"}
        except Exception as e:
            return {"error": str(e)}
    
    @staticmethod
    def get_user_by_email(email: str):
        """البحث عن مستخدم بالإيميل"""
        user = users_collection.find_one({"email": email})
        if user:
            user["id"] = str(user["_id"])
            del user["_id"]
        return user
    
    @staticmethod
    def authenticate_user(email: str, password: str):
        """التحقق من صحة بيانات تسجيل الدخول"""
        user = AuthDB.get_user_by_email(email)
        if not user:
            return None
        
        if not AuthDB.verify_password(password, user["password_hash"]):
            return None
        
        # إرجاع بيانات المستخدم بدون كلمة السر
        return {
            "id": user["id"],
            "nom": user["nom"],
            "prenom": user["prenom"],
            "email": user["email"],
            "segment": user.get("segment"),
            "telephone": user.get("telephone"),
            "is_admin": user.get("is_admin", False),  # ← NOUVEAU
        }
    
    @staticmethod
    def get_user_by_id(user_id: str):
        """جلب مستخدم بواسطة ID"""
        try:
            user = users_collection.find_one({"_id": ObjectId(user_id)})
            if user:
                return {
                    "id": str(user["_id"]),
                    "nom": user["nom"],
                    "prenom": user["prenom"],
                    "email": user["email"],
                    "segment": user.get("segment"),
                    "telephone": user.get("telephone"),
                    "is_admin": user.get("is_admin", False),  # ← NOUVEAU
                }
        except:
            pass
        return None
    
    # ════════════════════════════════════════════════
    # NOUVELLES MÉTHODES ADMIN
    # ════════════════════════════════════════════════
    
    @staticmethod
    def set_admin(email: str, is_admin: bool = True) -> bool:
        """Promouvoir/révoquer un user en admin."""
        result = users_collection.update_one(
            {"email": email},
            {"$set": {"is_admin": is_admin, "updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0
    
    @staticmethod
    def list_all_users_for_sharing() -> list:
        """Retourne la liste de tous les users (pour l'admin qui partage un PDF)."""
        users = []
        for u in users_collection.find(
            {"is_active": True},
            {"_id": 1, "email": 1, "nom": 1, "prenom": 1, "segment": 1, "is_admin": 1}
        ):
            users.append({
                "id": str(u["_id"]),
                "email": u["email"],
                "nom": u.get("nom", ""),
                "prenom": u.get("prenom", ""),
                "segment": u.get("segment"),
                "is_admin": u.get("is_admin", False),
            })
        return users
