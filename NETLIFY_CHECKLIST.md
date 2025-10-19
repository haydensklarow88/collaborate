# Netlify + Cognito deploy checklist

This file contains a short checklist and the exact commit message to use when pushing the recent auth changes. Follow these steps locally and then push to your repo to trigger a Netlify build.

1) Verify Netlify environment variables

  - Open Netlify → Your site → Site settings → Build & deploy → Environment
  - Add or confirm the following variables (exact values):

    VITE_COGNITO_DOMAIN = https://us-east-1e7jguoyub.auth.us-east-1.amazoncognito.com
    VITE_COGNITO_CLIENT_ID = 3a4msro5du1e9sg902s0dh3ujg
    VITE_REDIRECT_URI = https://chimerical-daifuku-f66dd6.netlify.app/
    VITE_SIGNOUT_URI = https://chimerical-daifuku-f66dd6.netlify.app/logout
    VITE_COGNITO_SCOPE = openid email profile

  - Save changes.

2) Cognito console — App client settings (Required)

  - Open AWS Console → Amazon Cognito → User pools → (select your pool)
  - In the left nav choose: App integration → App client settings
  - Choose the App client used above (client id must match VITE_COGNITO_CLIENT_ID)
  - In Allowed callback URLs add (exact):
      https://chimerical-daifuku-f66dd6.netlify.app/
      http://localhost:5173/   # optional for local testing
  - In Allowed logout URLs add (exact):
      https://chimerical-daifuku-f66dd6.netlify.app/logout
      http://localhost:5173/logout
  - Under OAuth 2.0, enable: Authorization code grant
  - Under OAuth 2.0 scopes, ensure: openid, email, profile are selected
  - Save changes.

3) Local dev NOTE

  - If testing locally use `.env.local` with these values (copy from `.env.local.example` and update):
      VITE_COGNITO_AUTHORITY=https://us-east-1e7jguoyub.auth.us-east-1.amazoncognito.com
      VITE_COGNITO_CLIENT_ID=1ohivbrbk8aitpge7lu7ov1kna   # local client if you use different client
      VITE_COGNITO_REDIRECT_URI=http://localhost:5173/
      VITE_SIGNOUT_URI=http://localhost:5173/logout

4) Recommended quick test (without custom domain)

  - Use the Netlify temporary domain for testing: https://chimerical-daifuku-f66dd6.netlify.app/
  - This avoids DNS/custom-domain verification delays.

5) How to inspect the authorize URL and console errors

  - In your browser, open DevTools → Network & Console.
  - Start the sign-in flow from the SPA. In Network look for a request to the Cognito authorize endpoint (redirect) or a 302 that contains the authorize URL.
  - Copy the full authorize URL (the one that includes `response_type`, `scope`, `client_id`, `redirect_uri`, `state` etc.) and paste it here if you want me to inspect it.
  - If Cognito redirects back with an error query string (e.g., `?error=invalid_scope&error_description=...`) copy that whole redirect URL from the address bar or the network entry and paste it here.
  - If you see console CORS errors, copy the first error lines from DevTools Console (they usually show the blocked URL and the CORS header missing). Paste them here.

6) Exact commit message to use locally

  git add -A
  git commit -m "Provide explicit Cognito OIDC metadata to avoid browser discovery CORS"
  git push

7) If Netlify shows CORS errors after pushing

  - Option A (fast): ensure Cognito App client and Netlify env values are exact and test again using the Netlify domain.
  - Option B (fallback): I can scaffold a small Netlify Function to proxy discovery/token endpoints server-side (recommended if browser CORS continues). Tell me if you prefer this and I will create the function files.

If you want, I can also create this checklist file in the repo (done), and/or scaffold the Netlify Function now — you will need to commit & push locally.
