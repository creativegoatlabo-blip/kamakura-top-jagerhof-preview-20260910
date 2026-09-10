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

  function setupHeroVideos() {
    const filmGrid = document.querySelector('#hero-films');
    const toggle = document.querySelector('#hero-video-toggle');
    if (!filmGrid || !toggle) return;
    const films = [...filmGrid.querySelectorAll('video.hero-film')];
    if (!films.length) return;
    const label = toggle.querySelector('.hero-video-label');
    const connection = navigator.connection;
    const loadTimers = new Map();
    const playAttempts = new Map();
    const failedFilms = new Set();
    let wantsPlayback = !motionQuery.matches && !connection?.saveData;
    let inView = false;
    let playbackEpoch = 0;

    function mayPlay() {
      return wantsPlayback && inView && !document.hidden && !dialog.open;
    }

    function updateToggle() {
      const playing = mayPlay();
      toggle.dataset.state = playing ? 'playing' : 'paused';
      toggle.setAttribute('aria-label', playing ? '動画を一時停止' : '動画を再生');
      if (label) label.textContent = playing ? '一時停止' : '再生';
    }

    function clearLoadTimers() {
      loadTimers.forEach(timer => clearTimeout(timer));
      loadTimers.clear();
    }

    function pauseFilms() {
      playbackEpoch += 1;
      clearLoadTimers();
      playAttempts.clear();
      films.forEach(film => film.pause());
      updateToggle();
    }

    function markFailed(film) {
      failedFilms.add(film);
      if (failedFilms.size === films.length) {
        wantsPlayback = false;
        pauseFilms();
      }
    }

    function loadFilm(film) {
      if (film.hasAttribute('src')) return;
      if (!film.dataset.src) {
        markFailed(film);
        return;
      }
      film.src = film.dataset.src;
      film.load();
    }

    function playFilm(film) {
      if (!mayPlay() || failedFilms.has(film) || !film.hasAttribute('src') || playAttempts.has(film)) return;
      const attempt = { epoch: playbackEpoch };
      playAttempts.set(film, attempt);
      film.muted = true;
      Promise.resolve(film.play()).then(() => {
        if (playAttempts.get(film) !== attempt) return;
        playAttempts.delete(film);
        if (!mayPlay()) film.pause();
      }).catch(error => {
        if (playAttempts.get(film) !== attempt || attempt.epoch !== playbackEpoch) return;
        playAttempts.delete(film);
        if (error.name === 'NotAllowedError') {
          wantsPlayback = false;
          pauseFilms();
        } else if (error.name !== 'AbortError') {
          markFailed(film);
        }
      });
    }

    function syncPlayback() {
      if (!mayPlay()) {
        pauseFilms();
        return;
      }
      let delay = 0;
      films.forEach(film => {
        if (failedFilms.has(film)) return;
        if (film.hasAttribute('src')) {
          playFilm(film);
        } else if (!loadTimers.has(film)) {
          loadTimers.set(film, setTimeout(() => {
            loadTimers.delete(film);
            if (!mayPlay()) return;
            loadFilm(film);
            playFilm(film);
          }, delay));
          delay += 200;
        }
      });
      updateToggle();
    }

    films.forEach(film => {
      film.defaultMuted = true;
      film.muted = true;
      film.loop = true;
      film.playsInline = true;
      film.autoplay = false;
      film.addEventListener('playing', () => {
        if (!mayPlay()) film.pause();
      });
      film.addEventListener('error', () => markFailed(film));
    });

    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      if (wantsPlayback) {
        wantsPlayback = false;
        pauseFilms();
        return;
      }
      wantsPlayback = true;
      clearLoadTimers();
      const retryFilms = new Set(failedFilms);
      failedFilms.clear();
      // Keep every explicit play request inside this gesture for mobile browsers.
      films.forEach(film => {
        if (!mayPlay()) return;
        if (retryFilms.has(film) && film.hasAttribute('src')) film.load();
        else loadFilm(film);
        playFilm(film);
      });
      updateToggle();
    });

    const filmObserver = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting && entries[0].intersectionRatio > 0;
      syncPlayback();
    }, { threshold: 0.01 });
    filmObserver.observe(filmGrid);
    document.addEventListener('visibilitychange', syncPlayback);
    new MutationObserver(syncPlayback).observe(dialog, { attributes: true, attributeFilter: ['open'] });
    motionQuery.addEventListener('change', () => {
      if (motionQuery.matches) wantsPlayback = false;
      syncPlayback();
    });
    connection?.addEventListener?.('change', () => {
      if (connection.saveData) wantsPlayback = false;
      syncPlayback();
    });
    window.addEventListener('pagehide', pauseFilms);
    window.addEventListener('pageshow', syncPlayback);
    updateToggle();
  }

  setupHeroVideos();
  updateScroll();
})();
