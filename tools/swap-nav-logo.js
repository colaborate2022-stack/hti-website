/* ============================================================================
   swap-nav-logo.js  —  stop shipping a 2374x1801 logo to draw a 52px mark
   ----------------------------------------------------------------------------
   WHY THIS EXISTS

   images/brand/hti-logo.png is 2374x1801 and 46 KB. It is painted at 52x39 in
   the navbar and 70x53 in the footer, on every page of the site. That is 4.2
   megapixels of logo for a mark the size of a thumbnail, and in the navbar it
   carries fetchpriority="high" - so on blog.html it was 43 KB of the connection
   that the largest image on the page was queued behind.

   images/brand/hti-logo-nav.webp is the same mark at 240x182 and 3 KB. Same
   aspect ratio to three decimal places, so nothing moves.

   WHAT IT DOES NOT TOUCH

   The PNG stays exactly where it is. It is still the og:image on index.html and
   contact.html, and og:image wants a large file - a social card scaled up from
   240px would look terrible. This only rewrites <img> tags, so a `content="..."`
   meta attribute is never matched.

   HOW TO RUN

     node tools/swap-nav-logo.js            # every page not in SKIP
     node tools/swap-nav-logo.js a.html b.html
     node tools/swap-nav-logo.js --check    # report, change nothing

   Safe to run twice: a page already swapped reports "nothing to do".

   THE SKIP LIST

   These seventeen pages belong to another Claude session as this is written -
   index.html, contact.html and the fifteen programme pages. When that work has
   landed, empty SKIP and run it again; that is the whole job for those pages.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const OLD_SRC = 'images/brand/hti-logo.png';
const NEW_SRC = 'images/brand/hti-logo-nav.webp';

/* The intrinsic size of each file. 2374/1801 and 240/182 are the same ratio to
   three decimal places, so a page that sizes the mark in CSS - all of them do -
   lays out identically either way. */
const OLD_DIMS = { width: '2374', height: '1801' };
const NEW_DIMS = { width: '240', height: '182' };

const SKIP = new Set([
  'index.html', 'contact.html',
  'class.html', 'cup.html', 'fort.html', 'hotcar.html', 'hotel-shot.html',
  'icare.html', 'icedt.html', 'kmt.html', 'mdp.html', 'post.html',
  'ramp.html', 'super.html', 'support.html', 'top.html', 'vow.html'
]);

// ---------------------------------------------------------------------------

/* Rewrites only the inside of an <img> tag that loads the logo: its src, and
   its width/height if they are the PNG's intrinsic size. A width the page
   author chose deliberately is left alone, and so is any width/height that is
   absent - admin.html has two of those and sizes them in CSS. */
function swapInPage(html) {
  let changed = 0;
  const out = html.replace(/<img\b[^>]*>/g, (tag) => {
    if (!tag.includes(OLD_SRC)) return tag;
    changed++;
    let t = tag.split(OLD_SRC).join(NEW_SRC);
    t = t.replace(
      new RegExp(`width="${OLD_DIMS.width}"`, 'g'), `width="${NEW_DIMS.width}"`
    );
    t = t.replace(
      new RegExp(`height="${OLD_DIMS.height}"`, 'g'), `height="${NEW_DIMS.height}"`
    );
    return t;
  });
  return { html: out, changed };
}

function main() {
  const argv = process.argv.slice(2);
  const checkOnly = argv.includes('--check');
  const named = argv.filter((a) => !a.startsWith('--'))
    .map((a) => path.basename(a.split(String.fromCharCode(92)).join('/')));

  if (!fs.existsSync(path.join(ROOT, NEW_SRC))) {
    throw new Error(`${NEW_SRC} does not exist. Make it first:\n` +
      '  node tools/resize-image.js images/brand/hti-logo.png 240 ' +
      'images/brand/hti-logo-nav.webp --quality 0.9');
  }

  const pages = (named.length ? named : fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')))
    .filter((f) => named.length || !SKIP.has(f));

  let touched = 0;
  let tags = 0;
  const skipped = [];

  for (const f of pages) {
    const file = path.join(ROOT, f);
    if (!fs.existsSync(file)) { console.log(`  ${f}: no such page`); continue; }
    const before = fs.readFileSync(file, 'utf8');
    if (!before.includes(`src="${OLD_SRC}"`)) continue;
    if (named.length && SKIP.has(f)) { skipped.push(f); continue; }

    const { html, changed } = swapInPage(before);
    if (html === before) continue;
    if (!checkOnly) fs.writeFileSync(file, html);
    touched++;
    tags += changed;
    console.log(`  ${checkOnly ? 'would swap' : 'swapped'} ${changed} in ${f}`);
  }

  if (skipped.length) {
    console.log(`\nrefused (in SKIP, another session owns them): ${skipped.join(', ')}`);
  }
  console.log(`\n${checkOnly ? 'Would change' : 'Changed'} ${tags} <img> tag` +
    `${tags === 1 ? '' : 's'} across ${touched} page${touched === 1 ? '' : 's'}.`);
  if (!checkOnly && touched) {
    console.log(`Saves about ${Math.round(43 * touched)} KB of transfer across the site.`);
  }

  const left = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'))
    .filter((f) => fs.readFileSync(path.join(ROOT, f), 'utf8').includes(`src="${OLD_SRC}"`));
  if (left.length) {
    console.log(`\nStill on the big PNG (${left.length}): ${left.join(', ')}`);
  }
}

try {
  main();
} catch (err) {
  console.error('swap-nav-logo failed:', err.message);
  process.exit(1);
}
