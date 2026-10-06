import { Layout } from './components/Layout';
import { useHashRoute } from './hooks/useHashRoute';
import { Dashboard } from './pages/Dashboard';
import { MilestoneTest } from './pages/MilestoneTest';
import { Onboarding } from './pages/Onboarding';
import { PlanView } from './pages/PlanView';
import { Practice } from './pages/Practice';
import { Settings } from './pages/Settings';
import { useAppState } from './state/AppState';

export default function App() {
  const { loading, loadError, plan } = useAppState();
  const route = useHashRoute();

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center text-slate-400">Loading…</div>;
  }
  if (loadError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg font-semibold text-slate-800">We couldn't load your data.</p>
        <p className="text-slate-500">{loadError}</p>
        <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    );
  }
  if (!plan) return <Onboarding />;

  return (
    <Layout route={route}>
      {route.name === 'dashboard' && <Dashboard />}
      {route.name === 'plan' && <PlanView />}
      {route.name === 'milestone' && <MilestoneTest key={route.phaseId} phaseId={route.phaseId} />}
      {route.name === 'practice' && <Practice key={route.taskId} taskId={route.taskId} />}
      {route.name === 'settings' && <Settings />}
    </Layout>
  );
}
