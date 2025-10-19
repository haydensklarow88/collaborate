import React, { useEffect } from 'react';

export default function Logout() {
  useEffect(() => {
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || import.meta.env.VITE_COGNITO_CLIENT || '';
    const signoutUri = import.meta.env.VITE_SIGNOUT_URI || import.meta.env.VITE_COGNITO_SIGNOUT_URI || '/';
    const domain = import.meta.env.VITE_COGNITO_AUTHORITY || import.meta.env.VITE_COGNITO_DOMAIN || '';
    if (domain && clientId) {
      const host = domain.replace(/\/$/, '');
      const logoutUrl = `${host}/logout?client_id=${encodeURIComponent(clientId)}&logout_uri=${encodeURIComponent(signoutUri)}`;
      window.location.replace(logoutUrl);
    } else {
      // fallback: navigate to signoutUri or home
      window.location.replace(signoutUri || '/');
    }
  }, []);

  return (
    <div style={{padding:20}}>Signing out…</div>
  );
}
