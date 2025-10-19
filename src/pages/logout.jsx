import React from "react";
import { Loader2 } from "lucide-react";

const COGNITO_HOSTED_UI = "https://us-east-1e7jguoyub.auth.us-east-1.amazoncognito.com";
const CLIENT_ID = "1ohivbrbk8aitpge7lu7ov1kna";

export default function LogoutPage() {
  React.useEffect(() => {
    const run = async () => {
      try {
        // Clear any client-side OIDC state if present
        if (window.sessionStorage) {
          try { sessionStorage.clear(); } catch {}
        }
        if (window.localStorage) {
          try { localStorage.removeItem('oidc.user'); } catch {}
        }
      } finally {
        const params = new URLSearchParams(window.location.search);
        const done = params.get('done');
        if (done === '1') {
          // We've returned from Cognito logout; go to sign-in screen
          window.location.replace('/signin');
          return;
        }
        const logoutUri = `${window.location.origin}/logout?done=1`;
        const url = `${COGNITO_HOSTED_UI}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(logoutUri)}`;
        window.location.replace(url);
      }
    };
    run();
  }, []);
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-gray-600">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Signing out...
    </div>
  );
}