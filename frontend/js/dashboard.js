// ─────────────────────────────────────────────
// dashboard.js — Lògica principal del dashboard
//
// Connectat al backend real:
//   - GET  /api/sensors              → carrega els sensors de l'usuari
//   - POST /api/sensors              → crea un sensor nou
//   - PUT  /api/sensors/{id}         → reanomena un sensor
//   - DELETE /api/sensors/{id}       → elimina un sensor
//   - GET  /api/sensors/{id}/readings → carrega les lectures d'un sensor
//   - POST /api/sensors/{id}/readings → guarda una lectura nova
// ─────────────────────────────────────────────

const API_BASE = "http://localhost:8000";

let chartMeteo;
let chartPressure;
let map;
// Mapa en memòria: sensor_id → { apiData, marker, readings[] }
let sensorsMap = {};

// ─────────────────────────────────────────────
// HELPERS D'AUTENTICACIÓ
// ─────────────────────────────────────────────

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  });

  if (response.status === 401) {
    // Token expirat o invàlid → tornem al login
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
    return null;
  }

  return response;
}

// ─────────────────────────────────────────────
// SESSIÓ
// ─────────────────────────────────────────────

function verificarSessio() {
  const token = localStorage.getItem("token");
  const user  = JSON.parse(localStorage.getItem("user") || "null");
  if (!token || !user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

// ─────────────────────────────────────────────
// TOASTS (notificacions no bloquejants)
// ─────────────────────────────────────────────

function mostrarToast(missatge, tipus = "success") {
  const container = document.getElementById("toast-container");
  const bgClass   = tipus === "error" ? "text-bg-danger" : "text-bg-success";
  const toastEl   = document.createElement("div");
  toastEl.className = `toast align-items-center ${bgClass} border-0`;
  toastEl.setAttribute("role", "alert");
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${missatge}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>`;
  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

// ─────────────────────────────────────────────
// DETECCIÓ D'AIGUA (Nominatim)
// ─────────────────────────────────────────────

async function esAigua(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const response = await fetch(url, { headers: { "Accept-Language": "ca" } });
    const data     = await response.json();
    if (!data.address || !data.address.country_code) return true;
    const tipusAigua = ["bay", "strait", "ocean", "sea", "water", "river", "lake"];
    if (tipusAigua.includes(data.type)) return true;
    return false;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// CARREGAR SENSORS DES DE L'API
// ─────────────────────────────────────────────

async function carregarSensors() {
  const res = await apiFetch("/api/sensors");
  if (!res || !res.ok) {
    mostrarToast("Error en carregar els sensors", "error");
    return;
  }
  const sensors = await res.json();

  // Per cada sensor de l'API, creem el marcador al mapa
  sensors.forEach((s) => {
    const sensorLocal = {
      id:       s.id,
      name:     s.nom,
      lat:      s.lat,
      lng:      s.lng,
      readings: [],   // les carreguem quan l'usuari fa clic al sensor
    };
    sensorsMap[s.id] = sensorLocal;
    crearMarkerSensor(sensorLocal);
  });
}

// ─────────────────────────────────────────────
// POPUP DEL SENSOR
// ─────────────────────────────────────────────

function renderSensorPopup(sensor) {
  return `
    <div>
      <strong>${sensor.name}</strong><br>
      <p class="mb-1">Lat: ${sensor.lat.toFixed(4)}<br>Lng: ${sensor.lng.toFixed(4)}</p>
      <button class="btn btn-primary btn-sm w-100 mt-2 collect-btn">Recollir lectures</button>
      <button class="btn btn-warning btn-sm w-100 mt-1 rename-btn">Actualitzar nom</button>
      <button class="btn btn-danger btn-sm w-100 mt-1 delete-btn">Eliminar sensor</button>
    </div>`;
}

function crearMarkerSensor(sensor) {
  const marker = L.marker([sensor.lat, sensor.lng]).addTo(map);
  marker.sensorData = sensor;
  marker.bindPopup(renderSensorPopup(sensor));

  // En fer clic al marcador, carreguem les lectures si no les tenim ja
  marker.on("click", async function () {
    if (this.sensorData.readings.length === 0) {
      await carregarLectures(this.sensorData);
    }
    actualitzarGrafica(this.sensorData);
  });

  marker.on("popupopen", function () {
    const popupEl     = this.getPopup().getElement();
    const thisSensor  = this.sensorData;
    const thisMarker  = this;

    // ── Recollir lectures (Open-Meteo → BD) ──
    const collectBtn = popupEl.querySelector(".collect-btn");
    collectBtn.onclick = async () => {
      collectBtn.innerText  = "Carregant...";
      collectBtn.disabled   = true;
      try {
        await recollirIGuardarLectura(thisSensor);
        mostrarToast("Lectura recollida i guardada correctament");
      } catch (err) {
        mostrarToast("Error en recollir la lectura", "error");
        console.error(err);
      } finally {
        collectBtn.innerText = "Recollir lectures";
        collectBtn.disabled  = false;
      }
    };

    // ── Actualitzar nom ──
    const renameBtn = popupEl.querySelector(".rename-btn");
    renameBtn.onclick = async () => {
      const nouNom = prompt("Nou nom pel sensor:", thisSensor.name);
      if (!nouNom || !nouNom.trim()) return;

      const res = await apiFetch(`/api/sensors/${thisSensor.id}`, {
        method: "PUT",
        body:   JSON.stringify({ nom: nouNom.trim() }),
      });

      if (res && res.ok) {
        thisSensor.name = nouNom.trim();
        thisMarker.setPopupContent(renderSensorPopup(thisSensor));
        mostrarToast(`Sensor renombrat a "${thisSensor.name}"`);
      } else {
        mostrarToast("Error en reanomenar el sensor", "error");
      }
    };

    // ── Eliminar sensor ──
    const deleteBtn = popupEl.querySelector(".delete-btn");
    deleteBtn.onclick = async () => {
      if (!confirm(`Segur que vols eliminar "${thisSensor.name}"?`)) return;

      const res = await apiFetch(`/api/sensors/${thisSensor.id}`, {
        method: "DELETE",
      });

      if (res && res.status === 204) {
        map.removeLayer(thisMarker);
        delete sensorsMap[thisSensor.id];
        map.closePopup();
        mostrarToast(`Sensor "${thisSensor.name}" eliminat`);

        // Netejem gràfiques i taula
        if (chartMeteo)    { chartMeteo.destroy();    chartMeteo    = null; }
        if (chartPressure) { chartPressure.destroy();  chartPressure = null; }
        document.querySelector("#sensor-table tbody").innerHTML = "";
        document.getElementById("chart-meteo-title").innerText    = "Temperatura i Humitat";
        document.getElementById("chart-pressure-title").innerText = "Pressió atmosfèrica";
      } else {
        mostrarToast("Error en eliminar el sensor", "error");
      }
    };
  });

  return marker;
}

// ─────────────────────────────────────────────
// CARREGAR LECTURES D'UN SENSOR DES DE L'API
// ─────────────────────────────────────────────

async function carregarLectures(sensor) {
  const res = await apiFetch(`/api/sensors/${sensor.id}/readings`);
  if (!res || !res.ok) return;

  const lectures = await res.json();
  // Convertim el format de l'API al format intern del JS
  sensor.readings = lectures.map((l) => ({
    time:  new Date(l.data_hora).toLocaleTimeString("ca", { hour: "2-digit", minute: "2-digit" }),
    temps: l.temperatura,
    hums:  l.humitat,
    press: l.pressio,
  }));
}

// ─────────────────────────────────────────────
// RECOLLIR DADES DE OPEN-METEO I GUARDAR A LA BD
// ─────────────────────────────────────────────

async function recollirIGuardarLectura(sensor) {
  // Pas 1: cridem Open-Meteo amb les coordenades del sensor
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${sensor.lat}&longitude=${sensor.lng}&current=temperature_2m,relative_humidity_2m,surface_pressure`;
  const meteoRes = await fetch(url);
  if (!meteoRes.ok) throw new Error(`Open-Meteo HTTP ${meteoRes.status}`);
  const meteoData = await meteoRes.json();
  const current   = meteoData.current;

  // Pas 2: enviem la lectura al backend per guardar-la a la BD
  const saveRes = await apiFetch(`/api/sensors/${sensor.id}/readings`, {
    method: "POST",
    body:   JSON.stringify({
      temperatura: current.temperature_2m,
      humitat:     current.relative_humidity_2m,
      pressio:     current.surface_pressure,
    }),
  });

  if (!saveRes || !saveRes.ok) {
    throw new Error("Error en guardar la lectura al backend");
  }

  // Pas 3: afegim la lectura a la memòria local i actualitzem la UI
  sensor.readings.push({
    time:  new Date().toLocaleTimeString("ca", { hour: "2-digit", minute: "2-digit" }),
    temps: current.temperature_2m,
    hums:  current.relative_humidity_2m,
    press: current.surface_pressure,
  });

  actualitzarGrafica(sensor);
}

// ─────────────────────────────────────────────
// GRÀFICA I TAULA
// ─────────────────────────────────────────────

function actualitzarGrafica(sensor) {
  if (sensor.readings.length === 0) {
    mostrarToast("Aquest sensor no té lectures. Fes clic a 'Recollir lectures'.", "error");
    return;
  }

  document.getElementById("chart-meteo-title").innerText    = `Temp. i Humitat – ${sensor.name}`;
  document.getElementById("chart-pressure-title").innerText = `Pressió – ${sensor.name}`;

  const labels = sensor.readings.map((r) => r.time);
  const temps  = sensor.readings.map((r) => r.temps);
  const hums   = sensor.readings.map((r) => r.hums);
  const press  = sensor.readings.map((r) => r.press);

  if (chartMeteo)    chartMeteo.destroy();
  if (chartPressure) chartPressure.destroy();

  chartMeteo = new Chart(
    document.getElementById("chart-meteo").getContext("2d"),
    {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Temperatura (°C)", data: temps, borderColor: "#dc3545", backgroundColor: "transparent", tension: 0.3 },
          { label: "Humitat (%)",       data: hums,  borderColor: "#0d6efd", backgroundColor: "transparent", tension: 0.3 },
        ],
      },
      options: { responsive: true, plugins: { legend: { position: "bottom" } } },
    }
  );

  chartPressure = new Chart(
    document.getElementById("chart-pressure").getContext("2d"),
    {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Pressió (hPa)", data: press, borderColor: "#198754", backgroundColor: "rgba(25,135,84,0.08)", tension: 0.3, fill: true },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: "bottom" } },
        scales: { y: { suggestedMin: Math.min(...press) - 5, suggestedMax: Math.max(...press) + 5 } },
      },
    }
  );

  actualitzarTaula(sensor);
}

