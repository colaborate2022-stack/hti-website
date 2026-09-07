/* ============================================================================
   wire-city-links.js  —  give the city pages somewhere to be linked from
   ----------------------------------------------------------------------------
   WHY THIS EXISTS

   A page in sitemap.xml that nothing on the site links to is a page Google
   will crawl slowly and rank badly, because nothing tells it the page
   matters. The ten city pages already cross-link each other, which is a
   closed loop: it needs at least one door from the rest of the site.

   This puts a small strip of city links just above the footer on the six
   pages that both carry the most internal authority and give the link real
   context - the home page, the programmes hub, the three audience pages and
   contact. Six, not seventy-six: the footer is duplicated across the whole
   site, and ten extra links in every footer on the site would dilute every
   other footer link for very little gain.

   The strip is inline-styled on purpose. These six pages each ship their own
   <style> block with no shared class for something like this, and adding a
   stylesheet request to the home page to lay out ten links would cost more
   than it is worth.

   Safe to run twice - a page that already has the strip is skipped.

     node tools/wire-city-links.js
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const { CITIES } = require('./city-data.js');

const ROOT = path.resolve(__dirname, '..');
const MARK = 'data-city-strip';

/* The strip goes immediately before the subscribe block, which on every one
   of these pages is the last thing before the footer. Indentation is not part
   of the match: hospitality-training-programs.html has the same block flush
   left, and anchoring on the leading spaces silently skipped it.

   Five of the six pages label that spot with a FOOTER banner comment. Going
   in below the banner would leave the banner announcing this strip instead of
   the footer, so when the banner is there we go in above it. */
const ANCHOR = '<div data-subscribe';
const BANNER = '<!-- ============ FOOTER ============ -->';

const PAGES = [
  'index.html',
  'hospitality-training-programs.html',
  'hotels.html',
  'restaurants.html',
  'offices.html',
  'contact.html'
];

function strip() {
  const links = CITIES.map(c =>
    `        <a href="hospitality-training-${c.slug}.html" style="background:#fff;border:1px solid #ddd7cf;border-radius:999px;padding:9px 18px;font-weight:600;font-size:14.5px;color:#111;text-decoration:none;white-space:nowrap;">${c.city}</a>`
  ).join('\r\n');

  return `  <!-- ============ WHERE WE TRAIN ============
       Doors to the city landing pages. See tools/wire-city-links.js. -->
  <section ${MARK} style="background:#ede9e3;padding:44px 0 48px;">
    <div style="max-width:1160px;margin:0 auto;padding:0 24px;">
      <h2 style="font-size:clamp(21px,2.6vw,28px);font-weight:700;letter-spacing:-.015em;margin:0 0 10px;">Hospitality training, city by city</h2>
      <p style="font-size:15.5px;line-height:1.6;color:#55504a;max-width:66ch;margin:0 0 22px;">HTI trainers travel from the Navi Mumbai head office and run sessions at your own property. Sessions have gone out to over 410 cities across India &mdash; these are the ones with a page of their own.</p>
      <div style="display:flex;flex-wrap:wrap;gap:9px;">
${links}
      </div>
    </div>
  </section>

`;
}

function main() {
  const block = strip();
  let done = 0;

  PAGES.forEach((name) => {
    const file = path.join(ROOT, name);
    let html = fs.readFileSync(file, 'utf8');

    if (html.includes(MARK)) {
      console.log(`  ${name.padEnd(38)} already has the strip`);
      return;
    }

    let at = html.indexOf(ANCHOR);
    if (at === -1) {
      console.log(`  ${name.padEnd(38)} SKIPPED - no subscribe block to sit above`);
      return;
    }

    /* back up over the footer banner if this page has one directly above */
    const banner = html.lastIndexOf(BANNER, at);
    if (banner !== -1 && html.slice(banner + BANNER.length, at).trim() === '') {
      at = banner;
    }

    html = html.slice(0, at) + block.replace(/\r?\n/g, '\r\n') + html.slice(at);

    /* the repo is CRLF throughout; a bare LF slipped in here would make the
       next sed-style bulk edit skip the file silently */
    if (/(?<!\r)\n/.test(html)) throw new Error(`${name}: bare LF introduced`);

    fs.writeFileSync(file, html, 'utf8');
    console.log(`  ${name.padEnd(38)} strip added`);
    done++;
  });

  console.log(`\n${done} page${done === 1 ? '' : 's'} updated.`);
}

main();
