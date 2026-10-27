import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, CheckCheck, CircleHelp, Database, Fingerprint, GitBranch, Globe2, Layers, ListTodo, Network, Pause, Play, RotateCcw, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { EcosystemMap } from '../components/EcosystemMap';
import { moduleIcons, modulePath } from '../components/Shell';
import { Badge, BrandMark, Button } from '../components/ui';
import { appGroups, appsForPersona, architectureApps, architectureWorkflows, defaultPersonaWorkflow, ecosystemAreas, featuresForPersona, personaGoals, personaGroups, personasForApp } from '../domain/architecture';
import type { ArchitectureApp, ArchitectureAppId, ArchitectureWorkflow, EcosystemArea, EcosystemAreaId } from '../domain/architecture';
import { getPersona, markets, moduleNames, personas } from '../domain/config';
import type { Persona, PersonaId } from '../domain/model';
import '../architecture.css';

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
}

export function ArchitecturePage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const appParam = params.get('app');
  const personaParam = params.get('persona');
  const areaParam = params.get('area');
  const requestedApp = architectureApps.find(app => app.id === appParam);
  const requestedPersona = personas.find(persona => persona.id === personaParam);
  const requestedArea = ecosystemAreas.find(area => area.id === areaParam);
  const invalidSelection = Boolean(params.has('app') && !requestedApp || params.has('persona') && !requestedPersona || params.has('area') && !requestedArea || ['app', 'persona', 'area'].filter(key => params.has(key)).length > 1);
  const app = invalidSelection ? undefined : requestedApp;
  const persona = invalidSelection ? undefined : requestedPersona;
  const area = invalidSelection ? undefined : requestedArea;
  const hasSelection = Boolean(app || persona || area);
  const relatedApps = area ? architectureApps.filter(app => area.apps.includes(app.id)) : persona ? appsForPersona(persona.id) : app ? [app] : architectureApps;
  const relatedPeople = area ? personas.filter(persona => area.people.includes(persona.id)) : app ? personasForApp(app.id) : personas;
  const relatedWorkflows = architectureWorkflows.filter(workflow => !hasSelection || workflow.steps.some(step => area ? area.apps.includes(step.app) : app ? step.app === app.id : persona && step.personas.includes(persona.id)));
  // For a tool, open the journey where that tool does the most work, so the animation has more than one step to show.
  const toolSteps = (workflow: ArchitectureWorkflow) => workflow.steps.filter(step => step.app === app?.id).length;
  const busiestWorkflow = app ? relatedWorkflows.reduce((best, workflow) => toolSteps(workflow) > toolSteps(best) ? workflow : best, relatedWorkflows[0]) : undefined;
  const defaultWorkflowId = area ? area.workflow : persona ? defaultPersonaWorkflow[persona.id] : busiestWorkflow ? busiestWorkflow.id : relatedWorkflows[0].id;
  const requestedWorkflow = architectureWorkflows.find(workflow => workflow.id === params.get('journey'));
  const invalidWorkflow = params.has('journey') && !requestedWorkflow;
  const workflow = requestedWorkflow || architectureWorkflows.find(workflow => workflow.id === defaultWorkflowId)!;
  const highlightedSteps = workflow.steps.filter(step => area ? area.apps.includes(step.app) : persona ? step.personas.includes(persona.id) : app && step.app === app.id).length;
  const highlightedName = area ? area.name : persona ? persona.name : app ? moduleNames[app.id] : '';
  const from: unknown = location.state?.from;
  const returnPath = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/architecture') ? from : '/';
  const navigationOptions = { state: location.state };
  const summary = area ? `${area.name}: ${relatedPeople.length} key personas, ${relatedApps.length} connected apps. ${area.purpose}` : persona
    ? `${persona.name}, ${persona.role}: ${relatedApps.length} connected apps. ${personaGoals[persona.id]}`
    : app ? `${moduleNames[app.id]}: ${relatedPeople.length} connected personas. ${app.purpose}`
      : `${personas.length} personas, ${architectureApps.length} apps, one connected platform.`;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Platform Architecture | AllUnite One';
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    if ((app || persona) && window.matchMedia('(max-width: 1100px)').matches) scrollToSection('architecture-focus');
  }, [app, persona]);

  function selectPersona(id: PersonaId, journey?: string) {
    setParams(journey ? { persona: id, journey } : { persona: id }, navigationOptions);
  }
  function selectApp(id: ArchitectureAppId, journey?: string) {
    setParams(journey ? { app: id, journey } : { app: id }, navigationOptions);
  }
  function selectArea(id: EcosystemAreaId) {
    setParams({ area: id }, navigationOptions);
  }
  function selectWorkflow(id: string) {
    const next = new URLSearchParams(params);
    next.set('journey', id);
    setParams(next, navigationOptions);
  }

  // The animated journey follows the same selection as the explorer: a role, tool or area plays only the steps it takes part in.
  const onFocus = (step: ArchitectureWorkflow['steps'][number]) => area ? area.apps.includes(step.app) : persona ? step.personas.includes(persona.id) : Boolean(app && step.app === app.id);
  const focusIndexes = workflow.steps.flatMap((step, index) => onFocus(step) ? [index] : []);
  const journeyFocused = hasSelection && focusIndexes.length > 0;
  const journeySteps = journeyFocused ? focusIndexes : workflow.steps.map((_, index) => index);
  const journeyLabel = !journeyFocused ? workflow.name
    : area ? area.name
      : persona ? `${persona.name}'s journey`
        : app ? `${moduleNames[app.id]} in this workflow` : workflow.name;
  const journey = useJourneyPlayback(`${workflow.id}-${journeySteps.join('-')}`, journeySteps.length);
  const journeyVerb = journey.playing ? 'Pause' : journey.finished ? 'Replay' : 'Play';

  return <div className="architecture-page">
    <a className="skip-link" href="#architecture-main" onClick={event => { event.preventDefault(); document.getElementById('architecture-main')?.focus(); }}>Skip to architecture</a>
    <header className="arch-header">
      <Link to="/" aria-label="AllUnite One home"><BrandMark /></Link>
      <span className="arch-header-divider" />
      <span className="arch-header-label"><Network size={17} />Platform architecture</span>
      <nav aria-label="Architecture sections">
        <button onClick={() => scrollToSection('architecture-ecosystem')}>Ecosystem</button>
        <button onClick={() => scrollToSection('architecture-explorer')}>Explore</button>
        <button onClick={() => scrollToSection('architecture-workflows')}>Workflows</button>
        <button onClick={() => scrollToSection('architecture-foundation')}>How it works</button>
      </nav>
      <Link className="button button-secondary arch-return" to={returnPath}><ArrowLeft size={15} /><span>Back to workspace</span></Link>
    </header>
    <nav className="arch-mobile-nav" aria-label="Explore architecture">
      <button onClick={() => scrollToSection('architecture-ecosystem')}><Globe2 size={14} />Map</button>
      <button onClick={() => scrollToSection('architecture-people')}><Users size={14} />People</button>
      <button onClick={() => scrollToSection('architecture-apps')}><Layers size={14} />Apps</button>
      <button onClick={() => scrollToSection('architecture-focus')}><Network size={14} />Details</button>
      <button onClick={() => scrollToSection('architecture-workflows')}><GitBranch size={14} />Workflows</button>
    </nav>

    <main id="architecture-main" className="arch-main" tabIndex={-1}>
      <section className="arch-hero" aria-labelledby="architecture-title">
        <div>
          <span className="arch-kicker"><span className="status-dot" />THE PLATFORM, AT A GLANCE</span>
          <h1 id="architecture-title">Different roles.<br />One connected world.</h1>
          <p>See who does what, which tools they use, and how the work moves forward.</p>
          <p className="arch-howto">New here? Start with a role or a tool. Each role uses a few tools, the tools share one record, and workflows show how work passes between people.</p>
        </div>
        <div className="arch-hero-diagram" aria-label={`${personas.length} roles connect through ${architectureApps.length} tools to one shared record`}>
          <div><span className="arch-diagram-icon"><Users size={23} /></span><strong>{personas.length}</strong><span>roles people play</span></div>
          <ArrowRight className="arch-diagram-arrow" size={19} aria-hidden="true" />
          <div><span className="arch-diagram-icon arch-coral-icon"><Layers size={23} /></span><strong>{architectureApps.length}</strong><span>connected apps</span></div>
          <ArrowRight className="arch-diagram-arrow" size={19} aria-hidden="true" />
          <div><span className="arch-diagram-icon"><Database size={23} /></span><strong>01</strong><span>shared record</span></div>
        </div>
      </section>

      <Glossary />
      <EcosystemMap area={area} app={app} persona={persona} onSelectArea={selectArea}
        onSelectApp={id => { selectApp(id); scrollToSection('architecture-focus'); }}
        onSelectPersona={id => { selectPersona(id); scrollToSection('architecture-focus'); }}
        onSelectWorkflow={id => { selectWorkflow(id); scrollToSection('architecture-workflows'); }}
        onShowFull={() => setParams({}, navigationOptions)} />

      <section id="architecture-explorer" className="arch-explorer-section" aria-labelledby="arch-explorer-title">
        <div className="arch-section-heading">
          <div><span className="arch-kicker">02 / EXPLORE THE CONNECTIONS</span><h2 id="arch-explorer-title">Start with a person. Or start with an app.</h2></div>
          <Button variant="secondary" onClick={() => setParams({}, navigationOptions)} disabled={!params.has('app') && !params.has('persona') && !params.has('area') && !params.has('journey')}><RotateCcw size={14} />Show full platform</Button>
        </div>
        <div className="arch-selection-status" role="status"><Network size={17} /><span>{summary}</span></div>
        {(invalidSelection || invalidWorkflow) && <div className="arch-invalid" role="alert">{invalidSelection ? 'This architecture selection is not recognised. The full platform is shown; choose an ecosystem area, persona or app.' : 'This workflow selection is not recognised. The default journey is shown; choose another workflow below.'}</div>}

        <div className="arch-atlas">
          <section className="arch-people panel" id="architecture-people" aria-labelledby="arch-people-title">
            <div className="arch-column-title"><Users size={17} /><h3 id="arch-people-title">The people</h3><span>{app || area ? `${relatedPeople.length} connected` : `${personas.length} personas`}</span></div>
            <p className="arch-column-note">Select a role to see its tools.</p>
            {personaGroups.map(group => <div className="arch-persona-group" key={group.name}>
              <h4>{group.name}</h4>
              <div className="arch-persona-list">{group.ids.map(id => {
                const person = getPersona(id);
                const selected = persona?.id === id;
                const connected = Boolean((app || area) && relatedPeople.some(person => person.id === id));
                return <button key={id} aria-label={`Explore ${person.role} persona: ${person.name}`} aria-pressed={selected} onClick={() => selectPersona(id)}
                  className={`arch-persona-button ${selected ? 'is-selected' : ''} ${connected ? 'is-connected' : ''}`} data-persona={id} data-connected={app || area ? connected : undefined}>
                  <span className="arch-persona-avatar">{person.initials}</span>
                  <span><strong>{person.name}</strong><small>{person.role}</small></span>
                  {(selected || connected) && <Check size={15} aria-label={selected ? 'Selected persona' : area ? 'Key ecosystem persona' : 'Uses selected app'} />}
                </button>;
              })}</div>
            </div>)}
          </section>

          <section className="arch-apps" id="architecture-apps" aria-labelledby="arch-apps-title">
            <div className="arch-column-title"><Layers size={17} /><h3 id="arch-apps-title">The tools</h3><span>{persona || area ? `${relatedApps.length} connected` : `${architectureApps.length} apps`}</span></div>
            <p className="arch-column-note">Select a tool to see who uses it and its workflow.</p>
            <div className="arch-app-groups">{appGroups.map(group => <section className={`arch-app-group arch-group-${group.id}`} key={group.id} aria-label={group.name}>
              <div className="arch-group-heading"><span /><h4>{group.name}</h4></div>
              <ul>{architectureApps.filter(item => item.group === group.id).map(item => {
                const selected = app?.id === item.id;
                const connected = Boolean((persona || area) && relatedApps.some(related => related.id === item.id));
                const Icon = moduleIcons[item.id];
                const feature = featuresForPersona(item, persona?.id)[0];
                return <li key={item.id} className={`arch-app-card ${selected ? 'is-selected' : ''} ${connected ? 'is-connected' : ''}`} data-app={item.id} data-connected={persona || area ? connected : undefined}>
                  <button aria-label={`Explore ${moduleNames[item.id]} app`} aria-pressed={selected} onClick={() => selectApp(item.id)}>
                    <span className="arch-app-icon"><Icon size={18} /></span>
                    <span><strong>{moduleNames[item.id]}</strong><small>{item.code}{selected ? ' / Selected' : connected ? ' / Connected' : ''}</small></span>
                    {selected || connected ? <Check size={15} /> : <ArrowUpRight size={14} />}
                  </button>
                  <p>{persona && connected ? feature.label : item.purpose}</p>
                  {connected && <span className="arch-match-label">{area ? 'Connected app' : persona && item.primary.includes(persona.id) ? 'Primary workflow' : 'Supporting app'}</span>}
                </li>;
              })}</ul>
            </section>)}</div>
            <div className="arch-shared-surfaces"><ListTodo size={18} /><p><strong>Overview & My tasks</strong> are shared workspace surfaces, not extra apps. They bring the next action to the right person.</p></div>
          </section>

          <aside className="arch-detail panel" aria-labelledby="arch-detail-title" id="architecture-focus">
            <FocusPanel area={area} persona={persona} app={app} workflows={relatedWorkflows} onSelectApp={selectApp} onSelectPersona={selectPersona} onSelectWorkflow={id => { selectWorkflow(id); scrollToSection('architecture-workflows'); }} />
          </aside>
        </div>
      </section>

      <section id="architecture-workflows" ref={journey.section} className="arch-workflows-section" aria-labelledby="arch-workflows-title">
        <div className="arch-section-heading"><div><span className="arch-kicker">03 / FOLLOW THE WORK</span><h2 id="arch-workflows-title">The handoffs are the workflow.</h2><p>Every step has a role, a tool and a clear result.</p></div><Badge tone="green"><GitBranch size={13} />{architectureWorkflows.length} connected journeys</Badge></div>
        <div className="arch-journey-picker" role="group" aria-label="Choose a workflow">{architectureWorkflows.map(item => <button key={item.id} aria-pressed={workflow.id === item.id} onClick={() => selectWorkflow(item.id)}><span>{item.code}</span>{item.name}{relatedWorkflows.some(related => related.id === item.id) && hasSelection && <Check size={14} aria-label="Connected workflow" />}</button>)}</div>
        <div className="arch-workflow-heading"><div><Badge>{workflow.code}</Badge><h3>{workflow.name}</h3><p>{workflow.description}</p></div><div className="arch-journey-controls"><span><span className="arch-legend-dot" />{hasSelection ? `${highlightedName}: ${highlightedSteps} ${highlightedSteps === 1 ? 'step' : 'steps'} in this journey` : 'Select an ecosystem area, persona or app to highlight their steps'}</span>
          <span className="arch-journey-progress">Step {journey.position + 1} of {journeySteps.length}</span>
          <Button variant="secondary" className="arch-journey-play" onClick={journey.toggle} aria-label={`${journeyVerb} ${journeyLabel}`}>{journey.playing ? <Pause size={14} /> : journey.finished ? <RotateCcw size={14} /> : <Play size={14} />}{journeyVerb}</Button></div></div>
        <ol className={`arch-workflow-steps ${journey.playing ? 'is-playing' : ''}`} style={{ '--journey-step': `${JOURNEY_STEP_MS}ms` } as CSSProperties}>{workflow.steps.map((step, index) => {
          const highlighted = Boolean(area ? area.apps.includes(step.app) : persona ? step.personas.includes(persona.id) : app && step.app === app.id);
          const order = journeySteps.indexOf(index);
          const current = order === journey.position;
          const passed = order !== -1 && order < journey.position;
          return <li key={`${workflow.id}-${index}`} className={[highlighted && 'is-connected', current && 'is-current', passed && 'is-passed'].filter(Boolean).join(' ')} aria-current={current ? 'step' : undefined} data-workflow-app={step.app} data-highlighted={highlighted}>
            <div className="arch-step-top"><span className="arch-step-number">{String(index + 1).padStart(2, '0')}</span>{highlighted && <span className="arch-match-label"><Check size={12} />{area ? 'Connected app' : persona ? persona.name : 'Selected app'}</span>}<ArrowRight className="arch-step-arrow" size={17} aria-hidden="true" /></div>
            <h4>{step.title}</h4>
            <button className="arch-step-app" onClick={() => selectApp(step.app, workflow.id)}>{moduleNames[step.app]}<ArrowUpRight size={13} /></button>
            <p>{step.output}</p>
            <div className="arch-step-people">{step.personas.map(id => <button key={id} className={persona?.id === id ? 'is-traveller' : undefined} onClick={() => selectPersona(id, workflow.id)} aria-label={`Explore ${getPersona(id).role} persona: ${getPersona(id).name}`}><span>{getPersona(id).initials}</span>{getPersona(id).name}</button>)}</div>
          </li>;
        })}</ol>
        <div className="arch-workflow-note"><CircleHelp size={16} /><p>This is a workflow map, not a live campaign. Selecting a person or app only changes this view; it never changes your workspace persona or campaign state.</p></div>
      </section>

      <Foundation />
    </main>
    <footer className="arch-footer"><BrandMark compact /><span>One platform. Every person, place and proof connected.</span><Badge>Browser-only prototype</Badge></footer>
  </div>;
}

