import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { useAuth } from "./auth/useAuth"
import { useEffect } from 'react'
import { useAuth as useOidcAuth } from 'react-oidc-context'
import { useNavigate, useLocation } from 'react-router-dom'
import { User } from '@/api/entities'
import { createPageUrl } from '@/utils'

function App() {
  const { user } = useAuth();
  const oidc = useOidcAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // After any successful sign-in (local or OIDC), fetch /me and route appropriately.
  useEffect(() => {
    const signedIn = !!user || !!(oidc && oidc.isAuthenticated);
    if (!signedIn) return;

    let cancelled = false;
    (async () => {
      try {
        const me = await User.me();
        const role = me?.user_role;

        // If onboarding not complete, force RoleSelection
        if (!me?.onboarding_complete) {
          if (location.pathname !== createPageUrl('RoleSelection')) {
            navigate(createPageUrl('RoleSelection'));
          }
          return;
        }

        // Route by role
        if (role === 'admin') {
          navigate(createPageUrl('AdminUsers'));
        } else if (role === 'pharmacy_staff') {
          navigate(createPageUrl('PharmacyInterface'));
        } else if (role === 'prescriber' || role === 'prescriber_staff') {
          navigate(createPageUrl('PrescriberTool'));
        } else {
          // default
          navigate(createPageUrl('PrescriberTool'));
        }
      } catch (e) {
        // If /me fails (not authenticated on backend), do nothing — let other pages handle it.
        // console.debug('User.me failed', e);
      }
    })();

    return () => { cancelled = true };
  }, [user, oidc && oidc.isAuthenticated]);

  return (
    <>
      <Pages />
      <Toaster />
    </>
  )
}

export default App