import { useCallback, useEffect, useMemo, useState } from "react";
import api, { setSessionUser, setUnauthorizedHandler, tokenStore } from "../lib/api";
import { removeLegacyGeminiKey } from "../lib/geminiKey";
import { AuthContext } from "./hooks";

// status: "checking" (validating a stored token) | "authenticated" | "anonymous"
//         | "unreachable" (have a token but the server did not answer)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (tokenStore.get() ? "checking" : "anonymous"));

  const logout = useCallback(() => {
    tokenStore.clear();
    setSessionUser(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  // Resolves the stored token into a user. Returns a promise; all state changes
  // happen once the request settles.
  const verify = useCallback(() => {
    if (!tokenStore.get()) return Promise.resolve();
    return api.get("/auth/me").then(
      (res) => {
        setSessionUser(res.data.user.id);
        setUser(res.data.user);
        setStatus("authenticated");
      },
      (error) => {
        if (error.response?.status === 401) logout();
        else setStatus("unreachable");
      }
    );
  }, [logout]);

  useEffect(() => {
    removeLegacyGeminiKey();
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    verify();
  }, [verify]);

  const retry = useCallback(() => {
    setStatus("checking");
    verify();
  }, [verify]);

  const completeAuth = useCallback((data) => {
    tokenStore.set(data.token);
    setSessionUser(data.user.id);
    setUser(data.user);
    setStatus("authenticated");
  }, []);

  const login = useCallback(
    async (email, password) => completeAuth((await api.post("/auth/login", { email, password })).data),
    [completeAuth]
  );

  const register = useCallback(
    async (email, password) => completeAuth((await api.post("/auth/register", { email, password })).data),
    [completeAuth]
  );

  const value = useMemo(
    () => ({ user, status, login, register, logout, retry }),
    [user, status, login, register, logout, retry]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
