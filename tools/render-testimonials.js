/* Make HTI's testimonials readable by machines.

   Two problems this fixes, across the seventeen pages that carry testimonials:

   1. index.html and lead.html shipped `<div id="testiGrid"></div>` empty and
      filled it from a JS array on load. Anything that does not run JavaScript
      -- which includes every AI answer engine -- saw a hospitality training
      company with no customers. The cards written here are byte-identical to
      what the page script produces, so the script overwriting them on load
      changes nothing on screen.

   2. Not one page carried schema.org Review data, so seven named quotes from
      Ginger, Pidilite, Kamat Hotels, Azure and KA Hospitality were invisible
      as review content. Each page now declares them against the organisation.

   Re-running regenerates both; it does not stack them.

   Run: node tools/render-testimonials.js */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* These two build their cards in JavaScript and need the markup written out. */
const JS_RENDERED = ['index.html', 'lead.html'];

/* These already ship the cards as HTML and only need the Review data. */
const STATIC_PAGES = [
  'class.html', 'cup.html', 'fort.html', 'hotcar.html', 'hotel-shot.html',
  'icare.html', 'icedt.html', 'kmt.html', 'mdp.html', 'post.html',
  'ramp.html', 'super.html', 'support.html', 'top.html', 'vow.html'
];

const LINKEDIN = 'https://www.linkedin.com/company/hospitality-training-institute-india-pvt-ltd';
const SITE = 'https://www.hti-india.com';

/* ---------- author attribution ---------- */

/* A role line reads "Title, Company", but two of the seven carry a comma
   inside the title and one carries a comma inside the company name -- so
   splitting on the last comma files Ginger's HR head as working for "A TATA
   Enterprise". The client names are the whole point of this markup, so they
   are matched outright instead of guessed at. The two Ginger spellings are
   both here because the homepage and the programme pages word it differently. */
const ORGANISATIONS = [
  'GINGER, A TATA Enterprise',
  'KA Hospitality Pvt Ltd',
  'Pidilite Industries Ltd',
  'Azure Hospitality Pvt Ltd',
  'Kamat Hotels (India) Limited',
  'QED Productions Pvt Ltd',
  "Anjuman-I-Islam's Institute Of Hotel Management"
];

function splitRole(role) {
  for (const org of ORGANISATIONS) {
    if (role.endsWith(', ' + org)) {
      return { title: role.slice(0, -(org.length + 2)), org: org };
    }
  }
  // An unrecognised client is reported rather than silently mis-attributed.
  console.warn('  ! unrecognised employer in role: ' + JSON.stringify(role));
  return { title: role, org: null };
}

/* reviewBody has to be plain text: the quotes carry <br> and HTML entities. */
function toPlainText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&ldquo;|&rdquo;|&quot;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^"|"$/g, '')
    .trim();
}

/* No numeric rating is attached anywhere below. None of these clients gave a
   score, and an invented aggregateRating is exactly what Google's review
   snippet policy forbids. Without one there are no stars -- but the reviews
   become real, attributable, quotable text, which is the part that was
   missing. Stars become available the day HTI collects actual ratings. */
function buildSchema(people) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': SITE + '/#organisation',
    review: people.map(p => {
      const parts = splitRole(p.role);
      const author = { '@type': 'Person', name: p.name, jobTitle: parts.title };
      if (parts.org) author.worksFor = { '@type': 'Organization', name: parts.org };
      return {
        '@type': 'Review',
        author: author,
        reviewBody: toPlainText(p.text),
        itemReviewed: { '@id': SITE + '/#organisation' }
      };
    })
  };
}

