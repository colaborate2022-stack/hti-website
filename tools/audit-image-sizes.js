/* ============================================================================
   audit-image-sizes.js  —  find images bigger than the box they are painted in
   ----------------------------------------------------------------------------
   WHY THIS EXISTS

   The recurring fault in this library is not that images are large. It is that
   they are large in a box that is small. The navbar logo was 2374x1801 painted
   at 52x39; the blog covers were up to 1049x1398 painted at 373 wide. Neither
   is visible by reading the HTML - you have to lay the page out to find out how
   big the box actually is, at the width the reader is using.

   So this opens every page in Chrome at two widths and, for every <img> it
   finds, records what the file is (bytes, intrinsic pixels) against what the
   page does with it (CSS pixels, times the device pixel ratio a phone has).
   Anything carrying several times more pixels than it can show is waste, and
   the report is ordered by how many bytes that waste is worth.

   WHAT IT DOES NOT KNOW

   * A file used on ten pages is counted once by size but is worth ten times as
     much to fix. The `pages` column is there for that; read it alongside.
   * Background images in CSS are invisible to it. It reads <img> only.
   * An image below the fold that never loads still costs nothing until someone
     scrolls, so `lazy` is reported and should temper the ordering.

   HOW TO RUN

     node tools/audit-image-sizes.js               # every page
     node tools/audit-image-sizes.js lead.html     # just these
     node tools/audit-image-sizes.js --min 40      # only files over 40 KB

   It changes nothing. Fixing is tools/resize-image.js, one file at a time,
   with the target width this report gives you.

   Needs the bundled Node and Playwright:
     C:\Users\ATUL\AppData\Local\ms-playwright-go\1.57.0\node.exe
   ========================================================================== */

'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const PW = 'C:/Users/ATUL/AppData/Local/ms-playwright-go/1.57.0/package/index.js';
const ROOT = path.resolve(__dirname, '..');

/* Desktop at 1x and a phone at 3x - the two extremes that between them decide
   how many real pixels an image has to carry. A 373px card on a 3x phone wants
   1119; the same card on a 1440 desktop wants 373. The larger of the two is
   what the file actually needs. */
const VIEWPORTS = [
  { width: 1440, height: 900, dpr: 1, mobile: false },
  { width: 390, height: 844, dpr: 3, mobile: true }
];

/* Below this an oversized image is not worth a commit. */
const DEFAULT_MIN_KB = 25;

/* Carrying up to this many times the pixels it can show is fine - it is the
   headroom that keeps an image sharp on a screen we did not test. Past it, the
   file is paying for pixels nobody will ever see. */
const WASTE_THRESHOLD = 2.0;

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml',
  '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.xml': 'application/xml'
};

