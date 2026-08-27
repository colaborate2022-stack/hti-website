/* ============================================================================
   subscribe.js — email capture
   ----------------------------------------------------------------------------
   The site had no way at all to keep in touch with a visitor who was not ready
   to enquire today. With 30-odd articles and two calculators pulling people in,
   that was the largest recurring loss on the site: they arrive, read, leave, and
   there is no second conversation.

   ENABLING THIS
   -------------
   It needs one table, which does not exist yet. Run this once in the Supabase
   SQL editor (Dashboard -> SQL Editor -> New query):

     create table public.newsletter_subscribers (
       id          bigint generated always as identity primary key,
       email       text not null unique,
       source      text,
       created_at  timestamptz not null default now()
     );

     alter table public.newsletter_subscribers enable row level security;

     -- the website is not signed in, so it posts with the anon key; it may
     -- insert a row and nothing else. It cannot read the list back.
     create policy "anon can subscribe"
       on public.newsletter_subscribers
       for insert to anon
       with check (true);

   Then flip ENABLED to true below and commit. That is the whole switch-on.

   Until then this file renders nothing at all: the placeholder stays empty and
   no visitor sees a form that cannot work. An earlier version probed the API to
   find out whether the table existed, which worked but left a failed request in
   the browser console on every page of the site - not worth it for a check whose
   answer changes exactly once.

   To place it: <div data-subscribe data-source="footer"></div>
   ========================================================================== */

(function () {
  'use strict';

  var SUPABASE_URL = 'https://ytthcgdsbfagvwcopoaj.supabase.co';
  var SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dGhjZ2RzYmZhZ3Z3Y29wb2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMjk5MTMsImV4cCI6MjA5ODkwNTkxM30.JIDahcRTu3VbFpZ55Ti5hHg_JrHobk0zh8PSaj9lWLc';
  var TABLE = 'newsletter_subscribers';

  /* Flip to true once the newsletter_subscribers table exists (see above). */
  var ENABLED = false;

  var slots = document.querySelectorAll('[data-subscribe]');
  if (!slots.length) return;

  function headers(extra) {
    var h = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + SUPABASE_ANON_KEY
    };
    for (var k in extra) h[k] = extra[k];
    return h;
  }

  function render(slot) {
    var source = slot.getAttribute('data-source') || 'site';

    slot.innerHTML =
      '<div class="sub-box">' +
      '  <div class="sub-copy">' +
      '    <h3>One practical note a month</h3>' +
      '    <p>Food cost, service standards, staffing — one short, usable piece for hotel and restaurant owners. No sales mail, unsubscribe any time.</p>' +
      '  </div>' +
      '  <form class="sub-form" novalidate>' +
      '    <label class="sub-visually-hidden" for="sub-email-' + source + '">Your email address</label>' +
      '    <input class="sub-input" id="sub-email-' + source + '" type="email" name="email" autocomplete="email" placeholder="you@yourbusiness.com" required />' +
      '    <button class="sub-btn" type="submit">Sign me up</button>' +
      '  </form>' +
      '  <p class="sub-msg" role="status"></p>' +
      '</div>';

    var form = slot.querySelector('.sub-form');
    var input = slot.querySelector('.sub-input');
    var btn = slot.querySelector('.sub-btn');
    var msg = slot.querySelector('.sub-msg');

    function say(text, kind) {
      msg.textContent = text;
      msg.className = 'sub-msg show ' + (kind || '');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (input.value || '').trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        say('That does not look like an email address — please check it.', 'bad');
        input.focus();
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Signing up…';

      fetch(SUPABASE_URL + '/rest/v1/' + TABLE, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({ email: email, source: source })
      })
        .then(function (r) {
          /* 409 is the unique constraint: they are already on the list, which
             from the reader's side is a success, not an error. */
          if (r.ok || r.status === 409) {
            form.style.display = 'none';
            say('You are on the list. First note lands next month.', 'good');
            if (typeof gtag === 'function') {
              gtag('event', 'sign_up', { event_category: 'newsletter', event_label: source });
            }
            return;
          }
          throw new Error('HTTP ' + r.status);
        })
        .catch(function () {
          say('That did not go through — please try again in a moment.', 'bad');
          btn.disabled = false;
          btn.textContent = 'Sign me up';
        });
    });
  }

  if (ENABLED) slots.forEach(render);
})();
