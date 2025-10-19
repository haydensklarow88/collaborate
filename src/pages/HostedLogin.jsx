import React, { useEffect } from 'react';
import { useAuth as useOidc } from 'react-oidc-context';

export default function HostedLogin() {
  const auth = useOidc();

  useEffect(() => {
    if (!auth.isAuthenticated && !auth.isLoading && !auth.error) {
      try { auth.signinRedirect(); } catch (_) {}
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.error]);

  if (auth.error) {
    return <div className="p-8 text-red-600">Authentication error: {String(auth.error)}</div>;
  }
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-gray-600">Redirecting to secure sign-in…</div>
    </div>
  );
}
