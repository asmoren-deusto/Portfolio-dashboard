"""Authentication router: user management, password verification, and session tokens."""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Optional
import time

from app.database import get_db
from app.models import User
from app.schemas import (
    UserOut,
    LoginRequest,
    LoginResponse,
    SetPasswordRequest,
    ChangePasswordRequest,
    CreateUserRequest,
)
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _to_user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        name=user.name,
        email=user.email,
        strategy=user.strategy or "Cartera Indexada Global",
        initial_balance=user.initial_balance or 50000.0,
        broker=user.broker or "MyInvestor",
        avatar=user.avatar or "US",
        badge=user.badge or "Inversor",
        bg_gradient=user.bg_gradient or "linear-gradient(135deg, #10b981 0%, #047857 100%)",
        is_demo=bool(user.is_demo),
        has_password=bool(user.password_hash and user.password_salt),
    )


@router.get("/users", response_model=List[UserOut])
def get_users(db: Session = Depends(get_db)):
    """List all available user profiles without exposing password hashes."""
    users = db.query(User).all()
    # Exclude any legacy demo test users or 'laura'
    valid_users = [u for u in users if u.id != "laura"]
    return [_to_user_out(u) for u in valid_users]


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with user_id or email and optional password."""
    user = None
    if req.user_id:
        user = db.query(User).filter(User.id == req.user_id).first()
    elif req.email:
        user = db.query(User).filter(User.email.ilike(req.email.strip())).first()

    if not user:
        return LoginResponse(success=False, error="Usuario no encontrado.")

    # Demo user always bypasses password
    if user.is_demo or user.id == "demo":
        token = create_access_token(user.id)
        return LoginResponse(success=True, user=_to_user_out(user), token=token)

    # If user has not set a password yet, allow login
    if not user.password_hash or not user.password_salt:
        token = create_access_token(user.id)
        return LoginResponse(success=True, user=_to_user_out(user), token=token)

    # User has a password: verify it
    if not req.password:
        return LoginResponse(success=False, error="Por favor introduce tu contraseña.")

    if not verify_password(req.password, user.password_hash, user.password_salt):
        return LoginResponse(success=False, error="Contraseña incorrecta. Por favor, compruébala.")

    token = create_access_token(user.id)
    return LoginResponse(success=True, user=_to_user_out(user), token=token)


@router.post("/set-password", response_model=LoginResponse)
def set_password(req: SetPasswordRequest, db: Session = Depends(get_db)):
    """Set an initial password for a user that does not have one yet."""
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        return LoginResponse(success=False, error="Usuario no encontrado.")

    if user.is_demo or user.id == "demo":
        return LoginResponse(success=False, error="El usuario demo no puede tener contraseña.")

    if user.password_hash and user.password_salt:
        return LoginResponse(success=False, error="El perfil ya tiene una contraseña configurada. Usa cambiar contraseña.")

    if not req.new_password or len(req.new_password) < 4:
        return LoginResponse(success=False, error="La contraseña debe tener al menos 4 caracteres.")

    pwd_hash, salt = hash_password(req.new_password)
    user.password_hash = pwd_hash
    user.password_salt = salt
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return LoginResponse(success=True, user=_to_user_out(user), token=token)


@router.post("/change-password", response_model=LoginResponse)
def change_password(req: ChangePasswordRequest, db: Session = Depends(get_db)):
    """Change an existing password verifying the current password."""
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        return LoginResponse(success=False, error="Usuario no encontrado.")

    if user.is_demo or user.id == "demo":
        return LoginResponse(success=False, error="El usuario demo no puede tener contraseña.")

    if user.password_hash and user.password_salt:
        if not verify_password(req.current_password, user.password_hash, user.password_salt):
            return LoginResponse(success=False, error="La contraseña actual no es correcta.")

    if not req.new_password or len(req.new_password) < 4:
        return LoginResponse(success=False, error="La nueva contraseña debe tener al menos 4 caracteres.")

    pwd_hash, salt = hash_password(req.new_password)
    user.password_hash = pwd_hash
    user.password_salt = salt
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return LoginResponse(success=True, user=_to_user_out(user), token=token)


@router.post("/create-user", response_model=LoginResponse)
def create_user(req: CreateUserRequest, db: Session = Depends(get_db)):
    """Create a new user profile in the database."""
    existing = db.query(User).filter(User.email.ilike(req.email.strip())).first()
    if existing:
        return LoginResponse(success=False, error="Ya existe un usuario con este correo electrónico.")

    user_id = f"user-{int(time.time())}"
    initials = "".join([part[0].upper() for part in req.name.strip().split() if part])[:2] or "US"

    pwd_hash = None
    salt = None
    if req.password and len(req.password) >= 4:
        pwd_hash, salt = hash_password(req.password)

    new_user = User(
        id=user_id,
        name=req.name.strip(),
        email=req.email.strip().lower(),
        password_hash=pwd_hash,
        password_salt=salt,
        strategy=req.strategy or "Cartera Indexada Global",
        initial_balance=req.initial_balance or 50000.0,
        broker="MyInvestor",
        avatar=initials,
        badge="Inversor",
        bg_gradient="linear-gradient(135deg, #10b981 0%, #047857 100%)",
        is_demo=False,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.id)
    return LoginResponse(success=True, user=_to_user_out(new_user), token=token)


@router.get("/me", response_model=UserOut)
def get_me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Get profile of current authenticated user from bearer token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No autorizado")

    token = authorization.split(" ")[1]
    user_id = verify_access_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return _to_user_out(user)
