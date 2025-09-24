import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type AuthState = {
  email: string | null;
  token: string | null;
};

type AuthContextValue = AuthState & {
  login: (email: string, token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialAuth = (): AuthState => {
    if (typeof window === 'undefined') return { email: null, token: null };
    try {
      const saved = window.localStorage.getItem("auth");
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AuthState>;
        return { email: parsed.email ?? null, token: parsed.token ?? null };
      }
    } catch {}
    return { email: null, token: null };
  };

  const initial = getInitialAuth();
  const [email, setEmail] = useState<string | null>(initial.email);
  const [token, setToken] = useState<string | null>(initial.token);

  const login = useCallback((newEmail: string, newToken: string) => {
    const next: AuthState = { email: newEmail, token: newToken };
    localStorage.setItem("auth", JSON.stringify(next));
    setEmail(newEmail);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth");
    setEmail(null);
    setToken(null);
  }, []);

  const value = useMemo(() => ({ email, token, login, logout }), [email, token, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};


