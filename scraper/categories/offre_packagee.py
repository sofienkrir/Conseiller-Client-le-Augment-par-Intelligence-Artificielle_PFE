from scraper.base_scraper import BaseScraper
from bs4 import BeautifulSoup

class OffrePackageeScraper(BaseScraper):
    def __init__(self):
        super().__init__()
        self.url = "https://www.attijaribank.com.tn/fr/particulier/offre-packagee"

    def parse_offres(self, html):
        """Parse les offres packagées depuis le HTML"""
        soup = BeautifulSoup(html, "html.parser")
        offres = []
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
                    "categorie": "Offre packagée",
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
                        full_data.update({
                            "avantages": avantages,
                            "url": full_url
                        })
                offres.append(full_data)
        return offres

    def scrape(self):
        html = self.fetch_page(self.url)
        if html:
            data = self.parse_offres(html)
            self.save_json(data, "offres_packagee.json")
            return data
        else:
            print("Impossible de récupérer la page")
            return []