function FocusPanel({ area, persona, app, workflows, onSelectApp, onSelectPersona, onSelectWorkflow }: {
  area?: EcosystemArea;
  persona?: Persona;
  app?: ArchitectureApp;
  workflows: ArchitectureWorkflow[];
  onSelectApp: (id: ArchitectureAppId) => void;
  onSelectPersona: (id: PersonaId) => void;
  onSelectWorkflow: (id: string) => void;
}) {
  const apps = area ? architectureApps.filter(app => area.apps.includes(app.id)) : persona ? appsForPersona(persona.id) : [];
  const people = app ? personasForApp(app.id) : [];
  return <>
    <span className="arch-kicker">THE CONNECTION, EXPLAINED</span>
    <span className="arch-focus-icon">{persona ? <Users size={24} /> : app ? <Layers size={24} /> : <Network size={24} />}</span>
    <h2 id="arch-detail-title">{area ? area.name : persona ? `${persona.name}'s world` : app ? moduleNames[app.id] : 'A whole platform. Not a collection of silos.'}</h2>
    <p className="arch-focus-description">{area ? area.purpose : persona ? personaGoals[persona.id] : app ? app.purpose : 'People share apps. Apps share the same objects. Workflows carry the work from one person to the next.'}</p>
    {area ? <>
      <h3>Features in this area</h3>
      <div className="arch-persona-features">{apps.map(item => <div key={item.id}>
        <button onClick={() => onSelectApp(item.id)}>{moduleNames[item.id]}<ArrowUpRight size={13} /></button>
        <ul>{item.features.slice(0, 2).map(feature => <li key={feature.label}>{feature.label}</li>)}</ul>
      </div>)}</div>
      <p className="arch-permission-note">Ecosystem areas group the work, not permissions. People can contribute across areas.</p>
    </> : persona ? <>
      <div className="arch-focus-meta"><Badge tone="green">{persona.role}</Badge><span>{persona.tenant}</span></div>
      <h3>Features aligned to {persona.name}</h3>
      <div className="arch-persona-features">{apps.map(item => <div key={item.id}>
        <button onClick={() => onSelectApp(item.id)}>{moduleNames[item.id]}<ArrowUpRight size={13} /></button>
        <ul>{featuresForPersona(item, persona.id).slice(0, 2).map(feature => <li key={feature.label}>{feature.label}</li>)}</ul>
      </div>)}</div>
      <Button variant="secondary" className="full-width" onClick={() => scrollToSection('architecture-apps')}>See {apps.length} connected apps <ArrowDown size={14} /></Button>
    </> : app ? <>
      <Badge tone="green">{app.code} / {appGroups.find(group => group.id === app.group)?.name}</Badge>
      <h3>What this app does</h3>
      <ul className="arch-feature-list">{app.features.map(feature => <li key={feature.label}><CheckCheck size={16} /><span>{feature.label}</span></li>)}</ul>
      <h3>Who uses it <span>{people.length}</span></h3>
      <div className="arch-connected-people">{people.map(person => <button key={person.id} onClick={() => onSelectPersona(person.id)}>
        <span className="arch-persona-avatar">{person.initials}</span><span><strong>{person.name}</strong><small>{person.role}</small></span>{app.primary.includes(person.id) && <span className="arch-owner-label">Primary</span>}
      </button>)}</div>
      <p className="arch-permission-note">Primary = workflow owner. Other personas use supporting views; visibility does not grant every action.</p>
      <Link className="button button-secondary full-width" to={modulePath(app.id)}>Open app in workspace <ArrowUpRight size={14} /></Link>
    </> : <>
      <ol className="arch-explain-list">
        <li><span>01</span><div><strong>Choose a role</strong><p>Their apps and features light up.</p></div></li>
        <li><span>02</span><div><strong>Choose a tool</strong><p>See its people, capabilities and handoffs.</p></div></li>
        <li><span>03</span><div><strong>Follow a journey</strong><p>Trace the output from brief to settlement.</p></div></li>
      </ol>
      <div className="arch-legend"><span><i className="arch-legend-selected" />Selected</span><span><i className="arch-legend-connected" />Connected</span><span><i />Other available paths</span></div>
      <p className="arch-permission-note">Connections follow each role's menu. Access checks control individual actions.</p>
    </>}
    <div className="arch-focus-workflows"><h3>{area || persona || app ? 'Connected workflows' : 'Start with a journey'}</h3>{workflows.map(workflow => <button key={workflow.id} onClick={() => onSelectWorkflow(workflow.id)}><span><small>{workflow.code}</small>{workflow.name}</span><ArrowRight size={15} /></button>)}</div>
  </>;
}

