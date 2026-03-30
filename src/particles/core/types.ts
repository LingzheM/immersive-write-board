export interface Particle {
  poolIndex: number;  // 在池中的固定索引
  active: boolean;    // 是否激活
  x: number;          // 当前 X 坐标
  y: number;          // 当前 Y 坐标
  vx: number;         // X 速度
  vy: number;         // Y 速度
  opacity: number;    // 透明度
  life: number;       // 生命周期（可选，雨滴通常根据越界销毁）
  size: number;       // 粗细或大小
}

export interface WeatherRenderer {
  update(pool: ParticlePool, intensity: number, width: number, height: number, dt: number): void;
  draw(ctx: CanvasRenderingContext2D, pool: ParticlePool): void;
}