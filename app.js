'use strict';

/* ---------- Config ---------- */

// Bump alongside CACHE in sw.js on every deploy — this is the only
// user-visible confirmation that a phone has picked up the latest build
// (shown small, bottom-right, home screen only).
const APP_VERSION = 45;

// Scene labels are provisional placeholders — Alex finalizes the names.
const SCENES = [
  // First in the grid, and the default scene for anyone with no saved
  // preference. Added 2026-07-22 from the yoga re-shoot: a photoreal take
  // on the modern-studio brief, alongside (not replacing) the original
  // painterly Studio loop below.
  // 'center 85%' pulls the landscape crop off the top instead of splitting
  // it: she sits low with ~24% of the frame as empty wall above her, so a
  // centred crop cut the mat and knees while keeping dead space. 85% (not
  // 'bottom') leaves a little headroom tolerance for viewports wider than a
  // phone. Inert in portrait, where the crop goes sideways.
  { id: 'morning', label: 'Morning', src: 'assets/video/yoga-photoreal-breathing-v1.mp4', card: 'assets/img/card-morning.jpg', objectPosition: 'center 85%' },
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
  // The only scene whose subject isn't centre-framed: it sits left of
  // centre with its head high in frame, so BOTH axes need anchoring.
  // '21%' handles portrait, where cover crops the sides — the head spans
  // source x 257-474 of 1280, so a centred crop cuts it off entirely;
  // 21% centres the visible window on the head instead. 'top' handles
  // landscape, where cover crops top and bottom. Each value is inert on
  // the axis the other one fixes, so one pair covers both orientations.
  { id: 'android', label: 'Android', src: 'assets/video/android-room-breathing-v1.mp4', card: 'assets/img/card-android.jpg', objectPosition: '21% top' },
  // The one scene with no film in it: white type on black, rendered live
  // from TEXT_SCRIPT below. No Midjourney still, no Kling clip, no card
  // thumbnail, nothing for the service worker to cache — it costs bytes
  // only in this file. See the Words section further down.
  { id: 'words', label: 'Words', type: 'text' },
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
// no entry here (yoga, hearth) simply never pop in — accepted gap for
// now, may rerun those stills to give them variants later.
const VARIANTS = {
  // Same source still as the default, so the pop-in has no visible seam
  // (frame 1 of the two takes differs by 0.49 of 255). The second take
  // moves the face ~34% more than the default does — same reasoning as
  // android below: the livelier take is the marker, not the resting state.
  morning: ['assets/video/yoga-photoreal-breathing-v2.mp4'],
  monk: [
    'assets/video/monk-temple-breathing-v2.mp4',
    'assets/video/monk-temple-breathing-v3.mp4',
  ],
  elf: ['assets/video/elf-forest-breathing-v2.mp4'],
  leopard: ['assets/video/leopard-royalty-breathing-v2.mp4'],
  // v1 (the default) holds the mouth still; v2 has mouth movement, so it
  // reads as a change when it pops in rather than as the resting state.
  android: ['assets/video/android-room-breathing-v2.mp4'],
  photoreal: ['assets/video/photoreal-woman-breathing-v2.mp4'],
  rooftop: ['assets/video/rooftop-city-breathing-v2.mp4'],
};
const MARKER_INTERVAL_MS = 60000; // one pop-in per elapsed minute of session time
const VARIANT_HOLD_MS = 10000; // ~2 breath loops on the variant before returning
const VARIANT_FADE_MS = 2000; // must match the .variant-video CSS crossfade

// Optional full-track soundtrack, offered on every scene (was yoga-only
// until v13), and since v40 the only audio the app plays besides the
// chimes. Real compositions with musical structure, played as whole
// tracks. Any ambient texture added back later lands here too, per Alex's
// call when the separate ambience layer was removed.
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

/* ---------- Words scene script ----------
   Twelve triads: a line on the inhale, a line on the exhale, then one held
   line to rest on. Trimmed from Alex's 25-triad draft, keeping its arc
   (arrive, anchor, soften, watch the mind, kindness inward, kindness
   outward, stop striving, return) and cutting the word count per line —
   a ten-word sentence at this type size is something you read instead of
   something you breathe under.

   `core` marks the six that survive a session too short for all twelve;
   they form a complete miniature of the same arc on their own. */

const TEXT_SCRIPT = [
  { inhale: 'Gathering awareness into the body.', exhale: 'Releasing the weight of the day.', focus: 'You have arrived.', core: true },
  { inhale: 'Cool air at the tip of the nose.', exhale: 'Warm air leaving the lips.', focus: 'The breath is the anchor.', core: true },
  { inhale: 'Softness into the chest.', exhale: 'Shoulders away from the ears.', focus: 'Relax your effort.' },
  { inhale: 'The tide rises.', exhale: 'The tide recedes.', focus: 'You are the floor beneath.' },
  { inhale: 'Fill completely.', exhale: 'Empty completely.', focus: 'Peace lives in the pause.' },
  { inhale: 'Notice where the mind went.', exhale: 'Guide it back to the breath.', focus: 'Returning is the practice.', core: true },
  { inhale: 'A moment begins.', exhale: 'A moment fades.', focus: 'Everything passes.' },
  { inhale: 'I am aware of thinking.', exhale: 'I am not my thoughts.', focus: 'Let the clouds pass.' },
  { inhale: 'Breathing kindness into your own heart.', exhale: 'Releasing judgment.', focus: 'May I be safe and at ease.', core: true },
  { inhale: 'Breathing in awareness of others.', exhale: 'Breathing out warmth to all.', focus: 'May all find peace.' },
  { inhale: 'No seeking.', exhale: 'No striving.', focus: 'You are already complete.', core: true },
  { inhale: 'Filling with clarity.', exhale: 'Carrying peace back with you.', focus: 'Open your eyes slowly.', core: true },
];

/* Pacing. Every line is read, then taken away, and the screen is empty for
   a beat before the next one arrives — the black between lines is part of
   the scene, not dead air waiting to be filled.

   Hold scales with line length, because "No seeking." and "Breathing
   kindness into your own heart." are not the same amount of reading, and a
   single fixed duration either rushes the long ones or strands the short
   ones on screen. */
const LINE_HOLD_BASE_MS = 4000;
const LINE_HOLD_PER_CHAR_MS = 90;
const LINE_HOLD_MIN_MS = 4500;
const LINE_HOLD_MAX_MS = 9000;

// Black between the lines within a triad. Fades eat ~1.2s of this, so it
// wants to be comfortably longer than the pause is meant to feel.
const LINE_REST_MS = 3500;

// Black between triads: longer, to group each set of three, and the one
// elastic part of the whole schedule — a longer session gets more quiet
// rather than more text. The maximum is deliberately generous; a
// several-minute silence inside a long sit is normal, and a tight cap made
// an hour-long session finish the script at twelve minutes and then sit
// black, having said "open your eyes slowly" three quarters of an hour
// early.
const TRIAD_REST_MIN_MS = 7000;
const TRIAD_REST_MAX_MS = 300000;
// Leave the last stretch of a fixed session wordless, so the closing line
// lands before the end chime rather than on top of it.
const TEXT_TAIL = 0.9;
const TEXT_FADE_MS = 600; // must match the .text-line CSS transition

const REST_DELAY = 4000; // ms of stillness before the UI fades during a session
const SWIPE_MIN = 48; // px of horizontal travel that counts as a swipe

// Interval bells ring on their own pitch, between the start chime's G4 and
// the completion C5, so a marker never reads as the session ending.
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
const hoursField = $('#hours-field');
const minutesField = $('#minutes-field');
const hoursSelect = $('#hours-select');
const minutesSelect = $('#minutes-select');
const openToggle = $('#open-toggle');
const countdownEl = $('#countdown');
const pauseBtn = $('#pause');
const gagBtn = $('#gag');
const cardGridEl = $('#card-grid');
const toHomeBtn = $('#to-home');
const musicCreditEl = $('.music-credit');

// Sound controls exist twice — inline on the setup screen and inside the
// in-session sound sheet — so they're addressed as pairs and kept in sync
// by renderSound() rather than duplicating any state.
const musicSelects = [$('#music-select'), $('#s-music-select')];

const sheetBackdrop = $('#sheet-backdrop');
const settingsSheet = $('#settings-sheet');
const soundSheet = $('#sound-sheet');
const countdownSelect = $('#countdown-select');
// The only per-row note left (v41). Clock, Motion and Words type name their
// own options in the dropdown; Chime sound previews on pick. Countdown keeps
// one because "Never" changes what the app does, not just how it looks.
const countdownNoteEl = $('#countdown-note');
const clockSelect = $('#clock-select');
const motionSelect = $('#motion-select');
const textStyleSelect = $('#textstyle-select');
const bellsSelect = $('#bells-select');
const prepSelect = $('#prep-select');
const chimeSelect = $('#chime-select');

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
  // Unlike the gag and variant overlays, the Words script survives a pause —
  // it's the scene itself, not something playing over it.
  if (state !== 'running' && state !== 'paused') stopTextScript();
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
  // The Words scene has no film, so it gets no entry here at all — its
  // layer lives outside #stage and is toggled by setScene() directly.
  if (scene.type !== 'text') {
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
  }

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
  if (scene.type === 'text') {
    // No thumbnail to generate: the card is the scene, at card size.
    card.classList.add('card-words');
    const sample = document.createElement('span');
    sample.className = 'card-sample';
    sample.textContent = TEXT_SCRIPT[0].focus;
    card.appendChild(sample);
  } else {
    const img = document.createElement('img');
    img.src = scene.card;
    img.alt = '';
    img.loading = 'lazy';
    card.appendChild(img);
  }
  const name = document.createElement('span');
  name.className = 'card-name';
  name.textContent = scene.label;
  card.appendChild(name);
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
  if (!video) return; // Words scene — nothing to load
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

  // Push the Ken Burns zoom INTO the scene's crop anchor rather than away
  // from it. A default centre-origin scale crops evenly on all four sides,
  // which is exactly the edge an objectPosition scene is protecting — the
  // android's head would clip again, the same v27 bug from a new direction.
  // objectPosition and transform-origin take the same syntax, so the scene's
  // own value passes straight through.
  stage.style.transformOrigin = scene.objectPosition || 'center center';

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
  setTextSceneActive(scene.type === 'text');

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
  videos.get(SCENES[sceneIndex].id)?.play()?.catch(() => {});
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

/* ---------- Words scene ----------
   The one scene rendered rather than filmed. Because there's no clip to
   loop, none of the video pipeline's problems apply: no seam to hide, no
   repetition to disguise, and the pace is ours to set rather than whatever
   rate the animation came back at.

   The script is compiled to a cue list at session start and then driven off
   timer.elapsedMs by the main tick, the same way minute markers and interval
   bells are. That inherits their behaviour for free: it freezes while paused,
   survives the phone being locked or backgrounded, and catches up to the
   right line rather than replaying the ones it slept through. */

const textLayer = $('#text-scene');
const textLineEl = $('#text-line');

let textSchedule = null; // cue list for the running session, or null
let textCueIndex = -1;
let textShown = null;
let textSwapTimer = null;

function setTextSceneActive(on) {
  textLayer.classList.toggle('active', on);
  if (!on) stopTextScript();
}

// Fade the current line out, swap the words while nothing is visible, fade
// the new one in. An empty string leaves the screen dark, which is what the
// gaps between triads and the tail of a long session are made of.
function showTextLine(text) {
  if (text === textShown) return;
  textShown = text;
  clearTimeout(textSwapTimer);
  textLineEl.classList.remove('in');
  textSwapTimer = setTimeout(() => {
    textLineEl.textContent = text;
    if (text) textLineEl.classList.add('in');
  }, TEXT_FADE_MS);
}

function lineHoldMs(text) {
  return Math.min(
    LINE_HOLD_MAX_MS,
    Math.max(LINE_HOLD_MIN_MS, LINE_HOLD_BASE_MS + text.length * LINE_HOLD_PER_CHAR_MS)
  );
}

// Everything in a triad except the elastic rest that follows it.
function triadFixedMs(t) {
  return (
    lineHoldMs(t.inhale) +
    lineHoldMs(t.exhale) +
    lineHoldMs(t.focus) +
    LINE_REST_MS * 2
  );
}

// Fit the script to the session rather than the other way round. Reading
// time is fixed, so the two things that can give are how many triads play
// and how much black sits between them.
function buildTextSchedule(durationMs) {
  const open = !durationMs;
  const budget = durationMs * TEXT_TAIL;
  let script = TEXT_SCRIPT;
  let rest = TRIAD_REST_MIN_MS;

  if (!open) {
    const fixed = (list) => list.reduce((sum, t) => sum + triadFixedMs(t), 0);
    const fits = (list) => fixed(list) + list.length * TRIAD_REST_MIN_MS <= budget;
    // Short session: fall back to the core spine, which is the same arc in
    // miniature rather than the first half of the full one.
    if (!fits(script)) script = TEXT_SCRIPT.filter((t) => t.core);
    // Shorter still: drop from the end, but never the closing triad — a
    // session that stops before "Open your eyes slowly" has no ending.
    while (script.length > 1 && !fits(script)) {
      script = [...script.slice(0, -2), script[script.length - 1]];
    }
    rest = Math.min(
      TRIAD_REST_MAX_MS,
      Math.max(TRIAD_REST_MIN_MS, (budget - fixed(script)) / script.length)
    );
  }

  const cues = [];
  let at = 0;
  for (const triad of script) {
    const lines = [triad.inhale, triad.exhale, triad.focus];
    lines.forEach((text, i) => {
      cues.push({ at, text });
      at += lineHoldMs(text);
      cues.push({ at, text: '' }); // the screen empties after every line
      // Indexed, not compared by text: two identical lines in one triad
      // would otherwise take the wrong branch.
      at += i === lines.length - 1 ? rest : LINE_REST_MS;
    });
  }
  return cues;
}

function startTextScript() {
  textSchedule = buildTextSchedule(timer.durationMs);
  textCueIndex = -1;
}

// Nothing on screen outside a running session — not while browsing, not
// during the settle window. The first line is the session starting, so
// showing any of it beforehand spends the opening on someone who hasn't
// begun yet. The home-grid card carries a sample line instead, which is
// where "what is this scene" actually gets answered.
function stopTextScript() {
  textSchedule = null;
  textCueIndex = -1;
  showTextLine('');
}

// Called from the session tick. Walks forward to the cue that owns the
// current elapsed time and renders only that one, so a session resumed
// after a long lock doesn't flash through every line it missed.
function advanceTextScript() {
  if (!textSchedule) return;
  let i = textCueIndex;
  while (i + 1 < textSchedule.length && textSchedule[i + 1].at <= timer.elapsedMs) {
    i++;
  }
  if (i === textCueIndex) return;
  textCueIndex = i;
  showTextLine(textSchedule[i].text);
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
  // music, no markers — the scene is just there to sit down in front of.
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
  advanceTextScript();
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
  chimeInterval();
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
  if (SCENES[sceneIndex].type === 'text') startTextScript();
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
  stopMusic();
}

function completeSession() {
  releaseWakeLock();
  timer.prepEndAt = 0;
  countdownEl.classList.remove('prep');
  setUIState('complete');
  chimeEnd();
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

/* ---------- Duration picker ----------
   Two native selects (hours, minutes) plus the open-ended toggle, replacing
   the 5/10/15/Custom pill row and its +/- stepper. The stepper was the
   problem Alex actually hit — reaching 45 minutes meant 25 taps — and once
   any length is one gesture away, fixed presets stop earning their space.

   Native selects rather than a custom wheel for the same reason v14 chose
   them for the sound controls: iOS renders a <select> as its own wheel
   picker, which is exactly the Insight Timer control, with no custom
   picker code and no accessibility work to redo. */

const MIN_MINUTES = 1;
const MAX_MINUTES = 180;

function clampMinutes(n) {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(n) || 0));
}

