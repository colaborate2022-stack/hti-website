/* ============================================================================
   Service worker for the HTI Food Cost app (fcc-app.html) ONLY.

   SCOPE GUARD — read this before changing anything below.

   This worker is registered from fcc-app.html and from nowhere else, but its
   registration scope is the whole origin, so every request on hti-india.com
   passes through the fetch handler. It must therefore stay deliberately deaf:
   anything that is not on ALLOW below is returned to the browser untouched by
   falling out of the handler WITHOUT calling event.respondWith(). A request we
   never respond to is a request the browser fetches itself, exactly as if no
   service worker existed. No caching, no rewriting, no interception.

   That means index.html, contact.html, restaurant-cost-calculator.html and
   every other page on the site are always served fresh from the network.

   Do not add wildcards, extension matching, or a catch-all cache here.
   ========================================================================== */

var CACHE_VERSION = 'v1';
var CACHE_NAME = 'hti-fcc-app-' + CACHE_VERSION;

var SCOPE = new URL(self.registration.scope);
function scoped(rel) { return new URL(rel, SCOPE).pathname; }

/* The app shell itself. Network-first, so a redeploy always wins. */
var APP_PATH = scoped('fcc-app.html');

/* The complete same-origin allow-list. Nothing else is ever touched. */
var ALLOW = [
  APP_PATH,
  scoped('manifest.webmanifest'),
  scoped('images/app/icon-192.png'),
  scoped('images/app/icon-512.png'),
  scoped('images/app/icon-512-maskable.png')
];

/* The one permitted cross-origin URL: the Google Fonts stylesheet the app
   links. The font files it in turn references (fonts.gstatic.com) are NOT on
   the list and pass straight through to the network. */
var FONT_CSS = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap';

function isAllowed(url) {
  if (url.origin === self.location.origin) {
    return ALLOW.indexOf(url.pathname) !== -1;
  }
  return url.href === FONT_CSS;
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      /* one at a time, so a single miss cannot fail the whole install */
      return Promise.all(ALLOW.map(function (path) {
        return cache.add(new Request(path, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (n) {
        return n === CACHE_NAME ? null : caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;

  /* never touch anything but plain GETs */
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  /* belt and braces: the only page navigation this worker may answer is the
     app itself. Every other page on the domain goes to the network. */
  if (req.mode === 'navigate' && url.pathname !== APP_PATH) return;

  if (!isAllowed(url)) return;   /* <- untouched, handled by the browser */

  /* --- app shell: network first, cache as the offline fallback --- */
  if (url.pathname === APP_PATH && url.origin === self.location.origin) {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match(APP_PATH);
        });
      })
    );
    return;
  }

  /* --- manifest, icons, font stylesheet: cache first --- */
  event.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && (res.ok || res.type === 'opaque')) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});
