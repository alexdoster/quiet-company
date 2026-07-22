'use strict';

/* ---------- Config ---------- */

// Bump alongside CACHE in sw.js on every deploy — this is the only
// user-visible confirmation that a phone has picked up the latest build
// (shown small, bottom-right, home screen only).
const APP_VERSION = 23;

// Scene labels are provisional placeholders — Alex finalizes the names.
const SCENES = [
  { id: 'monk', label: 'Temple', src: 'assets/video/monk-temple-breathing-v1.mp4', card: 'assets/img/card-monk.jpg' },
  { id: 'yoga', label: 'Studio', src: 'assets/video/yoga-studio-breathing-v1.mp4', card: 'assets/img/card-yoga.jpg' },
  { id: 'elf', label: 'Forest', src: 'assets/video/elf-forest-breathing-v1.mp4', card: 'assets/img/card-elf.jpg' },
  { id: 'hearth', label: 'Hearth', src: 'assets/video/hearth-fire-v1.mp4', card: 'assets/img/card-hearth.jpg' },
  // objectPosition 'center top' keeps a high-in-frame head/subject from
  // being clipped when object-fit: cover crops top+bottom on a landscape
  // viewport wider than the 16:9 clip — all the vertical crop goes to the
  // bottom (lap/ground) instead. No effect in portrait (crop goes sideways).
  { id: 'leopard', label: 'Leopard', src: 'assets/video/leopard-royalty-breathing-v1.mp4', card: 'assets/img/card-leopard.jpg', objectPosition: 'center top' },
  { id: 'photoreal', label: 'Sunlight', src: 'assets/video/photoreal-woman-breathing-v1.mp4', card: 'assets/img/card-photoreal.jpg', objectPosition: 'center top' },
  { id: 'rooftop', label: 'Rooftop', src: 'assets/video/rooftop-city-breathing-v1.mp4', card: 'assets/img/card-rooftop.jpg' },
  // On loan from Portals-App for desk-companion testing + live Portals demo — pinned to bottom
  { id: 'hammock', label: 'Hammock', src: 'assets/video/hammock-sleep-v1.mp4', card: 'assets/img/card-hammock.jpg' },
  { id: 'horizon', label: 'Horizon', src: 'assets/video/horizon-gaze-v1.mp4', card: 'assets/img/card-horizon.jpg' },
];

// Portals-App gag prototype (button-triggered, running sessions only): the
// gag clip crossfades in over the scene's loop, plays once, and fades back
// out to its outro scene — the loop keeps running underneath the whole time.
// On loan like the Hammock/Horizon scenes themselves; may be removed.
const GAGS = {
  hammock: { src: 'assets/video/monkey-briefcase-gag-v1.mp4', outro: 'hammock' },
};

// Secondary breathing loops per scene. During a running session, at each
// elapsed-minute boundary, a scene with variants crossfades one in over
// its default loop, holds it ~2 breath cycles, then crossfades back to
// the default. Doubles as a subtle "you've hit a minute" marker for
// anyone tracking time; invisible to anyone dropped in deep. Scenes with
// no entry here (yoga, hearth, leopard) simply never pop in — accepted
// gap for now, may rerun those stills to give them variants later.
const VARIANTS = {
  monk: [
    'assets/video/monk-temple-breathing-v2.mp4',
    'assets/video/monk-temple-breathing-v3.mp4',
  ],
  elf: ['assets/video/elf-forest-breathing-v2.mp4'],
  photoreal: ['assets/video/photoreal-woman-breathing-v2.mp4'],
  rooftop: ['assets/video/rooftop-city-breathing-v2.mp4'],
};
const MARKER_INTERVAL_MS = 60000; // one pop-in per elapsed minute of session time
const VARIANT_HOLD_MS = 10000; // ~2 breath loops on the variant before returning
const VARIANT_FADE_MS = 2000; // must match the .variant-video CSS crossfade

// Ambient beds per scene, played only during a session (not while browsing).
// Real recordings, not born-loopable — AmbienceEngine crossfades overlapping
// copies at playback time rather than needing the files hand-edited.
// See assets/audio/CREDITS.md for sourcing (all CC0, BigSoundBank).
const AMBIENCE = {
  monk: {
    label: 'Temple bowl',
    hum: true, // synthesized wordless drone, layered under the bowl
    layers: [{ src: 'assets/audio/temple-bowl.mp3', gain: 0.5, crossfade: 3 }],
  },
  hammock: {
    label: 'Cicadas & campfire',
    layers: [
      { src: 'assets/audio/hammock-cicadas.mp3', gain: 0.4, crossfade: 2.5 },
      { src: 'assets/audio/hammock-campfire.mp3', gain: 0.3, crossfade: 2.5 },
    ],
  },
  horizon: {
    label: 'Ocean waves',
    layers: [{ src: 'assets/audio/horizon-waves.mp3', gain: 0.55, crossfade: 2.5 }],
  },
};

