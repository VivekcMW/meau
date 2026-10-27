import { create } from 'zustand';
import { newOnboarding, onboardingKey, onboardingSchema } from './tours';
import type { OnboardingProgress, TourSelection } from './tours';

let progress = newOnboarding;
let error: string | null = null;
try {
  const saved = localStorage.getItem(onboardingKey);
  if (saved) progress = onboardingSchema.parse(JSON.parse(saved));
} catch (cause) {
  console.error('Tour progress recovery failed', cause);
  error = 'Saved tour progress could not be loaded. Choose a new tour or explore without one to replace it.';
}

interface TourStore {
  progress: OnboardingProgress;
  error: string | null;
  chooserOpen: boolean;
  launch: { selection: TourSelection; step: number } | null;
  requestLaunch: (selection: TourSelection, step: number) => void;
  clearLaunch: () => void;
  openChooser: () => void;
  closeChooser: () => void;
  save: (progress: OnboardingProgress) => void;
}
export const useTourStore = create<TourStore>(set => ({
  progress, error, chooserOpen: false, launch: null,
  requestLaunch: (selection, step) => set({ launch: { selection, step } }),
  clearLaunch: () => set({ launch: null }),
  openChooser: () => set({ chooserOpen: true }),
  closeChooser: () => set({ chooserOpen: false }),
  save: next => {
    const parsed = onboardingSchema.parse(next);
    try {
      localStorage.setItem(onboardingKey, JSON.stringify(parsed));
      set({ progress: parsed, error: null });
    } catch (cause) {
      console.error('Tour progress save failed', cause);
      set({ progress: parsed, error: 'Tour progress could not be saved. You can continue in this tab, but progress will be lost on refresh.' });
    }
  },
}));
