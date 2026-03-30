// src/App.tsx
import React, { useEffect } from 'react';
import { CSSAtmosphere } from './layers/CSSAtmosphere';
import { CanvasParticles } from './layers/CanvasParticles';
import { useWritingStore } from './state/writingStore';
import { useSceneStore } from './state/sceneStore';
import './App.css';

const App: React.FC = () => {
  // Temporary: bump intensity on keypress so rain is visible during dev.
  // Replace with useWritingIntensity hook in next phase.
  useEffect(() => {
    const onKey = () => {
      const current = useWritingStore.getState().writingIntensity;
      useWritingStore.getState().setWritingState({
        writingIntensity: Math.min(1, current + 0.1),
        lastKeyStrokeAt: Date.now(),
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Set scene to rainy so rain particles are visible
  useEffect(() => {
    useSceneStore.getState().setScene({ weather: 'rainy', season: 'autumn', timeOfDay: 'night' });
  }, []);

  return (
    <main className="app-canvas">
      <CSSAtmosphere />
      <CanvasParticles />
    </main>
  );
};

export default App;