// Sessions saved under the old pill model carry over rather than silently
// resetting to the default: 'custom' takes the stepper's value, a preset
// takes its own, and 'open' becomes the toggle.
function storedMinutes() {
  const saved = store.get('durationMinutes', null);
  if (saved !== null) return clampMinutes(saved);
  const legacy = store.get('duration', 10);
  if (legacy === 'custom') return clampMinutes(store.get('customMinutes', 20));
  return typeof legacy === 'number' ? clampMinutes(legacy) : 10;
}

function storedOpen() {
  const saved = store.get('openEnded', null);
  return saved === null ? store.get('duration', 10) === 'open' : !!saved;
}

let sessionMinutes = storedMinutes();
let openEnded = storedOpen();

for (let h = 0; h <= Math.floor(MAX_MINUTES / 60); h++) {
  const option = document.createElement('option');
  option.value = String(h);
  option.textContent = `${h} h`;
  hoursSelect.appendChild(option);
}
for (let m = 0; m < 60; m++) {
  const option = document.createElement('option');
  option.value = String(m);
  option.textContent = `${m} min`;
  minutesSelect.appendChild(option);
}

function renderDurations() {
  hoursSelect.value = String(Math.floor(sessionMinutes / 60));
  minutesSelect.value = String(sessionMinutes % 60);
  openToggle.classList.toggle('selected', openEnded);
  openToggle.setAttribute('aria-pressed', String(openEnded));
  // The length controls stay visible AND live while open-ended is on. Dimmed
  // to show ∞ is the active choice, but still tappable — picking a length is
  // how you leave ∞, without a detour through the toggle first (the whole
  // point of a length control is to set a length). readDuration() clears
  // openEnded when they change, so the dim is a state cue, not a lock.
  for (const field of [hoursField, minutesField]) {
    field.classList.toggle('dim', openEnded);
  }
}

