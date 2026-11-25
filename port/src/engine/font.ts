// Port of render/src/render/font_renderer.cpp (+ font_renderer_private.h): glyph
// metrics, line layout and glyph vertex generation, in float32 like the C++.
import { f, M4, mulV4 } from './math32';

export interface Glyph {
  character: number;
  width: number; advance: number; leftBearing: number;
  ascent: number; descent: number;
  /** cache cell origin in the glyph cache texture */
  x: number; y: number;
}

export const TEXT_ALIGN_LEFT = 0, TEXT_ALIGN_CENTER = 1, TEXT_ALIGN_RIGHT = 2;
export const TEXT_VALIGN_TOP = 0, TEXT_VALIGN_MIDDLE = 1, TEXT_VALIGN_BOTTOM = 2;

export class FontMap {
  path: string;
  glyphs = new Map<number, Glyph>();
  maxAscent: number; maxDescent: number;
  shadowX: number; shadowY: number;
  alpha: number; outlineAlpha: number; shadowAlpha: number;
  cacheWidth: number; cacheHeight: number;
  cacheCellWidth: number; cacheCellHeight: number; cacheCellMaxAscent: number; cachePadding: number;
  layerMask: number;
  glyphChannels: number;
  sdfOutline: number; sdfShadow: number; sdfSpread: number;
  material: string;
  /** GL texture handle assigned by the renderer */
  texture: any = null;
  image: ImageBitmap | null = null;

  constructor(d: any, image: ImageBitmap | null) {
    this.path = d.path;
    this.material = d.material;
    this.maxAscent = f(d.max_ascent); this.maxDescent = f(d.max_descent);
    this.shadowX = f(d.shadow_x ?? 0); this.shadowY = f(d.shadow_y ?? 0);
    this.alpha = f(d.alpha ?? 1); this.outlineAlpha = f(d.outline_alpha ?? 1); this.shadowAlpha = f(d.shadow_alpha ?? 1);
    this.cacheWidth = d.cache_width; this.cacheHeight = d.cache_height;
    this.cacheCellWidth = d.cache_cell_width; this.cacheCellHeight = d.cache_cell_height;
    this.cacheCellMaxAscent = d.cache_cell_max_ascent; this.cachePadding = d.glyph_padding ?? 0;
    this.layerMask = d.layer_mask ?? 1;
    this.glyphChannels = d.glyph_channels ?? 1;
    this.sdfOutline = f(d.sdf_outline ?? 0); this.sdfShadow = f(d.sdf_shadow ?? 0); this.sdfSpread = f(d.sdf_spread ?? 1);
    this.image = image;
    for (const g of d.glyphs ?? []) {
      this.glyphs.set(g.character, {
        character: g.character, width: g.width, advance: f(g.advance), leftBearing: f(g.left_bearing),
        ascent: g.ascent, descent: g.descent,
        x: g.cache_cell_x ?? 0, y: g.cache_cell_y ?? 0,
      });
    }
  }

  getGlyph(c: number): Glyph | undefined {
    return this.glyphs.get(c) ?? this.glyphs.get(126);
  }
}

// ---------- UTF-8 (dlib/utf8.cpp NextChar over the C string) ----------
const enc = new TextEncoder();
const OFFSETS = [0x00000000, 0x00003080, 0x000e2080, 0x03c82080, 0xfa082080, 0x82082080];
const decodeCache = new Map<string, number[]>();

/** Decode like repeated dmUtf8::NextChar over the NUL-terminated byte string. */
export function decodeChars(text: string): number[] {
  const cached = decodeCache.get(text);
  if (cached) return cached;
  const b = enc.encode(text);
  let end = b.indexOf(0);
  if (end < 0) end = b.length;
  const out: number[] = [];
  let i = 0;
  while (i < end) {
    let c = 0, n = 0;
    do {
      c = ((c << 6) >>> 0) + b[i];
      c >>>= 0;
      i++; n++;
    } while (i < end && (b[i] & 0xc0) === 0x80);
    c = (c - OFFSETS[n - 1]) >>> 0;
    out.push(c);
  }
  if (decodeCache.size > 2000) decodeCache.clear();
  decodeCache.set(text, out);
  return out;
}

class Cursor {
  constructor(public s: number[], public p: number) {}
  next(): number {
    if (this.p >= this.s.length) return 0;
    return this.s[this.p++];
  }
}

