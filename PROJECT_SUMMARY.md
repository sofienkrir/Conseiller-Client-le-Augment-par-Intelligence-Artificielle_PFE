# Attijari Chatbot — Project Summary for Claude

## What This Project Is

A **RAG-based banking chatbot** for **Attijari Bank Tunisia**. Users ask questions about bank products (cards, loans, savings, insurance, digital banking, packaged offers), and the chatbot retrieves relevant information from a pre-built vector store and generates answers using an LLM. It supports two languages: **French** and **Tunisian Darija (dialect)**.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React 19 + Vite)   attijari_chatbot/             │
│  App.jsx | AuthPages.jsx | Admindashboard.jsx                │
│  Dev: localhost:5173  →  proxy to backend:8000              │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTP / SSE
┌───────────────────▼─────────────────────────────────────────┐
│  Backend (FastAPI + Uvicorn)   api/                         │
│  app.py → routes.py (chat, history, admin)                  │
│         → auth_routes.py (register, login, /me)             │
│  Host: localhost:8000                                        │
└──────┬──────────────────────┬───────────────────────────────┘
       │                      │
┌──────▼──────┐    ┌──────────▼──────────────────────────────┐
│  MongoDB    │    │  RAG Pipeline   chatbot.py               │
│  localhost  │    │  ┌─────────────────────────────────────┐ │
│  :27017     │    │  │  ChromaDB (./chroma_db/)            │ │
│             │    │  │  Embedding: BAAI/bge-m3             │ │
│  users      │    │  │  Collection: "attijari"             │ │
│  conversations│  │  └────────────┬────────────────────────┘ │
└─────────────┘    │               │ hybrid search             │
                   │  ┌────────────▼────────────────────────┐ │
                   │  │  Groq LLaMA-3.3-70b (primary)       │ │
                   │  │  Google Gemini 1.5-Flash (fallback)  │ │
                   │  └────────────────────────────────────┘ │
                   └──────────────────────────────────────────┘
