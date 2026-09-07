/* ============================================================================
   build-city-pages.js  —  one landing page per city HTI sells into
   ----------------------------------------------------------------------------
   WHY THIS EXISTS

   The site had a page for every programme, every trainer and three audience
   segments, and not one page that could answer "hospitality training in
   Mumbai". That is the query a hotel GM or an F&B owner actually types, and
   with no ad budget behind the site it is the only kind of high-intent
   traffic available. index.html's schema already claimed India, the UAE,
   Saudi, the Maldives and Mauritius; nothing on the site supported the claim.

   THE CHROME IS NOT RETYPED

   The navbar, footer, stylesheet, mobile-nav script and sticky contact bar
   are lifted out of hotels.html at build time rather than pasted in here. If
   the nav gains an item next month, re-running this picks it up, and the ten
   pages cannot drift away from the rest of the site. It also means these
   pages are byte-identical to the rest of the site in everything that is not
   their own content - same GA4 tag, same motion layer, same subscribe block.

   The copy, and the reasoning behind what each page is allowed to claim,
   lives in tools/city-data.js.

   WHAT IT WRITES

   hospitality-training-<slug>.html at the repo root, matching the flat
   convention the rest of the site uses. Nothing else is touched: sitemap.xml,
   contact.html's slug table and tools/build-og-cards.js are edited by hand
   because each needs a judgement call this script should not be making.

   HOW TO RUN

     node tools/build-city-pages.js              # write all of them
     node tools/build-city-pages.js mumbai goa   # write just these

   Needs the bundled Node:
     C:\Users\ATUL\AppData\Local\ms-playwright-go\1.57.0\node.exe
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const { PROGRAMMES, CITIES, HERO_PHOTOS } = require('./city-data.js');

const ROOT = path.resolve(__dirname, '..');
const DONOR = path.join(ROOT, 'hotels.html');
const SITE = 'https://www.hti-india.com';
const TEL = '+917738060902';
const PHONE = '+91 77380 60902';
const PHOTOS = 'images/blog/hti-training-programs/';

/* --------------------------------------------------------------------------
   Pull the shared furniture out of hotels.html.

   Slicing on the markup rather than on line numbers, so an edit to the donor
   that moves things around does not silently produce a page with half a
   footer. Every one of these throws rather than returning empty: a city page
   that quietly shipped without a navbar would be worse than a failed build.
   -------------------------------------------------------------------------*/
function slice(html, startMark, endMark, what) {
  const a = html.indexOf(startMark);
  if (a === -1) throw new Error(`could not find the start of the ${what} in hotels.html`);
  const b = html.indexOf(endMark, a + startMark.length);
  if (b === -1) throw new Error(`could not find the end of the ${what} in hotels.html`);
  return html.slice(a, b + endMark.length);
}

function chrome() {
  const html = fs.readFileSync(DONOR, 'utf8');
  return {
    style: slice(html, '  <style>', '  </style>', 'stylesheet'),
    header: slice(html, '  <header class="navbar">', '  </header>', 'navbar'),
    footer: slice(html, '  <div data-subscribe', '  </footer>', 'footer'),
    /* the two inline scripts (mobile nav, scroll progress) and the sticky
       WhatsApp/call bar, which sit together at the end of the body */
    tail: slice(html, '  <script>\r\n    /* ---------- Mobile nav', '</div>\r\n  <script src="assets/subscribe.js"', 'tail scripts')
      .replace(/<script src="assets\/subscribe\.js"$/, '').trimEnd()
  };
}

/* --------------------------------------------------------------------------
   Small helpers
   -------------------------------------------------------------------------*/

/* The copy in city-data.js is written with HTML entities in it, because that
   is how it reads in the page. JSON-LD wants the characters themselves, and
   a stray &mdash; in a schema string is a validation error. */
function plain(s) {
  return String(s)
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&middot;/g, '\u00b7')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');
}

/* Oxford-less list: "Marathi, Hindi and English". */
function joinAnd(list) {
  if (list.length === 1) return list[0];
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}

const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

