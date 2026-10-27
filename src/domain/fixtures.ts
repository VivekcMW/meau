import { demoEnd, demoStart, markets } from './config';
import { marketKeys } from './model';
import type { Campaign, Frame, Workspace } from './model';

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
function seedCampaign(id: string, name: string, client: string, market: Campaign['market'], stage: Campaign['stage'], theme: number, channel: Campaign['channel'] = 'Direct'): Campaign {
  const marketFrames = frames.filter(f => f.market === market);
  const start = (Number(id.slice(-1)) * 4) % 35;
  const selected = marketFrames.slice(start, start + 8);
  const finished = ['Completed', 'Reconciled', 'Paid'].includes(stage);
  const confirmed = !['Draft', 'In review', 'Awaiting offers', 'Ready to sign'].includes(stage);
  return {
    id, name, client, market, stage, channel, theme,
    objective: 'Awareness', budget: market === 'BR' || market === 'DK' ? 12000000 : 2500000,
    start: demoStart, end: demoEnd, frameIds: selected.map(f => f.id),
    option: 'Balanced', version: 1, approved: true,
    offers: [...new Set(selected.map(f => f.owner))].map(owner => ({ owner, status: stage === 'Awaiting offers' ? 'Pending' : 'Accepted', adjustment: 0 })),
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
export function seedWorkspace(): Workspace {
  return {
    version: 1, persona: 'planner', market: 'All', owner: 'Urban Reach Media', cart: [], saved: ['DK-001', 'DK-004', 'BR-002'], blocked: [],
    agentEnabled: true, agentLevel: 'A2',
    config: { approvalLimit: 5000000, underdelivery: 5, reconciliation: 1 },
    segments: [{ id: 'seg-1', name: 'Urban explorers', market: 'DK', environment: 'Transit' }, { id: 'seg-2', name: 'Everyday shoppers', market: 'BR', environment: 'Retail' }],
    studies: [{ id: 'study-1', name: 'Nord store visit lift', campaignId: 'AU-1001' }],
    campaigns: [
      seedCampaign('AU-1001', 'A little more outside', 'Nord Collective', 'DK', 'Live', 0),
      seedCampaign('AU-1002', 'Good mornings, São Paulo', 'Pão & Co.', 'BR', 'Live', 1, 'Self-serve'),
      seedCampaign('AU-1003', 'Made for the everyday', 'Forma', 'DK', 'Completed', 2),
      seedCampaign('AU-1004', 'Move with the city', 'Velo', 'US', 'Live', 3, 'Programmatic'),
      seedCampaign('AU-1005', 'Your next chapter', 'Chapter', 'DK', 'Awaiting offers', 1),
      seedCampaign('AU-1006', 'Light up your commute', 'Luma', 'DK', 'Booked', 2),
      seedCampaign('AU-1007', 'Somewhere new', 'Away Studio', 'AU', 'Paid', 0),
      seedCampaign('AU-1008', 'The city is your runway', 'Nord Collective', 'DK', 'Draft', 3),
    ],
  };
}
