// Port of gamesys/components/comp_gui.cpp: scene setup from the SceneDesc,
// layouts, and conversion of rendered nodes into render objects.
import { f, M4 } from './math32';
import {
  Scene, GuiContext, AtlasRuntime, GLTex, StencilScope, RenderEntry, handleOf, getOptimalDisplayProfile,
  NODE_TYPE_BOX, NODE_TYPE_TEXT, NODE_TYPE_PIE, NODE_TYPE_TEMPLATE, NODE_TEXTURE_TYPE_TEXTURE_SET, NODE_TEXTURE_TYPE_TEXTURE,
  BLEND_MODE_ALPHA, BLEND_MODE_ADD, BLEND_MODE_ADD_ALPHA, BLEND_MODE_MULT, DEFAULT_LAYOUT,
  PROPERTY_POSITION, PROPERTY_ROTATION, PROPERTY_SCALE, PROPERTY_COLOR, PROPERTY_SIZE, PROPERTY_OUTLINE, PROPERTY_SHADOW,
  PROPERTY_SLICE9, PROPERTY_PIE_PARAMS, PIVOT_NW, PIVOT_N, PIVOT_NE, PIVOT_W, PIVOT_CENTER, PIVOT_E, PIVOT_SW, PIVOT_S, PIVOT_SE,
  PIEBOUNDS_RECTANGLE, InternalNode,
} from './gui_core';
import { FontMap, TextEntry, packRGBA, TEXT_ALIGN_LEFT, TEXT_ALIGN_CENTER, TEXT_ALIGN_RIGHT, TEXT_VALIGN_TOP, TEXT_VALIGN_MIDDLE, TEXT_VALIGN_BOTTOM } from './font';
import { Renderer, RenderObject, StencilTestParams, GUI_STRIDE, BLEND_ONE, BLEND_ONE_MINUS_SRC_ALPHA, BLEND_DST_COLOR } from './gl';
import { trigCos, trigSin } from './math32';

export interface GuiResources {
  atlases: Map<string, AtlasRuntime>;  // by resource path
  textures: Map<string, GLTex>;
  fonts: Map<string, FontMap>;
}

export class GuiComponent {
  scene: Scene;
  desc: any;
  enabled = true;
  addedToUpdate = false;
  instance: any;
  id: string;
  constructor(scene: Scene, desc: any, instance: any, id: string) {
    this.scene = scene; this.desc = desc; this.instance = instance; this.id = id;
  }
}

/** SetNode: apply a NodeDesc to a node (used at creation and on layout change). */
export function setNode(scene: Scene, h: number, d: any): boolean {
  let result = true;
  const n = scene.getNode(h);
  n.setProp(PROPERTY_POSITION, [d.position[0], d.position[1], d.position[2], 1]);
  n.dirtyLocal = true;
  n.setProp(PROPERTY_ROTATION, d.rotation);
  n.setProp(PROPERTY_SCALE, d.scale);
  n.setProp(PROPERTY_COLOR, [d.color[0], d.color[1], d.color[2], d.alpha]);
  n.setProp(PROPERTY_SIZE, d.size);
  n.setProp(PROPERTY_OUTLINE, [d.outline[0], d.outline[1], d.outline[2], d.outline_alpha]);
  n.setProp(PROPERTY_SHADOW, [d.shadow[0], d.shadow[1], d.shadow[2], d.shadow_alpha]);
  n.setProp(PROPERTY_SLICE9, d.slice9);
  scene.setNodeSizeMode(h, d.size_mode);
  if (d.texture) {
    const slash = d.texture.indexOf('/');
    const tex = slash >= 0 ? d.texture.slice(0, slash) : d.texture;
    const anim = slash >= 0 ? d.texture.slice(slash + 1) : null;
    if (!scene.setNodeTexture(h, tex)) {
      console.error(`The texture '${tex}' could not be set for '${d.id || 'unnamed'}'.`);
      result = false;
    }
    if (anim !== null) {
      if (scene.playNodeFlipbookAnim(h, anim, 0, 1) !== 0) {
        console.error(`The texture animation '${anim}' in texture '${tex}' could not be set for '${d.id || 'unnamed'}'.`);
        result = false;
      }
    }
  } else {
    scene.setNodeTexture(h, '');
  }
  if (d.layer) {
    if (!scene.setNodeLayer(h, d.layer)) {
      console.error(`The layer '${d.layer}' could not be set for the '${d.id || 'unnamed'}'.`);
      scene.setNodeLayer(h, '');
    }
  } else {
    scene.setNodeLayer(h, '');
  }
  let blend = d.blend_mode;
  if (blend === BLEND_MODE_ADD_ALPHA) blend = BLEND_MODE_ADD;
  n.blendMode = blend;
  n.pivot = d.pivot;
  n.xAnchor = d.xanchor;
  n.yAnchor = d.yanchor;
  n.adjustMode = d.adjust_mode;
  n.inheritAlpha = !!d.inherit_alpha;
  n.clippingMode = d.clipping_mode;
  n.clippingVisible = !!d.clipping_visible;
  n.clippingInverted = !!d.clipping_inverted;
  if (d.spine_node_child) n.isBone = true;
  switch (d.type) {
    case NODE_TYPE_TEXT:
      n.text = d.text;
      scene.setNodeFont(h, d.font);
      n.lineBreak = !!d.line_break;
      n.p[9 * 4] = d.text_leading;
      n.p[9 * 4 + 1] = d.text_tracking;
      break;
    case NODE_TYPE_PIE:
      n.perimeterVertices = d.perimeterVertices;
      n.p[PROPERTY_PIE_PARAMS * 4] = d.innerRadius;
      n.outerBounds = d.outerBounds;
      n.p[PROPERTY_PIE_PARAMS * 4 + 1] = d.pieFillAngle;
      break;
    case NODE_TYPE_TEMPLATE:
      console.error(`Template nodes are not supported in run-time '${d.id || 'unnamed'}'`);
      result = false;
      break;
  }
  scene.setNodeResetPoint(h);
  return result;
}

