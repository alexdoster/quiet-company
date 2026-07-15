'use strict';

/* ---------- Config ---------- */

// Bump alongside CACHE in sw.js on every deploy — this is the only
// user-visible confirmation that a phone has picked up the latest build
// (shown small, bottom-right, home screen only).
const APP_VERSION = 9;

const SCENES = [
  { id: 'monk', label: 'Temple', src: 'assets/video/monk-temple-breathing-v1.mp4' },
  { id: 'yoga', label: 'Studio', src: 'assets/video/yoga-studio-breathing-v1.mp4' },
  // On loan from Portals-App for desk-companion testing — may be removed
  { id: 'hammock', label: 'Hammock', src: 'assets/video/hammock-sleep-v1.mp4' },
  { id: 'horizon', label: 'Horizon', src: 'assets/video/horizon-gaze-v1.mp4' },
];

// Ambient beds per scene, played only during a session (not while browsing).
// Real recordings, not born-loopable — AmbienceEngine crossfades overlapping
// copies at playback time rather than needing the files hand-edited.
// See assets/audio/CREDITS.md for sourcing (all CC0, BigSoundBank).
const AMBIENCE = {
  monk: {
    hum: true, // synthesized wordless drone, layered under the bowl
    layers: [{ src: 'assets/audio/temple-bowl.mp3', gain: 0.5, crossfade: 3 }],
  },
  hammock: {
    layers: [
      { src: 'assets/audio/hammock-cicadas.mp3', gain: 0.4, crossfade: 2.5 },
      { src: 'assets/audio/hammock-campfire.mp3', gain: 0.3, crossfade: 2.5 },
    ],
  },
  horizon: {
    layers: [{ src: 'assets/audio/horizon-waves.mp3', gain: 0.55, crossfade: 2.5 }],
  },
};

// Optional full-track soundtrack, currently yoga only. Unlike AMBIENCE
// above (texture, crossfade-looped), these are real compositions with
// musical structure — played as whole tracks, not loop-scheduled.
// Royalty-free (CC BY 4.0, Scott Buckley — attribution required, see
// assets/audio/CREDITS.md), picked as mood-equivalents for the named
// copyrighted artists Alex referenced, not copies of them; those can't
// legally be embedded in a public repo. Two tracks per mood so there's
// a real choice, not just one pick per category.
const MUSIC = {
  yoga: [
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
  ],
};
const MUSIC_VOLUME = 0.55;

const CUSTOM_DEFAULT = 20;
const CUSTOM_MIN = 1;
const CUSTOM_MAX = 120;
const REST_DELAY = 4000; // ms of stillness before the UI fades during a session
const SWIPE_MIN = 48; // px of horizontal travel that counts as a swipe

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
const soundtrackEl = $('#soundtrack');
const musicPillsEl = $('#music-pills');
const musicNowEl = $('#music-now');
const musicCreditEl = $('.music-credit');

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

let uiState = 'browse'; // browse | setup | running | paused | complete

function setUIState(state) {
  uiState = state;
  ui.className = 'state-' + state;
  panels.browse.classList.toggle('visible', state === 'browse');
  panels.setup.classList.toggle('visible', state === 'setup');
  panels.session.classList.toggle(
    'visible',
    state === 'running' || state === 'paused'
  );
  panels.complete.classList.toggle('visible', state === 'complete');
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

/* Swipe to browse (browse state only) */

let swipeStart = null;

window.addEventListener('pointerdown', (event) => {
  wake();
  if (uiState === 'browse' && !event.target.closest('button')) {
    swipeStart = { x: event.clientX, y: event.clientY };
  }
});

window.addEventListener('pointerup', (event) => {
  if (!swipeStart) return;
  const dx = event.clientX - swipeStart.x;
  const dy = event.clientY - swipeStart.y;
  swipeStart = null;
  if (uiState !== 'browse') return;
  if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) {
    changeScene(dx < 0 ? 1 : -1);
  }
});

window.addEventListener('keydown', (event) => {
  if (uiState !== 'browse') return;
  if (event.key === 'ArrowRight') changeScene(1);
  if (event.key === 'ArrowLeft') changeScene(-1);
});

$('#nav-prev').addEventListener('click', () => changeScene(-1));
$('#nav-next').addEventListener('click', () => changeScene(1));

/* ---------- Timer ---------- */

const timer = {
  durationMs: 0,
  remainingMs: 0,
  endAt: 0,
};

// Timestamp-based so the countdown stays honest if the tab is
// backgrounded or the phone locks mid-session.
setInterval(() => {
  if (uiState !== 'running') return;
  timer.remainingMs = Math.max(0, timer.endAt - Date.now());
  renderCountdown();
  if (timer.remainingMs <= 0) completeSession();
}, 250);

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function renderCountdown() {
  countdownEl.textContent = formatTime(timer.remainingMs);
}

function startSession(minutes) {
  timer.durationMs = minutes * 60000;
  timer.remainingMs = timer.durationMs;
  timer.endAt = Date.now() + timer.durationMs;
  renderCountdown();
  pauseBtn.textContent = 'Pause';
  setUIState('running');
  playActiveVideo();
  acquireWakeLock();
  chimeStart();
  Ambience.start(SCENES[sceneIndex].id);
  const track = MUSIC[SCENES[sceneIndex].id] && currentMusicTrack();
  if (track) startMusic(track.src);
}

