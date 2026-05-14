# api/gemini_model.py

import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
gemini_model = None  # used as gemini_available in routes.py

if not api_key:
    print("[Gemini] GEMINI_API_KEY not set — Gemini disabled")
else:
    try:
        from google import genai as _genai
        _client = _genai.Client(api_key=api_key)
        gemini_model = _client  # non-None signals availability
        print("[Gemini] Client initialized OK")
    except Exception as e:
        print(f"[Gemini] Init failed: {e}")
        gemini_model = None


def get_gemini_response(question: str, context: str = "") -> str | None:
    if gemini_model is None:
        return None

    prompt = (
        "Tu es un conseiller bancaire officiel d'Attijari Bank Tunisie.\n"
        "Réponds UNIQUEMENT en français, en te basant sur le contexte fourni.\n"
        "Donne une réponse COMPLÈTE et DÉTAILLÉE. Si plusieurs produits correspondent, "
        "liste-les TOUS avec leurs caractéristiques (montants, taux, conditions, avantages).\n"
        "Structure ta réponse avec des tirets pour les listes et des sauts de ligne entre les produits.\n"
        "Si l'information n'est pas dans le contexte: "
        "\"Cette information n'est pas disponible. Appelez le 71 111 345.\"\n"
        "Termine par: \"Pour plus d'informations, appelez le 71 111 345.\"\n\n"
        f"Contexte:\n{context}\n\n"
        f"Question: {question}\n\n"
        "Réponse en français:"
    )

    try:
        response = gemini_model.models.generate_content(
            model="gemini-flash-latest",
            contents=prompt,
        )
        return response.text
    except Exception as e:
        print(f"[Gemini] generate_content error: {e}")
        return None
