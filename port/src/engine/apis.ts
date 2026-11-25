// The Defold script APIs (gui_script.cpp, script_vmath.cpp, script_msg.cpp,
// script_sys.cpp, script_json.cpp, script_html5_js.cpp, script_timer.cpp,
// script_window.cpp, script_http_js.cpp) on top of the runtime.
import { Vector3, Vector4, type Vec, type Node, type TextMetrics, type GuiApi, type MsgApi, type VmathApi, type SysApi, type Url } from './api';
import { engine, URL, Component } from './runtime';
import { f } from './math32';
import {
  Scene, InternalNode, handleOf, getPropertyDesc, Easing, AnimationComplete, TYPE_FLOAT_VECTOR, INVALID,
  PROPERTY_POSITION, PROPERTY_ROTATION, PROPERTY_SCALE, PROPERTY_COLOR, PROPERTY_SIZE, PROPERTY_OUTLINE, PROPERTY_SHADOW, PROPERTY_SLICE9,
  PROPERTY_TEXT_PARAMS, PROPERTY_PIE_PARAMS, NODE_TYPE_BOX, NODE_TYPE_TEXT, NODE_TYPE_PIE, SIZE_MODE_MANUAL, CALCULATE_NODE_BOUNDARY,
  CALCULATE_NODE_INCLUDE_SIZE, CALCULATE_NODE_RESET_PIVOT, PIVOT_CENTER, PIVOT_NW,
} from './gui_core';
import { mulV4 } from './math32';
import { getTextMetrics, FontMap } from './font';
import { numToStr, tostring } from '../lua/string';
import { literal, presized, withKeyOrder } from '../lua/table';

// ======================= gui =======================

export class NodeProxy implements Node {
  readonly __node = true as const;
  constructor(public scene: Scene, public h: number) {}
  __tostring(): string {
    const s = this.scene;
    if (engine.current()?.scene !== s) return '<foreign scene node>';
    if (!s.isNodeValid(this.h)) throw new Error('Deleted node');
    const n = s.getNode(this.h);
    const p = `@(${numToStr(n.p[0])}, ${numToStr(n.p[1])}, ${numToStr(n.p[2])})`;
    switch (n.nodeType) {
      case NODE_TYPE_BOX: return 'box' + p;
      case NODE_TYPE_TEXT: return (n.text ?? '') + p;
      case 4: return 'spine' + p;
      case 5: return 'particlefx' + p;
      default: return 'unknown' + p;
    }
  }
  toString() { try { return this.__tostring(); } catch { return 'node'; } }
}

export function proxyFor(scene: Scene, h: number): NodeProxy {
  let p = scene.proxies.get(h);
  if (!p) { p = new NodeProxy(scene, h); scene.proxies.set(h, p); }
  return p;
}

function checkNode(node: Node | undefined | null): { scene: Scene; h: number; n: InternalNode } {
  if (!node || !(node instanceof NodeProxy)) throw new Error('bad argument (node expected, got ' + tostring(node as any) + ')');
  const scene = engine.currentScene();
  if (node.scene !== scene) throw new Error('Node used in the wrong scene');
  if (!scene.isNodeValid(node.h)) throw new Error('Deleted node');
  return { scene, h: node.h, n: scene.getNode(node.h) };
}

const isV3 = (v: any): v is Vector3 => v instanceof Vector3;
const isV4 = (v: any): v is Vector4 => v instanceof Vector4;

function v4From(v: any, orig: ArrayLike<number>): number[] {
  if (isV3(v)) return [v.x, v.y, v.z, orig[3]];
  if (isV4(v)) return [v.x, v.y, v.z, v.w];
  throw new Error('bad argument #2 (vmath.vector4 expected, got ' + typeof v + ')');
}

function luaString(v: any): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return numToStr(v);
  throw new Error('bad argument (string expected, got ' + (v === undefined || v === null ? 'nil' : typeof v) + ')');
}

/** Callback bound to the running gui script, invoked with (self, node) on completion. */
function animCallback(fn: ((self: any, node: Node) => void) | undefined | null, node: NodeProxy): { cb: AnimationComplete | null; comp: Component | null } {
  if (typeof fn !== 'function') return { cb: null, comp: null };
  const comp = engine.currentComp();
  const cb: AnimationComplete = (_scene, _h, finished) => {
    if (finished) engine.run(comp, () => fn(comp ? comp.self : undefined, node));
  };
  return { cb, comp };
}

const FLT_MAX = 3.4028234663852886e38;

function newProxy(scene: Scene, h: number) { return proxyFor(scene, h); }

// gui_script.cpp CloneNodeListToTable / CloneNodeToTable: stop at the first
// clone that fails; what was cloned before it stays. Returns false when out of nodes.
function cloneTreeInto(scene: Scene, out: Record<string, Node>, start: number, parent: number): boolean {
  let index = start;
  let ok = true;
  while (index !== INVALID && ok) {
    const node = scene.nodes[index];
    const outH = cloneNodeToTable(scene, out, node);
    ok = outH !== 0;
    if (ok) scene.setNodeParent(outH, parent, false);
    index = node.next;
  }
  return ok;
}
/** The clone's handle, or 0 if the scene ran out of nodes on the way. */
function cloneNodeToTable(scene: Scene, out: Record<string, Node>, n: InternalNode): number {
  const outH = scene.cloneNode(handleOf(n));
  if (!outH) return 0;
  out[n.nameHash] = newProxy(scene, outH);
  if (!cloneTreeInto(scene, out, n.childHead, outH)) return 0;
  return outH;
}

function propGet3(node: Node, prop: number): Vector3 {
  const { n } = checkNode(node);
  return new Vector3(n.p[prop * 4], n.p[prop * 4 + 1], n.p[prop * 4 + 2]);
}
function propGet4(node: Node, prop: number): Vector4 {
  const { n } = checkNode(node);
  return new Vector4(n.p[prop * 4], n.p[prop * 4 + 1], n.p[prop * 4 + 2], n.p[prop * 4 + 3]);
}
function propSet(node: Node, prop: number, v: Vec) {
  const { n } = checkNode(node);
  if (n.isBone) return;
  n.setProp(prop, v4From(v, n.prop(prop)));
  n.dirtyLocal = true;
}

const notAvailable = (name: string) => () => { throw new Error(`attempt to call field '${name}' (a nil value)`); };

