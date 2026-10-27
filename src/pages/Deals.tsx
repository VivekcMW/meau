import { ArrowRight, ArrowUpRight, BadgePercent, CalendarClock, Check, Clock3, FileSignature, Handshake, Inbox, Plus, Repeat2, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CampaignAction } from './Campaigns';
import { Badge, Button, CreativeArt, EmptyState, Modal, PageHeader, Stat, Status, Tabs } from '../components/ui';
import { agreementById, compact, dateLabel, demoEnd, demoStart, findAgreement, getPersona, markets, money } from '../domain/config';
import { buyerTenant, canSeeCampaign, chooseFrames, daysBetween, deliveryRows, holdActive, holdLabel, holdRank, metrics, nextStep, offerHold, ownerBase, ownerLines, percent, rankLabel } from '../domain/engine';
import { getFrame } from '../domain/fixtures';
import type { Brief, Campaign, MarketKey, Offer, Workspace } from '../domain/model';
import { useStore } from '../domain/store';
import '../deals.css';

type Mode = 'buyer' | 'owner';
type Filter = 'open' | 'agreed';
const HOUR = 3600000;
const dealSteps = ['Brief', 'Proposals', 'Negotiate', 'Insertion orders', 'Booked'];
const negotiating = ['Draft', 'In review', 'Awaiting offers', 'Ready to sign'];
const isOpen = (c: Campaign) => negotiating.includes(c.stage);
const share = (fraction: number) => Math.round(fraction * 200) / 200;
const ownersOf = (c: Campaign) => [...new Set(c.frameIds.map(id => getFrame(id).owner))];
const initials = (name: string) => name.split(' ').map(word => word[0]).join('').slice(0, 2);
const stamp = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function hoursLeft(c: Campaign, o: Offer, now: Date) {
  const hold = offerHold(c, o);
  return hold ? (Date.parse(hold) - now.getTime()) / HOUR : Infinity;
}
function dealStep(c: Campaign) {
  if (c.stage === 'Draft' || c.stage === 'In review') return 0;
  if (c.stage === 'Awaiting offers') return c.offers.some(o => o.status === 'Pending') ? 1 : 2;
  return c.stage === 'Ready to sign' ? 3 : dealSteps.length;
}
function ownerFigures(c: Campaign, owner: string) {
  const base = ownerBase(c, owner);
  const net = base + (c.offers.find(o => o.owner === owner)?.adjustment ?? 0);
  const forecast = deliveryRows(c).filter(row => row.frame.owner === owner).reduce((n, row) => n + row.forecast, 0);
  return { base, net, forecast, cpm: forecast ? net / forecast * 10 : 0, places: ownerLines(c, owner).length };
}
function dealsFor(w: Workspace, mode: Mode) {
  return w.campaigns.filter(c => c.channel === 'Direct' && (w.market === 'All' || c.market === w.market) && (mode === 'owner'
    ? canSeeCampaign(w, c) && !['Draft', 'In review'].includes(c.stage) && c.offers.some(o => o.owner === w.owner)
    : w.persona === 'admin' || c.buyer === (w.persona === 'brand' ? 'brand' : 'planner')));
}
/** The single most useful thing this media owner can do on a request right now. */
function ownerTodo(c: Campaign, o: Offer | undefined, now: Date) {
  if (!o) return undefined;
  if (c.stage === 'Ready to sign') return c.signedOwners.includes(o.owner) ? undefined : 'Sign insertion order';
  if (c.stage !== 'Awaiting offers') return undefined;
  if (o.extensionRequested) return 'Extend the hold';
  if (!holdActive(c, o, now)) return undefined;
  return o.status === 'Pending' ? 'Send a proposal' : o.status === 'Countered' ? 'Answer the counter' : undefined;
}
function buyerTurn(c: Campaign, w: Workspace, now: Date) {
  const step = nextStep(c, w.config, now);
  const mine = w.persona === 'admin' || step.role === w.persona && (!step.owner || step.owner === w.owner);
  if (mine) return { mine: true, text: step.label };
  const person = getPersona(step.role);
  return { mine: false, text: step.owner ? `Waiting on ${step.owner}` : `With ${person.name}, ${person.role.toLowerCase()}` };
}

