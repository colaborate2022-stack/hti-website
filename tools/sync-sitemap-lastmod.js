/* ============================================================================
   sync-sitemap-lastmod.js  —  make <lastmod> tell the truth
   ----------------------------------------------------------------------------
   WHY THIS EXISTS

   Every <lastmod> in sitemap.xml was typed by hand on the day the URL was
   added, and then left. On 2026-09-08 six pages picked up a new block of
   internal links and all six still claimed they had not changed since
   2026-08-27.

   That is not cosmetic. lastmod is one of the few signals Google uses to
   decide whether a URL it already knows is worth fetching again. A page that
   has genuinely changed but swears it has not is a page that gets recrawled
   late - and here those six were exactly the pages carrying the new links to
   the ten city pages, so the stale dates were slowing down the discovery of
   the very thing they were added for.

   Hand-maintained dates will drift again the next time somebody edits a page
   and forgets. So this does not fix the six: it derives every date in the
   file from git, which already knows when each page last actually changed.

   Run it after committing, because it reads committed history:

     node tools/sync-sitemap-lastmod.js          # rewrite the dates
     node tools/sync-sitemap-lastmod.js --check  # report, change nothing

   A note on the other two tags: <changefreq> and <priority> are in this file
   and Google has publicly ignored both for years. They are left alone rather
   than stripped - they cost nothing, other crawlers still read them, and
   churning 82 entries to remove dead weight is not worth the diff.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const FILE = path.join(ROOT, 'sitemap.xml');
const SITE = 'https://www.hti-india.com/';

/* git's %cs is the committer date as plain YYYY-MM-DD, which is exactly the
   shape the sitemap spec wants - no timezone maths, no formatting. */
function lastCommitDate(rel) {
  const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', rel], {
    cwd: ROOT, encoding: 'utf8'
  }).trim();
  return out || null;
}

function main() {
  const check = process.argv.includes('--check');
  let xml = fs.readFileSync(FILE, 'utf8');

  let changed = 0, missing = 0, untracked = 0;

  xml = xml.replace(/<url>[\s\S]*?<\/url>/g, (block) => {
    const loc = (block.match(/<loc>([^<]*)<\/loc>/) || [])[1];
    if (!loc) return block;

    const rel = loc.replace(SITE, '') || 'index.html';
    if (!fs.existsSync(path.join(ROOT, rel))) {
      console.log(`  ${rel} - no such file, left alone`);
      missing++;
      return block;
    }

    const date = lastCommitDate(rel);
    if (!date) {
      console.log(`  ${rel} - not committed yet, left alone`);
      untracked++;
      return block;
    }

    const current = (block.match(/<lastmod>([^<]*)<\/lastmod>/) || [])[1];
    if (current === date) return block;

    console.log(`  ${rel.padEnd(48)} ${current || '(none)'} -> ${date}`);
    changed++;

    /* only ever rewrite an existing tag; a <url> with no <lastmod> is left
       as it is rather than guessed at */
    return block.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${date}</lastmod>`);
  });

  console.log(`\n${changed} date${changed === 1 ? '' : 's'} ${check ? 'out of date' : 'corrected'}` +
    (missing ? `, ${missing} missing file(s)` : '') +
    (untracked ? `, ${untracked} uncommitted` : ''));

  if (check || !changed) return;

  if (/(?<!\r)\n/.test(xml)) throw new Error('bare LF introduced');
  fs.writeFileSync(FILE, xml, 'utf8');
}

main();
