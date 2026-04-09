document.addEventListener("DOMContentLoaded", function () {

  const map = L.map('map').setView([41.3851, 2.1734], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  // Sensores simulados
  const sensors = [
    { name: "Sensor 1", lat: 41.3851, lng: 2.1734 },
    { name: "Sensor 2", lat: 41.39, lng: 2.17 },
    { name: "Sensor 3", lat: 41.38, lng: 2.18 }
  ];

  sensors.forEach(sensor => {
    L.marker([sensor.lat, sensor.lng])
      .addTo(map)
      .bindPopup(sensor.name);
  });

});