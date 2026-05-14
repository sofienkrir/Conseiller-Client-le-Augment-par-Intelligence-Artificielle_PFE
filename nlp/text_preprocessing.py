# text_preprocessing.py

import nltk
from nltk.corpus import stopwords
from nltk.stem import SnowballStemmer
import re

nltk.download('stopwords', quiet=True)

class TextPreprocessor:
    def __init__(self, language='french'):
        self.stop_words = set(stopwords.words(language))
        self.stemmer = SnowballStemmer(language)

    def preprocess(self, text):
        # Lowercase
        text = text.lower()
        # Remove punctuation
        text = re.sub(r'[^\w\s]', '', text)
        # Tokenize
        tokens = text.split()
        # Remove stop words
        tokens = [token for token in tokens if token not in self.stop_words]
        # Stem
        tokens = [self.stemmer.stem(token) for token in tokens]
        return tokens
