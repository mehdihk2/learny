import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthScreen } from './pages/AuthScreen';
import { AppStateProvider } from './state/AppState';
import { SessionProvider, useSession } from './state/Session';
import './index.css';

function Root() {
  const { session, storage } = useSession();
  if (session.status === 'checking' || !storage) {
    if (session.status === 'auth') return <AuthScreen />;
    return <div className="flex min-h-dvh items-center justify-center text-slate-400">Loading…</div>;
  }
  // Re-mount the app state whenever the storage (account/local) changes.
  const key = session.status === 'account' ? `account:${session.user.id}` : 'local';
  return (
    <AppStateProvider key={key} storage={storage}>
      <App />
    </AppStateProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <Root />
    </SessionProvider>
  </StrictMode>,
);
