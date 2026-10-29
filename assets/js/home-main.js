(function ($) {
  function initNavigation() {
    $('.nav-link[data-nav-key="home"]')
      .addClass('is-active')
      .attr('aria-current', 'page');
  }

  function initSmoothScroll() {
    $('a[href^="#"]').on('click.homeScroll', function (event) {
      const targetId = $(this).attr('href');
      if (!targetId || targetId === '#') return;

      const $target = $(targetId);
      if (!$target.length) return;

      event.preventDefault();
      $('html, body').stop().animate({ scrollTop: $target.offset().top - 88 }, 480);
    });

    if (window.location.hash) {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (hash === 'home') {
        window.scrollTo(0, 0);
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        const target = document.getElementById(hash);
        if (target) {
          window.requestAnimationFrame(() => {
            $('html, body').stop().animate({ scrollTop: $(target).offset().top - 88 }, 480);
          });
        }
      }
    }
  }

  function initScrollAnimation() {
    const elements = document.querySelectorAll('.home-reveal');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });

    elements.forEach((element) => observer.observe(element));
  }

  $(function () {
    initNavigation();
    initSmoothScroll();
    initScrollAnimation();
  });
})(jQuery);