// Optional full-track soundtrack, offered on every scene (was yoga-only
// until v13). Unlike AMBIENCE above (texture, crossfade-looped), these
// are real compositions with musical structure — played as whole tracks,
// not loop-scheduled.
// Royalty-free (CC BY 4.0, Scott Buckley — attribution required, see
// assets/audio/CREDITS.md), picked as mood-equivalents for the named
// copyrighted artists Alex referenced, not copies of them; those can't
// legally be embedded in a public repo. Two tracks per mood so there's
// a real choice, not just one pick per category. File names keep their
// original yoga- prefix from when this was scoped to that scene.
const MUSIC = [
  {
    id: 'restorative',
    label: 'Restorative',
    tracks: [
      { label: 'Penumbra', src: 'assets/audio/yoga-restorative-penumbra.mp3' },
      { label: 'Meanwhile', src: 'assets/audio/yoga-restorative-meanwhile.mp3' },
    ],
  },
  {
    id: 'flow',
    label: 'Flow',
    tracks: [
      { label: 'Amberlight', src: 'assets/audio/yoga-flow-amberlight.mp3' },
      { label: 'Echoes Of Home', src: 'assets/audio/yoga-flow-echoes-of-home.mp3' },
    ],
  },
  {
    id: 'vinyasa',
    label: 'Vinyasa',
    tracks: [
      { label: 'Born Of The Sky', src: 'assets/audio/yoga-vinyasa-born-of-the-sky.mp3' },
      { label: 'Convergence', src: 'assets/audio/yoga-vinyasa-convergence.mp3' },
    ],
  },
];
const MUSIC_VOLUME = 0.55;

const CUSTOM_DEFAULT = 20;
const CUSTOM_MIN = 1;
const CUSTOM_MAX = 120;
const REST_DELAY = 4000; // ms of stillness before the UI fades during a session
const SWIPE_MIN = 48; // px of horizontal travel that counts as a swipe

// Interval bells ring on their own pitch, between the start chime's G4 and
// the completion C5, so a marker never reads as the session ending.
const BELL_FREQ = 440;
// Don't ring an interval bell this close to completion — it would collide
// with the end chime instead of marking anything.
const BELL_END_GUARD_MS = 5000;

/* ---------- Elements ---------- */

const $ = (sel) => document.querySelector(sel);

const ui = $('#ui');
const stage = $('#stage');
const dotsEl = $('#dots');
const sceneNameEl = $('#scene-name');
const panels = {
  browse: $('#browse'),
  setup: $('#setup'),
  session: $('#session'),
  complete: $('#complete'),
};
const durationGroup = $('#durations');
const customRow = $('#custom-row');
const customValue = $('#custom-value');
const countdownEl = $('#countdown');
const pauseBtn = $('#pause');
const muteBtn = $('#mute');
const gagBtn = $('#gag');
const cardGridEl = $('#card-grid');
const toHomeBtn = $('#to-home');
const musicCreditEl = $('.music-credit');

// Sound controls exist twice — inline on the setup screen and inside the
// in-session sound sheet — so they're addressed as pairs and kept in sync
// by renderSound() rather than duplicating any state.
const ambienceFields = [$('#ambience-field'), $('#s-ambience-field')];
const ambienceSelects = [$('#ambience-select'), $('#s-ambience-select')];
const musicSelects = [$('#music-select'), $('#s-music-select')];

const sheetBackdrop = $('#sheet-backdrop');
const settingsSheet = $('#settings-sheet');
const soundSheet = $('#sound-sheet');
const countdownSelect = $('#countdown-select');
const countdownNoteEl = $('#countdown-note');
const bellsSelect = $('#bells-select');
const prepSelect = $('#prep-select');

/* ---------- Persistence ---------- */

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem('qc.' + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('qc.' + key, JSON.stringify(value));
    } catch {
      /* private mode etc. — session still works without persistence */
    }
  },
};

/* ---------- UI state ---------- */

let uiState = 'home'; // home | browse | setup | running | paused | complete

function setUIState(state) {
  uiState = state;
  ui.className = 'state-' + state;
  document.body.classList.toggle('at-home', state === 'home');
  if (state === 'home') pauseAllVideos();
  panels.browse.classList.toggle('visible', state === 'browse');
  panels.setup.classList.toggle('visible', state === 'setup');
  panels.session.classList.toggle(
    'visible',
    state === 'running' || state === 'paused'
  );
  panels.complete.classList.toggle('visible', state === 'complete');
  if (state !== 'running') {
    cancelGag();
    cancelVariant();
  }
  renderGagButton();
  scheduleRest();
}

/* ---------- Scene carousel ---------- */

const videos = new Map();
let sceneIndex = Math.max(
  0,
  SCENES.findIndex((s) => s.id === store.get('scene', SCENES[0].id))
);

for (const scene of SCENES) {
  // Elements are created up front; video src is attached lazily so a
  // growing roster doesn't front-load every file on open.
  const video = document.createElement('video');
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.setAttribute('playsinline', '');
  video.preload = 'auto';
  video.className = 'scene-video';
  if (scene.objectPosition) video.style.objectPosition = scene.objectPosition;
  video.addEventListener('error', () => video.classList.add('missing'));
  stage.appendChild(video);
  videos.set(scene.id, video);

  const dot = document.createElement('button');
  dot.className = 'dot';
  dot.setAttribute('role', 'tab');
  dot.setAttribute('aria-label', scene.label);
  dot.addEventListener('click', () =>
    setScene(SCENES.indexOf(scene), { animateName: true })
  );
  dotsEl.appendChild(dot);

  // Home-screen card: a still-image thumbnail, so the landing page costs
  // a few hundred KB of images total — video only loads for a tapped card.
  const card = document.createElement('button');
  card.className = 'card';
  const img = document.createElement('img');
  img.src = scene.card;
  img.alt = '';
  img.loading = 'lazy';
  const name = document.createElement('span');
  name.className = 'card-name';
  name.textContent = scene.label;
  card.append(img, name);
  card.addEventListener('click', () => {
    setScene(SCENES.indexOf(scene));
    setUIState('browse');
  });
  cardGridEl.appendChild(card);
}

