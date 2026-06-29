import { useCallback, useEffect, useState, type ReactNode } from 'react';
import * as authService from '../services/auth';
import { AuthContext } from './auth-context';
import {
  AUTH_EXPIRED_EVENT,
  clearStoredAuth,
  notifyAuthExpired,
  readStoredAuth,
  writeStoredAuth,
  type StoredAuthState,
} from '../utils/authStorage';

interface JwtPayload {
  exp?: number;
}

function getTokenExpiryMs(token: string): number | null {
  const [, payload] = token.split('.');
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = window.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const parsed = JSON.parse(json) as JwtPayload;
    return typeof parsed.exp === 'number' ? parsed.exp * 1000 : null;
  } catch {
    return null;
  }
}

function readValidStoredAuth(): StoredAuthState {
  const storedAuth = readStoredAuth();
  if (!storedAuth.token) return storedAuth;

  const expiresAt = getTokenExpiryMs(storedAuth.token);
  if (expiresAt !== null && expiresAt <= Date.now()) {
    clearStoredAuth();
    return { token: null, user: null };
  }

  return storedAuth;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<StoredAuthState>(() => readValidStoredAuth());

  const logout = useCallback((): void => {
    clearStoredAuth();
    setAuthState({ token: null, user: null });
  }, []);

  const login = async (employee_id: string, password: string): Promise<void> => {
    const authState = await authService.login(employee_id, password);
    writeStoredAuth(authState);
    setAuthState({
      token: authState.token,
      user: authState.user,
    });
  };

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, logout);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, logout);
  }, [logout]);

  useEffect(() => {
    if (!authState.token) return undefined;

    const expiresAt = getTokenExpiryMs(authState.token);
    if (expiresAt === null) return undefined;

    const delay = expiresAt - Date.now();
    if (delay <= 0) {
      notifyAuthExpired();
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      notifyAuthExpired();
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [authState.token]);

  return (
    <AuthContext.Provider
      value={{
        token: authState.token,
        user: authState.user,
        isAuthenticated: authState.token !== null,
        isInitialized: true,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
