

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities';
// Removed top-level AppSettings import to avoid schema fetch before auth
// import { AppSettings } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { User as UserIcon, LogOut, Home as HomeIcon, Settings as SettingsIcon, LifeBuoy, Menu as MenuIcon, Phone } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import SupportPopover from '@/components/layout/SupportPopover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
// Removed chat vendor import as chat functionality is being removed
// import { resolveChatVendorBaseUrl } from "@/components/utils/chat";
// Removed NotificationBell as it's no longer used
// const NotificationBell = React.lazy(() => import('@/components/layout/NotificationBell')); // Lazy-load
import A2HSBanner from '@/components/common/A2HSBanner';
import { UserContext } from '@/components/context/UserContext';
import { ensureConnected } from "@/components/utils/sse";
import { unlockAudioOnce, preloadNotificationSound } from "@/components/utils/sounds"; // UPDATED: also preload

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [kiosk, setKiosk] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false); // prescriber sheet
  const [helpOpen, setHelpOpen] = React.useState(false); // help dialog
  const [helpPhone, setHelpPhone] = React.useState("");   // phone from settings
  const [checkingAuth, setCheckingAuth] = React.useState(true); // NEW: gate rendering while verifying auth

  // NEW: open SSE immediately on mount, regardless of user/email readiness
  React.useEffect(() => {
    ensureConnected();
  }, []);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        // Skip all entity calls in preview mode
        const params = new URLSearchParams(window.location.search);
        if (params.has('hide_badge')) {
          setUser(null);
          setCheckingAuth(false); // allow rendering in preview mode
          return;
        }

        const path = location.pathname;
        // Publicly accessible paths (no auth required)
        const publicPaths = new Set([
          '/',
          createPageUrl('signin'),
          createPageUrl('logout'),
          createPageUrl('MedicationPublic')
          // createPageUrl('PrescriptionInfo') // Removed public prescription info page
        ]);

        if (publicPaths.has(path)) {
          setUser(null);
          setCheckingAuth(false); // immediately render public pages
          return;
        }

        const currentUser = await User.me();
        setUser(currentUser);

        // If not authenticated and on a protected path, redirect to sign in
        if (!currentUser && !publicPaths.has(path)) {
          const nav = window.__RTX_NAVIGATE__;
          if (typeof nav === 'function') nav('signin'); else window.location.href = createPageUrl('signin');
          return;
        }
        setCheckingAuth(false);
      } catch (e) {
        setUser(null);
        // Not authenticated: redirect to sign in for protected paths
        const path = location.pathname;
        const publicPaths = new Set([
          '/',
          createPageUrl('signin'),
          createPageUrl('logout'),
          createPageUrl('MedicationPublic')
          // createPageUrl('PrescriptionInfo') // Removed public prescription info page
        ]);
        if (!publicPaths.has(path)) {
          const nav = window.__RTX_NAVIGATE__;
          if (typeof nav === 'function') nav('signin'); else window.location.href = createPageUrl('signin');
          return;
        }
        setCheckingAuth(false);
      }
    };
    fetchUser();
  }, [location.pathname]);

  // Only fetch AppSettings when authenticated AND role is allowed by RLS
  React.useEffect(() => {
    let isCancelled = false;

    const loadSettings = async () => {
      // UPDATED: remove PublicMedicationSearch from skip paths
      const path = location.pathname;
      const skipPaths = new Set([
        '/',
        createPageUrl('Home'),
        createPageUrl('signin'),
        createPageUrl('Onboarding'),
        createPageUrl('MedicationPublic') // NEW: allow public page without settings/auth
        // createPageUrl('PrescriptionInfo') // skip settings on public QR page - Removed
      ]);
      if (skipPaths.has(path)) {
        if (!isCancelled) setKiosk(false);
        return;
      }

      // Skip when hide_badge is present in the URL (preview mode)
      const params = new URLSearchParams(window.location.search);
      if (params.has('hide_badge')) {
        if (!isCancelled) setKiosk(false);
        return;
      }

      const allowedRoles = new Set(['admin', 'prescriber', 'pharmacy_staff', 'prescriber_staff']);
      if (!user || !allowedRoles.has(user.user_role)) {
        // Not logged in or role not yet set -> skip to avoid unauthorized/Network Error
        if (!isCancelled) setKiosk(false);
        return;
      }
      try {
        // Lazy-load AppSettings only after auth and role check
        const { AppSettings } = await import('@/api/entities');
        const list = await AppSettings.list();
        if (!isCancelled) setKiosk(list[0]?.kiosk_mode || false);
      } catch {
        // Swallow errors (e.g., preview or transient network) and default to non-kiosk
        if (!isCancelled) setKiosk(false);
      }
    };

    loadSettings();
    return () => { isCancelled = true; };
  }, [location.pathname, user]);

  // NEW: set SSE channel and ensure connection globally once user is known
  React.useEffect(() => {
    if (!user?.email) return;
    if (typeof window === "undefined") return;
    // Use same-origin SSE; do not force a cross-origin base
    delete window.__EVENTS_BASE__;
    window.__PHARMACY_CHANNEL__ = (user.email || '').trim();
    console.log('[Layout] channel set:', window.__PHARMACY_CHANNEL__);
    ensureConnected();
  }, [user?.email]);

  // Unlock audio once per session and preload the MP3 so it's ready instantly
  React.useEffect(() => {
    unlockAudioOnce();
    preloadNotificationSound();
  }, []);

  // Enable audio debug logs via URL ?audio_debug=1
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('audio_debug')) {
        window.__AUDIO_DEBUG = true;
        console.log('[SOUND] Audio debug enabled via ?audio_debug=1');
      }
      // NEW: auto-enable in ToDesktop/Electron environment
      const ua = navigator.userAgent || '';
      if ((window.todesktop || ua.includes('ToDesktop')) && !params.has('audio_debug')) {
        window.__AUDIO_DEBUG = true;
        console.log('[SOUND] Audio debug enabled (ToDesktop detected)');
      }
    } catch (_) { }
  }, []);

  React.useEffect(() => {
    if (!kiosk) return;

    // Try to keep session alive
    const interval = setInterval(async () => {
      try { await User.me(); } catch (_) {}
    }, 4 * 60 * 1000); // Every 4 minutes

    // Hidden logout shortcut: Shift+L
    const onKey = (e) => {
      if (e.shiftKey && String(e.key).toLowerCase() === 'l') {
        window.location.href = createPageUrl('logout');
      }
    };
    window.addEventListener('keydown', onKey);

    // Attempt fullscreen (may fail silently if not user-initiated)
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', onKey);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [kiosk]);

  // Load helpdesk phone when help is opened (lazy)
  React.useEffect(() => {
    if (!helpOpen) return;
    (async () => {
      try {
        const { AppSettings } = await import("@/api/entities");
        const list = await AppSettings.list();
        setHelpPhone(list?.[0]?.helpdesk_phone_number || "");
      } catch {
        setHelpPhone("");
      }
    })();
  }, [helpOpen]);

  // Stable callbacks
  const handleLogout = React.useCallback(async () => {
  await User.logout();
  // After logout, reload the page to clear any in-memory state
  window.location.reload();
  }, []);

  // Removed openVendorChat as chat functionality is being removed
  // const openVendorChat = React.useCallback(async () => {
  //   const base = await resolveChatVendorBaseUrl();
  //   window.open(base, "_blank");
  // }, []);

  const go = React.useCallback((pageName) => {
    const nav = window.__RTX_NAVIGATE__;
    if (typeof nav === 'function') nav(pageName); else window.location.href = createPageUrl(pageName);
  }, []);

  // Removed handleNotificationSelect as notification functionality is being removed
  // const handleNotificationSelect = React.useCallback((notification) => {
  //   if (user?.user_role === 'prescriber' || user?.user_role === 'prescriber_staff') {
  //     if (notification.medication_request_id) {
  //       const url = createPageUrl(`PrescriberTool?requestId=${notification.medication_request_id}`);
  //       window.location.href = url;
  //       return;
  //     }
  //     window.location.href = createPageUrl('PrescriberTool');
  //     return;
  //   }
  //   // Pharmacy role handled in PharmacyInterface
  // }, [user]);

  const isHome = location.pathname === createPageUrl('Home') || location.pathname === '/';
  const isAuthOrOnboard = location.pathname === createPageUrl('signin') || location.pathname === createPageUrl('Onboarding');
  const params = new URLSearchParams(window.location.search);
  const hideBadge = params.has('hide_badge');
  // Removed canShowBell as notification functionality is being removed
  // const allowedRoles = new Set(['admin', 'prescriber', 'pharmacy_staff', 'prescriber_staff']);
  // const canShowBell = !!user && allowedRoles.has(user.user_role) && !kiosk && !isHome && !isAuthOrOnboard && !hideBadge;

  // UPDATED: remove isPublicMedicationSearch detection
  const isMedicationPublic = location.pathname === createPageUrl('MedicationPublic'); // NEW: detect public medication detail page

  // Admin flag and prescriber flag
  const isAdmin = !!user && user.user_role === 'admin' && !kiosk && !hideBadge;
  const isPrescriber = !!user && (user.user_role === 'prescriber' || user.user_role === 'prescriber_staff');

  // Build role-aware menu items once and reuse
  const buildMenuItems = React.useCallback(() => {
    const items = [];
    const goAndClose = (page) => { setMenuOpen(false); go(page); };

    // Always treat as verified for menu purposes
    const isVerified = true;

    // For prescribers -> "Requests"; everyone else -> "Home"
    if (user && (user.user_role === 'prescriber' || user.user_role === 'prescriber_staff')) {
      items.push({ label: 'Requests', action: () => goAndClose('PrescriberTool') });
    } else {
      // Home already routes pharmacy staff to PharmacyInterface via Home page logic
      items.push({ label: 'Home', action: () => goAndClose('Home') });
    }

    if (user) {
      // Team Access for prescribers
      if (user.user_role === 'prescriber') {
        items.push({ label: 'Team Access', action: () => goAndClose('TeamAccess') });
      }

      if (user.user_role === 'pharmacy_staff') {
        // Removed duplicate "Pharmacy Portal" entry (Home already routes there)
        items.push({ label: 'My Prices', action: () => goAndClose('PharmacyPrices') });
        // Removed "Pharmacy Settings" — combined into Profile & Settings
      }

      if (user.user_role === 'admin') {
        items.push({ label: 'Admin Users', action: () => goAndClose('AdminUsers') });
        items.push({ label: 'Admin Medication Requests', action: () => goAndClose('AdminMedicationRequests') });
        items.push({ label: 'Admin Settings', action: () => goAndClose('AdminSettings') });
        items.push({ label: 'Security Check', action: () => goAndClose('SecurityCheck') });
      }

      items.push({ label: 'Profile & Settings', action: () => goAndClose('ProfileSettings') });
      items.push({ label: 'Help & Support', action: () => { setMenuOpen(false); setHelpOpen(true); } });
      items.push({ label: 'Logout', action: () => { setMenuOpen(false); handleLogout(); }, destructive: true });
    }

    return items;
  }, [user, setMenuOpen, go, setHelpOpen, handleLogout]);

  // Detect if current route is public for rendering while checking
  const isPublicRoute = React.useMemo(() => {
    const path = location.pathname;
    const publicPaths = new Set([
      '/',
      createPageUrl('signin'),
      createPageUrl('logout'),
      createPageUrl('MedicationPublic')
    ]);
    return publicPaths.has(path);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      {/* Compact global CSS for mobile-first UI */}
      <style>{`
        .card{background:#fff;border:1px solid #e8e9ee;border-radius:12px;padding:12px;margin:10px 0}
        .card .row{display:flex;justify-content:space-between;align-items:center;gap:8px}
        .title{font-weight:600;font-size:15px;line-height:1.25}
        .meta{color:#667085;font-size:12px}
        .badge{background:#eef2ff;color:#2746ff;padding:4px 8px;border-radius:999px;font-size:12px}
        .btn{background:#2b67ff;color:#fff;border:none;border-radius:10px;padding:10px 12px;font-weight:600}
        .btn[disabled]{opacity:.5}
        .btn-secondary{background:#fff;color:#2b67ff;border:1px solid #cdd3ff}
        .page{min-height:100dvh;display:flex;flex-direction:column}
        .sticky-actions{position:sticky;bottom:0;padding:12px 12px calc(12px + env(safe-area-inset-bottom));background:#f7f8fa}
        .form-card{background:#fff;border:1px solid #e8e9ee;border-radius:12px;padding:12px;margin:0 12px;max-height:calc(100dvh - 160px);overflow:auto}
        .label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}
        .input, .select{width:100%;height:44px;border:1px solid #dcdde3;border-radius:8px;padding:0 12px}
        .grid-zip{display:grid;grid-template-columns:2fr 1fr;gap:8px}
        .actions{display:flex;gap:8px;margin:8px 12px 12px;align-items:flex-start}
      `}</style>

      {/* Global crisp styles for request cards */}
      <style>{`
        .rtx-card{background:#fff;border:1px solid #E6E8EE;border-radius:14px;box-shadow:0 1px 2px rgba(16,24,40,.04);padding:14px}
        .rtx-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .rtx-col{display:flex;flex-direction:column;gap:4px}
        .rtx-title{font-weight:700;font-size:16px;line-height:1.25;color:#101828}
        .rtx-sub{font-weight:500;font-size:13px;color:#344054}
        .rtx-muted{font-size:12px;color:#667085}
        .rtx-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:600}
        .badge-waiting{background:#F2F4F7;color:#475467}
        .badge-instock{background:#ECFDF3;color:#027A48}
        .badge-outstock{background:#FEF3F2;color:#B42318}
        .badge-options{background:#EEF2FF;color:#3538CD}
        .rtx-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:999px;font-size:12px;background:#F8FAFF;color:#344054;border:1px solid #E6E8EE}
        .rtx-btn{height:40px;padding:0 14px;border-radius:10px;border:1px solid transparent;font-weight:700;background:#2B67FF;color:#fff}
        .rtx-btn:disabled{opacity:.5;pointer-events:none}
        .rtx-btn-secondary{background:#fff;color:#2B67FF;border-color:#CAD7FF}
        .rtx-divider{height:1px;background:#F2F4F7;margin:12px 0}
        .rtx-item{padding:8px 0}
        @keyframes flash{0%{background:#FFFBEA}100%{background:transparent}}
        .rtx-flash{animation:flash .8s ease-in-out 1}
      `}</style>

      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Unified header for all roles: brand + single menu */}
          <div className="flex items-center h-16 justify-between">
            {/* Left: Brand (tap = Home) */}
            {isMedicationPublic ? (
              <div className="flex items-center gap-2 min-w-0 cursor-default select-none">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c3ebca8e946b48f7cd65fe/dcccf585d_RT.png"
                  alt="RealTimeRx logo"
                  className="h-8 w-8 object-contain select-none"
                  draggable="false"
                />
                <span className="font-semibold text-lg sm:text-2xl text-gray-800 truncate">RealTimeRx</span>
              </div>
            ) : (
              <button onClick={() => go('Home')} className="flex items-center gap-2 min-w-0">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68c3ebca8e946b48f7cd65fe/dcccf585d_RT.png"
                  alt="RealTimeRx logo"
                  className="h-8 w-8 object-contain select-none"
                  draggable="false"
                />
                <span className="font-semibold text-lg sm:text-2xl text-gray-800 truncate">RealTimeRx</span>
              </button>
            )}

            {/* Right: Role-aware Menu (Sheet) */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                {/* Unhide the menu icon button */}
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <MenuIcon className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[90vw] sm:w-80">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-4 grid gap-2">
                  {buildMenuItems().map((item, idx) => (
                    item.customRender ? (
                      <div key={idx}>{item.label}</div>
                    ) : (
                      <Button
                        key={idx}
                        variant={item.destructive ? "destructive" : "ghost"}
                        className="justify-start"
                        onClick={item.action}
                      >
                        {item.label}
                      </Button>
                    )
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* NEW: Mobile A2HS banner */}
        <A2HSBanner />
      </header>

      {/* Help dialog for prescribers */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help &amp; Support</DialogTitle>
            <DialogDescription>Contact us for assistance. No PHI in messages.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {helpPhone ? (
              <>
                <div className="text-sm text-gray-700">Helpdesk: {helpPhone}</div>
                <div className="flex gap-2">
                  {/* Removed Text/SMS option, keep only Call */}
                  <a href={`tel:${encodeURIComponent(helpPhone)}`} className="flex-1">
                    <Button className="w-full">
                      <Phone className="w-4 h-4 mr-2" />
                      Call
                    </Button>
                  </a>
                </div>
              </>
            ) : (
              <div className="text-sm text-amber-600">No helpdesk number configured yet.</div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setHelpOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserContext.Provider value={user}>
        {/* Gate children: don't render protected pages until auth is checked */}
        {(!checkingAuth || isPublicRoute) ? (
          <main className="flex-1">{children}</main>
        ) : (
          <main className="flex-1" />
        )}
      </UserContext.Provider>
      <Toaster />
    </div>
  );
}

