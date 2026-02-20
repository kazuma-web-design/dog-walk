// --- breeds.js の内容 ---
const breeds = [
    {
        id: "toy_poodle",
        name: "トイプードル",
        category: "小型犬",
        calorieFactor: 1.2,
    },
    {
        id: "shiba",
        name: "柴犬",
        category: "中型犬",
        calorieFactor: 1.0,
    },
    {
        id: "labrador",
        name: "ラブラドールレトリバー",
        category: "大型犬",
        calorieFactor: 0.8,
    }
];

const activityLevels = [
    { level: 1, name: "ゆったり (ゆっくり歩く)", multiplier: 0.8 },
    { level: 2, name: "ふつう (通常の散歩速度)", multiplier: 1.0 },
    { level: 3, name: "活発 (早歩き、小走り含む)", multiplier: 1.5 },
];

// --- map.js の内容 ---
function initMap(containerId) {
    const defaultPos = [35.6812, 139.7671];
    const map = L.map(containerId).setView(defaultPos, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    return map;
}

function generateRoute(map, distanceKm) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            alert("位置情報が利用できません");
            return;
        }

        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            const center = [latitude, longitude];

            map.setView(center, 16);

            L.marker(center).addTo(map)
                .bindPopup("ここからスタート！")
                .openPopup();

            const points = [];
            const radius = (distanceKm / (2 * Math.PI)) * 0.01;

            for (let i = 0; i <= 360; i += 45) {
                const angle = (i * Math.PI) / 180;
                points.push([
                    latitude + radius * Math.cos(angle),
                    longitude + radius * Math.sin(angle)
                ]);
            }

            const polyline = L.polyline(points, { color: '#ffb347', weight: 5 }).addTo(map);
            map.fitBounds(polyline.getBounds());
            resolve();
        }, (err) => {
            console.error(err);
            alert("位置情報の取得に失敗しました。デフォルト位置で表示します。");
            reject(err);
        });
    });
}

// --- app.js の内容 ---
let mapInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    const breedSelect = document.getElementById('dog-breed');
    const intensitySelect = document.getElementById('walk-intensity');
    const profileForm = document.getElementById('profile-form');

    // 犬種セレクトボックスの初期化
    if (breedSelect) {
        breeds.forEach(breed => {
            const option = document.createElement('option');
            option.value = breed.id;
            option.textContent = `${breed.name} (${breed.category})`;
            breedSelect.appendChild(option);
        });
    }

    // 散歩強度セレクトボックスの初期化
    if (intensitySelect) {
        activityLevels.forEach(level => {
            const option = document.createElement('option');
            option.value = level.level;
            option.textContent = level.name;
            intensitySelect.appendChild(option);
        });
    }

    // 既存のプロフィールがあれば起動時にメイン画面を表示
    const savedProfile = localStorage.getItem('dog_profile');
    if (savedProfile) {
        showMainScreen(JSON.parse(savedProfile));
    }

    // 登録ボタンのイベントリスナー
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
            showMainScreen(profile);
        });
    }

    // ルート提案ボタン
    const btnGenerate = document.getElementById('btn-generate-route');
    if (btnGenerate) {
        btnGenerate.addEventListener('click', async () => {
            const durationInput = document.getElementById('walk-duration');
            const duration = parseInt(durationInput.value) || 30;
            const intensity = parseInt(intensitySelect.value) || 1;

            const burnedKcal = calculateCalories(duration, intensity);

            document.getElementById('map-container').classList.remove('hidden');

            if (!mapInstance) {
                mapInstance = initMap('map');
            }

            const distanceKm = (duration / 60) * 4;
            await generateRoute(mapInstance, distanceKm);

            alert(`${duration}分間の散歩ですね！\n推定消費カロリーは ${burnedKcal} kcal です。`);
        });
    }

    // 散歩スタートボタン
    const btnStart = document.getElementById('btn-start-walk');
    if (btnStart) {
        btnStart.addEventListener('click', () => {
            alert("散歩を記録中... (GPSトラッキングは次のアップデートで！)");
        });
    }
});

function showMainScreen(profile) {
    const regScreen = document.getElementById('registration-screen');
    const mainScreen = document.getElementById('main-screen');

    if (regScreen) regScreen.classList.add('hidden');
    if (mainScreen) mainScreen.classList.remove('hidden');

    const breed = breeds.find(b => b.id === profile.breedId);
    const displayName = document.getElementById('display-dog-name');
    const displayInfo = document.getElementById('display-dog-info');

    if (displayName) displayName.textContent = `${profile.name}ちゃん`;
    if (displayInfo) displayInfo.textContent = `${breed ? breed.name : 'わんこ'} / ${profile.weight}kg`;

    const targetKcal = Math.round(profile.weight * 15);
    const displayTarget = document.getElementById('target-calories');
    if (displayTarget) displayTarget.textContent = targetKcal;
}

function calculateCalories(duration, intensityLevel) {
    const profile = JSON.parse(localStorage.getItem('dog_profile'));
    if (!profile) return 0;

    const breed = breeds.find(b => b.id === profile.breedId);
    const activity = activityLevels.find(a => a.level === parseInt(intensityLevel));

    if (!breed || !activity) return 0;

    const hours = duration / 60;
    return Math.round(profile.weight * hours * breed.calorieFactor * activity.multiplier * 3);
}
