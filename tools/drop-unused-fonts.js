/* Stop downloading a font nobody asked for.

   Every page carried a render-blocking stylesheet request for Poppins in seven
   weights, italics included. Fifty-one of them never name Poppins anywhere else
   in the file - the brand face is Gilroy, with Montserrat as the second - so on
   those pages the browser was fetching a stylesheet, then the font files it
   points at, and painting with none of it.

   That request sits in <head> and blocks the first paint, which is the part
   that matters: most of this site's visitors arrive on a phone on Indian
   mobile data, and the slowest thing a page can do is wait on a font it will
   not use.

   Only pages that never reference the family are touched. The twenty-two that
   genuinely style with Poppins keep it. (Whether those twenty-two should be on
   Gilroy instead is a brand decision, not a cleanup - they are listed at the
   end so someone can make it.)

   Safe to re-run.

   Run: node tools/drop-unused-fonts.js */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* The tag is wrapped across three lines on most pages and sits on one on the
   rest, so it is matched rather than compared. Anchored on family=Poppins so
   it can never take the Montserrat link with it. */
const LINK_RE = /[ \t]*<link\b[^>]*\bfamily=Poppins\b[^>]*>\r?\n?/;

const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

let dropped = 0, kept = [], absent = 0;

for (const page of pages) {
  const file = path.join(ROOT, page);
  const src = fs.readFileSync(file, 'utf8');

  if (src.indexOf('family=Poppins') === -1) { absent++; continue; }

  /* One mention means the link and nothing else; a second means the page
     actually styles with it. */
  const mentions = (src.match(/Poppins/g) || []).length;
  if (mentions > 1) { kept.push(page); continue; }

  if (!LINK_RE.test(src)) {
    console.log(page + ': Poppins link is not the expected shape - left alone');
    continue;
  }

  /* The indent and the trailing newline go with it, so no blank line is left. */
  const out = src.replace(LINK_RE, '');

  fs.writeFileSync(file, out);
  dropped++;
}

console.log('Poppins request removed from ' + dropped + ' page(s).');
console.log('already had none: ' + absent);
console.log('\nStill using Poppins (' + kept.length + ') - worth a brand decision:');
kept.forEach(p => console.log('  ' + p));
