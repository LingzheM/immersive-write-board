import { VERT, FRAG } from './shaders';

/**
 * WaterRenderer — WebGL 渲染器
 *
 * uniform 参数与参考实现（RainEffect/src/rain-renderer.js）保持一致：
 *  minRefraction: 256, refractionDelta: 256
 *  parallaxBg: 5, parallaxFg: 20
 *  alphaMultiply: 6, alphaSubtract: 3 （rain 模式覆盖值）
 */
export class WaterRenderer {
  private gl: WebGLRenderingContext;
  private program!: WebGLProgram;
  private posBuffer!: WebGLBuffer;
  private width: number;
  private height: number;
  private textureRatio = 1;

  private tex = {
    waterMap: null as WebGLTexture | null,
    shine:    null as WebGLTexture | null,
    fg:       null as WebGLTexture | null,
    bg:       null as WebGLTexture | null,
  };

  private locs: Record<string, WebGLUniformLocation | null> = {};

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  async init(bgSrc: string, shineSrc: string): Promise<void> {
    const gl = this.gl;

    this.program = this.compileProgram(VERT, FRAG);

    // 全屏四边形
    this.posBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,   1, -1,  -1,  1,
      -1,  1,   1, -1,   1,  1,
    ]), gl.STATIC_DRAW);

    for (const name of [
      'u_waterMap', 'u_textureShine', 'u_textureFg', 'u_textureBg',
      'u_resolution', 'u_parallax', 'u_parallaxFg', 'u_parallaxBg',
      'u_textureRatio', 'u_renderShine', 'u_renderShadow',
      'u_minRefraction', 'u_refractionDelta',
      'u_brightness', 'u_alphaMultiply', 'u_alphaSubtract',
    ]) {
      this.locs[name] = gl.getUniformLocation(this.program, name);
    }

    const [bgImg, shineImg] = await Promise.all([
      this.loadImage(bgSrc),
      this.loadImage(shineSrc),
    ]);

    this.textureRatio = bgImg.naturalWidth / bgImg.naturalHeight;
    this.tex.bg    = this.texFromImage(bgImg);
    this.tex.fg    = this.texFromImage(bgImg);   // 同图；后续可换模糊版本
    this.tex.shine = this.texFromImage(shineImg);
    this.tex.waterMap = this.createEmptyTex(this.width, this.height);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  updateWaterMap(mapCanvas: HTMLCanvasElement) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex.waterMap);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mapCanvas);
  }

  render(parallax: [number, number] = [0, 0]) {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.viewport(0, 0, this.width, this.height);

    this.bindTex(this.tex.waterMap, 0, 'u_waterMap');
    this.bindTex(this.tex.shine,    1, 'u_textureShine');
    this.bindTex(this.tex.fg,       2, 'u_textureFg');
    this.bindTex(this.tex.bg,       3, 'u_textureBg');

    gl.uniform2f(this.locs['u_resolution'],     this.width, this.height);
    gl.uniform2f(this.locs['u_parallax'],        parallax[0], parallax[1]);
    gl.uniform1f(this.locs['u_parallaxFg'],      20.0);   // 参考值
    gl.uniform1f(this.locs['u_parallaxBg'],      5.0);    // 参考值
    gl.uniform1f(this.locs['u_textureRatio'],    this.textureRatio);
    gl.uniform1i(this.locs['u_renderShine'],     1);
    gl.uniform1i(this.locs['u_renderShadow'],    0);      // shadow 关闭（参考默认）
    gl.uniform1f(this.locs['u_minRefraction'],   256.0);  // 关键：参考值
    gl.uniform1f(this.locs['u_refractionDelta'], 256.0);  // 关键：参考值
    gl.uniform1f(this.locs['u_brightness'],      1.04);
    gl.uniform1f(this.locs['u_alphaMultiply'],   6.0);
    gl.uniform1f(this.locs['u_alphaSubtract'],   3.0);

    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    if (this.tex.waterMap) {
      const gl = this.gl;
      gl.deleteTexture(this.tex.waterMap);
      this.tex.waterMap = this.createEmptyTex(w, h);
    }
  }

  destroy() {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.posBuffer);
    for (const t of Object.values(this.tex)) {
      if (t) gl.deleteTexture(t);
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private compileProgram(vert: string, frag: string): WebGLProgram {
    const gl = this.gl;
    const vs = this.compileShader(gl.VERTEX_SHADER, vert);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, frag);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Shader link failed: ' + gl.getProgramInfoLog(prog));
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  }

  private compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw new Error('Shader compile failed: ' + gl.getShaderInfoLog(sh));
    }
    return sh;
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  private texFromImage(img: HTMLImageElement): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    this.setTexParams();
    return tex;
  }

  private createEmptyTex(w: number, h: number): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    this.setTexParams();
    return tex;
  }

  private setTexParams() {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  private bindTex(tex: WebGLTexture | null, unit: number, name: string) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(this.locs[name], unit);
  }
}
