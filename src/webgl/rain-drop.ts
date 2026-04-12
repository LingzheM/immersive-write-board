import times from "./times";
import createCanvas from "./create-canvas";
import { random, chance } from "./random";

// ============================================================
// 类型定义
// ============================================================

/**
 * 单个雨滴的数据结构
 * parent 指向产生它的"母滴"，形成链式关系
 */
interface Drop {
  x: number;
  y: number;
  r: number;
  spreadX: number;
  spreadY: number;
  momentum: number;
  momentumX: number;
  lastSpawn: number;
  nextSpawn: number;
  parent: Drop | null;
  isNew: boolean;
  killed: boolean;
  shrink: number;
}

/**
 * Raindrops 的所有可配置选项
 * dropletsSize / trailScaleRange / spawnArea 是 [min, max] 元组
 * 用 [number, number] 而非 number[]，表示"恰好两个元素"
 */
interface RaindropsOptions {
  minR: number;
  maxR: number;
  maxDrops: number;
  rainChance: number;
  rainLimit: number;
  dropletsRate: number;
  dropletsSize: [number, number];
  dropletsCleaningRadiusMultiplier: number;
  raining: boolean;
  globalTimeScale: number;
  trailRate: number;
  autoShrink: boolean;
  spawnArea: [number, number];
  trailScaleRange: [number, number];
  collisionRadius: number;
  collisionRadiusIncrease: number;
  dropFallMultiplier: number;
  collisionBoostMultiplier: number;
  collisionBoost: number;
}

// ============================================================
// 常量
// ============================================================

const DROP_SIZE = 64;

/**
 * Drop 的默认值对象，用作 Object.create() 的原型
 * 类型明确为 Drop，确保所有字段都有初始值
 */
const DROP_DEFAULTS: Drop = {
  x: 0,
  y: 0,
  r: 0,
  spreadX: 0,
  spreadY: 0,
  momentum: 0,
  momentumX: 0,
  lastSpawn: 0,
  nextSpawn: 0,
  parent: null,
  isNew: true,
  killed: false,
  shrink: 0,
};

const DEFAULT_OPTIONS: RaindropsOptions = {
  minR: 10,
  maxR: 40,
  maxDrops: 900,
  rainChance: 0.3,
  rainLimit: 3,
  dropletsRate: 50,
  dropletsSize: [2, 4],
  dropletsCleaningRadiusMultiplier: 0.43,
  raining: true,
  globalTimeScale: 1,
  trailRate: 1,
  autoShrink: true,
  spawnArea: [-0.1, 0.95],
  trailScaleRange: [0.2, 0.5],
  collisionRadius: 0.65,
  collisionRadiusIncrease: 0.01,
  dropFallMultiplier: 1,
  collisionBoostMultiplier: 0.05,
  collisionBoost: 1,
};

// ============================================================
// Raindrops 类
// ============================================================

class Raindrops {
  // --- 尺寸与缩放 ---
  width: number;
  height: number;
  scale: number;

  // --- 主 canvas ---
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;

  // --- 液滴层 canvas（背景细小水珠）---
  droplets!: HTMLCanvasElement;
  dropletsCtx!: CanvasRenderingContext2D;
  dropletsPixelDensity: number = 1;
  dropletsCounter: number = 0;

  // --- 雨滴图形资源 ---
  // dropAlpha / dropColor 是预加载的图像（HTMLCanvasElement 继承自 TexImageSource）
  dropAlpha: HTMLCanvasElement;
  dropColor: HTMLCanvasElement;

  // --- 雨滴状态 ---
  drops: Drop[] = [];
  dropsGfx: HTMLCanvasElement[] = [];           // 255 级预渲染雨滴贴图
  clearDropletsGfx!: HTMLCanvasElement;          // 擦除液滴用的圆形笔刷

  // --- 渲染控制 ---
  textureCleaningIterations: number = 0;
  lastRender: number | null = null;

  // --- 配置 ---
  options: RaindropsOptions;

  constructor(
    width: number,
    height: number,
    scale: number,
    dropAlpha: HTMLCanvasElement,
    dropColor: HTMLCanvasElement,
    options: Partial<RaindropsOptions> = {}
  ) {
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.dropAlpha = dropAlpha;
    this.dropColor = dropColor;
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    this.init();
  }

  // ============================================================
  // 计算属性（getter）
  // ============================================================

  /** 半径范围：maxR - minR */
  get deltaR(): number {
    return this.options.maxR - this.options.minR;
  }

