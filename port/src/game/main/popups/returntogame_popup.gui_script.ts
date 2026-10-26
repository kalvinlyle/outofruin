import { defineScript, gui, msg, hash, vmath, window, go, print } from '../../../engine';
import { t, cat, S } from '../../../lua';
import { G } from '../../globals';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import actions from '../../actions';
import saveload from '../../saveload/saveload';
import defsave from '../../defsave/defsave';
import loc from '../../shared/locsheets';

void inspect; void saveload; void defsave;

defineScript('/main/popups/returntogame_popup.gui_script', () => {
  const currentPage = "returntogame_popup";
  const controller = "main:/menu#controller";
  let enabled: any = false;
  let offer: any = 0;
  let hearth: any = 1;
  let barnaby: any = undefined;

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

  /* Barnaby Hearth, the patron for time away (gdd/heroes-roster.md), leans
  in once the base amount has shown, and the number goes up again under his
  line. */
  function show_barnaby(text: any) {
    if (!t(barnaby)) {
      barnaby = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(200, 200, 0));
      gui.set_texture(barnaby, "main");
      gui.play_flipbook(barnaby, "patron_barnabyhearth");
      gui.set_parent(barnaby, gui.get_node("returntogame_popup/bg"));
    }
    const panel = gui.get_size(gui.get_node("returntogame_popup/bg"));
    gui.set_enabled(barnaby, true);
    gui.set_position(barnaby, vmath.vector3(-panel.x / 2 - 120, panel.y * 0.25, 0));
    gui.animate(barnaby, "position.x", -panel.x / 2 - 10, gui.EASING_OUTBACK, 0.4, 0.8, function () {
      gui.set_text(text, cat("Welcome back! You earned ", actions.display_number(offer), " followers while you were gone.\n", loc.get("HERO_BONUS_WARMHEARTH", [actions.display_number(hearth)]), ": ", actions.display_number(Math.floor(offer * hearth))));
      gui.animate(text, "scale", vmath.mul(gui.get_scale(text), 1.1), gui.EASING_OUTQUAD, 0.12, 0, undefined, gui.PLAYBACK_ONCE_PINGPONG);
    });
  }

  function refresh_all() {
    const text = gui.get_node("offer/text");
    gui.set_text(text, cat("Welcome back! You earned ", actions.display_number(offer), " followers while you were gone."));
    G.node = gui.get_node("returntogame_popup/bg");
    gui.set_scale(G.node, vmath.vector3(0.9, 0.9, 0.9));
    // The Lua passes the playback constant in the delay slot; kept.
    gui.animate(G.node, gui.PROP_SCALE, vmath.vector3(1, 1, 1), go.EASING_OUTELASTIC, 0.75, gui.PLAYBACK_ONCE_FORWARD);
    if (hearth > 1) show_barnaby(text); else if (t(barnaby)) gui.set_enabled(barnaby, false);
  }

  /* ******************************************
  INPUT
  ******************************************** */

  function on_pressed_back(_button?: any) {
    msg.post(controller, "hide_popup");
  }

  function on_pressed_button(button: any) {
    const particlespeed = 1;
    const startPos = gui.get_screen_position(button.node);
    const postmsg = { receiver: controller, message_id: "mod_followers", message: { amount: Math.max(offer / 25, 1) } };
    msg.post(controller, "spawn_particles", { num: Math.min(offer, 25), startPos: startPos, endTarget: "target_followers", time: particlespeed, icon: { texture: "main", flipbook: "pawn" }, postmsg: postmsg });

    msg.post(controller, "hide_popup");
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
        // `update_button` is an unset global here (nil).
        gooey.button("back_button/bg", action_id, action, on_pressed_back, G.update_button);
        gooey.button("button/bg", action_id, action, on_pressed_button, G.update_button);
      }
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        if (t(enabled)) { //and message.amount > 0 then
          offer = Math.max(offer, message.amount);
          hearth = t(message.hearth) ? message.hearth : 1;
          refresh_all();
        } else {
          //
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