function readDuration() {
  // Touching the length picker means you want a timed session — leave ∞ if
  // it was on. This is what makes the dimmed-but-live selects work: the act
  // of picking a length is itself the switch back.
  if (openEnded) {
    openEnded = false;
    store.set('openEnded', false);
  }
  // Clamps rather than refusing: 3 h 30 min lands on the 3 h maximum and
  // 0 h 0 min on one minute, both visibly, instead of leaving Start armed
  // with a length the app can't run.
  sessionMinutes = clampMinutes(
    Number(hoursSelect.value) * 60 + Number(minutesSelect.value)
  );
  store.set('durationMinutes', sessionMinutes);
  renderDurations();
}

hoursSelect.addEventListener('change', readDuration);
minutesSelect.addEventListener('change', readDuration);

// Same-value gap: while ∞ is on the dropdowns show the retained length, so
// opening one and re-picking that same number fires no 'change' and
// readDuration never runs — ∞ stays on though you just chose a length.
// Engaging the control at all is the intent, so clear ∞ on pointerdown, the
// moment the picker opens, before any value is (or isn't) committed. Only
// the state and the visual cue change here, not the value; a real change
// still routes through readDuration as normal.
function leaveOpenOnPick() {
  if (!openEnded) return;
  openEnded = false;
  store.set('openEnded', false);
  openToggle.classList.remove('selected');
  openToggle.setAttribute('aria-pressed', 'false');
  hoursField.classList.remove('dim');
  minutesField.classList.remove('dim');
}
for (const select of [hoursSelect, minutesSelect]) {
  select.addEventListener('pointerdown', leaveOpenOnPick);
}

