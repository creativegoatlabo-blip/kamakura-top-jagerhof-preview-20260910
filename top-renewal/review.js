(() => {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('#header');
  const siteNotice = document.querySelector('.site-notice');
  const dialog = document.querySelector('#menu-dialog');
  const menuButton = document.querySelector('#menu-open');
  const guideButton = document.querySelector('#guide-open');
  const closeButton = dialog.querySelector('.drawer-close');
  const home = dialog.querySelector('#drawer-home');
  const content = dialog.querySelector('.drawer-content');
  const pages = [...dialog.querySelectorAll('.drawer-page')];
  const mobileDrawer = matchMedia('(max-width: 767px)');
  const accordionMotion = {duration: 330, easing: 'cubic-bezier(.35, 0, .22, 1)'};
  const categories = [...home.querySelectorAll('.drawer-next')].map(trigger => ({
    trigger,
    panel: document.getElementById(trigger.getAttribute('aria-controls')),
  }));
  const drawerAnimations = new WeakMap();
  const guideTrigger = home.querySelector('[aria-controls="drawer-guide"]');
  let opener = menuButton;
  let destinationHeading = null;
  let categoryTrigger = null;
  let homeScroll = 0;

  function showCategory(trigger, fromHeader = false) {
    categoryTrigger = trigger;
    homeScroll = dialog.scrollTop;
    const page = document.getElementById(trigger.getAttribute('aria-controls'));
    home.hidden = true;
    page.hidden = false;
    content.dataset.direction = 'forward';
    dialog.scrollTop = 0;
    const target = page.querySelector(fromHeader ? 'a' : 'h2');
    target.focus({preventScroll: true});
  }

  function showHome() {
    for (const {trigger, panel} of categories) {
      drawerAnimations.get(panel)?.cancel();
      drawerAnimations.delete(panel);
      panel.classList.remove('is-sliding');
      panel.hidden = true;
      panel.inert = false;
      if (mobileDrawer.matches) trigger.setAttribute('aria-expanded', 'false');
    }
    home.hidden = false;
  }

  function syncDrawerLayout() {
    if (mobileDrawer.matches) {
      for (const {trigger, panel} of categories) trigger.after(panel);
    } else {
      content.append(...pages);
      for (const {trigger} of categories) trigger.removeAttribute('aria-expanded');
    }
    showHome();
    delete content.dataset.direction;
    if (dialog.open) dialog.scrollTop = 0;
  }

  function toggleDrawerCategory(trigger, panel) {
    const expanded = trigger.getAttribute('aria-expanded') !== 'true';
    const start = panel.hidden ? 0 : panel.getBoundingClientRect().height;
    drawerAnimations.get(panel)?.cancel();
    drawerAnimations.delete(panel);
    trigger.setAttribute('aria-expanded', String(expanded));
    panel.inert = !expanded;
    if (motionQuery.matches) {
      panel.hidden = !expanded;
      panel.classList.remove('is-sliding');
      return;
    }
    panel.hidden = false;
    panel.classList.add('is-sliding');
    const end = expanded ? panel.scrollHeight : 0;
    const animation = panel.animate({height: [`${start}px`, `${end}px`]}, accordionMotion);
    drawerAnimations.set(panel, animation);
    animation.onfinish = () => {
      panel.hidden = !expanded;
      panel.classList.remove('is-sliding');
      drawerAnimations.delete(panel);
    };
  }

  function openMenu(trigger, event) {
    if (dialog.open) return;
    opener = trigger;
    showHome();
    delete content.dataset.direction;
    dialog.toggleAttribute('data-pointer-open', mobileDrawer.matches && event.detail > 0);
    dialog.showModal();
    // Render the offscreen position before starting the slide.
    dialog.getBoundingClientRect();
    dialog.setAttribute('data-visible', '');
    trigger.setAttribute('aria-expanded', 'true');
    dialog.scrollTop = 0;
    if (trigger === guideButton) {
      if (mobileDrawer.matches) toggleDrawerCategory(guideTrigger, document.getElementById('drawer-guide'));
      else showCategory(guideTrigger, true);
    }
  }

  async function closeMenu(anchor) {
    if (!dialog.hasAttribute('data-visible')) return;
    dialog.removeAttribute('data-visible');
    const slide = dialog.getAnimations().find(animation => animation.transitionProperty === 'transform');
    if (slide) await slide.finished.catch(() => {});
    dialog.close();

    if (anchor) {
      if (location.hash === anchor) document.getElementById(anchor.slice(1))?.scrollIntoView();
      else location.hash = anchor;
    }
  }

  if (mobileDrawer.matches) syncDrawerLayout();
  mobileDrawer.addEventListener('change', syncDrawerLayout);
  menuButton.addEventListener('click', event => openMenu(menuButton, event));
  guideButton.addEventListener('click', event => openMenu(guideButton, event));
  dialog.addEventListener('keydown', () => dialog.removeAttribute('data-pointer-open'));
  for (const {trigger, panel} of categories) {
    trigger.addEventListener('click', () => {
      if (mobileDrawer.matches) toggleDrawerCategory(trigger, panel);
      else showCategory(trigger);
    });
  }
  for (const button of dialog.querySelectorAll('.drawer-back')) {
    button.addEventListener('click', () => {
      showHome();
      content.dataset.direction = 'back';
      dialog.scrollTop = homeScroll;
      categoryTrigger.focus({preventScroll: true});
      categoryTrigger.scrollIntoView({block: 'nearest', behavior: 'instant'});
    });
  }
  closeButton.addEventListener('click', () => closeMenu());
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeMenu();
  });

  function onBackdrop(event) {
    if (event.target !== dialog) return false;
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right ||
           event.clientY < box.top || event.clientY > box.bottom;
  }
  let pressedBackdrop = false;
  dialog.addEventListener('pointerdown', event => { pressedBackdrop = onBackdrop(event); });
  dialog.addEventListener('click', event => {
    if (pressedBackdrop && onBackdrop(event)) {
      closeMenu();
      return;
    }
    const link = event.target.closest('a[href]');
    if (!link || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const href = link.getAttribute('href');
    if (href.startsWith('#')) {
      event.preventDefault();
      if (!dialog.hasAttribute('data-visible')) return;
      const section = document.getElementById(href.slice(1));
      destinationHeading = section?.querySelector('h1, h2');
      closeMenu(href);
      return;
    }
    closeMenu();
  });
  dialog.addEventListener('close', () => {
    opener.setAttribute('aria-expanded', 'false');
    if (destinationHeading) {
      destinationHeading.tabIndex = -1;
      destinationHeading.focus({preventScroll: true});
      destinationHeading = null;
    } else {
      (opener.offsetParent ? opener : menuButton).focus({preventScroll: true});
    }
  });
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

  const conceptReveal = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('seen');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.28, rootMargin: '0px 0px -9% 0px' });
  document.querySelectorAll('.concept-block').forEach(block => conceptReveal.observe(block));

  let scheduled = false;
  function updateHeader() {
    if (siteNotice && header) {
      const top = Math.max(0, siteNotice.getBoundingClientRect().bottom);
      header.style.setProperty('--header-top', `${top}px`);
    }
    header?.classList.toggle('scrolled', window.scrollY > 70);
    scheduled = false;
  }
  function scheduleHeader() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateHeader);
  }
  window.addEventListener('scroll', scheduleHeader, { passive: true });
  window.addEventListener('resize', scheduleHeader, { passive: true });
  window.addEventListener('pageshow', scheduleHeader);
  motionQuery.addEventListener('change', () => {
    document.documentElement.classList.toggle('motion-ready', !motionQuery.matches);
  });

  function setupHeroVideos() {
    const filmGrid = document.querySelector('#hero-films');
    if (!filmGrid) return;
    const films = [...filmGrid.querySelectorAll('video.hero-film')];
    if (!films.length) return;
    const composite = filmGrid.querySelector('#hero-composite-film');
    const compositeMotion = filmGrid.querySelector('#hero-composite-motion');
    const startButton = document.querySelector('#hero-video-start');
    const connection = navigator.connection;
    const mobileMedia = matchMedia('(max-width: 767px), (max-height: 580px) and (any-pointer: coarse)');
    const portraitMedia = matchMedia('(max-width: 767px) and (orientation: portrait)');
    const landscapeMedia = matchMedia('(max-height: 580px) and (any-pointer: coarse) and (orientation: landscape)');
    const rotation = matchMedia('(orientation: landscape)');
    const iPhone = /\b(?:iPhone|iPod)\b/.test(navigator.userAgent);
    const phoneScreen = iPhone || (navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) <= 540);
    // Safari can animate an MP4 in an image without starting a video element.
    const preferCompositeMotion = iPhone || (phoneScreen && navigator.vendor === 'Apple Computer, Inc.');
    const failedFilms = new Set();
    const failedComposites = new Set();
    const failedVideoImages = new Set();
    const failedMotion = new Set();
    let autoplayBlocked = false;
    let inView = false;
    let pendingStart = null;
    let readinessTimer = 0;
    let compositeTimer = 0;
    let mediaFrame = 0;

    function mayPlay() {
      return !motionQuery.matches && !connection?.saveData && inView && !document.hidden && !dialog.open;
    }

    function compositeMode() {
      const mode = phoneScreen ? (rotation.matches ? 'landscape' : 'portrait') :
        portraitMedia.matches ? 'portrait' : landscapeMedia.matches ? 'landscape' : null;
      return failedComposites.has(mode) ? null : mode;
    }

    function useCompositeMotion(mode) {
      return mode !== null && !failedMotion.has(mode) && (preferCompositeMotion || autoplayBlocked);
    }

    function motionSource(mode) {
      const format = preferCompositeMotion && !failedVideoImages.has(mode) ? 'Video' : 'Src';
      return compositeMotion.dataset[mode + format];
    }

    function clearCompositeTimer() {
      clearTimeout(compositeTimer);
      compositeTimer = 0;
    }

    function pauseComposite() {
      clearCompositeTimer();
      composite.autoplay = false;
      if (!composite.paused) composite.pause();
    }

    function stopCompositeMotion() {
      compositeMotion.hidden = true;
      compositeMotion.removeAttribute('src');
    }

    function tryCompositePlay() {
      const source = composite.getAttribute('src');
      composite.play().catch(error => {
        if (error.name !== 'NotAllowedError' || source !== composite.getAttribute('src') ||
          !compositeMode() || !mayPlay() || !composite.paused) return;
        autoplayBlocked = true;
        syncPlayback();
      });
    }

    function syncComposite(mode, visible) {
      if (!visible) {
        pauseComposite();
        stopCompositeMotion();
        if (motionQuery.matches || connection?.saveData) composite.hidden = true;
        return;
      }

      if (useCompositeMotion(mode)) {
        pauseComposite();
        composite.hidden = true;
        const source = motionSource(mode);
        if (source !== compositeMotion.getAttribute('src')) {
          // Let Safari paint decoded movie frames while the resource is loading.
          compositeMotion.hidden = source !== compositeMotion.dataset[mode + 'Video'];
          compositeMotion.src = source;
        }
        return;
      }

      stopCompositeMotion();
      composite.hidden = false;
      if (autoplayBlocked) {
        pauseComposite();
        return;
      }
      const source = composite.dataset[`${mode}Src`];
      if (source !== composite.getAttribute('src')) {
        pauseComposite();
        composite.poster = composite.dataset[`${mode}Poster`];
        composite.preload = 'auto';
        // Let the browser start the single silent video before calling play().
        composite.autoplay = true;
        composite.src = source;
        compositeTimer = setTimeout(() => {
          compositeTimer = 0;
          if (mayPlay() && composite.paused) tryCompositePlay();
        }, 2200);
      } else if (!composite.autoplay) {
        composite.autoplay = true;
        if (composite.paused) tryCompositePlay();
      }
    }

    function pauseFilms() {
      clearTimeout(readinessTimer);
      readinessTimer = 0;
      pendingStart = null;
      films.forEach(film => film.pause());
    }

    function markFailed(film) {
      failedFilms.add(film);
      if (failedFilms.size === films.length) {
        pauseFilms();
        return;
      }
      syncPlayback();
    }

    function loadFilm(film) {
      const source = mobileMedia.matches ? film.dataset.mobileSrc || film.dataset.src : film.dataset.src;
      if (!source) {
        markFailed(film);
        return;
      }
      if (film.getAttribute('src') === source) return;
      film.src = source;
      film.preload = 'auto';
      film.load();
    }

    function startReadyFilms(skipPreloadWait = false) {
      if (pendingStart || autoplayBlocked || !mayPlay() || compositeMode()) return;
      const activeFilms = films.filter(film => !failedFilms.has(film));
      if (!activeFilms.some(film => film.paused)) return;
      // Safari may preload metadata only. Request all four plays together even if
      // one is still waiting for video data after the initial preload window.
      if (!skipPreloadWait && activeFilms.some(film => film.readyState < HTMLMediaElement.HAVE_FUTURE_DATA)) {
        if (!readinessTimer) {
          readinessTimer = setTimeout(() => {
            readinessTimer = 0;
            startReadyFilms(true);
          }, 700);
        }
        return;
      }
      clearTimeout(readinessTimer);
      readinessTimer = 0;
      const attempt = {};
      pendingStart = attempt;
      Promise.all(activeFilms.map(async film => {
        try {
          await film.play();
        } catch (error) {
          if (pendingStart !== attempt) return;
          if (error.name === 'NotAllowedError') {
            autoplayBlocked = true;
            syncPlayback();
          } else if (error.name !== 'AbortError') {
            markFailed(film);
          }
        }
      })).then(() => {
        if (pendingStart === attempt) pendingStart = null;
      });
    }

    function syncPlayback() {
      const visible = mayPlay();
      const mode = compositeMode();
      startButton.hidden = !visible || !autoplayBlocked || useCompositeMotion(mode);
      if (mode) {
        pauseFilms();
        syncComposite(mode, visible);
        return;
      }

      pauseComposite();
      stopCompositeMotion();
      composite.hidden = true;
      if (!visible || autoplayBlocked) {
        pauseFilms();
        return;
      }
      films.filter(film => !failedFilms.has(film)).forEach(loadFilm);
      startReadyFilms();
    }

    films.forEach(film => {
      film.defaultMuted = true;
      film.muted = true;
      film.loop = true;
      film.playsInline = true;
      film.autoplay = false;
      film.addEventListener('canplay', () => startReadyFilms());
      film.addEventListener('playing', () => {
        if (autoplayBlocked || !mayPlay()) film.pause();
      });
      film.addEventListener('error', () => markFailed(film));
    });

    composite.addEventListener('playing', () => {
      clearCompositeTimer();
      if (autoplayBlocked || !compositeMode() || !mayPlay()) pauseComposite();
    });
    composite.addEventListener('error', () => {
      const mode = compositeMode();
      if (!mode || composite.getAttribute('src') !== composite.dataset[`${mode}Src`]) return;
      failedComposites.add(mode);
      syncPlayback();
    });

    compositeMotion.addEventListener('load', () => {
      const mode = compositeMode();
      if (useCompositeMotion(mode) && mayPlay() &&
        compositeMotion.getAttribute('src') === motionSource(mode)) {
        compositeMotion.hidden = false;
      }
    });
    compositeMotion.addEventListener('error', () => {
      const mode = compositeMode();
      const source = compositeMotion.getAttribute('src');
      if (!mode || !source || source !== motionSource(mode)) return;
      if (source === compositeMotion.dataset[mode + 'Video']) {
        failedVideoImages.add(mode);
      } else {
        failedMotion.add(mode);
      }
      stopCompositeMotion();
      syncPlayback();
    });

    startButton.addEventListener('click', () => {
      autoplayBlocked = false;
      startButton.hidden = true;
      if (compositeMode()) {
        composite.autoplay = true;
        tryCompositePlay();
        return;
      }
      films.filter(film => !failedFilms.has(film)).forEach(loadFilm);
      startReadyFilms(true);
    });

    const filmObserver = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting && entries[0].intersectionRatio > 0;
      syncPlayback();
    }, { threshold: 0.01 });
    filmObserver.observe(document.querySelector('#top') || filmGrid);
    document.addEventListener('visibilitychange', syncPlayback);
    new MutationObserver(syncPlayback).observe(dialog, { attributes: true, attributeFilter: ['open'] });
    for (const query of [mobileMedia, portraitMedia, landscapeMedia, rotation]) {
      query.addEventListener('change', () => {
        if (mediaFrame) return;
        mediaFrame = requestAnimationFrame(() => {
          mediaFrame = 0;
          pauseFilms();
          pauseComposite();
          stopCompositeMotion();
          failedFilms.clear();
          autoplayBlocked = false;
          syncPlayback();
        });
      });
    }
    motionQuery.addEventListener('change', syncPlayback);
    connection?.addEventListener?.('change', syncPlayback);
    window.addEventListener('pagehide', () => {
      pauseFilms();
      pauseComposite();
      stopCompositeMotion();
    });
    window.addEventListener('pageshow', syncPlayback);
  }


  function setupDetailsAccordion(section, body, timing) {
    const summary = section.querySelector('summary');
    let animation = null;

    function setOpen(open) {
      animation?.cancel();
      animation = null;
      section.open = open;
      body.inert = false;
      delete section.dataset.motion;
    }

    summary.addEventListener('click', event => {
      const options = timing();
      if (!options || motionQuery.matches) return;
      event.preventDefault();
      const open = !section.open || section.dataset.motion === 'closing';
      const start = section.getBoundingClientRect().height;
      animation?.cancel();

      if (!open && body.contains(document.activeElement)) {
        summary.focus({preventScroll: true});
      }
      section.open = true;
      body.inert = !open;
      section.dataset.motion = open ? 'opening' : 'closing';
      const fullHeight = section.getBoundingClientRect().height;
      const end = open ? fullHeight : fullHeight - body.getBoundingClientRect().height;
      animation = section.animate({height: [`${start}px`, `${end}px`]}, options);
      animation.onfinish = () => setOpen(open);
    });

    function finishAnimation() {
      if (animation) setOpen(section.dataset.motion === 'opening');
    }

    mobileDrawer.addEventListener('change', finishAnimation);
    motionQuery.addEventListener('change', finishAnimation);
    return setOpen;
  }

  const desktopQuestionMotion = {duration: 380, easing: 'cubic-bezier(.22, 1, .36, 1)'};
  document.querySelectorAll('#faq .question').forEach(section => {
    setupDetailsAccordion(section, section.querySelector('.answer'),
      () => mobileDrawer.matches ? accordionMotion : desktopQuestionMotion);
  });

  document.querySelectorAll('#footer .site-footer__group details').forEach(section => {
    const setOpen = setupDetailsAccordion(section, section.querySelector('ul'),
      () => mobileDrawer.matches ? accordionMotion : null);

    function syncFooterSection() {
      const open = !mobileDrawer.matches;
      if (!open && section.contains(document.activeElement)) {
        section.querySelector('summary').focus({preventScroll: true});
      }
      setOpen(open);
    }

    mobileDrawer.addEventListener('change', syncFooterSection);
    syncFooterSection();
  });
  setupHeroVideos();
  updateHeader();
})();
