(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 768px)');

  // The reservation video loads when its section enters view.
  const visitVideo = document.querySelector('#visit-film');
  if (visitVideo) {
    const visit = document.querySelector('#visit');
    const visitFrame = visit.querySelector('.visit-frame');
    const startButton = document.querySelector('#visit-video-start');
    const dialog = document.querySelector('#menu-dialog');
    const smallScreen = matchMedia('(max-width: 767px)');
    const mobileMedia = matchMedia('(max-width: 767px), (max-height: 580px) and (any-pointer: coarse)');
    const connection = navigator.connection;
    let visitVisible = false;
    let autoplayBlocked = false;
    let widthFrame = 0;
    let previousEdge;
    let previousFrameTime;

    function updateVisitWidth(now = performance.now()) {
      if (widthFrame) cancelAnimationFrame(widthFrame);
      widthFrame = 0;
      if (!visitFrame || reducedMotion.matches) return;
      const viewport = document.documentElement.clientHeight;
      const { top, height } = visit.getBoundingClientRect();
      if (!height) return;
      const leadIn = Math.min(viewport * (smallScreen.matches ? .16 : .02), height * .3);
      // The frame reaches full width when the section's bottom enters the viewport.
      const progress = Math.max(0, Math.min(1, (viewport - top - leadIn) / (height - leadIn)));
      const targetEdge = 1 - progress * progress * (3 - 2 * progress);
      let edge = targetEdge;
      if (smallScreen.matches && visitVisible && previousEdge !== undefined) {
        const elapsed = Math.min(20, Math.max(1, now - previousFrameTime));
        const delta = targetEdge - previousEdge;
        if (Math.abs(delta) > .001) {
          edge = previousEdge + delta * (1 - Math.exp(-elapsed / 92));
          widthFrame = requestAnimationFrame(updateVisitWidth);
        }
      }
      previousEdge = edge;
      previousFrameTime = now;
      visitFrame.style.setProperty('--visit-edge', edge.toFixed(4));
    }

    function scheduleVisitWidth() {
      if (visitVisible && !reducedMotion.matches && !widthFrame) {
        widthFrame = requestAnimationFrame(updateVisitWidth);
      }
    }

    function mayPlayVisit() {
      return visitVisible && !reducedMotion.matches && !document.hidden &&
        !dialog?.open && !connection?.saveData;
    }

    function syncVisitVideo() {
      const visible = mayPlayVisit();
      startButton.hidden = !visible || !autoplayBlocked;
      if (!visible) {
        visitVideo.pause();
        visitVideo.classList.remove('is-playing');
        return;
      }

      const source = mobileMedia.matches ? visitVideo.dataset.mobileSrc : visitVideo.dataset.src;
      if (visitVideo.getAttribute('src') !== source) {
        visitVideo.classList.remove('is-playing');
        visitVideo.src = source;
        visitVideo.preload = 'auto';
        visitVideo.load();
      }
      if (autoplayBlocked) return;
      visitVideo.play().catch(error => {
        if (visitVideo.paused) visitVideo.classList.remove('is-playing');
        if (error.name !== 'NotAllowedError' || !mayPlayVisit()) return;
        autoplayBlocked = true;
        startButton.hidden = false;
      });
    }

    startButton.addEventListener('click', () => {
      autoplayBlocked = false;
      syncVisitVideo();
    });
    visitVideo.addEventListener('playing', () => {
      if (mayPlayVisit()) visitVideo.classList.add('is-playing');
      else visitVideo.pause();
    });
    visitVideo.addEventListener('error', () => {
      visitVideo.pause();
      visitVideo.classList.remove('is-playing');
    });
    new IntersectionObserver(([entry]) => {
      visitVisible = entry.isIntersecting;
      syncVisitVideo();
      updateVisitWidth();
    }, { threshold: 0.01 }).observe(visit);

    updateVisitWidth();
    addEventListener('scroll', scheduleVisitWidth, { passive: true });
    addEventListener('resize', scheduleVisitWidth, { passive: true });
    document.addEventListener('visibilitychange', syncVisitVideo);
    reducedMotion.addEventListener('change', syncVisitVideo);
    reducedMotion.addEventListener('change', () => updateVisitWidth());
    mobileMedia.addEventListener('change', syncVisitVideo);
    connection?.addEventListener?.('change', syncVisitVideo);
    if (dialog) new MutationObserver(syncVisitVideo).observe(dialog, { attributes: true, attributeFilter: ['open'] });
    addEventListener('pagehide', () => visitVideo.pause());
    addEventListener('pageshow', syncVisitVideo);
    addEventListener('pageshow', () => updateVisitWidth());
  }

  const layers = [...document.querySelectorAll('[data-depth]')];
  const scene = document.querySelector('.experience-scene');
  if (!scene) return; // The new Experience journey owns its own motion.
  let sceneVisible = false;
  let scheduled = false;
  function updateDepth() {
    scheduled = false;
    if (reducedMotion.matches || !desktop.matches) {
      layers.forEach(layer => layer.style.removeProperty('transform'));
      return;
    }
    if (!sceneVisible) return;
    const bounds = scene.getBoundingClientRect();
    const distance = Math.max(-900, Math.min(900, innerHeight * .5 - bounds.top - bounds.height * .5));
    layers.forEach(layer => {
      layer.style.transform = `translate3d(0,${(distance * Number(layer.dataset.depth)).toFixed(2)}px,0)`;
    });
  }
  function queueDepth() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateDepth);
  }
  new IntersectionObserver(entries => {
    sceneVisible = entries[0].isIntersecting;
    queueDepth();
  }, {rootMargin: '200px'}).observe(scene);
  addEventListener('scroll', queueDepth, {passive: true});
  addEventListener('resize', queueDepth, {passive: true});
  reducedMotion.addEventListener('change', queueDepth);
  desktop.addEventListener('change', queueDepth);
})();
