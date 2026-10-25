// Port of gui/src/gui.cpp (Defold 1.2.167): scene node pool, hierarchy, adjust
// modes, transforms, animations, clipping scopes and render-entry collection.
import { f, M4, V4, identity, mulM, mulV4, scaleM, eulerToQuat, normalizeQ, quatToM3, inverse, copyM } from './math32';
import { EASING_LOOKUP, EASING_SAMPLES } from './tables';
import type { FontMap } from './font';

export const INVALID = 0xffff;

export const PROPERTY_POSITION = 0, PROPERTY_ROTATION = 1, PROPERTY_SCALE = 2, PROPERTY_COLOR = 3, PROPERTY_SIZE = 4,
  PROPERTY_OUTLINE = 5, PROPERTY_SHADOW = 6, PROPERTY_SLICE9 = 7, PROPERTY_PIE_PARAMS = 8, PROPERTY_TEXT_PARAMS = 9;
export const PROPERTY_COUNT = 10;
/** value slot of the flipbook cursor (m_FlipbookAnimPosition) */
export const SLOT_FLIPBOOK = 40;

export const BLEND_MODE_ALPHA = 0, BLEND_MODE_ADD = 1, BLEND_MODE_ADD_ALPHA = 2, BLEND_MODE_MULT = 3;
export const CLIPPING_MODE_NONE = 0, CLIPPING_MODE_STENCIL = 2;
export const NODE_TYPE_BOX = 0, NODE_TYPE_TEXT = 1, NODE_TYPE_PIE = 2, NODE_TYPE_TEMPLATE = 3, NODE_TYPE_SPINE = 4, NODE_TYPE_PARTICLEFX = 5;
export const XANCHOR_NONE = 0, XANCHOR_LEFT = 1, XANCHOR_RIGHT = 2;
export const YANCHOR_NONE = 0, YANCHOR_TOP = 1, YANCHOR_BOTTOM = 2;
export const PIVOT_CENTER = 0, PIVOT_N = 1, PIVOT_NE = 2, PIVOT_E = 3, PIVOT_SE = 4, PIVOT_S = 5, PIVOT_SW = 6, PIVOT_W = 7, PIVOT_NW = 8;
export const ADJUST_MODE_FIT = 0, ADJUST_MODE_ZOOM = 1, ADJUST_MODE_STRETCH = 2;
export const SIZE_MODE_MANUAL = 0, SIZE_MODE_AUTO = 1;
export const PIEBOUNDS_RECTANGLE = 0, PIEBOUNDS_ELLIPSE = 1;
export const ADJUST_REFERENCE_LEGACY = 0, ADJUST_REFERENCE_PARENT = 1, ADJUST_REFERENCE_DISABLED = 2;
export const PLAYBACK_ONCE_FORWARD = 0, PLAYBACK_ONCE_BACKWARD = 1, PLAYBACK_ONCE_PINGPONG = 2, PLAYBACK_LOOP_FORWARD = 3,
  PLAYBACK_LOOP_BACKWARD = 4, PLAYBACK_LOOP_PINGPONG = 5, PLAYBACK_NONE = 6;
export const NODE_TEXTURE_TYPE_NONE = 0, NODE_TEXTURE_TYPE_TEXTURE = 1, NODE_TEXTURE_TYPE_TEXTURE_SET = 2, NODE_TEXTURE_TYPE_DYNAMIC = 3;

export const CALCULATE_NODE_BOUNDARY = 1, CALCULATE_NODE_INCLUDE_SIZE = 2, CALCULATE_NODE_RESET_PIVOT = 4;

export const DEFAULT_LAYER = '';
export const DEFAULT_LAYOUT = '';
export const TYPE_FLOAT_VECTOR = 41;

// ---------- textures ----------

/** A GL texture plus its original (pre-resize) dimensions. */
export interface GLTex { handle: any; width: number; height: number; originalWidth: number; originalHeight: number }

export interface AtlasRuntime {
  path: string;
  ddf: any;
  texture: GLTex;
  texCoords: Float32Array;
  animIndex: Map<string, number>;
  geometries: { vertices: Float32Array; uvs: Float32Array; indices: number[] }[];
  frameIndices: number[];
}

export interface TextureInfo { source: AtlasRuntime | GLTex; type: number; origW: number; origH: number }

export interface AnimDesc {
  start: number; end: number; playback: number;
  origW: number; origH: number; fps: number;
  texCoords: Float32Array | null;
  textureSet: AtlasRuntime | null;
  flipH: boolean; flipV: boolean;
}

function newAnimDesc(): AnimDesc {
  return { start: 0, end: 0, playback: PLAYBACK_ONCE_FORWARD, origW: 0, origH: 0, fps: 0, texCoords: null, textureSet: null, flipH: false, flipV: false };
}

// dmGameSystemDDF playback -> dmGui playback
const DDF_PLAYBACK: Record<number, number> = { 0: PLAYBACK_NONE, 1: PLAYBACK_ONCE_FORWARD, 2: PLAYBACK_ONCE_BACKWARD, 3: PLAYBACK_LOOP_FORWARD, 4: PLAYBACK_LOOP_BACKWARD, 5: PLAYBACK_LOOP_PINGPONG, 6: PLAYBACK_ONCE_PINGPONG };

/** comp_gui FetchTextureSetAnimCallback */
function fetchTextureSetAnim(atlas: AtlasRuntime, anim: string, out: AnimDesc): number {
  const idx = atlas.animIndex.get(anim);
  if (idx === undefined) return -1; // FETCH_ANIMATION_NOT_FOUND
  if (atlas.texCoords.length === 0) return -1000;
  const a = atlas.ddf.animations[idx];
  const pb = a.playback;
  if (pb >= 7) return -3;
  out.texCoords = atlas.texCoords;
  out.start = a.start & 0x1fff;
  out.end = a.end & 0x1fff;
  out.origW = atlas.texture.originalWidth & 0xffff;
  out.origH = atlas.texture.originalHeight & 0xffff;
  out.playback = DDF_PLAYBACK[pb];
  out.fps = a.fps & 0xff;
  out.flipH = !!a.flip_horizontal;
  out.flipV = !!a.flip_vertical;
  out.textureSet = atlas;
  return 0;
}

// ---------- nodes ----------

export interface StencilScope { refVal: number; testMask: number; writeMask: number; colorMask: number }

export class InternalNode {
  p = new Float32Array(41);          // 10 properties x 4 + flipbook cursor
  resetP = new Float32Array(41);
  localTransform: M4 = identity();
  localAdjustScale: V4 = [1, 1, 1, 1];
  resetState: any = null;
  // state bits
  blendMode = 0; nodeType = 0; xAnchor = 0; yAnchor = 0; pivot = 0; adjustMode = 0; sizeMode = 0;
  lineBreak = false; enabled = true; dirtyLocal = true; inheritAlpha = false;
  clippingMode = 0; clippingVisible = true; clippingInverted = false; isBone = false;
  hasResetPoint = false;
  perimeterVertices = 32; outerBounds = PIEBOUNDS_ELLIPSE;
  text: string | null = null;
  textureHash = ''; texture: AtlasRuntime | GLTex | null = null; textureType = NODE_TEXTURE_TYPE_NONE;
  animDesc: AnimDesc = newAnimDesc();
  flipbookAnimHash = '';
  fontHash = ''; font: FontMap | null = null;
  layerHash = DEFAULT_LAYER; layerIndex = 0;
  nodeDescTable: any[] | null = null;
  // InternalNode
  nameHash = '';
  version = 0; index = INVALID;
  prev = INVALID; next = INVALID; parent = INVALID; childHead = INVALID; childTail = INVALID;
  travCacheIndex = 0; travCacheVersion = INVALID;
  clipperIndex = INVALID;
  deleted = false;

