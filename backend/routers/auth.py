"""
routers/auth.py — Autenticació

Conté l'endpoint de login. Quan l'usuari entra l'usuari i la contrasenya:
  1. Busquem l'usuari a la BD per nom d'usuari
  2. Verifiquem la contrasenya amb bcrypt
  3. Si tot és correcte, generem un token JWT i el retornem
  4. El frontend guarda el token al localStorage i l'envia en cada petició
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import verify_password, create_access_token

router = APIRouter(
    prefix="/api/auth",
    tags=["Autenticació"],
)


@router.post(
    "/login",
    response_model=schemas.TokenResponse,
    summary="Iniciar sessió",
    description=(
        "Rep les credencials de l'usuari i retorna un token JWT. "
        "Inclou el token a la capçalera `Authorization: Bearer <token>` "
        "en totes les peticions posteriors."
    ),
)
def login(
    credentials: schemas.LoginRequest,
    db: Session = Depends(get_db),
):
    # Pas 1: buscar l'usuari a la BD per nom d'usuari
    user = db.query(models.Usuari).filter(
        models.Usuari.Usuari == credentials.usuari
    ).first()

    # Pas 2: verificar la contrasenya
    # Usem la mateixa resposta genèrica per no revelar si l'usuari existeix o no
    if not user or not verify_password(credentials.password, user.Password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuari o contrasenya incorrectes.",
        )

    # Pas 3: generar el token JWT
    token = create_access_token(user_id=user.ID_Usuari, rol=user.Rol)

    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        id=user.ID_Usuari,
        nom=user.Nom,
        cognom=user.Cognom,
        rol=user.Rol,
    )
