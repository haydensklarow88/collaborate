// Minimal Cognito OIDC config loader for the client.
// Values are read from Vite environment variables (import.meta.env).
// Support multiple env var names (VITE_COGNITO_AUTHORITY or VITE_COGNITO_DOMAIN etc.)

const origin = (typeof window !== 'undefined' && window.location && window.location.origin)
  ? window.location.origin
  : 'http://localhost:5173';

const hostedUiDomain = 'https://us-east-1e7jguoyub.auth.us-east-1.amazoncognito.com';

const cognitoAuthConfig = {
  authority: hostedUiDomain,
  client_id: '1ohivbrbk8aitpge7lu7ov1kna',
  redirect_uri: `${origin}/oidc-callback/`,
  response_type: 'code',
  scope: 'openid email profile',
  post_logout_redirect_uri: `${origin}/logout`,
  metadata: {
    issuer: hostedUiDomain,
    authorization_endpoint: `${hostedUiDomain}/oauth2/authorize`,
    token_endpoint: `${hostedUiDomain}/oauth2/token`,
    userinfo_endpoint: `${hostedUiDomain}/oauth2/userInfo`,
    jwks_uri: `${hostedUiDomain}/.well-known/jwks.json`,
    end_session_endpoint: `${hostedUiDomain}/logout`,
  },
};

export default cognitoAuthConfig;
