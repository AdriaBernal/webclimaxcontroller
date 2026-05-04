let chart;
let map;
let sensors = [];

// ─────────────────────────────────────────────
// SESSIÓ
// ─────────────────────────────────────────────

function verificarSessio() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!token || !user) {
    // TODO: Activar quan el backend estigui llest:
    // window.location.href = "login.html";
    // return null;

    // Usuari de prova mentre no hi ha backend
    return { nom: "Demo", rol: "Pagès" };
  }
  return user;
}

// ─────────────────────────────────────────────
// TOASTS (notificacions no bloquejants)
// ─────────────────────────────────────────────

function mostrarToast(missatge, tipus = "success") {
  const container = document.getElementById("toast-container");
  const bgClass = tipus === "error" ? "text-bg-danger" : "text-bg-success";

  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center ${bgClass} border-0`;
  toastEl.setAttribute("role", "alert");
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${missatge}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();
  // Eliminar del DOM quan s'amaga per no acumular elements
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

// ─────────────────────────────────────────────
// DETECCIÓ D'AIGUA (Nominatim)
// ─────────────────────────────────────────────

async function esAigua(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const response = await fetch(url, {
      headers: { "Accept-Language": "ca" },
    });
    const data = await response.json();

    // Si no retorna codi de país, estem al mar
    if (!data.address || !data.address.country_code) return true;

    // Tipus explícitament aquàtics
    const tipusAigua = ["bay", "strait", "ocean", "sea", "water", "river", "lake"];
    if (tipusAigua.includes(data.type)) return true;

    return false;
  } catch {
    // En cas d'error de xarxa, deixem crear el sensor (no bloquejem)
    return false;
  }
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
    </div>
  `;
}

function crearMarkerSensor(sensor) {
  const marker = L.marker([sensor.lat, sensor.lng]).addTo(map);
  marker.sensorData = sensor;
  marker.bindPopup(renderSensorPopup(sensor));

  marker.on("click", function () {
    actualitzarGrafica(this.sensorData);
  });

  marker.on("popupopen", function () {
    const popupEl = this.getPopup().getElement();
    const thisSensor = this.sensorData;
    const thisMarker = this;

    // ── Recollir lectures ──
    const collectBtn = popupEl.querySelector(".collect-btn");
    collectBtn.onclick = async () => {
      collectBtn.innerText = "Carregant...";
      collectBtn.disabled = true;
      try {
        await recollirLectures(thisSensor);
        mostrarToast("Lectures recollides correctament");
      } catch {
        mostrarToast("Error en recollir lectures", "error");
      } finally {
        collectBtn.innerText = "Recollir lectures";
        collectBtn.disabled = false;
      }
    };

    // ── Actualitzar nom ──
    const renameBtn = popupEl.querySelector(".rename-btn");
    renameBtn.onclick = () => {
      const nouNom = prompt("Nou nom pel sensor:", thisSensor.name);
      if (nouNom && nouNom.trim()) {
        thisSensor.name = nouNom.trim();
        // Actualitzem el contingut del popup amb el nou nom
        thisMarker.setPopupContent(renderSensorPopup(thisSensor));
        // TODO: PUT /api/sensors/{id} quan el backend estigui llest
        mostrarToast(`Sensor renombrat a "${thisSensor.name}"`);
      }
    };

    // ── Eliminar sensor ──
    const deleteBtn = popupEl.querySelector(".delete-btn");
    deleteBtn.onclick = () => {
      if (!confirm(`Segur que vols eliminar "${thisSensor.name}"?`)) return;

      map.removeLayer(thisMarker);
      sensors = sensors.filter((s) => s !== thisSensor);
      map.closePopup();

      // TODO: DELETE /api/sensors/{id} quan el backend estigui llest
      mostrarToast(`Sensor "${thisSensor.name}" eliminat`);

      // Netejem gràfica i taula si mostraven aquest sensor
      if (chart) {
        chart.destroy();
        chart = null;
      }
      document.querySelector("#sensor-table tbody").innerHTML = "";
      document.getElementById("chart-title").innerText = "Lectures del sensor";
    };
  });

  return marker;
}

// ─────────────────────────────────────────────
// GRÀFICA I TAULA
// ─────────────────────────────────────────────

function actualitzarGrafica(sensor) {
  if (sensor.readings.length === 0) {
    mostrarToast("Aquest sensor no té lectures. Fes clic a 'Recollir lectures'.", "error");
    return;
  }

  document.getElementById("chart-title").innerText = `Lectures: ${sensor.name}`;

  const labels = sensor.readings.map((r) => r.time);
  const temps  = sensor.readings.map((r) => r.temps);
  const hums   = sensor.readings.map((r) => r.hums);
  const press  = sensor.readings.map((r) => r.press);

  if (chart) chart.destroy();

  const ctx = document.getElementById("chart").getContext("2d");
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Temperatura (°C)", data: temps, borderColor: "#dc3545", backgroundColor: "transparent", tension: 0.3 },
        { label: "Humitat (%)",       data: hums,  borderColor: "#0d6efd", backgroundColor: "transparent", tension: 0.3 },
        { label: "Pressió (hPa)",     data: press, borderColor: "#198754", backgroundColor: "transparent", tension: 0.3 },
      ],
    },
    options: { responsive: true },
  });

  actualitzarTaula(sensor);
}