const setNodeCallback = (s: Scene, h: number, d: any) => { setNode(s, h, d); };

export interface LayoutChangedSink { (scene: Scene, id: string, previous: string): void }
let layoutChangedSink: LayoutChangedSink | null = null;
export function setLayoutChangedSink(fn: LayoutChangedSink) { layoutChangedSink = fn; }

function onWindowResize(scene: Scene, width: number, height: number) {
  const layouts = scene.layouts.slice();
  const id = getOptimalDisplayProfile(scene.context.displayProfiles, width, height, scene.context.dpi, layouts) ?? DEFAULT_LAYOUT;
  if (id !== scene.layoutId) {
    const cur = scene.layoutId;
    const prof = scene.context.displayProfiles.find((p) => p.name === id);
    if (prof && prof.qualifiers.length) { scene.width = prof.qualifiers[0].width; scene.height = prof.qualifiers[0].height; scene.resChanged = true; }
    scene.setLayout(id, setNodeCallback);
    layoutChangedSink?.(scene, id, cur);
  }
}

/** SetupGuiScene */
export function setupGuiScene(scene: Scene, desc: any, res: GuiResources): boolean {
  let result = true;
  scene.adjustReference = desc.adjust_reference;
  for (const [name, path] of Object.entries<string>(desc.fonts)) {
    const fm = res.fonts.get(path);
    if (fm) {
      if (!scene.defaultFont) scene.defaultFont = fm; // dmGui::AddFont: the first font is the scene default
      scene.fonts.set(name, fm);
    } else console.error(`Unable to add font '${name}'`);
  }
  for (const [name, path] of Object.entries<string>(desc.textures)) {
    const atlas = res.atlases.get(path);
    if (atlas) {
      scene.textures.set(name, { source: atlas, type: NODE_TEXTURE_TYPE_TEXTURE_SET, origW: atlas.texture.originalWidth, origH: atlas.texture.originalHeight });
    } else {
      const tex = res.textures.get(path.replace(/\.texturesetc$/, '.texturec'));
      if (tex) scene.textures.set(name, { source: tex, type: NODE_TEXTURE_TYPE_TEXTURE, origW: tex.originalWidth, origH: tex.originalHeight });
      else console.error(`Unable to add texture '${name}' (${path})`);
    }
  }
  for (const l of desc.layers) scene.addLayer(l);
  const layoutsCount = desc.layouts.length;
  if (layoutsCount !== 0) {
    for (const l of desc.layouts) scene.layouts.push(l.name);
  }
  for (const nd of desc.nodes) {
    const h = scene.newNode(nd.position, nd.size, nd.type);
    if (nd.id) scene.getNode(h).nameHash = nd.id;
    if (!setNode(scene, h, nd)) return false;
    if (layoutsCount !== 0) {
      const n = scene.getNode(h);
      n.nodeDescTable = new Array(layoutsCount + 1).fill(nd);
    }
  }
  for (const nd of desc.nodes) {
    const h = scene.getNodeById(nd.id);
    let p = 0;
    if (nd.parent) {
      p = scene.getNodeById(nd.parent);
      if (p === 0) { console.error(`The parent '${nd.parent}' could not be found in the scene.`); result = false; }
    }
    scene.setNodeParent(h, p, false);
  }
  if (layoutsCount !== 0) {
    for (const l of desc.layouts) {
      const li = scene.getLayoutIndex(l.name);
      for (const nd of l.nodes) {
        const h = scene.getNodeById(nd.id);
        if (h) scene.getNode(h).nodeDescTable![li] = nd;
        else console.error(`The default node for '${nd.id}' could not be found in the scene.`);
      }
    }
    const ctx = scene.context;
    const id = getOptimalDisplayProfile(ctx.displayProfiles, ctx.physicalWidth, ctx.physicalHeight, 0, scene.layouts.slice()) ?? DEFAULT_LAYOUT;
    if (id !== DEFAULT_LAYOUT) {
      const prof = ctx.displayProfiles.find((p) => p.name === id)!;
      scene.width = prof.qualifiers[0].width; scene.height = prof.qualifiers[0].height; scene.resChanged = true;
      scene.setLayout(id, setNodeCallback);
    }
  }
  scene.onWindowResize = onWindowResize;
  return result;
}

