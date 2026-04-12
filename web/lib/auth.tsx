'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, setTokens, clearTokens, type User } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { name: string; email: string; password: string; referral_code?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('pp_access_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const data = await authApi.me();
      setUser(data.user);
      localStorage.setItem('pp_user', JSON.stringify(data.user));
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Try to restore user from localStorage first for instant UI
    const cached = localStorage.getItem('pp_user');
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch { /* ignore */ }
    }
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password);
    setTokens(data.access_token, data.refresh_token);
    setUser(data.user);
    localStorage.setItem('pp_user', JSON.stringify(data.user));
  };

  const signup = async (signupData: { name: string; email: string; password: string; referral_code?: string }) => {
    const data = await authApi.signup(signupData);
    setTokens(data.access_token, data.refresh_token);
    setUser(data.user);
    localStorage.setItem('pp_user', JSON.stringify(data.user));
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
