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

  document.querySelectorAll('[data-loop-video]').forEach(container => {
    const video = container.querySelector('video');
    const toggle = container.querySelector('.video-toggle');
    const videoName = container.dataset.videoName;
    if (!video) return;
    let userPaused = reduceMotion.matches || Boolean(navigator.connection?.saveData);
    let visible = !('IntersectionObserver' in window);
    let loaded = false;
    let epoch = 0;
    const updateButton = () => {
      if (!toggle) return;
      const paused = userPaused || video.paused;
      toggle.dataset.state = paused ? 'paused' : 'playing';
      toggle.setAttribute('aria-label', `${videoName}を${paused ? '再生する' : '一時停止する'}`);
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
    if (toggle) {
      toggle.hidden = false;
      toggle.addEventListener('click', () => { userPaused = !userPaused; sync(); });
    }
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
  });

  document.querySelectorAll('[data-staff-marquee]').forEach(marquee => {
    const track = marquee.querySelector('.staff-marquee-track');
    const group = track.querySelector('.staff-marquee-set');
    const duplicate = group.cloneNode(true);
    duplicate.setAttribute('aria-hidden', 'true');
    duplicate.querySelectorAll('img').forEach(image => { image.alt = ''; });
    track.append(duplicate);
    marquee.classList.add('is-ready');
    const update = () => {
      marquee.classList.toggle('is-paused', document.hidden);
      track.tabIndex = reduceMotion.matches ? 0 : -1;
    };
    document.addEventListener('visibilitychange', update);
    reduceMotion.addEventListener('change', update);
    const loadPhotos = () => {
      // 横流れだけでは遅延読込が始まらない画像も、表示時にまとめて準備する。
      track.querySelectorAll('img').forEach(image => { image.loading = 'eager'; });
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        marquee.classList.toggle('is-offscreen', !entries[0].isIntersecting);
        if (entries[0].isIntersecting) loadPhotos();
      }).observe(marquee);
    } else { loadPhotos(); }
    update();
  });

  document.querySelectorAll('[data-count-to]').forEach(number => {
    const target = Number(number.dataset.countTo);
    if (!Number.isFinite(target)) return;
    let frame = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      number.textContent = target.toLocaleString('ja-JP');
    };
    if (reduceMotion.matches || !('IntersectionObserver' in window)) { finish(); return; }
    number.textContent = '0';
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      if (reduceMotion.matches) { finish(); return; }
      const start = performance.now();
      const tick = timestamp => {
        const progress = Math.min((timestamp - start) / 1800, 1);
        number.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))).toLocaleString('ja-JP');
        if (progress < 1) frame = requestAnimationFrame(tick);
        else finish();
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: .8 });
    observer.observe(number);
    reduceMotion.addEventListener('change', event => {
      if (event.matches) { observer.disconnect(); finish(); }
    });
  });

  const voices = [...document.querySelectorAll('.voice')];
  let voiceFrame = 0;
  const updateVoices = () => {
    voiceFrame = 0;
    voices.forEach(voice => {
      const rect = voice.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      const height = voice.querySelector('.voice-stage').offsetHeight;
      const progress = Math.max(0, Math.min(1, -rect.top / (height * .66)));
      voice.style.setProperty('--voice-wash', String(reduceMotion.matches ? 0 : progress * .96));
    });
  };
  const scheduleVoiceUpdate = () => {
    if (!voiceFrame) voiceFrame = requestAnimationFrame(updateVoices);
  };
  window.addEventListener('scroll', scheduleVoiceUpdate, { passive: true });
  window.addEventListener('resize', scheduleVoiceUpdate, { passive: true });
  reduceMotion.addEventListener('change', scheduleVoiceUpdate);
  scheduleVoiceUpdate();

  document.querySelectorAll('[data-store-gallery]').forEach(gallery => {
    const track = gallery.querySelector('.store-gallery-track');
    const buttons = [...gallery.querySelectorAll('[data-slide]')];
    let current = 0;
    const update = () => {
      current = Math.max(0, Math.min(buttons.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
      buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(current === i)));
    };
    const go = index => {
      track.scrollTo({ left: Math.max(0, Math.min(buttons.length - 1, index)) * track.clientWidth, behavior: reduceMotion.matches ? 'instant' : 'smooth' });
    };
    buttons.forEach((button, i) => button.addEventListener('click', () => go(i)));
    track.addEventListener('scroll', update, { passive: true });
    track.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      go(current + (event.key === 'ArrowLeft' ? -1 : 1));
    });
    window.addEventListener('resize', () => {
      track.scrollTo({ left: current * track.clientWidth, behavior: 'instant' });
      update();
    }, { passive: true });
    update();
  });
})();