  /** 实际渲染面积（除以 scale）*/
  get area(): number {
    return (this.width * this.height) / this.scale;
  }

  /** 面积比例系数（相对于 1024×768 基准）*/
  get areaMultiplier(): number {
    return Math.sqrt(this.area / (1024 * 768));
  }

  // ============================================================
  // 初始化
  // ============================================================

  private init(): void {
    this.canvas = createCanvas(this.width, this.height);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context for main canvas");
    this.ctx = ctx;

    this.droplets = createCanvas(
      this.width * this.dropletsPixelDensity,
      this.height * this.dropletsPixelDensity
    );
    const dropletsCtx = this.droplets.getContext("2d");
    if (!dropletsCtx) throw new Error("Failed to get 2D context for droplets canvas");
    this.dropletsCtx = dropletsCtx;

    this.drops = [];
    this.dropsGfx = [];

    this.renderDropsGfx();
    this.update();
  }

  // ============================================================
  // 预渲染雨滴贴图（255 级亮度）
  // ============================================================

  private renderDropsGfx(): void {
    const dropBuffer = createCanvas(DROP_SIZE, DROP_SIZE);
    const dropBufferCtx = dropBuffer.getContext("2d");
    if (!dropBufferCtx) throw new Error("Failed to get 2D context for dropBuffer");

    // Array.from({ length: 255 }) 比 Array.apply(null, Array(255)) 更现代、更易读
    this.dropsGfx = Array.from({ length: 255 }, (_, i) => {
      const drop = createCanvas(DROP_SIZE, DROP_SIZE);
      const dropCtx = drop.getContext("2d");
      if (!dropCtx) throw new Error("Failed to get 2D context for drop gfx");

      dropBufferCtx.clearRect(0, 0, DROP_SIZE, DROP_SIZE);

      // 底色
      dropBufferCtx.globalCompositeOperation = "source-over";
      dropBufferCtx.drawImage(this.dropColor, 0, 0, DROP_SIZE, DROP_SIZE);

      // 蓝色叠加，模拟深度
      dropBufferCtx.globalCompositeOperation = "screen";
      dropBufferCtx.fillStyle = `rgba(0,0,${i},1)`;
      dropBufferCtx.fillRect(0, 0, DROP_SIZE, DROP_SIZE);

      // alpha 遮罩
      dropCtx.globalCompositeOperation = "source-over";
      dropCtx.drawImage(this.dropAlpha, 0, 0, DROP_SIZE, DROP_SIZE);

      dropCtx.globalCompositeOperation = "source-in";
      dropCtx.drawImage(dropBuffer, 0, 0, DROP_SIZE, DROP_SIZE);

      return drop;
    });

    // 圆形擦除笔刷（用于清除液滴层）
    this.clearDropletsGfx = createCanvas(128, 128);
    const clearCtx = this.clearDropletsGfx.getContext("2d");
    if (!clearCtx) throw new Error("Failed to get 2D context for clearDropletsGfx");
    clearCtx.fillStyle = "#000";
    clearCtx.beginPath();
    clearCtx.arc(64, 64, 64, 0, Math.PI * 2);
    clearCtx.fill();
  }

  // ============================================================
  // 绘制方法
  // ============================================================

  private drawDrop(ctx: CanvasRenderingContext2D, drop: Drop): void {
    if (this.dropsGfx.length === 0) return;

    const { x, y, r, spreadX, spreadY } = drop;
    const scaleX = 1;
    const scaleY = 1.5;

    let d = Math.max(
      0,
      Math.min(1, ((r - this.options.minR) / this.deltaR) * 0.9)
    );
    d *= 1 / ((spreadX + spreadY) * 0.5 + 1);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    d = Math.floor(d * (this.dropsGfx.length - 1));
    ctx.drawImage(
      this.dropsGfx[d],
      (x - r * scaleX * (spreadX + 1)) * this.scale,
      (y - r * scaleY * (spreadY + 1)) * this.scale,
      r * 2 * scaleX * (spreadX + 1) * this.scale,
      r * 2 * scaleY * (spreadY + 1) * this.scale
    );
  }

  drawDroplet(x: number, y: number, r: number): void {
    this.drawDrop(
      this.dropletsCtx,
      Object.assign(Object.create(DROP_DEFAULTS) as Drop, {
        x: x * this.dropletsPixelDensity,
        y: y * this.dropletsPixelDensity,
        r: r * this.dropletsPixelDensity,
      })
    );
  }

