import React, { useEffect, useRef } from "react";
import { CSSAtmosphere } from "./layers/CSSAtmosphere";
import { CanvasParticles } from './layers/CanvasParticles';
import { useWritingStore } from "./state/writingStore";

const App: React.FC = () => {
  useEffect(() => {
    const timer = setInterval(() => {
      const { writingIntensity } = useWritingStore.getState();
      if (writingIntensity > 0) {
        useWritingStore.setState({
          writingIntensity: Math.max(0, writingIntensity - 0.05)
        });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="app-canvas">
      <CSSAtmosphere />
      <CanvasParticles />
    </main>
  );
};