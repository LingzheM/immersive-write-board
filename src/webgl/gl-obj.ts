import * as WebGL from "./webgl";
import type { UniformType } from "./webgl";

class GL {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  program: WebGLProgram | null = null;
  width: number = 0;
  height: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    options: WebGLContextAttributes,
    vert: string,
    frag: string
  ) {
    this.canvas = canvas;
    this.width  = canvas.width;
    this.height = canvas.height;

    const gl = WebGL.getContext(canvas, options);
    if (!gl) throw new Error("WebGL not supported in this environment.");
    this.gl = gl;

    this.program = this.createProgram(vert, frag);
    this.useProgram(this.program);
  }

  createProgram(vert: string, frag: string): WebGLProgram | null {
    return WebGL.createProgram(this.gl, vert, frag);
  }

  useProgram(program: WebGLProgram | null): void {
    this.program = program;
    this.gl.useProgram(program);
  }

  createTexture(source: TexImageSource | null, i: number): WebGLTexture | null {
    return WebGL.createTexture(this.gl, source, i);
  }

  createUniform(type: UniformType, name: string, ...v: unknown[]): void {
    WebGL.createUniform(this.gl, this.program!, type, name, ...v);
  }

  activeTexture(i: number): void {
    WebGL.activeTexture(this.gl, i);
  }

  updateTexture(source: TexImageSource): void {
    WebGL.updateTexture(this.gl, source);
  }

  draw(): void {
    WebGL.setRectangle(this.gl, -1, -1, 2, 2);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }
}

export default GL;
