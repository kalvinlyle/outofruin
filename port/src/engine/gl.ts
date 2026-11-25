// WebGL backend reproducing dmRender's render list (render.cpp), the font
// batching of font_renderer.cpp and the GL state the gui materials need.
import { f, M4 } from './math32';
import { FontMap, TextEntry, createFontVertexData, GLYPH_VERTEX_FLOATS } from './font';
import type { GLTex, StencilScope } from './gui_core';

export const BLEND_ZERO = 0, BLEND_ONE = 1, BLEND_SRC_ALPHA = 2, BLEND_ONE_MINUS_SRC_ALPHA = 3, BLEND_DST_COLOR = 4;

export interface StencilTestParams {
  func: 'equal' | 'always';
  opSFail: 'keep'; opDPFail: 'keep' | 'replace'; opDPPass: 'keep' | 'replace';
  ref: number; refMask: number; bufferMask: number; colorMask: number;
  clearBuffer: boolean;
}

export interface RenderObject {
  program: 'gui' | 'font';
  /** Start vertex index in Renderer's shared guiBuf or fontBuf */
  vertexStart: number;
  vertexCount: number;
  primitive: number; // gl.TRIANGLES / gl.TRIANGLE_STRIP
  texture: GLTex | null;
  src: number; dst: number;
  stencil: StencilTestParams | null;
}

export interface RenderListEntry {
  majorOrder: number; minorOrder: number; order: number;
  dispatch: 'gui' | 'font';
  batchKey: string;
  ro?: RenderObject;
  text?: TextEntry;
  seq: number;
}

export const GUI_STRIDE = 9;

export class Renderer {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  programs: Record<string, { prog: WebGLProgram; attribs: Record<string, number>; viewProj: WebGLUniformLocation | null; sampler: WebGLUniformLocation | null }> = {};
  vbo: WebGLBuffer;
  fontVbo: WebGLBuffer;
  guiBuf: Float32Array = new Float32Array(65536);
  guiFloats = 0;
  fontBuf: Float32Array = new Float32Array(65536);
  fontFloats = 0;
  white: GLTex;
  list: RenderListEntry[] = [];
  seq = 0;
  stencilCleared = false;
  viewProj: Float32Array = new Float32Array(16);

