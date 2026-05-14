# intent_detection.py

import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import pickle
import os

class IntentDetector:
    def __init__(self, model_path=None):
        self.model_path = model_path or 'models/intent_model.pkl'
        self.vectorizer = TfidfVectorizer()
        self.model = LogisticRegression()
        self.intents = ['greeting', 'account_balance', 'transfer', 'credit_info', 'savings', 'insurance']

    def train(self, texts, labels):
        X = self.vectorizer.fit_transform(texts)
        self.model.fit(X, labels)
        # Save model
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        with open(self.model_path, 'wb') as f:
            pickle.dump((self.vectorizer, self.model), f)

    def predict(self, text):
        if not os.path.exists(self.model_path):
            return 'unknown'
        with open(self.model_path, 'rb') as f:
            self.vectorizer, self.model = pickle.load(f)
        X = self.vectorizer.transform([text])
        intent = self.model.predict(X)[0]
        return intent