export const gui: GuiApi & Record<string, any> = {
  ADJUST_FIT: 0, ADJUST_ZOOM: 1, ADJUST_STRETCH: 2,
  ANCHOR_NONE: 0, ANCHOR_LEFT: 1, ANCHOR_RIGHT: 2, ANCHOR_TOP: 1, ANCHOR_BOTTOM: 2,
  PIVOT_CENTER: 0, PIVOT_N: 1, PIVOT_NE: 2, PIVOT_E: 3, PIVOT_SE: 4, PIVOT_S: 5, PIVOT_SW: 6, PIVOT_W: 7, PIVOT_NW: 8,
  PROP_POSITION: 'position', PROP_ROTATION: 'rotation', PROP_SCALE: 'scale', PROP_COLOR: 'color',
  PROP_OUTLINE: 'outline', PROP_SHADOW: 'shadow', PROP_SIZE: 'size', PROP_FILL_ANGLE: 'fill_angle', PROP_INNER_RADIUS: 'inner_radius', PROP_SLICE9: 'slice9',
  PLAYBACK_ONCE_FORWARD: 0, PLAYBACK_ONCE_BACKWARD: 1, PLAYBACK_ONCE_PINGPONG: 2,
  PLAYBACK_LOOP_FORWARD: 3, PLAYBACK_LOOP_BACKWARD: 4, PLAYBACK_LOOP_PINGPONG: 5,
  CLIPPING_MODE_NONE: 0, CLIPPING_MODE_STENCIL: 2,
  SIZE_MODE_MANUAL: 0, SIZE_MODE_AUTO: 1,
  BLEND_ALPHA: 0, BLEND_ADD: 1, BLEND_ADD_ALPHA: 2, BLEND_MULT: 3,
  KEYBOARD_TYPE_DEFAULT: 0, KEYBOARD_TYPE_NUMBER_PAD: 1, KEYBOARD_TYPE_EMAIL: 2, KEYBOARD_TYPE_PASSWORD: 3,
  PIEBOUNDS_RECTANGLE: 0, PIEBOUNDS_ELLIPSE: 1,
  EASING_NONE: 0, EASING_IN: 5, EASING_OUT: 6, EASING_INOUT: 7,
  EASING_LINEAR: 0,
  EASING_INQUAD: 1, EASING_OUTQUAD: 2, EASING_INOUTQUAD: 3, EASING_OUTINQUAD: 4,
  EASING_INCUBIC: 5, EASING_OUTCUBIC: 6, EASING_INOUTCUBIC: 7, EASING_OUTINCUBIC: 8,
  EASING_INQUART: 9, EASING_OUTQUART: 10, EASING_INOUTQUART: 11, EASING_OUTINQUART: 12,
  EASING_INQUINT: 13, EASING_OUTQUINT: 14, EASING_INOUTQUINT: 15, EASING_OUTINQUINT: 16,
  EASING_INSINE: 17, EASING_OUTSINE: 18, EASING_INOUTSINE: 19, EASING_OUTINSINE: 20,
  EASING_INEXPO: 21, EASING_OUTEXPO: 22, EASING_INOUTEXPO: 23, EASING_OUTINEXPO: 24,
  EASING_INCIRC: 25, EASING_OUTCIRC: 26, EASING_INOUTCIRC: 27, EASING_OUTINCIRC: 28,
  EASING_INELASTIC: 29, EASING_OUTELASTIC: 30, EASING_INOUTELASTIC: 31, EASING_OUTINELASTIC: 32,
  EASING_INBACK: 33, EASING_OUTBACK: 34, EASING_INOUTBACK: 35, EASING_OUTINBACK: 36,
  EASING_INBOUNCE: 37, EASING_OUTBOUNCE: 38, EASING_INOUTBOUNCE: 39, EASING_OUTINBOUNCE: 40,

  get_node(id) {
    const scene = engine.currentScene();
    const key = luaString(id);
    const h = scene.getNodeById(key);
    if (h === 0) throw new Error(typeof id === 'string' ? 'No such node: ' + key : `No such node: '${key}'`);
    return newProxy(scene, h);
  },
  get_id(node) { return checkNode(node).n.nameHash; },
  set_id(node, id) { checkNode(node).n.nameHash = luaString(id); },
  get_index(node: Node) {
    const { scene, n } = checkNode(node);
    let index = 0;
    let i = n.parent !== INVALID ? scene.nodes[n.parent].childHead : scene.renderHead;
    while (i !== INVALID && i !== n.index) { index++; i = scene.nodes[i].next; }
    return index;
  },
  new_box_node(pos, size) {
    const scene = engine.currentScene();
    const p = isV4(pos) ? [pos.x, pos.y, pos.z] : isV3(pos) ? [pos.x, pos.y, pos.z] : (() => { throw new Error('bad argument #1 (vmath.vector3 expected)'); })();
    if (!isV3(size)) throw new Error('bad argument #2 (vmath.vector3 expected)');
    const h = scene.newNode(p, [size.x, size.y, size.z], NODE_TYPE_BOX);
    if (!h) throw new Error('Out of nodes (max ' + scene.nodeCapacity() + ')');
    const n = scene.getNode(h);
    n.font = null;
    n.text = null;
    return newProxy(scene, h);
  },
  new_text_node(pos, text) {
    const scene = engine.currentScene();
    const p = isV4(pos) ? [pos.x, pos.y, pos.z] : isV3(pos) ? [pos.x, pos.y, pos.z] : (() => { throw new Error('bad argument #1 (vmath.vector3 expected)'); })();
    const str = luaString(text);
    const font = scene.defaultFont ?? scene.context.defaultFont;
    const size = [1, 1, 1];
    if (font) {
      const m = getTextMetrics(font, str, 0, false, 1, 0);
      size[0] = m.width;
      size[1] = f(m.max_ascent + m.max_descent);
    }
    const h = scene.newNode(p, size, NODE_TYPE_TEXT);
    if (!h) throw new Error('Out of nodes (max ' + scene.nodeCapacity() + ')');
    const n = scene.getNode(h);
    n.font = font;
    n.text = str;
    return newProxy(scene, h);
  },
  new_pie_node(pos: Vec, size: Vector3) {
    const scene = engine.currentScene();
    const h = scene.newNode([pos.x, pos.y, pos.z], [size.x, size.y, size.z], NODE_TYPE_PIE);
    if (!h) throw new Error('Out of nodes (max ' + scene.nodeCapacity() + ')');
    return newProxy(scene, h);
  },
  delete_node(node) {
    const { n } = checkNode(node);
    if (n.isBone) throw new Error('Unable to delete bone nodes of a spine node.');
    n.deleted = true;
  },
  clone(node) {
    const { scene, h } = checkNode(node);
    const out = scene.cloneNode(h);
    if (!out) throw new Error('Not enough resources to clone the node');
    scene.moveNodeAbove(out, h);
    return newProxy(scene, out);
  },
  clone_tree(node) {
    const scene = engine.currentScene();
    const out: Record<string, Node> = {};
    if (node !== undefined && node !== null) {
      const { n } = checkNode(node);
      const outH = cloneNodeToTable(scene, out, n);
      if (!outH) throw new Error('Not enough resources to clone the node tree');
      const parent = n.parent !== INVALID ? handleOf(scene.nodes[n.parent]) : 0;
      scene.setNodeParent(outH, parent, false);
    } else {
      if (!cloneTreeInto(scene, out, scene.renderHead, 0)) throw new Error('Not enough resources to clone the node tree');
    }
    return out;
  },

  get_position(node) { return propGet3(node, PROPERTY_POSITION); },
  set_position(node, p) { propSet(node, PROPERTY_POSITION, p); },
  get_rotation(node) { return propGet3(node, PROPERTY_ROTATION); },
  set_rotation(node, r) { propSet(node, PROPERTY_ROTATION, r); },
  get_scale(node) { return propGet3(node, PROPERTY_SCALE); },
  set_scale(node, s) { propSet(node, PROPERTY_SCALE, s); },
  get_size(node) { return propGet3(node, PROPERTY_SIZE); },
  set_size(node, s) {
    const { n } = checkNode(node);
    if (n.sizeMode !== SIZE_MODE_MANUAL) { console.warn('WARNING:GUI: Can not set size on auto-sized nodes.'); return; }
    if (n.isBone) return;
    n.setProp(PROPERTY_SIZE, v4From(s, n.prop(PROPERTY_SIZE)));
    n.dirtyLocal = true;
  },
  get_color(node) { return propGet4(node, PROPERTY_COLOR); },
  set_color(node, c) { propSet(node, PROPERTY_COLOR, c); },
  get_outline(node) { return propGet4(node, PROPERTY_OUTLINE); },
  set_outline(node, c) { propSet(node, PROPERTY_OUTLINE, c); },
  get_shadow(node) { return propGet4(node, PROPERTY_SHADOW); },
  set_shadow(node, c) { propSet(node, PROPERTY_SHADOW, c); },
  get_screen_position(node) {
    const { scene, n } = checkNode(node);
    const t = scene.calculateNodeTransform(n, CALCULATE_NODE_BOUNDARY | CALCULATE_NODE_INCLUDE_SIZE | CALCULATE_NODE_RESET_PIVOT);
    const p = mulV4(t, 0.5, 0.5, 0, 1);
    return new Vector3(p[0], p[1], p[2]);
  },
  // Not part of Defold 1.2.167: the game installs these from gui_extra_functions.
  set_screen_position: notAvailable('set_screen_position'),
  screen_pos_to_node_pos: notAvailable('screen_pos_to_node_pos'),
  get_slice9(node) { return propGet4(node, PROPERTY_SLICE9); },
  set_slice9(node, s) {
    const { n } = checkNode(node);
    if (!isV4(s)) throw new Error('invalid parameter given');
    n.setProp(PROPERTY_SLICE9, [s.x, s.y, s.z, s.w]);
    n.dirtyLocal = true;
  },

  is_enabled(node) { return checkNode(node).n.enabled; },
  set_enabled(node, enabled) {
    const { scene, h } = checkNode(node);
    scene.setNodeEnabled(h, enabled !== undefined && enabled !== null && enabled !== false);
  },
  get_text(node) { return checkNode(node).n.text as string; },
  set_text(node, text) { checkNode(node).n.text = luaString(text); },
  get_font(node) { return checkNode(node).n.fontHash; },
  set_font(node, font) {
    const { scene, h } = checkNode(node);
    const id = luaString(font);
    if (!scene.setNodeFont(h, id)) throw new Error(`Font '${id}' is not specified in scene`);
  },
  get_line_break(node) { return checkNode(node).n.lineBreak; },
  set_line_break(node, b) { checkNode(node).n.lineBreak = b !== undefined && b !== null && b !== false; },
  get_leading(node: Node) { return checkNode(node).n.p[PROPERTY_TEXT_PARAMS * 4]; },
  set_leading(node: Node, v: number) { checkNode(node).n.p[PROPERTY_TEXT_PARAMS * 4] = v; },
  get_tracking(node: Node) { return checkNode(node).n.p[PROPERTY_TEXT_PARAMS * 4 + 1]; },
  set_tracking(node: Node, v: number) { checkNode(node).n.p[PROPERTY_TEXT_PARAMS * 4 + 1] = v; },
  get_texture(node) { return checkNode(node).n.textureHash; },
  set_texture(node, texture) {
    const { scene, h } = checkNode(node);
    const id = luaString(texture);
    if (!scene.setNodeTexture(h, id)) throw new Error(`Texture '${id}' is not specified in scene`);
  },
  get_flipbook(node) {
    const { n } = checkNode(node);
    return n.textureType === 2 ? n.flipbookAnimHash : '';
  },
  play_flipbook(node, animation, complete?, props?: any) {
    const { scene, h, n } = checkNode(node);
    let offset = 0, rate = 1;
    if (props !== undefined && props !== null) {
      if (props.offset !== undefined && props.offset !== null) offset = Number(props.offset);
      if (props.playback_rate !== undefined && props.playback_rate !== null) rate = Number(props.playback_rate);
    }
    const anim = luaString(animation);
    const { cb } = animCallback(complete as any, node as NodeProxy);
    const r = cb ? scene.playNodeFlipbookAnim(h, anim, offset, rate, cb, null, null) : scene.playNodeFlipbookAnim(h, anim, offset, rate);
    if (r !== 0) throw new Error(`Animation '${anim}' invalid for node '${n.nameHash}' (no animation set)`);
  },
  cancel_flipbook(node) { const { scene, h } = checkNode(node); scene.cancelNodeFlipbookAnim(h); },
  get_pivot(node) { return checkNode(node).n.pivot; },
  set_pivot(node, p) {
    const { n } = checkNode(node);
    const pivot = Math.trunc(Number(p));
    if (!(pivot >= PIVOT_CENTER && pivot <= PIVOT_NW)) throw new Error('Invalid pivot: ' + pivot);
    n.pivot = pivot;
  },
  get_xanchor(node) { return checkNode(node).n.xAnchor; },
  set_xanchor(node, a) {
    const { n } = checkNode(node);
    const v = Math.trunc(Number(a));
    if (v !== 0 && v !== 1 && v !== 2) throw new Error('Invalid x-anchor: ' + v);
    n.xAnchor = v;
  },
  get_yanchor(node) { return checkNode(node).n.yAnchor; },
  set_yanchor(node, a) {
    const { n } = checkNode(node);
    const v = Math.trunc(Number(a));
    if (v !== 0 && v !== 1 && v !== 2) throw new Error('Invalid y-anchor: ' + v);
    n.yAnchor = v;
  },
  get_adjust_mode(node) { return checkNode(node).n.adjustMode; },
  set_adjust_mode(node, m) { checkNode(node).n.adjustMode = Math.trunc(Number(m)) & 3; },
  get_size_mode(node) { return checkNode(node).n.sizeMode; },
  set_size_mode(node, m) { const { scene, h } = checkNode(node); scene.setNodeSizeMode(h, Math.trunc(Number(m))); },
  get_blend_mode(node: Node) { return checkNode(node).n.blendMode; },
  set_blend_mode(node: Node, m: number) { checkNode(node).n.blendMode = Math.trunc(m); },
  get_parent(node) {
    const { scene, n } = checkNode(node);
    if (n.parent === INVALID) return undefined;
    return newProxy(scene, handleOf(scene.nodes[n.parent]));
  },
  set_parent(node, parent, keep) {
    const { scene, h, n } = checkNode(node);
    if (n.isBone) return;
    let p = 0;
    if (parent !== undefined && parent !== null) p = checkNode(parent).h;
    const k = keep === true;
    if (!scene.setNodeParent(h, p, k)) throw new Error('Unable to set parent since it would cause an infinite loop');
  },
  get_layer(node) { return checkNode(node).n.layerHash; },
  set_layer(node, layer) {
    const { scene, h } = checkNode(node);
    const id = luaString(layer);
    if (!scene.setNodeLayer(h, id)) throw new Error(`Layer '${id}' is not specified in scene`);
  },
  get_inherit_alpha(node) { return checkNode(node).n.inheritAlpha; },
  set_inherit_alpha(node, b) { checkNode(node).n.inheritAlpha = b !== undefined && b !== null && b !== false; },
  get_clipping_mode(node) { return checkNode(node).n.clippingMode; },
  set_clipping_mode(node, m) { checkNode(node).n.clippingMode = Math.trunc(Number(m)); },
  get_clipping_visible(node) { return checkNode(node).n.clippingVisible; },
  set_clipping_visible(node, b) { checkNode(node).n.clippingVisible = b !== undefined && b !== null && b !== false; },
  get_clipping_inverted(node) { return checkNode(node).n.clippingInverted; },
  set_clipping_inverted(node, b) { checkNode(node).n.clippingInverted = b !== undefined && b !== null && b !== false; },
  move_above(node, ref) {
    const { scene, h } = checkNode(node);
    const r = ref !== undefined && ref !== null ? checkNode(ref).h : 0;
    scene.moveNodeAbove(h, r);
  },
  move_below(node, ref) {
    const { scene, h } = checkNode(node);
    const r = ref !== undefined && ref !== null ? checkNode(ref).h : 0;
    scene.moveNodeBelow(h, r);
  },
  set_render_order(order) {
    const scene = engine.currentScene();
    let o = Math.trunc(Number(order));
    if (o < 0 || o > 15) console.warn('WARNING:GUI: Render must be in range [0,15]');
    o = Math.min(Math.max(o, 0), 15);
    scene.renderOrder = o;
  },
  get_layout() { return engine.currentScene().layoutId; },
  get_width() { return engine.currentScene().width; },
  get_height() { return engine.currentScene().height; },
  reset_nodes() { engine.currentScene().resetNodes(); },

  animate(node, property, to, easing, duration, delay?, complete?, playback?) {
    const { scene, h, n } = checkNode(node);
    const prop = luaString(property);
    const pd = getPropertyDesc(prop);
    if (!pd) throw new Error(`property '${prop}' not found`);
    let toV: number[];
    if (typeof to === 'number') toV = [to, to, to, to];
    else if (isV3(to)) { const orig = pd.comp === 0xff ? n.prop(pd.prop)[3] : n.p[pd.prop * 4 + pd.comp]; toV = [to.x, to.y, to.z, orig]; }
    else if (isV4(to)) toV = [to.x, to.y, to.z, to.w];
    else throw new Error('bad argument #3 (vmath.vector4 expected)');
    toV = toV.map((x) => f(x));
    let curve: Easing;
    if (typeof easing === 'number') {
      const type = Math.trunc(easing);
      if (type >= 42) throw new Error('invalid easing constant');
      curve = { type, vector: null };
    } else if (Array.isArray(easing) || easing instanceof Float32Array) {
      curve = { type: TYPE_FLOAT_VECTOR, vector: Float32Array.from(easing as ArrayLike<number>) };
    } else {
      throw new Error('easing must be either a easing constant or a vmath.vector');
    }
    if (typeof duration !== 'number') throw new Error('bad argument #5 (number expected)');
    let d = 0;
    let cb: AnimationComplete | null = null;
    if (typeof delay === 'number') {
      d = f(delay);
      if (typeof complete === 'function') cb = animCallback(complete, node as NodeProxy).cb;
    } else if (delay !== undefined) {
      throw new Error("bad argument #6 to 'animate' (number expected, got " + (delay === null ? 'nil' : typeof delay) + ')');
    }
    let pb = 0;
    if (typeof playback === 'number') pb = Math.trunc(playback);
    // the value written by AnimateNodeHash keeps component order: x, y, z then w (with callback)
    const toArr: [number, number, number, number] = [toV[0], toV[1], toV[2], toV[3]];
    scene.animateNodeHash(h, prop, toArr, curve, pb, f(duration), d, cb, null, null);
  },
  cancel_animation(node, property) {
    const { scene, h } = checkNode(node);
    const prop = luaString(property);
    if (!getPropertyDesc(prop)) throw new Error(`property '${prop}' not found`);
    scene.cancelAnimationHash(h, prop);
  },

  pick_node(node, x, y) {
    const { scene, h } = checkNode(node);
    return scene.pickNode(h, f(Number(x)), f(Number(y)));
  },
  get_text_metrics(font, text, width?, line_break?, leading?, tracking?) {
    const scene = engine.currentScene();
    const id = luaString(font);
    const fm = scene.fonts.get(id);
    if (!fm) throw new Error(`Font '${id}' is not specified in scene`);
    const w = width === undefined || width === null ? FLT_MAX : f(width);
    const lb = line_break === undefined || line_break === null ? false : line_break !== false;
    const ld = leading === undefined || leading === null ? 1 : f(leading);
    const tr = tracking === undefined || tracking === null ? 0 : f(tracking);
    return metricsTable(getTextMetrics(fm, luaString(text), w, lb, ld, tr));
  },
  get_text_metrics_from_node(node) {
    const { scene, n } = checkNode(node);
    const fm = scene.fonts.get(n.fontHash);
    if (!fm) throw new Error(`Font '${n.fontHash}' is not specified in scene`);
    return metricsTable(getTextMetrics(fm, n.text ?? '', n.p[PROPERTY_SIZE * 4], n.lineBreak, n.p[PROPERTY_TEXT_PARAMS * 4], n.p[PROPERTY_TEXT_PARAMS * 4 + 1]));
  },

  show_keyboard(_type, _autoclose) { /* no virtual keyboard in the browser build */ },
  hide_keyboard() { /* no-op */ },
  reset_keyboard() { /* no-op */ },
  get_fill_angle(node: Node) { return checkNode(node).n.p[PROPERTY_PIE_PARAMS * 4 + 1]; },
  set_fill_angle(node: Node, a: number) { checkNode(node).n.p[PROPERTY_PIE_PARAMS * 4 + 1] = a; },
  get_inner_radius(node: Node) { return checkNode(node).n.p[PROPERTY_PIE_PARAMS * 4]; },
  set_inner_radius(node: Node, r: number) { checkNode(node).n.p[PROPERTY_PIE_PARAMS * 4] = r; },
  get_perimeter_vertices(node: Node) { return checkNode(node).n.perimeterVertices; },
  set_perimeter_vertices(node: Node, v: number) { checkNode(node).n.perimeterVertices = Math.trunc(v); },
  get_outer_bounds(node: Node) { return checkNode(node).n.outerBounds; },
  set_outer_bounds(node: Node, b: number) { checkNode(node).n.outerBounds = Math.trunc(b); },
};

