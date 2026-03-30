import { create } from 'zustand';

export interface SceneState {
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'foggy';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  timeOfDay: 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night';
  manualOverride: boolean;
  writingPhase: 'idle' | 'active' | 'flow';
  setScene: (patch: Partial<Omit<SceneState, 'setScene'>>) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  weather: 'sunny',
  season: 'spring',
  timeOfDay: 'morning',
  manualOverride: true,
  writingPhase: 'idle',
  setScene: (patch) => set((state) => ({ ...state, ...patch })),
}));