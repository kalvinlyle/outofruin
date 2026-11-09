/* The chapter 0 pointer: a pulsing gold frame round the thing to press, and a
caption saying what to do. Both are drawn from the shipped UI frames.

The frame is a child of its target, so it follows a row as the list scrolls
and goes when the target hides. A scene keeps one frame and moves it from
target to target. */
import { gui, vmath } from '../../engine';
import type { Node } from '../../engine';

const FRAME_SLICE = vmath.vector4(23, 24, 25, 40);
const PANEL_SLICE = vmath.vector4(16, 22, 32, 42);
const FRAME_PAD = 10;
const FRAME_DIM = 0.35;
const PULSE = 0.6;

// Where a node's pivot sits on it, from its centre, in halves of its size.
function pivot_offset(node: Node): [number, number] {
  const p = gui.get_pivot(node);
  const x = p === gui.PIVOT_E || p === gui.PIVOT_NE || p === gui.PIVOT_SE ? 1
    : p === gui.PIVOT_W || p === gui.PIVOT_NW || p === gui.PIVOT_SW ? -1 : 0;
  const y = p === gui.PIVOT_N || p === gui.PIVOT_NE || p === gui.PIVOT_NW ? 1
    : p === gui.PIVOT_S || p === gui.PIVOT_SE || p === gui.PIVOT_SW ? -1 : 0;
  return [x, y];
}

export function make_frame(layer?: () => string | undefined) {
  let frame: Node | undefined;
  let on: Node | undefined;

  function hide() {
    if (frame !== undefined) gui.set_enabled(frame, false);
    on = undefined;
  }

  function point(target: Node) {
    if (frame === undefined) {
      frame = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(0, 0, 0));
      gui.set_texture(frame, "main");
      gui.play_flipbook(frame, "tinyframe_gold");
      gui.set_slice9(frame, FRAME_SLICE);
      gui.set_inherit_alpha(frame, false);
    }
    gui.set_enabled(frame, true);
    if (on === target) return;
    on = target;
    gui.set_parent(frame, target);
    const l = layer?.();
    if (l !== undefined) gui.set_layer(frame, l);
    const size = gui.get_size(target);
    const scale = gui.get_scale(target);
    const [ox, oy] = pivot_offset(target);
    // The frame keeps its own pixel size whatever the target is scaled by.
    gui.set_scale(frame, vmath.vector3(1 / scale.x, 1 / scale.y, 1));
    gui.set_size(frame, vmath.vector3(size.x * scale.x + FRAME_PAD * 2, size.y * scale.y + FRAME_PAD * 2, 0));
    gui.set_position(frame, vmath.vector3(-ox * size.x / 2, -oy * size.y / 2, 0));
    gui.cancel_animation(frame, "color.w");
    gui.set_color(frame, vmath.vector4(1, 1, 1, 1));
    gui.animate(frame, "color.w", FRAME_DIM, gui.EASING_INOUTSINE, PULSE, 0, undefined, gui.PLAYBACK_LOOP_PINGPONG);
  }

  return { point, hide };
}

/* A caption panel at a fixed place in a scene: parent is the node it sits in,
pos its centre there. */
export function make_caption(parent: () => Node, pos: () => any, width: number, layer?: () => string | undefined) {
  let panel: Node | undefined;
  let text: Node | undefined;
  let shown: string | undefined;

  function hide() {
    if (panel !== undefined) gui.set_enabled(panel, false);
    shown = undefined;
  }

  function say(words: string) {
    if (panel === undefined) {
      panel = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(width, 110, 0));
      gui.set_texture(panel, "main");
      gui.play_flipbook(panel, "tinyfancypanel_charcoal");
      gui.set_slice9(panel, PANEL_SLICE);
      gui.set_parent(panel, parent());
      text = gui.new_text_node(vmath.vector3(0, 0, 0), "");
      gui.set_font(text, "title");
      gui.set_size(text, vmath.vector3(width - 60, 100, 0));
      gui.set_line_break(text, true);
      gui.set_color(text, vmath.vector4(1, 1, 1, 1));
      gui.set_outline(text, vmath.vector4(0, 0, 0, 1));
      gui.set_parent(text, panel);
      const l = layer?.();
      if (l !== undefined) { gui.set_layer(panel, l); gui.set_layer(text, l); }
    }
    gui.set_enabled(panel, true);
    gui.set_position(panel, pos());
    if (shown === words) return;
    shown = words;
    gui.set_text(text!, words);
    // Pops in on every new instruction, so the change is noticed.
    gui.set_scale(panel, vmath.vector3(0.8, 0.8, 1));
    gui.animate(panel, "scale", vmath.vector3(1, 1, 1), gui.EASING_OUTBACK, 0.3);
  }

  return { say, hide };
}