function pauseAllVideos() {
  for (const video of videos.values()) video.pause();
}

function ensureVideoLoaded(index) {
  const scene = SCENES[(index + SCENES.length) % SCENES.length];
  const video = videos.get(scene.id);
  if (!video.dataset.loaded) {
    video.src = scene.src;
    video.dataset.loaded = '1';
  }
}

function setScene(index, { animateName = false } = {}) {
  sceneIndex = (index + SCENES.length) % SCENES.length;
  const scene = SCENES[sceneIndex];
  store.set('scene', scene.id);
  cancelGag();
  cancelVariant();
  renderGagButton();

  // Active scene plus both neighbors, so a swipe lands on a warm video
  ensureVideoLoaded(sceneIndex);
  ensureVideoLoaded(sceneIndex + 1);
  ensureVideoLoaded(sceneIndex - 1);

  for (const [sceneId, video] of videos) {
    const on = sceneId === scene.id;
    video.classList.toggle('active', on);
    if (on) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }

  Array.from(dotsEl.children).forEach((dot, i) => {
    dot.classList.toggle('selected', i === sceneIndex);
    dot.setAttribute('aria-selected', String(i === sceneIndex));
  });

  if (animateName) {
    sceneNameEl.classList.add('out');
    setTimeout(() => {
      sceneNameEl.textContent = scene.label;
      sceneNameEl.classList.remove('out');
    }, 250);
  } else {
    sceneNameEl.textContent = scene.label;
  }
}

function changeScene(step) {
  setScene(sceneIndex + step, { animateName: true });
}

function playActiveVideo() {
  videos.get(SCENES[sceneIndex].id)?.play().catch(() => {});
}

/* ---------- Gag playback (Portals-App prototype) ----------
   The scene's loop is never paused — the gag rides on top as one more
   .scene-video element, so the existing 1.2s opacity crossfade handles
   both the fade-in and the fade-back-out for free. */

let gagVideo = null;
let gagPlaying = false;

function ensureGagVideo() {
  if (gagVideo) return;
  gagVideo = document.createElement('video');
  gagVideo.muted = true;
  gagVideo.playsInline = true;
  gagVideo.setAttribute('playsinline', '');
  gagVideo.preload = 'auto';
  gagVideo.className = 'scene-video'; // appended last, so it sits on top
  gagVideo.addEventListener('ended', endGag);
  gagVideo.addEventListener('error', cancelGag);
  stage.appendChild(gagVideo);
}

// Show the button only where a gag exists; warm the clip so the press
// doesn't open on a still-buffering black frame.
function renderGagButton() {
  const gag = uiState === 'running' && !gagPlaying && GAGS[SCENES[sceneIndex].id];
  gagBtn.classList.toggle('hidden', !gag);
  if (gag) {
    ensureGagVideo();
    if (gagVideo.src !== new URL(gag.src, location.href).href) {
      gagVideo.src = gag.src;
    }
  }
}

function playGag() {
  const gag = GAGS[SCENES[sceneIndex].id];
  if (!gag || gagPlaying) return;
  gagPlaying = true;
  renderGagButton();
  ensureGagVideo();
  gagVideo.currentTime = 0;
  gagVideo.play().catch(cancelGag);
  gagVideo.classList.add('active');
}

// Natural end: fade out to the gag's designated outro scene (which may be
// the scene it interrupted — for the monkey, the sleeper never woke).
function endGag() {
  const gag = GAGS[SCENES[sceneIndex].id];
  gagPlaying = false;
  gagVideo.classList.remove('active');
  const outroIndex = gag ? SCENES.findIndex((s) => s.id === gag.outro) : -1;
  if (outroIndex >= 0 && outroIndex !== sceneIndex) {
    setScene(outroIndex, { animateName: true });
  }
  renderGagButton();
}

// Interruption (scene swipe, leaving browse, playback error): just drop
// the overlay, no outro logic.
function cancelGag() {
  if (!gagVideo) return;
  gagPlaying = false;
  gagVideo.classList.remove('active');
  gagVideo.pause();
}

/* ---------- Variant pop-in (minute marker) ----------
   Same overlay trick as the gag: the default loop is never paused — the
   variant rides on top as one more .scene-video and crossfades in/out,
   so the default is always the home base returned to. The variant loops
   for its hold rather than playing once, and a timer (not an 'ended'
   event) triggers the return; no outro scene change. Uses a 2s crossfade
   (.variant-video) rather than the gag's 1.2s, for a gentler in-session
   transition. */

let variantVideo = null;
let variantActive = false;
let variantHoldTimer = null;
let variantFadeTimer = null;

function ensureVariantVideo() {
  if (variantVideo) return;
  variantVideo = document.createElement('video');
  variantVideo.muted = true;
  variantVideo.loop = true;
  variantVideo.playsInline = true;
  variantVideo.setAttribute('playsinline', '');
  variantVideo.preload = 'auto';
  variantVideo.className = 'scene-video variant-video'; // appended last, sits on top
  variantVideo.addEventListener('error', cancelVariant);
  stage.appendChild(variantVideo);
}

