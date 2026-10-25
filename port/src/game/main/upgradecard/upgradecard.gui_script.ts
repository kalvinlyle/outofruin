import { defineScript, gui, msg, hash, vmath, window, go, print } from '../../../engine';
import { t, cat, S } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import defsave from '../../defsave/defsave';
import loc from '../../shared/locsheets';

void inspect;

// Used by two components: the locals below are shared by both, as in the Lua chunk.
defineScript('/main/upgradecard/upgradecard.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "rankUp_popup";
  const controller = "main:/menu#controller";
  let enabled: any = false;
  let pause = true;
  let card: any = {};
  let textPos: any = {};
  let complete_purchase_callback: any = "dungeonmine";

  const color: Record<string, string> = {
    Common: "tinyfancybutton_darkgrey",
    Wild: "tinyfancybutton_brown",
    Rare: "tinyfancybutton_green",
    Epic: "tinyfancybutton_blue",
    Legendary: "tinyfancybutton_purple",
    Exotic: "tinyfancybutton_orange",
  };

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
    const [, h] = r;
    place("root/center", undefined, screen_bottom() + h / 2);
  }

  function unpause() {
    pause = false;
  }

  function animate_leveltext_out() {
    const node = gui.get_node("upgradecard/title");
    gui.animate(node, "position.x", vmath.vector3(textPos.x + 800, textPos.y, textPos.z), gui.EASING_INSINE, 0.25, 0.25);
  }

  function animate_leveltext_in() {
    if (t(card.message)) {
      const node = gui.get_node("upgradecard/title");
      gui.set_position(node, vmath.vector3(textPos.x - 800, textPos.y, textPos.z));
      gui.animate(node, "position.x", textPos, gui.EASING_OUTSINE, 0.25, 0, unpause);
      if (t(card.message) && t(card.message_id)) {
        msg.post(controller, card.message_id, card.message);
        card.message_id = undefined;
        card.message = undefined;
      }
    }
  }

  function animate_card() {
    const node = gui.get_node("upgradecard/bg");
    gui.set_scale(node, vmath.vector3(0.9, 0.9, 0.9));
    gui.animate(node, gui.PROP_SCALE, vmath.vector3(1, 1, 1), go.EASING_OUTELASTIC, 0.75, 0, animate_leveltext_in);
  }

  function update_card() {
    gui.set_text(gui.get_node("upgradecard/title"), loc.get("HENCHMEN_LEVEL", [card.Level]));
    gui.set_text(gui.get_node("upgradecard/desc"), S.upper(loc.get("PERMANENT_BONUS")));
    if (t(card.Portrait)) {
      gui.set_texture(gui.get_node("card/image"), card.Portrait.texture);
      gui.play_flipbook(gui.get_node("card/image"), card.Portrait.flipbook);
    } else if (t(card.Icon)) {
      gui.set_texture(gui.get_node("card/image"), card.Icon.texture);
      gui.play_flipbook(gui.get_node("card/image"), card.Icon.flipbook);
    }
    gui.set_text(gui.get_node("card/name"), loc.get(card.Name));
    gui.set_text(gui.get_node("card/text"), loc.get(card.Description));

    gui.play_flipbook(gui.get_node("card/panel/bg"), color[card.Rarity]);
  }

  function refresh_all() {
    if (t(enabled)) {
      update_card();
      if (t(card.message)) {
        animate_leveltext_out();
        animate_card();
      }
    }
  }

  return {
    init(_self) {
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      gui.set_render_order(15);
      gooey.acquire_input();
      const node = gui.get_node("upgradecard/title");
      textPos = gui.get_position(node);
    },

    on_input(_self, action_id, action) {
      if (action_id !== undefined && action_id !== null && t(enabled)) {
        if (action_id === hash("touch") && action.pressed && !pause) {
          msg.post(controller, cat("show_", complete_purchase_callback));
        }
      }
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        if (t(enabled)) {
          complete_purchase_callback = t(message.message.complete_purchase_callback) ? message.message.complete_purchase_callback : "dungeonmine";
          pause = true;
          { const c = defsave.get(message.type, message.id); card = t(c) ? c : undefined; }
          card.type = message.type;
          card.message_id = t(message.message_id) ? message.message_id : undefined;
          card.message = t(message.message) ? message.message : undefined;
          card.message.callback = "upgradecard";
          refresh_all();
        }
        msg.post("main:/background#background", "set_enabled", { enabled: enabled, effect: { type: "stream", texture: "backgrounds", flipbook: "upgrade" } });
      } else if (message_id === hash("refresh_all")) {
        if (!t(card.message) && t(card.type) && t(card.id)) {
          card = defsave.get(card.type, card.id);
        }
        refresh_all();
      }
    },

    update(_self, _dt) {
      layout_screen();
    },
  };
});
