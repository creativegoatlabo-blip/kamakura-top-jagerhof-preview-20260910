(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reveals = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('seen');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    document.documentElement.classList.add('motion-ready');
    reveals.forEach(element => observer.observe(element));
    reduceMotion.addEventListener('change', event => {
      if (!event.matches) return;
      observer.disconnect();
      document.documentElement.classList.remove('motion-ready');
    });
  }

  document.querySelectorAll('.gallery').forEach(gallery => {
    const track = gallery.querySelector('.gallery-track');
    const slides = [...track.children];
    const previous = gallery.querySelector('[data-direction="-1"]');
    const next = gallery.querySelector('[data-direction="1"]');
    const counter = gallery.querySelector('.gallery-count');
    let index = 0;
    const update = () => {
      const firstLeft = slides[0].offsetLeft;
      const nearest = slides.reduce((best, slide, i) => Math.abs(slide.offsetLeft - firstLeft - track.scrollLeft) < Math.abs(slides[best].offsetLeft - firstLeft - track.scrollLeft) ? i : best, 0);
      index = nearest;
      previous.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    };
    gallery.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => {
      const target = Math.max(0, Math.min(slides.length - 1, index + Number(button.dataset.direction)));
      track.scrollTo({ left: slides[target].offsetLeft - slides[0].offsetLeft, behavior: reduceMotion.matches ? 'instant' : 'smooth' });
    }));
    track.addEventListener('scroll', update, { passive: true });
    track.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      (event.key === 'ArrowLeft' ? previous : next).click();
    });
    window.addEventListener('resize', update, { passive: true });
    update();
  });

  const movieButton = document.querySelector('[data-movie]');
  movieButton?.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = movieButton.dataset.movie;
    frame.title = '鎌倉彫金工房の指輪制作紹介動画';
    frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
    frame.allowFullscreen = true;
    movieButton.replaceWith(frame);
    frame.focus();
  });

  const video = document.querySelector('.hero video');
  const toggle = document.querySelector('.video-toggle');
  if (!video || !toggle) return;
  let userPaused = reduceMotion.matches || Boolean(navigator.connection?.saveData);
  let visible = true;
  let loaded = false;
  let epoch = 0;
  const updateButton = () => {
    const paused = userPaused || video.paused;
    toggle.dataset.state = paused ? 'paused' : 'playing';
    toggle.setAttribute('aria-label', paused ? '背景動画を再生する' : '背景動画を一時停止する');
    toggle.querySelector('.video-label').textContent = paused ? '再生' : '一時停止';
  };
  const sync = async () => {
    const version = ++epoch;
    if (userPaused || !visible || document.hidden) { video.pause(); updateButton(); return; }
    if (!loaded) { video.src = video.dataset.src; loaded = true; video.load(); }
    video.muted = true;
    try {
      await video.play();
      if (version !== epoch && (userPaused || !visible || document.hidden)) video.pause();
    } catch (error) {
      if (version === epoch && error.name !== 'AbortError') userPaused = true;
    }
    updateButton();
  };
  video.defaultMuted = true;
  video.muted = true;
  toggle.hidden = false;
  toggle.addEventListener('click', () => { userPaused = !userPaused; sync(); });
  video.addEventListener('error', () => { userPaused = true; loaded = false; updateButton(); });
  video.addEventListener('play', updateButton);
  video.addEventListener('pause', updateButton);
  document.addEventListener('visibilitychange', sync);
  reduceMotion.addEventListener('change', event => { if (event.matches) { userPaused = true; sync(); } });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.05 }).observe(video);
  } else { sync(); }
  updateButton();
})();
