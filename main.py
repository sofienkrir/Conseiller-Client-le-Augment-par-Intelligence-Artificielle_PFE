from scraper.categories.credit import CreditScraper

if __name__ == "__main__":
    scraper = CreditScraper()
    data = scraper.scrape()
    for c in data:
        print(c)
