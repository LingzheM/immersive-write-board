export interface Particle {
  poolIndex: number;
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  life: number;
  size: number;
}

// Structural interface — ParticlePool satisfies this without a direct import
interface ActivePool {
  acquire(): Particle | null;
  release(p: Particle): void;
  releaseAll(): void;
  activeParticles(): IterableIterator<Particle>;
}

export interface WeatherRenderer {
  update(pool: ActivePool, intensity: number, width: number, height: number, dt: number): void;
  draw(ctx: CanvasRenderingContext2D, pool: ActivePool): void;
}
