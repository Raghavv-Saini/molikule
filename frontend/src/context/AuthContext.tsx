import { useState, type ReactNode } from 'react';
import * as authService from '../services/auth';
import type { User } from '../types';
import { AuthContext } from './auth-context';

const TOKEN_KEY = 'molikule_token';
const USER_KEY = 'molikule_user';

interface StoredAuthState {
  token: string | null;
  user: User | null;
}

function readStoredAuth(): StoredAuthState {
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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<StoredAuthState>(() => readStoredAuth());

  const login = async (employee_id: string, password: string): Promise<void> => {
    const authState = await authService.login(employee_id, password);
    localStorage.setItem(TOKEN_KEY, authState.token);
    localStorage.setItem(USER_KEY, JSON.stringify(authState.user));
    setAuthState({
      token: authState.token,
      user: authState.user,
    });
  };

  const logout = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuthState({ token: null, user: null });
  };

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
