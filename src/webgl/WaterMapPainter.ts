/**
 * WaterMapPainter — 水面贴图绘制器（移植自 RainEffect/src/raindrops.js）
 *
 * 核心变化：不再手算法线，而是用预渲染精灵：
 *  - drop-color.png  编码了水滴表面法线（折射方向 R/G + 深度 B）
 *  - drop-alpha.png  定义水滴形状的 alpha 遮罩
 *  - 255 个精灵：通过 screen 混合不断增加 B 通道值 = 水滴深度
 *
 * 两层 canvas：
 *  - droplets (持久层)：细小水珠积累在玻璃表面，营造"湿玻璃"感
 *  - main (输出层)：每帧清空，叠加 droplets + 当前所有大水滴
 */

const DROP_SIZE = 64; // 精灵尺寸（px）

export interface PainterOptions {
  minR?: number;
  maxR?: number;
  dropletsRate?: number;        // 每帧新增细小水珠数量
  dropletsSize?: [number, number];
  dropletsCleaningRadiusMultiplier?: number;
}

export class WaterMapPainter {
  canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private droplets: HTMLCanvasElement;
  private dropletsCtx: CanvasRenderingContext2D;
  private dropsGfx: HTMLCanvasElement[] = [];
  private clearDropletsGfx!: HTMLCanvasElement;

  private width: number;
  private height: number;
  readonly scale: number;

  private dropletsCounter = 0;
  private textureCleaningIterations = 0;

  private opts: Required<PainterOptions>;

  constructor(width: number, height: number, scale = 1, options: PainterOptions = {}) {
    this.width = width;
    this.height = height;
    this.scale = scale;

    this.opts = {
      minR: options.minR ?? 10,
      maxR: options.maxR ?? 40,
      dropletsRate: options.dropletsRate ?? 50,
      dropletsSize: options.dropletsSize ?? [2, 4],
      dropletsCleaningRadiusMultiplier: options.dropletsCleaningRadiusMultiplier ?? 0.43,
    };

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;

    this.droplets = document.createElement('canvas');
    this.droplets.width = width;
    this.droplets.height = height;
    this.dropletsCtx = this.droplets.getContext('2d')!;
  }

  /** 必须在使用前调用，传入预加载好的图片元素 */
  initSprites(dropAlpha: HTMLImageElement, dropColor: HTMLImageElement) {
    // 创建清除笔刷（圆形，用于擦除大水滴路径上的细小水珠）
    const clearBrush = document.createElement('canvas');
    clearBrush.width = clearBrush.height = 128;
    const clearCtx = clearBrush.getContext('2d')!;
    clearCtx.fillStyle = '#000';
    clearCtx.beginPath();
    clearCtx.arc(64, 64, 64, 0, Math.PI * 2);
    clearCtx.fill();
    this.clearDropletsGfx = clearBrush;

    // 预渲染 255 个深度变体精灵
    const buffer = document.createElement('canvas');
    buffer.width = buffer.height = DROP_SIZE;
    const bufCtx = buffer.getContext('2d')!;

    this.dropsGfx = Array.from({ length: 255 }, (_, i) => {
      const drop = document.createElement('canvas');
      drop.width = drop.height = DROP_SIZE;
      const dropCtx = drop.getContext('2d')!;

      bufCtx.clearRect(0, 0, DROP_SIZE, DROP_SIZE);

      // 1. 绘制法线贴图颜色（dropColor 包含 R/G 折射方向）
      bufCtx.globalCompositeOperation = 'source-over';
      bufCtx.drawImage(dropColor, 0, 0, DROP_SIZE, DROP_SIZE);

      // 2. screen 叠加蓝色值 i → 编码深度到 B 通道
      bufCtx.globalCompositeOperation = 'screen';
      bufCtx.fillStyle = `rgba(0,0,${i},1)`;
      bufCtx.fillRect(0, 0, DROP_SIZE, DROP_SIZE);

      // 3. 用 dropAlpha 剪裁形状
      dropCtx.globalCompositeOperation = 'source-over';
      dropCtx.drawImage(dropAlpha, 0, 0, DROP_SIZE, DROP_SIZE);
      dropCtx.globalCompositeOperation = 'source-in';
      dropCtx.drawImage(buffer, 0, 0, DROP_SIZE, DROP_SIZE);

      return drop;
    });
  }

