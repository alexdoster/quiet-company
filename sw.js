'use strict';

const CACHE = 'quiet-company-v8';

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
    event.respondWith(rangeResponse(request));
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

async function rangeResponse(request) {
  const cache = await caches.open(CACHE);
  let hit = await cache.match(request.url);

  if (!hit) {
    // Nothing cached yet. Media elements often send a Range header even
    // on the very first request (audio soundtracks, not just video) —
    // fetch the full resource once (plain GET, no Range) so it lands in
    // cache for every request after this one, not just this one.
    const full = await fetch(request.url);
    if (!full.ok) return fetch(request);
    cache.put(request.url, full.clone());
    hit = full;
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

function baseHeaders(response) {
  return {
    'Content-Type': response.headers.get('Content-Type') || 'video/mp4',
  };
}
