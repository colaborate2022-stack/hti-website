/* ============================================================================
   build-blog-thumbnails.js  —  make card-sized covers for the blog listing
   ----------------------------------------------------------------------------
   WHY THIS EXISTS

   blog.html paints 33 cards. Each cover box is 373 CSS px wide on desktop and
   about 358 on a phone, so 900 px of real pixels covers even a 2x screen. The
   files the `blogs` table pointed at were nothing like that:

     * Eleven were design-tool SVG exports. Not drawings - a full-resolution
       photograph base64-encoded inside an SVG wrapper, clipped down to a
       315x150 artboard, with the headline over it as vector glyph paths.
       pankaj-gupta-blog-thumbnail.svg is 1,051 KB and holds a 1049x1398 JPEG.
       Four of them embed the same photo twice, once to feed a mask and once to
       draw, so the reader downloads it twice. Base64 adds a third again on top,
       and an SVG cannot be decoded off the main thread the way an image can.

     * Three are article hero photographs up to 1920x933, shared with the pages
       they belong to.

     * Five are PNGs of photographs - a format that stores a photo about five
       times larger than a lossy one. hero-section.png is 226 KB for 455x320.

   Ten megabytes of covers, to paint cards a third of that wide.

   WHAT THIS DOES

   Opens each source in Chrome, draws it into a 900 px canvas shaped like the
   card box and cropped the way object-fit: cover crops, and saves what Chrome
   drew as WebP - 10,286 KB down to 801 KB. Chrome rasterises these either way;
   this does it once, here, instead of on every reader's phone. The vector
   headline inside an SVG is still rendered as vector at the full output size, so
   the type comes out as crisp as the original - checked side by side at card
   size before this was committed.

   It never overwrites a source. Output is a sibling named `<basename>-card.webp`
   which matters for the three heroes: how-to-calculate-food-cost-percentage.html
   still gets its 1400 px photograph, and only the listing gets the small one.

   Writing the file is half the job. The `blogs` table still points at the heavy
   original, and this repo cannot change that, so ASSET_REWRITE in
   assets/blog-routes.js maps old path -> new path and every consumer runs its
   cover URL through it. Add an entry here and you must add one there.

   HOW TO RUN

     node tools/build-blog-thumbnails.js              # everything below
     node tools/build-blog-thumbnails.js --width 1200 # override the size
     node tools/build-blog-thumbnails.js a.svg b.png  # just these

   Then re-run tools/build-blog-index.js and commit blog.html.

   Needs the bundled Node and Playwright, since this machine has no npm:
     C:\Users\ATUL\AppData\Local\ms-playwright-go\1.57.0\node.exe
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const PW = 'C:/Users/ATUL/AppData/Local/ms-playwright-go/1.57.0/package/index.js';
const ROOT = path.resolve(__dirname, '..');

/* 900 px covers a 373 px card on a 2x screen with a fifth to spare. Going wider
   buys nothing a reader can see and costs real seconds on a 1.6 Mbps link. */
const DEFAULT_WIDTH = 900;

/* The shape of the cover box in blog.html - `aspect-ratio: 1200 / 577` on
   .blog-cover, with `object-fit: cover` above it. Output is cropped to this
   here, exactly the way the browser would crop it, so we stop shipping pixels
   that get thrown away on arrival. It matters most for the sources that are
   nowhere near this shape: hero-section.png is 455x320, and better than a
   quarter of it never reaches the screen. */
const CARD_RATIO = 577 / 1200;

/* Quality is high for this kind of picture on purpose: most of these have a
   headline baked into them, and lossy artefacts show up on type long before
   they show up on a photograph. 0.86 was the lowest setting where the flattened
   files were indistinguishable from the originals at card size. */
const DEFAULT_QUALITY = 0.86;

