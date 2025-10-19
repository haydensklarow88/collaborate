
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useUser } from '@/components/context/UserContext';
import PharmacyInbox from '../components/pharmacy/PharmacyInbox';
import { resolveChatVendorBaseUrl } from '@/components/utils/chat';
import { ringNotification, primeAudioOnce } from "@/components/utils/sounds";
import { ensureConnected, subscribe, isConnected, setSseChannel } from "@/components/utils/sse";

// Rename default export to match file name (PharmacyInterface)
export default function PharmacyInterface() {
  const [activeTab, setActiveTab] = useState('inbox');
  const [pharmacyName, setPharmacyName] = useState("");
  const user = useUser();

  // NEW: SSE ready state (for internal tracking/diagnostics if needed)
  const [sseReady, setSseReady] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('hide_badge')) return;
    setPharmacyName(user?.pharmacy_name || "");
  }, [user]);

  // Set SSE channel and prime audio once
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Prime audio to ensure MP3 can play when events arrive
      primeAudioOnce();
      // Use same-origin for SSE to avoid CORS; only set the channel
      delete window.__EVENTS_BASE__; // This line is added
      // NEW: use shared setter to normalize + reconnect + persist
      if (user?.email) {
        setSseChannel(user.email);
      }
      console.log('[PharmacyInterface] channel set:', (user?.email || '').trim().toLowerCase()); // This line is added
    }
  }, [user]);

  // NEW: Attach SSE ASAP and ring on important events (belt & suspenders)
  React.useEffect(() => {
    if (!user?.email) return;

    // Open SSE early
    ensureConnected();
    // Prime audio (idempotent)
    primeAudioOnce();

    // Connection lifecycle
    const unsubOpen = subscribe('__connected__', () => setSseReady(true));
    const unsubClose = subscribe('__disconnected__', () => setSseReady(false));

    // Ring on critical events
    const unsubNewReq = subscribe('new_pharmacy_request', () => {
      try { ringNotification({ volume: 1.0 }); } catch (_) {}
    });
    const unsubUpdate = subscribe('request_update', () => {
      try { ringNotification({ volume: 1.0 }); } catch (_) {}
    });

    // Optional: wildcard backup + visibility
    const unsubAny = subscribe('*', (ev /*, data */) => {
      try { console.log('[PharmacyInterface:*] event:', ev); } catch (_) {}
      if (ev === 'new_pharmacy_request' || ev === 'request_update') {
        try { ringNotification({ volume: 1.0 }); } catch (_) {}
      }
    });

    return () => {
      unsubOpen?.(); unsubClose?.();
      unsubNewReq?.(); unsubUpdate?.();
      unsubAny?.();
    };
  }, [user?.email]);

  const handleTestSound = () => {
    try {
      ringNotification({ volume: 1.0, debug: true });
    } catch (_) {}
  };

  // handleNotificationSelect function removed as NotificationBell is removed
  // const handleNotificationSelect = async (notification) => {
  //   // For now, notifications will not deep-link into chat inside the app
  //   if (notification.link_to_thread_id) {
  //     const base = await resolveChatVendorBaseUrl();
  //     window.open(base, '_blank');
  //   }
  // };

  const handleOpenChat = async () => {
    const base = await resolveChatVendorBaseUrl();
    window.open(base, '_blank');
  };

  const handleManualRefresh = () => {
    // Fire an app-wide event the inbox listens to
    window.dispatchEvent(new CustomEvent('pharmacyRefresh'));
  };

  // Hide bell and data-heavy UI in preview mode to avoid background polling/entity calls
  const params = new URLSearchParams(window.location.search);
  const hideBadge = params.has('hide_badge');

  if (hideBadge) {
    return (
      <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
        <Card className="max-w-7xl mx-auto">
          <CardHeader>
            <CardTitle>Pharmacy Portal (Preview)</CardTitle>
            <CardDescription>Data calls disabled in preview mode.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">Use the live app to view inbox and chat history.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-[calc(100vh-4rem)]">
      <Card className="max-w-[1024px] mx-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{pharmacyName ? pharmacyName : 'Pharmacy Portal'}</CardTitle>
              <CardDescription>
                Respond to prescriber stock checks. No patient PHI is stored.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleTestSound} className="flex items-center gap-2">
                🔔 Test Sound
              </Button>
              {/* Secure Chat: temporarily disabled */}
              <div className="flex items-center gap-2">
                <Button
                  disabled
                  variant="outline"
                  className="flex items-center gap-2 opacity-60 cursor-not-allowed"
                  title="Coming soon"
                  onClick={(e) => e.preventDefault()}
                >
                  <Stethoscope className="w-4 h-4" />
                  Secure Chat
                </Button>
                <span className="text-xs text-gray-500 hidden sm:inline">Coming soon</span>
              </div>
              {/* NotificationBell removed to prevent 429s and delays */}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Dashboard layout (Requests + Pending Fills side-by-side) */}
          <PharmacyInbox />
        </CardContent>
      </Card>
    </div>
  );
}
