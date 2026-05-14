from ..base_scraper import BaseScraper
from bs4 import BeautifulSoup


class EpargneScraper(BaseScraper):
    def __init__(self):
        super().__init__()
        self.base_url = "https://www.attijaribank.com.tn"
        self.url = self.base_url + "/fr/particulier/epargne-et-placement"

    # 🔹 Page principale
    def parse_epargne(self, html):
        soup = BeautifulSoup(html, "html.parser")
        produits = []

        blocks = soup.find_all("div", class_="col-produit")

        for block in blocks:
            theme = block.find("div", class_="theme")
            title = block.find("div", class_="title")
            desc = block.find("div", class_="desc")

            link_tag = block.find("a")
            link = None
            if link_tag and link_tag.get("href"):
                link = self.base_url + link_tag.get("href")

            produits.append({
                "categorie": "Épargne et Placement",
                "theme": theme.get_text(strip=True) if theme else None,
                "titre": title.get_text(strip=True) if title else None,
                "description": desc.get_text(strip=True) if desc else None,
                "_url": link,  # temporaire (underscore = privé)
                "avantages": []
            })

        return produits

    # 🔹 Page détail
    def parse_detail_page(self, url):
        html = self.fetch_page(url)
        if not html:
            return []

        soup = BeautifulSoup(html, "html.parser")
        avantages = []

        section = soup.find("div", class_="row-outils-services")

        if section:
            items = section.find_all("div", class_="col-icon-service")

            for item in items:
                title = item.find("div", class_="title-box")
                desc = item.find("div", class_="desc-box")

                avantages.append({
                    "titre_avantage": title.get_text(strip=True) if title else None,
                    "description_avantage": desc.get_text(strip=True) if desc else None
                })

        return avantages

    # 🔹 Scrape complet
    def scrape(self):
        html = self.fetch_page(self.url)
        if not html:
            print("Impossible de récupérer la page")
            return []

        produits = self.parse_epargne(html)

        for produit in produits:
            if produit["_url"]:
                print("Scraping détail :", produit["titre"])
                produit["avantages"] = self.parse_detail_page(produit["_url"])

            # 🔥 supprimer l'URL avant sauvegarde
            del produit["_url"]

        self.save_json(produits, "epargne_et_placement.json")
        return produits


if __name__ == "__main__":
    scraper = EpargneScraper()
    data = scraper.scrape()
    print("Nombre de produits trouvés :", len(data))