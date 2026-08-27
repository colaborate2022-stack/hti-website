/* ============================================================================
   resize-image.js  —  re-encode one image at the size it is actually displayed
   ----------------------------------------------------------------------------
   WHY THIS EXISTS

   The general-purpose companion to build-blog-thumbnails.js, which handles the
   blog listing's covers and nothing else. This one takes a single file and a
   width. Reach for it when a page is carrying an asset far bigger than the box
   it paints into - the recurring fault in this library:

     images/brand/hti-logo.png   2374x1801, 46 KB, painted at 52x39 in the navbar

   There is no ImageMagick, no ffmpeg and no npm on this machine. Chrome is the
   image library: it decodes anything the site can display, resamples on a
   canvas, and encodes WebP - which is what the site should be serving anyway.

   HOW TO RUN

     node tools/resize-image.js <src> <width> [out] [--quality 0.86] [--fit]

   Default output is a sibling named <basename>-<width>.webp. With --fit the
   height follows the source's aspect ratio (the usual case); pass --height to
   force a box and the image is cropped to fill it, centred, the way
   object-fit: cover would.

   Needs the bundled Node and Playwright:
     C:\Users\ATUL\AppData\Local\ms-playwright-go\1.57.0\node.exe
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const PW = 'C:/Users/ATUL/AppData/Local/ms-playwright-go/1.57.0/package/index.js';

const MIME = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif'
};

function parseArgs(argv) {
  const opts = { quality: 0.86, height: null, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--quality') opts.quality = Number(argv[++i]);
    else if (argv[i] === '--height') opts.height = Number(argv[++i]);
    else if (argv[i] === '--fit') opts.height = null;
    else opts.positional.push(argv[i]);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const [src, widthArg, outArg] = opts.positional;
  if (!src || !widthArg) {
    console.error('usage: node tools/resize-image.js <src> <width> [out] ' +
      '[--quality 0.86] [--height N]');
    process.exit(2);
  }

  const width = Number(widthArg);
  const ext = path.extname(src).toLowerCase();
  const mime = MIME[ext];
  if (!mime) throw new Error(`don't know how to load ${ext}`);

  const out = outArg || src.slice(0, -ext.length) + `-${width}.webp`;
  const buf = fs.readFileSync(src);

  const pw = require(PW);
  const browser = await pw.chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage();

  /* A file:// image taints the canvas and Chrome then refuses to read it back,
     so the source goes in as a data URI - same origin, canvas stays readable. */
  const dataUri = `data:${mime};base64,${buf.toString('base64')}`;

  const res = await page.evaluate(
    async ({ uri, w, forcedH, q }) => {
      const img = new Image();
      await new Promise((ok, no) => {
        img.onload = ok;
        img.onerror = () => no(new Error('Chrome could not decode it'));
        img.src = uri;
      });

      const srcW = img.naturalWidth || w;
      const srcH = img.naturalHeight || w;
      const h = forcedH || Math.round((w * srcH) / srcW);

      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      /* Transparency survives WebP, so leave the canvas clear rather than
         matting onto white - a logo has to sit on whatever colour the page is. */

      // object-fit: cover, for the case where a box was forced.
      let dw = w;
      let dh = Math.round((w * srcH) / srcW);
      if (dh < h) {
        dh = h;
        dw = Math.round((h * srcW) / srcH);
      }
      ctx.drawImage(img, Math.round((w - dw) / 2), Math.round((h - dh) / 2), dw, dh);

      return {
        data: c.toDataURL('image/webp', q).split(',')[1],
        w, h, srcW, srcH
      };
    },
    { uri: dataUri, w: width, forcedH: opts.height, q: opts.quality }
  );

  const outBuf = Buffer.from(res.data, 'base64');
  fs.writeFileSync(out, outBuf);
  await browser.close();

  console.log(
    `${res.srcW}x${res.srcH} ${Math.round(buf.length / 1024)} KB  ->  ` +
    `${res.w}x${res.h} ${Math.round(outBuf.length / 1024)} KB  ` +
    `(-${Math.round((1 - outBuf.length / buf.length) * 100)}%)  ${out}`
  );
}

main().catch((err) => {
  console.error('resize-image failed:', err.message);
  process.exit(1);
});
