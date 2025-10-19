
import React from "react";
// Remove top-level AppSettings import to prevent schema fetch before auth
// import { AppSettings } from "@/api/entities";
import { User } from "@/api/entities";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Monitor } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // NEW: Added Input component
import { Textarea } from "@/components/ui/textarea";

export default function AdminSettings() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [settings, setSettings] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      // Determine role
      let me = null;
      try {
        me = await User.me();
      } catch (_) {
        // Not logged in or API issue — treat as non-admin and avoid entity calls
        setIsAdmin(false);
        setSettings(null);
        setLoading(false);
        return;
      }

      const admin = me?.user_role === "admin";
      setIsAdmin(admin);

      // If not admin, do NOT attempt to fetch AppSettings (prevents unauthorized calls)
      if (!admin) {
        setSettings(null);
        setLoading(false);
        return;
      }

      // Load existing settings (admin only)
      try {
        const { AppSettings } = await import("@/api/entities"); // lazy import after auth check
        const list = await AppSettings.list();
        if (list.length > 0) {
          setSettings(list[0]);
        } else {
          // Default values for new AppSettings
          const created = await AppSettings.create({
            kiosk_mode: false,
            chat_vendor_base_url: "", // Default value
            default_broadcast_radius: 10, // Default value
            helpdesk_phone_number: "", // NEW default
            jotform_embed_html: "" // NEW: Added JotForm embed HTML default
          });
          setSettings(created);
        }
      } catch (e) {
        // Swallow network errors and continue with defaults
        console.warn("Failed to load/create AppSettings:", e);
        setSettings({
          kiosk_mode: false,
          chat_vendor_base_url: "",
          default_broadcast_radius: 10,
          helpdesk_phone_number: "", // NEW default
          jotform_embed_html: "" // NEW: Added JotForm embed HTML default
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateKiosk = async (value) => {
    if (!settings || !isAdmin) return; // Prevent non-admins or if settings are not loaded from updating
    setSaving(true);
    try {
      const { AppSettings } = await import("@/api/entities"); // lazy import here too
      const updated = await AppSettings.update(settings.id, { kiosk_mode: value });
      setSettings(updated);
      if (value) {
        // Attempt fullscreen (may require user gesture; this click qualifies)
        const el = document.documentElement;
        if (el.requestFullscreen) {
          try {
            await el.requestFullscreen();
          } catch (e) {
            console.warn("Fullscreen request failed:", e);
          }
        }
      }
    } catch (e) {
      console.error("Failed to update kiosk settings:", e);
      // Optionally revert the switch visually or show an error message
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  // Non-admins: show access notice, no writes attempted
  if (!isAdmin) {
    return (
      <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5 text-blue-600" />
              Admin Settings
            </CardTitle>
            <CardDescription>This page is limited to admins. Contact an admin to configure kiosk mode.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between opacity-60">
              <div>
                <Label htmlFor="kiosk" className="text-base">Enable Kiosk Mode</Label>
                <p className="text-sm text-gray-500">Admins can enable fullscreen kiosk deployment and session keep-alive.</p>
              </div>
              <Switch id="kiosk" checked={!!settings?.kiosk_mode} disabled />
            </div>
            {/* NEW: Chat vendor URL + default radius + helpdesk phone (disabled for non-admins) */}
            <div className="grid gap-4 opacity-60">
              <div>
                <Label htmlFor="chatUrl">Chat Vendor Base URL</Label>
                <Input
                  id="chatUrl"
                  value={settings?.chat_vendor_base_url || ""}
                  placeholder="https://..."
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="radius">Default Broadcast Radius (miles)</Label>
                <Input
                  id="radius"
                  type="number"
                  min="1"
                  step="1"
                  value={settings?.default_broadcast_radius ?? 10}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="helpdesk">Helpdesk Phone Number</Label>
                <Input
                  id="helpdesk"
                  value={settings?.helpdesk_phone_number || ""}
                  placeholder="+1 (555) 123-4567"
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="jotform">JotForm Embed HTML</Label>
                <Textarea
                  id="jotform"
                  value={settings?.jotform_embed_html || ""}
                  placeholder="Paste your JotForm embed code here"
                  className="min-h-[140px]"
                  disabled
                />
              </div>
              <div className="flex justify-end">
                <Button disabled>
                  Save Settings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin view
  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-600" />
            Admin Settings
          </CardTitle>
          <CardDescription>Manage global app settings for iPad kiosk deployments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-end">
            <Link to={createPageUrl("AdminUsers")}>
              <Button variant="outline">Manage Users</Button>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="kiosk" className="text-base">Enable Kiosk Mode</Label>
              <p className="text-sm text-gray-500">Hides logout button, tries fullscreen, and keeps session alive. Exit with Shift+L or /logout.</p>
            </div>
            <Switch
              id="kiosk"
              checked={!!settings?.kiosk_mode} // Use optional chaining for settings
              onCheckedChange={updateKiosk}
              disabled={saving || !settings} // Disable if saving or if settings haven't been loaded/created yet
            />
          </div>

          {/* NEW: Chat vendor URL + default radius + helpdesk phone */}
          <div className="grid gap-4">
            <div>
              <Label htmlFor="chatUrl">Chat Vendor Base URL</Label>
              <Input
                id="chatUrl"
                value={settings?.chat_vendor_base_url || ""}
                onChange={(e) => setSettings(prev => ({ ...prev, chat_vendor_base_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="radius">Default Broadcast Radius (miles)</Label>
              <Input
                id="radius"
                type="number"
                min="1"
                step="1"
                value={settings?.default_broadcast_radius ?? 10}
                onChange={(e) => setSettings(prev => ({ ...prev, default_broadcast_radius: Number(e.target.value || 0) }))}
              />
            </div>
            <div>
              <Label htmlFor="helpdesk">Helpdesk Phone Number</Label>
              <Input
                id="helpdesk"
                value={settings?.helpdesk_phone_number || ""}
                onChange={(e) => setSettings(prev => ({ ...prev, helpdesk_phone_number: e.target.value }))}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="jotform">JotForm Embed HTML</Label>
              <Textarea
                id="jotform"
                value={settings?.jotform_embed_html || ""}
                onChange={(e) => setSettings(prev => ({ ...prev, jotform_embed_html: e.target.value }))}
                placeholder="Paste your JotForm embed code here"
                className="min-h-[140px]"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  if (!settings) return;
                  setSaving(true);
                  try {
                    const { AppSettings } = await import("@/api/entities");
                    const updated = await AppSettings.update(settings.id, {
                      chat_vendor_base_url: settings.chat_vendor_base_url || "",
                      default_broadcast_radius: typeof settings.default_broadcast_radius === "number" ? settings.default_broadcast_radius : 10,
                      helpdesk_phone_number: settings.helpdesk_phone_number || "", // NEW: Added helpdesk_phone_number
                      jotform_embed_html: settings.jotform_embed_html || "" // NEW: Added jotform_embed_html
                    });
                    setSettings(updated);
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving || !settings}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
