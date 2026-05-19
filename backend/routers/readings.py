"""
routers/readings.py — Lectures meteorològiques

Endpoints:
  GET    /api/sensors/{id}/readings   → obté totes les lectures d'un sensor
  POST   /api/sensors/{id}/readings   → guarda una lectura nova

Les lectures estan "niades" dins del sensor (nested resource).
Això és la manera REST correcta d'expressar la relació.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

import models
import schemas
from database import get_db
from security import get_current_user

router = APIRouter(
    prefix="/api/sensors",
    tags=["Lectures"],
)


@router.get(
    "/{sensor_id}/readings",
    response_model=List[schemas.LecturaOut],
    summary="Obtenir les lectures d'un sensor",
)
def get_readings(
    sensor_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuari = Depends(get_current_user),
):
    # Verificar que el sensor existeix i pertany a l'usuari
    _get_own_sensor_or_404(db, sensor_id, current_user.ID_Usuari)

    readings = db.query(models.Lectura).filter(
        models.Lectura.ID_Sensor == sensor_id
    ).order_by(models.Lectura.Data_Hora.asc()).all()

    return [_map_reading(r) for r in readings]


@router.post(
    "/{sensor_id}/readings",
    response_model=schemas.LecturaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Guardar una lectura nova",
    description=(
        "El frontend crida Open-Meteo, obté les dades i les envia aquí "
        "perquè quedin guardades a la base de dades. "
        "El servidor posa la Data_Hora automàticament."
    ),
)
def create_reading(
    sensor_id: int,
    data: schemas.LecturaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuari = Depends(get_current_user),
):
    # Verificar que el sensor existeix i pertany a l'usuari
    _get_own_sensor_or_404(db, sensor_id, current_user.ID_Usuari)

    new_reading = models.Lectura(
        ID_Sensor   = sensor_id,
        Temperatura = data.temperatura,
        Humitat     = data.humitat,
        Pressio     = data.pressio,
        Data_Hora   = datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(new_reading)
    db.commit()
    db.refresh(new_reading)
    return _map_reading(new_reading)


# ── Helpers privats ──────────────────────────────────────

def _get_own_sensor_or_404(
    db: Session, sensor_id: int, user_id: int
) -> models.Sensor:
    sensor = db.query(models.Sensor).filter(
        models.Sensor.ID_Sensor == sensor_id
    ).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor no trobat.")
    if sensor.ID_Usuari != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tens permís per accedir a aquest sensor.",
        )
    return sensor


def _map_reading(r: models.Lectura) -> schemas.LecturaOut:
    return schemas.LecturaOut(
        id          = r.ID_Lectura,
        sensor_id   = r.ID_Sensor,
        temperatura = r.Temperatura,
        humitat     = r.Humitat,
        pressio     = r.Pressio,
        data_hora   = r.Data_Hora,
    )
