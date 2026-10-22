/* One storage key per local date: edits/deletion cannot erase another day's log. */
(function (root) {
  'use strict';
  const C = root.FITCALC_FOOD_CORE;
  const prefix = 'fitcalc-food-log-v1:';
  const empty = () => ({ version: 1, goal: 2000, items: [] });
  const cache = new Map();
  const blocked = new Set();
  const volatile = new Set();
  function validate(record) {
    if (!record || record.version !== 1 || !C.finite(record.goal) || record.goal <= 0 || !Array.isArray(record.items)) return false;
    const ids = new Set();
    try {
      for (const item of record.items) {
        if (!item || typeof item.id !== 'string' || ids.has(item.id) || !C.meals.includes(item.meal) || !C.validFood(item.food) || !C.validAmount(item.grams) || typeof item.createdAt !== 'string' || Number.isNaN(Date.parse(item.createdAt))) return false;
        ids.add(item.id);
        C.calculate(item.food, item.grams);
      }
      const total = C.totals(record.items);
      return C.finite(total.kcal / record.goal * 100);
    } catch (_) { return false; }
  }
  function load(date) {
    if (!C.validDate(date)) throw new Error('올바른 날짜를 선택해주세요.');
    if (cache.has(date)) return { record: cache.get(date), warning: blocked.has(date) ? '저장된 기록을 읽을 수 없어 임시 기록을 표시합니다. 원본은 보존됩니다.' : volatile.has(date) ? '브라우저 저장에 실패한 변경 사항이 있습니다. 현재 탭에만 임시 보관되며 새로고침하면 사라질 수 있습니다.' : '' };
    try {
      const raw = root.localStorage.getItem(prefix + date);
      const record = raw === null ? empty() : JSON.parse(raw);
      if (!validate(record)) throw new Error('invalid record');
      cache.set(date, record);
      return { record, warning: '' };
    } catch (_) {
      const record = empty();
      cache.set(date, record);
      blocked.add(date);
      return { record, warning: '저장된 기록을 읽을 수 없습니다. 손상된 원본은 덮어쓰지 않으며 지금부터의 기록은 이 탭에만 임시 보관됩니다. 선택 날짜 전체 삭제로 초기화할 수 있습니다.' };
    }
  }
  function save(date, record) {
    if (!C.validDate(date) || !validate(record)) return { ok: false, warning: '저장할 식단 데이터가 올바르지 않습니다.' };
    cache.set(date, record);
    if (blocked.has(date)) return { ok: false, warning: '이 날짜는 임시 보관 중입니다. 새로고침하면 변경 내용이 사라집니다. 손상된 원본 기록은 보존됩니다.' };
    try {
      root.localStorage.setItem(prefix + date, JSON.stringify(record));
      volatile.delete(date);
      return { ok: true, warning: '' };
    } catch (_) { volatile.add(date); return { ok: false, warning: '브라우저 저장에 실패했습니다. 현재 탭에서는 사용할 수 있지만 새로고침하면 변경 내용이 사라질 수 있습니다.' }; }
  }
  function clear(date) {
    if (!C.validDate(date)) return { ok: false, warning: '올바른 날짜를 선택해주세요.' };
    try {
      root.localStorage.removeItem(prefix + date);
      cache.set(date, empty());
      blocked.delete(date);
      volatile.delete(date);
      return { ok: true, warning: '' };
    } catch (_) { return { ok: false, warning: '브라우저에서 기록을 삭제하지 못했습니다. 기존 기록을 유지합니다.' }; }
  }
  root.FITCALC_FOOD_STORAGE = Object.freeze({ load, save, clear, validate });
})(typeof window !== 'undefined' ? window : globalThis);
