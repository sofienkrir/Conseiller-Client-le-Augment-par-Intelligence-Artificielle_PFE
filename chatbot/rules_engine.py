# rules_engine.py

class RulesEngine:
    def __init__(self):
        self.rules = {
            'greeting': 'Bonjour ! Comment puis-je vous aider avec vos services bancaires ?',
            'account_balance': 'Pour consulter votre solde, veuillez vous connecter à votre compte en ligne.',
            'transfer': 'Pour effectuer un virement, utilisez l\'application mobile ou le site web.',
            'credit_info': 'Nos crédits sont adaptés à vos besoins. Consultez notre section crédit.',
            'savings': 'Découvrez nos solutions d\'épargne pour votre avenir.',
            'insurance': 'Nous proposons diverses assurances pour vous protéger.',
        }

    def get_response(self, intent):
        return self.rules.get(intent, 'Désolé, je ne comprends pas votre demande.')