// ---------------- rendering ----------------

interface RenderCtx {
  renderer: Renderer;
  nextSortOrder: number;
  firstStencil: boolean;
  roIndex: number;
}

function stencilParams(ctx: RenderCtx, s: StencilScope | null): StencilTestParams {
  if (s) {
    const p: StencilTestParams = { func: 'equal', opSFail: 'keep', opDPFail: 'replace', opDPPass: 'replace', ref: s.refVal, refMask: s.testMask, bufferMask: s.writeMask, colorMask: s.colorMask, clearBuffer: false };
    if (ctx.firstStencil) { ctx.firstStencil = false; p.clearBuffer = true; }
    return p;
  }
  return { func: 'always', opSFail: 'keep', opDPFail: 'keep', opDPPass: 'keep', ref: 0, refMask: 0xff, bufferMask: 0xff, colorMask: 0xf, clearBuffer: false };
}

function blendFactors(mode: number): [number, number] {
  switch (mode) {
    case BLEND_MODE_ALPHA: return [BLEND_ONE, BLEND_ONE_MINUS_SRC_ALPHA];
    case BLEND_MODE_ADD: case BLEND_MODE_ADD_ALPHA: return [BLEND_ONE, BLEND_ONE];
    case BLEND_MODE_MULT: return [BLEND_DST_COLOR, BLEND_ONE_MINUS_SRC_ALPHA];
  }
  return [BLEND_ONE, BLEND_ONE_MINUS_SRC_ALPHA];
}

function nodeGLTexture(n: InternalNode): GLTex | null {
  if (!n.texture) return null;
  if (n.textureType === NODE_TEXTURE_TYPE_TEXTURE_SET) return (n.texture as AtlasRuntime).texture;
  return n.texture as GLTex;
}

function finalOrder(sceneOrder: number, sub: number) { return ((sceneOrder << 16) + sub) >>> 0; }

const s9px = new Float32Array(16), s9py = new Float32Array(16), s9pz = new Float32Array(16);
const s9us = new Float32Array(4), s9vs = new Float32Array(4), s9xs = new Float32Array(4), s9ys = new Float32Array(4);
let pieScratch = new Float32Array(GUI_STRIDE * 256);

function writeGuiVert(buf: Float32Array, off: number, px: number, py: number, pz: number, u: number, vv: number, cr: number, cg: number, cb: number, ca: number) {
  buf[off] = px; buf[off + 1] = py; buf[off + 2] = pz;
  buf[off + 3] = u; buf[off + 4] = vv;
  buf[off + 5] = cr; buf[off + 6] = cg; buf[off + 7] = cb; buf[off + 8] = ca;
}

