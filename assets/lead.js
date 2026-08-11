/* =====================================================================
   LEAD BY HTI — page motion & interaction behaviour
   ---------------------------------------------------------------------
   Loaded with `defer`. Pairs with assets/lead.css.

   Progressive enhancement, in this order:
     1. bail out entirely if the visitor asked for reduced motion
     2. arm the CSS by adding .lead-mo to <html>
     3. only then hide anything

   Because step 2 happens in script, a blocked or failed script leaves
   every element visible rather than stuck at opacity:0.
   ===================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;

  /* ------------------------------------------------ 1. scroll reveal */
  /* Elements the shared motion layer does not already cover. */
  var REVEAL = [
    '.prog-card',
    '.cover-list li',
    '.lead-grid figure',
    '.progs-track h3',
    '.stat'
  ].join(',');

  function armReveals() {
    var nodes = document.querySelectorAll(REVEAL);
    if (!nodes.length) return;

    document.documentElement.classList.add('lead-mo');

    // stagger within each parent group, so rows cascade instead of popping
    var groups = new Map();
    nodes.forEach(function (el) {
      el.classList.add('lead-rv');
      var p = el.parentElement;
      if (!groups.has(p)) groups.set(p, 0);
      var i = groups.get(p);
      el.style.setProperty('--lead-d', Math.min(i * 70, 420) + 'ms');
      groups.set(p, i + 1);
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    nodes.forEach(function (el) { io.observe(el); });
  }

  /* --------------------------------------------- 2. counting numbers */
  /* Reads the number already in the markup, so the real figure is in the
     served HTML for crawlers and for anyone without JS. */
  function armCounters() {
    var els = [].slice.call(document.querySelectorAll('.stats-grid .stat h3, .cta-big'));
    if (!els.length) return;

    els.forEach(function (el) {
      var raw = el.textContent.trim();
      // pull the digits out of things like "300K+", "3,00,000+", "410+"
      var m = raw.match(/^([^\d]*)([\d,]+)(.*)$/);
      if (!m) return;
      var target = parseInt(m[2].replace(/,/g, ''), 10);
      if (!isFinite(target) || target === 0) return;
      el.dataset.leadPre = m[1];
      el.dataset.leadNum = String(target);
      el.dataset.leadPost = m[3];
      el.dataset.leadRaw = raw;
      el.dataset.leadGrouped = /,/.test(m[2]) ? '1' : '';
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        if (!el.dataset.leadNum) return;

        var target = parseInt(el.dataset.leadNum, 10);
        var pre = el.dataset.leadPre || '';
        var post = el.dataset.leadPost || '';
        var grouped = el.dataset.leadGrouped === '1';
        var dur = 1100;
        var t0 = null;

        function fmt(n) {
          return grouped ? n.toLocaleString('en-IN') : String(n);
        }
        function frame(ts) {
          if (t0 === null) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          // ease-out so it decelerates into the final figure
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = pre + fmt(Math.round(target * eased)) + post;
          if (p < 1) requestAnimationFrame(frame);
          else el.textContent = el.dataset.leadRaw; // land exactly on the real string
        }
        requestAnimationFrame(frame);
      });
    }, { threshold: 0.4 });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------- 3. anchor links scroll nicely */
  function armAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (!id || id === '#') return;
        var t = document.querySelector(id);
        if (!t) return;
        e.preventDefault();
        var nav = document.querySelector('.navbar');
        var off = nav ? nav.getBoundingClientRect().height : 0;
        var y = t.getBoundingClientRect().top + window.pageYOffset - off - 8;
        window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
      });
    });
  }

  function init() {
    armAnchors();               // useful regardless of motion preference
    if (reduced || !canObserve) return;
    armReveals();
    armCounters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
