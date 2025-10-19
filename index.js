import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import App from './App';

// A tiny in-memory store that satisfies the minimal storage API.
// This ensures tokens and user state are never persisted to localStorage/sessionStorage.
const memoryStore = (() => {
  const store = Object.create(null);
  return {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = value;
    },
    removeItem(key) {
      delete store[key];
    },
  };
})();

const oidcConfig = {
  // Use the Cognito default domain provided in the prompt
  authority: 'https://us-east-1e7jguoyub.auth.us-east-1.amazoncognito.com',
  client_id: '3a4msro5du1e9sg902s0dh3ujg',
  redirect_uri: 'https://desktop.realtimerx.org/',
  post_logout_redirect_uri: 'https://desktop.realtimerx.org/logout',
  response_type: 'code',
  scope: 'openid email profile',
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
      <App />
    </AuthProvider>
  </React.StrictMode>
);
