/* ============================================================================
   build-og-cards.js  —  a social card for every page that had the bare logo
   ----------------------------------------------------------------------------
   WHY THIS EXISTS

   Twenty-three pages shared one og:image: images/brand/hti-logo.png, a red mark
   on white. Posted in a WhatsApp group - which is how these links actually
   travel - every one of them previewed as the same white square with no words
   on it. The fifteen programme pages were given proper cards in 879d424; these
   are the rest.

   Same 1200x630 as those, same furniture, so a link to hotels.html and a link
   to SUPER look like they come from the same place: HTI's own session
   photography under a dark wash, a red rule down the left edge, the eyebrow,
   the headline, the logo and "On site - 13+ languages - 410+ cities".

   The headline on each card is the phrase the page is trying to rank for, not
   its <title>. A title is written for a search results page, where the site
   name and the pipe earn their place; a card is read in a chat window at the
   size of a thumbnail, and everything that is not the promise gets in the way.

   TWO LAYOUTS

   Programme cards lead with an acronym, because the acronym is the product.
   Only two pages here have one - FoSTaC and POSH - so those use the same
   layout, and the rest use a plain headline set larger. Forcing an acronym
   onto "Find Training By Role" would have looked like a card with a hole in it.

   HOW TO RUN

     node tools/build-og-cards.js                 # draw all of them
     node tools/build-og-cards.js hotels fostac   # draw these
     node tools/build-og-cards.js --wire          # point the pages at them

   Drawing writes images/og/<slug>.jpg and changes nothing else, so the cards
   can be looked at before anything is published. --wire is the second step: it
   sets og:image, og:image:width, og:image:height, og:image:alt and
   twitter:image on each page, and is safe to run twice.

   Both halves live in one tool on purpose. og:image:alt is the card's own words
   read out to someone who cannot see it, so it has to say what the card says -
   keeping the alt text in the same table as the headline is what stops the two
   drifting apart the next time a card is reworded.

   Needs the bundled Node and Playwright, and a network connection the first
   time for the Google font:
     C:\Users\ATUL\AppData\Local\ms-playwright-go\1.57.0\node.exe
   ========================================================================== */

'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const PW = 'C:/Users/ATUL/AppData/Local/ms-playwright-go/1.57.0/package/index.js';
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'images', 'og');

const WIDTH = 1200;
const HEIGHT = 630;

/* Facebook, LinkedIn and WhatsApp all re-compress these anyway. 82 lands
   between 60 and 130 KB on this photography, which is well inside every
   platform's limit and small enough not to hold up a preview. */
const JPEG_QUALITY = 82;

const TAGLINE = 'On site &middot; 13+ languages &middot; 410+ cities';
const EYEBROW = 'Hospitality Training Institute';

/* bg      HTI's own photography, chosen for the setting the page is about.
   head    the phrase the page is trying to rank for.
   acronym optional; switches to the programme-card layout.
   sub      what the reader gets. Two lines at most.
   alt      og:image:alt - read aloud by screen readers over the preview.
   lang     'hi' pulls in Devanagari and relaxes the letterspacing. */
