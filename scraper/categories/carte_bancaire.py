from ..base_scraper import BaseScraper
from bs4 import BeautifulSoup

class CarteBancaireScraper(BaseScraper):
    def __init__(self):
        super().__init__()
        self.url = "https://www.attijaribank.com.tn/fr/particulier/carte-bancaire"

    def parse_cartes(self, html):
        """Parse les cartes bancaires depuis le HTML"""
        import re
        soup = BeautifulSoup(html, "html.parser")
        cartes = []
        base_url = "https://www.attijaribank.com.tn"

        blocks = soup.find_all("div", class_="col-produit")
        for block in blocks:
            titre = block.find("div", class_="theme")
            desc_div = block.find("div", class_="desc")
            link_tag = block.find("a")
            if titre and desc_div:
                titre_text = titre.get_text(strip=True)
                summary_desc = desc_div.get_text(strip=True)
                full_data = {
                    "titre": titre_text,
                    "categorie": "Carte bancaire",
                    "description_courte": summary_desc,
                    "avantages": [],
                    "plafond_max": None,
                    "paiement_fractionne": None,
                    "url": ""
                }
                if link_tag and link_tag.get("href"):
                    href = link_tag["href"]
                    full_url = base_url + href if href.startswith("/") else href
                    detail_html = self.fetch_page(full_url)
                    if detail_html:
                        detail_soup = BeautifulSoup(detail_html, "html.parser")
                        desc_boxes = detail_soup.find_all("div", class_="desc-box")
                        avantages = [box.get_text(strip=True) for box in desc_boxes]
                        plafond_max = None
                        paiement_fractionne = None
                        for adv in avantages:
                            if any(k in adv.lower() for k in ["échelonné", "fractionné", "étalées"]):
                                # Extract numbers
                                numbers = re.findall(r'\d+', adv)
                                if numbers:
                                    paiement_fractionne = ", ".join(sorted(set(numbers))) + " fois"
                            if "plafond" in adv.lower():
                                # Extract TND
                                match = re.search(r'(\d+[\s\xa0]+\d+[\s\xa0]*TND)', adv)
                                if match:
                                    plafond_max = match.group(1)
                        # Also check desc
                        if not plafond_max:
                            match = re.search(r'(\d+[\s\xa0]+\d+[\s\xa0]*TND)', summary_desc)
                            if match:
                                plafond_max = match.group(1)
                        if not paiement_fractionne:
                            if "fractionné" in summary_desc.lower() or "étalées" in summary_desc.lower():
                                numbers = re.findall(r'\d+', summary_desc)
                                if numbers:
                                    paiement_fractionne = ", ".join(sorted(set(numbers))) + " fois"
                        full_data.update({
                            "avantages": avantages,
                            "plafond_max": plafond_max,
                            "paiement_fractionne": paiement_fractionne,
                            "url": full_url
                        })
                cartes.append(full_data)
        return cartes

    def scrape(self):
        html = self.fetch_page(self.url)
        if html:
            data = self.parse_cartes(html)
            self.save_json(data, "carte_bancaire.json")
            return data
        else:
            print("Impossible de récupérer la page")
            return []
