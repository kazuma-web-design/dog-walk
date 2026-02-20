import { breeds } from './breeds.js';

document.addEventListener('DOMContentLoaded', () => {
    const breedSelect = document.getElementById('dog-breed');
    const profileForm = document.getElementById('profile-form');
    const registrationScreen = document.getElementById('registration-screen');

    // 犬種セレクトボックスの初期化
    breeds.forEach(breed => {
        const option = document.createElement('option');
        option.value = breed.id;
        option.textContent = `${breed.name} (${breed.category})`;
        breedSelect.appendChild(option);
    });

    // 既存のプロフィールがあればスキップする仕組み（後のステップで実装）
    // const savedProfile = localStorage.getItem('dog_profile');
    // if (savedProfile) {
    //     showMainScreen();
    // }

    // フォーム送信処理
    profileForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const profile = {
            name: document.getElementById('dog-name').value,
            breedId: breedSelect.value,
            weight: parseFloat(document.getElementById('dog-weight').value),
            age: parseInt(document.getElementById('dog-age').value),
            registeredAt: new Date().toISOString()
        };

        // ローカルストレージに保存
        localStorage.setItem('dog_profile', JSON.stringify(profile));

        alert(`登録完了！\n${profile.name}ちゃん、よろしくね！`);

        // メイン画面へ遷移（今はアラートのみ）
        // showMainScreen();
    });
});

function showMainScreen() {
    document.getElementById('registration-screen').classList.add('hidden');
    document.getElementById('main-screen').classList.remove('hidden');
    // メイン画面の初期化ロジックをここに追加
}