const REVIEW_LD_RE = /<script type="application\/ld\+json">\{[^<]*"@type":"Review"[^<]*<\/script>\r?\n\s*/;

/* The organisation block already sits in <head>; the reviews go beside it.
   Any block from an earlier run is dropped first so re-running cannot stack. */
function writeSchema(src, people) {
  const ld = '<script type="application/ld+json">'
    + JSON.stringify(buildSchema(people)) + '</script>\r\n  ';
  return src.replace(REVIEW_LD_RE, '').replace('<link rel="icon"', ld + '<link rel="icon"');
}

/* ---------- reading testimonials off a page ---------- */

/* The JS pages keep them in a literal array of string fields; evaluating it is
   how the page itself reads it, so the static cards cannot drift. */
function readJsArray(src) {
  const m = src.match(/const data = (\[[\s\S]*?\n\s*\]);/);
  if (!m) throw new Error('testimonial array not found');
  return eval(m[1]);
}

/* The LinkedIn glyph is lifted out of the page rather than kept as a copy here.
   A hand-transcribed path is one wrong decimal away from a card that renders
   differently before and after the page script runs. */
function readLinkedInSvg(src) {
  const m = src.match(/const LI = '(<svg[\s\S]*?<\/svg>)';/);
  if (!m) throw new Error('LinkedIn icon markup not found');
  return m[1];
}

/* The static pages hold name, role and quote in three fixed classes. Cards
   containing `${` are the page's own JS template, not a real testimonial. */
const STATIC_CARD_RE = new RegExp(
  '<div class="testi-name">([\\s\\S]*?)</div>\\s*'
  + '<div class="testi-title">([\\s\\S]*?)</div>'
  + '[\\s\\S]*?<p class="testi-quote">([\\s\\S]*?)</p>',
  'g'
);

function readStaticCards(src) {
  const out = [];
  let m;
  STATIC_CARD_RE.lastIndex = 0;
  while ((m = STATIC_CARD_RE.exec(src)) !== null) {
    if (m[0].indexOf('${') !== -1) continue;
    out.push({ name: m[1].trim(), role: decodeRole(m[2].trim()), text: m[3].trim() });
  }
  return out;
}

/* Role text is compared against ORGANISATIONS, which are written unescaped. */
function decodeRole(role) {
  return role.replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'");
}

/* ---------- writing the cards into the JS-rendered pages ---------- */

function buildCards(data, liSvg) {
  return data.map(d =>
    '\n    <div class="testi-card">' +
    '\n      <div class="testi-quote">&ldquo;</div>' +
    '\n      <div class="testi-person">' +
    '\n        <img src="' + d.img + '" alt="' + d.name + '">' +
    '\n        <div>' +
    '\n          <h4>' + d.name + '</h4>' +
    '\n          <div class="role">' + d.role + '</div>' +
    '\n          <a href="' + LINKEDIN + '" target="_blank">' + liSvg + '</a>' +
    '\n        </div>' +
    '\n      </div>' +
    '\n      <p class="testi-text">' + d.text + '</p>' +
    '\n    </div>'
  ).join('');
}

/* The rendered cards nest divs, so no regex can reliably find the grid's own
   closing tag -- a non-greedy match stops inside the first card and leaves the
   rest behind. The last card ends at four spaces and the grid closes at six,
   and that pairing appears nowhere inside a card, so it is what a re-run cuts
   back to before writing fresh cards. */
const GRID_OPEN = '<div class="testi-grid" id="testiGrid">';
const GRID_CLOSE = '\r\n    </div>\r\n      </div>';
const OPEN_ONLY = GRID_OPEN + '</div>';

function clearGrid(src) {
  if (src.indexOf(OPEN_ONLY) !== -1) return src;
  const open = src.indexOf(GRID_OPEN);
  if (open === -1) return null;
  const close = src.indexOf(GRID_CLOSE, open);
  if (close === -1) return null;
  return src.slice(0, open) + OPEN_ONLY + src.slice(close + GRID_CLOSE.length);
}

/* ---------- run ---------- */

let rendered = 0, marked = 0, skipped = 0;

for (const page of JS_RENDERED) {
  const file = path.join(ROOT, page);
  const original = fs.readFileSync(file, 'utf8');
  const data = readJsArray(original);

  let src = clearGrid(original);
  if (src === null) {
    console.log(page + ': testimonial grid markup not recognised - skipped');
    skipped++;
    continue;
  }

  const cards = buildCards(data, readLinkedInSvg(original)).replace(/\n/g, '\r\n');
  src = src.replace(OPEN_ONLY, GRID_OPEN + cards + '\r\n      </div>');
  src = writeSchema(src, data);

  fs.writeFileSync(file, src);
  console.log(page + ': ' + data.length + ' cards rendered + review schema');
  rendered++;
}

for (const page of STATIC_PAGES) {
  const file = path.join(ROOT, page);
  const original = fs.readFileSync(file, 'utf8');
  const people = readStaticCards(original);

  if (people.length === 0) {
    console.log(page + ': no testimonial cards found - skipped');
    skipped++;
    continue;
  }

  const src = writeSchema(original, people);
  fs.writeFileSync(file, src);
  console.log(page + ': review schema for ' + people.length + ' testimonials');
  marked++;
}

console.log('\n' + rendered + ' page(s) pre-rendered, '
  + (rendered + marked) + ' page(s) carry review schema'
  + (skipped ? ', ' + skipped + ' skipped' : '') + '.');
