import { useEffect, useState } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../api/base44Client";

export default function PostAuth() {
  const auth = useAuth();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.isAuthenticated) {
      nav("/signin", { replace: true });
      return;
    }

    const checkUserRole = async () => {
      try {
        console.log("PostAuth: auth object:", auth);
        console.log("PostAuth: auth.user:", auth.user);
        console.log("PostAuth: auth.isAuthenticated:", auth.isAuthenticated);
        
        const idToken = auth.user?.id_token;
        console.log("PostAuth: idToken:", idToken ? "EXISTS" : "NULL/UNDEFINED");
        
        if (!idToken) {
          console.log("PostAuth: No idToken found, redirecting to RoleSelection");
          nav("/RoleSelection", { replace: true });
          return;
        }

        // Try to fetch user profile from your API
        console.log("PostAuth: Calling /auth/me with Authorization header");
        const response = await apiGet("/auth/me", {
          headers: {
            "Authorization": `Bearer ${idToken}`
          }
        });

        console.log("PostAuth: API response:", response);
        const userData = response?.data;
        const role = userData?.role;

        console.log("PostAuth: userData:", userData);
        console.log("PostAuth: role:", role);

        if (!role) {
          // No role saved yet, go to role selection
          nav("/RoleSelection", { replace: true });
          return;
        }

        // Navigate based on role
        const roleRoutes = {
          prescriber: "/PrescriberTool",
          prescriber_staff: "/PrescriberTool", 
          pharmacy_staff: "/PharmacyInterface"
        };

        const targetRoute = roleRoutes[role] || "/Home";
        nav(targetRoute, { replace: true });

      } catch (error) {
        console.error("Error fetching user role:", error);
        // On API error, assume no role and go to role selection
        nav("/RoleSelection", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [auth.isLoading, auth.isAuthenticated, nav]);

  if (loading) {
    return <div>Loading your profile…</div>;
  }

  return <div>Loading…</div>;
}
