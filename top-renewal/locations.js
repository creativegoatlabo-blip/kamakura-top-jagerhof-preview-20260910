(() => {
  'use strict';

  const track = document.getElementById('location-track');
  if (!track) return;

  const cards = [...track.querySelectorAll('.location-card')];
  const section = track.closest('.locations');
  const scrollArea = track.closest('.locations-scroll');
  const browser = track.closest('.locations-browser');
  const filters = section.querySelector('.location-filters');
  const controls = section.querySelector('.location-controls');
  const previous = controls.querySelector('[data-location-direction="-1"]');
  const next = controls.querySelector('[data-location-direction="1"]');
  const status = section.querySelector('#location-status');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.getElementById('header');
  let travel = 0;
  let stickyTop = 0;
  let lastProgress = 0;
  let frame = 0;

  function updateControls() {
    const maxScroll = track.scrollWidth - track.clientWidth;
    controls.hidden = maxScroll <= 1;
    previous.setAttribute('aria-disabled', String(track.scrollLeft <= 1));
    next.setAttribute('aria-disabled', String(track.scrollLeft >= maxScroll - 1));
  }

  function scrollProgress() {
    return Math.max(0, Math.min(travel, stickyTop - scrollArea.getBoundingClientRect().top));
  }

  function measureScroll() {
    updateControls();
    const maxScroll = track.scrollWidth - track.clientWidth;
    // Let tall cards finish entering the viewport before they pin.
    stickyTop = Math.min((header?.offsetHeight ?? 0) + 16, innerHeight - browser.offsetHeight - 16);
    travel = reducedMotion.matches || maxScroll <= 1 ? 0 : maxScroll;
    scrollArea.style.setProperty('--location-travel', `${travel}px`);
    scrollArea.style.setProperty('--location-sticky-top', `${stickyTop}px`);
    scrollArea.classList.toggle('is-scroll-linked', travel > 0);
    lastProgress = scrollProgress();
  }

  function syncScroll() {
    frame = 0;
    const progress = scrollProgress();
    // Relative movement keeps native horizontal scrolling and swipes in control.
    if (progress !== lastProgress) track.scrollLeft += progress - lastProgress;
    lastProgress = progress;
  }

  function scheduleScroll() {
    if (travel && !frame) frame = requestAnimationFrame(syncScroll);
  }

  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-location-filter]');
    if (!button || button.getAttribute('aria-pressed') === 'true') return;

    const wasPinned = travel > 0 && scrollProgress() > 0 && scrollProgress() < travel;
    const area = button.dataset.locationFilter;
    for (const filter of filters.querySelectorAll('button')) {
      filter.setAttribute('aria-pressed', String(filter === button));
    }
    for (const card of cards) {
      card.hidden = area !== 'all' && card.dataset.area !== area;
    }
    track.scrollTo({ left: 0, behavior: 'instant' });
    status.textContent = `${button.firstChild.textContent.trim()}、${cards.filter(card => !card.hidden).length}店舗を表示`;
    measureScroll();
    if (wasPinned) {
      const top = window.scrollY + scrollArea.getBoundingClientRect().top;
      window.scrollTo({ top: top - Math.max(0, stickyTop), behavior: 'instant' });
      lastProgress = scrollProgress();
    }
  });

  function scrollOneCard(direction) {
    const first = cards.find(card => !card.hidden);
    const gap = parseFloat(getComputedStyle(track).columnGap);
    track.scrollBy({
      left: direction * (first.getBoundingClientRect().width + gap),
      behavior: reducedMotion.matches ? 'instant' : 'smooth'
    });
  }

  controls.addEventListener('click', event => {
    const button = event.target.closest('[data-location-direction]');
    if (button && button.getAttribute('aria-disabled') !== 'true') {
      scrollOneCard(Number(button.dataset.locationDirection));
    }
  });

  track.addEventListener('keydown', event => {
    if (event.target !== track || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    scrollOneCard(event.key === 'ArrowRight' ? 1 : -1);
  });

  for (const card of cards) {
    const toggle = card.querySelector('.location-photo-toggle');
    const interior = card.querySelector('.location-photo-interior');
    const exterior = card.querySelector('.location-photo-exterior');
    toggle.addEventListener('click', () => {
      const showInterior = toggle.getAttribute('aria-pressed') !== 'true';
      toggle.setAttribute('aria-pressed', String(showInterior));
      interior.setAttribute('aria-hidden', String(!showInterior));
      exterior.setAttribute('aria-hidden', String(showInterior));
    });
    toggle.hidden = false;
  }

  filters.hidden = false;
  track.addEventListener('scroll', updateControls, { passive: true });
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('resize', measureScroll, { passive: true });
  reducedMotion.addEventListener('change', measureScroll);
  new ResizeObserver(measureScroll).observe(browser);
  measureScroll();
})();
