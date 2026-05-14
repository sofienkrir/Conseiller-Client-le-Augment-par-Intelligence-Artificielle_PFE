# credit.py

from ..base_scraper import BaseScraper
from bs4 import BeautifulSoup

class CreditScraper(BaseScraper):
    def __init__(self):
        super().__init__()
        self.url = "https://www.attijaribank.com.tn/fr/particulier/credit"

    def parse_credits(self, html):
        """Parse les crédits depuis le HTML"""
        soup = BeautifulSoup(html, "html.parser")
        credits = []

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
                    "categorie": "Crédit",
                    "description_courte": summary_desc,
                    "avantages": [],
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
                        # Add additional details from 'Bon à savoir' section
                        partners_sections = detail_soup.find_all("div", class_="field--name-bp-text")
                        fournisseurs = []
                        for section in partners_sections:
                            table = section.find("table")
                            if table:
                                tbody = table.find("tbody")
                                if tbody:
                                    for row in tbody.find_all("tr"):
                                        tds = row.find_all("td")
                                        if len(tds) >= 2:
                                            partenaire = tds[0].get_text(strip=True)
                                            emplacement = tds[1].get_text(strip=True)
                                            fournisseurs.append({"partenaire": partenaire, "emplacement": emplacement})
                            # For now, still append raw text to avantages if not table, but for fournisseurs, add separately
                            avantages.append(section.get_text(strip=True))
                        full_data["fournisseurs"] = fournisseurs if fournisseurs else None
                        full_data.update({
                            "avantages": avantages,
                            "url": full_url
                        })
                credits.append(full_data)
        return credits

    def scrape(self):
        html = self.fetch_page(self.url)
        if html:
            data = self.parse_credits(html)
            self.save_json(data, "credit.json")
            return data
        else:
            print("Impossible de récupérer la page")
            return []
