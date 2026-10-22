(function ($) {
  const activityFactors = [1.2, 1.375, 1.55, 1.725, 1.9];
  const goalLabels = { maintain: '체중 유지', lose: '체중 감량', gain: '체중 증가' };
  let latestResult = null;

  const $age = $('#calAge');
  const $height = $('#calHeight');
  const $weight = $('#calWeight');
  const $heightSlider = $('#calHeightSlider');
  const $weightSlider = $('#calWeightSlider');
  const $resultCard = $('#calResultCard');

  function formatCalories(value) {
    return Math.round(value).toLocaleString('ko-KR');
  }

  function clearFieldError($field, messageId) {
    $field.removeClass('cal-invalid').attr('aria-invalid', 'false');
    $('#' + messageId).text('');
  }

  function setFieldError($field, messageId, message) {
    $field.addClass('cal-invalid').attr('aria-invalid', 'true');
    $('#' + messageId).text(message);
  }

  function validateFieldWhileTyping($field, messageId, minimum, maximum, label) {
    const rawValue = $field.val().trim();
    const value = Number(rawValue);
    const message = label + '는 ' + minimum + ' 이상 ' + maximum + ' 이하의 숫자로 입력해주세요.';
    const isValid = rawValue && Number.isFinite(value) && value >= minimum && value <= maximum;

    if (isValid) {
      clearFieldError($field, messageId);
    } else if ($field.hasClass('cal-invalid')) {
      setFieldError($field, messageId, message);
    }
    return isValid;
  }

  function getSelectedGender() {
    return $('.cal-gender-option.is-selected').data('gender') || '';
  }

  function getActivityFactor() {
    const factor = Number($('.cal-activity-option.is-selected').data('factor'));
    return activityFactors.includes(factor) ? factor : null;
  }

  function getSelectedGoal() {
    const goal = $('.cal-goal-option.is-selected').data('goal');
    return Object.prototype.hasOwnProperty.call(goalLabels, goal) ? goal : '';
  }

  function calculateBMR(gender, weightKg, heightCm, age) {
    const genderConstant = gender === 'male' ? 5 : gender === 'female' ? -161 : NaN;
    return (10 * weightKg) + (6.25 * heightCm) - (5 * age) + genderConstant;
  }

  function calculateTDEE(bmr, activityFactor) {
    return bmr * activityFactor;
  }

  function calculateMaintenanceCalories(tdee) {
    return tdee;
  }

  function getGoalMessage(goal, maintenanceCalories) {
    const value = formatCalories(maintenanceCalories);
    if (goal === 'lose') {
      return '현재 체중 유지를 위한 예상 에너지 필요량은 약 ' + value + ' kcal입니다. 체중 감량 계획에서는 개인의 건강 상태와 적절한 에너지 조절 범위를 함께 고려해야 합니다.';
    }
    if (goal === 'gain') {
      return '현재 체중 유지를 위한 예상 에너지 필요량은 약 ' + value + ' kcal입니다. 체중 증가 계획에서는 충분한 영양 섭취와 활동량, 개인의 건강 상태를 함께 고려해야 합니다.';
    }
    return '현재 체중 유지를 위한 예상 하루 에너지 필요량은 약 ' + value + ' kcal입니다.';
  }

  function validateCalorieInput() {
    let valid = true;
    const gender = getSelectedGender();
    const ageRaw = $age.val().trim();
    const heightRaw = $height.val().trim();
    const weightRaw = $weight.val().trim();
    const age = Number(ageRaw);
    const height = Number(heightRaw);
    const weight = Number(weightRaw);
    const activityFactor = getActivityFactor();
    const goal = getSelectedGoal();

    $('#calGenderError, #calActivityError, #calGoalError').text('');
    $age.removeClass('cal-invalid').attr('aria-invalid', 'false');
    $height.removeClass('cal-invalid').attr('aria-invalid', 'false');
    $weight.removeClass('cal-invalid').attr('aria-invalid', 'false');
    $('#calAgeError, #calHeightError, #calWeightError').text('');

    if (!gender) {
      $('#calGenderError').text('성별을 선택해주세요.');
      valid = false;
    }
    if (!ageRaw || !Number.isFinite(age) || age < 18 || age > 100) {
      setFieldError($age, 'calAgeError', '나이는 18세 이상 100세 이하의 숫자로 입력해주세요.');
      valid = false;
    }
    if (!heightRaw || !Number.isFinite(height) || height < 100 || height > 220) {
      setFieldError($height, 'calHeightError', '키는 100cm 이상 220cm 이하의 숫자로 입력해주세요.');
      valid = false;
    }
    if (!weightRaw || !Number.isFinite(weight) || weight < 20 || weight > 200) {
      setFieldError($weight, 'calWeightError', '몸무게는 20kg 이상 200kg 이하의 숫자로 입력해주세요.');
      valid = false;
    }
    if (activityFactor === null) {
      $('#calActivityError').text('활동량을 선택해주세요.');
      valid = false;
    }
    if (!goal) {
      $('#calGoalError').text('건강 관리 목표를 선택해주세요.');
      valid = false;
    }

    if (!valid) return null;

    const bmr = calculateBMR(gender, weight, height, age);
    const tdee = calculateTDEE(bmr, activityFactor);
    const maintenanceCalories = calculateMaintenanceCalories(tdee);
    if (![bmr, tdee, maintenanceCalories].every(Number.isFinite) || bmr <= 0 || tdee <= 0) {
      $('#calGoalError').text('계산 결과를 확인할 수 없습니다. 입력값을 다시 확인해주세요.');
      return null;
    }

    return { gender, age, height, weight, activityFactor, goal, bmr, tdee, maintenanceCalories };
  }

  function updateCalorieChart(bmr, tdee) {
    const sharedMaximum = Math.max(bmr, tdee) * 1.08;
    $('#calBmrBar').css('width', (bmr / sharedMaximum * 100) + '%');
    $('#calTdeeBar').css('width', (tdee / sharedMaximum * 100) + '%');
    $('#calBmrChartValue').text(formatCalories(bmr) + ' kcal');
    $('#calTdeeChartValue').text(formatCalories(tdee) + ' kcal');
  }

  function showCalorieResult(result, animate) {
    latestResult = result;
    const genderLabel = result.gender === 'male' ? '남성' : '여성';
    const activityLabel = $('.cal-activity-option.is-selected .cal-activity-title').text();
    const goalLabel = goalLabels[result.goal];

    $('#calResultBadge').text('🥗 계산 완료!');
    $('#calMaintenanceValue').text(formatCalories(result.maintenanceCalories));
    $('#calGoalMessage').text(getGoalMessage(result.goal, result.maintenanceCalories));
    $('#calResultGender').text(genderLabel);
    $('#calResultAge').text(result.age + '세');
    $('#calResultHeight').text(result.height.toFixed(1).replace(/\.0$/, '') + 'cm');
    $('#calResultWeight').text(result.weight.toFixed(1).replace(/\.0$/, '') + 'kg');
    $('#calResultActivity').text(activityLabel + ' (' + result.activityFactor + ')');
    $('#calResultBmr').text(formatCalories(result.bmr) + ' kcal');
    $('#calResultTdee').text(formatCalories(result.tdee) + ' kcal');
    $('#calResultGoal').text(goalLabel);
    updateCalorieChart(result.bmr, result.tdee);

    if (animate) {
      $resultCard.stop(true, true).hide().fadeIn(420);
    }
  }

  function calculateAndShow() {
    const result = validateCalorieInput();
    if (result) showCalorieResult(result, true);
  }

  function initCalorieSliders() {
    $height.on('input', function () {
      const value = Number(this.value);
      if (Number.isFinite(value) && value >= 100 && value <= 220) $heightSlider.val(value);
      validateFieldWhileTyping($height, 'calHeightError', 100, 220, '키');
    });
    $weight.on('input', function () {
      const value = Number(this.value);
      if (Number.isFinite(value) && value >= 20 && value <= 200) $weightSlider.val(value);
      validateFieldWhileTyping($weight, 'calWeightError', 20, 200, '몸무게');
    });
    $heightSlider.on('input', function () {
      $height.val(Number(this.value).toFixed(1));
      clearFieldError($height, 'calHeightError');
    });
    $weightSlider.on('input', function () {
      $weight.val(Number(this.value).toFixed(1));
      clearFieldError($weight, 'calWeightError');
    });
  }

  function updateLatestResult() {
    if (!latestResult) return;
    const factor = getActivityFactor();
    const goal = getSelectedGoal();
    if (factor === null || !goal) return;
    const bmr = calculateBMR(latestResult.gender, latestResult.weight, latestResult.height, latestResult.age);
    const tdee = calculateTDEE(bmr, factor);
    showCalorieResult({ ...latestResult, activityFactor: factor, goal, bmr, tdee, maintenanceCalories: calculateMaintenanceCalories(tdee) }, false);
  }

  function resetCalorieCalculator() {
    latestResult = null;
    $('.cal-gender-option').removeClass('is-selected').attr('aria-pressed', 'false');
    $('.cal-activity-option').removeClass('is-selected').attr('aria-pressed', 'false');
    $('.cal-activity-option[data-factor="1.2"]').addClass('is-selected').attr('aria-pressed', 'true');
    $('.cal-goal-option').removeClass('is-selected').attr('aria-pressed', 'false');
    $('.cal-goal-option[data-goal="maintain"]').addClass('is-selected').attr('aria-pressed', 'true');
    $age.val('25');
    $height.val('170').removeClass('cal-invalid').attr('aria-invalid', 'false');
    $weight.val('65').removeClass('cal-invalid').attr('aria-invalid', 'false');
    $heightSlider.val('170');
    $weightSlider.val('65');
    $('.cal-error').text('');
    $('.cal-number-wrap input').removeClass('cal-invalid').attr('aria-invalid', 'false');
    $('#calResultBadge').text('🥗 하루 칼로리 결과가 여기에 표시됩니다.');
    $('#calMaintenanceValue').text('--');
    $('#calGoalMessage').text('정보를 입력한 후 계산 버튼을 눌러주세요.');
    $('#calResultGender, #calResultAge, #calResultHeight, #calResultWeight, #calResultActivity, #calResultBmr, #calResultTdee, #calResultGoal').text('-');
    $('#calBmrBar, #calTdeeBar').css('width', '0');
    $('#calBmrChartValue, #calTdeeChartValue').text('-- kcal');
    $('html, body').stop().animate({ scrollTop: $('#calculator').offset().top - 90 }, 400);
  }

  function bindChoiceButtons() {
    $('.cal-gender-option').on('click', function () {
      $('.cal-gender-option').removeClass('is-selected').attr('aria-pressed', 'false');
      $(this).addClass('is-selected').attr('aria-pressed', 'true');
      $('#calGenderError').text('');
    });

    $('.cal-activity-option').on('click', function () {
      $('.cal-activity-option').removeClass('is-selected').attr('aria-pressed', 'false');
      $(this).addClass('is-selected').attr('aria-pressed', 'true');
      $('#calActivityError').text('');
      updateLatestResult();
    });

    $('.cal-goal-option').on('click', function () {
      $('.cal-goal-option').removeClass('is-selected').attr('aria-pressed', 'false');
      $(this).addClass('is-selected').attr('aria-pressed', 'true');
      $('#calGoalError').text('');
      updateLatestResult();
    });
  }

  function bindFaq() {
    $('.cal-faq-question').on('click', function () {
      const $item = $(this).closest('.cal-faq-item');
      const open = $item.hasClass('is-open');
      $('.cal-faq-item').removeClass('is-open').find('.cal-faq-question').attr('aria-expanded', 'false');
      $('.cal-faq-answer').stop(true, true).slideUp(180);
      if (!open) {
        $item.addClass('is-open');
        $(this).attr('aria-expanded', 'true');
        $item.find('.cal-faq-answer').stop(true, true).slideDown(180);
      }
    });
  }

  function init() {
    initCalorieSliders();
    bindChoiceButtons();
    bindFaq();
    $('#calCalculate').on('click', calculateAndShow);
    $('#calReset').on('click', resetCalorieCalculator);
    $age.on('input', function () {
      validateFieldWhileTyping($age, 'calAgeError', 18, 100, '나이');
    });
    $('.cal-number-wrap input').on('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        calculateAndShow();
      }
    });
    $('.cal-hero-btn').on('click', function (event) {
      const target = $(this.getAttribute('href'));
      if (target.length) {
        event.preventDefault();
        $('html, body').stop().animate({ scrollTop: target.offset().top - 90 }, 450);
      }
    });
  }

  $(init);
})(jQuery);