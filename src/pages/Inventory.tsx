import { ArrowRight, ArrowUpRight, Check, Heart, Layers, LayoutGrid, Map, MapPin, Plus, ShoppingBag, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { InventoryMap } from '../components/Maps';
import { Badge, Button, CheckRow, EmptyState, FrameScene, IconButton, MethodBadge, Modal, PageHeader, SearchField, Status, Tabs } from '../components/ui';
import { compact, demoEnd, demoStart, markets, money } from '../domain/config';
import { available, daysBetween } from '../domain/engine';
import { frames, getFrame } from '../domain/fixtures';
import type { Frame, MarketKey } from '../domain/model';
import { useStore } from '../domain/store';
import { switchContext } from '../components/Shell';

export function InventoryPage({ marketplace = false }: { marketplace?: boolean }) {
  const { workspace: w, update, notify, create } = useStore();
  const [params, setParams] = useSearchParams();
  const initial = frames.find(f => f.id === params.get('frame'));
  const [active, setActive] = useState<Frame | null>(initial || null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [environment, setEnvironment] = useState('All');
  const [view, setView] = useState<'split' | 'list'>('split');
  const [savedOnly, setSavedOnly] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const navigate = useNavigate();
  const market = w.market === 'All' ? initial?.market || (marketplace ? 'BR' : 'DK') : w.market;
  const items = frames.filter(f => f.market === market && (type === 'All' || f.type === type) && (environment === 'All' || f.environment === environment) && (!savedOnly || w.saved.includes(f.id)) && `${f.name} ${f.id} ${f.format}`.toLowerCase().includes(query.toLowerCase()));
  const addToCart = (frame: Frame) => {
    if (!available(frame, w)) return notify('This frame is already booked for the demo dates. Choose an available location.', 'error');
    if (w.cart.some(id => getFrame(id).market !== frame.market)) return notify('A checkout uses one market and currency. Complete or clear your current cart first.', 'error');
    if (update(current => ({ ...current, cart: current.cart.includes(frame.id) ? current.cart : [...current.cart, frame.id] }))) notify(`${frame.name} added to your booking.`);
  };
  const save = (frame: Frame) => update(current => ({ ...current, saved: current.saved.includes(frame.id) ? current.saved.filter(id => id !== frame.id) : [...current.saved, frame.id] }));
  const startPlanFromFrame = (frame: Frame) => {
    if (!switchContext('planner')) return;
    const id = create({ name: `${frame.city} neighbourhood launch`, client: 'Nord Collective', market: frame.market, objective: 'Awareness', budget: frame.rate * 4, start: demoStart, end: demoEnd }, 'Direct', [frame.id]);
    if (id) navigate(`/campaigns/${id}?tab=plan`);
  };
  const pickMarket = (value: string) => { update(current => ({ ...current, market: value as MarketKey })); setActive(null); };
  return <>
    <PageHeader  title={marketplace ? 'Marketplace' : 'Inventory'} subtitle="Find locations by city, format and availability. Open a location to review its details." actions={<>{marketplace ? <Button onClick={() => setCheckout(true)}><ShoppingBag size={17} />Your booking <span className="button-count">{w.cart.length}</span></Button> : <Button variant="secondary" onClick={() => setSavedOnly(value => !value)}><Heart size={16} fill={savedOnly ? 'currentColor' : 'none'} />{savedOnly ? 'Show all inventory' : `Saved places (${w.saved.length})`}</Button>}</>} />
    {marketplace && <div className="marketplace-instructions"><ShoppingBag size={20} /><div><h2>Choose locations for your booking</h2><p>Add available locations, review the dates and cost, then confirm a simulated payment.</p></div><Badge>Demo checkout</Badge></div>}
    <div className="inventory-toolbar"><SearchField value={query} onChange={setQuery} label="Search inventory" placeholder="Search places, formats or frame IDs..." /><label className="select-pill"><MapPin size={15} /><select value={market} onChange={e => pickMarket(e.target.value)} aria-label="Inventory city">{Object.values(markets).map(m => <option key={m.key} value={m.key}>{m.city}</option>)}</select></label><label className="select-pill"><Layers size={15} /><select value={type} onChange={e => setType(e.target.value)} aria-label="Inventory type"><option value="All">All formats</option><option>Digital</option><option>Static</option></select></label><label className="select-pill"><SlidersHorizontal size={15} /><select value={environment} onChange={e => setEnvironment(e.target.value)} aria-label="Inventory environment"><option value="All">All environments</option>{['Roadside', 'Retail', 'Transit', 'Street'].map(e => <option key={e}>{e}</option>)}</select></label><div className="view-switch"><IconButton label="Map and list view" className={view === 'split' ? 'selected' : ''} onClick={() => setView('split')}><Map size={17} /></IconButton><IconButton label="Card grid view" className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')}><LayoutGrid size={17} /></IconButton></div></div>
    <div className="inventory-summary"><strong>{items.length} places to make an impact <span>in {markets[market].city}</span></strong><span><MethodBadge />Measured where it matters</span></div>
    {!items.length ? <EmptyState title="No locations match these filters" description="Try another place or clear your filters." action={<Button variant="secondary" onClick={() => { setQuery(''); setType('All'); setEnvironment('All'); setSavedOnly(false); }}>Clear filters</Button>} /> :
      <div className={`inventory-layout inventory-${view}`}><div className={view === 'split' ? 'inventory-results' : 'inventory-card-grid'}>{items.map(frame => <article className={`frame-card ${active?.id === frame.id ? 'selected' : ''}`} key={frame.id}><button className="frame-picture-button" onClick={() => setActive(frame)} aria-label={`View ${frame.name}`}><FrameScene theme={frame.color} name={frame.name} /><Badge>{frame.format}</Badge></button><IconButton className={`save-frame ${w.saved.includes(frame.id) ? 'saved' : ''}`} label={`${w.saved.includes(frame.id) ? 'Unsave' : 'Save'} ${frame.name}`} onClick={() => save(frame)}><Heart size={15} fill={w.saved.includes(frame.id) ? 'currentColor' : 'none'} /></IconButton><div className="frame-card-body"><button className="frame-title" onClick={() => setActive(frame)}><h3>{frame.name}</h3><ArrowUpRight size={15} /></button><p><MapPin size={12} />{frame.city} <span>·</span> {frame.environment}</p><div className="frame-data"><span><strong>{compact(frame.audience)}</strong><small>audience / week <MethodBadge method={frame.method} /></small></span><span><strong>{money(frame.rate, frame.market)}</strong><small>per week</small></span></div><div className="frame-card-footer"><Status value={available(frame, w) ? 'Available' : 'Held'} /><Button variant="ghost" onClick={() => marketplace ? addToCart(frame) : setActive(frame)}>{marketplace ? w.cart.includes(frame.id) ? 'Added' : 'Add to booking' : 'View location'}{marketplace && w.cart.includes(frame.id) ? <Check size={14} /> : <Plus size={14} />}</Button></div></div></article>)}</div>{view === 'split' && <div className="inventory-map-wrap"><InventoryMap items={items} selected={marketplace ? w.cart : w.saved} active={active?.id} market={market} onSelect={frame => setActive(frame)} /><div className="map-bottom-card"><span><MapPin size={17} /><strong>Your audience is closer than you think.</strong></span><span>{items.filter(f => available(f, w)).length} available places</span></div></div>}</div>}
    <FrameDrawer frame={active} onClose={() => { setActive(null); if (params.has('frame')) setParams({}); }} onSave={save} onChoose={frame => marketplace ? addToCart(frame) : startPlanFromFrame(frame)} chooseLabel={marketplace ? 'Add to booking' : 'Start a plan here'} />
    <Checkout open={checkout} onClose={() => setCheckout(false)} />
  </>;
}
export function FrameDrawer({ frame, onClose, onChoose, onSave, chooseLabel = 'Add to plan' }: { frame: Frame | null; onClose: () => void; onChoose: (frame: Frame) => void; onSave?: (frame: Frame) => void; chooseLabel?: string }) {
  const { workspace: w, update, notify } = useStore();
  const [tab, setTab] = useState('Overview');
  const canManage = ['ops', 'admin'].includes(w.persona);
  if (!frame) return null;
  const free = available(frame, w);
  return <Modal open={Boolean(frame)} onClose={onClose} title={frame.name} description={`${frame.city} · ${frame.owner}`} drawer><FrameScene theme={frame.color} name={frame.name} /><div className="frame-detail-tags"><Badge>{frame.format}</Badge><Status value={free ? 'Available' : 'Held'} /><MethodBadge method={frame.method} /></div><Tabs items={['Overview', 'Audience', 'Availability'].map(id => ({ id, label: id }))} value={tab} onChange={setTab} />{tab === 'Overview' && <><div className="frame-detail-price"><div><span>Estimated weekly audience</span><strong>{compact(frame.audience)}</strong></div><div><span>Starting from</span><strong>{money(frame.rate, frame.market)}<small>/ week</small></strong></div></div><div className="detail-list"><div><span>Location ID</span><strong>{frame.id}</strong></div><div><span>Environment</span><strong>{frame.environment}</strong></div><div><span>Format</span><strong>{frame.type === 'Digital' ? '1920 × 1080 · 10s spot' : '6 × 3m · printed face'}</strong></div><div><span>Coordinates</span><strong>{frame.lat.toFixed(4)}, {frame.lng.toFixed(4)}</strong></div><div><span>Time zone</span><strong>{markets[frame.market].timezone}</strong></div></div></>}
      {tab === 'Audience' && <><div className="explanation-number">{compact(frame.audience)}<MethodBadge method={frame.method} /></div><p className="muted">Weekly audience · synthetic demo profile</p>{[['Urban commuters', 64], ['Everyday shoppers', 48], ['18–34 years', 57]].map(([label, value]) => <div className="audience-bar" key={label}><span>{label}</span><div><i style={{ width: `${value}%` }} /></div><strong>{value}%</strong></div>)}<div className="info-box"><RadioNote />{frame.method === 'Measured' ? 'Demo sensor-based audience, with a ±8% confidence band.' : frame.method === 'Fused' ? 'Demo sensor and mobility fusion, with a ±12% confidence band.' : 'Modelled demo audience, with a ±18% confidence band.'}</div></>}
      {tab === 'Availability' && <><div className="calendar-preview">{Array.from({ length: 28 }, (_, i) => <span key={i} className={i < 14 && !free ? 'calendar-held' : i < 14 ? 'calendar-available' : ''}>{i + 1}</span>)}</div><p className="muted">November 2026 · booking window 2–16 Nov</p><Status value={w.blocked.includes(frame.id) ? 'Blocked' : free ? 'Available' : 'Held'} />{canManage && <Button variant="secondary" className="full-width mt-16" onClick={() => { const blocked = w.blocked.includes(frame.id); if (update(current => ({ ...current, blocked: blocked ? current.blocked.filter(id => id !== frame.id) : [...current.blocked, frame.id] }))) notify(blocked ? 'Frame reopened for booking.' : 'Maintenance blackout added. Related launches are now blocked.'); }}>{w.blocked.includes(frame.id) ? 'Remove maintenance blackout' : 'Add maintenance blackout'}</Button>}</>}
      <div className="drawer-footer"><Button className="grow" disabled={!free} onClick={() => onChoose(frame)}>{chooseLabel}<ArrowRight size={16} /></Button>{onSave && <IconButton label="Save this location" onClick={() => onSave(frame)}><Heart size={19} fill={w.saved.includes(frame.id) ? 'currentColor' : 'none'} /></IconButton>}</div></Modal>;
}
function RadioNote() { return <Sparkles size={18} />; }
function Checkout({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { workspace: w, update, create, notify } = useStore();
  const [name, setName] = useState('Good mornings, around the corner');
  const [start, setStart] = useState('2026-11-02');
  const [end, setEnd] = useState('2026-11-16');
  const [payment, setPayment] = useState('local');
  const [confirmed, setConfirmed] = useState(false);
  const navigate = useNavigate();
  const cart = w.cart.map(getFrame);
  const market = cart[0]?.market || 'BR';
  const days = daysBetween(start, end);
  const subtotal = cart.reduce((n, f) => n + Math.round(f.rate * days / 7), 0);
  const tax = Math.round(subtotal * markets[market].tax);
  function book() {
    if (!confirmed) return notify('Confirm that this is a simulated payment.', 'error');
    if (!switchContext('advertiser')) return;
    const id = create({ name, client: 'Pão & Co.', market, objective: 'Store visits', budget: subtotal, start: `${start}T08:00:00Z`, end: `${end}T08:00:00Z` }, 'Self-serve', cart.map(f => f.id));
    if (id) { onClose(); navigate(`/campaigns/${id}`); }
  }
  return <Modal open={open} onClose={onClose} title="Review booking" description="A few great places. One simple booking." wide>{!cart.length ? <EmptyState title="Your booking starts with a place." description="Add a screen or billboard to get started." action={<Button onClick={onClose}>Explore places</Button>} /> : <form onSubmit={e => { e.preventDefault(); book(); }} className="checkout-grid"><div><label className="field-label">Campaign name<input className="input" required minLength={3} value={name} onChange={e => setName(e.target.value)} /></label><div className="field-row"><label className="field-label">Start<input type="date" className="input" required value={start} onChange={e => setStart(e.target.value)} /></label><label className="field-label">End<input type="date" className="input" required min={start} value={end} onChange={e => setEnd(e.target.value)} /></label></div><div className="cart-items">{cart.map(f => <div className="cart-item" key={f.id}><span className="cart-location"><MapPin size={18} /></span><div><strong>{f.name}</strong><small>{f.format}</small></div><span>{money(Math.round(f.rate * days / 7), f.market)}</span><IconButton label={`Remove ${f.name}`} onClick={() => update(current => ({ ...current, cart: current.cart.filter(id => id !== f.id) }))}><X size={15} /></IconButton></div>)}</div><h3>How would you like to pay?</h3><div className="payment-options">{[['local', markets[market].payment], ['card', 'Demo card']].map(([value, label]) => <label key={value} className={payment === value ? 'selected' : ''}><input type="radio" name="payment" value={value} checked={payment === value} onChange={() => setPayment(value)} />{label}<Badge>Simulated</Badge></label>)}</div><label className="checkbox-row"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} required />I understand no money will move.</label></div><aside className="checkout-summary"><Badge tone="green">Your booking</Badge><h2>Let's put you<br />on the map.</h2><div className="detail-list"><div><span>{cart.length} locations · {days} days</span><strong>{money(subtotal, market)}</strong></div><div><span>Demo tax ({markets[market].tax * 100}%)</span><strong>{money(tax, market)}</strong></div><div className="summary-total"><span>Total</span><strong>{money(subtotal + tax, market)}</strong></div></div><Button className="full-width" type="submit">Confirm demo booking<ArrowRight size={16} /></Button><CheckRow>Creative comes next</CheckRow><CheckRow>Your cart stays with you</CheckRow><p className="subtle-note">Continues as Rafael. Illustrative tax only; this is not a fiscal document.</p></aside></form>}</Modal>;
}
