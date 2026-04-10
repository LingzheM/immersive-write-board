import GL from "./gl-obj";
import createCanvas from "./create-canvas";
import { VERT as vertShader, FRAG as fragShader } from '../shaders';

interface RainRendererOptions {
  renderShadow: boolean;
  minRefraction: number;
  maxRefraction: number;
  brightness: number;
  alphaMultiply: number;
  alphaSubtract: number;
  parallaxBg: number;
  parallaxFg: number;
}

interface TextureEntry {
  name: string;
  img: TexImageSource;
}

const defaultOptions: RainRendererOptions = {
  renderShadow: false,
  minRefraction: 256,
  maxRefraction: 512,
  brightness: 1,
  alphaMultiply: 20,
  alphaSubtract: 5,
  parallaxBg: 5,
  parallaxFg: 20,
};

class RainRenderer {
  canvas: HTMLCanvasElement;
  canvasLiquid: HTMLCanvasElement;
  width: number = 0;
  height: number = 0;
  imageShine: TexImageSource | null;
  imageFg: HTMLCanvasElement;
  imageBg: HTMLCanvasElement;
  gl!: GL;
  programWater: WebGLProgram | null = null;
  textures: TextureEntry[] = [];
  parallaxX: number = 0;
  parallaxY: number = 0;
  options: RainRendererOptions;
  private _overlayTexture: TexImageSource | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    canvasLiquid: HTMLCanvasElement,
    imageFg: HTMLCanvasElement,
    imageBg: HTMLCanvasElement,
    imageShine: TexImageSource | null = null,
    options: Partial<RainRendererOptions> = {}
  ) {
    this.canvas       = canvas;
    this.canvasLiquid = canvasLiquid;
    this.imageShine   = imageShine;
    this.imageFg      = imageFg;
    this.imageBg      = imageBg;
    this.options      = Object.assign({}, defaultOptions, options);
    this.init();
  }

  private init(): void {
    this.width  = this.canvas.width;
    this.height = this.canvas.height;

    this.gl = new GL(this.canvas, { alpha: false }, vertShader, fragShader);
    const gl = this.gl;
    this.programWater = gl.program;

    gl.createUniform("2f", "resolution", this.width, this.height);
    gl.createUniform("1f", "textureRatio",
      (this.imageBg as HTMLCanvasElement).width / (this.imageBg as HTMLCanvasElement).height);
    gl.createUniform("1i", "renderShine",  this.imageShine !== null);
    gl.createUniform("1i", "renderShadow", this.options.renderShadow);
    gl.createUniform("1f", "minRefraction",   this.options.minRefraction);
    gl.createUniform("1f", "refractionDelta", this.options.maxRefraction - this.options.minRefraction);
    gl.createUniform("1f", "brightness",    this.options.brightness);
    gl.createUniform("1f", "alphaMultiply", this.options.alphaMultiply);
    gl.createUniform("1f", "alphaSubtract", this.options.alphaSubtract);
    gl.createUniform("1f", "parallaxBg",    this.options.parallaxBg);
    gl.createUniform("1f", "parallaxFg",    this.options.parallaxFg);

    gl.createTexture(null, 0);

    this.textures = [
      { name: "textureShine", img: this.imageShine ?? createCanvas(2, 2) },
      { name: "textureFg",    img: this.imageFg },
      { name: "textureBg",    img: this.imageBg },
    ];
    this.textures.forEach((texture, i) => {
      gl.createTexture(texture.img, i + 1);
      gl.createUniform("1i", texture.name, i + 1);
    });

    this.draw();
  }

  draw(): void {
    this.gl.useProgram(this.programWater);
    this.gl.createUniform("2f", "parallax", this.parallaxX, this.parallaxY);
    this.updateTexture();
    this.gl.draw();
    requestAnimationFrame(this.draw.bind(this));
  }

  updateTextures(): void {
    this.textures.forEach((texture, i) => {
      this.gl.activeTexture(i + 1);
      this.gl.updateTexture(texture.img);
    });
  }

  updateTexture(): void {
    this.gl.activeTexture(0);
    this.gl.updateTexture(this.canvasLiquid);
  }

  resize(): void {}

  get overlayTexture(): TexImageSource | null { return this._overlayTexture; }
  set overlayTexture(v: TexImageSource | null) { this._overlayTexture = v; }
}

export default RainRenderer;
