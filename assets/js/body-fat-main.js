(function ($) {
  const FIELDS = {
    age: { min: 18, max: 100, unit: '세', label: '나이', decimals: 0 },
    height: { min: 100, max: 220, unit: 'cm', label: '키', decimals: 1 },
    weight: { min: 20, max: 200, unit: 'kg', label: '체중', decimals: 1 },
    neck: { min: 20, max: 60, unit: 'cm', label: '목둘레', decimals: 1 },
    waist: { min: 40, max: 180, unit: 'cm', label: '허리둘레', decimals: 1 },
    hip: { min: 50, max: 180, unit: 'cm', label: '엉덩이둘레', decimals: 1 }
  };
  let latestResult = null;

  function fieldInput(key) {
    return $('#bodyFat' + key[0].toUpperCase() + key.slice(1));
  }

  function convertCmToInches(valueCm) {
    return valueCm / 2.54;
  }

  function calculateBodyFatPercentage(sex, heightCm, neckCm, waistCm, hipCm) {
    const heightIn = convertCmToInches(heightCm);
    const neckIn = convertCmToInches(neckCm);
    const waistIn = convertCmToInches(waistCm);

    if (sex === 'male') {
      const abdomenNeckIn = waistIn - neckIn;
      if (abdomenNeckIn <= 0) return NaN;
      return 86.010 * Math.log10(abdomenNeckIn) - 70.041 * Math.log10(heightIn) + 36.76;
    }

    if (sex === 'female') {
      const hipIn = convertCmToInches(hipCm);
      const circumferenceTermIn = waistIn + hipIn - neckIn;
      if (circumferenceTermIn <= 0) return NaN;
      return 163.205 * Math.log10(circumferenceTermIn) - 97.684 * Math.log10(heightIn) - 78.387;
    }

    return NaN;
  }

  function calculateFatMass(weightKg, bodyFatPercentage) {
    return weightKg * bodyFatPercentage / 100;
  }

  function calculateLeanBodyMass(weightKg, fatMassKg) {
    return weightKg - fatMassKg;
  }

  function formatNumber(value, decimals) {
    const rounded = Number(value.toFixed(decimals));
    return rounded.toLocaleString('ko-KR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  function clearError($field, errorId) {
    $field.removeClass('bf-invalid').attr('aria-invalid', 'false');
    $('#' + errorId).text('');
  }

  function setError($field, errorId, message) {
    $field.addClass('bf-invalid').attr('aria-invalid', 'true');
    $('#' + errorId).text(message);
  }

  function getSelectedSex() {
    return $('.bf-gender-option.is-selected').data('sex') || '';
  }

  function getFieldNameWithParticle(key) {
    return {
      age: '나이는',
      height: '키는',
      weight: '체중은',
      neck: '목둘레는',
      waist: '허리둘레는',
      hip: '엉덩이둘레는'
    }[key];
  }

  function clearAllFieldErrors() {
    Object.keys(FIELDS).forEach((key) => clearError(fieldInput(key), key + 'Error'));
    $('#sexError').text('');
  }

  function validateBodyFatInput() {
    clearAllFieldErrors();
    let valid = true;
    const sex = getSelectedSex();
    const values = {};

    if (!sex) {
      $('#sexError').text('계산에 사용할 성별 공식을 선택해주세요.');
      valid = false;
    }

    Object.entries(FIELDS).forEach(([key, field]) => {
      if (key === 'hip' && sex !== 'female') return;
      const $input = fieldInput(key);
      const raw = $input.val().trim();
      const value = Number(raw);
      if (!raw || !Number.isFinite(value) || value <= 0 || value < field.min || value > field.max) {
        setError($input, key + 'Error', getFieldNameWithParticle(key) + ' ' + field.min + field.unit + ' 이상 ' + field.max + field.unit + ' 이하로 입력해주세요.');
        valid = false;
      } else {
        values[key] = value;
      }
    });

    if (!valid) return null;

    const waistIn = convertCmToInches(values.waist);
    const neckIn = convertCmToInches(values.neck);
    const heightIn = convertCmToInches(values.height);
    if (sex === 'male' && waistIn - neckIn <= 0) {
      setError(fieldInput('waist'), 'waistError', '남성 공식에서는 허리둘레가 목둘레보다 커야 합니다. 측정값과 위치를 확인해주세요.');
      valid = false;
    }
    if (sex === 'female') {
      const hipIn = convertCmToInches(values.hip);
      if (waistIn + hipIn - neckIn <= 0) {
        setError(fieldInput('hip'), 'hipError', '허리·엉덩이·목둘레의 공식 입력값을 확인해주세요. 로그 입력은 0보다 커야 합니다.');
        valid = false;
      }
    }
    if (![waistIn, neckIn, heightIn].every(Number.isFinite) || heightIn <= 0) {
      setError(fieldInput('height'), 'heightError', '공식에 사용할 수 있는 키와 둘레 값을 입력해주세요.');
      valid = false;
    }
    if (!valid) return null;

    const bodyFatPercentage = calculateBodyFatPercentage(sex, values.height, values.neck, values.waist, values.hip);
    if (!Number.isFinite(bodyFatPercentage) || bodyFatPercentage <= 0 || bodyFatPercentage >= 100) {
      $('#sexError').text('계산 결과가 유효 범위를 벗어났습니다. 입력값과 측정 방법을 확인해주세요. 둘레 공식의 추정 한계도 고려해주세요.');
      return null;
    }

    const fatMass = calculateFatMass(values.weight, bodyFatPercentage);
    const leanMass = calculateLeanBodyMass(values.weight, fatMass);
    if (![fatMass, leanMass].every(Number.isFinite) || fatMass < 0 || leanMass < 0) {
      $('#sexError').text('체성분 계산 결과가 유효하지 않습니다. 입력값을 확인해주세요.');
      return null;
    }

    return { sex, ...values, bodyFatPercentage, fatMass, leanMass };
  }

  function updateBodyFatDonutChart(result) {
    const leanPercentage = 100 - result.bodyFatPercentage;
    $('#compositionDonut')
      .css('--bf-fat-share', result.bodyFatPercentage + '%')
      .attr('aria-label', '체지방 ' + formatNumber(result.bodyFatPercentage, 1) + '%, 제지방 ' + formatNumber(leanPercentage, 1) + '%');
    $('#donutCenter').text(formatNumber(result.bodyFatPercentage, 1) + '%');
    $('#donutFatPercent').text(formatNumber(result.bodyFatPercentage, 1) + '%');
    $('#donutLeanPercent').text(formatNumber(leanPercentage, 1) + '%');
    $('#donutFatMass').text(formatNumber(result.fatMass, 1) + 'kg');
    $('#donutLeanMass').text(formatNumber(result.leanMass, 1) + 'kg');
  }

  function updateBodyCompositionChart(result) {
    const totalMass = result.fatMass + result.leanMass;
    const maxMass = Math.max(result.fatMass, result.leanMass, totalMass, 1);
    $('#fatMassBar').css('width', (result.fatMass / maxMass * 100) + '%');
    $('#leanMassBar').css('width', (result.leanMass / maxMass * 100) + '%');
    $('#fatMassBarValue').text(formatNumber(result.fatMass, 1) + 'kg');
    $('#leanMassBarValue').text(formatNumber(result.leanMass, 1) + 'kg');
  }

  function showBodyFatResult(result) {
    latestResult = result;
    const sexLabel = result.sex === 'male' ? '남성 공식' : '여성 공식';
    $('#bodyFatResultBadge').text('📏 계산 완료!');
    $('#bodyFatResultPrompt').addClass('bf-is-hidden');
    $('#bodyFatPercentage').text(formatNumber(result.bodyFatPercentage, 1) + '%');
    $('#fatMass').text(formatNumber(result.fatMass, 1) + 'kg');
    $('#leanMass').text(formatNumber(result.leanMass, 1) + 'kg');
    $('#resultSex').text(sexLabel);
    $('#resultAge').text(result.age + '세');
    $('#resultHeight').text(formatNumber(result.height, 1) + 'cm');
    $('#resultWeight').text(formatNumber(result.weight, 1) + 'kg');
    $('#resultNeck').text(formatNumber(result.neck, 1) + 'cm');
    $('#resultWaist').text(formatNumber(result.waist, 1) + 'cm');
    $('#resultHipRow').toggleClass('bf-is-hidden', result.sex !== 'female');
    if (result.sex === 'female') $('#resultHip').text(formatNumber(result.hip, 1) + 'cm');
    updateBodyFatDonutChart(result);
    updateBodyCompositionChart(result);
    $('#bodyFatResultContent').removeClass('bf-is-hidden');
    $('#bodyFatAnalysis').removeClass('bf-is-hidden');
  }

  function invalidateResult() {
    if (!latestResult) return;
    latestResult = null;
    $('#bodyFatResultBadge').text('📏 체지방률 결과가 여기에 표시됩니다.');
    $('#bodyFatResultPrompt').removeClass('bf-is-hidden');
    $('#bodyFatResultContent, #bodyFatAnalysis').addClass('bf-is-hidden');
    $('#fatMassBar, #leanMassBar').css('width', '0');
  }

  function syncNumberToSlider($input, $slider, field) {
    const raw = $input.val().trim();
    const value = Number(raw);
    if (raw && Number.isFinite(value) && value >= field.min && value <= field.max) $slider.val(value);
  }

  function initBodyFatSliders() {
    const sliderFields = ['height', 'weight', 'neck', 'waist', 'hip'];
    sliderFields.forEach((key) => {
      const field = FIELDS[key];
      const $input = fieldInput(key);
      const $slider = $('#' + $input.attr('id') + 'Slider');
      $input.on('input', function () {
        const raw = this.value.trim();
        const value = Number(raw);
        syncNumberToSlider($input, $slider, field);
        if (raw && Number.isFinite(value) && value >= field.min && value <= field.max) clearError($input, key + 'Error');
        else if ($input.hasClass('bf-invalid')) setError($input, key + 'Error', getFieldNameWithParticle(key) + ' ' + field.min + field.unit + ' 이상 ' + field.max + field.unit + ' 이하로 입력해주세요.');
        invalidateResult();
      });
      $slider.on('input', function () {
        $input.val(Number(this.value).toFixed(1));
        clearError($input, key + 'Error');
        invalidateResult();
      });
    });
  }

  function initGenderFormulaSelection() {
    $('.bf-gender-option').on('click', function () {
      const sex = $(this).data('sex');
      $('.bf-gender-option').removeClass('is-selected').attr('aria-pressed', 'false');
      $(this).addClass('is-selected').attr('aria-pressed', 'true');
      $('#sexError').text('');
      $('#hipField').toggleClass('bf-is-hidden', sex !== 'female');
      invalidateResult();
    });
  }

  function bindAgeInput() {
    const $age = fieldInput('age');
    $age.on('input', function () {
      const raw = this.value.trim();
      const value = Number(raw);
      if (raw && Number.isInteger(value) && value >= FIELDS.age.min && value <= FIELDS.age.max) clearError($age, 'ageError');
      else if ($age.hasClass('bf-invalid')) setError($age, 'ageError', '나이는 18세 이상 100세 이하로 입력해주세요.');
      invalidateResult();
    });
  }

  function bindFaq() {
    $('.bf-faq-question').on('click', function () {
      const $item = $(this).closest('.bf-faq-item');
      const wasOpen = $item.hasClass('is-open');
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      $('.bf-faq-item').removeClass('is-open').find('.bf-faq-question').attr('aria-expanded', 'false');
      if (reduceMotion) $('.bf-faq-answer').hide();
      else $('.bf-faq-answer').stop(true, true).slideUp(180);
      if (!wasOpen) {
        $item.addClass('is-open');
        $(this).attr('aria-expanded', 'true');
        if (reduceMotion) $item.find('.bf-faq-answer').show();
        else $item.find('.bf-faq-answer').stop(true, true).slideDown(180);
      }
    });
  }

  function scrollToCalculator() {
    const top = $('#calculator').offset().top - 88;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) window.scrollTo(0, top);
    else $('html, body').stop().animate({ scrollTop: top }, 420);
  }

  function resetBodyFatCalculator() {
    latestResult = null;
    $('.bf-gender-option').removeClass('is-selected').attr('aria-pressed', 'false');
    $('#hipField').addClass('bf-is-hidden');
    $('#bodyFatAge').val('25').removeClass('bf-invalid').attr('aria-invalid', 'false');
    Object.keys(FIELDS).filter((key) => key !== 'age').forEach((key) => {
      const $input = fieldInput(key);
      const $slider = $('#' + $input.attr('id') + 'Slider');
      const defaults = { height: 170, weight: 65, neck: 38, waist: 80, hip: 95 };
      $input.val(defaults[key]).removeClass('bf-invalid').attr('aria-invalid', 'false');
      $slider.val(defaults[key]);
    });
    clearAllFieldErrors();
    $('#bodyFatResultBadge').text('📏 체지방률 결과가 여기에 표시됩니다.');
    $('#bodyFatResultPrompt').removeClass('bf-is-hidden');
    $('#bodyFatResultContent, #bodyFatAnalysis').addClass('bf-is-hidden');
    $('#fatMassBar, #leanMassBar').css('width', '0');
    scrollToCalculator();
  }

  function clearAllFieldErrors() {
    Object.keys(FIELDS).forEach((key) => clearError(fieldInput(key), key + 'Error'));
    $('#sexError').text('');
  }

  function bindActions() {
    $('#calculateBodyFat').on('click', function () {
      const result = validateBodyFatInput();
      if (result) showBodyFatResult(result);
    });
    $('#resetBodyFat').on('click', resetBodyFatCalculator);
    $('.bf-form-panel input').on('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        $('#calculateBodyFat').trigger('click');
      }
    });
    $('.bf-hero-button').on('click', function (event) {
      event.preventDefault();
      scrollToCalculator();
    });
  }

  function init() {
    initBodyFatSliders();
    initGenderFormulaSelection();
    bindAgeInput();
    bindFaq();
    bindActions();
  }

  $(init);
})(jQuery);
