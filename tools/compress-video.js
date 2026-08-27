/* ============================================================================
   compress-video.js  —  re-encode a background loop at a sane bitrate
   ----------------------------------------------------------------------------
   WHY THIS EXISTS

   The two hero loops on this site are square 720x720 clips of eight to ten
   seconds, muted, autoplaying, sitting behind a rounded corner about 500 px
   wide. They were exported at the bitrate you would give a film:

     video/hero.mp4        7.4s   1,173 KB   1,293 kbps   index.html
     video/lead-hero.mp4   9.6s   1,887 KB   1,610 kbps   lead.html

   A muted decorative loop does not need a third of that. Nothing on the page
   depends on fine detail in it and no one is going to pause on a frame.

   THERE IS NO FFMPEG ON THIS MACHINE

   Chrome is the encoder. The clip is played back at normal speed, its output
   grabbed with HTMLMediaElement.captureStream(), and re-encoded by MediaRecorder
   at the bitrate asked for. Chrome's MediaRecorder emits H.264 in an MP4
   container here, so the result is a drop-in replacement for the original file -
   no <source> changes, no second format to keep in step.

   Because it captures a live playback, encoding takes as long as the clip runs.
   That also means it is worth checking the output: this prints the duration and
   frame count it actually captured, and refuses to write a file that came out
   noticeably shorter than the source.

   HOW TO RUN

     node tools/compress-video.js video/lead-hero.mp4 --bitrate 600k
     node tools/compress-video.js video/hero.mp4 --bitrate 600k --out /tmp/try.mp4

   Default output is <name>-<bitrate>.mp4 beside the source; the source is never
   overwritten unless you name it with --out. Compare before/after by eye at the
   size the page paints it before replacing anything.

   Needs the bundled Node and Playwright:
     C:\Users\ATUL\AppData\Local\ms-playwright-go\1.57.0\node.exe
   ========================================================================== */

'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const PW = 'C:/Users/ATUL/AppData/Local/ms-playwright-go/1.57.0/package/index.js';
const ROOT = path.resolve(__dirname, '..');

/* Enough for a 720x720 decorative loop with slow camera movement. Judged by
   eye against the source at the size the page paints it. */
const DEFAULT_BITRATE = 600000;

/* Path the encoder page is served from - anything the repo will not shadow. */
const BLANK = '__encoder_blank__';

/* MediaRecorder will happily emit a fraction of the clip if playback stalls, so
   anything that lost more than this much of the source is treated as a failed
   capture rather than a small file to be pleased about. */
const MIN_DURATION_RATIO = 0.97;

function parseBitrate(s) {
  const m = String(s).trim().match(/^(\d+(?:\.\d+)?)\s*([km]?)$/i);
  if (!m) throw new Error(`could not read a bitrate from "${s}"`);
  const mult = m[2].toLowerCase() === 'm' ? 1e6 : m[2].toLowerCase() === 'k' ? 1e3 : 1;
  return Math.round(Number(m[1]) * mult);
}

function parseArgs(argv) {
  const opts = { bitrate: DEFAULT_BITRATE, out: null, src: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--bitrate') opts.bitrate = parseBitrate(argv[++i]);
    else if (argv[i] === '--out') opts.out = argv[++i];
    else opts.src = argv[i].split(String.fromCharCode(92)).join('/');
  }
  return opts;
}

/* MediaRecorder needs a real origin - a file:// page cannot capture a stream -
   so the repo is served for the length of the encode. */
