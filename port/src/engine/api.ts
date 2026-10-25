// The Defold API surface the translated game code is written against.
// Names, argument order and semantics follow Defold 1.2.167 exactly, so a Lua
// line translates to the TS line with the same calls. The engine implements
// these in port/src/engine/; game code imports them from '../engine'.

import { numToStr } from '../lua/string';

export type Hash = string; // hash("x") === "x"; hashes compare as strings

// Defold vectors hold float32 components: every write rounds, as the Lua
// userdata does (`v.x = 0.1` reads back as 0.10000000149011612).
const fr = Math.fround;

export class Vector3 {
  private _x: number; private _y: number; private _z: number;
  constructor(x = 0, y = 0, z = 0) { this._x = fr(x); this._y = fr(y); this._z = fr(z); }
  get x(): number { return this._x; } set x(v: number) { this._x = fr(v); }
  get y(): number { return this._y; } set y(v: number) { this._y = fr(v); }
  get z(): number { return this._z; } set z(v: number) { this._z = fr(v); }
  /** tostring(v) in Lua */
  toString(): string { return 'vmath.vector3(' + fmtVec(this._x) + ', ' + fmtVec(this._y) + ', ' + fmtVec(this._z) + ')'; }
  toJSON(): string { return this.toString(); }
  __tostring(): string { return this.toString(); }
}

export class Vector4 {
  private _x: number; private _y: number; private _z: number; private _w: number;
  constructor(x = 0, y = 0, z = 0, w = 0) { this._x = fr(x); this._y = fr(y); this._z = fr(z); this._w = fr(w); }
  get x(): number { return this._x; } set x(v: number) { this._x = fr(v); }
  get y(): number { return this._y; } set y(v: number) { this._y = fr(v); }
  get z(): number { return this._z; } set z(v: number) { this._z = fr(v); }
  get w(): number { return this._w; } set w(v: number) { this._w = fr(v); }
  toString(): string { return 'vmath.vector4(' + fmtVec(this._x) + ', ' + fmtVec(this._y) + ', ' + fmtVec(this._z) + ', ' + fmtVec(this._w) + ')'; }
  toJSON(): string { return this.toString(); }
  __tostring(): string { return this.toString(); }
}

/** script_vmath Vector*_tostring: lua_pushfstring "%f", which Lua 5.1 renders as %.14g */
function fmtVec(n: number): string { return numToStr(n); }

export type Vec = Vector3 | Vector4;

/** Opaque GUI node handle. */
export interface Node { readonly __node: true }

export interface Url { socket: Hash; path: Hash; fragment: Hash | undefined }

/** on_input `action` table */
export interface Action {
  x: number; y: number;
  screen_x: number; screen_y: number;
  dx: number; dy: number;
  screen_dx: number; screen_dy: number;
  value: number;
  pressed: boolean; released: boolean; repeated: boolean;
  [k: string]: any;
}

export interface TextMetrics { width: number; height: number; max_ascent: number; max_descent: number }

/**
 * A script file. `create` runs once per script resource, like the Lua chunk:
 * its locals are shared by every component that uses the script (upgradecard
 * is used twice). The returned callbacks receive the per-component `self`.
 */
export interface ScriptCallbacks {
  init?(self: any): void;
  final?(self: any): void;
  update?(self: any, dt: number): void;
  on_message?(self: any, message_id: Hash, message: any, sender: Url): void;
  /** Return true to consume the input. */
  on_input?(self: any, action_id: Hash | undefined, action: Action): boolean | void;
  on_reload?(self: any): void;
}

export type ScriptFactory = () => ScriptCallbacks;

