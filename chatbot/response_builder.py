# response_builder.py

class ResponseBuilder:
    def __init__(self):
        pass

    def build_response(self, intent, entities, context=None):
        # Build dynamic response based on intent and entities
        base_response = f"Intent détecté: {intent}"
        if entities:
            base_response += f" | Entités: {entities}"
        return base_response