  private clearDroplets(x: number, y: number, r: number = 30): void {
    const ctx = this.dropletsCtx;
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(
      this.clearDropletsGfx,
      (x - r) * this.dropletsPixelDensity * this.scale,
      (y - r) * this.dropletsPixelDensity * this.scale,
      r * 2 * this.dropletsPixelDensity * this.scale,
      r * 2 * this.dropletsPixelDensity * this.scale * 1.5
    );
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  // ============================================================
  // 雨滴生命周期管理
  // ============================================================

  /**
   * 创建新雨滴
   * Partial<Drop> 表示只需传入部分字段，其余从 DROP_DEFAULTS 继承
   */
  private createDrop(options: Partial<Drop>): Drop | null {
    if (this.drops.length >= this.options.maxDrops * this.areaMultiplier) {
      return null;
    }
    // Object.create(DROP_DEFAULTS)：新对象以 DROP_DEFAULTS 为原型（提供默认值）
    // Object.assign 覆盖传入的字段
    // as Drop：TS 无法静态推断 Object.create 的结果，需要断言
    return Object.assign(Object.create(DROP_DEFAULTS) as Drop, options);
  }

  addDrop(drop: Drop | null): boolean {
    if (
      this.drops.length >= this.options.maxDrops * this.areaMultiplier ||
      drop === null
    ) {
      return false;
    }
    this.drops.push(drop);
    return true;
  }

  // ============================================================
  // 更新逻辑
  // ============================================================

  private updateRain(timeScale: number): Drop[] {
    const rainDrops: Drop[] = [];
    if (!this.options.raining) return rainDrops;

    const limit = this.options.rainLimit * timeScale * this.areaMultiplier;
    let count = 0;

    while (
      chance(this.options.rainChance * timeScale * this.areaMultiplier) &&
      count < limit
    ) {
      count++;
      const r = random(this.options.minR, this.options.maxR, (n: number) =>
        Math.pow(n, 3)
      );
      const rainDrop = this.createDrop({
        x: random(this.width / this.scale),
        y: random(
          (this.height / this.scale) * this.options.spawnArea[0],
          (this.height / this.scale) * this.options.spawnArea[1]
        ),
        r,
        momentum: 1 + (r - this.options.minR) * 0.1 + random(2),
        spreadX: 1.5,
        spreadY: 1.5,
      });
      if (rainDrop !== null) rainDrops.push(rainDrop);
    }

    return rainDrops;
  }

  clearDrops(): void {
    this.drops.forEach((drop) => {
      setTimeout(() => {
        drop.shrink = 0.1 + random(0.5);
      }, random(1200));
    });
    this.clearTexture();
  }

  clearTexture(): void {
    this.textureCleaningIterations = 50;
  }

  private updateDroplets(timeScale: number): void {
    if (this.textureCleaningIterations > 0) {
      this.textureCleaningIterations -= 1 * timeScale;
      this.dropletsCtx.globalCompositeOperation = "destination-out";
      this.dropletsCtx.fillStyle = `rgba(0,0,0,${0.05 * timeScale})`;
      this.dropletsCtx.fillRect(
        0, 0,
        this.width * this.dropletsPixelDensity,
        this.height * this.dropletsPixelDensity
      );
    }

    if (this.options.raining) {
      this.dropletsCounter +=
        this.options.dropletsRate * timeScale * this.areaMultiplier;

      times(this.dropletsCounter, () => {
        this.dropletsCounter--;
        this.drawDroplet(
          random(this.width / this.scale),
          random(this.height / this.scale),
          random(...this.options.dropletsSize, (n: number) => n * n)
        );
      });
    }

    this.ctx.drawImage(this.droplets, 0, 0, this.width, this.height);
  }

  private updateDrops(timeScale: number): void {
    let newDrops: Drop[] = [];

    this.updateDroplets(timeScale);
    const rainDrops = this.updateRain(timeScale);
    newDrops = newDrops.concat(rainDrops);

    this.drops.sort((a, b) => {
      const va = a.y * (this.width / this.scale) + a.x;
      const vb = b.y * (this.width / this.scale) + b.x;
      return va > vb ? 1 : va === vb ? 0 : -1;
    });

    // ⚠️ 关键改动：forEach 改用箭头函数
    // 原 JS 用 function(drop, i){ ... } + 末尾传 this，
    // 箭头函数自动捕获外层 this，不需要第二个参数，更安全
    this.drops.forEach((drop, i) => {
      if (drop.killed) return;

      // 重力：随机增加动量
      if (
        chance(
          ((drop.r - this.options.minR * this.options.dropFallMultiplier) *
            (0.1 / this.deltaR)) *
            timeScale
        )
      ) {
        drop.momentum += random((drop.r / this.options.maxR) * 4);
      }

      // 自动收缩小水滴
      if (
        this.options.autoShrink &&
        drop.r <= this.options.minR &&
        chance(0.05 * timeScale)
      ) {
        drop.shrink += 0.01;
      }

      // 应用收缩
      drop.r -= drop.shrink * timeScale;
      if (drop.r <= 0) drop.killed = true;

      // 拖尾水珠
      if (this.options.raining) {
        drop.lastSpawn += drop.momentum * timeScale * this.options.trailRate;
        if (drop.lastSpawn > drop.nextSpawn) {
          const trailDrop = this.createDrop({
            x: drop.x + random(-drop.r, drop.r) * 0.1,
            y: drop.y - drop.r * 0.01,
            r: drop.r * random(...this.options.trailScaleRange),
            spreadY: drop.momentum * 0.1,
            parent: drop,
          });

          if (trailDrop !== null) {
            newDrops.push(trailDrop);
            drop.r *= Math.pow(0.97, timeScale);
            drop.lastSpawn = 0;
            drop.nextSpawn =
              random(this.options.minR, this.options.maxR) -
              drop.momentum * 2 * this.options.trailRate +
              (this.options.maxR - drop.r);
          }
        }
      }

      // 扩散衰减
      drop.spreadX *= Math.pow(0.4, timeScale);
      drop.spreadY *= Math.pow(0.7, timeScale);

      // 位移
      const moved = drop.momentum > 0;
      if (moved && !drop.killed) {
        drop.y += drop.momentum * this.options.globalTimeScale;
        drop.x += drop.momentumX * this.options.globalTimeScale;
        if (drop.y > this.height / this.scale + drop.r) {
          drop.killed = true;
        }
      }

      // 碰撞检测
      const checkCollision = (moved || drop.isNew) && !drop.killed;
      drop.isNew = false;

      if (checkCollision) {
        this.drops.slice(i + 1, i + 70).forEach((drop2) => {
          if (
            drop !== drop2 &&
            drop.r > drop2.r &&
            drop.parent !== drop2 &&
            drop2.parent !== drop &&
            !drop2.killed
          ) {
            const dx = drop2.x - drop.x;
            const dy = drop2.y - drop.y;
            const d = Math.sqrt(dx * dx + dy * dy);

            if (
              d < (drop.r + drop2.r) *
                (this.options.collisionRadius +
                  drop.momentum *
                    this.options.collisionRadiusIncrease *
                    timeScale)
            ) {
              const pi = Math.PI;
              const r1 = drop.r;
              const r2 = drop2.r;
              const a1 = pi * r1 * r1;
              const a2 = pi * r2 * r2;
              let targetR = Math.sqrt((a1 + a2 * 0.8) / pi);
              if (targetR > this.options.maxR) targetR = this.options.maxR;

              drop.r = targetR;
              drop.momentumX += dx * 0.1;
              drop.spreadX = 0;
              drop.spreadY = 0;
              drop2.killed = true;
              drop.momentum = Math.max(
                drop2.momentum,
                Math.min(
                  40,
                  drop.momentum +
                    targetR * this.options.collisionBoostMultiplier +
                    this.options.collisionBoost
                )
              );
            }
          }
        });
      }

      // 动量衰减
      drop.momentum -=
        Math.max(1, this.options.minR * 0.5 - drop.momentum) * 0.1 * timeScale;
      if (drop.momentum < 0) drop.momentum = 0;
      drop.momentumX *= Math.pow(0.7, timeScale);

      if (!drop.killed) {
        newDrops.push(drop);
        if (moved && this.options.dropletsRate > 0) {
          this.clearDroplets(
            drop.x,
            drop.y,
            drop.r * this.options.dropletsCleaningRadiusMultiplier
          );
        }
        this.drawDrop(this.ctx, drop);
      }
    });

    this.drops = newDrops;
  }

  update(): void {
    this.clearCanvas();

    const now = Date.now();
    if (this.lastRender === null) this.lastRender = now;

    const deltaT = now - this.lastRender;
    let timeScale = deltaT / ((1 / 60) * 1000);
    if (timeScale > 1.1) timeScale = 1.1;
    timeScale *= this.options.globalTimeScale;

    this.lastRender = now;
    this.updateDrops(timeScale);

    requestAnimationFrame(this.update.bind(this));
  }
}

export default Raindrops;