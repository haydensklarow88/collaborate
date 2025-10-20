import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from 'react-oidc-context'
import { WebStorageStateStore } from 'oidc-client-ts'
import App from '@/App.jsx'
import RouterBridge from '@/lib/RouterBridge'
import cognitoAuthConfig from '@/auth/cognitoConfig'
import checkCognitoRuntimeConfig from '@/auth/cognitoDiagnostics'
import '@/index.css'
import '@/styles/index.css'
import '@/lib/sounds'

// Persistent OIDC store: prefer real localStorage in the browser so tokens
// survive the hosted UI redirect/callback. Fall back to an in-memory shim
// when window.localStorage is unavailable (e.g. during SSR or tests).
const storage = (typeof window !== 'undefined' && window.localStorage)
        ? window.localStorage
        : (() => {
                        const store = Object.create(null);
                        return {
                                getItem: (k) => (store[k] === undefined ? null : store[k]),
                                setItem: (k, v) => { store[k] = v; },
                                removeItem: (k) => { delete store[k]; },
                                getAllKeys: () => Object.keys(store),
                        };
                })();

const oidcConfig = {
        ...cognitoAuthConfig,
        userStore: new WebStorageStateStore({ store: storage }),
        automaticSilentRenew: false,
};

// Run lightweight runtime diagnostics to catch redirect/host mismatches early
try { checkCognitoRuntimeConfig() } catch {}

// Debug: Log when the app loads
console.log("=== main.jsx: App starting ===");
console.log("Current URL:", window.location.href);
console.log("Current pathname:", window.location.pathname);
console.log("Is callback URL?", window.location.pathname.includes('oidc-callback'));

ReactDOM.createRoot(document.getElementById('root')).render(
        <BrowserRouter>
                <AuthProvider {...oidcConfig}>
                        <RouterBridge />
                                                <App />
                </AuthProvider>
        </BrowserRouter>
)