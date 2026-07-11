'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { api } from '@/lib/api/client';
import { clearSession, saveSession, type AuthSession } from '@/lib/auth/session';
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
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' });
        const data = (await res.json()) as {
          session?: { userId: string; authenticated?: boolean };
        };
        if (data.session?.userId) {
          const next: AuthSession = { userId: data.session.userId };
          saveSession(next);
          setSessionState(next);
          dispatch(setAuth({ userId: next.userId, accessToken: '' }));
        } else {
          clearSession();
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
      setSessionState({ userId: next.userId });
      dispatch(setAuth({ userId: next.userId, accessToken: '' }));
    },
    [dispatch],
  );

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: '{}',
    }).catch(() => null);
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
