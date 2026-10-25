import { defineScript, gui, msg, hash, vmath, window, go, print } from '../../../engine';
import { t, S } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import saveload from '../../saveload/saveload';
import defsave from '../../defsave/defsave';

void inspect; void saveload;

defineScript('/main/popups/questCollect_popup.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "questCollect_popup";
  const controller = "main:/menu#controller"; void controller;
  let enabled: any = false;

  let Quest: any = {};
  let Stats: any = {};
  let Rep: any = {};
  let quest_id: any = 0;

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
    Stats = defsave.loaded.Stats.data;
    Rep = defsave.loaded.Ranks.data;
    Quest = Rep[Stats.Rank - 1].Quests[quest_id - 1];

    const background: Record<string, string> = {};
    background.reward_xp_icon = "tinyfancypanel_green";
    background.reward_gold_icon = "tinyfancypanel_gold";
    background.wood_closed = "tinyfancypanel_brown";
    background.banded_closed = "tinyfancypanel_brown";
    background.stone_closed = "tinyfancypanel_darkgrey";

    const rootNode = gui.get_node("questCollect_popup/bg");
    const iconNode = gui.get_node("reward/bg");
    const textNode = gui.get_node("reward/text");

    gui.set_texture(iconNode, Quest.Reward.texture);
    gui.play_flipbook(iconNode, Quest.Reward.flipbook);
    print(Quest.Reward.flipbook);
    gui.play_flipbook(rootNode, background[Quest.Reward.flipbook]);
    gui.set_text(textNode, Quest.Reward.desc);

    gui.set_scale(rootNode, vmath.vector3(0.9, 0.9, 0.9));
    // The Lua passes the playback constant in the delay slot; kept.
    gui.animate(rootNode, gui.PROP_SCALE, vmath.vector3(1, 1, 1), go.EASING_OUTELASTIC, 0.75, gui.PLAYBACK_ONCE_FORWARD);
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
  void update_button;

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
          msg.post(controller, "collect_quest", { id: quest_id });
          msg.post(controller, "hide_popup");
        }
      }
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        quest_id = message.id;
        if (t(enabled)) {
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
