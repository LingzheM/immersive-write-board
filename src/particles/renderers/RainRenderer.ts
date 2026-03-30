import { ParticlePool } from '../core/ParticlePool';
import { WeatherRenderer } from '../core/types';

export class RainRenderer implements WeatherRenderer {
  // 每一帧尝试生成的雨滴数量随 intensity 变化
  update(pool: ParticlePool, intensity: number, width: number, height: number, dt: number) {
    // 基础密度 + 写入强度加成 (0.1 -> 0.8)
    const spawnRate = 0.1 + intensity * 0.7;
    
    // 每帧生成逻辑
    const numToSpawn = Math.floor(Math.random() * 5 * spawnRate);
    for (let i = 0; i < numToSpawn; i++) {
      const p = pool.acquire();
      if (p) {
        p.x = Math.random() * (width + 200) - 100; // 稍微超出边界，考虑斜率
        p.y = -20;
        // 写作强度越高，雨落得越快
        p.vy = 12 + Math.random() * 8 + intensity * 15;
        p.vx = -2 - Math.random() * 2; // 统一偏左斜
        p.opacity = 0.1 + Math.random() * 0.3 + intensity * 0.2;
        p.size = 1 + Math.random() * 1;
      }
    }

    // 更新位置
    for (const p of pool.activeParticles()) {
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);

      // 越界销毁
      if (p.y > height + 50 || p.x < -150) {
        pool.release(p);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, pool: ParticlePool) {
    ctx.beginPath();
    for (const p of pool.activeParticles()) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity})`;
      ctx.lineWidth = p.size;
      // 绘制线段表示雨滴
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 1.5, p.y + p.vy * 1.5);
    }
    ctx.stroke();
  }
}