function metricsTable(m: TextMetrics): TextMetrics {
  return literal({ width: m.width, height: m.height, max_ascent: m.max_ascent, max_descent: m.max_descent }, 4) as TextMetrics;
}

// ======================= vmath =======================

export const vmath: VmathApi & Record<string, any> = {
  vector3(x?: any, y?: number, z?: number): Vector3 {
    if (x === undefined) return new Vector3(0, 0, 0);
    if (y === undefined && z === undefined) {
      if (typeof x === 'number') return new Vector3(x, x, x);
      if (isV3(x)) return new Vector3(x.x, x.y, x.z);
      throw new Error('bad argument #1 to \'vector3\' (vmath.vector3 expected, got ' + typeof x + ')');
    }
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') throw new Error("bad argument to 'vector3' (number expected)");
    return new Vector3(x, y, z);
  },
  vector4(x?: any, y?: number, z?: number, w?: number): Vector4 {
    if (x === undefined) return new Vector4(0, 0, 0, 0);
    if (y === undefined && z === undefined && w === undefined) {
      if (typeof x === 'number') return new Vector4(x, x, x, x);
      if (isV4(x)) return new Vector4(x.x, x.y, x.z, x.w);
      throw new Error('bad argument #1 to \'vector4\' (vmath.vector4 expected, got ' + typeof x + ')');
    }
    if ([x, y, z, w].some((v) => typeof v !== 'number')) throw new Error("bad argument to 'vector4' (number expected)");
    return new Vector4(x, y!, z!, w!);
  },
  vector(values: number[]): number[] {
    const n = values ? values.length : 0;
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(f(Number(values[i] ?? 0)));
    return out;
  },
  length(v: Vec): number {
    if (isV3(v)) return f(Math.sqrt(f(f(f(v.x * v.x) + f(v.y * v.y)) + f(v.z * v.z))));
    if (isV4(v)) return f(Math.sqrt(f(f(f(f(v.x * v.x) + f(v.y * v.y)) + f(v.z * v.z)) + f(v.w * v.w))));
    throw new Error('bad argument #1 to length');
  },
  lerp(t: number, a: any, b: any): any {
    const tf = f(t);
    if (isV3(a) && isV3(b)) return new Vector3(f(a.x + f(f(b.x - a.x) * tf)), f(a.y + f(f(b.y - a.y) * tf)), f(a.z + f(f(b.z - a.z) * tf)));
    if (isV4(a) && isV4(b)) return new Vector4(f(a.x + f(f(b.x - a.x) * tf)), f(a.y + f(f(b.y - a.y) * tf)), f(a.z + f(f(b.z - a.z) * tf)), f(a.w + f(f(b.w - a.w) * tf)));
    if (typeof a === 'number' && typeof b === 'number') { const n1 = f(a), n2 = f(b); return n1 + tf * (n2 - n1); }
    throw new Error('vmath.lerp takes one number and a pair of either vmath.vector3s, vmath.vector4s, vmath.quats or numbers as arguments.');
  },
  add(a: any, b: any): any {
    if (isV3(a) && isV3(b)) return new Vector3(f(a.x + b.x), f(a.y + b.y), f(a.z + b.z));
    if (isV4(a) && isV4(b)) return new Vector4(f(a.x + b.x), f(a.y + b.y), f(a.z + b.z), f(a.w + b.w));
    throw new Error('attempt to perform arithmetic on vectors of different types');
  },
  sub(a: any, b: any): any {
    if (isV3(a) && isV3(b)) return new Vector3(f(a.x - b.x), f(a.y - b.y), f(a.z - b.z));
    if (isV4(a) && isV4(b)) return new Vector4(f(a.x - b.x), f(a.y - b.y), f(a.z - b.z), f(a.w - b.w));
    throw new Error('attempt to perform arithmetic on vectors of different types');
  },
  mul(a: any, s: any): any {
    if (typeof a === 'number' && (isV3(s) || isV4(s))) { const t = a; a = s; s = t; }
    const k = f(Number(s));
    if (isV3(a)) return new Vector3(f(a.x * k), f(a.y * k), f(a.z * k));
    if (isV4(a)) return new Vector4(f(a.x * k), f(a.y * k), f(a.z * k), f(a.w * k));
    throw new Error('attempt to perform arithmetic on a vector');
  },
  neg(a: any): any {
    if (isV3(a)) return new Vector3(-a.x, -a.y, -a.z);
    if (isV4(a)) return new Vector4(-a.x, -a.y, -a.z, -a.w);
    throw new Error('attempt to negate a non-vector');
  },
  matrix4() { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; },
};

