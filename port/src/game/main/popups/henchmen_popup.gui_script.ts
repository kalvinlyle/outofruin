import { defineScript, gui, msg, hash, vmath, window, go, print } from '../../../engine';
import { t, cat, len, S } from '../../../lua';
import { G } from '../../globals';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import actions from '../../actions';
import defsave from '../../defsave/defsave';
import loc from '../../shared/locsheets';

void inspect;

defineScript('/main/popups/henchmen_popup.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "henchmen_popup";
  const controller = "main:/menu#controller"; void controller;
  let enabled: any = false;

  let Henchmen: any = {};
  const Gear: Record<string, any> = {};

  let Currency: any = {};
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

  function update_henchmen(henchmen_data: any) {
    gui.set_texture(gui.get_node("henchmen/portrait"), henchmen_data.Portrait.texture);
    gui.play_flipbook(gui.get_node("henchmen/portrait"), henchmen_data.Portrait.flipbook);
    actions.fill_card_window(gui.get_node("henchmen/portrait"), gui.get_node("henchmen/portrait/stencil"));
    gui.set_text(gui.get_node("henchmen/name"), loc.get(henchmen_data.Name));
    gui.set_text(gui.get_node("henchmen/text"), loc.get(henchmen_data.Description));

    const node = gui.get_node("henchmen_popup/bg");
    gui.set_scale(node, vmath.vector3(0.9, 0.9, 0.9));
    // The Lua passes the playback constant in the delay slot; kept.
    gui.animate(node, gui.PROP_SCALE, vmath.vector3(1, 1, 1), go.EASING_OUTELASTIC, 0.75, gui.PLAYBACK_ONCE_FORWARD);

    const lockNode = gui.get_node("henchmen/lock");
    const shadowNode = gui.get_node("henchmen/shadow");
    const levelNode = gui.get_node("henchmen/progress/bg");
    const buttonNode = gui.get_node("henchmen/button/bg");
    const progressNode = gui.get_node("henchmen/progress/bg");

    gui.set_text(gui.get_node("henchmen/count/text"), loc.get(cat("ATTRIBUTE_", S.upper(henchmen_data.Modifier.Type)), Math.pow(henchmen_data.Modifier.Factor, henchmen_data.Level)));

    if (henchmen_data.Status === "Locked") {
      gui.set_enabled(lockNode, true);
      gui.set_enabled(shadowNode, true);
      gui.set_enabled(levelNode, false);
      gui.set_enabled(buttonNode, false);
      gui.set_enabled(progressNode, false);
    } else {
      gui.set_enabled(lockNode, false);
      gui.set_enabled(shadowNode, false);
      gui.set_enabled(levelNode, true);

      gui.set_text(gui.get_node("henchmen/level"), loc.get("HENCHMEN_LEVEL", henchmen_data.Level));
      const barsize = gui.get_size(gui.get_node("henchmen/progress/bg"));
      let progress = 0;
      if (henchmen_data.Progress !== undefined && henchmen_data.Progress !== null) progress = henchmen_data.Progress;
      gui.set_size(gui.get_node("henchmen/progress/bar"), vmath.vector3(barsize.x * progress, barsize.y, barsize.z));

      if (henchmen_data.Progress === undefined || henchmen_data.Progress === null) henchmen_data.Progress = 0;

      gui.set_text(gui.get_node("henchmen/copyText"), cat(henchmen_data.copyText, " ", loc.get("HENCHMEN_CARDS")));

      if (henchmen_data.Progress >= 1) {
        gui.set_enabled(buttonNode, true);
        gui.set_enabled(progressNode, false);
        gui.set_text(gui.get_node("henchmen/button/cost"), cat(henchmen_data.Cost, " ", S.upper(loc.get(actions.levelup_funds(henchmen_data.map_id).label))));

        gui.play_flipbook(gui.get_node("henchmen/button/bg"), "tinyfancybutton_green");
      } else {
        gui.set_enabled(buttonNode, false);
        gui.set_enabled(progressNode, true);
      }
    }
  }

  /* The gear slots were laid out for the square item icons gear used to use,
  drawn straight onto a stencil node that sits inside a 9-slice frame. The art
  is a 2:3 card now and the frame's opening is 3:4, so a card fitted inside the
  opening leaves a band of grey down both sides, and one that covers it spills
  out over the frame. The slot node is already a stencil, so it becomes the
  window: sized and centred on the frame's opening and drawn invisibly, with the
  card in a child it clips. That crops the card's headroom rather than its
  sides, the same way the other card windows in the game do it. */
  const gearCards: Record<string, any> = {};

  function show_gear_card(type: string, art: any) {
    const slot = gui.get_node(cat(type, "/icon/bg"));
    const frame = gui.get_node(cat(type, "/border/bg"));

    // The slot and the frame are siblings, so the opening is worked out in
    // the panel space they share. The frame's bottom lip is deeper than its
    // top, which puts the opening's centre above the frame's.
    const size = gui.get_size(frame), scale = gui.get_scale(frame), pos = gui.get_position(frame);
    const lip = gui.get_slice9(frame); // x left, y top, z right, w bottom
    const openW = (size.x - lip.x - lip.z) * scale.x;
    const openH = (size.y - lip.y - lip.w) * scale.y;
    const slotScale = gui.get_scale(slot);
    gui.set_size_mode(slot, gui.SIZE_MODE_MANUAL);
    gui.set_size(slot, vmath.vector3(openW / slotScale.x, openH / slotScale.y, 0));
    gui.set_position(slot, vmath.vector3(
      pos.x + (lip.x - lip.z) / 2 * scale.x,
      pos.y + (lip.w - lip.y) / 2 * scale.y,
      gui.get_position(slot).z));
    gui.set_clipping_mode(slot, gui.CLIPPING_MODE_STENCIL);
    gui.set_clipping_visible(slot, false);

    let card = gearCards[type];
    if (card === undefined || card === null) {
      card = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(1, 1, 0));
      gui.set_parent(card, slot);
      gui.set_layer(card, gui.get_layer(slot));
      gui.set_inherit_alpha(card, true);
      gearCards[type] = card;
    }
    gui.set_texture(card, art.texture);
    gui.play_flipbook(card, art.flipbook);
    actions.fill_card_window(card, slot);
  }

  function update_gear(type: string, map_id: any, dungeon_id: any, level_id: any) {
    const gear_data = actions.clone(defsave.loaded.Gear.data);
    const color: Record<string, string> = {
      Common: "tinyfancybutton_darkgrey",
      Wild: "tinyfancybutton_brown",
      Rare: "tinyfancybutton_green",
      Epic: "tinyfancybutton_blue",
      Legendary: "tinyfancybutton_purple",
      Exotic: "tinyfancybutton_orange",
    };

    Gear[type] = undefined;
    for (let g = 1; g <= len(gear_data); g++) {
      const gear = gear_data[g - 1];
      if (gear.Modifier.Type === type && gear.map_id === map_id && gear.dungeon_id === dungeon_id && gear.level_id === level_id) {
        Gear[type] = {};
        Gear[type] = gear;
        break;
      }
    }

    // gui.set_enabled takes Lua truthiness of the table / nil.
    gui.set_enabled(gui.get_node(cat(type, "/panel/bg")), t(Gear[type]));
    gui.set_enabled(gui.get_node(cat(type, "/name")), t(Gear[type]));
    gui.set_enabled(gui.get_node(cat(type, "/text")), t(Gear[type]));
    gui.set_enabled(gui.get_node(cat(type, "/button/bg")), t(Gear[type]));
    gui.set_text(gui.get_node(cat(type, "/count/text")), loc.get(cat("ATTRIBUTE_", S.upper(type)), 1));

    if (Gear[type] !== undefined && Gear[type] !== null) {
      show_gear_card(type, t(Gear[type].Portrait) ? Gear[type].Portrait : Gear[type].Icon);
      gui.set_text(gui.get_node(cat(type, "/name")), loc.get(Gear[type].Name));
      gui.set_text(gui.get_node(cat(type, "/text")), loc.get(Gear[type].Description));
      const node = gui.get_node(cat(type, "/bg")); void node;

      const panelNode = gui.get_node(cat(type, "/panel/bg"));
      const lockNode = gui.get_node(cat(type, "/lock"));
      const shadowNode = gui.get_node(cat(type, "/shadow"));
      const levelNode = gui.get_node(cat(type, "/count/bg")); void levelNode;
      const buttonNode = gui.get_node(cat(type, "/button/bg"));
      const progressNode = gui.get_node(cat(type, "/progress/bg"));

      gui.set_text(gui.get_node(cat(type, "/count/text")), loc.get(cat("ATTRIBUTE_", S.upper(type)), Math.pow(Gear[type].Modifier.Factor, Gear[type].Level)));

      gui.play_flipbook(panelNode, color[Gear[type].Rarity]);
      if (Gear[type].Status === "Locked") {
        gui.set_enabled(lockNode, true);
        gui.set_enabled(shadowNode, true);

        gui.set_enabled(buttonNode, false);
        gui.set_enabled(progressNode, false);
      } else {
        gui.set_enabled(lockNode, false);
        gui.set_enabled(shadowNode, false);

        gui.set_enabled(progressNode, true);

        gui.set_text(gui.get_node(cat(type, "/level")), loc.get("HENCHMEN_LEVEL", Gear[type].Level));
        const barsize = gui.get_size(gui.get_node(cat(type, "/progress/bg")));
        let progress = 0;
        if (Gear[type].Progress !== undefined && Gear[type].Progress !== null) progress = Gear[type].Progress;
        const xSize = barsize.x * progress; void xSize;
        gui.set_size(gui.get_node(cat(type, "/progress/bar")), vmath.vector3(barsize.x * progress, barsize.y, barsize.z));

        if (Gear[type].Progress === undefined || Gear[type].Progress === null) Gear[type].Progress = 0;

        gui.set_text(gui.get_node(cat(type, "/copyText")), cat(Gear[type].copyText, " ", loc.get("HENCHMEN_CARDS")));

        if (Gear[type].Progress >= 1) {
          gui.set_enabled(buttonNode, true);
          gui.set_enabled(progressNode, false);
          gui.set_text(gui.get_node(cat(type, "/button/cost")), cat(Gear[type].Cost, " ", loc.get(actions.levelup_funds(Gear[type].map_id).label)));
          gui.play_flipbook(gui.get_node(cat(type, "/button/bg")), "tinyfancybutton_green");
        } else {
          gui.set_enabled(buttonNode, false);
        }

        gui.set_enabled(buttonNode, Gear[type].Progress >= 1);
        gui.set_text(gui.get_node(cat(type, "/button/cost")), cat(Gear[type].Cost, " ", loc.get(actions.levelup_funds(Gear[type].map_id).label)));
        gui.play_flipbook(gui.get_node(cat(type, "/button/bg")), "tinyfancybutton_green");
      }
    }
  }

  function refresh_all() {
    Henchmen = defsave.loaded.Henchmen.data[id - 1];
    Currency = defsave.loaded.Currency.data;

    update_henchmen(Henchmen);

    update_gear("critChance", Henchmen.map_id, Henchmen.dungeon_id, Henchmen.level_id);
    update_gear("critBonus", Henchmen.map_id, Henchmen.dungeon_id, Henchmen.level_id);
    update_gear("critLuck", Henchmen.map_id, Henchmen.dungeon_id, Henchmen.level_id);
    update_gear("packSize", Henchmen.map_id, Henchmen.dungeon_id, Henchmen.level_id);
  }

  /* ******************************************
  INPUT
  ******************************************** */

  // Short of XP opens the shop; short of an event's shards says where they come from.
  function cannot_afford(card: any) {
    const funds = actions.levelup_funds(card.map_id);
    if (card.Cost <= funds.have) return false;
    if (t(funds.shards)) {
      msg.post(controller, "popup_message", { title: funds.name, text: funds.need });
    } else {
      msg.post(controller, "show_shop", { complete_purchase_callback: "cards" });
    }
    return true;
  }

  function on_buyHenchmen(_button?: any) {
    msg.post(controller, "hide_popup");
    if (cannot_afford(Henchmen)) {
      //
    } else {
      msg.post(controller, "show_upgradecard", { type: "Henchmen", id: id, message_id: "levelup_henchmen", message: { henchmen_id: id } });
    }
  }

  function on_buyUpgrade(type: string) {
    msg.post(controller, "hide_popup");
    if (cannot_afford(Gear[type])) {
      //
    } else {
      msg.post(controller, "show_upgradecard", { type: "Gear", id: Gear[type].id, message_id: "levelup_gear", message: { gear_id: Gear[type].id } });
    }
  }

  function on_buycritChance(_button?: any) { on_buyUpgrade("critChance"); }
  function on_buycritBonus(_button?: any) { on_buyUpgrade("critBonus"); }
  function on_buycritLuck(_button?: any) { on_buyUpgrade("critLuck"); }
  function on_buypackSize(_button?: any) { on_buyUpgrade("packSize"); }

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
          if (!gui.pick_node(gui.get_node("henchmen_popup/bg"), action.x, action.y)) msg.post(controller, "hide_popup");
        }
        // `update_button` is an unset global here (nil).
        gooey.button("henchmen/button/bg", action_id, action, on_buyHenchmen, G.update_button);
        gooey.button("critChance/button/bg", action_id, action, on_buycritChance, G.update_button);
        gooey.button("critBonus/button/bg", action_id, action, on_buycritBonus, G.update_button);
        gooey.button("critLuck/button/bg", action_id, action, on_buycritLuck, G.update_button);
        gooey.button("packSize/button/bg", action_id, action, on_buypackSize, G.update_button);
      }
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        if (t(enabled)) {
          id = message.henchmen_id;
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
