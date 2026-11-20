(() => {
  'use strict';

  const opening = document.querySelector('.opening-story');
  const hero = opening?.querySelector('#top');
  const concept = opening?.querySelector('#concept');
  if (!opening || !hero || !concept) return;

  const photos = [...concept.querySelectorAll('[data-concept-depth]')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreen = matchMedia('(max-width: 767px)');
  let visible = true;
  let framePending = false;

  function smoothProgress(value) {
    const progress = Math.max(0, Math.min(1, value));
    return progress * progress * (3 - 2 * progress);
  }

  function update() {
    framePending = false;
    if (!visible || motion.matches) return;

    const { top } = concept.getBoundingClientRect();
    const viewportHeight = document.documentElement.clientHeight;
    // Finish the dissolve before the first message reaches the reading area.
    const progress = smoothProgress((viewportHeight * 0.88 - top) / (viewportHeight * 0.68));
    const copyFade = smoothProgress(progress / 0.78);
    const photoFade = smoothProgress((progress - 0.18) / 0.72);
    opening.style.setProperty('--opening-green', progress.toFixed(4));
    opening.style.setProperty('--opening-copy-opacity', (1 - copyFade).toFixed(4));
    opening.style.setProperty('--opening-copy-y', `${(-copyFade * 28).toFixed(2)}px`);
    opening.style.setProperty('--concept-photo-opacity', photoFade.toFixed(4));

    for (const photo of photos) {
      // Keep the frame in the composition; move only the oversized image within its mask.
      const bounds = photo.getBoundingClientRect();
      const travel = smallScreen.matches ? 0.18 : 0.24 + Number(photo.dataset.conceptDepth) * 0.5;
      const photoProgress = Math.max(0, Math.min(1, (viewportHeight - bounds.top) / (viewportHeight + bounds.height)));
      const offset = (0.5 - photoProgress) * bounds.height * travel;
      photo.style.setProperty('--concept-crop-y', `${offset.toFixed(2)}px`);
    }
  }

  function schedule() {
    if (framePending || motion.matches || !visible) return;
    framePending = true;
    requestAnimationFrame(update);
  }

  function setMotion() {
    opening.classList.toggle('opening-motion', !motion.matches);
    if (motion.matches) {
      for (const property of ['--opening-green', '--opening-copy-opacity', '--opening-copy-y', '--concept-photo-opacity']) {
        opening.style.removeProperty(property);
      }
      photos.forEach(photo => photo.style.removeProperty('--concept-crop-y'));
      return;
    }
    update();
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) schedule();
  }, { rootMargin: '100px 0px' });
  observer.observe(opening);

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('pageshow', schedule);
  motion.addEventListener('change', setMotion);
  smallScreen.addEventListener('change', schedule);
  setMotion();
})();
