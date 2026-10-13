<h1 align="center">AI-Augmented Banking Customer Advisor</h1>
<h3 align="center">RAG Multi-Source System · Attijari Bank Tunisia · Engineering Final-Year Project (PFE)</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/LangChain-1C3C3C?style=flat-square&logo=langchain&logoColor=white" alt="LangChain">
  <img src="https://img.shields.io/badge/ChromaDB-vector_store-FF6F00?style=flat-square" alt="ChromaDB">
  <img src="https://img.shields.io/badge/Llama_3.3_70B-Groq-F55036?style=flat-square" alt="Llama 3.3 70B on Groq">
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/React_19-Vite-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React + Vite">
</p>

---

## 🎯 Overview

**The problem.** Bank advisors spend time answering repetitive product questions (cards, loans, savings, insurance), and many Tunisian customers write in **Derja** (Tunisian Arabic, often in Latin script), which general-purpose embedding models handle poorly.

**The solution.** A web platform built during my final-year engineering internship at **Attijari Bank Tunisia**. It combines:

- a **RAG chatbot** that answers questions **only from the bank's product documentation**, indexed in a vector store;
- **Derja-aware retrieval**: Derja questions are detected and rewritten into French search queries, and documents are embedded with a fine-tuned multilingual model;
- **advisor tools**: appointment management, AI-generated client briefs and document sharing;
- **strong authentication**: email 2FA and risk-based authentication;
- **built-in quality monitoring**: heuristic confidence score, LLM-as-a-judge and retrieval metrics.

> **Status:** academic prototype, run locally. It is not deployed and not production-ready. All client data in this repository is **synthetic**.

---

## ✨ Features

| Area | What is implemented |
| --- | --- |
| 💬 **RAG chatbot** | Hybrid retrieval (dense + keyword), *Particulier* / *Professionnel* segments, source citations, answers in French |
| 🇹🇳 **Derja support** | Rule-based Derja / Arabic-script detection, then LLM rewriting into a short French query for semantic search |
| 📄 **Multi-source context** | Product corpus, user-uploaded PDFs (isolated per session, banking-domain filter) and admin-shared PDFs with read tracking |
| 👤 **Advisor copilot** | Client-aware answers that combine a synthetic client file with the product catalog, plus AI-generated meeting briefs |
| 📅 **Appointments** | Customer requests; advisor approve / reject / propose alternative slots; availability calendar; in-app notifications |
| 🔐 **Security** | JWT, bcrypt, email 2FA, risk-based authentication, trusted devices, Fernet field encryption, “This wasn't me” incident flow, session revocation |
| 📊 **Quality & monitoring** | Per-answer auto-score, background LLM-as-a-judge, user feedback, admin dashboard with daily scores and flagged answers |
| 🧪 **Evaluation** | Gold-set retrieval metrics (Recall@k, Precision@k, MRR) and Locust load tests |

---

## 🏗️ Architecture

```mermaid
flowchart LR
    U["Customer / Advisor"] --> F["React 19 + Vite<br/>attijari_chatbot/"]
    F -->|"REST + SSE"| A["FastAPI<br/>api/app.py"]

    A --> SEC["Auth & security<br/>JWT · 2FA · RBA"]
    A --> CHAT["POST /chat"]
    A --> BIZ["Appointments · Notifications<br/>Clients · Shared PDFs"]

    CHAT -->|"uploaded or shared PDF"| PDFV[("Per-PDF Chroma<br/>collections")]
    CHAT -->|"product questions"| RAG["RAG engine<br/>chatbot.py"]
    RAG --> VS[("ChromaDB<br/>collection 'attijari'")]
    CHAT --> GEM["Gemini Flash<br/>(optional, tried first)"]
    RAG --> GROQ["Llama 3.3 70B<br/>via Groq"]

    CHAT --> EVAL["Auto-score +<br/>LLM-as-a-judge"]
    SEC --> DB[("MongoDB<br/>attijari_chatbot")]
    BIZ --> DB
    EVAL --> DB

    subgraph OFF["Offline ingestion"]
        S["scraper/<br/>public product pages"] --> J["data/processed/*.json"]
        J --> B["build_vector_store.py"]
    end
    B --> VS
```

**How `/chat` routes a question** (`api/routes.py`):

