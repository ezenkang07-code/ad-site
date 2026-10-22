(function ($) {
  const EXERCISES = {
    walking: {
      label: '걷기', icon: '🚶', met: { light: 2.8, moderate: 3.5, vigorous: 5.0 },
      descriptions: { light: '천천히 걷기 (약 2 mph)', moderate: '일반적인 속도로 걷기 (약 3 mph)', vigorous: '빠르게 걷기 (약 4 mph)' }
    },
    running: {
      label: '달리기', icon: '🏃', met: { light: 6.0, moderate: 8.3, vigorous: 11.0 },
      descriptions: { light: '느린 조깅 (약 4 mph)', moderate: '일반적인 달리기 (약 5.5 mph)', vigorous: '빠른 달리기 (약 7 mph)' }
    },
    cycling: {
      label: '자전거', icon: '🚴', met: { light: 4.0, moderate: 6.8, vigorous: 10.0 },
      descriptions: { light: '여가용 저속 자전거 (10 mph 미만)', moderate: '보통 속도 자전거 (약 10–12 mph)', vigorous: '빠른 속도 자전거 (약 14–16 mph)' }
    },
    swimming: {
      label: '수영', icon: '🏊', met: { light: 4.5, moderate: 6.0, vigorous: 9.8 },
      descriptions: { light: '가벼운 레크리에이션 수영', moderate: '중간 강도 랩 수영', vigorous: '빠른 랩 수영' }
    },
    rope: {
      label: '줄넘기', icon: '🪢', met: { light: 8.0, moderate: 11.8, vigorous: 12.3 },
      descriptions: { light: '느린 속도로 줄넘기', moderate: '보통 리듬으로 줄넘기', vigorous: '빠른 리듬으로 줄넘기' }
    },
    hiking: {
      label: '등산', icon: '🥾', met: { light: 3.5, moderate: 5.3, vigorous: 7.0 },
      descriptions: { light: '완만한 길 걷기', moderate: '일반적인 하이킹', vigorous: '경사 있는 오르막 하이킹' }
    },
    yoga: {
      label: '요가', icon: '🧘', met: { light: 2.0, moderate: 2.5, vigorous: 3.0 },
      descriptions: { light: '호흡·이완 중심 요가', moderate: '일반적인 하타 요가', vigorous: '연속 동작 중심 요가' }
    },
    strength: {
      label: '근력 운동', icon: '🏋️', met: { light: 3.0, moderate: 3.5, vigorous: 6.0 },
      descriptions: { light: '가벼운 저항 운동', moderate: '일반적인 웨이트 트레이닝', vigorous: '고강도 웨이트 트레이닝' }
    },
    stairs: {
      label: '계단 오르기', icon: '🪜', met: { light: 4.0, moderate: 8.0, vigorous: 9.0 },
      descriptions: { light: '천천히 계단 오르기', moderate: '연속 계단 오르기', vigorous: '빠른 계단 오르기' }
    },
    dance: {
      label: '댄스', icon: '💃', met: { light: 3.5, moderate: 5.0, vigorous: 7.3 },
      descriptions: { light: '가벼운 사교 댄스', moderate: '일반적인 댄스', vigorous: '빠른 리듬의 에어로빅 댄스' }
    }
  };

  const INTENSITIES = { light: '가볍게', moderate: '보통', vigorous: '강하게' };
  const DURATION_COMPARISONS = [15, 30, 45, 60];
  const QUICK_DURATIONS = [15, 30, 45, 60, 90];
  const EXERCISE_COMPARISONS = ['walking', 'running', 'cycling', 'swimming', 'yoga'];
  let latestResult = null;

  const $weight = $('#exerciseWeight');
  const $weightSlider = $('#exerciseWeightSlider');
  const $hours = $('#exerciseHours');
  const $minutes = $('#exerciseMinutes');
  const $resultContent = $('#exerciseResultContent');
  const $analysis = $('#exerciseAnalysis');

  function formatCalories(value) {
    return Math.round(value).toLocaleString('ko-KR');
  }

  function getSelectedExercise() {
    return $('.ex-sport-option.is-selected').data('exercise') || '';
  }

  function getSelectedIntensity() {
    return $('.ex-intensity-option.is-selected').data('intensity') || '';
  }

  function getExerciseMET(exerciseKey, intensity) {
    const exercise = EXERCISES[exerciseKey];
    if (!exercise || !Object.prototype.hasOwnProperty.call(exercise.met, intensity)) return null;
    const met = Number(exercise.met[intensity]);
    return Number.isFinite(met) && met > 0 ? met : null;
  }

  function calculateExerciseCalories(met, weightKg, durationMinutes) {
    return met * 3.5 * weightKg / 200 * durationMinutes;
  }

  function calculateNetExerciseCalories(met, weightKg, durationMinutes) {
    return Math.max(0, met - 1) * 3.5 * weightKg / 200 * durationMinutes;
  }

  function calculateCaloriesByDuration(met, weightKg, durationMinutes) {
    return calculateExerciseCalories(met, weightKg, durationMinutes);
  }

  function clearError($field, errorId) {
    $field.removeClass('ex-invalid').attr('aria-invalid', 'false');
    $('#' + errorId).text('');
  }

  function setError($field, errorId, message) {
    $field.addClass('ex-invalid').attr('aria-invalid', 'true');
    $('#' + errorId).text(message);
  }

  function getTotalDuration() {
    const hoursRaw = $hours.val().trim();
    const minutesRaw = $minutes.val().trim();
    if (!hoursRaw || !minutesRaw) return null;
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return { hours, minutes, totalMinutes: hours * 60 + minutes };
  }

  function updateMETDisplay() {
    const exerciseKey = getSelectedExercise();
    const intensity = getSelectedIntensity();
    const exercise = EXERCISES[exerciseKey];
    const met = getExerciseMET(exerciseKey, intensity);
    $('#selectedMET').text(met === null ? '—' : met.toFixed(1).replace(/\.0$/, ''));
    $('#intensityDescription').text(exercise && exercise.descriptions[intensity] ? exercise.descriptions[intensity] : '운동과 강도를 선택해주세요.');
  }

  function updateQuickDurationSelection() {
    const time = getTotalDuration();
    $('.ex-quick-time button').each(function () {
      const selected = time && time.totalMinutes === Number($(this).data('minutes'));
      $(this).toggleClass('is-selected', Boolean(selected)).attr('aria-pressed', String(Boolean(selected)));
    });
  }

  function invalidateResult() {
    if (!latestResult) return;
    latestResult = null;
    $('#exerciseResultBadge').text('🔥 운동 칼로리 결과가 여기에 표시됩니다.');
    $('#exerciseResultPrompt').removeClass('ex-is-hidden');
    $resultContent.addClass('ex-is-hidden');
    $analysis.addClass('ex-is-hidden');
    $('#grossBar, #netBar').css('width', '0');
    $('#durationComparison, #exerciseComparison').empty();
  }

  function validateExerciseInput() {
    let valid = true;
    const exerciseKey = getSelectedExercise();
    const intensity = getSelectedIntensity();
    const weightRaw = $weight.val().trim();
    const weight = Number(weightRaw);
    const duration = getTotalDuration();
    const met = getExerciseMET(exerciseKey, intensity);

    $('#exerciseTypeError, #exerciseIntensityError, #exerciseTimeError').text('');
    clearError($weight, 'exerciseWeightError');
    $hours.add($minutes).removeClass('ex-invalid').attr('aria-invalid', 'false');

    if (!exerciseKey || !EXERCISES[exerciseKey]) {
      $('#exerciseTypeError').text('운동 종류를 선택해주세요.');
      valid = false;
    }
    if (!intensity || !Object.prototype.hasOwnProperty.call(INTENSITIES, intensity)) {
      $('#exerciseIntensityError').text('운동 강도를 선택해주세요.');
      valid = false;
    }
    if (!weightRaw || !Number.isFinite(weight) || weight <= 0 || weight < 20 || weight > 200) {
      setError($weight, 'exerciseWeightError', '체중은 20kg 이상 200kg 이하의 숫자로 입력해주세요.');
      valid = false;
    }
    if (!duration || duration.hours < 0 || duration.hours > 12 || !Number.isInteger(duration.hours)) {
      setError($hours, 'exerciseTimeError', '시간은 0시간 이상 12시간 이하의 정수로 입력해주세요.');
      valid = false;
    }
    if (!duration || duration.minutes < 0 || duration.minutes > 59 || !Number.isInteger(duration.minutes)) {
      setError($minutes, 'exerciseTimeError', '분은 0분 이상 59분 이하의 정수로 입력해주세요.');
      valid = false;
    }
    if (duration && duration.totalMinutes <= 0) {
      setError($minutes, 'exerciseTimeError', '운동 시간은 1분 이상 입력해주세요.');
      valid = false;
    }
    if (exerciseKey && intensity && met === null) {
      $('#exerciseIntensityError').text('선택한 운동과 강도의 MET 자료를 찾을 수 없습니다.');
      valid = false;
    }
    if (!valid) return null;

    const grossCalories = calculateExerciseCalories(met, weight, duration.totalMinutes);
    const netCalories = calculateNetExerciseCalories(met, weight, duration.totalMinutes);
    if (![grossCalories, netCalories].every(Number.isFinite) || grossCalories < 0 || netCalories < 0) {
      $('#exerciseTimeError').text('계산 결과를 확인할 수 없습니다. 입력값을 다시 확인해주세요.');
      return null;
    }

    return { exerciseKey, exercise: EXERCISES[exerciseKey], intensity, met, weight, ...duration, grossCalories, netCalories };
  }

  function updateExerciseChart(result) {
    const maxValue = Math.max(result.grossCalories, result.netCalories, 1);
    $('#grossBar').css('width', (result.grossCalories / maxValue * 100) + '%');
    $('#netBar').css('width', (result.netCalories / maxValue * 100) + '%');
    $('#grossBarValue').text(formatCalories(result.grossCalories) + ' kcal');
    $('#netBarValue').text(formatCalories(result.netCalories) + ' kcal');
  }

  function updateDurationComparison(result) {
    const maxCalories = calculateCaloriesByDuration(result.met, result.weight, 60);
    const $comparison = $('#durationComparison').empty();
    DURATION_COMPARISONS.forEach(function (duration) {
      const calories = calculateCaloriesByDuration(result.met, result.weight, duration);
      const current = duration === result.totalMinutes;
      const $item = $('<div>').addClass('ex-duration-item').toggleClass('is-current', current);
      $('<span>').text(duration + '분' + (current ? ' · 현재' : '')).appendTo($item);
      $('<strong>').text('약 ' + formatCalories(calories) + ' kcal').appendTo($item);
      const $track = $('<div>').addClass('ex-mini-track');
      $('<i>').css('width', (calories / maxCalories * 100) + '%').appendTo($track);
      $item.append($track);
      $comparison.append($item);
    });
    $('#durationContext').text(result.exercise.label + ' / ' + INTENSITIES[result.intensity] + ' / ' + formatCalories(result.weight) + 'kg 기준. 같은 MET 값이 유지된다고 가정한 예상치입니다.');
  }

  function compareExerciseCalories(weight, durationMinutes) {
    return EXERCISE_COMPARISONS.map(function (exerciseKey) {
      const exercise = EXERCISES[exerciseKey];
      const met = getExerciseMET(exerciseKey, 'moderate');
      return { exerciseKey, exercise, met, calories: calculateExerciseCalories(met, weight, durationMinutes) };
    }).sort((first, second) => second.calories - first.calories);
  }

  function updateExerciseComparison(result) {
    const comparisons = compareExerciseCalories(result.weight, result.totalMinutes);
    const maxCalories = Math.max.apply(null, comparisons.map((item) => item.calories)) || 1;
    const $comparison = $('#exerciseComparison').empty();
    comparisons.forEach(function (item) {
      const current = item.exerciseKey === result.exerciseKey;
      const $row = $('<div>').addClass('ex-compare-row').toggleClass('is-current', current);
      $('<span>').addClass('ex-compare-name').text(item.exercise.icon + ' ' + item.exercise.label).appendTo($row);
      const $track = $('<div>').addClass('ex-compare-track');
      $('<i>').addClass('ex-compare-bar').css('width', (item.calories / maxCalories * 100) + '%').appendTo($track);
      $('<strong>').text('약 ' + formatCalories(item.calories) + ' kcal').appendTo($row);
      $row.append($track);
      $comparison.append($row);
    });
    $('#exerciseComparisonContext').text(formatCalories(result.weight) + 'kg · ' + result.totalMinutes + '분 기준, 각 운동의 보통 강도 대표 MET로 계산한 예상치입니다.');
  }

  function showExerciseResult(result) {
    latestResult = result;
    $('#exerciseResultBadge').text('🔥 계산 완료!');
    $('#exerciseResultPrompt').addClass('ex-is-hidden');
    $('#grossCalories').text(formatCalories(result.grossCalories) + ' kcal');
    $('#netCalories').text(formatCalories(result.netCalories) + ' kcal');
    $('#resultExercise').text(result.exercise.label);
    $('#resultIntensity').text(INTENSITIES[result.intensity] + ' · ' + result.exercise.descriptions[result.intensity]);
    $('#resultDuration').text(result.hours + '시간 ' + result.minutes + '분 (' + result.totalMinutes + '분)');
    $('#resultWeight').text(result.weight.toFixed(1).replace(/\.0$/, '') + 'kg');
    $('#resultMET').text(result.met.toFixed(1).replace(/\.0$/, ''));
    $('#summaryGross').text(formatCalories(result.grossCalories) + ' kcal');
    $('#summaryDuration').text(result.hours + '시간 ' + result.minutes + '분');
    $('#summaryIntensity').text(INTENSITIES[result.intensity] + ' · MET ' + result.met.toFixed(1).replace(/\.0$/, ''));

    updateExerciseChart(result);
    updateDurationComparison(result);
    updateExerciseComparison(result);
    $resultContent.removeClass('ex-is-hidden');
    $analysis.removeClass('ex-is-hidden');
  }

  function initExerciseSelection() {
    $('.ex-sport-option').on('click', function () {
      $('.ex-sport-option').removeClass('is-selected').attr('aria-pressed', 'false');
      $(this).addClass('is-selected').attr('aria-pressed', 'true');
      $('#exerciseTypeError').text('');
      updateMETDisplay();
      invalidateResult();
    });
  }

  function initExerciseIntensity() {
    $('.ex-intensity-option').on('click', function () {
      $('.ex-intensity-option').removeClass('is-selected').attr('aria-pressed', 'false');
      $(this).addClass('is-selected').attr('aria-pressed', 'true');
      $('#exerciseIntensityError').text('');
      updateMETDisplay();
      invalidateResult();
    });
  }

  function initExerciseSliders() {
    $weight.on('input', function () {
      const rawValue = this.value.trim();
      const value = Number(rawValue);
      if (rawValue && Number.isFinite(value) && value >= 20 && value <= 200) $weightSlider.val(value);
      if (rawValue && Number.isFinite(value) && value >= 20 && value <= 200) clearError($weight, 'exerciseWeightError');
      else if ($weight.hasClass('ex-invalid')) setError($weight, 'exerciseWeightError', '체중은 20kg 이상 200kg 이하의 숫자로 입력해주세요.');
      invalidateResult();
    });
    $weightSlider.on('input', function () {
      $weight.val(Number(this.value).toFixed(1));
      clearError($weight, 'exerciseWeightError');
      invalidateResult();
    });
  }

  function bindDurationControls() {
    $('.ex-quick-time button').on('click', function () {
      const totalMinutes = Number($(this).data('minutes'));
      $hours.val(Math.floor(totalMinutes / 60));
      $minutes.val(totalMinutes % 60);
      $('#exerciseTimeError').text('');
      $hours.add($minutes).removeClass('ex-invalid').attr('aria-invalid', 'false');
      updateQuickDurationSelection();
      invalidateResult();
    });

    $hours.add($minutes).on('input', function () {
      const value = Number(this.value);
      const min = Number(this.min);
      const max = Number(this.max);
      if (this.value.trim() && Number.isFinite(value) && value >= min && value <= max && Number.isInteger(value)) {
        $(this).removeClass('ex-invalid').attr('aria-invalid', 'false');
        $('#exerciseTimeError').text('');
      } else if ($(this).hasClass('ex-invalid')) {
        $('#exerciseTimeError').text(this === $hours[0]
          ? '시간은 0시간 이상 12시간 이하의 정수로 입력해주세요.'
          : '분은 0분 이상 59분 이하의 정수로 입력해주세요.');
      }
      updateQuickDurationSelection();
      invalidateResult();
    });
  }

  function bindFaq() {
    $('.ex-faq-question').on('click', function () {
      const $item = $(this).closest('.ex-faq-item');
      const wasOpen = $item.hasClass('is-open');
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      $('.ex-faq-item').removeClass('is-open').find('.ex-faq-question').attr('aria-expanded', 'false');
      if (reduceMotion) $('.ex-faq-answer').hide();
      else $('.ex-faq-answer').stop(true, true).slideUp(180);
      if (!wasOpen) {
        $item.addClass('is-open');
        $(this).attr('aria-expanded', 'true');
        if (reduceMotion) $item.find('.ex-faq-answer').show();
        else $item.find('.ex-faq-answer').stop(true, true).slideDown(180);
      }
    });
  }

  function scrollToCalculator() {
    const top = $('#calculator').offset().top - 88;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) window.scrollTo(0, top);
    else $('html, body').stop().animate({ scrollTop: top }, 420);
  }

  function resetExerciseCalculator() {
    latestResult = null;
    $('.ex-sport-option').removeClass('is-selected').attr('aria-pressed', 'false');
    $('.ex-sport-option[data-exercise="walking"]').addClass('is-selected').attr('aria-pressed', 'true');
    $('.ex-intensity-option').removeClass('is-selected').attr('aria-pressed', 'false');
    $('.ex-intensity-option[data-intensity="moderate"]').addClass('is-selected').attr('aria-pressed', 'true');
    $weight.val('65').removeClass('ex-invalid').attr('aria-invalid', 'false');
    $weightSlider.val('65');
    $hours.val('0').removeClass('ex-invalid').attr('aria-invalid', 'false');
    $minutes.val('30').removeClass('ex-invalid').attr('aria-invalid', 'false');
    $('.ex-error').text('');
    updateQuickDurationSelection();
    updateMETDisplay();
    $('#exerciseResultBadge').text('🔥 운동 칼로리 결과가 여기에 표시됩니다.');
    $('#exerciseResultPrompt').removeClass('ex-is-hidden');
    $resultContent.addClass('ex-is-hidden');
    $analysis.addClass('ex-is-hidden');
    $('#grossBar, #netBar').css('width', '0');
    $('#durationComparison, #exerciseComparison').empty();
    scrollToCalculator();
  }

  function bindActions() {
    $('#calculateExercise').on('click', function () {
      const result = validateExerciseInput();
      if (result) showExerciseResult(result);
    });
    $('#resetExercise').on('click', resetExerciseCalculator);
    $('.ex-form-panel input').on('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        $('#calculateExercise').trigger('click');
      }
    });
    $('.ex-hero-button').on('click', function (event) {
      event.preventDefault();
      const top = $('#calculator').offset().top - 88;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) window.scrollTo(0, top);
      else $('html, body').stop().animate({ scrollTop: top }, 450);
    });
  }

  function init() {
    initExerciseSelection();
    initExerciseIntensity();
    initExerciseSliders();
    bindDurationControls();
    bindFaq();
    bindActions();
    updateMETDisplay();
    updateQuickDurationSelection();
  }

  $(init);
})(jQuery);