  constructor(canvas: HTMLCanvasElement, shaders: Map<string, string>) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: true, stencil: true }) as WebGLRenderingContext;
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    this.programs.gui = this.makeProgram(shaders.get('builtins/materials/gui.vp')!, shaders.get('builtins/materials/gui.fp')!);
    this.programs.font = this.makeProgram(shaders.get('builtins/fonts/font.vp')!, shaders.get('builtins/fonts/font.fp')!);
    this.vbo = gl.createBuffer()!;
    this.fontVbo = gl.createBuffer()!;
    const whiteTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, whiteTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(16).fill(255));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.white = { handle: whiteTex, width: 2, height: 2, originalWidth: 2, originalHeight: 2 };
  }

  allocGuiFloats(count: number): { buf: Float32Array; offset: number } {
    const offset = this.guiFloats;
    const need = offset + count;
    if (need > this.guiBuf.length) {
      let cap = this.guiBuf.length;
      while (cap < need) cap *= 2;
      const next = new Float32Array(cap);
      next.set(this.guiBuf.subarray(0, offset));
      this.guiBuf = next;
    }
    this.guiFloats = need;
    return { buf: this.guiBuf, offset };
  }

  allocFontFloats(count: number): { buf: Float32Array; offset: number } {
    const offset = this.fontFloats;
    const need = offset + count;
    if (need > this.fontBuf.length) {
      let cap = this.fontBuf.length;
      while (cap < need) cap *= 2;
      const next = new Float32Array(cap);
      next.set(this.fontBuf.subarray(0, offset));
      this.fontBuf = next;
    }
    this.fontFloats = need;
    return { buf: this.fontBuf, offset };
  }

  private makeProgram(vsSrc: string, fsSrc: string) {
    const gl = this.gl;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
      return s;
    };
    // Defold 1.2.167 html5 prepends nothing to vertex programs; fragment programs carry their own precision.
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSrc));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(prog));
    const attribs: Record<string, number> = {};
    for (const a of ['position', 'texcoord0', 'color', 'face_color', 'outline_color', 'shadow_color', 'sdf_params', 'layer_mask']) {
      attribs[a] = gl.getAttribLocation(prog, a);
    }
    return { prog, attribs, viewProj: gl.getUniformLocation(prog, 'view_proj'), sampler: gl.getUniformLocation(prog, 'texture_sampler') };
  }

  /** The exact RGBA bytes of a decoded image (uploaded unmodified, read back through a framebuffer). */
  readImageRGBA(img: ImageBitmap): Uint8Array {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    const out = new Uint8Array(img.width * img.height * 4);
    gl.readPixels(0, 0, img.width, img.height, gl.RGBA, gl.UNSIGNED_BYTE, out);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    gl.deleteTexture(t);
    return out;
  }

  /**
   * Upload all mips of an image texture one mip at a time, closing each decoded
   * ImageBitmap immediately after upload to keep renderer RAM low.
   * `alphaClean[level]` applies res_texture's COMPRESSION_FLAG_ALPHA_CLEAN to the
   * WebP-decoded mips: pixels with alpha 0 get rgb 0.
   */
  createTexture(mips: (ImageBitmap | null)[], width: number, height: number, originalWidth: number, originalHeight: number, format: 'rgba' | 'luminance' = 'rgba', alphaClean: boolean[] = []): GLTex {
    const gl = this.gl;
    const fmt = format === 'rgba' ? gl.RGBA : gl.LUMINANCE;
    const t = gl.createTexture()!;
    let scratchTex: WebGLTexture | null = null;
    let scratchFb: WebGLFramebuffer | null = null;
    const align = format === 'rgba' ? 4 : 1;
    try {
      for (let level = 0; level < mips.length; level++) {
        const m = mips[level];
        if (!m) continue;
        if (format === 'rgba' && alphaClean[level]) {
          if (!scratchTex) scratchTex = gl.createTexture()!;
          if (!scratchFb) scratchFb = gl.createFramebuffer()!;
          gl.bindTexture(gl.TEXTURE_2D, scratchTex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, m);
          gl.bindFramebuffer(gl.FRAMEBUFFER, scratchFb);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, scratchTex, 0);
          const px = new Uint8Array(m.width * m.height * 4);
          gl.readPixels(0, 0, m.width, m.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          for (let i = 0; i < px.length; i += 4) if (px[i + 3] === 0) { px[i] = 0; px[i + 1] = 0; px[i + 2] = 0; }
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.pixelStorei(gl.UNPACK_ALIGNMENT, align);
          gl.texImage2D(gl.TEXTURE_2D, level, fmt, m.width, m.height, 0, fmt, gl.UNSIGNED_BYTE, px);
        } else {
          gl.bindTexture(gl.TEXTURE_2D, t);
          gl.pixelStorei(gl.UNPACK_ALIGNMENT, align);
          gl.texImage2D(gl.TEXTURE_2D, level, fmt, fmt, gl.UNSIGNED_BYTE, m);
        }
        m.close();
        mips[level] = null;
      }
    } finally {
      if (scratchFb) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(scratchFb); }
      if (scratchTex) gl.deleteTexture(scratchTex);
    }
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    // graphics.default_texture_min_filter "linear" is LINEAR_MIPMAP_NEAREST (engine.cpp
    // ConvertMinTextureFilter); res_texture falls back to LINEAR without mipmaps.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips.length > 1 ? gl.LINEAR_MIPMAP_NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { handle: t, width, height, originalWidth, originalHeight };
  }

  /** Font glyph cache: a cleared texture with every glyph cell written, sampled LINEAR. */
  createFontTexture(font: FontMap) {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    const fmt = font.glyphChannels === 1 ? gl.LUMINANCE : font.glyphChannels === 3 ? gl.RGB : gl.RGBA;
    if (font.image) {
      gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, font.image);
      font.image.close();
      font.image = null;
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, fmt, Math.max(1, font.cacheWidth), Math.max(1, font.cacheHeight), 0, fmt, gl.UNSIGNED_BYTE, null);
    }
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    font.texture = { handle: t, width: font.cacheWidth, height: font.cacheHeight, originalWidth: font.cacheWidth, originalHeight: font.cacheHeight };
  }

  // ----- render list -----
  renderListBegin() { this.list.length = 0; this.seq = 0; this.guiFloats = 0; this.fontFloats = 0; }
  submit(e: Omit<RenderListEntry, 'seq'>) { (e as RenderListEntry).seq = this.seq++; this.list.push(e as RenderListEntry); }

  // ----- render script commands -----
  clear(color: [number, number, number, number] | null, depth: number | null, stencil: number | null) {
    const gl = this.gl;
    let bits = 0;
    if (color) { gl.clearColor(color[0], color[1], color[2], color[3]); bits |= gl.COLOR_BUFFER_BIT; }
    if (depth !== null) { gl.clearDepth(depth); bits |= gl.DEPTH_BUFFER_BIT; }
    if (stencil !== null) { gl.clearStencil(stencil); bits |= gl.STENCIL_BUFFER_BIT; this.stencilCleared = true; }
    gl.clear(bits);
  }
  setViewport(x: number, y: number, w: number, h: number) { this.gl.viewport(x, y, w, h); }
  setDepthMask(b: boolean) { this.gl.depthMask(b); }
  setStencilMask(m: number) { this.gl.stencilMask(m); }
  enableState(s: number, on: boolean) { if (on) this.gl.enable(s); else this.gl.disable(s); }
  setBlendFunc(src: number, dst: number) { this.gl.blendFunc(this.blendEnum(src), this.blendEnum(dst)); }

  private blendEnum(b: number): number {
    const gl = this.gl;
    switch (b) {
      case BLEND_ZERO: return gl.ZERO;
      case BLEND_ONE: return gl.ONE;
      case BLEND_SRC_ALPHA: return gl.SRC_ALPHA;
      case BLEND_ONE_MINUS_SRC_ALPHA: return gl.ONE_MINUS_SRC_ALPHA;
      case BLEND_DST_COLOR: return gl.DST_COLOR;
    }
    return gl.ONE;
  }

  /** render.draw(predicate) for the "gui" tag: everything this port renders carries it. */
  drawRenderList() {
    // stable sort on (minor, major, order(24 bit), dispatch, batch key)
    const dispIdx = (d: string) => (d === 'gui' ? 0 : 1);
    const sorted = this.list.slice().sort((a, b) =>
      (a.minorOrder - b.minorOrder) || (a.majorOrder - b.majorOrder) || ((a.order & 0xffffff) - (b.order & 0xffffff)) ||
      (dispIdx(a.dispatch) - dispIdx(b.dispatch)) || a.seq - b.seq);
    const ros: RenderObject[] = [];
    // batch consecutive font entries with the same batch key directly into fontBuf
    let i = 0;
    while (i < sorted.length) {
      const e = sorted[i];
      if (e.dispatch === 'gui') { ros.push(e.ro!); i++; continue; }
      let j = i + 1;
      while (j < sorted.length && sorted[j].dispatch === 'font' && sorted[j].batchKey === e.batchKey && sorted[j].minorOrder === e.minorOrder) j++;
      const first = e.text!;
      const start = this.fontFloats / GLYPH_VERTEX_FLOATS;
      for (let k = i; k < j; k++) createFontVertexData(first.font, sorted[k].text!, this);
      const count = this.fontFloats / GLYPH_VERTEX_FLOATS - start;
      ros.push({
        program: 'font', vertexStart: start, vertexCount: count, primitive: this.gl.TRIANGLES,
        texture: first.font.texture, src: BLEND_ONE, dst: BLEND_ONE_MINUS_SRC_ALPHA,
        stencil: first.stencilSet ? first.stencil : null,
      });
      i = j;
    }

    const gl = this.gl;
    // Upload all GUI and font vertices for the frame in at most 2 bufferData calls.
    if (this.guiFloats > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
      gl.bufferData(gl.ARRAY_BUFFER, this.guiBuf.subarray(0, this.guiFloats), gl.STREAM_DRAW);
    }
    if (this.fontFloats > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.fontVbo);
      gl.bufferData(gl.ARRAY_BUFFER, this.fontBuf.subarray(0, this.fontFloats), gl.STREAM_DRAW);
    }

    gl.activeTexture(gl.TEXTURE0);
    let curProg: 'gui' | 'font' | null = null;
    let curTex: any = null;
    let curSrc = -1, curDst = -1;
    let curStencil: StencilTestParams | null = null;
    let enabledAttribs: number[] = [];

    const bindProgram = (kind: 'gui' | 'font') => {
      for (let k = 0; k < enabledAttribs.length; k++) gl.disableVertexAttribArray(enabledAttribs[k]);
      enabledAttribs = [];
      const p = this.programs[kind];
      gl.useProgram(p.prog);
      gl.uniformMatrix4fv(p.viewProj, false, this.viewProj);
      if (p.sampler) gl.uniform1i(p.sampler, 0);
      const attrib = (name: string, size: number, stride: number, offset: number) => {
        const loc = p.attribs[name];
        if (loc < 0) return;
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, offset * 4);
        enabledAttribs.push(loc);
      };
      if (kind === 'gui') {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        attrib('position', 3, GUI_STRIDE, 0);
        attrib('texcoord0', 2, GUI_STRIDE, 3);
        attrib('color', 4, GUI_STRIDE, 5);
      } else {
        const S = GLYPH_VERTEX_FLOATS;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.fontVbo);
        attrib('position', 4, S, 0);
        attrib('texcoord0', 2, S, 4);
        attrib('face_color', 4, S, 6);
        attrib('outline_color', 4, S, 10);
        attrib('shadow_color', 4, S, 14);
        attrib('sdf_params', 4, S, 18);
        attrib('layer_mask', 3, S, 22);
      }
      curProg = kind;
    };

    for (let r = 0; r < ros.length; r++) {
      const ro = ros[r];
      if (ro.vertexCount <= 0) continue;
      if (ro.program !== curProg) bindProgram(ro.program);
      if (ro.src !== curSrc || ro.dst !== curDst) {
        gl.blendFunc(this.blendEnum(ro.src), this.blendEnum(ro.dst));
        curSrc = ro.src; curDst = ro.dst;
      }
      const stp = ro.stencil;
      if (stp && (stp.clearBuffer || !curStencil || curStencil.func !== stp.func || curStencil.opSFail !== stp.opSFail ||
          curStencil.opDPFail !== stp.opDPFail || curStencil.opDPPass !== stp.opDPPass || curStencil.ref !== stp.ref ||
          curStencil.refMask !== stp.refMask || curStencil.bufferMask !== stp.bufferMask || curStencil.colorMask !== stp.colorMask)) {
        this.applyStencil(stp);
        curStencil = stp;
      }
      const tex = ro.texture ?? this.white;
      if (tex.handle !== curTex) {
        gl.bindTexture(gl.TEXTURE_2D, tex.handle);
        curTex = tex.handle;
      }
      gl.drawArrays(ro.primitive, ro.vertexStart, ro.vertexCount);
    }
    for (let k = 0; k < enabledAttribs.length; k++) gl.disableVertexAttribArray(enabledAttribs[k]);
  }

  setViewProj(m: M4) { for (let i = 0; i < 16; i++) this.viewProj[i] = m[i]; }

  private applyStencil(stp: StencilTestParams) {
    const gl = this.gl;
    if (stp.clearBuffer) {
      if (this.stencilCleared) {
        this.stencilCleared = false;
      } else {
        gl.stencilMask(0xff);
        gl.clearStencil(0);
        gl.clear(gl.STENCIL_BUFFER_BIT);
      }
    }
    gl.colorMask(!!(stp.colorMask & 8), !!(stp.colorMask & 4), !!(stp.colorMask & 2), !!(stp.colorMask & 1));
    gl.stencilMask(stp.bufferMask);
    gl.stencilFunc(stp.func === 'equal' ? gl.EQUAL : gl.ALWAYS, stp.ref, stp.refMask);
    const op = (o: string) => (o === 'replace' ? gl.REPLACE : gl.KEEP);
    gl.stencilOp(op(stp.opSFail), op(stp.opDPFail), op(stp.opDPPass));
  }
}

/** vectormath Matrix4::orthographic */
export function orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): M4 {
  const sumRL = f(right + left), sumTB = f(top + bottom), sumNF = f(near + far);
  const invRL = f(1 / f(right - left)), invTB = f(1 / f(top - bottom)), invNF = f(1 / f(near - far));
  const m = new Float64Array(16);
  m[0] = f(invRL + invRL);
  m[5] = f(invTB + invTB);
  m[10] = f(invNF + invNF);
  m[12] = f(f(-sumRL) * invRL);
  m[13] = f(f(-sumTB) * invTB);
  m[14] = f(sumNF * invNF);
  m[15] = 1;
  return m;
}

export type { StencilScope };
