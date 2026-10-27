import { Activity, ArrowUpRight, BarChart3, Bell, Blocks, Building2, CalendarDays, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, Code2, Command, Compass, CreditCard, Globe2, Handshake, Image, LayoutDashboard, Layers, ListTodo, Menu, MessageSquare, MoreHorizontal, Network, PanelLeftClose, PanelLeftOpen, Search, Settings2, ShieldCheck, Sparkles, Target, TrendingUp, Truck, Users, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getPersona, markets, moduleNames, personas } from '../domain/config';
import { canSeeCampaign, workspaceTasks } from '../domain/engine';
import { architectureApps } from '../domain/architecture';
import { frames } from '../domain/fixtures';
import type { MarketFilter, ModuleId, PersonaId, Workspace } from '../domain/model';
import { useStore } from '../domain/store';
import { BrandMark, IconButton, Modal, SearchField } from './ui';
import { Onboarding, TourHelp } from './Onboarding';
import { useTourStore } from '../domain/tour-store';
import { Assistant } from './Assistant';

export const moduleIcons: Record<ModuleId, LucideIcon> = {
  home: LayoutDashboard, planner: Compass, deals: Handshake, campaigns: Layers, inventory: Globe2, marketplace: Building2, measure: Activity,
  creative: Image, schedule: CalendarDays, field: Truck, ssp: TrendingUp, dsp: Target, reports: BarChart3, finance: CreditCard,
  attribution: Target, data: Users, agents: Sparkles, admin: Settings2, developer: Code2, tasks: ListTodo,
};
export const modulePath = (id: ModuleId) => id === 'home' ? '/' : `/${id}`;
export function switchContext(role: PersonaId, owner?: Workspace['owner']) {
  return useStore.getState().update(w => ({ ...w, persona: role, owner: owner || w.owner }));
}
export function Shell() {
  const { workspace: w, notice, dismiss, notify, update } = useStore();
  const persona = getPersona(w.persona);
  const location = useLocation();
  const currentApp = architectureApps.find(app => app.id === location.pathname.split('/')[1]);
  const navigate = useNavigate();
  const [contextOpen, setContextOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const assistantOpener = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const visible = w.campaigns.filter(c => canSeeCampaign(w, c) && (w.market === 'All' || c.market === w.market));
  const taskCount = workspaceTasks(w).length;
  const roleNav = persona.nav.filter(id => id !== 'tasks');
  const ownerRole = ['sales', 'ops', 'finance', 'reviewer', 'crew', 'yield', 'executive'].includes(w.persona);
  const tenant = ownerRole ? w.owner : persona.tenant;
  useEffect(() => {
    function onKey(event: KeyboardEvent) { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); if (!useTourStore.getState().chooserOpen && !contextOpen && !appsOpen && !helpOpen && !notificationsOpen && !mobileOpen && !assistantOpen) setSearchOpen(open => !open); } }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [contextOpen, appsOpen, helpOpen, notificationsOpen, mobileOpen, assistantOpen]);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (notice?.kind === 'success') { const timer = setTimeout(dismiss, 5500); return () => clearTimeout(timer); }
  }, [notice, dismiss]);
  const brand = <Link className="sidebar-brand" to="/" aria-label="AllUnite One home"><BrandMark /></Link>;
  const nav = <>
    <button className="workspace-picker" aria-label={`Switch workspace role: ${tenant}, ${persona.role}`} title={`${tenant} · ${persona.role}`} onClick={() => setContextOpen(true)}><span className="workspace-icon"><Building2 size={17} /></span><span><strong>{tenant}</strong><small>{persona.role}</small></span><ChevronDown size={14} /></button>
    <div className="sidebar-label">WORKSPACE</div>
    <nav aria-label="Main navigation" className="primary-nav">
      {roleNav.slice(0, 6).map(id => { const Icon = moduleIcons[id]; return <NavLink key={id} end={id === 'home'} to={modulePath(id)} aria-label={moduleNames[id]} title={moduleNames[id]} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={19} /><span>{moduleNames[id]}</span></NavLink>; })}
      <NavLink to="/tasks" aria-label={`My tasks${taskCount ? ` (${taskCount})` : ''}`} title={`My tasks${taskCount ? ` (${taskCount})` : ''}`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><ListTodo size={19} /><span>My tasks</span>{taskCount > 0 && <span className="nav-count coral-count">{taskCount}</span>}</NavLink>
      {roleNav.length > 6 && <details className="more-tools" open={roleNav.slice(6).some(id => location.pathname.startsWith(modulePath(id))) || undefined}>
        <summary aria-label="More tools" title="More tools"><MoreHorizontal className="more-tools-icon" size={19} /><span>More tools</span><ChevronDown size={14} /></summary>
        {roleNav.slice(6).map(id => { const Icon = moduleIcons[id]; return <NavLink key={id} to={modulePath(id)} aria-label={moduleNames[id]} title={moduleNames[id]} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{moduleNames[id]}</span></NavLink>; })}
      </details>}
      <button className="nav-item" aria-label="All apps" title="All apps" onClick={() => setAppsOpen(true)}><Blocks size={19} /><span>All apps</span><span className="nav-new">{architectureApps.length}</span></button>
    </nav>
    <div className="sidebar-bottom">
      <button className="nav-item" aria-label="Workflow assistant" title="Workflow assistant" onClick={e => { assistantOpener.current = e.currentTarget; setAssistantOpen(true); }}><MessageSquare size={18} /><span>Workflow assistant</span></button>
      <button className="nav-item" aria-label="Help & getting started" title="Help & getting started" onClick={() => setHelpOpen(true)}><CircleHelp size={18} /><span>Help & getting started</span></button>
      <button className="profile-button" aria-label={`Switch workspace role: ${persona.name}, ${persona.role}`} title={`${persona.name} · ${persona.role}`} onClick={() => setContextOpen(true)}><span className="avatar">{persona.initials}</span><span><strong>{persona.name}</strong><small>{persona.role}</small></span><ChevronDown size={15} /></button>
    </div>
  </>;
  const searchResults = useMemo(() => {
    const text = query.toLowerCase().trim();
    return [
      ...[...new Set([...persona.nav, 'tasks' as const, 'agents' as const])].map(id => ({ name: moduleNames[id], detail: 'Workspace', url: modulePath(id) })),
      ...w.campaigns.filter(c => canSeeCampaign(w, c)).map(c => ({ name: c.name, detail: `${c.client} · ${c.id}`, url: `/campaigns/${c.id}` })),
      ...frames.filter(f => text && `${f.name} ${f.id}`.toLowerCase().includes(text)).slice(0, 5).map(f => ({ name: f.name, detail: `${f.city} · ${f.type}`, url: `/inventory?frame=${f.id}` })),
    ].filter(item => !text || `${item.name} ${item.detail}`.toLowerCase().includes(text)).slice(0, 9);
  }, [query, persona.nav, w]);
  const events = visible.flatMap(c => c.events.map(event => ({ ...event, campaign: c.name, campaignId: c.id }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
  return <div className={`app-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a>
    <aside className="sidebar" id="workspace-sidebar" aria-label="Workspace sidebar"><div className="sidebar-header">{brand}<IconButton className="sidebar-toggle" label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!sidebarCollapsed} aria-controls="workspace-sidebar" onClick={() => setSidebarCollapsed(collapsed => !collapsed)}>{sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</IconButton></div>{nav}</aside>
    <div className="app-main"><header className="topbar"><div className="topbar-left"><IconButton className="mobile-menu" label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></IconButton><span className="topbar-breadcrumb">Workspace <ChevronRight size={13} /><strong>{moduleNames[(location.pathname.split('/')[1] || 'home') as ModuleId] || 'Campaign'}</strong></span></div>
      <button className="global-search" aria-label="Search campaigns, places and apps" onClick={() => setSearchOpen(true)}><Search size={17} /><span>Search workspace</span><kbd><Command size={11} /> K</kbd></button>
      <div className="topbar-actions"><Link className="architecture-cta" aria-label="Platform architecture" title="Explore personas, apps and workflows" to={currentApp ? `/architecture?app=${currentApp.id}` : '/architecture'} state={{ from: `${location.pathname}${location.search}` }}><Network size={17} /><span>Architecture</span></Link><div className="market-picker"><Globe2 size={16} /><select aria-label="Market filter" value={w.market} onChange={e => update(current => ({ ...current, market: e.target.value as MarketFilter }))}><option value="All">All markets</option>{Object.values(markets).map(m => <option key={m.key} value={m.key}>{m.country}</option>)}</select></div><span className="topbar-divider" /><IconButton label="Open notifications" className="notification-button" onClick={() => setNotificationsOpen(true)}><Bell size={19} /><i /></IconButton><button className="assistant-top" aria-label="Workflow assistant" onClick={e => { assistantOpener.current = e.currentTarget; setAssistantOpen(open => !open); }} aria-expanded={assistantOpen}><Sparkles size={16} /><span>Assistant</span></button><button aria-label="Switch persona" className="avatar topbar-avatar" onClick={() => setContextOpen(true)}>{persona.initials}</button></div>
    </header><Onboarding blocked={contextOpen || appsOpen || searchOpen || mobileOpen || notificationsOpen || helpOpen || assistantOpen}><Outlet /></Onboarding>
      <footer className="app-footer"><span><strong>AllUnite One</strong><span className="footer-demo">Browser-only demo</span></span><button onClick={() => setHelpOpen(true)}><CircleHelp size={13} />Help</button></footer>
    </div>
    <Modal open={mobileOpen} onClose={() => setMobileOpen(false)} title="Navigation" drawer><div className="mobile-nav-content">{brand}{nav}</div></Modal>
    <Modal open={contextOpen} onClose={() => setContextOpen(false)} title="Switch workspace role" description="Preview the workflow for another person. Your campaign data stays in this browser." wide>
      {ownerRole && <label className="field-label">Media owner workspace<select className="input" value={w.owner} onChange={e => update(current => ({ ...current, owner: e.target.value === 'Vista Outdoor' ? 'Vista Outdoor' : 'Urban Reach Media' }))}><option>Urban Reach Media</option><option>Vista Outdoor</option></select></label>}
      <div className="persona-grid">{personas.map(p => <button key={p.id} className={`persona-option ${p.id === persona.id ? 'selected' : ''}`} onClick={() => { if (switchContext(p.id)) { setContextOpen(false); navigate(modulePath(p.home)); } }}><span className={`avatar avatar-${p.id}`}>{p.initials}</span><span><strong>{p.name}</strong><small>{p.role}</small></span>{p.id === persona.id && <Check size={16} />}</button>)}</div><div className="subtle-note"><ShieldCheck size={14} />Demo identities only. No real authentication or private tenant data.</div>
    </Modal>
    <Modal open={appsOpen} onClose={() => setAppsOpen(false)} title="All apps" description={`Open a tool as ${persona.name}, or preview another role where shown.`} wide>
      <div className="app-grid">{architectureApps.map(app => {
        const Icon = moduleIcons[app.id];
        const entitled = persona.nav.includes(app.id) || app.id === 'agents';
        const target = entitled ? persona : personas.find(p => p.id !== 'admin' && p.nav.includes(app.id)) || getPersona('admin');
        return <button key={app.id} className="app-tile" onClick={() => {
          if (!entitled) {
            if (!switchContext(target.id)) return;
            notify(`Previewing ${moduleNames[app.id]} as ${target.name}`);
          }
          setAppsOpen(false); navigate(modulePath(app.id));
        }}><span className="app-tile-icon"><Icon size={20} /></span><strong>{moduleNames[app.id]}</strong><p>{app.purpose}</p><small>{entitled ? 'Open app' : `Preview as ${target.name}`}<ArrowUpRight size={12} /></small></button>;
      })}</div>
    </Modal>
    <Modal open={searchOpen} onClose={() => { setSearchOpen(false); setQuery(''); }} title="Search workspace"><SearchField value={query} onChange={setQuery} placeholder="Campaign name, location or app" label="Search workspace" /><div className="search-results">{searchResults.length ? searchResults.map(result => <button key={result.url} onClick={() => { navigate(result.url); setSearchOpen(false); setQuery(''); }}><Search size={17} /><span><strong>{result.name}</strong><small>{result.detail}</small></span><ArrowUpRight size={16} /></button>) : <p className="muted">No results. Try a campaign name, location or app.</p>}</div></Modal>
    <Modal open={notificationsOpen} onClose={() => setNotificationsOpen(false)} title="Campaign activity" drawer><div className="timeline">{events.map(event => <button className="timeline-item timeline-button" key={`${event.campaignId}-${event.id}`} onClick={() => { navigate(`/campaigns/${event.campaignId}?tab=activity`); setNotificationsOpen(false); }}><span className="timeline-dot"><CheckCheck size={13} /></span><span><strong>{event.text}</strong><small>{event.campaign} · {event.actor}</small></span></button>)}</div></Modal>
    <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Getting started" description="Choose a guided walkthrough, or continue exploring at your own pace."><TourHelp onClose={() => setHelpOpen(false)} /><p className="subtle-note">Payments, AI, serving, verification and tax are simulated. Your work stays in this browser.</p></Modal>
    <Assistant key={`${w.persona}:${w.owner}:${w.market}`} open={assistantOpen} onClose={() => setAssistantOpen(false)} opener={assistantOpener} />
    {createPortal(<div aria-live="polite">{notice && <div className={`toast toast-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}><span>{notice.kind === 'error' ? <CircleHelp size={19} /> : <Check size={19} />}</span><p>{notice.message}</p><IconButton label="Dismiss notification" onClick={dismiss}><X size={16} /></IconButton></div>}</div>, document.body)}
  </div>;
}
