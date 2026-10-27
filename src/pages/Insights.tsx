import { ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3, Check, FileText, Plus, Radio, ShieldCheck, Sparkles, Target, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DeliveryChart, Donut } from '../components/Charts';
import { InventoryMap, WorldMap } from '../components/Maps';
import { Badge, Button, EmptyState, MethodBadge, Modal, PageHeader, Progress, SectionHeading, Stat, Status, Tabs } from '../components/ui';
import { compact, markets, money } from '../domain/config';
import { canSeeCampaign, metrics } from '../domain/engine';
import { frames } from '../domain/fixtures';
import { csvCell, downloadText } from '../domain/assets';
import type { Frame, MarketKey } from '../domain/model';
import { useStore } from '../domain/store';
import { DeliveryTable, exportReport, ProofGallery } from './Campaigns';
import { switchContext } from '../components/Shell';

export function ReportsPage() {
  const w = useStore(s => s.workspace);
  const campaigns = w.campaigns.filter(c => canSeeCampaign(w, c) && (w.market === 'All' || c.market === w.market));
  const [selected, setSelected] = useState('');
  const [tab, setTab] = useState('Delivery');
  const c = campaigns.find(c => c.id === selected) || campaigns[0];
  if (!c) return <EmptyState title="Your impact starts with a campaign." action={<Link className="button button-primary" to="/campaigns">View campaigns</Link>} />;
  const m = metrics(c);
  const percentage = m.forecast ? m.delivered / m.forecast * 100 : 0;
  const secondary = c.market === 'US' ? 'Geopath' : c.market === 'AU' ? 'MOVE' : null;
  return <><PageHeader  title="Reports & proof" subtitle="Compare planned and delivered audience, then review the supporting evidence." actions={<Button variant="secondary" onClick={() => exportReport(c)}><ArrowDownToLine size={16} />Export report</Button>} /><div className="report-context"><div><span className="report-icon"><BarChart3 size={20} /></span><label className="sr-only" htmlFor="report-campaign">Report campaign</label><select id="report-campaign" value={c.id} onChange={e => setSelected(e.target.value)}>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><Status value={c.stage} /></div><Link className="text-button" to={`/campaigns/${c.id}`}>Open campaign <ArrowUpRight size={15} /></Link></div><div className="stat-grid"><Stat label="Verified impressions" value={compact(m.delivered)} note="Measure · synthetic delivery" /><Stat label="Planned impressions" value={compact(m.forecast)} note="Shared campaign forecast" variant={1} /><Stat label="Delivery vs. plan" value={`${Math.round(percentage)}%`} note={`${c.progress}% of demo flight elapsed`} variant={2} /><Stat label="Verified media value" value={money(m.billable, c.market, true)} note="Excludes demo tax; capped at booking" variant={3} /></div><Tabs items={['Delivery', 'Audience', 'Proof gallery'].map(id => ({ id, label: id }))} value={tab} onChange={setTab} />
    {tab === 'Delivery' && <><div className="report-grid"><section className="panel"><SectionHeading title="Delivery over time" action={<MethodBadge />} /><DeliveryChart total={m.delivered} period="month" /></section><section className="panel"><SectionHeading title="Delivery against plan" /><Donut value={percentage} label="of planned delivery" /><div className="detail-list"><div><span>Planned</span><strong>{compact(m.forecast)}</strong></div><div><span>Verified</span><strong>{compact(m.delivered)}</strong></div><div><span>Flight</span><strong>{c.progress}% elapsed</strong></div></div></section></div><section className="panel mt-24"><SectionHeading title="Delivery by location" /><DeliveryTable campaign={c} /></section>{secondary && <div className="dual-currency panel"><div><Badge>Dual audience currency</Badge><h3>Two perspectives. Never blended.</h3><p>{secondary} values below are illustrative, not licensed currency data.</p></div><span><strong>{compact(m.delivered)}</strong>AllUnite</span><span><strong>{compact(Math.round(m.delivered * .91))}</strong>{secondary} · demo estimate</span></div>}</>}
    {tab === 'Audience' && <div className="report-grid"><section className="panel"><SectionHeading title="Audience profile" subtitle="Illustrative aggregate demographic distribution" />{[['18–24', 18], ['25–34', 31], ['35–44', 26], ['45–54', 16], ['55+', 9]].map(([label, value]) => <div className="demographic-row" key={label}><span>{label}</span><Progress value={Number(value)} /><strong>{value}%</strong></div>)}<div className="info-box"><ShieldCheck size={18} />Aggregated demo profiles only. No personal or device-level data.</div></section><section className="panel"><SectionHeading title="Audience segments" /><div className="context-grid">{['Commuters', 'Urban explorers', 'Everyday shoppers', 'Local communities'].map((text, i) => <div key={text}><span><Users size={23} /></span><h3>{text}</h3><strong>{[142, 128, 116, 108][i]}<small> index</small></strong></div>)}</div><p className="subtle-note">Illustrative segment indices; not independently measured campaign results.</p></section></div>}
    {tab === 'Proof gallery' && <ProofGallery campaign={c} />}</>;
}
export function MeasurePage() {
  const { workspace: w, update } = useStore();
  const [tab, setTab] = useState('Network');
  const [method, setMethod] = useState(false);
  const navigate = useNavigate();
  const inventory = frames.filter(f => w.market === 'All' || f.market === w.market);
  const audience = inventory.reduce((n, f) => n + f.audience, 0);
  const measured = inventory.filter(f => f.method === 'Measured');
  return <><PageHeader  title="Measure" subtitle="Inspect audience methods, inventory coverage and demo sensor health." actions={<Button variant="secondary" onClick={() => setMethod(true)}><FileText size={15} />Our methodology</Button>} /><div className="stat-grid"><Stat label="Weekly audience" value={compact(audience)} note="Aggregated synthetic frame audiences" /><Stat label="Connected frames" value={String(inventory.length)} note="Across your selected markets" variant={1} /><Stat label="Sensor-based profiles" value={String(measured.length)} note="Marked Measured in the demo" variant={2} /><Stat label="Available data" value="6 months" note="Deterministic demo seasonality" variant={3} /></div><Tabs items={['Network', 'Sensor health', 'Audience trends'].map(id => ({ id, label: id }))} value={tab} onChange={setTab} />
    {tab === 'Network' && <div className="measure-grid"><section className="panel network-panel"><SectionHeading title="Inventory coverage" action={<MethodBadge />} /><WorldMap active={w.market} onSelect={market => update(current => ({ ...current, market }))} /><div className="network-footer"><span>{inventory.length} connected frames</span><Button variant="ghost" onClick={() => navigate('/inventory')}>Explore locations <ArrowUpRight size={15} /></Button></div></section><section className="panel"><SectionHeading title="Audience methods" /><div className="method-list">{(['Measured', 'Fused', 'Modelled'] as const).map(method => <div key={method}><MethodBadge method={method} /><strong>{inventory.filter(f => f.method === method).length}</strong><Progress value={inventory.filter(f => f.method === method).length / inventory.length * 100} /></div>)}</div><p className="subtle-note">Sensor-based where possible. Fused or modelled where appropriate. Always labelled.</p><Button variant="secondary" onClick={() => setMethod(true)}>What the badges mean <ArrowRight size={15} /></Button></section></div>}
    {tab === 'Sensor health' && <section className="panel"><SectionHeading title="Sensor health" subtitle="Illustrative sensor records. No live sensor connection." /><div className="table-scroll"><table className="data-table"><thead><tr><th>Sensor / frame</th><th>Location</th><th>Method</th><th>Demo health</th><th>Confidence band</th></tr></thead><tbody>{inventory.slice(0, 20).map(f => <tr key={f.id}><td>SENSOR-{f.id}</td><td><strong>{f.name}</strong><small>{f.city}</small></td><td><MethodBadge method={f.method} /></td><td><Status value={w.blocked.includes(f.id) ? 'Blocked' : 'Active'} /></td><td>±{f.method === 'Measured' ? 8 : f.method === 'Fused' ? 12 : 18}%</td></tr>)}</tbody></table></div></section>}
    {tab === 'Audience trends' && <section className="panel"><SectionHeading title="The rhythm of the real world." subtitle="An illustrative seasonal view of the selected network." /><DeliveryChart total={audience} period="month" /></section>}
    <Modal open={method} onClose={() => setMethod(false)} title="Confidence starts with clarity." description="These are the platform's method labels. All values in this prototype are synthetic."><div className="method-explanations">{[['Measured', 'Sensor data at the individual frame.'], ['Fused', 'Sensor data combined with other aggregated sources.'], ['Modelled', 'Estimated from comparable places where no sensor exists.']].map(([label, text]) => <div key={label}><h3>{label}</h3><p>{text}</p></div>)}</div><div className="info-box"><ShieldCheck size={20} />Every number is labelled. Confidence is explicit. No personal data is used.</div></Modal></>;
}
export function AudiencePage() {
  const { workspace: w, update, notify } = useStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('My next audience');
  const [market, setMarket] = useState<MarketKey>(w.market === 'All' ? 'DK' : w.market);
  const [environment, setEnvironment] = useState<Frame['environment']>('Transit');
  const [selected, setSelected] = useState(w.segments[0]?.id || '');
  const navigate = useNavigate();
  const segment = w.segments.find(s => s.id === selected) || w.segments[0];
  const indexed = segment ? frames.filter(f => f.market === segment.market && f.environment === segment.environment) : [];
  return <>
    <PageHeader  title="Audience studio" subtitle="Choose a market and environment, then carry matching locations into a plan." actions={<Button onClick={() => setOpen(true)}><Plus size={16} />Build an audience</Button>} />
    <div className="audience-source-bar"><div><span><Radio size={20} /></span><strong>AllUnite Measure</strong><Badge tone="green">Local dataset</Badge></div><div><ShieldCheck size={19} /><span>Aggregated by design · minimum cell size 50 people</span></div></div>
    <div className="audience-studio-grid">
      <section className="panel"><SectionHeading title="Your audiences" action={<Badge>{w.segments.length}</Badge>} /><div className="segment-list">{w.segments.map(s => <button key={s.id} className={segment?.id === s.id ? 'selected' : ''} onClick={() => setSelected(s.id)}><span><Users size={21} /></span><div><h3>{s.name}</h3><p>{markets[s.market].city} · {s.environment}</p></div><ArrowUpRight size={15} /></button>)}</div></section>
      <section className="panel segment-detail">{segment ? <>
        <SectionHeading title={segment.name} action={<Badge tone="green">Ready to plan</Badge>} />
        <InventoryMap compact items={indexed} market={segment.market} onSelect={frame => navigate(`/inventory?frame=${frame.id}`)} />
        <div className="segment-stats"><div><strong>{indexed.length}</strong><span>indexed places</span></div><div><strong>{compact(indexed.reduce((n, f) => n + f.audience, 0))}</strong><span>weekly demo audience</span></div>
          <Button onClick={() => {
            if (!switchContext('planner')) return;
            navigate('/planner', { state: { segmentId: segment.id, prompt: `Reach ${segment.name.toLowerCase()} in ${markets[segment.market].city} through ${segment.environment.toLowerCase()} locations.` } });
          }}>Turn this into a plan <ArrowRight size={16} /></Button>
        </div>
      </> : <EmptyState title="Your next audience is waiting." />}</section>
    </div>
    <Modal open={open} onClose={() => setOpen(false)} title="An audience with real-world context.">
      <form onSubmit={e => {
        e.preventDefault();
        if (name.trim().length < 3) return notify('Give the audience a name with at least 3 characters.', 'error');
        const id = crypto.randomUUID();
        if (update(current => ({ ...current, segments: [...current.segments, { id, name: name.trim(), market, environment }] }))) {
          setSelected(id); setOpen(false); notify('Audience saved. It is ready for your next plan.');
        }
      }}>
        <label className="field-label">Audience name<input className="input" required minLength={3} value={name} onChange={e => setName(e.target.value)} /></label>
        <div className="field-row">
          <label className="field-label">City<select className="input" value={market} onChange={e => setMarket(e.target.value as MarketKey)}>{Object.values(markets).map(m => <option key={m.key} value={m.key}>{m.city}</option>)}</select></label>
          <label className="field-label">Where they spend time<select className="input" value={environment} onChange={e => setEnvironment(e.target.value as Frame['environment'])}>{['Transit', 'Retail', 'Roadside', 'Street'].map(x => <option key={x}>{x}</option>)}</select></label>
        </div>
        <div className="info-box"><Sparkles size={19} />{frames.filter(f => f.market === market && f.environment === environment).length} places match this audience context.</div>
        <Button className="full-width" type="submit">Save audience <Check size={16} /></Button>
      </form>
    </Modal>
  </>;
}
export function AttributionPage() {
  const { workspace: w, update, notify } = useStore();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(w.studies[0]?.id || '');
  const eligible = w.campaigns.filter(c => c.progress > 0);
  const [campaignId, setCampaignId] = useState(eligible[0]?.id || '');
  const study = w.studies.find(s => s.id === selected) || w.studies[0];
  const campaign = w.campaigns.find(c => c.id === study?.campaignId);
  const m = campaign ? metrics(campaign) : null;
  const visits = m ? Math.round(m.delivered * .013) : 0;
  const exportStudy = () => { if (study && campaign) downloadText(`${campaign.id}-study.csv`, [['Study', 'Campaign', 'Demo lift', 'Demo lower CI', 'Demo upper CI', 'Illustrative incremental visits', 'Data status'], [study.name, campaign.name, '14.2%', '9.4%', '19.1%', visits, 'Synthetic; not a causal measurement']].map(row => row.map(csvCell).join(',')).join('\r\n')); };
  return <><PageHeader  title="Attribution" subtitle="Review illustrative campaign studies. Lift results use synthetic data." actions={<Button onClick={() => setOpen(true)}><Plus size={16} />New study</Button>} /><div className="attribution-banner"><span><Target size={33} /></span><div><Badge tone="green">A fuller picture</Badge><h2>From out-of-home<br />to <em>real-world outcomes.</em></h2></div><p>Visits. Intent. Impact.<br />With the method always in view.</p></div>
    {study && campaign && m ? <><div className="report-context"><select aria-label="Attribution study" value={study.id} onChange={e => setSelected(e.target.value)}>{w.studies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><Badge tone="amber">Illustrative study · not causal evidence</Badge></div><div className="stat-grid three-stats"><Stat label="Illustrative visit lift" value="+14.2%" note="Demo 95% CI: 9.4% – 19.1%" /><Stat label="Incremental visits" value={compact(visits)} note="Synthetic scenario tied to delivery" variant={1} /><Stat label="Cost per incremental visit" value={money(visits ? Math.round(m.billable / visits) : 0, campaign.market)} note="Illustrative result · not a causal estimate" variant={2} /></div><section className="panel"><SectionHeading title="A clearer view of what changed." subtitle={campaign.name} action={<Button variant="secondary" onClick={exportStudy}><ArrowDownToLine size={15} />Export study</Button>} /><DeliveryChart total={visits} period="month" /><div className="study-method"><div><ShieldCheck size={22} /><span><strong>Geo-matched control</strong><small>Illustrative exposed vs. control regions</small></span></div><div><Users size={22} /><span><strong>Aggregate-only data</strong><small>No row-level identities or sales data</small></span></div><div><Radio size={22} /><span><strong>Synthetic sensor scenario</strong><small>No live sensor or clean-room integration</small></span></div></div></section></> : <EmptyState title="A new kind of proof." description="Create a study linked to a delivered campaign." />}
    <Modal open={open} onClose={() => setOpen(false)} title="A closer look at your campaign's impact." description="Create a synthetic visit-lift study from a delivered campaign."><form onSubmit={e => { e.preventDefault(); const c = w.campaigns.find(c => c.id === campaignId); if (!c) return notify('Choose a campaign with delivery.', 'error'); const id = crypto.randomUUID(); if (update(current => ({ ...current, studies: [...current.studies, { id, campaignId, name: `${c.client} visit-lift study` }] }))) { setSelected(id); setOpen(false); notify('Demo study created. Method and confidence are shown with every result.'); } }}><label className="field-label">Campaign<select className="input" value={campaignId} onChange={e => setCampaignId(e.target.value)} required>{eligible.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><div className="info-box"><Sparkles size={19} />Outcome: store visits. Control: geo-matched. Results: clearly labelled synthetic fixtures.</div><Button type="submit" className="full-width" disabled={!eligible.length}>Create demo study <ArrowRight size={15} /></Button></form></Modal></>;
}
