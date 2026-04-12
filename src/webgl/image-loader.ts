type ImageInput = string | ImageConfig;

interface ImageConfig { name: string; src: string; }
interface LoadedImageEntry extends ImageConfig { img: HTMLImageElement; }
interface ImageResult { img: HTMLImageElement; src: string; }
type ImageMap = Record<string, ImageResult>;
type OnLoadCallback = (img: HTMLImageElement, i: number) => void;

function loadImage(src: ImageInput, i: number, onLoad?: OnLoadCallback): Promise<LoadedImageEntry> {
  return new Promise((resolve, reject) => {
    const config: ImageConfig = typeof src === "string" ? { name: `image${i}`, src } : src;
    const img = new Image();
    img.addEventListener("load", () => {
      if (typeof onLoad === "function") onLoad(img, i);
      resolve({ ...config, img });
    });
    img.addEventListener("error", () => {
      reject(new Error(`Failed to load image: ${config.src}`));
    });
    img.src = config.src;
  });
}

function loadImages(images: ImageInput[], onLoad?: OnLoadCallback): Promise<LoadedImageEntry[]> {
  return Promise.all(images.map((src, i) => loadImage(src, i, onLoad)));
}

export default function ImageLoader(images: ImageInput[], onLoad?: OnLoadCallback): Promise<ImageMap> {
  return loadImages(images, onLoad).then((loadedImages) =>
    loadedImages.reduce<ImageMap>((acc, entry) => {
      acc[entry.name] = { img: entry.img, src: entry.src };
      return acc;
    }, {})
  );
}
