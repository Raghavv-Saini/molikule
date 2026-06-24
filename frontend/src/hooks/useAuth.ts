import { useState, useEffect } from 'react';
import * as authService from '../services/auth';
import type { User } from '../types';

const TOKEN_KEY = 'molikule_token';
const USER_KEY = 'molikule_user';

interface UseAuthReturn {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (employee_id: string, password: string) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as User);
      } catch {
        // If JSON parsing fails, clear corrupted data
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
  }, []);

  const login = async (employee_id: string, password: string): Promise<void> => {
    const authState = await authService.login(employee_id, password);
    localStorage.setItem(TOKEN_KEY, authState.token);
    localStorage.setItem(USER_KEY, JSON.stringify(authState.user));
    setToken(authState.token);
    setUser(authState.user);
  };

  const logout = (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  return {
    token,
    user,
    isAuthenticated: token !== null,
    login,
    logout,
  };
}
