import { getPersona, personas } from './config';
import type { ModuleId, PersonaId } from './model';

export const architectureAppIds = ['measure', 'inventory', 'planner', 'deals', 'campaigns', 'reports', 'admin', 'agents', 'ssp', 'schedule', 'field', 'marketplace', 'creative', 'finance', 'developer', 'dsp', 'attribution', 'data'] as const satisfies readonly ModuleId[];
export type ArchitectureAppId = (typeof architectureAppIds)[number];
export type AppGroupId = 'demand' | 'supply' | 'operations' | 'insights' | 'platform' | 'core';
export interface AppFeature { label: string; personas?: readonly PersonaId[] }
export interface ArchitectureApp {
  id: ArchitectureAppId;
  code: string;
  group: AppGroupId;
  purpose: string;
  primary: readonly PersonaId[];
  features: readonly AppFeature[];
}
export const appGroups: { id: AppGroupId; name: string; description: string }[] = [
  { id: 'demand', name: 'Plan & buy', description: 'Turn an idea into a booking' },
  { id: 'supply', name: 'Supply & deliver', description: 'Connect places to delivery' },
  { id: 'operations', name: 'Review & settle', description: 'Keep every commitment clear' },
  { id: 'insights', name: 'Understand & improve', description: 'Make the impact visible' },
  { id: 'platform', name: 'Configure & connect', description: 'The guardrails behind the work' },
  { id: 'core', name: 'Shared audience core', description: 'The same numbers, everywhere' },
];
export const architectureApps: ArchitectureApp[] = [
  { id: 'planner', code: 'PLN', group: 'demand', purpose: 'A brief becomes a priced, audience-led plan.', primary: ['planner'], features: [
    { label: 'Assisted brief and three plan alternatives' }, { label: 'Market, budget and audience-context selection' }, { label: 'Curated places, forecast and shared pricing' },
  ] },
  { id: 'deals', code: 'DIR', group: 'demand', purpose: 'Buy directly from media owners: agreed rates, holds, counter-offers and signed booking contracts in one place.', primary: ['planner', 'brand', 'sales'], features: [
    { label: 'Three-tap brief with places and agreement rates applied' },
    { label: 'Soft-hold countdowns, option ranking and negotiation history' },
    { label: 'Compare owners, counter, swap places and accept', personas: ['planner', 'brand'] },
    { label: 'Answer proposal requests, meet counters, extend holds and sign booking contracts', personas: ['sales'] },
  ] },
  { id: 'campaigns', code: 'PRO', group: 'demand', purpose: 'One campaign record connects proposals, orders and handoffs.', primary: ['planner', 'sales', 'approver'], features: [
    { label: 'Shared campaign timeline and next best action' },
    { label: 'Owner-specific proposal requests and buyer contract signatures', personas: ['planner'] },
    { label: 'Accept or counter offers; sign owner booking contracts', personas: ['sales'] },
    { label: 'Budget approval above the configured threshold', personas: ['approver'] },
    { label: 'Creative, posting and financial handoff visibility' },
  ] },
  { id: 'marketplace', code: 'MKT', group: 'demand', purpose: 'Discover inventory and book a local campaign without an agency.', primary: ['advertiser'], features: [
    { label: 'Map discovery, filters and available locations' }, { label: 'Saved cart and checkout for one market at a time' },
    { label: 'Simulated local payment and booking', personas: ['advertiser'] },
  ] },
  { id: 'dsp', code: 'DSP', group: 'demand', purpose: 'The buying side of a programmatic guaranteed deal.', primary: ['trader'], features: [
    { label: 'Guaranteed deal inbox and acceptance', personas: ['trader'] }, { label: 'Shared delivery and campaign pacing' }, { label: 'Clear, illustrative supply route' },
  ] },
  { id: 'inventory', code: 'IMS', group: 'supply', purpose: 'A single catalog of digital and static places.', primary: ['ops', 'sales', 'yield'], features: [
    { label: 'Map and list discovery with saved locations' }, { label: 'Audience method, price and availability per frame' },
    { label: 'Blackout control for owner inventory', personas: ['ops', 'yield'] },
  ] },
  { id: 'ssp', code: 'SSP', group: 'supply', purpose: 'The selling side of a measured-audience deal.', primary: ['yield'], features: [
    { label: 'Create and offer a guaranteed deal', personas: ['yield'] }, { label: 'Audience and price-book-based deal terms' }, { label: 'Connected deal status and delivery' },
  ] },
  { id: 'schedule', code: 'ADS', group: 'supply', purpose: 'Move approved campaigns into simulated playout.', primary: ['ops'], features: [
    { label: 'Schedule, launch queue and player-health views' }, { label: 'Approved-creative and blackout launch checks' }, { label: 'Simulated flight advancement and delivery' },
  ] },
  { id: 'field', code: 'FOP', group: 'supply', purpose: 'Static bookings become mobile posting jobs.', primary: ['crew', 'ops'], features: [
    { label: 'Jobs created from booked static faces' }, { label: 'Demo proof with distance and booking-window checks' }, { label: 'Proof appears in the connected campaign report' },
  ] },
  { id: 'creative', code: 'CRE', group: 'operations', purpose: 'Bring assets, feedback and approval into one place.', primary: ['reviewer', 'ops'], features: [
    { label: 'Creative gallery and approval status' }, { label: 'Local image upload and prepared demo creative', personas: ['advertiser'] },
    { label: 'Human approval or rejection with feedback', personas: ['reviewer'] },
  ] },
  { id: 'finance', code: 'BIL', group: 'operations', purpose: 'Settle against delivery evidence, not a second spreadsheet.', primary: ['finance'], features: [
    { label: 'Checks buyer, seller, owner and Measure records against each other' }, { label: 'Exceptions and delivery-based credits' }, { label: 'Demo invoice, ledger, payment and payout views' },
  ] },
  { id: 'reports', code: 'RPT', group: 'insights', purpose: 'See forecast, delivered audience and proof together.', primary: ['brand', 'planner', 'executive', 'auditor'], features: [
    { label: 'Plan-versus-delivery report and CSV export' }, { label: 'Static proof gallery and audience-method labels' }, { label: 'Illustrative audience profiles, clearly labelled' },
  ] },
  { id: 'data', code: 'DAT', group: 'insights', purpose: 'Turn audience context into an inventory selection.', primary: ['planner', 'trader', 'brand'], features: [
    { label: 'Save an audience by market and environment' }, { label: 'Inspect matching places and synthetic weekly audience' }, { label: 'Hand the audience context to Planner' },
  ] },
  { id: 'attribution', code: 'ATT', group: 'insights', purpose: 'Explain how an effectiveness study fits the campaign.', primary: ['brand', 'planner'], features: [
    { label: 'Create an illustrative campaign study' }, { label: 'Synthetic lift and comparison views' }, { label: 'Export labelled demo study results' },
  ] },
  { id: 'admin', code: 'ADM', group: 'platform', purpose: 'Configuration shapes the experience without separate apps.', primary: ['admin'], features: [
    { label: 'Market setup and role template previews' }, { label: 'Publish budget, matching and under-delivery rules' }, { label: 'Shared activity history and a confirmed demo reset' },
  ] },
  { id: 'agents', code: 'AGT', group: 'platform', purpose: 'Guided assistance with the human still in control.', primary: ['planner', 'yield', 'trader', 'finance', 'admin'], features: [
    { label: 'Planner, yield, trader and finance assistant previews' }, { label: 'Assistant levels: off, answers only, or drafts for human review' }, { label: 'Pause control; no outside AI services and no automatic actions' },
  ] },
  { id: 'developer', code: 'DEV', group: 'platform', purpose: 'Show planned connections to outside systems, using sample data.', primary: ['developer'], features: [
    { label: 'List of planned connections and example data formats' }, { label: 'Preview of the data sent between systems' }, { label: 'Practice area with sample data; nothing goes to live systems' },
  ] },
  { id: 'measure', code: 'MEA', group: 'core', purpose: 'The shared audience definitions behind every app.', primary: ['auditor', 'executive'], features: [
    { label: 'Explanations of how Measured, Fused and Modelled estimates are made' }, { label: 'Sample network and sensor views' }, { label: 'One audience core for planning, reporting and billing' },
  ] },
];
export const personaGroups: { name: string; ids: PersonaId[] }[] = [
  { name: 'Buy side', ids: ['planner', 'trader', 'approver', 'advertiser', 'brand'] },
  { name: 'Sell side', ids: ['sales', 'yield', 'ops', 'crew', 'executive'] },
  { name: 'Shared & platform', ids: ['finance', 'reviewer', 'auditor', 'admin', 'developer'] },
];
export const personaGoals: Record<PersonaId, string> = {
  planner: 'Build a defensible plan, book it and follow the impact.',
  trader: 'Accept guaranteed supply and track the same audience as the seller.',
  approver: 'Approve spend with the cost, audience and plan in one place.',
  advertiser: 'Book places near the business and see what was delivered.',
  brand: 'Understand who the campaign reached and how outcomes are illustrated.',
  sales: 'Answer the brief, agree terms and sign for the media owner.',
  yield: 'Connect available supply to guaranteed demand.',
  ops: 'Keep inventory, approved creative and go-live in step.',
  crew: 'See the posting job, capture demo proof and close the loop.',
  executive: 'Connect the network story to audience and campaign performance.',
  finance: 'Resolve the exceptions, invoice verified media and record settlement.',
  reviewer: 'Approve creative or send clear feedback to the buyer.',
  auditor: 'Inspect audience methods and the evidence behind delivery.',
  admin: 'Configure the markets, personas and policies that shape the platform.',
  developer: 'Inspect integration contracts and test the local example data.',
};

