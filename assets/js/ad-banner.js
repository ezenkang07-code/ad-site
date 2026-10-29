/**
 * FITCALC - Coupang Partners Banner Component (쿠팡 파트너스 배너 공통 컴포넌트)
 * PC(680x140) 및 모바일(280x140) 와이드 캐러셀 배너와
 * 배너 너비에 맞춘 흐르는 마퀴 안내 문구를 독립적으로 렌더링하는 공통 컴포넌트입니다.
 */
(function () {
  'use strict';

  // 기본 배너 설정값
  const DEFAULT_CONFIG = {
    pcId: 1044380,
    pcWidth: '680',
    pcHeight: '140',
    moId: 1044383,
    moWidth: '280',
    moHeight: '140',
    template: 'carousel',
    trackingCode: 'AF7450440',
    tsource: '',
    disclaimer: '이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.'
  };

  // 쿠팡 파트너스 SDK 로더 (중복 로드 방지)
  function loadCoupangSdk(callback) {
    if (window.PartnersCoupang && window.PartnersCoupang.G) {
      if (typeof callback === 'function') callback();
      return;
    }

    const existing = document.querySelector('script[src*="ads-partners.coupang.com/g.js"]');
    if (existing) {
      if (window.PartnersCoupang && window.PartnersCoupang.G) {
        if (typeof callback === 'function') callback();
      } else {
        existing.addEventListener('load', function () {
          if (typeof callback === 'function') callback();
        }, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://ads-partners.coupang.com/g.js';
    script.async = true;
    script.onload = function () {
      if (typeof callback === 'function') callback();
    };
    script.onerror = function (err) {
      console.warn('[FITCALC] 쿠팡 파트너스 스크립트 로드 실패:', err);
    };
    document.head.appendChild(script);
  }

  // 배너 및 마퀴 마크업 생성
  function createBannerMarkup(options) {
    const opts = Object.assign({}, DEFAULT_CONFIG, options || {});
    const text = opts.disclaimer;

    const groupContent = `
      <span>${text}</span>
      <span class="coupang-marquee-bullet" aria-hidden="true">•</span>
      <span>${text}</span>
      <span class="coupang-marquee-bullet" aria-hidden="true">•</span>
      <span>${text}</span>
      <span class="coupang-marquee-bullet" aria-hidden="true">•</span>
    `.trim();

    return `
      <aside class="coupang-banner-area" aria-label="쿠팡 파트너스 추천 상품">
        <div class="coupang-banner-container">
          <!-- PC 버전 배너 (680x140) -->
          <div class="coupang-banner-box coupang-banner-pc" data-banner-type="pc"></div>

          <!-- 모바일 버전 배너 (280x140) -->
          <div class="coupang-banner-box coupang-banner-mo" data-banner-type="mo"></div>
        </div>

        <!-- 하단 마퀴 공지 문구 (와이드 배너 가로 크기 680px / 280px 맞춤) -->
        <div class="coupang-marquee-wrap" aria-label="쿠팡 파트너스 제휴 안내">
          <div class="coupang-marquee-track">
            <div class="coupang-marquee-content">
              ${groupContent}
            </div>
            <div class="coupang-marquee-content" aria-hidden="true">
              ${groupContent}
            </div>
          </div>
        </div>
      </aside>
    `.trim();
  }

  // 배너 위젯 인스턴스 마운트
  function mountWidgets(container, opts) {
    if (!window.PartnersCoupang || !window.PartnersCoupang.G) return;

    const pcBox = container.querySelector('.coupang-banner-pc');
    if (pcBox && !pcBox.querySelector('iframe')) {
      try {
        new PartnersCoupang.G({
          id: opts.pcId,
          template: opts.template,
          trackingCode: opts.trackingCode,
          width: String(opts.pcWidth),
          height: String(opts.pcHeight),
          tsource: opts.tsource,
          container: pcBox
        });
      } catch (e) {
        console.warn('[FITCALC] 쿠팡 PC 배너 생성 실패:', e);
      }
    }

    const moBox = container.querySelector('.coupang-banner-mo');
    if (moBox && !moBox.querySelector('iframe')) {
      try {
        new PartnersCoupang.G({
          id: opts.moId,
          template: opts.template,
          trackingCode: opts.trackingCode,
          width: String(opts.moWidth),
          height: String(opts.moHeight),
          tsource: opts.tsource,
          container: moBox
        });
      } catch (e) {
        console.warn('[FITCALC] 쿠팡 MO 배너 생성 실패:', e);
      }
    }
  }

  // 배너 렌더링 함수
  function renderBanner(target, options) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return null;

    // 이미 배너가 렌더링되어 있으면 중복 방지 (강제 리렌더 옵션이 없을 때)
    if (el.querySelector('.coupang-banner-area') && (!options || !options.force)) {
      return el.querySelector('.coupang-banner-area');
    }

    const pageAdConfig = (window.FITCALC_PAGE && window.FITCALC_PAGE.ad) || {};
    const config = Object.assign({}, DEFAULT_CONFIG, pageAdConfig, options || {});

    el.innerHTML = createBannerMarkup(config);

    const bannerArea = el.querySelector('.coupang-banner-area');

    // 쿠팡 SDK 로드 후 배너 위젯 마운트
    loadCoupangSdk(function () {
      mountWidgets(bannerArea, config);
    });

    return bannerArea;
  }

  // 초기화 함수: 기본 타깃(#site-ad-banner, #coupang-banner 등)에 자동 렌더링
  function initBanner() {
    const defaultTargets = document.querySelectorAll('#site-ad-banner, #coupang-banner, site-ad-banner, coupang-banner');
    defaultTargets.forEach(function (node) {
      renderBanner(node);
    });
  }

  // Web Component 등록 지원 (<site-ad-banner>, <coupang-banner>)
  if (typeof window !== 'undefined' && window.customElements) {
    if (!customElements.get('site-ad-banner')) {
      customElements.define('site-ad-banner', class extends HTMLElement {
        connectedCallback() {
          renderBanner(this);
        }
      });
    }
    if (!customElements.get('coupang-banner')) {
      customElements.define('coupang-banner', class extends HTMLElement {
        connectedCallback() {
          renderBanner(this);
        }
      });
    }
  }

  // DOMContentLoaded 및 Ready 시 자동 마운트
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBanner);
  } else {
    initBanner();
  }

  // 글로벌 네임스페이스 등록
  window.FITCALC_BANNER = {
    render: renderBanner,
    init: initBanner,
    getMarkup: createBannerMarkup,
    DEFAULT_CONFIG: DEFAULT_CONFIG
  };
})();

