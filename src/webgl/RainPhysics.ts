/**
 * RainPhysics — 雨滴物理（移植自 RainEffect/src/raindrops.js updateDrops 逻辑）
 *
 * 模型特点：
 *  - momentum（动量）驱动下落速度，而非恒定速度
 *  - 拖尾：大水滴移动时生成更小的子水滴（trail drops，作为 parent 子项）
 *  - 碰撞合并：大水滴吃掉路径上的小水滴，变得更重更快
 *  - 自动收缩：小于 minR 的水滴逐渐缩小消失
 */

function random(min: number, max?: number, transform?: (n: number) => number): number {
  if (max === undefined) { max = min; min = 0; }
  let v = Math.random() * (max - min) + min;
  return transform ? transform(v) : v;
}

function chance(p: number): boolean {
  return Math.random() < p;
}

export interface Drop {
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

function createDrop(opts: Partial<Drop>): Drop {
  return {
    x: 0, y: 0, r: 0,
    spreadX: 0, spreadY: 0,
    momentum: 0, momentumX: 0,
    lastSpawn: 0, nextSpawn: 0,
    parent: null,
    isNew: true, killed: false, shrink: 0,
    ...opts,
  };
}

export interface RainOptions {
  minR?: number;
  maxR?: number;
  maxDrops?: number;
  rainChance?: number;
  rainLimit?: number;
  trailRate?: number;
  trailScaleRange?: [number, number];
  collisionRadius?: number;
  collisionRadiusIncrease?: number;
  collisionBoostMultiplier?: number;
  collisionBoost?: number;
  dropFallMultiplier?: number;
  autoShrink?: boolean;
  spawnArea?: [number, number];   // y range [fraction, fraction]
  globalTimeScale?: number;
}

const DEFAULTS: Required<RainOptions> = {
  minR: 10,
  maxR: 50,
  maxDrops: 900,
  rainChance: 0.35,
  rainLimit: 6,
  trailRate: 1,
  trailScaleRange: [0.25, 0.35],
  collisionRadius: 0.45,
  collisionRadiusIncrease: 0.0002,
  collisionBoostMultiplier: 0.05,
  collisionBoost: 1,
  dropFallMultiplier: 1,
  autoShrink: true,
  spawnArea: [-0.1, 0.95],
  globalTimeScale: 1,
};

export class RainPhysics {
  drops: Drop[] = [];
  options: Required<RainOptions>;

  private width: number;
  private height: number;
  private scale: number;

  constructor(width: number, height: number, scale: number, opts: RainOptions = {}) {
    this.width = width;
    this.height = height;
    this.scale = scale;
    this.options = { ...DEFAULTS, ...opts };
  }

  get logicalW() { return this.width / this.scale; }
  get logicalH() { return this.height / this.scale; }
  private get deltaR() { return this.options.maxR - this.options.minR; }
  private get areaMultiplier() {
    return Math.sqrt((this.logicalW * this.logicalH) / (1024 * 768));
  }

