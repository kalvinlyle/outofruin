import { defineScript, gui, msg, hash, vmath, window, go, print } from '../../../engine';
import { t, len, S, T, os, pairs } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import actions from '../../actions';
import saveload from '../../saveload/saveload';
import defsave from '../../defsave/defsave';
import loc from '../../shared/locsheets';

void inspect; void saveload;

defineScript('/main/unlockcards/unlockcards.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "levelUp_popup";
  const controller = "main:/menu#controller";
  let enabled: any = false;

  let henchmen_data: any = {};
  let henchmen_list: any[] = [];

  let hero_data: any = {};
  let hero_list: any[] = [];

  let gear_data: any = {};
  let gear_list: any[] = [];

  let popupNode: any = {};
  let lockNode: any = {};
  let shadowNode: any = {};

  let lockPos: any = {};
  let shadowColor: any = vmath.vector4(1, 1, 1, 1);

  let paused = false;
  let timer = 0;
  let click = false;
  let return_loc: any = undefined;

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

  function show_card(list: any[], data: any[]) {
    const color: Record<string, string> = {
      Common: "tinyfancybutton_darkgrey",
      Wild: "tinyfancybutton_brown",
      Rare: "tinyfancybutton_green",
      Epic: "tinyfancybutton_blue",
      Legendary: "tinyfancybutton_purple",
      Exotic: "tinyfancybutton_orange",
    };

    if (len(list) > 0) {
      paused = true;
      timer = os.clock() + 0.5;

      const Card = data[list[0] - 1];

      if (t(Card.Portrait)) {
        gui.set_texture(gui.get_node("card/image"), Card.Portrait.texture);
        gui.play_flipbook(gui.get_node("card/image"), Card.Portrait.flipbook);
      } else if (t(Card.Icon)) {
        gui.set_texture(gui.get_node("card/image"), Card.Icon.texture);
        gui.play_flipbook(gui.get_node("card/image"), Card.Icon.flipbook);
      }
      actions.fill_card_window(gui.get_node("card/image"), gui.get_node("card/portrait/stencil"));
      gui.set_text(gui.get_node("card/name"), loc.get(Card.Name));
      gui.set_text(gui.get_node("card/text"), loc.get(Card.Description));

      gui.play_flipbook(gui.get_node("card/panel/bg"), color[Card.Rarity]);

      gui.set_scale(popupNode, vmath.vector3(0.9, 0.9, 0.9));
      // The Lua passes the playback constant in the delay slot; kept.
      gui.animate(popupNode, gui.PROP_SCALE, vmath.vector3(1, 1, 1), go.EASING_OUTELASTIC, 0.75, gui.PLAYBACK_ONCE_FORWARD);

      gui.play_flipbook(lockNode, "Locked");
      gui.set_position(lockNode, lockPos);
      gui.play_flipbook(lockNode, "Unlocked");
      gui.animate(lockNode, gui.PROP_POSITION, vmath.vector3(0, -500, 0), go.EASING_INBACK, 0.75, gui.PLAYBACK_ONCE_FORWARD);

      gui.set_color(shadowNode, shadowColor);
      gui.animate(shadowNode, gui.PROP_COLOR, vmath.vector4(0, 0, 0, 0), go.EASING_LINEAR, 0.25, gui.PLAYBACK_ONCE_FORWARD);

      T.remove(list, 1);
    }

    return list;
  }

  function next() {
    if (len(henchmen_list) > 0) {
      henchmen_list = show_card(henchmen_list, henchmen_data);
    } else if (len(gear_list) > 0) {
      gear_list = show_card(gear_list, gear_data);
    } else if (len(hero_list) > 0) {
      hero_list = show_card(hero_list, hero_data);
    } else {
      const target = return_loc;
      return_loc = undefined;
      if (t(target)) {
        msg.post(controller, "show_dungeonmine", target);
      } else {
        msg.post(controller, "show_dungeonmine");
      }
    }
  }

  function refresh_all() {
    henchmen_data = actions.clone(defsave.loaded.Henchmen.data);
    hero_data = actions.clone(defsave.loaded.Hero.data);
    gear_data = actions.clone(defsave.loaded.Gear.data);
  }

  return {
    init(_self) {
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      gui.set_render_order(15);
      gooey.acquire_input();

      popupNode = gui.get_node("unlockcards/bg");
      lockNode = gui.get_node("card/lock");
      shadowNode = gui.get_node("card/shadow");

      lockPos = gui.get_position(lockNode);
      shadowColor = gui.get_color(shadowNode);
    },

    update(_self, _dt) {
      layout_screen();
      if (t(enabled)) {
        if (paused && os.clock() > timer) {
          paused = false;
        }
        if (!paused && click) {
          next();
          click = false;
        }
      }
    },

    on_input(_self, action_id, action) {
      if (action_id !== undefined && action_id !== null && t(enabled)) {
        if (action_id === hash("touch") && action.pressed) {
          click = true;
        }
      }
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        msg.post("main:/background#background", "set_enabled", { enabled: enabled, effect: { type: "stream", texture: "backgrounds", flipbook: "rankup" } });
        if (t(enabled)) {
          if (t(message.map_id)) {
            return_loc = { map_id: message.map_id, dungeon_id: t(message.dungeon_id) ? message.dungeon_id : 1 };
          }
          if (t(message.henchmen_list)) {
            for (const [, card] of pairs(message.henchmen_list)) {
              T.insert(henchmen_list, card);
            }
          }
          if (t(message.hero_list)) {
            for (const [, card] of pairs(message.hero_list)) {
              T.insert(hero_list, card);
            }
          }
          if (t(message.gear_list)) {
            for (const [, card] of pairs(message.gear_list)) {
              T.insert(gear_list, card);
            }
          }
          refresh_all();
          click = true;
        }
      } else if (message_id === hash("refresh_all")) {
        refresh_all();
      }
    },
  };
});
