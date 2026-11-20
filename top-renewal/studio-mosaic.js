(() => {
  'use strict';

  const mosaic = document.querySelector('.studio-mosaic');
  if (!mosaic) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 767px)');
  const historyPhoto = document.querySelector('.studio-trust__photo');
  let historyNearby = false;
  const photos = [...mosaic.querySelectorAll('[data-drift]')].map(figure => ({
    figure,
    depth: Number(figure.dataset.drift),
    center: 0,
    offset: 0
  }));
  let nearby = false;
  let frame = 0;
  let lastFrame = null;
  let travel = 0;

  function draw(now) {
    frame = 0;
    if (motion.matches) return;

    if (historyNearby && narrow.matches) {
      const {top, height} = historyPhoto.getBoundingClientRect();
      const viewport = document.documentElement.clientHeight;
      const progress = Math.max(0, Math.min(1, (viewport - top) / (viewport + height)));
      historyPhoto.style.setProperty('--history-photo-y', `${((progress - .5) * height * .20).toFixed(2)}px`);
    }
    if (!nearby) return;

    const stageTop = mosaic.getBoundingClientRect().top;
    const viewportHeight = document.documentElement.clientHeight;
    const elapsed = lastFrame === null ? 0 : Math.min(now - lastFrame, 24);
    // Let the photos catch up gently after each scroll gesture.
    const ease = lastFrame === null ? 1 : 1 - Math.exp(-elapsed / 145);
    let settling = false;

    for (const photo of photos) {
      const distance = viewportHeight * .5 - stageTop - photo.center;
      const progress = Math.max(-1, Math.min(1, distance / (viewportHeight * .72)));
      const target = travel * photo.depth * progress;
      const next = photo.offset + (target - photo.offset) * ease;
      const changed = Math.abs(target - next) > .15;
      photo.offset = changed ? next : target;
      photo.figure.style.setProperty('--mosaic-y', `${photo.offset.toFixed(2)}px`);
      settling ||= changed;
    }

    lastFrame = now;
    if (settling) queue();
  }

  function queue() {
    if ((nearby || (historyNearby && narrow.matches)) && !motion.matches && !frame) frame = requestAnimationFrame(draw);
  }

  function measure() {
    historyPhoto?.toggleAttribute('data-history-drifting', narrow.matches && !motion.matches);
    if (!narrow.matches || motion.matches) historyPhoto?.style.removeProperty('--history-photo-y');
    const width = mosaic.clientWidth;
    travel = narrow.matches ? Math.min(12, width * .031) : Math.min(48, width * .038);
    for (const photo of photos) {
      photo.center = photo.figure.offsetTop + photo.figure.offsetHeight * .5;
    }
    queue();
  }

  function syncMotion() {
    mosaic.toggleAttribute('data-drifting', !motion.matches);
    lastFrame = null;
    if (motion.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      photos.forEach(photo => photo.figure.style.removeProperty('--mosaic-y'));
    }
    measure();
  }

  new IntersectionObserver(([entry]) => {
    nearby = entry.isIntersecting;
    if (!nearby) lastFrame = null;
    queue();
  }, {rootMargin: '200px 0px'}).observe(mosaic);
  if (historyPhoto) {
    new IntersectionObserver(([entry]) => {
      historyNearby = entry.isIntersecting;
      queue();
    }, {rootMargin: '100px 0px'}).observe(historyPhoto);
  }
  narrow.addEventListener('change', measure);
  new ResizeObserver(measure).observe(mosaic);
  addEventListener('scroll', queue, {passive: true});
  addEventListener('resize', measure, {passive: true});
  addEventListener('pageshow', measure);
  motion.addEventListener('change', syncMotion);
  syncMotion();
})();
