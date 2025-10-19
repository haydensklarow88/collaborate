
export function playChime({ volume = 1.0 } = {}) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();

    o1.type = "sine";
    o2.type = "triangle";

    const now = ctx.currentTime;
    o1.frequency.setValueAtTime(880, now);
    o2.frequency.setValueAtTime(660, now);

    // Allow louder output (cap at 1.5) so we can boost volume ~70% when requested
    const targetGain = Math.min(1.5, volume);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(targetGain, now + 0.03);

    o1.connect(g);
    o2.connect(g);
    g.connect(ctx.destination);

    o1.start(now);
    o2.start(now);

    // Simple tri-tone pattern
    o1.frequency.setValueAtTime(990, now + 0.18);
    o2.frequency.setValueAtTime(740, now + 0.18);
    o1.frequency.setValueAtTime(660, now + 0.36);
    o2.frequency.setValueAtTime(550, now + 0.36);

    // Fade out
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    o1.stop(now + 0.75);
    o2.stop(now + 0.75);

    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    // No-op if audio is blocked
  }
}

export const PHARMACY_ALERT_URL = "https://drive.google.com/uc?export=download&id=12egoUM11wvSZtubjbFXnT927ExTMBM6O";
// Use the project-local MP3 in /public uploaded by the user
export const NOTIFICATION_SOUND_URL = "/new-notification-021-370045.mp3";

// Optional alias for centralized import in other modules
export const NOTIF_URL = NOTIFICATION_SOUND_URL;

// Small debug logger controlled by window.__AUDIO_DEBUG or function arg
function isDebugEnabled(explicit) {
  if (typeof explicit === 'boolean') return explicit;
  if (typeof window !== 'undefined' && window.__AUDIO_DEBUG) return true;
  return false;
}
function dlog(enabled, ...args) {
  if (!enabled) return;
  try { console.log('[SOUND]', ...args); } catch (_) {}
}

// ---- Blob-cached bell (fetch once from Netlify, play via same-origin blob URL) ----
let __BELL_BLOB_URL = null;

export async function getBellUrl() {
  if (__BELL_BLOB_URL) return __BELL_BLOB_URL;
  try {
    const res = await fetch(NOTIFICATION_SOUND_URL, {
      mode: "cors",
      credentials: "omit",
      cache: "force-cache",
    });
    if (!res.ok) throw new Error(`bell fetch failed: ${res.status}`);
    const blob = await res.blob();
    __BELL_BLOB_URL = URL.createObjectURL(blob); // same-origin blob URL
    return __BELL_BLOB_URL;
  } catch (e) {
    // If fetch fails, leave blob null; callers will fall back
    return null;
  }
}

export function playAlert(url = PHARMACY_ALERT_URL, { volume = 1.0 } = {}) {
  try {
    const audio = new Audio(url);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch(() => {
      playChime({ volume: 1.5 });
    });
  } catch {
    playChime({ volume: 1.5 });
  }
}

export const NOTIFICATION_SOUND_FALLBACK = NOTIFICATION_SOUND_URL; // alias

// One-time audio unlock to satisfy browser/webview autoplay policies
let __audioUnlocked = false;
export function unlockAudioOnce() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (__audioUnlocked) return;
  const unlock = () => {
    __audioUnlocked = true;
    try {
      // Perform a silent AudioContext unlock instead of an audible chime
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.000001; // effectively silent
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        try { osc.start(now); } catch (_) {}
        try { osc.stop(now + 0.02); } catch (_) {}
        setTimeout(() => { try { ctx.close(); } catch (_) {} }, 200);
      }
    } catch (_) {}
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
    document.removeEventListener("touchstart", unlock);
  };
  document.addEventListener("pointerdown", unlock, { once: true, passive: true });
  document.addEventListener("keydown", unlock, { once: true });
  document.addEventListener("touchstart", unlock, { once: true, passive: true });
}

// Persistent HTMLAudio element for robust playback (best for ToDesktop/Electron)
let __notifAudioEl = null;
// Persistent Web Audio context
let __audioContext = null;

