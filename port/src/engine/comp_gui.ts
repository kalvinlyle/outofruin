// Port of gamesys/components/comp_gui.cpp: scene setup from the SceneDesc,
// layouts, and conversion of rendered nodes into render objects.
import { f, M4, mulP3 } from './math32';
import {
  Scene, GuiContext, AtlasRuntime, GLTex, StencilScope, RenderEntry, handleOf, getOptimalDisplayProfile,
  NODE_TYPE_BOX, NODE_TYPE_TEXT, NODE_TYPE_PIE, NODE_TYPE_TEMPLATE, NODE_TEXTURE_TYPE_TEXTURE_SET, NODE_TEXTURE_TYPE_TEXTURE,
  BLEND_MODE_ALPHA, BLEND_MODE_ADD, BLEND_MODE_ADD_ALPHA, BLEND_MODE_MULT, DEFAULT_LAYOUT,
  PROPERTY_POSITION, PROPERTY_ROTATION, PROPERTY_SCALE, PROPERTY_COLOR, PROPERTY_SIZE, PROPERTY_OUTLINE, PROPERTY_SHADOW,
  PROPERTY_SLICE9, PROPERTY_PIE_PARAMS, PIVOT_NW, PIVOT_N, PIVOT_NE, PIVOT_W, PIVOT_CENTER, PIVOT_E, PIVOT_SW, PIVOT_S, PIVOT_SE,
  PIEBOUNDS_RECTANGLE, InternalNode,
} from './gui_core';
import { FontMap, TextEntry, packRGBA, TEXT_ALIGN_LEFT, TEXT_ALIGN_CENTER, TEXT_ALIGN_RIGHT, TEXT_VALIGN_TOP, TEXT_VALIGN_MIDDLE, TEXT_VALIGN_BOTTOM } from './font';
import { Renderer, RenderObject, StencilTestParams, BLEND_ONE, BLEND_ONE_MINUS_SRC_ALPHA, BLEND_DST_COLOR } from './gl';
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

function pushVertex(v: number[], p: ArrayLike<number>, u: number, vv: number, c: number[]) {
  v.push(p[0], p[1], p[2], u, vv, c[0], c[1], c[2], c[3]);
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
  const v: number[] = [];
  let vertCount = 0;
  for (let i = start; i < start + count; i++) {
    const n = scene.getNode(entries[i].node);
    if (n.isBone) continue;
    const color = [n.p[12], n.p[13], n.p[14], opacities[i]];
    const s9 = [n.p[28], n.p[29], n.p[30], n.p[31]];
    const sizeX = n.p[16], sizeY = n.p[17];
    const useSlice9 = f(f(f(s9[0] + s9[1]) + s9[2]) + s9[3]) !== 0;
    const w = transforms[i];
    if (!useSlice9 && useGeometries) {
      let frame = scene.getNodeAnimationFrame(n);
      frame = atlas!.frameIndices[frame];
      const geo = atlas!.geometries[frame];
      if (!geo) continue;
      const numPoints = geo.vertices.length / 2;
      const flipU = n.animDesc.flipH, flipV = n.animDesc.flipV;
      const reverse = (flipU ? 1 : 0) ^ (flipV ? 1 : 0);
      const scX = flipU ? -1 : 1, scY = flipV ? -1 : 1;
      for (const idx0 of geo.indices) {
        const idx = reverse ? numPoints - idx0 - 1 : idx0;
        const x = f(f(geo.vertices[idx * 2] * scX) + 0.5);
        const y = f(f(geo.vertices[idx * 2 + 1] * scY) + 0.5);
        const p = mulP3(w, x, y, 0);
        pushVertex(v, p, geo.uvs[idx * 2], geo.uvs[idx * 2 + 1], color);
      }
      vertCount += geo.indices.length;
      continue;
    }
    vertCount += 54;
    const s9min = 0.001;
    const su = f(1 / orgW), sv = f(1 / orgH);
    const sx = sizeX > s9min ? f(1 / sizeX) : 0;
    const sy = sizeY > s9min ? f(1 / sizeY) : 0;
    const us = [0, 0, 0, 0], vs = [0, 0, 0, 0], xs = [0, 0, 0, 1], ys = [0, 0, 0, 1];
    let uvRotated = false;
    const off = scene.getFlipbookUVOffset(n);
    if (off >= 0) {
      const tc = n.animDesc.texCoords!;
      const t = (k: number) => tc[off + k];
      const UV = [[0, 1, 2, 3], [3, 2, 1, 0]];
      uvRotated = t(0) !== t(2) && t(3) !== t(5);
      const fu = n.animDesc.flipH, fv = n.animDesc.flipV;
      if (uvRotated) {
        const uI = fv ? UV[1] : UV[0], vI = fu ? UV[1] : UV[0];
        us[uI[0]] = t(0); us[uI[1]] = f(t(0) + f(su * s9[3])); us[uI[2]] = f(t(2) - f(su * s9[1])); us[uI[3]] = t(2);
        vs[vI[0]] = t(1); vs[vI[1]] = f(t(1) - f(sv * s9[0])); vs[vI[2]] = f(t(5) + f(sv * s9[2])); vs[vI[3]] = t(5);
      } else {
        const uI = fu ? UV[1] : UV[0], vI = fv ? UV[1] : UV[0];
        us[uI[0]] = t(0); us[uI[1]] = f(t(0) + f(su * s9[0])); us[uI[2]] = f(t(4) - f(su * s9[2])); us[uI[3]] = t(4);
        vs[vI[0]] = t(1); vs[vI[1]] = f(t(1) + f(sv * s9[3])); vs[vI[2]] = f(t(3) - f(sv * s9[1])); vs[vI[3]] = t(3);
      }
    } else {
      us[0] = 0; us[1] = f(su * s9[0]); us[2] = f(1 - f(su * s9[2])); us[3] = 1;
      vs[0] = 0; vs[1] = f(sv * s9[3]); vs[2] = f(1 - f(sv * s9[1])); vs[3] = 1;
    }
    xs[1] = f(sx * s9[0]); xs[2] = f(1 - f(sx * s9[2]));
    ys[1] = f(sy * s9[3]); ys[2] = f(1 - f(sy * s9[1]));
    const pts: ArrayLike<number>[][] = [];
    for (let y = 0; y < 4; y++) { pts[y] = []; for (let x = 0; x < 4; x++) pts[y][x] = mulP3(w, xs[x], ys[y], 0); }
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        const x0 = x, x1 = x + 1, y0 = y, y1 = y + 1;
        let uv00: number[], uv10: number[], uv01: number[], uv11: number[];
        if (uvRotated) {
          uv00 = [us[y0], vs[x0]]; uv10 = [us[y0], vs[x1]]; uv01 = [us[y1], vs[x0]]; uv11 = [us[y1], vs[x1]];
        } else {
          uv00 = [us[x0], vs[y0]]; uv10 = [us[x1], vs[y0]]; uv01 = [us[x0], vs[y1]]; uv11 = [us[x1], vs[y1]];
        }
        pushVertex(v, pts[y0][x0], uv00[0], uv00[1], color);
        pushVertex(v, pts[y0][x1], uv10[0], uv10[1], color);
        pushVertex(v, pts[y1][x1], uv11[0], uv11[1], color);
        pushVertex(v, pts[y0][x0], uv00[0], uv00[1], color);
        pushVertex(v, pts[y1][x1], uv11[0], uv11[1], color);
        pushVertex(v, pts[y1][x0], uv01[0], uv01[1], color);
      }
    }
  }
  const ro: RenderObject = { program: 'gui', vertices: new Float32Array(v), vertexCount: vertCount, primitive: ctx.renderer.gl.TRIANGLES, texture: tex, src, dst, stencil };
  ctx.renderer.submit({ majorOrder: 1, minorOrder: 0, order: finalOrder(scene.renderOrder, sortOrder), dispatch: 'gui', batchKey: 'ro' + ctx.roIndex++, ro });
}

