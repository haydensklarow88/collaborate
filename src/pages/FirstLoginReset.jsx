import React from "react";
import { User } from "@/api/entities";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, ShieldCheck } from "lucide-react";
import { createPageUrl } from "@/utils";

async function sha256Hex(text) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  const arr = Array.from(new Uint8Array(buf));
  return arr.map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function FirstLoginReset() {
  const [loading, setLoading] = React.useState(true);
  const [me, setMe] = React.useState(null);
  const [temp, setTemp] = React.useState("");
  const [pwd, setPwd] = React.useState("");
  const [pwd2, setPwd2] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const run = async () => {
      try {
        const u = await User.me();
        setMe(u);
        // If no reset required, bounce out
        if (!u.requires_password_reset) {
          const navigate = window.__RTX_NAVIGATE__;
          if (typeof navigate === 'function') navigate(createPageUrl("Home"));
          else window.location.href = createPageUrl("Home");
          return;
        }
      } catch {
  const navigate = window.__RTX_NAVIGATE__;
  if (typeof navigate === 'function') navigate(createPageUrl("signin"));
  else window.location.href = createPageUrl("signin");
        return;
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const onSubmit = async () => {
    if (saving) return;
    setError("");
    if (!temp || !pwd || !pwd2) {
      setError("Please fill all fields.");
      return;
    }
    if (pwd !== pwd2) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const tempHash = await sha256Hex(temp);
      if (me.temp_password_hash && me.temp_password_hash !== tempHash) {
        setError("Temporary password is incorrect.");
        setSaving(false);
        return;
      }
      const now = Date.now();
      if (me.temp_password_expires && new Date(me.temp_password_expires).getTime() < now) {
        setError("Temporary password has expired.");
        setSaving(false);
        return;
      }
      const newHash = await sha256Hex(pwd);
      await User.updateMyUserData({
        app_password_hash: newHash,
        requires_password_reset: false,
        temp_password_hash: null,
        temp_password_expires: null
      });
  const navigate = window.__RTX_NAVIGATE__;
  if (typeof navigate === 'function') navigate(createPageUrl("Home"));
  else window.location.href = createPageUrl("Home");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Preparing reset...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            Set Your Password
          </CardTitle>
          <CardDescription>Enter the temporary password from your admin, then create a new one.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div>
            <label className="text-sm text-gray-600">Temporary Password</label>
            <Input value={temp} onChange={(e) => setTemp(e.target.value)} type="password" />
          </div>
          <div>
            <label className="text-sm text-gray-600">New Password</label>
            <Input value={pwd} onChange={(e) => setPwd(e.target.value)} type="password" />
          </div>
          <div>
            <label className="text-sm text-gray-600">Confirm New Password</label>
            <Input value={pwd2} onChange={(e) => setPwd2(e.target.value)} type="password" />
          </div>
          <Button onClick={onSubmit} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            Save and Continue
          </Button>
          <p className="text-xs text-gray-500 mt-1">Note: This password is used inside the app (auth remains via secure sign-in).</p>
        </CardContent>
      </Card>
    </div>
  );
}