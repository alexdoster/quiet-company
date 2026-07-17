'use strict';

const CACHE = 'quiet-company-v15';

// Small, reliable app-shell files only. Video/audio used to be listed
// here too, but eagerly downloading tens of MB during install is exactly
// the kind of bulk fetch Safari on iOS is flaky about completing — if it
// ever fails or times out, cache.addAll() rejects, the whole install
// step fails, and the new SW version never activates at all (silently,
// forever, surviving even a phone reboot, since nothing about a reboot
// fixes a failing network call the SW will just retry and fail again).
// Media now caches lazily on first real use via the fetch handler below,
// same as the yoga soundtrack already worked this way from the start.
const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  // Home-screen card thumbnails — ~500KB total, nowhere near the ~20MB
  // media bulk that used to break installs; the landing grid is the one
  // screen that should never open with broken images.
  './assets/img/card-monk.jpg',
  './assets/img/card-yoga.jpg',
  './assets/img/card-hammock.jpg',
  './assets/img/card-horizon.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error('SW install failed:', err);
        throw err; // still fail install — a broken SW shouldn't activate
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== location.origin) return;

  // Safari requests video with Range headers; a plain cache.match response
  // (200, full body) breaks its player, so ranges get sliced explicitly.
  if (request.headers.has('range')) {
    event.respondWith(rangeResponse(request, event));
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});

async function rangeResponse(request, event) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request.url);

  if (!hit) {
    // Nothing cached yet. Don't make this request wait on a full
    // background download — that's what broke video/audio playback
    // after media stopped being precached (a slow or stalled full
    // fetch could block the very first byte the player asks for).
    // Serve this one straight from the network like a normal request,
    // and warm the cache in the background so later requests are fast.
    // waitUntil keeps the SW alive long enough to finish that fetch
    // even after this response has already gone out.
    event.waitUntil(warmCache(request.url));
    return fetch(request);
  }

  const buffer = await hit.arrayBuffer();
  const total = buffer.byteLength;
  const match = /bytes=(\d+)-(\d*)/.exec(request.headers.get('range'));
  if (!match) return new Response(buffer, { status: 200, headers: baseHeaders(hit) });

  const start = Number(match[1]);
  const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
  if (start >= total) {
    return new Response(null, {
      status: 416,
      headers: { 'Content-Range': `bytes */${total}` },
    });
  }

  const slice = buffer.slice(start, end + 1);
  return new Response(slice, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      ...baseHeaders(hit),
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Content-Length': String(slice.byteLength),
      'Accept-Ranges': 'bytes',
    },
  });
}

// Fire-and-forget: fetch a resource in full and cache it, so the next
// request for it (even a ranged one) can be served from the fast
// already-cached path instead of hitting the network again.
async function warmCache(url) {
  try {
    const cache = await caches.open(CACHE);
    if (await cache.match(url)) return; // another request already warmed it
    const full = await fetch(url);
    if (full.ok) await cache.put(url, full);
  } catch {
    /* offline, or the fetch failed — just means it isn't cached yet */
  }
}

function baseHeaders(response) {
  return {
    'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
  };
}
