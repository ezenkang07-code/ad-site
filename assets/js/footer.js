/**
 * FITCALC - Footer Component (푸터 컴포넌트)
 * 독립적으로 동작하는 푸터 컴포넌트 스크립트입니다.
 */
(function () {
  'use strict';

  const FOOTER_LINKS = [
    { label: 'HOME', href: 'index.html#home' },
    { label: 'BMI 계산기', href: 'bmi.html#home' },
    { label: '기초대사량 계산기', href: 'bmr.html#home' },
    { label: '권장 칼로리 계산기', href: 'calorie.html#home' },
    { label: '목표 체중 기간 계산기', href: 'weight-goal.html#home' },
    { label: '체중 변화 분석기', href: 'weight-log.html#home' },
    { label: '운동 칼로리 계산기', href: 'exercise.html#home' },
    { label: '영양소 비율 계산기', href: 'macros.html#home' },
    { label: '체지방률 추정 계산기', href: 'body-fat.html#home' },
    { label: '물 섭취량 계산기', href: 'water.html#home' },
    { label: '음식 칼로리 계산기', href: 'food-calorie.html#home' }
  ];

  // 푸터 마크업 생성
  function createFooterMarkup(options) {
    const opts = options || {};
    const brand = opts.brand || 'FITCALC';
    const description = opts.description || '건강한 일상을 위한 스마트한 건강 계산기';
    const year = opts.year || '2026';
    const links = opts.links || FOOTER_LINKS;

    const navLinksHtml = links.map(function (link) {
      return `<a href="${link.href}">${link.label}</a>`;
    }).join('\n            ');

    const cleanBrandName = brand.replace(/[^\w\s]/g, '').trim();

    return `
      <footer class="footer">
        <div class="container footer-inner">
          <div class="footer-brand">${brand}</div>
          <p>${description}</p>
          <nav class="footer-nav" aria-label="푸터 메뉴">
            ${navLinksHtml}
          </nav>
          <small>© ${year} ${cleanBrandName}. All Rights Reserved.</small>
        </div>
      </footer>
    `.trim();
  }

  // 푸터 렌더링 함수
  function renderFooter(target, options) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;

    // 이미 푸터가 렌더링되어 있으면 중복 방지
    if (el.querySelector('.footer') && (!options || !options.force)) {
      return el.querySelector('.footer');
    }

    const opts = options || {};
    const config = Object.assign({}, (window.FITCALC_PAGE && window.FITCALC_PAGE.footer) || {}, opts);
    const markup = createFooterMarkup(config);
    el.innerHTML = markup;
    return el.querySelector('.footer');
  }

  // 초기화 함수: 기본 타깃(#site-footer 또는 <site-footer>)에 자동 렌더링
  function initFooter() {
    const siteFooter = document.getElementById('site-footer');
    if (siteFooter) {
      renderFooter(siteFooter);
    }
    const customFooter = document.querySelectorAll('site-footer, fitcalc-footer');
    customFooter.forEach(function (node) {
      renderFooter(node);
    });
  }

  // Web Component 등록 지원 (<site-footer>, <fitcalc-footer>)
  if (typeof window !== 'undefined' && window.customElements) {
    if (!customElements.get('site-footer')) {
      customElements.define('site-footer', class extends HTMLElement {
        connectedCallback() {
          renderFooter(this);
        }
      });
    }
  }

  // DOMContentLoaded 및 Ready 시 자동 마운트
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFooter);
  } else {
    initFooter();
  }

  // 글로벌 네임스페이스 등록
  window.FITCALC_FOOTER = {
    render: renderFooter,
    init: initFooter,
    getMarkup: createFooterMarkup,
    FOOTER_LINKS: FOOTER_LINKS
  };
})();
