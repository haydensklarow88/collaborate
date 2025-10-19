
import React from "react";
import { MedicationRequest } from "@/api/entities";
import { User } from "@/api/entities";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, DollarSign, Pill } from "lucide-react";
import { formatESTDate, formatESTTime } from "@/components/utils/datetime";

function StatusBadge({ status }) {
  const map = {
    pending: "bg-amber-100 text-amber-800",
    has_in_stock: "bg-emerald-100 text-emerald-800",
    accepted: "bg-blue-100 text-blue-800",
    ready: "bg-indigo-100 text-indigo-800",
    fulfilled: "bg-gray-200 text-gray-800",
    no_stock: "bg-red-100 text-red-800",
  };
  return <Badge className={map[status] || "bg-gray-100 text-gray-800"}>{status || "pending"}</Badge>;
}

export default function PrescriberRequestsDashboard({ onSelectRequest, onLocateMedications }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [query, setQuery] = React.useState("");
  const signatureRef = React.useRef("");

  // NEW: quick filters (active/completed/all)
  const [tab, setTab] = React.useState("active"); // 'active' | 'completed' | 'all'

  // NEW: last checked timestamp (persisted)
  const [lastCheckedAt, setLastCheckedAt] = React.useState(() => {
    const v = localStorage.getItem("rtrx_req_last_checked_at");
    return v || new Date().toISOString();
  });

  const updateLastChecked = React.useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem("rtrx_req_last_checked_at", now);
    setLastCheckedAt(now);
  }, []);

  const load = React.useCallback(async () => {
    // Only show full loader before first paint; no background polling
    if (items.length === 0) setLoading(true);
    setError("");
    try {
      const u = await User.me();
      if (!u?.email) {
        setItems([]);
        signatureRef.current = "";
        setError("You are not signed in.");
        return;
      }
      const list = await MedicationRequest.filter({ prescriber_email: u.email }, "-created_date", 100);
      const safeList = Array.isArray(list) ? list : [];

      // Lightweight signature to avoid unnecessary re-renders
      const computeSignature = (arr) =>
        arr
          .map((r) => {
            const prices = Array.isArray(r.pharmacy_responses)
              ? r.pharmacy_responses
                  .filter((p) => p.status === "in_stock" && typeof p.cash_price === "number")
                  .map((p) => p.cash_price)
              : [];
            const minPrice = prices.length ? Math.min(...prices) : -1;
            return [r.id, r.status || "pending", r.reference_number || "", minPrice, (r.pharmacy_responses || []).length].join("|");
          })
          .join("~");

      const newSig = computeSignature(safeList);
      if (newSig !== signatureRef.current) {
        signatureRef.current = newSig;
        setItems(safeList);
      }
    } catch (e) {
      setError(e?.message || "Failed to load requests.");
      setItems([]);
      signatureRef.current = "";
    } finally {
      setLoading(false);
    }
  }, [items.length]);

  React.useEffect(() => {
    load();
  }, [load]);

  // NEW: compute "responses waiting" since lastCheckedAt
  const responsesWaiting = React.useMemo(() => {
    if (!Array.isArray(items) || items.length === 0 || !lastCheckedAt) return 0;
    const since = new Date(lastCheckedAt).getTime();
    let count = 0;
    items.forEach((r) => {
      if (!Array.isArray(r.pharmacy_responses)) return;
      r.pharmacy_responses.forEach((p) => {
        if (!p?.response_date) return;
        const ts = new Date(p.response_date).getTime();
        if (ts > since && (p.status === "in_stock" || p.status === "out_of_stock")) {
          count += 1;
        }
      });
    });
    return count;
  }, [items, lastCheckedAt]);

  // NEW: filter by tab
  const statusMatchesTab = (r) => {
    if (tab === "all") return true;
    const activeStatuses = new Set(["pending", "has_in_stock", "accepted", "ready"]);
    const completedStatuses = new Set(["fulfilled", "no_stock"]);
    if (tab === "active") return activeStatuses.has(r.status || "pending");
    if (tab === "completed") return completedStatuses.has(r.status || "");
    return true;
  };

  const filtered = items
    .filter(statusMatchesTab)
    .filter((r) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const medText = Array.isArray(r.medications) && r.medications.length
        ? r.medications.map((m) => m.name).join(" ")
        : r.medication_name || "";
      const text = `${r.reference_number || ""} ${medText}`.toLowerCase();
      return text.includes(q);
    });

  const handleRefresh = async () => {
    await load();
    updateLastChecked();
  };

  if (loading && items.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading requests…
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      {/* Header: Requests + small refresh icon + Locate Medications */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <CardTitle className="text-lg truncate">Requests</CardTitle>
          {error ? <span className="text-xs text-red-600 truncate">{error}</span> : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            aria-label="Refresh"
            className="h-8 w-8 shrink-0"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex-shrink-0">
          <Button
            onClick={() => onLocateMedications && onLocateMedications()}
            className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700"
          >
            <Pill className="w-4 h-4 mr-2" />
            Locate Medications
          </Button>
        </div>
      </div>

      {/* Search - compact and full-width on mobile */}
      <div className="min-w-0">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by reference or medication…"
          className="w-full h-9"
        />
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={tab === "active" ? "default" : "outline"} onClick={() => setTab("active")}>Active</Button>
        <Button size="sm" variant={tab === "completed" ? "default" : "outline"} onClick={() => setTab("completed")}>Completed</Button>
        <Button size="sm" variant={tab === "all" ? "default" : "outline"} onClick={() => setTab("all")}>All</Button>
      </div>

      {/* Subtle last-checked line (no large banner, no extra button) */}
      <div className="text-xs text-gray-500">
        Last checked: {formatESTTime(lastCheckedAt)} — {responsesWaiting} response{responsesWaiting === 1 ? "" : "s"}
      </div>

      {/* Empty state - minimal, no extra CTA button */}
      {filtered.length === 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">No active requests</CardTitle>
            <CardDescription className="text-sm">Use “Locate Medications” to check availability.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        // Existing list rendering (cards)
        filtered.map((r) => {
          const medCount = Array.isArray(r.medications) ? r.medications.length : (r.medication_name ? 1 : 0);
          const subtitle =
            medCount > 1
              ? `${medCount} medications`
              : medCount === 1
              ? r.medications?.[0]?.name || r.medication_name
              : "No medication listed";

          const prices = Array.isArray(r.pharmacy_responses)
            ? r.pharmacy_responses
                .filter((p) => p.status === "in_stock" && typeof p.cash_price === "number")
                .map((p) => p.cash_price)
            : [];
          const minPrice = prices.length ? Math.min(...prices) : null;

          return (
            <button
              key={r.id}
              onClick={() => onSelectRequest && onSelectRequest(r.id)}
              className="w-full text-left"
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <CardTitle className="text-base truncate">
                      {r.reference_number ? `Ref #${r.reference_number}` : "Medication Request"}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {minPrice != null && (
                        <Badge variant="outline" className="gap-1">
                          <DollarSign className="w-3 h-3" />
                          {minPrice.toFixed(2)}
                        </Badge>
                      )}
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <CardDescription className="truncate">{subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-gray-500">Created {formatESTDate(r.created_date)}</div>
                </CardContent>
              </Card>
            </button>
          );
        })
      )}
    </div>
  );
}