export interface GuiApi {
  // constants (values match Defold's enums)
  readonly ADJUST_FIT: number; readonly ADJUST_ZOOM: number; readonly ADJUST_STRETCH: number;
  readonly ANCHOR_NONE: number; readonly ANCHOR_LEFT: number; readonly ANCHOR_RIGHT: number;
  readonly ANCHOR_TOP: number; readonly ANCHOR_BOTTOM: number;
  readonly PIVOT_CENTER: number; readonly PIVOT_N: number; readonly PIVOT_NE: number; readonly PIVOT_E: number;
  readonly PIVOT_SE: number; readonly PIVOT_S: number; readonly PIVOT_SW: number; readonly PIVOT_W: number; readonly PIVOT_NW: number;
  readonly PROP_POSITION: string; readonly PROP_ROTATION: string; readonly PROP_SCALE: string; readonly PROP_COLOR: string;
  readonly PROP_OUTLINE: string; readonly PROP_SHADOW: string; readonly PROP_SIZE: string;
  readonly PLAYBACK_ONCE_FORWARD: number; readonly PLAYBACK_ONCE_BACKWARD: number; readonly PLAYBACK_ONCE_PINGPONG: number;
  readonly PLAYBACK_LOOP_FORWARD: number; readonly PLAYBACK_LOOP_BACKWARD: number; readonly PLAYBACK_LOOP_PINGPONG: number;
  readonly CLIPPING_MODE_NONE: number; readonly CLIPPING_MODE_STENCIL: number;
  readonly SIZE_MODE_MANUAL: number; readonly SIZE_MODE_AUTO: number;
  readonly KEYBOARD_TYPE_DEFAULT: number; readonly KEYBOARD_TYPE_NUMBER_PAD: number;
  readonly KEYBOARD_TYPE_EMAIL: number; readonly KEYBOARD_TYPE_PASSWORD: number;
  readonly EASING_LINEAR: number;
  readonly EASING_INQUAD: number; readonly EASING_OUTQUAD: number; readonly EASING_INOUTQUAD: number; readonly EASING_OUTINQUAD: number;
  readonly EASING_INCUBIC: number; readonly EASING_OUTCUBIC: number; readonly EASING_INOUTCUBIC: number; readonly EASING_OUTINCUBIC: number;
  readonly EASING_INQUART: number; readonly EASING_OUTQUART: number; readonly EASING_INOUTQUART: number; readonly EASING_OUTINQUART: number;
  readonly EASING_INQUINT: number; readonly EASING_OUTQUINT: number; readonly EASING_INOUTQUINT: number; readonly EASING_OUTINQUINT: number;
  readonly EASING_INSINE: number; readonly EASING_OUTSINE: number; readonly EASING_INOUTSINE: number; readonly EASING_OUTINSINE: number;
  readonly EASING_INEXPO: number; readonly EASING_OUTEXPO: number; readonly EASING_INOUTEXPO: number; readonly EASING_OUTINEXPO: number;
  readonly EASING_INCIRC: number; readonly EASING_OUTCIRC: number; readonly EASING_INOUTCIRC: number; readonly EASING_OUTINCIRC: number;
  readonly EASING_INELASTIC: number; readonly EASING_OUTELASTIC: number; readonly EASING_INOUTELASTIC: number; readonly EASING_OUTINELASTIC: number;
  readonly EASING_INBACK: number; readonly EASING_OUTBACK: number; readonly EASING_INOUTBACK: number; readonly EASING_OUTINBACK: number;
  readonly EASING_INBOUNCE: number; readonly EASING_OUTBOUNCE: number; readonly EASING_INOUTBOUNCE: number; readonly EASING_OUTINBOUNCE: number;

  get_node(id: string | Hash): Node;
  get_id(node: Node): Hash;
  set_id(node: Node, id: string): void;
  new_box_node(pos: Vec, size: Vec): Node;
  new_text_node(pos: Vec, text: string): Node;
  delete_node(node: Node): void;
  clone(node: Node): Node;
  /** Returns a table id -> cloned node. */
  clone_tree(node: Node): Record<string, Node>;

  get_position(node: Node): Vector3; set_position(node: Node, p: Vec): void;
  get_rotation(node: Node): Vector3; set_rotation(node: Node, r: Vec): void;
  get_scale(node: Node): Vector3; set_scale(node: Node, s: Vec): void;
  get_size(node: Node): Vector3; set_size(node: Node, s: Vec): void;
  get_color(node: Node): Vector4; set_color(node: Node, c: Vec): void;
  get_outline(node: Node): Vector4; set_outline(node: Node, c: Vec): void;
  get_shadow(node: Node): Vector4; set_shadow(node: Node, c: Vec): void;
  get_screen_position(node: Node): Vector3; set_screen_position(node: Node, p: Vec): void;
  screen_pos_to_node_pos(node: Node, p: Vec): Vector3;
  get_slice9(node: Node): Vector4; set_slice9(node: Node, s: Vec): void;

