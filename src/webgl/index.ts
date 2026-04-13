import RainRenderer from "./rain-render";
import Raindrops from "./rain-drop";
import loadImages from "./image-loader";
import createCanvas from "./create-canvas";

declare global {
  interface Window {
    switchToMist?: () => void;
    switchToSpringRain?: () => void;
  }
}

// ============================================================
// 类型定义
// ============================================================

type ImageKey = "dropAlpha" | "dropColor" | "springScene";
type ImageMap = Record<ImageKey, { img: HTMLImageElement }>;

const textureFgSize = { width: 96,  height: 64  } as const;
const textureBgSize = { width: 384, height: 256 } as const;

// ============================================================
// createSpringTexture
// ============================================================

/**
 * 在图片上叠加色调，返回新的 canvas
 *
 * @param sourceImg  原始图像
 * @param width      输出宽度
 * @param height     输出高度
 * @param tint       叠加颜色，格式 "rgba(r,g,b,a)"
 */
function createSpringTexture(
  sourceImg: CanvasImageSource,
  width: number,
  height: number,
  tint: string
): HTMLCanvasElement {
  const c = createCanvas(width, height);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2D context for spring texture");

  // 1. 绘制原图
  ctx.drawImage(sourceImg, 0, 0, width, height);

  // 2. multiply 模式叠加色调（让图像偏向指定颜色，保留明暗细节）
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, width, height);

  // 3. 恢复默认合成模式，避免影响后续绘制
  ctx.globalCompositeOperation = "source-over";

  return c;
}

// ============================================================
// 主逻辑
// ============================================================

loadImages([
  { name: "dropAlpha",   src: "assets/drop-alpha.png" },
  { name: "dropColor",   src: "assets/drop-color.png" },
  { name: "springScene", src: "assets/season/spring/spring.svg" },
]).then((images) => {
  const textures = images as ImageMap;
  const springImg = textures.springScene.img;

  // --- 背景图 ---
  const slideshow = document.querySelector<HTMLElement>(".slideshow");
  if (!slideshow) throw new Error(".slideshow element not found");
  slideshow.style.backgroundImage =
    "url(img/season/spring/sakura_layered_composition_v2.svg)";

  // --- fg/bg 纹理 canvas ---
  const textureFg    = createCanvas(textureFgSize.width, textureFgSize.height);
  const textureFgCtx = textureFg.getContext("2d");
  if (!textureFgCtx) throw new Error("Failed to get 2D context for textureFg");

  const textureBg    = createCanvas(textureBgSize.width, textureBgSize.height);
  const textureBgCtx = textureBg.getContext("2d");
  if (!textureBgCtx) throw new Error("Failed to get 2D context for textureBg");

  // 春调色：fg 偏暖粉（樱花），bg 偏淡黄（阳光透射）
  const springFg = createSpringTexture(
    springImg,
    textureFgSize.width, textureFgSize.height,
    "rgba(255, 210, 200, 0.4)"
  );
  const springBg = createSpringTexture(
    springImg,
    textureBgSize.width, textureBgSize.height,
    "rgba(255, 220, 180, 0.2)"
  );

  textureFgCtx.drawImage(springFg, 0, 0);
  textureBgCtx.drawImage(springBg, 0, 0);

  // --- 主 canvas（DPI 感知）---
  const canvas = document.querySelector<HTMLCanvasElement>("#container");
  if (!canvas) throw new Error("#container canvas not found");

  // devicePixelRatio：Retina 屏幕上是 2，普通屏幕是 1
  // canvas 的实际像素 = 逻辑像素 × dpi，CSS 尺寸保持逻辑像素
  // 这样在高清屏上渲染不模糊
  const dpi = window.devicePixelRatio;
  canvas.width         = window.innerWidth  * dpi;
  canvas.height        = window.innerHeight * dpi;
  canvas.style.width   = `${window.innerWidth}px`;
  canvas.style.height  = `${window.innerHeight}px`;

  // --- 雨滴引擎（春雨参数）---
  const raindrops = new Raindrops(
    canvas.width,
    canvas.height,
    dpi,
    textures.dropAlpha.img,
    textures.dropColor.img,
    {
      minR: 10,
      maxR: 35,
      rainChance: 0.25,
      rainLimit: 4,
      dropletsRate: 30,
      dropletsSize:     [2, 4],
      trailRate: 0.8,
      trailScaleRange:  [0.2, 0.35],
      raining: true,
    }
  );

  // --- WebGL 渲染器（春季微调亮度和透明度）---
  new RainRenderer(
    canvas,
    raindrops.canvas,
    textureFg,
    textureBg,
    null,            // imageShine：无光泽层
    {
      brightness:    1.04,  // 略微提亮，模拟春日柔光
      alphaMultiply: 6,     // 水滴透明度系数（比默认 20 低，更通透）
      alphaSubtract: 3,     // 透明度偏移（比默认 5 低）
    }
  );

  // ============================================================
  // 全局天气切换函数
  // ============================================================

  window.switchToMist = () => {
    raindrops.options.raining = false;
    raindrops.clearDrops();
    document.querySelector(".mist-overlay")?.classList.add("active");
  };

  window.switchToSpringRain = () => {
    raindrops.options.raining = true;
    document.querySelector(".mist-overlay")?.classList.remove("active");
  };
});