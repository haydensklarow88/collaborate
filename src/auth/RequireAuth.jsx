import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import AuthLoading from './AuthLoading.jsx';

export default function RequireAuth({ children }) {
  const auth = useAuth();

  useEffect(() => {
    // If not authenticated and not loading, kick off the Hosted UI redirect
    if (!auth.isAuthenticated && !auth.isLoading && !auth.error) {
      try {
        auth.signinRedirect();
      } catch (e) {
        // swallow errors — page can show fallback UI instead
        // console.error('signinRedirect failed', e);
      }
    }
  }, [auth]);

  if (auth.isLoading) return <AuthLoading />;
  if (auth.error) return <div style={{padding:20,color:'red'}}>Authentication error: {String(auth.error)}</div>;

  // While redirecting, render a branded loading page (AuthLoading)
  if (!auth.isAuthenticated) return <AuthLoading />;

  return <>{children}</>;
}
