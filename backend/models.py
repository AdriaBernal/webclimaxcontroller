from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Usuari(Base):
    """
    Representa la taula `usuari` de la base de dades.
    Un Usuari pot tenir molts Sensors (relació 1 a N).
    """
    __tablename__ = "usuari"

    ID_Usuari = Column(Integer, primary_key=True, index=True)
    Nom      = Column(String(50), nullable=True)
    Cognom   = Column(String(50), nullable=True)
    Usuari   = Column(String(50), unique=True, nullable=False)
    Password = Column(String(255), nullable=False)
    Rol      = Column(String(50), nullable=False)

    sensors = relationship("Sensor", back_populates="owner", cascade="all, delete-orphan")


class Sensor(Base):
    """
    Representa la taula `sensor`.
    Un Sensor pertany a un Usuari i pot tenir moltes Lectures (relació 1 a N).
    """
    __tablename__ = "sensor"

    ID_Sensor = Column(Integer, primary_key=True, index=True)
    ID_Usuari = Column(Integer, ForeignKey("usuari.ID_Usuari"), nullable=False)
    Latitud   = Column(Float, nullable=False)
    Longitud  = Column(Float, nullable=False)
    Nom       = Column(String(50), nullable=False)

    owner    = relationship("Usuari", back_populates="sensors")
    readings = relationship("Lectura", back_populates="sensor", cascade="all, delete-orphan")


class Lectura(Base):
    """
    Representa la taula `lectura`.
    Cada Lectura pertany a un Sensor i guarda les mesures meteorològiques
    en un moment concret (Data_Hora).

    Nota: la columna de la DB es diu `Pressió` (amb accent).
    SQLAlchemy permet mapear un nom de columna diferent del nom de l'atribut Python:
    Column("Pressió", Float)  →  en Python l'accedim com  lectura.Pressio
    """
    __tablename__ = "lectura"

    ID_Lectura  = Column(Integer, primary_key=True, index=True)
    ID_Sensor   = Column(Integer, ForeignKey("sensor.ID_Sensor"), nullable=False)
    Humitat     = Column(Float, nullable=False)
    Temperatura = Column(Float, nullable=False)
    Pressio     = Column("Pressió", Float, nullable=False)
    Data_Hora   = Column(DateTime, nullable=False)

    sensor = relationship("Sensor", back_populates="readings")
