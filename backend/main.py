"""
main.py — Punt d'entrada de l'aplicació FastAPI

Aquí és on:
  1. Creem l'aplicació FastAPI amb tota la configuració
  2. Configurem CORS perquè el frontend pugui parlar amb el backend
  3. Registrem tots els routers (auth, users, sensors, readings)
  4. Definim un endpoint de health check
  5. Exposem la documentació Swagger

Per arrancar el servidor:
  uvicorn main:app --reload --port 8000

  --reload  → reinicia automàticament quan canvies el codi (molt útil en dev)
  --port    → el port on escoltarà (per defecte 8000)

Documentació interactiva disponible a:
  http://localhost:8000/docs      (Swagger UI)
  http://localhost:8000/redoc     (ReDoc)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, users, sensors, readings

# ── Crear l'aplicació ────────────────────────────────────
app = FastAPI(
    title="ClimaX Controller API",
    description=(
        "API REST per a la gestió de sensors meteorològics agrícoles. \n\n"
        "**Flux de login:**\n"
        "1. Fes `POST /api/auth/login` amb les teves credencials\n"
        "2. Copia el `access_token` de la resposta\n"
        "3. Clica el botó **Authorize** 🔒 aquí dalt i enganxa el token\n"
        "4. Ara pots provar tots els endpoints protegits!"
    ),
    version="1.0.0",
    contact={
        "name": "ClimaX Controller",
        "email": "climax@example.com",
    },
    license_info={
        "name": "Projecte de final de curs",
    },
)

# ── CORS (Cross-Origin Resource Sharing) ─────────────────
# El navegador, per seguretat, bloqueja les peticions entre dominis/ports
# diferents. Com que el frontend (ex: port 5500) i el backend (port 8000)
# estan en ports distints, necessitem dir-li al backend quins orígens
# estan permesos.
#
# En desenvolupament permetem tots els orígens ("*").
# En producció caldria restringir-ho al domini real del frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # En producció: ["https://el-teu-domini.com"]
    allow_credentials=True,
    allow_methods=["*"],        # GET, POST, PUT, DELETE...
    allow_headers=["*"],        # Authorization, Content-Type...
)

# ── Registrar routers ────────────────────────────────────
# Cada router és com un "mòdul" que gestiona un grup d'endpoints.
# En registrar-los aquí els unim tots a l'aplicació principal.
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(sensors.router)
app.include_router(readings.router)

# ── Health check ─────────────────────────────────────────
@app.get("/", tags=["General"], summary="Health check")
def root():
    """
    Comprova que l'API és viva i accessible.
    Útil per a monitoratge o simplement per confirmar que el servidor arrenca.
    """
    return {"status": "ok", "message": "ClimaX Controller API funcionant 🌱"}
