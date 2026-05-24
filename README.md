# ClimaX Controller 🌱

Sistema de gestió de sensors meteorològics agrícoles desenvolupat com a projecte de síntesi de 2n de DAM.

---

## Descripció

ClimaX Controller és una plataforma web i mòbil per al monitoratge en temps real de les condicions ambientals en vinyes i entorns agrícoles. Permet als agricultors consultar les lectures de temperatura, humitat i pressió atmosfèrica dels seus sensors geolocalizats, i als administradors gestionar els usuaris de la plataforma.

---

## Estructura del projecte

```
webclimaxcontroller/
│
├── venv/                          ← Entorn virtual de Python (no modificar)
│
├── backend/                       ← API REST (FastAPI + Python)
│   ├── main.py                    ← Punt d'entrada de l'aplicació
│   ├── database.py                ← Connexió a MySQL via SQLAlchemy
│   ├── models.py                  ← Models de les taules de la BD
│   ├── schemas.py                 ← Validació de dades (Pydantic)
│   ├── security.py                ← Hashing bcrypt i tokens JWT
│   ├── hash_existing_passwords.py ← Script d'utilitat (executa una vegada)
│   ├── requirements.txt           ← Dependències Python
│   ├── .env                       ← Variables d'entorn (no pujar al repo)
│   └── routers/
│       ├── __init__.py
│       ├── auth.py                ← POST /api/auth/login
│       ├── users.py               ← CRUD usuaris (Admin)
│       ├── sensors.py             ← CRUD sensors (Pagès)
│       └── readings.py            ← CRUD lectures
│
├── frontend/                      ← Interfície web (HTML + CSS + JS)
│   ├── index.html                 ← Pàgina principal
│   ├── login.html                 ← Formulari d'inici de sessió
│   ├── dashboard.html             ← Mapa de sensors i gràfiques
│   ├── manageusers.html           ← Gestió d'usuaris (Admin)
│   ├── documentation.html         ← Documentació divulgativa
│   ├── bootstrap/                 ← Bootstrap 5 local
│   └── js/
│       ├── session.js             ← Gestió de sessió (totes les pàgines)
│       ├── login.js               ← Lògica del formulari de login
│       ├── dashboard.js           ← Mapa, gràfiques i lectures
│       └── manageusers.js         ← CRUD d'usuaris des del frontend
│
└── android/                       ← Aplicació Android (Java)
    ├── LoginActivity.java
    ├── DashboardActivity.java
    ├── UserSelectActivity.java
    └── res/
        ├── layout/
        │   ├── activity_login.xml
        │   ├── activity_dashboard.xml
        │   └── activity_user_select.xml
        └── menu/
            └── menu_main.xml
```

---

## Stack tecnològic

| Capa | Tecnologia |
|------|-----------|
| Frontend web | HTML5, Bootstrap 5, JavaScript |
| Mapes | Leaflet.js + OpenStreetMap |
| Gràfiques | Chart.js |
| Dades meteorològiques | Open-Meteo API (gratuïta, sense API key) |
| Geocodificació | Nominatim (OpenStreetMap) |
| Backend | FastAPI (Python) |
| Base de dades | MySQL |
| ORM | SQLAlchemy |
| Autenticació | JWT (python-jose) + bcrypt (passlib) |
| App mòbil | Android (Java) + Google Maps SDK |

---

## Base de dades

Esquema MySQL (`proj_intermodular`):

```sql
usuari (ID_Usuari, Nom, Cognom, Usuari, Password, Rol)
    │
    └──< sensor (ID_Sensor, ID_Usuari, Nom, Latitud, Longitud)
              │
              └──< lectura (ID_Lectura, ID_Sensor, Humitat, Temperatura, Pressió, Data_Hora)
```

**Rols disponibles:** `Admin`, `Pagès`

---

## API REST — Endpoints

### Autenticació
| Mètode | Endpoint | Descripció |
|--------|----------|-----------|
| POST | `/api/auth/login` | Iniciar sessió → retorna JWT |

### Usuaris (requereix rol Admin)
| Mètode | Endpoint | Descripció |
|--------|----------|-----------|
| GET | `/api/users` | Llistar tots els usuaris |
| GET | `/api/users/{id}` | Obtenir un usuari per ID |
| POST | `/api/users` | Crear usuari nou |
| PUT | `/api/users/{id}` | Actualitzar usuari |
| DELETE | `/api/users/{id}` | Eliminar usuari |

