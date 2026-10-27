import { describe, expect, it } from 'vitest';
import { appsForPersona, architectureApps } from './architecture';
import { personas } from './config';
import { appTourPersona, newOnboarding, onboardingSchema, tourPath, tourPersona, tourSelectionSchema, tourSteps, welcomeGroups } from './tours';

describe('guided onboarding', () => {
  it('covers every persona exactly once in the welcome groups', () => {
    const grouped = welcomeGroups.flatMap(group => group.people).sort();
    expect(grouped).toEqual(personas.map(person => person.id).sort());
    expect(new Set(grouped).size).toBe(personas.length);
  });
  it('gives every role a brief tour using only entitled routes', () => {
    for (const person of personas) {
      const selection = tourSelectionSchema.parse({ kind: 'persona', id: person.id });
      const steps = tourSteps(selection);
      expect(tourPersona(selection)).toBe(person.id);
      expect(steps.length).toBeGreaterThanOrEqual(4);
      expect(steps.length).toBeLessThanOrEqual(5);
      expect(tourPath(steps[0])).toBe('/');
      expect(steps.at(-1)?.module).toBe('tasks');
      for (const step of steps) {
        expect(['home', 'tasks', 'agents', ...person.nav]).toContain(step.module);
        expect(step.target.length).toBeGreaterThan(0);
        expect(step.description.split(/\s+/).length).toBeLessThan(65);
        expect(step.takeaway.length).toBeGreaterThan(10);
      }
    }
  });
  it('has three task-specific stops for every app and selects a permitted persona', () => {
    for (const app of architectureApps) for (const person of personas) {
      const target = appTourPersona(app.id, person.id);
      expect(appsForPersona(target).map(app => app.id)).toContain(app.id);
      if (appsForPersona(person.id).some(item => item.id === app.id)) expect(target).toBe(person.id);
      const selection = { kind: 'app' as const, id: app.id, persona: target };
      const steps = tourSteps(selection);
      expect(steps).toHaveLength(3);
      expect(new Set(steps.map(step => step.title)).size).toBe(3);
      expect(steps.every(step => step.module === app.id)).toBe(true);
      expect(onboardingSchema.safeParse({ status: 'active', selection, step: 2 }).success).toBe(true);
    }
  });
  it('validates progress, rejects unknown IDs, impossible access and out-of-range steps', () => {
    expect(onboardingSchema.parse(newOnboarding)).toEqual(newOnboarding);
    const valid = { status: 'paused', selection: { kind: 'persona', id: 'planner' }, step: 2 };
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
    for (const invalid of [
      { ...valid, status: 'done' }, { ...valid, step: -1 }, { ...valid, step: 1.2 }, { ...valid, step: 5 },
      { ...valid, selection: null }, { ...valid, selection: { kind: 'persona', id: 'unknown' } },
      { ...valid, selection: { kind: 'app', id: 'finance', persona: 'crew' } },
      { ...valid, selection: { kind: 'app', id: 'home', persona: 'planner' } },
    ]) expect(onboardingSchema.safeParse(invalid).success).toBe(false);
  });
});