function wireAudioDiagnostics(el, dbg) {
  if (!el || el.__wiredDiagnostics) return;
  el.__wiredDiagnostics = true;

  el.addEventListener('loadedmetadata', () => dlog(dbg, 'loadedmetadata', { duration: el.duration, readyState: el.readyState, networkState: el.networkState }));
  el.addEventListener('loadeddata', () => dlog(dbg, 'loadeddata', { readyState: el.readyState, networkState: el.networkState }));
  el.addEventListener('canplay', () => dlog(dbg, 'canplay', { readyState: el.readyState, networkState: el.networkState }));
  el.addEventListener('canplaythrough', () => dlog(dbg, 'canplaythrough', { readyState: el.readyState, networkState: el.networkState }));
  el.addEventListener('play', () => dlog(dbg, 'play event fired'));
  el.addEventListener('playing', () => dlog(dbg, 'playing'));
  el.addEventListener('pause', () => dlog(dbg, 'pause'));
  el.addEventListener('ended', () => dlog(dbg, 'ended'));
  el.addEventListener('error', () => {
    const err = el.error;
    dlog(dbg, 'audio error', { code: err?.code, message: err?.message, readyState: el.readyState, networkState: el.networkState, src: el.currentSrc || el.src });
  });
}

function getOrCreateAudioEl(url = NOTIFICATION_SOUND_URL, dbg = false) {
  if (typeof window === "undefined") return null;
  if (__notifAudioEl && __notifAudioEl.src && __notifAudioEl.src.includes(url)) {
    return __notifAudioEl;
  }
  const audio = new Audio();
  audio.src = url;
  audio.crossOrigin = "anonymous";
  audio.preload = "auto";
  audio.loop = false;

  wireAudioDiagnostics(audio, dbg);
  __notifAudioEl = audio;

  try { __notifAudioEl.load(); } catch (_) {}
  dlog(dbg, 'created audio element', { src: audio.src });
  return __notifAudioEl;
}

// Call this once (e.g., on app load) to warm the cache
export function preloadNotificationSound(url = NOTIFICATION_SOUND_URL, opts = {}) {
  const dbg = isDebugEnabled(opts.debug);
  try {
    const el = getOrCreateAudioEl(url, dbg);
    dlog(dbg, 'preloading sound...');
    el?.load?.();
  } catch (e) {
    dlog(dbg, 'preload error', e?.message || e);
  }
}

// Louder, robust notification with priority on your custom MP3.
// Order now prefers Blob URL (same-origin) -> HTMLAudio (remote URL) -> retry on gesture -> synthesized chime.
export async function playNotification({ volume = 1.0, debug } = {}) {
  const dbg = isDebugEnabled(debug);

  // 0) Try Blob URL if available (fetch if not yet cached)
  try {
    const blobUrl = __BELL_BLOB_URL || (await getBellUrl());
    if (blobUrl) {
      const el = getOrCreateAudioEl(blobUrl, dbg); // reuse persistent element
      if (el) {
        try { el.pause(); } catch (_) {}
        try { el.currentTime = 0; } catch (_) {}
        el.volume = Math.max(0.5, Math.min(1, volume));
        dlog(dbg, 'BlobAudio: attempting play()', { src: el.currentSrc || el.src, volume: el.volume });
        await el.play();
        dlog(dbg, 'BlobAudio: play() success');
        return; // success via blob
      }
    }
  } catch (err) {
    dlog(dbg, 'BlobAudio path failed:', err?.name, err?.message);
  }

  // 1) Try HTMLAudio first (remote URL)
  try {
    const el = getOrCreateAudioEl(NOTIFICATION_SOUND_URL, dbg);
    if (el) {
      try { el.pause(); } catch (_) {}
      try { el.currentTime = 0; } catch (_) {}
      el.volume = Math.max(0.5, Math.min(1, volume));
      dlog(dbg, 'HTMLAudio: attempting play()', { src: el.currentSrc || el.src, volume: el.volume, readyState: el.readyState, networkState: el.networkState });

      try {
        await el.play();
        dlog(dbg, 'HTMLAudio: play() resolved');
        return; // success
      } catch (playErr) {
        dlog(dbg, 'HTMLAudio: play() rejected:', playErr?.name, playErr?.message);
        // Retry on next user gesture
        if (typeof document !== "undefined") {
          const retry = async () => {
            try {
              const el2 = getOrCreateAudioEl(NOTIFICATION_SOUND_URL, dbg);
              if (!el2) return;
              try { el2.pause(); } catch (_) {}
              try { el2.currentTime = 0; } catch (_) {}
              el2.volume = Math.max(0.5, Math.min(1, volume));
              dlog(dbg, 'HTMLAudio: retrying play() on gesture');
              await el2.play();
              dlog(dbg, 'HTMLAudio: retry succeeded');
            } catch (e2) {
              dlog(dbg, 'HTMLAudio: retry failed', e2?.name, e2?.message);
            } finally {
              document.removeEventListener("pointerdown", retry);
              document.removeEventListener("keydown", retry);
              document.removeEventListener("touchstart", retry);
            }
          };
          document.addEventListener("pointerdown", retry, { once: true, passive: true });
          document.addEventListener("keydown", retry, { once: true });
          document.addEventListener("touchstart", retry, { once: true, passive: true });
        }
      }
    }
  } catch (err) {
    dlog(dbg, 'HTMLAudio play() failed synchronously:', err?.name, err?.message);
  }

  // 2) Final fallback: synthesized chime
  try {
    dlog(dbg, 'falling back to synthesized chime');
    playChime({ volume: Math.min(1.5, volume * 1.6) });
  } catch {
    // no-op
  }
}