export interface WorkflowStep {
  title: string;
  app: ArchitectureAppId;
  personas: PersonaId[];
  output: string;
}
export interface ArchitectureWorkflow {
  id: string;
  code: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}
export const architectureWorkflows: ArchitectureWorkflow[] = [
  { id: 'direct', code: 'J-01', name: 'Brief to paid invoice', description: 'A direct campaign, with every owner and handoff connected.', steps: [
    { title: 'Build the plan', app: 'planner', personas: ['planner'], output: 'Brief, three alternatives, curated frames and forecast.' },
    { title: 'Approve the budget', app: 'campaigns', personas: ['approver'], output: 'Required only above the configured approval limit.' },
    { title: 'Negotiate with owners', app: 'deals', personas: ['planner', 'sales'], output: 'Owner proposal requests at agreed rates, with counter-offers, swaps and 72-hour holds.' },
    { title: 'Sign the booking', app: 'campaigns', personas: ['planner', 'sales'], output: 'The buyer and each media owner sign their demo booking contracts (IOs).' },
    { title: 'Review the creative', app: 'creative', personas: ['reviewer'], output: 'Buyer assets are attached in Campaigns; human review approves or returns feedback.' },
    { title: 'Launch the flight', app: 'schedule', personas: ['ops'], output: 'Approved assets and available inventory enter a simulated schedule.' },
    { title: 'Prove static posting', app: 'field', personas: ['crew'], output: 'Static faces get demo posting proof; digital delivery uses simulated records.' },
    { title: 'Read the results', app: 'reports', personas: ['planner', 'brand'], output: 'Forecast, delivery and proof use the same campaign data.' },
    { title: 'Reconcile and settle', app: 'finance', personas: ['finance'], output: 'Record check, credits, demo invoice and simulated payment.' },
  ] },
  { id: 'self-serve', code: 'J-02', name: 'Self-serve booking', description: 'A business owner starts simply; the platform connects the rest.', steps: [
    { title: 'Find local places', app: 'marketplace', personas: ['advertiser'], output: 'Choose available frames and keep them in a persistent cart.' },
    { title: 'Confirm the booking', app: 'marketplace', personas: ['advertiser'], output: 'Choose dates and a simulated local payment. No money moves.' },
    { title: 'Prepare the creative', app: 'creative', personas: ['advertiser', 'reviewer'], output: 'Use a demo asset or local upload; a reviewer approves it.' },
    { title: 'Go live', app: 'schedule', personas: ['ops'], output: 'Launch from the connected campaign after approval.' },
    { title: 'See the proof', app: 'reports', personas: ['advertiser'], output: 'Read delivery and static posting evidence in one report.' },
    { title: 'Apply the prepayment', app: 'finance', personas: ['finance'], output: 'Reconciliation and a demo invoice apply the simulated prepayment.' },
  ] },
  { id: 'guaranteed', code: 'J-03', name: 'Programmatic guaranteed', description: 'Different buying and selling desks. One delivery truth.', steps: [
    { title: 'Offer the supply', app: 'ssp', personas: ['yield'], output: 'Create a guaranteed deal from available inventory and shared prices.' },
    { title: 'Accept the deal', app: 'dsp', personas: ['trader'], output: 'The trader accepts the offer and attaches creative through Campaigns.' },
    { title: 'Review and launch', app: 'schedule', personas: ['ops'], output: 'Creative approved by a person enters simulated second-priority delivery.' },
    { title: 'Compare the results', app: 'reports', personas: ['trader', 'yield'], output: 'Buyer and seller see the same sample delivered impressions.' },
    { title: 'Settle verified media', app: 'finance', personas: ['finance'], output: 'Evidence-based reconciliation and a demo settlement.' },
  ] },
  { id: 'posting', code: 'J-06', name: 'Static posting & proof', description: 'From a booked face to evidence in the buyer report.', steps: [
    { title: 'Check the place', app: 'inventory', personas: ['ops'], output: 'Frame, availability and blackout controls share one inventory record.' },
    { title: 'Receive the job', app: 'field', personas: ['ops', 'crew'], output: 'Booked static faces automatically appear as posting jobs.' },
    { title: 'Submit demo proof', app: 'field', personas: ['crew'], output: 'Check a simulated distance within 50 m and a timestamp inside the booking window.' },
    { title: 'Close the evidence loop', app: 'reports', personas: ['planner'], output: 'Proof appears in the campaign; a face without proof has no delivered audience.' },
  ] },
  { id: 'settlement', code: 'J-08', name: 'Reconciliation & settlement', description: 'Four records, one piece of evidence and a clear resolution.', steps: [
    { title: 'Inspect delivery', app: 'reports', personas: ['finance'], output: 'Shared delivery lines and static proof enter the ledger.' },
    { title: 'Match four sources', app: 'finance', personas: ['finance'], output: 'Compare the buyer, seller, owner and Measure records within an agreed margin.' },
    { title: 'Resolve exceptions', app: 'finance', personas: ['finance'], output: 'Align records to Measure and credit undelivered media.' },
    { title: 'Issue and settle', app: 'finance', personas: ['finance'], output: 'Demo invoice, simulated payment and an illustrative owner payout view.' },
  ] },
  { id: 'brand-direct', code: 'BRAND', name: 'Brand buys direct', description: 'A brand negotiates with media owners itself, no agency in the middle.', steps: [
    { title: 'Start a direct deal', app: 'deals', personas: ['brand'], output: 'Market, budget and goal. Places, agreement rates and owner RFPs are set up for you.' },
    { title: 'Send a proposal', app: 'deals', personas: ['sales'], output: 'Each owner replies at its agreement rate and can suggest better-value places.' },
    { title: 'Negotiate the terms', app: 'deals', personas: ['brand', 'sales'], output: 'Counter, meet halfway, swap places or extend the soft hold. Every move is logged.' },
    { title: 'Sign insertion orders', app: 'deals', personas: ['brand', 'sales'], output: 'Accepting every owner creates booking contracts (IOs); each side signs its demo copy.' },
    { title: 'Approve the creative', app: 'creative', personas: ['reviewer'], output: 'The brand attaches creative in Campaigns; a human reviewer approves it.' },
    { title: 'Launch the flight', app: 'schedule', personas: ['ops'], output: 'Approved assets and held places enter a simulated schedule.' },
    { title: 'See the results', app: 'reports', personas: ['brand'], output: 'Negotiated cost, delivery and proof in one report.' },
  ] },
  { id: 'outcomes', code: 'INSIGHT', name: 'Audience to outcomes', description: 'Carry the audience context from a plan into the results.', steps: [
    { title: 'Define the audience', app: 'data', personas: ['brand', 'planner', 'trader'], output: 'A market and environment identify the matching places.' },
    { title: 'Create the plan', app: 'planner', personas: ['planner'], output: 'The selected audience context constrains inventory in each plan alternative.' },
    { title: 'Follow the campaign', app: 'reports', personas: ['brand', 'planner'], output: 'Compare planned audience, delivered impressions and proof.' },
    { title: 'Explore effectiveness', app: 'attribution', personas: ['brand'], output: 'Create and export a clearly labelled synthetic lift study.' },
  ] },
  { id: 'platform', code: 'PLATFORM', name: 'Platform & assurance', description: 'The configuration and shared definitions behind every workflow.', steps: [
    { title: 'Set the guardrails', app: 'admin', personas: ['admin'], output: 'Preview personas and market packs; publish local workflow policies.' },
    { title: 'Keep humans in control', app: 'agents', personas: ['admin', 'planner', 'trader', 'yield', 'finance'], output: 'Configure guided assistant levels and the pause control. No external AI.' },
    { title: 'Inspect the contracts', app: 'developer', personas: ['developer'], output: 'Preview sample data formats and planned connections.' },
    { title: 'Explain the numbers', app: 'measure', personas: ['auditor', 'executive'], output: 'Inspect sample network views and how each audience estimate is made.' },
    { title: 'Read the network story', app: 'reports', personas: ['executive', 'auditor'], output: 'Use shared reports to examine campaign evidence and network performance.' },
  ] },
];
export const defaultPersonaWorkflow: Record<PersonaId, string> = {
  planner: 'direct', sales: 'direct', ops: 'posting', trader: 'guaranteed', finance: 'settlement',
  advertiser: 'self-serve', admin: 'platform', brand: 'brand-direct', crew: 'posting', approver: 'direct',
  reviewer: 'direct', yield: 'guaranteed', executive: 'platform', auditor: 'platform', developer: 'platform',
};