// ======================= msg =======================

export const msg: MsgApi = {
  post(receiver, message_id, message?) {
    if (receiver === undefined || receiver === null) throw new Error("The receiver shouldn't be `nil`");
    const url = engine.resolve(receiver as any);
    if (url.path === undefined) url.path = '';
    const id = luaString(message_id);
    if (message !== undefined && message !== null && typeof message !== 'object') throw new Error("bad argument #3 to 'post' (table expected)");
    engine.post(url, id, message);
  },
  url(socket?: any, path?: string, fragment?: string): Url {
    if (socket === undefined && path === undefined && fragment === undefined) {
      const c = engine.currentComp();
      if (!c) return new URL('', '', undefined);
      return engine.urlOf(c);
    }
    if (path === undefined && fragment === undefined) {
      if (socket instanceof URL) return new URL(socket.socket, socket.path, socket.fragment);
      return engine.resolve(String(socket));
    }
    const c = engine.currentComp();
    const sock = socket === undefined || socket === null ? (c ? 'main' : '') : String(socket);
    const p = path === undefined || path === null ? '' : (String(path).startsWith('/') ? String(path) : '/' + String(path));
    const fr = fragment === undefined || fragment === null ? undefined : String(fragment);
    return new URL(sock, p, fr);
  },
};

