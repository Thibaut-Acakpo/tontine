import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setCsrf } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await api('/auth/me');
      setCsrf(r.data.csrfToken);
      setUser(r.data.user);
    } catch {
      setCsrf(null);
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    const r = await api('/auth/login', { method: 'POST', body: { email, password } });
    const data = r.data;

    if (data.requires2FA) {
      return { requires2FA: true, preAuthToken: data.preAuthToken };
    }

    // ✅ CORRECTION : on met à jour le CSRF token à chaque login
    if (data.csrfToken) setCsrf(data.csrfToken);
    if (data.user) setUser(data.user);

    return { requiresPin: !!data.requiresPin };
  };

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST', body: {} });
    } catch {
      // session déjà expirée, on ignore
    }
    setCsrf(null);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}