function actualitzarTaula(sensor) {
  const tbody = document.querySelector("#sensor-table tbody");
  tbody.innerHTML = "";
  sensor.readings.forEach((r) => {
    const row       = document.createElement("tr");
    const tempClass = r.temps < 15 || r.temps > 30 ? "text-danger" : "";
    const humClass  = r.hums  < 40 || r.hums  > 70 ? "text-danger" : "";
    const pressClass= r.press < 980|| r.press > 1030? "text-danger" : "";
    row.innerHTML = `
      <td>${r.time}</td>
      <td class="${tempClass}">${r.temps} °C</td>
      <td class="${humClass}">${r.hums} %</td>
      <td class="${pressClass}">${r.press} hPa</td>`;
    tbody.appendChild(row);
  });
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async function () {
  const user = verificarSessio();
  if (!user) return;

  // Inicialitzar mapa
  map = L.map("map").setView([41.4333, 1.7935], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);

  // Carregar sensors reals des de l'API
  await carregarSensors();

  // Clic al mapa → crear sensor nou
  map.on("click", async function (e) {
    const { lat, lng } = e.latlng;

    if (existeixSensorAProp(lat, lng)) {
      mostrarToast("Ja existeix un sensor en aquesta ubicació", "error");
      return;
    }

    const loadingPopup = L.popup()
      .setLatLng([lat, lng])
      .setContent('<div class="p-2">Comprovant ubicació...</div>')
      .openOn(map);

    const aigua = await esAigua(lat, lng);
    map.closePopup();

    if (aigua) {
      mostrarToast("No es pot col·locar un sensor al mar o al mig de l'aigua", "error");
      return;
    }

    // Comptem quants sensors té l'usuari per mostrar advertència si s'acosta al límit
    const numSensors = Object.keys(sensorsMap).length;
    if (numSensors >= 5) {
      mostrarToast("Has arribat al límit de 5 sensors", "error");
      return;
    }

    const popupContent = `
      <div>
        <strong>Crear sensor aquí</strong><br>
        <p>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}</p>
        <input type="text" id="sensor-name" placeholder="Nom del sensor" class="form-control my-2">
        <button id="create-sensor-btn" class="btn btn-primary btn-sm w-100">Crear sensor</button>
      </div>`;

    L.popup().setLatLng([lat, lng]).setContent(popupContent).openOn(map);

    document.getElementById("create-sensor-btn").onclick = async function () {
      const name = document.getElementById("sensor-name").value.trim();
      if (!name) {
        mostrarToast("Introdueix un nom pel sensor", "error");
        return;
      }

      const res = await apiFetch("/api/sensors", {
        method: "POST",
        body:   JSON.stringify({ nom: name, lat, lng }),
      });

      if (!res || !res.ok) {
        const err = await res?.json().catch(() => ({}));
        mostrarToast(err.detail || "Error en crear el sensor", "error");
        return;
      }

      const newSensor = await res.json();
      const sensorLocal = { id: newSensor.id, name: newSensor.nom, lat: newSensor.lat, lng: newSensor.lng, readings: [] };
      sensorsMap[newSensor.id] = sensorLocal;
      crearMarkerSensor(sensorLocal);
      map.closePopup();
      mostrarToast(`Sensor "${name}" creat correctament`);
    };
  });
});

function existeixSensorAProp(lat, lng, tolerancia = 0.0005) {
  return Object.values(sensorsMap).some(
    (s) => Math.abs(s.lat - lat) < tolerancia && Math.abs(s.lng - lng) < tolerancia
  );
}
