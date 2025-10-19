# Cognito OIDC Setup Checklist

## AWS Cognito Console Configuration

### 1. App Client Settings
- **App Client ID**: `1ohivbrbk8aitpge7lu7ov1kna`
- **Hosted UI Domain**: `https://us-east-1e7jguoyub.auth.us-east-1.amazoncognito.com`

### 2. Allowed Callback URLs
Add these URLs in your Cognito App Client settings:
- **Local Dev**: `http://localhost:5173/oidc-callback/`
- **Netlify**: `https://chimerical-daifuku-f66dd6.netlify.app/oidc-callback/`

**IMPORTANT**: The trailing slash `/` is required for exact match!

### 3. Allowed Sign-out URLs
Add these URLs:
- **Local Dev**: `http://localhost:5173/logout`
- **Netlify**: `https://chimerical-daifuku-f66dd6.netlify.app/logout`

### 4. OAuth 2.0 Scopes
Ensure these scopes are enabled:
- `openid`
- `email`
- `profile`

### 5. OAuth 2.0 Grant Types
Enable:
- Authorization code grant
- Implicit grant (optional, for legacy support)

---

## Local Environment Setup

### `.env.local` (create if not exists)
```env
VITE_COGNITO_CLIENT_ID=1ohivbrbk8aitpge7lu7ov1kna
VITE_COGNITO_DOMAIN=https://us-east-1e7jguoyub.auth.us-east-1.amazoncognito.com
```

### Run locally
```powershell
npm run dev
```
Visit `http://localhost:5173`, click Sign in, and verify redirect to Cognito Hosted UI.

---

## Netlify Deployment

### 1. Environment Variables (Netlify Dashboard)
Add these in **Site Settings → Environment Variables**:
```
VITE_COGNITO_CLIENT_ID=1ohivbrbk8aitpge7lu7ov1kna
VITE_COGNITO_DOMAIN=https://us-east-1e7jguoyub.auth.us-east-1.amazoncognito.com
```

### 2. Deploy
Build and upload `dist/` folder or push to your connected repo:
```powershell
npm run build
# Then drag dist/ folder to Netlify or push to repo
```

### 3. Update Cognito Callback URLs
After deploy, add your Netlify URL to Cognito:
- `https://chimerical-daifuku-f66dd6.netlify.app/oidc-callback/` ← **with trailing slash**
- `https://chimerical-daifuku-f66dd6.netlify.app/logout`

---

## Expected Flow

1. User visits `/signin`
2. Clicks "Sign in" → redirects to Cognito Hosted UI
3. User authenticates → Cognito redirects to `/oidc-callback`
4. App processes code and routes to `/post-auth`
5. App checks role claim:
   - **No role** → `/role-selection`
   - **Has role** → `/pharmacy` or `/prescriber`

---

## Troubleshooting

### "Routes is not defined"
✅ **FIXED**: Routes now properly imported and used in `src/pages/index.jsx`.

### "redirect_uri mismatch"
- Ensure Cognito callback URL matches exactly (including trailing slash).
- Current config: `${origin}/oidc-callback/` ← **trailing slash required**
- Cognito must have the exact URL: `https://chimerical-daifuku-f66dd6.netlify.app/oidc-callback/`

### "Sign in button requires two clicks"
✅ **FIXED**: Button now disables while `auth.isLoading` or redirecting.

### "Returns to /signin after login"
✅ **FIXED**: Added `/oidc-callback` and `/post-auth` routes for proper OAuth flow.

---

## Custom Role Attribute (Optional)

To persist user role in Cognito:
1. Add custom attribute `custom:appRole` in Cognito User Pool.
2. Update `RoleSelectionLogic.js` to write role via `UpdateUserAttributes` API.
3. Add Pre Token Generation Lambda to include `custom:appRole` in ID token claims.

---

## Files Changed
- `src/auth/cognitoConfig.js` - Updated redirect_uri to `/oidc-callback`
- `src/pages/index.jsx` - Added OIDC routes and catch-all redirect
- `src/pages/OidcCallback.jsx` - New callback handler
- `src/pages/PostAuth.jsx` - New post-auth routing logic
- `src/pages/RoleSelection.jsx` - Updated to use OIDC role logic
- `src/pages/signin.jsx` - Improved button UX (disable while loading)
- `src/main.jsx` - Removed duplicate Routes usage
- `public/_redirects` - SPA fallback for Netlify

---

**Last Updated**: Build completed successfully with OIDC routing fixes.
