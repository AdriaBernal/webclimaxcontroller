"""
routers/sensors.py — Gestió de sensors (usuari autenticat)

Endpoints:
  GET    /api/sensors           → llista els sensors de l'usuari autenticat
  POST   /api/sensors           → crea un sensor nou (màxim 5 per usuari)
  PUT    /api/sensors/{id}      → reanomena un sensor (propietari)
  DELETE /api/sensors/{id}      → elimina un sensor (propietari)

Un usuari Pagès només veu i gestiona els SEUS sensors.
No pot veure ni tocar els sensors d'un altre usuari.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
from database import get_db
from security import get_current_user

MAX_SENSORS_PER_USER = 5

router = APIRouter(
    prefix="/api/sensors",
    tags=["Sensors"],
)


@router.get(
    "",
    response_model=List[schemas.SensorOut],
    summary="Llistar els sensors de l'usuari",
)
def get_my_sensors(
    db: Session = Depends(get_db),
    current_user: models.Usuari = Depends(get_current_user),
):
    sensors = db.query(models.Sensor).filter(
        models.Sensor.ID_Usuari == current_user.ID_Usuari
    ).all()
    return [_map_sensor(s) for s in sensors]


@router.post(
    "",
    response_model=schemas.SensorOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un sensor nou",
    description=f"Màxim {MAX_SENSORS_PER_USER} sensors per usuari.",
)
def create_sensor(
    data: schemas.SensorCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuari = Depends(get_current_user),
):
    # Comprovar el límit de sensors per usuari
    count = db.query(models.Sensor).filter(
        models.Sensor.ID_Usuari == current_user.ID_Usuari
    ).count()

    if count >= MAX_SENSORS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Has arribat al límit de {MAX_SENSORS_PER_USER} sensors.",
        )

    new_sensor = models.Sensor(
        ID_Usuari = current_user.ID_Usuari,
        Nom       = data.nom,
        Latitud   = data.lat,
        Longitud  = data.lng,
    )
    db.add(new_sensor)
    db.commit()
    db.refresh(new_sensor)
    return _map_sensor(new_sensor)


@router.put(
    "/{sensor_id}",
    response_model=schemas.SensorOut,
    summary="Actualitzar el nom d'un sensor",
)
def update_sensor(
    sensor_id: int,
    data: schemas.SensorUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuari = Depends(get_current_user),
):
    sensor = _get_own_sensor_or_404(db, sensor_id, current_user.ID_Usuari)
    sensor.Nom = data.nom
    db.commit()
    db.refresh(sensor)
    return _map_sensor(sensor)


@router.delete(
    "/{sensor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un sensor",
    description="Elimina el sensor i totes les seves lectures associades (cascade).",
)
def delete_sensor(
    sensor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuari = Depends(get_current_user),
):
    sensor = _get_own_sensor_or_404(db, sensor_id, current_user.ID_Usuari)
    db.delete(sensor)
    db.commit()


# ── Helpers privats ──────────────────────────────────────

def _get_own_sensor_or_404(
    db: Session, sensor_id: int, user_id: int
) -> models.Sensor:
    """
    Busca el sensor i comprova que pertanyi a l'usuari.
    Llança 404 si no existeix, 403 si no és el propietari.
    Això és important per seguretat: un usuari no pot eliminar sensors d'un altre.
    """
    sensor = db.query(models.Sensor).filter(
        models.Sensor.ID_Sensor == sensor_id
    ).first()

    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no trobat.")

    if sensor.ID_Usuari != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tens permís per modificar aquest sensor.",
        )

    return sensor


def _map_sensor(s: models.Sensor) -> schemas.SensorOut:
    return schemas.SensorOut(
        id      = s.ID_Sensor,
        nom     = s.Nom,
        lat     = float(s.Latitud),
        lng     = float(s.Longitud),
        user_id = s.ID_Usuari,
    )