### Sensors (requereix autenticació)
| Mètode | Endpoint | Descripció |
|--------|----------|-----------|
| GET | `/api/sensors` | Llistar sensors de l'usuari |
| POST | `/api/sensors` | Crear sensor nou |
| PUT | `/api/sensors/{id}` | Actualitzar nom del sensor |
| DELETE | `/api/sensors/{id}` | Eliminar sensor |

### Lectures (requereix autenticació)
| Mètode | Endpoint | Descripció |
|--------|----------|-----------|
| GET | `/api/sensors/{id}/readings` | Obtenir lectures d'un sensor |
| POST | `/api/sensors/{id}/readings` | Guardar nova lectura |

La documentació interactiva completa (Swagger UI) és accessible a `http://localhost:8000/docs` amb el backend en marxa.

---

## Posada en marxa

### Prerequisits

- Python 3.13+
- MySQL 8.0+
- Node.js no necessari (Bootstrap és local)
- VS Code amb extensió Live Server

### 1. Clonar i preparar l'entorn

```bash
# Crear l'entorn virtual
python -m venv venv

# Activar-lo (Windows)
venv\Scripts\activate

# Activar-lo (Linux/Mac)
source venv/bin/activate
```

### 2. Instal·lar dependències

```bash
cd backend
pip install -r requirements.txt
```

### 3. Configurar la base de dades

Crea la base de dades a MySQL i importa l'esquema. Edita el fitxer `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=la_teva_password
DB_NAME=proj_intermodular
SECRET_KEY=genera_una_clau_amb_el_comandament_de_sota
```

Per generar una `SECRET_KEY` segura:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Fer el hash de les passwords existents

> ⚠️ Executa aquest script **una sola vegada** després d'importar les dades de prova. Converteix les passwords en text pla a hash bcrypt.

```bash
python hash_existing_passwords.py
```

### 5. Arrencar el backend

```bash
# Des de la carpeta backend/
uvicorn main:app --reload --port 8000
```

El backend quedarà accessible a `http://localhost:8000`.

### 6. Obrir el frontend

Obre `frontend/index.html` amb Live Server de VS Code (clic dret → "Open with Live Server"). S'obrirà a `http://127.0.0.1:5500`.

> **Important:** No obris el frontend com a `file://` directament, ja que el navegador pot bloquejar les peticions fetch per restriccions de seguretat.

---

## Usuaris de prova

| Usuari | Contrasenya | Rol |
|--------|-------------|-----|
| jherrero | jherrero | Admin |
| cmoreno | cmoreno | Pagès |
| ffernandez | ffernandez | Pagès |

---

## Funcionalitats per rol

### Pagès
- Visualitzar sensors propis al mapa interactiu
- Crear sensors fent clic al mapa (amb validació per evitar ubicacions al mar)
- Recollir lectures meteorològiques en temps real via Open-Meteo
- Visualitzar les lectures en dues gràfiques separades (temperatura/humitat i pressió)
- Consultar l'historial de lectures en una taula amb alertes visuals per valors anòmals
- Actualitzar el nom i eliminar sensors

### Admin
- Accés al panell de gestió d'usuaris
- Crear, actualitzar i eliminar usuaris
- No té accés al dashboard de sensors

---

## Aplicació Android

L'app Android permet als agricultors consultar les lectures dels seus sensors directament des del camp. Les funcionalitats principals són:

- **Login** amb les mateixes credencials que la web
- **Dashboard** amb mapa Google Maps i taula de lectures per sensor
- **Selecció de pagès** (només per a admins): permet a l'administrador veure les lectures de qualsevol pagès

La comunicació amb el backend es fa via la mateixa API REST. En l'emulador, la direcció del servidor local és `http://10.0.2.2:8000`.

---

## Notes de seguretat

- Les contrasenyes es guarden com a hash bcrypt, mai en text pla
- L'autenticació es basa en tokens JWT amb expiració d'1 hora
- Cada usuari només pot accedir als seus propis sensors (verificació al backend)
- El fitxer `.env` no s'ha de pujar mai al repositori (afegir al `.gitignore`)

---

## Autors

Projecte de síntesi · 2n DAM · Curs 2025-2026