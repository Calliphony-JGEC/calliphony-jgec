import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const token = getToken();
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const data = await api.me();
        if (!cancelled) setUser(data.user);
      } catch {
        setToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
  };

  const value = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