function Foundation() {
  const layers = [
    { title: 'People & experience', icon: Users, text: 'One workspace shows each role its own menu and next action.', items: ['15 roles', 'Overview', 'My tasks'] },
    { title: 'Application layer', icon: Layers, text: `${architectureApps.length} tools cover out-of-home (OOH), digital out-of-home (DOOH) and programmatic buying.`, items: appGroups.map(group => group.name) },
    { title: 'Workflow & handoffs', icon: GitBranch, text: 'Each step names who acts next and what finishes it.', items: ['Approve', 'Offer', 'Sign', 'Review', 'Launch', 'Prove', 'Settle'] },
    { title: 'Shared capabilities', icon: ShieldCheck, text: 'Shared controls and rules keep every tool consistent.', items: ['Role checks', 'Rules', 'Notifications', 'Activity history', 'Saved files'] },
    { title: 'One shared record', icon: Fingerprint, text: 'Each item, such as a plan or an invoice, lives in one place and moves between tools without being copied.', items: ['Location', 'Plan', 'Order', 'Creative', 'Delivery', 'Invoice'] },
    { title: 'Audience numbers', icon: Database, text: 'Planning, reports and finance use the same sample audience definitions.', items: ['Measured', 'Fused', 'Modelled', 'Saved in this browser'] },
    { title: 'Outside connections', icon: Network, text: 'Real-world systems are shown as previews, not live connections.', items: ['Screen content & players', 'Exchanges', 'Payments', 'E-invoicing', 'No live connections'] },
  ];
  return <section id="architecture-foundation" className="arch-foundation-section" aria-labelledby="arch-foundation-title">
    <div className="arch-section-heading"><div><span className="arch-kicker">04 / UNDER THE EXPERIENCE</span><h2 id="arch-foundation-title">How it works, in plain terms.</h2><p>Seven layers, from what people see to how the platform connects outside. Settings shape every layer.</p></div></div>
    <div className="arch-foundation-grid">
      <ol className="arch-layers">{layers.map((layer, index) => <li key={layer.title}>
        <span className="arch-layer-number">{String(index + 1).padStart(2, '0')}</span><layer.icon size={20} /><div><h3>{layer.title}</h3><p>{layer.text}</p><div className="arch-layer-items">{layer.items.map(item => <span key={item}>{item}</span>)}</div></div>
      </li>)}</ol>
      <aside className="arch-configuration">
        <span className="arch-diagram-icon"><Globe2 size={26} /></span><span className="arch-kicker">CROSS-CUTTING CONFIGURATION</span>
        <h3>Different context.<br />Not a different platform.</h3>
        <div className="arch-context-parts">{[['Role', 'The job to be done'], ['Access', 'The actions allowed'], ['Company', 'The organisation context'], ['Market', 'Currency, formats and local defaults']].map(([title, text]) => <div key={title}><strong>{title}</strong><span>{text}</span></div>)}</div>
        <h4>Six market setups</h4>
        <div className="arch-market-packs">{Object.values(markets).map(market => <span key={market.key}><strong>{market.key}</strong>{market.country}</span>)}</div>
        <div className="arch-agent-note"><Sparkles size={19} /><div><h4>Four guided assistants</h4><p>Planner, yield, trader and finance. They suggest drafts; people approve. No outside AI services.</p></div></div>
      </aside>
    </div>
    <div className="arch-prototype-boundary"><ShieldCheck size={22} /><div><h3>Real connections. Simulated execution.</h3><p>This prototype runs in your browser. Audience numbers, deliveries, payments and connections are sample data. Role access shows how the product behaves, not real security or sign-in.</p></div></div>
  </section>;
}