function togglePause() {
  if (uiState === 'running') {
    timer.remainingMs = Math.max(0, timer.endAt - Date.now());
    pauseBtn.textContent = 'Resume';
    setUIState('paused');
    Ambience.duck();
    musicAudio?.pause();
  } else if (uiState === 'paused') {
    timer.endAt = Date.now() + timer.remainingMs;
    pauseBtn.textContent = 'Pause';
    setUIState('running');
    acquireWakeLock();
    Ambience.unduck();
    musicAudio?.play().catch(() => {});
  }
}

function endSession() {
  releaseWakeLock();
  setUIState('browse');
  Ambience.stop();
  stopMusic();
}

function completeSession() {
  releaseWakeLock();
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
  if (uiState === 'running') {
    restTimer = setTimeout(() => ui.classList.add('resting'), REST_DELAY);
  } else {
    ui.classList.remove('resting');
  }
}

/* ---------- Duration picker ---------- */

let selectedChoice = store.get('duration', 10); // minutes, or 'custom'
let customMinutes = store.get('customMinutes', CUSTOM_DEFAULT);

function renderDurations() {
  for (const btn of durationGroup.children) {
    const value =
      btn.dataset.minutes === 'custom' ? 'custom' : Number(btn.dataset.minutes);
    btn.classList.toggle('selected', value === selectedChoice);
  }
  customRow.classList.toggle('collapsed', selectedChoice !== 'custom');
  customValue.textContent = `${customMinutes} min`;
}

durationGroup.addEventListener('click', (event) => {
  const btn = event.target.closest('.duration');
  if (!btn) return;
  selectedChoice =
    btn.dataset.minutes === 'custom' ? 'custom' : Number(btn.dataset.minutes);
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

/* ---------- Soundtrack picker (yoga only, for now) ----------
   One tap picks a mood category (its first track); tapping the
   already-selected category again cycles to the alternate track in
   that mood — keeps the visible control to 4 pills (same footprint as
   the duration row) while still offering a real choice per category. */

let musicCategory = store.get('musicCategory', 'none');
let musicTrackIndex = store.get('musicTrackIndex', 0);

function currentMusicTrack() {
  const group = MUSIC.yoga.find((c) => c.id === musicCategory);
  return group ? group.tracks[musicTrackIndex % group.tracks.length] : null;
}

function renderSoundtrack() {
  const hasMusic = !!MUSIC[SCENES[sceneIndex].id];
  soundtrackEl.classList.toggle('hidden', !hasMusic);
  if (!hasMusic) return;

  for (const btn of musicPillsEl.children) {
    btn.classList.toggle('selected', btn.dataset.cat === musicCategory);
  }
  const track = currentMusicTrack();
  musicNowEl.textContent = track ? track.label : '';
  musicCreditEl.classList.toggle('visible', !!track);
}

musicPillsEl.addEventListener('click', (event) => {
  const btn = event.target.closest('.music-cat');
  if (!btn) return;
  const cat = btn.dataset.cat;
  if (cat === musicCategory && cat !== 'none') {
    const group = MUSIC.yoga.find((c) => c.id === cat);
    musicTrackIndex = (musicTrackIndex + 1) % group.tracks.length;
  } else {
    musicCategory = cat;
    musicTrackIndex = 0;
  }
  store.set('musicCategory', musicCategory);
  store.set('musicTrackIndex', musicTrackIndex);
  renderSoundtrack();
});

/* ---------- Flow buttons ---------- */

$('#choose').addEventListener('click', () => {
  ensureAudio(); // user gesture — safe moment to unlock WebAudio on iOS
  renderSoundtrack();
  setUIState('setup');
});

$('#back').addEventListener('click', () => setUIState('browse'));

$('#begin').addEventListener('click', () => {
  ensureAudio();
  startSession(selectedChoice === 'custom' ? customMinutes : selectedChoice);
});

pauseBtn.addEventListener('click', togglePause);
$('#end').addEventListener('click', endSession);
$('#again').addEventListener('click', () => setUIState('browse'));

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
  playActiveVideo();
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  if (uiState === 'running') {
    acquireWakeLock();
    timer.remainingMs = Math.max(0, timer.endAt - Date.now());
    renderCountdown();
    if (timer.remainingMs <= 0) completeSession();
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
  muteBtn.setAttribute('aria-pressed', String(muted));
  if (masterGain) {
    masterGain.gain.setTargetAtTime(muted ? 0 : 1, audioCtx.currentTime, 0.15);
  }
  if (musicAudio) musicAudio.volume = muted ? 0 : MUSIC_VOLUME;
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
  musicAudio.volume = muted ? 0 : MUSIC_VOLUME;
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
setScene(sceneIndex);
setUIState('browse');
muteBtn.classList.toggle('muted', muted);
muteBtn.setAttribute('aria-pressed', String(muted));
$('#version').textContent = 'v' + APP_VERSION;

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
