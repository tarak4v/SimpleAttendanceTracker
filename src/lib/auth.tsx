'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as storage from '@/lib/storage';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setIsAuthenticated(storage.isLoggedIn());
    setLoaded(true);
  }, []);

  function login(username: string, password: string): boolean {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      storage.login();
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }

  function logout() {
    storage.logout();
    setIsAuthenticated(false);
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
