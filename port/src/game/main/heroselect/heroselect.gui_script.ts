import { defineScript, gui, msg, hash, vmath, window, print, socket } from '../../../engine';
import { t, cat, len, S, T, os, tostring } from '../../../lua';
import defsave from '../../defsave/defsave';
import actions from '../../actions';
import loc from '../../shared/locsheets';
import buttonFx from '../../shared/button_fx';
import audio from '../../../systems/audio';

defineScript('/main/heroselect/heroselect.gui_script', () => {
  const currentPage = "heroselect";
  const controller = "main:/menu#controller";
  const DUNGEON = "main:/menu#dungeonmine";

  /* Modal hero popups over the live dungeon screen:
  - Tap a filled slot -> Hero Detail popup (power, virtues, Swap / Remove).
  - Tap an empty slot (or Swap) -> Hero Picker popup listing only heroes not
    already in this dungeon (Available first, then Working Elsewhere).
  - Moving a hero from another dungeon shows an inline confirmation modal.
  Every view is a centered modal panel over a dimmed backdrop; tap outside to
  close, matching the rest of the game's popups. */

  const DESIGN_W = 750;
  const DESIGN_H = 1334;
  const SLICE = vmath.vector4(16, 22, 32, 42);
  const SCROLL_SLOP = 14;
  const POPUP_GUARD = 0.22;

  const ROW_H = 148;
  const ROW_H_AWAY = 172;
  const ROW_GAP = 12;
  const SECTION_H = 38;
  const HEADER_H = 78;
  const BTN_H = 76;

  const VIRTUE_COLOUR: Record<string, any> = {
    Wrath: vmath.vector4(0.84, 0.22, 0.24, 1),
    Greed: vmath.vector4(0.32, 0.72, 0.28, 1),
    Zeal: vmath.vector4(0.92, 0.72, 0.2, 1),
    Stasis: vmath.vector4(0.56, 0.48, 0.68, 1),
    Reason: vmath.vector4(0.28, 0.52, 0.9, 1),
    Empathy: vmath.vector4(0.9, 0.48, 0.68, 1),
  };

  const RARITY_PANEL: Record<string, string> = {
    Common: "tinyfancypanel_darkgrey",
    Wild: "tinyfancypanel_brown",
    Rare: "tinyfancypanel_green",
    Epic: "tinyfancypanel_blue",
    Legendary: "tinyfancypanel_purple",
    Exotic: "tinyfancypanel_orange",
  };

  const WHITE = vmath.vector4(1, 1, 1, 1);
  const SOFT = vmath.vector4(0.88, 0.85, 0.8, 1);
  const MUTED = vmath.vector4(0.7, 0.67, 0.62, 1);
  const HERE = vmath.vector4(1, 0.84, 0.3, 1);
  const FREE = vmath.vector4(0.48, 0.9, 0.36, 1);
  const AWAY = vmath.vector4(1, 0.66, 0.28, 1);
  const DIM = vmath.vector4(0, 0, 0, 0.72);
  const OUTLINE = vmath.vector4(0, 0, 0, 1);

  const hp: any = {
    open: false,
    mode: "picker", // "detail" | "picker" | "confirm"
    slot_id: 1,
    swap_hero_id: undefined,
    detail_hero_id: undefined,
    detail_from_picker: false,
    confirm: undefined,
    scroll: 0,
    content_h: 0,
    window_h: 0,
    rows: [],
    slots: [],
    max_slots: 3,
    landing: undefined,
  };

  const view: any = { w: DESIGN_W, h: DESIGN_H };
  let map_id: any = 1, dungeon_id: any = 1;

  /* ******************************************
              SCREEN FIT
  ******************************************** */

  function fit_scale() {
    const [ww, wh] = window.get_size();
    return Math.min(ww / DESIGN_W, wh / DESIGN_H);
  }

  function refresh_view_size() {
    const [ww, wh] = window.get_size();
    const s = Math.min(ww / DESIGN_W, wh / DESIGN_H);
    if (s > 0) {
      view.w = ww / s;
      view.h = wh / s;
    }
  }

  function place_base() {
    refresh_view_size();
    const root = gui.get_node("root");
    gui.set_adjust_mode(root, gui.ADJUST_FIT);
    gui.set_xanchor(root, gui.ANCHOR_NONE);
    gui.set_yanchor(root, gui.ANCHOR_NONE);
    gui.set_position(hp.base, vmath.vector3((DESIGN_W - view.w) / 2, (DESIGN_H - view.h) / 2, 0));
  }

  function touch_at(action: any) {
    const s = fit_scale();
    return vmath.vector3(action.screen_x / s, action.screen_y / s, 0);
  }

  function now() {
    return t(socket) ? socket.gettime() : os.clock();
  }

  /* ******************************************
              NODE HELPERS
  ******************************************** */

  function new_box(parent: any, pos: any, size: any, texture?: any, flipbook?: any) {
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
    const node = new_box(parent, pos, size, "main", flipbook);
    gui.set_slice9(node, SLICE);
    return node;
  }

  function new_button(parent: any, pos: any, size: any, flipbook: string, label: string, max_text_h?: number) {
    const node = new_panel(parent, pos, size, flipbook);
    const txt = new_text(node, "title", vmath.vector3(0, 6, 0), S.upper(label), WHITE);
    fit_text(txt, size.x - 24, t(max_text_h) ? max_text_h! : 30);
    return node;
  }

  function new_text(parent: any, font: string, pos: any, text?: any, color?: any) {
    const node = gui.new_text_node(pos, t(text) ? text : "");
    gui.set_font(node, font);
    gui.set_parent(node, parent);
    gui.set_color(node, t(color) ? color : WHITE);
    gui.set_outline(node, OUTLINE);
    return node;
  }

  function fit_text(node: any, max_w: number, max_h: number) {
    const m = gui.get_text_metrics_from_node(node);
    if (m.width <= 0 || m.height <= 0) return;
    const s = Math.min(max_h / m.height, max_w / m.width);
    gui.set_scale(node, vmath.vector3(s, s, 1));
  }

  function wrap_text(node: any, max_w: number, line_h: number) {
    const m = gui.get_text_metrics_from_node(node);
    if (m.height <= 0) return 0;
    const s = line_h / m.height;
    gui.set_scale(node, vmath.vector3(s, s, 1));
    gui.set_size(node, vmath.vector3(max_w / s, 0, 0));
    gui.set_line_break(node, true);
    return gui.get_text_metrics_from_node(node).height * s;
  }

  function new_portrait(parent: any, pos: any, frame_size: number, hero: any) {
    const rarity = t(hero.Rarity) ? hero.Rarity : "Common";
    const frame_flip = t(RARITY_PANEL[rarity]) ? RARITY_PANEL[rarity] : "tinyfancypanel_darkgrey";
    const frame = new_panel(parent, pos, vmath.vector3(frame_size, frame_size, 0), frame_flip);
    const inner = frame_size - 18;
    const win = new_box(frame, vmath.vector3(0, 2, 0), vmath.vector3(inner, inner, 0));
    gui.set_clipping_mode(win, gui.CLIPPING_MODE_STENCIL);
    gui.set_clipping_visible(win, false);
    const art = new_box(win, vmath.vector3(0, 0, 0), vmath.vector3(inner, inner, 0), hero.Portrait.texture, hero.Portrait.flipbook);
    gui.set_inherit_alpha(art, true);
    actions.fill_card_window(art, win);
    return frame;
  }

  /* ******************************************
              HERO DATA HELPERS
  ******************************************** */

  function hero_by_id(id: number) {
    const heroes = defsave.loaded.Hero.data;
    return t(id) && id >= 1 && id <= len(heroes) ? heroes[id - 1] : undefined;
  }

  function rarity_panel(hero: any) {
    const r = t(hero.Rarity) ? hero.Rarity : "Common";
    return t(RARITY_PANEL[r]) ? RARITY_PANEL[r] : "tinyfancypanel_gold";
  }

  function power_of(hero: any) {
    return t(hero.Powers) ? hero.Powers[0] : undefined;
  }

  function power_icon(hero: any) {
    const power = power_of(hero);
    if (!t(power) || !t(power.Stages)) return undefined;
    return power.Stages[len(power.Stages) - 1].Icon;
  }

  function power_desc(hero: any) {
    const power = power_of(hero);
    if (!t(power) || !t(power.Name)) return "";
    const key = S.gsub(power.Name, "_NAME$", "_DESC")[0];
    const text = loc.get(key);
    return t(text) && text !== key ? text : "";
  }

  function place_name(location: any) {
    const map = defsave.get("Map", location.map_id);
    const dungeon = t(map) ? map[location.dungeon_id - 1] : undefined;
    const name = t(dungeon) ? loc.get(dungeon.Name) : undefined;
    return t(name) ? name : "";
  }

  function is_event_location(location: any) {
    return t(location) && t(location.map_id) && t(actions.event_on_map(location.map_id));
  }

  function place_label(location: any) {
    const name = place_name(location);
    if (is_event_location(location)) {
      return S.gsub(loc.get("HERO_TAG_EVENT_AT"), "%%1", name)[0];
    }
    return S.gsub(loc.get("HERO_TAG_AT"), "%%1", name)[0];
  }

  // Where a hero is, seen from this dungeon: "here", "free" or "away".
  function where(hero: any) {
    const at = hero.location;
    if (at === undefined || at === null || at.map_id === undefined || at.map_id === null || at.dungeon_id === undefined || at.dungeon_id === null) return "free";
    if (at.map_id === map_id && at.dungeon_id === dungeon_id) return "here";
    return "away";
  }

  function tag(hero: any): [string, any] {
    const w = where(hero);
    if (w === "here") return [loc.get("HERO_TAG_HERE"), HERE];
    if (w === "free") return [loc.get("HERO_TAG_FREE"), FREE];
    return [place_label(hero.location), AWAY];
  }

  // Only field heroes NOT already in this dungeon.
  function candidates() {
    const free_rows: any[] = [];
    const away_rows: any[] = [];
    const heroes = defsave.loaded.Hero.data;
    for (let h = 1; h <= len(heroes); h++) {
      const hero = heroes[h - 1];
      if (!t(hero.Locked) && !t(actions.is_patron(hero)) && t(hero.Portrait)) {
        const w = where(hero);
        if (w === "free") T.insert(free_rows, { id: h, hero: hero, where: w });
        else if (w === "away") T.insert(away_rows, { id: h, hero: hero, where: w });
      }
    }
    const cmp = (a: any, b: any) => {
      const la = t(a.hero.Level) ? a.hero.Level : 0, lb = t(b.hero.Level) ? b.hero.Level : 0;
      if (la !== lb) return la > lb;
      return a.id < b.id;
    };
    T.sort(free_rows, cmp);
    T.sort(away_rows, cmp);
    return { free: free_rows, away: away_rows };
  }

  function count_here() {
    let n = 0;
    const heroes = defsave.loaded.Hero.data;
    for (let h = 1; h <= len(heroes); h++) {
      const hero = heroes[h - 1];
      if (!t(hero.Locked) && !t(actions.is_patron(hero)) && where(hero) === "here") n = n + 1;
    }
    return n;
  }

  function first_empty_slot_from_data() {
    const used: Record<number, boolean> = {};
    const heroes = defsave.loaded.Hero.data;
    for (let h = 1; h <= len(heroes); h++) {
      const hero = heroes[h - 1];
      const at = hero.location;
      if (t(at) && at.map_id === map_id && at.dungeon_id === dungeon_id && t(at.slot_id)) {
        used[at.slot_id] = true;
      }
    }
    for (let s = 1; s <= hp.max_slots; s++) {
      if (!used[s]) return s;
    }
    return undefined;
  }

  function hero_in_slot_from_data(slot: number) {
    const heroes = defsave.loaded.Hero.data;
    for (let h = 1; h <= len(heroes); h++) {
      const hero = heroes[h - 1];
      const at = hero.location;
      if (t(at) && at.map_id === map_id && at.dungeon_id === dungeon_id && at.slot_id === slot) return h;
    }
    return undefined;
  }

  function has_other_candidates() {
    const c = candidates();
    return len(c.free) + len(c.away) > 0;
  }

  function roster_signature() {
    const parts: any[] = [map_id, dungeon_id, hp.mode, tostring(hp.detail_hero_id), tostring(hp.swap_hero_id)];
    const heroes = defsave.loaded.Hero.data;
    for (let h = 1; h <= len(heroes); h++) {
      const hero = heroes[h - 1];
      if (!t(hero.Locked) && !t(actions.is_patron(hero))) {
        const at = t(hero.location) ? hero.location : {};
        T.insert(parts, cat(h, ":", t(hero.Level) ? hero.Level : 0, ":", tostring(at.map_id), ":", tostring(at.dungeon_id), ":", tostring(at.slot_id)));
      }
    }
    return T.concat(parts, "|");
  }

  /* ******************************************
              ACTIONS
  ******************************************** */

  function clear_ui() {
    if (t(hp.root_ui)) gui.delete_node(hp.root_ui);
    hp.root_ui = undefined;
    hp.panel = undefined;
    hp.window = undefined;
    hp.content = undefined;
    hp.scrollbar = undefined;
    hp.rows = [];
    hp.buttons = [];
  }

  function close_modal(notify_dungeon: boolean) {
    if (!hp.open) return;
    hp.open = false;
    hp.press = undefined;
    hp.swallow = undefined;
    hp.confirm = undefined;
    hp.swap_hero_id = undefined;
    hp.detail_hero_id = undefined;
    hp.detail_from_picker = false;
    clear_ui();
    msg.post("main:/overlay#header", "set_active", { active: true });
    msg.post("main:/overlay#back", "set_active", { active: true });
    audio.setPopupOpen(false);
    if (notify_dungeon) msg.post(DUNGEON, "roster_closed");
  }

  function execute_assign(hero_id: number, target_slot: number, is_swap: boolean) {
    const hero = hero_by_id(hero_id);
    if (!t(hero)) return;
    const was_free = where(hero) === "free";
    const c = candidates();
    const assigned_before = count_here();
    const assigned_after = is_swap ? assigned_before : assigned_before + 1;
    const free_after = len(c.free) - (was_free ? 1 : 0);

    hp.landing = hero_id;
    msg.post(controller, "assign_hero", {
      hero_id: hero_id,
      map_id: map_id,
      dungeon_id: dungeon_id,
      slot_id: target_slot,
    });

    // Swap always closes; assign stays open only when more empty slots AND free heroes remain.
    if (is_swap || assigned_after >= hp.max_slots || free_after <= 0) {
      close_modal(true);
    } else {
      hp.mode = "picker";
      hp.confirm = undefined;
      hp.detail_hero_id = undefined;
      hp.detail_from_picker = false;
      hp.guard = now() + POPUP_GUARD;
      // Rebuild immediately on next frame once assign_hero mutates defsave;
      // also mark dirty now so signature change picks it up cleanly.
      hp.signature = "";
    }
  }

  function request_assign(hero_id: number) {
    const hero = hero_by_id(hero_id);
    if (!t(hero)) return;
    const is_swap = t(hp.swap_hero_id);
    const target_slot = is_swap ? hp.slot_id : first_empty_slot_from_data();
    if (!t(target_slot)) {
      close_modal(true);
      return;
    }
    if (where(hero) === "away") {
      hp.confirm = {
        hero_id: hero_id,
        target_slot: target_slot,
        is_swap: is_swap,
        return_mode: hp.mode,
      };
      hp.mode = "confirm";
      hp.guard = now() + POPUP_GUARD;
      rebuild(true);
    } else {
      execute_assign(hero_id, target_slot!, is_swap);
    }
  }

  /* ******************************************
              VIEW BUILDERS
  ******************************************** */

  function register_button(node: any, on_click: () => void) {
    T.insert(hp.buttons, { node: node, on_click: on_click });
  }

  function create_backdrop() {
    hp.root_ui = new_box(hp.base, vmath.vector3(0, 0, 0), vmath.vector3(0, 0, 0));
    const dim = new_box(hp.root_ui, vmath.vector3(view.w / 2, view.h / 2, 0), vmath.vector3(view.w, view.h, 0));
    gui.set_color(dim, DIM);
  }

  function animate_in(panel: any) {
    gui.set_scale(panel, vmath.vector3(0.92, 0.92, 1));
    gui.animate(panel, "scale", vmath.vector3(1, 1, 1), gui.EASING_OUTBACK, 0.22);
  }

  function build_detail(animate: boolean) {
    const hero = hero_by_id(hp.detail_hero_id);
    if (!t(hero)) {
      close_modal(true);
      return;
    }
    create_backdrop();

    const pw = Math.min(view.w - 48, 640);
    const iw = pw - 48;
    const w_here = where(hero) === "here";
    const can_unassign = actions.can_unassign_hero();
    const can_swap_here = w_here && can_unassign && has_other_candidates();
    const has_bottom_buttons = (w_here && can_unassign) || hp.detail_from_picker;

    // Measure power description height first so the popup hugs its content.
    const desc_str = power_desc(hero);
    const power = power_of(hero);
    const icon = power_icon(hero);
    const power_text_w = iw - 128;
    const tmp = new_text(hp.root_ui, "font", vmath.vector3(0, 0, 0), desc_str);
    const desc_h = desc_str !== "" ? wrap_text(tmp, power_text_w, 25) : 0;
    gui.delete_node(tmp);
    const power_box_h = Math.max(132, Math.ceil(66 + desc_h + 32));

    const header_block = 20 + HEADER_H + 20;
    const identity_h = 168;
    const buttons_block = has_bottom_buttons ? (22 + BTN_H + 26) : 26;
    const ph = Math.min(view.h - 100, header_block + identity_h + 20 + power_box_h + buttons_block);

    hp.panel = new_panel(hp.root_ui, vmath.vector3(view.w / 2, view.h / 2, 0), vmath.vector3(pw, ph, 0), "tinyfancypanel_charcoal");

    let y = ph / 2 - 20;

    // Header banner in hero rarity color.
    const header = new_panel(hp.panel, vmath.vector3(0, y - HEADER_H / 2, 0), vmath.vector3(pw - 32, HEADER_H, 0), rarity_panel(hero));
    fit_text(new_text(header, "title", vmath.vector3(0, 6, 0), loc.get(hero.Name), WHITE), pw - 64, 42);
    y = y - HEADER_H - 20;

    // Identity row: square portrait on left, stats/virtues/status on right.
    const port_size = 164;
    const port_x = -iw / 2 + port_size / 2;
    const id_mid_y = y - identity_h / 2;
    new_portrait(hp.panel, vmath.vector3(port_x, id_mid_y, 0), port_size, hero);

    const info_x = -iw / 2 + port_size + 20;
    const info_w = iw - port_size - 20;

    const rarity_key = cat("RARITY_", S.upper(t(hero.Rarity) ? hero.Rarity : "COMMON"));
    const level_str = cat(loc.get("HERO_LEVEL", t(hero.Level) ? hero.Level : 0), "  -  ", loc.get(rarity_key));
    const lvl_node = new_text(hp.panel, "title", vmath.vector3(info_x, y - 22, 0), level_str, SOFT);
    gui.set_pivot(lvl_node, gui.PIVOT_W);
    fit_text(lvl_node, info_w, 28);

    // Virtue chips (plain colored rounded-feel bars with crisp outline text).
    const chips = t(hero.Virtues) ? hero.Virtues : [];
    const chip_count = len(chips);
    if (chip_count > 0) {
      const chip_gap = 10;
      const chip_w = Math.min(132, (info_w - chip_gap * (chip_count - 1)) / chip_count);
      const chip_y = y - 76;
      for (let v = 1; v <= chip_count; v++) {
        const chip = chips[v - 1];
        const cx = info_x + chip_w / 2 + (v - 1) * (chip_w + chip_gap);
        const bg = new_box(hp.panel, vmath.vector3(cx, chip_y, 0), vmath.vector3(chip_w, 36, 0));
        gui.set_color(bg, t(VIRTUE_COLOUR[chip.Virtue]) ? VIRTUE_COLOUR[chip.Virtue] : SOFT);
        fit_text(new_text(bg, "font", vmath.vector3(0, 0, 0), loc.get(cat("VIRTUE_", S.upper(chip.Virtue))), WHITE), chip_w - 14, 21);
      }
    }

    // Current location status.
    const [where_text, where_colour] = tag(hero);
    const loc_node = new_text(hp.panel, "font", vmath.vector3(info_x, y - 134, 0), where_text, where_colour);
    gui.set_pivot(loc_node, gui.PIVOT_W);
    fit_text(loc_node, info_w, 25);

    y = y - identity_h - 20;

    // Power inset panel.
    const pbox = new_panel(hp.panel, vmath.vector3(0, y - power_box_h / 2, 0), vmath.vector3(iw, power_box_h, 0), "tinyfancypanel_darkbrown");
    if (t(power) && t(icon)) {
      const icon_size = 84;
      const ix = -iw / 2 + 20 + icon_size / 2;
      const ibg = new_box(pbox, vmath.vector3(ix, 5, 0), vmath.vector3(icon_size + 8, icon_size + 8, 0));
      gui.set_color(ibg, vmath.vector4(0, 0, 0, 0.35));
      new_box(pbox, vmath.vector3(ix, 5, 0), vmath.vector3(icon_size, icon_size, 0), icon.texture, icon.flipbook);

      const tx = -iw / 2 + 20 + icon_size + 18;
      const pname = new_text(pbox, "title", vmath.vector3(tx, power_box_h / 2 - 28, 0), loc.get(power.Name), HERE);
      gui.set_pivot(pname, gui.PIVOT_W);
      fit_text(pname, iw - icon_size - 56, 30);

      if (desc_str !== "") {
        const pdesc = new_text(pbox, "font", vmath.vector3(tx, power_box_h / 2 - 50, 0), desc_str, WHITE);
        gui.set_pivot(pdesc, gui.PIVOT_NW);
        wrap_text(pdesc, iw - icon_size - 56, 25);
      }
    }

    // Bottom action buttons.
    if (has_bottom_buttons) {
      const by = -ph / 2 + 26 + BTN_H / 2;
      const bw = (iw - 18) / 2;
      if (hp.detail_from_picker) {
        const is_away = where(hero) === "away";
        const is_swap = t(hp.swap_hero_id);
        const act_label = is_swap ? loc.get("HERO_SWAP") : (is_away ? loc.get("HERO_MOVE") : loc.get("HERO_ASSIGN"));
        const act_flip = is_away ? "tinyfancybutton_orange" : "tinyfancybutton_green";
        const act_btn = new_button(hp.panel, vmath.vector3(-bw / 2 - 9, by, 0), vmath.vector3(bw, BTN_H, 0), act_flip, act_label);
        register_button(act_btn, () => request_assign(hp.detail_hero_id));

        const back_btn = new_button(hp.panel, vmath.vector3(bw / 2 + 9, by, 0), vmath.vector3(bw, BTN_H, 0), "tinyfancybutton_darkgrey", loc.get("HERO_BACK"));
        register_button(back_btn, () => {
          hp.mode = "picker";
          hp.detail_hero_id = undefined;
          hp.detail_from_picker = false;
          hp.guard = now() + POPUP_GUARD;
          rebuild(false);
        });
      } else if (can_swap_here) {
        const swap_btn = new_button(hp.panel, vmath.vector3(-bw / 2 - 9, by, 0), vmath.vector3(bw, BTN_H, 0), "tinyfancybutton_green", loc.get("HERO_SWAP"));
        register_button(swap_btn, () => {
          hp.swap_hero_id = hp.detail_hero_id;
          hp.mode = "picker";
          hp.scroll = 0;
          hp.detail_hero_id = undefined;
          hp.detail_from_picker = false;
          hp.guard = now() + POPUP_GUARD;
          rebuild(true);
        });

        const rem_btn = new_button(hp.panel, vmath.vector3(bw / 2 + 9, by, 0), vmath.vector3(bw, BTN_H, 0), "tinyfancybutton_red", loc.get("HERO_REMOVE"));
        register_button(rem_btn, () => {
          msg.post(controller, "unassign_hero", { hero_id: hp.detail_hero_id });
          close_modal(true);
        });
      } else if (w_here && can_unassign) {
        const rem_btn = new_button(hp.panel, vmath.vector3(0, by, 0), vmath.vector3(Math.min(iw, 300), BTN_H, 0), "tinyfancybutton_red", loc.get("HERO_REMOVE"));
        register_button(rem_btn, () => {
          msg.post(controller, "unassign_hero", { hero_id: hp.detail_hero_id });
          close_modal(true);
        });
      }
    }

    if (animate) animate_in(hp.panel);
  }

  function update_scrollbar() {
    if (!t(hp.scrollbar)) return;
    const max_scroll = Math.max(0, hp.content_h - hp.window_h);
    if (max_scroll <= 0) {
      gui.set_enabled(hp.scrollbar, false);
      return;
    }
    gui.set_enabled(hp.scrollbar, true);
    const ratio = Math.max(0.15, Math.min(1, hp.window_h / hp.content_h));
    const track_h = hp.window_h - 16;
    const thumb_h = Math.max(36, track_h * ratio);
    const t_pos = hp.scroll / max_scroll;
    const thumb_y = hp.window_top - 8 - thumb_h / 2 - t_pos * (track_h - thumb_h);
    gui.set_size(hp.scrollbar, vmath.vector3(6, thumb_h, 0));
    gui.set_position(hp.scrollbar, vmath.vector3(gui.get_position(hp.scrollbar).x, thumb_y, 0));
  }

  function scroll_to(y: number) {
    const max = Math.max(0, hp.content_h - hp.window_h);
    hp.scroll = Math.max(0, Math.min(max, y));
    if (t(hp.content)) gui.set_position(hp.content, vmath.vector3(0, hp.scroll, 0));
    update_scrollbar();
  }

  function build_picker_row(entry: any, y_top: number, row_w: number, is_swap: boolean) {
    const hero = entry.hero;
    const is_away = entry.where === "away";
    const row_h = is_away ? ROW_H_AWAY : ROW_H;
    const bg = new_panel(hp.content, vmath.vector3(row_w / 2, y_top - row_h / 2, 0), vmath.vector3(row_w, row_h, 0), "tinyfancypanel_darkbrown");

    // Left: square rarity-framed portrait.
    const port_size = 112;
    const port_x = -row_w / 2 + 16 + port_size / 2;
    new_portrait(bg, vmath.vector3(port_x, 4, 0), port_size, hero);

    // Right: crisp one-tap action button.
    const btn_w = 142;
    const btn_h = 74;
    const btn_x = row_w / 2 - 16 - btn_w / 2;
    const btn_flip = is_away ? "tinyfancybutton_orange" : "tinyfancybutton_green";
    const btn_label = is_swap ? loc.get("HERO_SWAP") : (is_away ? loc.get("HERO_MOVE") : loc.get("HERO_ASSIGN"));
    const btn = new_button(bg, vmath.vector3(btn_x, 4, 0), vmath.vector3(btn_w, btn_h, 0), btn_flip, btn_label, 27);

    // Middle: name + level, power icon + power name, description / location.
    const mid_left = -row_w / 2 + 16 + port_size + 16;
    const mid_right = row_w / 2 - 16 - btn_w - 14;
    const mid_w = mid_right - mid_left;
    const top_y = row_h / 2 - 28;

    const lvl_str = cat("Lv.", t(hero.Level) ? hero.Level : 0);
    const lvl_node = new_text(bg, "font", vmath.vector3(mid_right, top_y, 0), lvl_str, MUTED);
    gui.set_pivot(lvl_node, gui.PIVOT_E);
    fit_text(lvl_node, 70, 21);

    const name_node = new_text(bg, "title", vmath.vector3(mid_left, top_y, 0), loc.get(hero.Name), WHITE);
    gui.set_pivot(name_node, gui.PIVOT_W);
    fit_text(name_node, mid_w - 76, 28);

    const power = power_of(hero);
    const icon = power_icon(hero);
    const p_y = top_y - 33;
    let p_text_x = mid_left;
    if (t(icon)) {
      const psize = 28;
      new_box(bg, vmath.vector3(mid_left + psize / 2, p_y, 0), vmath.vector3(psize, psize, 0), icon.texture, icon.flipbook);
      p_text_x = mid_left + psize + 8;
    }
    if (t(power) && t(power.Name)) {
      const pn = new_text(bg, "font", vmath.vector3(p_text_x, p_y, 0), loc.get(power.Name), HERE);
      gui.set_pivot(pn, gui.PIVOT_W);
      fit_text(pn, mid_right - p_text_x, 22);
    }

    const desc_str = power_desc(hero);
    if (desc_str !== "") {
      const dnode = new_text(bg, "font", vmath.vector3(mid_left, p_y - 18, 0), desc_str, SOFT);
      gui.set_pivot(dnode, gui.PIVOT_NW);
      wrap_text(dnode, mid_w, 19);
    }
    if (is_away) {
      const loc_node = new_text(bg, "font", vmath.vector3(mid_left, -row_h / 2 + 28, 0), place_label(hero.location), AWAY);
      gui.set_pivot(loc_node, gui.PIVOT_W);
      fit_text(loc_node, mid_w, 21);
    }

    T.insert(hp.rows, { id: entry.id, bg: bg, btn: btn });
    return row_h;
  }

  function build_picker(animate: boolean) {
    create_backdrop();

    const c = candidates();
    const n_free = len(c.free);
    const n_away = len(c.away);
    const total = n_free + n_away;
    const is_swap = t(hp.swap_hero_id);
    const swap_hero = is_swap ? hero_by_id(hp.swap_hero_id) : undefined;

    const pw = Math.min(view.w - 36, 680);
    const row_w = pw - 44;
    const show_free_header = n_free > 0 && n_away > 0;
    const show_away_header = n_away > 0;

    // Pre-calculate exact content height so the popup sizes tightly around few heroes
    // and scrolls smoothly when there are many.
    let ch = 8;
    if (total === 0) {
      ch = 120;
    } else {
      if (show_free_header) ch = ch + SECTION_H;
      if (n_free > 0) ch = ch + n_free * ROW_H + Math.max(0, n_free - 1) * ROW_GAP;
      if (n_free > 0 && n_away > 0) ch = ch + 14;
      if (show_away_header) ch = ch + SECTION_H;
      if (n_away > 0) ch = ch + n_away * ROW_H_AWAY + Math.max(0, n_away - 1) * ROW_GAP;
      ch = ch + 10;
    }

    const header_block = 18 + HEADER_H + 14;
    const bottom_pad = 22;
    const max_ph = Math.min(view.h - 140, 960);
    const ph = Math.max(260, Math.min(max_ph, header_block + ch + bottom_pad));

    hp.panel = new_panel(hp.root_ui, vmath.vector3(view.w / 2, view.h / 2, 0), vmath.vector3(pw, ph, 0), "tinyfancypanel_charcoal");

    // Title banner.
    const title_text = is_swap && t(swap_hero)
      ? S.gsub(loc.get("HEROES_SWAP_TITLE"), "%%1", loc.get(swap_hero.Name))[0]
      : loc.get("HEROES_ASSIGN_TITLE");
    const header = new_panel(hp.panel, vmath.vector3(0, ph / 2 - 18 - HEADER_H / 2, 0), vmath.vector3(pw - 32, HEADER_H, 0), "tinyfancypanel_gold");
    fit_text(new_text(header, "title", vmath.vector3(0, 6, 0), S.upper(title_text), WHITE), pw - 68, 38);

    // Scrollable stencil window.
    hp.window_h = ph - header_block - bottom_pad;
    hp.window_top = ph / 2 - header_block;
    hp.window = new_box(hp.panel, vmath.vector3(-row_w / 2, hp.window_top, 0), vmath.vector3(row_w, hp.window_h, 0));
    gui.set_pivot(hp.window, gui.PIVOT_NW);
    gui.set_clipping_mode(hp.window, gui.CLIPPING_MODE_STENCIL);
    gui.set_clipping_visible(hp.window, false);

    hp.content = new_box(hp.window, vmath.vector3(0, 0, 0), vmath.vector3(0, 0, 0));
    hp.content_h = ch;

    if (total === 0) {
      fit_text(new_text(hp.content, "font", vmath.vector3(row_w / 2, -60, 0), loc.get("HERO_NONE_AVAILABLE"), SOFT), row_w - 32, 26);
    } else {
      let y = -8;
      if (show_free_header) {
        const lbl = new_text(hp.content, "title", vmath.vector3(8, y - SECTION_H / 2, 0), S.upper(loc.get("HERO_SECTION_AVAILABLE")), FREE);
        gui.set_pivot(lbl, gui.PIVOT_W);
        fit_text(lbl, row_w - 16, 22);
        y = y - SECTION_H;
      }
      for (let i = 1; i <= n_free; i++) {
        build_picker_row(c.free[i - 1], y, row_w, is_swap);
        y = y - ROW_H - (i < n_free ? ROW_GAP : 0);
      }
      if (n_free > 0 && n_away > 0) y = y - 14;
      if (show_away_header) {
        const lbl = new_text(hp.content, "title", vmath.vector3(8, y - SECTION_H / 2, 0), S.upper(loc.get("HERO_SECTION_ELSEWHERE")), AWAY);
        gui.set_pivot(lbl, gui.PIVOT_W);
        fit_text(lbl, row_w - 16, 22);
        y = y - SECTION_H;
      }
      for (let i = 1; i <= n_away; i++) {
        const rh = build_picker_row(c.away[i - 1], y, row_w, is_swap);
        y = y - rh - (i < n_away ? ROW_GAP : 0);
      }
    }

    // Subtle scroll thumb on the right margin of the panel when list overflows.
    hp.scrollbar = new_box(hp.panel, vmath.vector3(pw / 2 - 12, hp.window_top - 24, 0), vmath.vector3(6, 48, 0));
    gui.set_color(hp.scrollbar, vmath.vector4(1, 1, 1, 0.35));

    scroll_to(hp.scroll);
    if (animate) animate_in(hp.panel);
  }

  function build_confirm(animate: boolean) {
    const cfg = hp.confirm;
    if (!t(cfg)) {
      hp.mode = "picker";
      build_picker(false);
      return;
    }
    const hero = hero_by_id(cfg.hero_id);
    if (!t(hero)) {
      close_modal(true);
      return;
    }
    create_backdrop();

    const pw = Math.min(view.w - 64, 600);
    const iw = pw - 48;
    const name = loc.get(hero.Name);
    const from_place = is_event_location(hero.location)
      ? place_label(hero.location)
      : place_name(hero.location);

    let body_str: string;
    if (cfg.is_swap && t(hp.swap_hero_id)) {
      const old_hero = hero_by_id(hp.swap_hero_id);
      const old_name = t(old_hero) ? loc.get(old_hero.Name) : "";
      body_str = S.gsub(loc.get("HERO_SWAP_MOVE_TEXT"), "%%1", name)[0];
      body_str = S.gsub(body_str, "%%2", from_place)[0];
      body_str = S.gsub(body_str, "%%3", old_name)[0];
    } else {
      body_str = S.gsub(loc.get("HERO_MOVE_TEXT"), "%%1", name)[0];
      body_str = S.gsub(body_str, "%%2", from_place)[0];
    }

    const tmp = new_text(hp.root_ui, "font", vmath.vector3(0, 0, 0), body_str);
    const body_h = wrap_text(tmp, iw - 36, 28);
    gui.delete_node(tmp);
    const box_h = Math.max(120, Math.ceil(body_h + 44));

    const ph = 20 + HEADER_H + 20 + box_h + 24 + BTN_H + 26;
    hp.panel = new_panel(hp.root_ui, vmath.vector3(view.w / 2, view.h / 2, 0), vmath.vector3(pw, ph, 0), "tinyfancypanel_charcoal");

    let y = ph / 2 - 20;
    const title_str = S.gsub(loc.get("HERO_MOVE_TITLE"), "%%1", name)[0];
    const header = new_panel(hp.panel, vmath.vector3(0, y - HEADER_H / 2, 0), vmath.vector3(pw - 32, HEADER_H, 0), "tinyfancypanel_orange");
    fit_text(new_text(header, "title", vmath.vector3(0, 6, 0), S.upper(title_str), WHITE), pw - 64, 38);
    y = y - HEADER_H - 20;

    const inset = new_panel(hp.panel, vmath.vector3(0, y - box_h / 2, 0), vmath.vector3(iw, box_h, 0), "tinyfancypanel_darkbrown");
    const btext = new_text(inset, "font", vmath.vector3(0, 4, 0), body_str, WHITE);
    wrap_text(btext, iw - 36, 28);

    const by = -ph / 2 + 26 + BTN_H / 2;
    const bw = (iw - 18) / 2;
    const ok_label = cfg.is_swap ? loc.get("HERO_SWAP") : loc.get("HERO_MOVE");
    const ok_btn = new_button(hp.panel, vmath.vector3(-bw / 2 - 9, by, 0), vmath.vector3(bw, BTN_H, 0), "tinyfancybutton_green", ok_label);
    register_button(ok_btn, () => execute_assign(cfg.hero_id, cfg.target_slot, cfg.is_swap));

    const cancel_btn = new_button(hp.panel, vmath.vector3(bw / 2 + 9, by, 0), vmath.vector3(bw, BTN_H, 0), "tinyfancybutton_red", loc.get("HERO_CANCEL"));
    register_button(cancel_btn, () => {
      hp.mode = t(cfg.return_mode) ? cfg.return_mode : "picker";
      hp.confirm = undefined;
      hp.guard = now() + POPUP_GUARD;
      rebuild(false);
    });

    if (animate) animate_in(hp.panel);
  }

  function rebuild(animate: boolean) {
    clear_ui();
    place_base();
    hp.built_size = cat(Math.floor(view.w), "|", Math.floor(view.h));
    hp.signature = roster_signature();
    if (hp.mode === "detail") build_detail(animate);
    else if (hp.mode === "confirm") build_confirm(animate);
    else build_picker(animate);
  }

  /* ******************************************
              INPUT
  ******************************************** */

  function hit_static_button(x: number, y: number) {
    for (let i = 1; i <= len(hp.buttons); i++) {
      const b = hp.buttons[i - 1];
      if (buttonFx.pick_node(b.node, x, y)) return b;
    }
    return undefined;
  }

  function hit_row(x: number, y: number) {
    if (!t(hp.window) || !gui.pick_node(hp.window, x, y)) return undefined;
    for (let i = 1; i <= len(hp.rows); i++) {
      const row = hp.rows[i - 1];
      if (gui.pick_node(row.bg, x, y)) return row;
    }
    return undefined;
  }

  function modal_input(action_id: any, action: any): boolean {
    if (t(hp.swallow) || (action_id === hash("touch") && action.pressed && t(hp.guard) && now() < hp.guard)) {
      hp.swallow = action_id === hash("touch") && action.released ? undefined : true;
      return true;
    }

    if (action_id === hash("scroll_up") || action_id === hash("scroll_down")) {
      if (hp.mode === "picker" && t(hp.window) && gui.pick_node(hp.window, action.x, action.y)) {
        scroll_to(hp.scroll + (action_id === hash("scroll_up") ? -80 : 80));
      }
      return true;
    }

    if (action_id !== hash("touch")) return false;

    const p = touch_at(action);
    const press = hp.press;

    if (action.pressed) {
      if (!t(hp.panel) || !gui.pick_node(hp.panel, action.x, action.y)) {
        hp.press = { outside: true, at: p };
        return true;
      }

      const sb = hit_static_button(action.x, action.y);
      if (t(sb)) {
        buttonFx.press(sb.node);
        hp.press = { button: sb, at: p };
        return true;
      }

      if (hp.mode === "picker") {
        const row = hit_row(action.x, action.y);
        if (t(row)) {
          const on_btn = buttonFx.pick_node(row.btn, action.x, action.y);
          if (on_btn) buttonFx.press(row.btn);
          hp.press = { row: row, row_btn: on_btn, at: p, scroll: hp.scroll };
          return true;
        }
        if (t(hp.window) && gui.pick_node(hp.window, action.x, action.y)) {
          hp.press = { scrolling: true, at: p, scroll: hp.scroll };
          return true;
        }
      }

      hp.press = { inside: true, at: p };
      return true;
    }

    if (!t(press)) return true;

    const moved = vmath.length(vmath.sub(p, press.at));

    if (action.released) {
      hp.press = undefined;
      if (t(press.outside)) {
        if (!t(hp.panel) || !gui.pick_node(hp.panel, action.x, action.y)) {
          if (hp.mode === "confirm" && t(hp.confirm)) {
            hp.mode = t(hp.confirm.return_mode) ? hp.confirm.return_mode : "picker";
            hp.confirm = undefined;
            hp.guard = now() + POPUP_GUARD;
            rebuild(false);
          } else {
            close_modal(true);
          }
        }
        return true;
      }

      if (t(press.button)) {
        const hit = buttonFx.pick_node(press.button.node, action.x, action.y);
        buttonFx.release(press.button.node, hit);
        if (hit) press.button.on_click();
        return true;
      }

      if (t(press.row)) {
        if (t(press.row_btn)) {
          const hit = !t(press.scrolling) && buttonFx.pick_node(press.row.btn, action.x, action.y);
          buttonFx.release(press.row.btn, hit);
          if (hit) {
            request_assign(press.row.id);
            return true;
          }
        }
        if (!t(press.scrolling) && !t(press.row_btn) && moved <= SCROLL_SLOP) {
          hp.detail_hero_id = press.row.id;
          hp.detail_from_picker = true;
          hp.mode = "detail";
          hp.guard = now() + POPUP_GUARD;
          rebuild(true);
        }
        return true;
      }
      return true;
    }

    // Move / drag updates.
    if (t(press.button)) {
      if (buttonFx.pick_node(press.button.node, action.x, action.y)) buttonFx.press(press.button.node);
      else buttonFx.release(press.button.node, false);
      return true;
    }

    if (t(press.scrolling)) {
      scroll_to(press.scroll + (p.y - press.at.y));
      return true;
    }

    if (t(press.row)) {
      if (moved > SCROLL_SLOP) {
        if (t(press.row_btn)) {
          buttonFx.release(press.row.btn, false);
          press.row_btn = false;
        }
        press.scrolling = true;
        scroll_to(press.scroll + (p.y - press.at.y));
      } else if (t(press.row_btn)) {
        if (buttonFx.pick_node(press.row.btn, action.x, action.y)) buttonFx.press(press.row.btn);
        else buttonFx.release(press.row.btn, false);
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
      // Render above dungeon (0) and header (10), below background/confirm popups (14-15).
      gui.set_render_order(13);
    },

    update(_self, _dt) {
      // Punch the slot on the map once an async assign_hero lands (even after modal closes).
      if (t(hp.landing)) {
        const hero = hero_by_id(hp.landing);
        const at = t(hero) ? hero.location : undefined;
        if (t(at) && at.map_id === map_id && at.dungeon_id === dungeon_id && hero_in_slot_from_data(at.slot_id) === hp.landing) {
          msg.post(DUNGEON, "roster_punch", { slot: at.slot_id });
          hp.landing = undefined;
        }
      }

      if (!hp.open) return;

      refresh_view_size();
      const size_key = cat(Math.floor(view.w), "|", Math.floor(view.h));
      if (hp.built_size !== size_key) {
        rebuild(false);
        return;
      }
      if (!t(hp.press) && roster_signature() !== hp.signature) {
        rebuild(false);
      }
    },

    on_input(_self, action_id, action) {
      if (hp.open && action_id !== undefined && action_id !== null) {
        return modal_input(action_id, action);
      }
      return undefined;
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("roster_update")) {
        map_id = message.map_id;
        dungeon_id = message.dungeon_id;
        if (t(message.max_slots)) hp.max_slots = message.max_slots;
        hp.slots = t(message.slots) ? message.slots : [];
      } else if (message_id === hash("roster_open")) {
        hp.open = true;
        hp.scroll = 0;
        hp.press = undefined;
        hp.confirm = undefined;
        hp.swap_hero_id = undefined;
        hp.detail_from_picker = false;
        hp.slot_id = t(message) && t(message.slot_id) ? message.slot_id : 1;
        if (t(message) && message.mode === "detail" && t(message.hero_id)) {
          hp.mode = "detail";
          hp.detail_hero_id = message.hero_id;
        } else {
          hp.mode = "picker";
          hp.detail_hero_id = undefined;
        }
        msg.post("main:/overlay#header", "set_active", { active: false });
        msg.post("main:/overlay#back", "set_active", { active: false });
        audio.setPopupOpen(true);
        rebuild(true);
      } else if (message_id === hash("roster_close")) {
        close_modal(false);
      }
    },
  };
});
