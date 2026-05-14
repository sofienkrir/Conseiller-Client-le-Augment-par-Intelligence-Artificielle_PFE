# api/auth_routes.py

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .auth_models import UserCreate, UserLogin, UserResponse, TokenResponse
from .auth_db import AuthDB, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """تسجيل مستخدم جديد"""
    # إنشاء المستخدم
    result = AuthDB.create_user(user_data.dict())
    
    if "error" in result:
        if "Email already exists" in result["error"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["error"]
        )
    
    # إنشاء JWT token
    access_token = AuthDB.create_access_token(
        data={"sub": result["id"], "email": result["email"]}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": result
    }

@router.post("/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    """تسجيل الدخول"""
    # التحقق من صحة البيانات
    user = AuthDB.authenticate_user(user_data.email, user_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # إنشاء JWT token
    access_token = AuthDB.create_access_token(
        data={"sub": user["id"], "email": user["email"]}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """جلب بيانات المستخدم الحالي"""
    token = credentials.credentials
    
    # التحقق من صحة الـ token
    payload = AuthDB.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # جلب المستخدم من قاعدة البيانات
    user = AuthDB.get_user_by_id(payload.get("sub"))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user

# هذا التابع سنستعمله لحماية endpoints أخرى
async def get_current_user_dependency(token: str = Depends(HTTPBearer())):
    """Dependency لاستعمالها في endpoints أخرى"""
    payload = AuthDB.verify_token(token.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    
    user = AuthDB.get_user_by_id(payload.get("sub"))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
<<<<<<< HEAD
    return user

# ════════════════════════════════════════════════════
# Admin dependency — حماية endpoints /admin/*
# ════════════════════════════════════════════════════
async def get_current_admin_dependency(
    current_user: dict = Depends(get_current_user_dependency)
) -> dict:
    """
    Vérifie que le user authentifié est bien un admin.
    À utiliser sur les endpoints /admin/*
    """
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé: privilèges administrateur requis.",
        )
    return current_user
=======
    return user
>>>>>>> 137ac2d20c22e68e7fef138e68204ddc485a45b9
