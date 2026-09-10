(() => {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('#header');
  const dialog = document.querySelector('#menu-dialog');
  const menuButton = document.querySelector('#menu-open');
  menuButton.addEventListener('click', () => {
    dialog.showModal();
    menuButton.setAttribute('aria-expanded', 'true');
    dialog.querySelector('.menu-links a').focus();
  });
  dialog.querySelector('.menu-close').addEventListener('click', () => dialog.close());
  dialog.querySelectorAll('a').forEach(link => link.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => menuButton.setAttribute('aria-expanded', 'false'));
  document.querySelectorAll('[data-rail]').forEach(button => {
    button.addEventListener('click', () => {
      const rail = document.getElementById(button.dataset.rail);
      const item = rail.firstElementChild;
      const step = item.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).gap);
      rail.scrollBy({ left: step * Number(button.dataset.direction), behavior: motionQuery.matches ? 'instant' : 'smooth' });
    });
  });
  document.querySelectorAll('.rail').forEach(rail => {
    function updateControls() {
      const start = rail.scrollLeft < 2;
      const end = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
      document.querySelector(`[data-rail="${rail.id}"][data-direction="-1"]`).disabled = start;
      document.querySelector(`[data-rail="${rail.id}"][data-direction="1"]`).disabled = end;
    }
    rail.addEventListener('scroll', updateControls, { passive: true });
    window.addEventListener('resize', updateControls);
    updateControls();
  });
  if (!motionQuery.matches) document.documentElement.classList.add('motion-ready');
  const reveal = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('seen');
        reveal.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -28px 0px' });
  document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));
  const layers = [...document.querySelectorAll('[data-parallax]')];
  let scheduled = false;
  function updateScroll() {
    const top = window.scrollY;
    header.classList.toggle('scrolled', top > 70);
    if (!motionQuery.matches) {
      layers.forEach(el => {
        const parent = el.parentElement.getBoundingClientRect();
        if (parent.bottom >= 0 && parent.top <= innerHeight) {
          const progress = el.classList.contains('hero-photo') ? top : (innerHeight / 2 - (parent.top + parent.height / 2));
          const isHero = el.classList.contains('hero-photo');
          const maxShift = isHero ? 60 : el.parentElement.classList.contains('inset-visual') ? 24 : el.parentElement.classList.contains('gallery-photo') ? 34 : 39;
          const movement = Math.max(-maxShift, Math.min(maxShift, progress * Number(el.dataset.parallax)));
          el.style.transform = `translate3d(0, ${movement}px, 0)`;
        }
      });
    }
    scheduled = false;
  }
  function schedule() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateScroll); }
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  motionQuery.addEventListener('change', () => {
    document.documentElement.classList.toggle('motion-ready', !motionQuery.matches);
    if (motionQuery.matches) layers.forEach(el => el.style.removeProperty('transform'));
    schedule();
  });
  updateScroll();
})();
