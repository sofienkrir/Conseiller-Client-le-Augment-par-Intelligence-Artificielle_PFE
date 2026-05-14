import json
import re
import os

def extract_key_info(text):
    info = {}
    # Find duration
    duree = re.search(r'[Dd]urée.*remboursement.*(?:jusqu\'à|allant jusqu\'à|sur)?\s*(\d+.*?ans?)', text, re.IGNORECASE)
    if duree:
        info['Durée max'] = duree.group(1).strip()
    # Find amount
    montant = re.search(r'[Mm]ontant.*(?:plafonné|atteindre|maximum).*\s*(\d+.*?TND)', text, re.IGNORECASE)
    if montant:
        info['Montant max'] = montant.group(1).strip()
    return info

def improve_spacing(text):
    if not isinstance(text, str):
        return text
    # Don't add spaces around dots in emails/URLs
    import re
    # Standard spacing fix
    text = re.sub(r'([.!?])([A-ZÀ-Ÿa-z])', r'\1 \2', text)
    # Fix broken emails: word. COM. TN → word.COM.TN
    text = re.sub(r'(\w)\. ([A-Z]{2,})\. ([A-Z]{2,})', r'\1.\2.\3', text)
    return text

def remove_marketing_sections(text):
    patterns = [
        r"Ma Banque à distance.*",
        r"Ces produits peuvent vous intéresser.*",
        r"Découvrez nos solutions.*",
        r"Prendre rendez-vous.*",
        r"Je contacte un conseiller.*"
    ]
    
    for p in patterns:
        text = re.sub(p, "", text, flags=re.IGNORECASE | re.DOTALL)
        
    return text.strip()

def process_offres_packagee(data_path, output_dir):
    with open(data_path, "r", encoding="utf-8") as f:  # READ the input
        data = json.load(f)


    documents = []
    for item in data:
        titre = improve_spacing(item["titre"])
        desc = improve_spacing(item["description_courte"])
        avantages = [improve_spacing(a) for a in item["avantages"]]
        marketing_patterns = ["Ma Banque à distance", "Ces produits peuvent vous intéresser", "Assuremprunt", "Prendre rendez-vous", "Je contacte un conseiller", "Avantages du", "Découvrez nos solutions"]
        avantages = [a for a in avantages if not any(p.lower() in a.lower() for p in marketing_patterns)]
        avantages = list(set(avantages))  # dedup
        avantages_text = "\n- " + "\n- ".join(avantages) if avantages else ""

        key_info = extract_key_info(avantages_text)

        document_text = f"""Offre: {titre}
Catégorie: {item['categorie']}

Description:
{desc}

Avantages:
{avantages_text}"""

        if key_info:
            info_text = "\n".join(f"{k}: {v}" for k, v in key_info.items())
            document_text += f"""

Informations clés:
{info_text}"""

        documents.append({
            "text": document_text.strip(),
            "metadata": {
                "source": "offre_packagee",
                "url": item["url"],
                "titre": titre
            }
        })

    # WRITE to output_dir at the bottom
    filename = os.path.basename(data_path).replace(".json", "_clean.json")
    output_path = os.path.join(output_dir, filename)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(documents, f, ensure_ascii=False, indent=4)

def process_credit(data_path, output_dir):
    with open(data_path, "r", encoding="utf-8") as f:  # READ the input
        data = json.load(f)

    documents = []
    for item in data:
        titre = improve_spacing(item["titre"])
        desc = improve_spacing(item["description_courte"])
        avantages = [improve_spacing(a) for a in item["avantages"]]
        marketing_patterns = ["Ma Banque à distance", "Ces produits peuvent vous intéresser", "Assuremprunt", "Prendre rendez-vous", "Je contacte un conseiller", "Avantages du", "Découvrez nos solutions"]
        avantages = [a for a in avantages if not any(p.lower() in a.lower() for p in marketing_patterns)]
        avantages = list(set(avantages))  # dedup
        avantages_text = "\n- " + "\n- ".join(avantages) if avantages else ""

        fournisseurs_text = ""
        if item.get("fournisseurs") and item["fournisseurs"]:
            fournisseurs_list = [f"{improve_spacing(f['partenaire'])} à {improve_spacing(f['emplacement'])}" for f in item["fournisseurs"]]
            fournisseurs_text = "\n- " + "\n- ".join(fournisseurs_list)

        document_text = f"""Offre: {titre}
Catégorie: {item['categorie']}

Description:
{desc}

Avantages:
{avantages_text}"""

        documents.append({
            "text": document_text.strip(),
            "metadata": {
                "source": "credit",
                "url": item["url"],
                "titre": titre
            }
        })

        if fournisseurs_text:
            fournisseurs_doc = {
                "text": f"Fournisseurs partenaires du {titre}:\n{fournisseurs_text}",
                "metadata": {
                    "source": "credit_fournisseurs",
                    "related_to": titre,
                    "url": item["url"]
                }
            }
            documents.append(fournisseurs_doc)

    # WRITE to output_dir at the bottom
    filename = os.path.basename(data_path).replace(".json", "_clean.json")
    output_path = os.path.join(output_dir, filename)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(documents, f, ensure_ascii=False, indent=4)

