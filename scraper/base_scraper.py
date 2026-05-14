import json
import os
import requests
from time import sleep

class BaseScraper:
    def __init__(self, retries=3, delay=1):
        self.retries = retries
        self.delay = delay

    def fetch_page(self, url):
        """Récupère le contenu HTML d'une URL avec retry"""
        for attempt in range(self.retries):
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    return response.text
                else:
                    print(f"Erreur HTTP {response.status_code} pour {url}")
            except Exception as e:
                print(f"Erreur: {e}, tentative {attempt+1}/{self.retries}")
            sleep(self.delay)
        return None

    def save_json(self, data, filename, folder="data/raw"):
        """Sauvegarde les données dans un fichier JSON"""
        os.makedirs(folder, exist_ok=True)
        filepath = os.path.join(folder, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Données sauvegardées dans {filepath}")