function renderBoxNodes(scene: Scene, ctx: RenderCtx, entries: RenderEntry[], transforms: M4[], opacities: number[], scopes: (StencilScope | null)[], start: number, count: number) {
  const first = scene.getNode(entries[start].node);
  const sortOrder = ctx.nextSortOrder++;
  const [src, dst] = blendFactors(first.blendMode);
  const stencil = stencilParams(ctx, scopes[start]);
  const tex = nodeGLTexture(first) ?? ctx.renderer.white;
  const atlas = first.textureType === NODE_TEXTURE_TYPE_TEXTURE_SET && first.animDesc.texCoords ? first.animDesc.textureSet : null;
  const useGeometries = !!atlas && atlas.geometries.length > 0;
  const orgW = f(tex.originalWidth), orgH = f(tex.originalHeight);

  // Pre-count exact vertices for the batch so we do one allocation in renderer.guiBuf.
  let vertCount = 0;
  for (let i = start; i < start + count; i++) {
    const n = scene.getNode(entries[i].node);
    if (n.isBone) continue;
    const useSlice9 = f(f(f(n.p[28] + n.p[29]) + n.p[30]) + n.p[31]) !== 0;
    if (!useSlice9 && useGeometries) {
      const frame = atlas!.frameIndices[scene.getNodeAnimationFrame(n)];
      const geo = atlas!.geometries[frame];
      if (geo) vertCount += geo.indices.length;
    } else if (!useSlice9) {
      vertCount += 6;
    } else {
      vertCount += 54;
    }
  }

  const vertexStart = ctx.renderer.guiFloats / GUI_STRIDE;
  if (vertCount > 0) {
    const { buf, offset } = ctx.renderer.allocGuiFloats(vertCount * GUI_STRIDE);
    let out = offset;
    const su = f(1 / orgW), sv = f(1 / orgH);
    const s9min = 0.001;

    for (let i = start; i < start + count; i++) {
      const n = scene.getNode(entries[i].node);
      if (n.isBone) continue;
      const cr = n.p[12], cg = n.p[13], cb = n.p[14], ca = opacities[i];
      const s90 = n.p[28], s91 = n.p[29], s92 = n.p[30], s93 = n.p[31];
      const useSlice9 = f(f(f(s90 + s91) + s92) + s93) !== 0;
      const w = transforms[i];
      const w0 = w[0], w1 = w[1], w2 = w[2], w4 = w[4], w5 = w[5], w6 = w[6], w12 = w[12], w13 = w[13], w14 = w[14];

      if (!useSlice9 && useGeometries) {
        let frame = scene.getNodeAnimationFrame(n);
        frame = atlas!.frameIndices[frame];
        const geo = atlas!.geometries[frame];
        if (!geo) continue;
        const numPoints = geo.vertices.length / 2;
        const flipU = n.animDesc.flipH, flipV = n.animDesc.flipV;
        const reverse = (flipU ? 1 : 0) ^ (flipV ? 1 : 0);
        const scX = flipU ? -1 : 1, scY = flipV ? -1 : 1;
        const indices = geo.indices, verts = geo.vertices, uvs = geo.uvs;
        for (let k = 0; k < indices.length; k++) {
          const idx0 = indices[k];
          const idx = reverse ? numPoints - idx0 - 1 : idx0;
          const x = f(f(verts[idx * 2] * scX) + 0.5);
          const y = f(f(verts[idx * 2 + 1] * scY) + 0.5);
          const px = f(f(f(w0 * x) + f(w4 * y)) + w12);
          const py = f(f(f(w1 * x) + f(w5 * y)) + w13);
          const pz = f(f(f(w2 * x) + f(w6 * y)) + w14);
          writeGuiVert(buf, out, px, py, pz, uvs[idx * 2], uvs[idx * 2 + 1], cr, cg, cb, ca);
          out += GUI_STRIDE;
        }
        continue;
      }

      if (!useSlice9) {
        // Plain quad: 2 triangles (6 vertices) — identical pixels to the non-degenerate center cell of 9-slice.
        let u00: number, v00: number, u10: number, v10: number, u01: number, v01: number, u11: number, v11: number;
        const off = scene.getFlipbookUVOffset(n);
        if (off >= 0) {
          const tc = n.animDesc.texCoords!;
          const t0 = tc[off], t1 = tc[off + 1], t2 = tc[off + 2], t3 = tc[off + 3], t4 = tc[off + 4], t5 = tc[off + 5];
          const uvRotated = t0 !== t2 && t3 !== t5;
          const fu = n.animDesc.flipH, fv = n.animDesc.flipV;
          if (uvRotated) {
            const ua = fv ? t2 : t0, ub = fv ? t0 : t2;
            const va = fu ? t5 : t1, vb = fu ? t1 : t5;
            u00 = ua; v00 = va; u10 = ua; v10 = vb; u01 = ub; v01 = va; u11 = ub; v11 = vb;
          } else {
            const ua = fu ? t4 : t0, ub = fu ? t0 : t4;
            const va = fv ? t3 : t1, vb = fv ? t1 : t3;
            u00 = ua; v00 = va; u10 = ub; v10 = va; u01 = ua; v01 = vb; u11 = ub; v11 = vb;
          }
        } else {
          u00 = 0; v00 = 0; u10 = 1; v10 = 0; u01 = 0; v01 = 1; u11 = 1; v11 = 1;
        }
        // (0,0), (1,0), (1,1), (0,1)
        const p00x = w12, p00y = w13, p00z = w14;
        const p10x = f(w0 + w12), p10y = f(w1 + w13), p10z = f(w2 + w14);
        const p01x = f(w4 + w12), p01y = f(w5 + w13), p01z = f(w6 + w14);
        const p11x = f(f(w0 + w4) + w12), p11y = f(f(w1 + w5) + w13), p11z = f(f(w2 + w6) + w14);
        writeGuiVert(buf, out, p00x, p00y, p00z, u00, v00, cr, cg, cb, ca); out += GUI_STRIDE;
        writeGuiVert(buf, out, p10x, p10y, p10z, u10, v10, cr, cg, cb, ca); out += GUI_STRIDE;
        writeGuiVert(buf, out, p11x, p11y, p11z, u11, v11, cr, cg, cb, ca); out += GUI_STRIDE;
        writeGuiVert(buf, out, p00x, p00y, p00z, u00, v00, cr, cg, cb, ca); out += GUI_STRIDE;
        writeGuiVert(buf, out, p11x, p11y, p11z, u11, v11, cr, cg, cb, ca); out += GUI_STRIDE;
        writeGuiVert(buf, out, p01x, p01y, p01z, u01, v01, cr, cg, cb, ca); out += GUI_STRIDE;
        continue;
      }

      const sizeX = n.p[16], sizeY = n.p[17];
      const sx = sizeX > s9min ? f(1 / sizeX) : 0;
      const sy = sizeY > s9min ? f(1 / sizeY) : 0;
      let uvRotated = false;
      const off = scene.getFlipbookUVOffset(n);
      if (off >= 0) {
        const tc = n.animDesc.texCoords!;
        const t0 = tc[off], t1 = tc[off + 1], t2 = tc[off + 2], t3 = tc[off + 3], t4 = tc[off + 4], t5 = tc[off + 5];
        uvRotated = t0 !== t2 && t3 !== t5;
        const fu = n.animDesc.flipH, fv = n.animDesc.flipV;
        if (uvRotated) {
          const u0 = t0, u1 = f(t0 + f(su * s93)), u2 = f(t2 - f(su * s91)), u3 = t2;
          const v0 = t1, v1 = f(t1 - f(sv * s90)), v2 = f(t5 + f(sv * s92)), v3 = t5;
          if (fv) { s9us[3] = u0; s9us[2] = u1; s9us[1] = u2; s9us[0] = u3; }
          else { s9us[0] = u0; s9us[1] = u1; s9us[2] = u2; s9us[3] = u3; }
          if (fu) { s9vs[3] = v0; s9vs[2] = v1; s9vs[1] = v2; s9vs[0] = v3; }
          else { s9vs[0] = v0; s9vs[1] = v1; s9vs[2] = v2; s9vs[3] = v3; }
        } else {
          const u0 = t0, u1 = f(t0 + f(su * s90)), u2 = f(t4 - f(su * s92)), u3 = t4;
          const v0 = t1, v1 = f(t1 + f(sv * s93)), v2 = f(t3 - f(sv * s91)), v3 = t3;
          if (fu) { s9us[3] = u0; s9us[2] = u1; s9us[1] = u2; s9us[0] = u3; }
          else { s9us[0] = u0; s9us[1] = u1; s9us[2] = u2; s9us[3] = u3; }
          if (fv) { s9vs[3] = v0; s9vs[2] = v1; s9vs[1] = v2; s9vs[0] = v3; }
          else { s9vs[0] = v0; s9vs[1] = v1; s9vs[2] = v2; s9vs[3] = v3; }
        }
      } else {
        s9us[0] = 0; s9us[1] = f(su * s90); s9us[2] = f(1 - f(su * s92)); s9us[3] = 1;
        s9vs[0] = 0; s9vs[1] = f(sv * s93); s9vs[2] = f(1 - f(sv * s91)); s9vs[3] = 1;
      }
      s9xs[0] = 0; s9xs[1] = f(sx * s90); s9xs[2] = f(1 - f(sx * s92)); s9xs[3] = 1;
      s9ys[0] = 0; s9ys[1] = f(sy * s93); s9ys[2] = f(1 - f(sy * s91)); s9ys[3] = 1;
      for (let y = 0; y < 4; y++) {
        const yy = s9ys[y];
        const w4y = f(w4 * yy), w5y = f(w5 * yy), w6y = f(w6 * yy);
        const row = y * 4;
        for (let x = 0; x < 4; x++) {
          const xx = s9xs[x];
          s9px[row + x] = f(f(f(w0 * xx) + w4y) + w12);
          s9py[row + x] = f(f(f(w1 * xx) + w5y) + w13);
          s9pz[row + x] = f(f(f(w2 * xx) + w6y) + w14);
        }
      }
      for (let y = 0; y < 3; y++) {
        const y0 = y, y1 = y + 1, r0 = y0 * 4, r1 = y1 * 4;
        for (let x = 0; x < 3; x++) {
          const x0 = x, x1 = x + 1;
          let u00: number, v00: number, u10: number, v10: number, u01: number, v01: number, u11: number, v11: number;
          if (uvRotated) {
            u00 = s9us[y0]; v00 = s9vs[x0]; u10 = s9us[y0]; v10 = s9vs[x1];
            u01 = s9us[y1]; v01 = s9vs[x0]; u11 = s9us[y1]; v11 = s9vs[x1];
          } else {
            u00 = s9us[x0]; v00 = s9vs[y0]; u10 = s9us[x1]; v10 = s9vs[y0];
            u01 = s9us[x0]; v01 = s9vs[y1]; u11 = s9us[x1]; v11 = s9vs[y1];
          }
          const i00 = r0 + x0, i10 = r0 + x1, i01 = r1 + x0, i11 = r1 + x1;
          writeGuiVert(buf, out, s9px[i00], s9py[i00], s9pz[i00], u00, v00, cr, cg, cb, ca); out += GUI_STRIDE;
          writeGuiVert(buf, out, s9px[i10], s9py[i10], s9pz[i10], u10, v10, cr, cg, cb, ca); out += GUI_STRIDE;
          writeGuiVert(buf, out, s9px[i11], s9py[i11], s9pz[i11], u11, v11, cr, cg, cb, ca); out += GUI_STRIDE;
          writeGuiVert(buf, out, s9px[i00], s9py[i00], s9pz[i00], u00, v00, cr, cg, cb, ca); out += GUI_STRIDE;
          writeGuiVert(buf, out, s9px[i11], s9py[i11], s9pz[i11], u11, v11, cr, cg, cb, ca); out += GUI_STRIDE;
          writeGuiVert(buf, out, s9px[i01], s9py[i01], s9pz[i01], u01, v01, cr, cg, cb, ca); out += GUI_STRIDE;
        }
      }
    }
  }
  const ro: RenderObject = { program: 'gui', vertexStart, vertexCount: vertCount, primitive: ctx.renderer.gl.TRIANGLES, texture: tex, src, dst, stencil };
  ctx.renderer.submit({ majorOrder: 1, minorOrder: 0, order: finalOrder(scene.renderOrder, sortOrder), dispatch: 'gui', batchKey: 'ro' + ctx.roIndex++, ro });
}

