/* ============================================================================
   track.js — count the enquiries that never touch a form
   ----------------------------------------------------------------------------
   The enquiry form already reports itself: contact.html and
   training-needs-survey.html both fire generate_lead on a successful submit.
   But the form sits on two pages, while the WhatsApp button sits on seventy-six
   and the phone number on seventy-five - and neither of those reported anything
   at all.

   For a hospitality buyer in India the WhatsApp thread and the phone call are
   very often the whole enquiry; the form is the route they skip. So the two
   busiest ways of reaching HTI were the two the analytics could not see, which
   made it impossible to say which programme page actually produces business.

   This listens once at the document and reports a click on any tel:, WhatsApp
   or email link, wherever on the site it appears and however it was added to
   the page. Three separate event names rather than one with a parameter, so
   each can be marked as a key event in GA4 on its own.

   IN GA4
   ------
   Admin -> Events, then mark as key events:  whatsapp_click, phone_click.
   (email_click is worth watching but is usually noise by comparison.)
   They will appear within a few hours of the first real click.

   Nothing here identifies a visitor. It records that a click happened, which
   kind, and which page it happened on - the same shape as a pageview.
   ========================================================================== */

(function () {
  'use strict';

  /* GA4 is loaded with async, and a fast click can land before it. Queueing
     through the dataLayer shim rather than calling gtag directly means an early
     click is still counted instead of silently dropped. */
  function send(name, params) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    } else if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(['event', name, params]);
    }
  }

  /* What kind of contact link is this, if any? Matching on the href rather than
     on a class or data attribute means a button added to a new page next month
     is counted without anyone remembering to tag it. */
  function classify(href) {
    if (/^tel:/i.test(href)) return { name: 'phone_click', method: 'phone' };
    if (/(?:^|\/\/|\.)wa\.me\//i.test(href) ||
        /(?:api|web|chat)\.whatsapp\.com/i.test(href) ||
        /^whatsapp:/i.test(href)) return { name: 'whatsapp_click', method: 'whatsapp' };
    if (/^mailto:/i.test(href) ||
        /mail\.google\.com\/mail\/\?view=cm/i.test(href)) return { name: 'email_click', method: 'email' };
    return null;
  }

  /* Delegated, and capturing, so it still runs when the link's own handler
     stops propagation or the click opens a new tab immediately. */
  document.addEventListener('click', function (e) {
    const link = e.target && e.target.closest && e.target.closest('a[href]');
    if (!link) return;

    const kind = classify(link.getAttribute('href') || '');
    if (!kind) return;

    send(kind.name, {
      method: kind.method,
      /* Where on the page it was pressed - a floating button and a footer
         number convert very differently, and the label is the only way to
         tell them apart afterwards. */
      link_text: (link.textContent || '').trim().slice(0, 60) || link.getAttribute('aria-label') || '',
      page_path: location.pathname
    });
  }, true);
})();
