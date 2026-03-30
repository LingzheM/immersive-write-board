// src/layers/CanvasParticles.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { ParticlePool } from '../particles/core/ParticlePool';
import { RainRenderer } from '../particles/renderers/RainRenderer';
import { useWritingStore } from '../state/writingStore';

export const CanvasParticles: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Subscribe without triggering re-renders
  useEffect(() => {
    return useWritingStore.subscribe(
      (state) => state.writingIntensity,
      (val) => { intensityRef.current = val; }
    );
  }, []);

  const startLoop = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!;
    const pool = new ParticlePool(300);
    const renderer = new RainRenderer();
    let lastTimestamp = performance.now();

    function tick(timestamp: number) {
      const dt = Math.min(timestamp - lastTimestamp, 50); // cap at 50ms
      lastTimestamp = timestamp;

      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      renderer.update(pool, intensityRef.current, width, height, dt);
      renderer.draw(ctx, pool);

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      pool.releaseAll();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const stopLoop = startLoop(canvas);

    return () => {
      stopLoop();
      window.removeEventListener('resize', resize);
    };
  }, [startLoop]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  );
};
