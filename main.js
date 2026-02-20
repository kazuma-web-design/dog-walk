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

    document.getElementById('btn-generate-route').addEventListener('click', startWalkingFlow);
    document.getElementById('btn-start-walk').addEventListener('click', beginRealtimeTracking);
    document.getElementById('btn-stop-walk').addEventListener('click', stopWalkingFlow);
}

// --- メイン画面制御 ---
function showMainScreen(profile) {
    document.getElementById('registration-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');

    const breed = breeds.find(b => b.id === profile.breedId);
    document.getElementById('display-dog-name').textContent = `${profile.name}ちゃん`;
    document.getElementById('display-dog-info').textContent = `${breed ? breed.name : 'わんこ'} / ${profile.weight}kg`;

    const targetKcal = Math.round(profile.weight * 15);
    document.getElementById('target-calories').textContent = targetKcal;

    updateHistoryUI();
}

// --- 散歩フロー ---
async function startWalkingFlow() {
    const durationInput = document.getElementById('walk-duration');
    const duration = parseInt(durationInput.value) || 30;
    currentIntensity = parseInt(document.getElementById('walk-intensity').value) || 1;

    document.getElementById('map-container').classList.remove('hidden');

    if (!mapInstance) {
        mapInstance = L.map('map').setView([35.6812, 139.7671], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(mapInstance);
    }

    // ルート生成 (簡易)
    const distanceKm = (duration / 60) * 4;
    await simulateMapRoute(distanceKm);

    window.scrollTo({ top: document.getElementById('map-container').offsetTop, behavior: 'smooth' });
}

function beginRealtimeTracking() {
    walkStartTime = new Date();
    document.getElementById('btn-start-walk').classList.add('hidden');
    document.getElementById('btn-stop-walk').classList.remove('hidden');

    walkTimerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const now = new Date();
    const diff = now - walkStartTime;

    const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');

    document.getElementById('walk-timer').textContent = `${h}:${m}:${s}`;

    // リアルタイムカロリー計算
    const minutes = diff / 60000;
    const burned = calculateBurnedKcal(minutes, currentIntensity);
    document.getElementById('live-calories').textContent = burned;
}

function stopWalkingFlow() {
    clearInterval(walkTimerInterval);
    const walkEndTime = new Date();
    const durationMinutes = (walkEndTime - walkStartTime) / 60000;
    const finalKcal = calculateBurnedKcal(durationMinutes, currentIntensity);

    // 履歴に保存
    const history = JSON.parse(localStorage.getItem('walk_history') || '[]');
    const record = {
        date: new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        duration: Math.round(durationMinutes),
        kcal: finalKcal
    };
    history.unshift(record);
    localStorage.setItem('walk_history', JSON.stringify(history));

    alert(`${record.duration}分間の散歩完了！\n消費カロリー: ${finalKcal} kcal\nお疲れ様でした！`);

    // UIリセット
    document.getElementById('map-container').classList.add('hidden');
    document.getElementById('btn-start-walk').classList.remove('hidden');
    document.getElementById('btn-stop-walk').classList.add('hidden');
    document.getElementById('walk-timer').textContent = '00:00:00';
    document.getElementById('live-calories').textContent = '0';

    updateHistoryUI();
}

// --- ユーティリティ ---
function updateHistoryUI() {
    const history = JSON.parse(localStorage.getItem('walk_history') || '[]');
    const list = document.getElementById('history-list');
    let total = 0;

    list.innerHTML = '';
    if (history.length === 0) {
        list.innerHTML = '<p class="empty-msg">まだ散歩の記録がないよ</p>';
    } else {
        history.forEach(item => {
            total += item.kcal;
            const card = document.createElement('div');
            card.className = 'history-card';
            card.innerHTML = `
                <div class="history-info">
                    <p class="walk-date">${item.date}</p>
                    <p>${item.duration}分間の散歩</p>
                </div>
                <div class="history-kcal">${item.kcal} kcal</div>
            `;
            list.appendChild(card);
        });
    }
    document.getElementById('total-burned').textContent = total;
}

function calculateBurnedKcal(minutes, intensityLevel) {
    if (!currentProfile) return 0;
    const breed = breeds.find(b => b.id === currentProfile.breedId);
    const activity = activityLevels.find(a => a.level === intensityLevel);
    if (!breed || !activity) return 0;

    const hours = minutes / 60;
    return Math.round(currentProfile.weight * hours * breed.calorieFactor * activity.multiplier * 3);
}

async function simulateMapRoute(distanceKm) {
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition((pos) => {
            const { latitude, longitude } = pos.coords;
            const center = [latitude, longitude];
            mapInstance.setView(center, 16);

            L.marker(center).addTo(mapInstance).bindPopup("ここからスタート！").openPopup();

            const points = [];
            const radius = (distanceKm / (2 * Math.PI)) * 0.01;
            for (let i = 0; i <= 360; i += 45) {
                const angle = (i * Math.PI) / 180;
                points.push([latitude + radius * Math.cos(angle), longitude + radius * Math.sin(angle)]);
            }
            L.polyline(points, { color: '#ffb347', weight: 5 }).addTo(mapInstance);
            resolve();
        }, () => {
            // 失敗時は東京駅付近でシミュレーション
            const center = [35.6812, 139.7671];
            mapInstance.setView(center, 15);
            resolve();
        });
    });
}