/* The three article heroes are plain photographs with no type on them, so they
   do not need that headroom. Compared side by side at card width, 0.86, 0.80
   and 0.75 are indistinguishable; 0.78 leaves a margin and takes a third off
   the file. It is worth singling out because one of them - the newest
   article's - is the largest paint on the page and the thing the preload in
   blog.html's head is racing to fetch. */
const PHOTO_QUALITY = 0.78;

/* Every cover the blog listing loads that is worth re-encoding. The .avif and
   .webp covers already in the library are 8-44 KB and are deliberately absent -
   they need nothing. */
const TARGETS = [
  // Photographs wrapped in an SVG. blog.html is their only consumer.
  'images/blog/thumbnails/pankaj-gupta-blog-thumbnail.svg',
  'images/blog/thumbnails/blog-20-thumbnail.svg',
  'images/blog/food-production-jargon/4-food-production-department.svg',
  'images/blog/thumbnails/ranvir-nagpal-blog-thumbnail.svg',
  'images/blog/fb-jargon/2-f-b-department.svg',
  'images/blog/agnibh-mudi/corporate-chef-agnibh-mudi.svg',
  'images/blog/housekeeping-jargon/1-housekeeping-department.svg',
  'images/blog/front-office-jargon/3-front-office-department.svg',
  'images/blog/thumbnails/blog-16-thumbnail.svg',
  'images/blog/thumbnails/blog-21-thumbnail.svg',
  'images/blog/thumbnails/abhijeet-bagwe-blog-thumbnail.svg',

  /* Logo sheets wrapped in an SVG. These two look more like real vector artwork
     than the rest, but they are the same thing underneath - blog-4.svg embeds
     eight PNGs, four of them a second copy feeding a mask. Flattened at 900 px
     the FSSAI strapline is still legible at card size, checked side by side. */
  'images/blog/fostac/blog-4.svg',
  'images/blog/what-is-kpis/blog-5-what-is-kpis.svg',

  // Article heroes doubling as covers. The source stays full size for its page.
  { src: 'images/blog/hti-training-programs/02-hti-training-session-hospitality-team.jpg', quality: PHOTO_QUALITY },
  { src: 'images/blog/food-cost-percentage/01-butter-chicken-plate-food-cost.jpg', quality: PHOTO_QUALITY },
  { src: 'images/blog/food-cost-percentage/04-ladle-portion-control-kitchen.jpg', quality: PHOTO_QUALITY },

  // Photographs saved as PNG.
  'images/blog/thumbnails/2602-hti-blogs-22-for-open-graph-image.png',
  'images/blog/thumbnails/hero-section.png',
  'images/blog/what-is-hospitality/blogs-2-for-thumbnails.png',
  'images/blog/sanjay-vazirani/1.png',
  'images/team/vishal-gupta-blog-thumbnail.png'
];

const MIME = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif'
};

const toPosix = (p) => p.split(String.fromCharCode(92)).join('/');

// ---------------------------------------------------------------------------

/* A TARGETS entry is either a path or { src, quality }. Both come out of here as
   { src, quality } so the loop below has one shape to deal with. A --quality on
   the command line overrides everything, including a per-file setting: it is
   there for comparing settings by eye. */
function parseArgs(argv) {
  const opts = { width: DEFAULT_WIDTH, quality: null, files: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--width') opts.width = Number(argv[++i]);
    else if (argv[i] === '--quality') opts.quality = Number(argv[++i]);
    else opts.files.push(toPosix(argv[i]));
  }
  const chosen = opts.files.length ? opts.files : TARGETS;
  opts.files = chosen.map((t) => ({
    src: typeof t === 'string' ? t : t.src,
    quality: opts.quality != null
      ? opts.quality
      : (typeof t === 'string' ? DEFAULT_QUALITY : t.quality)
  }));
  return opts;
}

/* For an SVG the shape that matters is the artboard, not the photograph inside
   it - the artboard is what the wrapper clips down to. viewBox wins over
   width/height because width/height may carry units. Returns null for a raster,
   where the browser's own intrinsic ratio is the right answer. */