const CARDS = [
  /* The last two pages on the bare logo. The home page card is the one most
     likely to be pasted into a group chat cold, with no other context. Its
     headline carries the promise, because the eyebrow above it already says
     Hospitality Training Institute and a card should not say it twice. */
  // ---- home and contact ----------------------------------------------------
  {
    slug: 'index',
    bg: 'images/blog/hti-training-programs/02-hti-training-session-hospitality-team.jpg',
    head: 'Train Your Hotel &amp; Restaurant Staff',
    sub: 'Hotel, restaurant and office staff trained on your own floor',
    alt: 'Train your hotel and restaurant staff with HTI India, on site across India'
  },
  {
    slug: 'contact',
    bg: 'images/blog/hti-training-programs/05-hti-guest-experience-training.jpg',
    head: 'Talk to HTI India',
    sub: 'WhatsApp, phone or email &mdash; we reply within a few hours',
    alt: 'Contact HTI India - hospitality training enquiries answered within hours'
  },

  // ---- section landing pages -----------------------------------------------
  {
    slug: 'hotels',
    bg: 'images/blog/hti-training-programs/04-hti-hotel-operations-training.jpg',
    head: 'Hotel Staff Training',
    sub: 'Hotel SHOT &middot; HOT-CAR &middot; FORT &middot; KMT &middot; CUP',
    alt: 'Hotel Staff Training Programs - HTI India'
  },
  {
    slug: 'restaurants',
    bg: 'images/blog/hti-training-programs/03-hti-restaurant-team-training.jpg',
    head: 'Restaurant Staff Training',
    sub: 'SUPER &middot; SUPPORT &middot; iCEDT &middot; iCARE &middot; Vow to Wow &middot; RAMP',
    alt: 'Restaurant Staff Training Programs - HTI India'
  },
  {
    slug: 'offices',
    bg: 'images/blog/hti-training-programs/06-hti-leadership-development-program.jpg',
    head: 'Office Staff Training',
    sub: 'POST and TOP - soft skills and workplace hospitality, run on your floor',
    alt: 'Office Staff Training Programs - HTI India'
  },
  {
    slug: 'training-by-role',
    bg: 'images/blog/hti-training-programs/02-hti-training-session-hospitality-team.jpg',
    head: 'Training By Role',
    sub: 'Waiters, housekeeping, front office, kitchen, managers - pick a role, see the programme',
    alt: 'Find hospitality training by role - HTI India'
  },

  // ---- compliance ----------------------------------------------------------
  {
    slug: 'fssai-training',
    bg: 'images/blog/hti-training-programs/01-hti-hospitality-training-workshop.jpg',
    head: 'FSSAI Training for Food Businesses',
    sub: 'Food handler and food safety supervisor certification, on site in 13+ languages',
    alt: 'FSSAI and FoSTaC training for food businesses - HTI India'
  },
  {
    slug: 'fostac',
    bg: 'images/blog/hti-training-programs/07-hti-apht-all-purpose-hospitality-training.jpg',
    head: 'What is',
    acronym: 'FoSTaC',
    sub: 'Food Safety Training &amp; Certification - who needs it, and how it works',
    alt: 'What is FoSTaC - Food Safety Training and Certification explained by HTI India'
  },
  {
    slug: 'posh-training',
    bg: 'images/blog/hti-training-programs/08-hti-classroom-training-session.jpg',
    head: 'Workplace Training',
    acronym: 'POSH',
    sub: 'The 2013 Act, for staff, managers and Internal Committee members',
    alt: 'POSH Act training for workplaces - HTI India'
  },

  // ---- free tools ----------------------------------------------------------
  {
    slug: 'food-cost-calculator',
    bg: 'images/blog/food-cost-percentage/01-butter-chicken-plate-food-cost.jpg',
    head: 'Food Cost Calculator',
    sub: 'What a healthy food cost percentage looks like, and how to work out yours. Free.',
    alt: 'Free food cost percentage calculator - HTI India'
  },
  {
    slug: 'restaurant-cost-calculator',
    bg: 'images/blog/food-cost-percentage/04-ladle-portion-control-kitchen.jpg',
    head: 'Restaurant Cost Calculator',
    sub: 'Prime cost, net profit and break-even, from your own monthly numbers. Free.',
    alt: 'Free restaurant operating cost calculator - HTI India'
  },
  {
    slug: 'training-needs-survey',
    bg: 'images/blog/hti-training-programs/08-hti-classroom-training-session.jpg',
    head: 'Free Training Needs Survey',
    sub: '15 questions, three minutes, and a training plan built for your team',
    alt: 'Free training needs survey for hotels, restaurants and QSRs - HTI India'
  },

  // ---- guides and articles -------------------------------------------------
  {
    slug: 'what-is-hospitality',
    bg: 'images/team/2-64b699.jpg',
    head: 'What is Hospitality?',
    sub: 'The definition, the types, and the career it opens up in India',
    alt: 'What is hospitality - definition, meaning and importance - HTI India'
  },
  {
    slug: 'hospitality-hindi',
    bg: 'images/blog/hti-training-programs/05-hti-guest-experience-training.jpg',
    head: '&#2310;&#2340;&#2367;&#2341;&#2381;&#2351; &#2325;&#2381;&#2351;&#2366; &#2361;&#2376;?',
    sub: '&#2361;&#2377;&#2360;&#2381;&#2346;&#2367;&#2335;&#2376;&#2354;&#2367;&#2335;&#2368; &#2325;&#2366; &#2309;&#2352;&#2381;&#2341;, &#2350;&#2361;&#2340;&#2381;&#2340;&#2381;&#2357; &#2324;&#2352; &#2325;&#2352;&#2367;&#2351;&#2352; &#2325;&#2368; &#2346;&#2370;&#2352;&#2368; &#2332;&#2366;&#2344;&#2325;&#2366;&#2352;&#2368;',
    alt: 'Aatithya kya hai - hospitality explained in Hindi by HTI India',
    lang: 'hi'
  },
  {
    slug: 'skills-hospitality',
    bg: 'images/blog/hti-training-programs/05-hti-guest-experience-training.jpg',
    head: '5 Skills Every Hospitality Professional Needs',
    sub: 'Communication, service mindset, problem solving, teamwork, adaptability',
    alt: 'Five must-have skills for hospitality professionals - HTI India'
  },
  {
    slug: 'front-office-jargon',
    bg: 'images/blog/hti-training-programs/04-hti-hotel-operations-training.jpg',
    head: '50 Front Office Terms',
    sub: 'The hotel reception, reservations and guest services glossary',
    alt: '50 front office jargon terms every hotel professional should know - HTI India'
  },

  // ---- interviews ----------------------------------------------------------
  {
    slug: 'agnibh-mudi',
    /* Not the blog thumbnail: that already has the pull-quote set across it,
       and a second headline over the top of the first is unreadable. */
    bg: 'images/team/3.jpg',
    head: 'Agnibh Mudi',
    sub: 'The corporate chef on 52 hours without rest, and what it taught him',
    alt: 'Chef Agnibh Mudi on success in hospitality - an HTI India interview'
  },
  {
    slug: 'sanjay-vazirani',
    bg: 'images/team/1-sanjay-vazirani-ceo-of-foodlink.jpg',
    head: 'Sanjay Vazirani',
    sub: 'From culinary student to the head of Foodlink',
    alt: 'Sanjay Vazirani, from culinary student to industry icon - an HTI India interview'
  },

  // ---- index and template pages -------------------------------------------
  {
    slug: 'blog',
    bg: 'images/blog/hti-training-programs/02-hti-training-session-hospitality-team.jpg',
    head: 'Hospitality Blog',
    sub: 'Tips, trends and training insight for hotel and restaurant teams',
    alt: 'The HTI India hospitality blog'
  },
  {
    slug: 'magazine-blog',
    bg: 'images/blog/hti-training-programs/05-hti-guest-experience-training.jpg',
    head: 'HTI Magazine',
    sub: 'Guides and interviews from India&rsquo;s hospitality training institute',
    alt: 'HTI India magazine - hospitality guides and interviews'
  },
  {
    slug: 'news-announcement',
    bg: 'images/about/about-hero.jpg',
    head: 'News &amp; Announcements',
    sub: 'New programmes, certifications and updates from HTI India',
    alt: 'News and announcements from HTI India'
  },

  // ---- the other two brands under HTI --------------------------------------
  {
    slug: 'lead',
    bg: 'images/blog/hti-training-programs/06-hti-leadership-development-program.jpg',
    head: 'Train The Trainer',
    sub: 'Presentation skills, personality development and campus-to-corporate &mdash; Lead by HTI',
    alt: 'Train The Trainer and soft skills training - Lead by HTI'
  },
  {
    slug: 'dox',
    bg: 'images/blog/hti-training-programs/04-hti-hotel-operations-training.jpg',
    head: 'SOPs, How-To Videos &amp; Checklists',
    sub: 'Dox by HTI puts your standards somewhere other than in people&rsquo;s heads',
    alt: 'SOPs, how-to videos and checklists for hotels and restaurants - Dox by HTI'
  },

  /* The two article templates. Every database-rendered article is served
     through one of these, and their og:image is rewritten by script once the
     article loads - so what is set here is only what a crawler that does not
     run JavaScript sees, which until now was the bare logo. fallbackOnly keeps
     the <meta> tag and its id exactly as they are and changes only the URL
     inside: the id is how the renderer finds the tag, and og:image:width and
     :height would become a lie the moment script swapped in a different
     picture. */
  {
    slug: 'blog-post',
    fallbackOnly: true,
    bg: 'images/blog/hti-training-programs/07-hti-apht-all-purpose-hospitality-training.jpg',
    head: 'From the HTI Blog',
    sub: 'Hospitality training, guest experience and kitchen operations',
    alt: 'An article from the HTI India blog'
  },
  {
    slug: 'immersive-blog',
    fallbackOnly: true,
    bg: 'images/blog/hti-training-programs/01-hti-hospitality-training-workshop.jpg',
    head: 'HTI India Blog',
    sub: 'Insights on hospitality, service excellence and training',
    alt: 'An article from the HTI India blog'
  },

  // ---- the two nobody shares on purpose, but which get shared anyway -------
  {
    slug: '404',
    bg: 'images/blog/hti-training-programs/01-hti-hospitality-training-workshop.jpg',
    head: 'Page Not Found',
    sub: 'That page has moved. The training programmes are all still here.',
    alt: 'Page not found - HTI India'
  },
  {
    slug: 'privacy-policy',
    bg: 'images/blog/hti-training-programs/02-hti-training-session-hospitality-team.jpg',
    head: 'Privacy Policy',
    sub: 'What HTI India collects, why it is collected, and how to have it removed',
    alt: 'HTI India privacy policy'
  }
];

