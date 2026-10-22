(function ($) {
  const STORAGE_KEY = 'fitcalc-water-log-v1';
  const SCHEDULE = [
    { label: '오전', ratio: 25 },
    { label: '점심 전후', ratio: 25 },
    { label: '오후', ratio: 30 },
    { label: '저녁', ratio: 20 }
  ];
  const ACTIVITIES = { low: '낮음', moderate: '보통', high: '높음' };
  const CLIMATES = { cool: '서늘한 환경', mild: '일반적인 환경', hot: '더운 환경' };
  const GLASS_SIZES = [150, 200, 250, 300, 500];
  let latestReferenceMl = null;
  let todayLog = loadTodayLog();

  const $weight = $('#waterWeight');
  const $weightSlider = $('#waterWeightSlider');
  const $hours = $('#waterExerciseHours');
  const $minutes = $('#waterExerciseMinutes');

  function localDateKey(date) {
    const current = date || new Date();
    return [current.getFullYear(), String(current.getMonth() + 1).padStart(2, '0'), String(current.getDate()).padStart(2, '0')].join('-');
  }

  function formatNumber(value, decimals) {
    const rounded = Number(value.toFixed(decimals));
    return rounded.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  }

  function formatLiters(ml) {
    return formatNumber(ml / 1000, 2) + 'L';
  }

  function formatMilliliters(ml) {
    return Math.round(ml).toLocaleString('ko-KR') + 'mL';
  }

  function readStoredLog() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  function loadTodayLog() {
    const currentDate = localDateKey();
    const stored = readStoredLog();
    if (stored && stored.date === currentDate && Number.isFinite(stored.totalMl) && Array.isArray(stored.entries)) {
      return stored;
    }
    const emptyLog = { date: currentDate, totalMl: 0, entries: [] };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyLog));
    } catch (error) {
      // The log remains usable in memory when browser storage is unavailable.
    }
    return emptyLog;
  }

  function persistTodayLog() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todayLog));
    } catch (error) {
      $('#waterLogError').text('기기 저장 공간을 사용할 수 없습니다. 이 탭을 닫으면 기록이 사라질 수 있습니다.');
    }
  }

  function ensureTodayLogDate() {
    const currentDate = localDateKey();
    if (todayLog.date === currentDate) return;
    todayLog = { date: currentDate, totalMl: 0, entries: [] };
    persistTodayLog();
  }

  function clearError($field, errorId) {
    if ($field && $field.length) $field.removeClass('water-invalid').attr('aria-invalid', 'false');
    $('#' + errorId).text('');
  }

  function setError($field, errorId, message) {
    if ($field && $field.length) $field.addClass('water-invalid').attr('aria-invalid', 'true');
    $('#' + errorId).text(message);
  }

  function calculateBaseWaterIntake(weightKg) {
    return weightKg * 30;
  }

  function convertMlToLiters(milliliters) {
    return milliliters / 1000;
  }

  function calculateGlassCount(milliliters, glassSizeMl) {
    return milliliters / glassSizeMl;
  }

  function getSelectedActivity() {
    return $('.water-choice[data-activity].is-selected').data('activity') || '';
  }

  function getSelectedClimate() {
    return $('.water-choice[data-climate].is-selected').data('climate') || '';
  }

  function getSelectedGlassSize() {
    const value = Number($('#glassSize').val());
    return GLASS_SIZES.includes(value) ? value : null;
  }

  function getDuration() {
    const hoursRaw = $hours.val().trim();
    const minutesRaw = $minutes.val().trim();
    if (!hoursRaw || !minutesRaw) return null;
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return { hours, minutes, totalMinutes: hours * 60 + minutes };
  }

  function generateHydrationMessage(activity, duration, climate) {
    const messages = [];
    if (activity === 'low') messages.push('일상적인 수분 섭취 습관을 꾸준히 유지하는 데 참고해보세요.');
    if (activity === 'moderate') messages.push('일상 활동에 따라 갈증과 생활 패턴을 살펴 수분을 보충하세요.');
    if (activity === 'high') messages.push('활동량이 많은 경우 상황에 따라 추가적인 수분 보충이 필요할 수 있습니다.');
    if (duration && duration.totalMinutes >= 60) messages.push('운동 시간이 긴 경우 운동 중 땀 배출량에 따라 추가 수분 보충이 필요할 수 있습니다.');
    if (climate === 'hot') messages.push('더운 환경에서는 수분 손실이 증가할 수 있으므로 갈증과 활동 상황을 고려해 수분을 보충하세요.');
    if (climate === 'cool') messages.push('서늘한 환경에서도 개인의 갈증과 활동 상황에 맞춰 수분을 섭취하세요.');
    return messages;
  }

  function validateWaterInput() {
    let valid = true;
    const weightRaw = $weight.val().trim();
    const weight = Number(weightRaw);
    const duration = getDuration();
    const activity = getSelectedActivity();
    const climate = getSelectedClimate();
    const glassSize = getSelectedGlassSize();
    clearError($weight, 'waterWeightError');
    $hours.add($minutes).removeClass('water-invalid').attr('aria-invalid', 'false');
    $('#activityError, #climateError, #exerciseTimeError').text('');

    if (!weightRaw || !Number.isFinite(weight) || weight < 20 || weight > 200) {
      setError($weight, 'waterWeightError', '체중은 20kg 이상 200kg 이하의 숫자로 입력해주세요.');
      valid = false;
    }
    if (!activity || !Object.prototype.hasOwnProperty.call(ACTIVITIES, activity)) {
      $('#activityError').text('활동량을 선택해주세요.');
      valid = false;
    }
    if (!climate || !Object.prototype.hasOwnProperty.call(CLIMATES, climate)) {
      $('#climateError').text('활동 환경을 선택해주세요.');
      valid = false;
    }
    if (!duration || duration.hours < 0 || duration.hours > 12 || !Number.isInteger(duration.hours)) {
      setError($hours, 'exerciseTimeError', '운동 시간은 0~12시간의 정수로 입력해주세요.');
      valid = false;
    }
    if (!duration || duration.minutes < 0 || duration.minutes > 59 || !Number.isInteger(duration.minutes)) {
      setError($minutes, 'exerciseTimeError', '운동 분은 0~59분의 정수로 입력해주세요.');
      valid = false;
    }
    if (!glassSize || glassSize <= 0) {
      $('#glassSizeOptions').attr('aria-invalid', 'true');
      $('#glassSizeError').text('물컵 용량을 선택해주세요.');
      valid = false;
    }
    if (!valid) return null;

    const referenceMl = calculateBaseWaterIntake(weight);
    if (!Number.isFinite(referenceMl) || referenceMl <= 0) {
      setError($weight, 'waterWeightError', '물 섭취 참고량을 계산할 수 없습니다. 입력값을 확인해주세요.');
      return null;
    }
    return { weight, activity, climate, glassSize, ...duration, referenceMl };
  }

  function calculateHydrationSchedule(referenceMl) {
    const allocations = [];
    let assigned = 0;
    SCHEDULE.forEach((period, index) => {
      const amount = index === SCHEDULE.length - 1
        ? Math.round(referenceMl) - assigned
        : Math.round(referenceMl * period.ratio / 100);
      assigned += amount;
      allocations.push({ ...period, milliliters: amount });
    });
    return allocations;
  }

  function updateWaterVisualization(referenceMl) {
    const bottleCapacity = 2000;
    const fillPercent = Math.min(referenceMl / bottleCapacity * 100, 100);
    $('#waterBottleFill').css('--water-fill', fillPercent + '%');
    $('#waterBottleFill').attr('aria-valuenow', Math.round(fillPercent));
    $('#bottleReference').text(formatMilliliters(referenceMl));
    $('#waterBottleFill').attr('aria-label', '2,000mL 물병 대비 ' + formatNumber(fillPercent, 1) + '% 높이로 표시');
  }

  function renderHydrationSchedule(referenceMl) {
    const $schedule = $('#waterSchedule').empty();
    calculateHydrationSchedule(referenceMl).forEach((period) => {
      const $item = $('<div>').addClass('water-schedule-item');
      $('<span>').text(period.label + ' · ' + period.ratio + '%').appendTo($item);
      $('<strong>').text(formatMilliliters(period.milliliters)).appendTo($item);
      $('<small>').text('하루 참고량을 나눈 예시').appendTo($item);
      $schedule.append($item);
    });
  }

  function updateWaterProgress() {
    ensureTodayLogDate();
    const total = Number(todayLog.totalMl) || 0;
    $('#todayWaterTotal').text(formatMilliliters(total));
    if (!Number.isFinite(latestReferenceMl) || latestReferenceMl <= 0) {
      $('#todayWaterProgressText').text('참고량 계산 후 표시');
      $('#todayWaterProgress').css('width', '0%');
      $('#todayWaterProgressTrack').attr('aria-valuenow', '0').attr('aria-valuetext', '참고량 계산 후 표시');
      return;
    }
    const ratio = total / latestReferenceMl * 100;
    $('#todayWaterProgressText').text(formatNumber(ratio, 1) + '% · ' + formatMilliliters(total) + ' / ' + formatMilliliters(latestReferenceMl));
    $('#todayWaterProgress').css('width', Math.min(ratio, 100) + '%');
    $('#todayWaterProgressTrack').attr('aria-valuenow', Math.min(ratio, 100)).attr('aria-valuetext', formatNumber(ratio, 1) + '% · ' + formatMilliliters(total) + ' / ' + formatMilliliters(latestReferenceMl));
  }

  function addWaterRecord(milliliters) {
    const amount = Number(milliliters);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 20000) {
      $('#waterLogError').text('추가할 물은 1~20,000mL 범위의 숫자로 입력해주세요.');
      return false;
    }
    $('#waterLogError').text('');
    if (todayLog.date !== localDateKey()) todayLog = { date: localDateKey(), totalMl: 0, entries: [] };
    todayLog.totalMl += amount;
    todayLog.entries.push({ amount, timestamp: new Date().toISOString() });
    persistTodayLog();
    updateWaterProgress();
    return true;
  }

  function clearWaterRecords() {
    todayLog = { date: localDateKey(), totalMl: 0, entries: [] };
    $('#waterLogError').text('');
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todayLog));
    } catch (error) {
      $('#waterLogError').text('기록을 기기 저장소에서 삭제할 수 없습니다.');
    }
    updateWaterProgress();
  }

  function calculateEstimatedSweatLoss() {
    const preRaw = $('#preExerciseWeight').val().trim();
    const postRaw = $('#postExerciseWeight').val().trim();
    const fluidRaw = $('#exerciseFluidMl').val().trim();
    const urineRaw = $('#exerciseUrineMl').val().trim();
    const pre = Number(preRaw);
    const post = Number(postRaw);
    const fluidMl = Number(fluidRaw);
    const urineMl = urineRaw ? Number(urineRaw) : 0;
    $('#sweatError').text('');
    if (!preRaw || !postRaw || !fluidRaw || ![pre, post, fluidMl, urineMl].every(Number.isFinite) || pre < 20 || pre > 200 || post < 20 || post > 200 || fluidMl < 0 || urineMl < 0 || fluidMl > 20000 || urineMl > 20000) {
      $('#sweatError').text('운동 전후 체중은 20~200kg, 음료량과 소변량은 0~20,000mL 범위로 입력해주세요.');
      $('#sweatResult').addClass('water-is-hidden');
      return null;
    }
    const weightChangeL = pre - post;
    const sweatLossL = weightChangeL + convertMlToLiters(fluidMl) - convertMlToLiters(urineMl);
    if (!Number.isFinite(sweatLossL) || sweatLossL < 0) {
      $('#sweatError').text('추정 결과가 음수입니다. 체중과 운동 중 수분 입력을 확인해주세요.');
      $('#sweatResult').addClass('water-is-hidden');
      return null;
    }
    $('#sweatLiters').text('약 ' + formatNumber(sweatLossL, 2) + 'L');
    $('#sweatResult').removeClass('water-is-hidden');
    return sweatLossL;
  }

  function showWaterResult(result) {
    latestReferenceMl = result.referenceMl;
    $('#waterResultBadge').text('💧 계산 완료!');
    $('#waterResultPrompt').addClass('water-is-hidden');
    $('#waterMl').text(formatMilliliters(result.referenceMl));
    $('#waterLiters').text('약 ' + formatNumber(convertMlToLiters(result.referenceMl), 2) + 'L');
    const glassCount = calculateGlassCount(result.referenceMl, result.glassSize);
    $('#glassCapacityText').text(result.glassSize + 'mL 물컵 기준');
    $('#glassCount').text('약 ' + formatNumber(glassCount, 1) + '컵');
    $('#glassCountWhole').text('나누어 마실 때 약 ' + Math.ceil(glassCount) + '컵 환산');
    $('#resultWaterWeight').text(formatNumber(result.weight, 1) + 'kg');
    $('#resultWaterActivity').text(ACTIVITIES[result.activity]);
    $('#resultExerciseTime').text(result.hours + '시간 ' + result.minutes + '분');
    $('#resultClimate').text(CLIMATES[result.climate]);

    const messages = generateHydrationMessage(result.activity, result, result.climate);
    $('#waterGuidance').empty();
    messages.forEach((message) => $('<p>').text(message).appendTo('#waterGuidance'));
    $('#waterResultContent').removeClass('water-is-hidden');
    $('#waterAnalysis').removeClass('water-is-hidden');
    updateWaterVisualization(result.referenceMl);
    renderHydrationSchedule(result.referenceMl);
    $('#logCupSizeLabel').text(result.glassSize + 'mL');
    updateWaterProgress();
  }

  function invalidateWaterResult() {
    if (!latestReferenceMl) return;
    latestReferenceMl = null;
    $('#waterResultBadge').text('💧 물 섭취량 결과가 여기에 표시됩니다.');
    $('#waterResultPrompt').removeClass('water-is-hidden');
    $('#waterResultContent, #waterAnalysis').addClass('water-is-hidden');
    $('#waterBottleFill').css('--water-fill', '0%');
    updateWaterProgress();
  }

  function initWaterSliders() {
    $weight.on('input', function () {
      const raw = this.value.trim();
      const value = Number(raw);
      if (raw && Number.isFinite(value) && value >= 20 && value <= 200) $weightSlider.val(value);
      if (raw && Number.isFinite(value) && value >= 20 && value <= 200) clearError($weight, 'waterWeightError');
      else if ($weight.hasClass('water-invalid')) setError($weight, 'waterWeightError', '체중은 20~200kg 범위의 숫자로 입력해주세요.');
      invalidateWaterResult();
    });
    $weightSlider.on('input', function () {
      $weight.val(Number(this.value).toFixed(1));
      clearError($weight, 'waterWeightError');
      invalidateWaterResult();
    });
  }

  function bindSelections() {
    $('.water-choice[data-activity]').on('click', function () {
      $('.water-choice[data-activity]').removeClass('is-selected').attr('aria-pressed', 'false');
      $(this).addClass('is-selected').attr('aria-pressed', 'true');
      $('#activityError').text('');
      invalidateWaterResult();
    });
    $('.water-choice[data-climate]').on('click', function () {
      $('.water-choice[data-climate]').removeClass('is-selected').attr('aria-pressed', 'false');
      $(this).addClass('is-selected').attr('aria-pressed', 'true');
      $('#climateError').text('');
      invalidateWaterResult();
    });
    $('.water-cup-options button').on('click', function () {
      const size = Number($(this).data('glass'));
      $('#glassSize').val(size);
      $('.water-cup-options button').removeClass('is-selected').attr('aria-pressed', 'false');
      $(this).addClass('is-selected').attr('aria-pressed', 'true');
      $('#logCupSizeLabel').text(size + 'mL');
      $('#glassSizeError').text('');
      if (latestReferenceMl) {
        const count = calculateGlassCount(latestReferenceMl, size);
        $('#glassCapacityText').text(size + 'mL 물컵 기준');
        $('#glassCount').text('약 ' + formatNumber(count, 1) + '컵');
        $('#glassCountWhole').text('나누어 마실 때 약 ' + Math.ceil(count) + '컵 환산');
      }
    });
  }

  function bindDurationInputs() {
    $('.water-quick-time button').on('click', function () {
      const total = Number($(this).data('minutes'));
      $hours.val(Math.floor(total / 60));
      $minutes.val(total % 60);
      $('.water-quick-time button').removeClass('is-selected').attr('aria-pressed', 'false');
      $('.water-quick-time button[data-minutes="30"]').addClass('is-selected').attr('aria-pressed', 'true');
      $(this).addClass('is-selected').attr('aria-pressed', 'true');
      $hours.add($minutes).removeClass('water-invalid').attr('aria-invalid', 'false');
      $('#exerciseTimeError').text('');
      invalidateWaterResult();
    });
    $hours.add($minutes).on('input', function () {
      const value = Number(this.value);
      const valid = this.value.trim() && Number.isInteger(value) && value >= Number(this.min) && value <= Number(this.max);
      if (valid) {
        $(this).removeClass('water-invalid').attr('aria-invalid', 'false');
        $('#exerciseTimeError').text('');
      } else if ($(this).hasClass('water-invalid')) {
        $('#exerciseTimeError').text(this === $hours[0] ? '운동 시간은 0~12시간으로 입력해주세요.' : '운동 분은 0~59분으로 입력해주세요.');
      }
      const duration = getDuration();
      $('.water-quick-time button').each(function () {
        const isSelected = duration && duration.totalMinutes === Number($(this).data('minutes'));
        $(this).toggleClass('is-selected', Boolean(isSelected)).attr('aria-pressed', String(Boolean(isSelected)));
      });
      invalidateWaterResult();
    });
  }

  function bindSweatEstimator() {
    $('#calculateSweatLoss').on('click', calculateEstimatedSweatLoss);
  }

  function bindWaterLog() {
    $('#addCupWater').on('click', function () {
      addWaterRecord(getSelectedGlassSize());
    });
    $('#addCustomWater').on('click', function () {
      const $input = $('#customWaterMl');
      const raw = $input.val().trim();
      const amount = Number(raw);
      if (!raw || !Number.isFinite(amount) || amount <= 0 || amount > 20000) {
        setError($input, 'waterLogError', '추가할 물은 1~20,000mL 범위의 숫자로 입력해주세요.');
        return;
      }
      if (addWaterRecord(amount)) $input.val('').removeClass('water-invalid').attr('aria-invalid', 'false');
    });
    $('#clearWaterLog').on('click', clearWaterRecords);
    $('#customWaterMl').on('input', function () {
      if (this.value.trim() && Number.isFinite(Number(this.value)) && Number(this.value) > 0) clearError($(this), 'waterLogError');
      else if ($(this).hasClass('water-invalid')) setError($(this), 'waterLogError', '추가할 물은 1mL 이상의 숫자로 입력해주세요.');
    }).on('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        $('#addCustomWater').trigger('click');
      }
    });
    $(document).on('visibilitychange.waterLog', function () {
      if (!document.hidden) updateWaterProgress();
    });
    $(window).on('focus.waterLog', updateWaterProgress);
  }

  function bindFaq() {
    $('.water-faq-question').on('click', function () {
      const $item = $(this).closest('.water-faq-item');
      const wasOpen = $item.hasClass('is-open');
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      $('.water-faq-item').removeClass('is-open').find('.water-faq-question').attr('aria-expanded', 'false');
      if (reduceMotion) $('.water-faq-answer').hide();
      else $('.water-faq-answer').stop(true, true).slideUp(180);
      if (!wasOpen) {
        $item.addClass('is-open');
        $(this).attr('aria-expanded', 'true');
        if (reduceMotion) $item.find('.water-faq-answer').show();
        else $item.find('.water-faq-answer').stop(true, true).slideDown(180);
      }
    });
  }

  function resetWaterCalculator() {
    latestReferenceMl = null;
    $weight.val('65').removeClass('water-invalid').attr('aria-invalid', 'false');
    $weightSlider.val('65');
    $hours.val('0').removeClass('water-invalid').attr('aria-invalid', 'false');
    $minutes.val('30').removeClass('water-invalid').attr('aria-invalid', 'false');
    $('.water-choice[data-activity]').removeClass('is-selected').attr('aria-pressed', 'false');
    $('.water-choice[data-activity="moderate"]').addClass('is-selected').attr('aria-pressed', 'true');
    $('.water-choice[data-climate]').removeClass('is-selected').attr('aria-pressed', 'false');
    $('.water-choice[data-climate="mild"]').addClass('is-selected').attr('aria-pressed', 'true');
    $('#glassSize').val('250');
    $('.water-cup-options button').removeClass('is-selected').attr('aria-pressed', 'false');
    $('.water-cup-options button[data-glass="250"]').addClass('is-selected').attr('aria-pressed', 'true');
    $('#logCupSizeLabel').text('250mL');
    $('.water-error').text('');
    $('.water-number-wrap input').removeClass('water-invalid').attr('aria-invalid', 'false');
    $('#waterResultBadge').text('💧 물 섭취량 결과가 여기에 표시됩니다.');
    $('#waterResultPrompt').removeClass('water-is-hidden');
    $('#waterResultContent, #waterAnalysis').addClass('water-is-hidden');
    $('#waterBottleFill').css('--water-fill', '0%');
    $('#waterSchedule').empty();
    $('#sweatResult').addClass('water-is-hidden');
    $('#sweatError').text('');
    $('#preExerciseWeight, #postExerciseWeight').val('');
    $('#exerciseFluidMl, #exerciseUrineMl').val('0');
    $('.water-sweat-details').removeAttr('open');
    updateWaterProgress();
    const top = $('#calculator').offset().top - 88;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) window.scrollTo(0, top);
    else $('html, body').stop().animate({ scrollTop: top }, 420);
  }

  function bindActions() {
    $('#calculateWater').on('click', function () {
      const result = validateWaterInput();
      if (result) showWaterResult(result);
    });
    $('#resetWaterCalculator').on('click', resetWaterCalculator);
    $('.water-form-panel input').on('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        $('#calculateWater').trigger('click');
      }
    });
    $('.water-hero-button').on('click', function (event) {
      event.preventDefault();
      const top = $('#calculator').offset().top - 88;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) window.scrollTo(0, top);
      else $('html, body').stop().animate({ scrollTop: top }, 450);
    });
  }

  function init() {
    initWaterSliders();
    bindSelections();
    bindDurationInputs();
    bindSweatEstimator();
    bindWaterLog();
    bindFaq();
    bindActions();
    updateWaterProgress();
  }

  $(init);
})(jQuery);
