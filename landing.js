(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  const skipLink = document.querySelector('.skip-link');
  const mainContent = document.getElementById('main-content');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const navigation = document.getElementById('primary-navigation');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (skipLink && mainContent) {
    skipLink.addEventListener('click', (event) => {
      event.preventDefault();
      mainContent.focus({ preventScroll: true });
      mainContent.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      window.history.replaceState(null, '', '#main-content');
    });
  }

  function closeMenu(restoreFocus = false) {
    if (!menuToggle || !navigation) return;
    navigation.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) menuToggle.focus();
  }

  if (menuToggle && navigation) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navigation.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('click', (event) => {
      if (!navigation.classList.contains('is-open')) return;
      if (!navigation.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
        closeMenu(true);
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 720) closeMenu();
    });
  }

  const revealElements = [...document.querySelectorAll('.reveal')];

  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -36px 0px'
  });

  revealElements.forEach((element) => revealObserver.observe(element));
})();