// ringNotification — prefer Blob URL (same-origin) with chime fallback.
// Keeps existing debug behavior and time-based fallback if needed.
export async function ringNotification({ volume = 1.0, debug } = {}) {
  const dbg = isDebugEnabled(debug);
  dlog(dbg, 'ring: START (Blob URL preferred)', { url: NOTIFICATION_SOUND_URL, volume });

  // 0) Try Blob URL (fetch/cached)
  try {
    const blobUrl = __BELL_BLOB_URL || (await getBellUrl());
    if (blobUrl) {
      const el = getOrCreateAudioEl(blobUrl, dbg);
      if (el) {
        try { el.pause(); } catch (_) {}
        try { el.currentTime = 0; } catch (_) {}
        el.volume = Math.max(0.5, Math.min(1, volume));
        dlog(dbg, 'BlobAudio: attempting play()', { src: el.currentSrc || el.src, volume: el.volume });

        let played = false;
        const p = el.play();
        p.then(() => {
          played = true;
          dlog(dbg, 'BlobAudio: play() resolved (MP3 playing)');
        }).catch((err) => {
          dlog(dbg, 'BlobAudio: play() rejected', err?.name, err?.message);
        });

        // If not playing within 2200ms, use chime fallback
        setTimeout(() => {
          if (!played) {
            dlog(dbg, 'BlobAudio: fallback chime (no playing within 2200ms)');
            playChime({ volume: 1.0 });
          }
        }, 2200);

        return; // blob path attempted
      }
    }
  } catch (e) {
    dlog(dbg, 'Blob path error:', e?.name, e?.message);
  }

  // 1) Fallback to existing HTMLAudio pipeline (remote URL)
  try {
    const el = getOrCreateAudioEl(NOTIFICATION_SOUND_URL, dbg);
    if (el) {
      try { el.pause(); } catch (_) {}
      try { el.currentTime = 0; } catch (_) {}
      el.volume = Math.max(0.5, Math.min(1, volume));
      dlog(dbg, 'HTMLAudio: attempting play()', { src: el.currentSrc || el.src, volume: el.volume, readyState: el.readyState, networkState: el.networkState });

      let played = false;
      const playPromise = el.play();

      playPromise.then(() => {
        played = true;
        dlog(dbg, 'HTMLAudio: play() resolved (MP3 playing)');
      }).catch((playErr) => {
        dlog(dbg, 'HTMLAudio: play() rejected', playErr?.name, playErr?.message);
        // Retry on next user gesture
        if (typeof document !== "undefined") {
          const retry = async () => {
            try {
              const el2 = getOrCreateAudioEl(NOTIFICATION_SOUND_URL, dbg);
              if (!el2) return;
              try { el2.pause(); } catch (_) {}
              try { el2.currentTime = 0; } catch (_) {}
              el2.volume = Math.max(0.5, Math.min(1, volume));
              dlog(dbg, 'HTMLAudio: retrying play() on gesture');
              await el2.play();
              dlog(dbg, 'HTMLAudio: retry succeeded');
            } catch (e2) {
              dlog(dbg, 'HTMLAudio: retry failed', e2?.name, e2?.message);
            } finally {
              document.removeEventListener("pointerdown", retry);
              document.removeEventListener("keydown", retry);
              document.removeEventListener("touchstart", retry);
            }
          };
          document.addEventListener("pointerdown", retry, { once: true, passive: true });
          document.addEventListener("keydown", retry, { once: true });
          document.addEventListener("touchstart", retry, { once: true, passive: true });
        }
      });

      // If not playing within 2200ms, use chime fallback
      setTimeout(() => {
        if (!played) {
          dlog(dbg, 'HTMLAudio: fallback chime (no playing within 2200ms)');
          playChime({ volume: 1.0 });
        }
      }, 2200);

      return;
    }
  } catch (e) {
    dlog(dbg, 'HTMLAudio: failed synchronously', e?.name, e?.message);
  }

  // 2) Final fallback: synthesized chime
  try {
    dlog(dbg, 'Final fallback: chime only');
    playChime({ volume: Math.min(1.5, volume * 1.6) });
  } catch {
    // no-op
  }
}

