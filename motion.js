/* CAAB — motion layer. Local GSAP 3.15.0; the document works without it. */
(() => {
  'use strict';

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const SplitText = window.SplitText;
  const api = {
    version: gsap?.version || null,
    enabled: false,
    setScene: () => false,
    refresh: () => {},
    destroy: () => {}
  };
  window.CAAB_MOTION = api;
  if (!gsap) return;

  if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (SplitText) gsap.registerPlugin(SplitText);

  const stage = document.querySelector('#day-night-stage');
  const nightImage = document.querySelector('#scene-image');
  const divider = document.querySelector('#scene-divider');
  const dayLabel = document.querySelector('.scene-day-label');
  const nightLabel = document.querySelector('.scene-night-label');
  const progressBar = document.querySelector('#scroll-progress');
  const scene = { amount: 0 };
  const revealedElements = new WeakSet();
  const clamp = gsap.utils.clamp(0, 1);
  const clipAt = amount => `inset(0 ${(100 * (1 - clamp(amount))).toFixed(3)}% 0 0)`;

  let media = null;
  let listeners = null;
  let stageObserver = null;
  let sceneTimeline = null;
  let sceneChoiceTween = null;
  let chooseScene = null;
  let renderScene = null;
  let manualChoice = null;
  let announcedNight = null;
  // Independent from tween targets so context.revert() cannot discard the
  // current visual selection when reduced-motion or the breakpoint changes.
  let visualAmount = 0;
  let stageWidth = stage?.clientWidth || 0;
  let refreshTimer = 0;
  let progressFrame = 0;
  let hasRunEntrance = false;
  let active = false;

  function announceScene(amount) {
    const night = manualChoice ?? (amount >= 0.5);
    stage?.classList.toggle('is-night', night);
    if (announcedNight === night) return;
    announcedNight = night;
    document.dispatchEvent(new CustomEvent('caab:scene-progress', {
      detail: { night, progress: amount }
    }));
  }

  // Used after a media change or pagehide too: the chosen view stays readable
  // even while all animation contexts are being reverted.
  function paintSceneInstant(night) {
    if (!stage || !nightImage) return;
    scene.amount = night ? 1 : 0;
    visualAmount = scene.amount;
    nightImage.style.clipPath = clipAt(scene.amount);
    if (divider) {
      divider.style.transform = `translate3d(${stageWidth * scene.amount}px, 0, 0)`;
      divider.style.opacity = '0';
    }
    if (dayLabel) dayLabel.style.opacity = night ? '0' : '1';
    if (nightLabel) nightLabel.style.opacity = night ? '1' : '0';
    announceScene(scene.amount);
  }

  function stopSceneScroll() {
    if (!sceneTimeline) return;
    // A button takes ownership of this scene, leaving every other trigger alone.
    sceneTimeline.scrollTrigger?.kill(false);
    sceneTimeline.kill();
    sceneTimeline = null;
  }

  function requestRefresh() {
    if (!active) return;
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => {
      if (!active) return;
      stageWidth = stage?.clientWidth || 0;
      renderScene?.(scene.amount);
      ScrollTrigger?.refresh();
      requestProgress();
    }, 140);
  }

  function drawProgress() {
    progressFrame = 0;
    if (!progressBar || !active) return;
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    const amount = distance > 0 ? clamp(window.scrollY / distance) : 0;
    progressBar.style.transform = `scaleX(${amount})`;
  }

  function requestProgress() {
    if (!progressFrame) progressFrame = window.requestAnimationFrame(drawProgress);
  }

  function setupScene(context, desktop, reduced) {
    if (!stage || !nightImage) return;
    stageWidth = stage.clientWidth;
    const setDividerX = divider ? gsap.quickSetter(divider, 'x', 'px') : null;
    const initialNight = manualChoice ?? (visualAmount >= 0.5);
    scene.amount = initialNight ? 1 : 0;

    // Clip-path reveals the night image from the left. Only its divider moves
    // with transform; the actual frame retains normal document geometry.
    gsap.set(nightImage, { clipPath: clipAt(scene.amount), transition: 'none' });
    if (divider) gsap.set(divider, { x: stageWidth * scene.amount, opacity: 0 });
    if (dayLabel) gsap.set(dayLabel, { opacity: initialNight ? 0 : 1 });
    if (nightLabel) gsap.set(nightLabel, { opacity: initialNight ? 1 : 0 });

    renderScene = amount => {
      scene.amount = clamp(amount);
      visualAmount = scene.amount;
      nightImage.style.clipPath = clipAt(scene.amount);
      setDividerX?.(stageWidth * scene.amount);
      if (divider) divider.style.opacity = String(Math.min(1, scene.amount * 8, (1 - scene.amount) * 8));
      if (dayLabel) dayLabel.style.opacity = String(1 - scene.amount);
      if (nightLabel) nightLabel.style.opacity = String(scene.amount);
      announceScene(scene.amount);
    };
    renderScene(scene.amount);

    // context.add records tweens made by later button events for media cleanup.
    context.add('chooseScene', night => {
      manualChoice = Boolean(night);
      stopSceneScroll();
      sceneChoiceTween?.kill();
      announceScene(scene.amount);
      if (reduced) {
        renderScene(manualChoice ? 1 : 0);
      } else {
        sceneChoiceTween = gsap.timeline({
          defaults: { duration: 0.85, ease: 'power3.inOut' },
          onUpdate: () => renderScene?.(scene.amount),
          onComplete: () => renderScene?.(manualChoice ? 1 : 0)
        }).to(scene, { amount: manualChoice ? 1 : 0 }, 0);
      }
      return true;
    });
    chooseScene = night => context.chooseScene(night);

    if (desktop && !reduced && ScrollTrigger && manualChoice === null) {
      sceneTimeline = gsap.timeline({
        defaults: { duration: 1, ease: 'none' },
        onUpdate: () => renderScene?.(scene.amount),
        scrollTrigger: {
          id: 'caab-day-night',
          trigger: stage,
          start: 'top 70%',
          end: 'bottom 45%',
          scrub: 0.6,
          invalidateOnRefresh: true,
          onRefresh: () => {
            stageWidth = stage.clientWidth;
            renderScene?.(scene.amount);
          }
        }
      }).fromTo(scene, { amount: 0 }, { amount: 1, immediateRender: false }, 0);
    }
  }

  function setupEntrance(desktop, reduced) {
    if (hasRunEntrance) return;
    hasRunEntrance = true;
    const atTop = window.scrollY < 40 && (!location.hash || location.hash === '#accueil');
    if (reduced || !atTop || document.visibilityState === 'hidden') return;

    const lines = gsap.utils.toArray('.hero-title-line > span');
    const mainImage = document.querySelector('.hero-photo-main img');
    const detail = document.querySelector('.hero-photo-detail');
    const intro = document.querySelector('.hero-intro');
    const actions = document.querySelector('.hero-actions');
    const bottom = document.querySelector('.hero-bottom');
    const entrance = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (lines.length) entrance.from(lines, {
      yPercent: 108,
      duration: 1.15,
      stagger: 0.1,
      clearProps: 'transform'
    }, 0.08);
    if (mainImage) entrance.from(mainImage, { scale: 1.065, duration: 1.65, clearProps: 'transform' }, 0);
    if (detail) entrance.from(detail, { y: desktop ? 25 : 10, opacity: 0.65, duration: 1, clearProps: 'transform,opacity' }, 0.4);
    if (intro) entrance.from(intro, { y: 12, opacity: 0.5, duration: 0.85, clearProps: 'transform,opacity' }, 0.43);
    if (actions) entrance.from(actions, { y: 10, opacity: 0.6, duration: 0.8, clearProps: 'transform,opacity' }, 0.62);
    if (bottom) entrance.from(bottom, { opacity: 0.4, duration: 0.8, clearProps: 'opacity' }, 0.72);
  }

  function setupReveals(desktop) {
    if (!ScrollTrigger) return;
    const belowViewport = element => element.getBoundingClientRect().top > window.innerHeight * 0.88;
    const needsReveal = element => {
      if (revealedElements.has(element)) return false;
      if (belowViewport(element)) return true;
      revealedElements.add(element);
      return false;
    };

    document.querySelectorAll('.editorial-intro .intro-line').forEach(line => {
      if (!needsReveal(line)) return;
      if (SplitText && !line.querySelector('a,button,input,select')) {
        SplitText.create(line, {
          type: 'words',
          tag: 'span',
          aria: 'auto',
          autoSplit: true,
          wordsClass: 'intro-word',
          onSplit(self) {
            if (revealedElements.has(line)) return;
            return gsap.from(self.words, {
              y: desktop ? 14 : 8,
              opacity: 0.45,
              duration: 0.8,
              stagger: 0.035,
              ease: 'power2.out',
              immediateRender: false,
              clearProps: 'transform,opacity',
              scrollTrigger: { trigger: line, start: 'top 88%', once: true, onEnter: () => revealedElements.add(line) }
            });
          }
        });
      } else {
        gsap.from(line, {
          y: 14,
          opacity: 0.65,
          duration: 0.8,
          ease: 'power2.out',
          immediateRender: false,
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: line, start: 'top 88%', once: true, onEnter: () => revealedElements.add(line) }
        });
      }
    });

    document.querySelectorAll('.craft-list article, .method li').forEach(item => {
      if (!needsReveal(item)) return;
      gsap.from(item, {
        y: desktop ? 20 : 10,
        opacity: 0.72,
        duration: 0.75,
        ease: 'power2.out',
        immediateRender: false,
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: item, start: 'top 88%', once: true, onEnter: () => revealedElements.add(item) }
      });
    });
  }

  function setupParallax() {
    if (!ScrollTrigger) return;
    document.querySelectorAll('.craft-detail img, .approach-image img').forEach(image => {
      const frame = image.closest('.image-crop, .photo-crop, .image-frame') || image.parentElement;
      // The scale gives this small translation enough overscan inside its frame.
      gsap.fromTo(image, { yPercent: -3, scale: 1.075 }, {
        yPercent: 3,
        scale: 1.075,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: {
          trigger: frame,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.7
        }
      });
    });
  }

  function start() {
    if (active) return;
    active = true;
    api.enabled = true;
    listeners = new AbortController();
    const signal = listeners.signal;

    media = gsap.matchMedia();
    media.add({
      all: 'all',
      desktop: '(min-width: 1001px)',
      reduced: '(prefers-reduced-motion: reduce)'
    }, context => {
      const { desktop, reduced } = context.conditions;
      setupEntrance(desktop, reduced);
      setupScene(context, desktop, reduced);
      if (!reduced) {
        setupReveals(desktop);
        if (desktop) setupParallax();
      }
      return () => {
        sceneChoiceTween?.kill();
        sceneChoiceTween = null;
        stopSceneScroll();
        chooseScene = null;
        renderScene = null;
      };
    }, document.body);

    if (stage && typeof ResizeObserver !== 'undefined') {
      stageObserver = new ResizeObserver(() => {
        stageWidth = stage.clientWidth;
        renderScene?.(scene.amount);
      });
      stageObserver.observe(stage);
    }

    window.addEventListener('scroll', requestProgress, { passive: true, signal });
    window.addEventListener('resize', requestRefresh, { passive: true, signal });
    window.addEventListener('load', requestRefresh, { once: true, signal });
    document.querySelectorAll('#album, #preview-info').forEach(details => {
      details.addEventListener('toggle', requestRefresh, { signal });
    });
    document.querySelectorAll('main img').forEach(image => {
      if (!image.complete) {
        image.addEventListener('load', requestRefresh, { once: true, signal });
        image.addEventListener('error', requestRefresh, { once: true, signal });
      }
    });
    document.fonts?.ready.then(() => { if (!signal.aborted) requestRefresh(); });
    requestProgress();
    requestRefresh();
  }

  function destroy() {
    if (!active) return;
    const keepNight = manualChoice ?? (visualAmount >= 0.5);
    active = false;
    api.enabled = false;
    listeners?.abort();
    stageObserver?.disconnect();
    stageObserver = null;
    window.clearTimeout(refreshTimer);
    window.cancelAnimationFrame(progressFrame);
    progressFrame = 0;
    media?.revert();
    media = null;
    paintSceneInstant(keepNight);
  }

  api.setScene = night => {
    const requestedNight = Boolean(night);
    if (active && chooseScene) return chooseScene(requestedNight);
    manualChoice = requestedNight;
    if (!stage || !nightImage) return false;
    stageWidth = stage.clientWidth;
    paintSceneInstant(requestedNight);
    return true;
  };
  api.refresh = requestRefresh;
  api.destroy = destroy;
  api.getScene = () => ({ night: manualChoice ?? (scene.amount >= 0.5), progress: scene.amount, manual: manualChoice !== null });

  window.addEventListener('pagehide', destroy);
  window.addEventListener('pageshow', event => {
    if (event.persisted) start();
  });

  try {
    start();
  } catch (error) {
    destroy();
    // No hiding class is ever applied: reading, navigation and buttons retain
    // their ordinary CSS behavior when an optional animation cannot initialize.
    console.warn('CAAB: animations unavailable; the page remains usable.', error);
  }
})();
