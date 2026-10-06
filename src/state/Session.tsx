import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, authApi, backendAvailable, getToken, setToken, type ApiUser } from '../services/api';
import { LocalStorageAdapter, type StorageAdapter } from '../services/storage';
import { ApiStorageAdapter } from '../services/storage/apiAdapter';

/**
 * Decides where data lives:
 *  - "account": signed in, everything stored on the backend (synced across devices)
 *  - "local":   no account (or backend not running), stored in this browser
 */
export type SessionState =
  | { status: 'checking' }
  | { status: 'auth'; backend: true }
  | { status: 'local'; backend: boolean }
  | { status: 'account'; backend: true; user: ApiUser };

interface SessionValue {
  session: SessionState;
  storage: StorageAdapter | null;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, name?: string): Promise<void>;
  logout(): Promise<void>;
  continueLocally(): void;
  /** From local mode: go to the sign-in screen. */
  openAuth(): void;
}

const LOCAL_CHOICE_KEY = 'levelup:local-mode';
const SessionContext = createContext<SessionValue | null>(null);

function rememberLocalChoice(on: boolean) {
  try {
    if (on) localStorage.setItem(LOCAL_CHOICE_KEY, '1');
    else localStorage.removeItem(LOCAL_CHOICE_KEY);
  } catch {
    // ignore
  }
}

function choseLocal(): boolean {
  try {
    return localStorage.getItem(LOCAL_CHOICE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Copy a plan made offline into a new account so nothing is lost. */
async function uploadLocalData(): Promise<void> {
  const local = new LocalStorageAdapter();
  const [profile, plan, progress] = await Promise.all([local.loadProfile(), local.loadPlan(), local.loadProgress()]);
  if (!profile || !plan) return;
  const remote = await api<{ plan: unknown }>('GET', '/data');
  if (remote.plan) return; // the account already has a plan — keep it
  await api('PUT', '/data/profile', profile);
  await api('PUT', '/data/plan', plan);
  if (progress) await api('PUT', '/data/progress', progress);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: 'checking' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const backend = await backendAvailable();
      if (cancelled) return;
      if (!backend) return setSession({ status: 'local', backend: false });
      if (getToken()) {
        try {
          const { user } = await authApi.me();
          if (!cancelled) setSession({ status: 'account', backend: true, user });
          return;
        } catch {
          setToken(null);
        }
      }
      if (cancelled) return;
      setSession(choseLocal() ? { status: 'local', backend: true } : { status: 'auth', backend: true });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const storage = useMemo<StorageAdapter | null>(() => {
    if (session.status === 'account') return new ApiStorageAdapter();
    if (session.status === 'local') return new LocalStorageAdapter();
    return null;
  }, [session]);

  const signedIn = useCallback(async (token: string, user: ApiUser, fromRegister: boolean) => {
    setToken(token);
    rememberLocalChoice(false);
    if (fromRegister) await uploadLocalData().catch(() => undefined);
    setSession({ status: 'account', backend: true, user });
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      session,
      storage,
      login: async (email, password) => {
        const r = await authApi.login(email, password);
        await signedIn(r.token, r.user, false);
      },
      register: async (email, password, name) => {
        const r = await authApi.register(email, password, name);
        await signedIn(r.token, r.user, true);
      },
      logout: async () => {
        if (storage instanceof ApiStorageAdapter) await storage.flush();
        await authApi.logout().catch(() => undefined);
        setToken(null);
        setSession({ status: 'auth', backend: true });
      },
      continueLocally: () => {
        rememberLocalChoice(true);
        setSession({ status: 'local', backend: session.status !== 'checking' && session.backend });
      },
      openAuth: () => {
        rememberLocalChoice(false);
        setSession({ status: 'auth', backend: true });
      },
    }),
    [session, storage, signedIn],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
