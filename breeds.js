/**
 * 犬種データ
 * カロリー計算係数 (METsに近い独自係数)
 * 1: 小型/省エネ、3: 標準、5: 大型/活発
 */
const breeds = [
    {
        id: "toy_poodle",
        name: "トイプードル",
        category: "小型犬",
        calorieFactor: 1.2, // 体重1kg・1kmあたりの推定消費kcal
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

/**
 * 散歩の強度区分
 */
const activityLevels = [
    { level: 1, name: "ゆったり (ゆっくり歩く)", multiplier: 0.8 },
    { level: 2, name: "ふつう (通常の散歩速度)", multiplier: 1.0 },
    { level: 3, name: "活発 (早歩き、小走り含む)", multiplier: 1.5 },
];

export { breeds, activityLevels };
