
import React from "react";
import { User } from "@/api/entities";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";

export default function ProfileSettings() {
  const [me, setMe] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [pharmacyName, setPharmacyName] = React.useState("");
  const [pharmacyPhone, setPharmacyPhone] = React.useState("");
  const [pharmacyAddress, setPharmacyAddress] = React.useState("");
  const [pharmacyZip, setPharmacyZip] = React.useState("");
  const [schedulingUrl, setSchedulingUrl] = React.useState(""); // NEW
  const [practiceName, setPracticeName] = React.useState(""); // NEW for prescribers
  const [practicePhone, setPracticePhone] = React.useState(""); // reuse phone field
  const [practiceAddress, setPracticeAddress] = React.useState(""); // reuse address
  const [practiceZip, setPracticeZip] = React.useState(""); // reuse zip
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    const run = async () => {
      try {
        const u = await User.me();
        setMe(u || null);
        setPharmacyName(u?.pharmacy_name || "");
        setPharmacyPhone(u?.phone || "");
        setPharmacyAddress(u?.address || "");
        setPharmacyZip(u?.zip || "");
        setSchedulingUrl(u?.pharmacy_scheduling_url || "");
        setPracticeName(u?.practice_name || "");
        setPracticePhone(u?.phone || "");
        setPracticeAddress(u?.address || "");
        setPracticeZip(u?.zip || "");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const isPharmacy = me?.user_role === "pharmacy_staff" || me?.user_role === "pharmacist" || me?.user_role === "tech";
  const isPrescriber = me?.user_role === "prescriber" || me?.user_role === "prescriber_staff";

  const save = async () => {
    if (!me) return;
    setSaving(true);
    setMessage("");
    try {
      const payload = {};
      if (isPharmacy) {
        payload.pharmacy_name = pharmacyName?.trim() || "";
        payload.phone = pharmacyPhone?.trim() || "";
        payload.address = pharmacyAddress?.trim() || "";
        payload.zip = pharmacyZip?.trim() || "";
        payload.pharmacy_scheduling_url = schedulingUrl?.trim() || "";
      }
      if (isPrescriber) {
        payload.practice_name = practiceName?.trim() || "";
        payload.phone = practicePhone?.trim() || "";
        payload.address = practiceAddress?.trim() || "";
        payload.zip = practiceZip?.trim() || "";
      }
      await base44.auth.updateMe(payload);
      setMessage("Saved");
    } catch (e) {
      setMessage("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-gray-600">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading profile...
      </div>
    );
  }

  if (!me) {
    return (
      <div className="p-6">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Please sign in to view your profile.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Profile & Settings</CardTitle>
          <CardDescription>Update your display information. Do not include PHI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPharmacy ? (
            <>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Pharmacy Name</label>
                <Input value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} placeholder="e.g., Stone Ridge Pharmacy - Main St" disabled={saving} />
                <p className="text-xs text-gray-500 mt-1">This name appears to prescribers and is used to route requests. Use a unique name (e.g., include location).</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Phone</label>
                  <Input value={pharmacyPhone} onChange={(e) => setPharmacyPhone(e.target.value)} placeholder="(555) 555-5555" disabled={saving} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">ZIP</label>
                  <Input value={pharmacyZip} onChange={(e) => setPharmacyZip(e.target.value)} placeholder="12345" disabled={saving} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Address</label>
                <Input value={pharmacyAddress} onChange={(e) => setPharmacyAddress(e.target.value)} placeholder="123 Main St, Suite 100" disabled={saving} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Scheduling URL (vaccines & screenings)</label>
                <Input value={schedulingUrl} onChange={(e) => setSchedulingUrl(e.target.value)} placeholder="https://..." disabled={saving} />
                <p className="text-xs text-gray-500 mt-1">Patients will see a “Schedule Vaccines & Health Screenings” button on their page if this is set.</p>
              </div>
            </>
          ) : null}

          {isPrescriber ? (
            <>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Practice Name</label>
                <Input value={practiceName} onChange={(e) => setPracticeName(e.target.value)} placeholder="Practice name" disabled={saving} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Phone</label>
                  <Input value={practicePhone} onChange={(e) => setPracticePhone(e.target.value)} placeholder="(555) 555-5555" disabled={saving} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">ZIP</label>
                  <Input value={practiceZip} onChange={(e) => setPracticeZip(e.target.value)} placeholder="12345" disabled={saving} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Address</label>
                <Input value={practiceAddress} onChange={(e) => setPracticeAddress(e.target.value)} placeholder="123 Main St, Suite 100" disabled={saving} />
              </div>
            </>
          ) : null}

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || (!isPharmacy && !isPrescriber)} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </Button>
          </div>

          {message ? (
            <div className={`text-sm ${message.includes('Failed') ? 'text-red-600' : 'text-green-700'}`}>
              {message}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