1. **PDF mode**: if a PDF session or shared PDF is selected, retrieval runs only on that document's collection, then Groq generates the answer.
2. **Gemini path**: when `GEMINI_API_KEY` is set and `USE_GEMINI=true`, French questions are answered by Gemini Flash using dense retrieval (top 5).
3. **Groq RAG pipeline**: used when Gemini is disabled or fails, or in client mode. This path runs the full hybrid pipeline described below.
4. Every answer is scored, saved to MongoDB and streamed to the UI over Server-Sent Events.

---

## 🔎 RAG Pipeline

| Step | Implementation | Code |
| --- | --- | --- |
| **1. Collection** | Scrapers for public product pages of attijaribank.com.tn (cards, credit, savings, insurance, bundled offers, remote banking), plus a *professionnel* dataset | `scraper/`, `clean_data.py` |
| **2. Loading** | JSON corpus → LangChain `Document`s with normalized metadata (`title`, `category`, `source`, stable `doc_id`); optional PDFs via PyMuPDF (text) and pdfplumber (tables) | `load_documents.py`, `pdf_ingest.py` |
| **3. Chunking** | `RecursiveCharacterTextSplitter`, 800 characters with 100 overlap; PDF tables kept whole | `load_documents.py` |
| **4. Embeddings** | Fine-tuned Sentence-Transformers model `models/attijari-model-v2` (via `HuggingFaceEmbeddings`) | `build_vector_store.py` |
| **5. Indexing** | Persistent ChromaDB collection `attijari` in `chroma_db/` | `build_vector_store.py` |
| **6. Query handling** | Derja detection; Derja questions rewritten into a 5–10-word French query by the LLM; broad questions (“list”, “compare”…) expand *k* from 5 to 8 | `chatbot.py` |
| **7. Hybrid retrieval** | Dense similarity search (filtered by segment) + keyword scoring on title / theme / content, then merged and deduplicated | `hybrid_search()` |
| **8. Context building** | Up to 6 passages, each prefixed by its title, key factual lines prioritized (amounts, rates, fees, conditions), 1,500 characters max | `format_docs()` |
| **9. Generation** | Llama 3.3 70B through Groq's OpenAI-compatible API (temperature 0.1) with a strict “context-only” banking prompt and a fallback message when information is missing | `answer_question()` |
| **10. Evaluation** | Weighted auto-score (groundedness, citation, coverage, length) + Gemini 2.5 Flash judge (accuracy, relevance, clarity, language; hallucination flags) | `api/evaluation.py`, `api/llm_judge.py` |

> **About the embedding model.** According to [`RAPPORT_TECHNIQUE.md`](RAPPORT_TECHNIQUE.md), `attijari-model-v2` was fine-tuned from `paraphrase-multilingual-MiniLM-L12-v2` on a French / Derja parallel corpus with `MultipleNegativesRankingLoss`. The model weights and training script are **not** included in this repository.

---

## 🧰 Tech Stack

| Layer | Technologies |
| --- | --- |
| **LLMs** | Llama 3.3 70B (`llama-3.3-70b-versatile`) on Groq · Google Gemini Flash (optional answers + judge) |
| **RAG / NLP** | LangChain (`langchain-core`, `-chroma`, `-huggingface`, `-openai`, `-text-splitters`) · Sentence-Transformers · ChromaDB |
| **Document processing** | PyMuPDF · pdfplumber · BeautifulSoup (scraping) |
| **Backend** | FastAPI · Uvicorn · Pydantic · Server-Sent Events |
| **Data** | MongoDB (`pymongo`) · Pandas · NumPy |
| **Security** | python-jose (JWT) · passlib / bcrypt · cryptography (Fernet) · user-agents |
| **Frontend** | React 19 · Vite 7 · Recharts · Lucide React |
| **Testing & evaluation** | Locust · custom RAG metrics scripts |

---

## 📁 Project Structure

