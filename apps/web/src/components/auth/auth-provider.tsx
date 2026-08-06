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
    async function readSession(): Promise<AuthSession | null> {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      const data = (await res.json()) as {
        session?: { userId: string; authenticated?: boolean };
      };
      if (!data.session?.userId) return null;
      return { userId: data.session.userId };
    }

    async function hydrate() {
      try {
        // Access tokens expire in ~15m while the refresh cookie lasts a week.
        // Middleware already accepts a well-formed refresh cookie, so without
        // this step the shell shows PublicNav ("Join Waitlist") on authed pages.
        let next = await readSession();
        if (!next) {
          const refreshed = await fetch('/api/auth/refresh-token', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
          });
          if (refreshed.ok) next = await readSession();
        }
        if (next) {
          saveSession(next);
          setSessionState(next);
          dispatch(setAuth({ userId: next.userId, accessToken: '' }));
        } else {
          // Don't clobber a session set while hydrate was in flight (verify-code).
          setSessionState((prev) => {
            if (prev) return prev;
            clearSession();
            return null;
          });
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
