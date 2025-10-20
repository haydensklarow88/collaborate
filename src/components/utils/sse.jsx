
// ===== Force same-origin SSE; no cross-origin fallback =====
if (typeof window !== "undefined") {
  delete window.__EVENTS_BASE__; // ensure same-origin
  window.__PHARMACY_CHANNEL__ = (window.__USER__?.email || "").trim().toLowerCase();
}

import { ringNotification } from "@/components/utils/sounds";

// Enable/disable SSE at runtime via Vite env. If not explicitly enabled,
// default to enabling only on localhost to avoid Netlify 404/HTML responses.
function isSseAllowed() {
  if (typeof window === "undefined") return false;
  // Respect explicit environment override
  const flag = (import.meta.env && import.meta.env.VITE_SSE_ENABLED) || "";
  const norm = String(flag).toLowerCase();
  if (norm === "1" || norm === "true") return true;
  if (norm === "0" || norm === "false") return false;
  // Default behavior: allow on localhost only
  const host = window.location?.hostname || "";
  return host === "localhost" || host === "127.0.0.1";
}

let es = null;
let connecting = false;
let retryAt = 0;
let backoffMs = 0;
let lastChannel = ""; // <— track channel used for the current connection
const subscribers = new Map();

// Add a fallback channel to avoid delaying initial SSE connection when email isn't ready
const FALLBACK_CHANNEL = "__all__";

function addSubscriber(event, cb) {
  if (!subscribers.has(event)) subscribers.set(event, new Set());
  subscribers.get(event).add(cb);
}
function removeSubscriber(event, cb) {
  const set = subscribers.get(event);
  if (!set) return;
  set.delete(cb);
}
function emit(event, data) {
  // NEW: notify any wildcard subscribers with (eventName, data)
  const star = subscribers.get('*');
  if (star && star.size > 0) {
    for (const cb of Array.from(star)) {
      try { cb(event, data); } catch (_) {}
    }
  }

  // Existing: notify event-specific subscribers with (data)
  const set = subscribers.get(event);
  if (!set || set.size === 0) return;
  for (const cb of Array.from(set)) {
    try { cb(data); } catch (_) {}
  }
}
function scheduleReconnect(ms) {
  const now = Date.now();
  backoffMs = Math.min(ms != null ? ms : (backoffMs ? Math.min(backoffMs * 2, 60000) : 5000), 60000);
  retryAt = now + backoffMs;
  setTimeout(() => { ensureConnected(); }, backoffMs + 50);
}
function getChannel() {
  if (typeof window === "undefined") return "";
  const raw = (window.__PHARMACY_CHANNEL__ || window.__USER__?.email || "").trim().toLowerCase();
  // Optional: pull last-known from localStorage to avoid first-load race
  if (!raw) {
    try {
      const cached = (localStorage.getItem("__rtx_pharmacy_channel") || "").trim().toLowerCase();
      // NEW: return fallback channel if nothing is known yet, so we connect ASAP
      return cached || FALLBACK_CHANNEL;
    } catch {
      return FALLBACK_CHANNEL;
    }
  }
  if (raw) {
    try { localStorage.setItem("__rtx_pharmacy_channel", raw); } catch {}
  }
  return raw;
}

// Helper: set SSE channel explicitly and reconnect
export function setSseChannel(email) {
  try {
    if (typeof window === "undefined") return;
    const norm = String(email || "").trim().toLowerCase();
    if (!norm) return;
    window.__PHARMACY_CHANNEL__ = norm;
    try { localStorage.setItem("__rtx_pharmacy_channel", norm); } catch (_) {}
    console.log("[SSE] channel set via setSseChannel:", norm);
    ensureConnected();
  } catch (e) {
    try { console.warn("[SSE] setSseChannel error:", e?.message || e); } catch (_) {}
  }
}

export function ensureConnected() {
  const now = Date.now();
  // Skip attempting to connect when SSE is not allowed (e.g., Netlify static site)
  if (!isSseAllowed()) return;
  if (connecting) return;

  const ch = getChannel();
  if (!ch) { scheduleReconnect(1500); return; }

  // Already connected on same channel
  if (es && es.readyState === 1 && lastChannel === ch) return;
  if (now < retryAt) return;

  connecting = true;
  try {
    if (es) { try { es.close(); } catch (_e) {} es = null; }
    lastChannel = ch;

  const base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
    const url = `${base}/functions/events?ts=${Date.now()}&channel=${encodeURIComponent(ch)}`;
    try { console.log("[SSE] connecting:", url, "channel:", ch); } catch (_) {}

    es = new EventSource(url, { withCredentials: true });

    es.addEventListener("open", (e) => {
      backoffMs = 0;
      emit("sse_open", { ok: true, t: Date.now(), channel: ch });
      emit("__connected__", { t: Date.now(), channel: ch });
      connecting = false;
      // Diagnostic: if server sent an 'open' event payload, log it
      try {
        const maybe = e?.data ? JSON.parse(e.data) : null;
        if (maybe && maybe.instance_id) console.log("[SSE] server diagnostics:", maybe);
      } catch (_) {}
      try { console.log("[SSE] open on", ch); } catch (_) {}
    });

    // Known named events
    const passEvents = ["request_update", "new_pharmacy_request", "notification", "ping", "open"];
    passEvents.forEach((ev) => {
      es.addEventListener(ev, (e) => {
        let data = null;
        try { data = e.data ? JSON.parse(e.data) : null; } catch { data = e.data || null; }
        emit(ev, data);
      });
    });

    es.addEventListener("message", (e) => {
      try {
        const payload = e?.data ? JSON.parse(e.data) : null;
        if (payload && typeof payload === "object" && payload.event) {
          emit(payload.event, payload.data);
        }
      } catch (_err) {}
    });

    es.addEventListener("error", (e) => {
      // Add explicit console details to help diagnose Axios-like "Network Error" at SDK level
      try { console.warn("[SSE] onerror fired; readyState:", es?.readyState, "channel:", lastChannel, e); } catch (_) {}
      emit("sse_error", { t: Date.now() });
      emit("__disconnected__", { t: Date.now(), channel: lastChannel || ch });
    });

    es.onerror = () => {
      emit("sse_error", { t: Date.now() });
      emit("__disconnected__", { t: Date.now(), channel: lastChannel || ch });
      try { es.close(); } catch (_e) {}
      es = null;
      connecting = false;
      scheduleReconnect();
    };
  } catch (_e) {
    connecting = false;
    scheduleReconnect();
  }
}

export function subscribe(event, cb) {
  addSubscriber(event, cb);
  ensureConnected();
  return () => removeSubscriber(event, cb);
}

export function notifyRateLimit() {
  scheduleReconnect(30000);
}

export function isConnected() {
  return !!es && es.readyState === 1;
}
