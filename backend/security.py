"""
security.py — Seguretat: hashing de passwords i JWT

Aquí hi ha tota la lògica de seguretat:
  1. Hashing de passwords amb bcrypt (via passlib)
  2. Creació i verificació de tokens JWT (via python-jose)
  3. Dependencies de FastAPI per protegir endpoints
"""
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os

import models
from database import get_db

load_dotenv()

# ── Configuració JWT ──────────────────────────────────────
SECRET_KEY           = os.getenv("SECRET_KEY", "dev_secret_key_canvia_en_produccio")
ALGORITHM            = "HS256"
TOKEN_EXPIRE_MINUTES = 60   # el token caduca al cap d'1 hora

# ── Configuració bcrypt ───────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

http_bearer = HTTPBearer()


# ── Funcions de password ──────────────────────────────────

def hash_password(plain_password: str) -> str:
    """Converteix una password en text pla a un hash bcrypt segur."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compara una password en text pla amb el hash guardat a la BD."""
    return pwd_context.verify(plain_password, hashed_password)


# ── Funcions JWT ──────────────────────────────────────────

def create_access_token(user_id: int, rol: str) -> str:
    """
    Crea un token JWT signat digitalment.

    El token conté:
      - sub (subject): l'ID de l'usuari com a string
      - rol: el rol de l'usuari (per evitar una consulta a la BD en cada petició)
      - exp: data d'expiració
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "rol": rol,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _decode_token(token: str) -> dict | None:
    """
    Descodifica i verifica un token JWT.
    Retorna el payload si és vàlid, o None si ha expirat o és incorrecte.
    """
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ── Dependencies de FastAPI ───────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
    db: Session = Depends(get_db),
) -> models.Usuari:
    """
    Dependency que verifica el token JWT i retorna l'usuari autenticat.
    S'usa amb Depends() en qualsevol endpoint que requereixi login.

    Exemple: async def get_sensors(user = Depends(get_current_user)):
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invàlid o expirat. Torna a iniciar sessió.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = _decode_token(credentials.credentials)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(models.Usuari).filter(
        models.Usuari.ID_Usuari == int(user_id)
    ).first()

    if user is None:
        raise credentials_exception

    return user


async def require_admin(
    current_user: models.Usuari = Depends(get_current_user),
) -> models.Usuari:
    """
    Dependency que, a més de verificar el token, comprova que l'usuari
    sigui Admin. Si no, retorna 403 Forbidden.

    Exemple: async def get_all_users(admin = Depends(require_admin)):
    """
    if current_user.Rol != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accés restringit. Cal ser administrador.",
        )
    return current_user