```

---

## File Structure

```
attijari-chatbot/
│
├── api/                        # FastAPI backend package
│   ├── app.py                  # FastAPI app creation + CORS middleware
│   ├── routes.py               # All endpoints: /chat, /history/*, /admin/*, /health, /transcribe
│   ├── auth_routes.py          # /auth/register, /auth/login, /auth/me
│   ├── auth_db.py              # AuthDB class: bcrypt + JWT + MongoDB user ops
│   ├── auth_models.py          # Pydantic request/response models for auth
│   ├── chat_history.py         # ChatHistory class: MongoDB conversation CRUD
│   └── gemini_model.py         # Google Gemini integration (optional fallback)
│
├── attijari_chatbot/           # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx             # Main chat UI: SSE streaming, sidebar, voice, TTS
│   │   ├── AuthPages.jsx       # Login + Register pages
│   │   ├── Admindashboard.jsx  # Admin panel: stats, user table, delete
│   │   └── main.jsx            # React entry point + routing
│   └── vite.config.js          # Dev server + proxy config to backend:8000
│
├── chatbot.py                  # Core RAG logic (imported by api/routes.py)
│   # Contains: setup_rag(), answer_question(), hybrid_search(),
│   #           detect_category_and_rewrite(), get_llm(), format_docs(),
│   #           PROMPT_FRENCH, PROMPT_DERJA, CATEGORY_MAP
│
├── database.py                 # Legacy MongoDB helpers (sessions, rag_logs) — used only in CLI mode
├── build_vector_store.py       # One-time script: builds ./chroma_db/ from corpus
├── load_documents.py           # Loads JSON corpus with metadata normalization
├── pdf_ingest.py               # Extracts text+tables from PDFs (PyMuPDF + pdfplumber)
├── clean_data.py               # Data cleaning utilities
├── fix_attijari_up.py          # One-off data fix script
├── check_db.py                 # Debug script: inspects ChromaDB contents
├── run_chat.py                 # Alternative CLI entry point
│
├── data/
│   ├── raw/                    # 7 JSON files scraped per category
│   └── processed/corpus_clean.json  # Merged, cleaned corpus (main input to vector store)
│
├── chroma_db/                  # Persistent ChromaDB vector index (git-tracked binaries)
│
├── scraper/                    # Web scrapers for each product category
│   ├── base_scraper.py
│   ├── particulier.py
│   └── categories/             # One scraper per category
│       ├── carte_bancaire.py
│       ├── credit.py
│       ├── offre_packagee.py
│       ├── banque_distance.py
│       ├── assurance_prevoyance.py
│       ├── epargne.py
│       └── assurance.py
│
├── nlp/                        # Legacy NLP modules (not used in current RAG pipeline)
│   ├── intent_detection.py
│   ├── entity_extraction.py
│   └── text_preprocessing.py
│
├── chatbot/                    # Legacy chatbot modules (not used in current pipeline)
│   ├── rules_engine.py
│   └── response_builder.py
│
└── config/settings.yaml        # App configuration
```

---

## Core RAG Flow (chatbot.py)

Every user message goes through these steps inside `answer_question()`:

1. **Category detection + query rewriting** (`detect_category_and_rewrite`)
   - LLM (Groq French, temp=0.1) classifies question into one of 6 categories
   - Also rewrites the question as a short French banking search query
   - Categories: `carte`, `credit`, `offre_packagee`, `banque_distance`, `assurance`, `epargne`
   - Returns `(category, rewritten_query)` or `("unknown", original_query)` on failure

2. **Hybrid retrieval** (`hybrid_search`)
   - **Semantic search**: ChromaDB vector similarity search with optional `source` metadata filter
   - **Keyword search**: Loops all docs, scores by keyword presence in titre (+3), theme (+2), content (+1)
   - Merges both result lists, deduplicates by content[:300] hash, returns top-k
   - Broad questions detected via BROAD_KEYWORDS → k expanded to 10
   - Fallback: if < 2 docs found, retries with rewritten query, then without category filter

3. **Context formatting** (`format_docs`)
   - Takes up to 6 docs, max 1500 chars each
   - Extracts "key lines" matching financial keywords (montant, taux, durée, etc.)
   - Prefixes each chunk with `[titre]`

4. **Answer generation** (LangChain chain)
   - Uses `PROMPT_FRENCH` or `PROMPT_DERJA` based on language
   - Chain: `{context, question} | prompt | llm | StrOutputParser`
   - Post-processes: removes "not available" lines if real content exists

5. **Gemini path** (routes.py, French only)
   - If Gemini is available, tries it first before the standard RAG path
   - Builds context similarly, passes to `get_gemini_response()`
   - Falls back to Groq RAG if Gemini returns None

---

## API Endpoints (api/routes.py + api/auth_routes.py)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat` | Send message → SSE stream (meta → tokens → done) |
| GET | `/history/list` | List user's conversations |
| GET | `/history/{conv_id}` | Load conversation messages |
| POST | `/history/save` | Save new conversation with auto-generated title |
| PUT | `/history/update/{conv_id}` | Replace all messages in a conversation |
| DELETE | `/history/{conv_id}` | Delete conversation |
| GET | `/health` | Service status |
| POST | `/transcribe` | Audio transcription (returns 501 — not implemented) |
| GET | `/admin/stats` | Total users/conversations/messages |
| GET | `/admin/users` | List all users |
| DELETE | `/admin/users/{user_id}` | Delete user + all their conversations |
| GET | `/admin/users/{user_id}/stats` | User's conversation/message counts |
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login → JWT token + user info |
| GET | `/auth/me` | Get current user from token |

All endpoints except `/auth/register` and `/auth/login` require `Authorization: Bearer <token>`.

---

## SSE Streaming Protocol

The `/chat` endpoint returns a `text/event-stream` response. The full answer is generated first, then split by spaces and streamed word-by-word:

```
data: {"type": "meta", "sources": [{"title": "...", "url": "..."}]}
data: {"type": "token", "text": "Bonjour"}
data: {"type": "token", "text": " voici"}
...
data: {"type": "done"}
```

> Note: This is simulated streaming (not real token streaming from the LLM).

---

## Database Schema (MongoDB: `attijari_chatbot`)

**Collection: `users`**
```json
{
  "_id": ObjectId,
  "nom": "string",
  "prenom": "string",
  "email": "string (unique index)",
  "telephone": "string|null",
  "segment": "particulier|professionnel",
  "password_hash": "bcrypt hash",
  "created_at": "datetime",
  "updated_at": "datetime",
  "is_active": true
}
```