// ======================= json =======================

class JsonError extends Error {}

interface JTok { type: number; start: number; end: number; size: number }
const J_PRIMITIVE = 0, J_OBJECT = 1, J_ARRAY = 2, J_STRING = 3;

/** jsmn.c (non-strict, no parent links); returns tokens or a negative error code. */
function jsmnParse(js: string): JTok[] | number {
  const toks: JTok[] = [];
  let toksuper = -1;
  let pos = 0;
  const len = js.length;
  for (; pos < len; pos++) {
    const c = js[pos];
    switch (c) {
      case '{': case '[': {
        const t: JTok = { type: c === '{' ? J_OBJECT : J_ARRAY, start: pos, end: -1, size: 0 };
        toks.push(t);
        if (toksuper !== -1) toks[toksuper].size++;
        toksuper = toks.length - 1;
        break;
      }
      case '}': case ']': {
        const type = c === '}' ? J_OBJECT : J_ARRAY;
        let i: number;
        for (i = toks.length - 1; i >= 0; i--) {
          const t = toks[i];
          if (t.start !== -1 && t.end === -1) {
            if (t.type !== type) return -2;
            toksuper = -1;
            t.end = pos + 1;
            break;
          }
        }
        if (i === -1) return -2;
        for (; i >= 0; i--) {
          const t = toks[i];
          if (t.start !== -1 && t.end === -1) { toksuper = i; break; }
        }
        break;
      }
      case '"': {
        const start = pos;
        pos++;
        let done = false;
        for (; pos < len; pos++) {
          const ch = js[pos];
          if (ch === '"') { toks.push({ type: J_STRING, start: start + 1, end: pos, size: 0 }); done = true; break; }
          if (ch === '\\') {
            pos++;
            const e = js[pos];
            if ('"/\\bfrnt'.includes(e) && e !== undefined) { /* ok */ }
            else if (e === 'u') {
              pos++;
              for (let k = 0; k < 4 && pos < len; k++) {
                if (!/[0-9A-Fa-f]/.test(js[pos])) return -2;
                pos++;
              }
              pos--;
            } else return -2;
          }
        }
        if (!done) return -3;
        if (toksuper !== -1) toks[toksuper].size++;
        break;
      }
      case '\t': case '\r': case '\n': case ':': case ',': case ' ':
        break;
      default: {
        const start = pos;
        for (; pos < len; pos++) {
          const ch = js[pos];
          if (ch === ':' || ch === '\t' || ch === '\r' || ch === '\n' || ch === ' ' || ch === ',' || ch === ']' || ch === '}') break;
          const code = js.charCodeAt(pos);
          if (code < 32 || code >= 127) return -2;
        }
        toks.push({ type: J_PRIMITIVE, start, end: pos, size: 0 });
        pos--;
        if (toksuper !== -1) toks[toksuper].size++;
        break;
      }
    }
  }
  for (let i = toks.length - 1; i >= 0; i--) if (toks[i].start !== -1 && toks[i].end === -1) return -3;
  return toks;
}

