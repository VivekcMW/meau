import { describe, expect, it } from 'vitest';
import { demoEnd, demoStart } from './config';
import { available, canSeeCampaign, chooseFrames, createCampaign, deliveryRows, hasUnderDelivery, isWithinTolerance, metrics, nextStep, transition, validateProof, workspaceTasks } from './engine';
import { frames, getFrame, seedWorkspace } from './fixtures';
import type { Action, Brief, Campaign, PersonaId, Workspace } from './model';
import { workspaceSchema } from './model';

const brief: Brief = { name: 'A new city moment', client: 'Nord Collective', market: 'DK', objective: 'Awareness', budget: 12000000, start: demoStart, end: demoEnd };
function context() {
  let w = seedWorkspace();
  let c = createCampaign(w, brief);
  w.campaigns.unshift(c);
  return {
    get w() { return w; }, get c() { return c; },
    role(persona: PersonaId, owner: Workspace['owner'] = 'Urban Reach Media') { w = { ...w, persona, owner }; },
    act(action: Action, now?: Date) { c = transition(w, c, action, now); w = { ...w, campaigns: w.campaigns.map(current => current.id === c.id ? c : current) }; return c; },
  };
}
describe('deterministic shared data', () => {
  it('only assigns tasks for the current role, market and owner', () => {
    const flow = context();
    flow.act({ type: 'submit' }); flow.role('approver'); flow.act({ type: 'approve' }); flow.role('planner'); flow.act({ type: 'rfp' });
    const step = nextStep(flow.c, flow.w.config);
    expect(step.role).toBe('sales');
    expect(step.owner).toBeDefined();
    flow.role('sales', step.owner);
    expect(workspaceTasks(flow.w).map(c => c.id)).toContain(flow.c.id);
    flow.role('sales', step.owner === 'Vista Outdoor' ? 'Urban Reach Media' : 'Vista Outdoor');
    expect(workspaceTasks(flow.w).map(c => c.id)).not.toContain(flow.c.id);
    expect(workspaceTasks(flow.w, true).map(c => c.id)).toContain(flow.c.id);
    flow.role('sales', step.owner);
    expect(workspaceTasks({ ...flow.w, market: 'BR' }).map(c => c.id)).not.toContain(flow.c.id);
    flow.role('planner');
    expect(workspaceTasks(flow.w).map(c => c.id)).not.toContain(flow.c.id);
  });
  it('curates all alternatives from the selected audience environment', () => {
    const w = seedWorkspace();
    for (const option of ['Balanced', 'Reach', 'Efficient'] as const) {
      const c = createCampaign(w, { ...brief, environment: 'Transit', option });
      expect(c.frameIds.length).toBeGreaterThan(0);
      expect(c.frameIds.every(id => getFrame(id).environment === 'Transit')).toBe(true);
    }
  });
  it('does not offset one location under-delivery with another location over-delivery', () => {
    const c = { ...seedWorkspace().campaigns.find(c => c.id === 'AU-1003')!, progress: 100, resolved: true };
    const expected = deliveryRows(c).reduce((sum, row) => sum + row.frame.rate * 2 * Math.min(1, row.measured / row.forecast), 0);
    expect(metrics(c).billable).toBe(Math.round(expected));
    expect(metrics(c).billable).toBeLessThan(metrics(c).cost);
  });
  it('does not accept offers after their soft hold expires', () => {
    const flow = context();
    flow.act({ type: 'submit' }); flow.role('approver'); flow.act({ type: 'approve' }); flow.role('planner'); flow.act({ type: 'rfp' });
    for (const offer of flow.c.offers) {
      flow.role('sales', offer.owner === 'Vista Outdoor' ? 'Vista Outdoor' : 'Urban Reach Media');
      flow.act({ type: 'offer', owner: offer.owner, counter: false });
    }
    flow.role('planner');
    expect(() => flow.act({ type: 'accept' }, new Date(flow.c.holdUntil!))).toThrow('soft hold expired');
  });
  it('has 300 unique frames in six markets and schema-valid fixtures', () => {
    expect(frames).toHaveLength(300);
    expect(new Set(frames.map(f => f.id)).size).toBe(300);
    expect(new Set(frames.map(f => f.market)).size).toBe(6);
    expect(workspaceSchema.safeParse(seedWorkspace()).success).toBe(true);
  });
  it('plans reproducibly within budget, market and availability constraints', () => {
    const w = seedWorkspace();
    for (const option of ['Balanced', 'Reach', 'Efficient'] as const) {
      const ids = chooseFrames(w, brief, option);
      expect(ids).toEqual(chooseFrames(w, brief, option));
      const c = createCampaign(w, { ...brief, option });
      expect(c.frameIds).toEqual(ids);
      expect(metrics(c).cost).toBeLessThanOrEqual(brief.budget);
      expect(ids.every(id => getFrame(id).market === 'DK' && available(getFrame(id), w))).toBe(true);
    }
  });
  it('rejects an unaffordable, negative, mixed-market or invalid-date brief', () => {
    const w = seedWorkspace();
    expect(() => createCampaign(w, { ...brief, budget: 1 })).toThrow('No available inventory');
    expect(() => createCampaign(w, { ...brief, budget: -5 })).toThrow('positive budget');
    expect(() => createCampaign(w, brief, 'Direct', ['BR-001'])).toThrow('market');
    expect(() => createCampaign(w, { ...brief, end: brief.start })).toThrow('End date');
  });
  it('does not confuse entity IDs when two campaigns are created at the same time', () => {
    const now = new Date('2026-10-26');
    expect(createCampaign(seedWorkspace(), brief, 'Direct', undefined, now).id).not.toBe(createCampaign(seedWorkspace(), brief, 'Direct', undefined, now).id);
  });
  it('keeps owner drafts private until the RFP handoff', () => {
    const flow = context(); flow.role('sales');
    expect(canSeeCampaign(flow.w, flow.c)).toBe(false);
    flow.role('planner'); flow.act({ type: 'submit' }); flow.role('approver'); flow.act({ type: 'approve' });
    flow.role('planner'); flow.act({ type: 'rfp' }); flow.role('sales');
    expect(canSeeCampaign(flow.w, flow.c)).toBe(flow.c.frameIds.some(id => getFrame(id).owner === flow.w.owner));
  });
  it('blocks the wrong role from creating or advancing a campaign', () => {
    const w = { ...seedWorkspace(), persona: 'finance' as const };
    expect(() => createCampaign(w, brief)).toThrow('appropriate');
    const c = createCampaign(seedWorkspace(), brief);
    expect(() => transition(w, c, { type: 'rfp' })).toThrow('access');
  });
});
describe('J-01: brief to paid invoice', () => {
  it('completes every owner handoff, posting proof and financial step', () => {
    const flow = context();
    expect(() => flow.act({ type: 'rfp' })).toThrow('approval');
    flow.act({ type: 'submit' });
    flow.role('approver'); flow.act({ type: 'approve' });
    flow.role('planner'); flow.act({ type: 'rfp' });
    expect(flow.c.offers).toHaveLength(new Set(flow.c.frameIds.map(id => getFrame(id).owner)).size);
    const expires = Date.parse(flow.c.holdUntil!);
    expect(expires - Date.parse(flow.c.events.at(-1)!.at)).toBe(72 * 3600000);
    for (const offer of flow.c.offers) {
      flow.role('sales', offer.owner === 'Vista Outdoor' ? 'Vista Outdoor' : 'Urban Reach Media');
      flow.act({ type: 'offer', owner: offer.owner, counter: true });
    }
    flow.role('planner'); flow.act({ type: 'accept' }); flow.act({ type: 'sign', side: 'buyer' });
    expect(flow.c.stage).toBe('Ready to sign');
    for (const offer of flow.c.offers) {
      flow.role('sales', offer.owner === 'Vista Outdoor' ? 'Vista Outdoor' : 'Urban Reach Media');
      flow.act({ type: 'sign', side: 'seller', owner: offer.owner });
    }
    expect(flow.c.stage).toBe('Booked');
    flow.role('planner'); flow.act({ type: 'creative' });
    flow.role('reviewer'); flow.act({ type: 'review', approved: true });
    flow.role('ops'); flow.act({ type: 'launch' });
    for (const id of flow.c.frameIds.filter(id => getFrame(id).type === 'Static')) {
      const owner = getFrame(id).owner === 'Vista Outdoor' ? 'Vista Outdoor' : 'Urban Reach Media';
      flow.role('crew', owner); flow.act({ type: 'proof', frameId: id, distance: 50, at: flow.c.start });
    }
    flow.role('ops'); flow.act({ type: 'complete' });
    flow.role('finance'); flow.act({ type: 'reconcile' }); flow.act({ type: 'invoice' }); flow.act({ type: 'pay' });
    expect(flow.c.stage).toBe('Paid');
    expect(flow.c.invoiceIssued).toBe(true);
    expect(metrics(flow.c).billable).toBeLessThanOrEqual(metrics(flow.c).cost);
    expect(flow.c.events).toHaveLength(13 + flow.c.offers.length * 2 + flow.c.proofs.length);
    expect(workspaceSchema.safeParse(flow.w).success).toBe(true);
  });
  it('skips approval at the exact policy boundary', () => {
    const w = seedWorkspace();
    const c = createCampaign(w, { ...brief, budget: w.config.approvalLimit });
    expect(transition(w, c, { type: 'rfp' }).stage).toBe('Awaiting offers');
    const larger = createCampaign(w, { ...brief, budget: w.config.approvalLimit + 1 });
    expect(() => transition(w, larger, { type: 'rfp' })).toThrow('approval');
  });
  it('invalidates approval when the plan changes and prevents an empty plan', () => {
    const flow = context(); flow.act({ type: 'submit' }); flow.role('approver'); flow.act({ type: 'approve' }); flow.role('planner');
    const c = flow.act({ type: 'option', option: 'Efficient' });
    expect(c.approved).toBe(false); expect(c.version).toBe(2);
    expect(() => flow.act({ type: 'frames', frameIds: [] })).toThrow('at least one');
  });
  it('requires owner-specific response/signing and allows expired hold recovery', () => {
    const flow = context(); flow.role('admin'); flow.act({ type: 'submit' }); flow.act({ type: 'approve' }); flow.act({ type: 'rfp' }, new Date('2026-10-01'));
    flow.role('sales', 'Vista Outdoor');
    expect(() => flow.act({ type: 'offer', owner: 'Urban Reach Media', counter: false })).toThrow('workspace');
    const offer = flow.c.offers.find(o => o.owner === 'Vista Outdoor');
    if (offer) expect(() => flow.act({ type: 'offer', owner: offer.owner, counter: false }, new Date('2026-10-05'))).toThrow('expired');
    flow.role('planner'); expect(flow.act({ type: 'refresh' }).stage).toBe('Draft');
  });
  it('requires explicit creative rejection feedback', () => {
    const w = { ...seedWorkspace(), persona: 'reviewer' as const };
    const c = w.campaigns.find(c => c.stage === 'Booked')!;
    expect(() => transition(w, c, { type: 'review', approved: false })).toThrow('reason');
    const rejected = transition(w, c, { type: 'review', approved: false, reason: 'Headline too small' });
    expect(rejected.creativeNote).toBe('Headline too small');
    expect(rejected.stage).toBe('Booked');
  });
});
describe('J-02, J-03, J-06 and J-08', () => {
  it('preserves self-serve prepayment without charging a second time', () => {
    const w = { ...seedWorkspace(), persona: 'advertiser' as const };
    const c = createCampaign(w, { ...brief, market: 'BR', client: 'Pão & Co.' }, 'Self-serve');
    expect(c.stage).toBe('Booked');
    expect(nextStep(c, w.config).role).toBe('advertiser');
    const reconciled = { ...c, stage: 'Reconciled' as const, progress: 100 };
    expect(transition({ ...w, persona: 'finance' }, reconciled, { type: 'invoice' }).stage).toBe('Paid');
  });
  it('requires the trader to accept the seller’s guaranteed offer', () => {
    const w = { ...seedWorkspace(), persona: 'yield' as const };
    const offer = createCampaign(w, brief, 'Programmatic');
    expect(offer.stage).toBe('Draft');
    expect(offer.dealStatus).toBe('Offered');
    expect(() => transition(w, offer, { type: 'accept-deal' })).toThrow('access');
    const accepted = transition({ ...w, persona: 'trader' }, offer, { type: 'accept-deal' });
    expect(accepted.stage).toBe('Booked'); expect(accepted.dealStatus).toBe('Accepted');
    expect(accepted.signedSeller && accepted.signedBuyer).toBe(true);
  });
  it('validates exact proof distance and time boundaries', () => {
    expect(() => validateProof(50, demoStart, demoStart, demoEnd)).not.toThrow();
    expect(() => validateProof(0, demoEnd, demoStart, demoEnd)).not.toThrow();
    expect(() => validateProof(50.01, demoStart, demoStart, demoEnd)).toThrow('50 m');
    expect(() => validateProof(-1, demoStart, demoStart, demoEnd)).toThrow();
    expect(() => validateProof(10, '2026-11-02T07:59:59.999Z', demoStart, demoEnd)).toThrow('window');
    expect(() => validateProof(10, 'not-a-date', demoStart, demoEnd)).toThrow();
  });
  it('matches within 1%, including exactly 1%, but not beyond', () => {
    expect(isWithinTolerance([100, 100, 101, 100])).toBe(true);
    expect(isWithinTolerance([100, 100, 101.01, 100])).toBe(false);
    expect(isWithinTolerance([0, 0, 0, 0])).toBe(true);
    expect(isWithinTolerance([1, 0, 0, 0])).toBe(false);
    expect(isWithinTolerance([-1, 100])).toBe(false);
    expect(isWithinTolerance([])).toBe(false);
  });
  it('derives the 94% match rate from records rather than hardcoding it', () => {
    const w = seedWorkspace();
    const rows = w.campaigns.filter(c => ['Completed', 'Reconciled', 'Paid'].includes(c.stage)).flatMap(deliveryRows);
    const matched = rows.filter(r => r.hasProof && isWithinTolerance([r.buyer, r.ssp, r.owner, r.measured])).length;
    expect(matched / rows.length).toBeGreaterThanOrEqual(.9);
    expect(Math.round(matched / rows.length * 100)).toBe(94);
  });
  it('links exception resolution to evidence and does not alter measured delivery', () => {
    const w = { ...seedWorkspace(), persona: 'finance' as const };
    const c = w.campaigns.find(c => c.discrepancy)!;
    const measuredBefore = metrics(c).delivered;
    expect(hasUnderDelivery(c, 5)).toBe(true);
    expect(hasUnderDelivery(c, 20)).toBe(false);
    expect(() => transition(w, c, { type: 'reconcile' })).toThrow();
    const resolved = transition(w, c, { type: 'resolve' });
    expect(metrics(resolved).delivered).toBe(measuredBefore);
    expect(transition(w, resolved, { type: 'reconcile' }).stage).toBe('Reconciled');
  });
  it('never bills unproven static inventory or over-delivery', () => {
    const w = seedWorkspace();
    const live = w.campaigns.find(c => c.stage === 'Live' && c.frameIds.some(id => getFrame(id).type === 'Static'))!;
    const missing: Campaign = { ...live, proofs: [], progress: 100, stage: 'Completed' };
    expect(deliveryRows(missing).filter(r => r.frame.type === 'Static').every(r => r.measured === 0)).toBe(true);
    expect(() => transition({ ...w, persona: 'finance' }, missing, { type: 'reconcile' })).toThrow('proof');
    const paid = w.campaigns.find(c => c.stage === 'Paid')!;
    expect(metrics(paid).billable).toBeLessThanOrEqual(metrics(paid).cost);
    expect(metrics(paid).total).toBe(metrics(paid).billable + metrics(paid).tax);
  });
  it('does not mutate source objects on a failed transition', () => {
    const w = seedWorkspace();
    const c = w.campaigns[0];
    const before = JSON.stringify(c);
    expect(() => transition(w, c, { type: 'pay' })).toThrow();
    expect(JSON.stringify(c)).toBe(before);
  });
});
