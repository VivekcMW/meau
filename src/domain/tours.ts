import { z } from 'zod';
import { appsForPersona, architectureAppIds, architectureApps, personaGoals } from './architecture';
import type { ArchitectureAppId } from './architecture';
import { getPersona, moduleNames, personas } from './config';
import type { ModuleId, PersonaId } from './model';

export const onboardingKey = 'allunite-one.onboarding.v1';
const personaId = z.enum(personas.map(persona => persona.id));
export const tourSelectionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('persona'), id: personaId }),
  z.object({ kind: z.literal('app'), id: z.enum(architectureAppIds), persona: personaId }),
]);
export type TourSelection = z.infer<typeof tourSelectionSchema>;
export interface TourStep { module: ModuleId; target: string; title: string; description: string; takeaway: string }
type AppStop = Omit<TourStep, 'module'>;

export const welcomeGroups: { name: string; people: PersonaId[] }[] = [
  { name: 'Brands & agencies', people: ['planner', 'brand', 'advertiser', 'trader', 'approver'] },
  { name: 'Media owners', people: ['sales', 'yield', 'executive'] },
  { name: 'Campaign operations', people: ['ops', 'crew', 'reviewer'] },
  { name: 'Finance & platform', people: ['finance', 'auditor', 'admin', 'developer'] },
];

