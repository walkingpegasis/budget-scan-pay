import { useCallback, useEffect, useMemo, useState } from "react";

type AuthUser = {
  id: string;
  email: string;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
};

const STORAGE_KEY = "auth_state_v1";

function readStoredAuth(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { user: null, token: null };
    const parsed = JSON.parse(raw) as AuthState;
    return {
      user: parsed?.user ?? null,
      token: parsed?.token ?? null,
    };
  } catch {
    return { user: null, token: null };
  }
}

function writeStoredAuth(state: AuthState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => readStoredAuth());

  useEffect(() => {
    writeStoredAuth(state);
  }, [state]);

  const isAuthenticated = !!state.token && !!state.user;

  const signup = useCallback(async (email: string, password: string) => {
    // Fake signup; in real app call API
    if (!email || !password) throw new Error("Email and password are required");
    const fakeUser: AuthUser = { id: crypto.randomUUID(), email };
    const fakeToken = btoa(`${email}:${Date.now()}`);
    setState({ user: fakeUser, token: fakeToken });
    return { user: fakeUser, token: fakeToken };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!email || !password) throw new Error("Email and password are required");
    const fakeUser: AuthUser = { id: crypto.randomUUID(), email };
    const fakeToken = btoa(`${email}:${Date.now()}`);
    setState({ user: fakeUser, token: fakeToken });
    return { user: fakeUser, token: fakeToken };
  }, []);

  const logout = useCallback(() => {
    setState({ user: null, token: null });
  }, []);

  return useMemo(
    () => ({
      user: state.user,
      token: state.token,
      isAuthenticated,
      signup,
      login,
      logout,
    }),
    [state.user, state.token, isAuthenticated, signup, login, logout]
  );
}