  /**
   * 每帧开始时调用：清空主画布，将 droplets 层叠入。
   */
  beginFrame(timeScale: number) {
    // 如果正在清除 droplets（天气切换）
    if (this.textureCleaningIterations > 0) {
      this.textureCleaningIterations -= timeScale;
      this.dropletsCtx.globalCompositeOperation = 'destination-out';
      this.dropletsCtx.fillStyle = `rgba(0,0,0,${0.05 * timeScale})`;
      this.dropletsCtx.fillRect(0, 0, this.width, this.height);
    }

    // 新增细小水珠到 droplets 层
    this.dropletsCounter += this.opts.dropletsRate * timeScale * this.areaMultiplier;
    while (this.dropletsCounter >= 1) {
      this.dropletsCounter--;
      this.drawDroplet(
        Math.random() * (this.width / this.scale),
        Math.random() * (this.height / this.scale),
        this.randomRange(...this.opts.dropletsSize, (n: number) => n * n),
      );
    }

    // 清空主画布，叠入持久 droplets
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.drawImage(this.droplets, 0, 0, this.width, this.height);
  }

  /**
   * 绘制一颗大水滴（含 spread/depth 参数，匹配参考实现）。
   * 由 RainPhysics 每帧调用。
   */
  drawDrop(x: number, y: number, r: number, spreadX = 0, spreadY = 0) {
    if (this.dropsGfx.length === 0) return;

    const { minR, maxR } = this.opts;
    const deltaR = maxR - minR;
    const scaleX = 1;
    const scaleY = 1.5;

    let d = Math.max(0, Math.min(1, ((r - minR) / deltaR) * 0.9));
    d *= 1 / (((spreadX + spreadY) * 0.5) + 1);
    d = Math.floor(d * (this.dropsGfx.length - 1));

    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(
      this.dropsGfx[d],
      (x - r * scaleX * (spreadX + 1)) * this.scale,
      (y - r * scaleY * (spreadY + 1)) * this.scale,
      r * 2 * scaleX * (spreadX + 1) * this.scale,
      r * 2 * scaleY * (spreadY + 1) * this.scale,
    );
  }

  /**
   * 擦除大水滴经过路径上的细小水珠（清除半径由 dropletsCleaningRadiusMultiplier 控制）。
   */
  clearDroplets(x: number, y: number, r: number) {
    const cr = r * this.opts.dropletsCleaningRadiusMultiplier;
    this.dropletsCtx.globalCompositeOperation = 'destination-out';
    this.dropletsCtx.drawImage(
      this.clearDropletsGfx,
      (x - cr) * this.scale,
      (y - cr) * this.scale,
      cr * 2 * this.scale,
      cr * 2 * this.scale * 1.5,
    );
  }

  clearAllDroplets() {
    this.textureCleaningIterations = 50;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.droplets.width = width;
    this.droplets.height = height;
  }

  // ─── private helpers ────────────────────────────────────────────────────────

  private get areaMultiplier() {
    const area = (this.width * this.height) / this.scale;
    return Math.sqrt(area / (1024 * 768));
  }

  private drawDroplet(x: number, y: number, r: number) {
    if (this.dropsGfx.length === 0) return;
    const { minR, maxR } = this.opts;
    const deltaR = maxR - minR;
    const scaleX = 1, scaleY = 1.5;

    let d = Math.max(0, Math.min(1, ((r - minR) / deltaR) * 0.9));
    d = Math.floor(d * (this.dropsGfx.length - 1));

    this.dropletsCtx.globalAlpha = 1;
    this.dropletsCtx.globalCompositeOperation = 'source-over';
    this.dropletsCtx.drawImage(
      this.dropsGfx[d],
      (x - r * scaleX) * this.scale,
      (y - r * scaleY) * this.scale,
      r * 2 * scaleX * this.scale,
      r * 2 * scaleY * this.scale,
    );
  }

  private randomRange(min: number, max: number, transform?: (n: number) => number): number {
    let v = Math.random() * (max - min) + min;
    if (transform) v = transform(v);
    return v;
  }
}
