# 🔧 Manual Redirect Test - OIDC Debug

## What I Just Did

Temporarily replaced the OIDC library call (`auth.signinRedirect()`) with a **manual redirect** to prove the redirect URL works.

### Code Change in `src/pages/signin.jsx`

```js
const handleSignIn = async () => {
  // TEMPORARY: Manual redirect to prove the URL works (bypass library)
  const origin = window.location.origin;
  const domain = "https://us-east-1e7jguoyub.auth.us-east-1.amazoncognito.com";
  const clientId = "1ohivbrbk8aitpge7lu7ov1kna";
  const redirect = `${origin}/oidc-callback/`; // trailing slash

  const authorizeUrl =
    `${domain}/oauth2/authorize` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent("openid email profile")}` +
    `&redirect_uri=${encodeURIComponent(redirect)}`;

  console.log("[OIDC] Manual redirect to:", authorizeUrl);
  console.log("[OIDC] Redirect URI:", redirect);
  window.location.assign(authorizeUrl);
};
```

---

## What to Test

1. **Rebuild and deploy** the new `dist/` folder
2. Visit `/signin` and click "Sign in"
3. **Check Network tab** for navigation to:
   ```
   https://us-east-1e7jguoyub.auth.us-east-1.amazoncognito.com/oauth2/authorize
   ```

### Expected Outcomes

✅ **If you see the AWS Cognito login page:**
- The redirect URL is valid
- The problem was the OIDC library not firing
- Next: restore library with bulletproof config

❌ **If still stuck on "Redirecting…":**
- Check browser Console for JavaScript errors
- Verify button is wired to `handleSignIn`
- Check if any security policy is blocking navigation

---

## What's in the Console

Look for these logs:
```
[OIDC] Manual redirect to: https://us-east-1e7jguoyub.auth.us-east-1.amazoncognito.com/oauth2/authorize?...
[OIDC] Redirect URI: https://chimerical-daifuku-f66dd6.netlify.app/oidc-callback/
```

Then the page should navigate immediately to Cognito.

---

## After Test Passes

Once you confirm the manual redirect works, I'll:
1. Restore the library integration with bulletproof config
2. Ensure `authority` is correct (Hosted UI domain, not cognito-idp)
3. Verify OIDC provider initialization
4. Test end-to-end flow

---

## Cognito Must Have (Reminder)

**Allowed callback URLs:**
```
https://chimerical-daifuku-f66dd6.netlify.app/oidc-callback/
```

**Allowed sign-out URLs:**
```
https://chimerical-daifuku-f66dd6.netlify.app/logout
```

Both must be EXACT matches (including trailing slash on callback).

---

**Status**: Building now. Deploy the new `dist/` and test!