const ZWSP = 0x200b;
function isBreaking(c: number) { return c === 32 || c === 10 || c === ZWSP; }

export interface TextLine { width: number; index: number; count: number }

/** int16_t cast of a float (truncation, wrapping to 16 bits) */
function i16(v: number): number {
  const t = Math.trunc(v);
  return ((t << 16) >> 16);
}

export function lineTextMetrics(font: FontMap, tracking: number, chars: number[], start: number, n: number): number {
  let width = 0;
  let last: Glyph | undefined;
  let p = start;
  for (let i = 0; i < n; ++i) {
    const c = p < chars.length ? chars[p++] : 0;
    const g = font.getGlyph(c);
    if (!g) continue;
    last = g;
    width = f(width + i16(f(g.advance + tracking)));
  }
  if (n > 0 && last) {
    const lastEnd = f(last.leftBearing + last.width);
    const lastRb = f(last.advance - lastEnd);
    width = f(f(width - lastRb) - tracking);
  }
  return width;
}

const FLT_MAX = 3.4028234663852886e38;

export function layout(chars: number[], width: number, lines: TextLine[], linesCount: number,
                       metrics: (start: number, n: number) => number): { count: number; textWidth: number } {
  const cur = new Cursor(chars, 0);
  let maxWidth = 0;
  let l = 0;
  let c: number;
  do {
    let n = 0, lastN = 0;
    const rowStart = cur.p;
    let lastCursor = cur.p;
    let w = 0, lastW = 0;
    do {
      // NextBreak
      do {
        c = cur.next();
        if (c !== 0) n++;
      } while (c !== 0 && !isBreaking(c));
      if (n > 0) {
        const trim = c !== 0 ? 1 : 0;
        w = metrics(rowStart, n - trim);
        if (w <= width) {
          lastN = n - trim;
          lastW = w;
          lastCursor = cur.p;
          if (c !== 10) {
            // SkipWS
            do {
              c = cur.next();
              if (c !== 0) n++;
            } while (c !== 0 && (c === 32 || c === ZWSP));
          }
        } else if (lastN !== 0) {
          cur.p = lastCursor;
          c = lastCursor < chars.length ? chars[lastCursor] : 0;
        }
      }
    } while (w <= width && c !== 0 && c !== 10);
    if (w > width && lastN === 0) {
      const trim = c !== 0 ? 1 : 0;
      lastN = n - trim;
      lastW = w;
    }
    if (l < linesCount && (c !== 0 || lastN > 0)) {
      lines[l] = { width: lastW, index: rowStart, count: lastN };
      l++;
      maxWidth = Math.max(maxWidth, lastW);
    }
  } while (c);
  return { count: l, textWidth: maxWidth };
}

export function offsetX(align: number, width: number): number {
  switch (align) {
    case TEXT_ALIGN_CENTER: return f(width * 0.5);
    case TEXT_ALIGN_RIGHT: return width;
    default: return 0;
  }
}

export function offsetY(valign: number, height: number, ascent: number, descent: number, leading: number, lineCount: number): number {
  const lineHeight = f(ascent + descent);
  switch (valign) {
    case TEXT_VALIGN_MIDDLE: {
      const block = f(f(lineCount * f(lineHeight * leading)) - f(lineHeight * f(leading - 1)));
      return f(f(f(height * 0.5) + f(block * 0.5)) - ascent);
    }
    case TEXT_VALIGN_BOTTOM:
      return f(f(f(lineHeight * leading) * (lineCount - 1)) + descent);
    default:
      return f(height - ascent);
  }
}

export interface TextMetrics { width: number; height: number; max_ascent: number; max_descent: number }

export function getTextMetrics(font: FontMap, text: string, width: number, lineBreak: boolean, leading: number, tracking: number): TextMetrics {
  if (!lineBreak) width = FLT_MAX;
  const lineHeight = f(font.maxAscent + font.maxDescent);
  const tr = f(f(tracking) * lineHeight);
  const chars = decodeChars(text);
  const lines: TextLine[] = [];
  const r = layout(chars, f(width), lines, 128, (s, n) => lineTextMetrics(font, tr, chars, s, n));
  const ld = f(leading);
  return {
    width: r.textWidth,
    height: f(f(r.count * f(lineHeight * ld)) - f(lineHeight * f(ld - 1))),
    max_ascent: font.maxAscent,
    max_descent: font.maxDescent,
  };
}

// ---------- vertex generation ----------