  stateBits() {
    return [this.blendMode, this.nodeType, this.xAnchor, this.yAnchor, this.pivot, this.adjustMode, this.sizeMode, this.lineBreak,
      this.enabled, this.dirtyLocal, this.inheritAlpha, this.clippingMode, this.clippingVisible, this.clippingInverted, this.isBone];
  }
  setStateBits(s: any[]) {
    [this.blendMode, this.nodeType, this.xAnchor, this.yAnchor, this.pivot, this.adjustMode, this.sizeMode, this.lineBreak,
      this.enabled, this.dirtyLocal, this.inheritAlpha, this.clippingMode, this.clippingVisible, this.clippingInverted, this.isBone] = s;
  }
  prop(i: number): V4 { return [this.p[i * 4], this.p[i * 4 + 1], this.p[i * 4 + 2], this.p[i * 4 + 3]]; }
  setProp(i: number, v: ArrayLike<number>) { this.p[i * 4] = v[0]; this.p[i * 4 + 1] = v[1]; this.p[i * 4 + 2] = v[2]; this.p[i * 4 + 3] = v[3]; }
}

export function handleOf(n: InternalNode): number { return ((n.version << 16) | n.index) >>> 0; }

// ---------- animations ----------

export type AnimationComplete = (scene: Scene, node: number, finished: boolean, ud1: any, ud2: any) => void;

export interface Easing { type: number; vector: Float32Array | null; release?: (() => void) | null }

export interface Animation {
  node: number;
  nodeIndex: number;
  slot: number;           // float slot in node.p
  from: number; to: number;
  delay: number; elapsed: number; duration: number; playbackRate: number;
  easing: Easing;
  playback: number;
  complete: AnimationComplete | null;
  ud1: any; ud2: any;
  firstUpdate: boolean; completeCalled: boolean; cancelled: boolean; backwards: boolean;
}

export function easingValue(e: Easing, t: number): number {
  t = Math.min(Math.max(t, 0), 1);
  let sampleCount: number;
  let lookup: Float32Array;
  let base = 0;
  if (e.type === TYPE_FLOAT_VECTOR) {
    lookup = e.vector!;
    sampleCount = lookup.length;
    if (sampleCount === 0) return 0;
    if (sampleCount === 1) return lookup[0];
  } else {
    sampleCount = EASING_SAMPLES;
    lookup = EASING_LOOKUP;
    base = e.type * (EASING_SAMPLES + 1);
  }
  const index1 = Math.trunc(f(t * (sampleCount - 1)));
  const index2 = Math.min(index1 + 1, sampleCount - 1);
  const val1 = lookup[base + index1];
  const val2 = lookup[base + index2];
  const diff = f(f(t - f(index1 * f(1 / (sampleCount - 1)))) * (sampleCount - 1));
  return f(f(val1 * f(1 - diff)) + f(val2 * diff));
}

// ---------- context & scene ----------

export interface DisplayProfile { name: string; qualifiers: { width: number; height: number; device_models: string[] }[] }

export class GuiContext {
  physicalWidth = 640; physicalHeight = 960;
  defaultProjectWidth = 750; defaultProjectHeight = 1334;
  dpi = 0;
  scenes: Scene[] = [];
  displayProfiles: DisplayProfile[] = [];
  defaultFont: FontMap | null = null;
  travVersion = 0;
  travIndex = 0;
  travData: { t: M4; o: number }[] = [];

  setPhysicalResolution(w: number, h: number) {
    this.physicalWidth = w; this.physicalHeight = h;
    for (const s of this.scenes) {
      s.resChanged = true;
      s.onWindowResize?.(s, w, h);
    }
  }
}

/** render/display_profiles.cpp GetOptimalDisplayProfile (device models never match on html5). */
export function getOptimalDisplayProfile(profiles: DisplayProfile[], width: number, height: number, dpi: number, choices: string[] | null): string | null {
  const wf = f(width), hf = f(height);
  const matchArea = f(wf * hf), matchRatio = f(wf / hf);
  const dist = [Number.MAX_VALUE, Number.MAX_VALUE];
  const ids: (string | null)[] = [null, null];
  for (const p of profiles) {
    if (choices && !choices.includes(p.name)) continue;
    for (const q of p.qualifiers) {
      if (q.device_models.length !== 0) continue; // device model "" never matches
      const cat = q.width > q.height ? 0 : 1;
      const area = f(f(q.width) * f(q.height));
      const ratio = f(f(q.width) / f(q.height));
      const d = Math.abs(1.0 - f(matchArea / area)) + Math.abs(1.0 - f(matchRatio / ratio)) + (dpi === 0 ? 0 : Math.abs(1.0 - 0 / dpi));
      if (d < dist[cat]) { dist[cat] = d; ids[cat] = p.name; }
    }
  }
  const want = width > height ? 0 : 1;
  let id = ids[want];
  if (id === null) id = ids[(want + 1) & 1];
  return id;
}

export interface RenderEntry { node: number; key: number; renderData?: any }

export class ClippingNode {
  scope: StencilScope = { refVal: 0, testMask: 0, writeMask: 0, colorMask: 0 };
  childScope: StencilScope = { refVal: 0, testMask: 0, writeMask: 0, colorMask: 0 };
  visibleRenderKey = -1;
  parentIndex = INVALID;
  nextNonInvIndex = INVALID;
  nodeIndex = INVALID;
}

// render key field widths (wider than Defold's 4/10/8/4/10 so the 1024-node cap does not apply)
const SUB_INDEX_MUL = 1;
const SUB_LAYER_MUL = 2 ** 16;
const CLIPPER_MUL = 2 ** 20;
const INDEX_MUL = 2 ** 28;
const LAYER_MUL = 2 ** 44;
function calcRenderKey(layer: number, index: number, inv: number, subLayer: number, subIndex: number): number {
  return layer * LAYER_MUL + index * INDEX_MUL + inv * CLIPPER_MUL + subLayer * SUB_LAYER_MUL + subIndex * SUB_INDEX_MUL;
}
interface Scope { index: number; rootLayer: number; rootIndex: number }
function scopeKey(scope: Scope | null, layer: number, index: number): number {
  if (scope) return calcRenderKey(scope.rootLayer, scope.rootIndex, scope.index, layer, index);
  return calcRenderKey(layer, index, 0, 0, 0);
}

function calcBitRange(v: number): number { let r = 0; while (v !== 0) { r++; v >>= 1; } return r; }
function calcMask(bits: number): number { return ((1 << bits) - 1) & 0xffff; }

export interface PropDesc { prop: number; comp: number }
const PROPS: Record<string, PropDesc> = {};
for (const [name, prop] of [['position', 0], ['rotation', 1], ['scale', 2], ['color', 3], ['size', 4], ['outline', 5], ['shadow', 6], ['slice9', 7]] as [string, number][]) {
  PROPS[name] = { prop, comp: 0xff };
  ['x', 'y', 'z', 'w'].forEach((c, i) => { PROPS[name + '.' + c] = { prop, comp: i }; });
}
PROPS['inner_radius'] = { prop: PROPERTY_PIE_PARAMS, comp: 0 };
PROPS['fill_angle'] = { prop: PROPERTY_PIE_PARAMS, comp: 1 };
PROPS['leading'] = { prop: PROPERTY_TEXT_PARAMS, comp: 0 };
PROPS['tracking'] = { prop: PROPERTY_TEXT_PARAMS, comp: 1 };
export function getPropertyDesc(name: string): PropDesc | undefined { return Object.prototype.hasOwnProperty.call(PROPS, name) ? PROPS[name] : undefined; }

