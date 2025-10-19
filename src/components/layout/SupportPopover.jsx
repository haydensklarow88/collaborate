
import React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { LifeBuoy, Phone } from "lucide-react"; // MessageCircle removed
import { User } from "@/api/entities";

export default function SupportPopover() {
  const [phone, setPhone] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      // Skip in preview mode
      const params = new URLSearchParams(window.location.search);
      if (params.has("hide_badge")) {
        setLoading(false);
        return;
      }

      // Ensure authenticated and role allowed before fetching AppSettings
      let me = null;
      try {
        me = await User.me();
      } catch {
        // If User.me() fails, it usually means the user is not authenticated.
        // In this scenario, we don't proceed with fetching AppSettings.
        setLoading(false);
        return;
      }
      
      const allowed = new Set(["admin", "prescriber", "pharmacy_staff", "prescriber_staff"]);
      if (!me?.user_role || !allowed.has(me.user_role)) {
        // User is authenticated but their role is not among the allowed ones.
        setLoading(false);
        return;
      }

      try {
        const { AppSettings } = await import("@/api/entities");
        const list = await AppSettings.list();
        const num = list?.[0]?.helpdesk_phone_number || "";
        setPhone(num);
      } catch {
        setPhone("");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // smsHref and telHref variables removed as per changes
  // const smsHref = phone ? `sms:${encodeURIComponent(phone)}` : undefined;
  // const telHref = phone ? `tel:${encodeURIComponent(phone)}` : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LifeBuoy className="w-4 h-4" />
          <span className="hidden sm:inline">Support</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-2">
          <p className="text-sm font-medium">Helpdesk</p>
          {loading ? (
            <p className="text-xs text-gray-500">Loading…</p>
          ) : phone ? (
            <>
              <p className="text-xs text-gray-600 break-words">Reach us at: {phone}</p>
              <div className="flex gap-2">
                {/* Removed Text button and its corresponding <a> tag */}
                <a href={`tel:${encodeURIComponent(phone)}`} className="flex-1"> {/* telHref replaced with direct string */}
                  <Button className="w-full">
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                </a>
              </div>
            </>
          ) : (
            <p className="text-xs text-amber-600">No helpdesk number configured yet.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
