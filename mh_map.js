Papa.parse("https://shinatodan.github.io/MHmap/mh_data.csv", {
  download: true,
  header: true,
  complete: function(results) {
    mhData = results.data;
    populateFilters(); // 初期フィルタセット
    updateMap();
  }
});

function getBranches(row) {
  return ["分岐00", "分岐01", "分岐02", "分岐03", "分岐04", "分岐05"]
    .map(k => row[k])
    .filter(v => v && v.trim() !== "");
}

function populateFilters() {
  const stationSet = new Set();
  mhData.forEach(item => stationSet.add(item["収容局"]));

  const stationSelect = document.getElementById('stationFilter');
  stationSelect.innerHTML = `<option value="">すべて</option>` + [...stationSet].map(s => `<option>${s}</option>`).join('');

  stationSelect.addEventListener('change', () => {
    updateCableFilter();
    updateBranchFilter();
    updateMap();
  });

  document.getElementById('cableFilter').addEventListener('change', () => {
    updateBranchFilter();
    updateMap();
  });

  document.getElementById('branchFilter').addEventListener('change', updateMap);

  updateCableFilter();
  updateBranchFilter();
}

function updateCableFilter() {
  const selectedStation = document.getElementById('stationFilter').value;
  const cableSet = new Set();

  mhData.forEach(row => {
    if (!selectedStation || row["収容局"] === selectedStation) {
      cableSet.add(row["ケーブル名"]);
    }
  });

  const cableSelect = document.getElementById('cableFilter');
  cableSelect.innerHTML = `<option value="">すべて</option>` + [...cableSet].map(c => `<option>${c}</option>`).join('');
}

function updateBranchFilter() {
  const selectedStation = document.getElementById('stationFilter').value;
  const selectedCable = document.getElementById('cableFilter').value;
  const branchSet = new Set();

  mhData.forEach(row => {
    const matchStation = !selectedStation || row["収容局"] === selectedStation;
    const matchCable = !selectedCable || row["ケーブル名"] === selectedCable;
    if (matchStation && matchCable) {
      getBranches(row).forEach(b => branchSet.add(b));
    }
  });

  const branchSelect = document.getElementById('branchFilter');
  branchSelect.innerHTML = `<option value="">すべて</option>` + [...branchSet].map(b => `<option>${b}</option>`).join('');
}

function updateMap() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const selectedStation = document.getElementById('stationFilter').value;
  const selectedCable = document.getElementById('cableFilter').value;
  const selectedBranch = document.getElementById('branchFilter').value;

  const filtered = mhData.filter(row =>
    (!selectedStation || row["収容局"] === selectedStation) &&
    (!selectedCable || row["ケーブル名"] === selectedCable) &&
    (!selectedBranch || getBranches(row).includes(selectedBranch))
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