export class Scene {
  context: GuiContext;
  nodes: InternalNode[] = [];
  // dmIndexPool16
  pool: number[] = [];
  poolSize = 0;
  animations: Animation[] = [];
  fonts = new Map<string, FontMap>();
  textures = new Map<string, TextureInfo>();
  layers = new Map<string, number>();
  nextLayerIndex = 0;
  layouts: string[] = [DEFAULT_LAYOUT];
  layoutId = DEFAULT_LAYOUT;
  adjustReference = ADJUST_REFERENCE_LEGACY;
  renderHead = INVALID; renderTail = INVALID;
  nextVersion = 0;
  renderOrder = 0;
  width: number; height: number;
  resChanged = false;
  defaultFont: FontMap | null = null;
  userData: any = null;
  onWindowResize: ((s: Scene, w: number, h: number) => void) | null = null;
  /** node proxies handed to scripts, one per handle */
  proxies = new Map<number, any>();

  constructor(context: GuiContext, maxNodes: number) {
    this.context = context;
    this.setPoolCapacity(maxNodes);
    this.width = context.defaultProjectWidth;
    this.height = context.defaultProjectHeight;
    this.layers.set(DEFAULT_LAYER, this.nextLayerIndex++);
    context.scenes.push(this);
  }

  private setPoolCapacity(cap: number) {
    for (let i = this.pool.length; i < cap; i++) this.pool[i] = i;
  }
  private allocateNode(): number {
    if (this.poolSize === this.pool.length) {
      // Defold caps at max_nodes ("Out of nodes"); the port grows the pool instead.
      this.setPoolCapacity(this.pool.length + 256);
    }
    const index = this.pool[this.poolSize++];
    while (this.nodes.length < index + 1) this.nodes.push(new InternalNode());
    return index;
  }
  nodeCount(): number { return this.poolSize; }

  // ----- node lookup -----
  isNodeValid(h: number): boolean {
    const version = h >>> 16, index = h & 0xffff;
    if (index >= this.nodes.length) return false;
    const n = this.nodes[index];
    return n.version === version && n.index === index;
  }
  getNode(h: number): InternalNode { return this.nodes[h & 0xffff]; }

  newNode(pos: ArrayLike<number>, size: ArrayLike<number>, type: number): number {
    const index = this.allocateNode();
    let version = this.nextVersion;
    if (version === 0) version++;
    const h = ((version << 16) | index) >>> 0;
    const n = new InternalNode();
    this.nodes[index] = n;
    n.setProp(PROPERTY_POSITION, [pos[0], pos[1], pos[2], 1]);
    n.setProp(PROPERTY_ROTATION, [0, 0, 0, 0]);
    n.setProp(PROPERTY_SCALE, [1, 1, 1, 0]);
    n.setProp(PROPERTY_COLOR, [1, 1, 1, 1]);
    n.setProp(PROPERTY_OUTLINE, [0, 0, 0, 1]);
    n.setProp(PROPERTY_SHADOW, [0, 0, 0, 1]);
    n.setProp(PROPERTY_SIZE, [size[0], size[1], size[2], 0]);
    n.setProp(PROPERTY_SLICE9, [0, 0, 0, 0]);
    n.setProp(PROPERTY_PIE_PARAMS, [0, 360, 0, 0]);
    n.setProp(PROPERTY_TEXT_PARAMS, [1, 0, 0, 0]);
    n.nodeType = type;
    n.version = version;
    n.index = index;
    this.nextVersion = (version + 1) % ((1 << 16) - 1);
    this.moveNodeAbove(h, 0);
    return h;
  }