function serveRoot() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    fs.readFile(path.join(ROOT, rel), (err, buf) => {
      if (err) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(rel).toLowerCase()] || 'application/octet-stream'
      });
      res.end(buf);
    });
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function main() {
  const argv = process.argv.slice(2);
  let minKb = DEFAULT_MIN_KB;
  const named = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--min') minKb = Number(argv[++i]);
    else if (!argv[i].startsWith('--')) named.push(path.basename(argv[i]));
  }

  const pages = named.length
    ? named
    : fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

  const server = await serveRoot();
  const port = server.address().port;
  const pw = require(PW);
  const browser = await pw.chromium.launch({ channel: 'chrome' });

  /* src -> { bytes, natural, neededPx, pages:Set, lazy } */
  const seen = new Map();

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dpr,
      isMobile: vp.mobile,
      hasTouch: vp.mobile
    });
    const page = await ctx.newPage();

    for (const f of pages) {
      try {
        await page.goto(`http://127.0.0.1:${port}/${f}`, {
          waitUntil: 'load', timeout: 30000
        });
      } catch (e) { continue; }
      /* Long enough for a page that rebuilds itself from Supabase - blog.html
         replaces its whole grid about a second in - to have settled, because
         the images measured have to be the ones the reader ends up with. */
      await page.waitForTimeout(2500);

      /* Scrolling alone is not enough to make a lazy image load. On a phone,
         blog.html is one column of 32 cards, and a scripted scroll pass reaches
         the bottom long before the images do; they were still unloaded when the
         measurement ran, so they dropped out of the sample entirely. That left
         needW computed from the desktop pass only, which made every blog cover
         look 2.7x oversized when it is in fact right for a 3x phone - almost
         talked me into shrinking files I had just correctly sized.
         So: turn lazy off, then wait for the images themselves, not a timer. */
      await page.evaluate(async () => {
        for (const i of document.images) {
          if (i.loading === 'lazy') { i.dataset.wasLazy = '1'; i.loading = 'eager'; }
        }
        window.scrollTo(0, document.body.scrollHeight);
        window.scrollTo(0, 0);
        await Promise.all([...document.images].map((i) => i.complete
          ? Promise.resolve()
          : new Promise((done) => {
            i.addEventListener('load', done, { once: true });
            i.addEventListener('error', done, { once: true });
            setTimeout(done, 12000);
          })));
      });
      await page.waitForTimeout(400);

      const found = await page.evaluate((dpr) => [...document.images]
        .filter((i) => i.currentSrc && i.naturalWidth > 0)
        .map((i) => {
          const r = i.getBoundingClientRect();
          return {
            src: i.currentSrc,
            natW: i.naturalWidth,
            natH: i.naturalHeight,
            cssW: Math.round(r.width),
            cssH: Math.round(r.height),
            needW: Math.round(r.width * dpr),
            lazy: i.dataset.wasLazy === '1'
          };
        }), vp.dpr);

      for (const im of found) {
        const rel = im.src.replace(`http://127.0.0.1:${port}/`, '');
        if (!rel.startsWith('images/')) continue;
        let e = seen.get(rel);
        if (!e) {
          let bytes = 0;
          try { bytes = fs.statSync(path.join(ROOT, rel)).size; } catch (x) { continue; }
          e = {
            bytes, natW: im.natW, natH: im.natH,
            needW: 0, cssW: 0, pages: new Set(), lazy: true
          };
          seen.set(rel, e);
        }
        /* The widest box this file lands in anywhere is what it has to serve. */
        if (im.needW > e.needW) { e.needW = im.needW; e.cssW = im.cssW; }
        if (!im.lazy) e.lazy = false;
        e.pages.add(f);
      }
    }
    await ctx.close();
  }

  await browser.close();
  server.close();

  const rows = [...seen.entries()]
    .map(([src, e]) => ({
      src, ...e,
      waste: e.needW > 0 ? e.natW / e.needW : Infinity,
      pages: e.pages.size
    }))
    .filter((r) => r.bytes >= minKb * 1024 && r.waste >= WASTE_THRESHOLD)
    .sort((a, b) => (b.bytes * Math.min(b.waste, 8) * b.pages) -
                    (a.bytes * Math.min(a.waste, 8) * a.pages));

  console.log(`\nImages carrying more than ${WASTE_THRESHOLD}x the pixels they ` +
    `can show, over ${minKb} KB, across ${pages.length} pages.`);
  console.log('needs = widest painted box found, times that viewport\'s DPR.\n');
  console.log('  bytes   file is      needs    over  pages  load   path');
  console.log('  ------  -----------  -------  ----  -----  -----  ----');
  for (const r of rows.slice(0, 40)) {
    console.log(
      `  ${String(Math.round(r.bytes / 1024)).padStart(5)}K  ` +
      `${String(r.natW + 'x' + r.natH).padEnd(11)}  ` +
      `${String(r.needW + 'px').padStart(7)}  ` +
      `${String(r.waste.toFixed(1) + 'x').padStart(4)}  ` +
      `${String(r.pages).padStart(5)}  ` +
      `${(r.lazy ? 'lazy' : 'eager').padEnd(5)}  ${r.src}`
    );
  }

  const total = rows.reduce((a, r) => a + r.bytes, 0);
  console.log(`\n${rows.length} files, ${Math.round(total / 1024)} KB as they stand.`);
  console.log('Fix one with:  node tools/resize-image.js <path> <needs> [out.webp]');
}

main().catch((err) => {
  console.error('audit-image-sizes failed:', err.message);
  process.exit(1);
});
