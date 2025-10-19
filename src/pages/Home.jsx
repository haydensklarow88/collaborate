
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react'; 

export default function Home() {
  const [checking, setChecking] = React.useState(true);
  const navigate = useNavigate();

  React.useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      // In preview mode, do not redirect
      if (params.has('hide_badge')) {
        setChecking(false);
        return;
      }

      // NEW: Redirect based on auth status (no public landing)
      try {
        const me = await User.me();
        const role = me?.user_role;

        // Admins go to AdminUsers directly
        if (role === 'admin') {
          navigate(createPageUrl('AdminUsers'));
          return;
        }

        // If onboarding not complete, force role selection
        if (!me?.onboarding_complete) {
          navigate(createPageUrl('RoleSelection'));
          return;
        }

        // Otherwise route by role
        if (role === 'pharmacy_staff') {
          navigate(createPageUrl('PharmacyInterface'));
        } else if (role === 'prescriber' || role === 'prescriber_staff') {
          navigate(createPageUrl('PrescriberTool'));
        } else {
          // Default for authenticated users if role is not explicitly handled or is null
          navigate(createPageUrl('PrescriberTool'));
        }
      } catch {
        // Not authenticated: go to sign-in
        navigate(createPageUrl('signin'));
      } finally {
        setChecking(false);
      }
    };
    run();
  }, []);

  const params = new URLSearchParams(window.location.search);
  if (params.has('hide_badge')) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center p-6">
        <div className="text-gray-700">Preview mode: data calls disabled.</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center p-6">
      <div className="flex items-center text-gray-700">
        Redirecting…
      </div>
    </div>
  );
}