  getNodeById(id: string): number {
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (n.nameHash === id) return handleOf(n);
    }
    return 0;
  }

  // ----- lists -----
  private listOf(n: InternalNode): { get: () => [number, number]; set: (h: number, t: number) => void } {
    if (n.parent !== INVALID) {
      const p = this.nodes[n.parent];
      return { get: () => [p.childHead, p.childTail], set: (h, t) => { p.childHead = h; p.childTail = t; } };
    }
    return { get: () => [this.renderHead, this.renderTail], set: (h, t) => { this.renderHead = h; this.renderTail = t; } };
  }

  private addToNodeList(n: InternalNode, parentN: InternalNode | null, prevN: InternalNode | null) {
    let parentIndex = INVALID;
    let head: number, tail: number;
    const setHT = (hh: number, tt: number) => {
      if (parentN) { parentN.childHead = hh; parentN.childTail = tt; } else { this.renderHead = hh; this.renderTail = tt; }
    };
    if (parentN) { parentIndex = parentN.index; head = parentN.childHead; tail = parentN.childTail; }
    else { head = this.renderHead; tail = this.renderTail; }
    n.parent = parentIndex;
    if (prevN) {
      if (tail === prevN.index) {
        tail = n.index;
        n.next = INVALID;
      } else if (prevN.next !== INVALID) {
        const nextN = this.nodes[prevN.next];
        nextN.prev = n.index;
        n.next = prevN.next;
      }
      prevN.next = n.index;
      n.prev = prevN.index;
    } else {
      n.prev = INVALID;
      n.next = head;
      if (head !== INVALID) this.nodes[head].prev = n.index;
      head = n.index;
      if (tail === INVALID) tail = n.index;
    }
    setHT(head, tail);
  }

  private removeFromNodeList(n: InternalNode) {
    if (n.prev !== INVALID) this.nodes[n.prev].next = n.next;
    if (n.next !== INVALID) this.nodes[n.next].prev = n.prev;
    const l = this.listOf(n);
    let [h, t] = l.get();
    if (h === n.index) h = n.next;
    if (t === n.index) t = n.prev;
    l.set(h, t);
  }

  private resetInternalNode(n: InternalNode) {
    this.removeFromNodeList(n);
    const index = n.index;
    this.pool[--this.poolSize] = index;
    this.proxies.delete(handleOf(n));
    const fresh = new InternalNode();
    fresh.index = INVALID;
    this.nodes[index] = fresh;
    if (index + 1 === this.nodes.length) this.nodes.length = index;
  }

  deleteNode(h: number) {
    const n = this.getNode(h);
    let child = n.childHead;
    while (child !== INVALID) {
      const c = this.nodes[child & 0xffff];
      child = c.next;
      this.deleteNode(handleOf(c));
    }
    let nAnims = this.animations.length;
    for (let i = 0; i < nAnims; ++i) {
      const a = this.animations[i];
      if (a.node === h) {
        if (!a.completeCalled) {
          a.completeCalled = true;
          if (a.complete) a.complete(this, a.node, false, a.ud1, a.ud2);
          if (a.easing.release) a.easing.release();
        }
        this.eraseSwapAnim(i);
        i--; nAnims--;
      }
    }
    this.resetInternalNode(n);
  }

  private eraseSwapAnim(i: number) {
    const last = this.animations.length - 1;
    this.animations[i] = this.animations[last];
    this.animations.length = last;
  }

  moveNodeBelow(h: number, ref: number) {
    if (h !== 0 && h !== ref) {
      const n = this.getNode(h);
      this.removeFromNodeList(n);
      let parent: InternalNode | null = null, prev: InternalNode | null = null;
      if (ref !== 0) {
        const r = this.nodes[ref & 0xffff];
        if (r.prev !== INVALID) prev = this.nodes[r.prev];
        if (r.parent !== INVALID) parent = this.nodes[r.parent];
      }
      this.addToNodeList(n, parent, prev);
    }
  }

  moveNodeAbove(h: number, ref: number) {
    if (h !== 0 && h !== ref) {
      const n = this.getNode(h);
      this.removeFromNodeList(n);
      let parent: InternalNode | null = null, prev: InternalNode | null = null;
      if (ref !== 0) {
        prev = this.nodes[ref & 0xffff];
        if (prev.parent !== INVALID) parent = this.nodes[prev.parent];
      } else if (this.renderTail !== INVALID) {
        prev = this.nodes[this.renderTail];
      }
      this.addToNodeList(n, parent, prev);
    }
  }

  /** returns false on infinite recursion */
  setNodeParent(h: number, parent: number, keepSceneTransform: boolean): boolean {
    if (h === parent) return false;
    const n = this.getNode(h);
    let parentIndex = INVALID;
    let parentNode: InternalNode | null = null;
    if (parent !== 0) {
      parentNode = this.getNode(parent);
      let anc = parentNode.parent;
      while (anc !== INVALID) {
        if (n.index === anc) return false;
        anc = this.nodes[anc].parent;
      }
      parentIndex = parentNode.index;
    }
    if (parentIndex !== n.parent) {
      if (keepSceneTransform) {
        const nodeM = this.calculateNodeTransform(n, 0);
        let parentM: M4;
        let referenceScale: V4, adjustScale: V4;
        let offset: V4 = [0, 0, 0, 0];
        if (parentNode) {
          parentM = this.calculateNodeTransform(parentNode, 0);
          referenceScale = parentNode.localAdjustScale.slice() as V4;
          adjustScale = applyAdjustOnReferenceScale(referenceScale, n.adjustMode);
        } else {
          referenceScale = this.calculateReferenceScale(null);
          adjustScale = applyAdjustOnReferenceScale(referenceScale, n.adjustMode);
          parentM = scaleM(adjustScale[0], adjustScale[1], adjustScale[2]);
          const pd = [f(this.width), f(this.height), 0, 1];
          const ad = [f(pd[0] * adjustScale[0]), f(pd[1] * adjustScale[1]), f(pd[2] * adjustScale[2]), f(pd[3] * adjustScale[3])];
          const rs = [f(this.context.physicalWidth), f(this.context.physicalHeight), 0, 1];
          offset = [f(f(rs[0] - ad[0]) * 0.5), f(f(rs[1] - ad[1]) * 0.5), f(f(rs[2] - ad[2]) * 0.5), f(f(rs[3] - ad[3]) * 0.5)];
        }
        const position = [f(nodeM[12] - parentM[12]), f(nodeM[13] - parentM[13]), f(nodeM[14] - parentM[14])];
        if (n.xAnchor === XANCHOR_LEFT || n.xAnchor === XANCHOR_RIGHT) offset[0] = 0;
        if (n.yAnchor === YANCHOR_TOP || n.yAnchor === YANCHOR_BOTTOM) offset[1] = 0;
        const scaled = [f(position[0] - offset[0]), f(position[1] - offset[1]), f(position[2] - offset[2])];
        const pos = [f(f(1 / adjustScale[0]) * scaled[0]), f(f(1 / adjustScale[1]) * scaled[1]), f(f(1 / adjustScale[2]) * scaled[2])];
        if (n.xAnchor === XANCHOR_LEFT || n.xAnchor === XANCHOR_RIGHT) pos[0] = f(scaled[0] / referenceScale[0]);
        if (n.yAnchor === YANCHOR_BOTTOM || n.yAnchor === YANCHOR_TOP) pos[1] = f(scaled[1] / referenceScale[1]);
        n.setProp(PROPERTY_POSITION, [pos[0], pos[1], pos[2], 1]);
        n.dirtyLocal = true;
      }
      this.removeFromNodeList(n);
      let prevIndex = this.renderTail;
      if (parentIndex !== INVALID) prevIndex = parentNode!.childTail;
      const prev = prevIndex !== INVALID ? this.nodes[prevIndex] : null;
      this.addToNodeList(n, parentNode, prev);
    }
    return true;
  }

  cloneNode(h: number): number {
    const index = this.allocateNode();
    let version = this.nextVersion;
    if (version === 0) version++;
    const out = ((version << 16) | index) >>> 0;
    const src = this.getNode(h);
    const n = new InternalNode();
    // copy m_Node
    n.p.set(src.p); n.resetP.set(src.resetP);
    n.localTransform = copyM(src.localTransform);
    n.localAdjustScale = src.localAdjustScale.slice() as V4;
    n.resetState = src.resetState;
    n.setStateBits(src.stateBits());
    n.hasResetPoint = src.hasResetPoint;
    n.perimeterVertices = src.perimeterVertices; n.outerBounds = src.outerBounds;
    n.text = src.text;
    n.textureHash = src.textureHash; n.texture = src.texture; n.textureType = src.textureType;
    n.animDesc = { ...src.animDesc };
    n.flipbookAnimHash = src.flipbookAnimHash;
    n.fontHash = src.fontHash; n.font = src.font;
    n.layerHash = src.layerHash; n.layerIndex = src.layerIndex;
    n.nodeDescTable = src.nodeDescTable;
    // InternalNode fields start zeroed (memset): id hash 0, clipper index 0
    n.nameHash = '';
    n.clipperIndex = 0;
    n.travCacheIndex = 0;
    n.version = version; n.index = index;
    n.travCacheVersion = INVALID;
    this.nodes[index] = n;
    this.nextVersion = (version + 1) % ((1 << 16) - 1);
    this.moveNodeAbove(out, 0);
    return out;
  }

  // ----- textures / fonts / layers -----
  setNodeTexture(h: number, id: string): boolean {
    const n = this.getNode(h);
    if (n.textureType === NODE_TEXTURE_TYPE_TEXTURE_SET) this.cancelNodeFlipbookAnim(h);
    const ti = this.textures.get(id);
    if (ti) {
      n.textureHash = id;
      n.texture = ti.source;
      n.textureType = ti.type;
      if (n.sizeMode !== SIZE_MODE_MANUAL && n.nodeType !== NODE_TYPE_SPINE && n.nodeType !== NODE_TYPE_PARTICLEFX && ti.source) {
        n.p[PROPERTY_SIZE * 4] = ti.origW;
        n.p[PROPERTY_SIZE * 4 + 1] = ti.origH;
      }
      return true;
    }
    n.texture = null;
    n.textureType = NODE_TEXTURE_TYPE_NONE;
    return false;
  }

  setNodeSizeMode(h: number, mode: number) {
    const n = this.getNode(h);
    n.sizeMode = mode & 1;
    if (n.sizeMode !== SIZE_MODE_MANUAL && n.nodeType !== NODE_TYPE_SPINE && n.nodeType !== NODE_TYPE_PARTICLEFX) {
      const ti = this.textures.get(n.textureHash);
      if (ti && ti.source) {
        n.p[PROPERTY_SIZE * 4] = ti.origW;
        n.p[PROPERTY_SIZE * 4 + 1] = ti.origH;
      }
    }
  }

  setNodeFont(h: number, id: string): boolean {
    const font = this.fonts.get(id);
    if (!font) return false;
    const n = this.getNode(h);
    n.fontHash = id; n.font = font;
    return true;
  }

  setNodeLayer(h: number, id: string): boolean {
    const li = this.layers.get(id);
    if (li === undefined) return false;
    const n = this.getNode(h);
    n.layerHash = id; n.layerIndex = li;
    return true;
  }

  addLayer(name: string) {
    const index = this.nextLayerIndex++;
    this.layers.set(name, index);
    for (const n of this.nodes) if (n.layerHash === name) n.layerIndex = index;
  }

  setNodeResetPoint(h: number) {
    const n = this.getNode(h);
    n.resetP.set(n.p);
    n.resetState = n.stateBits();
    n.hasResetPoint = true;
  }

  resetNodes() {
    for (const n of this.nodes) {
      if (n.hasResetPoint) {
        n.p.set(n.resetP);
        n.dirtyLocal = true;
        n.setStateBits(n.resetState);
      }
    }
    this.animations.length = 0;
  }

  setNodeEnabled(h: number, enabled: boolean) {
    const n = this.getNode(h);
    n.enabled = enabled;
    if (enabled) this.setDirtyLocalRecursive(h);
  }
  private setDirtyLocalRecursive(h: number) {
    const n = this.getNode(h);
    n.dirtyLocal = true;
    let idx = n.childHead;
    while (idx !== INVALID) {
      const c = this.nodes[idx];
      c.dirtyLocal = true;
      if (c.childHead !== INVALID) this.setDirtyLocalRecursive(handleOf(c));
      idx = c.next;
    }
  }

  // ----- flipbook -----
  getNodeAnimationFrame(n: InternalNode): number {
    if (n.textureType !== NODE_TEXTURE_TYPE_TEXTURE_SET || !n.animDesc.texCoords) return -1;
    const d = n.animDesc;
    const frames = d.end - d.start;
    const frame = Math.trunc(f(n.p[SLOT_FLIPBOOK] * frames));
    return d.start + Math.min(Math.max(frame, 0), frames - 1);
  }
  /** offset (in floats) into the tex coords of the current frame, or -1 */
  getFlipbookUVOffset(n: InternalNode): number {
    const fr = this.getNodeAnimationFrame(n);
    if (fr < 0) return -1;
    return fr * 8;
  }

  calculateNodeSize(n: InternalNode) {
    if (n.sizeMode === SIZE_MODE_MANUAL || n.nodeType === NODE_TYPE_SPINE || n.nodeType === NODE_TYPE_PARTICLEFX ||
        n.textureType !== NODE_TEXTURE_TYPE_TEXTURE_SET || !n.animDesc.texCoords) return;
    const off = this.getFlipbookUVOffset(n);
    const tc = n.animDesc.texCoords;
    const d = n.animDesc;
    if (tc[off] !== tc[off + 2] && tc[off + 3] !== tc[off + 5]) {
      const w = f(tc[off + 2] - tc[off]);
      const h = f(tc[off + 1] - tc[off + 5]);
      n.p[PROPERTY_SIZE * 4] = f(h * d.origH);
      n.p[PROPERTY_SIZE * 4 + 1] = f(w * d.origW);
    } else {
      const w = f(tc[off + 4] - tc[off]);
      const h = f(tc[off + 3] - tc[off + 1]);
      n.p[PROPERTY_SIZE * 4] = f(w * d.origW);
      n.p[PROPERTY_SIZE * 4 + 1] = f(h * d.origH);
    }
  }

  private animateTextureSetAnim(h: number, offset: number, playbackRate: number, cb: AnimationComplete | null, ud1: any, ud2: any) {
    const n = this.getNode(h);
    const d = n.animDesc;
    let frames = d.end - d.start;
    const pb = d.playback;
    const pingpong = pb === PLAYBACK_ONCE_PINGPONG || pb === PLAYBACK_LOOP_PINGPONG;
    if (pingpong) frames *= 2;
    offset = f(Math.min(Math.max(offset, 0), 1));
    let elapsed = offset;
    const duration = f(f(frames) / f(d.fps));
    if (pingpong) elapsed = f(elapsed / 2);
    elapsed = f(elapsed * duration);
    const a = this.animateComponent(h, SLOT_FLIPBOOK, 1, { type: 0, vector: null }, pb, duration, 0, playbackRate, cb, ud1, ud2);
    if (!a) return;
    a.from = 0;
    a.firstUpdate = false;
    a.elapsed = elapsed;
    n.p[SLOT_FLIPBOOK] = offset;
  }

  /** returns 0 ok, -1 invalid, -5 not found */
  playNodeFlipbookAnim(h: number, anim: string, offset: number, playbackRate: number, cb: AnimationComplete | null = null, ud1: any = null, ud2: any = null): number {
    const n = this.getNode(h);
    n.p[SLOT_FLIPBOOK] = 0;
    n.flipbookAnimHash = '';
    if (anim === '') return -7;
    if (n.textureType !== NODE_TEXTURE_TYPE_TEXTURE_SET) return -7;
    n.flipbookAnimHash = anim;
    const r = fetchTextureSetAnim(n.texture as AtlasRuntime, anim, n.animDesc);
    if (r !== 0) {
      this.cancelAnimationComponent(h, SLOT_FLIPBOOK);
      n.flipbookAnimHash = '';
      n.animDesc = newAnimDesc();
      console.warn(r === -1 ? `The animation '${anim}' could not be found.` : `Error playing animation '${anim}' (result ${r}).`);
      return -5;
    }
    if (n.animDesc.playback === PLAYBACK_NONE) this.cancelAnimationComponent(h, SLOT_FLIPBOOK);
    else this.animateTextureSetAnim(h, offset, playbackRate, cb, ud1, ud2);
    this.calculateNodeSize(n);
    return 0;
  }

  cancelNodeFlipbookAnim(h: number) {
    const n = this.getNode(h);
    this.cancelAnimationComponent(h, SLOT_FLIPBOOK);
    n.flipbookAnimHash = '';
  }

  // ----- animation -----
  animateComponent(h: number, slot: number, to: number, easing: Easing, playback: number, duration: number, delay: number,
                   playbackRate: number, cb: AnimationComplete | null, ud1: any, ud2: any): Animation | null {
    const index = h & 0xffff;
    const key = index * 64 + slot;
    let ai = -1;
    for (let i = 0; i < this.animations.length; ++i) {
      const a = this.animations[i];
      if (a.nodeIndex * 64 + a.slot === key) {
        if (a.complete && !a.completeCalled) a.complete(this, a.node, false, a.ud1, a.ud2);
        ai = i;
        break;
      }
    }
    const anim: Animation = {
      node: h, nodeIndex: index, slot, from: 0, to: f(to), delay: f(delay), elapsed: 0, duration: f(duration), playbackRate: f(playbackRate),
      easing, playback, complete: cb, ud1, ud2, firstUpdate: true, completeCalled: false, cancelled: false, backwards: false,
    };
    if (ai < 0) { ai = this.animations.length; }
    this.animations[ai] = anim;
    return anim;
  }

  animateNodeHash(h: number, property: string, to: V4, easing: Easing, playback: number, duration: number, delay: number,
                  cb: AnimationComplete | null, ud1: any, ud2: any) {
    const pd = getPropertyDesc(property);
    if (!pd) { console.error(`property '${property}' not found`); return; }
    if (pd.comp === 0xff) {
      const noCb: Easing = { type: easing.type, vector: easing.vector, release: null };
      for (let j = 0; j < 3; ++j) this.animateComponent(h, pd.prop * 4 + j, to[j], noCb, playback, duration, delay, 1, null, null, null);
      this.animateComponent(h, pd.prop * 4 + 3, to[3], easing, playback, duration, delay, 1, cb, ud1, ud2);
    } else {
      this.animateComponent(h, pd.prop * 4 + pd.comp, to[pd.comp], easing, playback, duration, delay, 1, cb, ud1, ud2);
    }
  }

  cancelAnimationHash(h: number, property: string) {
    const pd = getPropertyDesc(property);
    if (!pd) { console.error(`property '${property}' not found`); return; }
    const index = h & 0xffff;
    let from = 0, to = 4, expect = 4;
    if (pd.comp !== 0xff) { from = pd.comp; to = pd.comp + 1; expect = 1; }
    for (const a of this.animations) {
      let count = 0;
      for (let j = from; j < to; ++j) {
        if (a.node === h && a.nodeIndex === index && a.slot === pd.prop * 4 + j) {
          a.cancelled = true;
          if (++count === expect) return;
        }
      }
    }
  }

  private cancelAnimationComponent(h: number, slot: number) {
    const index = h & 0xffff;
    for (const a of this.animations) {
      if (a.node === h && a.nodeIndex === index && a.slot === slot) { a.cancelled = true; return; }
    }
  }

  private isNodeEnabledRecursive(index: number): boolean {
    const n = this.nodes[index];
    if (n.enabled && n.parent !== INVALID) return this.isNodeEnabledRecursive(n.parent);
    return n.enabled;
  }

  updateAnimations(dt: number) {
    dt = f(dt);
    const anims = this.animations;
    for (let i = 0; i < anims.length; ++i) {
      const a = anims[i];
      const pb = a.playback;
      const looping = pb === PLAYBACK_LOOP_FORWARD || pb === PLAYBACK_LOOP_BACKWARD || pb === PLAYBACK_LOOP_PINGPONG;
      if (a.elapsed > a.duration || a.cancelled || (!looping && a.elapsed === a.duration && a.duration !== 0)) continue;
      if (!this.isNodeEnabledRecursive(a.node & 0xffff)) continue;
      const n = this.nodes[a.nodeIndex];
      if (a.delay < dt) {
        if (a.firstUpdate) {
          a.from = n.p[a.slot];
          a.firstUpdate = false;
          a.elapsed = f(-a.delay);
          a.delay = 0;
        }
        a.elapsed = f(a.elapsed + f(dt * a.playbackRate));
        a.elapsed = f(f(f(a.elapsed + f(f(dt * a.playbackRate) * 0.5)) - a.duration)) >= 0 ? a.duration : a.elapsed;
        let t = 1;
        if (a.duration !== 0) t = f(a.duration - a.elapsed) >= 0 ? f(a.elapsed / a.duration) : 1;
        let t2 = t;
        if (pb === PLAYBACK_ONCE_BACKWARD || pb === PLAYBACK_LOOP_BACKWARD || a.backwards) t2 = f(1 - t);
        if (pb === PLAYBACK_ONCE_PINGPONG || pb === PLAYBACK_LOOP_PINGPONG) {
          t2 = f(t2 * 2);
          if (t2 > 1) t2 = f(2 - t2);
        }
        const x = easingValue(a.easing, t2);
        n.p[a.slot] = f(a.from + f(f(a.to - a.from) * x));
        n.dirtyLocal = true;
        if (t >= 1) {
          if (looping) {
            a.elapsed = f(a.elapsed - a.duration);
            if (pb === PLAYBACK_LOOP_PINGPONG) a.backwards = !a.backwards;
          } else if (!a.completeCalled) {
            a.completeCalled = true;
            if (a.complete) a.complete(this, a.node, true, a.ud1, a.ud2);
            if (a.easing.release) a.easing.release();
          }
        }
      } else {
        a.delay = f(a.delay - dt);
      }
    }
    let n = anims.length;
    for (let i = 0; i < n; ++i) {
      const a = anims[i];
      if (a.elapsed >= a.duration || a.cancelled) {
        if (a.cancelled && a.complete && !a.completeCalled) {
          a.completeCalled = true;
          a.complete(this, a.node, false, a.ud1, a.ud2);
        }
        this.eraseSwapAnim(i);
        i--; n--;
      }
    }
  }

  /** Deferred deletion pass at the end of UpdateScene. */
  flushDeleted() {
    let count = this.nodes.length;
    for (let i = 0; i < count; ++i) {
      const n = this.nodes[i];
      if (n.deleted) {
        this.deleteNode(handleOf(n));
        if (this.nodes[i]) this.nodes[i].deleted = false;
        count = this.nodes.length;
      }
    }
  }

  // ----- transforms -----
  calculateReferenceScale(n: InternalNode | null): V4 {
    let sx: number, sy: number;
    if (this.adjustReference === ADJUST_REFERENCE_LEGACY || n === null || n.parent === INVALID) {
      sx = f(f(this.context.physicalWidth) / f(this.width));
      sy = f(f(this.context.physicalHeight) / f(this.height));
    } else {
      const as = this.nodes[n.parent].localAdjustScale;
      sx = as[0]; sy = as[1];
    }
    return [sx, sy, 1, 1];
  }

  private adjustPosScale(n: InternalNode, rs: V4, position: V4, scale: V4) {
    if (this.adjustReference === ADJUST_REFERENCE_LEGACY && n.parent !== INVALID) return;
    const adjust = applyAdjustOnReferenceScale(rs, n.adjustMode);
    let parentDims: V4;
    const rootLike = this.adjustReference === ADJUST_REFERENCE_LEGACY || n.parent === INVALID;
    if (rootLike) parentDims = [f(this.width), f(this.height), 0, 1];
    else { const p = this.nodes[n.parent]; parentDims = [p.p[16], p.p[17], 0, 1]; }
    const offset: V4 = [0, 0, 0, 0];
    const adjusted = mulPerElem(parentDims, adjust);
    if (rootLike) {
      const ref: V4 = [f(this.context.physicalWidth), f(this.context.physicalHeight), 0, 1];
      for (let i = 0; i < 4; i++) offset[i] = f(f(ref[i] - adjusted[i]) * 0.5);
    }
    const scaled = mulPerElem(position, adjust);
    if (n.xAnchor === XANCHOR_LEFT || n.xAnchor === XANCHOR_RIGHT) { offset[0] = 0; scaled[0] = f(position[0] * rs[0]); }
    if (n.yAnchor === YANCHOR_TOP || n.yAnchor === YANCHOR_BOTTOM) { offset[1] = 0; scaled[1] = f(position[1] * rs[1]); }
    for (let i = 0; i < 4; i++) position[i] = f(scaled[i] + offset[i]);
    const s = mulPerElem(adjust, scale);
    for (let i = 0; i < 4; i++) scale[i] = s[i];
  }

  updateLocalTransform(n: InternalNode) {
    const position = n.prop(PROPERTY_POSITION);
    const propScale = n.prop(PROPERTY_SCALE);
    let rs: V4 = [1, 1, 1, 1];
    n.localAdjustScale = [1, 1, 1, 1];
    if (this.adjustReference !== ADJUST_REFERENCE_DISABLED) {
      rs = this.calculateReferenceScale(n);
      this.adjustPosScale(n, rs, position, n.localAdjustScale);
    }
    const r = normalizeQ(eulerToQuat(n.p[4], n.p[5], n.p[6]));
    const rot = quatToM3(r);
    const s = mulPerElem(n.localAdjustScale, propScale);
    const m = new Float64Array(16);
    for (let c = 0; c < 3; c++) {
      m[c * 4] = f(rot[c * 3] * s[c]);
      m[c * 4 + 1] = f(rot[c * 3 + 1] * s[c]);
      m[c * 4 + 2] = f(rot[c * 3 + 2] * s[c]);
      m[c * 4 + 3] = 0;
    }
    m[12] = position[0]; m[13] = position[1]; m[14] = position[2]; m[15] = 1;
    n.localTransform = m;
    if (this.adjustReference === ADJUST_REFERENCE_PARENT && n.parent !== INVALID) {
      n.localTransform = mulM(scaleM(f(1 / rs[0]), f(1 / rs[1]), f(1 / rs[2])), n.localTransform);
    }
    n.dirtyLocal = false;
  }

  private needsLocal(n: InternalNode): boolean {
    return n.dirtyLocal || (this.resChanged && this.adjustReference !== ADJUST_REFERENCE_DISABLED);
  }

  private calculateParentNodeTransform(n: InternalNode): M4 {
    let parentT: M4 | null = null;
    if (n.parent !== INVALID) parentT = this.calculateParentNodeTransform(this.nodes[n.parent]);
    if (this.needsLocal(n)) this.updateLocalTransform(n);
    let out = n.localTransform;
    if (parentT) out = mulM(parentT, out);
    return out;
  }

  calculateNodeTransform(n: InternalNode, flags: number): M4 {
    let parentT: M4 | null = null;
    if (n.parent !== INVALID) parentT = this.calculateParentNodeTransform(this.nodes[n.parent]);
    if (this.needsLocal(n)) this.updateLocalTransform(n);
    let out = copyM(n.localTransform);
    calculateNodeExtents(n, flags, out);
    if (parentT) out = mulM(parentT, out);
    return out;
  }

  private parentTransformAndAlphaCached(n: InternalNode): { t: M4; o: number } {
    const c = this.context;
    let cacheIndex: number;
    let cached: boolean;
    if (n.travCacheVersion !== c.travVersion) {
      n.travCacheVersion = c.travVersion;
      cacheIndex = n.travCacheIndex = c.travIndex++;
      cached = false;
    } else {
      cacheIndex = n.travCacheIndex;
      cached = true;
    }
    let parent: { t: M4; o: number } | null = null;
    if (n.parent !== INVALID) parent = this.parentTransformAndAlphaCached(this.nodes[n.parent]);
    if (this.needsLocal(n)) {
      this.updateLocalTransform(n);
    } else if (cached) {
      return c.travData[cacheIndex];
    }
    let t = n.localTransform;
    let o = n.p[PROPERTY_COLOR * 4 + 3];
    if (parent) {
      t = mulM(parent.t, t);
      if (n.inheritAlpha) o = f(o * parent.o);
    }
    const d = { t, o };
    c.travData[cacheIndex] = d;
    return d;
  }

  private nodeTransformAndAlphaCached(n: InternalNode, flags: number): { t: M4; o: number } {
    let parent: { t: M4; o: number } | null = null;
    if (n.parent !== INVALID) parent = this.parentTransformAndAlphaCached(this.nodes[n.parent]);
    if (this.needsLocal(n)) this.updateLocalTransform(n);
    let t = copyM(n.localTransform);
    calculateNodeExtents(n, flags, t);
    let o = n.p[PROPERTY_COLOR * 4 + 3];
    if (parent) {
      t = mulM(parent.t, t);
      if (n.inheritAlpha) o = f(o * parent.o);
    }
    return { t, o };
  }

  pickNode(h: number, x: number, y: number): boolean {
    const c = this.context;
    const sx = f(f(c.physicalWidth) / f(c.defaultProjectWidth));
    const sy = f(f(c.physicalHeight) / f(c.defaultProjectHeight));
    const n = this.getNode(h);
    let t = this.calculateNodeTransform(n, CALCULATE_NODE_BOUNDARY | CALCULATE_NODE_INCLUDE_SIZE | CALCULATE_NODE_RESET_PIVOT);
    t[10] = 1;
    t = inverse(t);
    let np = mulV4(t, f(f(x) * sx), f(f(y) * sy), 0, 1);
    const EPS = 0.0001;
    if (Math.abs(np[2]) > EPS) {
      const rd = [t[8], t[9], t[10], t[11]];
      if (Math.abs(rd[2]) < 0.0001) return false;
      const k = f(np[2] / rd[2]);
      np = [f(np[0] - f(rd[0] * k)), f(np[1] - f(rd[1] * k)), f(np[2] - f(rd[2] * k)), f(np[3] - f(rd[3] * k))];
    }
    return np[0] >= 0 && np[0] <= 1 && np[1] >= 0 && np[1] <= 1;
  }

  // ----- layouts -----
  getLayoutIndex(id: string): number {
    const i = this.layouts.indexOf(id);
    if (i < 0) { console.error(`Could not get index for layout '${id}'`); return 0; }
    return i;
  }

  setLayout(id: string, setNode: (scene: Scene, h: number, desc: any) => void) {
    this.layoutId = id;
    const index = this.getLayoutIndex(id);
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      if (!n.nodeDescTable) continue;
      setNode(this, handleOf(n), n.nodeDescTable[index]);
      n.dirtyLocal = true;
    }
  }

  // ----- render collection -----
  private layerIndexOf(n: InternalNode): number {
    if (n.layerHash === DEFAULT_LAYER && n.parent !== INVALID) return this.layerIndexOf(this.nodes[n.parent & 0xffff]);
    return n.layerIndex;
  }

  private updateScope(n: InternalNode, scope: StencilScope, child: StencilScope, parentScope: StencilScope | null, index: number,
                      nonInvCount: number, invCount: number, bitOffset: number) {
    const bitRange = calcBitRange(nonInvCount);
    scope.writeMask = 0xff;
    scope.testMask = 0;
    if (parentScope) scope.testMask = parentScope.testMask;
    const inverted = n.clippingInverted;
    if (!inverted) {
      scope.refVal = ((index + 1) << bitOffset) & 0xff;
      if (parentScope) scope.refVal = (scope.refVal | parentScope.refVal) & 0xff;
    } else {
      scope.refVal = (1 << (7 - index)) & 0xff;
      if (parentScope) scope.refVal = (scope.refVal | (calcMask(bitOffset) & parentScope.refVal)) & 0xff;
    }
    scope.colorMask = inverted && n.clippingVisible ? 0xf : 0;
    child.writeMask = 0;
    if (!inverted) {
      child.refVal = scope.refVal;
      child.testMask = ((calcMask(bitRange) << bitOffset) | scope.testMask) & 0xff;
    } else {
      child.refVal = 0;
      child.testMask = scope.refVal;
      if (parentScope) {
        child.refVal = (child.refVal | parentScope.refVal) & 0xff;
        child.testMask = (child.testMask | parentScope.testMask) & 0xff;
      }
    }
    child.colorMask = 0xf;
    const invertedCount = inverted ? index + 1 : invCount;
    if (invertedCount + bitOffset + bitRange > 8) console.warn('Stencil buffer exceeded, clipping will not work as expected.');
  }

  private collectInvClippers(start: number, clippers: ClippingNode[], ctx: { head: number; tail: number; bitOffset: number; count: number; invCount: number }, parentIndex: number) {
    let index = start;
    const parent = parentIndex !== INVALID ? clippers[parentIndex] : null;
    while (index !== INVALID) {
      const n = this.nodes[index];
      if (n.enabled) {
        if (n.clippingMode === CLIPPING_MODE_STENCIL) {
          const ci = clippers.length;
          const c = new ClippingNode();
          clippers.push(c);
          c.nodeIndex = index; c.parentIndex = parentIndex; c.nextNonInvIndex = INVALID; c.visibleRenderKey = -1;
          n.clipperIndex = ci;
          if (n.clippingInverted) {
            this.updateScope(n, c.scope, c.childScope, parent ? parent.childScope : null, ctx.invCount, 0, 0, ctx.bitOffset);
            ++ctx.invCount;
            this.collectInvClippers(n.childHead, clippers, ctx, ci);
          } else {
            if (ctx.head !== INVALID) clippers[ctx.tail].nextNonInvIndex = ci;
            else ctx.head = ci;
            ctx.tail = ci;
            ++ctx.count;
          }
        } else if (n.clippingMode === CLIPPING_MODE_NONE) {
          n.clipperIndex = parentIndex;
          this.collectInvClippers(n.childHead, clippers, ctx, parentIndex);
        }
      }
      index = n.next;
    }
  }

  private collectClippers(start: number, bitOffset: number, invCount: number, clippers: ClippingNode[], parentIndex: number) {
    const ctx = { head: INVALID, tail: INVALID, bitOffset, count: 0, invCount };
    this.collectInvClippers(start, clippers, ctx, parentIndex);
    let ci = ctx.head;
    let index = 0;
    while (ci !== INVALID) {
      const c = clippers[ci];
      const ps = c.parentIndex !== INVALID ? clippers[c.parentIndex].childScope : null;
      const node = this.nodes[c.nodeIndex];
      this.updateScope(node, c.scope, c.childScope, ps, index, ctx.count, ctx.invCount, bitOffset);
      const br = calcBitRange(ctx.count);
      this.collectClippers(node.childHead, ctx.bitOffset + br, ctx.invCount, clippers, ci);
      ci = c.nextNonInvIndex;
      ++index;
    }
  }

  private collectRenderEntries(start: number, order: number, scope: Scope | null, clippers: ClippingNode[], out: RenderEntry[]): number {
    let index = start;
    while (index !== INVALID) {
      const n = this.nodes[index];
      if (n.enabled) {
        const h = handleOf(n);
        const layer = this.layerIndexOf(n);
        if (n.clipperIndex !== INVALID) {
          const clipper = clippers[n.clipperIndex];
          if (clipper && clipper.nodeIndex === index) {
            const root = scope === null;
            const tmp: Scope = { index: 1, rootLayer: 0, rootIndex: order };
            let cur = scope;
            if (cur === null) { cur = tmp; ++order; }
            else cur.index = Math.min(255, cur.index + 1);
            const clippingKey = scopeKey(cur, 0, 0);
            let renderKey = scopeKey(cur, layer, 1);
            this.collectRenderEntries(n.childHead, 2, cur, clippers, out);
            if (layer > 0) renderKey = scopeKey(cur, layer, 1);
            clipper.visibleRenderKey = renderKey;
            out.push({ node: h, key: clippingKey });
            if (n.clippingVisible) out.push({ node: h, key: renderKey });
            if (!root) cur.index = Math.min(255, cur.index + 1);
            index = n.next;
            continue;
          }
        }
        if (n.nodeType === NODE_TYPE_PARTICLEFX) {
          // particle fx are not supported by the port (none are emitted by the game)
        } else {
          out.push({ node: h, key: scopeKey(scope, layer, order++) });
        }
        order = this.collectRenderEntries(n.childHead, order, scope, clippers, out);
      }
      index = n.next;
    }
    return order;
  }

  /** dmGui::RenderScene: returns sorted entries with transforms, opacities and stencil scopes. */
  renderScene(): { entries: RenderEntry[]; transforms: M4[]; opacities: number[]; scopes: (StencilScope | null)[] } {
    const c = this.context;
    c.travIndex = 0;
    if (++c.travVersion === INVALID) c.travVersion = 0;
    const clippers: ClippingNode[] = [];
    const entries: RenderEntry[] = [];
    this.collectClippers(this.renderHead, 0, 0, clippers, INVALID);
    this.collectRenderEntries(this.renderHead, 0, null, clippers, entries);
    entries.sort((a, b) => a.key - b.key);
    const transforms: M4[] = [], opacities: number[] = [], scopes: (StencilScope | null)[] = [];
    for (const e of entries) {
      const index = e.node & 0xffff;
      const n = this.nodes[index];
      this.calculateNodeSize(n);
      const r = this.nodeTransformAndAlphaCached(n, CALCULATE_NODE_INCLUDE_SIZE | CALCULATE_NODE_RESET_PIVOT);
      transforms.push(r.t);
      opacities.push(r.o);
      if (n.clipperIndex !== INVALID && clippers[n.clipperIndex]) {
        const cl = clippers[n.clipperIndex];
        if (cl.nodeIndex === index) {
          if (cl.visibleRenderKey === e.key) {
            scopes.push(cl.parentIndex !== INVALID ? clippers[cl.parentIndex].childScope : null);
          } else {
            scopes.push(cl.scope);
          }
        } else {
          scopes.push(cl.childScope);
        }
      } else {
        scopes.push(null);
      }
    }
    this.resChanged = false;
    return { entries, transforms, opacities, scopes };
  }
}