```text
.
├── api/                     # FastAPI backend
│   ├── app.py               # App entry point, CORS, routers
│   ├── routes.py            # /chat, history, PDFs, admin endpoints
│   ├── auth_routes.py       # Register, login, 2FA, "not me" flow
│   ├── risk_scoring.py      # Risk-based authentication
│   ├── device_tracking.py   # Device fingerprint & IP geolocation
│   ├── crypto_utils.py      # Fernet encryption of sensitive fields
│   ├── appointment_routes.py
│   ├── clients.py           # Synthetic client files & AI briefs
│   ├── pdf_upload.py        # Per-session PDF RAG
│   ├── pdf_shared.py        # Admin-shared PDFs
│   ├── evaluation.py        # Auto-score & stats
│   └── llm_judge.py         # LLM-as-a-judge
├── attijari_chatbot/        # Main React + Vite frontend
├── client/                  # Alternative React frontend (Tailwind)
├── chatbot.py               # RAG engine
├── build_vector_store.py    # Builds the ChromaDB index
├── load_documents.py        # Corpus loading & chunking
├── pdf_ingest.py            # PDF text & table extraction
├── scraper/                 # Product page scrapers
├── data/                    # raw/ and processed/ corpus
├── scripts/                 # Seeding, migrations, maintenance
├── rag_*.py                 # Gold set & retrieval metrics
├── locustfile.py            # Load-test scenarios
├── RAPPORT_TECHNIQUE.md     # Technical report (French)
└── PROJECT_SUMMARY.md       # Earlier architecture notes
```

---

## 🚀 Installation & Running

### Prerequisites