// New: primeAudioOnce — prefer fetching/caching Blob first, then silent unlock.
// Replaces previous implementation while remaining idempotent.
export function primeAudioOnce() {
  if (typeof window === "undefined") return;
  if (window.__AUDIO_PRIMED) return;

  const handler = async () => {
    try {
      // Fetch & cache blob
      await getBellUrl();
      // Attempt brief silent play from blob (if available), else from remote URL
      const src = __BELL_BLOB_URL || NOTIFICATION_SOUND_URL;
      const a = new Audio(src);
      a.crossOrigin = "anonymous";
      a.preload = "auto";
  a.volume = 0.0; // fully muted prime
      await a.play().catch(() => {});
      try { a.pause(); } catch (_) {}
      try { a.currentTime = 0; } catch (_) {}
      window.__AUDIO_PRIMED = true;
    } catch (_) {
      // no-op; chime fallback still available
    } finally {
      document.removeEventListener("pointerdown", handler, true);
      document.removeEventListener("keydown", handler, true);
      document.removeEventListener("touchstart", handler, true);
    }
  };

  document.addEventListener("pointerdown", handler, { once: true, passive: true, capture: true });
  document.addEventListener("keydown", handler, { once: true, capture: true });
  document.addEventListener("touchstart", handler, { once: true, passive: true, capture: true });
}

// Add a direct helper to test the exact Netlify MP3 via our robust pipeline
export function playNetlifyBellDebug() {
  return ringNotification({ volume: 1.0, debug: true });
}

// Expose quick helpers for manual testing and external triggers
if (typeof window !== 'undefined') {
  // Make the bell URL available globally (matches your snippet)
  window.BELL_URL = NOTIFICATION_SOUND_URL;

  // Debug test: window.__PLAY_NOTIFICATION_TEST()
  if (!window.__PLAY_NOTIFICATION_TEST) {
    window.__PLAY_NOTIFICATION_TEST = () => ringNotification({ volume: 1.0, debug: true });
  }

  // Preferred global helper: window.playPharmacyBell() => ringNotification
  if (!window.playPharmacyBell) {
    window.playPharmacyBell = () => ringNotification({ volume: 1.0 });
  }
  // New: one-click test of Netlify MP3 with debug
  if (!window.__PLAY_NETLIFY_MP3) {
    window.__PLAY_NETLIFY_MP3 = () => playNetlifyBellDebug();
  }
}