function actualitzarTaula(sensor) {
  const tbody = document.querySelector("#sensor-table tbody");
  tbody.innerHTML = "";

  sensor.readings.forEach((r) => {
    const row = document.createElement("tr");
    const tempClass  = r.temps < 15 || r.temps > 30   ? "text-danger" : "";
    const humClass   = r.hums  < 40 || r.hums  > 70   ? "text-danger" : "";
    const pressClass = r.press < 980 || r.press > 1030 ? "text-danger" : "";

    row.innerHTML = `
      <td>${r.time}</td>
      <td class="${tempClass}">${r.temps} °C</td>
      <td class="${humClass}">${r.hums} %</td>
      <td class="${pressClass}">${r.press} hPa</td>
    `;
    tbody.appendChild(row);
  });
}

// ─────────────────────────────────────────────
// API OPEN-METEO
// ─────────────────────────────────────────────

async function recollirLectures(sensor) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${sensor.lat}&longitude=${sensor.lng}&current=temperature_2m,relative_humidity_2m,surface_pressure`;
  const response = await fetch(url);

  // Si la resposta no és 2xx, llancem error perquè el catch del botó el gestioni
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  const current = data.current;

  sensor.readings.push({
    time: new Date().toLocaleTimeString().slice(0, 5),
    temps: current.temperature_2m,
    hums:  current.relative_humidity_2m,
    press: current.surface_pressure,
  });

  actualitzarGrafica(sensor);
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {

  // Verificar sessió i obtenir rol
  const user = verificarSessio();
  if (!user) return; // redirigit a login

  // Mostrar/ocultar seccions segons rol
  if (user.rol === "Admin") {
    document.getElementById("map-section").classList.add("d-none");
    document.getElementById("admin-panel").classList.remove("d-none");
  }

  // Inicialitzar mapa
  map = L.map("map").setView([41.4333, 1.7935], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  // TODO: Substituir per fetch("/api/sensors") quan el backend estigui llest
  sensors = [
    {
      name: "Sensor 1", lat: 41.4333, lng: 1.7935,
      readings: [
        { time: "10:00", temps: 20, hums: 60, press: 1012 },
        { time: "11:00", temps: 22, hums: 50, press: 1010 },
        { time: "12:00", temps: 21, hums: 70, press: 1008 },
      ],
    },
    {
      name: "Sensor 2", lat: 41.4445, lng: 1.7789,
      readings: [
        { time: "10:00", temps: 18, hums: 55, press: 1015 },
        { time: "11:00", temps: 20, hums: 50, press: 1010 },
        { time: "12:00", temps: 19, hums: 65, press: 1020 },
      ],
    },
    {
      name: "Sensor 3", lat: 41.4284, lng: 1.7688,
      readings: [
        { time: "10:00", temps: 22, hums: 60, press: 1012 },
        { time: "11:00", temps: 28, hums: 40, press: 1005 },
        { time: "12:00", temps: 35, hums: 30, press: 995  },
      ],
    },
  ];
  sensors.forEach(crearMarkerSensor);

  // Clic al mapa → crear sensor
  map.on("click", async function (e) {
    const { lat, lng } = e.latlng;

    if (existeixSensorAProp(lat, lng)) {
      mostrarToast("Ja existeix un sensor en aquesta ubicació", "error");
      return;
    }

    // Popup de "carregant" mentre consultem Nominatim
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

    // Popup de creació
    const popupContent = `
      <div>
        <strong>Crear sensor aquí</strong><br>
        <p>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}</p>
        <input type="text" id="sensor-name" placeholder="Nom del sensor" class="form-control my-2">
        <button id="create-sensor-btn" class="btn btn-primary btn-sm w-100">Crear sensor</button>
      </div>
    `;

    // openOn és síncron: el DOM del popup ja existeix a la línia següent
    L.popup().setLatLng([lat, lng]).setContent(popupContent).openOn(map);

    document.getElementById("create-sensor-btn").onclick = function () {
      const name = document.getElementById("sensor-name").value.trim();
      if (!name) {
        mostrarToast("Introdueix un nom pel sensor", "error");
        return;
      }

      const newSensor = { name, lat, lng, readings: [] };
      sensors.push(newSensor);
      crearMarkerSensor(newSensor);
      map.closePopup();

      // TODO: POST /api/sensors quan el backend estigui llest
      mostrarToast(`Sensor "${name}" creat correctament`);
    };
  });
});

function existeixSensorAProp(lat, lng, tolerancia = 0.0005) {
  return sensors.some(
    (s) => Math.abs(s.lat - lat) < tolerancia && Math.abs(s.lng - lng) < tolerancia,
  );
}