  /** timeScale: (frameDeltaMs / 16.67)，即帧时间归一到 60fps */
  update(timeScale: number): Drop[] {
    const newDrops: Drop[] = [];
    const opts = this.options;

    // 生成新雨滴
    const limit = opts.rainLimit * timeScale * this.areaMultiplier;
    let count = 0;
    while (chance(opts.rainChance * timeScale * this.areaMultiplier) && count < limit) {
      count++;
      const r = random(opts.minR, opts.maxR, (n) => Math.pow(n, 3));
      if (this.drops.length < opts.maxDrops * this.areaMultiplier) {
        newDrops.push(createDrop({
          x: random(this.logicalW),
          y: random(this.logicalH * opts.spawnArea[0], this.logicalH * opts.spawnArea[1]),
          r,
          momentum: 1 + (r - opts.minR) * 0.1 + random(2),
          spreadX: 1.5,
          spreadY: 1.5,
        }));
      }
    }

    // 按 y*width+x 排序（为碰撞检测优化）
    this.drops.sort((a, b) => {
      const va = a.y * this.logicalW + a.x;
      const vb = b.y * this.logicalW + b.x;
      return va > vb ? 1 : va === vb ? 0 : -1;
    });

    this.drops.forEach((drop, i) => {
      if (drop.killed) return;

      // 重力：动量随机增加
      if (chance((drop.r - opts.minR * opts.dropFallMultiplier) * (0.1 / this.deltaR) * timeScale)) {
        drop.momentum += random((drop.r / opts.maxR) * 4);
      }

      // 自动收缩（小水滴）
      if (opts.autoShrink && drop.r <= opts.minR && chance(0.05 * timeScale)) {
        drop.shrink += 0.01;
      }
      drop.r -= drop.shrink * timeScale;
      if (drop.r <= 0) { drop.killed = true; return; }

      // 拖尾生成
      drop.lastSpawn += drop.momentum * timeScale * opts.trailRate;
      if (drop.lastSpawn > drop.nextSpawn) {
        const trailR = drop.r * random(...opts.trailScaleRange);
        if (this.drops.length < opts.maxDrops * this.areaMultiplier) {
          const trail = createDrop({
            x: drop.x + random(-drop.r, drop.r) * 0.1,
            y: drop.y - drop.r * 0.01,
            r: trailR,
            spreadY: drop.momentum * 0.1,
            parent: drop,
          });
          newDrops.push(trail);

          drop.r *= Math.pow(0.97, timeScale);
          drop.lastSpawn = 0;
          drop.nextSpawn =
            random(opts.minR, opts.maxR) -
            drop.momentum * 2 * opts.trailRate +
            (opts.maxR - drop.r);
        }
      }

      // spread 收缩
      drop.spreadX *= Math.pow(0.4, timeScale);
      drop.spreadY *= Math.pow(0.7, timeScale);

      // 位移
      const moved = drop.momentum > 0;
      if (moved) {
        drop.y += drop.momentum * opts.globalTimeScale;
        drop.x += drop.momentumX * opts.globalTimeScale;
        if (drop.y > this.logicalH + drop.r) { drop.killed = true; return; }
      }

      // 碰撞检测（仅检查后 70 个，参考实现的优化）
      if ((moved || drop.isNew) && !drop.killed) {
        this.drops.slice(i + 1, i + 70).forEach((drop2) => {
          if (
            drop === drop2 || drop.r <= drop2.r ||
            drop.parent === drop2 || drop2.parent === drop ||
            drop2.killed
          ) return;

          const dx = drop2.x - drop.x;
          const dy = drop2.y - drop.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const threshold = (drop.r + drop2.r) *
            (opts.collisionRadius + drop.momentum * opts.collisionRadiusIncrease * timeScale);

          if (d < threshold) {
            const a1 = Math.PI * drop.r * drop.r;
            const a2 = Math.PI * drop2.r * drop2.r;
            drop.r = Math.min(opts.maxR, Math.sqrt((a1 + a2 * 0.8) / Math.PI));
            drop.momentumX += dx * 0.1;
            drop.spreadX = 0;
            drop.spreadY = 0;
            drop2.killed = true;
            drop.momentum = Math.max(
              drop2.momentum,
              Math.min(40, drop.momentum + drop.r * opts.collisionBoostMultiplier + opts.collisionBoost),
            );
          }
        });
      }

      drop.isNew = false;
      drop.momentum -= Math.max(1, opts.minR * 0.5 - drop.momentum) * 0.1 * timeScale;
      if (drop.momentum < 0) drop.momentum = 0;
      drop.momentumX *= Math.pow(0.7, timeScale);

      if (!drop.killed) newDrops.push(drop);
    });

    this.drops = newDrops;
    return this.drops;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  clearDrops() {
    this.drops.forEach((drop) => {
      setTimeout(() => { drop.shrink = 0.1 + random(0.5); }, random(1200));
    });
  }
}