function fireVariant() {
  const pool = VARIANTS[SCENES[sceneIndex].id];
  if (!pool || !pool.length || variantActive || gagPlaying) return;
  clearTimeout(variantFadeTimer);
  ensureVariantVideo();
  variantActive = true;
  variantVideo.style.objectPosition = SCENES[sceneIndex].objectPosition || '';
  variantVideo.src = pool[Math.floor(Math.random() * pool.length)];
  variantVideo.currentTime = 0;
  // Start the crossfade only once playback has actually begun, so a
  // cold-cache first play can't fade in on a black/unbuffered frame
  // (the v8 buffering-black-frame class of bug). If it was cancelled
  // while buffering (scene left, session ended), don't reveal a stale one.
  variantVideo.play().then(
    () => {
      if (!variantActive) return;
      variantVideo.classList.add('active');
      variantHoldTimer = setTimeout(endVariant, VARIANT_HOLD_MS);
    },
    cancelVariant
  );
}

// Natural return: crossfade back to the base default (which never stopped
// looping underneath), then pause the overlay once the fade completes so
// two videos aren't left decoding.
function endVariant() {
  if (!variantActive) return;
  clearTimeout(variantHoldTimer);
  variantVideo.classList.remove('active');
  variantFadeTimer = setTimeout(() => {
    variantVideo.pause();
    variantActive = false;
  }, VARIANT_FADE_MS);
}

// Hard cancel (any exit from running, scene change): drop it now.
function cancelVariant() {
  if (!variantVideo) return;
  clearTimeout(variantHoldTimer);
  clearTimeout(variantFadeTimer);
  variantVideo.classList.remove('active');
  variantVideo.pause();
  variantActive = false;
}

/* Swipe to browse (browse state only) */

let swipeStart = null;

window.addEventListener('pointerdown', (event) => {
  // The gag trigger deliberately doesn't wake the resting UI — the scene
  // should stay uncluttered while the interruption plays out.
  if (!event.target.closest('.gag-btn')) wake();
  if (uiState === 'browse' && !openSheet && !event.target.closest('button')) {
    swipeStart = { x: event.clientX, y: event.clientY };
  }
});

window.addEventListener('pointerup', (event) => {
  if (!swipeStart) return;
  const dx = event.clientX - swipeStart.x;
  const dy = event.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) {
    if (uiState === 'browse') changeScene(dx < 0 ? 1 : -1);
  }
});

window.addEventListener('keydown', (event) => {
  const step =
    event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
  if (!step) return;
  if (uiState === 'browse') changeScene(step);
});

$('#nav-prev').addEventListener('click', () => changeScene(-1));
$('#nav-next').addEventListener('click', () => changeScene(1));

/* ---------- Timer ----------
   Two session shapes share one object: a fixed session counts endAt
   down, an open-ended one counts up from startAt with no end at all.
   elapsedMs is derived either way, so minute markers and interval bells
   read from a single source rather than each deriving their own. Both
   shapes are timestamp-based, so backgrounding or locking the phone
   can't drift them. An optional settle window (Settings) runs on its own
   countdown first, before either shape starts. */

const timer = {
  durationMs: 0, // 0 for an open-ended session
  remainingMs: 0,
  elapsedMs: 0,
  endAt: 0, // fixed sessions
  startAt: 0, // open-ended sessions; shifted forward on resume
  openEnded: false,
  prepEndAt: 0, // settle window in progress; 0 once the session proper runs
};
let prepRemainingMs = 0; // held across a pause taken during the settle window

setInterval(() => {
  if (uiState !== 'running') return;

  // Settle window: nothing of the session has started yet — no chime, no
  // ambience, no markers — the scene is just there to sit down in front of.
  if (timer.prepEndAt) {
    const left = timer.prepEndAt - Date.now();
    if (left > 0) {
      renderPrep(left);
      return;
    }
    beginTimedPortion();
    return;
  }

  if (timer.openEnded) {
    timer.elapsedMs = Date.now() - timer.startAt;
  } else {
    timer.remainingMs = Math.max(0, timer.endAt - Date.now());
    timer.elapsedMs = timer.durationMs - timer.remainingMs;
  }
  renderCountdown();
  if (!timer.openEnded && timer.remainingMs <= 0) {
    completeSession();
    return;
  }
  maybeFireMinuteMarker();
  maybeFireIntervalBell();
}, 250);

// Fire a variant pop-in each time session-elapsed time crosses a minute
// boundary. Driven off elapsed time (not a free-running interval) so it
// stays aligned to real meditation minutes and naturally freezes while
// paused. Skipped too close to the end of a fixed session, where the hold
// would be cut off by completion; an open session has no such edge.
let lastMarkerMinute = 0;
function maybeFireMinuteMarker() {
  const minute = Math.floor(timer.elapsedMs / MARKER_INTERVAL_MS);
  if (minute <= lastMarkerMinute) return;
  lastMarkerMinute = minute;
  const roomToFinish =
    timer.openEnded ||
    timer.remainingMs > VARIANT_HOLD_MS + VARIANT_FADE_MS * 2;
  if (roomToFinish) fireVariant();
}

// Same elapsed-driven boundary logic as the marker above, on its own
// user-set interval: a struck bell to mark passing time without opening
// your eyes for the clock.
let lastBellInterval = 0;
function maybeFireIntervalBell() {
  if (!intervalBellMs) return;
  const n = Math.floor(timer.elapsedMs / intervalBellMs);
  if (n <= lastBellInterval) return;
  lastBellInterval = n;
  if (!timer.openEnded && timer.remainingMs <= BELL_END_GUARD_MS) return;
  ensureAudio();
  bell(0, BELL_FREQ, 0.09, 3.5);
}