function unescapeJson(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c !== '\\') { out += c; continue; }
    const e = raw[i + 1];
    switch (e) {
      case '"': out += '"'; break;
      case '/': out += '/'; break;
      case '\\': out += '\\'; break;
      case 'b': out += '\b'; break;
      case 'f': out += '\f'; break;
      case 'r': out += '\r'; break;
      case 'n': out += '\n'; break;
      case 't': out += '\t'; break;
      case 'u': out += String.fromCharCode(parseInt(raw.slice(i + 2, i + 6), 16) & 0xffff); i += 4; break;
    }
    i++;
  }
  return out;
}

const PRIM_RE = /^[ \t\n\r\f\v]*[+-]?((\d+\.?\d*|\.\d+)([eE][+-]?\d+)?|0[xX]([0-9a-fA-F]+\.?[0-9a-fA-F]*|\.[0-9a-fA-F]+)([pP][+-]?\d+)?|inf(inity)?|nan(\([0-9A-Za-z_]*\))?)$/i;

/** dlib/json.cpp (jsmn, non-strict) + script_json.cpp JsonToLua */
export function jsonDecode(s: string): any {
  if (typeof s !== 'string') throw new Error("bad argument #1 to 'decode' (string expected, got " + (s === undefined || s === null ? 'nil' : typeof s) + ')');
  let src = s;
  const nul = src.indexOf('\0');
  if (nul >= 0) src = src.slice(0, nul);
  const toks = jsmnParse(src);
  if (typeof toks === 'number' || toks.length === 0) {
    throw new JsonError(`Failed to parse json '${s}' (${typeof toks === 'number' ? toks : 0}).`);
  }
  let index = 0;
  const build = (): any => {
    if (index >= toks.length) throw new JsonError('Unexpected JSON index, unable to parse content.');
    const t = toks[index];
    const raw = src.slice(t.start, t.end);
    switch (t.type) {
      case J_PRIMITIVE: {
        index++;
        if (raw === 'null') return undefined;
        if (raw === 'true') return true;
        if (raw === 'false') return false;
        if (PRIM_RE.test(raw)) {
          const low = raw.trim().toLowerCase().replace(/^\+/, '');
          if (/^-?inf/.test(low)) return low.startsWith('-') ? -Infinity : Infinity;
          if (/^-?nan/.test(low)) return NaN;
          if (/^-?0x/.test(low)) return hexFloat(low);
          return Number(low);
        }
        throw new JsonError('Invalid JSON primitive: ' + raw);
      }
      case J_STRING:
        index++;
        return unescapeJson(raw);
      case J_ARRAY: {
        const arr: any[] = [];
        index++;
        for (let i = 0; i < t.size; i++) arr[i] = build();
        return arr;
      }
      case J_OBJECT: {
        if (t.size % 2 !== 0) throw new JsonError('Incomplete JSON object: ' + raw);
        const obj: any = {};
        const order: (string | number)[] = [];
        index++;
        for (let i = 0; i < t.size; i += 2) {
          const k = build();
          const v = build();
          if (k === undefined || k === null) throw new JsonError('table index is nil');
          const key = typeof k === 'number' ? k : String(k);
          if (v === undefined) delete obj[key]; else { if (!(key in obj)) order.push(key); obj[key] = v; }
        }
        // script_json.cpp: lua_createtable(L, 0, n.m_Size)
        return withKeyOrder(presized(obj, t.size), order);
      }
    }
    throw new JsonError('Unsupported JSON type');
  };
  return build();
}

function hexFloat(s: string): number {
  const neg = s.startsWith('-');
  const m = /0x([0-9a-f]*)\.?([0-9a-f]*)(p([+-]?\d+))?/.exec(s)!;
  let v = parseInt(m[1] || '0', 16);
  if (m[2]) v += parseInt(m[2], 16) / Math.pow(16, m[2].length);
  if (m[4]) v *= Math.pow(2, Number(m[4]));
  return neg ? -v : v;
}

export const json = {
  decode: jsonDecode,
  /** Defold 1.2.167 has no json.encode */
  encode(_v: any): string { throw new Error("attempt to call field 'encode' (a nil value)"); },
};

// ======================= sys =======================

export interface SysState {
  config: Record<string, Record<string, string>>;
  resources: Map<string, string>;
}
export const sysState: SysState = { config: {}, resources: new Map() };

/** In-memory mirror of the emscripten IDBFS mount at /data (IndexedDB "/data", store "FILE_DATA"). */
export const idbfs = {
  files: new Map<string, Uint8Array>(),
  dirty: new Set<string>(),
  removed: new Set<string>(),
  onChange: null as null | (() => void),
  read(path: string): Uint8Array | undefined { return this.files.get(path); },
  write(path: string, data: Uint8Array) { this.files.set(path, data); this.dirty.add(path); this.removed.delete(path); this.onChange?.(); },
  remove(path: string) { if (this.files.delete(path)) { this.removed.add(path); this.dirty.delete(path); this.onChange?.(); } },
};

