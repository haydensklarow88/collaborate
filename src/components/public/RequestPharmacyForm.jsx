
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { SendEmail } from "@/api/integrations";

export default function RequestPharmacyForm() {
  const [pharmacy, setPharmacy] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [zip, setZip] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!pharmacy || !city || !state) return;
    setSending(true);
    try {
      const body = [
        "New pharmacy request to add:",
        `Pharmacy: ${pharmacy}`,
        `City/State: ${city}, ${state}`,
        zip ? `ZIP: ${zip}` : "ZIP: (not provided)",
        email ? `Contact email: ${email}` : "Contact email: (not provided)"
      ].join("\n");
      await SendEmail({
        to: "Hayden.sklarow@realtimerx.org",
        subject: "Pharmacy Network Request - Public Landing",
        body
      });
      setDone(true);
      setPharmacy("");
      setCity("");
      setState("");
      setZip("");
      setEmail("");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border rounded-2xl">
      <CardContent className="p-4 sm:p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Don’t See Your Pharmacy? Request We Add It</h3>
        <p className="text-sm text-gray-700 mb-4">
          We’re expanding our network to include more local pharmacies. Tell us which one you’d like to see added.
        </p>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div>
            <Label className="text-xs">Pharmacy Name</Label>
            <Input value={pharmacy} onChange={(e) => setPharmacy(e.target.value)} placeholder="e.g., CornerCare Pharmacy" />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g., Kingston" />
            </div>
            <div>
              <Label className="text-xs">State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g., NY" />
            </div>
            <div>
              <Label className="text-xs">ZIP (optional)</Label>
              <Input
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="e.g., 12401"
                inputMode="numeric"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Optional: Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@pharmacy.com" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={sending || !pharmacy || !city || !state} className="gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Request
            </Button>
          </div>
          {done && <div className="text-sm text-green-700">Thank you! Our team is working to bring this pharmacy into the RealTimeRx network.</div>}
        </form>
      </CardContent>
    </Card>
  );
}
