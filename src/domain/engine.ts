import { demoEnd, demoStart, getPersona, markets } from './config';
import { frames, getFrame } from './fixtures';
import type { Action, Brief, Campaign, Frame, PersonaId, Workspace } from './model';

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
export interface NextStep { label: string; role: PersonaId; action?: Action; owner?: Workspace['owner']; hint: string }
export function workspaceTasks(workspace: Workspace, allHandoffs = false) {
  return workspace.campaigns.filter(c => {
    if (c.stage === 'Paid' || !canSeeCampaign(workspace, c) || workspace.market !== 'All' && c.market !== workspace.market) return false;
    const step = nextStep(c, workspace.config);
    return allHandoffs || step.role === workspace.persona && (!step.owner || step.owner === workspace.owner);
  });
}
export function nextStep(c: Campaign, config: Workspace['config']): NextStep {
  if (c.channel === 'Programmatic' && c.dealStatus === 'Offered') return { label: 'Accept guaranteed deal', role: 'trader', action: { type: 'accept-deal' }, hint: 'A measured-audience deal, ready for your trading desk.' };
  switch (c.stage) {
    case 'Draft': return c.budget > config.approvalLimit && !c.approved
      ? { label: 'Request approval', role: 'planner', action: { type: 'submit' }, hint: 'Your plan is ready for a quick budget check.' }
      : { label: 'Send to owners', role: 'planner', action: { type: 'rfp' }, hint: 'One action. Separate offers and holds for every owner.' };
    case 'In review': return { label: 'Approve plan', role: 'approver', action: { type: 'approve' }, hint: 'Review the budget and move this plan forward.' };
    case 'Awaiting offers': {
      const pending = c.offers.find(o => o.status === 'Pending');
      if (pending) return { label: 'Accept requested lines', role: 'sales', owner: pending.owner === 'Vista Outdoor' ? 'Vista Outdoor' : 'Urban Reach Media', action: { type: 'offer', owner: pending.owner, counter: false }, hint: `${pending.owner} has a proposal ready to review.` };
      return { label: 'Accept offers', role: 'planner', action: { type: 'accept' }, hint: 'All owners have responded. Your order is ready.' };
    }
    case 'Ready to sign': {
      if (!c.signedBuyer) return { label: 'Sign buyer IOs', role: 'planner', action: { type: 'sign', side: 'buyer' }, hint: 'Demo signature. No legal agreement is created.' };
      const owner = c.offers.find(o => !c.signedOwners.includes(o.owner))?.owner;
      return { label: 'Sign owner IO', role: 'sales', owner: owner === 'Vista Outdoor' ? 'Vista Outdoor' : 'Urban Reach Media', action: { type: 'sign', side: 'seller', owner }, hint: 'Confirm the insertion order for this media owner.' };
    }
    case 'Booked': return c.creative === 'In review'
      ? { label: 'Approve creative', role: 'reviewer', action: { type: 'review', approved: true }, hint: 'The creative is ready for a human review.' }
      : { label: 'Use demo creative', role: c.channel === 'Self-serve' ? 'advertiser' : c.channel === 'Programmatic' ? 'trader' : 'planner', action: { type: 'creative' }, hint: c.creative === 'Rejected' ? c.creativeNote : 'Start with a ready-to-use creative, or upload your own.' };
    case 'Ready to launch': return { label: 'Launch campaign', role: 'ops', action: { type: 'launch' }, hint: 'Approved assets. Reserved inventory. Ready for the world.' };
    case 'Live': return { label: 'Simulate next day', role: 'ops', action: { type: 'advance' }, hint: 'Demo clock: advance delivery without waiting for tomorrow.' };
    case 'Completed': {
      const missing = deliveryRows(c).find(row => !row.hasProof);
      if (missing) return { label: 'Complete posting jobs', role: 'crew', owner: missing.frame.owner === 'Vista Outdoor' ? 'Vista Outdoor' : 'Urban Reach Media', hint: 'A static face needs proof before we can settle.' };
      const needsResolution = (c.discrepancy || hasUnderDelivery(c, config.underdelivery)) && !c.resolved;
      return { label: needsResolution ? 'Resolve with credit' : 'Reconcile delivery', role: 'finance', action: { type: needsResolution ? 'resolve' : 'reconcile' }, hint: 'Match buyer, seller, player and Measure records.' };
    }
    case 'Reconciled': return { label: c.invoiceIssued ? 'Record demo payment' : 'Issue demo invoice', role: 'finance', action: { type: c.invoiceIssued ? 'pay' : 'invoice' }, hint: c.invoiceIssued ? 'Simulate payment. No money will move.' : 'Generated from verified delivery, with demo tax rules.' };
    case 'Paid': return { label: 'Campaign complete', role: 'finance', hint: 'Planned, delivered, proven and settled.' };
  }
}
export function createCampaign(workspace: Workspace, brief: Brief, channel: Campaign['channel'] = 'Direct', ids?: string[], now = new Date()): Campaign {
  const allowedRoles: PersonaId[] = channel === 'Direct' ? ['planner', 'admin'] : channel === 'Self-serve' ? ['advertiser', 'admin'] : ['yield', 'admin'];
  requireRule(allowedRoles.includes(workspace.persona), 'Switch to the appropriate buying or selling workspace before creating this campaign.');
  requireRule(brief.name.trim().length >= 3, 'Give your campaign a name with at least 3 characters.');
  requireRule(Number.isSafeInteger(brief.budget) && brief.budget > 0, 'Enter a positive budget.');
  requireRule(Number.isFinite(Date.parse(brief.start)) && Date.parse(brief.end) > Date.parse(brief.start), 'End date must be after the start date.');
  const frameIds = ids || chooseFrames(workspace, brief, brief.option);
  requireRule(frameIds.length > 0, 'No available inventory fits this budget. Increase the budget or change the dates.');
  requireRule(frameIds.every(id => getFrame(id).market === brief.market && available(getFrame(id), workspace, brief.start, brief.end)), 'One or more selected frames are no longer available in this market.');
  const campaign: Campaign = {
    ...brief, name: brief.name.trim(), id: `AU-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, channel,
    option: brief.option || 'Balanced', frameIds: [...new Set(frameIds)], stage: channel === 'Self-serve' ? 'Booked' : 'Draft',
    dealStatus: channel === 'Programmatic' ? 'Offered' : undefined,
    version: 1, approved: channel !== 'Direct', signedBuyer: channel === 'Self-serve', signedSeller: channel === 'Self-serve',
    signedOwners: channel === 'Self-serve' ? [...new Set(frameIds.map(id => getFrame(id).owner))] : [],
    offers: [...new Set(frameIds.map(id => getFrame(id).owner))].map(owner => ({ owner, status: channel === 'Self-serve' ? 'Accepted' : 'Pending', adjustment: 0 })),
    creative: 'Missing', creativeNote: '', progress: 0, discrepancy: false, resolved: false, invoiceIssued: false, proofs: [], theme: workspace.campaigns.length % 4,
    events: [{ id: crypto.randomUUID(), at: now.toISOString(), actor: getPersona(workspace.persona).name, text: channel === 'Direct' ? 'Drafted a campaign from the brief' : channel === 'Programmatic' ? 'Offered a guaranteed deal to the trading desk' : 'Self-serve demo booking confirmed' }],
  };
  requireRule(metrics(campaign).cost <= brief.budget, 'Selected inventory exceeds your budget.');
  return campaign;
}
export function transition(workspace: Workspace, original: Campaign, action: Action, now = new Date()): Campaign {
  const c = structuredClone(original);
  const role = workspace.persona;
  const allow = (...roles: PersonaId[]) => requireRule(role === 'admin' || roles.includes(role), `This action needs ${roles.map(r => getPersona(r).role).join(' or ')} access.`);
  const atStage = (...allowed: Campaign['stage'][]) => requireRule(allowed.includes(c.stage), `This action is not available while the campaign is ${c.stage.toLowerCase()}.`);
  let message: string;
  switch (action.type) {
    case 'option':
    case 'frames':
      allow('planner'); atStage('Draft');
      c.frameIds = action.type === 'frames' ? [...new Set(action.frameIds)] : chooseFrames(workspace, c, action.option, c.id);
      requireRule(c.frameIds.length > 0, 'Keep at least one frame in the plan.');
      requireRule(c.frameIds.every(id => getFrame(id).market === c.market && available(getFrame(id), workspace, c.start, c.end, c.id)), 'Selected inventory is not available for these dates.');
      c.offers = [];
      requireRule(metrics(c).cost <= c.budget, 'These frames would exceed the campaign budget.');
      if (action.type === 'option') c.option = action.option;
      c.version += 1; c.approved = false;
      message = `Updated plan to version ${c.version}`; break;
    case 'submit':
      allow('planner'); atStage('Draft');
      c.stage = 'In review'; message = 'Requested budget approval from Helena'; break;
    case 'approve':
      allow('approver'); atStage('In review');
      c.approved = true; c.stage = 'Draft'; message = 'Approved campaign budget'; break;
    case 'rfp':
      allow('planner'); atStage('Draft');
      requireRule(c.approved || c.budget <= workspace.config.approvalLimit, 'This budget needs approval before it can be sent.');
      requireRule(c.frameIds.every(id => available(getFrame(id), workspace, c.start, c.end, c.id)), 'Inventory changed. Refresh your plan before sending.');
      c.stage = 'Awaiting offers';
      c.holdUntil = new Date(now.getTime() + 72 * 3600000).toISOString();
      c.offers = [...new Set(c.frameIds.map(id => getFrame(id).owner))].map(owner => ({ owner, status: 'Pending', adjustment: 0 }));
      message = `Sent ${c.offers.length} owner-specific RFPs with 72-hour soft holds`; break;
    case 'refresh':
      allow('planner'); atStage('Awaiting offers');
      c.stage = 'Draft'; c.approved = false; c.holdUntil = undefined; c.offers = [];
      message = 'Reopened the plan to refresh availability and renew holds'; break;
    case 'offer': {
      allow('sales'); atStage('Awaiting offers');
      requireRule(role === 'admin' || workspace.owner === action.owner, 'Switch to this owner workspace before responding.');
      if (c.holdUntil) requireRule(now.getTime() < Date.parse(c.holdUntil), 'The soft hold expired. Return to the planner to refresh availability.');
      const offer = c.offers.find(o => o.owner === action.owner);
      requireRule(Boolean(offer), 'This owner is not a party to the proposal.');
      if (offer) { offer.status = action.counter ? 'Countered' : 'Accepted'; offer.adjustment = action.counter ? -Math.round(c.frameIds.filter(id => getFrame(id).owner === action.owner).reduce((sum, id) => sum + getFrame(id).rate, 0) * .05) : 0; }
      message = `${action.owner} ${action.counter ? 'offered a 5% weekly-rate saving' : 'accepted requested lines'}`; break;
    }
    case 'accept':
      allow('planner'); atStage('Awaiting offers');
      requireRule(c.offers.every(o => o.status !== 'Pending'), 'Wait for every owner to respond.');
      if (c.holdUntil) requireRule(now.getTime() < Date.parse(c.holdUntil), 'The soft hold expired. Reopen the plan to refresh availability.');
      requireRule(c.frameIds.every(id => available(getFrame(id), workspace, c.start, c.end, c.id)), 'A frame is no longer available. Revise the plan before booking.');
      c.stage = 'Ready to sign'; message = 'Accepted owner offers and generated insertion orders'; break;
    case 'accept-deal':
      allow('trader'); atStage('Draft');
      requireRule(c.channel === 'Programmatic' && c.dealStatus === 'Offered', 'This deal is not awaiting acceptance.');
      requireRule(c.frameIds.every(id => available(getFrame(id), workspace, c.start, c.end, c.id)), 'Deal inventory is no longer available.');
      c.dealStatus = 'Accepted'; c.stage = 'Booked'; c.signedBuyer = true; c.signedSeller = true;
      c.signedOwners = c.offers.map(o => o.owner); c.offers.forEach(o => { o.status = 'Accepted'; });
      message = 'Accepted guaranteed deal and reserved priority-2 capacity'; break;
    case 'sign':
      allow(action.side === 'buyer' ? 'planner' : 'sales'); atStage('Ready to sign');
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
      allow('planner', 'advertiser', 'trader'); atStage('Booked');
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
