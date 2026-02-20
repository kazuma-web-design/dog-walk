// --- breeds.js の内容 ---
const breeds = [
    { id: "toy_poodle", name: "トイプードル", category: "小型犬", calorieFactor: 1.2 },
    { id: "shiba", name: "柴犬", category: "中型犬", calorieFactor: 1.0 },
    { id: "labrador", name: "ラブラドールレトリバー", category: "大型犬", calorieFactor: 0.8 }
];

const activityLevels = [
    { level: 1, name: "ゆったり (ゆっくり歩く)", multiplier: 0.8 },
    { level: 2, name: "ふつう (通常の散歩速度)", multiplier: 1.0 },
    { level: 3, name: "活発 (早歩き、小走り含む)", multiplier: 1.5 }
];

// --- 状態管理 ---
let mapInstance = null;
let walkStartTime = null;
let walkTimerInterval = null;
let currentProfile = null;
let currentIntensity = 1;
let generatedRoutes = [];
let currentRouteIndex = 0;
let routeLayers = [];

// --- アプリ初期化 ---
document.addEventListener('DOMContentLoaded', () => {
    currentProfile = JSON.parse(localStorage.getItem('dog_profile'));
    setupUI();
    if (currentProfile) {
        showMainScreen(currentProfile);
    }
});

function setupUI() {
    const breedSelect = document.getElementById('dog-breed');
    const intensitySelect = document.getElementById('walk-intensity');
    const profileForm = document.getElementById('profile-form');

    if (breedSelect) {
        breeds.forEach(breed => {
            const option = document.createElement('option');
            option.value = breed.id;
            option.textContent = `${breed.name} (${breed.category})`;
            breedSelect.appendChild(option);
        });
    }

    if (intensitySelect) {
        activityLevels.forEach(level => {
            const option = document.createElement('option');
            option.value = level.level;
            option.textContent = level.name;
            intensitySelect.appendChild(option);
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const profile = {
                name: document.getElementById('dog-name').value,
                breedId: breedSelect.value,
                weight: parseFloat(document.getElementById('dog-weight').value),
                age: parseInt(document.getElementById('dog-age').value),
                registeredAt: new Date().toISOString()
            };
            localStorage.setItem('dog_profile', JSON.stringify(profile));
            currentProfile = profile;
            showMainScreen(profile);
        });
    }

    document.getElementById('btn-settings').addEventListener('click', toggleSettings);
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
    document.getElementById('btn-generate-route').addEventListener('click', startWalkingFlow);
    document.getElementById('btn-start-walk').addEventListener('click', beginRealtimeTracking);
    document.getElementById('btn-stop-walk').addEventListener('click', stopWalkingFlow);

    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.route);
            switchRoute(index);
        });
    });

    const savedKey = localStorage.getItem('gmaps_api_key');
    if (savedKey) document.getElementById('gmaps-api-key').value = savedKey;
}

function toggleSettings() {
    const screens = ['stats-container', 'action-menu', 'history-container'];
    const settings = document.getElementById('settings-screen');
    const isHidden = settings.classList.contains('hidden');
    settings.classList.toggle('hidden');
    screens.forEach(id => {
        const el = document.getElementById(id) || document.querySelector('.' + id);
        if (el) el.style.display = isHidden ? 'none' : (id === 'stats-container' ? 'grid' : 'block');
    });
}

function saveSettings() {
    localStorage.setItem('gmaps_api_key', document.getElementById('gmaps-api-key').value);
    alert("保存しました。");
    toggleSettings();
}

