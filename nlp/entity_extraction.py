# entity_extraction.py

import spacy

class EntityExtractor:
    def __init__(self, model='fr_core_news_sm'):
        self.nlp = spacy.load(model)

    def extract_entities(self, text):
        doc = self.nlp(text)
        entities = {}
        for ent in doc.ents:
            entities[ent.label_] = ent.text
        return entities