// ---------------------------------------------------------------------------

/* Headlines vary from "Blog" to "5 Skills Every Hospitality Professional
   Needs". Rather than hand-tune a size per card, step down as the headline gets
   longer - measured in characters, which is close enough at these lengths and
   leaves no card overset. */
function headSize(text, hasAcronym) {
  const n = text.replace(/&[a-z#0-9]+;/gi, 'x').length;
  if (hasAcronym) return 46;
  if (n <= 18) return 78;
  if (n <= 30) return 64;
  if (n <= 44) return 54;
  return 46;
}

function cardHtml(card, port) {
  const hasAcronym = Boolean(card.acronym);
  const hi = card.lang === 'hi';
  const bgUrl = `http://127.0.0.1:${port}/${card.bg}`;
  const logoUrl = `http://127.0.0.1:${port}/images/brand/hti-logo.png`;

  return `<!doctype html>
<html lang="${hi ? 'hi' : 'en'}"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800${
    hi ? '&family=Noto+Sans+Devanagari:wght@500;700' : ''}&display=swap">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden;
    font-family: ${hi ? "'Noto Sans Devanagari', " : ''}'Montserrat', sans-serif;
    background: #111;
  }
  .card { position: relative; width: 100%; height: 100%; }
  .bg { position: absolute; inset: 0; width: 100%; height: 100%;
        object-fit: cover; object-position: center 32%; }
  /* Dark on the left where the words go, clear on the right where the
     photograph does the work. */
  .wash { position: absolute; inset: 0; background:
    linear-gradient(100deg,
      rgba(10,10,10,.95) 0%, rgba(10,10,10,.92) 30%,
      rgba(10,10,10,.72) 48%, rgba(10,10,10,.34) 68%, rgba(10,10,10,.18) 100%); }
  .rule { position: absolute; left: 0; top: 0; bottom: 0; width: 14px;
          background: #e31e24; }
  .body { position: absolute; left: 68px; right: 60px; top: 58px; bottom: 54px;
          display: flex; flex-direction: column; }
  /* The programme cards fill the height because the acronym is enormous. A card
     without one has less to say and left a hole in the middle, so the words
     centre themselves in whatever room is left above the footer. */
  .text { margin: auto 0; }
  .eyebrow { font-size: 20px; font-weight: 700; letter-spacing: .19em;
             text-transform: uppercase; color: #e31e24; }
  .head { margin-top: 22px; font-size: ${headSize(card.head, hasAcronym)}px;
          font-weight: 800; line-height: 1.1; color: #fff;
          letter-spacing: -.015em; max-width: ${hasAcronym ? 640 : 700}px; }
  .acronym { margin-top: 4px; font-size: 112px; font-weight: 800;
             line-height: 1.02; color: #fff; letter-spacing: -.02em; }
  .sub { margin-top: 24px; font-size: 26px; font-weight: 500; line-height: 1.36;
         color: #d6d6d6; max-width: 660px; }
  .foot { margin-top: auto; display: flex; align-items: center; gap: 22px; }
  .foot img { height: 52px; width: auto; display: block; }
  .bar { width: 2px; height: 40px; background: rgba(255,255,255,.32); }
  .tag { font-size: 23px; font-weight: 600; color: #fff; letter-spacing: .005em; }
</style></head>
<body><div class="card">
  <img class="bg" src="${bgUrl}" alt="">
  <div class="wash"></div>
  <div class="rule"></div>
  <div class="body">
    <div class="text">
      <div class="eyebrow">${EYEBROW}</div>
      <div class="head">${card.head}</div>
      ${hasAcronym ? `<div class="acronym">${card.acronym}</div>` : ''}
      <div class="sub">${card.sub}</div>
    </div>
    <div class="foot">
      <img src="${logoUrl}" alt="">
      <div class="bar"></div>
      <div class="tag">${TAGLINE}</div>
    </div>
  </div>
</div></body></html>`;
}

function serveRoot() {
  const types = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml'
  };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    fs.readFile(path.join(ROOT, rel), (err, buf) => {
      if (err) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, {
        'Content-Type': types[path.extname(rel).toLowerCase()] || 'application/octet-stream'
      });
      res.end(buf);
    });
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

const SITE = 'https://www.hti-india.com';

/* Meta values are attribute content, not markup: an ampersand or a quote in an
   alt string has to be escaped or it ends the attribute early. */
function attr(s) {
  return String(s)
    .replace(/&(?!(?:[a-z]+|#\d+);)/gi, '&amp;')
    .replace(/"/g, '&quot;');
}

/* Points one page at its card. Rewrites rather than appends, so running it a
   second time is a no-op and a reworded alt string still lands. */
function wireOne(card) {
  const file = path.join(ROOT, `${card.slug}.html`);
  if (!fs.existsSync(file)) return { slug: card.slug, status: 'no such page' };

  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  const url = `${SITE}/images/og/${card.slug}.jpg`;

  /* An article template: swap the URL inside the existing tags and leave
     everything else, ids included, alone. See the note on the entries. */
  if (card.fallbackOnly) {
    html = html.replace(
      /(<meta property="og:image"[^>]*content=")[^"]*(")/i, `$1${url}$2`
    ).replace(
      /(<meta name="twitter:image"[^>]*content=")[^"]*(")/i, `$1${url}$2`
    );
    if (html === before) return { slug: card.slug, status: 'already pointed there' };
    fs.writeFileSync(file, html);
    return { slug: card.slug, status: 'wired (fallback only)' };
  }

  /* Drop whatever og:image block is there now - the bare logo on these pages,
     or an earlier run's four lines - then write a fresh one in its place. */
  const IMAGE_META = /^[ \t]*<meta property="og:image(?::(?:width|height|alt|type|secure_url))?"[^>]*>\r?\n/gim;
  let anchor = null;
  html = html.replace(IMAGE_META, (m) => {
    if (anchor === null) anchor = m.match(/^[ \t]*/)[0];
    return '';
  });
  if (anchor === null) return { slug: card.slug, status: 'no og:image to replace' };

  const block = [
    `${anchor}<meta property="og:image" content="${url}" />`,
    `${anchor}<meta property="og:image:width" content="${WIDTH}" />`,
    `${anchor}<meta property="og:image:height" content="${HEIGHT}" />`,
    `${anchor}<meta property="og:image:alt" content="${attr(card.alt)}" />`
  ].join('\r\n') + '\r\n';

  /* Put it back where og:url is, which is where it was, rather than at the top
     of the head - the order these appear in is how a person reads the file. */
  const urlMeta = /^([ \t]*<meta property="og:url"[^>]*>\r?\n)/im;
  if (urlMeta.test(html)) {
    html = html.replace(urlMeta, `$1${block}`);
  } else {
    html = html.replace(/^([ \t]*<meta property="og:type"[^>]*>\r?\n)/im, `$1${block}`);
  }

  html = html.replace(
    /(<meta name="twitter:image" content=")[^"]*(")/i,
    `$1${url}$2`
  );

  if (html === before) return { slug: card.slug, status: 'already pointed there' };
  fs.writeFileSync(file, html);
  return { slug: card.slug, status: 'wired' };
}

function wire(cards) {
  let changed = 0;
  for (const c of cards) {
    if (!fs.existsSync(path.join(OUT_DIR, `${c.slug}.jpg`))) {
      console.log(`  skipped ${c.slug}.html - images/og/${c.slug}.jpg has not been drawn yet`);
      continue;
    }
    const r = wireOne(c);
    if (r.status.startsWith('wired')) changed++;
    console.log(`  ${r.slug}.html: ${r.status}`);
  }
  console.log(`\n${changed} page${changed === 1 ? '' : 's'} changed.`);
}

async function main() {
  const argv = process.argv.slice(2);
  const doWire = argv.includes('--wire');
  const wanted = argv.filter((a) => !a.startsWith('--'));
  const cards = wanted.length
    ? CARDS.filter((c) => wanted.includes(c.slug))
    : CARDS;
  if (!cards.length) {
    console.error(`no card matches ${wanted.join(', ')}. Known slugs:\n  ` +
      CARDS.map((c) => c.slug).join('\n  '));
    process.exit(2);
  }

  if (doWire) {
    console.log(`pointing ${cards.length} page${cards.length === 1 ? '' : 's'} ` +
      'at their cards...');
    wire(cards);
    return;
  }

  for (const c of cards) {
    if (!fs.existsSync(path.join(ROOT, c.bg))) {
      throw new Error(`${c.slug}: background not found - ${c.bg}`);
    }
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = await serveRoot();
  const port = server.address().port;
  const pw = require(PW);
  const browser = await pw.chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1
  });

  let total = 0;
  for (const c of cards) {
    await page.setContent(cardHtml(c, port), { waitUntil: 'load' });
    /* Wait for the webfont as well as the photograph: screenshotting before
       Montserrat arrives silently falls back to a system face, and the whole
       point is that these match the fifteen cards already published. */
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => {
      const i = document.querySelectorAll('img');
      return [...i].every((x) => x.complete && x.naturalWidth > 0);
    }, null, { timeout: 15000 });
    await page.waitForTimeout(150);

    const out = path.join(OUT_DIR, `${c.slug}.jpg`);
    await page.screenshot({ path: out, type: 'jpeg', quality: JPEG_QUALITY });
    const bytes = fs.statSync(out).size;
    total += bytes;
    console.log(`${String(Math.round(bytes / 1024)).padStart(4)} KB  ` +
      `images/og/${c.slug}.jpg`);
  }

  await browser.close();
  server.close();
  console.log(`\n${cards.length} cards, ${Math.round(total / 1024)} KB total.`);
  console.log('Now point each page at its card: og:image, og:image:width,\n' +
    'og:image:height, og:image:alt and twitter:image.');
}

main().catch((err) => {
  console.error('build-og-cards failed:', err.message);
  process.exit(1);
});
