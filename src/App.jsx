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

  // Only run /me fetch and navigation after OIDC authentication
  useEffect(() => {
    // Don't run on callback or post-auth pages - let those components handle the flow
    if (location.pathname === '/oidc-callback' || location.pathname === '/post-auth') {
      console.log("App.jsx: Skipping auth check on callback/post-auth page");
      return;
    }
    
    if (!oidc || !oidc.isAuthenticated) return;

    let cancelled = false;
    (async () => {
      try {
        // First check localStorage for role (temporary until backend is wired)
        const storedRole = localStorage.getItem('userRole');
        
        // Get ID token from OIDC and pass it to the API
        const idToken = oidc.user?.id_token;
        console.log("App.jsx: idToken exists?", !!idToken);
        
        // Try to fetch from backend
        const me = await User.me({
          headers: {
            Authorization: idToken ? `Bearer ${idToken}` : undefined
          }
        });
        console.log("App.jsx: User.me() response:", me);
        const role = me?.user_role || storedRole;

        // If onboarding not complete, force RoleSelection
        if (!me?.onboarding_complete && !storedRole) {
          if (location.pathname !== createPageUrl('RoleSelection')) {
            navigate(createPageUrl('RoleSelection'));
          }
          return;
        }

        // Skip auto-navigation if already on a valid page
        const validPages = ['/PharmacyInterface', '/PrescriberTool', '/AdminUsers', '/RoleSelection'];
        if (validPages.includes(location.pathname)) {
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
        // If /me fails, use localStorage role
        const storedRole = localStorage.getItem('userRole');
        if (storedRole) {
          // Skip auto-navigation if already on a valid page
          const validPages = ['/PharmacyInterface', '/PrescriberTool', '/AdminUsers', '/RoleSelection'];
          if (validPages.includes(location.pathname)) {
            return;
          }

          // Route by stored role
          if (storedRole === 'pharmacy_staff') {
            navigate(createPageUrl('PharmacyInterface'));
          } else if (storedRole === 'prescriber' || storedRole === 'prescriber_staff') {
            navigate(createPageUrl('PrescriberTool'));
          }
        } else {
          // No role stored, send to role selection
          if (location.pathname !== createPageUrl('RoleSelection')) {
            navigate(createPageUrl('RoleSelection'));
          }
        }
      }
    })();

    return () => { cancelled = true };
  }, [oidc && oidc.isAuthenticated]);

  return (
    <>
      <Pages />
      <Toaster />
    </>
  )
}

export default App