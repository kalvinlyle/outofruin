// gooey/internal/core.lua
import { gui, msg, vmath, hash, socket } from '../../../engine';
import { pairs, t, tset } from '../../../lua';
import { G } from '../../globals';
import actions from '../actions';
import buttonFx from '../../shared/button_fx';

const M: any = {};

const EMPTY = hash("");

let long_press_start = 0;

// Lua `a and b` / `a or b` on values that may be nil/false.
const land = (a: any, b: any) => (t(a) ? b : a);
const lor = (a: any, b: any) => (t(a) ? a : b);

// Defold's hash_to_hex: the 64-bit hash of the string, as "%016llx".
// PARITY: dmHashString64 reproduced as MurmurHash2A-64 (seed 0) from memory of dlib/hash.cpp; not checked against the binary. Only affects instance keys and pairs order over gooey instance tables.
const MASK64 = (1n << 64n) - 1n;
const MUR_M = 0xc6a4a7935bd1e995n;
const MUR_R = 47n;
const utf8enc = new TextEncoder();
function hash_to_hex(h: any): string {
  if (h === undefined || h === null) throw new Error("bad argument #1 to 'hash_to_hex' (hash expected, got nil)");
  const data = utf8enc.encode(String(h));
  let len = data.length;
  const l = BigInt(len);
  let hh = 0n;
  const mmix = (k: bigint) => {
    k = (k * MUR_M) & MASK64;
    k ^= k >> MUR_R;
    k = (k * MUR_M) & MASK64;
    hh = (hh * MUR_M) & MASK64;
    hh ^= k;
  };
  let p = 0;
  while (len >= 8) {
    let k = 0n;
    for (let b = 7; b >= 0; b--) k = (k << 8n) | BigInt(data[p + b]);
    mmix(k);
    p += 8;
    len -= 8;
  }
  let tt = 0n;
  for (let b = len - 1; b >= 0; b--) tt ^= BigInt(data[p + b]) << BigInt(8 * b);
  mmix(tt);
  mmix(l);
  hh ^= hh >> MUR_R;
  hh = (hh * MUR_M) & MASK64;
  hh ^= hh >> MUR_R;
  return hh.toString(16).padStart(16, '0');
}

function handle_action(component: any, action_id: any, action: any) {
  action.id = lor(action.id, -1);
  component.long_pressed_time = lor(component.long_pressed_time, 1.5);
  if (!t(component.touch_id) || component.touch_id === action.id) {
    const over = buttonFx.pick_node(component.node, action.x, action.y);
    component.over_now = land(over, !t(component.over));
    component.out_now = land(!t(over), component.over);
    component.over = over;

    const touch = action_id === actions.TOUCH || action_id === actions.MULTITOUCH;
    const pressed = land(land(touch, action.pressed), component.over);
    const released = land(touch, action.released);
    if (t(pressed)) {
      component.touch_id = action.id;
      long_press_start = socket.gettime();
    } else if (t(released)) {
      component.touch_id = undefined;
      component.long_pressed = socket.gettime() - long_press_start > component.long_pressed_time;
    }

    component.pressed_now = land(pressed, !t(component.pressed));
    component.released_now = land(released, component.pressed);
    component.pressed = lor(pressed, land(component.pressed, !t(released)));
    component.consumed = lor(component.pressed, land(component.released_now, component.over));
    component.clicked = land(component.released_now, component.over);
    component.long_pressed = lor(component.long_pressed, false);
  }
}

M.get_root_position = function (node: any) {
  let get_pos: (node: any) => any;
  get_pos = function (node: any) {
    const parent = gui.get_parent(node);
    const pos = gui.get_position(node);
    if (t(parent)) {
      return vmath.add(pos, get_pos(parent));
    } else {
      return pos;
    }
  };
  return get_pos(node);
};

M.clickable = function (component: any, action_id: any, action: any) {
  if (!t(component.enabled) || !t(action)) {
    component.pressed_now = false;
    component.released_now = false;
    component.consumed = false;
    component.clicked = false;
    component.pressed = false;
    return;
  }

  if (!t(action.touch)) {
    handle_action(component, action_id, action);
  } else {
    for (const [, touch_action] of pairs(action.touch)) {
      handle_action(component, action_id, touch_action);
    }
  }
};

M.is_enabled = function (node: any): any {
  const parent = gui.get_parent(node);
  const enabled = gui.is_enabled(node);
  if (t(parent)) {
    return land(enabled, M.is_enabled(parent));
  }
  return enabled;
};

M.to_hash = function (str: any) {
  return typeof str === 'string' ? hash(str) : str;
};

M.to_key = function (hsh: any): string {
  const url = msg.url();
  // `empty` in the Lua is an undefined global (nil), so a nil path/fragment errors in hash_to_hex.
  return hash_to_hex(lor(url.socket, EMPTY))
    + hash_to_hex(lor(url.path, G.empty))
    + hash_to_hex(lor(url.fragment, G.empty))
    + hash_to_hex(hsh);
};

/**
 * Returns [data, state] (Lua multiple returns). `instances` must be created
 * with tracked({}) since keys are removed and the tables are walked with pairs.
 */
M.instance = function (id: any, instances: any, functions?: any): [any, any] {
  const key = M.to_key(id);
  const instance = instances[key];

  // PARITY: Defold stores the running script instance at _G[3700146495] / _G[-594820801]; the port engine does not expose it, so this reads G (always nil) and instances are never reset on script reload.
  const script_instance = lor(G[3700146495], G[-594820801]);
  if (t(instance) && instance.__script !== script_instance) {
    tset(instances, key, undefined);
  }
  tset(instances, key, lor(instances[key], { __script: script_instance }));
  if (!t(instances[key].data)) {
    // radio.group uses the data table of a function-less instance as a sequence, so it is a JS array there.
    const data: any = functions === undefined ? [] : {};
    instances[key].data = data;
    for (const [name, fn] of pairs<any>(lor(functions, {}))) {
      data[name as any] = function (...args: any[]) {
        fn(data, ...args);
      };
    }
  }
  if (!t(instances[key].state)) {
    instances[key].state = {};
  }
  return [instances[key].data, instances[key].state];
};

M.state = function (id: any, instances: any) {
  const key = M.to_key(id);
  if (!t(instances[key].state)) {
    instances[key].state = {};
  }
  return instances[key].state;
};

M.clamp = function (v: number, min: number, max: number) {
  if (v < min) {
    return min;
  } else if (v > max) {
    return max;
  } else {
    return v;
  }
};

export default M;
