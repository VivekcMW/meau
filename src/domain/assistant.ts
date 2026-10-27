import { compact, getPersona, markets } from './config';
import { canSeeCampaign, metrics, nextStep, workspaceTasks } from './engine';
import type { Campaign, MarketKey, Workspace } from './model';

type Topic = 'tasks' | 'planning' | 'delivery' | 'deals';
type Goal = Campaign['objective'];
export interface AssistantContext {
  topic?: Topic;
  campaignId?: string;
  goal?: Goal;
  market?: MarketKey;
}
export type AssistantRequest =
  | { type: 'topic'; topic: Topic }
  | { type: 'campaign'; id: string }
  | { type: 'goal'; goal: Goal }
  | { type: 'explain' }
  | { type: 'example' }
  | { type: 'message'; text: string };
export interface AssistantChoice { label: string; request: AssistantRequest }
export interface AssistantReply {
  title: string;
  text: string;
  context: AssistantContext;
  choices: AssistantChoice[];
  facts?: { label: string; value: string }[];
  link?: { to: string; label: string; state?: { prompt: string } };
}
export const assistantStarters: AssistantChoice[] = [
  { label: 'What needs me today?', request: { type: 'topic', topic: 'tasks' } },
  { label: 'Help me plan a campaign', request: { type: 'topic', topic: 'planning' } },
  { label: 'How is delivery looking?', request: { type: 'topic', topic: 'delivery' } },
  { label: 'Explain Direct deals', request: { type: 'topic', topic: 'deals' } },
];
const goals: Goal[] = ['Awareness', 'Store visits', 'Product launch'];
const goalChoices: AssistantChoice[] = goals.map(goal => ({
  label: goal === 'Awareness' ? 'Build awareness' : goal === 'Store visits' ? 'Drive store visits' : 'Launch a product',
  request: { type: 'goal', goal },
}));
const followUps: AssistantChoice[] = [
  { label: 'Explain why', request: { type: 'explain' } },
  { label: 'Show an example', request: { type: 'example' } },
];
const visibleCampaigns = (w: Workspace) => w.campaigns.filter(c => canSeeCampaign(w, c) && (w.market === 'All' || c.market === w.market));
const reviewChoice = (c: Campaign): AssistantChoice => ({ label: `Review ${c.name}`, request: { type: 'campaign', id: c.id } });

export function assistantCampaign(w: Workspace, pathname: string, search: string) {
  const id = pathname.startsWith('/campaigns/') ? pathname.split('/')[2] : pathname === '/deals' ? new URLSearchParams(search).get('deal') : null;
  return visibleCampaigns(w).find(c => c.id === id);
}

