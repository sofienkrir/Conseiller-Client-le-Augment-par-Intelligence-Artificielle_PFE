import json
import re

def fix_encoding(text):
    """Correction finale pour Attijari UP"""
    if not isinstance(text, str):
        return text
    
    # Première passe: correction standard
    try:
        text = text.encode('latin-1').decode('utf-8')
    except:
        pass
    
    # Deuxième passe: corrections spécifiques pour les caractères restants
    corrections = {
        "à©": "é",
        "à¨": "è", 
        "àª": "ê",
        "à§": "ç",
        "à¢": "â",
        "à®": "î",
        "à´": "ô",
        "à¹": "ù",
        "à©": "é",
        "crà©à©": "créé",
        "reà§u": "reçu",
        "à©galement": "également",
        "àªtes": "êtes",
        "à©quipà©": "équipé",
        "dâ": "d'",
        "lâ": "l'",
        "nâ": "n'",
        "quâ": "qu'",
        "â": "'",
        "â¢": "•",
        "Â«": "«",
        "Â»": "»",
        "Â": "",
    }
    
    for mauvais, bon in corrections.items():
        text = text.replace(mauvais, bon)
    
    return text

# Charge le fichier clean
with open('data/processed/banque_distance_clean.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Corrige Attijari UP
for item in data:
    if item["metadata"]["theme"] == "Attijari UP":
        old_text = item["text"]
        item["text"] = fix_encoding(old_text)
        print(f"✅ Corrigé: {item['metadata']['titre']}")

# Sauvegarde
with open('data/processed/banque_distance_clean.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

# Corrige aussi corpus_clean.json
with open('data/processed/corpus_clean.json', 'r', encoding='utf-8') as f:
    corpus = json.load(f)

for item in corpus:
    if item["metadata"].get("source") == "banque_distance" and item["metadata"].get("theme") == "Attijari UP":
        item["text"] = fix_encoding(item["text"])
        print(f"✅ Corrigé dans corpus: {item['metadata']['titre']}")

with open('data/processed/corpus_clean.json', 'w', encoding='utf-8') as f:
    json.dump(corpus, f, ensure_ascii=False, indent=4)

print("✅ Terminé!")