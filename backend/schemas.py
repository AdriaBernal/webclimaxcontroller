"""
schemas.py — Models de dades per a FastAPI (Pydantic)

Pydantic valida automàticament que les dades que arriben i surten
de l'API tinguin el format correcte. Si no, retorna un error 422.

Separació de responsabilitats:
  - Models "Base"   → camps comuns
  - Models "Create" → allò que envia el client per crear un recurs
  - Models "Update" → allò que envia el client per modificar un recurs
  - Models "Out"    → allò que retorna l'API al client (mai la password!)
"""
from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional


# ──────────────────────────────────────────────────────────
# AUTH
# ──────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Dades que envia el formulari de login."""
    usuari: str
    password: str


class TokenResponse(BaseModel):
    """Resposta del servidor després d'un login correcte."""
    access_token: str
    token_type: str = "bearer"
    id: int
    nom: str
    cognom: Optional[str]
    rol: str


# ──────────────────────────────────────────────────────────
# USUARI
# ──────────────────────────────────────────────────────────

class UsuariBase(BaseModel):
    nom: Optional[str] = None
    cognom: Optional[str] = None
    usuari: str
    rol: str

    @field_validator("rol")
    @classmethod
    def rol_valid(cls, v):
        if v not in ("Admin", "Pagès"):
            raise ValueError("El rol ha de ser 'Admin' o 'Pagès'")
        return v


class UsuariCreate(UsuariBase):
    """Per crear un usuari nou (inclou la password en text pla)."""
    password: str


class UsuariUpdate(BaseModel):
    """Per actualitzar un usuari. Tots els camps són opcionals."""
    nom: Optional[str] = None
    cognom: Optional[str] = None
    usuari: Optional[str] = None
    password: Optional[str] = None
    rol: Optional[str] = None

    @field_validator("rol")
    @classmethod
    def rol_valid(cls, v):
        if v is not None and v not in ("Admin", "Pagès"):
            raise ValueError("El rol ha de ser 'Admin' o 'Pagès'")
        return v


class UsuariOut(BaseModel):
    """El que retorna l'API: mai inclou la password."""
    id: int
    nom: Optional[str]
    cognom: Optional[str]
    usuari: str
    rol: str

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────
# SENSOR
# ──────────────────────────────────────────────────────────

class SensorCreate(BaseModel):
    nom: str
    lat: float
    lng: float


class SensorUpdate(BaseModel):
    nom: str


class SensorOut(BaseModel):
    id: int
    nom: str
    lat: float
    lng: float
    user_id: int

    model_config = {"from_attributes": True}


# ──────────────────────────────────────────────────────────
# LECTURA
# ──────────────────────────────────────────────────────────

class LecturaCreate(BaseModel):
    temperatura: float
    humitat: float
    pressio: float


class LecturaOut(BaseModel):
    id: int
    sensor_id: int
    temperatura: float
    humitat: float
    pressio: float
    data_hora: datetime

    model_config = {"from_attributes": True}
