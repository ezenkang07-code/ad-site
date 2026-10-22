/* Pure calculation and validation: no DOM, no rounding of stored values. */
(function (root) {
  'use strict';
  const nutrients = ['carbs', 'protein', 'fat'];
  const meals = ['아침', '점심', '저녁', '간식'];
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const nonnegative = value => finite(value) && value >= 0;
  function number(value) {
    return String(value).trim() === '' ? NaN : Number(value);
  }
  function validAmount(value) {
    return finite(value) && value > 0 && value <= 5000 && Math.abs(value * 10 - Math.round(value * 10)) < 1e-8;
  }
  function validFood(food) {
    return !!food && typeof food.id === 'string' && typeof food.name === 'string' && food.name.trim().length > 0 && food.name.length <= 100 &&
      typeof food.source === 'string' && finite(food.baseGrams) && food.baseGrams > 0 && nonnegative(food.kcal) &&
      nutrients.every(key => food[key] === null || nonnegative(food[key]));
  }
  function calculate(food, grams) {
    if (!validFood(food) || !validAmount(grams)) throw new Error('음식 정보와 섭취량을 확인해주세요. 섭취량은 0 초과~5000g, 소수점 첫째 자리까지 입력할 수 있습니다.');
    const result = { kcal: food.kcal * (grams / food.baseGrams) };
    nutrients.forEach(key => { result[key] = food[key] === null ? null : food[key] * (grams / food.baseGrams); });
    if (!Object.values(result).every(value => value === null || nonnegative(value)) || !finite((result.carbs || 0) * 4 + (result.protein || 0) * 4 + (result.fat || 0) * 9)) throw new Error('계산 가능한 범위를 벗어났습니다. 입력값을 확인해주세요.');
    return result;
  }
  function totals(items) {
    const result = { kcal: 0, carbs: 0, protein: 0, fat: 0, missing: { carbs: 0, protein: 0, fat: 0 }, meals: Object.fromEntries(meals.map(meal => [meal, 0])) };
    items.forEach(item => {
      const value = calculate(item.food, item.grams);
      result.kcal += value.kcal;
      result.meals[item.meal] += value.kcal;
      nutrients.forEach(key => { if (value[key] === null) result.missing[key]++; else result[key] += value[key]; });
    });
    if (![result.kcal, ...nutrients.map(key => result[key]), ...Object.values(result.meals), result.carbs * 4 + result.protein * 4 + result.fat * 9].every(nonnegative)) throw new Error('식단 합계가 계산 가능한 범위를 벗어났습니다.');
    return result;
  }
  function macroShares(total) {
    const energies = [total.carbs * 4, total.protein * 4, total.fat * 9];
    const sum = energies.reduce((a, b) => a + b, 0);
    if (!finite(sum) || sum <= 0) return [0, 0, 0];
    return energies.map(value => value / sum * 100);
  }
  // Largest remainder allocation makes displayed percentages sum to exactly 100.0%.
  function displayShares(shares) {
    if (!shares.some(value => value > 0)) return [0, 0, 0];
    const units = shares.map(value => Math.floor(value * 10));
    const order = shares.map((value, index) => ({ index, remainder: value * 10 - units[index] })).sort((a, b) => b.remainder - a.remainder);
    for (let i = 0, remaining = 1000 - units.reduce((a, b) => a + b, 0); i < remaining; i++) units[order[i % 3].index]++;
    return units.map(value => value / 10);
  }
  function localDate(date = new Date()) {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  }
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9999-12-31') return false;
    const date = new Date(value + 'T12:00:00');
    return !Number.isNaN(date.getTime()) && localDate(date) === value;
  }
  function search(foods, query, category) {
    const normalize = value => value.normalize('NFC').replace(/\s/g, '').toLowerCase();
    return foods.filter(food => (category === '전체' || food.category === category) && normalize(food.name).includes(normalize(query)));
  }
  root.FITCALC_FOOD_CORE = Object.freeze({ nutrients, meals, number, finite, validAmount, validFood, calculate, totals, macroShares, displayShares, localDate, validDate, search });
})(typeof window !== 'undefined' ? window : globalThis);
