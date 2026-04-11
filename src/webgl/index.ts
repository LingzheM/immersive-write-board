import RainRenderer from "./rain-render";
import Raindrops from "./rain-drop";
import loadImages from "./image-loader";
import createCanvas from "./create-canvas";
import { tweenFromTo, type TweenHandle } from "./tween";

// ============================================================
// 类型定义
// ============================================================

interface ImageConfig {
  name: string;
  src: string;
}

type TextureKey =
  | "dropAlpha" | "dropColor"
  | "textureRainFg"           | "textureRainBg"
  | "textureStormLightningFg" | "textureStormLightningBg"
  | "textureFalloutFg"        | "textureFalloutBg"
  | "textureSunFg"            | "textureSunBg"
  | "textureDrizzleFg"        | "textureDrizzleBg";

type TextureMap = Record<TextureKey, { img: HTMLImageElement }>;

/**
 * switchWeather 的第三个参数：只需传想改的字段
 * Partial<RaindropsOptions> 表示每个字段都可选
 * 直接从 Raindrops 实例的 options 属性推断类型，不需要重复定义
 */
type RaindropOptions = Raindrops["options"];

const textureFgSize = { width: 96,  height: 64  } as const;
const textureBgSize = { width: 384, height: 256 } as const;

// ============================================================
// generateTextures
// ============================================================

function generateTextures(
  textureFgCtx: CanvasRenderingContext2D,
  textureBgCtx: CanvasRenderingContext2D,
  fg: CanvasImageSource,
  bg: CanvasImageSource,
  alpha: number = 1
): void {
  textureFgCtx.globalAlpha = alpha;
  textureFgCtx.drawImage(fg, 0, 0, textureFgSize.width, textureFgSize.height);

  textureBgCtx.globalAlpha = alpha;
  textureBgCtx.drawImage(bg, 0, 0, textureBgSize.width, textureBgSize.height);
}

// ============================================================
// 图片配置
// ============================================================

const imageConfigs: ImageConfig[] = [
  { name: "dropAlpha",              src: "assets/drop-alpha.png" },
  { name: "dropColor",              src: "assets/drop-color.png" },
  { name: "textureRainFg",          src: "assets/weather/texture-rain-fg.png" },
  { name: "textureRainBg",          src: "assets/weather/texture-rain-bg.png" },
  // { name: "textureStormLightningFg",src: "assets/weather/texture-storm-lightning-fg.png" },
  // { name: "textureStormLightningBg",src: "assets/weather/texture-storm-lightning-bg.png" },
  // { name: "textureFalloutFg",       src: "assets/weather/texture-fallout-fg.png" },
  // { name: "textureFalloutBg",       src: "assets/weather/texture-fallout-bg.png" },
  { name: "textureSunFg",           src: "assets/weather/texture-sun-fg.png" },
  { name: "textureSunBg",           src: "assets/weather/texture-sun-bg.png" },
  // { name: "textureDrizzleFg",       src: "assets/weather/texture-drizzle-fg.png" },
  // { name: "textureDrizzleBg",       src: "assets/weather/texture-drizzle-bg.png" },
];

// ============================================================
// 主逻辑
// ============================================================

loadImages(imageConfigs).then((images) => {
  const textures = images as TextureMap;

  // --- 主 canvas ---
  const canvas = document.querySelector<HTMLCanvasElement>("#container");
  if (!canvas) throw new Error("#container canvas not found");
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  // --- 雨滴引擎 ---
  const raindrops = new Raindrops(
    canvas.width,
    canvas.height,
    1,
    textures.dropAlpha.img,
    textures.dropColor.img
  );

  // --- fg 纹理 canvas ---
  const textureFg    = createCanvas(textureFgSize.width, textureFgSize.height);
  const textureFgCtx = textureFg.getContext("2d");
  if (!textureFgCtx) throw new Error("Failed to get 2D context for textureFg");

  // --- bg 纹理 canvas ---
  const textureBg    = createCanvas(textureBgSize.width, textureBgSize.height);
  const textureBgCtx = textureBg.getContext("2d");
  if (!textureBgCtx) throw new Error("Failed to get 2D context for textureBg");

  // 默认天气：雨
  generateTextures(
    textureFgCtx, textureBgCtx,
    textures.textureRainFg.img, textures.textureRainBg.img
  );

  const renderer = new RainRenderer(canvas, raindrops.canvas, textureFg, textureBg);

  // ============================================================
  // switchWeather
  // ============================================================

  let activeTween: TweenHandle | null = null;

  /**
   * 切换天气：blend.v 从 0→1 动画过渡纹理，同时更新雨滴参数
   *
   * @param fg              目标前景纹理
   * @param bg              目标背景纹理
   * @param raindropOptions 要覆盖的雨滴参数（只传需要改的字段）
   */
  function switchWeather(
    fg: CanvasImageSource,
    bg: CanvasImageSource,
    raindropOptions: Partial<RaindropOptions>
  ): void {
    // 中断正在进行的过渡
    if (activeTween) activeTween.cancelled = true;

    // blend.v 从 0→1，每帧把新纹理以递增 alpha 画在旧内容上方
    activeTween = tweenFromTo(1, 0, 1, (v) => {
      generateTextures(textureFgCtx!, textureBgCtx!, fg, bg, v);
      renderer.updateTextures();
    });

    // 雨滴参数立即生效
    Object.assign(raindrops.options, raindropOptions);
    raindrops.clearDrops();
  }

  // ============================================================
  // 导航绑定
  // ============================================================

  function getNavItem(selector: string): HTMLElement {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`Nav item not found: ${selector}`);
    return el;
  }

  /** 移除所有 .nav-item--current，激活目标 */
  function setActiveNav(el: HTMLElement): void {
    document.querySelectorAll(".nav-item").forEach((item) =>
      item.classList.remove("nav-item--current")
    );
    el.classList.add("nav-item--current");
  }

  const navRain = getNavItem("#btn-rain");
  navRain.onclick = (e) => {
    e.preventDefault();
    setActiveNav(navRain);
    switchWeather(
      textures.textureRainFg.img,
      textures.textureRainBg.img,
      { raining: true, rainChance: 0.35 }
    );
  };

  const navSun = getNavItem("#btn-sun");
  navSun.onclick = (e) => {
    e.preventDefault();
    setActiveNav(navSun);
    switchWeather(
      textures.textureSunFg.img,
      textures.textureSunBg.img,
      { raining: false, rainChance: 0 }
    );
  };
});