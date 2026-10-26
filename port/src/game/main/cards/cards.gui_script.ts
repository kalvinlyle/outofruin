import { defineScript, gui, msg, hash, vmath, window, print } from '../../../engine';
import { t, cat, len, S, T, M, os, pairs } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import progress from '../../progress/progress';
import defsave from '../../defsave/defsave';
import actions from '../../actions';
import loc from '../../shared/locsheets';

void inspect; void random; void progress;

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

  /* ******************************************
              TABS
  ******************************************** */

  /* Main holds the main game's cards and every hero. Events holds every
  event's henchmen and gear in one list, a titled section per event with the
  most recent first; heroes never belong to an event. Built at runtime, since
  the scene has no tab nodes. */
  const TAB_H = 64;
  const SECTION_H = 72; // an event's title row in the card list
  const tab = { kind: "main" };
  let tabs: any = undefined;
  let layout_dirty = false;
  let card_h: any = undefined; // a card row's height, read off the template before the lists clone it

  /* Each event's title is a bar in its colour from the world map. The bar of
  the section in view stays pinned to the top of the list and the next one to
  the bottom, each pushing the other along as they meet, so the player always
  sees which event they are in and what comes next. Tapping a bar glides the
  list to the top of its section. */
  const SECTION_PANEL: Record<string, string> = {
    WEREMOON: "tinyfancypanel_red", SALTTIDE: "tinyfancypanel_green",
    CARNIVAL: "tinyfancypanel_orange", LONGFROST: "tinyfancypanel_blue",
  };
  const GLIDE_SECONDS = 0.35;
  const section_bars: Record<string, any> = {}; // by event key
  let sections: any[] = []; // the Events list's sections in order: { event, row }
  let touch_on_bar: any = undefined; // the section under the current touch
  let pressed_bar: any = undefined; // the section a touch went down on
  let glide: any = undefined;

  // Title rows are short; the lists keep a few spare items so a screen with
  // several of them still fills.
  const LIST_CONFIG = {
    spare_items: 2,
    row_height: function (row: any) { return t(row.header) ? SECTION_H : card_h; },
  };

  function new_button(parent: any, slice: any) {
    const node = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(100, 100, 0));
    gui.set_texture(node, "main");
    gui.play_flipbook(node, "tinyfancybutton_darkgrey");
    gui.set_slice9(node, slice);
    gui.set_parent(node, parent);
    const label = gui.new_text_node(vmath.vector3(0, 4, 0), "");
    gui.set_font(label, "title");
    gui.set_scale(label, vmath.vector3(0.55, 0.55, 1));
    gui.set_parent(label, node);
    // A red "!" in the corner while a card under the tab can be upgraded.
    const alert = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(40, 40, 0));
    gui.set_texture(alert, "main");
    gui.play_flipbook(alert, "circle_64");
    gui.set_size_mode(alert, gui.SIZE_MODE_MANUAL);
    gui.set_size(alert, vmath.vector3(40, 40, 0));
    gui.set_color(alert, actions.get_color("red"));
    gui.set_parent(alert, node);
    const mark = gui.new_text_node(vmath.vector3(0, 3, 0), "!");
    gui.set_font(mark, "title");
    gui.set_scale(mark, vmath.vector3(0.6, 0.6, 1));
    gui.set_parent(mark, alert);
    gui.set_enabled(alert, false);
    return { bg: node, label: label, alert: alert };
  }

  function build_tabs() {
    const parent = gui.get_parent(gui.get_node("navbar/bg"));
    const slice = gui.get_slice9(gui.get_node("navbar/button/sortMode"));
    tabs = { main: new_button(parent, slice), events: new_button(parent, slice) };
    // One bar per event, drawn over the cards so a pinned one stays readable.
    const stencil = gui.get_node("cards/stencil");
    for (let e = 1; e <= len(actions.EVENTS); e++) {
      const event = actions.EVENTS[e - 1];
      const bg = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(100, SECTION_H - 8, 0));
      gui.set_texture(bg, "main");
      gui.play_flipbook(bg, t(SECTION_PANEL[event.key]) ? SECTION_PANEL[event.key] : "tinyfancypanel_darkgrey");
      gui.set_slice9(bg, vmath.vector4(16, 22, 32, 42));
      gui.set_parent(bg, stencil);
      const label = gui.new_text_node(vmath.vector3(0, 4, 0), "");
      gui.set_font(label, "title");
      gui.set_scale(label, vmath.vector3(0.7, 0.7, 1));
      gui.set_parent(label, bg);
      gui.set_enabled(bg, false);
      section_bars[event.key] = { bg: bg, label: label };
    }
  }

  // Cards that can be upgraded, the way the header's cards button counts them:
  // the main game's (heroes included) and each event map's.
  function count_upgradable(): [number, Record<number, number>] {
    let main = 0;
    const events: Record<number, number> = {};
    for (const type of ["Hero", "Henchmen", "Gear"]) {
      const all = actions.load_all_savedata(type);
      for (let c = 1; c <= len(all); c++) {
        const card = all[c - 1];
        if ((t(card.Progress) ? card.Progress : 0) >= 1 && card.Status === "Unlocked") {
          const map_id = t(card.map_id) ? card.map_id : 1;
          if (map_id === 1) {
            main = main + 1;
          } else {
            events[map_id] = (t(events[map_id]) ? events[map_id] : 0) + 1;
          }
        }
      }
    }
    return [main, events];
  }

  function show_tab_alerts() {
    const [main, events] = count_upgradable();
    gui.set_enabled(tabs.main.alert, main > 0);
    gui.set_enabled(tabs.events.alert, Object.keys(events).length > 0);
  }

  // Set on every refresh: the strings arrive after the scene is built.
  function label_tabs() {
    if (!t(tabs)) return;
    show_tab_alerts();
    gui.set_text(tabs.main.label, S.upper(loc.get("CARDS_TAB_MAIN")));
    gui.set_text(tabs.events.label, S.upper(loc.get("CARDS_TAB_EVENTS")));
    for (let e = 1; e <= len(actions.EVENTS); e++) {
      const event = actions.EVENTS[e - 1];
      gui.set_text(section_bars[event.key].label, S.upper(loc.get(cat("EVENT_", event.key, "_NAME"))));
    }
  }

  function set_tab_button(button: any, x: number, y: number, w: number, h: number, selected: boolean) {
    gui.set_position(button.bg, vmath.vector3(x, y, 0));
    gui.set_size(button.bg, vmath.vector3(w, h, 0));
    gui.set_size(button.label, vmath.vector3((w - 20) / 0.55, h / 0.55, 0));
    gui.play_flipbook(button.bg, selected ? "tinyfancybutton_brown" : "tinyfancybutton_darkgrey");
    gui.set_position(button.alert, vmath.vector3(w / 2 - 14, h / 2 - 8, 0));
  }

  // Lays the tabs out from y down and returns where the card grid starts.
  function place_tabs(w: number, y: number) {
    if (!t(tabs)) build_tabs();
    const gap = 10;
    const tab_w = (w - 3 * gap) / 2;
    const row_y = y - TAB_H / 2 - 4;
    set_tab_button(tabs.main, DESIGN_W / 2 - (tab_w + gap) / 2, row_y, tab_w, TAB_H - 8, tab.kind === "main");
    set_tab_button(tabs.events, DESIGN_W / 2 + (tab_w + gap) / 2, row_y, tab_w, TAB_H - 8, tab.kind === "events");
    return y - TAB_H;
  }

  function layout_screen() {
    let r = screen_changed();
    if (!r && layout_dirty) r = [screen.w, screen.h];
    if (!r) return;
    layout_dirty = false;
    const [w] = r;
    // Tab bar under the header, card grid filling what is left above the footer.
    place("navbar/bg", undefined, content_top() - 41.5);
    resize("navbar/bg", w, undefined);
    const top = place_tabs(w, content_top() - 83.5);
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
      if (typeof item.data === "object" && item.data !== null && t(item.data.header)) {
        gui.set_enabled(item.nodes[hash(cat("card/col/", column))], false);
      } else if (actions.tablelength(item.data) > 0) {
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
        actions.fill_card_window(imageNode, item.nodes[hash(cat("card/image/stencil/col/", column))]);

        const shadowNode = item.nodes[hash(cat("card/shadow/col/", column))];
        const locktextNode = item.nodes[hash(cat("card/lock/text/col/", column))];
        gui.set_enabled(shadowNode, item.data.Locked);
        gui.set_text(locktextNode, t(item.data.lockText) ? item.data.lockText : cat("Unlock at Chapter ", item.data.Rank + 1));

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
          gui.set_text(item.nodes[hash(cat("card/lvlupbox/cost/col/", column))], cat(item.data.Cost, " ", loc.get(actions.levelup_funds(item.data.map_id).label)));
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

  // Deals cards into the columns a row at a time, blanks filling the last row.
  function add_rows(column_data: any[], cards: any[]) {
    for (let k = 1; k <= len(cards); k += len(column_data)) {
      for (let c = 1; c <= len(column_data); c++) {
        const v = cards[k + c - 1 - 1];
        T.insert(column_data[c - 1], t(v) ? v : {});
      }
    }
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

  // The event a hero is earned in, if any.
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

  function hero_event(id: any) {
    for (let e = 1; e <= len(actions.EVENTS); e++) {
      const event = actions.EVENTS[e - 1];
      if (event.hero_id === id) return event;
    }
    return undefined;
  }

  function ingest_cards(data: any[], type: string, include?: (card: any, c: number) => any) {
    const maxRank = len(defsave.loaded.Ranks.data);
    include = t(include) ? include : function (card: any, c: number) {
      return card.Rank <= maxRank || (type === "Hero" && hero_event(c) !== undefined);
    };
    let cardNum = 0;
    const deck: any[] = [];
    for (let c = 1; c <= len(data); c++) {
      const d = data[c - 1];
      d.Rank = t(d.Rank) ? d.Rank : c;
      if (t(include!(d, c))) {
        cardNum = cardNum + 1;
        deck[cardNum - 1] = d;
        deck[cardNum - 1].Type = t(d.Type) ? d.Type : type;
        deck[cardNum - 1].id = t(d.id) ? d.id : c;
        deck[cardNum - 1].Rank = t(d.Rank) ? d.Rank : c;
        deck[cardNum - 1].Progress = t(d.Progress) ? d.Progress : 0;
        deck[cardNum - 1].RarityOrder = t(order[d.Rarity]) ? order[d.Rarity] : c;
        deck[cardNum - 1].Locked = t(d.Locked) ? d.Locked : d.Status === "Locked";
        const event = type === "Hero" ? hero_event(c) : false;
        if (t(event)) {
          deck[cardNum - 1].lockText = loc.get("CARDS_EVENT_LOCK", [loc.get(cat("EVENT_", (event as any).key, "_NAME"))]);
        } else if ((t(d.map_id) ? d.map_id : 1) !== 1) {
          deck[cardNum - 1].lockText = loc.get("CARDS_EVENT_CHEST");
        }
      }
    }
    return deck;
  }

  function get_cards(type: string, include?: (card: any, c: number) => any) {
    let data = actions.load_all_savedata(type);
    data = ingest_cards(data, type, include);
    data = sort_cards(data, "Rank", "Name", true);
    return data;
  }

  // Every event, the one running or last run first, back through the schedule.
  function events_by_recency() {
    const run = actions.event_schedule(os.time());
    const count = len(actions.EVENTS);
    const last_run = new Map<any, number>();
    for (let e = 1; e <= len(actions.EVENTS); e++) {
      const event = actions.EVENTS[e - 1];
      last_run.set(event, run - M.mod(run - (e - 1), count));
    }
    const events: any[] = [];
    for (let e = 1; e <= len(actions.EVENTS); e++) events[e - 1] = actions.EVENTS[e - 1];
    T.sort(events, (a: any, b: any) => last_run.get(a)! > last_run.get(b)!);
    return events;
  }

  function sort_by_mode(cards: any[]) {
    if (sortModes[sortIndex - 1].mode === "Type") return cards;
    return sort_cards(cards, sortModes[sortIndex - 1].mode, "Rank", sortModes[sortIndex - 1].order);
  }

  // One event's cards: its henchmen and gear by location.
  function get_event_cards(event: any) {
    const list: any[] = [];
    for (const type of ["Henchmen", "Gear"]) {
      // An enemy event's Henchmen rows are its enemies, which are not cards.
      const cards = get_cards(type, function (card: any) { return card.map_id === event.map_id && !t(card.Enemy); });
      T.sort(cards, (a: any, b: any) => {
        if (a.dungeon_id !== b.dungeon_id) return a.dungeon_id < b.dungeon_id;
        if (a.level_id !== b.level_id) return a.level_id < b.level_id;
        return a.id < b.id;
      });
      // Not tableConcat: it drops a first list of one.
      for (let i = 1; i <= len(cards); i++) T.insert(list, cards[i - 1]);
    }
    return list;
  }

  // How far above a node's position its top edge is, for a node of height h.
  function top_above_position(node: any, h: number) {
    const pivot = gui.get_pivot(node);
    if (pivot === gui.PIVOT_N || pivot === gui.PIVOT_NE || pivot === gui.PIVOT_NW) return 0;
    if (pivot === gui.PIVOT_S || pivot === gui.PIVOT_SE || pivot === gui.PIVOT_SW) return h;
    return h / 2;
  }

  // Pins the section in view to the top, the next to the bottom, and lets the
  // rest ride with their rows; bars meeting push each other along.
  function place_section_bars(list: any) {
    for (const [, bar] of pairs<any>(section_bars)) { bar.y = undefined; gui.set_enabled(bar.bg, false); }
    if (tab.kind !== "events" || !t(list.row_tops) || !t(list.items[0])) return;
    const column = gui.get_node("cards/stencil/col/1");
    const column_y = gui.get_position(column).y;
    const column_h = gui.get_size(column).y;
    const view_top = column_y + top_above_position(column, column_h);
    const view_bottom = view_top - column_h;
    const list_top = column_y + list.first_item_pos.y + top_above_position(list.items[0].root, card_h);
    const scroll = list.scroll_pos.y, tops = list.row_tops, h = SECTION_H;
    const natural = (s: number) => list_top + scroll - tops[sections[s - 1].row - 1] - h / 2;

    let current = 1;
    for (let s = 1; s <= len(sections); s++) {
      const section = sections[s - 1];
      if (tops[section.row - 1] <= scroll + 0.5) current = s;
    }
    const y: Record<number, number> = { [current]: view_top - h / 2 };
    if (t(sections[current + 1 - 1])) y[current] = Math.max(y[current], natural(current + 1) + h);
    for (let s = current + 1; s <= len(sections); s++) {
      y[s] = Math.max(natural(s), view_bottom + h / 2);
      if (s > current + 1) y[s] = Math.min(y[s], y[s - 1] - h);
    }

    const width = gui.get_size(gui.get_node("cards/stencil")).x - 20;
    for (let s = current; s <= len(sections); s++) {
      if (y[s] - h / 2 < view_top && y[s] + h / 2 > view_bottom) {
        const bar = section_bars[sections[s - 1].event.key];
        bar.y = y[s]; bar.section = s;
        gui.set_position(bar.bg, vmath.vector3(0, y[s], 0));
        gui.set_size(bar.bg, vmath.vector3(width, h - 8, 0));
        gui.set_size(bar.label, vmath.vector3((width - 40) / 0.7, (h - 8) / 0.7, 0));
        gui.set_enabled(bar.bg, true);
      }
    }
  }

  function refresh_all() {
    let cards_list: any[] = [];
    label_tabs();

    cards_list_cols = [];
    for (let i = 1; i <= totalColumns; i++) cards_list_cols[i - 1] = [];
    sections = [];
    if (tab.kind === "events") {
      const evs = events_by_recency();
      for (let ei = 1; ei <= len(evs); ei++) {
        const event = evs[ei - 1];
        const cards = sort_by_mode(get_event_cards(event));
        for (let i = 1; i <= totalColumns; i++) T.insert(cards_list_cols[i - 1], { header: event });
        T.insert(sections, { event: event, row: len(cards_list_cols[0]) });
        add_rows(cards_list_cols, cards);
        for (let ci = 1; ci <= len(cards); ci++) T.insert(cards_list, cards[ci - 1]);
      }
    } else {
      cards_list = actions.tableConcat(cards_list, get_cards("Hero"));
      cards_list = actions.tableConcat(cards_list, get_cards("Henchmen"));
      cards_list = actions.tableConcat(cards_list, get_cards("Gear"));
      cards_list = sort_by_mode(cards_list);
      add_rows(cards_list_cols, cards_list);
    }

    for (let i = 1; i <= totalColumns; i++) {
      const list = gooey.dynamic_list("cards", cat("cards/stencil/col/", i), cat("card/col/", i), cards_list_cols[i - 1], undefined, undefined, LIST_CONFIG);
      update_cards(list, i);
      if (i === 1) place_section_bars(list);
    }

    let unlockedCards = 0;
    for (let c = 1; c <= len(cards_list); c++) {
      const card = cards_list[c - 1];
      if (!t(card.Locked)) unlockedCards = unlockedCards + 1;
    }

    gui.set_text(gui.get_node("navbar/label/sortMode"), S.upper(sortModes[sortIndex - 1].display));
    gui.set_text(gui.get_node("navbar/count"), cat(unlockedCards, "/", len(cards_list)));
  }

  function cards_list(c: number) {
    return gooey.dynamic_list("cards", cat("cards/stencil/col/", c), cat("card/col/", c), cards_list_cols[c - 1], undefined, undefined, LIST_CONFIG);
  }

  // Starts the list gliding to the top of a section.
  function glide_to_section(s: number) {
    const list = cards_list(1);
    if (!t(list.row_tops) || list.max_y <= 0) return;
    const to = Math.min(list.row_tops[sections[s - 1].row - 1], list.max_y);
    glide = { from: list.scroll_pos.y, to: to, t: 0 };
  }

  function update_glide(dt: number) {
    if (!t(glide)) return;
    glide.t = Math.min(1, glide.t + dt / GLIDE_SECONDS);
    const ease = 1 - Math.pow(1 - glide.t, 3);
    const list = cards_list(1);
    const at = (glide.from + (glide.to - glide.from) * ease) / list.max_y;
    for (let c = 1; c <= totalColumns; c++) cards_list(c).scroll_to(0, at);
    if (glide.t >= 1) glide = undefined;
  }

  /* ******************************************
              INPUT
  ******************************************** */

  function update_sortbutton_sortmode(_button?: any) { gui.set_text(gui.get_node("navbar/label/sortMode"), S.upper(sortModes[sortIndex - 1].display)); }

  function update_cards_col(num: number, list: any) {
    for (let i = 1; i <= totalColumns; i++) {
      if (i !== num) {
        gooey.dynamic_list("cards", cat("cards/stencil/col/", i), cat("card/col/", i), cards_list_cols[i - 1], undefined, undefined, LIST_CONFIG).scroll_to(0, list.scroll.y);
      }
    }
  }

  function update_cards_col1(list: any) { update_cards_col(1, list); }
  function update_cards_col2(list: any) { update_cards_col(2, list); }
  function update_cards_col3(list: any) { update_cards_col(3, list); }

  function on_sort_pressed_sortmode(_button?: any) {
    sortIndex = sortIndex + 1;
    if (sortIndex > len(sortModes)) sortIndex = 1;
    gooey.dynamic_list("cards", "cards/stencil/col/1", "card/col/1", cards_list_cols[0], undefined, undefined, LIST_CONFIG).scroll_to(0, 0);
    gooey.dynamic_list("cards", "cards/stencil/col/2", "card/col/2", cards_list_cols[1], undefined, undefined, LIST_CONFIG).scroll_to(0, 0);
    gooey.dynamic_list("cards", "cards/stencil/col/3", "card/col/3", cards_list_cols[2], undefined, undefined, LIST_CONFIG).scroll_to(0, 0);
  }

  function on_item_pressed(list: any, _cards: any, _column: number) {
    if (t(active) && !t(touch_on_bar)) {
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
        if (item.data.Progress >= 1 && cannot_afford(item.data)) {
          //
        } else if (item.data.Progress >= 1) {
          msg.post(controller, "show_upgradecard", { type: "Henchmen", id: item.data.id, message_id: "levelup_henchmen", message: { henchmen_id: item.data.id, complete_purchase_callback: "cards" } });
        } else {
          msg.post(controller, "popup_henchmen", { henchmen_id: item.data.id });
        }
      } else if (item.data.Type === "Gear") {
        if (item.data.Progress >= 1 && cannot_afford(item.data)) {
          //
        } else if (item.data.Progress >= 1) {
          msg.post(controller, "show_upgradecard", { type: "Gear", id: item.data.id, message_id: "levelup_gear", message: { gear_id: item.data.id, complete_purchase_callback: "cards" } });
        } else if (t(actions.enemy_map(item.data.map_id))) {
          // Worn by a location's whole crew, so there is no henchman to show.
          msg.post(controller, "popup_message", { title: item.data.Name, text: item.data.Description });
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
        const event = hero_event(item.data.id);
        if (t(item.data.Locked) && t(event)) {
          // Says which event earns it, e.g. HERO_HUMANCLERIC_UNLOCK.
          const unlock = S.gsub(item.data.Name, "_NAME$", "_UNLOCK")[0];
          msg.post(controller, "popup_message", { title: item.data.Name, text: unlock });
        } else if (item.data.Cost > defsave.get("Currency", "Xp") && item.data.Progress >= 1) {
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

  function scroll_lists_to_top() {
    for (let c = 1; c <= totalColumns; c++) {
      gooey.dynamic_list("cards", cat("cards/stencil/col/", c), cat("card/col/", c), cards_list_cols[c - 1], undefined, undefined, LIST_CONFIG).scroll_to(0, 0);
    }
  }

  function select_tab(kind: string) {
    if (tab.kind === kind) return;
    tab.kind = kind;
    layout_dirty = true;
    layout_screen();
    scroll_lists_to_top();
    refresh_all();
  }

  // The section whose bar is under a point, if one is showing there.
  function bar_at(x: number, y: number) {
    if (tab.kind !== "events") return undefined;
    for (const [, bar] of pairs<any>(section_bars)) {
      if (t(bar.y) && gui.pick_node(bar.bg, x, y)) return bar.section;
    }
    return undefined;
  }

  // A tap on a section's bar glides there; a drag that starts on one still scrolls.
  function on_bar_input(action_id: any, action: any) {
    if (action_id !== hash("touch")) return;
    touch_on_bar = bar_at(action.x, action.y);
    if (action.pressed) {
      glide = undefined;
      pressed_bar = touch_on_bar;
    } else if (action.released) {
      if (t(pressed_bar) && pressed_bar === touch_on_bar && !t(cards_list(1).have_scrolled)) {
        glide_to_section(pressed_bar);
      }
      pressed_bar = undefined;
    }
  }

  function on_tab_input(action_id: any, action: any) {
    if (action_id !== hash("touch") || !action.released || !t(tabs)) return;
    if (gui.pick_node(tabs.main.bg, action.x, action.y)) select_tab("main");
    else if (gui.pick_node(tabs.events.bg, action.x, action.y)) select_tab("events");
  }

  return {
    init(_self) {
      card_h = gui.get_size(gui.get_node("card/col/1")).y;
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      for (let i = 1; i <= totalColumns; i++) cards_list_cols[i - 1] = [];
      gui.set_render_order(5);
      gui.set_color(gui.get_node("navbar/title"), actions.get_color("darkbrown"));
    },

    update(_self, dt) {
      layout_screen();
      if (t(enabled)) {
        update_glide(dt);
        refresh_all();
      }
    },

    on_input(_self, action_id, action) {
      if (action_id !== undefined && action_id !== null && t(enabled) && t(active)) {
        on_tab_input(action_id, action);
        on_bar_input(action_id, action);
        gooey.button("navbar/button/sortMode", action_id, action, on_sort_pressed_sortmode, update_sortbutton_sortmode);
        gooey.button("navbar/backbutton/bg", action_id, action, () => { msg.post(controller, "show_dungeonmine"); });

        gooey.dynamic_list("cards", "cards/stencil/col/1", "card/col/1", cards_list_cols[0], action_id, action, LIST_CONFIG, on_item_pressed_col1, update_cards_col1);
        gooey.dynamic_list("cards", "cards/stencil/col/2", "card/col/2", cards_list_cols[1], action_id, action, LIST_CONFIG, on_item_pressed_col2, update_cards_col2);
        gooey.dynamic_list("cards", "cards/stencil/col/3", "card/col/3", cards_list_cols[2], action_id, action, LIST_CONFIG, on_item_pressed_col3, update_cards_col3);
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
          gooey.dynamic_list("cards", cat("cards/stencil/col/", c), cat("card/col/", c), cards_list_cols[c - 1], undefined, undefined, LIST_CONFIG).scroll_to(0, 0);
        }
      }
    },
  };
});
