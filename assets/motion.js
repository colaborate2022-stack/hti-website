/* =====================================================================
   HTI SITE-WIDE MOTION LAYER — behaviour
   ---------------------------------------------------------------------
   Loaded with `defer`, so it runs after the document is parsed and
   before DOMContentLoaded. Everything it does is decoration: no content
   is created, moved or gated behind it.

   SCROLL IS THE ENGINE. Every motion that carries the design is a
   function of where an element sits in the viewport, so a phone with no
   cursor gets exactly the same page as a desktop with one. The pointer
   handlers at the bottom are a small accent and nothing depends on them.

   Pairs with assets/motion.css. The TEXT and CARDS lists below are the
   same selectors as the two big rules in that file — edit them together.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  /* Pages that ship their own [data-reveal] system keep it for their
     headings and paragraphs. Cards are taken over on every page. */
  var lite = root.classList.contains('mo-lite');

  var TEXT = [
    'section>h1', 'section>h2', 'section>h3', 'section>h4', 'section>p',
    'section>.wrap>h1', 'section>.wrap>h2', 'section>.wrap>h3',
    'section>.wrap>h4', 'section>.wrap>p',
    '.section-head', '.sec-head', '.courses-head', '.stats-head',
    '.testi-head', '.track-head', '.leaders-head', '.mfh-header',
    '.center-btn', '.see-all', 'section>.btn-red', 'section>.cta-btn',
    'section>.hero-cta',
    '.article-body>p', '.article-body>h2', '.article-body>h3',
    '.article-body>img', '.article-body>figure',
    '.article>p', '.article>h2', '.article>h3', '.mag-intro', '.mag-summary',
    '.hero-figure', '.stats-band-inner'
  ].join(',');

  var CARDS = [
    '.tl-card', '.learn-item', '.how-step', '.stat-card', '.hero-card',
    '.faq-item', '.course-card', '.meta-card', '.testi-card', '.who-item',
    '.aud-card', '.trainer-card', '.contact-card', '.team-card', '.use-card',
    '.why-item', '.summary-card', '.na-card', '.accordion-item',
    '.footer-col', '.mfh-card', '.blog-card', '.stat-block', '.meta-item',
    '.track-step', '.whatis-col', '.info-col', '.tbr-card'
  ].join(',');

  var EXCLUDE = '.navbar,.marquee,.marquee-track,.logo-column,' +
    '.trainers-carousel,.trainers-track,.tl-spine-track,.shot-strip,' +
    '.scroll-progress,[data-motion="off"]';

  function excluded(el) {
    return el.closest(EXCLUDE) !== null;
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;

  /* -----------------------------------------------------------------
     Navbar depth — cheap, safe everywhere, and runs even under reduced
     motion because it is a shadow rather than a movement.
     ----------------------------------------------------------------- */
  var scrolled = false;
  window.addEventListener('scroll', function () {
    var now = window.scrollY > 12;
    if (now !== scrolled) {
      scrolled = now;
      root.classList.toggle('mo-scrolled', now);
    }
  }, { passive: true });

  /* -----------------------------------------------------------------
     Park off-screen decoration.
     The immersive hero's orb/ring/floor layer and the logo marquees all
     run infinite animations. Left alone they keep compositing for the
     whole length of the page, which on a throttled phone was measured
     at 78% janky frames versus 0% with the hero layer parked. Runs
     before the reduced-motion bail-out below because it is a pure
     saving with nothing to see either way.
     ----------------------------------------------------------------- */
  if (canObserve) {
    var park = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var t = e.target._moPark || e.target;
        t.classList.toggle('is-parked', !e.isIntersecting);
      });
    }, { rootMargin: '120px 0px 120px 0px', threshold: 0 });

    var bg = document.querySelector('.hero3d-bg');
    if (bg) {
      var host = bg.closest('.hero3d') || bg.parentElement;
      host._moPark = bg;
      park.observe(host);
    }

    Array.prototype.forEach.call(
      document.querySelectorAll('.marquee,.logo-column,.trainers-track'),
      function (el) { park.observe(el); }
    );
  }

  if (reduced || !canObserve) {
    root.classList.remove('mo');
    return;
  }

  /* =================================================================
     THE SCROLL ENTRANCE

     One number does all the work: `enter`, how far an element has
     risen through the viewport.

        enter = 0   its top is level with the bottom of the screen
        enter = 1   it has climbed far enough to be at reading height

     Every visual property is a function of that number and of nothing
     else — not of the pointer, not of a timer. Which is precisely why
     the phone and the desktop get the same page.

     Past enter = 1 the element is pinned flat and marked .mo-settled,
     which drops the perspective wrapper so text renders sharp. The old
     version instead kept every card rotating for as long as it was on
     screen, which never let glyphs settle and read as a constant
     wobble across the whole grid.
     ================================================================= */

  var RISE = 46;    /* px it travels up on the way in            */
  var LEAN = 7;     /* deg it is rotated back at the start       */
  var SLIDE = 26;   /* px of sideways drift, alternating by card */
  var SWING = 6;    /* deg of Y rotation that comes with it      */
  var SHRINK = .045;/* how much smaller it starts                */
  var PARALLAX = 26;/* px an image drifts inside its own frame   */

  /* easeOutCubic — fast at first, then a long settle. */
  function ease(t) {
    var u = 1 - t;
    return 1 - u * u * u;
  }

  var live = new Set();
  var tick = null;

  function paint() {
    tick = null;
    var vh = window.innerHeight || 1;
    /* The window over which an element travels from "just appeared" to
       "settled". Longer on tall screens so the motion never feels rushed. */
    var span = vh * 0.62;

    /* Two passes on purpose. Reading a rect while styles are pending
       forces a synchronous layout, so interleaving reads and writes
       across N cards costs N layouts a frame. Batching every read
       first costs one. This is the difference between smooth and
       janky on a mid-range phone. */
    var items = [];
    live.forEach(function (el) {
      items.push([el, el.getBoundingClientRect()]);
    });

    for (var i = 0; i < items.length; i++) {
      var el = items[i][0];
      var r = items[i][1];

      var enter = (vh - r.top) / span;
      enter = enter < 0 ? 0 : (enter > 1 ? 1 : enter);
      var e = ease(enter);
      var rest = 1 - e;
      var s = el.style;

      if (enter >= 1) {
        /* Settled: hand the element back to the browser completely flat.
           Only write once, then leave it alone every subsequent frame. */
        if (!el._moFlat) {
          el._moFlat = true;
          el.classList.add('mo-settled');
          s.setProperty('--mo-sx', '0px');
          s.setProperty('--mo-sy', '0px');
          s.setProperty('--mo-srx', '0deg');
          s.setProperty('--mo-sry', '0deg');
          s.setProperty('--mo-ss', '1');
        }
      } else {
        if (el._moFlat) {
          el._moFlat = false;
          el.classList.remove('mo-settled');
        }
        var dir = el._moDir || 1;
        s.setProperty('--mo-sy', (rest * RISE).toFixed(1) + 'px');
        s.setProperty('--mo-srx', (rest * LEAN).toFixed(2) + 'deg');
        s.setProperty('--mo-ss', (1 - rest * SHRINK).toFixed(4));
        if (el._moCard) {
          s.setProperty('--mo-sx', (rest * SLIDE * dir).toFixed(1) + 'px');
          s.setProperty('--mo-sry', (rest * SWING * -dir).toFixed(2) + 'deg');
        }
      }

      /* Image parallax runs the whole time the card is on screen, not
         just during the entrance — it is the one effect that keeps
         working while you read, and it costs nothing extra because the
         rect is already in hand. */
      if (el._moPar) {
        var mid = (r.top + r.height / 2 - vh / 2) / vh;   /* -0.5 .. 0.5 */
        el._moPar.style.setProperty('--mo-par', (-mid * PARALLAX).toFixed(1) + 'px');
      }
    }
  }

  function queue() {
    if (!tick) tick = requestAnimationFrame(paint);
  }

  /* -----------------------------------------------------------------
     Visibility gate. Only elements actually on screen are painted, and
     the generous rootMargin means a card has already been positioned
     correctly before it scrolls into view.
     ----------------------------------------------------------------- */
  var inView = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('mo-in');
        live.add(e.target);
      } else {
        live.delete(e.target);
        /* Re-arm below the fold so it plays again on the way back,
           but never re-arm above it — pushing an element you have
           already read back into its entrance state is what made the
           old version feel restless. */
        if (e.boundingClientRect.top > 0) {
          e.target.classList.remove('mo-in', 'mo-settled');
          e.target._moFlat = false;
        }
      }
    });
    queue();
  }, { rootMargin: '14% 0px 14% 0px', threshold: 0 });

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', function () {
    live.forEach(function (el) { el._moFlat = false; });
    queue();
  }, { passive: true });

  /* -----------------------------------------------------------------
     Pointer tilt — an accent, and only for real mice.
     Cut from 18deg/14deg to 5deg/4deg. At the old magnitude a card
     under the cursor was rotated far enough to blur its own text and
     to visibly shear against its neighbours.
     ----------------------------------------------------------------- */
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function tiltMove(ev) {
    var el = ev.currentTarget;
    if (!el._moFlat) return;              /* never fight the entrance */
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var x = (ev.clientX - r.left) / r.width - 0.5;
    var y = (ev.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--mo-ry', (x * 5).toFixed(2) + 'deg');
    el.style.setProperty('--mo-rx', (-y * 4).toFixed(2) + 'deg');
  }

  function tiltLeave(ev) {
    var el = ev.currentTarget;
    el.style.setProperty('--mo-ry', '0deg');
    el.style.setProperty('--mo-rx', '0deg');
  }

  /* -----------------------------------------------------------------
     Wiring.
     Several pages build their cards from a fetch after load — the blog
     grids and the "more from HTI" strips come back long after this file
     has run. Those elements match the hiding rules in motion.css the
     moment they land, so if nothing adopted them they would stay
     invisible for good. wire() therefore runs once over the parsed
     document and again over anything inserted later.
     ----------------------------------------------------------------- */
  var stagger = new Map();

  function collect(scope, sel) {
    var found = scope.querySelectorAll ? Array.prototype.slice.call(scope.querySelectorAll(sel)) : [];
    if (scope.nodeType === 1 && scope.matches && scope.matches(sel)) found.unshift(scope);
    return found.filter(function (el) { return !excluded(el); });
  }

  function staggerIndex(el) {
    var p = el.parentElement;
    var i = stagger.get(p) || 0;
    stagger.set(p, i + 1);
    return i;
  }

  function adopt(el, isCard) {
    if (el._moSeen) return;
    el._moSeen = true;

    if (isCard) {
      el._moCard = true;
      /* alternate the side each card drifts in from, so a grid
         assembles itself instead of sliding up as one slab */
      el._moDir = (staggerIndex(el) % 2) ? 1 : -1;

      /* only give a shadow to cards that actually paint a background,
         so flat list rows do not become floating panels */
      var bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'transparent' && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(bg)) {
        el.classList.add('mo-solid');
      }

      /* A card whose first child is a photo gets the parallax frame. Blog
         covers are excluded: those thumbnails have the headline baked into
         the image, and a 6% zoom plus a vertical drift slices the first and
         last lines of it off - which is what a reader sees, not a photo
         moving. Real photographs still drift. */
      var img = el.querySelector('img:not(.blog-cover):not(.mfh-card-img)');
      if (img && img.parentElement) {
        img.parentElement.classList.add('mo-parallax');
        el._moPar = img.parentElement;
      }

      el.classList.add('mo-card');

      if (finePointer) {
        el.addEventListener('pointermove', tiltMove);
        el.addEventListener('pointerleave', tiltLeave);
      }
    }

    inView.observe(el);
  }

  function wire(scope) {
    if (!lite) collect(scope, TEXT).forEach(function (el) { adopt(el, false); });
    collect(scope, CARDS).forEach(function (el) { adopt(el, true); });
  }

  wire(document);
  paint();   /* position everything before the first frame is shown */

  new MutationObserver(function (records) {
    records.forEach(function (rec) {
      Array.prototype.forEach.call(rec.addedNodes, function (n) {
        if (n.nodeType === 1) wire(n);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
