# api/auth_models.py

from pydantic import BaseModel, EmailStr, Field, validator
<<<<<<< HEAD
from typing import Optional
=======
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
import re

class UserCreate(BaseModel):
    """نموذج تسجيل مستخدم جديد"""
    nom: str = Field(..., min_length=2, max_length=50)
    prenom: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
<<<<<<< HEAD
    telephone: Optional[str] = None
    segment: Optional[str] = None
=======
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
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
    """نموذج تسجيل الدخول"""
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """نموذج إرجاع بيانات المستخدم (بدون كلمة السر)"""
    id: str
    nom: str
    prenom: str
    email: str
<<<<<<< HEAD
    segment: Optional[str] = None
    telephone: Optional[str] = None
    is_admin: bool = False 
=======

>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
class TokenResponse(BaseModel):
    """نموذج إرجاع التوكن بعد تسجيل الدخول"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse