import { describe, expect, it } from 'vitest';
import { assistantCampaign, assistantReply, assistantStarters } from './assistant';
import { compact, personas } from './config';
import { canSeeCampaign, metrics, nextStep, workspaceTasks } from './engine';
import { seedWorkspace } from './fixtures';
import type { Campaign, Workspace } from './model';

const message = (text: string) => ({ type: 'message' as const, text });

describe('response-driven local workflow assistant', () => {
  it('asks a goal, remembers the answer and changes the brief when the city changes', () => {
    const w = seedWorkspace();
    const start = assistantReply(w, { type: 'topic', topic: 'planning' });
    expect(start.choices.filter(c => c.request.type === 'goal')).toHaveLength(3);
    const goal = assistantReply(w, { type: 'goal', goal: 'Store visits' }, start.context);
    expect(goal.link?.state?.prompt).toContain('Drive store visits in Copenhagen');
    const city = assistantReply(w, message('Milan please'), goal.context);
    expect(city.title).toBe('Store visits in Milan');
    const why = assistantReply(w, message('why?'), city.context);
    expect(why.title).toBe('Why this starting point fits');
    expect(why.text).toContain('store visits');
    expect(why.link?.state?.prompt).toContain('Milan');
    expect(assistantReply(w, message('yes'), why.context).link).toEqual(why.link);
    expect(assistantReply(w, { type: 'example' }, why.context).text).toContain('Drive store visits in Milan');
  });

  it('interprets typed goals and offers honest recovery for unsupported requests', () => {
    const w = seedWorkspace();
    const response = assistantReply(w, message('Launch a product in Sydney'));
    expect(response.context).toMatchObject({ topic: 'planning', goal: 'Product launch', market: 'AU' });
    const unknown = assistantReply(w, message('Tell me the weather'));
    expect(unknown.title).toBe('Let’s narrow that down');
    expect(unknown.text).toContain('not a live AI');
    expect(unknown.choices).toHaveLength(4);
    expect(unknown.link).toBeUndefined();
  });

  it('answers campaign delivery questions as delivery, not as planning', () => {
    const w = seedWorkspace();
    const reply = assistantReply(w, message('How is campaign delivery looking?'));
    expect(reply.context.topic).toBe('delivery');
    expect(reply.link?.to).toBe('/reports');
    const c = w.campaigns.find(c => c.progress > 0)!;
    const named = assistantReply(w, message(`Show delivery for ${c.name}`));
    expect(named.context.campaignId).toBe(c.id);
    expect(named.facts?.[0].value).toBe(compact(metrics(c).delivered));
    expect(named.link?.to).toBe(`/campaigns/${c.id}?tab=proof`);
  });

  it.each(['DK', 'BR', 'IT'] as const)('uses the same role and market filters for %s delivery', market => {
    const w = { ...seedWorkspace(), persona: 'advertiser' as const, market };
    const visible = w.campaigns.filter(c => canSeeCampaign(w, c) && c.market === market);
    const reply = assistantReply(w, { type: 'topic', topic: 'delivery' });
    expect(reply.facts?.[0].value).toBe(compact(visible.reduce((sum, c) => sum + metrics(c).delivered, 0)));
    expect(reply.facts?.[1].value).toBe(String(visible.filter(c => c.progress > 0).length));
  });

  it('explains the next responsible person and owner without executing the step', () => {
    const w = seedWorkspace();
    const c = w.campaigns.find(c => c.id === 'AU-1005')!;
    const step = nextStep(c, w.config);
    const reply = assistantReply(w, { type: 'campaign', id: c.id });
    expect(reply.text).toContain(step.label);
    expect(reply.text).toContain(step.owner);
    expect(reply.facts?.[0].value).toBe(c.stage);
    expect(reply.link?.to).toBe('/deals?deal=AU-1005');
    const why = assistantReply(w, { type: 'explain' }, reply.context);
    expect(why.context.campaignId).toBe(c.id);
    expect(why.text).toContain('same workflow used by My tasks');
  });

  it('uses the same role-owned task count and can drill into a real example', () => {
    const w = { ...seedWorkspace(), persona: 'sales' as const, owner: 'Vista Outdoor' as const };
    const tasks = workspaceTasks(w);
    const reply = assistantReply(w, { type: 'topic', topic: 'tasks' });
    expect(reply.title).toContain(`${tasks.length} `);
    expect(reply.choices.filter(c => c.request.type === 'campaign').map(c => c.request)).toEqual(tasks.slice(0, 3).map(c => ({ type: 'campaign', id: c.id })));
    const example = assistantReply(w, { type: 'example' }, reply.context);
    expect(example.title).toBe(tasks[0].name);
  });

  it('handles empty views and removed or hidden campaigns explicitly', () => {
    const w = { ...seedWorkspace(), campaigns: [] };
    const tasks = assistantReply(w, { type: 'topic', topic: 'tasks' });
    expect(tasks.title).toBe('You’re caught up in this view');
    expect(tasks.text).toContain('0 handoffs');
    expect(assistantReply(w, { type: 'topic', topic: 'delivery' }).facts?.[0].value).toBe('0');
    expect(assistantReply(w, { type: 'campaign', id: 'missing' }).title).toBe('That campaign is outside this view');
    const hidden = { ...seedWorkspace(), persona: 'advertiser' as const };
    expect(assistantCampaign(hidden, '/campaigns/AU-1009', '')).toBeUndefined();
    expect(assistantReply(hidden, { type: 'campaign', id: 'AU-1009' }).link).toBeUndefined();
  });

  it('recognises current campaigns and direct-deal deep links only inside the current view', () => {
    const w = seedWorkspace();
    expect(assistantCampaign(w, '/deals', '?deal=AU-1005')?.id).toBe('AU-1005');
    expect(assistantCampaign(w, '/campaigns/AU-1005', '?tab=plan')?.id).toBe('AU-1005');
    expect(assistantCampaign({ ...w, market: 'BR' }, '/deals', '?deal=AU-1005')).toBeUndefined();
  });

  it.each([
    ['brand', '/deals'],
    ['advertiser', '/marketplace'],
    ['trader', '/dsp'],
    ['finance', '/tasks'],
  ] as const)('keeps %s in its own workspace when planning is requested', (persona, destination) => {
    const w = { ...seedWorkspace(), persona };
    const reply = assistantReply(w, { type: 'goal', goal: 'Awareness' });
    expect(reply.link?.to).toBe(destination);
    expect(reply.link?.state).toBeUndefined();
    expect(w.persona).toBe(persona);
  });

  it('respects answers-only, paused and read-only modes', () => {
    const w = seedWorkspace();
    const answers = assistantReply({ ...w, agentLevel: 'A1' }, { type: 'goal', goal: 'Awareness' });
    expect(answers.link?.state).toBeUndefined();
    expect(answers.text).toContain('answers-only');
    for (const paused of [{ ...w, agentEnabled: false }, { ...w, agentLevel: 'A0' as const }]) {
      const reply = assistantReply(paused, { type: 'goal', goal: 'Awareness' });
      expect(reply.title).toBe('The assistant is paused');
      expect(reply.link?.to).toBe('/agents');
    }
    expect(assistantReply({ ...w, persona: 'approver' }, { type: 'topic', topic: 'deals' }).link?.label).toContain('read-only');
    expect(assistantReply({ ...w, persona: 'crew' }, { type: 'topic', topic: 'deals' }).link?.to).toBe('/architecture?app=deals');
  });

  it('explains settled campaigns without offering another operational action', () => {
    const w = seedWorkspace();
    const c = w.campaigns.find(c => c.stage === 'Paid')!;
    const reply = assistantReply(w, { type: 'campaign', id: c.id });
    expect(reply.text).toContain('settled');
    expect(reply.facts?.[1].value).toBe('Settled');
  });

  it('never mutates workspace state or sends a persona to an unauthorised app', () => {
    for (const persona of personas) {
      const w: Workspace = { ...seedWorkspace(), persona: persona.id };
      const before = structuredClone(w);
      for (const starter of assistantStarters) {
        const reply = assistantReply(w, starter.request);
        const module = reply.link?.to.split(/[/?]/)[1];
        if (module && !['tasks', 'agents', 'architecture'].includes(module)) expect(persona.nav).toContain(module);
        for (const choice of reply.choices) assistantReply(w, choice.request, reply.context);
      }
      expect(w).toEqual(before);
    }
  });

  it('updates recommendations from the latest campaign stage, not a cached decision', () => {
    const w = seedWorkspace();
    const c = w.campaigns.find(c => c.id === 'AU-1005')!;
    const initial = assistantReply(w, { type: 'campaign', id: c.id });
    const updated: Campaign = { ...c, stage: 'Paid' };
    const next = assistantReply({ ...w, campaigns: w.campaigns.map(c => c.id === updated.id ? updated : c) }, message('next'), initial.context);
    expect(next.facts?.[0].value).toBe('Paid');
    expect(next.text).toContain('settled');
  });
});
