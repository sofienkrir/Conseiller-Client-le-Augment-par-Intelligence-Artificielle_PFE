# api/chat_history.py

from pymongo import MongoClient, DESCENDING
from datetime import datetime
from bson import ObjectId
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client["attijari_chatbot"]
conversations_collection = db["conversations"]
users_collection = db["users"]  # نحتاجو باش نجيب معلومات المستخدم

class ChatHistory:
    @staticmethod
    def create_session(user_id: str, user_info: dict, session_name: str = None):
        """إنشاء محادثة جديدة مع معلومات المستخدم"""
        # نجيب معلومات المستخدم من قاعدة البيانات
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        
        session = {
            "user_id": user_id,
            "user_email": user["email"] if user else "unknown",
            "user_fullname": f"{user.get('prenom', '')} {user.get('nom', '')}".strip() if user else "مستخدم",
            "session_id": f"session_{ObjectId()}",
            "session_name": session_name or f"محادثة {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "messages": [],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        result = conversations_collection.insert_one(session)
        return {
            "id": str(result.inserted_id),
            "session_id": session["session_id"],
            "session_name": session["session_name"],
            "user_fullname": session["user_fullname"],
            "user_email": session["user_email"]
        }
    
    @staticmethod
    def add_message(session_id: str, role: str, content: str):
        """إضافة رسالة لمحادثة"""
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow()
        }
        
        conversations_collection.update_one(
            {"session_id": session_id},
            {
                "$push": {"messages": message},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    
    @staticmethod
    def get_user_sessions(user_id: str):
        """جلب محادثات مستخدم معين"""
        sessions = conversations_collection.find(
            {"user_id": user_id}
        ).sort("updated_at", DESCENDING)
        
        return [
            {
                "session_id": s["session_id"],
                "session_name": s["session_name"],
                "last_message": s["messages"][-1]["content"] if s["messages"] else "",
                "updated_at": s["updated_at"],
                "messages_count": len(s["messages"]),
                "user_fullname": s.get("user_fullname", "مستخدم"),
                "user_email": s.get("user_email", "")
            }
            for s in sessions
        ]
    
    @staticmethod
    def get_all_sessions_with_users():
        """جلب كل المحادثات مع معلومات المستخدمين (للأدمن)"""
        sessions = conversations_collection.find().sort("updated_at", DESCENDING)
        
        return [
            {
                "session_id": s["session_id"],
                "session_name": s["session_name"],
                "last_message": s["messages"][-1]["content"] if s["messages"] else "",
                "updated_at": s["updated_at"],
                "messages_count": len(s["messages"]),
                "user_fullname": s.get("user_fullname", "مستخدم"),
                "user_email": s.get("user_email", ""),
                "user_id": s["user_id"]
            }
            for s in sessions
        ]
    
    @staticmethod
    def get_session_messages(session_id: str):
        """جلب رسائل محادثة محددة"""
        session = conversations_collection.find_one({"session_id": session_id})
        if not session:
            return []
        messages = []
        for m in session["messages"]:
            msg = {
                "role": m.get("role", "user"),
                "content": m.get("content", ""),
                "sources": m.get("sources", []),
            }
            if m.get("eval_id"):
                msg["eval_id"] = m["eval_id"]
            if m.get("auto_score"):
                msg["auto_score"] = m["auto_score"]
            messages.append(msg)
        return messages
    
    @staticmethod
    def delete_session(session_id: str):
        """حذف محادثة"""
        conversations_collection.delete_one({"session_id": session_id})

    @staticmethod
    def replace_messages(session_id: str, messages: list):
        """Replace all messages in a session (used by new frontend)"""
        normalized = []
        for m in messages:
            msg = {
                "role": m.get("role", "user"),
                "content": m.get("content", ""),
                "sources": m.get("sources", []),
                "timestamp": datetime.utcnow(),
            }
            if m.get("eval_id"):
                msg["eval_id"] = m["eval_id"]
            if m.get("auto_score"):
                msg["auto_score"] = m["auto_score"]
            normalized.append(msg)
        conversations_collection.update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "messages": normalized,
                    "updated_at": datetime.utcnow(),
                }
            }
        )
