/**
 * FITCALC - Components Bridge (하위 호환성 유지)
 * header.js, footer.js, ad-banner.js 컴포넌트를 조율하는 브리지 파일입니다.
 */
(function ($) {
  'use strict';

  function ensureScripts(callback) {
    let pending = 0;
    function checkDone() {
      if (pending === 0 && callback) {
        callback();
      }
    }

    if (!window.FITCALC_HEADER) {
      pending++;
      const s1 = document.createElement('script');
      s1.src = 'assets/js/header.js';
      s1.onload = function () { pending--; checkDone(); };
      s1.onerror = function () { pending--; checkDone(); };
      document.head.appendChild(s1);
    }

    if (!window.FITCALC_FOOTER) {
      pending++;
      const s2 = document.createElement('script');
      s2.src = 'assets/js/footer.js';
      s2.onload = function () { pending--; checkDone(); };
      s2.onerror = function () { pending--; checkDone(); };
      document.head.appendChild(s2);
    }

    if (!window.FITCALC_BANNER) {
      pending++;
      const s3 = document.createElement('script');
      s3.src = 'assets/js/ad-banner.js';
      s3.onload = function () { pending--; checkDone(); };
      s3.onerror = function () { pending--; checkDone(); };
      document.head.appendChild(s3);
    }

    checkDone();
  }

  function getPageConfig() {
    const pageConfig = window.FITCALC_PAGE || {};
    return {
      page: pageConfig.page || document.body.dataset.fitcalcPage || (window.FITCALC_HEADER && window.FITCALC_HEADER.detectActivePage ? window.FITCALC_HEADER.detectActivePage() : 'bmi'),
      header: Object.assign({
        logo: 'FITCALC',
        logoHref: 'index.html#home'
      }, pageConfig.header || {}),
      footer: Object.assign({
        brand: 'FITCALC',
        description: '건강한 일상을 위한 스마트한 건강 계산기',
        year: '2026'
      }, pageConfig.footer || {}),
      ad: Object.assign({}, pageConfig.ad || {})
    };
  }

  function renderHeader(config) {
    if (window.FITCALC_HEADER && window.FITCALC_HEADER.render) {
      return window.FITCALC_HEADER.render('#site-header', config);
    }
  }

  function renderFooter(config) {
    if (window.FITCALC_FOOTER && window.FITCALC_FOOTER.render) {
      return window.FITCALC_FOOTER.render('#site-footer', config);
    }
  }

  function renderAdBanner(config) {
    if (window.FITCALC_BANNER && window.FITCALC_BANNER.render) {
      return window.FITCALC_BANNER.render('#site-ad-banner', config);
    }
  }

  $(function () {
    ensureScripts(function () {
      const config = getPageConfig();
      renderHeader(config.header);
      renderFooter(config.footer);
      renderAdBanner(config.ad);
    });
  });

  window.FITCALC_COMPONENTS = {
    renderHeader: renderHeader,
    renderFooter: renderFooter,
    renderAdBanner: renderAdBanner,
    getPageConfig: getPageConfig
  };
})(window.jQuery || function (fn) {
  if (document.readyState !== 'loading') fn();
  else document.addEventListener('DOMContentLoaded', fn);
});