function renderPieNodes(scene: Scene, ctx: RenderCtx, entries: RenderEntry[], transforms: M4[], opacities: number[], scopes: (StencilScope | null)[], start: number, count: number) {
  const first = scene.getNode(entries[start].node);
  const sortOrder = ctx.nextSortOrder++;
  const stencil = stencilParams(ctx, scopes[start]);
  const [src, dst] = blendFactors(first.blendMode);
  const tex = nodeGLTexture(first) ?? ctx.renderer.white;
  let total = 0;
  let out = 0;
  const PI = f(3.1415926535);
  const ensurePie = (extraVerts: number) => {
    const need = out + extraVerts * GUI_STRIDE;
    if (need > pieScratch.length) {
      let cap = pieScratch.length;
      while (cap < need) cap *= 2;
      const next = new Float32Array(cap);
      next.set(pieScratch.subarray(0, out));
      pieScratch = next;
    }
  };
  for (let i = start; i < start + count; i++) {
    const n = scene.getNode(entries[i].node);
    const sizeX = n.p[16];
    if (n.isBone || Math.abs(sizeX) < 0.001) continue;
    const cr = n.p[12], cg = n.p[13], cb = n.p[14], ca = opacities[i];
    const perim = Math.max(4, n.perimeterVertices);
    const innerMul = f(n.p[32] / sizeX);
    const ad = f(f(PI * 2) / perim);
    let stopAngle = n.p[33];
    let backwards = false;
    if (stopAngle < 0) { stopAngle = -stopAngle; backwards = true; }
    stopAngle = f(f(f(Math.min(360, stopAngle)) * PI) / 180);
    const generate = Math.floor(f(f(stopAngle / ad) + 0.999)) + 1;
    let lastAngle = 0, nextCorner = f(0.25 * PI), firstV = true;
    let u0: number, su: number, v0: number, sv: number, uvRot = false;
    const off = scene.getFlipbookUVOffset(n);
    if (off >= 0) {
      const tc = n.animDesc.texCoords!;
      const t = (k: number) => tc[off + k];
      const fu = n.animDesc.flipH, fv = n.animDesc.flipV;
      uvRot = t(0) !== t(2) && t(3) !== t(5);
      if (uvRot ? fv : fu) { su = f(-f(t(4) - t(0))); u0 = f(t(0) - su); } else { u0 = t(0); su = f(t(4) - u0); }
      const v0i = uvRot ? 1 : 3, v1i = uvRot ? 5 : 1;
      if (uvRot ? fu : fv) { sv = f(-f(t(v1i) - t(v0i))); v0 = f(t(v0i) - sv); } else { v0 = t(v0i); sv = f(t(v1i) - v0); }
    } else { u0 = 0; su = 1; v0 = 1; sv = -1; }
    const w = transforms[i];
    const w0 = w[0], w1 = w[1], w2 = w[2], w4 = w[4], w5 = w[5], w6 = w[6], w12 = w[12], w13 = w[13], w14 = w[14];
    for (let j = 0; j !== generate; j++) {
      let a = j === generate - 1 ? stopAngle : f(ad * j);
      if (n.outerBounds === PIEBOUNDS_RECTANGLE) {
        if (lastAngle < nextCorner && a >= nextCorner) { a = nextCorner; nextCorner = f(nextCorner + f(0.5 * PI)); --j; }
        lastAngle = a;
      }
      const s = trigSin(backwards ? -a : a), c = trigCos(backwards ? -a : a);
      let uu = f(0.5 + f(innerMul * c)), vv = f(0.5 + f(innerMul * s));
      const pInX = f(f(f(w0 * uu) + f(w4 * vv)) + w12), pInY = f(f(f(w1 * uu) + f(w5 * vv)) + w13), pInZ = f(f(f(w2 * uu) + f(w6 * vv)) + w14);
      const inU = f(u0 + f((uvRot ? vv : uu) * su)), inV = f(v0 + f((uvRot ? uu : f(1 - vv)) * sv));
      const d = n.outerBounds === PIEBOUNDS_RECTANGLE ? f(0.5 / Math.max(Math.abs(s), Math.abs(c))) : 0.5;
      uu = f(0.5 + f(d * c)); vv = f(0.5 + f(d * s));
      const pOutX = f(f(f(w0 * uu) + f(w4 * vv)) + w12), pOutY = f(f(f(w1 * uu) + f(w5 * vv)) + w13), pOutZ = f(f(f(w2 * uu) + f(w6 * vv)) + w14);
      const outU = f(u0 + f((uvRot ? vv : uu) * su)), outV = f(v0 + f((uvRot ? uu : f(1 - vv)) * sv));
      ensurePie(4);
      if (firstV) { writeGuiVert(pieScratch, out, pInX, pInY, pInZ, inU, inV, cr, cg, cb, ca); out += GUI_STRIDE; total++; firstV = false; }
      writeGuiVert(pieScratch, out, pInX, pInY, pInZ, inU, inV, cr, cg, cb, ca); out += GUI_STRIDE;
      writeGuiVert(pieScratch, out, pOutX, pOutY, pOutZ, outU, outV, cr, cg, cb, ca); out += GUI_STRIDE;
      total += 2;
      if (j === generate - 1) { writeGuiVert(pieScratch, out, pOutX, pOutY, pOutZ, outU, outV, cr, cg, cb, ca); out += GUI_STRIDE; total++; }
    }
  }
  const vertexStart = ctx.renderer.guiFloats / GUI_STRIDE;
  if (total > 0) {
    const { buf, offset } = ctx.renderer.allocGuiFloats(out);
    buf.set(pieScratch.subarray(0, out), offset);
  }
  const ro: RenderObject = { program: 'gui', vertexStart, vertexCount: total, primitive: ctx.renderer.gl.TRIANGLE_STRIP, texture: tex, src, dst, stencil };
  ctx.renderer.submit({ majorOrder: 1, minorOrder: 0, order: finalOrder(scene.renderOrder, sortOrder), dispatch: 'gui', batchKey: 'ro' + ctx.roIndex++, ro });
}

