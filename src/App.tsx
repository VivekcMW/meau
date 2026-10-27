import { Component, Suspense, lazy } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { Shell, modulePath, switchContext } from './components/Shell';
import { Button, EmptyState } from './components/ui';
import { getPersona, moduleNames, personas } from './domain/config';
import type { ModuleId } from './domain/model';
import { useStore } from './domain/store';
import { HomePage } from './pages/Home';

const Planner = lazy(() => import('./pages/Planner').then(m => ({ default: m.PlannerPage })));
const Campaigns = lazy(() => import('./pages/Campaigns').then(m => ({ default: m.CampaignsPage })));
const CampaignDetail = lazy(() => import('./pages/Campaigns').then(m => ({ default: m.CampaignDetailPage })));
const Share = lazy(() => import('./pages/Campaigns').then(m => ({ default: m.SharePage })));
const Architecture = lazy(() => import('./pages/Architecture').then(m => ({ default: m.ArchitecturePage })));
const Inventory = lazy(() => import('./pages/Inventory').then(m => ({ default: m.InventoryPage })));
const Creative = lazy(() => import('./pages/Operations').then(m => ({ default: m.CreativePage })));
const Schedule = lazy(() => import('./pages/Operations').then(m => ({ default: m.SchedulePage })));
const Field = lazy(() => import('./pages/Operations').then(m => ({ default: m.FieldPage })));
const Finance = lazy(() => import('./pages/Commerce').then(m => ({ default: m.FinancePage })));
const Programmatic = lazy(() => import('./pages/Commerce').then(m => ({ default: m.ProgrammaticPage })));
const Reports = lazy(() => import('./pages/Insights').then(m => ({ default: m.ReportsPage })));
const Measure = lazy(() => import('./pages/Insights').then(m => ({ default: m.MeasurePage })));
const Audience = lazy(() => import('./pages/Insights').then(m => ({ default: m.AudiencePage })));
const Attribution = lazy(() => import('./pages/Insights').then(m => ({ default: m.AttributionPage })));
const Agents = lazy(() => import('./pages/Platform').then(m => ({ default: m.AgentsPage })));
const Admin = lazy(() => import('./pages/Platform').then(m => ({ default: m.AdminPage })));
const Tasks = lazy(() => import('./pages/Platform').then(m => ({ default: m.TasksPage })));
const Developer = lazy(() => import('./pages/Platform').then(m => ({ default: m.DeveloperPage })));

function Guard({ module, children }: { module: ModuleId; children: ReactNode }) {
  const w = useStore(s => s.workspace);
  const current = getPersona(w.persona);
  if (['home', 'tasks', 'agents'].includes(module) || current.nav.includes(module)) return children;
  const target = personas.find(p => p.id !== 'admin' && p.nav.includes(module)) || getPersona('admin');
  return <EmptyState title={`${moduleNames[module]} is a different part of the workflow.`} description={`Continue as ${target.name}, your ${target.role.toLowerCase()}, to explore this workspace.`} action={<Button onClick={() => switchContext(target.id)}>Continue as {target.name}</Button>} />;
}
class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('AllUnite view failed', error, info); }
  componentDidUpdate(previous: { resetKey: string }) { if (previous.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false }); }
  render() { return this.state.failed ? <EmptyState title="This view needs a fresh start." description="Your saved workspace is still in this browser. Reload to retry." action={<Button onClick={() => window.location.reload()}>Reload workspace</Button>} /> : this.props.children; }
}
function AppRoutes() {
  const location = useLocation();
  const protectedPage = (id: ModuleId, content: ReactNode) => <Guard module={id}>{content}</Guard>;
  return <ErrorBoundary resetKey={location.pathname}><Suspense fallback={<div className="page-loading" role="status"><span className="loading-orb" /><p>Connecting your workspace...</p></div>}><Routes>
    <Route path="/share/:id" element={<Share />} />
    <Route path="/architecture" element={<Architecture />} />
    <Route element={<Shell />}><Route index element={<HomePage />} />
      <Route path="/planner" element={protectedPage('planner', <Planner />)} />
      <Route path="/campaigns" element={protectedPage('campaigns', <Campaigns />)} />
      <Route path="/campaigns/:id" element={protectedPage('campaigns', <CampaignDetail />)} />
      <Route path="/inventory" element={protectedPage('inventory', <Inventory />)} />
      <Route path="/marketplace" element={protectedPage('marketplace', <Inventory marketplace />)} />
      <Route path="/creative" element={protectedPage('creative', <Creative />)} />
      <Route path="/schedule" element={protectedPage('schedule', <Schedule />)} />
      <Route path="/field" element={protectedPage('field', <Field />)} />
      <Route path="/finance" element={protectedPage('finance', <Finance />)} />
      <Route path="/ssp" element={protectedPage('ssp', <Programmatic supply />)} />
      <Route path="/dsp" element={protectedPage('dsp', <Programmatic />)} />
      <Route path="/reports" element={protectedPage('reports', <Reports />)} />
      <Route path="/measure" element={protectedPage('measure', <Measure />)} />
      <Route path="/data" element={protectedPage('data', <Audience />)} />
      <Route path="/attribution" element={protectedPage('attribution', <Attribution />)} />
      <Route path="/agents" element={protectedPage('agents', <Agents />)} />
      <Route path="/admin" element={protectedPage('admin', <Admin />)} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/developer" element={protectedPage('developer', <Developer />)} />
      <Route path="*" element={<EmptyState title="Let's get you back on track." description="This page isn't part of the workspace." action={<Link className="button button-primary" to={modulePath('home')}>Go to overview</Link>} />} />
    </Route>
  </Routes></Suspense></ErrorBoundary>;
}
export default function App() { return <HashRouter><AppRoutes /></HashRouter>; }
