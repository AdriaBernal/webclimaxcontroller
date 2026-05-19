"""
routers/users.py — Gestió d'usuaris (només Admin)

Endpoints:
  GET    /api/users           → llista tots els usuaris
  GET    /api/users/{id}      → obté un usuari concret
  POST   /api/users           → crea un usuari nou
  PUT    /api/users/{id}      → actualitza un usuari
  DELETE /api/users/{id}      → elimina un usuari

Tots els endpoints requereixen rol Admin (via Depends(require_admin)).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
from database import get_db
from security import require_admin, hash_password

router = APIRouter(
    prefix="/api/users",
    tags=["Usuaris (Admin)"],
)


@router.get(
    "",
    response_model=List[schemas.UsuariOut],
    summary="Llistar tots els usuaris",
)
def get_all_users(
    db: Session = Depends(get_db),
    _admin = Depends(require_admin),   # _ prefix = variable no usada, però la dependency s'executa
):
    users = db.query(models.Usuari).all()
    return [_map_user(u) for u in users]


@router.get(
    "/{user_id}",
    response_model=schemas.UsuariOut,
    summary="Obtenir un usuari per ID",
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin = Depends(require_admin),
):
    user = _get_or_404(db, user_id)
    return _map_user(user)


@router.post(
    "",
    response_model=schemas.UsuariOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un usuari nou",
)
def create_user(
    data: schemas.UsuariCreate,
    db: Session = Depends(get_db),
    _admin = Depends(require_admin),
):
    # Comprovar que el nom d'usuari no estigui ja en ús
    if db.query(models.Usuari).filter(models.Usuari.Usuari == data.usuari).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El nom d'usuari '{data.usuari}' ja existeix.",
        )

    new_user = models.Usuari(
        Nom      = data.nom,
        Cognom   = data.cognom,
        Usuari   = data.usuari,
        Password = hash_password(data.password),   # hash bcrypt, mai text pla
        Rol      = data.rol,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)   # recarrega l'objecte per obtenir l'ID generat
    return _map_user(new_user)


@router.put(
    "/{user_id}",
    response_model=schemas.UsuariOut,
    summary="Actualitzar un usuari",
)
def update_user(
    user_id: int,
    data: schemas.UsuariUpdate,
    db: Session = Depends(get_db),
    _admin = Depends(require_admin),
):
    user = _get_or_404(db, user_id)

    # Comprovar duplicat de nom d'usuari (si s'ha canviat)
    if data.usuari and data.usuari != user.Usuari:
        if db.query(models.Usuari).filter(models.Usuari.Usuari == data.usuari).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"El nom d'usuari '{data.usuari}' ja l'utilitza un altre usuari.",
            )

    # Actualitzem només els camps que han arribat (els None no es toquen)
    if data.nom      is not None: user.Nom      = data.nom
    if data.cognom   is not None: user.Cognom   = data.cognom
    if data.usuari   is not None: user.Usuari   = data.usuari
    if data.rol      is not None: user.Rol      = data.rol
    if data.password             : user.Password = hash_password(data.password)

    db.commit()
    db.refresh(user)
    return _map_user(user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un usuari",
    description="Elimina l'usuari i tots els seus sensors i lectures associades (cascade).",
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin = Depends(require_admin),
):
    user = _get_or_404(db, user_id)

    # Un admin no es pot eliminar a ell mateix
    if user.ID_Usuari == current_admin.ID_Usuari:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No et pots eliminar a tu mateix.",
        )

    db.delete(user)
    db.commit()
    # 204 No Content: no retornem res


# ── Helpers privats ──────────────────────────────────────

def _get_or_404(db: Session, user_id: int) -> models.Usuari:
    """Busca l'usuari o llança un 404 si no existeix."""
    user = db.query(models.Usuari).filter(models.Usuari.ID_Usuari == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuari no trobat.")
    return user


def _map_user(u: models.Usuari) -> schemas.UsuariOut:
    """Converteix un model SQLAlchemy a un schema Pydantic."""
    return schemas.UsuariOut(
        id     = u.ID_Usuari,
        nom    = u.Nom,
        cognom = u.Cognom,
        usuari = u.Usuari,
        rol    = u.Rol,
    )
