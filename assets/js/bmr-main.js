(function ($) {
  const ACTIVITY_FACTORS = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9
  };

  const $ageInput = $('#ageInput');
  const $heightInput = $('#bmrHeightInput');
  const $weightInput = $('#bmrWeightInput');
  const $heightSlider = $('#heightSliderBmr');
  const $weightSlider = $('#weightSliderBmr');
  const $bmrResultCard = $('#bmrResultCard');
  const $bmrValue = $('#bmrValue');
  const $bmrSummary = $('#bmrSummary');
  const $tdeeValue = $('#tdeeValue');
  const $barBmr = $('#barBmr');
  const $barTdee = $('#barTdee');
  const $bmrBarValue = $('#bmrBarValue');
  const $tdeeBarValue = $('#tdeeBarValue');

  function roundToTwo(value) {
    return Math.round(value * 100) / 100;
  }

  function numberWithCommas(value) {
    return Number(value).toLocaleString('ko-KR');
  }

  function clearErrorState($field) {
    if ($field && $field.length) {
      $field.removeClass('error');
    }
  }

  function setFieldError($field, message) {
    if ($field && $field.length) {
      $field.addClass('error');
      $field.next('.error-message').text(message);
    }
  }

  function hideMessages() {
    $('#genderError').text('');
    $('#ageError').text('');
    $('#heightError').text('');
    $('#weightError').text('');
    $('.gender-option').removeClass('error');
    clearErrorState($ageInput);
    clearErrorState($heightInput);
    clearErrorState($weightInput);
  }

  function syncHeightValue(value) {
    const safeValue = Math.min(Math.max(Number(value) || 0, 100), 220);
    $heightInput.val(safeValue.toFixed(1));
    $heightSlider.val(safeValue);
  }

  function syncWeightValue(value) {
    const safeValue = Math.min(Math.max(Number(value) || 0, 20), 200);
    $weightInput.val(safeValue.toFixed(1));
    $weightSlider.val(safeValue);
  }

  function getSelectedGender() {
    return $('.gender-option.is-selected').data('gender') || null;
  }

  function selectGender(gender) {
    $('.gender-option').removeClass('is-selected').attr('aria-pressed', 'false');
    const $selected = $('.gender-option[data-gender="' + gender + '"]');
    $selected.addClass('is-selected').attr('aria-pressed', 'true');
    $('#genderError').text('');
  }

  function getActivityFactor() {
    return Number($('.activity-option.is-selected').data('factor') || ACTIVITY_FACTORS.sedentary);
  }

  function calculateBMR(gender, age, heightCm, weightKg) {
    const parsedAge = Number(age);
    const parsedHeight = Number(heightCm);
    const parsedWeight = Number(weightKg);

    if (gender === 'male') {
      return 10 * parsedWeight + 6.25 * parsedHeight - 5 * parsedAge + 5;
    }

    return 10 * parsedWeight + 6.25 * parsedHeight - 5 * parsedAge - 161;
  }

  function getActivityLabel() {
    const $selected = $('.activity-option.is-selected');
    return $selected.find('.activity-name').text();
  }

  function updateEnergyBars(bmr, tdee) {
    const maxValue = Math.max(bmr, tdee, 2000) * 1.15;
    const bmrWidth = (bmr / maxValue) * 100;
    const tdeeWidth = (tdee / maxValue) * 100;

    $barBmr.css('width', bmrWidth + '%');
    $barTdee.css('width', tdeeWidth + '%');

    $bmrBarValue.text(numberWithCommas(Math.round(bmr)) + ' kcal');
    $tdeeBarValue.text(numberWithCommas(Math.round(tdee)) + ' kcal');
  }

  function showResult(data) {
    const { gender, age, height, weight, bmr, tdee } = data;

    const genderLabel = gender === 'male' ? '남성' : '여성';
    const labelText = gender === 'male' ? '남성 기준' : '여성 기준';

    $bmrValue.text(numberWithCommas(Math.round(bmr)) + ' kcal');
    $bmrSummary.text(
      '기초대사량 ' + numberWithCommas(Math.round(bmr)) + 'kcal • 활동량 기준 ' + getActivityLabel() + ' 선택'
    );

    $('#resultGender').text(genderLabel);
    $('#resultAge').text(age + '세');
    $('#resultHeight').text(height + 'cm');
    $('#resultWeight').text(weight + 'kg');
    $('#resultBmr').text(numberWithCommas(Math.round(bmr)) + ' kcal');
    $tdeeValue.text('약 ' + numberWithCommas(Math.round(tdee)) + ' kcal');

    updateEnergyBars(bmr, tdee);
    $bmrResultCard.addClass('visible');

    const resultText = '한 달 기준으로도 꾸준한 생활 습관이 중요합니다. ' + labelText + '으로 계산된 결과입니다.';
    $bmrSummary.attr('title', resultText);
  }

  function validateBMRInput() {
    hideMessages();

    const gender = getSelectedGender();
    let hasError = false;

    if (!gender) {
      $('#genderError').text('성별을 선택해주세요.');
      hasError = true;
    }

    const age = Number($ageInput.val());
    if (!age || age < 18 || age > 100) {
      setFieldError($ageInput, '나이는 18세 이상 100세 이하로 입력해주세요.');
      hasError = true;
    }

    const height = Number($heightInput.val());
    if (!height || height < 100 || height > 220) {
      setFieldError($heightInput, '키는 100cm 이상 220cm 이하로 입력해주세요.');
      hasError = true;
    }

    const weight = Number($weightInput.val());
    if (!weight || weight < 20 || weight > 200) {
      setFieldError($weightInput, '몸무게는 20kg 이상 200kg 이하로 입력해주세요.');
      hasError = true;
    }

    if (hasError) {
      return null;
    }

    const bmr = calculateBMR(gender, age, height, weight);
    const tdee = bmr * getActivityFactor();

    return {
      gender,
      age,
      height: roundToTwo(height),
      weight: roundToTwo(weight),
      bmr: roundToTwo(bmr),
      tdee: roundToTwo(tdee)
    };
  }

  function handleCalculation() {
    const result = validateBMRInput();
    if (!result) return;
    showResult(result);
  }

  function resetForm() {
    hideMessages();
    selectGender('male');
    $ageInput.val(25);
    syncHeightValue(170);
    syncWeightValue(65);
  }

  function bindRangeSync() {
    $heightInput.on('input', function () {
      syncHeightValue($(this).val());
      clearErrorState($heightInput);
    });

    $weightInput.on('input', function () {
      syncWeightValue($(this).val());
      clearErrorState($weightInput);
    });

    $heightSlider.on('input', function () {
      syncHeightValue($(this).val());
      clearErrorState($heightInput);
    });

    $weightSlider.on('input', function () {
      syncWeightValue($(this).val());
      clearErrorState($weightInput);
    });
  }

  function bindActivitySelection() {
    $('.activity-option').on('click', function () {
      $('.activity-option').removeClass('is-selected');
      $(this).addClass('is-selected');

      const factor = Number($(this).data('factor'));
      const bmr = Number($('#resultBmr').text().replace(/[^0-9.]/g, '')) || 0;
      const tdee = bmr * factor;

      if (bmr > 0) {
        $tdeeValue.text('약 ' + numberWithCommas(Math.round(tdee)) + ' kcal');
        updateEnergyBars(bmr, tdee);
      }
    });
  }

  function bindFaq() {
    $('.faq-question').on('click', function () {
      const $faqItem = $(this).closest('.faq-item');
      const isOpen = $faqItem.hasClass('active');

      $('.faq-item').removeClass('active');
      $('.faq-question').attr('aria-expanded', 'false');

      if (!isOpen) {
        $faqItem.addClass('active');
        $(this).attr('aria-expanded', 'true');
      }
    });
  }

  function init() {
    selectGender('male');
    bindRangeSync();
    bindActivitySelection();
    bindFaq();

    $('#calculateBmrBtn').on('click', handleCalculation);
    $('#resetBmrBtn').on('click', resetForm);

    $('.gender-option').on('click', function () {
      selectGender($(this).data('gender'));
    });

    $ageInput.on('keydown', function (event) {
      if (event.key === 'Enter') {
        handleCalculation();
      }
    });

    $heightInput.on('keydown', function (event) {
      if (event.key === 'Enter') {
        handleCalculation();
      }
    });

    $weightInput.on('keydown', function (event) {
      if (event.key === 'Enter') {
        handleCalculation();
      }
    });

    updateEnergyBars(1500, 1800);
    $bmrResultCard.removeClass('visible');
  }

  $(document).ready(init);
})(jQuery);