openToggle.addEventListener('click', () => {
  openEnded = !openEnded;
  store.set('openEnded', openEnded);
  renderDurations();
});

/* ---------- Sound picker (all scenes, everything off by default) ----------
   One unified section on the setup screen, as two native dropdowns —
   compact enough for landscape phones (the pill rows this replaced
   pushed Back/Start off the bottom edge there), and iOS renders them
   as its native wheel picker. Music lists all six tracks grouped by
   mood via optgroups (the old tap-again-to-cycle trick isn't needed
   when a dropdown can just show everything) and defaults to None —
   sound is opt-in per Alex's call. */

let musicCategory = store.get('musicCategory', 'none');
let musicTrackIndex = store.get('musicTrackIndex', 0);

/* Chimes have no switch (v41). They're a timer function, not atmosphere —
   the start and end strikes ARE the thing you opened a timer for. The v39
   switch that used to live here created a state the app's own copy
   contradicted: Settings still tells you "No clock at all. The closing
   chime tells you when you're done" under Countdown: Never, while the
   switch could turn that chime off, leaving a fixed session with no signal
   at all for someone sitting with their eyes closed.

   Interval bells keep their off switch — it's in their own dropdown, and
   optional markers really are optional. Silence is the hardware volume
   buttons, which is faster than anything reachable through a sheet anyway.
   (Not the iOS silent switch: it can stop WebAudio playing at all, a
   separate long-standing quirk on this app.) The stored `chimesOn` key is
   simply no longer read; a stale localStorage entry costs nothing. */

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
  const group = MUSIC.find((c) => c.id === musicCategory);
  const value = group
    ? `${musicCategory}:${musicTrackIndex % group.tracks.length}`
    : 'none';
  for (const select of musicSelects) select.value = value;
  musicCreditEl.classList.toggle('visible', !!group);
}