export interface TextEntry {
  transform: M4;
  text: string;
  font: FontMap;
  faceColor: number; outlineColor: number; shadowColor: number; // packed RGBA
  width: number; height: number; leading: number; tracking: number;
  lineBreak: boolean; align: number; valign: number;
  stencil: any; stencilSet: boolean;
  batchKey: string;
}

/** dmGraphics::PackRGBA (truncating float->uint8) */
export function packRGBA(r: number, g: number, b: number, a: number): number {
  const q = (v: number) => (Math.trunc(f(v * 255)) & 0xff);
  return ((q(a) << 24) | (q(b) << 16) | (q(g) << 8) | q(r)) >>> 0;
}
export function unpackRGBA(c: number): [number, number, number, number] {
  return [f((c & 0xff) / 255), f(((c >>> 8) & 0xff) / 255), f(((c >>> 16) & 0xff) / 255), f(((c >>> 24) & 0xff) / 255)];
}

/** GlyphVertex: position(4) uv(2) face(4) outline(4) shadow(4) sdf(4) layer_mask(3) = 25 floats */
export const GLYPH_VERTEX_FLOATS = 25;

// Reusable scratch buffers for font vertex generation (avoid per-vertex JS arrays & GC).
let scratchFace = new Float32Array(25 * 6 * 256);
let scratchOutline = new Float32Array(25 * 6 * 256);
let scratchShadow = new Float32Array(25 * 6 * 256);
const scratchLines: TextLine[] = [];

function growF32(buf: Float32Array, need: number): Float32Array<ArrayBuffer> {
  let cap = buf.length;
  while (cap < need) cap *= 2;
  const next = new Float32Array(cap);
  next.set(buf);
  return next;
}

export interface FontVertexSink {
  allocFontFloats(count: number): { buf: Float32Array; offset: number };
}

