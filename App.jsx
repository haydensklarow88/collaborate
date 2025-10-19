import React, { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import Logout from './src/auth/Logout.jsx';
import PostLogout from './src/auth/PostLogout.jsx';
import { User } from './src/api/entities';
import { createPageUrl } from './src/utils';

export default function App() {
  const auth = useAuth();

  const login = async () => {
    try {
      await auth.signinRedirect();
    } catch (e) {
      console.error('Signin error', e);
    }
  };

  // Use explicit Cognito logout redirect (clears session at the Hosted UI)
  const signOutRedirect = () => {
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '1ohivbrbk8aitpge7lu7ov1kna';
    const logoutUri = import.meta.env.VITE_SIGNOUT_URI || 'https://desktop.realtimerx.org/';
    const cognitoDomain = import.meta.env.VITE_COGNITO_AUTHORITY?.replace(/https?:\/\//, '')
      ? `https://${import.meta.env.VITE_COGNITO_AUTHORITY?.replace(/https?:\/\//, '')}`
      : 'https://us-east-1e7jguoyub.auth.us-east-1.amazoncognito.com';
    // Cognito sign out URL format: https://<domain>/logout?client_id=<id>&logout_uri=<uri>
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  return (
    <BrowserRouter>
      <div style={{ padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
        <header style={{ marginBottom: 16 }}>
          <h1>RealTimeRx</h1>
        </header>

        <Routes>
          <Route path="/logout" element={<Logout />} />
          <Route path="/post-logout" element={<PostLogout />} />
          <Route path="/" element={<Landing auth={auth} login={login} signOutRedirect={signOutRedirect} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function Landing({ auth, login, signOutRedirect }) {
  const [loading, setLoading] = useState(false);

  // use react-router navigation so redirects stay within the SPA
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    if (!auth?.isAuthenticated) return;

    (async () => {
      setLoading(true);
      try {
        const me = await User.me();

        // If onboarding not complete, send to RoleSelection
        if (!me?.onboarding_complete) {
          navigate(createPageUrl('RoleSelection'));
          return;
        }

        const role = me?.user_role;
        if (role === 'admin') {
          navigate(createPageUrl('AdminUsers'));
        } else if (role === 'pharmacy_staff') {
          navigate(createPageUrl('PharmacyInterface'));
        } else if (role === 'prescriber' || role === 'prescriber_staff') {
          navigate(createPageUrl('PrescriberTool'));
        } else {
          navigate(createPageUrl('PrescriberTool'));
        }
      } catch (e) {
        // If the call fails, leave the debug UI so user can sign out/retry
        // console.debug('User.me failed', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false };
  }, [auth && auth.isAuthenticated]);

  return (
    <div>
      {loading ? (
        <div>Redirecting…</div>
      ) : (
        <div>
          <p>This demo stores tokens in memory only (no localStorage) for HIPAA compliance.</p>

          {auth.isAuthenticated ? (
            <div>
              <p>Signed in as: <strong>{auth.user?.profile?.email || auth.user?.profile?.sub}</strong></p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => auth.removeUser()}>Sign Out (local)</button>
                <button onClick={() => signOutRedirect()}>Sign Out (Hosted UI)</button>
              </div>
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
      )}
    </div>
  );
}
