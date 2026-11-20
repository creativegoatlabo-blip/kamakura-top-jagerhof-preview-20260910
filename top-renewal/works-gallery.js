(() => {
  const gallery = document.querySelector('.works-intro__gallery');
  if (!gallery) return;

  const viewport = gallery.querySelector('.works-intro__viewport');
  const track = gallery.querySelector('.works-intro__track');
  const menu = document.querySelector('#menu-dialog');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 767px)');
  const photos = [...track.children];
  const repeats = photos.map(photo => {
    const copy = photo.cloneNode(true);
    copy.dataset.galleryRepeat = '';
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelector('img').alt = '';
    return copy;
  });
  track.append(...repeats);

  let inView = false;
  let resumeTimer = null;
  let animation = null;
  let lastTime = null;
  let position = 0;
  let cycleWidth = 0;
  let lastScrollLeft = 0;
  const speed = 26;

  function advance(time) {
    const elapsed = lastTime === null ? 0 : Math.min(50, time - lastTime);
    if (compact.matches) {
      // Count native swipes without stopping the running animation.
      position += viewport.scrollLeft - lastScrollLeft;
    }
    position = (position + elapsed * speed / 1000) % cycleWidth;
    if (position < 0) position += cycleWidth;
    viewport.scrollLeft = position;
    if (compact.matches) lastScrollLeft = viewport.scrollLeft;
    lastTime = time;
    animation = requestAnimationFrame(advance);
  }

  function syncAutoplay() {
    const canMove = inView && resumeTimer === null && !motion.matches && !document.hidden &&
      !menu?.open && cycleWidth > viewport.clientWidth;
    if (canMove && animation === null) {
      position = viewport.scrollLeft % cycleWidth;
      viewport.scrollTo({left: position, behavior: 'instant'});
      lastScrollLeft = viewport.scrollLeft;
      animation = requestAnimationFrame(advance);
    } else if (!canMove && animation !== null) {
      cancelAnimationFrame(animation);
      animation = null;
      lastTime = null;
    }
  }

  function allowManualScroll() {
    if (compact.matches) return;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      resumeTimer = null;
      syncAutoplay();
    }, 2200);
    syncAutoplay();
  }

  function measure() {
    cycleWidth = repeats[0].offsetLeft - photos[0].offsetLeft;
    syncAutoplay();
  }

  viewport.addEventListener('touchstart', allowManualScroll, {passive: true});
  viewport.addEventListener('touchmove', allowManualScroll, {passive: true});
  viewport.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') allowManualScroll();
  });
  viewport.addEventListener('wheel', event => {
    if (event.deltaX || event.shiftKey) allowManualScroll();
  }, {passive: true});

  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncAutoplay();
  }, {threshold: .15}).observe(viewport);
  new ResizeObserver(measure).observe(viewport);
  compact.addEventListener('change', () => {
    if (compact.matches) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
      lastScrollLeft = viewport.scrollLeft;
    }
    measure();
  });
  motion.addEventListener('change', measure);
  document.addEventListener('visibilitychange', syncAutoplay);
  if (menu) new MutationObserver(syncAutoplay).observe(menu, {attributeFilter: ['open']});
  gallery.classList.add('is-ready');
  measure();
})();