function renderPieNodes(scene: Scene, ctx: RenderCtx, entries: RenderEntry[], transforms: M4[], opacities: number[], scopes: (StencilScope | null)[], start: number, count: number) {
  const first = scene.getNode(entries[start].node);
  const sortOrder = ctx.nextSortOrder++;
  const stencil = stencilParams(ctx, scopes[start]);
  const [src, dst] = blendFactors(first.blendMode);
  const tex = nodeGLTexture(first) ?? ctx.renderer.white;
  const v: number[] = [];
  let total = 0;
  const PI = f(3.1415926535);
  for (let i = start; i < start + count; i++) {
    const n = scene.getNode(entries[i].node);
    const sizeX = n.p[16];
    if (n.isBone || Math.abs(sizeX) < 0.001) continue;
    const color = [n.p[12], n.p[13], n.p[14], opacities[i]];
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
    for (let j = 0; j !== generate; j++) {
      let a = j === generate - 1 ? stopAngle : f(ad * j);
      if (n.outerBounds === PIEBOUNDS_RECTANGLE) {
        if (lastAngle < nextCorner && a >= nextCorner) { a = nextCorner; nextCorner = f(nextCorner + f(0.5 * PI)); --j; }
        lastAngle = a;
      }
      const s = trigSin(backwards ? -a : a), c = trigCos(backwards ? -a : a);
      let uu = f(0.5 + f(innerMul * c)), vv = f(0.5 + f(innerMul * s));
      const pIn = mulP3(w, uu, vv, 0);
      const inUV = [f(u0 + f((uvRot ? vv : uu) * su)), f(v0 + f((uvRot ? uu : f(1 - vv)) * sv))];
      const d = n.outerBounds === PIEBOUNDS_RECTANGLE ? f(0.5 / Math.max(Math.abs(s), Math.abs(c))) : 0.5;
      uu = f(0.5 + f(d * c)); vv = f(0.5 + f(d * s));
      const pOut = mulP3(w, uu, vv, 0);
      const outUV = [f(u0 + f((uvRot ? vv : uu) * su)), f(v0 + f((uvRot ? uu : f(1 - vv)) * sv))];
      if (firstV) { pushVertex(v, pIn, inUV[0], inUV[1], color); total++; firstV = false; }
      pushVertex(v, pIn, inUV[0], inUV[1], color);
      pushVertex(v, pOut, outUV[0], outUV[1], color);
      total += 2;
      if (j === generate - 1) { pushVertex(v, pOut, outUV[0], outUV[1], color); total++; }
    }
  }
  const ro: RenderObject = { program: 'gui', vertices: new Float32Array(v), vertexCount: total, primitive: ctx.renderer.gl.TRIANGLE_STRIP, texture: tex, src, dst, stencil };
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
      batchKey: font.path + '|' + scene.renderOrder + '|' + JSON.stringify(stp),
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
  const key = (i: number) => {
    const n = scene.getNode(entries[i].node);
    return { type: n.nodeType, blend: n.blendMode, tex: nodeGLTexture(n), font: n.font, scope: scopes[i] };
  };
  let prev = key(0);
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
    const k = key(i);
    const change = k.type !== prev.type || k.blend !== prev.blend || k.tex !== prev.tex || k.font !== prev.font || k.scope !== prev.scope;
    if (i > 0 && change) {
      flush(prev.type, start, i - start);
      start = i;
    }
    prev = k;
    ++i;
  }
  if (i - start > 0) flush(prev.type, start, i - start);
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