def process_cartes(data_path, output_dir):
    with open(data_path, "r", encoding="utf-8") as f:  # READ the input
        data = json.load(f)
    documents = []
    for item in data:
        titre = improve_spacing(item["titre"])
        desc = improve_spacing(item["description_courte"])
        avantages = [improve_spacing(a) for a in item["avantages"]]
        avantages = list(set(avantages))  # dedup
        avantages_text = "\n- " + "\n- ".join(avantages) if avantages else ""
        plafond_max = improve_spacing(item.get("plafond_max") or "")
        paiement_fractionne = improve_spacing(item.get("paiement_fractionne") or "")

        document_text = f"""Offre: {titre}
Catégorie: {item['categorie']}

Description:
{desc}

Avantages:
{avantages_text}"""

        if plafond_max:
            document_text += f"""

Plafond max:
{plafond_max}"""
        if paiement_fractionne:
            document_text += f"""

Paiement fractionné:
{paiement_fractionne}"""

        documents.append({
            "text": document_text.strip(),
            "metadata": {
                "source": "carte_bancaire",
                "url": item["url"],
                "titre": titre
            }
        })

    # WRITE to output_dir at the bottom
    filename = os.path.basename(data_path).replace(".json", "_clean.json")
    output_path = os.path.join(output_dir, filename)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(documents, f, ensure_ascii=False, indent=4)

def process_epargne(data_path, output_dir):
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    documents = []
    for item in data:
        titre = improve_spacing(item["titre"])
        theme = improve_spacing(item.get("theme", ""))
        categorie = item["categorie"]
        desc = improve_spacing(item["description"])
        avantages = item.get("avantages", [])

        # ✅ Parse correctly, keep order, no set()
        avantages_list = [
            f"{improve_spacing(a['titre_avantage'])} : {improve_spacing(a['description_avantage'])}"
            for a in avantages
        ]
        avantages_text = "\n- " + "\n- ".join(avantages_list) if avantages_list else ""

        document_text = f"""Catégorie : {categorie}
Thème : {theme}
Titre : {titre}

Description :
{desc}

Avantages :{avantages_text}"""

        documents.append({
            "text": document_text.strip(),
            "metadata": {
                "source": "epargne_et_placement",
                "titre": titre,
                "theme": theme,        # ✅ added
                "categorie": categorie  # ✅ added
            }
        })

    filename = os.path.basename(data_path).replace(".json", "_clean.json")
    output_path = os.path.join(output_dir, filename)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(documents, f, ensure_ascii=False, indent=4)
    print(f"✓ epargne: {len(documents)} documents")

def process_assurance(data_path, output_dir):
    with open(data_path, "r", encoding="utf-8") as f: 
        data = json.load(f)
    documents = []
    for item in data:
        titre = improve_spacing(item["titre"])
        categorie = item["categorie"]
        desc = improve_spacing(item["description"])
        avantages = item["avantages"]
        avantages_list = [f"{improve_spacing(a['titre_avantage'])}: {improve_spacing(a['description_avantage'])}" for a in avantages]
        avantages_list = list(set(avantages_list))  # dedup
        avantages_text = "\n- " + "\n- ".join(avantages_list) if avantages_list else ""

        document_text = f"""Offre: {titre}
Catégorie: {categorie}

Description:
{desc}

Avantages:
{avantages_text}"""

        documents.append({
            "text": document_text.strip(),
            "metadata": {
                "source": "assurance_prevoyance",
                "titre": titre
            }
        })

    # WRITE to output_dir at the bottom
    filename = os.path.basename(data_path).replace(".json", "_clean.json")
    output_path = os.path.join(output_dir, filename)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(documents, f, ensure_ascii=False, indent=4)


