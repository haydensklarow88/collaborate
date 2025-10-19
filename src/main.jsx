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

// In-memory user store to avoid localStorage/sessionStorage
const memoryStore = (() => {
        const store = Object.create(null);
        const get = (key) => (store[key] === undefined ? null : store[key]);
        const set = (key, value) => { store[key] = value; };
        const remove = (key) => { delete store[key]; };
        const getAllKeys = () => Object.keys(store);
        return { get, set, remove, getItem: get, setItem: set, removeItem: remove, getAllKeys };
})();

const oidcConfig = {
        ...cognitoAuthConfig,
        userStore: new WebStorageStateStore({ store: memoryStore }),
        automaticSilentRenew: false,
};

// Run lightweight runtime diagnostics to catch redirect/host mismatches early
try { checkCognitoRuntimeConfig() } catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
        <BrowserRouter>
                <AuthProvider {...oidcConfig}>
                        <RouterBridge />
                                                <App />
                </AuthProvider>
        </BrowserRouter>
)