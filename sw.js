'use strict';

const CACHE = 'quiet-company-v4';

const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './assets/video/monk-temple-breathing-v1.mp4',
  './assets/video/yoga-studio-breathing-v1.mp4',
  './assets/video/hammock-sleep-v1.mp4',
  './assets/video/horizon-gaze-v1.mp4',
  './assets/audio/temple-bowl.mp3',
  './assets/audio/horizon-waves.mp3',
  './assets/audio/hammock-cicadas.mp3',
  './assets/audio/hammock-campfire.mp3',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
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
  const hit = await cache.match(request.url);
  if (!hit) return fetch(request);

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
