import { useEffect, useState, useCallback } from "react";

export function useAuth() {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("rtx_user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });

  const login = useCallback((email, role = "pharmacy") => {
    const u = { email, role };
    try {
      localStorage.setItem("rtx_user", JSON.stringify(u));
    } catch (e) {
      console.warn("unable to persist user", e);
    }
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("rtx_user");
    } catch (e) {
      console.warn("unable to remove user", e);
    }
    setUser(null);
  }, []);

  const requireRole = useCallback(
    (...roles) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  return { user, login, logout, requireRole };
}
