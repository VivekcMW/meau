import { agreementById, demoEnd, demoStart, findAgreement, getPersona, markets } from './config';
import { frames, getFrame } from './fixtures';
import type { Action, Brief, Campaign, Frame, Offer, PersonaId, Workspace } from './model';

const requireRule = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
export function daysBetween(start: string, end: string) {
  return Math.max(1, Math.ceil((Date.parse(end) - Date.parse(start)) / 86400000));
}
export function isWithinTolerance(values: number[], tolerance = 1) {
  if (!values.length || values.some(v => !Number.isFinite(v) || v < 0)) return false;
  const baseline = values[values.length - 1];
  return baseline === 0 ? values.every(v => v === 0) : (Math.max(...values) - Math.min(...values)) / baseline * 100 <= tolerance + 1e-9;
}
export function validateProof(distance: number, at: string, start: string, end: string) {
  requireRule(Number.isFinite(distance) && distance >= 0 && distance <= 50, 'Photo must be taken within 50 m of the frame.');
  const timestamp = Date.parse(at);
  requireRule(Number.isFinite(timestamp) && timestamp >= Date.parse(start) && timestamp <= Date.parse(end), 'Photo must be taken inside the booking window.');
}
export function available(frame: Frame, workspace: Workspace, start = demoStart, end = demoEnd, excludeId?: string) {
  if (workspace.blocked.includes(frame.id)) return false;
  return !workspace.campaigns.some(c => c.id !== excludeId && c.frameIds.includes(frame.id) &&
    Date.parse(c.start) < Date.parse(end) && Date.parse(c.end) > Date.parse(start) &&
    (frame.type === 'Static' && ['Booked', 'Ready to launch', 'Live'].includes(c.stage)));
}
export function chooseFrames(workspace: Workspace, brief: Brief, option: Campaign['option'] = 'Balanced', excludeId?: string): string[] {
  const eligible = frames.filter(f => f.market === brief.market && (!brief.environment || f.environment === brief.environment) && available(f, workspace, brief.start, brief.end, excludeId));
  const sorted = [...eligible].sort((a, b) => option === 'Reach' ? b.audience - a.audience : option === 'Efficient' ? a.rate / a.audience - b.rate / b.audience : b.quality - a.quality);
  const periods = daysBetween(brief.start, brief.end) / 7;
  let cost = 0;
  const selected = sorted.filter(f => {
    const amount = Math.round(f.rate * periods);
    if (cost + amount > brief.budget) return false;
    cost += amount;
    return true;
  }).slice(0, option === 'Reach' ? 12 : option === 'Efficient' ? 6 : 8);
  return selected.map(f => f.id);
}
export function deliveryRows(campaign: Campaign) {
  return campaign.frameIds.map((id, index) => {
    const frame = getFrame(id);
    const forecast = Math.round(frame.audience * daysBetween(campaign.start, campaign.end) / 7 * (frame.type === 'Static' ? 1 : 1 / 6));
    const hasProof = frame.type === 'Digital' || campaign.proofs.some(p => p.frameId === id);
    const measured = hasProof ? Math.round(forecast * campaign.progress / 100 * (campaign.discrepancy && index === 2 ? .87 : 1.01)) : 0;
    const mismatch = campaign.discrepancy && index === 2 && !campaign.resolved;
    return { frame, forecast, buyer: mismatch ? Math.round(measured * 1.04) : measured, ssp: measured, owner: measured, measured, hasProof };
  });
}
export function metrics(campaign: Campaign) {
  const rows = deliveryRows(campaign);
  const forecast = rows.reduce((n, row) => n + row.forecast, 0);
  const delivered = rows.reduce((n, row) => n + row.measured, 0);
  const periods = daysBetween(campaign.start, campaign.end) / 7;
  const base = campaign.frameIds.reduce((n, id) => n + Math.round(getFrame(id).rate * periods), 0);
  const adjustments = campaign.offers.reduce((n, o) => n + o.adjustment, 0);
  const cost = base + adjustments;
  const deliveredBase = rows.reduce((sum, row) => sum + Math.round(row.frame.rate * periods) * Math.min(1, row.forecast ? row.measured / row.forecast : 0), 0);
  const billable = Math.round(deliveredBase * (base ? cost / base : 0));
  const tax = Math.round(billable * markets[campaign.market].tax);
  return { forecast, delivered, cost, billable, tax, total: billable + tax, reach: Math.round(forecast * .64), cpm: forecast ? cost / forecast * 10 : 0, rows };
}
export const ownerKey = (owner?: string): Workspace['owner'] => owner === 'Vista Outdoor' ? 'Vista Outdoor' : 'Urban Reach Media';
export const buyerTenant = (c: Pick<Campaign, 'buyer'>) => getPersona(c.buyer).tenant;
export const percent = (fraction: number) => `${Math.round(fraction * 1000) / 10}%`;
const roundShare = (fraction: number) => Math.round(fraction * 200) / 200;
const HOUR = 3600000;
export function ownerLines(c: Campaign, owner: string) {
  return c.frameIds.filter(id => getFrame(id).owner === owner);
}
export function ownerBase(c: Campaign, owner: string) {
  const periods = daysBetween(c.start, c.end) / 7;
  return ownerLines(c, owner).reduce((n, id) => n + Math.round(getFrame(id).rate * periods), 0);
}
export const offerHold = (c: Campaign, o: Offer) => o.holdUntil ?? c.holdUntil;
export const offerHeldAt = (c: Campaign, o: Offer) => o.heldAt ?? (offerHold(c, o) ? new Date(Date.parse(offerHold(c, o)!) - 72 * HOUR).toISOString() : undefined);
export const holdActive = (c: Campaign, o: Offer, now = new Date()) => { const hold = offerHold(c, o); return !hold || now.getTime() < Date.parse(hold); };
export function holdLabel(c: Campaign, o: Offer, now = new Date()) {
  const hold = offerHold(c, o);
  if (!hold) return '';
  const hours = (Date.parse(hold) - now.getTime()) / HOUR;
  if (hours <= 0) return 'Hold expired';
  return hours < 1 ? 'Hold ends within the hour' : hours < 48 ? `Hold ends in ${Math.floor(hours)}h` : `Hold ends in ${Math.floor(hours / 24)} days`;
}
/** Static faces are exclusive: an earlier live hold on the same face and dates puts this buyer in a later option position. */
export function holdRank(workspace: Workspace, c: Campaign, owner: string, now = new Date()) {
  const offer = c.offers.find(o => o.owner === owner);
  const mine = offer && offerHeldAt(c, offer);
  const exclusive = ownerLines(c, owner).filter(id => getFrame(id).type === 'Static');
  if (!offer || !mine || !exclusive.length) return { rank: 1, contested: [] as string[] };
  const rivals = workspace.campaigns.filter(other => {
    if (other.id === c.id || Date.parse(other.start) >= Date.parse(c.end) || Date.parse(other.end) <= Date.parse(c.start)) return false;
    const theirs = other.offers.find(o => o.owner === owner);
    if (!theirs || !other.frameIds.some(id => exclusive.includes(id))) return false;
    const live = other.stage === 'Ready to sign' || other.stage === 'Awaiting offers' && holdActive(other, theirs, now);
    const at = offerHeldAt(other, theirs);
    return live && Boolean(at && at < mine);
  });
  return { rank: rivals.length + 1, contested: exclusive.filter(id => rivals.some(r => r.frameIds.includes(id))) };
}
export const rankLabel = (rank: number) => rank === 1 ? '1st option' : rank === 2 ? '2nd option' : `${rank}th option`;
const cpmOf = (f: Frame) => f.rate / f.audience;
/** Owner-side suggestions: better-value or uncontested faces from the same owner, type and market that fit the remaining budget. */
export function suggestSwaps(workspace: Workspace, c: Campaign, owner: string, now = new Date()): Offer['alternatives'] {
  const { contested } = holdRank(workspace, c, owner, now);
  const periods = daysBetween(c.start, c.end) / 7;
  const heldElsewhere = new Set(workspace.campaigns.filter(o => o.id !== c.id && ['Awaiting offers', 'Ready to sign'].includes(o.stage)).flatMap(o => o.frameIds).filter(id => getFrame(id).type === 'Static'));
  const used = new Set(c.frameIds);
  let headroom = c.budget - metrics(c).cost;
  const lines = ownerLines(c, owner).map(getFrame).sort((a, b) => Number(contested.includes(b.id)) - Number(contested.includes(a.id)) || cpmOf(b) - cpmOf(a));
  const result: Offer['alternatives'] = [];
  for (const line of lines) {
    if (result.length === 2) break;
    const isContested = contested.includes(line.id);
    const candidate = frames.filter(f => f.market === c.market && f.owner === owner && f.type === line.type && !used.has(f.id) && !heldElsewhere.has(f.id) &&
      available(f, workspace, c.start, c.end, c.id) && cpmOf(f) <= cpmOf(line) * (isContested ? 1.1 : .85) &&
      Math.round(f.rate * periods) - Math.round(line.rate * periods) <= headroom).sort((a, b) => cpmOf(a) - cpmOf(b))[0];
    if (!candidate) continue;
    used.add(candidate.id);
    headroom -= Math.round(candidate.rate * periods) - Math.round(line.rate * periods);
    result.push({ frameId: candidate.id, replaces: line.id, reason: isContested ? `${line.name} is already held by another buyer. ${candidate.name} is free for your dates.` : `${Math.round((1 - cpmOf(candidate) / cpmOf(line)) * 100)}% lower cost per impression than ${line.name}.` });
  }
  return result;
}
export type BuyingRoute = 'Direct' | 'Marketplace' | 'Programmatic';
const medianDigitalRate = new Map(Object.keys(markets).map(key => {
  const rates = frames.filter(f => f.market === key && f.type === 'Digital').map(f => f.rate).sort((a, b) => a - b);
  return [key, rates[Math.floor(rates.length / 2)]] as const;
}));
/** Recommends how each face is best bought, so planners can mix direct deals with self-serve and programmatic. */
export function bestRoute(frame: Frame): { route: BuyingRoute; reason: string } {
  if (frame.type === 'Static') return { route: 'Direct', reason: 'Exclusive static face. Hold it and agree terms with the owner.' };
  if (frame.quality >= 97) return { route: 'Direct', reason: 'Premium screen. Lock a guaranteed share of time directly.' };
  if (frame.rate <= (medianDigitalRate.get(frame.market) ?? 0)) return { route: 'Marketplace', reason: 'Standard screen at list price. Book instantly, no negotiation needed.' };
  return { route: 'Programmatic', reason: 'Flexible screen. Buy by audience and time of day.' };
}
export function hasUnderDelivery(c: Campaign, threshold: number) {
  return c.progress === 100 && deliveryRows(c).some(row => row.forecast > 0 && (row.forecast - row.measured) / row.forecast * 100 > threshold + 1e-9);
}
export function canSeeCampaign(workspace: Workspace, c: Campaign) {
  if (workspace.persona === 'advertiser') return c.client === 'Pão & Co.';
  if (['sales', 'ops', 'yield', 'executive', 'reviewer', 'crew'].includes(workspace.persona)) {
    return (!['Draft', 'In review'].includes(c.stage) || c.channel === 'Programmatic') && c.frameIds.some(id => getFrame(id).owner === workspace.owner);
  }
  return true;
}
export const needsApproval = (c: Campaign, config: Workspace['config']) => c.buyer === 'planner' && c.budget > config.approvalLimit && !c.approved;
export interface NextStep { label: string; role: PersonaId; action?: Action; owner?: Workspace['owner']; hint: string }
export function workspaceTasks(workspace: Workspace, allHandoffs = false, now = new Date()) {
  return workspace.campaigns.filter(c => {
    if (c.stage === 'Paid' || !canSeeCampaign(workspace, c) || workspace.market !== 'All' && c.market !== workspace.market) return false;
    const step = nextStep(c, workspace.config, now);
    return allHandoffs || step.role === workspace.persona && (!step.owner || step.owner === workspace.owner);
  });
}
export function nextStep(c: Campaign, config: Workspace['config'], now = new Date()): NextStep {
  const buyer = c.buyer;
  if (c.channel === 'Programmatic' && c.dealStatus === 'Offered') return { label: 'Accept guaranteed deal', role: 'trader', action: { type: 'accept-deal' }, hint: 'A measured-audience deal, ready for your trading desk.' };
  switch (c.stage) {
    case 'Draft': return needsApproval(c, config)
      ? { label: 'Request approval', role: 'planner', action: { type: 'submit' }, hint: 'Your plan is ready for a quick budget check.' }
      : { label: 'Send to owners', role: buyer, action: { type: 'rfp' }, hint: 'One action. Each owner gets its own RFP, agreement rates and a 72-hour hold.' };
    case 'In review': return { label: 'Approve plan', role: 'approver', action: { type: 'approve' }, hint: 'Review the budget and move this plan forward.' };
    case 'Awaiting offers': {
      const extension = c.offers.find(o => o.extensionRequested);
      if (extension) return { label: 'Extend hold', role: 'sales', owner: ownerKey(extension.owner), action: { type: 'extend', owner: extension.owner }, hint: `${buyerTenant(c)} asked for 48 more hours to decide.` };
      const lapsed = c.offers.find(o => !holdActive(c, o, now));
      if (lapsed) return { label: 'Ask to renew hold', role: buyer, action: { type: 'extend-request', owner: lapsed.owner }, hint: `The soft hold with ${lapsed.owner} lapsed. Ask them to renew it, or reopen the plan.` };
      const pending = c.offers.find(o => o.status === 'Pending');
      if (pending) {
        const agreement = agreementById(pending.agreement);
        return { label: 'Send proposal', role: 'sales', owner: ownerKey(pending.owner), action: { type: 'offer', owner: pending.owner, counter: false }, hint: agreement ? `Pre-filled at ${agreement.name} (${percent(agreement.discount)} off rate card). Review and send.` : 'No agreement on file, so the rate card applies. Review and send.' };
      }
      const countered = c.offers.find(o => o.status === 'Countered');
      if (countered) return { label: 'Respond to counter', role: 'sales', owner: ownerKey(countered.owner), action: { type: 'respond', owner: countered.owner, decision: 'accept' }, hint: `${buyerTenant(c)} asks for ${percent(countered.ask ?? 0)} off. Accept, meet halfway or keep your price.` };
      const proposed = c.offers.filter(o => o.status === 'Proposed');
      if (proposed.length) return { label: 'Accept proposals', role: buyer, action: { type: 'accept' }, hint: `${proposed.length} ${proposed.length === 1 ? 'proposal is' : 'proposals are'} ready. Compare, counter or swap places in Direct deals.` };
      return { label: 'Create insertion orders', role: buyer, action: { type: 'accept' }, hint: 'Every owner agreed. Generate the insertion orders to lock the terms.' };
    }
    case 'Ready to sign': {
      if (!c.signedBuyer) return { label: 'Sign buyer IOs', role: buyer, action: { type: 'sign', side: 'buyer' }, hint: 'Demo signature. No legal agreement is created.' };
      const owner = c.offers.find(o => !c.signedOwners.includes(o.owner))?.owner;
      return { label: 'Sign owner IO', role: 'sales', owner: ownerKey(owner), action: { type: 'sign', side: 'seller', owner }, hint: 'Confirm the insertion order for this media owner.' };
    }
    case 'Booked': return c.creative === 'In review'
      ? { label: 'Approve creative', role: 'reviewer', action: { type: 'review', approved: true }, hint: 'The creative is ready for a human review.' }
      : { label: 'Use demo creative', role: c.channel === 'Self-serve' ? 'advertiser' : c.channel === 'Programmatic' ? 'trader' : buyer, action: { type: 'creative' }, hint: c.creative === 'Rejected' ? c.creativeNote : 'Start with a ready-to-use creative, or upload your own.' };
    case 'Ready to launch': return { label: 'Launch campaign', role: 'ops', action: { type: 'launch' }, hint: 'Approved assets. Reserved inventory. Ready for the world.' };
    case 'Live': return { label: 'Simulate next day', role: 'ops', action: { type: 'advance' }, hint: 'Demo clock: advance delivery without waiting for tomorrow.' };
    case 'Completed': {
      const missing = deliveryRows(c).find(row => !row.hasProof);
      if (missing) return { label: 'Complete posting jobs', role: 'crew', owner: ownerKey(missing.frame.owner), hint: 'A static face needs proof before we can settle.' };
      const needsResolution = (c.discrepancy || hasUnderDelivery(c, config.underdelivery)) && !c.resolved;
      return { label: needsResolution ? 'Resolve with credit' : 'Reconcile delivery', role: 'finance', action: { type: needsResolution ? 'resolve' : 'reconcile' }, hint: 'Match buyer, seller, player and Measure records.' };
    }
    case 'Reconciled': return { label: c.invoiceIssued ? 'Record demo payment' : 'Issue demo invoice', role: 'finance', action: { type: c.invoiceIssued ? 'pay' : 'invoice' }, hint: c.invoiceIssued ? 'Simulate payment. No money will move.' : 'Generated from verified delivery, with demo tax rules.' };
    case 'Paid': return { label: 'Campaign complete', role: 'finance', hint: 'Planned, delivered, proven and settled.' };
  }
}
export function createCampaign(workspace: Workspace, brief: Brief, channel: Campaign['channel'] = 'Direct', ids?: string[], now = new Date()): Campaign {
  const allowedRoles: PersonaId[] = channel === 'Direct' ? ['planner', 'brand', 'admin'] : channel === 'Self-serve' ? ['advertiser', 'admin'] : ['yield', 'admin'];
  requireRule(allowedRoles.includes(workspace.persona), 'Switch to the appropriate buying or selling workspace before creating this campaign.');
  requireRule(brief.name.trim().length >= 3, 'Give your campaign a name with at least 3 characters.');
  requireRule(Number.isSafeInteger(brief.budget) && brief.budget > 0, 'Enter a positive budget.');
  requireRule(Number.isFinite(Date.parse(brief.start)) && Date.parse(brief.end) > Date.parse(brief.start), 'End date must be after the start date.');
  const frameIds = ids || chooseFrames(workspace, brief, brief.option);
  const buyer = workspace.persona === 'brand' ? 'brand' : 'planner';
  requireRule(frameIds.length > 0, 'No available inventory fits this budget. Increase the budget or change the dates.');
  requireRule(frameIds.every(id => getFrame(id).market === brief.market && available(getFrame(id), workspace, brief.start, brief.end)), 'One or more selected frames are no longer available in this market.');
  const campaign: Campaign = {
    ...brief, name: brief.name.trim(), id: `AU-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, channel, buyer,
    option: brief.option || 'Balanced', frameIds: [...new Set(frameIds)], stage: channel === 'Self-serve' ? 'Booked' : 'Draft',
    dealStatus: channel === 'Programmatic' ? 'Offered' : undefined,
    version: 1, approved: channel !== 'Direct' || buyer === 'brand', signedBuyer: channel === 'Self-serve', signedSeller: channel === 'Self-serve',
    signedOwners: channel === 'Self-serve' ? [...new Set(frameIds.map(id => getFrame(id).owner))] : [],
    offers: [...new Set(frameIds.map(id => getFrame(id).owner))].map(owner => ({ owner, status: channel === 'Self-serve' ? 'Accepted' : 'Pending', adjustment: 0, discount: 0, extensionRequested: false, alternatives: [], history: [] })),
    creative: 'Missing', creativeNote: '', progress: 0, discrepancy: false, resolved: false, invoiceIssued: false, proofs: [], theme: workspace.campaigns.length % 4,
    events: [{ id: crypto.randomUUID(), at: now.toISOString(), actor: getPersona(workspace.persona).name, text: channel === 'Direct' ? buyer === 'brand' ? 'Drafted a brand-direct deal from the brief' : 'Drafted a campaign from the brief' : channel === 'Programmatic' ? 'Offered a guaranteed deal to the trading desk' : 'Self-serve demo booking confirmed' }],
  };
  requireRule(metrics(campaign).cost <= brief.budget, 'Selected inventory exceeds your budget.');
  return campaign;
}
export function transition(workspace: Workspace, original: Campaign, action: Action, now = new Date()): Campaign {
  const c = structuredClone(original);
  const role = workspace.persona;
  const allow = (...roles: PersonaId[]) => requireRule(role === 'admin' || roles.includes(role), `This action needs ${roles.map(r => getPersona(r).role).join(' or ')} access.`);
  const atStage = (...allowed: Campaign['stage'][]) => requireRule(allowed.includes(c.stage), `This action is not available while the campaign is ${c.stage.toLowerCase()}.`);
  const allowBuyer = () => allow(c.buyer);
  const offerFor = (owner: string) => {
    const found = c.offers.find(o => o.owner === owner);
    if (!found) throw new Error('This owner is not a party to the proposal.');
    return found;
  };
  const asOwner = (owner: string) => {
    allow('sales');
    requireRule(role === 'admin' || workspace.owner === owner, 'Switch to this owner workspace before responding.');
    return offerFor(owner);
  };
  const requireHold = (o: Offer) => requireRule(holdActive(c, o, now), 'The soft hold expired. Ask the owner to renew it, or reopen the plan to refresh availability.');
  const reprice = (o: Offer) => { o.adjustment = -Math.round(ownerBase(c, o.owner) * o.discount) || 0; };
  const note = (o: Offer, side: 'buyer' | 'owner', text: string) => { o.history = [...o.history, { at: now.toISOString(), side, text }]; };
  const syncHold = () => { const holds = c.offers.map(o => o.holdUntil).filter((h): h is string => Boolean(h)).sort(); if (holds.length) c.holdUntil = holds[0]; };
  const ownerLinesFree = (owner: string) => ownerLines(c, owner).every(id => available(getFrame(id), workspace, c.start, c.end, c.id));
  const holdTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: markets[c.market].timezone });
  let message: string;
  switch (action.type) {
    case 'option':
    case 'frames':
      allowBuyer(); atStage('Draft');
      c.frameIds = action.type === 'frames' ? [...new Set(action.frameIds)] : chooseFrames(workspace, c, action.option, c.id);
      requireRule(c.frameIds.length > 0, 'Keep at least one frame in the plan.');
      requireRule(c.frameIds.every(id => getFrame(id).market === c.market && available(getFrame(id), workspace, c.start, c.end, c.id)), 'Selected inventory is not available for these dates.');
      c.offers = [];
      requireRule(metrics(c).cost <= c.budget, 'These frames would exceed the campaign budget.');
      if (action.type === 'option') c.option = action.option;
      c.version += 1; c.approved = c.buyer === 'brand';
      message = `Updated plan to version ${c.version}`; break;
    case 'submit':
      allow('planner'); atStage('Draft');
      c.stage = 'In review'; message = 'Requested budget approval from Helena'; break;
    case 'approve':
      allow('approver'); atStage('In review');
      c.approved = true; c.stage = 'Draft'; message = 'Approved campaign budget'; break;
    case 'rfp': {
      allowBuyer(); atStage('Draft');
      requireRule(!needsApproval(c, workspace.config), 'This budget needs approval before it can be sent.');
      requireRule(c.frameIds.every(id => available(getFrame(id), workspace, c.start, c.end, c.id)), 'Inventory changed. Refresh your plan before sending.');
      c.stage = 'Awaiting offers';
      const holdUntil = new Date(now.getTime() + 72 * HOUR).toISOString();
      c.holdUntil = holdUntil;
      c.offers = [...new Set(c.frameIds.map(id => getFrame(id).owner))].map(owner => ({
        owner, status: 'Pending', adjustment: 0, discount: 0, agreement: findAgreement(buyerTenant(c), owner)?.id,
        heldAt: now.toISOString(), holdUntil, extensionRequested: false, alternatives: [],
        history: [{ at: now.toISOString(), side: 'buyer', text: `Requested a proposal for ${ownerLines(c, owner).length} places with a 72-hour soft hold` }],
      }));
      message = `Sent ${c.offers.length} owner-specific RFPs with 72-hour soft holds`; break;
    }
    case 'refresh':
      allowBuyer(); atStage('Awaiting offers');
      c.stage = 'Draft'; c.approved = false; c.holdUntil = undefined; c.offers = [];
      message = 'Reopened the plan to refresh availability and renew holds'; break;
    case 'offer': {
      atStage('Awaiting offers');
      const offer = asOwner(action.owner);
      requireHold(offer);
      requireRule(offer.status === 'Pending', 'This proposal has already been sent.');
      const agreement = agreementById(offer.agreement);
      offer.discount = roundShare((agreement?.discount ?? 0) + (action.counter ? .05 : 0));
      reprice(offer);
      offer.alternatives = suggestSwaps(workspace, c, offer.owner, now);
      offer.status = 'Proposed';
      note(offer, 'owner', `Proposed ${percent(offer.discount)} off rate card${agreement ? ` under ${agreement.name}` : ''}${action.counter ? ', including a 5% added saving' : ''}${offer.alternatives.length ? ` · suggested ${offer.alternatives.length} better-value ${offer.alternatives.length === 1 ? 'swap' : 'swaps'}` : ''}`);
      message = `${action.owner} sent a proposal at ${percent(offer.discount)} off rate card`; break;
    }
    case 'counter': {
      allowBuyer(); atStage('Awaiting offers');
      const offer = offerFor(action.owner);
      requireRule(offer.status === 'Proposed', 'You can counter once the owner has sent a proposal.');
      requireHold(offer);
      const ask = roundShare(action.discount);
      requireRule(ask > offer.discount && ask <= .3, 'Ask for more than the current saving and no more than 30% off rate card.');
      offer.status = 'Countered'; offer.ask = ask;
      note(offer, 'buyer', `Countered at ${percent(ask)} off rate card`);
      message = `Countered ${action.owner} at ${percent(ask)} off rate card`; break;
    }
    case 'respond': {
      atStage('Awaiting offers');
      const offer = asOwner(action.owner);
      requireRule(offer.status === 'Countered' && offer.ask !== undefined, 'There is no counter to answer.');
      requireHold(offer);
      const ask = offer.ask ?? offer.discount;
      if (action.decision === 'accept') { offer.discount = ask; offer.status = 'Accepted'; }
      else { offer.discount = action.decision === 'split' ? roundShare((offer.discount + ask) / 2) : offer.discount; offer.status = 'Proposed'; }
      offer.ask = undefined; reprice(offer);
      const text = action.decision === 'accept' ? `Accepted the counter at ${percent(offer.discount)} off` : action.decision === 'split' ? `Met halfway at ${percent(offer.discount)} off` : `Kept the proposal at ${percent(offer.discount)} off`;
      note(offer, 'owner', text);
      message = `${action.owner}: ${text.charAt(0).toLowerCase()}${text.slice(1)}`; break;
    }
    case 'accept-offer': {
      allowBuyer(); atStage('Awaiting offers');
      const offer = offerFor(action.owner);
      requireRule(offer.status === 'Proposed', 'Only a sent proposal can be accepted.');
      requireHold(offer);
      requireRule(ownerLinesFree(offer.owner), 'A place in this proposal is no longer available. Swap it before accepting.');
      offer.status = 'Accepted';
      note(offer, 'buyer', `Accepted the proposal at ${percent(offer.discount)} off rate card`);
      const ready = c.offers.every(o => o.status === 'Accepted') && c.offers.every(o => holdActive(c, o, now)) && c.frameIds.every(id => available(getFrame(id), workspace, c.start, c.end, c.id));
      if (ready) c.stage = 'Ready to sign';
      message = ready ? `Accepted ${action.owner}. Every owner agreed, so insertion orders were generated` : `Accepted the ${action.owner} proposal`; break;
    }
    case 'swap': {
      allowBuyer(); atStage('Awaiting offers');
      const offer = offerFor(action.owner);
      requireRule(offer.status === 'Proposed', 'Swaps can be applied while the proposal is open.');
      requireHold(offer);
      const swap = offer.alternatives.find(a => a.frameId === action.frameId);
      requireRule(Boolean(swap) && c.frameIds.includes(swap!.replaces), 'This suggestion is no longer part of the proposal.');
      requireRule(available(getFrame(action.frameId), workspace, c.start, c.end, c.id), 'This place was booked by someone else. Choose another suggestion.');
      c.frameIds = c.frameIds.map(id => id === swap!.replaces ? swap!.frameId : id);
      reprice(offer);
      requireRule(metrics(c).cost <= c.budget, 'This swap would exceed the campaign budget.');
      offer.alternatives = offer.alternatives.filter(a => a.frameId !== swap!.frameId && a.replaces !== swap!.replaces);
      c.version += 1;
      note(offer, 'buyer', `Swapped ${getFrame(swap!.replaces).name} for ${getFrame(swap!.frameId).name}`);
      message = `Swapped ${getFrame(swap!.replaces).name} for ${getFrame(swap!.frameId).name}`; break;
    }
    case 'extend-request': {
      allowBuyer(); atStage('Awaiting offers');
      const offer = offerFor(action.owner);
      requireRule(!offer.extensionRequested, 'You have already asked this owner for more time.');
      offer.extensionRequested = true;
      note(offer, 'buyer', 'Asked for 48 more hours on the soft hold');
      message = `Asked ${action.owner} to extend the soft hold`; break;
    }
    case 'extend': {
      atStage('Awaiting offers');
      const offer = asOwner(action.owner);
      requireRule(ownerLinesFree(offer.owner), 'A held place is no longer available. Suggest a swap instead.');
      const from = Math.max(now.getTime(), Date.parse(offerHold(c, offer) ?? now.toISOString()));
      offer.holdUntil = new Date(from + 48 * HOUR).toISOString();
      offer.heldAt = offer.heldAt ?? offerHeldAt(c, offer);
      offer.extensionRequested = false;
      syncHold();
      note(offer, 'owner', `Extended the soft hold to ${holdTime(offer.holdUntil)}`);
      message = `${action.owner} extended the soft hold to ${holdTime(offer.holdUntil)}`; break;
    }
    case 'accept':
      allowBuyer(); atStage('Awaiting offers');
      requireRule(c.offers.every(o => o.status === 'Proposed' || o.status === 'Accepted'), 'Wait for every owner to respond.');
      requireRule(c.offers.every(o => holdActive(c, o, now)), 'The soft hold expired. Ask the owner to renew it, or reopen the plan to refresh availability.');
      requireRule(c.frameIds.every(id => available(getFrame(id), workspace, c.start, c.end, c.id)), 'A frame is no longer available. Revise the plan before booking.');
      c.offers.forEach(o => { if (o.status === 'Proposed') { o.status = 'Accepted'; note(o, 'buyer', `Accepted the proposal at ${percent(o.discount)} off rate card`); } });
      c.stage = 'Ready to sign'; message = 'Accepted owner offers and generated insertion orders'; break;
    case 'accept-deal':
      allow('trader'); atStage('Draft');
      requireRule(c.channel === 'Programmatic' && c.dealStatus === 'Offered', 'This deal is not awaiting acceptance.');
      requireRule(c.frameIds.every(id => available(getFrame(id), workspace, c.start, c.end, c.id)), 'Deal inventory is no longer available.');
      c.dealStatus = 'Accepted'; c.stage = 'Booked'; c.signedBuyer = true; c.signedSeller = true;
      c.signedOwners = c.offers.map(o => o.owner); c.offers.forEach(o => { o.status = 'Accepted'; });
      message = 'Accepted guaranteed deal and reserved priority-2 capacity'; break;
    case 'sign':
      allow(action.side === 'buyer' ? c.buyer : 'sales'); atStage('Ready to sign');
      if (action.side === 'buyer') c.signedBuyer = true;
      else {
        requireRule(Boolean(action.owner && c.offers.some(o => o.owner === action.owner)), 'Select an owner insertion order.');
        requireRule(role === 'admin' || workspace.owner === action.owner, 'You can only sign for your current owner workspace.');
        if (action.owner && !c.signedOwners.includes(action.owner)) c.signedOwners.push(action.owner);
        c.signedSeller = c.offers.every(o => c.signedOwners.includes(o.owner));
      }
      if (c.signedBuyer && c.signedSeller) {
        requireRule(c.frameIds.every(id => available(getFrame(id), workspace, c.start, c.end, c.id)), 'A frame was booked while signing. Refresh availability.');
        c.stage = 'Booked';
      }
      message = `${action.side === 'buyer' ? 'Buyer' : action.owner} signed the demo IO`; break;
    case 'creative':
      allow('planner', 'brand', 'advertiser', 'trader'); atStage('Booked');
      c.creative = 'In review'; c.creativeNote = ''; c.assetId = action.assetId;
      message = action.assetId ? 'Uploaded creative for review' : 'Mapped demo creative to booked formats'; break;
    case 'review':
      allow('reviewer'); atStage('Booked');
      requireRule(c.creative === 'In review', 'Upload or select a creative before reviewing.');
      requireRule(action.approved || Boolean(action.reason?.trim()), 'Add a reason so the buyer can fix the creative.');
      c.creative = action.approved ? 'Approved' : 'Rejected'; c.creativeNote = action.reason || '';
      if (action.approved) c.stage = 'Ready to launch';
      message = action.approved ? 'Approved creative for scheduling' : `Requested creative changes: ${action.reason}`; break;
    case 'launch':
      allow('ops'); atStage('Ready to launch');
      requireRule(c.creative === 'Approved', 'Only approved creative can be scheduled.');
      requireRule(c.frameIds.every(id => !workspace.blocked.includes(id)), 'A booked frame is blacked out. Resolve inventory before launching.');
      c.stage = 'Live'; c.progress = 12; message = 'Published demo schedule and created static posting jobs'; break;
    case 'advance':
      allow('ops', 'trader'); atStage('Live');
      c.progress = Math.min(100, c.progress + 22);
      if (c.progress === 100) c.stage = 'Completed';
      message = `Simulated delivery to ${c.progress}% of flight`; break;
    case 'complete':
      allow('ops', 'trader'); atStage('Live');
      c.progress = 100; c.stage = 'Completed'; message = 'Completed demo flight'; break;
    case 'proof':
      allow('crew', 'ops'); atStage('Booked', 'Ready to launch', 'Live', 'Completed');
      requireRule(c.frameIds.includes(action.frameId) && getFrame(action.frameId).type === 'Static', 'This job is not a static face on the order.');
      requireRule(role === 'admin' || getFrame(action.frameId).owner === workspace.owner, 'This job belongs to another owner workspace.');
      validateProof(action.distance, action.at, c.start, c.end);
      c.proofs = [...c.proofs.filter(p => p.frameId !== action.frameId), { frameId: action.frameId, distance: action.distance, recordedAt: action.at, assetId: action.assetId }];
      message = `Verified posting proof for ${getFrame(action.frameId).name}`; break;
    case 'resolve':
      allow('finance'); atStage('Completed');
      c.resolved = true; message = 'Aligned counterparty records to Measure and credited undelivered impressions'; break;
    case 'reconcile':
      allow('finance'); atStage('Completed');
      requireRule(deliveryRows(c).every(r => r.hasProof), 'Static proof is missing. Complete posting jobs before reconciliation.');
      requireRule(!hasUnderDelivery(c, workspace.config.underdelivery) || c.resolved, 'Accept a make-good credit before reconciling under-delivery.');
      requireRule(deliveryRows(c).every(r => isWithinTolerance([r.buyer, r.ssp, r.owner, r.measured], workspace.config.reconciliation)), 'Resolve mismatched lines before reconciling.');
      c.stage = 'Reconciled'; message = 'Reconciled all four delivery sources'; break;
    case 'invoice':
      allow('finance'); atStage('Reconciled');
      requireRule(!c.invoiceIssued, 'This invoice has already been issued.');
      c.invoiceIssued = true;
      if (c.channel === 'Self-serve') c.stage = 'Paid';
      message = `Issued demo ${markets[c.market].invoice} invoice${c.channel === 'Self-serve' ? ' and applied the simulated prepayment' : ''}`; break;
    case 'pay':
      allow('finance'); atStage('Reconciled');
      requireRule(c.invoiceIssued, 'Issue the invoice before recording payment.');
      c.stage = 'Paid'; message = 'Recorded simulated payment. No money moved.'; break;
  }
  c.events.push({ id: crypto.randomUUID(), at: now.toISOString(), actor: getPersona(role).name, text: message });
  return c;
}