export function DealsPage() {
  const w = useStore(s => s.workspace);
  const [params, setParams] = useSearchParams();
  const [adminMode, setAdminMode] = useState<Mode>('buyer');
  const [filter, setFilter] = useState<Filter>('open');
  const [starting, setStarting] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick(n => n + 1), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const now = new Date();
  const mode: Mode = w.persona === 'admin' ? adminMode : w.persona === 'sales' ? 'owner' : 'buyer';
  const canStart = mode === 'buyer' && ['planner', 'brand', 'admin'].includes(w.persona);
  const deals = dealsFor(w, mode);
  const requested = deals.find(c => c.id === params.get('deal'));
  const activeFilter: Filter = requested ? isOpen(requested) ? 'open' : 'agreed' : filter;
  const yourMove = (c: Campaign) => mode === 'owner' ? Boolean(ownerTodo(c, c.offers.find(o => o.owner === w.owner), now)) : buyerTurn(c, w, now).mine;
  const list = deals.filter(c => isOpen(c) === (activeFilter === 'open')).sort((a, b) => Number(yourMove(b)) - Number(yourMove(a)));
  const selected = requested ?? list[0];
  const select = (id: string) => {
    setParams({ deal: id });
    if (window.matchMedia('(max-width: 1000px)').matches) requestAnimationFrame(() => document.getElementById('deal-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const switchFilter = (value: Filter) => { setFilter(value); setParams({}); };
  return <>
    <PageHeader
      title="Direct deals"
      subtitle={mode === 'owner' ? `Buyer requests for ${w.owner}. Reply with a proposal, answer counters and sign insertion orders.` : 'Negotiate directly with media owners. Agreement rates, soft holds and insertion orders are handled for you.'}
      actions={canStart && <Button onClick={() => setStarting(true)}><Plus size={16} />Start a direct deal</Button>}
    />
    {w.persona === 'admin' && <div className="deal-mode" role="group" aria-label="Deal view">
      {(['buyer', 'owner'] as const).map(value => <button key={value} aria-pressed={mode === value} onClick={() => { setAdminMode(value); setParams({}); }}>
        {value === 'buyer' ? <Handshake size={15} /> : <Inbox size={15} />}{value === 'buyer' ? 'Buyer desk' : `Owner inbox · ${w.owner}`}
      </button>)}
    </div>}
    <DealStats deals={deals} mode={mode} now={now} />
    {!deals.length ? <EmptyState
      title={mode === 'owner' ? 'No buyer requests right now.' : 'No direct deals yet.'}
      description={mode === 'owner' ? `When an agency or brand sends an RFP to ${w.owner}, it lands here with its places and agreement rates.` : 'Start one from a three-tap brief. We pick the places, apply your agreements and send each owner its own request.'}
      action={canStart ? <Button onClick={() => setStarting(true)}><Plus size={16} />Start a direct deal</Button> : undefined}
    /> : <div className="deals-frame"><div className="deals-layout">
      <aside className="panel deal-list-panel" aria-label={mode === 'owner' ? 'Buyer requests' : 'Your deals'}>
        <Tabs label="Deal status" value={activeFilter} onChange={switchFilter} items={[
          { id: 'open', label: mode === 'owner' ? 'Requests' : 'In progress', count: deals.filter(isOpen).length },
          { id: 'agreed', label: 'Agreed', count: deals.filter(c => !isOpen(c)).length },
        ]} />
        {list.length ? <ul className="deal-list">{list.map(c => <li key={c.id}>
          <DealListItem c={c} mode={mode} now={now} selected={selected?.id === c.id} yourMove={yourMove(c)} onSelect={() => select(c.id)} />
        </li>)}</ul> : <p className="deal-list-empty">{activeFilter === 'open' ? 'Nothing in negotiation. Agreed deals are one tab over.' : 'No agreed deals yet. Accepted proposals appear here once both sides sign.'}</p>}
      </aside>
      {selected ? <DealDetail key={selected.id} c={selected} mode={mode} now={now} /> : <EmptyState title="Select a deal to see its terms." />}
    </div></div>}
    {canStart && <StartDealModal open={starting} onClose={() => setStarting(false)} onCreated={id => { setStarting(false); setFilter('open'); setParams({ deal: id }); }} />}
  </>;
}

function DealStats({ deals, mode, now }: { deals: Campaign[]; mode: Mode; now: Date }) {
  const w = useStore(s => s.workspace);
  const live = deals.filter(c => c.stage === 'Awaiting offers');
  const relevant = (c: Campaign) => mode === 'owner' ? c.offers.filter(o => o.owner === w.owner) : c.offers;
  const urgent = live.flatMap(c => relevant(c).filter(o => { const left = hoursLeft(c, o, now); return left > 0 && left < 24; })).length;
  if (mode === 'owner') {
    const mine = deals.flatMap(c => relevant(c).map(o => ({ c, o })));
    const count = (status: Offer['status']) => mine.filter(({ c, o }) => c.stage === 'Awaiting offers' && o.status === status).length;
    return <div className="stat-grid deal-stats">
      <Stat label="New requests" value={String(count('Pending'))} note="Waiting for your proposal" icon={<Inbox size={16} />} />
      <Stat label="Counters to answer" value={String(count('Countered'))} note="Buyers asking for more" icon={<Repeat2 size={16} />} />
      <Stat label="IOs to sign" value={String(mine.filter(({ c, o }) => c.stage === 'Ready to sign' && !c.signedOwners.includes(o.owner)).length)} note="Agreed terms, ready to lock" icon={<FileSignature size={16} />} />
      <Stat label="Holds ending in 24h" value={String(urgent)} note="Extend or let them lapse" icon={<Clock3 size={16} />} />
    </div>;
  }
  const priced = deals.flatMap(c => c.offers.filter(o => o.status !== 'Pending' && o.history.length > 0).map(o => ({ base: ownerBase(c, o.owner), saving: -o.adjustment })));
  const base = priced.reduce((n, p) => n + p.base, 0);
  const saving = priced.reduce((n, p) => n + p.saving, 0);
  return <div className="stat-grid deal-stats">
    <Stat label="In negotiation" value={String(live.length)} note="RFPs out with media owners" icon={<Handshake size={16} />} />
    <Stat label="Waiting on you" value={String(deals.filter(c => isOpen(c) && buyerTurn(c, w, now).mine).length)} note="Deals where you act next" icon={<Sparkles size={16} />} />
    <Stat label="Average saving" value={base ? percent(saving / base) : '—'} note={priced.length ? `Across ${priced.length} negotiated ${priced.length === 1 ? 'proposal' : 'proposals'}` : 'Shows once owners reply'} icon={<BadgePercent size={16} />} />
    <Stat label="Holds ending in 24h" value={String(urgent)} note="Decide or ask for more time" icon={<Clock3 size={16} />} />
  </div>;
}

function DealListItem({ c, mode, now, selected, yourMove, onSelect }: { c: Campaign; mode: Mode; now: Date; selected: boolean; yourMove: boolean; onSelect: () => void }) {
  const w = useStore(s => s.workspace);
  const mine = c.offers.find(o => o.owner === w.owner);
  const text = mode === 'owner'
    ? ownerTodo(c, mine, now) ?? (mine?.status === 'Accepted' ? 'Agreed. Nothing to do.' : `Waiting on ${buyerTenant(c)}`)
    : buyerTurn(c, w, now).text;
  const offers = c.stage === 'Draft' || c.stage === 'In review' ? [] : mode === 'owner' && mine ? [mine] : c.offers;
  return <button className={`deal-list-item ${selected ? 'is-selected' : ''}`} aria-current={selected || undefined} onClick={onSelect}>
    <span className="deal-list-top"><strong>{c.name}</strong><Status value={c.stage} /></span>
    <small>{mode === 'owner' ? buyerTenant(c) : c.client} · {markets[c.market].city} · {c.frameIds.length} places</small>
    {offers.length > 0 && <span className="deal-owner-pills">{offers.map(o => <span key={o.owner} className={`owner-pill pill-${o.status.toLowerCase()}`} title={`${o.owner}: ${o.status}`}>{initials(o.owner)}<em>{o.status}</em></span>)}</span>}
    <span className={`deal-turn ${yourMove ? 'is-mine' : ''}`}>{yourMove ? <Sparkles size={12} /> : <Clock3 size={12} />}{yourMove ? `Your move: ${text}` : text}</span>
  </button>;
}

function DealDetail({ c, mode, now }: { c: Campaign; mode: Mode; now: Date }) {
  const w = useStore(s => s.workspace);
  const step = dealStep(c);
  const stats = metrics(c);
  const saving = -c.offers.reduce((n, o) => n + o.adjustment, 0);
  const base = stats.cost + saving;
  const drafting = c.stage === 'Draft' || c.stage === 'In review';
  const offers = mode === 'owner' ? c.offers.filter(o => o.owner === w.owner) : c.offers;
  const priced = c.offers.filter(o => o.status !== 'Pending');
  const values = priced.map(o => ({ owner: o.owner, cpm: ownerFigures(c, o.owner).cpm }));
  const best = mode === 'buyer' && values.length > 1 ? values.reduce((a, b) => b.cpm < a.cpm ? b : a).owner : undefined;
  const own = offers[0] && ownerFigures(c, offers[0].owner);
  const summary = mode === 'owner' && own ? [
    { label: 'Your rate card', value: money(own.base, c.market), note: `${own.places} places requested` },
    { label: offers[0].status === 'Accepted' ? 'Agreed price' : 'Proposed price', value: offers[0].status === 'Pending' ? '—' : money(own.net, c.market), note: offers[0].status === 'Pending' ? 'Not sent yet' : `${percent(offers[0].discount)} off rate card` },
    { label: 'Audience', value: compact(own.forecast), note: 'Forecast impressions' },
    { label: 'Buyer', value: buyerTenant(c), note: c.buyer === 'brand' ? 'Brand buying direct' : 'Agency on behalf of a brand' },
  ] : [
    { label: 'Rate card', value: money(base, c.market), note: `${c.frameIds.length} places, ${ownersOf(c).length} owners` },
    { label: 'Negotiated', value: priced.length ? money(stats.cost, c.market) : '—', note: drafting ? 'Not sent yet' : priced.length ? `${priced.length} of ${c.offers.length} owners priced` : `Waiting on ${c.offers.length} ${c.offers.length === 1 ? 'owner' : 'owners'}` },
    { label: 'You save', value: saving > 0 ? money(saving, c.market) : '—', note: saving > 0 && base ? `${percent(saving / base)} below rate card` : 'Shows once owners reply' },
    { label: 'Budget left', value: money(c.budget - stats.cost, c.market), note: `Of ${money(c.budget, c.market)}` },
  ];
  return <section className="deal-detail" id="deal-detail" aria-labelledby="deal-title">
    <div className="panel deal-hero">
      <div className="deal-hero-top">
        <CreativeArt theme={c.theme} small />
        <div className="deal-hero-title">
          <span className="eyebrow">{c.id} · {mode === 'owner' ? `REQUEST FROM ${buyerTenant(c).toUpperCase()}` : c.buyer === 'brand' ? 'BRAND DIRECT' : 'AGENCY DEAL'}</span>
          <h2 id="deal-title">{c.name}</h2>
          <p>{c.client} · {markets[c.market].city} · {dateLabel(c.start)} – {dateLabel(c.end)}</p>
        </div>
        <div className="deal-hero-meta"><Status value={c.stage} /><Link className="text-button" to={`/campaigns/${c.id}`}>Open campaign<ArrowUpRight size={14} /></Link></div>
      </div>
      <ol className="deal-steps" aria-label="Deal progress">{dealSteps.map((label, index) => <li key={label} className={index < step ? 'is-done' : index === step ? 'is-current' : ''} aria-current={index === step ? 'step' : undefined}>
        <span>{index < step ? <Check size={12} /> : index + 1}</span>{label}
      </li>)}</ol>
      <dl className="deal-summary">{summary.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd><dd className="deal-summary-note">{item.note}</dd></div>)}</dl>
    </div>
    {isOpen(c) ? <CampaignAction campaign={c} /> : <div className="info-box deal-booked"><ShieldCheck size={18} /><span>Insertion orders are signed and the places are booked. Creative, launch and proof of play continue in the campaign.</span><Link className="text-button" to={`/campaigns/${c.id}`}>Go to campaign<ArrowRight size={14} /></Link></div>}
    <div className="deal-owner-grid">
      {drafting
        ? ownersOf(c).filter(owner => mode === 'buyer' || owner === w.owner).map(owner => <DraftOwnerCard key={owner} c={c} owner={owner} />)
        : offers.map(o => <OfferCard key={o.owner} c={c} o={o} mode={mode} best={best === o.owner} now={now} />)}
    </div>
  </section>;
}

function DraftOwnerCard({ c, owner }: { c: Campaign; owner: string }) {
  const figures = ownerFigures(c, owner);
  const agreement = findAgreement(buyerTenant(c), owner);
  return <article className="offer-card is-draft" aria-label={`${owner} request preview`}>
    <header className="offer-head"><span className="owner-logo">{initials(owner)}</span><div><h3>{owner}</h3><small>{figures.places} places · {compact(figures.forecast)} impressions</small></div><Badge>Not sent</Badge></header>
    <div className="offer-price"><span><small>Rate card</small><strong>{money(figures.base, c.market)}</strong></span></div>
    <p className="offer-note"><BadgePercent size={14} />{agreement ? `${agreement.name} applies automatically: ${percent(agreement.discount)} off before you negotiate.` : 'No agreement on file, so the owner starts from the rate card.'}</p>
  </article>;
}

function waitingText(c: Campaign, o: Offer, mode: Mode, active: boolean) {
  if (o.status === 'Accepted') return `Agreed at ${percent(o.discount)} off rate card.`;
  if (mode === 'owner') return o.status === 'Proposed' ? `Waiting for ${buyerTenant(c)} to decide.` : o.status === 'Pending' && !active ? 'The hold lapsed before you replied.' : '';
  return o.status === 'Pending' ? `Waiting for ${o.owner} to send a proposal.` : o.status === 'Countered' ? `Waiting for ${o.owner} to answer your counter.` : '';
}
function OfferCard({ c, o, mode, best, now }: { c: Campaign; o: Offer; mode: Mode; best: boolean; now: Date }) {
  const { workspace: w, act } = useStore();
  const figures = ownerFigures(c, o.owner);
  const agreement = agreementById(o.agreement);
  const live = c.stage === 'Awaiting offers';
  const active = holdActive(c, o, now);
  const left = hoursLeft(c, o, now);
  const exclusive = ownerLines(c, o.owner).some(id => getFrame(id).type === 'Static');
  const { rank, contested } = holdRank(w, c, o.owner, now);
  const canBuy = mode === 'buyer' && (w.persona === 'admin' || w.persona === c.buyer);
  const canSell = mode === 'owner' && (w.persona === 'admin' || w.persona === 'sales' && w.owner === o.owner);
  const counterAt = Math.min(.3, share(o.discount + .03));
  const split = share((o.discount + (o.ask ?? o.discount)) / 2);
  const ownerLabel = mode === 'owner' ? 'You' : o.owner;
  const buyerLabel = mode === 'owner' ? buyerTenant(c) : 'You';
  const run = (action: Parameters<typeof act>[1]) => act(c.id, action);
  const places = ownerLines(c, o.owner);
  let actions: ReactNode = null;
  if (live && canBuy) {
    if (!active) actions = o.extensionRequested ? <Badge tone="amber">Renewal requested</Badge> : <Button variant="secondary" onClick={() => run({ type: 'extend-request', owner: o.owner })}><CalendarClock size={15} />Ask to renew hold</Button>;
    else if (o.status === 'Proposed') actions = <>
      <Button onClick={() => run({ type: 'accept-offer', owner: o.owner })}><Check size={15} />Accept {percent(o.discount)} off</Button>
      {counterAt > o.discount && <Button variant="secondary" onClick={() => run({ type: 'counter', owner: o.owner, discount: counterAt })}><Repeat2 size={15} />Counter at {percent(counterAt)}</Button>}
      {left < 24 && !o.extensionRequested && <Button variant="ghost" onClick={() => run({ type: 'extend-request', owner: o.owner })}>Ask for 48h more</Button>}
    </>;
  }
  if (live && canSell) {
    if (o.extensionRequested) actions = <Button onClick={() => run({ type: 'extend', owner: o.owner })}><CalendarClock size={15} />Extend hold 48h</Button>;
    else if (active && o.status === 'Pending') actions = <>
      <Button onClick={() => run({ type: 'offer', owner: o.owner, counter: false })}>Send at {percent(agreement?.discount ?? 0)} off<ArrowRight size={15} /></Button>
      <Button variant="secondary" onClick={() => run({ type: 'offer', owner: o.owner, counter: true })}>Add 5% and send</Button>
    </>;
    else if (active && o.status === 'Countered') actions = <>
      <Button onClick={() => run({ type: 'respond', owner: o.owner, decision: 'accept' })}><Check size={15} />Accept {percent(o.ask ?? 0)}</Button>
      {split > o.discount && split < (o.ask ?? 0) && <Button variant="secondary" onClick={() => run({ type: 'respond', owner: o.owner, decision: 'split' })}>Meet halfway at {percent(split)}</Button>}
      <Button variant="ghost" onClick={() => run({ type: 'respond', owner: o.owner, decision: 'decline' })}>Keep {percent(o.discount)}</Button>
    </>;
  }
  if (c.stage === 'Ready to sign' && canSell && !c.signedOwners.includes(o.owner)) actions = <Button onClick={() => run({ type: 'sign', side: 'seller', owner: o.owner })}><FileSignature size={15} />Sign insertion order</Button>;
  const waiting = actions || !live ? '' : waitingText(c, o, mode, active);
  return <article className={`offer-card ${best ? 'is-best' : ''}`} aria-label={`${o.owner} ${mode === 'owner' ? 'request' : 'proposal'}`}>
    {best && <span className="offer-best"><Trophy size={12} />Best value</span>}
    <header className="offer-head">
      <span className="owner-logo">{initials(o.owner)}</span>
      <div><h3>{mode === 'owner' ? `${buyerTenant(c)} → ${o.owner}` : o.owner}</h3><small>{figures.places} places · {compact(figures.forecast)} impressions</small></div>
      <Status value={o.status} />
    </header>
    <div className="deal-chips">
      {live && offerHold(c, o) && <span className={`deal-chip ${!active ? 'is-expired' : left < 24 ? 'is-urgent' : ''}`}><Clock3 size={12} />{holdLabel(c, o, now)}</span>}
      {live && exclusive && <span className={`deal-chip ${rank > 1 ? 'is-urgent' : 'is-good'}`} title={rank > 1 ? `Another buyer holds ${contested.map(id => getFrame(id).name).join(', ')} from an earlier request. Swap it, or decide first if they release it.` : 'No earlier hold on these static faces. You have first right to book.'}>{rankLabel(rank)}</span>}
      <span className="deal-chip" title={agreement ? `Starting discount from ${agreement.name}` : `No rate agreement between ${buyerTenant(c)} and ${o.owner}. Prices start at rate card.`}><BadgePercent size={12} />{agreement ? `${agreement.name} · ${percent(agreement.discount)}` : 'No rate agreement'}</span>
      {!live && <span className={`deal-chip ${c.signedOwners.includes(o.owner) ? 'is-good' : ''}`}><FileSignature size={12} />{c.signedOwners.includes(o.owner) ? 'IO signed' : 'IO ready to sign'}</span>}
    </div>
    <div className="offer-price">
      <span><small>{o.status === 'Pending' ? 'Rate card' : o.status === 'Accepted' ? 'Agreed price' : 'Proposed price'}</small><strong>{money(figures.net, c.market)}</strong>{o.discount > 0 && <s>{money(figures.base, c.market)}</s>}</span>
      {o.discount > 0 && <Badge tone="green">−{percent(o.discount)}</Badge>}
      <span className="offer-cpm"><small>Cost per 1,000</small><strong>{money(Math.round(figures.cpm * 100), c.market)}</strong></span>
    </div>
    {o.status === 'Countered' && o.ask !== undefined && <p className="offer-note is-counter"><Repeat2 size={14} />{mode === 'owner' ? `${buyerTenant(c)} asks for ${percent(o.ask)} off, ${money(Math.round(figures.base * (o.ask - o.discount)), c.market)} more than your proposal.` : `You asked for ${percent(o.ask)} off. ${o.owner} can accept, meet halfway or keep the price.`}</p>}
    <ul className="deal-places" aria-label={`${o.owner} places`}>{places.slice(0, 3).map(id => <li key={id}>{getFrame(id).name}<small>{getFrame(id).type}</small></li>)}{places.length > 3 && <li className="more">+{places.length - 3} more</li>}</ul>
    {o.alternatives.length > 0 && live && o.status === 'Proposed' && <div className="offer-swaps">
      <strong><Sparkles size={13} />{mode === 'owner' ? `You suggested ${o.alternatives.length} better-value ${o.alternatives.length === 1 ? 'swap' : 'swaps'}` : `${o.owner} suggests ${o.alternatives.length === 1 ? 'a swap' : `${o.alternatives.length} swaps`}`}</strong>
      {o.alternatives.map(a => <div key={a.frameId} className="offer-swap">
        <div><span>{getFrame(a.replaces).name} <ArrowRight size={12} /> {getFrame(a.frameId).name}</span><small>{a.reason}</small></div>
        {canBuy && active && <Button variant="secondary" onClick={() => run({ type: 'swap', owner: o.owner, frameId: a.frameId })} aria-label={`Swap ${getFrame(a.replaces).name} for ${getFrame(a.frameId).name}`}>Swap</Button>}
      </div>)}
    </div>}
    {(actions || waiting) && <div className="offer-actions">{actions || <p className={`offer-waiting ${o.status === 'Accepted' ? 'is-agreed' : ''}`}>{o.status === 'Accepted' ? <Check size={14} /> : <Clock3 size={14} />}{waiting}</p>}</div>}
    {o.history.length > 0 && <details className="deal-history">
      <summary>Negotiation history <span>{o.history.length}</span></summary>
      <ol>{[...o.history].reverse().map((entry, index) => <li key={`${entry.at}-${index}`} className={`from-${entry.side}`}>
        <strong>{entry.side === 'owner' ? ownerLabel : buyerLabel}</strong><span>{entry.text}</span><time dateTime={entry.at}>{stamp(entry.at)}</time>
      </li>)}</ol>
    </details>}
  </article>;
}

const objectives: { id: Campaign['objective']; title: string }[] = [
  { id: 'Awareness', title: 'Be seen' }, { id: 'Store visits', title: 'Bring people in' }, { id: 'Product launch', title: 'Launch something' },
];
const clients = ['Nord Collective', 'Forma', 'Velo', 'Chapter'];
const budgetPresets = (market: MarketKey) => market === 'DK' || market === 'BR' ? [30000, 45000, 80000] : [10000, 25000, 60000];

function StartDealModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { workspace: w, create, act } = useStore();
  const brand = w.persona === 'brand';
  const tenant = getPersona(brand ? 'brand' : 'planner').tenant;
  const [market, setMarket] = useState<MarketKey>(w.market === 'All' ? brand ? 'IT' : 'DK' : w.market);
  const [budget, setBudget] = useState(budgetPresets(market)[1]);
  const [objective, setObjective] = useState<Campaign['objective']>('Awareness');
  const [client, setClient] = useState(brand ? getPersona('brand').tenant : clients[1]);
  const [name, setName] = useState('');
  const suggested = `${objectives.find(o => o.id === objective)!.title} in ${markets[market].city}`;
  const brief: Brief = { name: name.trim() || suggested, client, market, objective, budget: budget * 100, start: demoStart, end: demoEnd, option: 'Balanced' };
  const ids = useMemo(() => chooseFrames(w, { name: '', client: '', market, objective: 'Awareness', budget: budget * 100, start: demoStart, end: demoEnd }, 'Balanced'), [w, market, budget]);
  const periods = daysBetween(demoStart, demoEnd) / 7;
  const owners = [...new Set(ids.map(id => getFrame(id).owner))].map(owner => {
    const lines = ids.filter(id => getFrame(id).owner === owner);
    const base = lines.reduce((n, id) => n + Math.round(getFrame(id).rate * periods), 0);
    const agreement = findAgreement(tenant, owner);
    return { owner, places: lines.length, base, agreement, net: Math.round(base * (1 - (agreement?.discount ?? 0))) };
  });
  const base = owners.reduce((n, o) => n + o.base, 0);
  const net = owners.reduce((n, o) => n + o.net, 0);
  const approval = !brand && brief.budget > w.config.approvalLimit;
  function pickMarket(value: MarketKey) { setMarket(value); setBudget(budgetPresets(value)[1]); }
  function start() {
    const id = create(brief, 'Direct', ids);
    if (!id) return;
    act(id, approval ? { type: 'submit' } : { type: 'rfp' });
    onCreated(id);
  }
  return <Modal open={open} onClose={onClose} title="Start a direct deal" description="Three taps. We pick the places, apply your agreements and send each owner its own request." className="start-deal-modal">
    <div className="start-deal">
      <fieldset><legend>Where</legend><div className="choice-chips">{Object.values(markets).map(m => <button type="button" key={m.key} aria-pressed={market === m.key} onClick={() => pickMarket(m.key)}>{m.city}</button>)}</div></fieldset>
      <fieldset><legend>Budget</legend><div className="choice-chips">{budgetPresets(market).map(value => <button type="button" key={value} aria-pressed={budget === value} onClick={() => setBudget(value)}>{money(value * 100, market, true)}{!brand && value * 100 > w.config.approvalLimit && <small>Needs approval</small>}</button>)}</div></fieldset>
      <fieldset><legend>Goal</legend><div className="choice-chips">{objectives.map(o => <button type="button" key={o.id} aria-pressed={objective === o.id} onClick={() => setObjective(o.id)}>{o.title}</button>)}</div></fieldset>
      {!brand && <fieldset><legend>For client</legend><div className="choice-chips">{clients.map(value => <button type="button" key={value} aria-pressed={client === value} onClick={() => setClient(value)}>{value}</button>)}</div></fieldset>}
      <label className="start-deal-name">Deal name<input className="input" value={name} placeholder={suggested} onChange={e => setName(e.target.value)} /></label>
      <div className="start-deal-preview" aria-live="polite">
        {ids.length ? <>
          <span className="eyebrow">WHAT HAPPENS NEXT</span>
          <p><strong>{ids.length} places</strong> picked for quality in {markets[market].city}, {dateLabel(demoStart)} – {dateLabel(demoEnd)}.</p>
          <ul>{owners.map(o => <li key={o.owner}><span className="owner-logo">{initials(o.owner)}</span><span><strong>{o.owner}</strong><small>{o.places} places · {o.agreement ? `${o.agreement.name}, ${percent(o.agreement.discount)} off` : 'Rate card'}</small></span><b>{money(o.net, market)}</b></li>)}</ul>
          <p className="start-deal-total"><span>Rate card {money(base, market)}</span><strong>About {money(net, market)} after agreements</strong></p>
          <p className="start-deal-flow">{approval ? <><ShieldCheck size={14} />Over your {money(w.config.approvalLimit, market, true)} limit. We send it to Helena for approval first, then to the owners.</> : <><Clock3 size={14} />Each owner gets its own RFP and holds the places for 72 hours.</>}</p>
        </> : <p>No places fit this budget in {markets[market].city}. Choose a larger budget.</p>}
      </div>
      <div className="start-deal-footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!ids.length} onClick={start}>{approval ? 'Send for approval' : `Send to ${owners.length} ${owners.length === 1 ? 'owner' : 'owners'}`}<ArrowRight size={15} /></Button></div>
    </div>
  </Modal>;
}
