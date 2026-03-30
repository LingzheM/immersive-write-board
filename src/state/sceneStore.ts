import { create } from 'zustand';
import type { Season, TimeOfDay, Weather } from '../tokens/sceneTokens';

export interface SceneState {
  weather: Weather;
  season: Season;
  timeOfDay: TimeOfDay;
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