const appStops: Record<ArchitectureAppId, readonly AppStop[]> = {
  planner: [
    { target: '.planner-hero', title: 'Start with an audience and a goal', description: 'Describe who you want to reach and where. The brief prepares three fixture-based options; nothing is booked or sent to an owner.', takeaway: 'A plan starts as a draft, not a commitment.' },
    { target: '.brief-inline-settings', title: 'Check the commercial details', description: 'Review the city, budget and flight dates. Fine-tune opens the campaign name and dates before you compare estimated media cost and forecast audience.', takeaway: 'Confirm the market and dates before choosing a plan.' },
    { target: '.plan-options-section, .draft-grid', title: 'Compare, then keep the plan connected', description: 'Find my audience reveals three options with actual locations. Choosing one creates a draft campaign. Existing drafts below reopen the same booking and approval workflow.', takeaway: 'Your next move: write a brief or reopen a draft.' },
  ],
  campaigns: [
    { target: '.page-heading', title: 'One record for the whole campaign', description: 'Campaigns carries the plan, owner offers, creative, delivery and financial evidence together. Open a campaign to see its current stage and responsible person.', takeaway: 'You do not need a separate record for every team.' },
    { target: '.table-toolbar', title: 'Find the work that needs attention', description: 'Use the status filters and search to find a campaign. Table and card views show the same records, scoped to your demo role and selected market.', takeaway: 'Start with a status or a campaign name.' },
    { target: '.table-scroll, .campaign-card-grid, .empty-state', title: 'Follow the next responsible person', description: 'Inside a campaign, the next-step banner explains the action and its owner. Role changes are explicit; reviewing this tour never approves, signs or launches anything.', takeaway: 'Open a campaign and read its next step before acting.' },
  ],
  inventory: [
    { target: '.inventory-toolbar', title: 'Find a real place in the demo catalog', description: 'Choose a city, format and environment. Search by location name or frame ID. Digital and static inventory share one catalog, with separate availability rules.', takeaway: 'Narrow the city first, then the type of place.' },
    { target: '.inventory-layout, .empty-state', title: 'Read the location before selecting it', description: 'Each location shows a weekly audience estimate, media rate and availability for the demo dates. Open it for format, owner and method details.', takeaway: 'Audience labels explain whether data is measured, fused or modelled.' },
    { target: '.page-heading', title: 'Keep useful locations close', description: 'Save locations for later or start a plan from an available place. Saving is only a shortlist; it does not reserve stock or confirm a booking.', takeaway: 'Your next move: open a location and inspect its details.' },
  ],
  marketplace: [
    { target: '.marketplace-instructions', title: 'Book without building a complex plan', description: 'Marketplace is the self-serve path for a business owner. Choose local locations, review the cart and confirm a clearly labelled demo booking.', takeaway: 'No real payment is collected.' },
    { target: '.inventory-toolbar', title: 'Choose locations that fit your business', description: 'Filter by city, digital or static format and environment. Available locations can be added to your booking; one checkout uses one market and currency.', takeaway: 'Review availability and the weekly rate before adding a location.' },
    { target: '.inventory-layout, .empty-state', title: 'Review the booking before confirming', description: 'Your booking in the header opens dates, costs and the simulated payment choice. After confirmation, creative review and delivery continue in the campaign record.', takeaway: 'Your next move: inspect an available location.' },
  ],
  creative: [
    { target: '.creative-banner', title: 'Keep assets attached to the campaign', description: 'Creative studio brings campaign artwork and its approval status together. An asset remains connected to the booking and placements it supports.', takeaway: 'An uploaded file is not automatically approved.' },
    { target: '.table-toolbar', title: 'Separate review work from approved assets', description: 'Use Needs review to find pending assets, or search for a campaign. Review actions belong to the creative reviewer or platform admin.', takeaway: 'Visibility and approval authority are different.' },
    { target: '.creative-grid, .empty-state', title: 'Review before the campaign goes live', description: 'Open creative to inspect the campaign asset. A reviewer can approve it or request changes. Image uploads stay in this browser; compliance is still a human decision.', takeaway: 'Your next move: open an asset to review its status.' },
  ],
  schedule: [
    { target: '.stat-grid', title: 'See what is ready and what is live', description: 'Ad server separates launch-ready campaigns from those already running. All delivery in this prototype is simulated, not connected to a player or CMS.', takeaway: 'Approved creative and available inventory are launch checks.' },
    { target: '.table-toolbar', title: 'Move between schedule and readiness', description: 'Schedule shows illustrative placement timing. Launch queue shows campaign readiness; Player health shows demo player records. These views share the same campaigns.', takeaway: 'Use Launch queue to inspect the next operational action.' },
    { target: '.panel', title: 'Keep digital delivery and field work connected', description: 'Open a scheduled campaign to inspect its next step. Static locations become posting jobs in Field operations; their proof later appears in the shared report.', takeaway: 'Your next move: review a campaign, not a disconnected schedule entry.' },
  ],
  field: [
    { target: '.field-layout, .page-heading', title: 'Start from a booked static face', description: 'Field jobs come from booked static locations. Choose a job to see the campaign, location and proof requirements before marking it posted.', takeaway: 'A job belongs to a particular campaign and location.' },
    { target: '.field-summary, .page-heading', title: 'Know which jobs still need proof', description: 'To post shows unfinished jobs; Verified shows accepted demo proofs. Owner context matters, so your crew sees work for its current media owner.', takeaway: 'Posting and accepted evidence are separate milestones.' },
    { target: '.field-layout, .empty-state, .page-heading', title: 'Submit evidence, not just a status', description: 'Demo proof checks distance within 50 metres and a timestamp inside the booking window. Accepted proof appears in the campaign report; no live GPS is collected.', takeaway: 'Your next move: open a posting job and read its requirements.' },
  ],
  finance: [
    { target: '.stat-grid', title: 'Start with delivery-backed amounts', description: 'Finance uses the campaign delivery records for matching and billing. Currency totals are shown separately; simulated tax and invoices are not legal documents.', takeaway: 'Delivered evidence drives billable media.' },
    { target: '.tabs', title: 'Separate invoices from exceptions', description: 'Review invoice status, then use Exceptions to investigate missing proof or conflicting records. Matching compares buyer, SSP, owner and Measure values.', takeaway: 'Resolve a discrepancy before reconciling its campaign.' },
    { target: '.finance-nudge, .panel, .page-heading', title: 'Understand the resolution before applying it', description: 'An exception opens the supporting delivery lines. Suggested resolutions align the records and account for undelivered media; invoicing and settlement remain explicit actions.', takeaway: 'Your next move: inspect an exception without applying changes.' },
  ],
  ssp: [
    { target: '.page-heading', title: 'Offer supply from the seller side', description: 'Supply & yield prepares programmatic guaranteed offers from available locations. The trader receives the connected deal rather than a separate proposal copy.', takeaway: 'The offer starts with inventory and shared pricing.' },
    { target: '.tabs', title: 'Inspect deals, pacing and supply', description: 'Switch views to review deal status, illustrative pacing and the supply path. Accepted deals share their campaign delivery records with the buying desk.', takeaway: 'Buyer and seller should follow the same deal status.' },
    { target: '.trading-grid, .panel, .page-heading', title: 'Keep the human in the commercial loop', description: 'Create guaranteed deal opens terms for review. Offering it is an explicit action; this tour does not create supply, reserve inventory or send an offer.', takeaway: 'Your next move: inspect a deal before preparing an offer.' },
  ],
  dsp: [
    { target: '.page-heading', title: 'Review the buyer side of a deal', description: 'Trading desk receives guaranteed offers from Supply & yield. Review the terms before acceptance, then follow creative and delivery in the connected campaign.', takeaway: 'Accepting a deal is a deliberate commercial action.' },
    { target: '.tabs', title: 'Use one view of delivery', description: 'Deal inbox, pacing and supply-path views explain the same buying journey. These programmatic examples are local fixtures, not a live exchange or bidding engine.', takeaway: 'Pacing is illustrative; the campaign record carries the evidence.' },
    { target: '.trading-grid, .panel, .page-heading', title: 'Check terms before accepting', description: 'Open a deal or campaign to review inventory, price and the next responsible role. Accepting does not bypass creative review or launch readiness.', takeaway: 'Your next move: open an offer and read its terms.' },
  ],
  reports: [
    { target: '.report-context, .empty-state', title: 'Choose the campaign behind the numbers', description: 'The campaign selector keeps the report tied to one booking. Planned and delivered audience use the same records as Campaigns and Finance.', takeaway: 'Always check which campaign and market you are viewing.' },
    { target: '.stat-grid, .empty-state', title: 'Compare forecast with delivery', description: 'Read delivered audience against the forecast and elapsed demo flight. Billable media is capped per location, so over-delivery cannot hide another location’s shortfall.', takeaway: 'Forecast, delivery and billable value are different measures.' },
    { target: '.tabs, .empty-state', title: 'Look for the supporting proof', description: 'Delivery shows location-level evidence. Audience shows labelled aggregate examples; Proof gallery shows accepted static posting proofs. Export report downloads local demo results.', takeaway: 'Your next move: choose a campaign and inspect its evidence.' },
  ],
  measure: [
    { target: '.stat-grid', title: 'Understand the shared audience definitions', description: 'Measure explains the audience core used by planning, reporting and finance. The counts here describe synthetic inventory and sensor records.', takeaway: 'These are demo audiences, not a live measurement feed.' },
    { target: '.tabs', title: 'Inspect coverage, methods and health', description: 'Network shows inventory coverage. Sensor health and Audience trends explain illustrative signals and seasonality rather than live device data.', takeaway: 'A method label should travel with every audience number.' },
    { target: '.measure-grid, .panel', title: 'Read the method before using the number', description: 'Measured, fused and modelled labels describe different evidence sources. Our methodology explains the distinctions; no personal or device-level records are exposed.', takeaway: 'Your next move: open the methodology explanation.' },
  ],
  data: [
    { target: '.audience-source-bar', title: 'Define an audience through context', description: 'Audience studio uses a market and environment to identify relevant demo locations. These are aggregate contexts, not individual people or tracking profiles.', takeaway: 'Start with where the audience spends time.' },
    { target: '.segment-list', title: 'Inspect a saved audience', description: 'Choose a saved audience to see its matching locations and synthetic weekly audience. Build an audience creates another local context for planning.', takeaway: 'Check the city and environment before using a segment.' },
    { target: '.segment-detail', title: 'Carry the context into a plan', description: 'Turn this into a plan carries the selected market and environment into Planner. That selection constrains the plan’s locations; no booking is made automatically.', takeaway: 'Your next move: review a saved audience’s matching places.' },
  ],
  attribution: [
    { target: '.page-heading', title: 'Keep effectiveness separate from delivery', description: 'Attribution previews how a campaign study fits the workflow. Lift, visits and comparison values are synthetic examples, not measured campaign outcomes.', takeaway: 'A delivery report is not an effectiveness study.' },
    { target: '.study-layout, .stat-grid, .empty-state, .page-heading', title: 'Connect a study to its campaign', description: 'Choose a study or prepare a demo study for a campaign with delivery. Review its assumptions and comparison method before interpreting any value.', takeaway: 'Campaign context and study method belong together.' },
    { target: '.panel, .empty-state, .page-heading', title: 'Keep demo results clearly labelled', description: 'Exported studies remain illustrative. Use this workspace to understand the study flow, not to make claims about real uplift or independently measured visits.', takeaway: 'Your next move: inspect a study and its method.' },
  ],
  agents: [
    { target: '.agent-hero', title: 'Keep assistance grounded in the workflow', description: 'Planner, yield, trader and finance assistants preview focused guidance. They use local rules, not an external language model or autonomous execution.', takeaway: 'The human remains responsible for every action.' },
    { target: '.agent-grid', title: 'Choose the assistant for the work', description: 'Select an assistant to understand its role. Workspace settings control whether all assistants are paused; the cards explain their intended workflow.', takeaway: 'A different assistant does not grant a different permission.' },
    { target: '.agent-settings', title: 'Set the right review level', description: 'A0 is off, A1 provides answers and A2 prepares drafts for review. Changing a level is explicit, and the pause control stops the guided assistants.', takeaway: 'Your next move: review the current level before changing it.' },
  ],
  admin: [
    { target: '.tabs', title: 'Configure one shared platform', description: 'Market packs, personas, workflow policies and audit history live together. Configuration changes the workspace without creating another application.', takeaway: 'Demo persona previews are not production authentication.' },
    { target: '.admin-market-grid, .panel', title: 'Inspect the local market details', description: 'A market pack previews currency, timezone, payment and invoice conventions. These starter fixtures are not verified legal or tax configuration.', takeaway: 'Review the pack before switching its market context.' },
    { target: '.page-heading', title: 'Publish changes deliberately', description: 'Workflow policies affect approval limits, matching tolerance and under-delivery checks. Reset demo requires confirmation; no policy or data is changed by this tour.', takeaway: 'Your next move: inspect a policy or the audit trail.' },
  ],
  developer: [
    { target: '.developer-banner, .page-heading', title: 'Understand the integration boundary', description: 'Developer portal previews how other systems could connect. The application has no backend, live API, webhook delivery or production credentials.', takeaway: 'Example contracts are not working endpoints.' },
    { target: '.integration-grid, .panel', title: 'Inspect a contract before building', description: 'The integration catalog explains intended connections and example data shapes. Use it to understand the boundary between the platform and external systems.', takeaway: 'All examples stay inside this browser.' },
    { target: '.page-heading', title: 'Read the events behind the workflow', description: 'Inspect local event payloads and fixture checks to understand shared objects. This tour does not send requests, provision credentials or activate an integration.', takeaway: 'Your next move: open an example contract or event.' },
  ],
};