function formatTime(ms, round = Math.ceil) {
  const totalSeconds = round(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function renderCountdown() {
  // Counting up rounds down, so an open session opens on 0:00 rather than
  // flicking to 0:01 in its first millisecond.
  countdownEl.textContent = timer.openEnded
    ? formatTime(timer.elapsedMs, Math.floor)
    : formatTime(timer.remainingMs);
}

function renderPrep(ms) {
  countdownEl.textContent = String(Math.ceil(ms / 1000));
}

// `choice` is a number of minutes or the string 'open'.
function startSession(choice) {
  timer.openEnded = choice === 'open';
  timer.durationMs = timer.openEnded ? 0 : choice * 60000;
  timer.remainingMs = timer.durationMs;
  timer.elapsedMs = 0;
  timer.endAt = 0;
  timer.startAt = 0;
  lastMarkerMinute = 0;
  lastBellInterval = 0;
  pauseBtn.textContent = 'Pause';
  setUIState('running');
  playActiveVideo();
  acquireWakeLock();

  if (prepSeconds > 0) {
    timer.prepEndAt = Date.now() + prepSeconds * 1000;
    countdownEl.classList.add('prep');
    renderPrep(prepSeconds * 1000);
  } else {
    timer.prepEndAt = 0;
    beginTimedPortion();
  }
}

// The real start: everything the settle window deliberately held back.
function beginTimedPortion() {
  timer.prepEndAt = 0;
  countdownEl.classList.remove('prep');
  const now = Date.now();
  if (timer.openEnded) {
    timer.startAt = now;
    timer.elapsedMs = 0;
  } else {
    timer.endAt = now + timer.durationMs;
    timer.remainingMs = timer.durationMs;
  }
  renderCountdown();
  chimeStart();
  if (ambienceOn) Ambience.start(SCENES[sceneIndex].id);
  const track = currentMusicTrack();
  if (track) startMusic(track.src);
}

function togglePause() {
  const now = Date.now();
  if (uiState === 'running') {
    if (timer.prepEndAt) {
      prepRemainingMs = Math.max(0, timer.prepEndAt - now);
    } else if (timer.openEnded) {
      timer.elapsedMs = now - timer.startAt;
    } else {
      timer.remainingMs = Math.max(0, timer.endAt - now);
    }
    pauseBtn.textContent = 'Resume';
    setUIState('paused');
    Ambience.duck();
    musicAudio?.pause();
  } else if (uiState === 'paused') {
    if (timer.prepEndAt) {
      timer.prepEndAt = now + prepRemainingMs;
    } else if (timer.openEnded) {
      timer.startAt = now - timer.elapsedMs;
    } else {
      timer.endAt = now + timer.remainingMs;
    }
    pauseBtn.textContent = 'Pause';
    setUIState('running');
    acquireWakeLock();
    Ambience.unduck();
    musicAudio?.play().catch(() => {});
  }
}

function endSession() {
  // An open session has no other way to finish, so ending one IS
  // completing it — end chime and all. Ending a fixed session early is
  // abandoning it, which stays silent, as does bailing out mid-settle.
  if (timer.openEnded && !timer.prepEndAt) {
    completeSession();
    return;
  }
  releaseWakeLock();
  timer.prepEndAt = 0;
  countdownEl.classList.remove('prep');
  setUIState('browse');
  Ambience.stop();
  stopMusic();
}

function completeSession() {
  releaseWakeLock();
  timer.prepEndAt = 0;
  countdownEl.classList.remove('prep');
  setUIState('complete');
  chimeEnd();
  Ambience.stop();
  stopMusic();
}

/* Auto-hide: during a running session the controls fade after a few
   seconds so the scene holds the screen; any tap brings them back. */

let restTimer = null;

function wake() {
  ui.classList.remove('resting');
  scheduleRest();
}

function scheduleRest() {
  clearTimeout(restTimer);
  // An open sheet holds the UI awake — the controls underneath must not
  // fade out from under a dropdown the user is still reading.
  if (uiState === 'running' && !openSheet) {
    restTimer = setTimeout(() => ui.classList.add('resting'), REST_DELAY);
  } else {
    ui.classList.remove('resting');
  }
}

/* ---------- Duration picker ---------- */

let selectedChoice = store.get('duration', 10); // minutes, 'custom', or 'open'
let customMinutes = store.get('customMinutes', CUSTOM_DEFAULT);

// 'open' and 'custom' stay strings; everything else is a minute count.
function durationValue(btn) {
  const raw = btn.dataset.minutes;
  return raw === 'custom' || raw === 'open' ? raw : Number(raw);
}

function renderDurations() {
  for (const btn of durationGroup.children) {
    btn.classList.toggle('selected', durationValue(btn) === selectedChoice);
  }
  customRow.classList.toggle('collapsed', selectedChoice !== 'custom');
  customValue.textContent = `${customMinutes} min`;
}

durationGroup.addEventListener('click', (event) => {
  const btn = event.target.closest('.duration');
  if (!btn) return;
  selectedChoice = durationValue(btn);
  store.set('duration', selectedChoice);
  renderDurations();
});

function nudgeCustom(delta) {
  customMinutes = Math.min(CUSTOM_MAX, Math.max(CUSTOM_MIN, customMinutes + delta));
  store.set('customMinutes', customMinutes);
  renderDurations();
}

$('#custom-minus').addEventListener('click', () => nudgeCustom(-1));
$('#custom-plus').addEventListener('click', () => nudgeCustom(1));

/* ---------- Sound picker (all scenes, everything off by default) ----------
   One unified section on the setup screen, as two native dropdowns —
   compact enough for landscape phones (the pill rows this replaced
   pushed Back/Start off the bottom edge there), and iOS renders them
   as its native wheel picker. Ambience offers Off / the scene's
   matched bed, shown only where a bed exists; Music lists all six
   tracks grouped by mood via optgroups (the old tap-again-to-cycle
   trick isn't needed when a dropdown can just show everything). Both
   default to off — sound is opt-in per Alex's call; the start/end
   chimes are a timer function, not ambience, so they stay on
   (governed only by the global mute). */

let ambienceOn = store.get('ambienceOn', false);
let musicCategory = store.get('musicCategory', 'none');
let musicTrackIndex = store.get('musicTrackIndex', 0);

// Music options are built from MUSIC into both copies of the control;
// option values are "category:trackIndex" so one select carries both
// stored keys.
for (const select of musicSelects) {
  const none = document.createElement('option');
  none.value = 'none';
  none.textContent = 'None';
  select.appendChild(none);
  for (const group of MUSIC) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    group.tracks.forEach((track, i) => {
      const option = document.createElement('option');
      option.value = `${group.id}:${i}`;
      option.textContent = track.label;
      optgroup.appendChild(option);
    });
    select.appendChild(optgroup);
  }
}

function currentMusicTrack() {
  const group = MUSIC.find((c) => c.id === musicCategory);
  return group ? group.tracks[musicTrackIndex % group.tracks.length] : null;
}

function renderSound() {
  const bed = AMBIENCE[SCENES[sceneIndex].id];
  for (const field of ambienceFields) field.classList.toggle('hidden', !bed);
  if (bed) {
    for (const select of ambienceSelects) {
      select.options[1].textContent = bed.label;
      select.value = ambienceOn ? 'on' : 'off';
    }
  }

  const group = MUSIC.find((c) => c.id === musicCategory);
  const value = group
    ? `${musicCategory}:${musicTrackIndex % group.tracks.length}`
    : 'none';
  for (const select of musicSelects) select.value = value;
  musicCreditEl.classList.toggle('visible', !!group);
}

/* Mid-session changes. Setup-screen changes land before anything is
   playing and need no live handling; sheet changes during a session do.
   Ambience.start()/startMusic() both tear down what's playing first, so
   these just re-run the same calls startSession() makes. */

function sessionAudioLive() {
  return (
    (uiState === 'running' || uiState === 'paused') && !timer.prepEndAt
  );
}

function applyAmbienceLive() {
  if (!sessionAudioLive()) return;
  if (!ambienceOn) {
    Ambience.stop();
    return;
  }
  Ambience.start(SCENES[sceneIndex].id);
  if (uiState === 'paused') Ambience.duck();
}

function applyMusicLive() {
  if (!sessionAudioLive()) return;
  const track = currentMusicTrack();
  if (!track) {
    stopMusic();
    return;
  }
  startMusic(track.src);
  // Starting a track while paused would play over a stopped session.
  if (uiState === 'paused') musicAudio?.pause();
}

for (const select of ambienceSelects) {
  select.addEventListener('change', () => {
    ambienceOn = select.value === 'on';
    store.set('ambienceOn', ambienceOn);
    renderSound();
    applyAmbienceLive();
  });
}

for (const select of musicSelects) {
  select.addEventListener('change', () => {
    const [cat, index] = select.value.split(':');
    musicCategory = cat;
    musicTrackIndex = Number(index) || 0;
    store.set('musicCategory', musicCategory);
    store.set('musicTrackIndex', musicTrackIndex);
    renderSound();
    applyMusicLive();
  });
}

/* ---------- Settings (app-wide, set once) ----------
   Deliberately separate from the setup screen's sound controls, split by
   lifetime: setup holds what you pick for THIS session (scene, length,
   ambience, track), Settings holds preferences you set once and forget.
   Keeping sound out of here avoids two places that both claim to own it. */

const COUNTDOWN_NOTES = {
  always: 'The clock stays on screen for the whole session.',
  rest: 'The clock fades with the controls and returns on a tap.',
  never: "No clock at all. The closing chime tells you when you're done.",
};

let countdownMode = store.get('countdownMode', 'rest');
let intervalBellMs = store.get('intervalBellMinutes', 0) * 60000;
let prepSeconds = store.get('prepSeconds', 0);

function applySettings() {
  // Drives the countdown's visibility rules in CSS. On body rather than
  // #ui because setUIState() rewrites #ui's className wholesale.
  document.body.dataset.countdown = countdownMode;
  countdownNoteEl.textContent = COUNTDOWN_NOTES[countdownMode];
  countdownSelect.value = countdownMode;
  bellsSelect.value = String(intervalBellMs / 60000);
  prepSelect.value = String(prepSeconds);
}

countdownSelect.addEventListener('change', () => {
  countdownMode = countdownSelect.value;
  store.set('countdownMode', countdownMode);
  applySettings();
});

bellsSelect.addEventListener('change', () => {
  const minutes = Number(bellsSelect.value) || 0;
  intervalBellMs = minutes * 60000;
  store.set('intervalBellMinutes', minutes);
  // Re-baseline against elapsed time so switching mid-session doesn't
  // immediately fire for every interval already behind us.
  lastBellInterval = intervalBellMs
    ? Math.floor(timer.elapsedMs / intervalBellMs)
    : 0;
});

prepSelect.addEventListener('change', () => {
  prepSeconds = Number(prepSelect.value) || 0;
  store.set('prepSeconds', prepSeconds);
});

/* ---------- Sheets ----------
   Overlay rather than another panel state: these open over whatever is
   showing, so the scene never leaves the screen to change a setting. */

let openSheet = null;

function showSheet(sheet) {
  openSheet = sheet;
  sheetBackdrop.hidden = false;
  sheet.hidden = false;
  // Next frame, so the fade runs from the hidden state rather than
  // starting already-open.
  requestAnimationFrame(() => {
    sheetBackdrop.classList.add('open');
    sheet.classList.add('open');
  });
  scheduleRest(); // holds the session UI awake while a sheet is up
}

function hideSheet() {
  const sheet = openSheet;
  if (!sheet) return;
  openSheet = null;
  sheet.classList.remove('open');
  sheetBackdrop.classList.remove('open');
  setTimeout(() => {
    // Guard against a sheet reopened during the fade-out.
    if (openSheet !== sheet) sheet.hidden = true;
    if (!openSheet) sheetBackdrop.hidden = true;
  }, 300);
  scheduleRest();
}

$('#settings-open').addEventListener('click', () => showSheet(settingsSheet));

$('#sound-open').addEventListener('click', () => {
  ensureAudio();
  renderSound();
  showSheet(soundSheet);
});

for (const btn of document.querySelectorAll('.sheet-done')) {
  btn.addEventListener('click', hideSheet);
}
sheetBackdrop.addEventListener('click', hideSheet);
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hideSheet();
});

