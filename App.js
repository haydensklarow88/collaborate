import React from 'react';
import { useAuth } from 'react-oidc-context';

export default function App() {
  const auth = useAuth();

  const login = async () => {
    try {
      await auth.signinRedirect();
    } catch (e) {
      console.error('Signin error', e);
    }
  };

  const logout = async () => {
    try {
      await auth.signoutRedirect();
    } catch (e) {
      console.error('Signout error', e);
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1>RealTimeRx - Cognito OIDC Demo</h1>
      <p>This demo stores tokens in memory only (no localStorage) for HIPAA compliance.</p>

      {auth.isAuthenticated ? (
        <div>
          <p>Signed in as: <strong>{auth.user?.profile?.email || auth.user?.profile?.sub}</strong></p>
          <button onClick={logout}>Sign Out</button>
        </div>
      ) : (
        <div>
          <p>Not signed in</p>
          <button onClick={login}>Sign In</button>
        </div>
      )}

      <hr style={{ margin: '16px 0' }} />

      <div>
        <h2>Raw auth state (for debugging)</h2>
        <pre style={{ maxHeight: 300, overflow: 'auto', background: '#f7f7f7', padding: 12 }}>
          {JSON.stringify({ isAuthenticated: auth.isAuthenticated, user: auth.user?.profile }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
