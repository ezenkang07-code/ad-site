$(document).ready(function () {
  const DEFAULT_HEIGHT = 170;
  const DEFAULT_WEIGHT = 65;

  const BMI_CATEGORY_META = {
    저체중: {
      color: '#3b82f6',
      message: 'BMI 기준 저체중 범위에 해당합니다. 식사 상태와 전반적인 건강 상태를 함께 살펴보세요.'
    },
    정상: {
      color: '#22c55e',
      message: 'BMI 기준 정상 범위에 해당합니다. 규칙적인 식사와 신체 활동을 유지해보세요.'
    },
    '비만 전단계': {
      color: '#facc15',
      message: 'BMI 기준 비만 전단계에 해당합니다. 생활 습관과 신체 활동량을 점검해보세요.'
    },
    '1단계 비만': {
      color: '#f59e0b',
      message: 'BMI 기준 1단계 비만 범위에 해당합니다. 개인의 건강 상태에 맞는 관리 방법을 확인해보세요.'
    },
    '2단계 비만': {
      color: '#f97316',
      message: 'BMI 기준 2단계 비만 범위에 해당합니다. 필요한 경우 의료 전문가와 상담해보세요.'
    },
    '3단계 비만': {
      color: '#ef4444',
      message: 'BMI 기준 3단계 비만 범위에 해당합니다. BMI 외 다른 건강 지표도 함께 평가하는 것이 중요합니다.'
    }
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function setError(inputId, message) {
    const $input = $('#' + inputId);
    const $error = $('#' + inputId.replace('Input', 'Error'));

    $input.addClass('error');
    $error.text(message);
  }

  function clearError(inputId) {
    const $input = $('#' + inputId);
    const $error = $('#' + inputId.replace('Input', 'Error'));

    $input.removeClass('error');
    $error.text('');
  }

  function validateInput(type, value) {
    const trimmedValue = String(value).trim();

    if (trimmedValue === '') {
      return { valid: false, message: type === 'height' ? '키를 입력해주세요.' : '몸무게를 입력해주세요.' };
    }

    const numericValue = Number(trimmedValue);

    if (!Number.isFinite(numericValue)) {
      return { valid: false, message: '숫자만 입력할 수 있습니다.' };
    }

    if (type === 'height') {
      if (numericValue <= 0) {
        return { valid: false, message: '키는 0보다 커야 합니다.' };
      }

      if (numericValue < 80 || numericValue > 250) {
        return { valid: false, message: '키는 80cm 이상 250cm 이하로 입력해주세요.' };
      }
    }

    if (type === 'weight') {
      if (numericValue <= 0) {
        return { valid: false, message: '몸무게는 0보다 커야 합니다.' };
      }

      if (numericValue < 20 || numericValue > 300) {
        return { valid: false, message: '몸무게는 20kg 이상 300kg 이하로 입력해주세요.' };
      }
    }

    return { valid: true, numericValue };
  }

  function convertCmToMeter(heightCm) {
    return heightCm / 100;
  }

  function calculateBMI(heightCm, weightKg) {
    const heightMeter = convertCmToMeter(heightCm);
    return weightKg / (heightMeter * heightMeter);
  }

  function getBMICategory(bmiValue) {
    if (bmiValue < 18.5) {
      return '저체중';
    }

    if (bmiValue < 23) {
      return '정상';
    }

    if (bmiValue < 25) {
      return '비만 전단계';
    }

    if (bmiValue < 30) {
      return '1단계 비만';
    }

    if (bmiValue < 35) {
      return '2단계 비만';
    }

    return '3단계 비만';
  }

  function calculateNormalWeightRange(heightCm) {
    const heightMeter = convertCmToMeter(heightCm);
    const lowerBound = 18.5 * Math.pow(heightMeter, 2);
    const upperBound = 23 * Math.pow(heightMeter, 2);

    return {
      lowerBound,
      upperBound
    };
  }

  function updateBMIGauge(bmiValue) {
    const $pointer = $('#gaugePointer');
    const maxBmi = 40;
    const percent = clamp((bmiValue / maxBmi) * 100, 0, 100);

    $pointer.css({ left: percent + '%' });
  }

  function highlightCategoryRow(categoryName) {
    $('.criteria-table tbody tr').removeClass('is-active');
    $('.criteria-table tbody tr[data-category="' + categoryName + '"]').addClass('is-active');
  }

  function showBMIResult(bmiValue, categoryName, heightCm, weightKg) {
    const categoryInfo = BMI_CATEGORY_META[categoryName];
    const weightRange = calculateNormalWeightRange(heightCm);

    $('#bmiValue').text(bmiValue.toFixed(1));
    $('#bmiCategory').text(categoryName).css({
      backgroundColor: categoryInfo.color + '22',
      color: categoryInfo.color
    });

    $('#weightRange').text(
      '키 ' + heightCm + 'cm 기준 정상 BMI 체중 범위는 약 ' +
      weightRange.lowerBound.toFixed(1) + 'kg 이상 ~ ' +
      weightRange.upperBound.toFixed(1) + 'kg 미만입니다. 이 수치는 BMI 기준에 따른 참고 범위임을 안내드립니다.'
    );

    $('#resultHeight').text(heightCm + 'cm');
    $('#resultWeight').text(weightKg + 'kg');
    $('#resultBMI').text(bmiValue.toFixed(1));
    $('#resultCategory').text(categoryName);
    $('#resultTip').text(categoryInfo.message);
    $('#resultCard').addClass('visible');

    updateBMIGauge(bmiValue);
    highlightCategoryRow(categoryName);
  }

  function resetCalculator() {
    $('#heightInput').val(DEFAULT_HEIGHT).removeClass('error');
    $('#heightSlider').val(DEFAULT_HEIGHT);
    $('#weightInput').val(DEFAULT_WEIGHT).removeClass('error');
    $('#weightSlider').val(DEFAULT_WEIGHT);

    clearError('heightInput');
    clearError('weightInput');

    $('#bmiValue').text('--');
    $('#bmiCategory').text('분류 대기 중').css({
      backgroundColor: 'rgba(53, 201, 165, 0.1)',
      color: '#263238'
    });
    $('#weightRange').text('키와 몸무게를 입력해 주세요.');
    $('#resultHeight').text('-');
    $('#resultWeight').text('-');
    $('#resultBMI').text('-');
    $('#resultCategory').text('-');
    $('#resultTip').text('키와 몸무게를 입력한 후 계산 버튼을 눌러주세요.');
    $('#resultCard').removeClass('visible');
    updateBMIGauge(0);
    $('.criteria-table tbody tr').removeClass('is-active');
    $('.criteria-table tbody tr[data-category="정상"]').addClass('is-active');
  }

  function syncHeightInput() {
    const value = $('#heightInput').val();
    const result = validateInput('height', value);

    if (result.valid) {
      clearError('heightInput');
      $('#heightSlider').val(clamp(result.numericValue, 100, 220));
      return true;
    }

    setError('heightInput', result.message);
    return false;
  }

  function syncWeightInput() {
    const value = $('#weightInput').val();
    const result = validateInput('weight', value);

    if (result.valid) {
      clearError('weightInput');
      $('#weightSlider').val(clamp(result.numericValue, 20, 200));
      return true;
    }

    setError('weightInput', result.message);
    return false;
  }

  function initRangeSliders() {
    $('#heightInput').on('input', function () {
      const inputValue = Number($(this).val());
      if (!Number.isFinite(inputValue)) {
        $('#heightSlider').val(170);
        return;
      }

      const clampedValue = clamp(inputValue, 100, 220);
      $('#heightSlider').val(clampedValue);
      clearError('heightInput');
    });

    $('#heightSlider').on('input', function () {
      const value = $(this).val();
      $('#heightInput').val(value).removeClass('error');
      clearError('heightInput');
    });

    $('#weightInput').on('input', function () {
      const inputValue = Number($(this).val());
      if (!Number.isFinite(inputValue)) {
        $('#weightSlider').val(65);
        return;
      }

      const clampedValue = clamp(inputValue, 20, 200);
      $('#weightSlider').val(clampedValue);
      clearError('weightInput');
    });

    $('#weightSlider').on('input', function () {
      const value = $(this).val();
      $('#weightInput').val(value).removeClass('error');
      clearError('weightInput');
    });
  }

  function initFAQ() {
    $('.faq-question').on('click', function () {
      const $currentItem = $(this).closest('.faq-item');
      const isActive = $currentItem.hasClass('active');

      $('.faq-item').removeClass('active');
      $('.faq-question').attr('aria-expanded', false);

      if (!isActive) {
        $currentItem.addClass('active');
        $(this).attr('aria-expanded', true);
      }
    });
  }

  function initSmoothScroll() {
    $('a[href^="#"]').on('click', function (event) {
      const targetId = $(this).attr('href');
      if (!targetId || targetId === '#') {
        return;
      }

      const target = $(targetId);
      if (target.length) {
        event.preventDefault();
        $('html, body').animate({ scrollTop: target.offset().top - 90 }, 500);
      }
    });
  }

  $('#calculateBtn').on('click', function () {
    const heightCheck = validateInput('height', $('#heightInput').val());
    const weightCheck = validateInput('weight', $('#weightInput').val());

    if (!heightCheck.valid) {
      setError('heightInput', heightCheck.message);
      $('html, body').animate({ scrollTop: $('#calculator').offset().top - 90 }, 300);
      return;
    }

    if (!weightCheck.valid) {
      setError('weightInput', weightCheck.message);
      $('html, body').animate({ scrollTop: $('#calculator').offset().top - 90 }, 300);
      return;
    }

    clearError('heightInput');
    clearError('weightInput');

    const heightCm = Number(heightCheck.numericValue);
    const weightKg = Number(weightCheck.numericValue);
    const bmiValue = calculateBMI(heightCm, weightKg);
    const categoryName = getBMICategory(bmiValue);

    showBMIResult(bmiValue, categoryName, heightCm, weightKg);
  });

  $('#resetBtn').on('click', function () {
    resetCalculator();
    $('html, body').animate({ scrollTop: $('#calculator').offset().top - 90 }, 500);
  });

  $(document).on('keydown', function (event) {
    if (event.key === 'Enter' && $('input:focus, button:focus').length) {
      const $focused = $('input:focus, button:focus');
      if ($focused.is('input')) {
        $('#calculateBtn').trigger('click');
      }
    }
  });

  initRangeSliders();
  initFAQ();
  initSmoothScroll();
  resetCalculator();
});
