/* =============================================================================
   Portfolio motion layer — progressive enhancement
   Requires <html class="js"> set early in <head>.
   ============================================================================= */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mqDesktop = window.matchMedia('(min-width: 861px)');

  const prefersHeavyFX = () => finePointer && mqDesktop.matches && !reduceMotion;

  /* ——— Scroll progress ——— */
  function initScrollProgress() {
    let bar = document.querySelector('.scroll-progress__bar');
    if (!bar) {
      const wrap = document.createElement('div');
      wrap.className = 'scroll-progress';
      wrap.setAttribute('aria-hidden', 'true');
      bar = document.createElement('span');
      bar.className = 'scroll-progress__bar';
      wrap.appendChild(bar);
      document.body.prepend(wrap);
    }

    let ticking = false;
    function update() {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)).toFixed(4) + ')';
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ——— Nav scrolled + scroll-spy (enhances existing markup) ——— */
  function initNavBehaviors() {
    const nav = document.getElementById('navbar');
    if (!nav) return;

    const sectionIds = ['about', 'work', 'expertise', 'experience', 'certifications', 'contact'];
    const navAnchors = document.querySelectorAll('.nav-links a, .mobile-menu a[href^="#"]');
    const backTop = document.getElementById('back-top');

    let ticking = false;
    function update() {
      ticking = false;
      const y = window.scrollY || 0;
      nav.classList.toggle('scrolled', y > 12);
      if (backTop) backTop.classList.toggle('show', y > 500);

      let current = 'about';
      for (let i = 0; i < sectionIds.length; i++) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.getBoundingClientRect().top <= 140) current = sectionIds[i];
      }
      if (window.innerHeight + y >= document.documentElement.scrollHeight - 4) {
        current = 'contact';
      }

      navAnchors.forEach(function (a) {
        const isActive = a.getAttribute('href') === '#' + current;
        a.classList.toggle('active', isActive);
        if (isActive) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ——— Reveal observer (once) ——— */
  function initReveals() {
    const nodes = document.querySelectorAll('.reveal, .reveal-children');
    if (!nodes.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      nodes.forEach(function (el) { el.classList.add('in'); });
      return;
    }

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const stagger = el.getAttribute('data-stagger');
        if (stagger && el.classList.contains('reveal-children')) {
          Array.prototype.forEach.call(el.children, function (child, i) {
            child.style.setProperty('--child-delay', (i * parseInt(stagger, 10)) + 'ms');
          });
        }
        const delay = el.getAttribute('data-delay');
        if (delay) el.style.setProperty('--reveal-delay', delay + 'ms');
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ——— Hero: split words + sequenced entrance + spotlight ——— */
  function initHero() {
    const hero = document.getElementById('home');
    if (!hero) return;

    const headline = hero.querySelector('[data-hero="headline"]');
    if (headline && !reduceMotion) {
      let wordIndex = 0;
      headline.querySelectorAll('.line').forEach(function (line) {
        const parts = line.textContent.trim().split(/\s+/);
        line.textContent = '';
        parts.forEach(function (w, i) {
          const span = document.createElement('span');
          span.className = 'word';
          span.style.setProperty('--w-i', String(wordIndex++));
          span.textContent = w;
          line.appendChild(span);
          if (i < parts.length - 1) line.appendChild(document.createTextNode(' '));
        });
      });
    }

    /* Ensure entrance runs even if rAF is throttled (background tabs) */
    function markHeroReady() {
      hero.classList.add('is-ready');
    }
    if (reduceMotion) {
      markHeroReady();
    } else {
      requestAnimationFrame(markHeroReady);
      setTimeout(markHeroReady, 80);
    }

    /* Desktop cursor spotlight */
    const spot = hero.querySelector('.hero-spotlight');
    if (spot && prefersHeavyFX()) {
      let raf = 0;
      let lx = 0;
      let ly = 0;
      function paint() {
        raf = 0;
        hero.style.setProperty('--spot-x', lx + 'px');
        hero.style.setProperty('--spot-y', ly + 'px');
      }
      hero.addEventListener('pointermove', function (e) {
        const r = hero.getBoundingClientRect();
        lx = e.clientX - r.left;
        ly = e.clientY - r.top;
        if (!raf) raf = requestAnimationFrame(paint);
      }, { passive: true });
      hero.addEventListener('pointerenter', function () {
        hero.classList.add('has-spotlight');
      });
      hero.addEventListener('pointerleave', function () {
        hero.classList.remove('has-spotlight');
      });
    }
  }

  /* ——— Stats count-up (once) ——— */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function initCounters() {
    const nodes = document.querySelectorAll('[data-count]');
    if (!nodes.length) return;

    function animate(el) {
      const target = parseInt(el.getAttribute('data-count'), 10);
      if (!target && target !== 0) return;
      if (reduceMotion) {
        el.textContent = String(target);
        return;
      }
      el.textContent = '0';
      const duration = 900;
      const start = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = String(Math.round(easeOutCubic(t) * target));
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    if (!('IntersectionObserver' in window)) {
      nodes.forEach(animate);
      return;
    }

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    nodes.forEach(function (el) { io.observe(el); });
  }

  /* ——— Project card 3D tilt + glow (desktop only) ——— */
  function initTiltCards() {
    if (!prefersHeavyFX()) return;
    document.querySelectorAll('.tilt-card').forEach(function (card) {
      let raf = 0;
      let rx = 0;
      let ry = 0;
      let gx = '50%';
      let gy = '50%';

      function paint() {
        raf = 0;
        card.style.setProperty('--tilt-x', rx.toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', ry.toFixed(2) + 'deg');
        card.style.setProperty('--glow-x', gx);
        card.style.setProperty('--glow-y', gy);
      }

      card.addEventListener('pointermove', function (e) {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ry = (px - 0.5) * 10;
        rx = (0.5 - py) * 8;
        gx = (px * 100).toFixed(1) + '%';
        gy = (py * 100).toFixed(1) + '%';
        card.classList.add('is-tilting');
        if (!raf) raf = requestAnimationFrame(paint);
      }, { passive: true });

      card.addEventListener('pointerleave', function () {
        card.classList.remove('is-tilting');
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
      });
    });
  }

  /* ——— Workflow badge highlight cycle ——— */
  function initWorkflowCycles() {
    if (reduceMotion) return;
    document.querySelectorAll('[data-workflow]').forEach(function (wrap) {
      const steps = wrap.querySelectorAll('[data-step]');
      if (!steps.length) return;
      let i = 0;
      function tick() {
        steps.forEach(function (s, idx) {
          s.classList.toggle('is-active', idx === i);
        });
        i = (i + 1) % steps.length;
      }
      tick();
      setInterval(tick, 1400);
    });
  }

  /* ——— Magnetic hover (subtle, desktop) ——— */
  function initMagnetic() {
    if (!prefersHeavyFX()) return;
    document.querySelectorAll('.magnetic, .btn.btn-primary, .btn.btn-secondary').forEach(function (el) {
      let raf = 0;
      let tx = 0;
      let ty = 0;

      function paint() {
        raf = 0;
        el.style.transform = 'translate(' + tx.toFixed(1) + 'px, ' + ty.toFixed(1) + 'px)';
      }

      el.addEventListener('pointermove', function (e) {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        tx = dx * 0.18;
        ty = dy * 0.18;
        if (!raf) raf = requestAnimationFrame(paint);
      }, { passive: true });

      el.addEventListener('pointerleave', function () {
        tx = 0;
        ty = 0;
        if (!raf) raf = requestAnimationFrame(paint);
      });
    });
  }

  /* ——— Public helpers for later phases ——— */
  window.PortfolioMotion = {
    reduceMotion: reduceMotion,
    finePointer: finePointer,
    prefersHeavyFX: prefersHeavyFX,
    mqDesktop: mqDesktop
  };

  /* ——— Timeline draw + node activation ——— */
  function initTimeline() {
    const timeline = document.querySelector('[data-timeline]');
    if (!timeline) return;
    const items = timeline.querySelectorAll('.tl-item');

    let ticking = false;
    function update() {
      ticking = false;
      const rect = timeline.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.75;
      const end = vh * 0.25;
      const total = rect.height + (start - end);
      const traveled = start - rect.top;
      const p = Math.min(1, Math.max(0, traveled / total));
      timeline.style.setProperty('--tl-progress', p.toFixed(4));

      items.forEach(function (item) {
        const r = item.getBoundingClientRect();
        const active = r.top < vh * 0.65 && r.bottom > vh * 0.2;
        item.classList.toggle('is-active', active);
      });
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ——— Button ripple on Download Resume ——— */
  function initRipples() {
    document.querySelectorAll('.btn-ripple').forEach(function (btn) {
      btn.addEventListener('pointerdown', function (e) {
        if (reduceMotion) return;
        const r = btn.getBoundingClientRect();
        btn.style.setProperty('--ripple-x', (e.clientX - r.left) + 'px');
        btn.style.setProperty('--ripple-y', (e.clientY - r.top) + 'px');
        btn.classList.remove('is-rippling');
        void btn.offsetWidth;
        btn.classList.add('is-rippling');
      });
      btn.addEventListener('animationend', function () {
        btn.classList.remove('is-rippling');
      });
    });
  }

  /* ——— Optional custom cursor (never hides native; desktop only) ——— */
  function initCursor() {
    if (!prefersHeavyFX()) return;

    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.documentElement.classList.add('has-cursor');

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;
    let raf = 0;

    function paint() {
      raf = 0;
      rx += (x - rx) * 0.22;
      ry += (y - ry) * 0.22;
      dot.style.transform = 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -50%)';
      ring.style.transform = 'translate(' + rx + 'px, ' + ry + 'px) translate(-50%, -50%)';
      if (Math.abs(x - rx) > 0.15 || Math.abs(y - ry) > 0.15) {
        raf = requestAnimationFrame(paint);
      }
    }

    window.addEventListener('pointermove', function (e) {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });

    document.addEventListener('pointerover', function (e) {
      const hot = e.target.closest('a, button, .skill-pill, .project-card, .cert-card');
      ring.classList.toggle('is-hot', !!hot);
    }, true);
  }

  function boot() {
    initScrollProgress();
    initNavBehaviors();
    initReveals();
    initHero();
    initCounters();
    initTiltCards();
    initWorkflowCycles();
    initMagnetic();
    initTimeline();
    initRipples();
    initCursor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