export function assistantReply(w: Workspace, request: AssistantRequest, context: AssistantContext = {}): AssistantReply {
  const persona = getPersona(w.persona);
  const campaigns = visibleCampaigns(w);
  const canOpenCampaigns = persona.nav.includes('campaigns');
  if (!w.agentEnabled || w.agentLevel === 'A0') return {
    title: 'The assistant is paused',
    text: 'Enable answers or drafts in Agent hub to continue. Your campaigns have not changed.',
    context: {}, choices: [], link: { to: '/agents', label: 'Open Agent settings' },
  };
  if (request.type === 'message') {
    const text = request.text.trim().toLowerCase();
    const named = campaigns.find(c => text.includes(c.id.toLowerCase()) || text.includes(c.name.toLowerCase()));
    const market = Object.values(markets).find(m => text.includes(m.city.toLowerCase()) || text.includes(m.country.toLowerCase()));
    const nextContext = { ...context, ...(market ? { market: market.key } : {}), ...(named ? { campaignId: named.id } : {}) };
    let parsed: AssistantRequest | undefined;
    if (/\b(delivery|delivered|impressions?|performance|reports?|evidence)\b/.test(text)) parsed = { type: 'topic', topic: 'delivery' };
    else if (named) parsed = { type: 'campaign', id: named.id };
    else if (/\b(direct|negotiate|negotiation|rfp|holds?|proposal|counter|ios?)\b/.test(text)) parsed = { type: 'topic', topic: 'deals' };
    else if (/\b(store|visits?|footfall)\b/.test(text)) parsed = { type: 'goal', goal: 'Store visits' };
    else if (/\b(launch|product)\b/.test(text)) parsed = { type: 'goal', goal: 'Product launch' };
    else if (/\b(awareness|reach|visibility)\b/.test(text)) parsed = { type: 'goal', goal: 'Awareness' };
    else if (/\b(plan|planning|brief)\b/.test(text) || /\b(start|create|new)\b.*\bcampaign\b/.test(text)) parsed = { type: 'topic', topic: 'planning' };
    else if (/\b(why|explain|unsure)\b|not sure|don.t understand|^no\b/.test(text)) parsed = { type: 'explain' };
    else if (/\b(example|show me)\b/.test(text)) parsed = { type: 'example' };
    else if (/^(yes|okay|ok|ready|continue|next)[.!? ]*$/.test(text) && context.topic) parsed = context.campaignId
      ? { type: 'campaign', id: context.campaignId }
      : { type: 'topic', topic: context.topic };
    else if (/\b(tasks?|today|next|approval|attention)\b|needs? me/.test(text)) parsed = { type: 'topic', topic: 'tasks' };
    else if (market && context.topic === 'planning') parsed = { type: 'topic', topic: 'planning' };
    if (parsed) return assistantReply(w, parsed, nextContext);
    return {
      title: 'Let’s narrow that down',
      text: 'I’m a local workflow guide, not a live AI chat. Choose a starting point, name a visible campaign, or tell me whether your goal is awareness, store visits or a product launch.',
      context, choices: assistantStarters,
    };
  }
  const topic = request.type === 'topic' ? request.topic : request.type === 'goal' ? 'planning' : request.type === 'campaign' ? 'tasks' : context.topic;
  const state: AssistantContext = { ...context, topic };
  if (request.type === 'campaign') state.campaignId = request.id;
  if (request.type === 'goal') state.goal = request.goal;
  const campaign = state.campaignId ? campaigns.find(c => c.id === state.campaignId) : undefined;
  if (state.campaignId && !campaign) return {
    title: 'That campaign is outside this view',
    text: 'It may have been removed or excluded by your role or market filter. Choose an available campaign from your current tasks.',
    context: {}, choices: [assistantStarters[0]],
  };
  const explaining = request.type === 'explain';
  const example = request.type === 'example';

  if (topic === 'planning') {
    const destination = w.persona === 'advertiser' ? '/marketplace' : w.persona === 'brand' ? '/deals' : w.persona === 'trader' ? '/dsp' : persona.nav.includes('planner') ? '/planner' : undefined;
    if (!destination) return {
      title: 'Stay in your workspace',
      text: `As ${persona.role}, your next step is reviewing assigned work rather than creating a buyer plan. The buying team handles the brief; I won’t switch your role in the background.`,
      context: { topic }, choices: [assistantStarters[0]], link: { to: '/tasks', label: 'Open my tasks' },
    };
    if (destination === '/dsp') return {
      title: 'Start with the offered deal',
      text: 'As the agency trader, review a guaranteed deal in Trading desk before accepting it. Audience, price and inventory are already connected to that offer.',
      context: { topic }, choices: [assistantStarters[0]], link: { to: destination, label: 'Open Trading desk' },
    };
    const market = state.market ?? (w.market === 'All' ? 'DK' : w.market);
    state.market = market;
    if (!state.goal) return {
      title: explaining ? 'A goal is enough to get started' : `What should this campaign achieve, ${persona.name}?`,
      text: example ? 'For a neighbourhood opening, choose store visits. For a new collection, choose a product launch. For broader visibility, choose awareness.'
        : explaining ? 'Your goal gives the brief a direction. You can compare the locations, audience and cost before creating or booking anything.'
          : `Let’s start in ${markets[market].city}. Choose a goal, or type another city and what you want to achieve. No long form needed.`,
      context: state, choices: [...goalChoices, ...(!explaining && !example ? [followUps[1]] : [])],
    };
    const prompt = state.goal === 'Store visits' ? `Drive store visits in ${markets[market].city} for our neighbourhood campaign.`
      : state.goal === 'Product launch' ? `Launch a new product in ${markets[market].city}.`
        : `Build awareness and reach urban explorers in ${markets[market].city}.`;
    const drafts = w.agentLevel === 'A2';
    const label = destination === '/planner' ? drafts ? 'Review brief in Planner' : 'Open Planner'
      : destination === '/marketplace' ? 'Explore Marketplace' : 'Open Direct deals';
    return {
      title: explaining ? 'Why this starting point fits' : example ? 'Here’s the brief in plain language' : `${state.goal} in ${markets[market].city}`,
      text: explaining ? `You chose ${state.goal.toLowerCase()}. ${destination === '/planner' ? 'Planner compares cost, location quality and forecast audience so you can choose the trade-off.' : destination === '/deals' ? 'Direct deals lets your brand agree inventory and rates with each owner.' : 'Marketplace lets you choose available locations for your own business.'} Nothing is booked by this conversation.`
        : `${prompt} ${destination === '/planner' ? drafts ? 'I can carry this brief into Planner for you to review. Budget and dates remain yours to check.' : 'You’re in answers-only mode. Open Planner and use this direction to write your brief.' : 'Use this goal when you start in the buying workspace. Locations and terms are reviewed there.'}`,
      context: state,
      facts: [{ label: 'Your goal', value: state.goal }, { label: 'Starting market', value: markets[market].city }],
      choices: [...goalChoices.filter(choice => choice.request.type === 'goal' && choice.request.goal !== state.goal), followUps[0]],
      link: { to: destination, label, ...(destination === '/planner' && drafts ? { state: { prompt } } : {}) },
    };
  }
  if (topic === 'tasks') {
    if (campaign) {
      const step = nextStep(campaign, w.config);
      const person = getPersona(step.role);
      const mine = step.role === w.persona && (!step.owner || step.owner === w.owner);
      const complete = campaign.stage === 'Paid';
      const deals = persona.nav.includes('deals') && campaign.channel === 'Direct' && ['Awaiting offers', 'Ready to sign'].includes(campaign.stage);
      return {
        title: explaining ? 'Why this handoff comes next' : campaign.name,
        text: complete ? 'This campaign is planned, delivered, proven and settled. You can still review its evidence and activity.'
          : `${mine ? 'Your next step' : `Next up: ${person.name}, ${person.role}${step.owner ? ` at ${step.owner}` : ''}`} — ${step.label}. ${step.hint} ${explaining ? 'The stage, role and owner are read from the same workflow used by My tasks. Review the record before taking action.' : 'Open the record to review; I haven’t taken the action for you.'}`,
        context: state,
        facts: [{ label: 'Campaign stage', value: campaign.stage }, { label: complete ? 'Outcome' : 'Next responsible person', value: complete ? 'Settled' : mine ? 'You' : person.name }],
        choices: [followUps[0], assistantStarters[2]],
        link: canOpenCampaigns ? { to: deals ? `/deals?deal=${campaign.id}` : `/campaigns/${campaign.id}`, label: deals ? 'Review in Direct deals' : 'Review campaign' } : undefined,
      };
    }
    const tasks = workspaceTasks(w);
    const handoffs = workspaceTasks(w, true);
    const examples = tasks.length ? tasks : handoffs;
    if (example && canOpenCampaigns && examples[0]) return assistantReply(w, { type: 'campaign', id: examples[0].id }, state);
    return {
      title: tasks.length ? `${tasks.length} ${tasks.length === 1 ? 'step needs' : 'steps need'} your attention` : 'You’re caught up in this view',
      text: explaining ? `My tasks uses your ${persona.role.toLowerCase()} role, selected media owner and market filter. Work assigned to someone else stays in All handoffs, rather than appearing as yours.`
        : tasks.length ? 'Choose a campaign below and I’ll explain the next step and who is responsible.'
          : `${handoffs.length} ${handoffs.length === 1 ? 'handoff is' : 'handoffs are'} still open for other people. An empty task list does not mean every campaign is complete.`,
      context: { topic }, choices: [...(canOpenCampaigns ? examples.slice(0, 3).map(reviewChoice) : []), followUps[0]],
      link: { to: '/tasks', label: 'Open my tasks' },
    };
  }
  if (topic === 'delivery') {
    const selected = campaign ? [campaign] : campaigns;
    const delivered = selected.reduce((sum, c) => sum + metrics(c).delivered, 0);
    const active = selected.filter(c => c.progress > 0).length;
    const evidence = selected.find(c => c.progress > 0);
    const evidenceCampaign = campaign || (example ? evidence : undefined);
    return {
      title: example && evidence ? `Delivery example: ${evidence.name}` : campaign ? `${campaign.name} · delivery` : 'Delivery in your current view',
      text: explaining ? 'Verified impressions use the shared delivery records. Static faces contribute zero until posting proof passes its checks. The trend chart is illustrative; the totals and per-location evidence come from the campaign.'
        : example && evidence ? `${evidence.name} has ${compact(metrics(evidence).delivered)} verified demo impressions at ${evidence.progress}% of its simulated flight. Review the location-level evidence to see what supports that total.`
          : `${compact(delivered)} verified demo impressions across ${active} ${active === 1 ? 'campaign' : 'campaigns'} with delivery. ${w.market === 'All' ? 'This covers all markets visible to your role.' : `This is filtered to ${markets[w.market].country}.`} These are full-flight records, not a live feed.`,
      context: state,
      facts: [{ label: 'Verified demo impressions', value: compact(delivered) }, { label: 'Campaigns with delivery', value: String(active) }],
      choices: followUps,
      link: canOpenCampaigns && evidenceCampaign ? { to: `/campaigns/${evidenceCampaign.id}?tab=proof`, label: 'Review delivery evidence' }
        : persona.nav.includes('reports') ? { to: '/reports', label: 'Open Reports & proof' } : undefined,
    };
  }
  if (topic === 'deals') {
    const direct = campaign?.channel === 'Direct' ? campaign : campaigns.find(c => c.channel === 'Direct' && c.stage === 'Awaiting offers');
    const access = persona.nav.includes('deals');
    const readOnly = w.persona === 'approver';
    return {
      title: example && direct ? `Direct deal example: ${direct.name}` : explaining ? 'Why each owner has a separate proposal' : 'Agree the terms, then book',
      text: example && direct ? `${direct.name} is ${direct.stage.toLowerCase()} with ${direct.offers.length} media owners. ${nextStep(direct, w.config).hint}`
        : explaining ? 'Each owner controls its own places, rate and soft hold. A counter or swap affects that owner’s proposal. Once all owners accept, insertion orders are generated and both sides sign.'
          : 'Start with a market, budget and goal. Review owner proposals, counter or swap places, then sign the demo insertion orders. Soft holds and option ranks show where a decision is time-sensitive.',
      context: { ...state, campaignId: direct?.id },
      choices: followUps,
      link: access ? { to: direct ? `/deals?deal=${direct.id}` : '/deals', label: readOnly ? 'View Direct deals · read-only' : 'Open Direct deals' }
        : { to: '/architecture?app=deals', label: 'See who uses Direct deals' },
    };
  }
  return {
    title: 'A little guidance, one step at a time',
    text: 'Choose a topic and I’ll tailor the next choices to your answer. I can explain a handoff, help shape a brief or show the evidence behind delivery.',
    context: {}, choices: assistantStarters,
  };
}
