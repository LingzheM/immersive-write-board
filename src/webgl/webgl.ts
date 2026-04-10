type WebGLContextType = "webgl" | "experimental-webgl";
type TextureSource = TexImageSource | null;

export type UniformType =
  | "1f" | "1fv" | "2f" | "2fv" | "3f" | "3fv" | "4f" | "4fv"
  | "1i" | "1iv" | "2i" | "2iv" | "3i" | "3iv" | "4i" | "4iv"
  | "Matrix2fv" | "Matrix3fv" | "Matrix4fv";

function error(msg: string): void {
  console.error(msg);
}

export function getContext(
  canvas: HTMLCanvasElement,
  options: WebGLContextAttributes = {}
): WebGLRenderingContext | null {
  const contextTypes: WebGLContextType[] = ["webgl", "experimental-webgl"];
  let context: WebGLRenderingContext | null = null;

  contextTypes.some((name) => {
    try {
      context = canvas.getContext(name, options) as WebGLRenderingContext | null;
    } catch (e) {}
    return context != null;
  });

  if (context == null) {
    document.body.classList.add("no-webgl");
  }

  return context;
}

export function createShader(
  gl: WebGLRenderingContext,
  script: string,
  type: number
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) { error("Failed to create shader object"); return null; }

  gl.shaderSource(shader, script);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    error(`Error compiling shader '${shader}': ${gl.getShaderInfoLog(shader)}`);
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createProgram(
  gl: WebGLRenderingContext,
  vertexScript: string,
  fragScript: string
): WebGLProgram | null {
  const vertexShader = createShader(gl, vertexScript, gl.VERTEX_SHADER);
  const fragShader   = createShader(gl, fragScript,   gl.FRAGMENT_SHADER);
  if (!vertexShader || !fragShader) return null;

  const program = gl.createProgram();
  if (!program) { error("Failed to create program object"); return null; }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    error(`Error in program linking: ${gl.getProgramInfoLog(program)}`);
    gl.deleteProgram(program);
    return null;
  }

  const positionLocation  = gl.getAttribLocation(program, "a_position");
  const texCoordLocation  = gl.getAttribLocation(program, "a_texCoord");

  const texCoordBuffer = gl.createBuffer();
  if (!texCoordBuffer) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,
  ]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

  const buffer = gl.createBuffer();
  if (!buffer) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  return program;
}

export function createTexture(
  gl: WebGLRenderingContext,
  source: TextureSource,
  i: number
): WebGLTexture | null {
  const texture = gl.createTexture();
  if (!texture) return null;

  activeTexture(gl, i);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  if (source !== null) updateTexture(gl, source);
  return texture;
}

export function createUniform(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  type: UniformType,
  name: string,
  ...args: unknown[]
): void {
  const location = gl.getUniformLocation(program, `u_${name}`);
  (gl[`uniform${type}` as keyof WebGLRenderingContext] as Function)(location, ...args);
}

export function activeTexture(gl: WebGLRenderingContext, i: number): void {
  gl.activeTexture(gl[`TEXTURE${i}` as keyof WebGLRenderingContext] as number);
}

export function updateTexture(gl: WebGLRenderingContext, source: TexImageSource): void {
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
}

export function setRectangle(
  gl: WebGLRenderingContext,
  x: number, y: number, width: number, height: number
): void {
  const x1 = x, x2 = x + width, y1 = y, y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2,
  ]), gl.STATIC_DRAW);
}
