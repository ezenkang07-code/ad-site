/* USDA FoodData Central SR Legacy. Official API values verified 2026-10-08.
 * All nutrients below are per 100 g edible portion, not per serving.
 * Keep source descriptions so translated names never hide preparation differences.
 * No API key or network request is needed in the browser. */
(function (root) {
  'use strict';
  const rows = [
    [173944, '바나나 (생것)', '과일', '🍌', 89, 22.84, 1.09, 0.33, 'Bananas, raw'],
    [168878, '흰쌀밥 (장립종, 조리 후)', '밥 / 곡류', '🍚', 130, 28.17, 2.69, 0.28, 'Rice, white, long-grain, regular, enriched, cooked'],
    [169704, '현미밥 (장립종, 조리 후)', '밥 / 곡류', '🍚', 123, 25.58, 2.74, 0.97, "Rice, brown, long-grain, cooked (Includes foods for USDA's Food Distribution Program)"],
    [171077, '닭가슴살 (껍질·뼈 제외, 생것)', '육류', '🍗', 120, 0, 22.5, 2.62, 'Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw'],
    [174015, '소고기 (지방 제거 살코기, 생것)', '육류', '🥩', 151, 0, 21.55, 7.24, 'Beef, composite of trimmed retail cuts, separable lean only, trimmed to 0 inch fat, choice, raw'],
    [171705, '아보카도 (생것)', '과일', '🥑', 160, 8.53, 2, 14.66, 'Avocados, raw, all commercial varieties'],
    [171688, '사과 (껍질 포함, 생것)', '과일', '🍎', 52, 13.81, 0.26, 0.17, "Apples, raw, with skin (Includes foods for USDA's Food Distribution Program)"],
    [170379, '브로콜리 (생것)', '채소', '🥦', 34, 6.64, 2.82, 0.37, 'Broccoli, raw'],
    [171284, '플레인 요거트 (전지유)', '유제품', '🥣', 61, 4.66, 3.47, 3.25, 'Yogurt, plain, whole milk'],
    [171265, '우유 (지방 3.25%, 비타민 D 첨가)', '유제품', '🥛', 61, 4.8, 3.15, 3.25, 'Milk, whole, 3.25% milkfat, with added vitamin D'],
    [172183, '계란 흰자 (생것)', '기타', '🥚', 52, 0.73, 10.9, 0.17, 'Egg, white, raw, fresh'],
    [173647, '물 (음용 수돗물)', '음료', '💧', 0, 0, 0, 0, 'Beverages, water, tap, drinking']
  ];
  root.FITCALC_FOODS = Object.freeze(rows.map(([id, name, category, icon, kcal, carbs, protein, fat, originalName]) => Object.freeze({
    id: 'usda-' + id, name, category, icon, baseGrams: 100, kcal, carbs, protein, fat, originalName,
    source: 'USDA FoodData Central · SR Legacy',
    sourceUrl: 'https://fdc.nal.usda.gov/food-details/' + id + '/nutrients',
    published: '2019-04-01', checked: '2026-10-08'
  })));
})(typeof window !== 'undefined' ? window : globalThis);