export function mulPerElem(a: ArrayLike<number>, b: ArrayLike<number>): V4 {
  return [f(a[0] * b[0]), f(a[1] * b[1]), f(a[2] * b[2]), f(a[3] * b[3])];
}

export function applyAdjustOnReferenceScale(rs: V4, mode: number): V4 {
  const out: V4 = [rs[0], rs[1], rs[2], rs[3]];
  if (mode === ADJUST_MODE_FIT) { const u = Math.min(rs[0], rs[1]); out[0] = u; out[1] = u; }
  else if (mode === ADJUST_MODE_ZOOM) { const u = Math.max(rs[0], rs[1]); out[0] = u; out[1] = u; }
  out[2] = 1; out[3] = 1;
  return out;
}

export function calcPivotDelta(pivot: number, w: number, h: number): V4 {
  const d: V4 = [0, 0, 0, 1];
  switch (pivot) {
    case PIVOT_CENTER: case PIVOT_S: case PIVOT_N: d[0] = f(-w * 0.5); break;
    case PIVOT_NE: case PIVOT_E: case PIVOT_SE: d[0] = f(-w); break;
  }
  switch (pivot) {
    case PIVOT_CENTER: case PIVOT_E: case PIVOT_W: d[1] = f(-h * 0.5); break;
    case PIVOT_N: case PIVOT_NE: case PIVOT_NW: d[1] = f(-h); break;
  }
  return d;
}

/** CalculateNodeExtents, mutating `t` */
export function calculateNodeExtents(n: InternalNode, flags: number, t: M4) {
  let sx = 1, sy = 1;
  if (flags & CALCULATE_NODE_INCLUDE_SIZE) { sx = n.p[16]; sy = n.p[17]; }
  if (flags & CALCULATE_NODE_RESET_PIVOT) {
    const d = calcPivotDelta(n.pivot, sx, sy);
    const pd = mulV4(t, d[0], d[1], d[2], d[3]);
    t[12] = pd[0]; t[13] = pd[1]; t[14] = pd[2]; t[15] = pd[3];
  }
  const renderText = n.nodeType === NODE_TYPE_TEXT && !(flags & CALCULATE_NODE_BOUNDARY);
  if ((flags & CALCULATE_NODE_INCLUDE_SIZE) && !renderText) {
    for (let r = 0; r < 3; r++) {
      t[r] = f(t[r] * sx);
      t[4 + r] = f(t[4 + r] * sy);
      // column 2 scaled by 1
    }
  }
}