const sysTables = new Map<string, any>();

export const sys: SysApi & Record<string, any> = {
  get_config(key: string, default_value?: any): any {
    const k = luaString(key);
    const dot = k.indexOf('.');
    const sec = dot >= 0 ? k.slice(0, dot) : '';
    const name = dot >= 0 ? k.slice(dot + 1) : k;
    const v = sysState.config[sec]?.[name];
    if (v !== undefined) return v;
    if (default_value === undefined || default_value === null) return undefined;
    if (typeof default_value === 'number') return numToStr(default_value);
    if (typeof default_value === 'string') return default_value;
    return undefined;
  },
  get_sys_info(): Record<string, any> {
    const lang = (typeof navigator !== 'undefined' && navigator.languages && navigator.languages[0]) || (typeof navigator !== 'undefined' && navigator.language) || 'en_US';
    const { language, device_language, territory } = languageTerritory(lang);
    return {
      device_model: '', manufacturer: '', system_name: 'HTML5', system_version: '1.0', api_version: '',
      language, device_language, territory,
      gmt_offset: -new Date().getTimezoneOffset(),
      device_ident: '', user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };
  },
  get_engine_info(): Record<string, any> {
    return { version: '1.2.167', version_sha1: '96f7a5e4f617d5f6f4645f30a3e6ff656689435d', is_debug: false };
  },
  get_save_file(application_id: string, file_name: string): string {
    return '/data/.' + luaString(application_id) + '/' + luaString(file_name);
  },
  save(filename: string, table: any): boolean {
    sysTables.set(filename, JSON.parse(JSON.stringify(table)));
    idbfs.write(filename, new TextEncoder().encode(JSON.stringify(table)));
    return true;
  },
  load(filename: string): any {
    const t = sysTables.get(filename);
    if (t) return JSON.parse(JSON.stringify(t));
    const b = idbfs.read(filename);
    if (!b) return {};
    try { return JSON.parse(new TextDecoder().decode(b)); } catch { return {}; }
  },
  load_resource(path: string): string | undefined {
    const r = sysState.resources.get(path);
    return r;
  },
  set_error_handler(fn) { engine.errorHandler = fn; },
  open_url(url: string): boolean {
    if (typeof window !== 'undefined' && window.open(url) == null) window.location.href = url;
    return true;
  },
  get_application_path(): string { return location.href.substring(0, location.href.lastIndexOf('/')); },
};

function languageTerritory(lang: string) {
  if (!lang) lang = 'en_US';
  let sf = 0;
  while (sf < lang.length && lang[sf] !== '-' && lang[sf] !== '_') sf++;
  let sl = lang.length;
  while (sl !== sf && lang[sl] !== '-' && lang[sl] !== '_') sl--;
  const language = lang.slice(0, sf);
  let device_language: string;
  if (sf !== sl) device_language = lang.slice(0, sf) + '-' + lang.slice(sf + 1, sl);
  else device_language = language;
  const territory = sl < lang.length ? lang.slice(sl + 1) : '';
  return { language, device_language, territory };
}

// ======================= html5 =======================

export const html5 = {
  run(code: string): string {
    // emscripten_run_script_string: eval(code) + ""
    const src = luaString(code);
    try {
      return (0, eval)(src) + '';
    } catch (e) {
      // A page whose content security policy forbids eval: run the few
      // statements the game sends by hand, with the same results.
      if (e instanceof EvalError) return runWithoutEval(src) + '';
      throw e;
    }
  },
};

/** JS single-quoted string literal body -> value */
function jsUnquote(body: string): string {
  return body.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|\r\n|[\s\S])/g, (_, e: string) => {
    switch (e[0]) {
      case 'n': return '\n'; case 't': return '\t'; case 'r': return '\r'; case 'b': return '\b';
      case 'f': return '\f'; case 'v': return '\v'; case '0': return '\0';
      case 'u': case 'x': return e.length > 1 ? String.fromCharCode(parseInt(e.slice(1), 16)) : e;
      case '\n': case '\r': return '';
      default: return e;
    }
  });
}

function runWithoutEval(src: string): unknown {
  const w: any = window;
  let m = /^\s*window\.localStorage\.getItem\('([^']*)'\)\s*\|\|\s*'\{\}'\s*$/.exec(src);
  if (m) return localStorage.getItem(m[1]) || '{}';
  m = /^\s*window\.localStorage\.setItem\('([^']*)',\s*'([\s\S]*)'\)\s*$/.exec(src);
  if (m) return localStorage.setItem(m[1], jsUnquote(m[2]));
  if (/^\s*document\.referrer;?\s*$/.test(src)) return document.referrer;
  m = /^\s*window\.OOR_STORE \? [\s\S]* : ''\s*$/.exec(src);
  if (m && !w.OOR_STORE) return '';
  m = /^\s*window\.open\('([^']*)','([^']*)'\);?\s*$/.exec(src);
  if (m) return w.open(m[1], m[2]);
  throw new EvalError('html5.run: cannot run without eval: ' + src.slice(0, 80));
}

// ======================= socket =======================

export const socket = {
  /** luasocket gettime over emscripten gettimeofday (whole ms) */
  gettime(): number {
    const now = Date.now();
    const sec = (now / 1000) | 0;
    const usec = ((now % 1000) * 1000) | 0;
    return sec + usec / 1.0e6;
  },
};

// ======================= timer =======================

export const timer = {
  INVALID_TIMER_HANDLE: 0xffffffff,
  delay(seconds: number, repeating: boolean, cb: (self: any, handle: number, time_elapsed: number) => void): number {
    if (typeof seconds !== 'number') throw new Error("bad argument #1 to 'delay' (number expected)");
    if (typeof repeating !== 'boolean') throw new Error("bad argument #2 to 'delay' (boolean expected)");
    if (typeof cb !== 'function') throw new Error("bad argument #3 to 'delay' (function expected)");
    if (seconds < 0) throw new Error('timer.delay does not support negative delay times');
    const comp = engine.currentComp();
    if (!comp) { console.error('Unable to create a timer, the lua context does not have a timer world'); return 0xffffffff; }
    return comp.world.timers.add(comp, seconds, repeating, cb);
  },
  cancel(handle: number): boolean {
    const comp = engine.currentComp();
    if (!comp) return false;
    return comp.world.timers.cancel(handle);
  },
};

// ======================= window =======================

export const windowState = { width: 0, height: 0, listener: null as null | { fn: (self: any, event: any, data: any) => void; comp: Component | null } };

export const windowApi = {
  get_size(): [number, number] { return [windowState.width, windowState.height]; },
  set_listener(fn: (self: any, event: any, data: any) => void) {
    windowState.listener = { fn, comp: engine.currentComp() };
  },
  set_dim_mode(_m: number) {},
  get_dim_mode(): number { return 0; },
  WINDOW_EVENT_FOCUS_LOST: 0, WINDOW_EVENT_FOCUS_GAINED: 1, WINDOW_EVENT_RESIZED: 2, WINDOW_EVENT_ICONFIED: 3, WINDOW_EVENT_DEICONIFIED: 4,
  DIMMING_UNKNOWN: 0, DIMMING_ON: 1, DIMMING_OFF: 2,
};

export function fireWindowEvent(event: number, data: any) {
  const l = windowState.listener;
  if (!l) return;
  engine.run(l.comp, () => l.fn(l.comp ? l.comp.self : undefined, event, data));
}

// ======================= http =======================

export const http = {
  request(url: string, method: string, callback: (self: any, id: any, response: any) => void, headers?: Record<string, string>, post_data?: string, options?: any) {
    const comp = engine.currentComp();
    if (!comp) throw new Error('http.request is not available from this script-type.');
    if (typeof callback !== 'function') throw new Error("bad argument #3 to 'request' (function expected)");
    const requester = engine.urlOf(comp);
    requester.fn = callback;
    let timeout = Number(sysState.config.network?.http_timeout ?? 0) * 1000000;
    if (options && typeof options.timeout === 'number') timeout = options.timeout * 1000000;
    const xhr = new XMLHttpRequest();
    const listener = () => {
      let respHeaders = xhr.getAllResponseHeaders().replace(/\r/g, '') + '\n';
      if (xhr.status !== 0) {
        const bytes = new Uint8Array(xhr.response ?? new ArrayBuffer(0));
        sendResponse(requester, xhr.status, respHeaders, bytes);
      } else {
        respHeaders = '';
        sendResponse(requester, xhr.status, '', new Uint8Array(0));
      }
    };
    xhr.onload = listener;
    xhr.onerror = listener;
    xhr.ontimeout = listener;
    xhr.open(luaString(method), luaString(url), true);
    xhr.responseType = 'arraybuffer';
    if (timeout > 0) xhr.timeout = timeout / 1000.0;
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        const line = String(k) + ':' + String(v);
        if (line.trim() !== '') { const a = line.split(':'); xhr.setRequestHeader(a[0], a[1]); }
      }
    }
    if (post_data !== undefined && post_data !== null && String(post_data).length > 0) xhr.send(String(post_data));
    else xhr.send();
  },
};

function sendResponse(requester: URL, status: number, headers: string, body: Uint8Array) {
  const hdr: Record<string, string> = {};
  if (headers.length > 0) {
    const h = headers.slice(0, -1);
    for (const line of h.split('\n')) {
      if (line === '') continue;
      const colon = line.indexOf(':');
      if (colon < 0) continue;
      const key = line.slice(0, colon).toLowerCase();
      let v = line.slice(colon + 1);
      while (v.startsWith(' ')) v = v.slice(1);
      hdr[key] = v;
    }
  }
  const response = { status, response: new TextDecoder().decode(body), headers: hdr };
  const q = engine.sockets.get(requester.socket);
  if (!q) { console.warn('Failed to return http-response. Requester deleted?'); return; }
  q.push({ sender: new URL('', '', undefined), receiver: requester, id: 'http_response', data: response, ddf: true, fn: requester.fn });
}

// ======================= go =======================

export const go = {
  get_world_position(_id?: string): Vector3 { return new Vector3(0, 0, 0); },
  get_position(_id?: string): Vector3 { return new Vector3(0, 0, 0); },
  EASING_LINEAR: 0,
  EASING_INQUAD: 1, EASING_OUTQUAD: 2, EASING_INOUTQUAD: 3, EASING_OUTINQUAD: 4,
  EASING_INCUBIC: 5, EASING_OUTCUBIC: 6, EASING_INOUTCUBIC: 7, EASING_OUTINCUBIC: 8,
  EASING_INQUART: 9, EASING_OUTQUART: 10, EASING_INOUTQUART: 11, EASING_OUTINQUART: 12,
  EASING_INQUINT: 13, EASING_OUTQUINT: 14, EASING_INOUTQUINT: 15, EASING_OUTINQUINT: 16,
  EASING_INSINE: 17, EASING_OUTSINE: 18, EASING_INOUTSINE: 19, EASING_OUTINSINE: 20,
  EASING_INEXPO: 21, EASING_OUTEXPO: 22, EASING_INOUTEXPO: 23, EASING_OUTINEXPO: 24,
  EASING_INCIRC: 25, EASING_OUTCIRC: 26, EASING_INOUTCIRC: 27, EASING_OUTINCIRC: 28,
  EASING_INELASTIC: 29, EASING_OUTELASTIC: 30, EASING_INOUTELASTIC: 31, EASING_OUTINELASTIC: 32,
  EASING_INBACK: 33, EASING_OUTBACK: 34, EASING_INOUTBACK: 35, EASING_OUTINBACK: 36,
  EASING_INBOUNCE: 37, EASING_OUTBOUNCE: 38, EASING_INOUTBOUNCE: 39, EASING_OUTINBOUNCE: 40,
};

// ======================= jstodef =======================

const jsListeners: { fn: (self: any, message_id: string, message: any) => void; comp: Component | null }[] = [];
export const jstodef = {
  add_listener(fn: (self: any, message_id: string, message: any) => void) { jsListeners.push({ fn, comp: engine.currentComp() }); },
  remove_listener(fn: any) { const i = jsListeners.findIndex((l) => l.fn === fn); if (i >= 0) jsListeners.splice(i, 1); },
};
export function jsToDefSend(message_id: string, message?: any) {
  if (!message_id) { console.warn('You need to send message_id'); return; }
  for (const l of jsListeners.slice()) engine.run(l.comp, () => l.fn(l.comp ? l.comp.self : undefined, message_id, message));
}

// ======================= print =======================

// The shipped release build prints nothing; logging is on under the parity
// harness and with ?log in the page URL.
const logging = typeof location !== 'undefined' &&
  (new URLSearchParams(location.search).has('log') || typeof (globalThis as any).__parity !== 'undefined');

export function print(...args: unknown[]): void {
  if (!logging) return;
  console.log('[lua] ' + args.map((a) => tostring(a)).join('\t'));
}
export function pprint(v: unknown): void {
  if (!logging) return;
  console.log('[lua] ' + pp(v, '', new Set()));
}
function pp(v: any, indent: string, seen: Set<any>): string {
  if (v === null || v === undefined || typeof v !== 'object' || v instanceof Vector3 || v instanceof Vector4 || v instanceof URL || v instanceof NodeProxy) return tostring(v);
  if (seen.has(v)) return '<cycle>';
  seen.add(v);
  const lines = ['{'];
  for (const [k, val] of Object.entries(v)) lines.push(indent + '  ' + k + ' = ' + pp(val, indent + '  ', seen) + ',');
  lines.push(indent + '}');
  seen.delete(v);
  return lines.join('\n');
}

export { FontMap };
