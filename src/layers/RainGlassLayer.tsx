import React, { useEffect, useRef } from 'react';
import { WaterRenderer } from '../webgl/WaterRenderer';
import { WaterMapPainter } from '../webgl/WaterMapPainter';
import { RainPhysics } from '../webgl/RainPhysics';
import heroImg   from '../assets/hero.png';
import shineImg  from '../assets/drop-shine.png';
import dropAlphaImg from '../assets/drop-alpha.png';
import dropColorImg from '../assets/drop-color.png';

/**
 * RainGlassLayer — 全屏 WebGL 玻璃雨滴效果
 *
 * 管线（每帧）：
 *  1. physics.update()          — momentum / trail / collision
 *  2. painter.beginFrame()      — 清空主画布 + droplets 积层 + 随机新增细水珠
 *  3. 遍历 drops → drawDrop()   — 绘制大水滴 + 擦除经过路径上的细水珠
 *  4. renderer.updateWaterMap() — 上传 Canvas 为 WebGL 纹理
 *  5. renderer.render()         — WebGL 着色器折射渲染
 */
export const RainGlassLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpi = window.devicePixelRatio || 1;
    canvas.width  = window.innerWidth  * dpi;
    canvas.height = window.innerHeight * dpi;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';

    const renderer = new WaterRenderer(canvas);
    const painter  = new WaterMapPainter(canvas.width, canvas.height, dpi, {
      minR: 10,
      maxR: 50,
      dropletsRate: 50,
      dropletsSize: [2, 4],
      dropletsCleaningRadiusMultiplier: 0.43,
    });
    const physics = new RainPhysics(canvas.width, canvas.height, dpi, {
      minR: 10,
      maxR: 50,
      rainChance: 0.35,
      rainLimit: 6,
      trailRate: 1,
      trailScaleRange: [0.25, 0.35],
      collisionRadius: 0.45,
      collisionRadiusIncrease: 0.0002,
    });

    let rafId = 0;
    let lastTs = performance.now();

    // 加载精灵图和 WebGL 资源
    function loadImage(src: string): Promise<HTMLImageElement> {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }

    Promise.all([
      renderer.init(heroImg, shineImg),
      loadImage(dropAlphaImg),
      loadImage(dropColorImg),
    ]).then(([, dropAlpha, dropColor]) => {
      painter.initSprites(dropAlpha, dropColor);

      const loop = (ts: number) => {
        const dt = Math.min(ts - lastTs, 50);
        lastTs = ts;
        const timeScale = Math.min((dt / (1000 / 60)) * physics.options.globalTimeScale, 1.1);

        const drops = physics.update(timeScale);
        painter.beginFrame(timeScale);

        for (const d of drops) {
          if (!d.killed) {
            painter.drawDrop(d.x, d.y, d.r, d.spreadX, d.spreadY);
            if (d.momentum > 0) {
              painter.clearDroplets(d.x, d.y, d.r);
            }
          }
        }

        renderer.updateWaterMap(painter.getCanvas());
        renderer.render();
        rafId = requestAnimationFrame(loop);
      };

      rafId = requestAnimationFrame(loop);
    }).catch(console.error);

    const onResize = () => {
      const newDpi = window.devicePixelRatio || 1;
      canvas.width  = window.innerWidth  * newDpi;
      canvas.height = window.innerHeight * newDpi;
      canvas.style.width  = window.innerWidth  + 'px';
      canvas.style.height = window.innerHeight + 'px';
      renderer.resize(canvas.width, canvas.height);
      painter.resize(canvas.width, canvas.height);
      physics.resize(canvas.width, canvas.height);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      renderer.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'block',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
};
