import { defineScript, gui, msg, hash, vmath, window, print, socket } from '../../../engine';
import { t, cat, len, S, T, M, os, pairs, tostring } from '../../../lua';
import defsave from '../../defsave/defsave';
import actions from '../../actions';
import loc from '../../shared/locsheets';

defineScript('/main/heroselect/heroselect.gui_script', () => {
  const currentPage = "heroselect";
  const controller = "main:/menu#controller";
  const DUNGEON = "main:/menu#dungeonmine";

  /* The hero roster. Tapping a hero slot on a dungeon's map swaps its level
  list for this: a card for every field hero, under the map so the slots stay in
  sight. A card is tapped for the hero's details, or held and dragged onto a
  slot; a slot's hero is dragged back onto the cards to stand it down, or onto
  another slot to trade places. A hero working somewhere else asks first, since
  its old slot is left empty.

  The dungeon screen is at the engine's node limit with its level list, so the
  roster is drawn here, over it, and the dungeon screen sends where its slots
  are and who is in them (roster_update). Everything here is laid out in the
  same space as that screen's content: design units, origin at the bottom left
  of the screen. The shipped hero select list in this scene is never shown. */

  const DESIGN_W = 750;
  const DESIGN_H = 1334;
  const HEADER_DEPTH = 255.5; // underside of the header's top bar, from the top edge
  const EVENT_BAR_H = 52; // the header's event bar, on event maps only
  const FOOTER_TOP = 105; // top of the header's bottom bar, from the bottom edge
  const LIST_BOTTOM = 80; // the dungeon list runs a little under the bottom bar

  const HP_HEADER_H = 84; // title strip over the cards
  const HP_PAD = 16;
  const HP_CARD_W = 220; // widest a card grows before another column fits
  const HP_HOLD = 0.2; // seconds a still press takes to pick a card up
  const HP_SLOP = 14; // how far a press may wander and still be a tap

  const VIRTUE_COLOUR: Record<string, any> = {
    Wrath: vmath.vector4(0.86, 0.2, 0.24, 1),
    Greed: vmath.vector4(0.38, 0.76, 0.3, 1),
    Zeal: vmath.vector4(0.98, 0.78, 0.25, 1),
    Stasis: vmath.vector4(0.62, 0.56, 0.72, 1),
    Reason: vmath.vector4(0.32, 0.56, 0.96, 1),
    Empathy: vmath.vector4(0.98, 0.56, 0.76, 1),
  };
  // The panel art in each virtue's colour; Empathy has none, so grey tinted pink.
  const VIRTUE_PANEL: Record<string, string> = { Wrath: "red", Greed: "green", Zeal: "gold", Stasis: "purple", Reason: "blue", Empathy: "grey" };

  const WHITE = vmath.vector4(1, 1, 1, 1);
  const SOFT = vmath.vector4(0.85, 0.82, 0.78, 1);
  const HERE = vmath.vector4(1, 0.84, 0.3, 1);
  const FREE = vmath.vector4(0.5, 0.9, 0.35, 1);
  const AWAY = vmath.vector4(1, 0.62, 0.3, 1);

  const hp: any = { open: false, cards: [], scroll: 0, slots: [] };
  const view: any = { w: DESIGN_W, h: DESIGN_H, list_top: 600 };
  let map_id: any = 1, dungeon_id: any = 1;

  /* ******************************************
              SCREEN FIT
  ******************************************** */

  // The root goes on a plain uniform fit, as on every other screen; hp.base
  // then sits on the screen's bottom left corner.
  function fit_scale() {
    const [ww, wh] = window.get_size();
    return Math.min(ww / DESIGN_W, wh / DESIGN_H);
  }

  function place_base() {
    const root = gui.get_node("root");
    gui.set_adjust_mode(root, gui.ADJUST_FIT);
    gui.set_xanchor(root, gui.ANCHOR_NONE);
    gui.set_yanchor(root, gui.ANCHOR_NONE);
    gui.set_position(hp.base, vmath.vector3((DESIGN_W - view.w) / 2, (DESIGN_H - view.h) / 2, 0));
  }

  // A press, in hp.base space.
  function touch_at(action: any) {
    const s = fit_scale();
    return vmath.vector3(action.screen_x / s, action.screen_y / s, 0);
  }

  // Wall-clock seconds. The engine's dt is a fixed step per frame, so on a
  // slow frame it undercounts a held press.
  function now() {
    return t(socket) ? socket.gettime() : os.clock();
  }

  function in_rect(r: any, p: any) {
    return t(r) && Math.abs(p.x - r.x) <= r.w / 2 && Math.abs(p.y - r.y) <= r.h / 2;
  }

  /* ******************************************
              BUILDING
  ******************************************** */

  function new_node(parent: any, pos: any, size: any, texture?: any, flipbook?: any) {
    const node = gui.new_box_node(pos, size);
    gui.set_parent(node, parent);
    if (t(texture)) {
      gui.set_texture(node, texture);
      gui.play_flipbook(node, flipbook);
      gui.set_size_mode(node, gui.SIZE_MODE_MANUAL);
      gui.set_size(node, size);
    }
    return node;
  }

  function new_panel(parent: any, pos: any, size: any, flipbook: string) {
    const node = new_node(parent, pos, size, "main", flipbook);
    gui.set_slice9(node, vmath.vector4(32, 32, 32, 32));
    return node;
  }

  function new_text(parent: any, font: string, pos: any, text?: any, color?: any) {
    const node = gui.new_text_node(pos, t(text) ? text : "");
    gui.set_font(node, font);
    gui.set_parent(node, parent);
    gui.set_color(node, t(color) ? color : WHITE);
    gui.set_outline(node, vmath.vector4(0, 0, 0, 1));
    return node;
  }

  // Scales a line of text to a height, then down again if it runs too wide.
  function fit_text(node: any, max_w: number, max_h: number) {
    const m = gui.get_text_metrics_from_node(node);
    if (m.width <= 0 || m.height <= 0) return;
    const s = Math.min(max_h / m.height, max_w / m.width);
    gui.set_scale(node, vmath.vector3(s, s, 1));
  }

  // Wraps text to a width at the scale that gives one line `line_h`.
  function wrap_text(node: any, max_w: number, line_h: number) {
    const m = gui.get_text_metrics_from_node(node);
    if (m.height <= 0) return 0;
    const s = line_h / m.height;
    gui.set_scale(node, vmath.vector3(s, s, 1));
    gui.set_size(node, vmath.vector3(max_w / s, 0, 0));
    gui.set_line_break(node, true);
    return gui.get_text_metrics_from_node(node).height * s;
  }

  // A window onto a hero's portrait, cropped to cover it.
  function new_portrait(parent: any, pos: any, size: any, hero: any) {
    const win = new_node(parent, pos, size);
    gui.set_clipping_mode(win, gui.CLIPPING_MODE_STENCIL);
    gui.set_clipping_visible(win, false);
    const art = new_node(win, vmath.vector3(0, 0, 0), size, hero.Portrait.texture, hero.Portrait.flipbook);
    gui.set_inherit_alpha(art, true);
    actions.fill_card_window(art, win);
    return win;
  }

  function virtue(hero: any, n: number) {
    const v = t(hero.Virtues) ? hero.Virtues[n - 1] : hero.Virtues;
    return t(v) ? v.Virtue : v;
  }

  // A hero's panel, in the colour of its first virtue.
  function hero_panel(parent: any, pos: any, size: any, hero: any) {
    const first = virtue(hero, 1);
    const node = new_panel(parent, pos, size, cat("tinyfancypanel_", t(VIRTUE_PANEL[first]) ? VIRTUE_PANEL[first] : "darkgrey"));
    if (first === "Empathy") gui.set_color(node, VIRTUE_COLOUR.Empathy);
    return node;
  }

  function power_icon(hero: any) {
    const power = t(hero.Powers) ? hero.Powers[0] : hero.Powers;
    if (!t(power) || !t(power.Stages)) return undefined;
    return power.Stages[len(power.Stages) - 1].Icon;
  }

  function place_name(location: any) {
    const map = defsave.get("Map", location.map_id);
    const dungeon = t(map) ? map[location.dungeon_id - 1] : map;
    const name = t(dungeon) ? loc.get(dungeon.Name) : dungeon;
    return t(name) ? name : "";
  }

  // Where a hero is, seen from this dungeon: "here", "free" or "away".
  function where(hero: any) {
    const at = hero.location;
    if (at === undefined || at === null || at.map_id === undefined || at.map_id === null || at.dungeon_id === undefined || at.dungeon_id === null) return "free";
    if (at.map_id === map_id && at.dungeon_id === dungeon_id) return "here";
    return "away";
  }

  function tag(hero: any): [any, any] {
    const w = where(hero);
    if (w === "here") return [loc.get("HERO_TAG_HERE"), HERE];
    if (w === "free") return [loc.get("HERO_TAG_FREE"), FREE];
    return [S.gsub(loc.get("HERO_TAG_AT"), "%%1", place_name(hero.location))[0], AWAY];
  }

  // Every field hero the player has: free ones first, then the ones working
  // elsewhere, then the ones already here.
  const WHERE_ORDER: Record<string, number> = { free: 1, away: 2, here: 3 };
  function roster() {
    const rows: any[] = [];
    const heroes = defsave.loaded.Hero.data;
    for (let h = 1; h <= len(heroes); h++) {
      const hero = heroes[h - 1];
      if (!t(hero.Locked) && !t(actions.is_patron(hero)) && t(hero.Portrait)) {
        T.insert(rows, { id: h, hero: hero, where: where(hero) });
      }
    }
    T.sort(rows, (a: any, b: any) => {
      if (a.where !== b.where) return WHERE_ORDER[a.where] < WHERE_ORDER[b.where];
      const la = t(a.hero.Level) ? a.hero.Level : 0, lb = t(b.hero.Level) ? b.hero.Level : 0;
      if (la !== lb) return la > lb;
      return a.id < b.id;
    });
    return rows;
  }

  function signature(rows: any[]) {
    const parts: any[] = [map_id, dungeon_id];
    for (let r = 1; r <= len(rows); r++) {
      const row = rows[r - 1];
      const at = t(row.hero.location) ? row.hero.location : {};
      T.insert(parts, cat(row.id, ":", t(row.hero.Level) ? row.hero.Level : 0, ":", tostring(at.map_id), ":", tostring(at.dungeon_id), ":", tostring(at.slot_id)));
    }
    return T.concat(parts, "|");
  }

  function build_card(row: any, x: number, y: number, w: number, h: number) {
    const hero = row.hero;
    const card: any = { id: row.id, where: row.where };
    card.bg = hero_panel(hp.content, vmath.vector3(x, y - h / 2, 0), vmath.vector3(w, h, 0), hero);

    const inset = 12;
    const win = w - inset * 2;
    const top = h / 2 - inset;
    new_portrait(card.bg, vmath.vector3(0, top - win / 2, 0), vmath.vector3(win, win, 0), hero);
    // The second virtue, as a band under the portrait.
    const band = new_node(card.bg, vmath.vector3(0, top - win - 4, 0), vmath.vector3(win, 8, 0));
    const c2 = VIRTUE_COLOUR[virtue(hero, 2)], c1 = VIRTUE_COLOUR[virtue(hero, 1)];
    gui.set_color(band, t(c2) ? c2 : t(c1) ? c1 : SOFT);

    const icon = power_icon(hero);
    if (t(icon)) {
      const size = Math.floor(win * 0.3);
      new_node(card.bg, vmath.vector3(win / 2 - size / 2 + 4, top - win + size / 2 - 4, 0), vmath.vector3(size, size, 0), icon.texture, icon.flipbook);
    }

    const below = top - win - 12;
    // A dark backing so the level and tag read on every panel colour.
    const backing = new_node(card.bg, vmath.vector3(0, (below - 4 + (-h / 2 + inset)) / 2, 0), vmath.vector3(win, below - 4 + h / 2 - inset, 0));
    gui.set_color(backing, vmath.vector4(0, 0, 0, 0.45));
    fit_text(new_text(card.bg, "title", vmath.vector3(0, below - 20, 0), loc.get(hero.Name)), win, 36);
    fit_text(new_text(card.bg, "font", vmath.vector3(0, below - 52, 0), loc.get("HERO_LEVEL", t(hero.Level) ? hero.Level : 0), SOFT), win, 26);
    const [tag_text, tag_colour] = tag(hero);
    fit_text(new_text(card.bg, "font", vmath.vector3(0, below - 82, 0), tag_text, tag_colour), win, 24);

    // A hero already here is still on the list, to drag to another slot, but
    // dimmed so the free ones read first.
    if (row.where === "here") {
      gui.set_color(card.bg, vmath.add(vmath.mul(gui.get_color(card.bg), 0.6), vmath.vector4(0, 0, 0, 0.4)));
    }
    card.color = gui.get_color(card.bg);
    return card;
  }

  function scroll_to(y: number) {
    const max = Math.max(0, (t(hp.content_h) ? hp.content_h : 0) - hp.window_h);
    hp.scroll = Math.max(0, Math.min(max, y));
    if (t(hp.content)) gui.set_position(hp.content, vmath.vector3(0, hp.scroll, 0));
  }

  function layout_cards() {
    if (t(hp.content)) gui.delete_node(hp.content);
    hp.cards = [];
    const w = view.w;
    const rows = roster();
    hp.signature = signature(rows);

    hp.content = new_node(hp.window, vmath.vector3(0, hp.scroll, 0), vmath.vector3(0, 0, 0));
    const cols = Math.max(3, Math.floor((w - HP_PAD) / (HP_CARD_W + HP_PAD)));
    const card_w = (w - HP_PAD * (cols + 1)) / cols;
    const card_h = card_w + 120;
    for (let i = 1; i <= len(rows); i++) {
      const row = rows[i - 1];
      const col = M.mod(i - 1, cols), line = Math.floor((i - 1) / cols);
      const x = HP_PAD + card_w / 2 + col * (card_w + HP_PAD);
      const y = -(HP_PAD + line * (card_h + HP_PAD));
      T.insert(hp.cards, build_card(row, x, y, card_w, card_h));
    }
    hp.content_h = HP_PAD + Math.ceil(len(rows) / cols) * (card_h + HP_PAD);
    scroll_to(hp.scroll);
  }

  function build() {
    if (t(hp.panel)) gui.delete_node(hp.panel);
    place_base();
    const w = view.w, top = view.list_top;
    hp.panel = new_node(hp.base, vmath.vector3(0, 0, 0), vmath.vector3(0, 0, 0));

    // The level list's dark backdrop stays under the cards; this covers the
    // strip of it the title takes.
    const header = new_panel(hp.panel, vmath.vector3(w / 2, top - HP_HEADER_H / 2, 0), vmath.vector3(w, HP_HEADER_H, 0), "tinyfancypanel_darkbrown");
    const title = new_text(header, "title", vmath.vector3(-w / 2 + 24, 12, 0), loc.get("HEROES_PANEL_TITLE"));
    gui.set_pivot(title, gui.PIVOT_W);
    fit_text(title, w * 0.5, 38);
    const hint = new_text(header, "font", vmath.vector3(-w / 2 + 24, -20, 0), loc.get("HEROES_PANEL_HINT"), SOFT);
    gui.set_pivot(hint, gui.PIVOT_W);
    fit_text(hint, w - 260, 24);
    hp.done = new_panel(header, vmath.vector3(w / 2 - 24 - 90, 0, 0), vmath.vector3(180, 60, 0), "tinyfancypanel_green");
    fit_text(new_text(hp.done, "title", vmath.vector3(0, 2, 0), S.upper(loc.get("HEROES_DONE"))), 150, 30);

    hp.window_h = top - HP_HEADER_H - LIST_BOTTOM;
    hp.window = new_node(hp.panel, vmath.vector3(0, top - HP_HEADER_H, 0), vmath.vector3(w, hp.window_h, 0));
    gui.set_pivot(hp.window, gui.PIVOT_NW);
    gui.set_clipping_mode(hp.window, gui.CLIPPING_MODE_STENCIL);
    gui.set_clipping_visible(hp.window, false);
    hp.built = cat(view.w, "|", view.h, "|", view.list_top);
    layout_cards();
  }

  /* ******************************************
              HERO DETAILS
  ******************************************** */

  function hero_in_slot(slot: any) {
    const s = hp.slots[slot - 1];
    return t(s) && s.hero > 0 ? s.hero : undefined;
  }

  function first_empty_slot() {
    for (let s = 1; s <= len(hp.slots); s++) {
      const slot = hp.slots[s - 1];
      if (slot.hero === 0) return s;
    }
    return undefined;
  }

  function close_popup() {
    if (t(hp.popup)) gui.delete_node(hp.popup.root);
    hp.popup = undefined;
    msg.post("main:/overlay#header", "set_active", { active: true });
  }

  // Puts a hero in a slot, asking first when that leaves a slot elsewhere.
  function place(id: number, slot: number) {
    const hero = defsave.loaded.Hero.data[id - 1];
    const message = { hero_id: id, map_id: map_id, dungeon_id: dungeon_id, slot_id: slot };
    hp.landing = id;
    if (where(hero) === "away") {
      const name = loc.get(hero.Name);
      let text = S.gsub(loc.get("HERO_MOVE_TEXT"), "%%1", name)[0];
      text = S.gsub(text, "%%2", place_name(hero.location))[0];
      msg.post(controller, "popup_confirm", {
        title: S.gsub(loc.get("HERO_MOVE_TITLE"), "%%1", name)[0], text: text,
        msgpost: { message_id: "assign_hero", message: message },
      });
    } else {
      msg.post(controller, "assign_hero", message);
    }
  }

  function open_popup(id: number) {
    close_popup();
    const hero = defsave.loaded.Hero.data[id - 1];
    if (!t(hero)) return;
    const w = view.w, h = view.h;
    const popup: any = { id: id, where: where(hero) };
    popup.root = new_node(hp.base, vmath.vector3(0, 0, 0), vmath.vector3(0, 0, 0));
    const dim = new_node(popup.root, vmath.vector3(w / 2, h / 2, 0), vmath.vector3(w, h, 0));
    gui.set_color(dim, vmath.vector4(0, 0, 0, 0.7));

    const pw = Math.min(w - 48, 620);
    const content_top = h - HEADER_DEPTH - (t(view.event) ? EVENT_BAR_H : 0);
    const ph = Math.min(content_top - FOOTER_TOP - 24, 900);
    popup.panel = hero_panel(popup.root, vmath.vector3(w / 2, (content_top + FOOTER_TOP) / 2, 0), vmath.vector3(pw, ph, 0), hero);
    const inner = new_panel(popup.panel, vmath.vector3(0, 0, 0), vmath.vector3(pw - 24, ph - 24, 0), "tinyfancypanel_charcoal");
    const iw = pw - 56;
    let y = ph / 2 - 28;

    const art_h = Math.min(iw * 0.62, ph * 0.38);
    new_portrait(inner, vmath.vector3(0, y - art_h / 2, 0), vmath.vector3(iw, art_h, 0), hero);
    y = y - art_h;
    const band = new_node(inner, vmath.vector3(0, y - 5, 0), vmath.vector3(iw, 10, 0));
    const c2 = VIRTUE_COLOUR[virtue(hero, 2)], c1 = VIRTUE_COLOUR[virtue(hero, 1)];
    gui.set_color(band, t(c2) ? c2 : t(c1) ? c1 : SOFT);
    y = y - 10;

    fit_text(new_text(inner, "title", vmath.vector3(0, y - 34, 0), loc.get(hero.Name)), iw, 52);
    const level = cat(loc.get("HERO_LEVEL", t(hero.Level) ? hero.Level : 0), "  -  ", loc.get(cat("RARITY_", S.upper(t(hero.Rarity) ? hero.Rarity : ""))));
    fit_text(new_text(inner, "font", vmath.vector3(0, y - 78, 0), level, SOFT), iw, 28);
    y = y - 104;

    // Virtue chips, in the hero's colour order.
    const chips = t(hero.Virtues) ? hero.Virtues : [];
    const chip_w = Math.min(170, (iw - 16 * (len(chips) - 1)) / Math.max(1, len(chips)));
    const row_w = len(chips) * chip_w + (len(chips) - 1) * 16;
    for (let v = 1; v <= len(chips); v++) {
      const chip = chips[v - 1];
      const cx = -row_w / 2 + chip_w / 2 + (v - 1) * (chip_w + 16);
      const node = new_node(inner, vmath.vector3(cx, y - 22, 0), vmath.vector3(chip_w, 40, 0));
      gui.set_color(node, t(VIRTUE_COLOUR[chip.Virtue]) ? VIRTUE_COLOUR[chip.Virtue] : SOFT);
      fit_text(new_text(node, "font", vmath.vector3(0, 0, 0), loc.get(cat("VIRTUE_", S.upper(chip.Virtue)))), chip_w - 16, 24);
    }
    y = y - 64;

    // The power: what it is and what it does.
    const power = t(hero.Powers) ? hero.Powers[0] : hero.Powers;
    const icon = power_icon(hero);
    if (t(power) && t(icon)) {
      const size = 96;
      new_node(inner, vmath.vector3(-iw / 2 + size / 2, y - size / 2, 0), vmath.vector3(size, size, 0), icon.texture, icon.flipbook);
      const tx = -iw / 2 + size + 20;
      const name = new_text(inner, "title", vmath.vector3(tx, y - 18, 0), loc.get(power.Name), HERE);
      gui.set_pivot(name, gui.PIVOT_W);
      fit_text(name, iw - size - 20, 34);
      const desc = new_text(inner, "font", vmath.vector3(tx, y - 40, 0), loc.get(S.gsub(power.Name, "_NAME$", "_DESC")[0]));
      gui.set_pivot(desc, gui.PIVOT_NW);
      const desc_h = wrap_text(desc, iw - size - 20, 26);
      y = y - Math.max(size, 40 + desc_h) - 20;
    }

    const [where_text, where_colour] = tag(hero);
    fit_text(new_text(inner, "font", vmath.vector3(0, y - 18, 0), where_text, where_colour), iw, 28);

    // Along the bottom: the one thing to do with this hero, and close.
    const by = -(ph - 24) / 2 + 56;
    const bw = (iw - 20) / 2;
    let action_text: any, action_flipbook: any;
    if (popup.where === "here") {
      action_text = loc.get("HERO_REMOVE"); action_flipbook = "tinyfancypanel_red";
    } else if (t(first_empty_slot())) {
      action_text = loc.get("HERO_ASSIGN"); action_flipbook = "tinyfancypanel_green";
      popup.slot = first_empty_slot();
    } else {
      action_text = loc.get("HERO_SLOTS_FULL"); action_flipbook = "tinyfancypanel_darkgrey";
    }
    popup.action = new_panel(inner, vmath.vector3(-bw / 2 - 10, by, 0), vmath.vector3(bw, 76, 0), action_flipbook);
    fit_text(new_text(popup.action, "title", vmath.vector3(0, 2, 0), S.upper(action_text)), bw - 24, 32);
    popup.close = new_panel(inner, vmath.vector3(bw / 2 + 10, by, 0), vmath.vector3(bw, 76, 0), "tinyfancypanel_darkgrey");
    fit_text(new_text(popup.close, "title", vmath.vector3(0, 2, 0), S.upper(loc.get("HERO_CLOSE"))), bw - 24, 32);

    gui.set_scale(popup.panel, vmath.vector3(0.92, 0.92, 1));
    gui.animate(popup.panel, "scale", vmath.vector3(1, 1, 1), gui.EASING_OUTBACK, 0.25);
    hp.popup = popup;
    msg.post("main:/overlay#header", "set_active", { active: false });
  }

  function popup_input(action: any) {
    if (!action.released) return;
    const popup = hp.popup;
    if (gui.pick_node(popup.action, action.x, action.y)) {
      if (popup.where === "here") {
        msg.post(controller, "unassign_hero", { hero_id: popup.id });
        close_popup();
      } else if (t(popup.slot)) {
        const id = popup.id, slot = popup.slot;
        close_popup();
        place(id, slot);
      }
    } else if (gui.pick_node(popup.close, action.x, action.y) || !gui.pick_node(popup.panel, action.x, action.y)) {
      close_popup();
    }
  }

  /* ******************************************
              DRAGGING
  ******************************************** */

  function slot_at(p: any) {
    for (let s = 1; s <= len(hp.slots); s++) {
      const slot = hp.slots[s - 1];
      if (in_rect(slot.panel, p)) return s;
    }
    return undefined;
  }

  function clear_targets() {
    for (const [, node] of pairs<any>(t(hp.targets) ? hp.targets : [])) gui.delete_node(node);
    hp.targets = undefined;
  }

  // Lights every slot a hero can be dropped on.
  function show_targets() {
    clear_targets();
    hp.targets = [];
    for (let s = 1; s <= len(hp.slots); s++) {
      const slot = hp.slots[s - 1];
      const r = slot.panel;
      const glow = new_node(hp.base, vmath.vector3(r.x, r.y, 0), vmath.vector3(r.w + 20, r.h + 20, 0));
      gui.set_color(glow, vmath.vector4(1, 0.84, 0.3, 0.15));
      gui.animate(glow, "color.w", 0.4, gui.EASING_INOUTSINE, 0.6, 0, undefined, gui.PLAYBACK_LOOP_PINGPONG);
      hp.targets[s - 1] = glow;
    }
  }

  function fade_slot(slot: number, alpha: number) {
    msg.post(DUNGEON, "roster_fade", { slot: slot, alpha: alpha });
  }

  function lift(press: any) {
    press.lifted = true;
    const hero = defsave.loaded.Hero.data[press.id - 1];
    const size = 150;
    press.ghost = hero_panel(hp.base, press.now, vmath.vector3(size, size + 20, 0), hero);
    new_portrait(press.ghost, vmath.vector3(0, 0, 0), vmath.vector3(size - 20, size, 0), hero);
    gui.set_scale(press.ghost, vmath.vector3(0.8, 0.8, 1));
    gui.animate(press.ghost, "scale", vmath.vector3(1.1, 1.1, 1), gui.EASING_OUTBACK, 0.18);
    if (t(press.card)) {
      const c = press.card.color;
      gui.set_color(press.card.bg, vmath.vector4(c.x, c.y, c.z, 0.35));
    }
    if (t(press.slot)) fade_slot(press.slot, 0.35);
    show_targets();
  }

  function drop(press: any) {
    const slot = slot_at(press.now);
    let placed = false;
    if (t(press.slot)) {
      fade_slot(press.slot, 1);
      if (t(slot) && slot !== press.slot) {
        hp.landing = press.id;
        msg.post(controller, "assign_hero", { hero_id: press.id, map_id: map_id, dungeon_id: dungeon_id, slot_id: slot });
        placed = true;
      } else if (!t(slot) && gui.pick_node(hp.window, press.x, press.y)) {
        msg.post(controller, "unassign_hero", { hero_id: press.id });
        placed = true;
      }
    } else if (t(slot) && hero_in_slot(slot) !== press.id) {
      place(press.id, slot!);
      placed = true;
    }
    clear_targets();
    const del = function (_self: any, node: any) { gui.delete_node(node); };
    if (placed) {
      gui.animate(press.ghost, "scale", vmath.vector3(0.2, 0.2, 1), gui.EASING_INBACK, 0.15, 0, del);
    } else {
      // Nowhere to go: back where it came from.
      gui.animate(press.ghost, "position", press.home, gui.EASING_OUTQUAD, 0.2, 0, del);
      if (t(press.card)) gui.set_color(press.card.bg, press.card.color);
    }
  }

  function card_at(x: number, y: number) {
    if (!gui.pick_node(hp.window, x, y)) return undefined;
    for (let c = 1; c <= len(hp.cards); c++) {
      const card = hp.cards[c - 1];
      if (gui.pick_node(card.bg, x, y)) return card;
    }
    return undefined;
  }

  // The card's centre in hp.base space, to send a ghost back to.
  function card_home(card: any) {
    const p = gui.get_position(card.bg);
    return vmath.vector3(p.x, p.y + hp.scroll + view.list_top - HP_HEADER_H, 0);
  }

  function close() {
    if (!hp.open) return;
    hp.open = false;
    hp.press = undefined;
    close_popup();
    clear_targets();
    if (t(hp.panel)) gui.delete_node(hp.panel);
    hp.panel = undefined; hp.content = undefined; hp.cards = []; hp.signature = undefined; hp.built = undefined;
  }

  function roster_input(action_id: any, action: any): boolean {
    if (t(hp.popup)) {
      if (action_id === hash("touch")) popup_input(action);
      return true;
    }
    if (action_id === hash("scroll_up") || action_id === hash("scroll_down")) {
      if (gui.pick_node(hp.window, action.x, action.y)) {
        scroll_to(hp.scroll + (action_id === hash("scroll_up") ? -80 : 80));
        return true;
      }
      return false;
    }
    if (action_id !== hash("touch")) return false;

    const p = touch_at(action);
    const press = hp.press;
    if (action.pressed) {
      if (gui.pick_node(hp.done, action.x, action.y)) {
        hp.press = { done: true, at: p, now: p };
        return true;
      }
      const start: any = { at: p, now: p, x: action.x, y: action.y, t: now(), scroll: hp.scroll };
      const card = card_at(action.x, action.y);
      if (t(card)) {
        start.card = card; start.id = card.id;
        start.home = card_home(card);
      } else {
        const slot = slot_at(p);
        const id = t(slot) ? hero_in_slot(slot) : slot;
        if (t(id)) {
          if (in_rect(hp.slots[slot! - 1].unassign, p)) {
            msg.post(controller, "unassign_hero", { hero_id: id });
            return true;
          }
          start.slot = slot; start.id = id;
          const r = hp.slots[slot! - 1].panel;
          start.home = vmath.vector3(r.x, r.y, 0);
        } else if (!gui.pick_node(hp.window, action.x, action.y)) {
          return false;
        }
      }
      hp.press = start;
      return true;
    }
    if (!t(press)) return false;

    press.now = p; press.x = action.x; press.y = action.y;
    const moved = vmath.length(vmath.sub(p, press.at));
    if (action.released) {
      hp.press = undefined;
      if (t(press.done)) {
        if (gui.pick_node(hp.done, action.x, action.y)) {
          close();
          msg.post(DUNGEON, "roster_closed");
        }
      } else if (t(press.lifted)) {
        drop(press);
      } else if (t(press.id) && !t(press.scrolling) && moved <= HP_SLOP) {
        open_popup(press.id);
      }
      return true;
    }

    if (t(press.lifted)) {
      gui.set_position(press.ghost, p);
      const over = slot_at(p);
      for (const [s, glow] of pairs<any>(t(hp.targets) ? hp.targets : [])) {
        gui.set_scale(glow, vmath.mul(vmath.vector3(1, 1, 1), s === over ? 1.08 : 1));
      }
    } else if (t(press.scrolling)) {
      scroll_to(press.scroll + (p.y - press.at.y));
    } else if (moved > HP_SLOP && !t(press.done)) {
      const d = vmath.sub(p, press.at);
      // A slot's hero, or a card pushed sideways, comes up at once; a quick
      // push up or down the list scrolls it.
      if (t(press.slot) || (t(press.card) && Math.abs(d.x) > Math.abs(d.y))) {
        lift(press);
      } else {
        press.scrolling = true;
        scroll_to(press.scroll + d.y);
      }
    }
    return true;
  }

  /* ******************************************
              LIFECYCLE
  ******************************************** */

  return {
    init(_self) {
      print(S.upper(currentPage), "init");
      // The shipped list in this scene is never shown.
      for (const id of ["heroselect/root", "panel_bottom/bg"]) gui.set_enabled(gui.get_node(id), false);
      hp.base = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(0, 0, 0));
      gui.set_parent(hp.base, gui.get_node("root"));
      gui.set_render_order(5);
    },

    update(_self, _dt) {
      if (!hp.open) return;
      if (hp.built !== cat(view.w, "|", view.h, "|", view.list_top)) build();
      // Cards follow the heroes: a move, a level up or another dungeon. Held
      // back while the details are up, which would otherwise draw under them.
      if (!t(hp.popup) && !t(hp.press) && signature(roster()) !== hp.signature) {
        layout_cards();
      }
      if (t(hp.landing)) {
        const at = defsave.loaded.Hero.data[hp.landing - 1].location;
        if (t(at) && at.map_id === map_id && at.dungeon_id === dungeon_id && hero_in_slot(at.slot_id) === hp.landing) {
          msg.post(DUNGEON, "roster_punch", { slot: at.slot_id });
          hp.landing = undefined;
        }
      }
      // A card held still long enough comes up off the list.
      const press = hp.press;
      if (t(press) && t(press.card) && !t(press.lifted) && !t(press.scrolling)) {
        if (now() - press.t >= HP_HOLD) lift(press);
      }
    },

    on_input(_self, action_id, action) {
      if (hp.open && action_id !== undefined && action_id !== null) {
        return roster_input(action_id, action);
      }
      return undefined;
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("roster_update")) {
        map_id = message.map_id; dungeon_id = message.dungeon_id;
        view.w = message.w; view.h = message.h; view.list_top = message.list_top; view.event = message.event;
        hp.slots = t(message.slots) ? message.slots : [];
        // Another dungeon's slots: a drop or a punch meant for the last one is off.
        if (t(hp.landing) && !t(defsave.loaded.Hero.data[hp.landing - 1])) hp.landing = undefined;
      } else if (message_id === hash("roster_open")) {
        hp.open = true; hp.scroll = 0; hp.built = undefined;
      } else if (message_id === hash("roster_close")) {
        close();
      }
    },
  };
});