export function createFontVertexData(font: FontMap, te: TextEntry, sink: FontVertexSink): number {
  const recipW = f(1 / font.cacheWidth), recipH = f(1 / font.cacheHeight);
  let width = te.width;
  if (!te.lineBreak) width = FLT_MAX;
  const lineHeight = f(font.maxAscent + font.maxDescent);
  const leading = f(lineHeight * te.leading);
  const tracking = f(lineHeight * te.tracking);
  const chars = decodeChars(te.text);
  const lr = layout(chars, width, scratchLines, 128, (s, n) => lineTextMetrics(font, tracking, chars, s, n));
  const lineCount = lr.count;
  const xOffset = offsetX(te.align, te.width);
  const yOffset = offsetY(te.valign, te.height, font.maxAscent, font.maxDescent, te.leading, lineCount);

  const fc = te.faceColor, oc = te.outlineColor, sc = te.shadowColor;
  const fr = f((fc & 0xff) / 255), fg = f(((fc >>> 8) & 0xff) / 255), fb = f(((fc >>> 16) & 0xff) / 255), fa = f(((fc >>> 24) & 0xff) / 255);
  const or_ = f((oc & 0xff) / 255), og = f(((oc >>> 8) & 0xff) / 255), ob = f(((oc >>> 16) & 0xff) / 255), oa = f(((oc >>> 24) & 0xff) / 255);
  const sr = f((sc & 0xff) / 255), sg = f(((sc >>> 8) & 0xff) / 255), sb = f(((sc >>> 16) & 0xff) / 255), sa = f(((sc >>> 24) & 0xff) / 255);

  const m = te.transform;
  const m0 = m[0], m1 = m[1], m2 = m[2], m3 = m[3];
  const m4 = m[4], m5 = m[5], m6 = m[6], m7 = m[7];
  const m12 = m[12], m13 = m[13], m14 = m[14], m15 = m[15];
  const sdfWorldScale = f(Math.sqrt(f(f(m0 * m0) + f(m4 * m4))));
  const sdfSmoothing = f(0.25 / f(font.sdfSpread * sdfWorldScale));
  const sdfEdge = f(0.75), sdfOutline = font.sdfOutline, sdfShadow = font.sdfShadow;
  const layerMask = font.layerMask;
  const hasOutline = (layerMask & 2) === 2, hasShadow = (layerMask & 4) === 4;
  const layerCount = 1 + (hasOutline ? 1 : 0) + (hasShadow ? 1 : 0);
  const fOne = layerCount > 1 ? 0 : 1;
  const pad = font.cachePadding;

  let faceLen = 0, outlineLen = 0, shadowLen = 0;

  const writeVert = (buf: Float32Array, off: number, px: number, py: number, pz: number, pw: number, u: number, v: number, lm0: number, lm1: number, lm2: number) => {
    buf[off] = px; buf[off + 1] = py; buf[off + 2] = pz; buf[off + 3] = pw;
    buf[off + 4] = u; buf[off + 5] = v;
    buf[off + 6] = fr; buf[off + 7] = fg; buf[off + 8] = fb; buf[off + 9] = fa;
    buf[off + 10] = or_; buf[off + 11] = og; buf[off + 12] = ob; buf[off + 13] = oa;
    buf[off + 14] = sr; buf[off + 15] = sg; buf[off + 16] = sb; buf[off + 17] = sa;
    buf[off + 18] = sdfEdge; buf[off + 19] = sdfOutline; buf[off + 20] = sdfSmoothing; buf[off + 21] = sdfShadow;
    buf[off + 22] = lm0; buf[off + 23] = lm1; buf[off + 24] = lm2;
  };

  for (let line = 0; line < lineCount; ++line) {
    const l = scratchLines[line];
    let x = i16(f(f(xOffset - offsetX(te.align, l.width)) + 0.5));
    const y = i16(f(f(yOffset - f(line * leading)) + 0.5));
    let p = l.index;
    for (let j = 0; j < l.count; ++j) {
      const c = p < chars.length ? chars[p++] : 0;
      const g = font.getGlyph(c);
      if (!g) continue;
      if (g.width > 0) {
        const gw = g.width, desc = g.descent, asc = g.ascent;
        const cellOffY = font.cacheCellMaxAscent - asc;
        const xl = f(x + g.leftBearing);
        const xr = f(xl + gw);
        const yBot = y - desc, yTop = y + asc;

        const p1x = f(f(f(m0 * xl) + f(m4 * yBot)) + m12), p1y = f(f(f(m1 * xl) + f(m5 * yBot)) + m13), p1z = f(f(f(m2 * xl) + f(m6 * yBot)) + m14), p1w = f(f(f(m3 * xl) + f(m7 * yBot)) + m15);
        const p2x = f(f(f(m0 * xl) + f(m4 * yTop)) + m12), p2y = f(f(f(m1 * xl) + f(m5 * yTop)) + m13), p2z = f(f(f(m2 * xl) + f(m6 * yTop)) + m14), p2w = f(f(f(m3 * xl) + f(m7 * yTop)) + m15);
        const p3x = f(f(f(m0 * xr) + f(m4 * yBot)) + m12), p3y = f(f(f(m1 * xr) + f(m5 * yBot)) + m13), p3z = f(f(f(m2 * xr) + f(m6 * yBot)) + m14), p3w = f(f(f(m3 * xr) + f(m7 * yBot)) + m15);
        const p6x = f(f(f(m0 * xr) + f(m4 * yTop)) + m12), p6y = f(f(f(m1 * xr) + f(m5 * yTop)) + m13), p6z = f(f(f(m2 * xr) + f(m6 * yTop)) + m14), p6w = f(f(f(m3 * xr) + f(m7 * yTop)) + m15);

        const u0 = f((g.x + pad) * recipW), u1 = f((g.x + pad + gw) * recipW);
        const vBot = f((g.y + pad + asc + desc + cellOffY) * recipH), vTop = f((g.y + pad + cellOffY) * recipH);

        if (faceLen + 150 > scratchFace.length) scratchFace = growF32(scratchFace, faceLen + 150);
        writeVert(scratchFace, faceLen,       p1x, p1y, p1z, p1w, u0, vBot, 1, fOne, fOne);
        writeVert(scratchFace, faceLen + 25,  p2x, p2y, p2z, p2w, u0, vTop, 1, fOne, fOne);
        writeVert(scratchFace, faceLen + 50,  p3x, p3y, p3z, p3w, u1, vBot, 1, fOne, fOne);
        writeVert(scratchFace, faceLen + 75,  p3x, p3y, p3z, p3w, u1, vBot, 1, fOne, fOne);
        writeVert(scratchFace, faceLen + 100, p2x, p2y, p2z, p2w, u0, vTop, 1, fOne, fOne);
        writeVert(scratchFace, faceLen + 125, p6x, p6y, p6z, p6w, u1, vTop, 1, fOne, fOne);
        faceLen += 150;

        if (hasOutline) {
          if (outlineLen + 150 > scratchOutline.length) scratchOutline = growF32(scratchOutline, outlineLen + 150);
          writeVert(scratchOutline, outlineLen,       p1x, p1y, p1z, p1w, u0, vBot, 0, 1, 0);
          writeVert(scratchOutline, outlineLen + 25,  p2x, p2y, p2z, p2w, u0, vTop, 0, 1, 0);
          writeVert(scratchOutline, outlineLen + 50,  p3x, p3y, p3z, p3w, u1, vBot, 0, 1, 0);
          writeVert(scratchOutline, outlineLen + 75,  p3x, p3y, p3z, p3w, u1, vBot, 0, 1, 0);
          writeVert(scratchOutline, outlineLen + 100, p2x, p2y, p2z, p2w, u0, vTop, 0, 1, 0);
          writeVert(scratchOutline, outlineLen + 125, p6x, p6y, p6z, p6w, u1, vTop, 0, 1, 0);
          outlineLen += 150;
        }
        if (hasShadow) {
          const sx = font.shadowX, sy = font.shadowY;
          const sxl = f(xl + sx), sxr = f(sxl + gw);
          const syBot = f(yBot + sy), syTop = f(yTop + sy);
          const s1x = f(f(f(m0 * sxl) + f(m4 * syBot)) + m12), s1y = f(f(f(m1 * sxl) + f(m5 * syBot)) + m13), s1z = f(f(f(m2 * sxl) + f(m6 * syBot)) + m14), s1w = f(f(f(m3 * sxl) + f(m7 * syBot)) + m15);
          const s2x = f(f(f(m0 * sxl) + f(m4 * syTop)) + m12), s2y = f(f(f(m1 * sxl) + f(m5 * syTop)) + m13), s2z = f(f(f(m2 * sxl) + f(m6 * syTop)) + m14), s2w = f(f(f(m3 * sxl) + f(m7 * syTop)) + m15);
          const s3x = f(f(f(m0 * sxr) + f(m4 * syBot)) + m12), s3y = f(f(f(m1 * sxr) + f(m5 * syBot)) + m13), s3z = f(f(f(m2 * sxr) + f(m6 * syBot)) + m14), s3w = f(f(f(m3 * sxr) + f(m7 * syBot)) + m15);
          const s6x = f(f(f(m0 * sxr) + f(m4 * syTop)) + m12), s6y = f(f(f(m1 * sxr) + f(m5 * syTop)) + m13), s6z = f(f(f(m2 * sxr) + f(m6 * syTop)) + m14), s6w = f(f(f(m3 * sxr) + f(m7 * syTop)) + m15);
          if (shadowLen + 150 > scratchShadow.length) scratchShadow = growF32(scratchShadow, shadowLen + 150);
          writeVert(scratchShadow, shadowLen,       s1x, s1y, s1z, s1w, u0, vBot, 0, 0, 1);
          writeVert(scratchShadow, shadowLen + 25,  s2x, s2y, s2z, s2w, u0, vTop, 0, 0, 1);
          writeVert(scratchShadow, shadowLen + 50,  s3x, s3y, s3z, s3w, u1, vBot, 0, 0, 1);
          writeVert(scratchShadow, shadowLen + 75,  s3x, s3y, s3z, s3w, u1, vBot, 0, 0, 1);
          writeVert(scratchShadow, shadowLen + 100, s2x, s2y, s2z, s2w, u0, vTop, 0, 0, 1);
          writeVert(scratchShadow, shadowLen + 125, s6x, s6y, s6z, s6w, u1, vTop, 0, 0, 1);
          shadowLen += 150;
        }
      }
      x += i16(f(g.advance + tracking));
      x = (x << 16) >> 16;
    }
  }
  const totalFloats = shadowLen + outlineLen + faceLen;
  if (totalFloats === 0) return 0;
  // layers are written back to front: shadow, outline, face
  const { buf, offset } = sink.allocFontFloats(totalFloats);
  let dst = offset;
  if (shadowLen > 0) { buf.set(scratchShadow.subarray(0, shadowLen), dst); dst += shadowLen; }
  if (outlineLen > 0) { buf.set(scratchOutline.subarray(0, outlineLen), dst); dst += outlineLen; }
  if (faceLen > 0) { buf.set(scratchFace.subarray(0, faceLen), dst); }
  return totalFloats / GLYPH_VERTEX_FLOATS;
}
