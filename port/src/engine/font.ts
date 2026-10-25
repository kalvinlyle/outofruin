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

/** Decode like repeated dmUtf8::NextChar over the NUL-terminated byte string. */
export function decodeChars(text: string): number[] {
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

export function createFontVertexData(font: FontMap, te: TextEntry, out: number[]): number {
  const recipW = f(1 / font.cacheWidth), recipH = f(1 / font.cacheHeight);
  let width = te.width;
  if (!te.lineBreak) width = FLT_MAX;
  const lineHeight = f(font.maxAscent + font.maxDescent);
  const leading = f(lineHeight * te.leading);
  const tracking = f(lineHeight * te.tracking);
  const chars = decodeChars(te.text);
  const lines: TextLine[] = [];
  const lr = layout(chars, width, lines, 128, (s, n) => lineTextMetrics(font, tracking, chars, s, n));
  const lineCount = lr.count;
  const xOffset = offsetX(te.align, te.width);
  const yOffset = offsetY(te.valign, te.height, font.maxAscent, font.maxDescent, te.leading, lineCount);
  const face = unpackRGBA(te.faceColor), outline = unpackRGBA(te.outlineColor), shadow = unpackRGBA(te.shadowColor);
  const m = te.transform;
  const r0x = m[0], r0y = m[4];
  const sdfWorldScale = f(Math.sqrt(f(f(r0x * r0x) + f(r0y * r0y))));
  const sdfSmoothing = f(0.25 / f(font.sdfSpread * sdfWorldScale));
  const layerMask = font.layerMask;
  const hasOutline = (layerMask & 2) === 2, hasShadow = (layerMask & 4) === 4;
  const layerCount = 1 + (hasOutline ? 1 : 0) + (hasShadow ? 1 : 0);
  const pad = font.cachePadding;

  type V = number[];
  const faceVerts: V[] = [], outlineVerts: V[] = [], shadowVerts: V[] = [];
  const mk = (p: number[], u: number, v: number, mask: number[]): V =>
    [p[0], p[1], p[2], p[3], u, v, ...face, ...outline, ...shadow, f(0.75), font.sdfOutline, sdfSmoothing, font.sdfShadow, ...mask];

  for (let line = 0; line < lineCount; ++line) {
    const l = lines[line];
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
        const xr = f(f(x + g.leftBearing) + gw);
        const p1 = mulV4(m, xl, y - desc, 0, 1);
        const p2 = mulV4(m, xl, y + asc, 0, 1);
        const p3 = mulV4(m, xr, y - desc, 0, 1);
        const p6 = mulV4(m, xr, y + asc, 0, 1);
        const u0 = f((g.x + pad) * recipW), u1 = f((g.x + pad + gw) * recipW);
        const vBot = f((g.y + pad + asc + desc + cellOffY) * recipH), vTop = f((g.y + pad + cellOffY) * recipH);
        const one = layerCount > 1 ? 0 : 1;
        const fm = [1, one, one];
        const v1 = mk(p1, u0, vBot, fm), v2 = mk(p2, u0, vTop, fm), v3 = mk(p3, u1, vBot, fm), v6 = mk(p6, u1, vTop, fm);
        faceVerts.push(v1, v2, v3, v3, v2, v6);
        if (hasOutline) {
          const om = [0, 1, 0];
          const o = [v1, v2, v3, v3, v2, v6].map((v) => { const c2 = v.slice(); c2.splice(22, 3, ...om); return c2; });
          outlineVerts.push(...o);
        }
        if (hasShadow) {
          const sx = font.shadowX, sy = font.shadowY;
          const s1 = mulV4(m, f(xl + sx), f(f(y - desc) + sy), 0, 1);
          const s2 = mulV4(m, f(xl + sx), f(f(y + asc) + sy), 0, 1);
          const s3 = mulV4(m, f(f(f(x + g.leftBearing) + sx) + gw), f(f(y - desc) + sy), 0, 1);
          const s6 = mulV4(m, f(f(f(x + g.leftBearing) + sx) + gw), f(f(y + asc) + sy), 0, 1);
          const sm = [0, 0, 1];
          const w1 = mk(s1, u0, vBot, sm), w2 = mk(s2, u0, vTop, sm), w3 = mk(s3, u1, vBot, sm), w6 = mk(s6, u1, vTop, sm);
          shadowVerts.push(w1, w2, w3, w3, w2, w6);
        }
      }
      x += i16(f(g.advance + tracking));
      x = (x << 16) >> 16;
    }
  }
  // layers are written back to front: shadow, outline, face
  let count = 0;
  for (const arr of [shadowVerts, outlineVerts, faceVerts]) {
    for (const v of arr) { for (let k = 0; k < GLYPH_VERTEX_FLOATS; k++) out.push(v[k]); count++; }
  }
  return count;
}
