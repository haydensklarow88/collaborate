
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { SendEmail } from "@/api/integrations";

export default function InviteDoctorForm() {
  const [doctorName, setDoctorName] = React.useState("");
  const [clinicName, setClinicName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!doctorName || !clinicName) return;
    setSending(true);
    try {
      const body = [
        "New doctor invite request:",
        `Doctor: ${doctorName}`,
        `Clinic: ${clinicName}`,
        contact ? `Contact (email or city/state): ${contact}` : "Contact: (not provided)"
      ].join("\n");
      await SendEmail({
        to: "Hayden.sklarow@realtimerx.org",
        subject: "Invite Doctor - Public Landing",
        body
      });
      setDone(true);
      setDoctorName("");
      setClinicName("");
      setContact("");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border rounded-2xl">
      <CardContent className="p-4 sm:p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Tell Your Doctor About RealTimeRx</h3>
        <p className="text-sm text-gray-700 mb-4">
          RealTimeRx helps prescribers instantly check which pharmacies have your medication before sending a prescription — saving time and reducing delays.
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Doctor’s Name</Label>
            <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="e.g., Dr. Jane Smith" />
          </div>
          <div>
            <Label className="text-xs">Clinic Name</Label>
            <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder="e.g., Hudson Valley Clinic" />
          </div>
          <div>
            <Label className="text-xs">Optional: Email or City/State</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g., doctor@clinic.com or Kingston, NY" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={sending || !doctorName || !clinicName} className="gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Invite
            </Button>
          </div>
          {done && <div className="text-sm text-green-700">Thank you! We’ll reach out to your doctor to share RealTimeRx.</div>}
        </form>
      </CardContent>
    </Card>
  );
}
