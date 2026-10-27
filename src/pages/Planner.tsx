import { ArrowRight, Check, ChevronDown, Compass, Leaf, MapPin, Radio, Route, SlidersHorizontal, Sparkles, Target, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Badge, Button, CreativeArt, MethodBadge, PageHeader, SectionHeading } from '../components/ui';
import { compact, demoEnd, demoStart, markets, money } from '../domain/config';
import { bestRoute, chooseFrames, metrics } from '../domain/engine';
import { getFrame } from '../domain/fixtures';
import type { Brief, Campaign, MarketKey } from '../domain/model';
import { useStore } from '../domain/store';
import { switchContext } from '../components/Shell';

export function PlannerPage() {
  const { workspace: w, create, notify } = useStore();
  const location = useLocation();
  const segment = w.segments.find(s => s.id === location.state?.segmentId);
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState(typeof location.state?.prompt === 'string' ? location.state.prompt : '');
  const [market, setMarket] = useState<MarketKey>(segment?.market || (w.market === 'All' ? 'DK' : w.market));
  const [budget, setBudget] = useState('120000');
  const [name, setName] = useState(segment ? `${segment.name} campaign` : 'A fresh perspective');
  const [objective, setObjective] = useState<Campaign['objective']>('Awareness');
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [details, setDetails] = useState(false);
  const [start, setStart] = useState(demoStart.slice(0, 10));
  const [end, setEnd] = useState(demoEnd.slice(0, 10));
  const brief: Brief = { name, client: 'Nord Collective', market, environment: segment?.environment, objective, budget: Math.round(Number(budget) * 100), start: `${start}T08:00:00Z`, end: `${end}T08:00:00Z` };
  const draft = w.campaigns.filter(c => c.stage === 'Draft').slice(0, 3);
  function generate() {
    if (!prompt.trim()) return notify('Give us a goal, or choose one of the ideas below.', 'error');
    if (!(Number(budget) > 0) || Date.parse(end) <= Date.parse(start)) return notify('Check your budget and flight dates.', 'error');
    const found = Object.values(markets).find(m => prompt.toLowerCase().includes(m.city.toLowerCase()));
    if (found) setMarket(found.key);
    const parsedBudget = prompt.match(/(?:budget\s*(?:of\s*)?|[€$])(\d+(?:\.\d+)?)\s*(k)?/i);
    if (parsedBudget) setBudget(String(Number(parsedBudget[1]) * (parsedBudget[2] ? 1000 : 1)));
    if (/visit|store|shop/i.test(prompt)) setObjective('Store visits');
    if (/launch/i.test(prompt)) setObjective('Product launch');
    setOptionsVisible(true);
  }
  function select(option: Campaign['option']) {
    if (!switchContext('planner')) return;
    const id = create({ ...brief, option });
    if (id) navigate(`/campaigns/${id}?tab=plan`);
  }
  return <>
    <PageHeader  title="Planner" subtitle="Describe your audience, compare locations and review a plan before booking." />
    {segment && <div className="info-box"><Target size={18} />Planning for {segment.name} · {segment.environment} locations</div>}
    <section className="planner-hero"><div className="planner-hero-top"><span className="planner-emblem"><Sparkles size={26} /></span><Badge tone="green"><span className="status-dot" />Assisted planning · Local demo</Badge></div><h2>Campaign brief</h2><form onSubmit={e => { e.preventDefault(); generate(); }}><div className="brief-composer"><textarea aria-label="Campaign brief" value={prompt} onChange={e => { setPrompt(e.target.value); setOptionsVisible(false); }} placeholder="We're launching a new collection. Help us reach urban explorers in Copenhagen..." rows={3} required /><div className="brief-composer-footer"><span><Radio size={14} />Built on shared audience data</span><Button type="submit">Find my audience <ArrowRight size={16} /></Button></div></div></form><div className="suggestion-chips">{[['A local store launch', 'Drive store visits in São Paulo for our neighbourhood launch.'], ['A citywide moment', 'Reach urban explorers in Copenhagen for our new collection.'], ['A smarter commute', 'Launch a new product to commuters in New York.']].map(([label, text]) => <button key={label} onClick={() => { setPrompt(text); setOptionsVisible(false); }}><PlusIcon />{label}</button>)}</div>
      <div className="brief-inline-settings"><label><MapPin size={14} /><select aria-label="Plan market" value={market} onChange={e => setMarket(e.target.value as MarketKey)}>{Object.values(markets).map(m => <option key={m.key} value={m.key}>{m.city}</option>)}</select></label><span className="inline-budget">{money(Number(budget) * 100, market)} budget</span><span>{start.slice(8)}–{end.slice(8)} {new Date(`${start}T12:00:00Z`).toLocaleDateString('en', { month: 'short', timeZone: 'UTC' })}</span><button onClick={() => setDetails(d => !d)}><SlidersHorizontal size={14} />Fine-tune <ChevronDown size={13} /></button></div>
      {details && <div className="brief-detail-fields"><label className="field-label">Campaign name<input className="input" value={name} onChange={e => setName(e.target.value)} /></label><label className="field-label">Budget ({markets[market].currency})<input type="number" className="input" min="1" value={budget} onChange={e => setBudget(e.target.value)} /></label><label className="field-label">Start<input className="input" type="date" value={start} onChange={e => setStart(e.target.value)} /></label><label className="field-label">End<input className="input" type="date" min={start} value={end} onChange={e => setEnd(e.target.value)} /></label></div>}
    </section>
    {optionsVisible ? <section className="plan-options-section"><SectionHeading title="Compare plan options" subtitle="Compare estimated cost, forecast audience and selected locations." action={<Badge tone="green"><Check size={12} />Ready to review</Badge>} /><div className="plan-options">{(['Efficient', 'Balanced', 'Reach'] as const).map((option, index) => {
      const ids = chooseFrames(w, brief, option);
      const forecast = ids.reduce((n, id) => n + getFrame(id).audience * (Date.parse(brief.end) - Date.parse(brief.start)) / (7 * 86400000) * (getFrame(id).type === 'Static' ? 1 : 1 / 6), 0);
      const cost = ids.reduce((n, id) => n + Math.round(getFrame(id).rate * (Date.parse(brief.end) - Date.parse(brief.start)) / (7 * 86400000)), 0);
      const Icon = index === 0 ? Leaf : index === 1 ? Compass : Target;
      const mix = (['Direct', 'Marketplace', 'Programmatic'] as const).map(route => [route, ids.filter(id => bestRoute(getFrame(id)).route === route).length] as const).filter(([, n]) => n > 0);
      return <article className={`plan-option ${option === 'Balanced' ? 'recommended' : ''}`} key={option}>{option === 'Balanced' && <span className="recommended-label"><Sparkles size={12} />Recommended</span>}<span className="plan-option-icon"><Icon size={24} /></span><h3>{option === 'Efficient' ? "Cost efficient" : option === 'Balanced' ? "Balanced" : "Higher audience"}</h3><p>{option === 'Efficient' ? "Ranked by media cost per audience impression." : option === 'Balanced' ? "Ranked by location quality within your budget." : "Ranked by audience size within your budget."}</p><div className="plan-locations"><MapPin size={15} /><span>{ids.slice(0, 3).map(id => getFrame(id).name).join(", ")}{ids.length > 3 ? ` +${ids.length - 3} more` : ""}</span></div><div className="option-metrics"><div><strong>{compact(Math.round(forecast))}</strong><span>forecast impressions</span><MethodBadge method="Fused" /></div><div><strong>{ids.length}</strong><span>curated places</span></div></div>{mix.length > 0 && <p className="route-mix" title="Static and premium faces are best bought direct, standard screens instantly in Marketplace and flexible screens programmatically."><Route size={13} aria-hidden="true" /><span><b>Best bought as</b> {mix.map(([route, n]) => `${n} ${route.toLowerCase()}`).join(' · ')}</span></p>}<div className="option-price"><span>{money(cost, market)}</span><small>estimated media cost · excl. tax</small></div><Button variant={option === 'Balanced' ? 'primary' : 'secondary'} className="full-width" disabled={!ids.length} onClick={() => select(option)}>Make this my plan <ArrowRight size={15} /></Button></article>;
    })}</div><p className="subtle-note">Review the interpreted market, budget and dates above. Options are deterministic demo recommendations, not live AI or a production reach optimiser.</p></section> : <section><SectionHeading title="Draft campaigns" action={<Link className="text-button" to="/campaigns">All campaigns <ArrowRight size={14} /></Link>} /><div className="draft-grid">{draft.map(c => <Link key={c.id} to={`/campaigns/${c.id}?tab=plan`} className="draft-card"><CreativeArt theme={c.theme} small /><div><Badge>Draft · v{c.version}</Badge><h3>{c.name}</h3><p>{markets[c.market].city} · {c.frameIds.length} places</p><strong>{money(metrics(c).cost, c.market)}</strong></div><ArrowRight size={18} /></Link>)}<button className="draft-card start-draft" onClick={() => { setPrompt('Launch something new in Copenhagen.'); document.querySelector<HTMLTextAreaElement>('[aria-label="Campaign brief"]')?.focus(); }}><span><Zap size={22} /></span><div><h3>A blank canvas.</h3><p>See what your next idea can do.</p></div><ArrowRight size={18} /></button></div></section>}
  </>;
}
function PlusIcon() { return <span className="tiny-plus">+</span>; }
