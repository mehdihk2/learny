import { useState, type FormEvent } from 'react';
import { Button, Card, cx } from '../components/ui';
import { useSession } from '../state/Session';

export function AuthScreen() {
  const { login, register, continueLocally } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  const input = 'mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200';

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <img src="/favicon.svg" alt="" className="mx-auto h-12 w-12" />
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">LevelUp Language</h1>
        <p className="mt-1 text-slate-600">Save your plan and progress, and practise on any device.</p>
      </div>
      <Card>
        <div className="mb-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold">
          {(['register', 'login'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={cx('rounded-lg py-2', mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}
            >
              {m === 'register' ? 'Create account' : 'Sign in'}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <label className="block">
              <span className="text-sm font-medium text-slate-700">First name (optional)</span>
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
            </label>
          )}
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input className={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              className={input}
              type="password"
              required
              minLength={mode === 'register' ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
            {mode === 'register' && <span className="mt-1 block text-xs text-slate-500">At least 8 characters.</span>}
          </label>
          {error && (
            <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'register' ? 'Create my account' : 'Sign in'}
          </Button>
        </form>
      </Card>
      <button type="button" onClick={continueLocally} className="mt-4 text-sm font-medium text-slate-500 hover:text-slate-700 hover:underline">
        Continue without an account (data stays on this device)
      </button>
    </div>
  );
}
