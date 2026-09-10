(() => {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('#header');
  document.documentElement.classList.toggle('motion-ready', !motionQuery.matches);

  const reveal = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('seen');
        reveal.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -28px 0px' });
  document.querySelectorAll('.reveal').forEach(element => reveal.observe(element));

  let scheduled = false;
  function updateHeader() {
    header?.classList.toggle('scrolled', window.scrollY > 70);
    scheduled = false;
  }
  function scheduleHeader() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateHeader);
  }
  window.addEventListener('scroll', scheduleHeader, { passive: true });
  window.addEventListener('pageshow', scheduleHeader);
  motionQuery.addEventListener('change', () => {
    document.documentElement.classList.toggle('motion-ready', !motionQuery.matches);
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
      return wantsPlayback && inView && !document.hidden;
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
  updateHeader();
})();
