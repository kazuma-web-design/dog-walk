export function initMap(containerId) {
    // デフォルト位置 (東京駅付近)
    const defaultPos = [35.6812, 139.7671];
    const map = L.map(containerId).setView(defaultPos, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    return map;
}

export function generateRoute(map, distanceKm) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            alert("位置情報が利用できません");
            return;
        }

        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            const center = [latitude, longitude];

            map.setView(center, 16);

            // 現在地にマーカー
            L.marker(center).addTo(map)
                .bindPopup("ここからスタート！")
                .openPopup();

            // 簡易的な周回ルートの生成 (距離に基づいた多角形)
            // 実際はルーティングAPIを使用するが、今回はデモ用に円形のパスを生成
            const points = [];
            const radius = (distanceKm / (2 * Math.PI)) * 0.01; // 緯度経度への簡易変換

            for (let i = 0; i <= 360; i += 45) {
                const angle = (i * Math.PI) / 180;
                points.push([
                    latitude + radius * Math.cos(angle),
                    longitude + radius * Math.sin(angle)
                ]);
            }

            const polyline = L.polyline(points, { color: '#ffb347', weight: 5 }).addTo(map);
            map.fitBounds(polyline.getBounds());

            resolve(burnedKcal);
        }, (err) => {
            console.error(err);
            alert("位置情報の取得に失敗しました。デフォルト位置で表示します。");
            reject(err);
        });
    });
}
