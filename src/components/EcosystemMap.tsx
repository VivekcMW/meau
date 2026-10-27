import { ArrowDown, ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Building2, Check, Database, MapPin, Megaphone, Monitor, Network, Repeat2, ShieldCheck, Truck } from 'lucide-react';
import { useEffect } from 'react';
import { ecosystemAreas, ecosystemLoop } from '../domain/architecture';
import type { ArchitectureApp, ArchitectureAppId, EcosystemArea, EcosystemAreaId } from '../domain/architecture';
import { getPersona, moduleNames } from '../domain/config';
import type { Persona, PersonaId } from '../domain/model';
import { Badge, Button } from './ui';

const areaIcons = { demand: Megaphone, supply: Building2, delivery: Truck, intelligence: BarChart3, governance: ShieldCheck };
const connections: Record<EcosystemAreaId, string> = {
  demand: 'M 17 17 L 50 50',
  supply: 'M 83 17 L 50 50',
  delivery: 'M 83 83 L 50 50',
  intelligence: 'M 17 83 L 50 50',
  governance: 'M 50 83 L 50 50',
};

function revealAreaDetails() {
  if (window.matchMedia('(max-width: 900px)').matches) {
    document.getElementById('ecosystem-detail')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
}

export function EcosystemMap({ area, app, persona, onSelectArea, onSelectApp, onSelectPersona, onSelectWorkflow, onShowFull }: {
  area?: EcosystemArea;
  app?: ArchitectureApp;
  persona?: Persona;
  onSelectArea: (id: EcosystemAreaId) => void;
  onSelectApp: (id: ArchitectureAppId) => void;
  onSelectPersona: (id: PersonaId) => void;
  onSelectWorkflow: (id: string) => void;
  onShowFull: () => void;
}) {
  const connected = ecosystemAreas.filter(item => area ? item.id === area.id : app ? item.apps.includes(app.id) : persona ? item.people.includes(persona.id) : false);
  const focusName = area?.name || (app ? moduleNames[app.id] : persona?.name);

  useEffect(() => {
    if (area) revealAreaDetails();
  }, [area]);

  function selectArea(id: EcosystemAreaId) {
    onSelectArea(id);
    if (area?.id === id) revealAreaDetails();
  }

  return <section className="arch-ecosystem" id="architecture-ecosystem" aria-labelledby="ecosystem-title">
    <div className="arch-section-heading">
      <div><span className="arch-kicker">01 / THE ECOSYSTEM</span><h2 id="ecosystem-title">Many specialists. One connected campaign.</h2><p>Select an area to see who connects, what they use and what they share.</p></div>
      <Badge tone="green"><Network size={13} />5 areas / 1 shared record</Badge>
    </div>
    <div className="eco-layout">
      <div className="eco-board">
        <div className="eco-diagram" role="group" aria-label="Interactive ecosystem map">
          <svg className="eco-connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {ecosystemAreas.map(item => <path key={item.id} d={connections[item.id]} data-connected={connected.includes(item)} />)}
          </svg>
          <button className="eco-core" onClick={onShowFull} aria-label="Show the whole ecosystem">
            <Database size={25} aria-hidden="true" /><strong>allunite <span>one</span></strong>
            <span>Shared campaign<br />& audience core</span>
            <small>Plan / Booking / Evidence</small>
          </button>
          {ecosystemAreas.map((item, index) => {
            const Icon = areaIcons[item.id];
            const isConnected = connected.includes(item);
            return <button key={item.id} className={`eco-node eco-node-${item.id}`} data-area={item.id} data-connected={isConnected}
              aria-label={`Explore ${item.name} ecosystem area`} aria-pressed={area?.id === item.id} aria-controls="ecosystem-detail" onClick={() => selectArea(item.id)}>
              <span className="eco-node-top"><span className="eco-node-icon"><Icon size={20} aria-hidden="true" /></span><small>{String(index + 1).padStart(2, '0')} / {item.action}</small>{isConnected && <Check size={15} aria-label={area?.id === item.id ? 'Selected area' : 'Connected area'} />}</span>
              <strong>{item.name}</strong>
              <span className="eco-node-shares">{item.shares}<ArrowUpRight size={13} aria-hidden="true" /></span>
            </button>;
          })}
        </div>
        <div className="eco-physical-world"><MapPin size={17} /><strong>Connected to the real world</strong><span><Monitor size={14} />Digital screens</span><span>Static billboards</span><span>Transit & retail</span></div>
      </div>
      <aside className="eco-detail panel" id="ecosystem-detail" aria-labelledby="ecosystem-detail-title">
        <span className="arch-kicker">THE CONNECTION, IN PLAIN LANGUAGE</span>
        <h3 id="ecosystem-detail-title">{area ? area.name : 'One shared record. Not another handoff.'}</h3>
        <p>{area ? area.purpose : 'Brands, media owners and specialists work around the same campaign and audience definitions.'}</p>
        <p className="eco-status" role="status">{area ? `${area.name}: ${area.people.length} key personas, ${area.apps.length} connected apps.` : focusName ? `${focusName} connects to ${connected.length} ecosystem ${connected.length === 1 ? 'area' : 'areas'}.` : 'Choose any of the five areas to explore its connections.'}</p>
        {area ? <>
          <dl className="eco-exchange">
            <div><dt><ArrowDownLeft size={15} />Receives</dt><dd>{area.receives}</dd></div>
            <div><dt><ArrowUpRight size={15} />Shares with the core</dt><dd>{area.shares}</dd></div>
          </dl>
          <h4>Key people</h4>
          <div className="eco-people">{area.people.map(id => {
            const person = getPersona(id);
            return <button key={id} onClick={() => onSelectPersona(id)} aria-label={`Explore ${person.role} persona: ${person.name}`}><span className="arch-persona-avatar">{person.initials}</span><span>{person.name}<small>{person.role}</small></span><ArrowUpRight size={12} /></button>;
          })}</div>
          <h4>Connected apps</h4>
          <div className="eco-app-links">{area.apps.map(id => <button key={id} onClick={() => onSelectApp(id)}>{moduleNames[id]}<ArrowUpRight size={12} /></button>)}</div>
          <Button variant="secondary" className="full-width" onClick={() => onSelectWorkflow(area.workflow)}>Follow the handoffs<ArrowRight size={14} /></Button>
        </> : <>
          <div className="eco-shared-objects"><span><Database size={16} />One audience definition</span><span><Check size={16} />Connected booking & creative</span><span><ShieldCheck size={16} />Shared delivery evidence</span></div>
          <div className="eco-example"><Badge>For example</Badge><strong>A brand launches across three cities.</strong><p>The people change at each step. The campaign stays connected.</p></div>
          <Button variant="secondary" className="full-width" onClick={() => selectArea('demand')}>Start with the brand<ArrowRight size={14} /></Button>
        </>}
        <small className="eco-boundary">Conceptual ecosystem. Demo data; no live integrations or automatic optimisation.</small>
      </aside>
    </div>
    <div className="eco-feedback">
      <div className="eco-feedback-heading"><Repeat2 size={18} /><div><h3>The result becomes the next starting point.</h3><p>Results inform the next plan. Select a step to explore its area.</p></div></div>
      <ol aria-label="Audience to outcomes feedback loop">{ecosystemLoop.map((step, index) => <li key={`${step.area}-${index}`}>
        <button onClick={() => selectArea(step.area)}><span>{index + 1}</span>{step.label}</button>
        {index < ecosystemLoop.length - 1 ? <ArrowRight size={15} aria-hidden="true" /> : <Repeat2 size={17} aria-label="Back to audience insight" />}
      </li>)}</ol>
    </div>
    <button className="eco-explore-link" onClick={() => document.getElementById('architecture-explorer')?.scrollIntoView({ behavior: 'instant', block: 'start' })}>Go deeper: explore people, apps & features<ArrowDown size={15} /></button>
  </section>;
}
