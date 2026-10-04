import { Layout } from './components/Layout';
import { useHashRoute } from './hooks/useHashRoute';
import { Dashboard } from './pages/Dashboard';
import { MilestoneTest } from './pages/MilestoneTest';
import { Onboarding } from './pages/Onboarding';
import { PlanView } from './pages/PlanView';
import { Settings } from './pages/Settings';
import { useAppState } from './state/AppState';

export default function App() {
  const { loading, plan } = useAppState();
  const route = useHashRoute();

  if (loading) {
    return <div className="flex min-h-dvh items-center justify-center text-slate-400">Loading…</div>;
  }
  if (!plan) return <Onboarding />;

  return (
    <Layout route={route}>
      {route.name === 'dashboard' && <Dashboard />}
      {route.name === 'plan' && <PlanView />}
      {route.name === 'milestone' && <MilestoneTest key={route.phaseId} phaseId={route.phaseId} />}
      {route.name === 'settings' && <Settings />}
    </Layout>
  );
}