def fix_encoding(text):
    try:
        return text.encode('latin-1').decode('utf-8')
    except:
        return text



def process_banque_distance(data_path, output_dir):
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    documents = []
    for item in data:
        # ✅ Read directly from item (no "metadata" wrapper in raw)
        titre = improve_spacing(item.get("titre", "Unknown"))
        theme = improve_spacing(item.get("theme", ""))
        categorie = item.get("categorie", "Banque à distance")
        description = improve_spacing(fix_encoding(item.get("description", "")))
        details = item.get("details", {})

        # Build document text
        document_text = f"Catégorie : {categorie}\n"
        if theme:
            document_text += f"Thème : {theme}\n"
        document_text += f"Titre : {titre}\n"
        document_text += f"Description : {description}\n"

        # ✅ Presentation
        if details.get("presentation"):
            document_text += f"\nPrésentation :\n{fix_encoding(improve_spacing(details['presentation']))}\n"

        # ✅ Migration steps
        if details.get("migration_steps"):
            document_text += "\nÉtapes de migration :\n"
            for step in details["migration_steps"]:
                document_text += f"- {fix_encoding(improve_spacing(step))}\n"

        # ✅ FAQ
        if details.get("faq"):
            document_text += "\nFoire aux questions :\n"
            for qa in details["faq"]:
                q = fix_encoding(improve_spacing(qa.get("question", "")))
                r = fix_encoding(improve_spacing(qa.get("reponse", "")))
                document_text += f"Q: {q}\nR: {r}\n"

        # ✅ Avantages (Attijari Real Time)
        if details.get("avantages"):
            document_text += "\nAvantages :\n"
            for av in details["avantages"]:
                t = improve_spacing(av.get("titre", ""))
                d = improve_spacing(av.get("description", ""))
                document_text += f"- {t} : {d}\n"

        documents.append({
            "text": document_text.strip(),
            "metadata": {
                "source": "banque_distance",
                "titre": titre,
                "theme": theme,
                "categorie": categorie
            }
        })

    filename = os.path.basename(data_path).replace(".json", "_clean.json")
    output_path = os.path.join(output_dir, filename)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(documents, f, ensure_ascii=False, indent=4)
    print(f"✓ banque_distance: {len(documents)} documents")

if __name__ == "__main__":
    raw_path = "data/raw"
    processed_path = "data/processed"
    os.makedirs(processed_path, exist_ok=True)  # create if not exists

    process_offres_packagee(os.path.join(raw_path, "offres_packagee.json"), processed_path)
    process_credit(os.path.join(raw_path, "credit.json"), processed_path)
    process_cartes(os.path.join(raw_path, "carte_bancaire.json"), processed_path)
    process_epargne(os.path.join(raw_path, "epargne_et_placement.json"), processed_path)
    process_assurance(os.path.join(raw_path, "assurance_prevoyance.json"), processed_path)
    process_banque_distance(os.path.join(raw_path, "banque_distance.json"), processed_path)

    # Combine all into corpus_clean.json
    all_documents = []
    clean_files = [
        "offres_packagee_clean.json",
        "credit_clean.json",
        "carte_bancaire_clean.json",
        "epargne_et_placement_clean.json",
        "assurance_prevoyance_clean.json",
        "banque_distance_clean.json"
    ]
    for filename in clean_files:
        path = os.path.join(processed_path, filename)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                all_documents.extend(json.load(f))
            print(f"✓ Loaded {filename}")
        else:
            print(f"✗ Missing: {filename}")

    corpus_path = os.path.join(processed_path, "corpus_clean.json")
    with open(corpus_path, "w", encoding="utf-8") as f:
        json.dump(all_documents, f, ensure_ascii=False, indent=4)
    print(f"\n✓ corpus_clean.json created with {len(all_documents)} documents")