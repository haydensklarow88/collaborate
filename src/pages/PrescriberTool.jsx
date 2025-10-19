
import React from 'react';
import { MedicationRequest } from '@/api/entities';
import { User } from '@/api/entities';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw } from "lucide-react";
import { formatESTDate } from "@/components/utils/datetime";
import { createPageUrl } from '@/utils';
import { Checkbox } from "@/components/ui/checkbox";
import { subscribe, ensureConnected, isConnected } from "@/components/utils/sse"; // Modified: added isConnected
import { ringNotification } from "@/components/utils/sounds"; // NEW: sound on updates
import { useNavigate } from 'react-router-dom';

// Protect specific reference numbers from deletion
const PROTECTED_REF = 'UOAKO';

export default function PrescriberTool() {
  const [me, setMe] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [tab, setTab] = React.useState('active'); // 'active' | 'completed'
  const [q, setQ] = React.useState('');
  const [lastChecked, setLastChecked] = React.useState(new Date().toISOString());
  const [selectedIds, setSelectedIds] = React.useState(new Set());

  const load = React.useCallback(async () => {
    const u = await User.me().catch(() => null);
    // Redirect unauthenticated users to sign in (except preview mode)
    const params = new URLSearchParams(window.location.search);
    if (!u && !params.has('hide_badge')) {
      navigate(createPageUrl('signin'));
      return;
    }

    setMe(u || null);
    if (!u?.email) { setItems([]); return; }

    const emailFilter = (u.user_role === 'prescriber_staff' && u.delegated_by) ? u.delegated_by : u.email;
    const list = await MedicationRequest.filter({ prescriber_email: emailFilter }, "-created_date", 100).catch(() => []);
    setItems(Array.isArray(list) ? list : []);
    setLastChecked(new Date().toISOString());
  }, []);

  React.useEffect(() => { load(); }, [load]);

  // Replaced custom EventSource with shared SSE subscription for instant updates
  React.useEffect(() => {
    // Subscribe to request updates targeted to the prescriber
    const onUpdate = (evt) => {
      try {
        const requestId = evt?.requestId || evt?.request_id || evt?.requestID;
        const status = (evt?.status || '').toLowerCase(); // Ensure status is lowercased for consistent comparison
        if (!requestId) return;

        // Update the polling ref to keep it in sync with SSE updates
        lastSeenStatusesRef.current.set(requestId, status);

        setItems((prev) =>
          prev.map((r) => {
            if (String(r.id) !== String(requestId)) return r;
            const next = { ...r };
            if (status === 'options_available' && r.status === 'pending') next.status = 'has_in_stock';
            if (status === 'ready') next.status = 'ready';
            if (status === 'accepted') next.status = 'accepted'; // Added for accepted status
            return next;
          })
        );

        // Play a sound for meaningful milestones
        if (status === 'options_available' || status === 'accepted' || status === 'ready') {
          try {
            ringNotification({ volume: 1.0 });
          } catch (_) {}
        }

        setLastChecked(new Date().toISOString());
      } catch (_) {}
    };

    const unsub = subscribe('request_update', onUpdate);
    ensureConnected();

    return () => {
      unsub();
    };
  }, []);

  // NEW: fallback polling when SSE is not connected; ring on meaningful status transitions
  const lastSeenStatusesRef = React.useRef(new Map()); // id -> status

  React.useEffect(() => {
    if (!me?.email) return;

    let id = null;
    const poll = async () => {
      try {
        // If SSE is connected, skip polling
        if (isConnected()) return;

        const emailFilter = (me.user_role === 'prescriber_staff' && me.delegated_by) ? me.delegated_by : me.email;
        const list = await MedicationRequest.filter({ prescriber_email: emailFilter }, "-created_date", 100).catch(() => []);

        // Detect transitions to options_available/accepted/ready and ring once per change
        const transitions = [];
        const map = lastSeenStatusesRef.current;
        for (const r of (list || [])) {
          const prev = map.get(r.id);
          const curr = (r.status || '').toLowerCase();
          // Track a few important transitions
          const becameOptions = curr === 'has_in_stock' && prev !== 'has_in_stock';
          const becameAccepted = curr === 'accepted' && prev !== 'accepted';
          const becameReady = curr === 'ready' && prev !== 'ready';
          if (becameOptions || becameAccepted || becameReady) {
            transitions.push({ id: r.id, curr });
          }
          map.set(r.id, curr);
        }

        if (transitions.length > 0) {
          try { ringNotification({ volume: 1.0 }); } catch (_) {}
        }

        setItems(Array.isArray(list) ? list : []);
        setLastChecked(new Date().toISOString());
      } catch (_) {
        // swallow; next tick will retry
      }
    };

    // First snapshot to seed lastSeenStatusesRef without ringing
    (async () => {
      try {
        const emailFilter = (me.user_role === 'prescriber_staff' && me.delegated_by) ? me.delegated_by : me.email;
        const list = await MedicationRequest.filter({ prescriber_email: emailFilter }, "-created_date", 100).catch(() => []);
        const map = lastSeenStatusesRef.current;
        (list || []).forEach(r => map.set(r.id, (r.status || '').toLowerCase()));
      } catch (_) {}
    })();

    id = setInterval(poll, 12000); // every 12 seconds
    return () => { if (id) clearInterval(id); };
  }, [me]);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    const byTab = items.filter((r) => {
      const active = new Set(['pending','has_in_stock','accepted','ready']);
      const completed = new Set(['fulfilled','no_stock']);
      return tab === 'active' ? active.has(r.status) : completed.has(r.status || '');
    });
    if (!query) return byTab;
    return byTab.filter((r) => {
      const meds = Array.isArray(r.medications) && r.medications.length ? r.medications.map(m=>m.name).join(' ') : (r.medication_name || '');
      const text = `${r.reference_number || ''} ${meds}`.toLowerCase();
      return text.includes(query);
    });
  }, [items, tab, q]);

  const navigate = useNavigate();
  const goNew = () => { navigate(createPageUrl('PrescriberToolNew')); };
  const goRequest = (id) => { navigate(createPageUrl(`PrescriberRequest?requestId=${encodeURIComponent(id)}`)); };

  const isCompletedTab = tab === 'completed';

  const toggleSelect = (id, checked) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!isCompletedTab) return;
    // Exclude protected reference UOAKO from selection
    const ids = filtered
      .filter(r => String(r.reference_number || '') !== PROTECTED_REF)
      .map(r => r.id);
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(ids));
  };

  const deleteSelected = async () => {
    if (!isCompletedTab || selectedIds.size === 0) return;

    // Build lists for protection and deletion
    const protectedIds = new Set(
      items.filter(r => String(r.reference_number || '') === PROTECTED_REF).map(r => r.id)
    );
    const deletable = Array.from(selectedIds).filter(id => !protectedIds.has(id));

    if (deletable.length === 0) {
      window.alert('This item cannot be deleted at this time.');
      return;
    }
    if (protectedIds.size > 0 && Array.from(selectedIds).some(id => protectedIds.has(id))) {
      window.alert(`A protected request (${PROTECTED_REF}) was excluded and will not be deleted.`);
    }

    const ok = window.confirm(`Delete ${deletable.length} selected request(s)? This cannot be undone.`);
    if (!ok) return;

    for (const id of deletable) {
      try { await MedicationRequest.delete(id); } catch (_) {}
    }
    setItems(prev => prev.filter(r => !deletable.includes(r.id)));
    setSelectedIds(new Set());
  };

  const deleteAll = async () => {
    if (!isCompletedTab || filtered.length === 0) return;

    // Exclude protected reference UOAKO
    const deletable = filtered.filter(r => String(r.reference_number || '') !== PROTECTED_REF);

    if (deletable.length === 0) {
      window.alert('This item cannot be deleted at this time.');
      return;
    }
    if (deletable.length < filtered.length) {
      window.alert(`A protected request (${PROTECTED_REF}) was excluded and will not be deleted.`);
    }

    const ok = window.confirm(`Delete all ${deletable.length} completed request(s)? This cannot be undone.`);
    if (!ok) return;

    for (const r of deletable) {
      try { await MedicationRequest.delete(r.id); } catch (_) {}
    }
    setItems(prev => prev.filter(r => !deletable.some(dr => dr.id === r.id)));
    setSelectedIds(new Set());
  };

  return (
    <div className="page px-3 sm:px-4 md:px-6" style={{ paddingTop: 16 }}>
      <h1 style={{ fontWeight: 700, fontSize: 18, margin: '12px 12px 8px' }}>Requests</h1>

      <div className="actions" style={{ alignItems: 'stretch', margin: '16px 12px 20px' }}>
        <button
          className="btn"
          style={{ flex: 1, height: 52, fontSize: 16 }}
          onClick={goNew}
          aria-label="Start a new request"
        >
          + Start New
        </button>
      </div>

      <div style={{ display: 'none', margin: '0 12px 8px' }}>
        <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search medication or reference…" className="h-10" />
      </div>

      <div className="flex items-center justify-between" style={{ margin: '0 12px 6px' }}>
        <div className="flex gap-2">
          <Button size="sm" variant={tab==='active'?'default':'outline'} onClick={()=>{ setTab('active'); setSelectedIds(new Set()); }}>Active</Button>
          <Button size="sm" variant={tab==='completed'?'default':'outline'} onClick={()=>{ setTab('completed'); setSelectedIds(new Set()); }}>Completed</Button>
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1">
          Last checked: {new Date(lastChecked).toLocaleTimeString()}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={load} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isCompletedTab && filtered.length > 0 && (
        <div className="flex items-center gap-2" style={{ margin: '0 12px 8px' }}>
          <Button size="sm" variant="outline" onClick={selectAll}>
            {filtered.every(r => selectedIds.has(r.id)) ? 'Clear Selection' : 'Select All'}
          </Button>
          <Button size="sm" variant="destructive" onClick={deleteSelected} disabled={selectedIds.size === 0}>
            Delete Selected
          </Button>
          <Button size="sm" variant="secondary" onClick={deleteAll}>
            Delete All
          </Button>
        </div>
      )}

      <div id="requestList" style={{ padding: '0 12px 12px' }}>
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-4">
              <div className="text-base font-medium mb-1">No {tab==='active'?'active':'completed'} requests</div>
              <div className="text-sm text-gray-600">Tap Start New to search availability.</div>
            </CardContent>
          </Card>
        ) : (
          filtered.map((r) => {
            const medCount = Array.isArray(r.medications) ? r.medications.length : (r.medication_name ? 1 : 0);
            const subtitle = medCount > 1 ? `${medCount} medications` : (medCount === 1 ? (r.medications?.[0]?.name || r.medication_name) : 'No medication listed');
            const statusLabel = r.status || 'pending';

            const isHasStock = statusLabel === 'has_in_stock';
            const isAccepted = statusLabel === 'accepted';
            const isReady = statusLabel === 'ready';
            const isFulfilled = statusLabel === 'fulfilled';

            let badgeText = statusLabel.replaceAll('_',' ');
            if (isHasStock) { badgeText = 'New responses'; }
            else if (isAccepted) { badgeText = 'Accepted'; }
            else if (isReady) { badgeText = 'Ready'; }
            else if (isFulfilled) { badgeText = 'Picked up'; }

            const checked = isCompletedTab ? selectedIds.has(r.id) : false;

            const badgeClassName = isHasStock
              ? "rtx-badge badge-instock"
              : isReady
                ? "rtx-badge badge-instock"
                : "badge";

            return (
              <div
                className={`card ${isHasStock ? 'rtx-flash border-l-4 border-green-400' : ''}`}
                key={r.id}
                data-request-id={r.id}
                onClick={()=>!isCompletedTab && goRequest(r.id)}
                style={{ cursor: isCompletedTab ? 'default' : 'pointer' }}
              >
                <div className="row">
                  <div className="min-w-0 flex items-start gap-2">
                    {isCompletedTab && (
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleSelect(r.id, !!v)}
                        className="mt-1"
                      />
                    )}
                    <div className="min-w-0 flex-grow">
                      <div className="title truncate">{r.reference_number ? `Ref #${r.reference_number}` : 'Medication Request'}</div>
                      <div className="meta truncate">{subtitle}</div>
                      <div className="meta">Created {formatESTDate(r.created_date)}</div>
                    </div>
                  </div>
                  <span className={badgeClassName} data-role="status-badge">{badgeText}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