const personaApps: Record<PersonaId, readonly ArchitectureAppId[]> = {
  planner: ['planner', 'campaigns', 'reports'], brand: ['data', 'reports', 'attribution'],
  advertiser: ['marketplace', 'creative', 'reports'], trader: ['dsp', 'campaigns', 'reports'],
  approver: ['campaigns', 'reports'], sales: ['inventory', 'campaigns', 'reports'],
  yield: ['inventory', 'ssp', 'reports'], executive: ['measure', 'reports'],
  ops: ['schedule', 'field', 'creative'], crew: ['field', 'campaigns'],
  reviewer: ['creative', 'campaigns'], finance: ['finance', 'reports'],
  auditor: ['measure', 'reports'], admin: ['admin', 'agents', 'developer'],
  developer: ['developer', 'measure'],
};

export function tourPersona(selection: TourSelection): PersonaId {
  return selection.kind === 'persona' ? selection.id : selection.persona;
}
export function appTourPersona(id: ArchitectureAppId, current: PersonaId) {
  if (appsForPersona(current).some(app => app.id === id)) return current;
  return architectureApps.find(app => app.id === id)!.primary[0];
}
export function tourSteps(selection: TourSelection): TourStep[] {
  if (selection.kind === 'app') return appStops[selection.id].map(stop => ({ ...stop, module: selection.id }));
  const person = getPersona(selection.id);
  return [
    { module: 'home', target: '.overview-tasks', title: `Your work as ${person.role.toLowerCase()}`, description: `${personaGoals[person.id]} Overview brings work assigned to this role together with recent campaign activity. The market filter and owner context determine what appears.`, takeaway: 'Start with work assigned to you, not every action in the platform.' },
    ...personaApps[person.id].map(id => ({ ...appStops[id][0], module: id })),
    { module: 'tasks', target: '.panel', title: 'Know who acts next', description: 'For me lists actions for your current role, media owner and market. All handoffs shows the other people involved. An empty list means no task is assigned to this context, not that every campaign is complete.', takeaway: 'Open a campaign to review its next step before taking action.' },
  ];
}
export function tourTitle(selection: TourSelection) {
  return selection.kind === 'persona' ? getPersona(selection.id).role : moduleNames[selection.id];
}
export const tourPath = (step: TourStep) => step.module === 'home' ? '/' : `/${step.module}`;

export const onboardingSchema = z.object({
  status: z.enum(['new', 'skipped', 'active', 'paused', 'completed']),
  selection: tourSelectionSchema.nullable(),
  step: z.number().int().min(0),
}).superRefine((value, context) => {
  if (['active', 'paused', 'completed'].includes(value.status) && !value.selection) context.addIssue({ code: 'custom', message: 'A selected tour is required.' });
  const selection = value.selection;
  if (selection?.kind === 'app' && !appsForPersona(selection.persona).some(app => app.id === selection.id)) context.addIssue({ code: 'custom', message: 'This role cannot open the selected app.' });
  if (value.selection && value.step >= tourSteps(value.selection).length) context.addIssue({ code: 'custom', message: 'Tour progress is outside the available steps.' });
});
export type OnboardingProgress = z.infer<typeof onboardingSchema>;
export const newOnboarding: OnboardingProgress = { status: 'new', selection: null, step: 0 };