/* Mid-session changes. Setup-screen changes land before anything is
   playing and need no live handling; sheet changes during a session do.
   startMusic() tears down what's playing first, so this just re-runs the
   same call startSession() makes. */

function sessionAudioLive() {
  return (
    (uiState === 'running' || uiState === 'paused') && !timer.prepEndAt
  );
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
   Split from the setup screen by LIFETIME, not by category: setup holds
   what you pick for THIS session (scene, length, prep, bells, track),
   Settings holds preferences you set once and forget.

   Chime voice lives here, and that placement was re-examined in v41 and
   kept. The tempting argument is that a chime is a timer function so it
   belongs with the timer — but that's category, and the rule is lifetime.
   Which voice the bell has is a ringtone: set once, never touched again.
   What had actually made it feel misfiled was two controls with nearly the
   same name on different screens ("Chimes" on setup, "Chime sound" here),
   and deleting the on/off switch resolved that without moving anything. */

/* The one surviving caption. Its siblings for Clock, Motion and Words type
   went in v41 — each of those dropdowns names its own options ("Top left",
   "Still", "Sans caps"), so the note restated the value you'd just read.
   This one earns its place: "Never" removes the clock entirely, which is a
   consequence rather than a restatement.

   And it is exactly why chimes lost their on/off switch in the same pass —
   this copy has always promised the closing chime as the signal. */
const COUNTDOWN_NOTES = {
  always: 'The clock stays on screen for the whole session.',
  rest: 'The clock fades with the controls and returns on a tap.',
  never: "No clock at all. The closing chime tells you when you're done.",
};

// Defaults to 'always': a first-run screen with no clock on it reads as
// missing functionality rather than as a deliberate setting. Hiding it is
// opt-in, found once the user goes looking.
let countdownMode = store.get('countdownMode', 'always');
// Every scene's subject is centre-framed by design, so the corners are
// normally background — but not all of them are (Android sits left of
// centre), hence a manual override for the clock's corner.
let clockPosition = store.get('clockPosition', 'auto');
// The OS accessibility pref picks the default only. Once the user has
// chosen in Settings, that choice is the source of truth — a single code
// path, rather than a CSS media query racing the toggle.
let sceneMotion = store.get(
  'sceneMotion',
  matchMedia('(prefers-reduced-motion: reduce)').matches ? 'still' : 'zoom'
);
let textStyle = store.get('textStyle', 'sans');
let intervalBellMs = store.get('intervalBellMinutes', 0) * 60000;
let prepSeconds = store.get('prepSeconds', 0);
let chimeVoice = store.get('chimeVoice', 'bell');

function applySettings() {
  // Drives the countdown's visibility rules in CSS. On body rather than
  // #ui because setUIState() rewrites #ui's className wholesale.
  document.body.dataset.countdown = countdownMode;
  countdownNoteEl.textContent = COUNTDOWN_NOTES[countdownMode];
  countdownSelect.value = countdownMode;
  document.body.dataset.clock = clockPosition;
  clockSelect.value = clockPosition;
  document.body.dataset.motion = sceneMotion;
  motionSelect.value = sceneMotion;
  document.body.dataset.textstyle = textStyle;
  textStyleSelect.value = textStyle;
  bellsSelect.value = String(intervalBellMs / 60000);
  prepSelect.value = String(prepSeconds);
  chimeSelect.value = chimeVoice;
}

countdownSelect.addEventListener('change', () => {
  countdownMode = countdownSelect.value;
  store.set('countdownMode', countdownMode);
  applySettings();
});

clockSelect.addEventListener('change', () => {
  clockPosition = clockSelect.value;
  store.set('clockPosition', clockPosition);
  applySettings();
});

motionSelect.addEventListener('change', () => {
  sceneMotion = motionSelect.value;
  store.set('sceneMotion', sceneMotion);
  applySettings();
});

textStyleSelect.addEventListener('change', () => {
  textStyle = textStyleSelect.value;
  store.set('textStyle', textStyle);
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

chimeSelect.addEventListener('change', () => {
  chimeVoice = chimeSelect.value;
  store.set('chimeVoice', chimeVoice);
  applySettings();
  // Preview on pick — choosing a sound you cannot hear is not a choice.
  // This is also why the voice picker carries no caption: hearing it beats
  // reading about it, which is what let the other four notes go in v41.
  // Render the new voice if it's the first time, point the elements at it, then
  // play its end clip. The change is a user gesture, so the play lands inside
  // the activation window, and it doubles as unlocking the end element.
  ensureVoiceRendered(chimeVoice).then((urls) => {
    applyVoice(urls);
    if (urls) {
      try { chimeEls.end.currentTime = 0; } catch { /* not seekable yet */ }
      chimeEls.end.play().catch(() => {});
    }
  });
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
  unlockAudio();
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
  unlockAudio(); // user gesture — prime media playback for the coming session
  renderSound();
  setUIState('setup');
});

$('#back').addEventListener('click', () => setUIState('browse'));

toHomeBtn.addEventListener('click', () => setUIState('home'));

gagBtn.addEventListener('click', playGag);

$('#begin').addEventListener('click', () => {
  unlockAudio();
  startSession(openEnded ? 'open' : sessionMinutes);
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

/* ---------- Chimes ----------
   Synthesized from the voice definitions below, but rendered offline into
   short WAV clips and played through <audio> elements rather than live Web
   Audio. The pipe is the whole point (v43): iOS silences live Web Audio under
   the hardware mute switch but lets media elements through — proven, since the
   music (an <audio>) plays on silent while the old Web Audio chimes did not.
   Same synthesized sound, a path that survives silent mode, and still no
   shipped asset: the clip is generated in the browser, so there's nothing to
   license and nothing for the service worker to cache.

   There is also no global mute (dropped in v39) and no chimes on/off switch
   (dropped in v41) — start and end are the timer's signal. The phone's volume
   buttons are the only silence, and now they work the way a timer should:
   turning the ringer off no longer takes the end chime with it. */

/* The offline render target that partial()/noiseBurst() build into. Set by
   renderRole() just before it runs a voice's strike, so the voice definitions
   below stay identical to the live-Web-Audio version — only the destination
   changed. Nothing outside renderRole touches these. */
let rctx = null;
let rdest = null;

// One struck partial. `attack` doubles as the bloom control: giving upper
// partials a later attack than the fundamental is what separates a gong's
// swelling shimmer from a bell's instant strike.
function partial(t, freq, peak, attack, decay) {
  const osc = rctx.createOscillator();
  const gain = rctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  osc.connect(gain).connect(rdest);
  osc.start(t);
  osc.stop(t + attack + decay + 0.1);
}

// The non-pitched part of a strike: mallet contact, or a gong's crash.
function noiseBurst(t, peak, decay, freq, q) {
  const len = Math.max(1, Math.floor(rctx.sampleRate * decay));
  const buf = rctx.createBuffer(1, len, rctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
  }
  const src = rctx.createBufferSource();
  src.buffer = buf;
  const bp = rctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const gain = rctx.createGain();
  gain.gain.value = peak;
  src.connect(bp).connect(gain).connect(rdest);
  src.start(t);
  src.stop(t + decay + 0.05);
}

/* ---------- Chime voices ----------
   Each voice picks its own pitches per role, because a gong at the bell's C5
   does not read as a gong. Within every voice the three roles stay
   pitch-separated, so a minute marker is never mistaken for the session
   ending.

   `note` is no longer rendered — v41 dropped the caption under the picker,
   since previewing a voice on pick tells you more than a sentence can. Kept
   because it describes each voice's character next to the numbers that
   produce it, which is the useful place for it when tuning them. */

const VOICES = {
  bell: {
    label: 'Bell',
    note: 'The original. Bright and clean, carries over a track.',
    freq: { start: 392, interval: 440, end: 523.25 },
    decayScale: 1,
    strike(t, freq, peak, decay) {
      for (const [ratio, amount] of [[1, 1], [2.76, 0.35], [5.4, 0.1]]) {
        partial(t, freq * ratio, peak * amount, 0.02, decay);
      }
    },
  },

  bowl: {
    label: 'Singing bowl',
    note: 'Slow swell and a long shimmer. Closest to the temple bed.',
    freq: { start: 196, interval: 233.1, end: 174.6 },
    decayScale: 2.6,
    strike(t, freq, peak, decay) {
      // Two oscillators a couple of cents apart on every partial. The slow
      // beating between them is most of what makes a bowl sound like a bowl
      // rather than like a soft bell.
      for (const [ratio, amount, detune] of
           [[1, 1, 0.7], [2.32, 0.4, 1.1], [3.86, 0.16, 1.6], [5.2, 0.07, 2.2]]) {
        const d = decay * Math.max(0.3, 1 - ratio * 0.06);
        partial(t, freq * ratio, peak * amount * 0.6, 0.08, d);
        partial(t, freq * ratio + detune, peak * amount * 0.6, 0.08, d);
      }
    },
  },

  gong: {
    label: 'Gong',
    note: 'Low and wide, blooming after the strike. Longest tail of the five.',
    freq: { start: 110, interval: 130.8, end: 87.3 },
    decayScale: 3.2,
    strike(t, freq, peak, decay) {
      const ratios = [1, 1.41, 1.87, 2.24, 2.71, 3.16, 3.78, 4.31, 5.09, 6.02, 7.13];
      ratios.forEach((ratio, i) => {
        partial(t, freq * ratio, peak * Math.pow(ratio, -0.85),
                0.02 + i * 0.09, decay * Math.max(0.3, 1 - i * 0.055));
      });
      noiseBurst(t, peak * 0.5, 0.5, freq * 6, 0.6);
    },
  },

  glass: {
    label: 'Glass',
    note: 'High and delicate. Easy to miss under a loud track.',
    freq: { start: 784, interval: 932.3, end: 1046.5 },
    decayScale: 0.8,
    strike(t, freq, peak, decay) {
      for (const [ratio, amount] of [[1, 1], [2.7, 0.3], [5.2, 0.12], [8.9, 0.05]]) {
        partial(t, freq * ratio, peak * amount, 0.005, decay * 0.55);
      }
      noiseBurst(t, peak * 0.18, 0.06, freq * 3, 2);
    },
  },

  wood: {
    label: 'Temple block',
    note: 'A dry knock with no tail. Marks time without ringing on.',
    freq: { start: 294, interval: 349.2, end: 246.9 },
    decayScale: 0.15,
    strike(t, freq, peak, decay) {
      for (const [ratio, amount] of [[1, 1], [2.9, 0.5], [5.7, 0.2]]) {
        partial(t, freq * ratio, peak * amount, 0.002, Math.min(decay, 0.35));
      }
      noiseBurst(t, peak * 0.5, 0.05, freq * 4, 1.2);
    },
  },
};

/* One clip per role. Start and interval are a single strike; end is struck
   twice, 1.6s apart, so completion reads as deliberate rather than as one
   more marker. These `peak`/`decay` values and the double end-strike are what
   the live strike() used to pass — the sound is unchanged, only pre-rendered. */
const CHIME_HITS = {
  start: [{ at: 0, peak: 0.10, decay: 2.5 }],
  interval: [{ at: 0, peak: 0.09, decay: 3.5 }],
  end: [{ at: 0, peak: 0.14, decay: 4 }, { at: 1.6, peak: 0.14, decay: 5 }],
};
const CHIME_LEAD = 0.02; // a breath of silence before the strike, so no click at t=0

function renderRole(voice, role) {
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const rate = 44100;
  const hits = CHIME_HITS[role];
  const last = hits[hits.length - 1];
  // Long enough for the final strike's full decay (scaled per voice) plus the
  // gong's staggered-attack bloom; capped so a long tail can't run away.
  const seconds = Math.min(
    CHIME_LEAD + last.at + last.decay * voice.decayScale + 1.2,
    16
  );
  const ctx = new OfflineCtx(1, Math.ceil(seconds * rate), rate);
  rctx = ctx;
  rdest = ctx.destination;
  for (const h of hits) {
    voice.strike(CHIME_LEAD + h.at, voice.freq[role], h.peak, h.decay * voice.decayScale);
  }
  return ctx.startRendering();
}

// AudioBuffer -> 16-bit PCM WAV blob URL. Mono, in-memory; the URL is held
// on chimeUrls for the app's life (one small set per voice actually used).
function bufToWavUrl(buffer) {
  const len = buffer.length;
  const rate = buffer.sampleRate;
  const data = buffer.getChannelData(0);
  const ab = new ArrayBuffer(44 + len * 2);
  const view = new DataView(ab);
  const str = (o, s) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF'); view.setUint32(4, 36 + len * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data'); view.setUint32(40, len * 2, true);
  let off = 44;
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return URL.createObjectURL(new Blob([ab], { type: 'audio/wav' }));
}

/* One persistent <audio> per role, reused every session. This is the fix for
   the end chime never reaching the speaker (v44): iOS blesses a media element
   for later scripted playback only if that SAME element was played during a
   user gesture, and the grace period is a few seconds. v43 made a fresh
   `new Audio()` per chime, so the start chime — created right after the Begin
   tap — played, while the end chime, a brand-new element minutes later, was
   blocked, ringer or not. The music never hit this because it's one element
   played inside the Begin tap and kept alive. So: three fixed elements,
   unlocked once on the first flow tap, replayed at chime time. */
const chimeEls = {
  start: new Audio(),
  interval: new Audio(),
  end: new Audio(),
};
for (const el of Object.values(chimeEls)) el.preload = 'auto';

// voice id -> { start, interval, end } blob URLs, rendered on demand and kept.
const chimeUrls = {};

// Point the three elements at a voice's clips. Swapping src on an already
// unlocked element keeps its blessing (the standard iOS audio-sprite pattern),
// so a voice change in Settings doesn't cost the unlock.
function applyVoice(urls) {
  if (!urls) return;
  chimeEls.start.src = urls.start;
  chimeEls.interval.src = urls.interval;
  chimeEls.end.src = urls.end;
}

async function ensureVoiceRendered(voice) {
  if (chimeUrls[voice]) return chimeUrls[voice];
  if (!(window.OfflineAudioContext || window.webkitOfflineAudioContext)) return null;
  try {
    const roles = ['start', 'interval', 'end'];
    const buffers = await Promise.all(roles.map((r) => renderRole(VOICES[voice], r)));
    const urls = {};
    roles.forEach((r, i) => { urls[r] = bufToWavUrl(buffers[i]); });
    chimeUrls[voice] = urls;
    return urls;
  } catch {
    return null; // offline render unsupported/failed — session still runs, silent
  }
}

/* Replay the pre-blessed element for a role. currentTime = 0 so an interval
   bell landing while a previous tail still rings restarts cleanly. Unconditional
   as of v41: start and end are the timer's signal; chimeInterval only fires when
   the user has set an interval, so it needs no gate of its own. */
function playChime(role) {
  const el = chimeEls[role];
  if (!el.src) { ensureVoiceRendered(chimeVoice).then(applyVoice); return; }
  try { el.currentTime = 0; } catch { /* not seekable yet — play from 0 anyway */ }
  el.play().catch(() => {});
}

function chimeStart() { playChime('start'); }
function chimeInterval() { playChime('interval'); }
function chimeEnd() { playChime('end'); }

/* Unlock all three chime elements on the first flow tap, with a muted play so
   there's no sound — the standard iOS HTML5-audio unlock. Once blessed this
   way, each can be replayed later in the session without a gesture, which is
   what the end chime needs. Idempotent; retries on the next tap if the clips
   haven't finished rendering yet. */
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  const els = Object.values(chimeEls);
  if (els.some((el) => !el.src)) return; // not rendered yet — a later tap retries
  audioUnlocked = true;
  for (const el of els) {
    el.muted = true;
    el.play()
      .then(() => { el.pause(); el.currentTime = 0; el.muted = false; })
      .catch(() => { el.muted = false; });
  }
}

// Warm the current voice at boot (offline, no gesture) and point the elements
// at it, so they have a source before the first tap.
ensureVoiceRendered(chimeVoice).then(applyVoice);

/* ---------- Soundtrack playback ----------
   Full compositions, not texture — played as whole tracks via a plain
   <audio loop> element. A hard loop cut on a several-minute track is an
   accepted tradeoff; most sessions never reach the loop point. */

let musicAudio = null;

function startMusic(src) {
  stopMusic();
  musicAudio = new Audio(src);
  musicAudio.loop = true;
  musicAudio.volume = MUSIC_VOLUME; // level only — no-op on iOS, fine
  musicAudio.play().catch(() => {});
}

function stopMusic() {
  if (!musicAudio) return;
  musicAudio.pause();
  musicAudio.src = '';
  musicAudio = null;
}

/* ---------- Boot ---------- */

renderDurations();
// Also at boot, not only on entering setup: otherwise every sound control
// sits at its markup default until the first visit to that screen, so the
// DOM and the stored state disagree for anything read before then.
renderSound();
applySettings();
// Land on the home grid without touching any video — setScene (and the
// lazy video loading it triggers) waits for the first card tap.
setUIState('home');
$('#version').textContent = 'v' + APP_VERSION;

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
