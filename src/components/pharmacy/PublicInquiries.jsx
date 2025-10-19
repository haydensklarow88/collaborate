import React from "react";
import { MedicationRequest } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Inbox } from "lucide-react";
import { useUser } from "@/components/context/UserContext";
import { base44 } from "@/api/base44Client";

export default function PublicInquiries() {
  const user = useUser();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [noteById, setNoteById] = React.useState({});
  const [submitting, setSubmitting] = React.useState({}); // id -> bool

  const load = React.useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const list = await MedicationRequest.filter({ is_public_inquiry: true }, "-created_date", 150).catch(() => []);
      const mine = (Array.isArray(list) ? list : []).filter(mr =>
        Array.isArray(mr.pharmacy_responses) &&
        mr.pharmacy_responses.some(r => (r.pharmacy_email || "").toLowerCase() === (user.email || "").toLowerCase())
      );
      setItems(mine);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => { load(); }, [load]);

  const respond = async (mr, status) => {
    setSubmitting(prev => ({ ...prev, [mr.id]: true }));
    try {
      await base44.functions.invoke("respondToPublicInquiry", {
        medication_request_id: mr.id,
        status,
        note: noteById[mr.id] || ""
      });
      await load();
    } finally {
      setSubmitting(prev => ({ ...prev, [mr.id]: false }));
    }
  };

  if (loading) {
    return <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!items.length) {
    return (
      <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed">
        <Inbox className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">No public inquiries right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((mr) => {
        const pr = (mr.pharmacy_responses || []).find(r => (r.pharmacy_email || "").toLowerCase() === (user.email || "").toLowerCase()) || {};
        const already = ["available", "low_stock", "no_stock"].includes(pr.status);
        const meds = Array.isArray(mr.medications) ? mr.medications : (mr.medication_name ? [{ name: mr.medication_name, dosage: mr.dosage, quantity: mr.quantity }] : []);
        const disabled = !!submitting[mr.id];

        return (
          <Card key={mr.id} className="shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">Ref #{mr.reference_number || "—"}</div>
                  <div className="text-xs text-gray-500">ZIP {mr.zip} • within {mr.radius} mi</div>
                </div>
                <Badge variant="outline" className="text-xs">{already ? "Responded" : "Awaiting Response"}</Badge>
              </div>

              <ul className="text-sm space-y-1">
                {meds.map((m, i) => (
                  <li key={i}>
                    <span className="font-medium">{m.name || "Medication"}</span>
                    {m.dosage ? ` — ${m.dosage}` : ""}{m.form ? ` • ${m.form}` : ""}{typeof m.quantity === "number" ? ` • Qty: ${m.quantity}` : ""}
                  </li>
                ))}
              </ul>
              {mr.generic_acceptable ? <div className="text-xs text-gray-600">Generic acceptable</div> : null}

              <Textarea
                placeholder="Optional note for the patient (e.g., Generic available, Brand only)"
                value={noteById[mr.id] || ""}
                onChange={(e) => setNoteById(prev => ({ ...prev, [mr.id]: e.target.value }))}
                disabled={disabled || already}
              />

              <div className="flex flex-wrap gap-2">
                <Button disabled={disabled || already} onClick={() => respond(mr, "available")}>Available</Button>
                <Button variant="secondary" disabled={disabled || already} onClick={() => respond(mr, "low_stock")}>Low Stock</Button>
                <Button variant="destructive" disabled={disabled || already} onClick={() => respond(mr, "no_stock")}>No Stock</Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}