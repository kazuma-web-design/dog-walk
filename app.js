import { breeds, activityLevels } from './breeds.js';
import { initMap, generateRoute } from './map.js';

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
            const duration = parseInt(document.getElementById('walk-duration').value) || 30;
            const intensity = parseInt(document.getElementById('walk-intensity').value) || 1;

            // カロリー計算とマップ表示
            const burnedKcal = calculateCalories(duration, intensity);

            document.getElementById('map-container').classList.remove('hidden');

            if (!mapInstance) {
                mapInstance = initMap('map');
            }

            // 簡易ルート生成 (15分あたり約1kmと仮定)
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

    // プロフィール情報の表示
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
