/**
 * FITCALC - Header Component (헤더 컴포넌트)
 * 독립적으로 동작하는 헤더 컴포넌트 스크립트입니다.
 */
(function () {
  'use strict';

  let headerIdleTimer = null;

  // 전체 계산기 목록 정의
  const CALCULATORS = [
    { key: 'bmi', label: '⚖️ BMI 계산기', href: 'bmi.html' },
    { key: 'bmr', label: '🔥 기초대사량 계산기', href: 'bmr.html' },
    { key: 'calorie', label: '🥗 권장 칼로리 계산기', href: 'calorie.html' },
    { key: 'goal', label: '🎯 목표 체중 기간 계산기', href: 'weight-goal.html' },
    { key: 'weightlog', label: '📈 체중 변화 분석기', href: 'weight-log.html' },
    { key: 'exercise', label: '🏃 운동 칼로리 계산기', href: 'exercise.html' },
    { key: 'macros', label: '🥑 영양소 비율 계산기', href: 'macros.html' },
    { key: 'bodyfat', label: '📏 체지방률 추정 계산기', href: 'body-fat.html' },
    { key: 'water', label: '💧 물 섭취량 계산기', href: 'water.html' },
    { key: 'food', label: '🍱 음식 칼로리 계산기', href: 'food-calorie.html' }
  ];

  // 현재 활성화된 페이지 키 감지
  function detectActivePage() {
    if (window.FITCALC_PAGE && window.FITCALC_PAGE.page) {
      return window.FITCALC_PAGE.page;
    }
    if (document.body && document.body.dataset && document.body.dataset.fitcalcPage) {
      return document.body.dataset.fitcalcPage;
    }
    const path = window.location.pathname.toLowerCase();
    if (path.includes('bmi')) return 'bmi';
    if (path.includes('bmr')) return 'bmr';
    if (path.includes('calorie') && !path.includes('food')) return 'calorie';
    if (path.includes('weight-goal')) return 'goal';
    if (path.includes('weight-log')) return 'weightlog';
    if (path.includes('exercise')) return 'exercise';
    if (path.includes('macros')) return 'macros';
    if (path.includes('body-fat')) return 'bodyfat';
    if (path.includes('water')) return 'water';
    if (path.includes('food')) return 'food';
    if (path.includes('index') || path.endsWith('/') || path === '') return 'home';
    return 'bmi';
  }

  // 헤더 마크업 생성
  function createHeaderMarkup(options) {
    const opts = options || {};
    const logo = opts.logo || 'FITCALC';
    const logoHref = opts.logoHref || 'index.html';
    const activePage = opts.activePage || detectActivePage();
    const isCalculator = CALCULATORS.some(function (c) { return c.key === activePage; });
    const guideHref = activePage === 'home' ? '#guide' : 'index.html#guide';

    const dropdownLinksHtml = CALCULATORS.map(function (calc) {
      const isActive = activePage === calc.key;
      return `<a href="${calc.href}" class="dropdown-link ${isActive ? 'is-active' : ''}" data-nav-key="${calc.key}" ${isActive ? 'aria-current="page"' : ''}>${calc.label}</a>`;
    }).join('\n                ');

    return `
      <header class="header">
        <div class="container header-inner">
          <a href="${logoHref}" class="logo" aria-label="${logo} 홈으로 이동">${logo}</a>

          <button class="nav-toggle" type="button" aria-label="메뉴 열기" aria-expanded="false">
            <span></span>
            <span></span>
            <span></span>
          </button>

          <nav class="nav" aria-label="주요 메뉴">
            <a href="index.html" class="nav-link ${activePage === 'home' ? 'is-active' : ''}" data-nav-key="home" ${activePage === 'home' ? 'aria-current="page"' : ''}>HOME</a>
            <div class="nav-dropdown ${isCalculator ? 'is-active' : ''}">
              <button class="nav-dropdown-toggle ${isCalculator ? 'is-active' : ''}" type="button" aria-expanded="false" aria-haspopup="true" aria-controls="calculatorDropdownMenu" data-nav-key="calculator">
                CALCULATOR <span class="dropdown-caret" aria-hidden="true">⌄</span>
              </button>
              <div class="nav-dropdown-menu" id="calculatorDropdownMenu">
                ${dropdownLinksHtml}
              </div>
            </div>
            <a href="${guideHref}" class="nav-link" data-nav-key="guide">GUIDE</a>
          </nav>
        </div>
      </header>
    `.trim();
  }

  // 헤더 이벤트 바인딩 (메뉴 열기/닫기, 드롭다운 키보드 조작 등)
  function bindHeaderEvents(container) {
    const $root = window.jQuery ? window.jQuery(container) : null;
    const headerEl = container.querySelector ? container.querySelector('.header') : null;
    if (!headerEl) return;

    if ($root) {
      const $header = $root.find('.header');
      const $toggle = $root.find('.nav-toggle');
      const $dropdown = $root.find('.nav-dropdown');
      const $dropdownToggle = $root.find('.nav-dropdown-toggle');

      function setDropdownOpen(isOpen) {
        $dropdown.toggleClass('is-open', isOpen);
        $dropdownToggle.attr('aria-expanded', String(isOpen));
      }

      $toggle.off('click.headerToggle').on('click.headerToggle', function () {
        const isOpen = $header.hasClass('nav-open');
        $header.toggleClass('nav-open', !isOpen);
        $(this).attr('aria-expanded', String(!isOpen));
        $(this).attr('aria-label', isOpen ? '메뉴 열기' : '메뉴 닫기');
      });

      $dropdownToggle.off('.calculatorDropdown').on('click.calculatorDropdown', function (e) {
        e.stopPropagation();
        setDropdownOpen($dropdownToggle.attr('aria-expanded') !== 'true');
      }).on('keydown.calculatorDropdown', function (event) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          setDropdownOpen(true);
          $dropdown.find('.dropdown-link').first().trigger('focus');
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setDropdownOpen($dropdownToggle.attr('aria-expanded') !== 'true');
        }
        if (event.key === 'Escape') setDropdownOpen(false);
      });

      $dropdown.off('keydown.calculatorDropdown').on('keydown.calculatorDropdown', '.dropdown-link', function (event) {
        const $links = $dropdown.find('.dropdown-link');
        const currentIndex = $links.index(this);
        if (event.key === 'Escape') {
          event.preventDefault();
          setDropdownOpen(false);
          $dropdownToggle.trigger('focus');
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          $links.eq((currentIndex + direction + $links.length) % $links.length).trigger('focus');
        }
      });

      $dropdown.on('focusout.calculatorDropdown', function (event) {
        if (!this.contains(event.relatedTarget)) setDropdownOpen(false);
      });

      $header.find('.logo, .nav a').off('click.headerNav').on('click.headerNav', function (e) {
        const href = $(this).attr('href');
        if (href) {
          const currentPath = window.location.pathname.split('/').pop() || 'index.html';
          const targetPath = href.split('#')[0];
          if (targetPath === currentPath || (currentPath === '' && targetPath === 'index.html')) {
            if (!href.includes('#') || href.endsWith('#home') || href === '#') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }
        }
        $header.removeClass('nav-open');
        $toggle.attr('aria-expanded', 'false');
        $toggle.attr('aria-label', '메뉴 열기');
        setDropdownOpen(false);
      });

      $(document).off('click.headerOutside').on('click.headerOutside', function (event) {
        if (!$(event.target).closest('.nav-dropdown').length) setDropdownOpen(false);
      });
    }
  }

  // 스크롤 및 유휴 상태 감지 (최상단 상시 노출, 스크롤 시 노출, 스크롤 후 유휴 5초 시 자동 숨김, 상단 마우스 이동 시 재노출)
  function bindHeaderVisibility(container) {
    const headerEl = container.querySelector ? container.querySelector('.header') : null;
    if (!headerEl) return;

    let pointerInside = false;
    clearTimeout(headerIdleTimer);

    function isAtTop() {
      return (window.pageYOffset || document.documentElement.scrollTop || 0) <= 10;
    }

    function show() {
      clearTimeout(headerIdleTimer);
      headerEl.classList.remove('is-idle-hidden');
    }

    function scheduleHide() {
      clearTimeout(headerIdleTimer);
      // 최상단에 머무를 때는 헤더를 숨기지 않고 상시 노출
      if (isAtTop()) {
        show();
        return;
      }

      headerIdleTimer = setTimeout(function () {
        if (isAtTop()) {
          show();
          return;
        }
        if (pointerInside || (document.activeElement && headerEl.contains(document.activeElement))) return;
        if (headerEl.classList.contains('nav-open') || headerEl.querySelector('.nav-dropdown.is-open')) return;

        headerEl.classList.add('is-idle-hidden');
        headerEl.classList.remove('nav-open');
        const toggle = headerEl.querySelector('.nav-toggle');
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'false');
          toggle.setAttribute('aria-label', '메뉴 열기');
        }
        const dropdown = headerEl.querySelector('.nav-dropdown');
        if (dropdown) dropdown.classList.remove('is-open');
        const dropdownToggle = headerEl.querySelector('.nav-dropdown-toggle');
        if (dropdownToggle) dropdownToggle.setAttribute('aria-expanded', 'false');
      }, 5000);
    }

    function onScrollVisibility() {
      show();
      if (!isAtTop()) {
        scheduleHide();
      }
    }

    window.removeEventListener('scroll', onScrollVisibility);
    window.addEventListener('scroll', onScrollVisibility, { passive: true });

    // PC 화면에서 마우스 커서를 화면 상단(80px 이내)으로 가져갈 경우 헤더 다시 노출
    function onMouseMove(e) {
      if (e.clientY <= 80) {
        show();
        if (!isAtTop()) {
          scheduleHide();
        }
      }
    }

    window.removeEventListener('mousemove', onMouseMove);
    window.addEventListener('mousemove', onMouseMove, { passive: true });

    headerEl.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch') return;
      pointerInside = true;
      show();
    });

    headerEl.addEventListener('pointerleave', function () {
      pointerInside = false;
      if (!isAtTop()) {
        scheduleHide();
      }
    });

    headerEl.addEventListener('focusin', show);
    headerEl.addEventListener('focusout', function () {
      if (!isAtTop()) {
        scheduleHide();
      }
    });

    // 초기 상태: 최상단이면 항상 노출, 이미 스크롤되어 있으면 5초 후 숨김 예약
    if (isAtTop()) {
      show();
    } else {
      scheduleHide();
    }
  }

  // 헤더 렌더링 함수
  function renderHeader(target, options) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;

    // 이미 헤더가 렌더링되어 있으면 중복 렌더링 방지 (강제 리렌더 옵션이 없을 때)
    if (el.querySelector('.header') && (!options || !options.force)) {
      return el.querySelector('.header');
    }

    const opts = options || {};
    const config = Object.assign({}, (window.FITCALC_PAGE && window.FITCALC_PAGE.header) || {}, opts);
    const markup = createHeaderMarkup(config);
    el.innerHTML = markup;

    bindHeaderEvents(el);
    bindHeaderVisibility(el);
    return el.querySelector('.header');
  }

  // 초기화 함수: 기본 타깃(#site-header 또는 <site-header>)에 자동 렌더링
  function initHeader() {
    if (window.location.hash === '#home') {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      window.scrollTo(0, 0);
    }
    const siteHeader = document.getElementById('site-header');
    if (siteHeader) {
      renderHeader(siteHeader);
    }
    const customHeader = document.querySelectorAll('site-header, fitcalc-header');
    customHeader.forEach(function (node) {
      renderHeader(node);
    });
  }

  // Web Component 등록 지원 (<site-header>, <fitcalc-header>)
  if (typeof window !== 'undefined' && window.customElements) {
    if (!customElements.get('site-header')) {
      customElements.define('site-header', class extends HTMLElement {
        connectedCallback() {
          renderHeader(this);
        }
      });
    }
  }

  // DOMContentLoaded 및 jQuery Ready 시 자동 마운트
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeader);
  } else {
    initHeader();
  }

  // 글로벌 네임스페이스 등록
  window.FITCALC_HEADER = {
    render: renderHeader,
    init: initHeader,
    getMarkup: createHeaderMarkup,
    detectActivePage: detectActivePage,
    CALCULATORS: CALCULATORS
  };
})();
