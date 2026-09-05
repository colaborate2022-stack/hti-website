/* Put assets/track.js on every page that already loads GA4.

   Placed next to the existing deferred scripts at the end of <body>, so it
   costs one cached request and never blocks rendering. Pages without GA4 are
   left alone - the script would do nothing there but still be fetched.

   Safe to re-run: a page that already has the tag is skipped.

   Run: node tools/add-click-tracking.js */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TAG = '<script src="assets/track.js" defer></script>';

const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

let added = 0, already = 0, noGa = 0, unplaceable = [];

for (const page of pages) {
  const file = path.join(ROOT, page);
  const src = fs.readFileSync(file, 'utf8');

  if (src.indexOf('assets/track.js') !== -1) { already++; continue; }
  if (src.indexOf('G-SBKJQQRP0N') === -1) { noGa++; continue; }

  /* Sit beside whichever deferred script the page already ends with, and fall
     back to </body> for the few pages that load neither. */
  const anchors = [
    '<script src="assets/subscribe.js" defer></script>',
    '<script src="assets/motion.js" defer></script>'
  ];
  const anchor = anchors.find(a => src.indexOf(a) !== -1);

  let out;
  if (anchor) {
    out = src.replace(anchor, anchor + '\r\n  ' + TAG);
  } else if (src.indexOf('</body>') !== -1) {
    out = src.replace('</body>', '  ' + TAG + '\r\n</body>');
  } else {
    unplaceable.push(page);
    continue;
  }

  fs.writeFileSync(file, out);
  added++;
}

console.log('tagged: ' + added);
console.log('already tagged: ' + already);
console.log('skipped, no GA4: ' + noGa);
if (unplaceable.length) console.log('NO PLACE FOUND: ' + unplaceable.join(', '));
