// 地図の初期化
let map = L.map('map').setView([37.9, 139.06], 13); // 新潟近辺
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let markers = [];
let mhData = [];

// CSV読み込み
Papa.parse("https://shinatodan.github.io/MHmap/mh_data.csv", {
  download: true,
  header: true,
  complete: function(results) {
    mhData = results.data;
    populateFilters(); // 初期フィルタ構築
    //updateMap();
  }
});

// 有効な分岐列を取得（"1"の列のみ）
function getAvailableBranches(row) {
  return ["分岐00", "分岐01", "分岐02", "分岐03", "分岐04", "分岐05"]
    .filter(k => row[k] === "1");
}

// フィルター初期化
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

// ケーブル名フィルターを更新
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

// 分岐フィルターを更新（"1" のみ対象）
function updateBranchFilter() {
  const selectedStation = document.getElementById('stationFilter').value;
  const selectedCable = document.getElementById('cableFilter').value;
  const branchSet = new Set();

  mhData.forEach(row => {
    if (
      (!selectedStation || row["収容局"] === selectedStation) &&
      (!selectedCable || row["ケーブル名"] === selectedCable)
    ) {
      getAvailableBranches(row).forEach(b => branchSet.add(b));
    }
  });

  const branchSelect = document.getElementById('branchFilter');
  branchSelect.innerHTML = `<option value="">すべて</option>` + [...branchSet].map(b => `<option>${b}</option>`).join('');
}

// 地図上の表示を更新
function updateMap() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const selectedStation = document.getElementById('stationFilter').value;
  const selectedCable = document.getElementById('cableFilter').value;
  const selectedBranch = document.getElementById('branchFilter').value;

  const filtered = mhData.filter(row =>
    (!selectedStation || row["収容局"] === selectedStation) &&
    (!selectedCable || row["ケーブル名"] === selectedCable) &&
    (!selectedBranch || row[selectedBranch] === "1")
  );

  filtered.forEach(row => {
    const lat = parseFloat(row["緯度"]);
    const lng = parseFloat(row["経度"]);
    if (!isNaN(lat) && !isNaN(lng)) {
      const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`<div style="line-height:1.4">
          <div style="font-weight:bold; font-size:1.2em;">${row["備考"]}</div>
          <div style="font-size:0.8em;">${row["収容局"]}</div>
          <div style="font-size:0.8em;">${row["ケーブル名"]}</div>
          <div style="margin-top:8px; font-size:0.85em;">
            <div><strong>Google mapリンク：</strong></div>
            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank">📍地図アプリで開く</a>
          </div>
          <div style="margin-top:5px; font-size:0.85em;">
            <div><strong>Google Earthリンク：</strong></div>
            <a href="https://earth.google.com/web/@${lat},${lng},100a,0d,35y,0h,0t,0r" target="_blank">🌍3Dビューで開く</a>
          </div>
        </div>`);
      markers.push(marker);
    }
  });
}


