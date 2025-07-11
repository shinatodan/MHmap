// Firebase初期化
const firebaseConfig = {
  apiKey: "AIzaSyCi7BqLPC7hmVlPCqyFPSDYhaHjscqW_h0",
  authDomain: "mhmap-app.firebaseapp.com",
  projectId: "mhmap-app",
  storageBucket: "mhmap-app.appspot.com",
  messagingSenderId: "253694025628",
  appId: "1:253694025628:web:627587ef135bacf80ff259"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// モーダル要素
const modal = document.getElementById('mhModal');
const closeModalBtn = document.getElementById('closeModal');
closeModalBtn.onclick = () => modal.style.display = 'none';
window.onclick = e => { if (e.target === modal) modal.style.display = 'none'; };

let currentMHId = null;
let isEditMode = false;

let map = L.map('map').setView([37.9, 139.06], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let markers = [];
let mhData = [];

Papa.parse("https://shinatodan.github.io/MHmap/mh_data.csv", {
  download: true,
  header: true,
  complete: results => {
    mhData = results.data;
    populateFilters();
  }
});

function getAvailableBranches(row) {
  return ["分岐00", "分岐01", "分岐02", "分岐03", "分岐04", "分岐05"]
    .filter(k => row[k] === "1");
}

function populateFilters() {
  const stationSet = new Set(mhData.map(d => d["収容局"]));
  const stationSelect = document.getElementById('stationFilter');
  stationSelect.innerHTML = `<option value="">すべて</option>` + [...stationSet].map(s => `<option>${s}</option>`).join('');
  stationSelect.addEventListener('change', () => { updateCableFilter(); updateBranchFilter(); updateMap(); });
  document.getElementById('cableFilter').addEventListener('change', () => { updateBranchFilter(); updateMap(); });
  document.getElementById('branchFilter').addEventListener('change', updateMap);
  updateCableFilter();
  updateBranchFilter();
}

function updateCableFilter() {
  const station = document.getElementById('stationFilter').value;
  const cableSet = new Set();
  mhData.forEach(row => {
    if (!station || row["収容局"] === station) cableSet.add(row["ケーブル名"]);
  });
  const cableSelect = document.getElementById('cableFilter');
  cableSelect.innerHTML = `<option value="">すべて</option>` + [...cableSet].map(c => `<option>${c}</option>`).join('');
}

function updateBranchFilter() {
  const station = document.getElementById('stationFilter').value;
  const cable = document.getElementById('cableFilter').value;
  const branchSet = new Set();
  mhData.forEach(row => {
    if ((!station || row["収容局"] === station) && (!cable || row["ケーブル名"] === cable)) {
      getAvailableBranches(row).forEach(b => branchSet.add(b));
    }
  });
  const branchSelect = document.getElementById('branchFilter');
  branchSelect.innerHTML = `<option value="">すべて</option>` + [...branchSet].map(b => `<option>${b}</option>`).join('');
}

function updateMap() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  const station = document.getElementById('stationFilter').value;
  const cable = document.getElementById('cableFilter').value;
  const branch = document.getElementById('branchFilter').value;

  const filtered = mhData.filter(row =>
    (!station || row["収容局"] === station) &&
    (!cable || row["ケーブル名"] === cable) &&
    (!branch || row[branch] === "1")
  );

  filtered.forEach(row => {
    const lat = parseFloat(row["緯度"]);
    const lng = parseFloat(row["経度"]);
    if (!isNaN(lat) && !isNaN(lng)) {
      const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`
          <div style="line-height:1.4">
            <div style="font-weight:bold;">${row["備考"]}</div>
            <div>${row["収容局"]}</div>
            <div>${row["ケーブル名"]}</div>
            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank">地図アプリで開く</a><br>
            <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}" target="_blank">ストリートビュー</a><br><br>
            <button onclick="openModal('${row["備考"]}')">詳細</button>
          </div>
        `);
      markers.push(marker);
    }
  });
}

function openModal(mhName) {
  currentMHId = mhName;
  isEditMode = false;
  document.getElementById('modalTitle').innerHTML = `${mhName} の詳細情報 <button onclick="enableEditMode()">編集</button>`;
  document.getElementById('mhSize').value = "";
  document.getElementById('closureType').value = "";
  document.getElementById('pressureList').innerHTML = "";
  document.getElementById('failureList').innerHTML = "";

  disableInputs(true);

  db.collection("mhDetails").doc(mhName).get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      document.getElementById('mhSize').value = data.size || "";
      document.getElementById('closureType').value = data.closure || "";

      if (data.pressure) {
        for (let date in data.pressure) appendPressureItem(date, data.pressure[date]);
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

function enableEditMode() {
  isEditMode = true;
  disableInputs(false);
  document.getElementById('modalTitle').innerHTML = `${currentMHId} の編集 <button onclick="saveMHDetail()">保存</button>`;
}

function disableInputs(disabled) {
  document.getElementById('mhSize').disabled = disabled;
  document.getElementById('closureType').disabled = disabled;
  document.querySelectorAll('.delete-btn').forEach(btn => btn.style.display = disabled ? 'none' : 'inline-block');
}

function addPressure() {
  const date = document.getElementById('pressureDate').value;
  const val = document.getElementById('pressureValue').value;
  if (date && val) appendPressureItem(date, val);
}

function appendPressureItem(date, val) {
  const div = document.createElement('div');
  div.textContent = `${date}: ${val}`;
  div.dataset.key = date;

  const del = document.createElement('button');
  del.textContent = "削除";
  del.className = "delete-btn";
  del.style.marginLeft = "10px";
  del.onclick = () => div.remove();
  del.style.display = isEditMode ? 'inline-block' : 'none';

  div.appendChild(del);
  document.getElementById('pressureList').appendChild(div);
}

function addFailure() {
  const date = document.getElementById('failureDate').value;
  const status = document.getElementById('failureStatus').value;
  const comment = document.getElementById('failureComment').value;
  if (date && status) appendFailureItem(date, status, comment);
}

function appendFailureItem(date, status, comment) {
  const div = document.createElement('div');
  div.textContent = `${date}: [${status}] ${comment}`;
  div.dataset.key = date;

  const del = document.createElement('button');
  del.textContent = "削除";
  del.className = "delete-btn";
  del.style.marginLeft = "10px";
  del.onclick = () => div.remove();
  del.style.display = isEditMode ? 'inline-block' : 'none';

  div.appendChild(del);
  document.getElementById('failureList').appendChild(div);
}

function saveMHDetail() {
  const size = document.getElementById('mhSize').value;
  const closure = document.getElementById('closureType').value;

  const pressure = {};
  [...document.getElementById('pressureList').children].forEach(item => {
    const [date, val] = item.textContent.replace("削除", "").split(':').map(s => s.trim());
    pressure[date] = val;
  });

  const failures = {};
  [...document.getElementById('failureList').children].forEach(item => {
    const text = item.textContent.replace("削除", "").trim();
    const match = text.match(/^(\d{4}-\d{2}-\d{2}): \[(.*?)\] (.*)$/);
    if (match) failures[match[1]] = { status: match[2], comment: match[3] };
  });

  db.collection("mhDetails").doc(currentMHId).set({
    size, closure, pressure, failures
  }).then(() => {
    alert("保存しました");
    modal.style.display = 'none';
  }).catch(err => {
    alert("保存に失敗しました");
    console.error(err);
  });
}