/* ---------- Flow buttons ---------- */

$('#choose').addEventListener('click', () => {
  ensureAudio(); // user gesture — safe moment to unlock WebAudio on iOS
  renderSound();
  setUIState('setup');
});

$('#back').addEventListener('click', () => setUIState('browse'));

toHomeBtn.addEventListener('click', () => setUIState('home'));

gagBtn.addEventListener('click', playGag);

$('#begin').addEventListener('click', () => {
  ensureAudio();
  startSession(selectedChoice === 'custom' ? customMinutes : selectedChoice);
});

pauseBtn.addEventListener('click', togglePause);
$('#end').addEventListener('click', endSession);
$('#again').addEventListener('click', () => setUIState('browse'));
$('#done').addEventListener('click', () => setUIState('home'));

/* ---------- Wake lock ---------- */

let wakeLock = null;

async function acquireWakeLock() {
  try {
    wakeLock = await navigator.wakeLock?.request('screen');
  } catch {
    /* unsupported or denied — session still runs, screen may sleep */
  }
}

function releaseWakeLock() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (uiState !== 'home') playActiveVideo();
  if (gagPlaying) gagVideo.play().catch(cancelGag);
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  if (uiState === 'running') {
    acquireWakeLock();
    if (timer.prepEndAt) return; // the tick owns the settle window
    if (timer.openEnded) {
      timer.elapsedMs = Date.now() - timer.startAt;
    } else {
      timer.remainingMs = Math.max(0, timer.endAt - Date.now());
      timer.elapsedMs = timer.durationMs - timer.remainingMs;
    }
    renderCountdown();
    if (!timer.openEnded && timer.remainingMs <= 0) completeSession();
  }
});

