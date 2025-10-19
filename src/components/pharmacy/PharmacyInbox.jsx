
import React, { useState, useEffect, useCallback } from 'react';
import { Thread } from '@/api/entities';
import { Message } from '@/api/entities';
import { Loader2, Inbox, CheckCircle, XCircle, Clock, RefreshCw, Search } from 'lucide-react';
import { ChevronUp, ChevronDown } from "lucide-react"; // NEW: icons for collapse/expand
import { Card, CardContent } from '@/components/ui/card';
import { Badge }
  from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatESTDateTime } from '@/components/utils/datetime';
import { Notification } from '@/api/entities';
import { AnimatePresence, motion } from "framer-motion";
import { useUser } from '@/components/context/UserContext';
import { MedicationRequest } from '@/api/entities';
import { Input } from "@/components/ui/input";
import { resolveChatVendorBaseUrl, getChatUrl } from "@/components/utils/chat";
import { PharmacyStats } from '@/api/entities';
import { notifyEvent } from "@/components/utils/realtime"; // Changed from events to notifyEvent
import { ringNotification, primeAudioOnce } from "@/components/utils/sounds"; // Changed from playNotification to ringNotification // MODIFIED: Added primeAudioOnce
import { PharmacyMedicationPrice } from "@/api/entities";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PharmacyHoursConfig from "./PharmacyHoursConfig";
import { subscribe, ensureConnected, notifyRateLimit } from "@/components/utils/sse"; // NEW import for SSE utilities
import PublicInquiries from "./PublicInquiries"; // NEW import for PublicInquiries component
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast"; // NEW: toast hook from shadcn
import { subscribeTo } from '@/realtime/pusher';