**Collection: `conversations`**
```json
{
  "_id": ObjectId,
  "user_id": "string (references users._id as string)",
  "user_email": "string",
  "user_fullname": "string",
  "session_id": "session_<ObjectId> (used as lookup key)",
  "session_name": "string (first 50 chars of first user message)",
  "messages": [
    {
      "role": "user|assistant",
      "content": "string",
      "sources": [{"title": "...", "url": "..."}],
      "timestamp": "datetime"
    }
  ],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

## Authentication Flow

1. **Register**: `POST /auth/register` with `{nom, prenom, email, telephone, segment, password}`
   - Password validated: 8+ chars, 1 uppercase, 1 lowercase, 1 digit
   - Password hashed with bcrypt and stored
   - Returns JWT token + user info

2. **Login**: `POST /auth/login` with `{email, password}`
   - Verifies bcrypt hash
   - Returns JWT token (24h expiry, HS256)

3. **Protected routes**: Token extracted from `Authorization: Bearer` header via `get_current_user_dependency()`

---

## Vector Store (ChromaDB)

- **Location**: `./chroma_db/` (persisted on disk, included in git)
- **Collection**: `attijari`
- **Embedding model**: `BAAI/bge-m3` (multilingual, 768 dimensions)
- **Chunk settings**: size=800 chars, overlap=100 chars

**Document metadata schema**:
```json
{
  "title": "Product name",
  "titre": "Product name (French variant)",
  "url": "source URL",
  "source": "carte_bancaire|credit|offre_packagee|banque_distance|assurance_prevoyance|epargne_et_placement",
  "category": "carte|credit|...",
  "doc_id": "SHA1 hash (dedup)"
}
```

**Category mapping** (CATEGORY_MAP in chatbot.py):
```python
{
  "carte":           "carte_bancaire",
  "credit":          "credit",
  "offre_packagee":  "offre_packagee",
  "banque_distance": "banque_distance",
  "assurance":       "assurance_prevoyance",
  "epargne":         "epargne_et_placement",
}
```

---

## LLM Configuration

| Model | Provider | Use Case | Temperature |
|-------|----------|----------|-------------|
| llama-3.3-70b-versatile | Groq (OpenAI-compatible) | French answers + category detection + Darija answers | 0.1 (FR) / 0.3 (Darija) |
| gemini-1.5-flash | Google Generative AI | French answers (optional fallback, tried first) | default |

LLM instances are cached in `_model_cache` dict after first load.

---

## Frontend Components (attijari_chatbot/src/)

**App.jsx** (~2000 lines) — Main chat page:
- SSE streaming with word-by-word token display
- Chat history sidebar: loads/deletes past conversations from backend
- Language toggle button (French / Darija)
- Voice input (WebAudio API → `/transcribe` → currently 501)
- Text-to-speech button (browser SpeechSynthesis API)
- Auto-save conversation to backend with debounce
- Quick suggestion buttons for common questions
- Source citations rendered under bot messages

**AuthPages.jsx** — Login + Register:
- Form validation (client-side)
- Segment selector: Particulier / Professionnel
- Token stored in `localStorage`

**Admindashboard.jsx** — Admin panel:
- Hardcoded admin login (client-side only, no server-side role check)
- Stats cards: total users, conversations, messages
- User table with search + pagination
- User detail modal with conversation/message counts
- Delete user (calls `DELETE /admin/users/{id}`)

---

## Known Issues & Technical Debt

1. **Double router registration** in `api/app.py`: `router` is included twice (`router` and `chat_router` are the same object) — all routes register twice.

2. **No admin authorization**: Admin endpoints use `get_current_user_dependency` but do not check user role — any authenticated user can call admin routes.

3. **Hardcoded admin credentials** in `Admindashboard.jsx` (client-side only). The backend does not verify admin role.

4. **Simulated SSE streaming**: The full answer is generated synchronously before streaming starts. The SSE just replays the answer word-by-word — not true LLM token streaming.

5. **`vectorstore.get()` in keyword search**: `hybrid_search()` calls `vectorstore.get()` which loads all documents into memory on every query. This will degrade performance as the corpus grows.

6. **`replace_messages` overwrites the full message array** on every save, losing message-level timestamps and being inefficient for large conversations.

7. **Duplicate endpoints**: `/chat/sessions/*` (legacy) and `/history/*` (current) do the same thing.

8. **Legacy unused modules**: `chatbot/`, `nlp/`, `utils/` directories contain code that is not used by the current API.

9. **`except: pass`** in `auth_db.py:get_user_by_id()` silently swallows exceptions.

---

## Environment Variables (.env)

```
GROQ_API_KEY=...
GEMINI_API_KEY=...
HUGGINGFACE_API_KEY=...
JWT_SECRET_KEY=...
MONGO_URI=mongodb://localhost:27017
```

---

## How to Run

```bash
# Backend
cd d:/attijari-chatbot
python -m uvicorn api.app:app --reload --port 8000

# Frontend
cd attijari_chatbot
npm run dev
# → http://localhost:5173
```

One-time vector store build:
```bash
python build_vector_store.py
```
