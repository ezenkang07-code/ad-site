(function ($) {
  const MACROS = [
    { key: 'carb', label: '탄수화물', gramsPerKcal: 1 / 4, previewId: '#previewCarb', kcalId: '#carbKcal', gramsId: '#carbGrams', percentId: '#carbPercent', barId: '#carbBar', barValueId: '#carbBarValue', donutId: '#donutCarbPercent' },
    { key: 'protein', label: '단백질', gramsPerKcal: 1 / 4, previewId: '#previewProtein', kcalId: '#proteinKcal', gramsId: '#proteinGrams', percentId: '#proteinPercent', barId: '#proteinBar', barValueId: '#proteinBarValue', donutId: '#donutProteinPercent' },
    { key: 'fat', label: '지방', gramsPerKcal: 1 / 9, previewId: '#previewFat', kcalId: '#fatKcal', gramsId: '#fatGrams', percentId: '#fatPercent', barId: '#fatBar', barValueId: '#fatBarValue', donutId: '#donutFatPercent' }
  ];
  const PRESETS = {
    balanced: [50, 20, 30],
    carb: [60, 15, 25],
    protein: [40, 30, 30]
  };
  const $calories = $('#dailyCalories');
  const $calorieSlider = $('#dailyCaloriesSlider');
  const $macroResultContent = $('#macroResultContent');
  const $macroAnalysis = $('#macroAnalysis');
  let latestResult = null;

  function formatNumber(value, digits) {
    const rounded = Number(value.toFixed(digits));
    return rounded.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: digits });
  }

  function formatKcal(value) {
    return Math.round(value).toLocaleString('ko-KR') + ' kcal';
  }

  function formatGrams(value) {
    return formatNumber(value, 1) + 'g';
  }

  function getMacroInput(key) {
    const raw = $('#' + key + 'Ratio').val().trim();
    return raw ? Number(raw) : NaN;
  }

  function getMacroValues() {
    return MACROS.map((macro) => getMacroInput(macro.key));
  }

  function getTotalMacroRatio(values) {
    const ratios = values || getMacroValues();
    return ratios.reduce((sum, value) => sum + value, 0);
  }

  function isRatioTotalValid(total) {
    return Number.isFinite(total) && Math.abs(total - 100) <= 1e-7;
  }

  function isHalfPointRatio(value) {
    return Number.isFinite(value) && Math.abs(value * 2 - Math.round(value * 2)) <= 1e-7;
  }

  function calculateMacroCalories(totalCalories, ratio) {
    return totalCalories * ratio / 100;
  }

  function calculateMacroGrams(calories, gramsPerKcal) {
    return calories * gramsPerKcal;
  }

  function clearError($input, errorId) {
    $input.removeClass('macro-invalid').attr('aria-invalid', 'false');
    $('#' + errorId).text('');
  }

  function setError($input, errorId, message) {
    $input.addClass('macro-invalid').attr('aria-invalid', 'true');
    $('#' + errorId).text(message);
  }

  function getCaloriesValue() {
    const raw = $calories.val().trim();
    const value = Number(raw);
    if (!raw || !Number.isFinite(value) || value < 500 || value > 5000) return null;
    return value;
  }

  function validateMacroInput() {
    let isValid = true;
    const rawCalories = $calories.val().trim();
    const calories = Number(rawCalories);
    const values = getMacroValues();

    clearError($calories, 'calorieError');
    $('#macroSumError, #normalizeError').text('');
    MACROS.forEach((macro) => clearError($('#' + macro.key + 'Ratio'), macro.key + 'RatioError'));

    if (!rawCalories || !Number.isFinite(calories) || calories <= 0 || calories < 500 || calories > 5000 || (calories - 500) % 50 !== 0) {
      setError($calories, 'calorieError', '하루 섭취 칼로리는 500~5,000 kcal 범위에서 50 kcal 단위로 입력해주세요.');
      isValid = false;
    }

    MACROS.forEach((macro, index) => {
      const raw = $('#' + macro.key + 'Ratio').val().trim();
      const value = values[index];
      if (!raw || !Number.isFinite(value) || value < 0 || value > 100) {
        setError($('#' + macro.key + 'Ratio'), macro.key + 'RatioError', macro.label + ' 비율은 0~100% 범위의 숫자로 입력해주세요.');
        isValid = false;
      } else if (!isHalfPointRatio(value)) {
        setError($('#' + macro.key + 'Ratio'), macro.key + 'RatioError', macro.label + ' 비율은 0.5% 단위로 입력해주세요.');
        isValid = false;
      }
    });

    const total = getTotalMacroRatio(values);
    if (!isRatioTotalValid(total)) {
      $('#macroSumError').text('영양소 비율의 합계가 100%가 되어야 합니다. 현재 합계: ' + formatNumber(total, 1) + '%');
      isValid = false;
    }

    if (!isValid) return null;

    const result = MACROS.map((macro, index) => {
      const kcal = calculateMacroCalories(calories, values[index]);
      return { ...macro, ratio: values[index], kcal, grams: calculateMacroGrams(kcal, macro.gramsPerKcal) };
    });
    const totalKcal = result.reduce((sum, macro) => sum + macro.kcal, 0);
    if (!Number.isFinite(totalKcal) || result.some((macro) => !Number.isFinite(macro.grams))) {
      $('#macroSumError').text('계산 결과를 확인할 수 없습니다. 입력값을 다시 확인해주세요.');
      return null;
    }

    return { calories, macros: result, totalKcal };
  }

  function setMacroRatio(key, value) {
    $('#' + key + 'Ratio').val(Number(value).toFixed(1).replace(/\.0$/, ''));
    $('#' + key + 'RatioSlider').val(value);
  }

  function setPresetState(preset) {
    $('.macro-preset').removeClass('is-selected').attr('aria-pressed', 'false');
    $('.macro-preset[data-preset="' + preset + '"]').addClass('is-selected').attr('aria-pressed', 'true');
  }

  function updateMacroDonutChart(values) {
    const total = getTotalMacroRatio(values);
    if (!isRatioTotalValid(total)) return;
    const carbEnd = values[0];
    const proteinEnd = values[0] + values[1];
    $('#macroDonut')
      .css('--carb-end', carbEnd + '%')
      .css('--protein-end', proteinEnd + '%')
      .attr('aria-label', '탄수화물 ' + formatNumber(values[0], 1) + '%, 단백질 ' + formatNumber(values[1], 1) + '%, 지방 ' + formatNumber(values[2], 1) + '% 도넛 차트');
  }

  function updateMacroPreview() {
    const values = getMacroValues();
    const total = getTotalMacroRatio(values);
    const calories = getCaloriesValue();
    const ratioValid = values.every((value) => Number.isFinite(value) && value >= 0 && value <= 100 && isHalfPointRatio(value)) && isRatioTotalValid(total);

    const totalLabel = Number.isFinite(total) ? formatNumber(total, 1) + '%' : '입력 확인';
    $('#macroTotal').text(totalLabel);
    $('#previewTotal').text(totalLabel);
    $('.macro-total-status').toggleClass('is-invalid', !ratioValid);

    if (!ratioValid) {
      $('#macroTotalMessage').text('영양소 비율의 합계가 100%가 되어야 합니다.');
      $('#previewMessage').addClass('is-invalid').text('영양소 비율의 합계를 100%로 맞춰주세요.');
      $('#macroPreviewValues').addClass('is-hidden');
      $('#macroSumError').text(Number.isFinite(total)
        ? '영양소 비율의 합계가 100%가 되어야 합니다. 현재 합계: ' + formatNumber(total, 1) + '%'
        : '탄수화물, 단백질, 지방 비율을 모두 입력해주세요.');
      return false;
    }

    $('#macroTotalMessage').text('✓ 영양소 비율 합계가 100%입니다.');
    $('#macroSumError').text('');
    $('#previewMessage').removeClass('is-invalid').text(calories === null
      ? '칼로리 입력을 확인하면 예상량을 미리 볼 수 있습니다.'
      : '입력한 칼로리와 현재 비율에 따른 계산 미리보기입니다.');

    if (calories === null) {
      $('#macroPreviewValues').addClass('is-hidden');
      return true;
    }

    MACROS.forEach((macro, index) => {
      const kcal = calculateMacroCalories(calories, values[index]);
      const grams = calculateMacroGrams(kcal, macro.gramsPerKcal);
      $(macro.previewId).text(formatGrams(grams));
    });
    $('#macroPreviewValues').removeClass('is-hidden');
    updateMacroDonutChart(values);
    return true;
  }

  function updateMacroBarChart(result) {
    const maxKcal = Math.max.apply(null, result.macros.map((macro) => macro.kcal)) || 1;
    result.macros.forEach((macro) => {
      $(macro.barId).css('width', (macro.kcal / maxKcal * 100) + '%');
      $(macro.barValueId).text(formatKcal(macro.kcal));
    });
    $('#macroKcalTotal').text(formatKcal(result.totalKcal));
  }

  function showMacroResult(result) {
    latestResult = result;
    $('#macroResultBadge').text('🥗 계산 완료!');
    $('#macroResultPrompt').addClass('macro-is-hidden');
    $('#resultDailyCalories').text(formatKcal(result.calories));

    result.macros.forEach((macro) => {
      $(macro.gramsId).text(formatGrams(macro.grams));
      $(macro.kcalId).text(formatKcal(macro.kcal));
      $(macro.percentId).text(formatNumber(macro.ratio, 1) + '%');
      $(macro.donutId).text(formatNumber(macro.ratio, 1) + '%');
    });

    updateMacroDonutChart(result.macros.map((macro) => macro.ratio));
    updateMacroBarChart(result);
    $macroResultContent.removeClass('macro-is-hidden');
    $macroAnalysis.removeClass('macro-is-hidden');
  }

  function invalidateResult() {
    if (!latestResult) return;
    latestResult = null;
    $('#macroResultBadge').text('🥑 영양소 계산 결과가 여기에 표시됩니다.');
    $('#macroResultPrompt').removeClass('macro-is-hidden');
    $macroResultContent.addClass('macro-is-hidden');
    $macroAnalysis.addClass('macro-is-hidden');
    $('.macro-bar').css('width', '0');
  }

  function applyMacroPreset(preset) {
    const values = PRESETS[preset];
    if (!values) return;
    MACROS.forEach((macro, index) => setMacroRatio(macro.key, values[index]));
    setPresetState(preset);
    MACROS.forEach((macro) => clearError($('#' + macro.key + 'Ratio'), macro.key + 'RatioError'));
    $('#macroSumError, #normalizeError').text('');
    updateMacroPreview();
    invalidateResult();
  }

  function normalizeMacroRatios() {
    $('#normalizeError').text('');
    const values = getMacroValues();
    const validValues = values.every((value) => Number.isFinite(value) && value >= 0 && value <= 100);
    const total = getTotalMacroRatio(values);
    if (!validValues) {
      $('#normalizeError').text('모든 비율을 0~100% 범위의 숫자로 입력해주세요.');
      return;
    }
    if (total <= 0) {
      $('#normalizeError').text('자동 조정 전에 영양소 비율을 먼저 입력해주세요.');
      return;
    }

    const first = Math.round((values[0] / total * 100) * 2) / 2;
    const second = Math.round((values[1] / total * 100) * 2) / 2;
    const third = Math.round((100 - first - second) * 2) / 2;
    if (third < 0 || third > 100) {
      $('#normalizeError').text('비율을 자동으로 조정할 수 없습니다. 입력값을 확인해주세요.');
      return;
    }

    [first, second, third].forEach((value, index) => setMacroRatio(MACROS[index].key, value));
    setPresetState('custom');
    updateMacroPreview();
    invalidateResult();
  }

  function initMacroSliders() {
    $calories.on('input', function () {
      const raw = this.value.trim();
      const value = Number(raw);
      const snapped = 500 + Math.round((value - 500) / 50) * 50;
      if (raw && Number.isFinite(value) && value >= 500 && value <= 5000) $calorieSlider.val(snapped);
      if (raw && Number.isFinite(value) && value >= 500 && value <= 5000 && (value - 500) % 50 === 0) clearError($calories, 'calorieError');
      else if ($calories.hasClass('macro-invalid')) setError($calories, 'calorieError', '하루 섭취 칼로리는 500~5,000 kcal 범위에서 50 kcal 단위로 입력해주세요.');
      updateMacroPreview();
      invalidateResult();
    });
    $calories.on('change blur', function () {
      const raw = this.value.trim();
      const value = Number(raw);
      if (raw && Number.isFinite(value) && value >= 500 && value <= 5000) {
        const snapped = Math.min(5000, Math.max(500, 500 + Math.round((value - 500) / 50) * 50));
        $calories.val(snapped);
        $calorieSlider.val(snapped);
        clearError($calories, 'calorieError');
        updateMacroPreview();
      }
    });
    $calorieSlider.on('input', function () {
      $calories.val(this.value);
      clearError($calories, 'calorieError');
      updateMacroPreview();
      invalidateResult();
    });

    MACROS.forEach((macro) => {
      const $input = $('#' + macro.key + 'Ratio');
      const $slider = $('#' + macro.key + 'RatioSlider');
      $input.on('input', function () {
        const raw = this.value.trim();
        const value = Number(raw);
        if (raw && Number.isFinite(value) && value >= 0 && value <= 100) $slider.val(value);
        if (raw && Number.isFinite(value) && value >= 0 && value <= 100 && isHalfPointRatio(value)) clearError($input, macro.key + 'RatioError');
        else if ($input.hasClass('macro-invalid')) setError($input, macro.key + 'RatioError', macro.label + ' 비율은 0~100% 범위에서 0.5% 단위로 입력해주세요.');
        setPresetState('custom');
        updateMacroPreview();
        invalidateResult();
      });
      $slider.on('input', function () {
        setMacroRatio(macro.key, Number(this.value));
        clearError($input, macro.key + 'RatioError');
        setPresetState('custom');
        updateMacroPreview();
        invalidateResult();
      });
    });
  }

  function bindPresets() {
    $('.macro-preset').on('click', function () {
      const preset = $(this).data('preset');
      if (preset === 'custom') {
        setPresetState('custom');
        return;
      }
      applyMacroPreset(preset);
    });
  }

  function bindFaq() {
    $('.macro-faq-question').on('click', function () {
      const $item = $(this).closest('.macro-faq-item');
      const wasOpen = $item.hasClass('is-open');
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      $('.macro-faq-item').removeClass('is-open').find('.macro-faq-question').attr('aria-expanded', 'false');
      if (reduceMotion) $('.macro-faq-answer').hide();
      else $('.macro-faq-answer').stop(true, true).slideUp(180);
      if (!wasOpen) {
        $item.addClass('is-open');
        $(this).attr('aria-expanded', 'true');
        if (reduceMotion) $item.find('.macro-faq-answer').show();
        else $item.find('.macro-faq-answer').stop(true, true).slideDown(180);
      }
    });
  }

  function scrollToCalculator() {
    const top = $('#calculator').offset().top - 88;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) window.scrollTo(0, top);
    else $('html, body').stop().animate({ scrollTop: top }, 420);
  }

  function resetMacroCalculator() {
    latestResult = null;
    $calories.val('2000').removeClass('macro-invalid').attr('aria-invalid', 'false');
    $calorieSlider.val('2000');
    MACROS.forEach((macro, index) => {
      setMacroRatio(macro.key, PRESETS.balanced[index]);
      clearError($('#' + macro.key + 'Ratio'), macro.key + 'RatioError');
    });
    clearError($calories, 'calorieError');
    $('#macroSumError, #normalizeError').text('');
    setPresetState('balanced');
    $('#macroResultBadge').text('🥑 영양소 계산 결과가 여기에 표시됩니다.');
    $('#macroResultPrompt').removeClass('macro-is-hidden');
    $macroResultContent.addClass('macro-is-hidden');
    $macroAnalysis.addClass('macro-is-hidden');
    $('.macro-bar').css('width', '0');
    updateMacroPreview();
    scrollToCalculator();
  }

  function bindActions() {
    $('#calculateMacros').on('click', function () {
      const result = validateMacroInput();
      updateMacroPreview();
      if (result) showMacroResult(result);
    });
    $('#normalizeRatios').on('click', normalizeMacroRatios);
    $('#resetMacros').on('click', resetMacroCalculator);
    $('.macro-form-panel input').on('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        $('#calculateMacros').trigger('click');
      }
    });
    $('.macro-hero-button').on('click', function (event) {
      event.preventDefault();
      const top = $('#calculator').offset().top - 88;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) window.scrollTo(0, top);
      else $('html, body').stop().animate({ scrollTop: top }, 450);
    });
  }

  function init() {
    initMacroSliders();
    bindPresets();
    bindFaq();
    bindActions();
    updateMacroPreview();
  }

  $(init);
})(jQuery);
