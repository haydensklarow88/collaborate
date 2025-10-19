import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";

export default function OidcCallback() {
  const auth = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        await auth.signinRedirectCallback();
        nav("/post-auth", { replace: true });
      } catch (e) {
        console.error(e);
        nav("/signin", { replace: true });
      }
    })();
  }, []);
  return <div>Signing you in…</div>;
}
