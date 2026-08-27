/* ============================================================================
   enquiry.js — programme-page enquiry form
   ----------------------------------------------------------------------------
   Submits to the same `contact_enquiries` table the main contact form uses, so
   enquiries from a programme page land in one inbox with everything else.

   The table has no `programme` column, and adding one needs a migration nobody
   should have to run to ship this. Until that column exists the programme is
   written into the fields that DO exist, clearly labelled:

     training_needed  the programme name, e.g. "SUPER"
     staff_type       the roles that programme is built for
     message          "Programme enquiry: SUPER — Skill Upgradation Program…"
                      followed by whatever the visitor typed

   so the sales team can see at a glance what the enquiry is about. Once a
   `programme` column is added, move it there and simplify buildPayload().

   The markup is written into each page as ordinary HTML rather than injected
   from here: a form that only exists after JavaScript runs is a form some
   people never see.
   ========================================================================== */

(function () {
  'use strict';

  var SUPABASE_URL = 'https://ytthcgdsbfagvwcopoaj.supabase.co';
  var SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dGhjZ2RzYmZhZ3Z3Y29wb2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMjk5MTMsImV4cCI6MjA5ODkwNTkxM30.JIDahcRTu3VbFpZ55Ti5hHg_JrHobk0zh8PSaj9lWLc';
  var TABLE = 'contact_enquiries';

  var form = document.getElementById('peForm');
  if (!form) return;

  var wrap = form.closest('.pe-form-wrap');
  var btn = document.getElementById('peSubmit');
  var msg = document.getElementById('peMsg');
  var thanks = document.getElementById('peThanks');

  var programme = form.getAttribute('data-programme') || '';
  var programmeFull = form.getAttribute('data-programme-full') || '';
  var roles = form.getAttribute('data-roles') || '';

  /* ---------- validation ---------- */

  function val(name) {
    var el = form.elements[name];
    return el && el.value ? el.value.trim() : '';
  }

  /* Indian mobiles, tolerant of +91, a leading 0, spaces and dashes. Length
     decides where the country code is - plenty of real numbers start with 91
     themselves, so a prefix check alone rejects valid numbers. Same rule as
     contact.html, deliberately. */
  function phoneOk(v) {
    var d = v.replace(/\D/g, '');
    if (d.length === 10) return /^[6-9]/.test(d);
    if (d.length === 11) return d.charAt(0) === '0' && /^[6-9]/.test(d.slice(1));
    if (d.length === 12) return d.slice(0, 2) === '91' && /^[6-9]/.test(d.slice(2));
    return false;
  }

  function fieldOf(name) {
    var el = form.elements[name];
    return el ? el.closest('.pe-field') : null;
  }

  function check(name) {
    var v = val(name);
    var ok;
    if (name === 'phone') ok = phoneOk(v);
    else ok = v.length > 0;

    var field = fieldOf(name);
    if (field) field.classList.toggle('invalid', !ok);
    return ok;
  }

  /* clear a field's error as soon as it is put right - nagging while someone is
     still typing is what makes forms feel hostile */
  ['name', 'company', 'phone', 'city'].forEach(function (name) {
    var el = form.elements[name];
    if (!el) return;
    el.addEventListener('input', function () {
      var field = fieldOf(name);
      if (field && field.classList.contains('invalid')) check(name);
    });
  });

  /* ---------- payload ---------- */

  function buildPayload() {
    var note = val('message');
    var header = 'Programme enquiry: ' + programme +
      (programmeFull ? ' — ' + programmeFull : '') +
      '\nCity: ' + (val('city') || 'not given') +
      '\nTeam size: ' + (val('team_size') || 'not given') +
      '\nEnquired from: ' + location.pathname.replace(/^\//, '');

    return {
      name: val('name'),
      company: val('company'),
      phone: val('phone'),
      email: val('email'),
      staff_type: roles,
      training_needed: programme,
      message: note ? header + '\n\n' + note : header
    };
  }

  /* ---------- submit ---------- */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.classList.remove('show');

    /* bots fill hidden fields; people don't */
    if (val('website')) return;

    var fields = ['name', 'company', 'phone', 'city'];
    var firstBad = null;
    fields.forEach(function (name) {
      if (!check(name) && !firstBad) firstBad = fieldOf(name);
    });

    if (firstBad) {
      msg.innerHTML = '<b>Almost there.</b> Please check the highlighted fields ' +
        'so we can call you back on the right number.';
      msg.classList.add('show');
      var input = firstBad.querySelector('input');
      if (input) input.focus();
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending…';

    fetch(SUPABASE_URL + '/rest/v1/' + TABLE, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(buildPayload())
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);

        if (typeof gtag === 'function') {
          gtag('event', 'generate_lead', {
            event_category: 'programme',
            event_label: programme
          });
        }

        form.style.display = 'none';
        var note = wrap && wrap.querySelector('.pe-form-note');
        var head = wrap && wrap.querySelector('h3');
        if (note) note.style.display = 'none';
        if (head) head.style.display = 'none';
        thanks.classList.add('show');
      })
      .catch(function () {
        /* nothing typed is cleared - they can simply press again */
        msg.innerHTML = "<b>We couldn't send that just now.</b> Everything you " +
          'typed is still here — please press Try again. If it keeps failing, ' +
          'use the WhatsApp or call button above and we will pick it up there.';
        msg.classList.add('show');
        btn.disabled = false;
        btn.textContent = 'Try again';
      });
  });
})();
