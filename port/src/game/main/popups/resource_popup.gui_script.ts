import { defineScript, gui, msg, hash, vmath, window, go, print } from '../../../engine';
import { t, S } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import defsave from '../../defsave/defsave';
import actions from '../../actions';
import loc from '../../shared/locsheets';

void inspect;

defineScript('/main/popups/resource_popup.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "resource_popup";
  const controller = "main:/menu#controller"; void controller;
  let enabled: any = false;

  const Stats: any = {}; void Stats;
  let id: any = 0;

  /* ******************************************
              SCREEN FIT
  ******************************************** */

  /* The scene is drawn for a 750x1334 phone and Defold fits that rectangle
  into the window, so on any other shape the room left over turns into margin
  and anything full bleed stops reaching the edges. The root goes on a plain
  uniform fit, and the parts that have to touch an edge are placed against the
  real one. The long version of this note is in main/nav/header.gui_script. */
  const DESIGN_W = 750;
  const DESIGN_H = 1334;
  const HEADER_DEPTH = 255.5; // underside of the header's top bar, from the top edge
  const FOOTER_TOP = 105; // top of the header's bottom bar, from the bottom edge

  const screen = { w: 0, h: 0 };

  // The screen in design units, or nil if it has not changed since last call.
  function screen_changed(): [number, number] | undefined {
    const [ww, wh] = window.get_size();
    const scale = Math.min(ww / DESIGN_W, wh / DESIGN_H);
    const w = ww / scale, h = wh / scale;
    if (Math.abs(w - screen.w) < 1 && Math.abs(h - screen.h) < 1) return undefined;
    screen.w = w; screen.h = h;
    const root = gui.get_node("root");
    gui.set_adjust_mode(root, gui.ADJUST_FIT);
    gui.set_xanchor(root, gui.ANCHOR_NONE);
    gui.set_yanchor(root, gui.ANCHOR_NONE);
    return [w, h];
  }

  function screen_left() { return (DESIGN_W - screen.w) / 2; } void screen_left;
  function screen_bottom() { return (DESIGN_H - screen.h) / 2; }
  function screen_top() { return screen_bottom() + screen.h; }
  function content_top() { return screen_top() - HEADER_DEPTH; } void content_top;
  function content_bottom() { return screen_bottom() + FOOTER_TOP; } void content_bottom;

  function place(id: string, x?: number, y?: number) {
    const node = gui.get_node(id);
    const p = gui.get_position(node);
    gui.set_position(node, vmath.vector3(t(x) ? x : p.x, t(y) ? y : p.y, p.z));
    return node;
  }

  function resize(id: string, w?: number, h?: number) {
    const node = gui.get_node(id);
    const s = gui.get_size(node);
    gui.set_size(node, vmath.vector3(t(w) ? w : s.x, t(h) ? h : s.y, s.z));
    return node;
  } void resize;

  function layout_screen() {
    const r = screen_changed();
    if (!r) return;
    const [w, h] = r;
    place("background/bg", screen_left(), screen_bottom());
    resize("background/bg", w, h);
    place("root/center", undefined, screen_bottom() + h / 2);
  }

  function refresh_all() {
    if (t(enabled)) {
      const Resource = defsave.loaded.Resources.data[id];

      gui.set_texture(gui.get_node("resource/icon"), Resource.Icon.texture);
      gui.play_flipbook(gui.get_node("resource/icon"), Resource.Icon.flipbook);
      gui.set_text(gui.get_node("resource/name"), loc.get(Resource.Name));
      gui.set_text(gui.get_node("resource/text"), actions.display_number(Resource.Count));
      let node = gui.get_node("resource/bg");

      node = gui.get_node("resource_popup/bg");
      gui.set_scale(node, vmath.vector3(0.9, 0.9, 0.9));
      // The Lua passes the playback constant in the delay slot; kept.
      gui.animate(node, gui.PROP_SCALE, vmath.vector3(1, 1, 1), go.EASING_OUTELASTIC, 0.75, gui.PLAYBACK_ONCE_FORWARD);
    }
  }

  return {
    init(_self) {
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      gui.set_render_order(15);
      gooey.acquire_input();
    },

    on_input(_self, action_id, action) {
      if (action_id !== undefined && action_id !== null && t(enabled)) {
        if (action_id === hash("touch") && action.pressed) {
          msg.post(controller, "hide_popup");
        }
      }
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        if (t(enabled)) {
          id = message.resource_id;
          refresh_all();
        }
      } else if (message_id === hash("refresh_all")) {
        refresh_all();
      }
    },

    update(_self, _dt) {
      layout_screen();
    },
  };
});