function svgArtboardRatio(buf) {
  const head = buf.slice(0, 4096).toString('utf8');
  const vb = head.match(/viewBox="([\d.\-\s]+)"/);
  if (vb) {
    const n = vb[1].trim().split(/\s+/).map(Number);
    if (n.length === 4 && n[2] > 0 && n[3] > 0) return n[3] / n[2];
  }
  const w = head.match(/\swidth="(\d+(?:\.\d+)?)"/);
  const h = head.match(/\sheight="(\d+(?:\.\d+)?)"/);
  if (w && h && Number(w[1]) > 0) return Number(h[1]) / Number(w[1]);
  throw new Error('SVG has no viewBox and no usable width/height');
}

function outputPathFor(abs) {
  const ext = path.extname(abs);
  return abs.slice(0, -ext.length) + '-card.webp';
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const pw = require(PW);
  const browser = await pw.chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  let before = 0;
  let after = 0;

  for (const { src: rel, quality } of opts.files) {
    const abs = path.join(ROOT, rel);
    const src = fs.readFileSync(abs);
    const ext = path.extname(abs).toLowerCase();
    const mime = MIME[ext];
    if (!mime) throw new Error(`${rel}: don't know how to load ${ext}`);

    /* Chrome taints a canvas that has had a file:// image drawn onto it and
       then refuses to read it back, so the source goes in as a data URI - same
       origin, canvas stays readable. */
    const dataUri = `data:${mime};base64,${src.toString('base64')}`;
    const ratio = ext === '.svg' ? svgArtboardRatio(src) : null;

    const b64 = await page.evaluate(
      async ({ uri, w, srcRatio, cardRatio, q }) => {
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = () => rej(new Error('Chrome could not decode it'));
          img.src = uri;
        });

        /* For an SVG the shape that matters is the artboard the wrapper clips
           to, handed in from Node. For a raster the browser's own intrinsic
           size is the right answer. */
        const ratio = srcRatio || img.naturalHeight / img.naturalWidth;
        const h = Math.round(w * cardRatio);

        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        /* Cards sit on white. A transparent corner has to land on white here or
           it goes black the moment it is saved without an alpha channel. */
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        /* The same sum object-fit: cover does - fill the box on the tighter
           axis and centre the overflow off the other one. */
        let dw = w;
        let dh = Math.round(w * ratio);
        if (dh < h) {
          dh = h;
          dw = Math.round(h / ratio);
        }
        ctx.drawImage(img, Math.round((w - dw) / 2), Math.round((h - dh) / 2), dw, dh);

        return { data: c.toDataURL('image/webp', q).split(',')[1], w, h };
      },
      { uri: dataUri, w: opts.width, srcRatio: ratio, cardRatio: CARD_RATIO, q: quality }
    );

    const out = outputPathFor(abs);
    const buf = Buffer.from(b64.data, 'base64');
    fs.writeFileSync(out, buf);

    before += src.length;
    after += buf.length;
    console.log(
      `${String(Math.round(src.length / 1024)).padStart(5)} KB -> ` +
      `${String(Math.round(buf.length / 1024)).padStart(4)} KB ` +
      `(-${String(Math.round((1 - buf.length / src.length) * 100)).padStart(2)}%)  ` +
      `${b64.w}x${b64.h} q${quality}  ${toPosix(path.relative(ROOT, out))}`
    );
  }

  await browser.close();
  console.log(
    `\n${opts.files.length} covers: ${Math.round(before / 1024)} KB -> ` +
    `${Math.round(after / 1024)} KB  (saved ${Math.round((before - after) / 1024)} KB, ` +
    `${Math.round((1 - after / before) * 100)}%)`
  );
  console.log('Now check ASSET_REWRITE in assets/blog-routes.js covers every one.');
}

main().catch((err) => {
  console.error('build-blog-thumbnails failed:', err.message);
  process.exit(1);
});
