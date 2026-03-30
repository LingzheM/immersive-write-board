export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type TimeOfDay = 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night';
export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'foggy';

export interface SceneToken {
  colorA: string;
  colorB: string;
  overlay: number;
  light: number;
}

export const SCENE_TOKENS: Record<Season, Record<TimeOfDay, SceneToken>> = {
  spring: {
    dawn:      { colorA: '#1a1228', colorB: '#2d1f3d', overlay: 0.10, light: 0.55 },
    morning:   { colorA: '#1f2d1a', colorB: '#2a3d20', overlay: 0.05, light: 0.80 },
    afternoon: { colorA: '#1a2a1a', colorB: '#243822', overlay: 0.05, light: 0.90 },
    dusk:      { colorA: '#2d1a28', colorB: '#3d2030', overlay: 0.15, light: 0.50 },
    night:     { colorA: '#0d0a18', colorB: '#141228', overlay: 0.20, light: 0.20 },
  },
  summer: {
    dawn:      { colorA: '#0f1a0a', colorB: '#1a2810', overlay: 0.08, light: 0.60 },
    morning:   { colorA: '#0f1f0a', colorB: '#182e10', overlay: 0.03, light: 0.85 },
    afternoon: { colorA: '#0a1a08', colorB: '#162612', overlay: 0.03, light: 0.95 },
    dusk:      { colorA: '#1e0f08', colorB: '#2a1508', overlay: 0.18, light: 0.45 },
    night:     { colorA: '#060c10', colorB: '#0a1018', overlay: 0.22, light: 0.15 },
  },
  autumn: {
    dawn:      { colorA: '#1a1008', colorB: '#2a1a0a', overlay: 0.12, light: 0.50 },
    morning:   { colorA: '#1a1508', colorB: '#28200c', overlay: 0.08, light: 0.75 },
    afternoon: { colorA: '#18140a', colorB: '#261e0e', overlay: 0.08, light: 0.80 },
    dusk:      { colorA: '#200808', colorB: '#2e0e08', overlay: 0.20, light: 0.40 },
    night:     { colorA: '#0a0806', colorB: '#120e08', overlay: 0.25, light: 0.15 },
  },
  winter: {
    dawn:      { colorA: '#0c0c18', colorB: '#14141e', overlay: 0.15, light: 0.45 },
    morning:   { colorA: '#10101c', colorB: '#181824', overlay: 0.10, light: 0.70 },
    afternoon: { colorA: '#0e0e1a', colorB: '#161620', overlay: 0.08, light: 0.75 },
    dusk:      { colorA: '#0c0818', colorB: '#14101e', overlay: 0.20, light: 0.35 },
    night:     { colorA: '#060610', colorB: '#0a0a14', overlay: 0.28, light: 0.12 },
  },
};

export const WEATHER_MODIFIERS: Record<Weather, Partial<SceneToken>> = {
  sunny:  { light: 0.15,  overlay: -0.05 },
  cloudy: { light: -0.10, overlay: 0.10  },
  rainy:  { light: -0.20, overlay: 0.20  },
  snowy:  { light: 0.05,  overlay: 0.05  },
  foggy:  { light: -0.15, overlay: 0.25  },
};