/* ---------- Audio buses ---------- */

let audioCtx = null;
let masterGain = null; // everything (bells + ambience) routes through here for mute
let muted = store.get('muted', false);

function ensureAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (!masterGain) {
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(audioCtx.destination);
  }
}

function setMuted(next) {
  muted = next;
  store.set('muted', muted);
  muteBtn.classList.toggle('muted', muted);
  muteBtn.textContent = muted ? 'Muted' : 'Sound';
  muteBtn.setAttribute('aria-pressed', String(muted));
  if (masterGain) {
    masterGain.gain.setTargetAtTime(muted ? 0 : 1, audioCtx.currentTime, 0.15);
  }
  // .muted, not .volume — iOS Safari ignores volume writes on media
  // elements (read-only there), which left music audible through mute
  if (musicAudio) musicAudio.muted = muted;
}

muteBtn.addEventListener('click', () => {
  ensureAudio();
  setMuted(!muted);
});

/* ---------- Chimes (synthesized — no audio asset, no licensing) ---------- */

// Inharmonic partials make a struck-bell timbre instead of a pure beep.
function bell(delaySeconds, frequency, peak, decaySeconds) {
  if (!audioCtx || !masterGain) return;
  const t = audioCtx.currentTime + delaySeconds;
  for (const [ratio, amount] of [[1, 1], [2.76, 0.35], [5.4, 0.1]]) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency * ratio;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak * amount, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decaySeconds);
    osc.connect(gain).connect(masterGain);
    osc.start(t);
    osc.stop(t + decaySeconds + 0.1);
  }
}

function chimeStart() {
  ensureAudio();
  bell(0.1, 392, 0.1, 2.5); // single soft G4
}

function chimeEnd() {
  ensureAudio();
  bell(0, 523.25, 0.14, 4); // C5, struck twice, slow
  bell(1.6, 523.25, 0.14, 5);
}

/* ---------- Soundtrack playback ----------
   Full compositions, not texture — played as whole tracks via a plain
   <audio loop> element rather than AmbienceEngine's crossfade scheduler,
   which is built for noise/texture and would clash against a track's
   actual musical structure at the seam. */

let musicAudio = null;

function startMusic(src) {
  stopMusic();
  musicAudio = new Audio(src);
  musicAudio.loop = true;
  musicAudio.volume = MUSIC_VOLUME; // level only — no-op on iOS, fine
  musicAudio.muted = muted;
  musicAudio.play().catch(() => {});
}