  is_enabled(node: Node): boolean; set_enabled(node: Node, enabled: boolean): void;
  get_text(node: Node): string; set_text(node: Node, text: string | number): void;
  get_font(node: Node): Hash; set_font(node: Node, font: string | Hash): void;
  get_line_break(node: Node): boolean; set_line_break(node: Node, b: boolean): void;
  get_texture(node: Node): Hash; set_texture(node: Node, texture: string | Hash): void;
  get_flipbook(node: Node): Hash;
  play_flipbook(node: Node, animation: string | Hash, complete?: (self: any, node: Node) => void): void;
  cancel_flipbook(node: Node): void;
  get_pivot(node: Node): number; set_pivot(node: Node, p: number): void;
  get_xanchor(node: Node): number; set_xanchor(node: Node, a: number): void;
  get_yanchor(node: Node): number; set_yanchor(node: Node, a: number): void;
  get_adjust_mode(node: Node): number; set_adjust_mode(node: Node, m: number): void;
  get_size_mode(node: Node): number; set_size_mode(node: Node, m: number): void;
  get_parent(node: Node): Node | undefined; set_parent(node: Node, parent: Node | undefined, keep_scene_transform?: boolean): void;
  get_layer(node: Node): Hash; set_layer(node: Node, layer: string | Hash): void;
  get_inherit_alpha(node: Node): boolean; set_inherit_alpha(node: Node, b: boolean): void;
  get_clipping_mode(node: Node): number; set_clipping_mode(node: Node, m: number): void;
  get_clipping_visible(node: Node): boolean; set_clipping_visible(node: Node, b: boolean): void;
  get_clipping_inverted(node: Node): boolean; set_clipping_inverted(node: Node, b: boolean): void;
  move_above(node: Node, ref: Node | undefined): void; move_below(node: Node, ref: Node | undefined): void;
  set_render_order(order: number): void;
  get_layout(): Hash;
  get_width(): number; get_height(): number;

  animate(node: Node, property: string | Hash, to: number | Vec, easing: number | Vec, duration: number,
          delay?: number, complete?: (self: any, node: Node) => void, playback?: number): void;
  cancel_animation(node: Node, property: string | Hash): void;

  pick_node(node: Node, x: number, y: number): boolean;
  get_text_metrics(font: string | Hash, text: string, width?: number, line_break?: boolean, leading?: number, tracking?: number): TextMetrics;
  get_text_metrics_from_node(node: Node): TextMetrics;

  show_keyboard(type: number, autoclose: boolean): void;
  hide_keyboard(): void;
  reset_keyboard(): void;
}

export interface MsgApi {
  /** Queues `message_id` for `receiver`; "." is the sender's own game object, "#comp" a component on it. */
  post(receiver: string | Url, message_id: string | Hash, message?: Record<string, any>): void;
  url(socket?: string | Url, path?: string, fragment?: string): Url;
}

export interface VmathApi {
  vector3(x?: number | Vector3, y?: number, z?: number): Vector3;
  vector4(x?: number | Vector4, y?: number, z?: number, w?: number): Vector4;
  /** vmath.vector({...}) — a plain number array */
  vector(values: number[]): number[];
  length(v: Vec): number;
  lerp(t: number, a: number, b: number): number;
  lerp<V extends Vec>(t: number, a: V, b: V): V;
  // Lua operator overloads on vectors: `a + b`, `a - b`, `a * s`, `-a`
  add<V extends Vec>(a: V, b: V): V;
  sub<V extends Vec>(a: V, b: V): V;
  mul<V extends Vec>(a: V, s: number): V;
  neg<V extends Vec>(a: V): V;
}

export interface SysApi {
  get_config(key: string, default_value?: string): string | undefined;
  get_sys_info(): Record<string, string>;
  get_engine_info(): Record<string, any>;
  get_save_file(application_id: string, file_name: string): string;
  save(filename: string, table: any): boolean;
  load(filename: string): any;
  load_resource(path: string): string | undefined;
  set_error_handler(fn: (source: string, message: string, traceback: string) => void): void;
  open_url(url: string): boolean;
}
