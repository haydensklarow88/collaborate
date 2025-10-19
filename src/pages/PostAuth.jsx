import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";

const getRoleFromUser = (auth) => {
  const claims = auth.user?.profile || {};
  const role = claims["custom:appRole"] || claims["appRole"] || null;
  return role;
};

export default function PostAuth() {
  const auth = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.isAuthenticated) {
      nav("/signin", { replace: true });
      return;
    }
    const role = getRoleFromUser(auth);
    if (!role) {
      nav("/role-selection", { replace: true });
      return;
    }
    if (role === "pharmacy") nav("/pharmacy", { replace: true });
    else nav("/prescriber", { replace: true });
  }, [auth.isLoading, auth.isAuthenticated]);

  return <div>Loading…</div>;
}
