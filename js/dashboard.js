document.addEventListener("DOMContentLoaded", function () {
  const map = L.map("map").setView([41.3851, 2.1734], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  const sensors = [
    { name: "Sensor 1", lat: 41.3851, lng: 2.1734 },
    { name: "Sensor 2", lat: 41.39, lng: 2.17 },
    { name: "Sensor 3", lat: 41.38, lng: 2.18 },
  ];

  sensors.forEach((sensor) => {
    L.marker([sensor.lat, sensor.lng]).addTo(map).bindPopup(sensor.name);
  });

  map.on("click", function (e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

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

        L.marker([lat, lng]).addTo(map).bindPopup(name);

        map.closePopup();

        console.log("Sensor creat:", { name, lat, lng });
      };
    }, 100);
  });
});
