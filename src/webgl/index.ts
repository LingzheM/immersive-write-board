import RainRenderer from "./rain-render";
import Raindrops from "./rain-drop";
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
  // ✅ 新增：雨滴形状（透明度遮罩）和颜色贴图
  { name: "dropAlpha",  src: "assets/drop-alpha.png" },
  { name: "dropColor",  src: "assets/drop-color.png" },
];

loadImages(imageConfigs).then((images: ImageMap) => {
  const canvas = document.querySelector<HTMLCanvasElement>("#container");
  if (!canvas) throw new Error("#container canvas not found");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // raindrops.canvas 是内部维护的离屏 canvas，每帧由 Raindrops 自己更新
  // RainRenderer 只负责读取它作为纹理，不需要关心内部细节
  const raindrops = new Raindrops(
    canvas.width,
    canvas.height,
    1,
    images.dropAlpha.img,
    images.dropColor.img
  )

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

  new RainRenderer(canvas, raindrops.canvas, textureFg, textureBg);
});