/* Read a JPEG's real pixel size out of its SOF marker, so the hero <img> can
   carry width and height attributes without anybody hand-copying numbers that
   go stale the moment a photo is replaced. Without them the hero image has no
   reserved box and the whole page jumps when it loads - Cumulative Layout
   Shift, and the one Core Web Vital a hero image is most likely to wreck. */
function jpegSize(file) {
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    /* SOF0-SOF15, skipping the markers in that range that are not frame
       headers (DHT, JPG, DAC) */
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`could not read the pixel size of ${file}`);
}

/* --------------------------------------------------------------------------
   The page
   -------------------------------------------------------------------------*/
function build(c, all, ch) {
  const url = `${SITE}/hospitality-training-${c.slug}.html`;
  const title = c.title;
  const desc = c.desc;
  const langs = joinAnd(c.langs);
  const og = `${SITE}/images/og/hospitality-training-${c.slug}.jpg`;

  const heroFile = HERO_PHOTOS[c.slug];
  if (!heroFile) throw new Error(`${c.slug}: no hero photograph`);
  const hero = Object.assign({ file: heroFile }, jpegSize(path.join(ROOT, PHOTOS + heroFile)));

  /* Where the trainer comes from. The only structural difference between the
     HQ page and the other nine, and the reason there is no LocalBusiness
     schema on the other nine. */
  const reach = c.hq
    ? `HTI&rsquo;s office is in Vashi, Navi Mumbai, so ${c.city} work is local work &mdash; no trainer travel, and short single-day formats are as easy to schedule as long ones.`
    : `HTI is headquartered in Navi Mumbai and the trainers travel. There is no ${c.city} branch office and this page does not pretend otherwise: what comes to you is the trainer and the programme, delivered at your own property.`;

  /* ---- programme cards ---- */
  const cards = c.progs.map((slug) => {
    const p = PROGRAMMES[slug];
    if (!p) throw new Error(`${c.slug}: no programme called "${slug}"`);
    const [name, blurb, photo] = p;
    return `        <a href="${slug}.html" class="course-card">
          <img loading="lazy" decoding="async" src="${PHOTOS}${photo}" alt="HTI ${plain(name)} training session" style="width:100%; height:170px; object-fit:cover; border-radius:16px 16px 0 0;">
          <div class="course-name">${name}</div>
          <p class="course-desc">${blurb}</p>
        </a>`;
  }).join('\r\n');

  /* ---- the other nine cities ---- */
  const others = all.filter(o => o.slug !== c.slug).map(o =>
    `        <a href="hospitality-training-${o.slug}.html">${o.city}</a>`
  ).join('\r\n');

  /* ---- FAQ ----
     Every answer here is either something the site already says elsewhere
     (the one-working-day callback is cup.html's wording) or a plain fact
     about how HTI operates. Nothing invents a price, a date or a client. */
  const faqs = [
    c.faqExtra || {
      q: `Do you have an office in ${c.city}?`,
      a: `No. HTI is headquartered at Vashi, Navi Mumbai, and the trainers travel to you. The training itself runs at your property in ${c.city} &mdash; on your floor, with your equipment and your menu &mdash; which is where it works best in any case.`
    },
    {
      q: `Where does the training actually happen?`,
      a: `At your own hotel, restaurant, outlet or office in ${c.city}. HTI does not run open-enrolment batches in a rented classroom; a session is booked by one employer for one team, and it is built around the situations that team meets on its own shift.`
    },
    {
      q: `Which language will the session be in?`,
      a: `Tell us which language your floor staff work in and we will match a trainer to it. HTI has run sessions in 13 languages across 410+ cities; in ${c.city} the request is usually ${langs}. Training somebody in a language they think in and not merely understand is most of the difference between a session that changes a shift and one that fills an afternoon.`
    },
    {
      q: `Which programme suits a business in ${c.city}?`,
      a: `It depends on the roles you are trying to fix rather than on the city. Of the ${c.progs.length} listed on this page, ${plain(PROGRAMMES[c.progs[0]][0])}, ${plain(PROGRAMMES[c.progs[1]][0])} and ${plain(PROGRAMMES[c.progs[2]][0])} are the ones ${c.city} employers most often start with. If you are not sure, say what is going wrong on the floor and a consultant will point you at the right one.`
    },
    {
      q: `How do we start?`,
      a: `Send the enquiry form on this page, or WhatsApp ${PHONE}. A training consultant calls back within one working day, Monday to Saturday, with dates, group sizes and what the programme costs for a team your size.`
    }
  ];

  const faqHtml = faqs.map(f => `        <details class="ct-faq-item">
          <summary>${f.q}</summary>
          <p>${f.a}</p>
        </details>`).join('\r\n');

  /* ---- structured data ----
     WebPage + Breadcrumb on every page, matching the rest of the site.
     FAQPage for the questions. Service with areaServed is what tells Google
     this page is about a place without claiming premises there - and only
     Mumbai, where there genuinely are premises, adds LocalBusiness with the
     postal address. */
  const ld = [];

  ld.push({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: plain(title),
    description: plain(desc),
    url,
    inLanguage: 'en-IN',
    isPartOf: { '@type': 'WebSite', name: 'HTI India', url: SITE + '/' },
    publisher: { '@type': 'Organization', name: 'HTI India', url: SITE + '/' }
  });

  ld.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Hospitality Training Programs', item: SITE + '/hospitality-training-programs.html' },
      { '@type': 'ListItem', position: 3, name: `Hospitality Training in ${c.city}`, item: url }
    ]
  });

  ld.push({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `Hospitality Training in ${c.city}`,
    description: plain(desc),
    serviceType: 'Hospitality staff training',
    url,
    provider: { '@type': 'Organization', name: 'HTI India', url: SITE + '/', '@id': SITE + '/#organisation' },
    areaServed: { '@type': 'City', name: plain(c.city), containedInPlace: { '@type': 'AdministrativeArea', name: c.region } },
    availableLanguage: c.langs.map(l => ({ '@type': 'Language', name: l })),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `HTI programmes delivered in ${plain(c.city)}`,
      itemListElement: c.progs.map(s => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Course', name: plain(PROGRAMMES[s][0]), description: plain(PROGRAMMES[s][1]), url: `${SITE}/${s}.html`, provider: { '@type': 'Organization', name: 'HTI India', url: SITE + '/' } }
      }))
    }
  });

  ld.push({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: plain(f.q),
      acceptedAnswer: { '@type': 'Answer', text: plain(f.a) }
    }))
  });

  /* One office, one LocalBusiness. */
  if (c.hq) {
    ld.push({
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': SITE + '/#office-vashi',
      name: 'Hospitality Training Institute India Pvt Ltd',
      url,
      telephone: '+91-77380-60902',
      email: 'kaushal@hti-india.com',
      priceRange: '$$',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'A433 Vashi Plaza, Sector 17, Sion Panvel Highway',
        addressLocality: 'Vashi, Navi Mumbai',
        addressRegion: 'Maharashtra',
        postalCode: '400703',
        addressCountry: 'IN'
      },
      areaServed: { '@type': 'City', name: 'Mumbai' },
      parentOrganization: { '@id': SITE + '/#organisation' }
    });
  }

  const ldHtml = ld.map(o => `  <script type="application/ld+json">${json(o)}</script>`).join('\r\n');

  /* ---- the document ---- */
  const page = `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${og}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Hospitality training in ${plain(c.city)} by HTI India, delivered on your own property" />
  <meta property="og:site_name" content="HTI India" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${og}" />
  <meta name="geo.region" content="IN" />
  <link rel="icon" href="images/brand/hti-favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
${ch.style.replace(/  <\/style>$/, CITY_CSS + '\r\n  </style>')}
  <!-- Google tag (gtag.js) -->
  <script async fetchpriority="low" src="https://www.googletagmanager.com/gtag/js?id=G-SBKJQQRP0N"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-SBKJQQRP0N');
  </script>
  <!-- shared motion layer: progressive enhancement, see assets/motion.css -->
  <script>document.documentElement.className += ' mo';</script>
  <link rel="stylesheet" href="assets/motion.css" />
  <link rel="stylesheet" href="assets/polish.css" />
  <link rel="stylesheet" href="assets/enquiry.css" />
  <script src="assets/motion.js" defer></script>
${ldHtml}
</head>

<body>

  <!-- ============ NAVBAR ============ -->
${ch.header}

  <!-- ============ HERO ============
       Split: the promise on the left, HTI's own session photography on the
       right. The <img> carries width/height and fetchpriority so it can be
       the LCP element without costing layout shift. -->
  <section class="ct-hero">
    <div class="wrap">
      <nav class="ct-crumb" aria-label="Breadcrumb">
        <a href="index.html">Home</a> <span aria-hidden="true">&rsaquo;</span>
        <a href="hospitality-training-programs.html">Training Programs</a> <span aria-hidden="true">&rsaquo;</span>
        <span aria-current="page">${c.city}</span>
      </nav>
      <div class="ct-hero-grid">
        <div class="ct-hero-text">
          <p class="ct-eyebrow"><span class="ct-dot"></span>On site in ${c.city}${c.hq ? ' &mdash; this is our home city' : ' &mdash; trainers come to you'}</p>
          <h1>Hospitality Training in <span class="ct-city-word">${c.city}</span></h1>
          <p class="ct-lead">${c.lead}</p>
          <div class="ct-actions">
            <a class="ct-btn ct-btn-quote" href="contact.html?programme=city-${c.slug}#efForm">Get a quote for ${c.city} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
            <a class="ct-btn ct-btn-wa" href="https://wa.me/${TEL.replace('+', '')}?text=Hi%20HTI%2C%20we%20are%20in%20${encodeURIComponent(plain(c.city))}%20and%20would%20like%20to%20know%20more%20about%20staff%20training." target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z"/><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24a8.19 8.19 0 0 1 5.82 2.42 8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23z"/></svg> WhatsApp us</a>
            <a class="ct-btn ct-btn-tel" href="tel:${TEL}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ${PHONE}</a>
          </div>
          <p class="ct-hero-note">Hotel, restaurant, QSR and office teams across ${c.also}.</p>
        </div>

        <div class="ct-hero-media">
          <img src="${PHOTOS}${hero.file}" width="${hero.w}" height="${hero.h}" fetchpriority="high" decoding="async"
            alt="An HTI trainer running a live hospitality session with uniformed staff" />
          <div class="ct-hero-tag"><b>Since 2002</b><span>410+ cities &middot; 13+ languages</span></div>
        </div>
      </div>

      <!-- the numbers HTI already publishes sitewide; nothing here is
           specific to this city, and nothing here is invented -->
      <div class="ct-stats">
        <div class="ct-stat"><b>2002</b><span>Training since</span></div>
        <div class="ct-stat"><b>300,000+</b><span>People trained</span></div>
        <div class="ct-stat"><b>410+</b><span>Cities reached</span></div>
        <div class="ct-stat"><b>13+</b><span>Languages taught in</span></div>
      </div>
    </div>
  </section>

  <!-- ============ WHAT YOU GET ============ -->
  <section class="ct-band">
    <div class="wrap ct-band-grid">
      <div class="ct-band-item">
        <h2>At your property</h2>
        <p>The session runs on your own floor in ${c.city} &mdash; your outlet, your kitchen, your front desk. Staff practise on the equipment and the menu they will use on the next shift.</p>
      </div>
      <div class="ct-band-item">
        <h2>In their language</h2>
        <p>Sessions have been run in 13 languages. In ${c.city} that usually means ${langs}. Tell us which one your team works in and we will match a trainer to it.</p>
      </div>
      <div class="ct-band-item">
        <h2>Built around your problem</h2>
        <p>Not a stock deck. The programme is put together from what is actually going wrong on your floor, and it ends with a report you can act on.</p>
      </div>
    </div>
  </section>

  <!-- ============ PROGRAMMES ============ -->
  <section class="ct-progs" id="programmes">
    <div class="wrap">
      <h2 class="ct-h2">Programmes ${c.city} businesses ask for</h2>
      <p class="ct-sub">Every HTI programme can be delivered in ${c.city}. These are the ones the city&rsquo;s employers book most often &mdash; each one links to the full programme page.</p>
      <div class="ct-grid">
${cards}
      </div>
      <p class="ct-all"><a href="hospitality-training-programs.html">See all 26+ programmes</a> &middot; <a href="training-by-role.html">Find training by role</a></p>
    </div>
  </section>

  <!-- ============ THE CITY ============ -->
  <section class="ct-market">
    <div class="wrap ct-market-inner">
      <h2 class="ct-h2">Training for the way ${c.city} actually works</h2>
      <p>${c.market}</p>
      <p class="ct-reach">${reach}</p>
    </div>
  </section>

  <!-- ============ HOW ============ -->
  <section class="ct-how">
    <div class="wrap">
      <h2 class="ct-h2">How a ${c.city} booking runs</h2>
      <ol class="ct-steps">
        <li><b>You tell us what is going wrong.</b> Covers dropping, reviews slipping, a new outlet opening, a team that has never been trained. A consultant calls back within one working day.</li>
        <li><b>We agree the programme, dates and language.</b> Group size, which shifts, and which of the programmes above fits the roles you need fixed.</li>
        <li><b>The trainer comes to you.</b> Sessions run at your property in ${c.city}, scheduled around service rather than across it.</li>
        <li><b>You get a report.</b> What was covered, who took part, and what the floor still needs &mdash; so the next round is not a guess.</li>
      </ol>
    </div>
  </section>

  <!-- ============ FAQ ============ -->
  <section class="ct-faq">
    <div class="wrap ct-faq-inner">
      <h2 class="ct-h2">Questions about training in ${c.city}</h2>
${faqHtml}
    </div>
  </section>

  <!-- ============ ENQUIRE ============
       One form, on contact.html, because that is the one the office watches.
       The city arrives with it as ?programme=city-<slug>, which contact.html
       looks up in its own table - see the programme block there. -->
  <section class="pe" id="enquire">
    <div class="pe-inner">
      <div class="pe-lead">
        <h2>Bring HTI to <em>your ${c.city} team</em></h2>
        <p>Tell us about your property and a training consultant will come back within one working day with dates, group sizes and what it would cost for a team your size.</p>
        <ul class="pe-points">
          <li>Sessions run on site in ${c.city}, in the language your team works in</li>
          <li>Built around the situations your staff actually face, not a slide deck</li>
          <li>No obligation &mdash; most conversations start with what is going wrong on the floor</li>
        </ul>
        <div class="pe-direct">
          <a class="pe-wa" href="https://wa.me/${TEL.replace('+', '')}?text=Hi%20HTI%2C%20we%20are%20in%20${encodeURIComponent(plain(c.city))}%20and%20would%20like%20to%20know%20more%20about%20staff%20training." target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.48-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z"/><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24a8.19 8.19 0 0 1 5.82 2.42 8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23z"/></svg> WhatsApp us</a>
          <a class="pe-tel" href="tel:${TEL}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg> ${PHONE}</a>
        </div>
      </div>
      <div class="pe-cta-wrap">
        <h3>Ask about training in ${c.city}</h3>
        <p class="pe-cta-note">One short form, about a minute. It reaches the same desk as every other enquiry, so nothing gets lost on the way.</p>
        <a class="pe-cta-btn" href="contact.html?programme=city-${c.slug}#efForm">Enquire about ${c.city} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>
        <ul class="pe-cta-steps">
          <li>The form opens already marked ${c.city} &mdash; you will not have to explain where you are</li>
          <li>A training consultant calls you back within one working day, Mon&ndash;Sat</li>
          <li>You get dates, group sizes and what it costs for a team your size</li>
        </ul>
        <p class="pe-privacy">We use your details only to answer your enquiry. See our <a href="privacy-policy.html">privacy policy</a>.</p>
      </div>
    </div>
  </section>

  <!-- ============ OTHER CITIES ============ -->
  <section class="ct-cities">
    <div class="wrap">
      <h2 class="ct-h2">HTI trains in other cities too</h2>
      <p class="ct-sub">Sessions have run in over 410 cities across India and in five countries. These are the ones with a page of their own.</p>
      <div class="ct-city-links">
${others}
      </div>
      <p class="ct-all">Somewhere else entirely? <a href="contact.html#efForm">Tell us where you are</a> &mdash; the trainers travel.</p>
    </div>
  </section>

  <!-- ============ BOTTOM BANNER ============ -->
  <section class="courses-cta">
    <h2>Not sure which programme your ${c.city} team needs?</h2>
    <a href="training-needs-survey.html" class="btn-red">Take A QUICK Survey</a>
  </section>

  <!-- ============ FOOTER ============ -->
${ch.footer}

${ch.tail}
  <script src="assets/subscribe.js" defer></script>
  <script src="assets/track.js" defer></script>
</body>

</html>
`;

  return page;
}

