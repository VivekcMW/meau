import { create } from 'zustand';
import { seedWorkspace } from './fixtures';
import { createCampaign, transition } from './engine';
import { workspaceSchema } from './model';
import type { Action, Brief, Campaign, Workspace } from './model';

const STORAGE_KEY = 'allunite-one.workspace.v1';
type Notice = { message: string; kind: 'success' | 'error'; id: number };
interface Store {
  workspace: Workspace;
  notice: Notice | null;
  notify: (message: string, kind?: Notice['kind']) => void;
  dismiss: () => void;
  update: (updater: (workspace: Workspace) => Workspace) => boolean;
  act: (id: string, action: Action) => boolean;
  create: (brief: Brief, channel?: Campaign['channel'], frames?: string[]) => string | null;
  reset: () => void;
}
let initial = seedWorkspace();
let loadError: string | null = null;
try {
  const persisted = localStorage.getItem(STORAGE_KEY);
  if (persisted) initial = workspaceSchema.parse(JSON.parse(persisted));
} catch (error) {
  console.error('Workspace recovery failed', error);
  loadError = 'Saved workspace could not be loaded. The demo seed is shown; reset to replace the saved data.';
}
export const useStore = create<Store>((set, get) => ({
  workspace: initial,
  notice: loadError ? { message: loadError, kind: 'error', id: Date.now() } : null,
  notify: (message, kind = 'success') => set({ notice: { message, kind, id: Date.now() } }),
  dismiss: () => set({ notice: null }),
  update: updater => {
    try {
      const next = workspaceSchema.parse(updater(get().workspace));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      set({ workspace: next });
      return true;
    } catch (error) {
      console.error('Workspace update failed', error);
      get().notify(error instanceof Error ? error.message : 'Unable to save this change.', 'error');
      return false;
    }
  },
  act: (id, action) => {
    let feedback = '';
    const success = get().update(w => {
      const current = w.campaigns.find(c => c.id === id);
      if (!current) throw new Error('Campaign not found. Return to your campaigns.');
      const next = transition(w, current, action);
      feedback = next.events[next.events.length - 1].text;
      return { ...w, campaigns: w.campaigns.map(c => c.id === id ? next : c) };
    });
    if (success) get().notify(feedback);
    return success;
  },
  create: (brief, channel = 'Direct', ids) => {
    let id: string | null = null;
    const success = get().update(w => {
      const c = createCampaign(w, brief, channel, ids);
      id = c.id;
      return { ...w, campaigns: [c, ...w.campaigns], cart: channel === 'Self-serve' ? [] : w.cart };
    });
    if (success) get().notify(channel === 'Direct' ? 'Your plan is ready. Make it yours.' : 'Demo booking confirmed. Let’s get your creative ready.');
    return success ? id : null;
  },
  reset: () => { if (get().update(() => seedWorkspace())) get().notify('Demo workspace reset. A fresh start.'); },
}));
