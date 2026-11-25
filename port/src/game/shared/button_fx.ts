/* Tactile button press feedback: depress on press down, spring back and flash
on click. Shared by gooey.button and custom-input buttons (such as dungeon row
buttons inside dynamic lists). */
import { gui, vmath } from '../../engine';
import type { Node } from '../../engine';

const PRESS_DEPTH = 6;
const PRESS_SCALE_Y = 0.94;
const RELEASE_TIME = 0.14;
const CANCEL_TIME = 0.08;
const FLASH_ALPHA = 0.85;
const FLASH_TIME = 0.22;

interface PressState {
  active: boolean;
  down: boolean;
  restY: number;
  restScaleY: number;
}

const states = new WeakMap<Node, PressState>();
const flashes = new WeakMap<Node, Node>();
const visuals = new WeakMap<Node, Node>();

function get_state(node: Node): PressState {
  let s = states.get(node);
  if (!s) {
    s = { active: false, down: false, restY: 0, restScaleY: 1 };
    states.set(node, s);
  }
  return s;
}

function apply_depressed(node: Node, s: PressState) {
  gui.cancel_animation(node, "position.y");
  gui.cancel_animation(node, "scale.y");
  const pos = gui.get_position(node);
  const scale = gui.get_scale(node);
  gui.set_position(node, vmath.vector3(pos.x, s.restY - PRESS_DEPTH, pos.z));
  gui.set_scale(node, vmath.vector3(scale.x, s.restScaleY * PRESS_SCALE_Y, scale.z));
}

function capture_rest(node: Node, s: PressState) {
  if (!s.active) {
    s.restY = gui.get_position(node).y;
    s.restScaleY = gui.get_scale(node).y;
    s.active = true;
  }
}

/** Register the visible child node for an invisible hitbox button so clicks flash its art. */
export function bind_visual(hitbox: Node, visual: Node) {
  visuals.set(hitbox, visual);
}

/** Hit-test against the button's resting pose so depressing it never pulls its top edge away from the pointer. */
export function pick_node(node: Node, x: number, y: number): boolean {
  const s = states.get(node);
  if (!s || !s.active) {
    return gui.pick_node(node, x, y);
  }
  const curPos = gui.get_position(node);
  const curScale = gui.get_scale(node);
  gui.set_position(node, vmath.vector3(curPos.x, s.restY, curPos.z));
  gui.set_scale(node, vmath.vector3(curScale.x, s.restScaleY, curScale.z));
  const hit = gui.pick_node(node, x, y);
  gui.set_position(node, curPos);
  gui.set_scale(node, curScale);
  return hit;
}

/** Depress a button when the press begins (or pointer re-enters while held). */
export function press(node: Node) {
  const s = get_state(node);
  capture_rest(node, s);
  s.down = true;
  apply_depressed(node, s);
}

/** Trigger an additive flash matching the button's exact shape (texture, flipbook, slice9, size). */
export function flash(node: Node) {
  const target = visuals.get(node) ?? node;
  if (!gui.is_enabled(target)) { console.warn("[bfx] disabled"); return; }
  const col = gui.get_color(target);
  if (col.w <= 0.01) { console.warn("[bfx] alpha 0"); return; }

  let overlay = flashes.get(target);
  if (!overlay) {
    overlay = gui.new_box_node(vmath.vector3(0, 0, 0), gui.get_size(target));
    gui.set_parent(overlay, target);
    gui.set_blend_mode(overlay, gui.BLEND_ADD);
    gui.set_inherit_alpha(overlay, false);
    flashes.set(target, overlay);
  }

  const tex = gui.get_texture(target);
  if (tex && tex !== "") {
    gui.set_texture(overlay, tex);
    const fb = gui.get_flipbook(target);
    if (fb && fb !== "") {
      gui.play_flipbook(overlay, fb);
    }
  }
  gui.set_pivot(overlay, gui.get_pivot(target));
  gui.set_size(overlay, gui.get_size(target));
  gui.set_slice9(overlay, gui.get_slice9(target));
  gui.set_adjust_mode(overlay, gui.get_adjust_mode(target));
  const layer = gui.get_layer(target);
  if (layer && layer !== "") {
    gui.set_layer(overlay, layer);
  }

  gui.set_enabled(overlay, true);
  gui.cancel_animation(overlay, "color.w");
  gui.set_color(overlay, vmath.vector4(1, 1, 1, FLASH_ALPHA));
  gui.animate(overlay, "color.w", 0, gui.EASING_OUTSINE, FLASH_TIME, 0, () => {
    gui.set_enabled(overlay!, false);
  });
}

/** Release a button: spring back to resting pose, and flash if the press completed as a click. */
export function release(node: Node, clicked: boolean, visual?: Node) {
  const s = get_state(node);
  if (!s.active && !clicked) return;

  if (clicked) {
    capture_rest(node, s);
    // Ensure even a single-frame click visibly depresses before springing back.
    if (!s.down) {
      apply_depressed(node, s);
    }
    s.down = false;
    gui.cancel_animation(node, "position.y");
    gui.cancel_animation(node, "scale.y");
    gui.animate(node, "position.y", s.restY, gui.EASING_OUTBACK, RELEASE_TIME, 0, () => {
      s.active = false;
    });
    gui.animate(node, "scale.y", s.restScaleY, gui.EASING_OUTBACK, RELEASE_TIME);
    flash(visual ?? node);
  } else if (s.down) {
    s.down = false;
    gui.cancel_animation(node, "position.y");
    gui.cancel_animation(node, "scale.y");
    gui.animate(node, "position.y", s.restY, gui.EASING_OUTQUAD, CANCEL_TIME, 0, () => {
      s.active = false;
    });
    gui.animate(node, "scale.y", s.restScaleY, gui.EASING_OUTQUAD, CANCEL_TIME);
  }
}

/** Immediately play a depress + spring-back + flash for a direct click. */
export function click(node: Node, visual?: Node) {
  release(node, true, visual);
}

export default { bind_visual, pick_node, press, release, flash, click };
