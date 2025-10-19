
import React from "react";
import { MedicationRequest } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ArrowLeft } from "lucide-react";
import { formatESTDate, formatESTDateTime } from "@/components/utils/datetime";
import { Notification } from "@/api/entities";
import { notifyEvent } from "@/components/utils/realtime"; // NEW: use shared realtime client
import { sendKeragonSms } from "@/api/functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createPageUrl } from "@/utils";
import { subscribe, ensureConnected } from "@/components/utils/sse"; // NEW: shared SSE client
import { ringNotification } from "@/components/utils/sounds"; // NEW: play sound on updates

function sumMedPrices(mp) {
  if (!mp || typeof mp !== "object") return null;
  const vals = Object.values(mp).map((v) => Number(v)).filter((v) => Number.isFinite(v));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0);
}

export default function PrescriberRequestDetail({ requestId, onBack }) {
  const [loading, setLoading] = React.useState(true);
  const [mr, setMr] = React.useState(null);
  const [lastChecked, setLastChecked] = React.useState("");
  const [smsOpen, setSmsOpen] = React.useState(false);
  const [patientMobile, setPatientMobile] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    const rec = await MedicationRequest.get(requestId);
    setMr(rec);
    setLoading(false);
    setLastChecked(new Date().toISOString());
  }, [requestId]);

  React.useEffect(() => { if (requestId) load(); }, [requestId, load]);

  // REPLACED: use shared SSE subscription instead of creating a raw EventSource
  React.useEffect(() => {
    if (!requestId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("hide_badge")) return;

    const onUpdate = (evt) => {
      try {
        const rid = evt?.requestId || evt?.request_id || evt?.requestID;
        const status = (evt?.status || '').toLowerCase();
        if (String(rid) === String(requestId)) {
          // Play a sound for meaningful response milestones
          if (status === 'options_available' || status === 'accepted' || status === 'ready') {
            try {
              ringNotification({ volume: 1.0 });
            } catch (_) {}
          }
          load();
        }
      } catch (_) {
        // ignore
      }
    };

    const unsub = subscribe('request_update', onUpdate);
    ensureConnected();

    return () => {
      unsub();
    };
  }, [requestId, load]);

  const canShowCashPrice = React.useMemo(() => {
    const t = mr?.insurance_coverage_type;
    if (!t) return false;
    if (t === "medicare_medicaid" || t === "unsure") return false;
    if (t === "commercial_private") return !!mr?.cash_pricing_requested;
    if (t === "no_insurance") return true;
    return false;
  }, [mr]);

  const complianceText = React.useMemo(() => {
    const t = mr?.insurance_coverage_type;
    if (!t) return "";
    if (t === "medicare_medicaid" || t === "unsure") {
      return "Pricing information for Medicare or Medicaid covered prescriptions is not available in this app. Please advise your patient to contact their pharmacy directly for coverage and cost details.";
    }
    if (t === "commercial_private") {
      return mr?.cash_pricing_requested
        ? "You are viewing cash pricing only. Insurance benefits are not applied through this app."
        : "Insurance pricing is not displayed in this app. Please advise your patient to contact their pharmacy for insurance coverage and cost information.";
    }
    if (t === "no_insurance") {
      return "You are viewing cash pricing only. Insurance is not billed or processed in this app.";
    }
    return "";
  }, [mr]);

  const statusBadge = (s) => {
    const label = String(s || "pending").replaceAll("_", " ");
    const cls =
      s === "ready" || s === "has_in_stock"
        ? "bg-green-100 text-green-800"
        : s === "accepted"
        ? "bg-indigo-100 text-indigo-800"
        : s === "fulfilled"
        ? "bg-gray-200 text-gray-700"
        : s === "no_stock"
        ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-800";
    return <Badge className={cls}>{label}</Badge>;
  };

  const handleSelectPharmacy = async (resp) => {
    if (!mr || !resp) return;
    const acceptedDate = new Date().toISOString();

    // Persist acceptance on MedicationRequest
    await MedicationRequest.update(mr.id, {
      accepted_pharmacy_email: resp.pharmacy_email || null,
      accepted_pharmacy_thread_id: resp.thread_id || null,
      accepted_date: acceptedDate,
      status: "accepted"
    });

    // Notify the selected pharmacy (in-app Notification + SSE)
    if (resp.pharmacy_email) {
      await Notification.create({
        user_email: resp.pharmacy_email,
        recipient_role: "pharmacy_staff",
        title: "You were selected to fill a prescription",
        link_to_thread_id: resp.thread_id || null,
        meta: {
          reference_number: mr.reference_number || null,
          status: "accepted",
          med_names: (mr.medications || []).map((m) => m.name).slice(0, 3)
        }
      });
      // Realtime notify selected pharmacy
      try {
        await notifyEvent({
          channel: resp.pharmacy_email,
          event: 'request_update',
          payload: {
            requestId: mr.id,
            status: 'accepted',
            med_name: (mr.medications && mr.medications[0]?.name) || mr.medication_name || "Medication",
            updated_at: acceptedDate
          }
        });
      } catch (_) {}
    }

    await load();
  };

  const handleShareSms = async () => {
    if (!mr?.reference_number || !patientMobile) return;
    const baseUrl = window.location.origin + createPageUrl(`MedicationPublic?reference_number=${encodeURIComponent(mr.reference_number)}`);
    await sendKeragonSms({
      patient_mobile_number: patientMobile,
      reference_number: mr.reference_number,
      qr_url: baseUrl
    });
    setSmsOpen(false);
    setPatientMobile("");
  };

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!mr) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-600">Request not found.</div>
            <div className="mt-3">
              <Button variant="secondary" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const meds = Array.isArray(mr.medications) && mr.medications.length
    ? mr.medications
    : (mr.medication_name ? [{ name: mr.medication_name, dosage: mr.dosage, quantity: mr.quantity }] : []);

  const responses = Array.isArray(mr.pharmacy_responses) ? mr.pharmacy_responses : [];
  const hasAccepted = !!mr.accepted_pharmacy_thread_id;

  const shareUrl = mr?.reference_number
    ? window.location.origin + createPageUrl(`MedicationPublic?reference_number=${encodeURIComponent(mr.reference_number)}`)
    : "";

  return (
    <div className="space-y-4">
      {/* Top bar: keep Last checked next to Refresh */}
      <div className="flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Last checked: {lastChecked ? new Date(lastChecked).toLocaleTimeString() : "-"}</span>
          <Button variant="ghost" size="icon" onClick={load} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Ref #{mr.reference_number || "—"}</CardTitle>
          <CardDescription>
            Created {formatESTDate(mr.created_date)} • {statusBadge(mr.status)}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="mb-3 font-semibold">Medications</div>
          <ul className="text-sm space-y-1">
            {meds.map((m, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex-shrink-0">{i + 1}</span>
                <div className="min-w-0">
                  <div className="font-medium">
                    {m.name || "Medication"}
                  </div>
                  <div className="text-xs text-gray-600">
                    {m.dosage ? `${m.dosage}` : ""}{m.form ? ` • ${m.form}` : ""}{typeof m.quantity === "number" ? ` • Qty: ${m.quantity}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pharmacy responses</CardTitle>
          <CardDescription>Updates appear here as pharmacies respond.</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {complianceText ? (
            <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 text-blue-800 text-sm p-3">
              {complianceText}
            </div>
          ) : null}

          {responses.length === 0 ? (
            <div className="text-sm text-gray-600">No responses yet.</div>
          ) : (
            <div className="space-y-3">
              {responses.map((r, idx) => {
                const total = sumMedPrices(r?.med_prices) ?? (Number.isFinite(r?.cash_price) ? r.cash_price : null);
                const label = r?.status === "in_stock" ? "In stock" : r?.status === "out_of_stock" ? "Out of stock" : "Pending";
                const cls =
                  r?.status === "in_stock"
                    ? "bg-green-100 text-green-800"
                    : r?.status === "out_of_stock"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800";
                const showPrice = canShowCashPrice && Number.isFinite(total);

                const selected = hasAccepted && String(mr.accepted_pharmacy_thread_id) === String(r.thread_id);

                return (
                  <div key={idx} className="rtx-card">
                    <div className="rtx-row">
                      <div className="rtx-col min-w-0">
                        <div className="rtx-title truncate">{r?.pharmacy_name || "Pharmacy"}</div>
                        <div className="rtx-muted">
                          {r?.zip ? `ZIP ${r.zip}` : ""}{r?.distance_miles ? ` • ${r.distance_miles.toFixed(1)} mi` : ""}
                        </div>
                        {r?.response_date ? (
                          <div className="text-xs text-gray-500">Updated {formatESTDateTime(r.response_date)}</div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={cls}>{label}</Badge>
                        {showPrice ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200">
                            <span className="text-[11px] uppercase tracking-wide font-semibold">Total</span>
                            <span className="font-bold">${Number(total).toFixed(2)}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {selected ? (
                        <Badge className="bg-indigo-100 text-indigo-800">Selected</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={r?.status !== "in_stock" || hasAccepted}
                          onClick={() => handleSelectPharmacy(r)}
                        >
                          Select pharmacy
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Right-align Share with patient when a pharmacy is accepted */}
          {hasAccepted && (
            <div className="mt-4 px-3 flex justify-end">
              <Button size="sm" onClick={() => setSmsOpen(true)}>Share with patient</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* UPDATED: Share dialog shows LARGE QR + SMS field */}
      <Dialog open={smsOpen} onOpenChange={setSmsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share with patient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {shareUrl ? (
              <div className="flex flex-col items-center">
                <img
                  alt="Scan QR to view prescription"
                  className="w-72 h-72 sm:w-80 sm:h-80 border rounded"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=520x520&data=${encodeURIComponent(shareUrl)}`}
                />
                <div className="mt-2 text-xs text-gray-600 break-all text-center px-2">{shareUrl}</div>
              </div>
            ) : null}
            <div className="text-sm text-gray-600">
              Send a secure link by SMS or have the patient scan the QR code. No PHI is included.
            </div>
            <Input
              placeholder="Patient mobile number (e.g., 555-555-5555)"
              value={patientMobile}
              onChange={(e) => setPatientMobile(e.target.value)}
              inputMode="tel"
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSmsOpen(false)}>Cancel</Button>
            <Button onClick={handleShareSms} disabled={!patientMobile || !mr?.reference_number}>Send SMS</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