const PIVOT_ALIGN: Record<number, [number, number]> = {
  [PIVOT_NW]: [TEXT_ALIGN_LEFT, TEXT_VALIGN_TOP], [PIVOT_N]: [TEXT_ALIGN_CENTER, TEXT_VALIGN_TOP], [PIVOT_NE]: [TEXT_ALIGN_RIGHT, TEXT_VALIGN_TOP],
  [PIVOT_W]: [TEXT_ALIGN_LEFT, TEXT_VALIGN_MIDDLE], [PIVOT_CENTER]: [TEXT_ALIGN_CENTER, TEXT_VALIGN_MIDDLE], [PIVOT_E]: [TEXT_ALIGN_RIGHT, TEXT_VALIGN_MIDDLE],
  [PIVOT_SW]: [TEXT_ALIGN_LEFT, TEXT_VALIGN_BOTTOM], [PIVOT_S]: [TEXT_ALIGN_CENTER, TEXT_VALIGN_BOTTOM], [PIVOT_SE]: [TEXT_ALIGN_RIGHT, TEXT_VALIGN_BOTTOM],
};

function renderTextNodes(scene: Scene, ctx: RenderCtx, entries: RenderEntry[], transforms: M4[], opacities: number[], scopes: (StencilScope | null)[], start: number, count: number) {
  const tes: TextEntry[] = [];
  for (let i = start; i < start + count; i++) {
    const n = scene.getNode(entries[i].node);
    if (n.isBone) continue;
    const font = n.font;
    const opacity = opacities[i];
    const stp = stencilParams(ctx, scopes[i]);
    if (!font) continue;
    const [align, valign] = PIVOT_ALIGN[n.pivot] ?? [TEXT_ALIGN_CENTER, TEXT_VALIGN_MIDDLE];
    const text = n.text ?? '';
    tes.push({
      transform: transforms[i], text, font,
      faceColor: packRGBA(n.p[12], n.p[13], n.p[14], f(opacity * font.alpha)),
      outlineColor: packRGBA(n.p[20], n.p[21], n.p[22], f(f(n.p[23] * opacity) * font.outlineAlpha)),
      shadowColor: packRGBA(n.p[24], n.p[25], n.p[26], f(f(n.p[27] * opacity) * font.shadowAlpha)),
      width: n.p[16], height: n.p[17], leading: n.p[36], tracking: n.p[37],
      lineBreak: n.lineBreak, align, valign,
      stencil: stp, stencilSet: true,
      batchKey: font.path + '|' + scene.renderOrder + '|' + (stp.func === 'equal' ? 1 : 0) + ',' + stp.opDPFail[0] + ',' + stp.ref + ',' + stp.refMask + ',' + stp.bufferMask + ',' + stp.colorMask + ',' + (stp.clearBuffer ? 1 : 0),
    });
  }
  const order = finalOrder(scene.renderOrder, ctx.nextSortOrder++);
  for (const te of tes) ctx.renderer.submit({ majorOrder: 1, minorOrder: 0, order, dispatch: 'font', batchKey: te.batchKey, text: te });
}

