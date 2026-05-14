# Attijari Chatbot Setup Guide

## Project Overview

The Attijari Chatbot is a Retrieval-Augmented Generation (RAG) system designed to provide customer support for Attijari Bank products. It answers user queries in Tunisian dialect (Derja) by retrieving relevant information from a knowledge base of bank products (cards, credits, offers, etc.) and generating context-aware responses using a local large language model (LLM). The system supports text and voice input/output, integrates MongoDB for session logging, and uses Chroma as a local vector database for efficient document retrieval.

Key features:
- Category-aware retrieval (e.g., filters by product type like "credit" or "carte")
- Local LLM inference with Ollama for privacy
- Support for PDF and JSON document ingestion
- Voice integration with speech recognition and text-to-speech

This project is built with Python and open-source tools, making it suitable for local deployment without cloud dependencies.

## Prerequisites

Before setting up the project, ensure your system meets the following requirements:

- **Operating System**: Windows 10/11, macOS, or Linux
- **Python**: Version 3.11 or higher (download from [python.org](https://www.python.org/downloads/))
- **Git**: For cloning the repository (download from [git-scm.com](https://git-scm.com/))
- **MongoDB**: Version 5.0+ for database logging (download from [mongodb.com](https://www.mongodb.com/try/download/community))
- **Ollama**: For running the local LLM (download from [ollama.ai](https://ollama.ai/))
- **Microphone**: For voice input (optional, but required for voice mode)

Ensure Python and Git are installed and accessible via the command line. Verify installations with:

```bash
python --version
git --version
```

## Installation

### Step 1: Clone the Repository

Clone the project from GitHub to your local machine:

```bash
git clone https://github.com/your-username/attijari-chatbot.git
cd attijari-chatbot
```

Replace `your-username` with the actual repository owner.

### Step 2: Create a Virtual Environment

It's recommended to use a virtual environment to manage dependencies:

```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### Step 3: Install Python Dependencies

Install all required packages using the provided `requirements.txt` file:

```bash
pip install -r requirements.txt
```

This will install libraries such as LangChain, Chroma, PyMongo, SpeechRecognition, PyTTsx3, and others.

If you encounter permission issues, run as administrator (Windows) or use `sudo` (Linux/macOS):

```bash
# Windows (run in elevated Command Prompt):
pip install -r requirements.txt

# Linux/macOS:
sudo pip install -r requirements.txt
```

### Step 4: Install and Configure Ollama

1. Download and install Ollama from [ollama.ai](https://ollama.ai/).
2. Pull the required model:

   ```bash
   ollama pull qwen2.5:7b-instruct
   ```

   This downloads the `qwen2.5:7b-instruct` model (approximately 4GB), which is used for query rewriting and answer generation.

3. Verify Ollama is running:

   ```bash
   ollama list
   ```

   You should see `qwen2.5:7b-instruct` in the list.

### Step 5: Set Up MongoDB

1. Download and install MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community).
2. Start MongoDB:

   - **Windows**: Run `mongod` from the MongoDB bin directory or use the MongoDB service.
   - **macOS/Linux**: Use Homebrew (`brew services start mongodb/brew/mongodb-community`) or run `mongod`.

3. Verify MongoDB is running on the default port (27017):

   ```bash
   mongo --version
   # Or connect to test:
   mongo
   # Exit with Ctrl+C
   ```

## Configuration

### Environment Variables

The project uses environment variables for database configuration. Create a `.env` file in the project root:

```bash
# .env file
MONGO_URI=mongodb://localhost:27017/
```

- `MONGO_URI`: Connection string for MongoDB (default is localhost).

If MongoDB is on a different host/port, update accordingly (e.g., `mongodb://username:password@host:port/database`).

### Data Preparation

The project requires pre-cleaned data files:

- `data/raw/corpus_clean.json`: Structured JSON data from bank scraping.
- `data/pdfs/`: Optional PDF documents organized by folders (e.g., `credit/`, `carte/`).

If these are not present, you may need to run scraping/cleaning scripts (not covered in this guide). PDFs are auto-detected and ingested during vector store building.

## Running the Project

### Step 1: Build the Vector Store

This step embeds documents and builds the Chroma vector database (one-time setup, or rerun if data changes):

```bash
python build_vector_store.py
```

This will:
- Load JSON and PDF documents.
- Chunk and embed them using `intfloat/multilingual-e5-large`.
- Create `./chroma_db` with the vector store.

Expected output: Success message with document count.

### Step 2: Run the Chatbot

Start the chatbot in interactive mode:

```bash
python chatbot.py
```

1. Choose mode: Type `text` or `voice`.
2. For text mode: Enter queries like "Quelles sont les offres de crédit?" and press Enter to quit.
3. For voice mode: Speak queries (requires microphone).

The chatbot will detect category, retrieve documents, generate answers in Derja, and log to MongoDB.

### Step 3: Verify Functionality

- Test a query: "شنوة الكارطة" (What are the cards?)
- Check MongoDB: Use MongoDB Compass or CLI to inspect collections (users, sessions, messages, rag_logs).
- Voice test: Ensure microphone permissions are granted.

## Development Mode

The project is primarily a CLI application, so development mode is the same as production. For debugging:

- Run with verbose output: Add print statements in `chatbot.py` (e.g., debug retrieved docs).
- Use Python's debugger: `python -m pdb chatbot.py`.
- Rebuild vector store on data changes: Rerun `python build_vector_store.py`.

For advanced development:
- Modify embeddings: Update `intfloat/multilingual-e5-large` in `build_vector_store.py` and `chatbot.py`.
- Add features: Edit `chatbot.py` for new modes or integrations.

## Example Commands

### Full Setup from Scratch

```bash
# 1. Clone and enter project
git clone https://github.com/your-username/attijari-chatbot.git
cd attijari-chatbot

# 2. Set up virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Install Ollama model
ollama pull qwen2.5:7b-instruct

# 5. Start MongoDB (in another terminal)
mongod

# 6. Build vector store
python build_vector_store.py

# 7. Run chatbot
python chatbot.py
# Choose 'text', enter query, quit.
```

### Voice Mode Test

```bash
python chatbot.py
# Mode (text/voice): voice
# Speak: "Quelles sont les cartes?"
# Bot responds via TTS.
```

## Troubleshooting

### Common Errors

1. **ModuleNotFoundError: No module named 'langchain'**
   - Solution: Ensure virtual environment is activated and `pip install -r requirements.txt` was run.
   - Check Python version: `python --version` (must be 3.11+).

2. **Ollama model not found**
   - Solution: Run `ollama pull qwen2.5:7b-instruct`. Ensure Ollama is installed and running (`ollama list`).

3. **MongoDB connection failed**
   - Solution: Verify MongoDB is running (`mongo`). Check `MONGO_URI` in `.env`. Ensure port 27017 is open.

4. **Chroma build fails with permission error**
   - Solution: Delete `./chroma_db` manually if locked, or run as admin.

5. **Voice not working**
   - Solution: Grant microphone permissions. Test with `python -c "import speech_recognition as sr; r = sr.Recognizer(); print('OK')"` for sr library.

6. **PDF ingestion error (e.g., fitz not found)**
   - Solution: `pip install pymupdf pdfplumber`. Ensure PDFs are in `data/pdfs/` with proper folder structure.

7. **Embedding model download fails**
   - Solution: Check internet connection. The model is ~2GB; ensure disk space.

8. **Answers are generic or irrelevant**
   - Solution: Rebuild vector store after data changes. Check category detection keywords in `chatbot.py`.

### General Tips

- If issues persist, run `pip list` to verify packages.
- Use `python -c "import <module>"` to test imports.
- For voice issues, test `speech_recognition` separately.
- Logs are in MongoDB; use MongoDB Compass for inspection.
- Ensure no antivirus blocks Ollama or MongoDB.

If you encounter unlisted issues, check the project's GitHub issues or open a new one with error logs.

---

This guide assumes a standard setup. For custom configurations (e.g., remote MongoDB), adjust accordingly. Contributions and improvements are welcome!
