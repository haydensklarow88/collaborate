
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPrescriptionPublic } from "@/api/functions";

export default function MedicationPublic() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const reference_number = params.get("reference_number") || params.get("ref");
        if (!reference_number) {
          setError("Missing reference number.");
          setLoading(false);
          return;
        }
        const { data: resp } = await getPrescriptionPublic({ reference_number });
        if (!resp?.ok) {
          setError("Prescription not found.");
          setLoading(false);
          return;
        }
        setData(resp.data || null);
      } catch (e) {
        setError("Unable to load prescription.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const currentUrl = React.useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  // scheduleUrl is no longer used for a button, but keeping it in case of future use or for other logic that might still rely on it.
  // The button it was previously associated with is replaced by the coupon_url button.
  const scheduleUrl = React.useMemo(() => {
    const p = data?.pharmacy;
    if (!p?.name) return "https://www.google.com/health/screenings";
    return `https://www.google.com/search?q=${encodeURIComponent(`${p.name} screening appointment`)}`;
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <Card className="max-w-xl w-full">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-gray-600">Loading…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <Card className="max-w-xl w-full">
          <CardContent className="p-6 text-center">
            <h1 className="text-xl font-semibold mb-2">Prescription</h1>
            <p className="text-sm text-gray-600">{error || "Not found."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const meds = Array.isArray(data.medications) ? data.medications : [];
  const responses = Array.isArray(data.responses) ? data.responses : [];

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Prescription Reference</h1>
              <div className="text-sm text-gray-600">Ref #{data.reference_number || "—"}</div>
            </div>
            {/* Bigger QR for easier mobile scanning; high-resolution source */}
            <img
              alt="Scan QR"
              className="w-56 h-56 sm:w-64 sm:h-64 border rounded"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(currentUrl)}`}
            />
          </div>

          <div className="rounded-md border p-3">
            <div className="text-sm font-semibold mb-2">Medications</div>
            <ul className="text-sm space-y-1">
              {meds.map((m, i) => (
                <li key={i}>
                  <span className="font-medium">{m.name || "Medication"}</span>
                  {m.dosage ? ` — ${m.dosage}` : ""}{m.form ? ` • ${m.form}` : ""}{typeof m.quantity === "number" ? ` • Qty: ${m.quantity}` : ""}
                </li>
              ))}
            </ul>
          </div>

          {data.pharmacy ? (
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-semibold">Chosen Pharmacy</div>
              <div className="text-sm">
                <div className="font-medium">{data.pharmacy.name || "Pharmacy"}</div>
                {data.pharmacy.address ? <div className="text-gray-700">{data.pharmacy.address}{data.pharmacy.zip ? `, ${data.pharmacy.zip}` : ""}</div> : null}
                {data.pharmacy.phone ? (
                  <div>
                    <a href={`tel:${encodeURIComponent(data.pharmacy.phone)}`} className="text-blue-600 underline">
                      {data.pharmacy.phone}
                    </a>
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2 flex-wrap">
                {data.pharmacy.address ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.pharmacy.address)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="secondary">Open in Maps</Button>
                  </a>
                ) : null}
                {data.pharmacy.coupon_url ? (
                  <a href={data.pharmacy.coupon_url} target="_blank" rel="noreferrer">
                    <Button className="bg-amber-600 hover:bg-amber-700">View Pharmacy Coupons</Button>
                  </a>
                ) : null}
                {data.pharmacy.scheduling_url ? (
                  <a href={data.pharmacy.scheduling_url} target="_blank" rel="noreferrer">
                    <Button className="bg-blue-600 hover:bg-blue-700">Schedule Vaccines &amp; Screenings</Button>
                  </a>
                ) : null}
              </div>
              {data.pharmacy.discount_info ? (
                <div className="text-xs text-gray-700 border rounded p-2 bg-gray-50">
                  {data.pharmacy.discount_info}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Public responses list */}
          {responses.length > 0 ? (
            <div className="rounded-md border p-3 space-y-2">
              <div className="text-sm font-semibold">Responses from Pharmacies</div>
              <ul className="space-y-2">
                {responses.map((r, i) => (
                  <li key={i} className="text-sm border rounded p-2">
                    <div className="font-medium">{r.pharmacy_name || "Pharmacy"}</div>
                    {r.address ? <div className="text-gray-700">{r.address}{r.zip ? `, ${r.zip}` : ""}</div> : null}
                    {r.phone ? (
                      <div>
                        <a href={`tel:${encodeURIComponent(r.phone)}`} className="text-blue-600 underline">
                          {r.phone}
                        </a>
                      </div>
                    ) : null}
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border">
                        {String(r.status || "pending").replace(/_/g, " ")}
                      </span>
                    </div>
                    {r.note ? <div className="text-xs text-gray-700 mt-1">{r.note}</div> : null}
                    <div className="flex gap-2 mt-2">
                      {r.coupon_url ? (
                        <a href={r.coupon_url} target="_blank" rel="noreferrer">
                          <Button size="sm" className="bg-amber-600 hover:bg-amber-700">Coupons</Button>
                        </a>
                      ) : null}
                      {r.discount_info ? (
                        <div className="text-[11px] text-gray-700 border rounded px-2 py-1 bg-gray-50">{r.discount_info}</div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {Number.isFinite(data?.pharmacy?.price_total) ? (
            <div className="rounded-md border p-3 bg-emerald-50 border-emerald-200 text-emerald-900">
              <div className="text-sm">
                <span className="font-semibold">Estimated Cash Price: </span>
                ${Number(data.pharmacy.price_total).toFixed(2)}
              </div>
              <div className="text-xs mt-1">
                Pricing shown is cash-only and for reference. Insurance billing and pricing occur directly between patient and pharmacy.
              </div>
            </div>
          ) : null}

          <div className="rounded-md border p-3 bg-blue-50 border-blue-200 text-blue-900 text-xs">
            No personal health information (PHI) is displayed or stored on this page. Use the reference number with the chosen pharmacy.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
