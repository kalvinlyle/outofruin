import { defineScript, gui, msg, hash, vmath, go, print } from '../../../engine';
import { t, cat, len, S, T, os } from '../../../lua';
import { G } from '../../globals';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import actions from '../../actions';
import random from '../../random/random';
import progress from '../../progress/progress';
import defsave from '../../defsave/defsave';
import loc from '../../shared/locsheets';

void gooey; void inspect; void random; void progress;

defineScript('/main/openpack/openpack.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "openpack";

  const controller = "main:/menu#controller";
  let enabled: any = false;
  let active = true; void active;

  let pack: any = {};
  let pack_id: any = 0;
  let items: any = {}; void items;
  let henchmen_data: any = {};
  let gear_data: any = {};
  let hero_data: any = {};
  let xpcount = 1;
  let goldcount = 1;

  let minicards: any[] = [];
  let summaryPos: any = {};

  let henchmencount = 0;
  let gearcount = 0;
  let herocount = 0;

  let itemcount = 1; void itemcount;
  let resourcecount = 1;
  let state = "closed";
  let openinit = 0;
  let timer = 0;
  let chestpos: any = 0;
  let complete_purchase_callback: any = "dungeonmine";

  /* ******************************************
              FUNCTIONS
  ******************************************** */

  function animatetile(node: any) {
    const pos = gui.get_position(node);
    const animDuration = 0.5;
    const posOffset = -250;
    const scaleOffset = 0.75;

    gui.set_enabled(node, true);
    gui.set_scale(node, vmath.vector3(scaleOffset, scaleOffset, scaleOffset));
    gui.set_position(node, vmath.vector3(pos.x, posOffset, pos.z));
    // The Lua passes the playback constant in the delay slot; kept.
    gui.animate(node, "position.y", 0, go.EASING_OUTELASTIC, animDuration, gui.PLAYBACK_ONCE_FORWARD);
    gui.animate(node, gui.PROP_SCALE, vmath.vector3(1, 1, 1), go.EASING_OUTELASTIC, animDuration, gui.PLAYBACK_ONCE_FORWARD);
  }

  function set_card(card: any, num: any, prefix: string) {
    const color: Record<string, string> = {
      Common: "tinyfancybutton_darkgrey",
      Wild: "tinyfancybutton_brown",
      Rare: "tinyfancybutton_green",
      Epic: "tinyfancybutton_blue",
      Legendary: "tinyfancybutton_purple",
      Exotic: "tinyfancybutton_orange",
      Gold: "tinyfancybutton_gold",
      Xp: "tinyfancybutton_green",
    };
    card.Name = t(card.Name) ? card.Name : "";
    card.Description = t(card.Description) ? card.Description : "";
    gui.set_text(gui.get_node(cat(prefix, "/count/text")), cat("x", actions.display_number(num)));
    if (card.Portrait !== undefined && card.Portrait !== null) {
      gui.set_texture(gui.get_node(cat(prefix, "/image")), card.Portrait.texture);
      gui.play_flipbook(gui.get_node(cat(prefix, "/image")), card.Portrait.flipbook);
    } else if (card.Icon !== undefined && card.Icon !== null) {
      gui.set_texture(gui.get_node(cat(prefix, "/image")), card.Icon.texture);
      gui.play_flipbook(gui.get_node(cat(prefix, "/image")), card.Icon.flipbook);
    }
    gui.play_flipbook(gui.get_node(cat(prefix, "/panel/bg")), color[card.Rarity]);
  }

  function create_minicard(card: any, num: any, prefix: string) {
    set_card(card, num, prefix);
    if (minicards === undefined || minicards === null) minicards = [];
    T.insert(minicards, gui.clone_tree(gui.get_node("minicard/panel/bg")));
  }

  function cleanup() {
    // ipairs: stops at the first nil, so clearing the current slot doesn't end the walk.
    for (let c = 1; minicards[c - 1] !== undefined && minicards[c - 1] !== null; c++) {
      gui.delete_node(minicards[c - 1][hash("minicard/panel/bg")]);
      minicards[c - 1] = undefined;
    }
    minicards = [];
  }

  function close_screen() {
    G.cardcount = 1;
    resourcecount = 1;
    itemcount = 1;
    cleanup();
    state = "closed";
    gui.play_flipbook(gui.get_node("loot/bg"), cat(pack.container, "_closed"));
    gui.set_enabled(gui.get_node("loot/shine/bg"), false);
    gui.set_enabled(gui.get_node("loot/treasure/bg"), false);
    gui.set_enabled(gui.get_node("card/bg"), false);
    msg.post(controller, "close_pack", { pack_id: pack_id });
    msg.post(controller, cat("show_", complete_purchase_callback));
  }

  function open_pack() {
    gui.set_enabled(gui.get_node("card/bg"), false);
    gui.set_enabled(gui.get_node("summary/bg"), false);

    if (state === "closed") {
      state = "opening";
      const min = -0.05;
      const max = 0.05;
      const values = [
        min, min, min,
        max, max, max,
      ];
      const vec = vmath.vector(values);
      const node = gui.get_node("loot/bg");

      gui.animate(node, "position.x", 100, vec as any, 0.1, 0, undefined, gui.PLAYBACK_LOOP_PINGPONG);
    } else if (state === "open") {
      gui.set_enabled(gui.get_node("loot/shine/bg"), false);
      gui.set_enabled(gui.get_node("loot/treasure/bg"), true);
      if (xpcount < pack.xp) {
        const card: any = {};
        card.Rarity = "Xp";
        card.Icon = { texture: "reward_icons", flipbook: "reward_xp_icon" };
        gui.set_text(gui.get_node("card/name"), S.upper(loc.get("COLLECT_XP")));
        gui.set_text(gui.get_node("card/text"), "");
        set_card(card, pack.xp, "card");
        create_minicard(card, pack.xp, "minicard");
        animatetile(gui.get_node("card/bg"));
        xpcount = pack.xp;
      } else if (goldcount < pack.gold) {
        const card: any = {};
        card.Rarity = "Gold";
        card.Icon = { texture: "reward_icons", flipbook: "reward_gold_icon" };
        gui.set_text(gui.get_node("card/name"), S.upper(loc.get("COLLECT_GOLD")));
        gui.set_text(gui.get_node("card/text"), "");
        set_card(card, pack.gold, "card");
        create_minicard(card, pack.gold, "minicard");
        animatetile(gui.get_node("card/bg"));
        goldcount = pack.gold;
      } else if (resourcecount <= len(pack.resources)) {
        gui.play_flipbook(gui.get_node("card/bg"), "tinyfancypanel_darkbrown");
        gui.set_text(gui.get_node("card/name"), loc.get(pack.resources[resourcecount - 1].Name));
        gui.set_text(gui.get_node("card/text"), loc.get(pack.resources[resourcecount - 1].Description));
        set_card(pack.resources[resourcecount - 1], pack.resources[resourcecount - 1].amount, "card");
        // `set_minicard` is an undefined global in the Lua: calling it raises, as here.
        G.set_minicard(pack.resources[resourcecount - 1], pack.resources[resourcecount - 1].amount, "minicard");
        animatetile(gui.get_node("card/bg"));
        resourcecount = resourcecount - 1;
      } else if (gearcount > 0) {
        gui.play_flipbook(gui.get_node("card/bg"), "tinyfancypanel_brown");
        gui.set_text(gui.get_node("card/name"), loc.get(gear_data[pack.cards.gear[gearcount - 1].id - 1].Name));
        gui.set_text(gui.get_node("card/text"), loc.get(gear_data[pack.cards.gear[gearcount - 1].id - 1].Description));
        set_card(gear_data[pack.cards.gear[gearcount - 1].id - 1], pack.cards.gear[gearcount - 1].amount, "card");
        create_minicard(gear_data[pack.cards.gear[gearcount - 1].id - 1], pack.cards.gear[gearcount - 1].amount, "minicard");
        animatetile(gui.get_node("card/bg"));
        gearcount = gearcount - 1;
      } else if (henchmencount > 0) {
        gui.play_flipbook(gui.get_node("card/bg"), "tinyfancypanel_brown");
        gui.set_text(gui.get_node("card/name"), loc.get(henchmen_data[pack.cards.henchmen[henchmencount - 1].id - 1].Name));
        gui.set_text(gui.get_node("card/text"), loc.get(henchmen_data[pack.cards.henchmen[henchmencount - 1].id - 1].Description));
        set_card(henchmen_data[pack.cards.henchmen[henchmencount - 1].id - 1], pack.cards.henchmen[henchmencount - 1].amount, "card");
        create_minicard(henchmen_data[pack.cards.henchmen[henchmencount - 1].id - 1], pack.cards.henchmen[henchmencount - 1].amount, "minicard");
        animatetile(gui.get_node("card/bg"));
        henchmencount = henchmencount - 1;
      } else if (herocount > 0) {
        gui.play_flipbook(gui.get_node("card/bg"), "tinyfancypanel_brown");
        gui.set_text(gui.get_node("card/name"), loc.get(hero_data[pack.cards.hero[herocount - 1].id - 1].Name));
        gui.set_text(gui.get_node("card/text"), loc.get(hero_data[pack.cards.hero[herocount - 1].id - 1].Description));
        set_card(hero_data[pack.cards.hero[herocount - 1].id - 1], pack.cards.hero[herocount - 1].amount, "card");
        create_minicard(hero_data[pack.cards.hero[herocount - 1].id - 1], pack.cards.hero[herocount - 1].amount, "minicard");
        animatetile(gui.get_node("card/bg"));
        herocount = herocount - 1;
      } else {
        gui.set_enabled(gui.get_node("card/bg"), false);
        gui.set_enabled(gui.get_node("summary/bg"), false);
        gui.set_enabled(gui.get_node("minicard/panel/bg"), false);

        if (len(minicards) > 1) {
          gui.set_enabled(gui.get_node("summary/bg"), true);
          const pos = gui.get_position(gui.get_node("minicard/panel/bg"));
          const scale = gui.get_scale(gui.get_node("minicard/panel/bg"));
          const size = gui.get_size(gui.get_node("minicard/panel/bg"));
          let row = 0;
          let column = 0;
          const padding = 5;
          const width = (size.x * scale.x) + padding;
          const height = (size.y * scale.y) + padding;
          for (let m = 1; m <= len(minicards); m++) {
            const minicard = minicards[m - 1];
            gui.set_enabled(minicard[hash("minicard/panel/bg")], true);
            gui.set_position(minicard[hash("minicard/panel/bg")], vmath.vector3(pos.x + (column * width), pos.y + (-row * height), pos.z));
            column = column + 1;
            if (column >= 3) { column = 0; row = row + 1; }
          }
          gui.set_position(gui.get_node("summary/bg"), vmath.vector3(summaryPos.x - (Math.min(3, len(minicards)) * width / 2), summaryPos.y + (Math.ceil(len(minicards) / 3) * height / 2), summaryPos.z));
        } else {
          close_screen();
        }
        state = "done";
      }
    } else if (state === "done") {
      close_screen();
    }
  }

  return {
    init(_self) {
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);

      gui.set_enabled(gui.get_node("card/bg"), false);
      gui.set_enabled(gui.get_node("loot/shine/bg"), false);
      gui.set_enabled(gui.get_node("loot/treasure/bg"), false);
      chestpos = gui.get_position(gui.get_node("loot/bg"));
      gui.set_render_order(5);

      summaryPos = gui.get_position(gui.get_node("summary/bg"));
    },

    update(_self, _dt) {
      if (t(enabled) && state !== "open") {
        if (state !== "closed" && os.clock() > openinit + timer) {
          if (state === "shine") {
            state = "open";
            openinit = os.clock();
            timer = 0.25;
            open_pack();
          }
          if (state === "opening") {
            state = "shine";
            openinit = os.clock();
            timer = 0.05;
          }
        }
        if (state === "shine") {
          const node = gui.get_node("loot/bg");
          gui.cancel_animation(node, "position.x");
          gui.set_position(gui.get_node("loot/bg"), chestpos);
          gui.play_flipbook(gui.get_node("loot/bg"), cat(pack.container, "_open"));
          gui.set_enabled(gui.get_node("loot/shine/bg"), true);
        }
        if (state === "open") {
          gui.set_enabled(gui.get_node("loot/shine/bg"), false);
          gui.set_enabled(gui.get_node("loot/treasure/bg"), true);
        }
      }
    },

    on_input(_self, action_id, action) {
      G.cardcount = G.cardcount;
      if (action_id !== undefined && action_id !== null && t(enabled)) {
        if (action.pressed && os.clock() > openinit + timer) {
          if (state !== "closed") {
            openinit = os.clock();
            timer = 0.25;
          }
          open_pack();
          gui.set_enabled(gui.get_node("loot/button/text"), false);
        }
      }
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        msg.post("main:/background#background", "set_enabled", { enabled: enabled });
        if (t(enabled)) {
          complete_purchase_callback = t(message.complete_purchase_callback) ? message.complete_purchase_callback : "dungeonmine";
          gui.set_enabled(gui.get_node("loot/button/text"), true);
          const packs = actions.clone(defsave.loaded.Loot.data.Packs);
          henchmen_data = actions.clone(defsave.loaded.Henchmen.data);
          gear_data = actions.clone(defsave.loaded.Gear.data);
          hero_data = actions.clone(defsave.loaded.Hero.data);
          if (len(packs) === 0) msg.post(controller, "show_previous");
          pack_id = message.pack_id;
          pack = packs[pack_id - 1];
          items = actions.clone(defsave.loaded.Loot.data.Items);
          xpcount = 1;
          goldcount = 1;
          itemcount = 1;
          if (t(pack.cards.henchmen)) henchmencount = len(pack.cards.henchmen);
          if (t(pack.cards.gear)) gearcount = len(pack.cards.gear);
          if (t(pack.cards.hero)) herocount = len(pack.cards.hero);
          gui.play_flipbook(gui.get_node("loot/bg"), cat(pack.container, "_closed"));
          openinit = os.clock();
          timer = 0.25;
          state = "closed";
          open_pack();
        }
      }
    },
  };
});