| Tool | Notes |
| --- | --- |
| Python 3.11+ | Backend and RAG pipeline |
| Node.js 20.19+ | Required by Vite 7 |
| MongoDB | Local instance (`mongodb://localhost:27017`) or Atlas |
| Groq API key | Required, see [console.groq.com](https://console.groq.com) |
| Gemini API key | Optional (Gemini answers and LLM judge) |
| Gmail app password | For sending 2FA codes |
| Embedding model | `models/attijari-model-v2` (not versioned, see step 4) |

### 1. Clone and install the backend

```bash
git clone https://github.com/sofienkrir/Conseiller-Client-le-Augment-par-Intelligence-Artificielle_PFE.git
cd Conseiller-Client-le-Augment-par-Intelligence-Artificielle_PFE

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install pymupdf pdfplumber    # imported by pdf_ingest.py, not listed in requirements.txt
pip install google-genai          # optional: Gemini answer path (api/gemini_model.py)
```

### 2. Install the frontend

```bash
cd attijari_chatbot
npm install
cd ..
```

### 3. Configure environment variables

```bash
cp .env.example .env              # Windows: copy .env.example .env

# Generate the two required secrets
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"   # ENCRYPTION_KEY
python -c "import secrets; print(secrets.token_urlsafe(48))"                                # JWT_SECRET_KEY
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | ✅ | Answer generation (Llama 3.3 70B) |
| `JWT_SECRET_KEY` | ✅ | JWT signing |
| `ENCRYPTION_KEY` | ✅ | Fernet key for sensitive client fields |
| `MONGO_URI` | ✅ | MongoDB connection string |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | ✅ for 2FA | SMTP sender for 2FA and alert emails |
| `GEMINI_API_KEY`, `USE_GEMINI` | optional | Gemini answers and LLM judge; set `USE_GEMINI=false` to use the Groq hybrid pipeline for every question |
| `TWO_FA_*`, `TRUSTED_DEVICE_DAYS`, `RISK_*` | optional | 2FA and risk-scoring tuning (defaults in `.env.example`) |

### 4. Build the vector store

`models/attijari-model-v2` is not in the repository. Place it in `models/`, or set `EMBEDDING_MODEL_PATH` to a public Sentence-Transformers model in `chatbot.py`, `build_vector_store.py`, `api/pdf_upload.py` and `api/pdf_shared.py`.

```bash
python build_vector_store.py      # reads data/processed/*.json (+ data/pdfs/ if present) → chroma_db/
```

### 5. Seed synthetic demo data (optional)

```bash
python generate_fake_clients.py                     # 30 synthetic client files
python scripts/migrate_client_codes.py              # assigns ATB-2026-NNNN client codes
python scripts/encrypt_existing_clients.py --apply  # encrypts sensitive fields (default is --dry-run)
python scripts/seed_demo_users.py                   # demo accounts linked to two client files
python make_admin.py <email>                        # promote an account to advisor/admin
```

### 6. Run

```bash
# Terminal 1: API
uvicorn api.app:app --reload --port 8000     # Swagger UI: http://127.0.0.1:8000/docs

# Terminal 2: frontend
cd attijari_chatbot && npm run dev           # http://localhost:5173
```

The Vite dev server proxies `/chat`, `/auth`, `/api`, `/admin`, `/history`, `/upload_pdf`, `/shared_pdfs`, `/health` and `/transcribe` to the API on port 8000.

### Evaluation & load testing

```bash
python rag_build_gold.py && python rag_preannotate.py   # build and pre-annotate the gold set
python rag_metrics.py                                   # Recall@k, Precision@k, MRR (+ LaTeX table)
python get_test_token.py                                # JWT for load testing → export CHAT_JWT=...
locust -f locustfile.py --host http://127.0.0.1:8000    # UI on http://localhost:8089
```

---

## 🔐 Security & Privacy

**What the code implements**

- **Passwords** hashed with bcrypt; sessions use **HS256 JWTs**.
- **Email 2FA**: 6-digit codes from `secrets`, stored as SHA-256 hashes, with expiry (10 min by default), attempt limits and MongoDB TTL cleanup.
- **Risk-based authentication**, inspired by PSD2 transaction risk analysis. Seven configurable factors (new device, city or country, unusual hour, impossible geo-jump, shared device, automated user agent) produce a 0–100 score mapped to `ALLOW` / `WARN` / `ALERT` / `BLOCK`.
- **Trusted devices** (30 days by default), admin session revocation, and a **“This wasn't me”** incident flow.
- **Fernet encryption at rest** for sensitive client fields (phone, birth date, family status, income, balances, transaction amounts).
- **Domain filter on uploads**: only banking-related PDFs are accepted. Uploaded collections are isolated per user session and expire after 24 h.
- Secrets live in `.env`, which is git-ignored. Only `.env.example` with placeholders is versioned.

**Limitations and disclaimer**

- This is an **academic prototype**. It is **not certified**, has not been security-audited and is **not production-ready**.
- Some `/admin/*` endpoints check authentication but not the admin role server-side. This must be enforced everywhere before any real use.
- Login geolocation calls the external `ip-api.com` service over HTTP.
- Questions and retrieved context are sent to third-party LLM APIs (Groq, Google).
- All client files are **synthetic** (`generate_fake_clients.py`). The product corpus comes from public product pages.

---

## 🖼️ Screenshots

No screenshots are included yet. A security architecture diagram is available in [`figures/architecture_securite.svg`](figures/architecture_securite.svg).

Suggested captures to add to `docs/screenshots/`:

- [ ] Chat interface: a French question and a Derja question, with cited sources and the confidence score
- [ ] PDF upload and question answering on the uploaded document
- [ ] 2FA verification screen and the risk-based alert email
- [ ] Appointment booking (customer) and the approval calendar (advisor)
- [ ] Advisor view: client file and AI-generated meeting brief
- [ ] Admin dashboard: evaluation statistics and flagged answers

---

## 🧭 Roadmap

These are **future improvements**, not current features:

- **True token streaming**: answers are currently generated in full, then streamed word by word over SSE.
- **Derja answers**: a Derja prompt exists in `chatbot.py`, but the main pipeline currently always answers in French.
- **Voice input**: the `/transcribe` endpoint is a stub that returns `501` until a speech-to-text model is configured.
- **Scalability**: `hybrid_search()` loads the whole collection for keyword scoring on every query; this should move to a proper BM25 or sparse index.
- **Authorization**: enforce the admin role on every `/admin/*` route.
- **Reproducibility**: publish the embedding fine-tuning script and corpus format, and complete `requirements.txt` (PyMuPDF, pdfplumber, google-genai).
- **Engineering**: Dockerize the stack, add automated tests and CI, and consolidate the two frontends and legacy backup folders.

---

## 👤 Author

**Sofien Krir**, Data Science & AI Engineer (TEK-UP University, 2026)
Final-year project carried out at the **Digital Center of Attijari Bank Tunisia**.

[![GitHub](https://img.shields.io/badge/GitHub-sofienkrir-181717?style=flat-square&logo=github)](https://github.com/sofienkrir)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Sofien_Krir-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/sofien-krir-28b34b34b)
[![Portfolio](https://img.shields.io/badge/Portfolio-visit-0F172A?style=flat-square&logo=vercel&logoColor=white)](https://portfolio-data-science-ia-sof.vercel.app)
[![Email](https://img.shields.io/badge/Email-sofienkrir11%40gmail.com-D14836?style=flat-square&logo=gmail&logoColor=white)](mailto:sofienkrir11@gmail.com)

<sub>Published for academic and demonstration purposes. Attijari Bank names and logos belong to their respective owners.</sub>
