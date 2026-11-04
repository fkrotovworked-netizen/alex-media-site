import vertSource from './scene.vert.glsl?raw';
import fragSource from './scene.frag.glsl?raw';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GlassState {
  rect: Rect;
  radius: number;
  bezel: number;
  refraction: number;
  dispersion: number;
  blur: number;
  dim: number;
  saturation: number;
  opacity: number;
  shadowOffset: number;
  shadowBlur: number;
  shadowAlpha: number;
  sheen: number;
}

export interface FrameState {
  heroH: number;
  /** Fade in from the page tone over this many pixels at the top; 0 for a stage that opens the page. */
  seamTop?: number;
  form: Rect;
  light: { x: number; y: number };
  lightI: number;
  lime: number;
  sweep: number;
  glass: [GlassState, GlassState];
}

/** Backing-store budget. Above it the canvas renders at a lower scale rather than dropping frames. */
const PIXEL_BUDGET = 9_000_000;
const MAX_SCALE = 2;
const MIN_SCALE = 0.75;
/** Rows drawn beyond the viewport, so a fast scroll never reveals an undrawn strip. */
const OVERSCAN = 0.6;

const UNIFORMS = [
  'uRes',
  'uScale',
  'uStage',
  'uHeroH',
  'uSeamTop',
  'uForm',
  'uBevel',
  'uFormTexW',
  'uFormRect',
  'uLight',
  'uLightI',
  'uLime',
  'uSweep',
  'uGRect',
  'uGShape',
  'uGMat',
  'uGDepth'
] as const;

type UniformName = (typeof UNIFORMS)[number];

export class SceneRenderer {
  readonly gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private loc = {} as Record<UniformName, WebGLUniformLocation | null>;
  private formTex: WebGLTexture | null = null;
  private bevelTex: WebGLTexture | null = null;
  private formTexW = 1;
  private cssW = 1;
  private cssH = 1;
  private quality = 1;
  scale = 1;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      // transparent where nothing has been drawn yet, so the CSS field shows instead of black
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance'
    });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;

    this.program = this.link(vertSource, fragSource);
    gl.useProgram(this.program);
    for (const name of UNIFORMS) this.loc[name] = gl.getUniformLocation(this.program, name);

    gl.bindVertexArray(gl.createVertexArray());
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.enable(gl.SCISSOR_TEST);
  }

  private link(vert: string, frag: string) {
    const gl = this.gl;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(`Shader failed to compile: ${gl.getShaderInfoLog(shader)}`);
      }
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program failed to link: ${gl.getProgramInfoLog(program)}`);
    }
    return program;
  }

  private upload(image: HTMLImageElement, unit: number, { premultiply, mipmaps }: { premultiply: boolean; mipmaps: boolean }) {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mipmaps) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    return tex;
  }

  setTextures(form: HTMLImageElement, bevel: HTMLImageElement) {
    const gl = this.gl;
    this.formTex = this.upload(form, 0, { premultiply: true, mipmaps: true });
    this.bevelTex = this.upload(bevel, 1, { premultiply: false, mipmaps: false });
    this.formTexW = form.naturalWidth;
    gl.uniform1i(this.loc.uForm, 0);
    gl.uniform1i(this.loc.uBevel, 1);
  }

  get ready() {
    return this.formTex !== null && this.bevelTex !== null;
  }

  /** Sizes the backing store for a stage of the given CSS size. */
  resize(cssW: number, cssH: number) {
    this.cssW = Math.max(1, cssW);
    this.cssH = Math.max(1, cssH);
    const gl = this.gl;
    const maxSide = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) as number, 8192);
    let scale = Math.min(window.devicePixelRatio || 1, MAX_SCALE) * this.quality;
    scale = Math.min(scale, Math.sqrt(PIXEL_BUDGET / (this.cssW * this.cssH)), maxSide / this.cssH, maxSide / this.cssW);
    this.scale = Math.max(MIN_SCALE, scale);

    const w = Math.round(this.cssW * this.scale);
    const h = Math.round(this.cssH * this.scale);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  /** Lowers resolution one step; returns false once the floor is reached. */
  degrade() {
    if (this.scale <= MIN_SCALE) return false;
    this.quality *= 0.82;
    this.resize(this.cssW, this.cssH);
    return true;
  }

  /** Draws the rows of the stage that are on screen (plus overscan). */
  draw(state: FrameState, viewTop: number, viewHeight: number) {
    if (!this.ready) return;
    const gl = this.gl;
    const { width, height } = this.canvas;

    const top = Math.max(0, viewTop - viewHeight * OVERSCAN);
    const bottom = Math.min(this.cssH, viewTop + viewHeight * (1 + OVERSCAN));
    if (bottom <= top) return;
    const y0 = Math.floor(top * this.scale);
    const y1 = Math.min(height, Math.ceil(bottom * this.scale));

    gl.viewport(0, 0, width, height);
    gl.scissor(0, height - y1, width, y1 - y0);

    const l = this.loc;
    gl.uniform2f(l.uRes, width, height);
    gl.uniform1f(l.uScale, this.scale);
    gl.uniform2f(l.uStage, this.cssW, this.cssH);
    gl.uniform1f(l.uHeroH, state.heroH);
    gl.uniform1f(l.uSeamTop, state.seamTop ?? 0);
    gl.uniform1f(l.uFormTexW, this.formTexW);
    gl.uniform4f(l.uFormRect, state.form.x, state.form.y, state.form.w, state.form.h);
    gl.uniform2f(l.uLight, state.light.x, state.light.y);
    gl.uniform1f(l.uLightI, state.lightI);
    gl.uniform1f(l.uLime, state.lime);
    gl.uniform1f(l.uSweep, state.sweep);

    const rect = new Float32Array(8);
    const shape = new Float32Array(8);
    const mat = new Float32Array(8);
    const depth = new Float32Array(8);
    state.glass.forEach((g, i) => {
      rect.set([g.rect.x + g.rect.w / 2, g.rect.y + g.rect.h / 2, g.rect.w / 2, g.rect.h / 2], i * 4);
      shape.set([g.radius, g.bezel, g.refraction, g.dispersion], i * 4);
      mat.set([g.blur, g.dim, g.saturation, g.opacity], i * 4);
      depth.set([g.shadowOffset, g.shadowBlur, g.shadowAlpha, g.sheen], i * 4);
    });
    gl.uniform4fv(l.uGRect, rect);
    gl.uniform4fv(l.uGShape, shape);
    gl.uniform4fv(l.uGMat, mat);
    gl.uniform4fv(l.uGDepth, depth);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteTexture(this.formTex);
    gl.deleteTexture(this.bevelTex);
    gl.deleteProgram(this.program);
  }
}
