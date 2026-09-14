import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On first load, if a token is stored, try to restore the session.
  // Handles backend cold starts (502/504/network glitches) with retries,
  // and only removes the token if the backend explicitly returns 401/403.
  useEffect(() => {
    const token = localStorage.getItem("splitmate_token");
    if (!token) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function restoreSession(retriesLeft = 3) {
      try {
        const res = await api.get("/auth/me");
        if (isMounted) {
          setUser(res.data.user);
          setLoading(false);
        }
      } catch (err) {
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          // Token is genuinely invalid or expired (7+ days old)
          localStorage.removeItem("splitmate_token");
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
        } else if (retriesLeft > 0) {
          // Server cold start (502/503/504) or temporary network glitch.
          // Wait 2s and retry before giving up, so user stays logged in for 7 days.
          setTimeout(() => {
            if (isMounted) restoreSession(retriesLeft - 1);
          }, 2000);
        } else {
          if (isMounted) setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function signup(name, email, password) {
    const res = await api.post("/auth/signup", { name, email, password });
    localStorage.setItem("splitmate_token", res.data.token);
    setUser(res.data.user);
  }

  async function login(email, password) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("splitmate_token", res.data.token);
    setUser(res.data.user);
  }

  function logout() {
    localStorage.removeItem("splitmate_token");
    setUser(null);
  }

  function updateUser(newData) {
    setUser((prev) => ({ ...prev, ...newData }));
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
