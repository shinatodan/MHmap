let map = L.map('map').setView([37.9, 139.06], 13); // 初期中心座標（新潟エリア）

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let markers = [];
let mhData = [];

Papa.parse("https://shinatodan.github.io/MHmap/mh_data.csv", {
  download: true,
  header: true,
  complete: function(results) {
    mhData = results.data;
    populateFilters();
    updateMap();
  }
});

function populateFilters() {
  const stationSet = new Set();
  const cableSet = new Set();

  mhData.forEach(item => {
    stationSet.add(item["収容局"]);
    cableSet.add(item["ケーブル名"]);
  });

  const stationSelect = document.getElementById('stationFilter');
  const cableSelect = document.getElementById('cableFilter');

  stationSelect.innerHTML = `<option value="">すべて</option>` + [...stationSet].map(s => `<option>${s}</option>`).join('');
  cableSelect.innerHTML = `<option value="">すべて</option>` + [...cableSet].map(c => `<option>${c}</option>`).join('');

  stationSelect.addEventListener('change', updateMap);
  cableSelect.addEventListener('change', updateMap);
}

function updateMap() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const selectedStation = document.getElementById('stationFilter').value;
  const selectedCable = document.getElementById('cableFilter').value;

  const filtered = mhData.filter(row =>
    (!selectedStation || row["収容局"] === selectedStation) &&
    (!selectedCable || row["ケーブル名"] === selectedCable)
  );

  filtered.forEach(row => {
    const lat = parseFloat(row["緯度"]);
    const lng = parseFloat(row["経度"]);
    if (!isNaN(lat) && !isNaN(lng)) {
      const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`<b>${row["収容局"]}</b><br>${row["ケーブル名"]}<br>${row["備考"]}`);
      markers.push(marker);
    }
  });
}