/** RenderNodes: batch consecutive nodes by type/blend/texture/font/stencil scope. */
function renderNodes(scene: Scene, ctx: RenderCtx, r: ReturnType<Scene['renderScene']>) {
  const { entries, transforms, opacities, scopes } = r;
  const count = entries.length;
  if (count === 0) return;
  ctx.firstStencil = true;
  const n0 = scene.getNode(entries[0].node);
  let prevType = n0.nodeType, prevBlend = n0.blendMode, prevTex = nodeGLTexture(n0), prevFont = n0.font, prevScope = scopes[0];
  let start = 0;
  let i = 0;
  const flush = (type: number, s: number, n: number) => {
    switch (type) {
      case NODE_TYPE_TEXT: renderTextNodes(scene, ctx, entries, transforms, opacities, scopes, s, n); break;
      case NODE_TYPE_BOX: renderBoxNodes(scene, ctx, entries, transforms, opacities, scopes, s, n); break;
      case NODE_TYPE_PIE: renderPieNodes(scene, ctx, entries, transforms, opacities, scopes, s, n); break;
    }
  };
  while (i < count) {
    const n = scene.getNode(entries[i].node);
    if (n.isBone) { ++i; continue; }
    const kType = n.nodeType, kBlend = n.blendMode, kTex = nodeGLTexture(n), kFont = n.font, kScope = scopes[i];
    if (i > 0 && (kType !== prevType || kBlend !== prevBlend || kTex !== prevTex || kFont !== prevFont || kScope !== prevScope)) {
      flush(prevType, start, i - start);
      start = i;
    }
    prevType = kType; prevBlend = kBlend; prevTex = kTex; prevFont = kFont; prevScope = kScope;
    ++i;
  }
  if (i - start > 0) flush(prevType, start, i - start);
}

/** CompGuiRender over every enabled component of the world, in creation order. */
export function renderGuiWorld(components: GuiComponent[], renderer: Renderer) {
  const ctx: RenderCtx = { renderer, nextSortOrder: 0, firstStencil: true, roIndex: 0 };
  for (const c of components) {
    if (!c.enabled || !c.addedToUpdate) continue;
    const r = c.scene.renderScene();
    renderNodes(c.scene, ctx, r);
  }
}

export { handleOf, GuiContext };
