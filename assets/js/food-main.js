/* Food calculator UI. Existing calculators and their storage keys are independent. */
(function ($) {
  'use strict';
  const C = window.FITCALC_FOOD_CORE;
  const S = window.FITCALC_FOOD_STORAGE;
  const foods = [...window.FITCALC_FOODS];
  const names = { carbs: '탄수화물', protein: '단백질', fat: '지방' };
  const colors = { carbs: '#35c9a5', protein: '#4a90e2', fat: '#f5a623' };
  const mealIcons = { 아침: '🌅', 점심: '☀️', 저녁: '🌙', 간식: '🍪' };
  let selected = null;
  let result = null;
  let category = '전체';
  let meal = '점심';
  let matches = [];
  let highlighted = -1;
  let searchTimer;
  let renderedQuery = '';
  let lastAdd = 0;
  let today = C.localDate();
  let date = today;
  let record;
  let editing = null;
  let clearingDate = null;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const fmt = (value, decimals = 0) => value === null ? '정보 없음' : value.toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const gramsText = value => value === null ? '정보 없음' : fmt(value, 1) + 'g';
  const uid = () => window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);

  function setError(input, target, text) {
    $(target).text(text);
    $(input).attr('aria-invalid', text ? 'true' : 'false');
  }
  function sourceMarkup(food) {
    const source = esc(food.source);
    const url = typeof food.sourceUrl === 'string' && /^https:\/\/fdc\.nal\.usda\.gov\/food-details\/\d+\/nutrients$/.test(food.sourceUrl) ? food.sourceUrl : null;
    return (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + source + ' ↗</a>' : source) +
      (food.published ? ' · 공개 ' + esc(food.published) : '') + (food.checked ? ' · 확인 ' + esc(food.checked) : '');
  }
  function renderCategories() {
    const categories = ['전체', ...new Set(foods.map(food => food.category))];
    $('#food-categories').html(categories.map(value => '<button type="button" data-category="' + esc(value) + '" aria-pressed="' + (value === category) + '">' + esc(value) + '</button>').join(''));
  }
  function searchFood() {
    renderedQuery = $('#food-search').val();
    matches = C.search(foods, $('#food-search').val(), category);
    highlighted = -1;
    $('#food-search').removeAttr('aria-activedescendant').attr('aria-expanded', 'true');
    $('#food-search-count').text(matches.length + '개 음식 · 기준 중량과 조리 상태를 확인해주세요.');
    $('#food-search-results').prop('hidden', false).html(matches.length ? matches.map((food, index) =>
      '<div id="food-option-' + index + '" class="food-search-option" role="option" tabindex="-1" data-index="' + index + '" aria-selected="' + (selected && selected.id === food.id ? 'true' : 'false') + '"><span><strong>' + esc(food.icon || '🍽️') + ' ' + esc(food.name) + '</strong><small>' + esc(food.category) + ' · ' + fmt(food.baseGrams, 1) + 'g 기준</small></span><span>' + fmt(food.kcal) + ' kcal</span></div>'
    ).join('') : '<p class="food-no-results">검색 결과가 없습니다.<br />다른 음식 이름으로 검색하거나 직접 영양 정보를 입력해보세요.</p>');
  }
  function selectFood(food) {
    selected = food;
    result = null;
    $('#food-result').prop('hidden', true);
    $('#food-result-empty').prop('hidden', false);
    $('#food-status').text('');
    setError('#food-search', '#food-selection-error', '');
    $('#food-selected').prop('hidden', false).html('<h3>' + esc(food.icon || '🍽️') + ' ' + esc(food.name) + '</h3><p class="food-small">' + esc(food.category) + ' · ' + fmt(food.baseGrams, 1) + 'g당 ' + fmt(food.kcal, 1) + 'kcal</p><p class="food-small">탄수화물 ' + gramsText(food.carbs) + ' · 단백질 ' + gramsText(food.protein) + ' · 지방 ' + gramsText(food.fat) + '</p><p class="food-small">' + sourceMarkup(food) + '</p><p class="food-original">' + esc(food.originalName || '사용자가 직접 입력한 영양성분') + '</p>');
    $('#food-search-results [role="option"]').each(function () { $(this).attr('aria-selected', String(matches[Number(this.dataset.index)].id === food.id)); });
  }
  function syncAmount(value) {
    if (C.finite(value)) $('#food-slider').val(Math.max(1, Math.min(1000, value)));
    $('#food-quick button').each(function () { $(this).attr('aria-pressed', String(Number(this.dataset.grams) === value)); });
    const valid = C.validAmount(value);
    setError('#food-grams', '#food-amount-error', valid ? '' : '섭취량은 0 초과~5000g, 소수점 첫째 자리까지 입력해주세요.');
    if (result) {
      if (valid) calculateFood(false);
      else { result = null; $('#food-result').prop('hidden', true); $('#food-result-empty').prop('hidden', false); }
    }
  }
  function bar(label, value, max, color, unit, decimals = 1) {
    const width = value === null || max <= 0 ? 0 : Math.max(0, Math.min(100, value / max * 100));
    return '<div class="food-bar-row"><div class="food-bar-label"><span>' + esc(label) + '</span><strong>' + (value === null ? '정보 없음' : fmt(value, decimals) + ' ' + unit) + '</strong></div><svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true"><rect width="' + width + '" height="10" rx="2" fill="' + color + '" /></svg></div>';
  }
  function showFoodResult() {
    $('#food-result-empty').prop('hidden', true);
    $('#food-result').prop('hidden', false);
    $('#food-result-data').html('<p class="eyebrow">🍱 계산 완료!</p><h3 class="food-result-name">' + esc(result.food.name) + '</h3><p>' + fmt(result.grams, 1) + 'g 섭취 기준</p><p class="food-small">예상 섭취 칼로리</p><div class="food-kcal">약 ' + fmt(result.values.kcal) + ' <small>kcal</small></div><p class="food-small">등록된 영양성분 데이터와 입력한 섭취량을 기준으로 계산한 값입니다. 음식의 종류, 조리 방법, 제품에 따라 실제 영양성분은 달라질 수 있습니다.</p><p class="food-result-source">' + sourceMarkup(result.food) + '</p>');
    const max = Math.max(1, ...C.nutrients.map(key => result.values[key] || 0));
    $('#food-nutrient-bars').html(C.nutrients.map(key => bar(names[key], result.values[key], max, colors[key], 'g')).join(''));
    updateAddDate();
  }
  function calculateFood(focusError = true) {
    const grams = C.number($('#food-grams').val());
    setError('#food-search', '#food-selection-error', selected ? '' : '검색 결과에서 음식을 선택하거나 직접 입력해주세요.');
    setError('#food-grams', '#food-amount-error', C.validAmount(grams) ? '' : '섭취량은 0 초과~5000g, 소수점 첫째 자리까지 입력해주세요.');
    if (!selected || !C.validAmount(grams)) { if (focusError) $(selected ? '#food-grams' : '#food-search').trigger('focus'); return false; }
    try {
      result = { food: { ...selected }, grams, values: C.calculate(selected, grams) };
      showFoodResult();
      $('#food-status').text('');
      return true;
    } catch (error) { result = null; $('#food-result').prop('hidden', true); $('#food-result-empty').prop('hidden', false); setError('#food-grams', '#food-amount-error', error.message); return false; }
  }
  function resetFoodCalculator() {
    clearTimeout(searchTimer);
    selected = null; result = null; category = '전체';
    $('#food-search').val(''); $('#food-grams').val(100); $('#food-slider').val(100);
    $('#food-selected, #food-result, #food-custom-panel').prop('hidden', true);
    $('#food-custom-toggle').attr('aria-expanded', 'false');
    $('#food-custom-form')[0].reset();
    $('#food-result-empty').prop('hidden', false);
    $('#food-result-data, #food-nutrient-bars').empty();
    $('#food-status, #food-selection-error, #food-amount-error, #food-custom-error').text('');
    $('#food-form input, #food-custom-form input').attr('aria-invalid', 'false');
    renderCategories(); searchFood(); syncAmount(100);
    $('#food-search').trigger('focus');
    document.getElementById('calculator').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  // Persistent daily records and date navigation.
  function updateAddDate() {
    $('#food-add-date').text('추가할 기록 날짜: ' + date + (date === C.localDate() ? ' (오늘)' : ' (선택한 날짜)'));
    $('#food-add').text(date === C.localDate() ? '+ 오늘 식단에 추가하기' : '+ 선택 날짜 식단에 추가하기');
  }
  function loadDate(value) {
    if (!C.validDate(value)) { setError('#food-date', '#food-date-error', '올바른 날짜(1900~9999년)를 선택해주세요.'); return; }
    date = value;
    const loaded = S.load(date);
    record = loaded.record;
    $('#food-date').val(date);
    $('#food-goal').val(record.goal);
    setError('#food-date', '#food-date-error', '');
    setError('#food-goal', '#food-goal-error', '');
    $('#food-storage-status').text(loaded.warning);
    $('#food-status').text('');
    renderDiary();
  }
  function checkRollover() {
    const now = C.localDate();
    if (now !== today) {
      const followToday = date === today;
      today = now;
      if (followToday) loadDate(today);
    }
  }
  function persist() {
    const saved = S.save(date, record);
    $('#food-storage-status').text(saved.warning);
    return saved.ok;
  }
  function commitItems(items) {
    const next = { ...record, items };
    if (!S.validate(next)) throw new Error('식단 합계가 계산 가능한 범위를 벗어났습니다. 입력값을 줄여주세요.');
    record = next;
    persist(); renderDiary();
  }
  function renderDiary() {
    const total = C.totals(record.items);
    $('#food-diary-date').text(date + (date === C.localDate() ? ' · 오늘의 기록' : ' · 선택한 날짜의 기록') + ' · ' + record.items.length + '개 음식');
    $('#food-meal-list').html(C.meals.map(mealName => {
      const items = record.items.filter(item => item.meal === mealName);
      return '<section class="food-meal-group" aria-label="' + mealName + '"><h3><span>' + mealIcons[mealName] + ' ' + mealName + '</span><small>' + fmt(total.meals[mealName]) + ' kcal</small></h3>' +
        (items.length ? items.map(item => {
          const value = C.calculate(item.food, item.grams);
          return '<article class="food-meal-item"><strong>' + esc(item.food.name) + '</strong><p>' + fmt(item.grams, 1) + 'g · ' + fmt(value.kcal) + ' kcal</p><p>탄수화물 ' + gramsText(value.carbs) + ' · 단백질 ' + gramsText(value.protein) + ' · 지방 ' + gramsText(value.fat) + '</p><p class="food-small">' + esc(item.food.source) + '</p><div class="food-meal-item-actions"><button type="button" class="food-outline" data-edit="' + esc(item.id) + '" aria-label="' + esc(item.food.name) + ' 섭취량 수정">수정</button><button type="button" class="food-outline food-danger" data-delete="' + esc(item.id) + '" aria-label="' + esc(item.food.name) + ' 삭제">삭제</button></div></article>';
        }).join('') : '<p class="food-meal-empty">아직 추가한 음식이 없습니다.<br />음식을 검색하고 식단에 추가해보세요.</p>') + '</section>';
    }).join(''));
    $('#food-daily-kcal').html(fmt(total.kcal) + ' <small>kcal</small>');
    $('#food-daily-macros').html(C.nutrients.map(key => '<div class="food-macro-card"><span>' + names[key] + '</span><strong>' + (record.items.length && total.missing[key] === record.items.length ? '정보 없음' : fmt(total[key], 1) + 'g') + '</strong>' + (total.missing[key] ? '<span>' + total.missing[key] + '개 음식 정보 누락</span>' : '') + '</div>').join(''));
    updateDailyMacroChart(total);
    const max = Math.max(1, ...Object.values(total.meals));
    $('#food-meal-bars').html(C.meals.map(value => bar(mealIcons[value] + ' ' + value, total.meals[value], max, '#35c9a5', 'kcal', 0)).join(''));
    const progress = total.kcal / record.goal * 100;
    $('#food-progress').val(Math.min(100, progress)).attr('aria-valuetext', fmt(progress, 1) + '%');
    $('#food-progress-text').text(fmt(total.kcal) + ' / ' + fmt(record.goal, 1) + ' kcal · ' + fmt(progress, 1) + '%');
    updateAddDate();
  }
  function updateDailyMacroChart(total) {
    const missing = C.nutrients.some(key => total.missing[key] > 0);
    const shares = C.macroShares(total);
    const displayed = C.displayShares(shares);
    let offset = 0;
    $('#food-donut-parts').html(C.nutrients.map((key, index) => {
      const circle = '<circle cx="80" cy="80" r="59" pathLength="100" stroke="' + colors[key] + '" stroke-dasharray="' + shares[index] + ' ' + (100 - shares[index]) + '" stroke-dashoffset="' + (-offset) + '" />';
      offset += shares[index];
      return shares[index] > 0 ? circle : '';
    }).join(''));
    const hasEnergy = shares.some(value => value > 0);
    $('#food-donut-legend').html(C.nutrients.map((key, index) => '<p><span class="food-dot food-dot-' + key + '"></span>' + names[key] + ' <strong>' + (hasEnergy ? fmt(displayed[index], 1) + '%' : '비율 없음') + '</strong></p>').join(''));
    $('#food-donut').attr('aria-label', (missing ? '알려진 값만의 부분 분석. ' : '') + C.nutrients.map((key, index) => names[key] + ' ' + (hasEnergy ? fmt(displayed[index], 1) + '%' : '비율 없음')).join(', '));
    $('#food-missing-note').text(missing ? '영양소 정보가 누락된 음식이 있어 완전한 분석이 불가능합니다. 합계와 비율은 알려진 값만 반영한 부분 분석입니다.' : hasEnergy ? '등록된 세 영양소의 환산 에너지 구성입니다.' : '영양소 환산 에너지 합계가 0이므로 비율을 표시하지 않습니다.');
  }
  function addFoodToMeal() {
    checkRollover();
    if (!result || Date.now() - lastAdd < 700) return;
    try {
      const values = C.calculate(result.food, result.grams);
      const item = { id: uid(), foodId: result.food.id, food: { ...result.food }, grams: result.grams, ...values, meal, date, createdAt: new Date().toISOString(), source: result.food.source };
      commitItems([...record.items, item]);
      lastAdd = Date.now();
      $('#food-add').prop('disabled', true);
      setTimeout(() => $('#food-add').prop('disabled', false), 700);
      $('#food-status').text('✓ ' + (date === C.localDate() ? '오늘' : date) + ' 식단에 추가되었습니다!');
    } catch (error) { $('#food-status').text(error.message); }
  }
  function editPreview() {
    const item = editing && editing.item;
    if (!item) return false;
    try {
      const values = C.calculate(item.food, C.number($('#food-edit-grams').val()));
      setError('#food-edit-grams', '#food-edit-error', '');
      $('#food-edit-preview').text(fmt(values.kcal) + ' kcal · 탄수화물 ' + gramsText(values.carbs) + ' · 단백질 ' + gramsText(values.protein) + ' · 지방 ' + gramsText(values.fat));
      return true;
    } catch (error) { setError('#food-edit-grams', '#food-edit-error', error.message); $('#food-edit-preview').text(''); return false; }
  }
  function addCustomFood() {
    const food = { id: 'custom-' + uid(), name: $('#custom-name').val().trim(), category: '직접 입력', icon: '🍽️', baseGrams: C.number($('#custom-base').val()), kcal: C.number($('#custom-kcal').val()), source: '사용자 입력 데이터', checked: C.localDate() };
    C.nutrients.forEach(key => { const input = $('#custom-' + key)[0]; const value = input.value; food[key] = input.validity.badInput ? NaN : value.trim() === '' ? null : C.number(value); });
    $('#food-custom-form input').attr('aria-invalid', 'false');
    let invalidField = !food.name ? '#custom-name' : !C.finite(food.baseGrams) || food.baseGrams <= 0 ? '#custom-base' : !C.finite(food.kcal) || food.kcal < 0 ? '#custom-kcal' : null;
    C.nutrients.forEach(key => { if (food[key] !== null && (!C.finite(food[key]) || food[key] < 0)) invalidField = invalidField || '#custom-' + key; });
    if (invalidField || !C.validFood(food)) {
      setError(invalidField || '#custom-name', '#food-custom-error', '이름과 0보다 큰 기준 중량, 0 이상의 열량을 입력해주세요. 영양소는 빈칸 또는 0 이상의 숫자여야 합니다.');
      $(invalidField || '#custom-name').trigger('focus'); return;
    }
    try { C.calculate(food, 100); } catch (error) { $('#food-custom-error').text(error.message); return; }
    $('#food-custom-error').text('');
    foods.push(food); category = '전체'; $('#food-search').val('');
    renderCategories(); searchFood(); selectFood(food);
    $('#food-custom-panel').prop('hidden', true); $('#food-custom-toggle').attr('aria-expanded', 'false');
    calculateFood();
  }
  function initFaq() {
    const faq = [
      ['음식 칼로리는 어떻게 계산하나요?', '기준 열량 × 섭취량 ÷ 기준 중량으로 계산합니다. 예를 들어 기준 100g당 89kcal인 음식 150g은 133.5kcal이며 화면에는 약 134kcal로 표시합니다. 합산할 때는 반올림 전 값을 사용합니다.'],
      ['음식 100g당 칼로리는 무엇을 의미하나요?', '해당 음식의 먹을 수 있는 부분 100g에 들어 있는 열량입니다. 1개나 1인분을 뜻하지 않습니다. 껍질·뼈를 제외하는지와 조리 전후 기준을 음식 설명에서 확인해주세요.'],
      ['조리 방법에 따라 칼로리가 달라지나요?', '기름·양념의 첨가와 조리 중 수분 변화로 음식 100g당 영양성분이 달라질 수 있습니다. 조리된 중량에 생것의 데이터를 그대로 적용하지 말고 일치하는 조리 상태를 선택해주세요.'],
      ['같은 음식인데 데이터마다 칼로리가 다른 이유는 무엇인가요?', '품종, 부위, 수분 함량, 분석 시료와 조리 상태가 다르기 때문입니다. 식품 이름뿐 아니라 원문 설명과 데이터 기준을 함께 확인해주세요.'],
      ['탄수화물, 단백질, 지방은 어떻게 계산하나요?', '각 기준 영양소(g)에 섭취량 ÷ 기준 중량을 곱합니다. 도넛 차트는 g 비율이 아니라 탄수화물·단백질 4kcal/g, 지방 9kcal/g으로 환산한 에너지 비율이며, 원본 열량을 대체하지 않습니다.'],
      ['식품 포장지의 영양성분표와 계산 결과가 다른 이유는 무엇인가요?', '제품의 재료·배합·표시 단위와 반올림 방식이 다를 수 있습니다. 실제 섭취한 브랜드 제품의 영양성분표가 있으면 기준 중량과 수치를 직접 입력해주세요. mL를 g으로 임의 변환하지 마세요.'],
      ['하루 섭취 칼로리 목표는 어떻게 정하나요?', '기본 2000kcal는 편집 가능한 참고용 설정이며 개인별 권장량이 아닙니다. 권장 칼로리 계산기를 참고할 수 있지만 목표는 직접 입력해야 합니다. 특별한 영양 관리가 필요하면 전문가와 상의해주세요.'],
      ['음식 검색 결과에 없는 음식은 어떻게 추가하나요?', '음식 직접 입력하기에서 식품 포장지 등 확인 가능한 정보를 입력하세요. 칼로리만 입력해도 계산할 수 있으며 비어 있는 영양소는 정보 없음으로 표시합니다. 공식 데이터와 구분하여 저장됩니다.'],
      ['식단 기록은 어디에 저장되나요?', '현재 기기의 브라우저 localStorage에 날짜별로 저장됩니다. 브라우저 데이터를 삭제하면 기록도 사라집니다. 선택 날짜 전체 삭제는 확인 후 해당 날짜의 식단과 목표만 초기화하며, 다시 계산하기는 식단 기록을 지우지 않습니다.']
    ];
    $('#food-faq').html(faq.map(([question, answer], index) => '<div class="food-faq-item"><h3><button type="button" id="food-faq-button-' + index + '" aria-expanded="false" aria-controls="food-faq-answer-' + index + '">Q. ' + question + '</button></h3><div id="food-faq-answer-' + index + '" class="food-faq-answer" role="region" aria-labelledby="food-faq-button-' + index + '" hidden>' + answer + '</div></div>').join(''));
    $('#food-faq').on('click', 'button', function () { const open = $(this).attr('aria-expanded') !== 'true'; $(this).attr('aria-expanded', String(open)); $('#' + this.getAttribute('aria-controls')).prop('hidden', !open); });
  }
  $(function () {
    renderCategories(); searchFood(); loadDate(today); initFaq();
    $('#food-search').on('input', function (event) { if (event.originalEvent && event.originalEvent.isComposing) return; clearTimeout(searchTimer); searchTimer = setTimeout(searchFood, 180); }).on('compositionend', function () { clearTimeout(searchTimer); searchTimer = setTimeout(searchFood, 180); });
    $('#food-search').on('keydown', function (event) {
      if (event.originalEvent && event.originalEvent.isComposing) return;
      if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key) && renderedQuery !== this.value) { clearTimeout(searchTimer); searchFood(); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if ($('#food-search-results').prop('hidden')) searchFood();
        if (!matches.length) return;
        highlighted = highlighted < 0 ? (event.key === 'ArrowDown' ? 0 : matches.length - 1) : (highlighted + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
        $('#food-search-results [role="option"]').removeClass('is-highlighted');
        const option = $('#food-option-' + highlighted).addClass('is-highlighted');
        $(this).attr('aria-activedescendant', option.attr('id'));
        option[0].scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter' && highlighted >= 0 && !$('#food-search-results').prop('hidden')) {
        event.preventDefault(); selectFood(matches[highlighted]); highlighted = -1; $(this).removeAttr('aria-activedescendant'); $('#food-grams').trigger('focus');
      } else if (event.key === 'Escape') { $('#food-search-results').prop('hidden', true); $(this).attr('aria-expanded', 'false').removeAttr('aria-activedescendant'); highlighted = -1; }
    });
    $('#food-search-results').on('click', '[data-index]', function () { selectFood(matches[Number(this.dataset.index)]); $('#food-grams').trigger('focus'); });
    $('#food-categories').on('click', 'button', function () { clearTimeout(searchTimer); category = this.dataset.category; $('#food-categories button').attr('aria-pressed', 'false'); $(this).attr('aria-pressed', 'true'); searchFood(); });
    $('#food-grams').on('input', function () { syncAmount(C.number(this.value)); });
    $('#food-slider').on('input', function () { $('#food-grams').val(this.value); syncAmount(Number(this.value)); });
    $('#food-quick').on('click', 'button', function () { $('#food-grams').val(this.dataset.grams); syncAmount(Number(this.dataset.grams)); });
    $('#food-form').on('submit', function (event) { event.preventDefault(); calculateFood(); });
    $('#food-meal-options').on('click', 'button', function () { meal = this.dataset.meal; $('#food-meal-options button').attr('aria-pressed', 'false'); $(this).attr('aria-pressed', 'true'); });
    $('#food-add').on('click', addFoodToMeal);
    $('#food-reset').on('click', resetFoodCalculator);
    $('#food-custom-toggle').on('click', function () { const open = $(this).attr('aria-expanded') !== 'true'; $(this).attr('aria-expanded', String(open)); $('#food-custom-panel').prop('hidden', !open); if (open) $('#custom-name').trigger('focus'); });
    $('#food-custom-form').on('submit', function (event) { event.preventDefault(); addCustomFood(); }).on('input', 'input', function () { $(this).attr('aria-invalid', 'false'); $('#food-custom-error').text(''); });
    $('#food-date').on('change', function () { loadDate(this.value); });
    $('#food-prev, #food-next').on('click', function () { const next = new Date(date + 'T12:00:00'); next.setDate(next.getDate() + (this.id === 'food-prev' ? -1 : 1)); loadDate(C.localDate(next)); });
    $('#food-today').on('click', () => loadDate(C.localDate()));
    $('#food-goal').on('input', function () {
      checkRollover();
      const goal = C.number(this.value);
      const valid = C.finite(goal) && goal > 0 && C.finite(C.totals(record.items).kcal / goal * 100);
      setError(this, '#food-goal-error', valid ? '' : '0보다 큰 유효한 목표 칼로리를 입력해주세요. 마지막 유효한 목표를 유지합니다.');
      if (!valid) return;
      record = { ...record, goal }; persist(); renderDiary();
    });
    $('#food-meal-list').on('click', '[data-delete]', function () {
      checkRollover(); const id = this.dataset.delete;
      commitItems(record.items.filter(item => item.id !== id));
      $('#food-storage-status').text($('#food-storage-status').text() || '선택한 음식 기록을 삭제했습니다.');
    }).on('click', '[data-edit]', function () {
      checkRollover(); const item = record.items.find(value => value.id === this.dataset.edit); if (!item) return;
      editing = { item, date };
      $('#food-edit-name').text(item.food.name); $('#food-edit-grams').val(item.grams); editPreview();
      document.getElementById('food-edit-dialog').showModal(); $('#food-edit-grams').trigger('focus');
    });
    $('#food-edit-grams').on('input', editPreview);
    $('#food-edit-form').on('submit', function (event) {
      event.preventDefault(); if (!editing || !editPreview()) return;
      if (date !== editing.date) { $('#food-edit-error').text('기록 날짜가 변경되었습니다. 취소 후 다시 수정해주세요.'); return; }
      try {
        const grams = C.number($('#food-edit-grams').val());
        commitItems(record.items.map(item => item.id === editing.item.id ? { ...item, grams, ...C.calculate(item.food, grams), updatedAt: new Date().toISOString() } : item));
        document.getElementById('food-edit-dialog').close(); editing = null;
      } catch (error) { $('#food-edit-error').text(error.message); }
    });
    $('#food-edit-cancel').on('click', () => document.getElementById('food-edit-dialog').close());
    $('#food-clear').on('click', function () { clearingDate = date; $('#food-clear-description').text(date + '의 식단과 목표를 삭제합니다. 다른 날짜의 기록은 유지됩니다.'); document.getElementById('food-clear-dialog').showModal(); $('#food-clear-cancel').trigger('focus'); });
    $('#food-clear-cancel').on('click', () => document.getElementById('food-clear-dialog').close());
    $('#food-clear-confirm').on('click', function () { const cleared = S.clear(clearingDate); document.getElementById('food-clear-dialog').close(); if (cleared.ok) loadDate(date); else $('#food-storage-status').text(cleared.warning); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkRollover(); });
    window.addEventListener('focus', checkRollover);
    setInterval(checkRollover, 30000);
  });
})(jQuery);