export type EcosystemAreaId = 'demand' | 'supply' | 'delivery' | 'intelligence' | 'governance';
export interface EcosystemArea {
  id: EcosystemAreaId;
  name: string;
  action: string;
  purpose: string;
  receives: string;
  shares: string;
  apps: readonly ArchitectureAppId[];
  people: readonly PersonaId[];
  workflow: string;
}
export const ecosystemAreas: readonly EcosystemArea[] = [
  { id: 'demand', name: 'Brands & agencies', action: 'Create demand', purpose: 'Turn a business goal into an audience-led booking.',
    receives: 'Audience context & available places', shares: 'Brief, plan & booking',
    apps: ['planner', 'deals', 'campaigns', 'marketplace', 'dsp'], people: ['brand', 'planner', 'trader', 'advertiser', 'approver'], workflow: 'direct' },
  { id: 'supply', name: 'Media owners & places', action: 'Connect the places', purpose: 'Make digital screens and static locations available to buyers.',
    receives: 'Audience-led demand', shares: 'Availability & owner offers',
    apps: ['inventory', 'ssp'], people: ['sales', 'yield', 'ops', 'executive'], workflow: 'guaranteed' },
  { id: 'delivery', name: 'Creative & operations', action: 'Make it happen', purpose: 'Move a booking into approved creative, delivery and proof.',
    receives: 'Booking & creative assets', shares: 'Delivery & posting proof',
    apps: ['creative', 'schedule', 'field'], people: ['reviewer', 'ops', 'crew'], workflow: 'posting' },
  { id: 'governance', name: 'Finance & governance', action: 'Keep everyone aligned', purpose: 'Apply shared policies and reconcile commitments against evidence.',
    receives: 'Commitments & delivery evidence', shares: 'Policies & reconciliation',
    apps: ['finance', 'admin', 'agents', 'developer'], people: ['finance', 'admin', 'developer'], workflow: 'settlement' },
  { id: 'intelligence', name: 'Measurement & intelligence', action: 'Understand the impact', purpose: 'Connect audience definitions, campaign evidence and results.',
    receives: 'Audience context & delivery evidence', shares: 'Audience insights & results',
    apps: ['measure', 'data', 'reports', 'attribution'], people: ['brand', 'planner', 'auditor', 'executive'], workflow: 'outcomes' },
];
export const ecosystemLoop: readonly { label: string; area: EcosystemAreaId }[] = [
  { label: 'Audience insight', area: 'intelligence' },
  { label: 'Plan & book', area: 'demand' },
  { label: 'Deliver', area: 'delivery' },
  { label: 'Verify results', area: 'intelligence' },
  { label: 'Improve the next plan', area: 'demand' },
];

export function appsForPersona(id: PersonaId) {
  const persona = getPersona(id);
  return architectureApps.filter(app => persona.nav.includes(app.id) || app.id === 'agents');
}
export function personasForApp(id: ArchitectureAppId) {
  return personas.filter(persona => appsForPersona(persona.id).some(app => app.id === id));
}
export function featuresForPersona(app: ArchitectureApp, id?: PersonaId) {
  return app.features.filter(feature => !id || id === 'admin' || !feature.personas || feature.personas.includes(id));
}
