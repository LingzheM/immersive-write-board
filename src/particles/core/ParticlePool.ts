import { Particle } from './types';

export class ParticlePool {
  private pool: Particle[];
  private freeStack: number[];       // 存储可用索引的栈
  private activeSet: Set<number>;    // 当前活跃索引集合

  constructor(size: number) {
    this.pool = Array.from({ length: size }, (_, i) => ({
      poolIndex: i,
      active: false,
      x: 0, y: 0, vx: 0, vy: 0,
      opacity: 0,
      life: 0,
      size: 1
    }));
    this.freeStack = Array.from({ length: size }, (_, i) => i);
    this.activeSet = new Set();
  }

  acquire(): Particle | null {
    const idx = this.freeStack.pop();
    if (idx === undefined) return null;
    
    const p = this.pool[idx];
    p.active = true;
    this.activeSet.add(idx);
    return p;
  }

  release(p: Particle): void {
    if (!p.active) return;
    p.active = false;
    this.activeSet.delete(p.poolIndex);
    this.freeStack.push(p.poolIndex);
  }

  releaseAll(): void {
    for (const idx of this.activeSet) {
      this.pool[idx].active = false;
      this.freeStack.push(idx);
    }
    this.activeSet.clear();
  }

  *activeParticles(): IterableIterator<Particle> {
    for (const idx of this.activeSet) {
      yield this.pool[idx];
    }
  }
}