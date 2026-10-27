import { demoEnd, demoStart, markets } from './config';
import { marketKeys } from './model';
import type { Campaign, Frame, Offer, Workspace } from './model';

export const frames: Frame[] = marketKeys.flatMap((market, mi) => Array.from({ length: 50 }, (_, i) => {
  const place = markets[market].places[i % 8];
  const type = i % 5 === 3 ? 'Static' : 'Digital';
  const environment = (['Roadside', 'Retail', 'Transit', 'Street'] as const)[i % 4];
  return {
    id: `${market}-${String(i + 1).padStart(3, '0')}`,
    name: `${place}${i >= 8 ? ` · ${Math.floor(i / 8) + 1}` : ''}`,
    owner: i % 2 ? 'Vista Outdoor' : 'Urban Reach Media',
    market, city: markets[market].city, type, environment,
    format: type === 'Static' ? 'Classic billboard' : i % 3 === 0 ? 'Digital billboard' : i % 3 === 1 ? 'Digital 6-sheet' : 'Transit screen',
    audience: 45000 + ((i * 13817 + mi * 9157) % 190000),
    rate: (market === 'UA' ? 14000 : market === 'DK' || market === 'BR' ? 1800 : 450) * 100 + (i % 9) * (market === 'UA' ? 70000 : 7000),
    method: (['Measured', 'Measured', 'Fused', 'Modelled', 'Measured'] as const)[i % 5],
    lat: markets[market].lat + (((i * 37) % 100) - 50) / 1100,
    lng: markets[market].lng + (((i * 61) % 100) - 50) / 700,
    x: 13 + ((i * 61) % 76), y: 15 + ((i * 37) % 70),
    quality: 88 + (i % 12), color: i % 4,
  };
}));
export const frameById = new Map(frames.map(f => [f.id, f]));
export function getFrame(id: string): Frame {
  const frame = frameById.get(id);
  if (!frame) throw new Error(`Inventory ${id} is not available.`);
  return frame;
}
function seedCampaign(id: string, name: string, client: string, market: Campaign['market'], stage: Campaign['stage'], theme: number, channel: Campaign['channel'] = 'Direct', buyer: Campaign['buyer'] = 'planner'): Campaign {
  const marketFrames = frames.filter(f => f.market === market);
  const start = (Number(id.slice(-1)) * 4) % 35;
  const selected = marketFrames.slice(start, start + 8);
  const finished = ['Completed', 'Reconciled', 'Paid'].includes(stage);
  const confirmed = !['Draft', 'In review', 'Awaiting offers', 'Ready to sign'].includes(stage);
  return {
    id, name, client, market, stage, channel, theme, buyer,
    objective: 'Awareness', budget: market === 'BR' || market === 'DK' ? 12000000 : 2500000,
    start: demoStart, end: demoEnd, frameIds: selected.map(f => f.id),
    option: 'Balanced', version: 1, approved: true,
    offers: [...new Set(selected.map(f => f.owner))].map(owner => ({ owner, status: stage === 'Awaiting offers' ? 'Pending' : 'Accepted', adjustment: 0, discount: 0, extensionRequested: false, alternatives: [], history: [] })),
    signedBuyer: confirmed, signedSeller: confirmed,
    signedOwners: confirmed ? [...new Set(selected.map(f => f.owner))] : [],
    creative: confirmed ? stage === 'Booked' ? 'In review' : 'Approved' : 'Missing',
    creativeNote: '', progress: finished ? 100 : stage === 'Live' ? 62 : 0,
    discrepancy: id === 'AU-1003', resolved: stage === 'Reconciled' || stage === 'Paid', invoiceIssued: stage === 'Paid',
    proofs: confirmed ? selected.filter(f => f.type === 'Static').map(f => ({ frameId: f.id, distance: 12, recordedAt: demoStart })) : [],
    events: [
      { id: `${id}-e1`, at: '2026-10-24T09:15:00Z', actor: 'Sofia', text: 'Created a measured audience plan' },
      { id: `${id}-e2`, at: '2026-10-26T08:30:00Z', actor: confirmed ? 'Tom' : 'Sofia', text: confirmed ? 'Campaign connected across the workspace' : 'Saved plan for review' },
    ],
  };
}
const at = (now: Date, hours: number) => new Date(now.getTime() + hours * 3600000).toISOString();
function negotiated(c: Campaign, owner: string, offer: Partial<Offer>): Offer {
  const periods = Math.max(1, Math.ceil((Date.parse(c.end) - Date.parse(c.start)) / 86400000)) / 7;
  const base = c.frameIds.map(getFrame).filter(f => f.owner === owner).reduce((n, f) => n + Math.round(f.rate * periods), 0);
  const discount = offer.discount ?? 0;
  return { owner, status: 'Pending', discount, adjustment: -Math.round(base * discount) || 0, extensionRequested: false, alternatives: [], history: [], ...offer };
}
/** AU-1005: an agency deal mid-negotiation. Urban Reach has proposed; Vista still has to answer and its hold is running out. */
function chapterDeal(now: Date): Campaign {
  const c = seedCampaign('AU-1005', 'Your next chapter', 'Chapter', 'DK', 'Awaiting offers', 1);
  c.offers = [
    negotiated(c, 'Urban Reach Media', { status: 'Proposed', discount: .08, agreement: 'AGR-NS-URM', heldAt: at(now, -66), holdUntil: at(now, 54),
      alternatives: [
        { frameId: 'DK-013', replaces: 'DK-021', reason: '35% lower cost per impression than Frederiksberg · 3.' },
        { frameId: 'DK-041', replaces: 'DK-023', reason: '27% lower cost per impression than Østerport · 3.' },
      ],
      history: [
        { at: at(now, -66), side: 'buyer', text: 'Requested a proposal for 4 places with a 72-hour soft hold' },
        { at: at(now, -50), side: 'owner', text: 'Proposed 8% off rate card under Northstar 2026 annual rates · suggested 2 better-value swaps' },
        { at: at(now, -26), side: 'buyer', text: 'Asked for 48 more hours on the soft hold' },
        { at: at(now, -20), side: 'owner', text: 'Extended the soft hold by 48 hours' },
      ] }),
    negotiated(c, 'Vista Outdoor', { status: 'Pending', agreement: 'AGR-NS-VO', heldAt: at(now, -66), holdUntil: at(now, 6),
      history: [{ at: at(now, -66), side: 'buyer', text: 'Requested a proposal for 4 places with a 72-hour soft hold' }] }),
  ];
  c.holdUntil = at(now, 6);
  c.events.push(
    { id: 'AU-1005-e3', at: at(now, -66), actor: 'Sofia', text: 'Sent 2 owner-specific RFPs with 72-hour soft holds' },
    { id: 'AU-1005-e4', at: at(now, -50), actor: 'Daniel', text: 'Urban Reach Media sent a proposal at 8% off rate card' },
    { id: 'AU-1005-e5', at: at(now, -20), actor: 'Daniel', text: 'Urban Reach Media extended the soft hold by 48 hours' },
  );
  return c;
}
/** AU-1009: a brand buying direct without an agency. Urban Reach is agreed; Vista must answer the brand's counter. */
function milanDeal(now: Date): Campaign {
  const c = seedCampaign('AU-1009', 'Slow mornings in Milan', 'Nord Collective', 'IT', 'Awaiting offers', 2, 'Direct', 'brand');
  c.offers = [
    negotiated(c, 'Vista Outdoor', { status: 'Countered', discount: .06, ask: .1, agreement: 'AGR-NC-VO', heldAt: at(now, -28), holdUntil: at(now, 44),
      alternatives: [{ frameId: 'IT-010', replaces: 'IT-002', reason: '60% lower cost per impression than Porta Nuova.' }],
      history: [
        { at: at(now, -28), side: 'buyer', text: 'Requested a proposal for 4 places with a 72-hour soft hold' },
        { at: at(now, -19), side: 'owner', text: 'Proposed 6% off rate card under Nord Collective direct rates · suggested 1 better-value swap' },
        { at: at(now, -3), side: 'buyer', text: 'Countered at 10% off rate card' },
      ] }),
    negotiated(c, 'Urban Reach Media', { status: 'Accepted', discount: .05, heldAt: at(now, -28), holdUntil: at(now, 44),
      history: [
        { at: at(now, -28), side: 'buyer', text: 'Requested a proposal for 4 places with a 72-hour soft hold' },
        { at: at(now, -22), side: 'owner', text: 'Proposed 5% off rate card, including a 5% added saving' },
        { at: at(now, -4), side: 'buyer', text: 'Accepted the proposal at 5% off rate card' },
      ] }),
  ];
  c.holdUntil = at(now, 44);
  c.events = [
    { id: 'AU-1009-e1', at: at(now, -30), actor: 'Aiko', text: 'Drafted a brand-direct deal from the brief' },
    { id: 'AU-1009-e2', at: at(now, -28), actor: 'Aiko', text: 'Sent 2 owner-specific RFPs with 72-hour soft holds' },
    { id: 'AU-1009-e3', at: at(now, -22), actor: 'Daniel', text: 'Urban Reach Media sent a proposal at 5% off rate card' },
    { id: 'AU-1009-e4', at: at(now, -19), actor: 'Daniel', text: 'Vista Outdoor sent a proposal at 6% off rate card' },
    { id: 'AU-1009-e5', at: at(now, -4), actor: 'Aiko', text: 'Accepted the Urban Reach Media proposal' },
    { id: 'AU-1009-e6', at: at(now, -3), actor: 'Aiko', text: 'Countered Vista Outdoor at 10% off rate card' },
  ];
  return c;
}
export const FIXTURE_VERSION = 2;
/** Brings a saved browser workspace up to the current demo seed without discarding the visitor's own work. */
export function upgradeWorkspace(w: Workspace, now = new Date()): Workspace {
  if (w.fixtureVersion >= FIXTURE_VERSION) return w;
  const campaigns = w.campaigns.map(c => {
    const untouched = c.id === 'AU-1005' && c.stage === 'Awaiting offers' && c.events.length === 2 && c.offers.every(o => o.status === 'Pending');
    if (untouched) return chapterDeal(now);
    return { ...c, offers: c.offers.map(o => o.status === 'Countered' && o.ask === undefined ? { ...o, status: c.stage === 'Awaiting offers' ? 'Proposed' as const : 'Accepted' as const } : o) };
  });
  if (!campaigns.some(c => c.id === 'AU-1009')) campaigns.push(milanDeal(now));
  return { ...w, campaigns, fixtureVersion: FIXTURE_VERSION };
}
export function seedWorkspace(now = new Date()): Workspace {
  return {
    version: 1, fixtureVersion: FIXTURE_VERSION, persona: 'planner', market: 'All', owner: 'Urban Reach Media', cart: [], saved: ['DK-001', 'DK-004', 'BR-002'], blocked: [],
    agentEnabled: true, agentLevel: 'A2',
    config: { approvalLimit: 5000000, underdelivery: 5, reconciliation: 1 },
    segments: [{ id: 'seg-1', name: 'Urban explorers', market: 'DK', environment: 'Transit' }, { id: 'seg-2', name: 'Everyday shoppers', market: 'BR', environment: 'Retail' }],
    studies: [{ id: 'study-1', name: 'Nord store visit lift', campaignId: 'AU-1001' }],
    campaigns: [
      seedCampaign('AU-1001', 'A little more outside', 'Nord Collective', 'DK', 'Live', 0),
      seedCampaign('AU-1002', 'Good mornings, São Paulo', 'Pão & Co.', 'BR', 'Live', 1, 'Self-serve'),
      seedCampaign('AU-1003', 'Made for the everyday', 'Forma', 'DK', 'Completed', 2),
      seedCampaign('AU-1004', 'Move with the city', 'Velo', 'US', 'Live', 3, 'Programmatic'),
      chapterDeal(now),
      seedCampaign('AU-1006', 'Light up your commute', 'Luma', 'DK', 'Booked', 2),
      seedCampaign('AU-1007', 'Somewhere new', 'Away Studio', 'AU', 'Paid', 0),
      seedCampaign('AU-1008', 'The city is your runway', 'Nord Collective', 'DK', 'Draft', 3),
      milanDeal(now),
    ],
  };
}
