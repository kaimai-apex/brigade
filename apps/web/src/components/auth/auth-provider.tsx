'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { api } from '@/lib/api/client';
import { clearSession, getSession, saveSession, type AuthSession } from '@/lib/auth/session';
import { setAuth, clearAuth } from '@/lib/store/slices/authSlice';

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  setSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function hydrate() {
      const existing = getSession();
      if (existing) {
        setSessionState(existing);
        api.setToken(existing.accessToken);
        dispatch(setAuth({ userId: existing.userId, accessToken: existing.accessToken }));
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        const data = (await res.json()) as {
          session?: { userId: string; accessToken: string; refreshToken?: string };
        };
        if (data.session?.accessToken) {
          const next: AuthSession = {
            userId: data.session.userId,
            accessToken: data.session.accessToken,
            refreshToken: data.session.refreshToken ?? '',
          };
          saveSession(next);
          api.setToken(next.accessToken);
          setSessionState(next);
          dispatch(setAuth({ userId: next.userId, accessToken: next.accessToken }));
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }

    void hydrate();
  }, [dispatch]);

  const setSession = useCallback(
    (next: AuthSession) => {
      saveSession(next);
      api.setToken(next.accessToken);
      setSessionState(next);
      dispatch(setAuth({ userId: next.userId, accessToken: next.accessToken }));
    },
    [dispatch],
  );

  const logout = useCallback(async () => {
    const current = getSession();
    if (current?.refreshToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      }).catch(() => null);
    }
    clearSession();
    api.setToken(null);
    setSessionState(null);
    dispatch(clearAuth());
    router.push('/');
  }, [dispatch, router]);

  return (
    <AuthContext.Provider value={{ session, loading, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
