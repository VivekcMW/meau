import { z } from 'zod';

export const marketKeys = ['DK', 'BR', 'US', 'AU', 'IT', 'UA'] as const;
export type MarketKey = (typeof marketKeys)[number];
export type MarketFilter = MarketKey | 'All';
export const environments = ['Roadside', 'Retail', 'Transit', 'Street'] as const;
export type Method = 'Measured' | 'Fused' | 'Modelled';
export type ModuleId = 'home' | 'planner' | 'deals' | 'campaigns' | 'inventory' | 'marketplace' | 'measure' | 'creative' | 'schedule' | 'field' | 'ssp' | 'dsp' | 'reports' | 'finance' | 'attribution' | 'data' | 'agents' | 'admin' | 'developer' | 'tasks';
export type PersonaId = 'planner' | 'sales' | 'ops' | 'trader' | 'finance' | 'advertiser' | 'admin' | 'brand' | 'crew' | 'approver' | 'reviewer' | 'yield' | 'executive' | 'auditor' | 'developer';
export interface Persona {
  id: PersonaId;
  name: string;
  role: string;
  initials: string;
  tenant: string;
  home: ModuleId;
  nav: ModuleId[];
}
export interface Market {
  key: MarketKey;
  country: string;
  city: string;
  currency: string;
  locale: string;
  timezone: string;
  tax: number;
  invoice: string;
  payment: string;
  lat: number;
  lng: number;
  places: string[];
}
export interface Frame {
  id: string;
  name: string;
  owner: string;
  market: MarketKey;
  city: string;
  type: 'Digital' | 'Static';
  format: string;
  environment: (typeof environments)[number];
  audience: number;
  rate: number;
  method: Method;
  lat: number;
  lng: number;
  x: number;
  y: number;
  quality: number;
  color: number;
}
export const stages = ['Draft', 'In review', 'Awaiting offers', 'Ready to sign', 'Booked', 'Ready to launch', 'Live', 'Completed', 'Reconciled', 'Paid'] as const;
export type Stage = (typeof stages)[number];
export const proofSchema = z.object({ frameId: z.string(), distance: z.number(), recordedAt: z.string(), assetId: z.string().optional() });
export const eventSchema = z.object({ id: z.string(), at: z.string(), actor: z.string(), text: z.string() });
export const offerStatuses = ['Pending', 'Proposed', 'Countered', 'Accepted'] as const;
export const swapSchema = z.object({ frameId: z.string(), replaces: z.string(), reason: z.string() });
export const dealNoteSchema = z.object({ at: z.string(), side: z.enum(['buyer', 'owner']), text: z.string() });
// Pending: owner to propose · Proposed: buyer to decide · Countered: owner to answer the buyer · Accepted: agreed terms.
export const offerSchema = z.object({
  owner: z.string(),
  status: z.enum(offerStatuses),
  adjustment: z.number(),
  discount: z.number().min(0).max(.5).default(0),
  ask: z.number().min(0).max(.5).optional(),
  agreement: z.string().optional(),
  heldAt: z.string().optional(),
  holdUntil: z.string().optional(),
  extensionRequested: z.boolean().default(false),
  alternatives: z.array(swapSchema).default([]),
  history: z.array(dealNoteSchema).default([]),
});
export type Offer = z.infer<typeof offerSchema>;
export const campaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  client: z.string(),
  market: z.enum(marketKeys),
  objective: z.enum(['Awareness', 'Store visits', 'Product launch']),
  environment: z.enum(environments).optional(),
  budget: z.number().int().positive(),
  start: z.string(),
  end: z.string(),
  frameIds: z.array(z.string()),
  stage: z.enum(stages),
  channel: z.enum(['Direct', 'Self-serve', 'Programmatic']),
  buyer: z.enum(['planner', 'brand']).default('planner'),
  dealStatus: z.enum(['Offered', 'Accepted']).optional(),
  option: z.enum(['Balanced', 'Reach', 'Efficient']),
  version: z.number().int(),
  approved: z.boolean(),
  offers: z.array(offerSchema),
  signedBuyer: z.boolean(),
  signedSeller: z.boolean(),
  signedOwners: z.array(z.string()),
  creative: z.enum(['Missing', 'In review', 'Approved', 'Rejected']),
  creativeNote: z.string(),
  assetId: z.string().optional(),
  progress: z.number(),
  discrepancy: z.boolean(),
  resolved: z.boolean(),
  invoiceIssued: z.boolean(),
  proofs: z.array(proofSchema),
  events: z.array(eventSchema),
  theme: z.number(),
  holdUntil: z.string().optional(),
});
export type Campaign = z.infer<typeof campaignSchema>;
export interface Brief {
  name: string;
  client: string;
  market: MarketKey;
  objective: Campaign['objective'];
  environment?: Frame['environment'];
  budget: number;
  start: string;
  end: string;
  option?: Campaign['option'];
}
export const workspaceSchema = z.object({
  version: z.literal(1),
  fixtureVersion: z.number().int().default(1),
  campaigns: z.array(campaignSchema),
  persona: z.enum(['planner', 'sales', 'ops', 'trader', 'finance', 'advertiser', 'admin', 'brand', 'crew', 'approver', 'reviewer', 'yield', 'executive', 'auditor', 'developer']),
  market: z.enum(['All', ...marketKeys]),
  owner: z.enum(['Urban Reach Media', 'Vista Outdoor']),
  cart: z.array(z.string()),
  saved: z.array(z.string()),
  blocked: z.array(z.string()),
  agentEnabled: z.boolean(),
  agentLevel: z.enum(['A0', 'A1', 'A2']),
  segments: z.array(z.object({ id: z.string(), name: z.string(), market: z.enum(marketKeys), environment: z.enum(environments) })),
  studies: z.array(z.object({ id: z.string(), campaignId: z.string(), name: z.string() })),
  config: z.object({ approvalLimit: z.number().int().nonnegative(), underdelivery: z.number().nonnegative(), reconciliation: z.number().nonnegative() }),
});
export type Workspace = z.infer<typeof workspaceSchema>;
export type Action =
  | { type: 'option'; option: Campaign['option'] }
  | { type: 'frames'; frameIds: string[] }
  | { type: 'submit' }
  | { type: 'approve' }
  | { type: 'rfp' }
  | { type: 'refresh' }
  | { type: 'offer'; owner: string; counter: boolean }
  | { type: 'accept' }
  | { type: 'accept-offer'; owner: string }
  | { type: 'counter'; owner: string; discount: number }
  | { type: 'respond'; owner: string; decision: 'accept' | 'split' | 'decline' }
  | { type: 'swap'; owner: string; frameId: string }
  | { type: 'extend-request'; owner: string }
  | { type: 'extend'; owner: string }
  | { type: 'accept-deal' }
  | { type: 'sign'; side: 'buyer' | 'seller'; owner?: string }
  | { type: 'creative'; assetId?: string }
  | { type: 'review'; approved: boolean; reason?: string }
  | { type: 'launch' }
  | { type: 'advance' }
  | { type: 'complete' }
  | { type: 'resolve' }
  | { type: 'reconcile' }
  | { type: 'invoice' }
  | { type: 'pay' }
  | { type: 'proof'; frameId: string; distance: number; at: string; assetId?: string };
