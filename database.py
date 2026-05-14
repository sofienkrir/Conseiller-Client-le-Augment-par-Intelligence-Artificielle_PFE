import os
from pymongo import MongoClient
from datetime import datetime
import uuid

# MongoDB connection - set MONGO_URI env var for Atlas, or use local default
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URI)
db = client['attijari_chatbot']

# Collections
users = db['users']
sessions = db['sessions']
messages = db['messages']
rag_logs = db['rag_logs']

def create_user(name, email):
    """Create a new user."""
    user = {
        'name': name,
        'email': email,
        'created_at': datetime.utcnow()
    }
    result = users.insert_one(user)
    return str(result.inserted_id)

def start_session(user_id):
    """Start a new session for a user."""
    session_id = str(uuid.uuid4())
    session = {
        'session_id': session_id,
        'user_id': user_id,
        'started_at': datetime.utcnow()
    }
    sessions.insert_one(session)
    return session_id

def end_session(session_id):
    """End a session."""
    sessions.update_one(
        {'session_id': session_id},
        {'$set': {'ended_at': datetime.utcnow()}}
    )

def add_message(session_id, role, content):
    """Add a message to the conversation."""
    message = {
        'session_id': session_id,
        'role': role,
        'content': content,
        'timestamp': datetime.utcnow()
    }
    messages.insert_one(message)

def log_rag_query(session_id, query, retrieved_docs, answer, latency, error=None):
    """Log a RAG query."""
    log = {
        'session_id': session_id,
        'query': query,
        'retrieved_docs': retrieved_docs,
        'answer': answer,
        'latency': latency,
        'error': error,
        'timestamp': datetime.utcnow()
    }
    rag_logs.insert_one(log)

# Sample usage
if __name__ == "__main__":
    # Create sample user
    user_id = create_user('Test User', 'test@example.com')
    print(f"Created user ID: {user_id}")

    # Start session
    session_id = start_session(user_id)
    print(f"Started session ID: {session_id}")

    # Add sample messages
    add_message(session_id, 'user', 'What are credit offers?')
    add_message(session_id, 'assistant', 'Here are the credit offers...')

    # Log sample RAG query
    log_rag_query(session_id, 'What are credit offers?', ['credit_doc1', 'credit_doc2'], 'Here are the credit offers...', 0.5)

    print("Sample data inserted into MongoDB.")
