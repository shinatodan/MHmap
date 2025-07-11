// Firebaseの初期化（CDN方式）
const firebaseConfig = {
  apiKey: "AIzaSyCi7BqLPC7hmVlPCqyFPSDYhaHjscqW_h0",
  authDomain: "mhmap-app.firebaseapp.com",
  projectId: "mhmap-app",
  storageBucket: "mhmap-app.firebasestorage.app",
  messagingSenderId: "253694025628",
  appId: "1:253694025628:web:627587ef135bacf80ff259"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();


// モーダル操作用
const modal = document.getElementById('mhModal');
const closeModalBtn = document.getElementById('closeModal');
closeModalBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

// 現在選択中のMH ID
let currentMHId = null;


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
        .bindPopup(`
          <div style="line-height:1.4">
            <div style="font-weight:bold; font-size:1.2em;">${row["備考"]}</div>
            <div style="font-size:1.0em;">${row["収容局"]}</div>
            <div style="font-size:1.0em;">${row["ケーブル名"]}</div>
            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank">地図アプリで開く</a><br>
            <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}" target="_blank">ストリートビューで開く</a><br><br>
            <button onclick="openModal('${row["備考"]}')">詳細</button>
          </div>
        `);
        
      markers.push(marker);
    }
  });
}

function openModal(mhName) {
  currentMHId = mhName;
  document.getElementById('modalTitle').textContent = `${mhName} の詳細情報`;

  // 初期化
  document.getElementById('mhSize').value = "";
  document.getElementById('closureType').value = "";
  document.getElementById('pressureList').innerHTML = "";
  document.getElementById('failureList').innerHTML = "";

  // Firestoreから取得
  db.collection("mhDetails").doc(mhName).get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      document.getElementById('mhSize').value = data.size || "";
      document.getElementById('closureType').value = data.closure || "";

      if (data.pressure) {
        for (let date in data.pressure) {
          appendPressureItem(date, data.pressure[date]);
        }
      }

      if (data.failures) {
        for (let date in data.failures) {
          const f = data.failures[date];
          appendFailureItem(date, f.status, f.comment);
        }
      }
    }
    modal.style.display = 'block';
  });
}

function addPressure() {
  const date = document.getElementById('pressureDate').value;
  const val = document.getElementById('pressureValue').value;
  if (date && val) appendPressureItem(date, val);
}

function appendPressureItem(date, val) {
  const list = document.getElementById('pressureList');
  const div = document.createElement('div');
  div.textContent = `${date}: ${val}`;
  div.dataset.key = date;
  list.appendChild(div);
}

function addFailure() {
  const date = document.getElementById('failureDate').value;
  const status = document.getElementById('failureStatus').value;
  const comment = document.getElementById('failureComment').value;
  if (date && status) appendFailureItem(date, status, comment);
}

function appendFailureItem(date, status, comment) {
  const list = document.getElementById('failureList');
  const div = document.createElement('div');
  div.textContent = `${date}: [${status}] ${comment}`;
  div.dataset.key = date;
  list.appendChild(div);
}

function saveMHDetail() {
  const size = document.getElementById('mhSize').value;
  const closure = document.getElementById('closureType').value;

  const pressureList = document.getElementById('pressureList').children;
  const pressure = {};
  for (let item of pressureList) {
    const [date, val] = item.textContent.split(':').map(s => s.trim());
    pressure[date] = val;
  }

  const failureList = document.getElementById('failureList').children;
  const failures = {};
  for (let item of failureList) {
    const match = item.textContent.match(/^(\d{4}-\d{2}-\d{2}): \[(.*?)\] (.*)$/);
    if (match) {
      failures[match[1]] = {
        status: match[2],
        comment: match[3]
      };
    }
  }

  db.collection("mhDetails").doc(currentMHId).set({
    size, closure, pressure, failures
  }).then(() => {
    alert("保存しました");
    modal.style.display = 'none';
  });
}





