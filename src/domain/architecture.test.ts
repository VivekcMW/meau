import { describe, expect, it } from 'vitest';
import { moduleNames, personas } from './config';
import { appGroups, appsForPersona, architectureAppIds, architectureApps, architectureWorkflows, defaultPersonaWorkflow, ecosystemAreas, ecosystemLoop, featuresForPersona, personaGroups, personasForApp } from './architecture';

describe('architecture catalog', () => {
  it('maps exactly the 18 existing apps, excluding shared overview and task surfaces', () => {
    expect(architectureApps).toHaveLength(18);
    expect(new Set(architectureApps.map(app => app.id)).size).toBe(18);
    expect([...architectureAppIds].sort()).toEqual(Object.keys(moduleNames).filter(id => !['home', 'tasks'].includes(id)).sort());
    expect(architectureApps.map(app => app.id).sort()).toEqual([...architectureAppIds].sort());
    expect(architectureApps.every(app => appGroups.some(group => group.id === app.group))).toBe(true);
  });
  it('groups each of the 15 configured personas exactly once', () => {
    const ids = personaGroups.flatMap(group => group.ids);
    expect(ids).toHaveLength(15);
    expect([...ids].sort()).toEqual(personas.map(persona => persona.id).sort());
  });
  it('derives reciprocal app access from actual navigation and the shared agent hub', () => {
    for (const persona of personas) {
      expect(appsForPersona(persona.id).map(app => app.id).sort()).toEqual(
        [...new Set([...persona.nav.filter(id => id !== 'home' && id !== 'tasks'), 'agents'])].sort(),
      );
      for (const app of architectureApps) {
        expect(personasForApp(app.id).some(person => person.id === persona.id)).toBe(appsForPersona(persona.id).some(candidate => candidate.id === app.id));
      }
    }
  });
  it('keeps primary owners and persona-specific features inside the corresponding app access', () => {
    for (const app of architectureApps) {
      const users = personasForApp(app.id).map(persona => persona.id);
      for (const id of app.primary) expect(users).toContain(id);
      for (const feature of app.features) {
        for (const id of feature.personas || []) expect(users).toContain(id);
      }
      for (const id of users) expect(featuresForPersona(app, id).length).toBeGreaterThan(0);
    }
  });
  it('highlights the appropriate actions without equating visibility with authority', () => {
    const campaigns = architectureApps.find(app => app.id === 'campaigns')!;
    expect(featuresForPersona(campaigns, 'sales').map(feature => feature.label)).toContain('Accept or counter offers; sign owner booking contracts');
    expect(featuresForPersona(campaigns, 'sales').map(feature => feature.label)).not.toContain('Budget approval above the configured threshold');
    expect(featuresForPersona(campaigns, 'admin')).toEqual(campaigns.features);
  });
  it('provides a coherent default journey for every persona and a workflow for every app', () => {
    for (const persona of personas) {
      const workflow = architectureWorkflows.find(workflow => workflow.id === defaultPersonaWorkflow[persona.id]);
      expect(workflow?.steps.some(step => step.personas.includes(persona.id))).toBe(true);
    }
    for (const app of architectureApps) expect(architectureWorkflows.some(workflow => workflow.steps.some(step => step.app === app.id))).toBe(true);
    for (const workflow of architectureWorkflows) {
      expect(workflow.steps.length).toBeGreaterThan(2);
      for (const step of workflow.steps) {
        expect(architectureAppIds).toContain(step.app);
        for (const id of step.personas) expect(personasForApp(step.app).map(persona => persona.id)).toContain(id);
      }
    }
  });
  it('explains all apps and people through five coherent ecosystem areas without granting new access', () => {
    expect(ecosystemAreas).toHaveLength(5);
    expect(new Set(ecosystemAreas.map(area => area.id)).size).toBe(5);
    expect(ecosystemAreas.flatMap(area => area.apps).sort()).toEqual([...architectureAppIds].sort());
    expect([...new Set(ecosystemAreas.flatMap(area => area.people))].sort()).toEqual(personas.map(persona => persona.id).sort());
    for (const area of ecosystemAreas) {
      expect(new Set(area.people).size).toBe(area.people.length);
      expect(area.receives).not.toBe(area.shares);
      for (const id of area.people) expect(appsForPersona(id).some(app => area.apps.includes(app.id))).toBe(true);
      expect(architectureWorkflows.find(workflow => workflow.id === area.workflow)?.steps.some(step => area.apps.includes(step.app))).toBe(true);
    }
  });
  it('connects audience insight and verified results back to planning in the ecosystem loop', () => {
    expect(ecosystemLoop.map(step => step.label)).toEqual(['Audience insight', 'Plan & book', 'Deliver', 'Verify results', 'Improve the next plan']);
    for (const step of ecosystemLoop) expect(ecosystemAreas.some(area => area.id === step.area)).toBe(true);
    expect(ecosystemLoop[0].area).toBe('intelligence');
    expect(ecosystemLoop.at(-1)?.area).toBe('demand');
  });
});
