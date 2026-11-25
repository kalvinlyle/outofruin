import { defineScript, gui, msg, hash, vmath, window, go, print } from '../../../engine';
import { t, cat, S } from '../../../lua';
import { G } from '../../globals';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import saveload from '../../saveload/saveload';
import defsave from '../../defsave/defsave';
import audio from '../../../systems/audio';

void inspect; void saveload;

defineScript('/main/popups/questClose_popup.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "questClose_Popup";
  const controller = "main:/menu#controller"; void controller;
  let enabled: any = false;

  let quest_id: any = 0;
  let quest_event: any = false;
  let Stats: any = {};
  const Rep: any = {}; void Rep;
  let bodyNode: any = {};

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
  const SCROLL_TEXT_COLOR = vmath.vector4(51 / 255, 32 / 255, 17 / 255, 1);
  const SCROLL_TEXT_SCALE = 1.1;

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

  // A live event's quest lives in the event's save, not in a chapter.
  function current_quest() {
    if (t(quest_event)) return Stats.Event.quests[quest_id - 1];
    return defsave.loaded.Ranks.data[Stats.Rank - 1].Quests[quest_id - 1];
  }

  function refresh_all() {
    audio.playUi("scroll");
    Stats = defsave.loaded.Stats.data;
    const quest = current_quest();

    gui.play_flipbook(gui.get_node("questClose_popup/npc"), cat("npc_", quest.Story_Ext["NPC"]));
    gui.set_text(gui.get_node("questClose_popup/text"), quest.Story_Ext.Text);

    G.node = gui.get_node("questClose_popup/bg");
    gui.set_scale(G.node, vmath.vector3(0.9, 0.9, 0.9));
    // The Lua passes the playback constant in the delay slot; kept.
    gui.animate(G.node, gui.PROP_SCALE, vmath.vector3(1, 1, 1), go.EASING_OUTELASTIC, 0.75, gui.PLAYBACK_ONCE_FORWARD);
  }

  /* ******************************************
  INPUT
  ******************************************** */

  function update_button(button: any) {
    if (t(button.pressed_now)) {
      //
    } else if (t(button.released_now)) {
      //
    } else if (!t(button.pressed) && t(button.over_now)) {
      //
    } else if (!t(button.pressed) && t(button.out_now)) {
      //
    }
  }

  function on_pressed_accept(_button?: any) {
    msg.post(controller, "popup_questCollect", { id: quest_id, event: quest_event });
  }

  return {
    init(_self) {
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      gui.set_render_order(15);
      gooey.acquire_input();
      bodyNode = gui.get_node("openscroll_body/bg");
      G.endsNode = gui.get_node("openscroll_ends/bg");
      G.bodySize = gui.get_size(bodyNode);
      G.endsSize = gui.get_size(G.endsNode);
      const textNode = gui.get_node("questClose_popup/text");
      gui.set_color(textNode, SCROLL_TEXT_COLOR);
      const baseScale = gui.get_scale(textNode);
      gui.set_scale(textNode, vmath.vector3(baseScale.x * SCROLL_TEXT_SCALE, baseScale.y * SCROLL_TEXT_SCALE, baseScale.z));
    },

    on_input(_self, action_id, action) {
      if (action_id !== undefined && action_id !== null && t(enabled)) {
        if (action_id === hash("touch") && action.pressed) {
          if (!gui.pick_node(gui.get_node("questClose_popup/bg"), action.x, action.y)) msg.post(controller, "hide_popup");
        }
        gooey.button("close_button/bg", action_id, action, on_pressed_accept, update_button);
      }
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        quest_id = message.id;
        quest_event = message.event === true;
        if (t(enabled)) {
          gui.set_size(bodyNode, vmath.vector3(G.bodySize.x, G.bodySize.y / 2 / 2, G.bodySize.z));
          gui.set_size(G.endsNode, vmath.vector3(G.endsSize.x, G.endsSize.y / 2, G.endsSize.z));
          gui.animate(bodyNode, "size.y", G.bodySize.y, gui.EASING_OUTBOUNCE, 0.5);
          gui.animate(G.endsNode, "size.y", G.endsSize.y, gui.EASING_OUTBOUNCE, 0.5);
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
