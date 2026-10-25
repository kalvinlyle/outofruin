import { defineScript, gui, msg, hash, vmath, window, print } from '../../../engine';
import { t, cat, len, S, T } from '../../../lua';
import { G } from '../../globals';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import progress from '../../progress/progress';
import defsave from '../../defsave/defsave';
import actions from '../../actions';
import loc from '../../shared/locsheets';

void inspect; void random; void progress; void loc;

function assert(v: unknown, m?: string): void {
  if (!t(v)) throw new Error(m ?? 'assertion failed!');
}

defineScript('/main/cards/cards.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "cards";
  const controller = "main:/menu#controller";
  let enabled: any = false;
  let active: any = true;

  let cards_list_cols: any[] = [];
  const totalColumns = 3;
  let sortIndex = 3;
  const sortModes = [
    { display: "Type", mode: "Type", order: true },
    { display: "Rarity", mode: "RarityOrder", order: false },
    { display: "Upgrade", mode: "Progress", order: false },
    { display: "Level", mode: "Level", order: false },
    { display: "Chapter", mode: "Rank", order: true },
  ];

  const color: Record<string, string> = {
    Common: "tinyfancybutton_darkgrey",
    Wild: "tinyfancybutton_brown",
    Rare: "tinyfancybutton_green",
    Epic: "tinyfancybutton_blue",
    Legendary: "tinyfancybutton_purple",
    Exotic: "tinyfancybutton_orange",
  };

  const order: Record<string, number> = {
    Common: 1,
    Wild: 2,
    Rare: 3,
    Epic: 4,
    Legendary: 5,
    Exotic: 6,
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
  function content_top() { return screen_top() - HEADER_DEPTH; }
  function content_bottom() { return screen_bottom() + FOOTER_TOP; }

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
  }

  function layout_screen() {
    const r = screen_changed();
    if (!r) return;
    const [w] = r;
    // Tab bar under the header, card grid filling what is left above the footer.
    place("navbar/bg", undefined, content_top() - 41.5);
    resize("navbar/bg", w, undefined);
    const top = content_top() - 83.5;
    const height = top - (content_bottom() - 5);
    place("cards/stencil", undefined, top);
    resize("cards/stencil", w, height);
    // Each column clips its own list, so they get the new height too, and
    // spread across the width rather than sitting 240 apart.
    for (let i = 1; i <= 3; i++) {
      place(cat("cards/stencil/col/", i), (i - 2) * w * 0.32, undefined);
      resize(cat("cards/stencil/col/", i), undefined, height - 15);
    }
  }

  /* ******************************************
              FUNCTIONS
  ******************************************** */

  function update_cards(list: any, column: number) {
    for (let i = 1; i <= len(list.items); i++) {
      const item = list.items[i - 1];
      if (actions.tablelength(item.data) > 0) {
        gui.set_enabled(item.nodes[hash(cat("card/col/", column))], true);

        const imageNode = item.nodes[hash(cat("card/image/col/", column))];
        const panelNode = item.nodes[hash(cat("card/panel/bg/col/", column))];
        if (t(item.data.Portrait)) {
          gui.set_texture(imageNode, item.data.Portrait.texture);
          gui.play_flipbook(imageNode, item.data.Portrait.flipbook);
        } else if (t(item.data.Icon)) {
          gui.set_texture(imageNode, item.data.Icon.texture);
          gui.play_flipbook(imageNode, item.data.Icon.flipbook);
        }

        const shadowNode = item.nodes[hash(cat("card/shadow/col/", column))];
        const locktextNode = item.nodes[hash(cat("card/lock/text/col/", column))];
        gui.set_enabled(shadowNode, item.data.Locked);
        gui.set_text(locktextNode, cat("Unlock at Chapter ", item.data.Rank + 1));

        const progressbgNode = item.nodes[hash(cat("card/progress/bg/col/", column))];
        const progressbarNode = item.nodes[hash(cat("card/progress/bar/col/", column))];
        const leveltextNode = item.nodes[hash(cat("card/level/col/", column))];
        const progressbgSize = gui.get_size(progressbgNode);
        const progressbarSize = vmath.vector3(progressbgSize.x * Math.min(1, Math.max(0, item.data.Progress)), progressbgSize.y, progressbgSize.z);
        gui.set_enabled(progressbgNode, !t(item.data.Locked));
        gui.set_size(progressbarNode, progressbarSize);
        gui.set_text(leveltextNode, cat("LEVEL ", item.data.Level));

        const upgradeNode = item.nodes[hash(cat("card/lvlupbox/col/", column))];
        const upgradeglintNode = item.nodes[hash(cat("card/lvlupglint/col/", column))];
        gui.set_enabled(upgradeNode, item.data.Progress >= 1 && item.data.Status === "Unlocked");

        if (t(item.data.Cost)) {
          gui.set_text(item.nodes[hash(cat("card/lvlupbox/cost/col/", column))], cat(item.data.Cost, " XP"));
          gui.play_flipbook(item.nodes[hash(cat("card/lvlupbox/col/", column))], "tinyfancybutton_green");
        }

        if (gui.get_flipbook(upgradeglintNode) === hash("button_glint_static")) {
          gui.play_flipbook(upgradeglintNode, "button_glint");
        }

        if (t(item.data.Rarity)) {
          gui.play_flipbook(panelNode, color[item.data.Rarity]);
        }
      } else {
        gui.set_enabled(item.nodes[hash(cat("card/col/", column))], false);
      }
    }
  }

  function split_table_into_columns(table: any[], numColumns: number) {
    let col = 1, row = 1;
    const column_data: any[] = []; for (let i = 1; i <= numColumns; i++) column_data[i - 1] = [];
    for (let k = 1; k <= len(table); k++) {
      const item = table[k - 1];
      if (col === 1) {
        for (let i = 1; i <= numColumns; i++) column_data[i - 1][row - 1] = {};
      }
      column_data[col - 1][row - 1] = item;
      col = col + 1; if (col > numColumns) { row = row + 1; col = 1; }
    }
    return column_data;
  }

  function sort_cards(data: any[], field1: string, field2: string, direction: any) {
    T.sort(data, (a: any, b: any) => {
      assert(a[field1], cat("field ", field1, " does not exist in ", a.Name));
      assert(a[field2], cat("field ", field2, " does not exist in ", a.Name));
      assert(b[field1], cat("field ", field1, " does not exist in ", b.Name));
      assert(b[field2], cat("field ", field2, " does not exist in ", b.Name));
      if (t(direction)) {
        if (a[field1] < b[field1]) {
          return true;
        } else if (a[field1] > b[field1]) {
          return false;
        } else {
          return a[field2] < b[field2];
        }
      } else {
        if (a[field1] > b[field1]) {
          return true;
        } else if (a[field1] < b[field1]) {
          return false;
        } else {
          return a[field2] < b[field2];
        }
      }
    });
    return data;
  }

  function ingest_cards(data: any[], type: string) {
    const maxRank = len(defsave.loaded.Ranks.data);
    let cardNum = 0;
    const deck: any[] = [];
    for (let c = 1; c <= len(data); c++) {
      const d = data[c - 1];
      d.Rank = t(d.Rank) ? d.Rank : c;
      if (d.Rank <= maxRank) {
        cardNum = cardNum + 1;
        deck[cardNum - 1] = d;
        deck[cardNum - 1].Type = t(d.Type) ? d.Type : type;
        deck[cardNum - 1].id = t(d.id) ? d.id : c;
        deck[cardNum - 1].Rank = t(d.Rank) ? d.Rank : c;
        deck[cardNum - 1].Progress = t(d.Progress) ? d.Progress : 0;
        deck[cardNum - 1].RarityOrder = t(order[d.Rarity]) ? order[d.Rarity] : c;
        deck[cardNum - 1].Locked = t(d.Locked) ? d.Locked : d.Status === "Locked";
      }
    }
    return deck;
  }

  function get_cards(type: string) {
    let data = actions.load_all_savedata(type);
    data = ingest_cards(data, type);
    data = sort_cards(data, "Rank", "Name", true);
    return data;
  }

  function refresh_all() {
    let cards_list: any[] = [];

    cards_list = actions.tableConcat(cards_list, get_cards("Hero"));
    cards_list = actions.tableConcat(cards_list, get_cards("Henchmen"));
    cards_list = actions.tableConcat(cards_list, get_cards("Gear"));

    if (sortModes[sortIndex - 1].mode !== "Type") {
      cards_list = sort_cards(cards_list, sortModes[sortIndex - 1].mode, "Rank", sortModes[sortIndex - 1].order);
    }

    cards_list_cols = split_table_into_columns(cards_list, totalColumns);

    if (cards_list_cols !== undefined && cards_list_cols !== null) {
      for (let i = 1; i <= len(cards_list_cols); i++) {
        if (t(cards_list_cols[i - 1])) {
          update_cards(gooey.dynamic_list("cards", cat("cards/stencil/col/", i), cat("card/col/", i), cards_list_cols[i - 1]), i);
        }
      }
    }

    let unlockedCards = 0;
    for (let c = 1; c <= len(cards_list); c++) {
      const card = cards_list[c - 1];
      if (!t(card.Locked)) unlockedCards = unlockedCards + 1;
    }

    gui.set_text(gui.get_node("navbar/label/sortMode"), S.upper(sortModes[sortIndex - 1].display));
    gui.set_text(gui.get_node("navbar/count"), cat(unlockedCards, "/", len(cards_list)));
  }

  /* ******************************************
              INPUT
  ******************************************** */

  function update_sortbutton_sortmode(_button?: any) { gui.set_text(gui.get_node("navbar/label/sortMode"), S.upper(sortModes[sortIndex - 1].display)); }

  function update_cards_col(num: number, list: any) {
    for (let i = 1; i <= totalColumns; i++) {
      if (i !== num) {
        gooey.dynamic_list("cards", cat("cards/stencil/col/", i), cat("card/col/", i), cards_list_cols[i - 1]).scroll_to(0, list.scroll.y);
      }
    }
  }

  function update_cards_col1(list: any) { update_cards_col(1, list); }
  function update_cards_col2(list: any) { update_cards_col(2, list); }
  function update_cards_col3(list: any) { update_cards_col(3, list); }

  function on_sort_pressed_sortmode(_button?: any) {
    sortIndex = sortIndex + 1;
    if (sortIndex > len(sortModes)) sortIndex = 1;
    // `action_id` and `action` are unset globals here in the Lua (nil).
    gooey.dynamic_list("cards", "cards/stencil/col/1", "cards/col/1", cards_list_cols[0], G.action_id, G.action).scroll_to(0, 0);
    gooey.dynamic_list("cards", "cards/stencil/col/2", "cards/col/2", cards_list_cols[1], G.action_id, G.action).scroll_to(0, 0);
    gooey.dynamic_list("cards", "cards/stencil/col/3", "cards/col/3", cards_list_cols[2], G.action_id, G.action).scroll_to(0, 0);
  }

  function on_item_pressed(list: any, _cards: any, _column: number) {
    if (t(active)) {
      let item = list.items[list.selected_item - 1];
      for (let l = 1; l <= len(list.items); l++) {
        const level = list.items[l - 1];
        if (list.selected_item === level.index) {
          item = list.items[l - 1];
          break;
        }
      }

      item.data.Progress = t(item.data.Progress) ? item.data.Progress : 0;
      item.data.Cost = t(item.data.Cost) ? item.data.Cost : 0;

      if (item.data.Type === "Henchmen") {
        if (item.data.Cost > defsave.get("Currency", "Xp") && item.data.Progress >= 1) {
          msg.post(controller, "show_shop", { complete_purchase_callback: "cards" });
        } else if (item.data.Progress >= 1) {
          msg.post(controller, "show_upgradecard", { type: "Henchmen", id: item.data.id, message_id: "levelup_henchmen", message: { henchmen_id: item.data.id, complete_purchase_callback: "cards" } });
        } else {
          msg.post(controller, "popup_henchmen", { henchmen_id: item.data.id });
        }
      } else if (item.data.Type === "Gear") {
        if (item.data.Cost > defsave.get("Currency", "Xp") && item.data.Progress >= 1) {
          msg.post(controller, "show_shop", { complete_purchase_callback: "cards" });
        } else if (item.data.Progress >= 1) {
          msg.post(controller, "show_upgradecard", { type: "Gear", id: item.data.id, message_id: "levelup_gear", message: { gear_id: item.data.id, complete_purchase_callback: "cards" } });
        } else {
          let id = 0;
          const hl = defsave.loaded.Henchmen.data;
          for (let h = 1; h <= len(hl); h++) {
            const henchmen = hl[h - 1];
            if (henchmen.map_id === item.data.map_id &&
              henchmen.dungeon_id === item.data.dungeon_id &&
              henchmen.level_id === item.data.level_id) {
              id = henchmen.id;
              break;
            }
          }
          msg.post(controller, "popup_henchmen", { henchmen_id: id });
        }
      } else if (item.data.Type === "Hero") {
        if (item.data.Cost > defsave.get("Currency", "Xp") && item.data.Progress >= 1) {
          msg.post(controller, "show_shop", { complete_purchase_callback: "cards" });
        } else if (item.data.Progress >= 1) {
          msg.post(controller, "show_upgradecard", { type: "Hero", id: item.data.id, message_id: "levelup_hero", message: { hero_id: item.data.id, complete_purchase_callback: "cards" } });
        }
      }
    }
  }

  function on_item_pressed_col1(list: any) { on_item_pressed(list, cards_list_cols[0], 1); }
  function on_item_pressed_col2(list: any) { on_item_pressed(list, cards_list_cols[1], 2); }
  function on_item_pressed_col3(list: any) { on_item_pressed(list, cards_list_cols[2], 3); }

  return {
    init(_self) {
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      for (let i = 1; i <= totalColumns; i++) cards_list_cols[i - 1] = [];
      gui.set_render_order(5);
      gui.set_color(gui.get_node("navbar/title"), actions.get_color("darkbrown"));
    },

    update(_self, _dt) {
      layout_screen();
      if (t(enabled)) {
        refresh_all();
      }
    },

    on_input(_self, action_id, action) {
      if (action_id !== undefined && action_id !== null && t(enabled) && t(active)) {
        gooey.button("navbar/button/sortMode", action_id, action, on_sort_pressed_sortmode, update_sortbutton_sortmode);
        gooey.button("navbar/backbutton/bg", action_id, action, () => { msg.post(controller, "show_dungeonmine"); });

        gooey.dynamic_list("cards", "cards/stencil/col/1", "card/col/1", cards_list_cols[0], action_id, action, undefined, on_item_pressed_col1, update_cards_col1);
        gooey.dynamic_list("cards", "cards/stencil/col/2", "card/col/2", cards_list_cols[1], action_id, action, undefined, on_item_pressed_col2, update_cards_col2);
        gooey.dynamic_list("cards", "cards/stencil/col/3", "card/col/3", cards_list_cols[2], action_id, action, undefined, on_item_pressed_col3, update_cards_col3);
      }
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        if (t(enabled)) {
          refresh_all();
          message.focus = "cards";
        }
        msg.post("main:/background#background", "set_enabled", message);
        msg.post("main:/overlay#header", "set_enabled", message);
      } else if (message_id === hash("set_active")) {
        active = message.active;
      } else if (message_id === hash("refresh_all")) {
        refresh_all();
      } else if (message_id === hash("layout_changed")) {
        for (let c = 1; c <= totalColumns; c++) {
          gooey.dynamic_list("cards", cat("cards/stencil/col/", c), cat("card/col/", c), cards_list_cols[c - 1]).scroll_to(0, 0);
        }
      }
    },
  };
});
