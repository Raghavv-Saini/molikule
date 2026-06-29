import type { User } from '../types';

export const TOKEN_KEY = 'molikule_token';
export const USER_KEY = 'molikule_user';
export const AUTH_EXPIRED_EVENT = 'molikule:auth-expired';

export interface StoredAuthState {
  token: string | null;
  user: User | null;
}

export function clearStoredAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function readStoredAuth(): StoredAuthState {
  const storedToken = localStorage.getItem(TOKEN_KEY);
  const storedUser = localStorage.getItem(USER_KEY);
  if (!storedToken || !storedUser) {
    return { token: null, user: null };
  }

  try {
    return {
      token: storedToken,
      user: JSON.parse(storedUser) as User,
    };
  } catch {
    clearStoredAuth();
    return { token: null, user: null };
  }
}

export function writeStoredAuth(authState: StoredAuthState): void {
  if (!authState.token || !authState.user) {
    clearStoredAuth();
    return;
  }

  localStorage.setItem(TOKEN_KEY, authState.token);
  localStorage.setItem(USER_KEY, JSON.stringify(authState.user));
}

export function notifyAuthExpired(): void {
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}