/* --------------------------------------------------------------------------
   The page's own CSS, appended to the donor stylesheet.

   Deliberately small and deliberately using the donor's variables and
   spacing, so a city page reads as the same site rather than as a landing
   page somebody bolted on. No new fonts, no new colours, nothing that would
   move Largest Contentful Paint: the hero is text on a flat background and
   the only images below it are lazy-loaded cards.
   -------------------------------------------------------------------------*/
const CITY_CSS = `
    /* ============ CITY LANDING PAGE ============ */

    /* ---- HERO ----
       The flat beige the rest of the site opens on read as dull over a page
       this long, so the hero gets a warm vertical wash plus one soft red
       glow behind the headline. Both are CSS gradients: no extra request,
       nothing for the browser to lay out, no cost to Core Web Vitals. */
    .ct-hero {
      position: relative;
      padding: 44px 0 52px;
      background:
        radial-gradient(760px 420px at 88% -6%, rgba(232, 25, 26, .13), transparent 62%),
        radial-gradient(560px 340px at 4% 8%, rgba(232, 25, 26, .05), transparent 60%),
        linear-gradient(178deg, #f7f4ef 0%, #ede9e3 62%);
      overflow: hidden;
    }
    .ct-hero::after {
      content: "";
      position: absolute; left: 0; right: 0; bottom: 0; height: 1px;
      background: linear-gradient(to right, transparent, rgba(0, 0, 0, .16), transparent);
    }

    .ct-crumb { font-size: 13px; color: #6f6a63; margin-bottom: 26px; }
    .ct-crumb a { color: #6f6a63; text-decoration: underline; text-underline-offset: 2px; }
    .ct-crumb a:hover { color: var(--hti-red); }
    .ct-crumb span { margin: 0 4px; }

    .ct-hero-grid { display: grid; grid-template-columns: 1.22fr .78fr; gap: 42px; align-items: center; }

    .ct-eyebrow {
      display: inline-flex; align-items: center; gap: 9px;
      font-size: 11.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
      color: #b3141a; background: rgba(232, 25, 26, .09);
      border: 1px solid rgba(232, 25, 26, .2); border-radius: 999px;
      padding: 7px 15px 7px 12px; margin-bottom: 20px;
    }
    .ct-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--hti-red); flex: none; }

    .ct-hero h1 { font-size: clamp(33px, 4.6vw, 55px); letter-spacing: -.025em; margin-bottom: 20px; }
    /* the city is the word the whole page turns on, so it is the word that
       gets the brand colour */
    .ct-city-word { color: var(--hti-red); }

    .ct-lead { font-size: clamp(16px, 1.55vw, 18.5px); line-height: 1.63; max-width: 56ch; color: #2b2723; }
    .ct-hero-note { margin-top: 20px; font-size: 14.5px; line-height: 1.6; color: #6b655e; max-width: 54ch; }

    /* Three buttons, one row. Tightened until they fit rather than left to
       wrap: a lone black button on a second line reads as an afterthought,
       which is the opposite of what a phone number should look like here. */
    .ct-actions { display: flex; flex-wrap: wrap; gap: 9px; align-items: center; margin-top: 28px; }
    .ct-btn {
      display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;
      border-radius: 10px; padding: 13px 17px; font-weight: 700; font-size: 15px;
      line-height: 1; border: 2px solid transparent; transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
    }
    .ct-btn svg { width: 17px; height: 17px; flex: none; }
    .ct-btn:hover { transform: translateY(-2px); }
    .ct-btn-quote { background: var(--hti-red); color: #fff; box-shadow: 0 6px 18px rgba(232, 25, 26, .3); }
    .ct-btn-quote:hover { background: #c41515; box-shadow: 0 10px 24px rgba(232, 25, 26, .38); }
    /* WhatsApp's own green - people scan for the colour, not the label */
    .ct-btn-wa { background: #25d366; color: #fff; box-shadow: 0 6px 18px rgba(37, 211, 102, .32); }
    .ct-btn-wa:hover { background: #1eb855; box-shadow: 0 10px 24px rgba(37, 211, 102, .4); }
    /* the phone number carries the ink instead of an outline, so three
       buttons read as three real choices rather than one and two leftovers */
    .ct-btn-tel { background: #17140f; color: #fff; box-shadow: 0 6px 18px rgba(0, 0, 0, .22); }
    .ct-btn-tel:hover { background: #000; box-shadow: 0 10px 24px rgba(0, 0, 0, .3); }

    .ct-hero-media { position: relative; }
    .ct-hero-media img {
      width: 100%; height: 420px; object-fit: cover; border-radius: 20px;
      box-shadow: 0 18px 44px rgba(0, 0, 0, .18);
    }
    /* the red plate behind the photo is the same device the navbar rule and
       the section headings use, just at size */
    .ct-hero-media::before {
      content: ""; position: absolute; inset: 18px -14px -16px 20px;
      background: var(--hti-red); border-radius: 20px; opacity: .13; z-index: -1;
    }
    .ct-hero-tag {
      position: absolute; left: 18px; bottom: 18px;
      background: rgba(255, 255, 255, .95); backdrop-filter: blur(6px);
      border-radius: 12px; padding: 11px 16px; box-shadow: 0 6px 20px rgba(0, 0, 0, .16);
    }
    .ct-hero-tag b { display: block; font-size: 17px; letter-spacing: -.01em; }
    .ct-hero-tag span { display: block; font-size: 12px; color: #6b655e; margin-top: 2px; }

    .ct-stats {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
      margin-top: 46px; padding-top: 34px; border-top: 1px solid rgba(0, 0, 0, .11);
    }
    .ct-stat b { display: block; font-size: clamp(22px, 2.6vw, 31px); letter-spacing: -.02em; color: var(--hti-red); }
    .ct-stat span { display: block; font-size: 13px; color: #6b655e; margin-top: 5px; }

    .ct-band { background: #fff; padding: 46px 0; }
    .ct-band-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
    .ct-band-item h2 { font-size: 19px; margin-bottom: 10px; }
    .ct-band-item p { font-size: 15px; line-height: 1.65; color: #4a4540; }

    .ct-h2 { font-size: clamp(24px, 3.4vw, 34px); letter-spacing: -.015em; margin-bottom: 14px; }
    .ct-sub { font-size: 16px; line-height: 1.6; color: #55504a; max-width: 68ch; margin-bottom: 30px; }

    .ct-progs { padding: 56px 0; }
    .ct-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(238px, 1fr)); gap: 22px; }
    .ct-grid .course-card { background: #fff; border-radius: 16px; overflow: hidden; display: block; box-shadow: 0 2px 14px rgba(0,0,0,.06); transition: transform .2s ease, box-shadow .2s ease; }
    .ct-grid .course-card:hover { transform: translateY(-4px); box-shadow: 0 10px 26px rgba(0,0,0,.11); }
    .ct-grid .course-name { font-weight: 800; font-size: 18px; padding: 15px 16px 6px; }
    .ct-grid .course-desc { font-size: 13.5px; line-height: 1.55; color: #5c5751; padding: 0 16px 18px; }
    .ct-all { margin-top: 26px; font-size: 15px; }
    .ct-all a { color: var(--hti-red); font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }

    .ct-market { background: #fff; padding: 56px 0; }
    .ct-market-inner { max-width: 78ch; }
    .ct-market p { font-size: 17px; line-height: 1.72; color: #2b2723; }
    .ct-reach { margin-top: 20px; padding-left: 18px; border-left: 3px solid var(--hti-red); font-size: 16px !important; color: #4a4540 !important; }

    /* ---- HOW IT RUNS ----
       The one dark band on the page. Five beige-and-white sections in a row
       is what made this read flat; putting the process on near-black breaks
       the run and gives the numbered steps somewhere to sit. */
    .ct-how { padding: 62px 0; background: #17140f; color: #efece7; }
    .ct-how .ct-h2 { color: #fff; }
    .ct-steps { counter-reset: s; list-style: none; display: grid; grid-template-columns: repeat(auto-fit, minmax(238px, 1fr)); gap: 26px; margin-top: 30px; }
    .ct-steps li { counter-increment: s; position: relative; padding-top: 50px; font-size: 15px; line-height: 1.65; color: #b8b2a9; }
    .ct-steps li::before {
      content: counter(s); position: absolute; top: 0; left: 0;
      width: 36px; height: 36px; border-radius: 50%; background: var(--hti-red); color: #fff;
      font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(232, 25, 26, .4);
    }
    .ct-steps b { color: #fff; }

    .ct-faq { background: #fff; padding: 56px 0; }
    .ct-faq-inner { max-width: 78ch; }
    .ct-faq-item { border-bottom: 1px solid #e2ddd6; padding: 4px 0; }
    .ct-faq-item summary { cursor: pointer; list-style: none; padding: 18px 34px 18px 0; font-weight: 700; font-size: 17px; position: relative; }
    .ct-faq-item summary::-webkit-details-marker { display: none; }
    .ct-faq-item summary::after { content: "+"; position: absolute; right: 4px; top: 50%; transform: translateY(-50%); font-size: 24px; font-weight: 400; color: var(--hti-red); line-height: 1; }
    .ct-faq-item[open] summary::after { content: "\\2013"; }
    .ct-faq-item p { padding: 0 0 20px; font-size: 15.5px; line-height: 1.68; color: #4a4540; }

    .ct-cities { padding: 52px 0 58px; }
    .ct-city-links { display: flex; flex-wrap: wrap; gap: 10px; }
    .ct-city-links a { background: #fff; border: 1px solid #ddd7cf; border-radius: 999px; padding: 10px 20px; font-weight: 600; font-size: 15px; transition: all .2s ease; }
    .ct-city-links a:hover { border-color: var(--hti-red); color: var(--hti-red); }

    /* The photo goes below the words rather than beside them, and shortens:
       on a phone a 420px image would push the headline and the buttons off
       the first screen, which is the whole point of the hero. */
    @media (max-width: 980px) {
      .ct-hero-grid { grid-template-columns: 1fr; gap: 34px; }
      .ct-hero-media img { height: 300px; }
      .ct-hero-media::before { inset: 14px -8px -12px 14px; }
      .ct-lead, .ct-hero-note { max-width: none; }
    }

    @media (max-width: 860px) {
      .ct-band-grid { grid-template-columns: 1fr; gap: 26px; }
      .ct-hero { padding: 30px 0 40px; }
      .ct-stats { grid-template-columns: repeat(2, 1fr); gap: 22px 14px; margin-top: 36px; padding-top: 28px; }
      .ct-crumb { margin-bottom: 18px; }
    }

    @media (max-width: 560px) {
      .ct-hero-media img { height: 230px; }
      /* full-width buttons stacked: three side by side wrap into an
         unreadable staircase at this width */
      .ct-actions { flex-direction: column; align-items: stretch; }
      .ct-btn { justify-content: center; padding: 15px 20px; }
    }`;

/* --------------------------------------------------------------------------
   Run
   -------------------------------------------------------------------------*/
function main() {
  const want = process.argv.slice(2);
  const list = want.length ? CITIES.filter(c => want.includes(c.slug)) : CITIES;

  if (want.length && list.length !== want.length) {
    const known = CITIES.map(c => c.slug).join(', ');
    throw new Error(`unknown city. Known slugs: ${known}`);
  }

  const ch = chrome();

  list.forEach((c) => {
    const file = path.join(ROOT, `hospitality-training-${c.slug}.html`);
    /* CRLF throughout, because that is what the rest of the repo uses and a
       lone LF file makes every future bulk edit skip it. */
    const html = build(c, CITIES, ch).replace(/\r?\n/g, '\r\n');
    fs.writeFileSync(file, html, 'utf8');
    console.log(`  ${path.basename(file)}  ${(html.length / 1024).toFixed(1)} KB`);
  });

  console.log(`\n${list.length} city page${list.length === 1 ? '' : 's'} written.`);
}

main();
