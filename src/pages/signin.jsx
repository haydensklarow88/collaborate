
import React from 'react';
import { User } from '@/api/entities';
import { createPageUrl } from '@/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useOidc } from 'react-oidc-context';

export default function SignIn() {
  const [checking, setChecking] = React.useState(true);
  const navigate = useNavigate();
  const auth = useOidc();

  React.useEffect(() => {
    const run = async () => {
      // Skip network calls in preview mode
      const params = new URLSearchParams(window.location.search);
      if (params.has('hide_badge')) {
        setChecking(false);
        return;
      }
      try {
        // If already logged in, send to a role-based authenticated page
        const me = await User.me();
        const role = me?.user_role;

        // Admin: go straight to admin
        if (role === 'admin') {
          navigate(createPageUrl('AdminUsers'));
          return;
        }

        // First login / onboarding not complete -> RoleSelection
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
          navigate(createPageUrl('PrescriberTool'));
        }
        return;
      } catch {
        // not authenticated yet, show Sign in button
      } finally {
        setChecking(false);
      }
    };
    run();
  }, []);

  const handleSignIn = async () => {
    // TEMPORARY: Manual redirect to prove the URL works (bypass library)
    const origin = window.location.origin;
    const domain = "https://us-east-1e7jguoyub.auth.us-east-1.amazoncognito.com";
    const clientId = "1ohivbrbk8aitpge7lu7ov1kna";
    const redirect = `${origin}/oidc-callback/`; // trailing slash

    const authorizeUrl =
      `${domain}/oauth2/authorize` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent("openid email profile")}` +
      `&redirect_uri=${encodeURIComponent(redirect)}`;

    console.log("[OIDC] Manual redirect to:", authorizeUrl);
    console.log("[OIDC] Redirect URI:", redirect);
    window.location.assign(authorizeUrl);

    // ORIGINAL (library-based) - commented out for testing:
    // try {
    //   await auth.signinRedirect();
    // } catch (e) {
    //   console.error('signinRedirect failed', e);
    // }
  };

  if (checking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to RealTimeRx</CardTitle>
          <CardDescription>Secure sign-in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleSignIn}
            className="w-full"
            disabled={auth.isLoading || auth.activeNavigator === "signinRedirect"}
          >
            {auth.activeNavigator === "signinRedirect" ? "Redirecting…" : "Sign in"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