function showMainScreen(profile) {
    document.getElementById('registration-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    const breed = breeds.find(b => b.id === profile.breedId);
    document.getElementById('display-dog-name').textContent = `${profile.name}ちゃん`;
    document.getElementById('display-dog-info').textContent = `${breed ? breed.name : 'わんこ'} / ${profile.weight}kg`;
    document.getElementById('target-calories').textContent = Math.round(profile.weight * 15);
    updateHistoryUI();
}

async function startWalkingFlow() {
    const durationInput = document.getElementById('walk-duration');
    const duration = parseInt(durationInput.value) || 30;
    currentIntensity = parseInt(document.getElementById('walk-intensity').value) || 1;
    document.getElementById('map-container').classList.remove('hidden');
    if (!mapInstance) {
        mapInstance = L.map('map').setView([35.6812, 139.7671], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OSM' }).addTo(mapInstance);
    }
    routeLayers.forEach(l => mapInstance.removeLayer(l));
    routeLayers = [];
    generatedRoutes = [];

    // 目標距離: 時速4kmで計算 (30分 -> 2km)
    const targetDist = (duration / 60) * 4;
    await generate5Routes(targetDist);

    document.getElementById('route-tabs').classList.remove('hidden');
    switchRoute(0);
    window.scrollTo({ top: document.getElementById('map-container').offsetTop, behavior: 'smooth' });
}

async function generate5Routes(distKm) {
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            const start = [latitude, longitude];
            mapInstance.setView(start, 15);
            L.marker(start).addTo(mapInstance).bindPopup("出発地");

            const kmToDeg = 1 / 111.32;
            const sideLen = (distKm / 2.5) * kmToDeg; // 三辺合計が目標に近い調整

            for (let i = 0; i < 5; i++) {
                const baseAngle = (i * 72 * Math.PI) / 180;
                const p1 = [
                    latitude + sideLen * Math.cos(baseAngle),
                    longitude + (sideLen * Math.sin(baseAngle)) / Math.cos(latitude * Math.PI / 180)
                ];
                const p2Angle = baseAngle + (Math.PI / 2.5); // 約72度ずらして三角形を作る
                const p2 = [
                    latitude + sideLen * Math.cos(p2Angle),
                    longitude + (sideLen * Math.sin(p2Angle)) / Math.cos(latitude * Math.PI / 180)
                ];

                const waypoints = [start, p1, p2, start];
                const coords = waypoints.map(w => `${w[1]},${w[0]}`).join(';');
                const url = `https://router.project-osrm.org/route/v1/walking/${coords}?overview=full&geometries=geojson`;

                try {
                    const res = await fetch(url);
                    const data = await res.json();
                    if (data.routes && data.routes[0]) {
                        generatedRoutes[i] = data.routes[0].geometry;
                    }
                } catch (e) {
                    generatedRoutes[i] = { type: "LineString", coordinates: waypoints.map(w => [w[1], w[0]]) };
                }
            }
            resolve();
        }, () => { alert("位置位置情報を許可してください"); resolve(); });
    });
}

function switchRoute(index) {
    if (!generatedRoutes[index]) return;
    routeLayers.forEach(l => mapInstance.removeLayer(l));
    routeLayers = [];
    const layer = L.geoJSON(generatedRoutes[index], { color: '#ffb347', weight: 6 }).addTo(mapInstance);
    routeLayers.push(layer);
    mapInstance.fitBounds(layer.getBounds());
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach((t, i) => t.classList.toggle('active', i === index));
    currentRouteIndex = index;
}

function beginRealtimeTracking() {
    walkStartTime = new Date();
    document.getElementById('btn-start-walk').classList.add('hidden');
    document.getElementById('btn-stop-walk').classList.remove('hidden');
    document.getElementById('route-tabs').classList.add('hidden');
    walkTimerInterval = setInterval(() => {
        const diff = new Date() - walkStartTime;
        const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        document.getElementById('walk-timer').textContent = `${h}:${m}:${s}`;
        document.getElementById('live-calories').textContent = calculateBurnedKcal(diff / 60000, currentIntensity);
    }, 1000);
}

function stopWalkingFlow() {
    clearInterval(walkTimerInterval);
    const durationMins = (new Date() - walkStartTime) / 60000;
    const finalKcal = calculateBurnedKcal(durationMins, currentIntensity);
    const history = JSON.parse(localStorage.getItem('walk_history') || '[]');
    history.unshift({
        date: new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        duration: Math.round(durationMins),
        kcal: finalKcal
    });
    localStorage.setItem('walk_history', JSON.stringify(history));
    alert(`${Math.round(durationMins)}分間の散歩完了！\n消費カロリー: ${finalKcal} kcal`);
    document.getElementById('map-container').classList.add('hidden');
    document.getElementById('btn-start-walk').classList.remove('hidden');
    document.getElementById('btn-stop-walk').classList.add('hidden');
    updateHistoryUI();
}

function updateHistoryUI() {
    const history = JSON.parse(localStorage.getItem('walk_history') || '[]');
    const list = document.getElementById('history-list');
    let total = 0;
    list.innerHTML = history.length ? '' : '<p class="empty-msg">まだ散歩の記録がないよ</p>';
    history.forEach(item => {
        total += item.kcal;
        const card = document.createElement('div');
        card.className = 'history-card';
        card.innerHTML = `<div class="history-info"><p class="walk-date">${item.date}</p><p>${item.duration}分間の散歩</p></div><div class="history-kcal">${item.kcal} kcal</div>`;
        list.appendChild(card);
    });
    document.getElementById('total-burned').textContent = total;
}

function calculateBurnedKcal(minutes, intensity) {
    if (!currentProfile) return 0;
    const breed = breeds.find(b => b.id === currentProfile.breedId);
    const activity = activityLevels.find(a => a.level === intensity);
    return Math.round(currentProfile.weight * (minutes / 60) * breed.calorieFactor * activity.multiplier * 3);
}
