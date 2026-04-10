import RainRenderer from "./rain-render";
import loadImages from "./image-loader";
import createCanvas from "./create-canvas";

// ============================================================
// 类型定义
// ============================================================

/**
 * loadImages 接收的单条图片配置
 * name 是后续访问用的 key，src 是图片路径
 */
interface ImageConfig {
  name: string;
  src: string;
}

/**
 * loadImages 返回的图片集合
 * 用 Record<string, { img: HTMLImageElement }> 表示：
 * "键是字符串，值是含 img 属性的对象"
 *
 * 等价于写死：{ textureFg: { img: HTMLImageElement }, textureBg: { img: HTMLImageElement } }
 * 但 Record 更通用，不需要每次手动列举所有 key
 */
type ImageMap = Record<string, { img: HTMLImageElement }>;

// ============================================================
// 主逻辑
// ============================================================

const imageConfigs: ImageConfig[] = [
  { name: "textureFg", src: "assets/texture-rain-fg.png" },
  { name: "textureBg", src: "assets/texture-rain-bg.png" },
];

loadImages(imageConfigs).then((images: ImageMap) => {

  // querySelector 返回 Element | null
  // 用类型断言告诉 TS："我确定这是 HTMLCanvasElement，不是 null"
  // 如果你不确定页面上一定有这个元素，应该用下面的「安全写法」
  const canvas = document.querySelector<HTMLCanvasElement>("#container");

  // ✅ 安全写法：运行时检查，比类型断言更稳健
  if (!canvas) {
    throw new Error("#container canvas element not found in DOM");
  }

  // 此后 TS 已知 canvas 一定是 HTMLCanvasElement，不再是 null
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // 空白 canvas 代替水滴（Task 2/3 再换）
  const blankCanvas: HTMLCanvasElement = createCanvas(canvas.width, canvas.height);

  // fg 纹理 canvas
  const textureFg: HTMLCanvasElement = createCanvas(96, 64);
  const textureFgCtx = textureFg.getContext("2d");
  if (!textureFgCtx) throw new Error("Failed to get 2D context for textureFg");
  textureFgCtx.drawImage(images.textureFg.img, 0, 0, 96, 64);

  // bg 纹理 canvas
  const textureBg: HTMLCanvasElement = createCanvas(384, 256);
  const textureBgCtx = textureBg.getContext("2d");
  if (!textureBgCtx) throw new Error("Failed to get 2D context for textureBg");
  textureBgCtx.drawImage(images.textureBg.img, 0, 0, 384, 256);

  new RainRenderer(canvas, blankCanvas, textureFg, textureBg);
});