const glossaryTerms: [string, string][] = [
  ['Role', 'A job in the workspace, such as planner, seller or finance manager. Each role sees its own tools.'],
  ['Tool', 'One part of the platform, such as Planner, Campaigns or Finance. The code calls these apps.'],
  ['Workflow', 'The steps a piece of work goes through, from one role to the next.'],
  ['Handoff', 'The moment one role passes work to another.'],
  ['OOH and DOOH', 'Out-of-home advertising: billboards, posters and transit. DOOH means digital screens.'],
  ['Direct deal', 'A buyer agrees terms with a media owner, with no agency in between.'],
  ['Guaranteed deal', 'A fixed-price agreement to deliver a set audience.'],
  ['Insertion order (IO)', 'The signed booking contract for an advertising placement.'],
  ['RFP', 'A request for proposal: the buyer asks owners to price their places.'],
  ['Hold', 'A temporary reservation of a place while a deal is decided.'],
  ['Measured, Fused, Modelled', 'How an audience number is estimated: from sensors, from combined data sources, or from a statistical model.'],
  ['Four-record check', 'Comparing the buyer, seller, owner and measurement records for the same delivery.'],
  ['Sample data', 'Made-up numbers for this demo. Nothing here is a real audience or a real payment.'],
];

function Glossary() {
  return <details className="arch-glossary">
    <summary>New to these terms? Read the key terms ({glossaryTerms.length})</summary>
    <dl>{glossaryTerms.map(([term, definition]) => <div key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl>
  </details>;
}

const JOURNEY_STEP_MS = 1800;

// Walks the selected journey card by card. It starts once the workflow cards are on screen,
// restarts whenever the workflow or selection changes, and never starts on its own under reduced motion.
function useJourneyPlayback(journeyKey: string, length: number) {
  const section = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [playback, setPlayback] = useState({ key: journeyKey, position: 0, playing: false, started: false });
  let state = playback;
  if (playback.key !== journeyKey) {
    state = { key: journeyKey, position: 0, playing: false, started: false };
    setPlayback(state);
  }

  useEffect(() => {
    if (!section.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || state.started || length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setPlayback(current => ({ ...current, playing: true, started: true }));
  }, [visible, state.started, length]);

  useEffect(() => {
    if (!state.playing) return;
    // The last card still gets a full step so its line finishes travelling before playback stops.
    const timer = window.setTimeout(() => setPlayback(current => current.position >= length - 1
      ? { ...current, playing: false }
      : { ...current, position: current.position + 1 }), JOURNEY_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [state.playing, state.position, length]);

  const finished = state.started && !state.playing && state.position >= length - 1;
  const toggle = () => setPlayback(current => current.playing
    ? { ...current, playing: false }
    : { ...current, playing: true, started: true, position: finished ? 0 : current.position });
  return { section, position: state.position, playing: state.playing, finished, toggle };
}
