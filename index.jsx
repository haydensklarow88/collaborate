import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import App from './App.jsx';
import cognitoAuthConfig from './src/auth/cognitoConfig.js';
import RequireAuth from './src/auth/RequireAuth.jsx';

// A tiny in-memory store that satisfies the minimal storage API.
// This ensures tokens and user state are never persisted to localStorage/sessionStorage.
// In-memory store compatible with oidc-client-ts / react-oidc-context
// It exposes get/set/remove (synchronous) and also aliases for getItem/setItem/removeItem
const memoryStore = (() => {
  const store = Object.create(null);

  const get = (key) => {
    try {
      const v = store[key];
      return v === undefined ? null : v;
    } catch (e) {
      return null;
    }
  };

  const set = (key, value) => {
    store[key] = value;
  };

  const remove = (key) => {
    delete store[key];
  };

  return {
    // expected by oidc-client-ts
    get,
    set,
    remove,
    // compat aliases
    getItem: get,
    setItem: set,
    removeItem: remove,
  };
})();

const oidcConfig = {
  ...cognitoAuthConfig,
  // Prevent any persistence by providing an in-memory store
  userStore: memoryStore,
  // disable silent renew by default for simplicity (can be enabled with a silent endpoint)
  automaticSilentRenew: false,
};

const container = document.getElementById('root') || document.body.appendChild(document.createElement('div'));
container.id = 'root';
createRoot(container).render(
  <React.StrictMode>
    <AuthProvider {...oidcConfig}>
      <RequireAuth>
        <App />
      </RequireAuth>
    </AuthProvider>
  </React.StrictMode>
);
