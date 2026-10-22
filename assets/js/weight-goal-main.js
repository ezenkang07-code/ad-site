(function ($) {
  const MAX_ESTIMATED_DAYS = 36500;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const $currentWeight = $('#currentWeight');
  const $targetWeight = $('#targetWeight');
  const $currentSlider = $('#currentWeightSlider');
  const $targetSlider = $('#targetWeightSlider');
  const $startDate = $('#startDate');
  const $customRate = $('#customWeeklyRate');
  const $resultContent = $('#weightResultContent');
  const $analysis = $('#weightAnalysis');
  let latestResult = null;

  function getLocalDateInputValue(date) {
    const localDate = date || new Date();
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function parseLocalDate(dateString) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString || '');
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '년 ' + month + '월 ' + day + '일';
  }

  function formatNumber(value, digits) {
    const rounded = Number(value.toFixed(digits === undefined ? 1 : digits));
    return rounded.toLocaleString('ko-KR', { maximumFractionDigits: digits === undefined ? 1 : digits });
  }

  function formatWeight(value) {
    return formatNumber(value, 1) + 'kg';
  }

  function formatWeeklyRate(value) {
    return Number(value).toLocaleString('ko-KR', { maximumSignificantDigits: 8 }) + 'kg / 주';
  }

  function clearError($field, errorId) {
    $field.removeClass('wg-invalid').attr('aria-invalid', 'false');
    $('#' + errorId).text('');
  }

  function setError($field, errorId, message) {
    $field.addClass('wg-invalid').attr('aria-invalid', 'true');
    $('#' + errorId).text(message);
  }

  function validateWeightWhileTyping($field, errorId, label) {
    const rawValue = $field.val().trim();
    const value = Number(rawValue);
    const isValid = rawValue && Number.isFinite(value) && value >= 20 && value <= 200;
    if (isValid) clearError($field, errorId);
    else if ($field.hasClass('wg-invalid')) {
      setError($field, errorId, label + '은 20kg 이상 200kg 이하의 숫자로 입력해주세요.');
    }
  }

  function getWeightGoalType(currentWeight, targetWeight) {
    if (targetWeight < currentWeight) return 'lose';
    if (targetWeight > currentWeight) return 'gain';
    return 'maintain';
  }

  function getGoalTypeLabel(goalType) {
    if (goalType === 'lose') return '체중 감량';
    if (goalType === 'gain') return '체중 증가';
    return '체중 유지';
  }

  function calculateWeightDifference(currentWeight, targetWeight) {
    return targetWeight - currentWeight;
  }

  function calculateEstimatedWeeks(weightDifference, weeklyRate) {
    if (weightDifference === 0) return 0;
    return Math.abs(weightDifference) / weeklyRate;
  }

  function calculateEstimatedDays(estimatedWeeks) {
    return Math.ceil(estimatedWeeks * 7);
  }

  function calculateTargetDate(startDateString, estimatedDays) {
    const startDate = parseLocalDate(startDateString);
    if (!startDate || !Number.isFinite(estimatedDays) || estimatedDays < 0) return null;
    const targetDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + estimatedDays);
    return Number.isNaN(targetDate.getTime()) ? null : targetDate;
  }

  function getSelectedRate() {
    const selectedRate = $('.wg-rate-option.is-selected').data('rate');
    if (selectedRate === 'custom') return Number($customRate.val());
    const rate = Number(selectedRate);
    return Number.isFinite(rate) ? rate : null;
  }

  function updateGoalType() {
    const current = Number($currentWeight.val());
    const target = Number($targetWeight.val());
    if (!Number.isFinite(current) || !Number.isFinite(target) || current <= 0 || target <= 0) {
      $('#goalTypeValue').text('입력값 비교 중');
      return;
    }
    $('#goalTypeValue').text(getGoalTypeLabel(getWeightGoalType(current, target)));
  }

  function clearAllErrors() {
    clearError($currentWeight, 'currentWeightError');
    clearError($targetWeight, 'targetWeightError');
    clearError($customRate, 'weeklyRateError');
    clearError($startDate, 'startDateError');
  }

  function validateWeightGoalInput() {
    clearAllErrors();

    const currentRaw = $currentWeight.val().trim();
    const targetRaw = $targetWeight.val().trim();
    const currentWeight = Number(currentRaw);
    const targetWeight = Number(targetRaw);
    const startDateValue = $startDate.val();
    const startDate = parseLocalDate(startDateValue);
    const goalType = Number.isFinite(currentWeight) && Number.isFinite(targetWeight)
      ? getWeightGoalType(currentWeight, targetWeight)
      : null;
    const selectedRate = getSelectedRate();
    let isValid = true;

    if (!currentRaw || !Number.isFinite(currentWeight) || currentWeight < 20 || currentWeight > 200) {
      setError($currentWeight, 'currentWeightError', '현재 체중은 20kg 이상 200kg 이하의 숫자로 입력해주세요.');
      isValid = false;
    }
    if (!targetRaw || !Number.isFinite(targetWeight) || targetWeight < 20 || targetWeight > 200) {
      setError($targetWeight, 'targetWeightError', '목표 체중은 20kg 이상 200kg 이하의 숫자로 입력해주세요.');
      isValid = false;
    }
    if (goalType !== 'maintain' && (!Number.isFinite(selectedRate) || selectedRate <= 0)) {
      setError($customRate, 'weeklyRateError', '주간 변화량은 0보다 큰 숫자로 입력해주세요.');
      isValid = false;
    }
    if (!startDateValue || !startDate) {
      setError($startDate, 'startDateError', '유효한 시작 날짜를 선택해주세요.');
      isValid = false;
    }
    if (!isValid) return null;

    const weightDifference = calculateWeightDifference(currentWeight, targetWeight);
    const estimatedWeeks = calculateEstimatedWeeks(weightDifference, selectedRate);
    const estimatedDays = calculateEstimatedDays(estimatedWeeks);
    if (![weightDifference, estimatedWeeks, estimatedDays].every(Number.isFinite) || estimatedDays > MAX_ESTIMATED_DAYS) {
      setError($customRate, 'weeklyRateError', '예상 기간이 너무 깁니다. 주간 변화량을 다시 확인해주세요.');
      return null;
    }

    const targetDate = calculateTargetDate(startDateValue, estimatedDays);
    if (!targetDate) {
      setError($startDate, 'startDateError', '계산할 수 있는 날짜 범위를 벗어났습니다.');
      return null;
    }

    return {
      currentWeight,
      targetWeight,
      weightDifference,
      goalType,
      weeklyRate: goalType === 'maintain' ? 0 : selectedRate,
      estimatedWeeks,
      estimatedDays,
      estimatedMonths: estimatedDays / 30.44,
      startDateValue,
      startDate,
      targetDate
    };
  }

  function generateWeightProjection(currentWeight, targetWeight, estimatedWeeks) {
    if (currentWeight === targetWeight) {
      return [{ week: 0, weight: currentWeight }, { week: 0, weight: targetWeight }];
    }

    const intervals = Math.min(5, Math.max(1, Math.ceil(estimatedWeeks / 2)));
    return Array.from({ length: intervals + 1 }, function (_, index) {
      const progress = index / intervals;
      return {
        week: estimatedWeeks * progress,
        weight: currentWeight + ((targetWeight - currentWeight) * progress)
      };
    });
  }

  function createSvgElement(tagName, attributes, textContent) {
    const element = document.createElementNS(SVG_NS, tagName);
    Object.keys(attributes || {}).forEach((key) => element.setAttribute(key, attributes[key]));
    if (textContent !== undefined) element.textContent = textContent;
    return element;
  }

  function updateWeightGoalChart(result) {
    const points = generateWeightProjection(result.currentWeight, result.targetWeight, result.estimatedWeeks);
    const plot = document.getElementById('weightChartPlot');
    const dataList = document.getElementById('weightChartData');
    const xStart = 72;
    const xEnd = 572;
    const yTop = 48;
    const yBottom = 211;
    const values = points.map((point) => point.weight);
    const minValue = Math.min.apply(null, values);
    const maxValue = Math.max.apply(null, values);
    const padding = Math.max((maxValue - minValue) * 0.2, 1);
    const chartMin = Math.max(0, minValue - padding);
    const chartMax = maxValue + padding;
    const maxWeek = result.estimatedWeeks || 1;
    const coordinates = points.map((point) => ({
      x: result.goalType === 'maintain'
        ? xStart + ((points.indexOf(point) / (points.length - 1)) * (xEnd - xStart))
        : xStart + ((point.week / maxWeek) * (xEnd - xStart)),
      y: yBottom - (((point.weight - chartMin) / (chartMax - chartMin)) * (yBottom - yTop)),
      week: point.week,
      weight: point.weight
    }));

    plot.replaceChildren();
    dataList.replaceChildren();
    const yAxisLabels = document.getElementById('weightChartYAxisLabels');
    yAxisLabels.replaceChildren();
    [0, 1, 2, 3].forEach((index) => {
      const fraction = index / 3;
      const value = chartMax - ((chartMax - chartMin) * fraction);
      const y = yTop + ((yBottom - yTop) * fraction);
      yAxisLabels.appendChild(createSvgElement('text', {
        x: 54,
        y: y + 4,
        'text-anchor': 'end',
        class: 'wg-chart-y-label'
      }, formatNumber(value, 1)));
    });

    const polyline = createSvgElement('polyline', {
      points: coordinates.map((point) => point.x + ',' + point.y).join(' '),
      class: 'wg-chart-line'
    });
    plot.appendChild(polyline);

    coordinates.forEach((point, index) => {
      const isEndpoint = index === 0 || index === coordinates.length - 1;
      const pointClass = index === 0 ? 'wg-chart-point-start' : index === coordinates.length - 1 ? 'wg-chart-point-target' : 'wg-chart-point-middle';
      plot.appendChild(createSvgElement('circle', {
        cx: point.x,
        cy: point.y,
        r: isEndpoint ? 7 : 4,
        class: pointClass
      }));

      const weekLabel = formatNumber(point.week, 1).replace(/\.0$/, '');
      plot.appendChild(createSvgElement('text', {
        x: point.x,
        y: Math.max(yTop - 8, point.y - 12),
        'text-anchor': 'middle',
        class: 'wg-chart-value-label'
      }, formatNumber(point.weight, 1) + 'kg'));
      plot.appendChild(createSvgElement('text', {
        x: point.x,
        y: yBottom + 22,
        'text-anchor': 'middle',
        class: 'wg-chart-week-label'
      }, weekLabel + '주'));

      const item = document.createElement('li');
      item.textContent = weekLabel + '주 · ' + formatWeight(point.weight);
      dataList.appendChild(item);
    });

    $('#weightChartDescription').text(
      '시작 체중 ' + formatWeight(result.currentWeight) + '에서 목표 체중 ' + formatWeight(result.targetWeight) + '까지의 예상 지점 ' + points.map((point) => formatNumber(point.week, 1) + '주 ' + formatWeight(point.weight)).join(', ')
    );
  }

  function updatePlanVisual(result) {
    const $track = $('#weightPlanTrack');
    $track.toggleClass('is-maintain', result.goalType === 'maintain');
    $('#planCurrentWeight').text(formatWeight(result.currentWeight));
    $('#planTargetWeight').text(formatWeight(result.targetWeight));

    let changeText = '현재 체중과 목표 체중이 같습니다';
    if (result.goalType === 'lose') changeText = formatWeight(Math.abs(result.weightDifference)) + ' 감량';
    if (result.goalType === 'gain') changeText = formatWeight(Math.abs(result.weightDifference)) + ' 증가';
    $('#planChange').text(changeText);
  }

  function showWeightGoalResult(result) {
    latestResult = result;
    const goalTypeLabel = getGoalTypeLabel(result.goalType);
    const differenceText = result.goalType === 'maintain'
      ? '0kg 변화'
      : formatWeight(Math.abs(result.weightDifference)) + (result.goalType === 'lose' ? ' 감량' : ' 증가');
    const weeksText = result.goalType === 'maintain' ? '0주' : '약 ' + formatNumber(result.estimatedWeeks, 1) + '주';
    const daysText = result.goalType === 'maintain' ? '0일' : '약 ' + result.estimatedDays + '일';
    const monthsText = result.goalType === 'maintain' ? '0개월' : '약 ' + formatNumber(result.estimatedMonths, 1) + '개월';
    const weeklyText = result.goalType === 'maintain' ? '해당 없음 (체중 유지)' : formatWeeklyRate(result.weeklyRate);
    let message;
    if (result.goalType === 'maintain') {
      message = '💚 현재 체중이 목표 체중과 같습니다. 목표까지 추가로 필요한 체중 변화량은 0kg입니다.';
    } else if (result.goalType === 'lose') {
      message = '목표까지 ' + formatWeight(Math.abs(result.weightDifference)) + ' 감량이 필요합니다.';
    } else {
      message = '목표까지 ' + formatWeight(Math.abs(result.weightDifference)) + ' 증가가 필요합니다.';
    }
    const targetDateLabel = formatLocalDate(result.targetDate);

    $('#weightResultBadge').text('🎯 계산 완료!');
    $('#weightResultPrompt').addClass('wg-is-hidden');
    $('#estimatedWeeks').text(weeksText);
    $('#estimatedDays').text(daysText);
    $('#estimatedMonths').text(monthsText);
    $('#estimatedDate').text(targetDateLabel);
    $('#goalMessage').text(message);
    $('#resultCurrentWeight').text(formatWeight(result.currentWeight));
    $('#resultTargetWeight').text(formatWeight(result.targetWeight));
    $('#resultGoalType').text(goalTypeLabel);
    $('#resultDifference').text(differenceText);
    $('#resultWeeklyRate').text(weeklyText);
    $('#resultStartDate').text(formatLocalDate(result.startDate));
    $('#summaryDifference').text(differenceText);
    $('#summaryDuration').text(result.goalType === 'maintain' ? '0일' : weeksText);
    $('#summaryDate').text(targetDateLabel);

    updateWeightGoalChart(result);
    updatePlanVisual(result);
    $resultContent.removeClass('wg-is-hidden');
    $analysis.removeClass('wg-is-hidden');
  }

  function invalidateResult() {
    if (!latestResult) return;
    latestResult = null;
    $('#weightResultBadge').text('🎯 목표 기간 결과가 여기에 표시됩니다.');
    $('#weightResultPrompt').removeClass('wg-is-hidden');
    $resultContent.addClass('wg-is-hidden');
    $analysis.addClass('wg-is-hidden');
    document.getElementById('weightChartPlot').replaceChildren();
    document.getElementById('weightChartData').replaceChildren();
  }

  function syncWeightInput($input, $slider) {
    const rawValue = $input.val().trim();
    const value = Number(rawValue);
    if (rawValue && Number.isFinite(value) && value >= 20 && value <= 200) $slider.val(value);
  }

  function initWeightSliders() {
    $currentWeight.on('input', function () {
      syncWeightInput($currentWeight, $currentSlider);
      validateWeightWhileTyping($currentWeight, 'currentWeightError', '현재 체중');
      updateGoalType();
      invalidateResult();
    });
    $targetWeight.on('input', function () {
      syncWeightInput($targetWeight, $targetSlider);
      validateWeightWhileTyping($targetWeight, 'targetWeightError', '목표 체중');
      updateGoalType();
      invalidateResult();
    });
    $currentSlider.on('input', function () {
      $currentWeight.val(Number(this.value).toFixed(1));
      clearError($currentWeight, 'currentWeightError');
      updateGoalType();
      invalidateResult();
    });
    $targetSlider.on('input', function () {
      $targetWeight.val(Number(this.value).toFixed(1));
      clearError($targetWeight, 'targetWeightError');
      updateGoalType();
      invalidateResult();
    });
  }

  function bindRateOptions() {
    $('.wg-rate-option').on('click', function () {
      $('.wg-rate-option').removeClass('is-selected').attr('aria-pressed', 'false');
      $(this).addClass('is-selected').attr('aria-pressed', 'true');
      const isCustom = $(this).data('rate') === 'custom';
      $('#customRateGroup').toggleClass('wg-is-hidden', !isCustom);
      clearError($customRate, 'weeklyRateError');
      invalidateResult();
      if (isCustom) $customRate.trigger('focus');
    });

    $customRate.on('input', function () {
      const value = Number(this.value);
      if (this.value.trim() && Number.isFinite(value) && value > 0) clearError($customRate, 'weeklyRateError');
      else if ($customRate.hasClass('wg-invalid')) setError($customRate, 'weeklyRateError', '주간 변화량은 0보다 큰 숫자로 입력해주세요.');
      invalidateResult();
    });
  }

  function bindDateInput() {
    const today = getLocalDateInputValue();
    $startDate.val(today);
    $startDate.on('change input', function () {
      const selected = this.value;
      if (parseLocalDate(selected)) clearError($startDate, 'startDateError');
      else if ($startDate.hasClass('wg-invalid')) setError($startDate, 'startDateError', '유효한 시작 날짜를 선택해주세요.');
      invalidateResult();
    });
  }

  function bindFaq() {
    $('.wg-faq-question').on('click', function () {
      const $item = $(this).closest('.wg-faq-item');
      const wasOpen = $item.hasClass('is-open');
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      $('.wg-faq-item').removeClass('is-open').find('.wg-faq-question').attr('aria-expanded', 'false');
      if (reduceMotion) $('.wg-faq-answer').hide();
      else $('.wg-faq-answer').stop(true, true).slideUp(180);
      if (!wasOpen) {
        $item.addClass('is-open');
        $(this).attr('aria-expanded', 'true');
        if (reduceMotion) $item.find('.wg-faq-answer').show();
        else $item.find('.wg-faq-answer').stop(true, true).slideDown(180);
      }
    });
  }

  function scrollToCalculator() {
    const top = $('#calculator').offset().top - 88;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo(0, top);
      return;
    }
    $('html, body').stop().animate({ scrollTop: top }, 420);
  }

  function resetWeightGoalCalculator() {
    latestResult = null;
    $currentWeight.val('70');
    $targetWeight.val('65');
    $currentSlider.val('70');
    $targetSlider.val('65');
    $customRate.val('');
    $('.wg-rate-option').removeClass('is-selected').attr('aria-pressed', 'false');
    $('.wg-rate-option[data-rate="0.25"]').addClass('is-selected').attr('aria-pressed', 'true');
    $('#customRateGroup').addClass('wg-is-hidden');
    clearAllErrors();
    $startDate.val(getLocalDateInputValue());
    $('#goalTypeValue').text('체중 감량');
    $('#weightResultBadge').text('🎯 목표 기간 결과가 여기에 표시됩니다.');
    $('#weightResultPrompt').removeClass('wg-is-hidden');
    $resultContent.addClass('wg-is-hidden');
    $analysis.addClass('wg-is-hidden');
    document.getElementById('weightChartPlot').replaceChildren();
    document.getElementById('weightChartData').replaceChildren();
    $('#weightPlanTrack').removeClass('is-maintain');
    scrollToCalculator();
  }

  function calculateAndShow() {
    const result = validateWeightGoalInput();
    if (result) showWeightGoalResult(result);
  }

  function bindCalculatorActions() {
    $('#calculateWeightGoal').on('click', calculateAndShow);
    $('#resetWeightGoal').on('click', resetWeightGoalCalculator);
    $('.wg-number-wrap input').on('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        calculateAndShow();
      }
    });
    $('.wg-hero-button').on('click', function (event) {
      const $target = $(this.getAttribute('href'));
      if (!$target.length) return;
      event.preventDefault();
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.scrollTo(0, $target.offset().top - 88);
      } else {
        $('html, body').stop().animate({ scrollTop: $target.offset().top - 88 }, 460);
      }
    });
  }

  function init() {
    initWeightSliders();
    bindRateOptions();
    bindDateInput();
    bindFaq();
    bindCalculatorActions();
    updateGoalType();
  }

  $(init);
})(jQuery);
