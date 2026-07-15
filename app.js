'use strict';

/* ---------- Config ---------- */

const SCENES = [
  { id: 'monk', label: 'Temple', src: 'assets/video/monk-temple-breathing-v1.mp4' },
  { id: 'yoga', label: 'Studio', src: 'assets/video/yoga-studio-breathing-v1.mp4' },
  // On loan from Portals-App for desk-companion testing — may be removed
  { id: 'hammock', label: 'Hammock', src: 'assets/video/hammock-sleep-v1.mp4' },
  { id: 'horizon', label: 'Horizon', src: 'assets/video/horizon-gaze-v1.mp4' },
];

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
}

function togglePause() {
  if (uiState === 'running') {
    timer.remainingMs = Math.max(0, timer.endAt - Date.now());
    pauseBtn.textContent = 'Resume';
    setUIState('paused');
  } else if (uiState === 'paused') {
    timer.endAt = Date.now() + timer.remainingMs;
    pauseBtn.textContent = 'Pause';
    setUIState('running');
    acquireWakeLock();
  }
}

function endSession() {
  releaseWakeLock();
  setUIState('browse');
}

function completeSession() {
  releaseWakeLock();
  setUIState('complete');
  chimeEnd();
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

/* ---------- Flow buttons ---------- */

$('#choose').addEventListener('click', () => {
  ensureAudio(); // user gesture — safe moment to unlock WebAudio on iOS
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
  if (uiState === 'running') {
    acquireWakeLock();
    timer.remainingMs = Math.max(0, timer.endAt - Date.now());
    renderCountdown();
    if (timer.remainingMs <= 0) completeSession();
  }
});

/* ---------- Chimes (synthesized — no audio asset, no licensing) ---------- */

let audioCtx = null;

function ensureAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// Inharmonic partials make a struck-bell timbre instead of a pure beep.
function bell(delaySeconds, frequency, peak, decaySeconds) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + delaySeconds;
  for (const [ratio, amount] of [[1, 1], [2.76, 0.35], [5.4, 0.1]]) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency * ratio;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak * amount, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decaySeconds);
    osc.connect(gain).connect(audioCtx.destination);
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

/* ---------- Boot ---------- */

renderDurations();
setScene(sceneIndex);
setUIState('browse');

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
