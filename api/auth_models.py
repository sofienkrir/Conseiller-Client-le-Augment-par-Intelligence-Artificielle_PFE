# api/auth_models.py

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Any
import re

class UserCreate(BaseModel):
    """Inscription: client_code obligatoire, nom/prenom auto-remplis depuis le client MongoDB."""
    client_code: str                          # OBLIGATOIRE — format ATB-YYYY-NNNN
    email: EmailStr
    telephone: Optional[str] = None
    password: str = Field(..., min_length=8)
    confirm_password: str

    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

    @validator('password')
    def password_strength(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one number')
        return v

class UserLogin(BaseModel):
    """Connexion email + mot de passe."""
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """Données user renvoyées au client (sans password_hash)."""
    id: str
    nom: str
    prenom: str
    email: str
    segment: Optional[str] = None
    telephone: Optional[str] = None
    is_admin: bool = False
    client_code: Optional[str] = None

class TokenResponse(BaseModel):
    """Réponse après login ou register."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    client: Optional[Any] = None  # infos client liées (None pour les admins)
