import React from "react";
import { User } from "@/api/entities";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { SendEmail } from "@/api/integrations";

export default function Onboarding() {
  const [me, setMe] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [notifying, setNotifying] = React.useState(false);
  const [embedHtml, setEmbedHtml] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const u = await User.me();
        setMe(u || null);
      } catch (_) {}
      try {
        const { AppSettings } = await import("@/api/entities");
        const list = await AppSettings.list();
        setEmbedHtml(list?.[0]?.jotform_embed_html || "");
      } catch (_) {
        setEmbedHtml("");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const notifyAdmin = async () => {
    if (!me) return;
    setNotifying(true);
    try {
      await User.updateMyUserData({ jotform_registration_notified: true });
      await SendEmail({
        to: "hayden.sklarow@realtimerx.org",
        subject: "New user started registration",
        body: "A new user has started registration via the embedded form. Review in Admin Users."
      });
      // After notifying, navigate to pending page
      const navigate = window.__RTX_NAVIGATE__;
      if (typeof navigate === 'function') navigate('/PendingNPIVerification');
      else window.location.href = '/PendingNPIVerification';
    } finally {
      setNotifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Please complete the short registration form below. Do not include any PHI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {embedHtml ? (
            <div
              className="rounded-md border bg-white p-0 overflow-hidden"
              dangerouslySetInnerHTML={{ __html: embedHtml }}
            />
          ) : (
            <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
              JotForm embed code is not configured yet. Admin can add it in Admin Settings.
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={notifyAdmin} disabled={notifying} className="gap-2">
              {notifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              I submitted
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}