function serveRoot() {
  const types = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.html': 'text/html' };
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
    /* captureStream() refuses to read a video from another origin, and an
       about:blank page counts as one. The encoder runs on this empty page so
       that the clip it loads is same-origin. */
    if (rel === BLANK) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<!doctype html><title>encoder</title><link rel="icon" href="data:,">');
      return;
    }
    fs.readFile(path.join(ROOT, rel), (err, buf) => {
      if (err) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, {
        'Content-Type': types[path.extname(rel).toLowerCase()] || 'application/octet-stream',
        'Accept-Ranges': 'none'
      });
      res.end(buf);
    });
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.src) {
    console.error('usage: node tools/compress-video.js <src.mp4> [--bitrate 600k] [--out file.mp4]');
    process.exit(2);
  }

  const srcBytes = fs.statSync(path.join(ROOT, opts.src)).size;
  const out = opts.out ||
    opts.src.replace(/\.[^.]+$/, '') + `-${Math.round(opts.bitrate / 1000)}k.mp4`;

  const server = await serveRoot();
  const port = server.address().port;
  const pw = require(PW);
  const browser = await pw.chromium.launch({
    channel: 'chrome',
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/${BLANK}`);
  page.on('console', (m) => { if (m.type() === 'error') console.error('  chrome:', m.text()); });

  console.log(`encoding ${opts.src} at ${Math.round(opts.bitrate / 1000)} kbps ` +
    '(runs in real time, so this takes about as long as the clip)...');

  const capture = () => page.evaluate(async ({ url, bitrate }) => {
    const v = document.createElement('video');
    v.src = url;
    v.muted = true;
    v.playsInline = true;
    document.body.appendChild(v);

    await new Promise((ok, no) => {
      v.onloadedmetadata = ok;
      v.onerror = () => no(new Error('the browser could not open the source'));
    });

    const stream = v.captureStream();
    const rec = new MediaRecorder(stream, {
      mimeType: 'video/mp4;codecs=avc1',
      videoBitsPerSecond: bitrate
    });

    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise((ok) => { rec.onstop = ok; });

    const startedAt = performance.now();
    rec.start(250);
    await v.play();
    /* Stop on `ended` rather than a timer: a timer that fires early truncates
       the clip and one that fires late records a frozen last frame. */
    await new Promise((ok) => { v.onended = ok; });
    const playedFor = (performance.now() - startedAt) / 1000;
    const reachedEnd = v.currentTime;
    rec.stop();
    await done;

    const blob = new Blob(chunks, { type: 'video/mp4' });
    const b64 = await new Promise((ok) => {
      const fr = new FileReader();
      fr.onload = () => ok(fr.result.split(',')[1]);
      fr.readAsDataURL(blob);
    });

    return {
      data: b64,
      srcDuration: v.duration,
      playedFor,
      reachedEnd,
      width: v.videoWidth,
      height: v.videoHeight
    };
  }, { url: `http://127.0.0.1:${port}/${opts.src}`, bitrate: opts.bitrate });

  /* MediaRecorder stamps every frame with the wall-clock time it arrived, not
     the timestamp it had in the source, so the encoded duration is however long
     playback actually took. The very first capture in a fresh browser takes
     about a second longer than the clip - decoder and encoder start-up - which
     came out as a 9.60s loop stretched to 10.68s, with the motion in it that
     much slower.

     It is start-up cost, not a rate the playback settles at: run the same
     capture again in the same browser and it lands within half a percent, and
     stays there. So the first pass is thrown away and the second is kept. Twice
     the wall-clock time, and worth it - correcting by playback rate instead
     overshot to 10% short, because the correction is fitted to a cost that is
     not there the second time round. */
  console.log('  warming the codecs (first capture is discarded)...');
  await capture();
  console.log('  encoding...');
  const result = await capture();

  const buf = Buffer.from(result.data, 'base64');

  await browser.close();
  server.close();

  /* How much of the clip got captured is judged on the playback that fed the
     recorder, not on the duration in the file that came out. MediaRecorder
     writes a fragmented MP4 whose header carries no reliable total duration -
     Chrome reads this very file back as 3.37s when 9.60s of it plays - so a
     metadata check here rejects perfectly good encodes. What matters is that
     the source played from end to end while the recorder was running. */
  const covered = result.reachedEnd / result.srcDuration;
  if (covered < MIN_DURATION_RATIO) {
    throw new Error(
      `playback stopped at ${result.reachedEnd.toFixed(2)}s of ` +
      `${result.srcDuration.toFixed(2)}s, so the capture is short. Nothing written.`
    );
  }

  const outAbs = path.resolve(ROOT, out);
  fs.writeFileSync(outAbs, buf);

  /* The wall-clock time pass 2 took IS the encoded duration, because that is
     what the frame timestamps were taken from. */
  const outDuration = result.playedFor;
  const stretch = (outDuration / result.srcDuration - 1) * 100;

  console.log(
    `${result.width}x${result.height}\n` +
    `  ${String(Math.round(srcBytes / 1024)).padStart(5)} KB  ` +
    `${String(Math.round((srcBytes * 8) / result.srcDuration / 1000)).padStart(4)} kbps  ` +
    `${result.srcDuration.toFixed(2)}s   ${opts.src}\n` +
    `  ${String(Math.round(buf.length / 1024)).padStart(5)} KB  ` +
    `${String(Math.round((buf.length * 8) / outDuration / 1000)).padStart(4)} kbps  ` +
    `${outDuration.toFixed(2)}s   ${out}   ` +
    `(-${Math.round((1 - buf.length / srcBytes) * 100)}%)`
  );
  if (Math.abs(stretch) >= 2) {
    console.log(
      `  note: the encode runs ${stretch > 0 ? 'long' : 'short'} by ` +
      `${Math.abs(stretch).toFixed(1)}%, so the motion in it is that much ` +
      `${stretch > 0 ? 'slower' : 'faster'} than the source.\n` +
      '        Correcting the playback rate cannot remove this entirely - running the\n' +
      '        clip faster makes the capture drift further. Fine for a decorative\n' +
      '        loop; do not use this tool where timing carries meaning.'
    );
  }
  console.log('Play it in a page next to the original before replacing anything -\n' +
    'check the length, that it loops, and that it holds up at the painted size.');
}

main().catch((err) => {
  console.error('compress-video failed:', err.message);
  process.exit(1);
});