function stopMusic() {
  if (!musicAudio) return;
  musicAudio.pause();
  musicAudio.src = '';
  musicAudio = null;
}

/* ---------- Ambience (recorded loops + one synthesized drone) ----------
   Real-world recordings aren't born loopable, so each layer schedules
   overlapping copies of itself with a crossfaded gain envelope at the
   seam — the chaotic texture (waves, fire, insects) masks the overlap.
   A short lookahead (scheduled via setTimeout but timed precisely via
   AudioContext currentTime) keeps the loop gap-free despite JS timer
   jitter. See assets/audio/CREDITS.md for track sourcing. */

const LOOKAHEAD = 1; // seconds before a loop boundary to schedule the next copy
const bufferCache = new Map();
let ambienceBus = null; // ducked independently of masterGain (pause vs. mute)
let activeLayers = [];
let activeHum = null;
let ambienceToken = 0; // invalidates in-flight loads from a scene switched away from

function loadBuffer(src) {
  if (bufferCache.has(src)) return bufferCache.get(src);
  const promise = fetch(src)
    .then((res) => res.arrayBuffer())
    .then((data) => audioCtx.decodeAudioData(data));
  bufferCache.set(src, promise);
  return promise;
}

function startLoopLayer(buffer, gainValue, crossfade) {
  const layerGain = audioCtx.createGain();
  layerGain.gain.value = gainValue;
  layerGain.connect(ambienceBus);

  let stopped = false;
  const timers = [];
  const dur = buffer.duration;
  const fade = Math.min(crossfade, dur / 2);

  function scheduleAt(startTime) {
    if (stopped) return;
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const envelope = audioCtx.createGain();
    envelope.gain.setValueAtTime(0, startTime);
    envelope.gain.linearRampToValueAtTime(1, startTime + fade);
    envelope.gain.setValueAtTime(1, startTime + dur - fade);
    envelope.gain.linearRampToValueAtTime(0, startTime + dur);
    source.connect(envelope).connect(layerGain);
    source.start(startTime);
    source.stop(startTime + dur + 0.1);

    const nextStart = startTime + dur - fade;
    const wait = Math.max(0, (nextStart - audioCtx.currentTime - LOOKAHEAD) * 1000);
    timers.push(setTimeout(() => scheduleAt(nextStart), wait));
  }

  scheduleAt(audioCtx.currentTime + 0.05);

  return {
    stop() {
      stopped = true;
      timers.forEach(clearTimeout);
      layerGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
      setTimeout(() => layerGain.disconnect(), 1500);
    },
  };
}

// Low wordless drone for the temple — a few detuned sine partials rather
// than one pure tone, so it reads as a sustained hum, not a lab-tone beep.
function startHum() {
  const bus = audioCtx.createGain();
  bus.gain.setValueAtTime(0, audioCtx.currentTime);
  bus.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 3);
  bus.connect(ambienceBus);

  const partials = [
    { ratio: 1, detune: 0, level: 0.3 },
    { ratio: 1, detune: 5, level: 0.08 },
    { ratio: 1, detune: -5, level: 0.08 },
    { ratio: 2, detune: 0, level: 0.06 },
  ];
  const oscillators = partials.map(({ ratio, detune, level }) => {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 110 * ratio; // low A2-ish register
    osc.detune.value = detune;
    const gain = audioCtx.createGain();
    gain.gain.value = level;
    osc.connect(gain).connect(bus);
    osc.start();
    return osc;
  });

  return {
    stop() {
      bus.gain.setTargetAtTime(0, audioCtx.currentTime, 0.8);
      setTimeout(() => {
        oscillators.forEach((osc) => osc.stop());
        bus.disconnect();
      }, 2000);
    },
  };
}

const Ambience = {
  start(sceneId) {
    ensureAudio();
    if (!audioCtx) return; // WebAudio unsupported — session still runs silently
    this.stop();
    const config = AMBIENCE[sceneId];
    if (!config) return;

    const token = ++ambienceToken;
    ambienceBus = audioCtx.createGain();
    ambienceBus.gain.value = 1;
    ambienceBus.connect(masterGain);

    for (const layer of config.layers) {
      loadBuffer(layer.src).then((buffer) => {
        if (token !== ambienceToken) return; // scene changed before this loaded
        activeLayers.push(startLoopLayer(buffer, layer.gain, layer.crossfade));
      });
    }
    if (config.hum) activeHum = startHum();
  },

  stop() {
    ambienceToken++;
    activeLayers.forEach((layer) => layer.stop());
    activeLayers = [];
    if (activeHum) {
      activeHum.stop();
      activeHum = null;
    }
    if (ambienceBus) {
      const bus = ambienceBus;
      setTimeout(() => bus.disconnect(), 1500);
      ambienceBus = null;
    }
  },

  duck() {
    ambienceBus?.gain.setTargetAtTime(0, audioCtx.currentTime, 0.3);
  },

  unduck() {
    ambienceBus?.gain.setTargetAtTime(1, audioCtx.currentTime, 0.3);
  },
};

/* ---------- Boot ---------- */

renderDurations();
applySettings();
// Land on the home grid without touching any video — setScene (and the
// lazy video loading it triggers) waits for the first card tap.
setUIState('home');
muteBtn.classList.toggle('muted', muted);
muteBtn.textContent = muted ? 'Muted' : 'Sound';
muteBtn.setAttribute('aria-pressed', String(muted));
$('#version').textContent = 'v' + APP_VERSION;

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
