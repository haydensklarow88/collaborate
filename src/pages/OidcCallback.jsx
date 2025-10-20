import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";

export default function OidcCallback() {
  const auth = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        console.log("OidcCallback: Starting signinRedirectCallback...");
        await auth.signinRedirectCallback();
        console.log("OidcCallback: signinRedirectCallback SUCCESS, navigating to /post-auth");
        console.log("OidcCallback: auth.isAuthenticated =", auth.isAuthenticated);
        console.log("OidcCallback: auth.user?.id_token exists?", !!auth.user?.id_token);
        nav("/post-auth", { replace: true });
      } catch (e) {
        console.error("OidcCallback: signinRedirectCallback FAILED:", e);
        nav("/signin", { replace: true });
      }
    })();
  }, []);
  return <div>Signing you in…</div>;
}
