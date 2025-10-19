// Lightweight runtime checks for Cognito OIDC misconfiguration
// - Detects mismatched redirect_uri vs current origin
// - Logs clear guidance for local vs production

import cognitoAuthConfig from './cognitoConfig'

function sameHost(a, b) {
  try {
    const ua = new URL(a)
    const ub = new URL(b)
    return ua.host === ub.host && ua.protocol === ub.protocol
  } catch {
    return false
  }
}

export function checkCognitoRuntimeConfig() {
  if (typeof window === 'undefined') return
  const origin = window.location.origin
  const { redirect_uri, post_logout_redirect_uri, client_id, authority } = cognitoAuthConfig

  // Warn if redirect_uri host doesn't match current origin (classic ERR_CONNECTION_REFUSED case)
  if (redirect_uri && !sameHost(redirect_uri, origin)) {
    console.warn('[OIDC] redirect_uri host mismatch:', {
      redirect_uri,
      origin,
      tip: 'Start login from the environment you are using. If on Netlify, redirect_uri must be your Netlify URL; if local, run npm run dev so localhost:5173 is alive.'
    })
  }

  // Trailing slash is important for Cognito equality checks
  if (redirect_uri && !redirect_uri.endsWith('/')) {
    console.warn('[OIDC] redirect_uri should have a trailing slash for Cognito exact match:', redirect_uri)
  }

  if (post_logout_redirect_uri && !post_logout_redirect_uri.endsWith('/logout')) {
    console.warn('[OIDC] post_logout_redirect_uri should usually end with /logout:', post_logout_redirect_uri)
  }

  // Helpful one-liner snapshot for debugging
  const snapshot = { authority, client_id, redirect_uri, post_logout_redirect_uri }
  // Expose on window for quick inspection
  try { window.__OIDC_CFG__ = snapshot } catch {}

  // Print concise summary once
  console.info('[OIDC] Config snapshot:', snapshot)
}

export default checkCognitoRuntimeConfig
