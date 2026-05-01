let chart;
let map;
let sensors = [];

function generarRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function renderSensorPopup(sensor) {
  return `
    <div>
      <strong>${sensor.name}</strong><br>
      <p>Lat: ${sensor.lat.toFixed(4)}<br>Lng: ${sensor.lng.toFixed(4)}</p>
      <button class="btn btn-primary btn-sm w-100 mt-2 collect-btn">Recollir lectures</button>
    </div>
  `;
}

function crearMarkerSensor(sensor) {
  const marker = L.marker([sensor.lat, sensor.lng]).addTo(map);
  marker.sensorData = sensor;
  marker.bindPopup(renderSensorPopup(sensor));  // Sin parámetro mode

  marker.on("click", function () {
    actualitzarGrafica(this.sensorData);
  });

  marker.on("popupopen", function () {
    const btn = this.getPopup().getElement().querySelector(".collect-btn");
    if (btn) {
      btn.onclick = () => recollirLectures(this.sensorData);
    }
  });

  return marker;
}

function existeixSensorAProp(lat, lng, tolerancia = 0.0005) {
  return sensors.some(sensor =>
    Math.abs(sensor.lat - lat) < tolerancia &&
    Math.abs(sensor.lng - lng) < tolerancia
  );
}

function actualitzarGrafica(sensor) {
  const labels = sensor.readings.map(r => r.time);
  const temps = sensor.readings.map(r => r.temps);
  const hums = sensor.readings.map(r => r.hums);
  const press = sensor.readings.map(r => r.press);

  if (chart) chart.destroy();

  const ctx = document.getElementById("chart").getContext("2d");

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        { label: "Temperatura", data: temps },
        { label: "Humitat", data: hums },
        { label: "Pressió", data: press }
      ]
    }
  });

  actualitzarTaula(sensor);
}

function actualitzarTaula(sensor) {
  const tbody = document.querySelector("#sensor-table tbody");
  tbody.innerHTML = "";

  sensor.readings.forEach(r => {
    const row = document.createElement("tr");

    const tempClass = (r.temps < 15 || r.temps > 30) ? "text-danger" : "";
    const humClass = (r.hums < 40 || r.hums > 70) ? "text-danger" : "";
    const pressClass = (r.press < 980 || r.press > 1030) ? "text-danger" : "";

    row.innerHTML = `
      <td>${r.time}</td>
      <td class="${tempClass}">${r.temps}</td>
      <td class="${humClass}">${r.hums}</td>
      <td class="${pressClass}">${r.press}</td>
    `;

    tbody.appendChild(row);
  });
}

function recollirLectures(sensor) {
  const novaLectura = {
    time: new Date().toLocaleTimeString().slice(0, 5),
    temps: generarRandom(10, 40),
    hums: generarRandom(30, 80),
    press: generarRandom(970, 1040)
  };

  sensor.readings.push(novaLectura);
  actualitzarGrafica(sensor);
}

document.addEventListener("DOMContentLoaded", function () {
  map = L.map("map").setView([41.4333, 1.7935], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  sensors = [
    {
      name: "Sensor 1",
      lat: 41.4333,
      lng: 1.7935,
      readings: [
        { time: "10:00", temps: 20, hums: 60, press: 1012 },
        { time: "11:00", temps: 22, hums: 50, press: 1010 },
        { time: "12:00", temps: 21, hums: 70, press: 1008 },
      ],
    },
    {
      name: "Sensor 2",
      lat: 41.4445,
      lng: 1.7789,
      readings: [
        { time: "10:00", temps: 18, hums: 55, press: 1015 },
        { time: "11:00", temps: 20, hums: 50, press: 1010 },
        { time: "12:00", temps: 19, hums: 65, press: 1020 },
      ],
    },
    {
      name: "Sensor 3",
      lat: 41.4284,
      lng: 1.7688,
      readings: [
        { time: "10:00", temps: 22, hums: 60, press: 1012 },
        { time: "11:00", temps: 28, hums: 40, press: 1005 },
        { time: "12:00", temps: 35, hums: 30, press: 995 }
      ]
    },
  ];

  sensors.forEach((sensor) => {
    crearMarkerSensor(sensor);
  });

  map.on("click", function (e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    if (existeixSensorAProp(lat, lng)) {
      alert("Ja existeix un sensor en aquesta ubicació");
      return;
    }

    const popupContent = `
      <div>
        <strong>Crear sensor aquí</strong><br>
        <p>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}</p>
        <input type="text" id="sensor-name" placeholder="Nom del sensor" class="form-control my-2">
        <button id="create-sensor-btn" class="btn btn-primary btn-sm w-100">
          Crear sensor
        </button>
      </div>
    `;

    const popup = L.popup()
      .setLatLng([lat, lng])
      .setContent(popupContent)
      .openOn(map);

    setTimeout(() => {
      document.getElementById("create-sensor-btn").onclick = function () {
        const name = document.getElementById("sensor-name").value;

        if (!name) {
          alert("Introdueix un nom pel sensor");
          return;
        }

        const newSensor = {
          name: name,
          lat: lat,
          lng: lng,
          readings: []
        };

        sensors.push(newSensor);
        crearMarkerSensor(newSensor);
        map.closePopup();
      };
    }, 100);
  });
});