// Simplified RequestCard row UI - now shows all meds + per-med price input + reference number
// Change: accept isResponding to control disabled UI/loader, avoid local submit flicker
const RequestCard = ({ request, onRespond, isResponding }) => {
  const [prices, setPrices] = React.useState({}); // per-med prices keyed by med.id/name
  const [statuses, setStatuses] = React.useState({}); // per-med status: Yes | No
  const [presetLoaded, setPresetLoaded] = React.useState(false);
  const user = useUser(); // NEW: use context instead of User.me()

  // Memoize meds to avoid changing reference on every render
  const meds = React.useMemo(() => {
    if (Array.isArray(request.medications) && request.medications.length > 0) {
      return request.medications;
    }
    return request.medicationDetails ? [request.medicationDetails] : [];
  }, [request.medications, request.medicationDetails]);

  const isEmptyMeds = !meds || meds.length === 0;

  // Load pharmacy presets once and prefill blanks
  React.useEffect(() => {
    (async () => {
      if (presetLoaded || isEmptyMeds) return;
      const me = user; // CHANGED: pull from context
      if (!me?.email) { setPresetLoaded(true); return; }
      const presets = await PharmacyMedicationPrice
        .filter({ pharmacy_email: me.email }, undefined, 500)
        .catch(() => []);
      const map = {};
      (Array.isArray(presets) ? presets : []).forEach(p => {
        const key = String(p.medication_key || "").toLowerCase();
        if (!key) return;
        map[key] = typeof p.cash_price === "number" ? p.cash_price : undefined;
      });
      // Build initial price state using med.id or name lowercased
      const init = {};
      meds.forEach((m, idx) => {
        const k = (m.id || m.name || String(idx));
        const norm = String(m.id || m.name || "").toLowerCase();
        const preset = map[norm];
        if (preset != null && preset !== undefined) init[k] = String(preset);
      });
      setPrices(prev => ({ ...init, ...prev }));
      setPresetLoaded(true);
    })();
  }, [presetLoaded, isEmptyMeds, meds, user]); // include user in deps

  const makeMedLabel = (m) => {
    const name = m.brand_name || m.generic_name || m.name || 'Medication';
    const includesCI = (text, part) => (String(text || "")).toLowerCase().includes(String(part || "").toLowerCase());
    const parts = [name];
    if (m.dosage && !includesCI(name, m.dosage)) parts.push(String(m.dosage));
    if (m.form && !includesCI(name, m.form)) parts.push(String(m.form));
    return parts.join(" ").replace(/\s+/g, " ").trim();
  };

  const keyFor = (m, idx) => m.id || m.name || String(idx);

  const handlePriceChange = (key, val) => {
    const cleaned = val.replace(/[^\d.]/g, '').slice(0, 8);
    setPrices((prev) => ({ ...prev, [key]: cleaned }));
  };

  const setMedStatus = (key, value) => {
    setStatuses(prev => ({ ...prev, [key]: value })); // 'Yes' | 'No'
  };

  const canSend = React.useMemo(() => Object.keys(statuses).length > 0, [statuses]);

  const buildPayloads = () => {
    const responses = {};
    const medPrices = {};
    meds.forEach((m, idx) => {
      const k = keyFor(m, idx);
      if (statuses[k]) responses[k] = statuses[k];
      const v = prices[k];
      if (v !== undefined && v !== "") {
        const n = Number(v);
        if (!Number.isNaN(n)) medPrices[k] = n;
      }
    });
    return { responses, medPrices };
  };

  const sendNow = async () => {
    if (isResponding || !canSend) return;
    const { responses, medPrices } = buildPayloads();
    onRespond(request, null, undefined, meds, medPrices, responses);
  };

  // Quick action for single-med requests: clicking a button sends immediately
  const quickSubmitSingle = (status) => {
    if (meds.length !== 1 || isResponding) return;
    const key = keyFor(meds[0], 0);
    setStatuses({ [key]: status });
    const priceVal = prices[key];
    const medPrices = {};
    if (priceVal !== undefined && priceVal !== "") {
      const n = Number(priceVal);
      if (!Number.isNaN(n)) medPrices[n] = n;
    }
    onRespond(request, null, undefined, meds, medPrices, { [key]: status });
  };

  // Single return after all hooks are declared
  if (isEmptyMeds) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      // Make removal instant (no lingering)
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0 } }}
    >
      <Card className="shadow-sm border-l-4 border-indigo-300">
        <CardContent className="p-3">
          {/* Reference number and header */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-indigo-800 bg-indigo-50 border border-indigo-200 rounded px-2 py-0.5">
                Ref #{request?.thread?.reference_number || '—'}
              </span>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-indigo-300 text-indigo-700">
                New
              </Badge>
            </div>
            {isResponding && <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />}
          </div>

          {/* Medications list (compact, single-line names) */}
          <div className="space-y-2">
            {meds.map((m, idx) => {
              const label = makeMedLabel(m);
              const q = typeof m.quantity === 'number' ? m.quantity : null;
              const key = keyFor(m, idx);
              const selected = statuses[key];
              const yesSelected = selected === 'Yes';
              const noSelected = selected === 'No';

              return (
                <div key={key} className={`rounded-md border bg-white/70 p-2 sm:p-2.5 ${yesSelected ? 'ring-2 ring-green-300' : ''} ${noSelected ? 'ring-2 ring-red-300' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    {/* Number + label */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div
                          className="text-sm font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis"
                          title={label}
                        >
                          {label}
                        </div>
                        <div className="text-[11px] text-gray-600">
                          {q != null ? <>Qty: {q}</> : null}
                        </div>
                      </div>
                    </div>

                    {/* Price input */}
                    <div className="w-full sm:w-[120px]">
                      <Input
                        value={prices[key] || ""}
                        onChange={(e) => handlePriceChange(key, e.target.value)}
                        placeholder="$"
                        className="h-9 text-sm"
                        inputMode="decimal"
                        disabled={isResponding}
                      />
                    </div>

                    {/* Per-med actions */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => (meds.length === 1 ? quickSubmitSingle('Yes') : setMedStatus(key, 'Yes'))}
                        size="sm"
                        className={`h-9 px-3 text-sm transition-transform ${yesSelected ? 'bg-green-700 ring-2 ring-green-300 text-white shadow-md scale-[0.98]' : 'bg-green-600 hover:bg-green-700'}`}
                        disabled={isResponding}
                      >
                        {yesSelected ? <CheckCircle className="w-4 h-4 mr-1" /> : null}
                        In Stock
                      </Button>
                      <Button
                        onClick={() => (meds.length === 1 ? quickSubmitSingle('No') : setMedStatus(key, 'No'))}
                        size="sm"
                        className={`h-9 px-3 text-sm transition-transform ${noSelected ? 'bg-red-700 ring-2 ring-red-300 text-white shadow-md scale-[0.98]' : 'bg-red-600 hover:bg-red-700'}`}
                        disabled={isResponding}
                      >
                        {noSelected ? <XCircle className="w-4 h-4 mr-1" /> : null}
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer actions (multi-med submissions) */}
          {meds.length > 1 && (
            <div className="flex justify-end gap-2 mt-3">
              <Button
                onClick={sendNow}
                size="sm"
                className="h-9 px-3 text-sm bg-indigo-600 hover:bg-indigo-700"
                disabled={!canSend || isResponding}
              >
                Send Response
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default function PharmacyInbox() {
  const [requests, setRequests] = useState([]);
  const [pendingFills, setPendingFills] = useState([]);
  const [active, setActive] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [lastChecked, setLastChecked] = useState("");
  const intervalRef = React.useRef(null);
  // Track previous request count safely (fix undefined ref)
  const prevReqCountRef = React.useRef(0);
  // NEW: track previous counts for Pending and a first-load guard
  const prevPendingCountRef = React.useRef(0);
  const firstLoadRef = React.useRef(true);
  // NEW: flag to note that the next refresh was triggered by SSE arrival
  const sseTriggeredRef = React.useRef(false);
  const [expandedReady, setExpandedReady] = useState(new Set());
  const [tab, setTab] = useState('new'); // 'new' | 'pending' | 'ready' | 'public'
  const [pickingUpIds, setPickingUpIds] = useState(new Set()); // NEW: processing state for 'Mark Picked Up'

  // NEW: cache meds per thread to avoid refetching Message for every refresh
  const medsCacheRef = React.useRef(new Map()); // Map<threadId, { meds: any[], msgId: string|null }>

  // NEW: collapse state for Pharmacy Hours (persisted)
  const [hoursCollapsed, setHoursCollapsed] = React.useState(() => {
    try { return localStorage.getItem("rtx_hours_collapsed") === "1"; } catch (e) { console.error("Error reading localStorage for hours_collapsed", e); return false; }
  });

  // NEW: idle detection refs and threshold (5 minutes)
  const idleTimerRef = React.useRef(null);
  const lastActivityRef = React.useRef(Date.now());
  const IDLE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  // NEW: track SSE connection status for fallback polling
  const [sseConnected, setSseConnected] = React.useState(false);

  // NEW: Manual reference lookup dialog state
  const [showFindDialog, setShowFindDialog] = useState(false);
  const [findRef, setFindRef] = useState("");
  const [findLoading, setFindLoading] = useState(false);
  const [findError, setFindError] = useState("");
  const [foundMr, setFoundMr] = useState(null);

  const [isRefreshing, setIsRefreshing] = useState(false); // NEW: manual refresh spinner
  // NEW: track per-request responding to avoid flicker
  const [respondingTo, setRespondingTo] = useState(new Set());
  // NEW: suppress immediate refresh for a short window after responding, to avoid re-appear flicker
  const suppressRefreshUntilRef = React.useRef(0);
  // NEW: throttle event-driven refreshes to once every 5s
  const lastSseRefreshRef = React.useRef(0);

  // NEW: global 429 guard timestamp
  const lastGlobal429Ref = React.useRef(0);

  const user = useUser(); // NEW: use shared user context
  const { toast } = useToast(); // NEW: toast instance

  // NEW: global debounce timer and per-endpoint in-flight + backoff trackers
  const refreshTimerRef = React.useRef(null);
  const inFlightRef = React.useRef({ requests: false, pending: false, active: false });
  const backoffUntilRef = React.useRef({ requests: 0, pending: 0, active: 0 });
  const setBackoff = (key, ms) => {
    const now = Date.now();
    backoffUntilRef.current[key] = Math.max(backoffUntilRef.current[key], now + ms);
  };
  const isBackedOff = (key) => Date.now() < backoffUntilRef.current[key];

  // NEW: coalescing timer for SSE-driven refreshes and a stable ref to the refresh function
  const sseCoalesceTimerRef = React.useRef(null);
  const handleRefreshRef = React.useRef(() => {}); // will be synced to latest handleRefresh

  // NEW: transient promotion lock to prevent bounce-back into Pending
  const promotingReadyRef = React.useRef(new Map()); // id -> expiresAt ms
  const setPromoting = React.useCallback((id, ms = 12000) => {
    if (!id) return;
    promotingReadyRef.current.set(String(id), Date.now() + ms);
  }, []);
  const isPromoting = React.useCallback((id) => {
    if (!id) return false;
    const key = String(id);
    const exp = promotingReadyRef.current.get(key);
    if (!exp) return false;
    if (Date.now() > exp) {
      promotingReadyRef.current.delete(key);
      return false;
    }
    return true;
  }, []);

  // NEW: throttle consecutive full refreshes
  const lastGlobalRefreshRef = React.useRef(0);

  // NEW helpers to build clean labels without duplicating dose/form
  const includesCI = React.useCallback((text, part) => {
    return (String(text || "")).toLowerCase().includes(String(part || "").toLowerCase());
  }, []);

  const buildPendingMedLabel = React.useCallback((m) => {
    const base = (m?.name || "").trim();
    const parts = [base || "Medication"];
    // Only add dosage/form if not already present in the name
    if (m?.dosage && !includesCI(base, m.dosage)) parts.push(String(m.dosage));
    if (m?.form && !includesCI(base, m.form)) parts.push(String(m.form));
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }, [includesCI]);

  const buildDoseOnly = React.useCallback((m) => {
    const base = (m?.name || "").trim();
    const doseParts = [];
    if (m?.dosage && !includesCI(base, m.dosage)) doseParts.push(String(m.dosage));
    if (m?.form && !includesCI(base, m.form)) doseParts.push(String(m.form));
    return doseParts.join(" • ");
  }, [includesCI]);

  // NEW helper: wait for server to confirm 'ready' status before reconciling
  const waitForReadyStatus = React.useCallback(async (requestId, timeoutMs = 10000) => {
    const start = Date.now();
    let attempt = 0;
    while (Date.now() - start < timeoutMs) {
      try {
        const latest = await MedicationRequest.get(requestId);
        if (latest?.status === 'ready') return true;
      } catch (_) {}
      const delay = Math.min(400 + attempt * 200, 1000);
      await new Promise((res) => setTimeout(res, delay));
      attempt++;
    }
    return false;
  }, []);

  // NEW: audio readiness indicator and enabler
  const [audioReady, setAudioReady] = React.useState(() => {
    try { return !!window.__AUDIO_PRIMED; } catch { return false; }
  });
  const enableAudio = React.useCallback(async () => {
    try {
      primeAudioOnce(); // attaches gesture listeners and attempts a silent prime
      // A direct ring on click ensures unlock on this gesture
      await ringNotification({ volume: 1.0 });
      setAudioReady(true);
    } catch {
      setAudioReady(!!window.__AUDIO_PRIMED);
    }
  }, []);

  React.useEffect(() => {
    const onGesture = () => {
      if (!audioReady) {
        primeAudioOnce(); // Just try to prime, don't necessarily play a sound
        setAudioReady(!!window.__AUDIO_PRIMED);
      }
    };
    document.addEventListener("pointerdown", onGesture, { once: true, passive: true });
    document.addEventListener("keydown", onGesture, { once: true });
    return () => {
      document.removeEventListener("pointerdown", onGesture);
      document.removeEventListener("keydown", onGesture);
    };
  }, [audioReady]);

  // Realtime: subscribe to Pusher channels for this pharmacy (frontend-only Phase 1)
  React.useEffect(() => {
    if (!user?.email) return;

    // sanitize email for channel name; backend should use the same scheme
    const channelName = `pharmacy-${String(user.email).replace(/[^a-zA-Z0-9-_]/g, '_')}`;

    const handleIncoming = (payload) => {
      try {
        const title = payload?.title || payload?.summary || 'New request';
        const desc = payload?.body || payload?.message || payload?.description || '';

        // show a toast via existing toast hook
        toast({
          title,
          description: desc,
        });

  // attempt to ensure audio is primed and play the notification ring
  try { primeAudioOnce(); } catch (e) {}
  try { ringNotification({ volume: 1.0 }).catch(()=>{}); } catch (e) {}

        // If payload includes a request object, prepend it to the list for instant UX
        if (payload && payload.request) {
          setRequests((prev) => [payload.request, ...(Array.isArray(prev) ? prev : [])]);
        } else {
          // otherwise trigger a lightweight refresh to fetch latest requests
          try {
            // respect existing refresh/backoff logic by calling the loader directly
            loadActiveRequests(true).catch(() => {});
          } catch (e) {}
        }

        // flash the document title briefly to attract attention
        try {
          const prev = document.title;
          document.title = `🔔 ${title} — ${prev}`;
          setTimeout(() => (document.title = prev), 3500);
        } catch (e) {}
      } catch (e) {
        // keep subscriber resilient
        console.warn('Realtime handler error', e);
      }
    };

    const off1 = subscribeTo(channelName, 'order.created', handleIncoming);
    const off2 = subscribeTo(channelName, 'request.created', handleIncoming);

    return () => {
      try { off1 && off1(); } catch (e) {}
      try { off2 && off2(); } catch (e) {}
    };
  }, [user?.email, toast]);

  const loadActiveRequests = useCallback(async (force = false) => {
    const now = Date.now();
    // NEW: obey global 429 guard for 10s after last hit
    if (now - lastGlobal429Ref.current < 10000) return;

    if (!force && now - lastFetchTime < 5000) return;
    if (inFlightRef.current.requests) return; // Prevent concurrent requests
    if (isBackedOff('requests')) return; // Backed off due to rate limit

    inFlightRef.current.requests = true;
    setLastFetchTime(now);

    if (requests.length === 0) setIsLoading(true);

    try {
      // Use context user instead of fetching every time
      const me = user;
      const filter = me?.pharmacy_name ? { status: 'pending', pharmacy_name: me.pharmacy_name } : { status: 'pending' };
      // NEW: limit number of threads per refresh to reduce load
      const activeThreads = await Thread.filter(filter, '-created_date', 12);

      const requestsWithDetails = await Promise.all(
        activeThreads.map(async (thread) => {
          // Use in-memory cache to avoid re-fetching message on every refresh
          const cache = medsCacheRef.current.get(thread.id);
          if (cache && Array.isArray(cache.meds) && cache.meds.length > 0) {
            return {
              id: thread.id,
              thread: thread,
              medications: cache.meds,
              requestMessageId: cache.msgId || null
            };
          }

          // Fetch the latest stock_check_request message only if not cached
          const messages = await Message.filter(
            { thread_id: thread.id, "payload.type": "stock_check_request" },
            'created_date',
            1
          );
          const requestMessage = messages[0];
          const meds = (requestMessage?.payload?.medications && requestMessage.payload.medications.length > 0)
            ? requestMessage.payload.medications
            : [];

          // Cache for subsequent refreshes
          medsCacheRef.current.set(thread.id, { meds, msgId: requestMessage?.id || null });

          if (meds.length > 0) {
            return {
              id: thread.id,
              thread: thread,
              medications: meds,
              requestMessageId: requestMessage?.id || null
            };
          }
          return null;
        })
      );

      const filtered = requestsWithDetails.filter(Boolean);
      setRequests(filtered);

      // NEW: ring exactly when UI list grows; allow ring even during first load if triggered by SSE
      const grew = filtered.length > prevReqCountRef.current;
      if (grew && (sseTriggeredRef.current || !firstLoadRef.current)) {
        try {
          // Removed ringNotification here as it's now handled immediately by SSE event.
          toast({
            title: "New stock check request",
            description: `You have ${filtered.length - prevReqCountRef.current} new request(s).`
          });
        } catch (_) {}
      }
      // reset the SSE-triggered marker after applying
      sseTriggeredRef.current = false;

      prevReqCountRef.current = filtered.length;
    } catch (error) {
      const msg = String(error?.message || '');
      if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
        // Back off requests for 120s on rate limit
        setBackoff('requests', 120000);
        lastGlobal429Ref.current = Date.now(); // global guard
        notifyRateLimit();
      } else if (error?.statusCode === 403) {
        console.error("Access denied during request loading. Please check user permissions.");
      } else {
        console.error('Failed to load requests:', error);
      }
    } finally {
      inFlightRef.current.requests = false;
      setIsLoading(false);
    }
  }, [lastFetchTime, requests.length, user, toast]); // Removed audioReady from deps as it's not used here for ringing

  const loadPendingFills = useCallback(async () => {
    if (inFlightRef.current.pending) return; // Prevent concurrent requests
    if (isBackedOff('pending')) return; // Backed off due to rate limit

    inFlightRef.current.pending = true;
    try {
      const me = user;
      if (!me?.email) {
        inFlightRef.current.pending = false;
        return;
      }
      const mine = await MedicationRequest.filter({ accepted_pharmacy_email: me.email, status: 'accepted' }, '-created_date');
      const filtered = (mine || []).filter(mr => !isPromoting(mr.id));
      setPendingFills(filtered);

      // ALWAYS ring when new pending fills increased (skip first load)
      if (!firstLoadRef.current && filtered.length > prevPendingCountRef.current) {
        try {
          if (audioReady) { // Only ring if audio is ready
            ringNotification({ volume: 1.0 });
          }
          toast({
            title: "New accepted fill",
            description: `${filtered.length - prevPendingCountRef.current} new prescription(s) were accepted.`
          });
        } catch (_) {}
      }

      prevPendingCountRef.current = filtered.length;
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
        setBackoff('pending', 120000); // 2 minutes
        lastGlobal429Ref.current = Date.now();
        notifyRateLimit();
      } else {
        console.warn("Failed to load pending fills:", msg);
      }
    } finally {
      inFlightRef.current.pending = false;
    }
  }, [user, isPromoting, toast, audioReady]);

  const loadActive = useCallback(async () => {
    if (inFlightRef.current.active) return; // Prevent concurrent requests
    if (isBackedOff('active')) return; // Backed off due to rate limit

    inFlightRef.current.active = true;
    try {
      const me = user;
      if (!me?.email) {
        inFlightRef.current.active = false;
        return;
      }
      const mine = await MedicationRequest.filter({ accepted_pharmacy_email: me.email, status: ['ready', 'fulfilled'] }, '-created_date');
      setActive(mine || []);
    } catch (e) {
      const msg = String(e?.message || '');
      if (msg.includes('429') || msg.toLowerCase().includes('rate')) {
        setBackoff('active', 120000); // 2 minutes
        lastGlobal429Ref.current = Date.now();
        notifyRateLimit();
      } else {
        console.warn("Failed to load active (ready/fulfilled):", msg);
      }
    } finally {
      inFlightRef.current.active = false;
    }
  }, [user]);

  // Debounced + throttled refresh to coalesce multiple triggers and avoid bursts
  const handleRefresh = React.useCallback(() => {
    const now = Date.now();

    // Respect suppression window after actions
    if (now < suppressRefreshUntilRef.current) return;

    // NEW: defer refresh if we just hit a global 429 within last 8s
    if (now - lastGlobal429Ref.current < 8000) return;

    // Throttle global refreshes to at most once every 1.5s
    if (now - lastGlobalRefreshRef.current < 1500) return;
    lastGlobalRefreshRef.current = now;

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = setTimeout(() => {
      setIsRefreshing(true);
      Promise.all([
        loadActiveRequests(true),
        loadPendingFills(),
        loadActive()
      ]).finally(() => {
        setIsRefreshing(false);
        setLastChecked(new Date().toISOString());
        // NEW: after the very first full refresh completes, allow sounds on subsequent changes
        if (firstLoadRef.current) firstLoadRef.current = false;
      });

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 500);
  }, [loadActiveRequests, loadPendingFills, loadActive]);

  // Listen for manual refresh events from page header
  useEffect(() => {
    const onRefresh = () => {
      handleRefresh();
    };
    window.addEventListener('pharmacyRefresh', onRefresh);
    return () => window.removeEventListener('pharmacyRefresh', onRefresh);
  }, [handleRefresh]);

  // Initial load only; no scheduled auto-refresh
  useEffect(() => {
    if (!user?.email) return; // Wait until user is available
    handleRefresh();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); // Clear debounce timer on unmount
    };
  }, [handleRefresh, user]); // Added user to dependencies

  // Keep a stable reference to the latest handleRefresh without re-subscribing SSE
  React.useEffect(() => {
    handleRefreshRef.current = handleRefresh;
  }, [handleRefresh]);

  // Replace SSE effect to include __connected__/__disconnected subscriptions
  React.useEffect(() => {
    if (!user?.email) {
      return;
    }

    // Ensure globals are set before any subscribe (defensive)
    try {
      delete window.__EVENTS_BASE__; // same-origin
      window.__PHARMACY_CHANNEL__ = (user.email || '').trim();
      console.log('[INBOX] Set channel to:', window.__PHARMACY_CHANNEL__);
    } catch (_) {}

    const onNewPharmacyRequest = (evt) => {
      // Ring immediately on event arrival (do not depend on list growth)
      try {
        ringNotification({ volume: 1.0 }); // removed audioReady gate to attempt immediate playback
      } catch (_) {}

      // Mark that this refresh was triggered by SSE so we ring on UI update
      sseTriggeredRef.current = true;

      // Informational toast
      try {
        const p = (evt && typeof evt === 'object' && evt.payload && typeof evt.payload === 'object') ? evt.payload : evt;
        const med = p?.med_name;
        const qty = typeof p?.quantity === "number" ? p.quantity : null;
        const ref = p?.reference_number;
        const count = typeof p?.med_count === "number" && p.med_count > 1 ? p.med_count : undefined;
        const title = "New stock check request";
        const description = [ref ? `Ref #${ref}` : null, med ? (med + (qty ? ` x${qty}` : "")) : null, (!med && typeof count === "number") ? `${count} medications` : null].filter(Boolean).join(" • ");
        toast({ title, description: description || undefined });
      } catch (_) {}

      // Coalesce refresh
      const now = Date.now();
      if (now < suppressRefreshUntilRef.current) return;
      if (now - lastSseRefreshRef.current < 800) return;
      lastSseRefreshRef.current = now;

      if (sseCoalesceTimerRef.current) clearTimeout(sseCoalesceTimerRef.current);
      sseCoalesceTimerRef.current = setTimeout(() => {
        if (typeof handleRefreshRef.current === 'function') {
          handleRefreshRef.current();
        }
      }, 150);
    };

    const onSseError = () => {
      console.warn("[PharmacyInbox] SSE error (no refresh triggered).");
      setSseConnected(false);
    };

    // NEW: listen to ALL events for visibility only (no ring here)
    const unsubAny = subscribe('*', (ev, data) => {
      try { console.log('[INBOX:*] event:', ev, data); } catch (_) {}
    });

    const unsub1 = subscribe('new_pharmacy_request', onNewPharmacyRequest);
    const unsubReq = subscribe('request_update', onNewPharmacyRequest);
    const unsub2 = subscribe('sse_error', onSseError);

    const unsubOpenEvt = subscribe('open', () => {
      setSseConnected(true);
      if (typeof handleRefreshRef.current === 'function') {
        handleRefreshRef.current();
      }
    });
    const unsubClientOpen = subscribe('sse_open', () => setSseConnected(true));
    const unsubClientErr = subscribe('sse_error', () => setSseConnected(false));

    // NEW: subscribe to explicit connection lifecycle events
    const unsubConn = subscribe('__connected__', () => setSseConnected(true));
    const unsubDisc = subscribe('__disconnected__', () => setSseConnected(false));

    ensureConnected();

    return () => {
      // NEW: cleanup for wildcard listener
      unsubAny();
      unsub1();
      unsubReq();
      unsub2();
      unsubOpenEvt();
      unsubClientOpen();
      unsubClientErr();
      // NEW: cleanup for connection lifecycle events
      unsubConn();
      unsubDisc();
      if (sseCoalesceTimerRef.current) {
        clearTimeout(sseCoalesceTimerRef.current);
        sseCoalesceTimerRef.current = null;
      }
    };
  }, [user?.email, toast, handleRefreshRef ]); // removed audioReady from deps since we don't gate ring
  
  // NEW: Fallback polling when SSE is not connected (every 60s, only when tab is visible)
  React.useEffect(() => {
    let id = null;
    const startPolling = () => {
      if (id) return; // Polling already active
      id = setInterval(() => {
        // Only poll if the tab is visible to save resources
        if (document.visibilityState !== 'visible') {
          return;
        }
        if (typeof handleRefreshRef.current === 'function') {
          handleRefreshRef.current();
        }
      }, 60000); // Poll every 60 seconds (was 10s)
    };

    const stopPolling = () => {
      if (id) {
        clearInterval(id);
        id = null;
      }
    };

    if (!sseConnected) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling; // Cleanup on component unmount or sseConnected change
  }, [sseConnected]);

  // NEW: persist hours collapse choice
  const toggleHours = React.useCallback(() => {
    setHoursCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("rtx_hours_collapsed", next ? "1" : "0"); } catch (e) { console.error("Error writing localStorage for hours_collapsed", e); return next; }
      return next;
    });
  }, []);

  // NEW: user activity listeners to reset idle timer
  React.useEffect(() => {
    const onActivity = () => { lastActivityRef.current = Date.now(); };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    return () => { events.forEach((ev) => window.removeEventListener(ev, onActivity)); };
  }, []);

  // NEW: periodic idle check; if idle and on "new" tab, scroll that section into view
  React.useEffect(() => {
    const checkIdle = () => {
      if (Date.now() - lastActivityRef.current > IDLE_THRESHOLD) {
        if (tab === "new" && requests.length > 0) {
          const el = document.getElementById("new-requests-section");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };
    idleTimerRef.current = setInterval(checkIdle, 10_000); // Check every 10 seconds
    return () => { if (idleTimerRef.current) clearInterval(idleTimerRef.current); };
  }, [tab, requests.length]); // Depend on tab and requests.length to re-evaluate scroll condition

  const incrementStats = async ({ email, name, field }) => {
    if (!email) return;
    const now = new Date().toISOString();
    let rec = null;
    try {
      const list = await PharmacyStats.filter({ pharmacy_email: email }, undefined, 1);
      rec = list?.[0] || null;
    } catch (_) {}
    if (!rec) {
      const base = {
        pharmacy_email: email,
        pharmacy_name: name || 'Pharmacy',
        yes_responses: 0,
        accepted_responses: 0,
        ready_count: 0,
        fulfilled_count: 0,
        false_positive_count: 0,
        accuracy_score: 0,
        last_updated: now
      };
      base[field] = 1;
      await PharmacyStats.create(base);
    } else {
      const update = { ...rec };
      update[field] = Number(rec[field] || 0) + 1;
      const yes = Number(update.yes_responses || rec.yes_responses || 0);
      const fulfilled = Number(update.fulfilled_count || rec.fulfilled_count || 0);
      update.accuracy_score = yes > 0 ? fulfilled / yes : 0;
      update.last_updated = now;
      await PharmacyStats.update(rec.id, update);
    }
  };

  const handleRespond = async (request, status, cashPrice, medsOverride, medPrices, responsesOverride) => {
    // Suppress refreshes briefly to avoid re-appearance due to eventual consistency
    suppressRefreshUntilRef.current = Date.now() + 2000;

    setRespondingTo(prev => {
      const next = new Set(prev);
      next.add(request.id);
      return next;
    });

    const meds = Array.isArray(medsOverride) && medsOverride.length ? medsOverride : (request.medications || []);
    let responses = responsesOverride || {};
    if (!responses || Object.keys(responses).length === 0) {
      // Fallback: if a global status was passed, apply to all meds
      const isYesGlobal = status === 'Yes' || status === 'yes' || status === 'In Stock';
      responses = meds.reduce((acc, m, idx) => {
        const key = m.id || m.name || String(idx);
        acc[key] = isYesGlobal ? 'Yes' : 'No';
        return acc;
      }, {});
    }

    // Aggregate for overall status
    const vals = Object.values(responses);
    const anyYes = vals.includes('Yes');
    const allNo = vals.length > 0 && vals.every(v => v === 'No');

    try {
      const responsePayload = {
        type: 'availability_response',
        request_id: request.requestMessageId,
        responses, // per-med Yes/No
        med_prices: medPrices || {}
      };

      await Message.create({
        thread_id: request.thread.id,
        author: 'pharmacy',
        payload: responsePayload
      });

      if (request.thread.prescriber_email) {
        const title = `Stock Response from ${request.thread.pharmacy_name || 'Pharmacy'}`;
        await Notification.create({
          user_email: request.thread.prescriber_email,
          recipient_role: 'prescriber',
          title,
          link_to_thread_id: request.thread.id,
          meta: {
            reference_number: request.thread.reference_number || null,
            in_stock: anyYes,
            med_names: meds.map(m => m.brand_name || m.generic_name || m.name).slice(0, 3)
          }
        });
      }

      await Thread.update(request.thread.id, { status: 'answered', prescriber_read: false });

      if (request.thread.medication_request_id) {
        const mr = await MedicationRequest.get(request.thread.medication_request_id);

        // Compute summary cash_price from per-med prices for prescriber display
        let computedCash = null;
        if (medPrices && typeof medPrices === "object") {
          const sum = Object.values(medPrices)
            .map(v => Number(v))
            .filter(v => Number.isFinite(v))
            .reduce((a, b) => a + b, 0);
          computedCash = Number.isFinite(sum) && sum > 0 ? sum : null;
        }

        // Attach coupon/discount and scheduling URL (from user context)
        const hours = user?.hours_of_operation || null; // Use user from context
        const couponUrl = user?.pharmacy_coupon_url || null;
        const discountInfo = user?.pharmacy_discount_info || null;
        const schedulingUrl = user?.pharmacy_scheduling_url || null;

        const updatedResponses = (mr.pharmacy_responses || []).map((r) =>
          r.thread_id === request.thread.id
            ? {
                ...r,
                status: anyYes ? 'in_stock' : (allNo ? 'out_of_stock' : 'pending'),
                response_date: new Date().toISOString(),
                med_prices: { ...(r.med_prices || {}), ...(medPrices || {}) },
                cash_price: computedCash != null ? computedCash : (r.cash_price ?? null),
                pharmacy_name: request.thread.pharmacy_name || r.pharmacy_name,
                operating_hours: hours || r.operating_hours || null,
                pharmacy_coupon_url: couponUrl || r.pharmacy_coupon_url || null,
                pharmacy_discount_info: discountInfo || r.pharmacy_discount_info || null,
                pharmacy_scheduling_url: schedulingUrl || r.pharmacy_scheduling_url || null
              }
            : r
        );
        const nextStatus = anyYes ? 'has_in_stock' : (allNo ? 'no_stock' : 'pending');

        await MedicationRequest.update(mr.id, {
          pharmacy_responses: updatedResponses,
          status: nextStatus
        });
      }

      // Push realtime update to prescriber via SSE (best-effort)
      try {
        const mrLatest = request.thread.medication_request_id ? await MedicationRequest.get(request.thread.medication_request_id) : null;
        const badgeStatus = anyYes ? 'options_available' : (mrLatest?.status === 'ready' ? 'ready' : 'waiting');
        // FIX: use mrLatest instead of undefined 'mr'
        const medDisplayForSSE = (mrLatest?.medications && mrLatest.medications[0]?.name) || mrLatest?.medication_name || 'Medication';
        if (request.thread?.prescriber_email) {
          await notifyEvent({
            channel: request.thread.prescriber_email,
            event: 'request_update',
            payload: {
              requestId: mrLatest?.id || request.thread.medication_request_id,
              status: badgeStatus,
              med_name: medDisplayForSSE,
              updated_at: new Date().toISOString()
            }
          });
        }
      } catch (_) {}

      // Stats
      if (anyYes && user?.email) { // Use user from context
        await incrementStats({ email: user.email, name: user.pharmacy_name, field: 'yes_responses' });
      }

      // Remove from list after successful backend operations
      setRequests(prev => prev.filter(r => r.id !== request.id));
      // Remove from cache as well
      medsCacheRef.current.delete(request.id);

      // Refresh other sections quietly (do not refresh new requests here to avoid flicker)
      loadPendingFills();
      loadActive();
    } catch (error) {
      console.error('Failed to send stock response:', error);
      const msg = String(error?.message || '');
      if (msg.includes('Rate limit') || error?.statusCode === 429) {
        notifyRateLimit();
      }
      // keep card visible; optionally show a toast here
    } finally {
      setRespondingTo(prev => {
        const next = new Set(prev);
        next.delete(request.id);
        return next;
      });
    }
  };

  const markReady = async (mr) => {
    // Prevent auto-refresh temporarily and set promotion lock (avoid bounce-back)
    suppressRefreshUntilRef.current = Date.now() + 4000;
    setPromoting(mr.id, 12000);

    // Optimistic UI
    setPendingFills(prev => prev.filter(p => p.id !== mr.id));
    setActive(prev => [{ ...mr, status: 'ready' }, ...prev.filter(a => a.id !== mr.id)]);
    setTab('ready');

    try {
      await MedicationRequest.update(mr.id, { status: 'ready' });

      // Expire other pharmacy threads (best-effort)
      try {
        const acceptedId = mr.accepted_pharmacy_thread_id || null;
        const threads = await Thread.filter({ medication_request_id: mr.id });
        const others = (Array.isArray(threads) ? threads : []).filter(t => String(t.id) !== String(acceptedId));
        await Promise.all(others.map(t => Thread.update(t.id, { status: 'expired' })));
      } catch (expireErr) {
        console.warn('Failed to expire other pharmacy threads:', expireErr);
      }

      // Notify prescriber
      if (mr.prescriber_email) {
        await Notification.create({
          user_email: mr.prescriber_email,
          recipient_role: 'prescriber',
          title: 'Prescription Ready for Pickup',
          link_to_thread_id: mr.accepted_pharmacy_thread_id || null,
          meta: {
            reference_number: mr.reference_number || null,
            status: 'ready',
            med_names: (mr.medications || []).map(m => m.name).slice(0, 3)
          }
        });
        const medDisplayForSSE = (mr.medications && mr.medications[0]?.name) || mr.medication_name || 'Medication';
        await notifyEvent({
          channel: mr.prescriber_email,
          event: 'request_update',
          payload: {
            requestId: mr.id,
            status: 'ready',
            med_name: medDisplayForSSE,
            updated_at: new Date().toISOString()
          }
        });
      }

      if (user?.email) {
        await incrementStats({ email: user.email, name: user.pharmacy_name, field: 'ready_count' });
      }

      // NEW: explicitly wait for server to confirm 'ready' to avoid bounce-back to Pending
      const confirmed = await waitForReadyStatus(mr.id, 10000);

      // Schedule a single reconciliation refresh after suppression window ends
      const scheduleRefresh = () => {
        handleRefresh();
      };
      const delay = suppressRefreshUntilRef.current - Date.now();
      if (delay > 0) {
        setTimeout(scheduleRefresh, delay + 50);
      } else {
        scheduleRefresh();
      }

      if (!confirmed) {
        // If not confirmed by server within timeout, keep optimistic UI; reconciliation will fix later.
        console.warn('[PharmacyInbox] Ready confirmation timed out; relying on next refresh.');
      }
    } catch (e) {
      console.error('Failed to mark ready:', e);
      const msg = String(e?.message || '');
      if (msg.includes('Rate limit') || e?.statusCode === 429) {
        notifyRateLimit();
      }
      // Rollback optimistic changes
      promotingReadyRef.current.delete(String(mr.id));
      setActive(prev => prev.filter(a => a.id !== mr.id));
      setPendingFills(prev => [mr, ...prev]);
      setTab('pending');
    }
  };

  // NEW: mark picked up — delete request and refresh WITH immediate UI feedback
  const markPickedUp = async (mr) => {
    // Visually mark processing on this card's button immediately
    setPickingUpIds(prev => {
      const next = new Set(prev);
      next.add(mr.id);
      return next;
    });

    // Optimistic: remove from active immediately
    setActive(prev => prev.filter(a => a.id !== mr.id));
    try {
      await MedicationRequest.update(mr.id, { status: 'fulfilled' });
      if (user?.email) { // Use user from context
        await incrementStats({ email: user.email, name: user.pharmacy_name, field: 'fulfilled_count' });
      }
      // Refresh lists (debounced)
      handleRefresh();
    } catch (e) {
      console.error('Failed to mark picked up:', e);
      const msg = String(e?.message || '');
      if (msg.includes('Rate limit') || e?.statusCode === 429) {
        notifyRateLimit();
      }
      // restore if failed
      setActive(prev => [mr, ...prev]);
    } finally {
      // Clear processing state for this id
      setPickingUpIds(prev => {
        const next = new Set(prev);
        next.delete(mr.id);
        return next;
      });
    }
  };

  // NEW: Search by reference number and show details in dialog
  const handleFindSearch = async () => {
    setFindError("");
    const ref = (findRef || "").trim();
    if (!ref) {
      setFindError("Please enter a reference number.");
      return;
    }
    setFindLoading(true);
    try {
      const list = await MedicationRequest.filter({ reference_number: ref }, undefined, 1);
      if (Array.isArray(list) && list.length > 0) {
        setFoundMr(list[0]);
      } else {
        setFoundMr(null);
        setFindError("Request not found. Please check the reference number.");
      }
    } catch (e) {
      setFoundMr(null);
      setFindError("Search failed. Please try again.");
    } finally {
      setFindLoading(false);
    }
  };

  // NEW: Mark picked up from the dialog (set to fulfilled)
  const handleDialogPickedUp = async () => {
    if (!foundMr) return;
    setFindLoading(true);
    try {
      await MedicationRequest.update(foundMr.id, { status: 'fulfilled' });
      // Optimistically update local lists and refresh
      setActive(prev => prev.filter(a => a.id !== foundMr.id));
      setPendingFills(prev => prev.filter(p => p.id !== foundMr.id));
      setRequests(prev => prev.filter(r => r.id !== foundMr.id));
      setShowFindDialog(false);
      setFoundMr(null);
      setFindRef("");
      handleRefresh();
    } catch (e) {
      setFindError("Failed to mark as picked up. Please try again.");
    } finally {
      setFindLoading(false);
    }
  };

  const openChat = async (mr) => {
    const base = await resolveChatVendorBaseUrl();
    const r = mr.pharmacy_responses?.find(rp => rp.thread_id === mr.accepted_pharmacy_thread_id);
    const url = getChatUrl({
      pharmacyName: r?.pharmacy_name,
      pharmacyEmail: mr.accepted_pharmacy_email,
      prescriberEmail: mr.prescriber_email,
      requestId: mr.id,
      medicationName: (mr.medications && mr.medications[0]?.name) || mr.medication_name,
      ready: true,
      price: typeof r?.cash_price === 'number' ? r.cash_price : undefined, // Still uses cash_price if available
      address: r?.address || undefined
    });
    window.open(url || base, '_blank');
  };

  const FillCountdown = ({ acceptedDate }) => {
    const [remaining, setRemaining] = useState(0);
    useEffect(() => {
      if (!acceptedDate) {
        setRemaining(0);
        return;
      }
      const tick = () => {
        const start = new Date(acceptedDate).getTime();
        const now = Date.now();
        const totalDurationMs = 60 * 60 * 1000;
        const elapsedMs = now - start;
        setRemaining(Math.max(0, Math.floor((totalDurationMs - elapsedMs) / 1000)));
      };
      tick();
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }, [acceptedDate]);

    const mm = Math.floor(remaining / 60);
    const ss = remaining % 60;
    return (
        <span className={remaining <= 0 ? "text-red-600 font-semibold" : "text-gray-700"}>
            {mm}:{String(ss).padStart(2, '0')}
        </span>
    );
  };

  // State for the new sound test button
  const [isTestingSound, setIsTestingSound] = useState(false);

  // Function to handle the sound test
  const handleTestSound = async () => {
    setIsTestingSound(true);
    try {
      await ringNotification({ volume: 1.0 });
      toast({ title: "Sound test", description: "Notification sound played." });
    } catch (e) {
      console.error("Failed to play test sound:", e);
      toast({ title: "Sound test failed", description: "Could not play notification sound.", variant: "destructive" });
    } finally {
      // Keep button disabled for a short period to prevent rapid clicks
      setTimeout(() => setIsTestingSound(false), 1500);
    }
  };

  // Dashboard rendering: Tabs for New | Pending | Ready | Public
  const readyItems = active.filter(a => a.status === 'ready');

  return (
    <div className="space-y-6">
      {/* Hours section with collapse/expand for pharmacy staff */}
      {user?.user_role === "pharmacy_staff" ? (
        <div className="bg-white rounded-lg border">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-sm font-semibold text-gray-800">Pharmacy Hours</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleHours}
              className="text-gray-600"
              title={hoursCollapsed ? "Show hours" : "Hide hours"}
            >
              {hoursCollapsed ? <><ChevronDown className="w-4 h-4 mr-1" /> Show</> : <><ChevronUp className="w-4 h-4 mr-1" /> Hide</>}
            </Button>
          </div>
          {!hoursCollapsed && (
            <div className="px-3 pb-3">
              <PharmacyHoursConfig />
            </div>
          )}
        </div>
      ) : (
        // fallback: keep old behavior for non-staff roles
        <PharmacyHoursConfig />
      )}

      {/* NEW: Find Request and Test Sound button row + Audio enable indicator */}
      <div className="flex items-center justify-start gap-2">
        <Button
          variant="secondary"
          className="gap-2"
          onClick={() => { setShowFindDialog(true); setFindError(""); setFoundMr(null); setFindRef(""); }}
        >
          <Search className="w-4 h-4" />
          Find Request
        </Button>

        <Button
          variant="secondary"
          className="gap-2"
          onClick={handleTestSound}
          disabled={isTestingSound}
        >
          {isTestingSound ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Test Sound
        </Button>

        {!audioReady && (
          <Button variant="secondary" className="gap-2" onClick={enableAudio} title="Enable notification sound">
            Enable Sound
          </Button>
        )}
      </div>

      {/* Top controls with SSE indicator + audio status */}
      <div className="flex items-center justify-end gap-3 text-xs text-gray-500">
        <span className={`inline-flex items-center gap-1 ${sseConnected ? 'text-green-600' : 'text-amber-600'}`} title="Realtime connection status">
          <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-green-500' : 'bg-amber-500'}`}></span>
          {sseConnected ? 'Live' : 'Reconnecting'}
        </span>
        <span className={`inline-flex items-center gap-1 ${audioReady ? 'text-green-600' : 'text-amber-600'}`} title="Audio status">
          <span className={`w-2 h-2 rounded-full ${audioReady ? 'bg-green-500' : 'bg-amber-500'}`}></span>
          {audioReady ? 'Sound Ready' : 'Sound Off'}
        </span>
        <span>Last checked: {lastChecked ? new Date(lastChecked).toLocaleTimeString() : '-'}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} title="Refresh" disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="new" className="relative">
            New Requests
            {requests.length > 0 && (
              <span className="ml-2 text-[10px] bg-indigo-600 text-white rounded-full px-2 py-0.5">{requests.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending Fills
            {pendingFills.length > 0 && (
              <span className="ml-2 text-[10px] bg-blue-600 text-white rounded-full px-2 py-0.5">{pendingFills.length}</span>
            )}
          </TabsTrigger>
        <TabsTrigger value="ready" className="relative">
            Ready
            {readyItems.length > 0 && (
              <span className="ml-2 text-[10px] bg-green-600 text-white rounded-full px-2 py-0.5">{readyItems.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="public" className="relative">
            Public Inquiries
          </TabsTrigger>
        </TabsList>

        {/* Moved New Requests content out of TabsList to fix layout distortion */}
        <TabsContent value="new" className="mt-2">
          {isLoading && requests.length === 0 ? (
            <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin"/></div>
          ) : requests.length > 0 ? (
            <div id="new-requests-section" className="space-y-3">
              <AnimatePresence>
                {requests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onRespond={handleRespond}
                    isResponding={respondingTo.has(request.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed">
              <Inbox className="w-10 h-10 text-gray-400 mx-auto mb-3"/>
              <p className="text-gray-600">No pending requests.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-2">
          {pendingFills.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <Inbox className="w-10 h-10 text-gray-400 mx-auto mb-3"/>
              <p className="text-gray-600">Accepted requests will appear here with a 60-minute timer.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingFills.map((mr) => {
                const medsList = Array.isArray(mr.medications) && mr.medications.length > 0
                  ? mr.medications
                  : (mr.medication_name ? [{ name: mr.medication_name, dosage: mr.dosage, quantity: mr.quantity }] : []);
                const resp = mr.pharmacy_responses?.find(r => r.thread_id === mr.accepted_pharmacy_thread_id);
                const sumMedPrices = (mp) => {
                  if (!mp || typeof mp !== "object") return null;
                  const vals = Object.values(mp)
                    .map(v => typeof v === 'string' ? parseFloat(v) : Number(v)) // Ensure values are numbers before summing
                    .filter(v => Number.isFinite(v));
                  if (vals.length === 0) return null;
                  return vals.reduce((a,b)=>a+b, 0);
                };
                const price = Number.isFinite(resp?.cash_price) ? resp.cash_price : sumMedPrices(resp?.med_prices);

                return (
                  <Card key={mr.id} className="shadow-sm border-blue-200">
                    <CardContent className="p-4">
                      <div className="mb-3 px-3 py-2 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-sm font-medium">
                        Prescriber has chosen you to fill this prescription.
                      </div>

                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          {mr.reference_number && (
                            <div className="text-sm text-gray-600 mb-1 font-mono">Ref #{mr.reference_number}</div>
                          )}

                          {/* Cleaner, tighter inline layout: Name • Dose/Form • Qty */}
                          <ul className="mt-1 text-sm space-y-1">
                            {medsList.map((m, idx) => {
                              const label = buildPendingMedLabel(m);
                              const doseOnly = buildDoseOnly(m);
                              return (
                                <li key={idx} className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                  <div className="min-w-0 flex items-baseline flex-wrap gap-x-2 gap-y-0.5 w-full">
                                    <span
                                      className="font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                                      title={label}
                                    >
                                      {label}
                                    </span>
                                    {doseOnly ? (
                                      <span className="text-gray-600 text-xs sm:text-sm whitespace-nowrap">• {doseOnly}</span>
                                    ) : null}
                                    {typeof m.quantity === 'number' ? (
                                      <span className="text-gray-700 text-xs sm:text-sm whitespace-nowrap">• Qty: {m.quantity}</span>
                                    ) : null}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>

                          {Number.isFinite(price) && (
                            <div className="mt-3">
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900">
                                <span className="text-[11px] uppercase tracking-wide font-semibold">Total</span>
                                <span className="text-lg font-extrabold">${Number(price).toFixed(2)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs text-gray-500 mt-1">
                            <Clock className="inline w-3.5 h-3.5 mr-1" />
                            <FillCountdown acceptedDate={mr.accepted_date} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => openChat(mr)}>Open Chat</Button>
                        <Button size="sm" onClick={() => markReady(mr)} className="bg-green-600 hover:bg-green-700">Mark Ready</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ready" className="mt-2">
          {readyItems.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-sm">Requests marked ready will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {readyItems.map((mr) => {
                const expanded = expandedReady.has(mr.id);
                const toggle = () => {
                  setExpandedReady(prev => {
                    const next = new Set(prev);
                    if (next.has(mr.id)) next.delete(mr.id); else next.add(mr.id);
                    return next;
                  });
                };
                const processing = pickingUpIds.has(mr.id); // NEW: per-card processing flag
                return (
                  <Card key={mr.id} className="shadow-sm border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <div className="text-sm text-gray-600 mb-1">Ref #{mr.reference_number || '—'}</div>
                          <div className="font-semibold text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                            {(mr.medications && mr.medications[0]?.name) || mr.medication_name || 'Medication'}
                          </div>
                          <button className="text-xs text-blue-600 mt-1" onClick={toggle}>
                            {expanded ? 'Hide details' : 'Show details'}
                          </button>
                          {expanded && (
                            <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
                              {(mr.medications || []).map((m, i) => (
                                <li key={i}>
                                  <span className="font-medium">{m.name || 'Medication'}</span>
                                  {m.dosage ? ` — ${m.dosage}` : ''}{typeof m.quantity === 'number' ? ` • Qty: ${m.quantity}` : ''}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className="bg-green-100 text-green-800">Ready</Badge>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => markPickedUp(mr)}
                            disabled={processing}
                            className={processing ? 'opacity-60 pointer-events-none' : ''}
                          >
                            {processing ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              'Mark Picked Up'
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="public" className="mt-2">
          <PublicInquiries />
        </TabsContent>
      </Tabs>

      {/* NEW: Manual Reference Lookup Dialog */}
      <Dialog open={showFindDialog} onOpenChange={(v) => { setShowFindDialog(v); if (!v) { setFoundMr(null); setFindRef(""); setFindError(""); } }}>
        <DialogContent className="w-[min(92vw,28rem)]">
          <DialogHeader>
            <DialogTitle>Find Request by Reference #</DialogTitle>
            <DialogDescription>Enter the reference number shown on the patient&apos;s page.</DialogDescription>
          </DialogHeader>

          {!foundMr ? (
            <div className="space-y-3">
              <Input
                value={findRef}
                onChange={(e) => setFindRef(e.target.value)}
                placeholder="e.g. ABC12"
                className="h-10"
                inputMode="text"
                autoFocus
              />
              {findError ? <div className="text-sm text-red-600">{findError}</div> : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border p-3">
                <div className="text-sm text-gray-700">
                  <div className="font-semibold mb-1">Reference: {foundMr.reference_number || '—'}</div>
                  <div className="text-xs text-gray-600 mb-2">Verify details with the patient, then mark picked up.</div>
                  <ul className="text-sm space-y-1">
                    {(Array.isArray(foundMr.medications) && foundMr.medications.length > 0
                      ? foundMr.medications
                      : (foundMr.medication_name ? [{ name: foundMr.medication_name, dosage: foundMr.dosage, quantity: foundMr.quantity }] : [])
                    ).map((m, i) => (
                      <li key={i}>
                        <span className="font-medium">{m.name || 'Medication'}</span>
                        {m.dosage ? ` — ${m.dosage}` : ''}{m.form ? ` • ${m.form}` : ''}{typeof m.quantity === 'number' ? ` • Qty: ${m.quantity}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {findError ? <div className="text-sm text-red-600">{findError}</div> : null}
            </div>
          )}

          <DialogFooter className="flex justify-end gap-2">
            {!foundMr ? (
              <>
                <Button variant="secondary" onClick={() => setShowFindDialog(false)}>Cancel</Button>
                <Button onClick={handleFindSearch} disabled={findLoading}>
                  {findLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Search
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => { setFoundMr(null); setFindError(""); }}>Back</Button>
                <Button variant="secondary" onClick={() => setShowFindDialog(false)}>Close</Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleDialogPickedUp} disabled={findLoading}>
                  {findLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Mark Picked Up
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
