# Netlify Environment Variables Configuration Guide

## CRITICAL: Use the Correct Cognito App Client ID

Your app has **two different Cognito App Client IDs**:
- ❌ `3a4msro5du1e9sg902s0dh3ujg` (OLD - causes redirect_mismatch)
- ✅ `1ohivbrbk8aitpge7lu7ov1kna` (CORRECT - has URLs configured)

## Netlify Environment Variables Setup

Go to your Netlify site settings → Environment variables and add:

### Required Variables

```bash
# AWS Cognito - Use the WORKING App Client ID
VITE_COGNITO_AUTHORITY=https://us-east-1e7jguoyub.auth.us-east-1.amazoncognito.com
VITE_COGNITO_CLIENT_ID=1ohivbrbk8aitpge7lu7ov1kna

# Redirect URLs - Update to match your actual Netlify domain
VITE_COGNITO_REDIRECT_URI=https://chimerical-daifuku-f66dd6.netlify.app/
VITE_SIGNOUT_URI=https://chimerical-daifuku-f66dd6.netlify.app/logout

# Scopes
VITE_COGNITO_SCOPE=openid email profile

# Your API endpoint
VITE_API_BASE_URL=https://your-api-endpoint.com

# Pusher (for realtime notifications)
VITE_PUSHER_KEY=your_pusher_key
VITE_PUSHER_CLUSTER=us2
```

## AWS Cognito App Client Configuration

In AWS Cognito Console → App Client `1ohivbrbk8aitpge7lu7ov1kna`:

### ✅ Allowed callback URLs (must match EXACTLY with trailing slash):
```
http://localhost:5173/
https://chimerical-daifuku-f66dd6.netlify.app/
```

### ✅ Allowed sign-out URLs:
```
http://localhost:5173/logout
https://chimerical-daifuku-f66dd6.netlify.app/logout
```

### ✅ OAuth 2.0 Grant Types:
- [x] Authorization code grant
- [x] Implicit grant (if needed)

### ✅ OAuth Scopes:
- [x] openid
- [x] email
- [x] profile

## For Branch/Preview Deployments

If you use Netlify preview URLs (e.g., `deploy-preview-123--yoursite.netlify.app`):

**Option 1:** Add each preview URL to Cognito (tedious)

**Option 2:** Use a separate "dev" App Client for non-production:
- Set `VITE_COGNITO_CLIENT_ID` to a different App Client ID in branch deploy settings
- Configure that App Client with wildcard or all preview URLs

**Option 3:** Disable auth for preview deploys:
- Only enable production env vars on the main production branch

## Common Issues

### redirect_mismatch error:
- ✅ URLs in Cognito must **exactly** match `VITE_COGNITO_REDIRECT_URI` (including trailing slash)
- ✅ Must use the correct App Client ID (`1ohivbrbk8aitpge7lu7ov1kna`)

### React minified errors (#418, #423):
- Usually caused by the redirect_mismatch → fix Cognito URLs first
- Clear browser cache and cookies after fixing

### "Wrong client ID" still used:
- ✅ Rebuild your app after changing env vars: `npm run build`
- ✅ Redeploy to Netlify (env vars don't auto-trigger rebuilds)
- ✅ Clear Netlify's cache: **Deploys → Trigger deploy → Clear cache and deploy site**

## Verification Steps

1. Check your deployed app's network tab for the `/oauth2/authorize` request
2. Verify `client_id=1ohivbrbk8aitpge7lu7ov1kna` (not the old one)
3. Verify `redirect_uri=https://chimerical-daifuku-f66dd6.netlify.app/` with trailing slash
4. The Cognito login should work without redirect_mismatch

## Quick Deploy Checklist

- [ ] Updated `.env.local` with correct client ID for local dev
- [ ] Set all required env vars in Netlify
- [ ] Verified Cognito App Client URLs match **exactly**
- [ ] Rebuilt app: `npm run build`
- [ ] Deployed to Netlify (drag `dist/` folder or git push)
- [ ] Tested login flow on production URL
- [ ] Cleared browser cache if seeing old errors

---
Last updated: October 19, 2025
