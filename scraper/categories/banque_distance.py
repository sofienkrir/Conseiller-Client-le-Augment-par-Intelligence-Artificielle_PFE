from ..base_scraper import BaseScraper
from bs4 import BeautifulSoup
import re


class BanqueDistanceScraper(BaseScraper):

    def __init__(self):
        super().__init__()
        self.base_url = "https://www.attijaribank.com.tn"
        self.url = self.base_url + "/fr/particulier/banque-distance"
        self.attijari_up_detail_url = "https://www.attijariup.com.tn/landingPage.html"
        self.attijari_real_time_url = self.base_url + "/fr/particulier/banque-distance/attijari-real-time"

    # --------------------------------------------------
    # Nettoyage texte
    # --------------------------------------------------
    def clean_text(self, text):
        if not text:
            return ""
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    # --------------------------------------------------
    # Scraper page principale
    # --------------------------------------------------
    def parse_banque_distance(self, html):
        soup = BeautifulSoup(html, "html.parser")
        produits = []

        blocks = soup.find_all("div", class_="col-produit")

        for block in blocks:
            theme = block.find("div", class_="theme")
            title = block.find("div", class_="title")
            desc = block.find("div", class_="desc")

            produits.append({
                "categorie": "Banque à distance",
                "theme": self.clean_text(theme.get_text()) if theme else None,
                "titre": self.clean_text(title.get_text()) if title else None,
                "description": self.clean_text(desc.get_text()) if desc else "",
                "details": {}
            })

        return produits

    # --------------------------------------------------
    # Scraper landing page Attijari UP
    # --------------------------------------------------
    def parse_attijari_up_detail(self, html):

        soup = BeautifulSoup(html, "html.parser")

        data = {
            "presentation": "",
            "migration_steps": [],
            "faq": [],
            "support": {},
        }

        accueil = soup.find("div", id="accueil")
        if accueil:
            p = accueil.find("p", class_="l-application")
            if p:
                data["presentation"] = self.clean_text(
                    p.get_text(" ", strip=True)
                )

        migration_section = soup.find("div", id="solutionsSimples")
        if migration_section:
            steps = migration_section.find_all("div", class_="feature-item")
            for step in steps:
                text = self.clean_text(step.get_text(" ", strip=True))
                if len(text) > 20:
                    data["migration_steps"].append(text)

        faq_section = soup.find("div", id="foireAuxQuestions")
        if faq_section:
            faqs = faq_section.find_all("details")
            for faq in faqs:
                question = faq.find("summary")
                answer = faq.find("div", class_="faq-content")

                if question and answer:
                    data["faq"].append({
                        "question": self.clean_text(question.get_text(strip=True)),
                        "reponse": self.clean_text(answer.get_text(" ", strip=True))
                    })

        service = soup.find("div", id="serviceClient")
        if service:
            phone = service.find(string=lambda x: x and "71 111 345" in x)
            email_tag = service.find("a", href=lambda x: x and "mailto:" in x)

            data["support"] = {
                "telephone": "71 111 345" if phone else "",
                "email": self.clean_text(email_tag.get_text(strip=True)) if email_tag else ""
            }

        
        return data

    # --------------------------------------------------
    # Scraper avantages Attijari Real Time
    # --------------------------------------------------
    def parse_attijari_real_time_avantages(self, html):

        soup = BeautifulSoup(html, "html.parser")
        avantages_data = []

        avantages = soup.find_all("div", class_="box-service")

        for avantage in avantages:
            titre = avantage.find("div", class_="title-box")
            description = avantage.find("div", class_="desc-box")

            avantages_data.append({
                "titre": self.clean_text(titre.get_text()) if titre else "",
                "description": self.clean_text(description.get_text()) if description else ""
            })

        return avantages_data

    # --------------------------------------------------
    # Scraping complet
    # --------------------------------------------------
    def scrape(self):

        html = self.fetch_page(self.url)

        if not html:
            print("Impossible de récupérer la page principale")
            return []

        produits = self.parse_banque_distance(html)

        for produit in produits:

            # Attijari UP
            if produit["theme"] and "Attijari UP" in produit["theme"]:
                print("Scraping page détaillée Attijari UP...")
                detail_html = self.fetch_page(self.attijari_up_detail_url)

                if detail_html:
                    produit["details"] = self.parse_attijari_up_detail(detail_html)

            # Attijari Real Time
            if produit["theme"] and "Real Time" in produit["theme"]:
                print("Scraping avantages Attijari Real Time...")
                detail_html = self.fetch_page(self.attijari_real_time_url)

                if detail_html:
                    produit["details"]["avantages"] = self.parse_attijari_real_time_avantages(detail_html)

        self.save_json(produits, "banque_distance.json")
        return produits


# --------------------------------------------------
# Lancement
# --------------------------------------------------
if __name__ == "__main__":
    scraper = BanqueDistanceScraper()
    data = scraper.scrape()
    print("Nombre de produits trouvés :", len(data))