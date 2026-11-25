import { defineScript, gui, msg, hash, vmath, window, sys, print } from '../../../engine';
import type { Node } from '../../../engine';
import { t, cat, len, pairs, tracked, tset, os, M, S, T } from '../../../lua';
import { G } from '../../globals';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import progress from '../../progress/progress';
import saveload from '../../saveload/saveload';
import defsave from '../../defsave/defsave';
import actions from '../../actions';
import loc from '../../shared/locsheets';
import chapter0 from '../../chapter0/chapter0';
import { make_frame, make_caption } from '../../chapter0/guide';
import buttonFx from '../../shared/button_fx';
import audio from '../../../systems/audio';

void inspect; void random; void progress; void saveload;

function assert(v: unknown, m?: string): void {
  if (!t(v)) throw new Error(m ?? 'assertion failed!');
}

function isnil(v: unknown): boolean { return v === undefined || v === null; }

/** t[k] where t may be a Lua sequence (JS array, 1-based keys) or a table keyed by strings. */
function at(tbl: any, k: any): any {
  return Array.isArray(tbl) && typeof k === 'number' ? tbl[k - 1] : tbl[k];
}

defineScript('/main/dungeonmine/dungeonmine.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "dungeonmine";

  const controller = "main:/menu#controller";
  let Stats: any = {};
  let enabled: any = false;
  let active: any = true;
  let pause = false;

  const clickDamage = 1; void clickDamage;
  let hero_list: any[] = [];
  const dungeon = {}; void dungeon;
  let loot_items: any = {}; void loot_items;
  const inventory_items = {}; void inventory_items;
  let map_data: any = [];
  let level_list: any = [];
  // Room below the last level so a locked level's unlock meter isn't clipped
  const LEVEL_LIST_CONFIG = { end_padding: 80 };
  let resource_data: any = {};
  let bonusxp_data: any = {};
  let henchmen_data: any = [];
  let update_list: any = {};
  let vfx_list: any = {};
  let herofx_row: any, herofx_party: any; // hero effects, defined further down
  const heropanel: any = {}; // hero slots roster, defined further down

  let map_id: any = 1;
  let dungeon_id: any = 1;
  const maxPartySlots = 3;
  const maxPowerSlots = 3;
  const maxResourceSlots = 5;
  let resourceRootPos: any = {};
  let resourceRootScale: any = {};
  let resourceIconPos: any = 0;
  const resource_tileMax = 3; void resource_tileMax;
  let levelPos: any = {};
  const lootFramePos: any[] = [];

  let dungeonPosition: any = {};
  let dungeonScale: any = {}; void dungeonScale;
  let dungeonSize: any = {};
  let rosterPosition: any = {};
  let rosterScale: any = {}; void rosterScale;
  let rosterSize: any = {};

  let dungeonLevelNamePosition: any = {};
  const dungeonLevelActivateButtonSize = {}; void dungeonLevelActivateButtonSize;
  const dungeonLevelActivateButtonScale = {}; void dungeonLevelActivateButtonScale;

  let dungeonNamePosition: any = {};
  let tabSize: any = {};

  // Where the level list was left, per dungeon, as a 0-1 fraction of its scroll
  // range. Leaving the page and coming back used to drop the player at the top.
  const scroll_memory: Record<string, any> = {};

  // Enemy rows just cleared, kept on screen until their last kill has played.
  const enemy_dying: Record<string, any> = {};
  const ENEMY_DYING_TIME = 2.4;

  function scroll_key() {
    return cat(map_id, "-", dungeon_id);
  }

  function remember_scroll(list: any) {
    scroll_memory[scroll_key()] = list.scroll.y;
  }

  function restore_scroll() {
    const list = gooey.dynamic_list("dungeon", "dungeon/stencil", "level/root", level_list, undefined, undefined, LEVEL_LIST_CONFIG);
    const remembered = scroll_memory[scroll_key()];
    list.scroll_to(0, t(remembered) ? remembered : 0);
  }

  /* ******************************************
            SCREEN FIT
  ******************************************** */

  /* Same deal as the header: the scene is drawn for 750x1334, the root goes
  on a plain uniform fit, and the three bands of this screen - tab strip, map,
  dungeon list - are then placed against the real screen edges. A taller window
  mostly feeds the list, which is what the extra room is worth; a wider one
  widens the bands, but never the map art, which stays at design scale so it
  reads at the same size as the cards and panels beside it. */
  const DESIGN_W = 750;
  const DESIGN_H = 1334;

  const HEADER_DEPTH = 255.5; // how far the top bar reaches down from the top edge
  const FOOTER_TOP = 105; void FOOTER_TOP; // underside of the content, over the bottom bar
  const TITLE_DROP = 81.5; // tab strip, below the top bar
  const MAP_DROP = 73.5; // map, below the top bar
  const MAP_H = 325;
  const MAP_SHARE = 0.25; // of the height a tall window adds, the rest is list
  const ROSTER_RISE = 21; // hero card panel, above the map's bottom edge
  const LIST_BOTTOM = 80; // the list runs a little under the bottom bar
  const TAB_LEFT = -375; void TAB_LEFT; // first tab, from the middle of a 750 wide strip
  const EVENT_BAR_H = 52; // the header's event bar, on event maps only

  const screen: any = { w: 0, h: 0 };

  function screen_size(): [number, number] {
    const [ww, wh] = window.get_size();
    const scale = Math.min(ww / DESIGN_W, wh / DESIGN_H);
    return [ww / scale, wh / scale];
  }

  // set_map_position: a local declared here and defined further down (hoisted).

  function layout_screen() {
    const [w, h] = screen_size();
    // On event maps the header carries the event's bar under its top panel,
    // so everything here starts lower and the layout runs again when the map
    // changes.
    const on_event = map_id !== 1;
    if (Math.abs(w - screen.w) < 1 && Math.abs(h - screen.h) < 1 && screen.event === on_event) { return; }
    screen.w = w; screen.h = h; screen.event = on_event;

    const root = gui.get_node("root");
    gui.set_adjust_mode(root, gui.ADJUST_FIT);
    gui.set_xanchor(root, gui.ANCHOR_NONE);
    gui.set_yanchor(root, gui.ANCHOR_NONE);

    const clip = gui.get_node("menu/clip");
    gui.set_position(clip, vmath.vector3((DESIGN_W - w) / 2, (DESIGN_H - h) / 2, 0));
    gui.set_size(clip, vmath.vector3(w, h, 0));

    const top = h - HEADER_DEPTH - (on_event ? EVENT_BAR_H : 0);
    const map_h = MAP_H + Math.max(0, h - DESIGN_H) * MAP_SHARE;

    const title = gui.get_node("panel_title/bg");
    gui.set_position(title, vmath.vector3(w / 2, top - TITLE_DROP, 0));
    gui.set_size(title, vmath.vector3(w, 25, 0));
    for (let i = 1; i <= 5; i++) {
      const tab = gui.get_node(cat("dungeon/tab/", i));
      const p = gui.get_position(tab);
      p.x = -w / 2 + (i - 1) * 80;
      gui.set_position(tab, p);
    }

    const map_y = top - MAP_DROP - map_h;
    const map = gui.get_node("map/stencil");
    const bg = gui.get_node("map/bg");
    // The band runs the full width of the screen. The map art is one drawing, so
    // on a screen wider than it it is scaled up to cover rather than stretched.
    const cover = Math.max(1, w / gui.get_size(bg).x);
    gui.set_scale(bg, vmath.vector3(cover, cover, 1));
    gui.set_position(map, vmath.vector3(w / 2, map_y, 0));
    gui.set_size(map, vmath.vector3(w, map_h, 0));
    if (t(map_data[dungeon_id - 1])) { set_map_position(0); }

    // The hero cards ride the map's bottom edge in the scene, centred on the
    // design-height band; keep them on the middle of the band as it grows.
    const roster = gui.get_node("panel_roster/bg");
    const rp = gui.get_position(roster);
    rp.y = ROSTER_RISE + (map_h - MAP_H) / 2;
    gui.set_position(roster, rp);
    if (!isnil(rosterPosition.y)) { rosterPosition.y = rp.y; }

    const list_top = map_y;
    screen.list_top = list_top;
    for (const id of ["dungeon/root", "dungeon/stencil"]) {
      const node = gui.get_node(id);
      gui.set_size(node, vmath.vector3(w, list_top - LIST_BOTTOM, 0));
    }
    const list = gui.get_node("dungeon/root");
    gui.set_position(list, vmath.vector3(w / 2, list_top, 0));
  }

  /* ******************************************
            FUNCTIONS
  ******************************************** */

  function loadResources() {
    return actions.clone(defsave.loaded.Resources.data);
  }

  function setbutton_fancy(node: any, colour: any) {
    gui.play_flipbook(node, cat("tinyfancybutton_", colour));
    gui.set_slice9(node, vmath.vector4(64, 53, 64, 75));
  }
  void setbutton_fancy;

  function setbutton_panel(node: any, colour: any) {
    gui.play_flipbook(node, cat("tinyfancypanel_", colour));
    gui.set_slice9(node, vmath.vector4(32, 32, 32, 32));
  }
  void setbutton_panel;

  function update_inventory(data: any, virtues: any) {
    if (!isnil(virtues)) {
      // ipairs over a table shrinking under it: re-reads each index, stops at the first nil.
      for (let i = 1; ; i++) {
        const item = data[i - 1];
        if (isnil(item)) break;
        let match = false;
        for (let x = 1; x <= len(virtues); x++) {
          if (data[i - 1]["Virtue"] === virtues[x - 1]["Virtue"]) {
            match = true;
          }
        }
        if (!match) { T.remove(data, i); }
      }
    }
    return data;
  }
  void update_inventory;

  function get_numHeroSlots() {
    const heroes = actions.clone(defsave.loaded.Hero.data);

    let unassignedHeroes = 0;
    let assignedHeroes = 0;
    for (let h = 1; h <= len(heroes); h++) {
      const hero = heroes[h - 1];
      if (t(actions.is_patron(hero))) {
        // Patrons are never assigned.
      } else if (isnil(hero.location) && !t(hero.Locked)) {
        unassignedHeroes = unassignedHeroes + 1;
      } else if (!isnil(hero.location)) {
        if (isnil(hero.location.map_id)
          || isnil(hero.location.dungeon_id)) {
          unassignedHeroes = unassignedHeroes + 1;
        } else if (hero.location.map_id === map_id
          && hero.location.dungeon_id === dungeon_id) {
          assignedHeroes = assignedHeroes + 1;
        } else {
          // Working in another dungeon or on the other map, so it can
          // be moved here.
          unassignedHeroes = unassignedHeroes + 1;
        }
      }
    }

    return Math.min(maxPartySlots, assignedHeroes + Math.min(1, unassignedHeroes));
  }

  function play_shake(rootNode: any, defaultPos: any, duration: number, attachedNodes: any[], attachedPos: any[], scale: number) {
    const values: number[] = [];
    for (let i = 1; i <= duration * 60; i++) { T.insert(values, M.random(-1, 1) / 25); }
    T.insert(values, 0);
    const square_easing = vmath.vector(values);


    gui.set_position(rootNode, defaultPos);
    // custom easing curve: vmath.vector passed as the easing argument, as in the Lua
    gui.animate(rootNode, "position.y", scale, square_easing as any, duration);
    gui.animate(rootNode, "position.x", scale, square_easing as any, duration);

    for (let n = 1; n <= len(attachedNodes); n++) {
      const node = attachedNodes[n - 1];
      gui.set_position(node, attachedPos[n - 1]);
      gui.animate(node, "position.y", scale, square_easing as any, duration);
      gui.animate(node, "position.x", scale, square_easing as any, duration);
    }
  }

  function update_party() {

    let numSlots = get_numHeroSlots();
    if (t(map_data[dungeon_id - 1].Levels[0].isLocked)) { numSlots = 0; }
    // Heroes arrive with Chapter 1.
    if (chapter0.active()) { numSlots = 0; }


    for (let slot_id = 1; slot_id <= maxPartySlots; slot_id++) { gui.set_enabled(gui.get_node(cat("hero", slot_id, "/bg")), slot_id <= numSlots); }


    if (numSlots > 0) {
      const rosterNode = gui.get_node("roster/root");
      const rosterPos = gui.get_position(rosterNode);
      const slotPos = gui.get_position(gui.get_node(cat("hero", numSlots, "/bg")));
      gui.set_position(rosterNode, vmath.vector3(-slotPos.x / 2, rosterPos.y, rosterPos.z));


      for (let slot_id = 1; slot_id <= numSlots; slot_id++) {
        gui.set_enabled(gui.get_node(cat("hero", slot_id, "/lvlupbox")), false);
        gui.set_enabled(gui.get_node(cat("hero", slot_id, "/alertbox")), false);
        gui.set_enabled(gui.get_node(cat("hero", slot_id, "/portrait/stencil")), slot_id <= len(hero_list));
        gui.set_enabled(gui.get_node(cat("hero", slot_id, "/unassign/bg")), false);
        for (let p = 1; p <= maxPowerSlots; p++) {
          gui.set_enabled(gui.get_node(cat("hero", slot_id, "/power/root/", p)), false);
        }
        if (slot_id <= numSlots) {
          gui.set_enabled(gui.get_node(cat("hero", slot_id, "/panel/bg")), true);
          gui.play_flipbook(gui.get_node(cat("hero", slot_id, "/panel/bg")), "tinyfancybutton_darkgrey");
        }
      }

      for (let h = 1; h <= len(hero_list); h++) {
        const hero = hero_list[h - 1];
        const slot_id = hero.location.slot_id;
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
        gui.play_flipbook(gui.get_node(cat("hero", slot_id, "/panel/bg")), color[hero.Rarity]);

        const dungeon_open = actions.dungeon_has_open_level(map_id, dungeon_id);
        for (let p = 1; p <= maxPowerSlots; p++) {
          gui.set_enabled(gui.get_node(cat("hero", slot_id, "/power/root/", p)), t(hero.Powers[p - 1]));
          if (t(hero.Powers[p - 1])) {
            const power = hero.Powers[p - 1];
            const stage = dungeon_open ? power.Stage : 1;
            gui.set_texture(gui.get_node(cat("hero", slot_id, "/power/icon/bg/", p)), power.Stages[stage - 1].Icon.texture);
            gui.play_flipbook(gui.get_node(cat("hero", slot_id, "/power/icon/bg/", p)), power.Stages[stage - 1].Icon.flipbook);

            if (!pause) {
              const size = gui.get_size(gui.get_node(cat("hero", slot_id, "/power/icon/bg/", p)));
              if (!dungeon_open) {
                gui.set_size(gui.get_node(cat("hero", slot_id, "/power/timer/bg/", p)), vmath.vector3(size.x, size.y, size.z));
                gui.set_text(gui.get_node(cat("hero", slot_id, "/power/text/", p)), "");
              } else {
                let prog = 1 - ((os.clock() + defsave.get("Currency", "BonusTime") - power.lastupdate) / (power.nextupdate - power.lastupdate));
                if (prog < 0) { prog = 0; }
                if (prog > 1) { prog = 1; }
                gui.set_size(gui.get_node(cat("hero", slot_id, "/power/timer/bg/", p)), vmath.vector3(size.x, size.y * prog, size.z));


                if (t(update_list[cat("Flash", "-", hero.hero_index)])) {
                  const flashNode = gui.get_node(cat("hero", slot_id, "/power/timer/bg/", p));
                  gui.set_enabled(flashNode, true);
                  gui.set_color(flashNode, vmath.vector4(1, 1, 1, 1));
                  gui.animate(flashNode, "color", vmath.vector4(0, 0, 0, 0.5), gui.EASING_OUTSINE, 0.2);
                  update_list[cat("Flash", "-", hero.hero_index)] = false;
                }


                let timer: any = Math.max(0, Math.floor(power.nextupdate - os.clock() - defsave.get("Currency", "BonusTime")));
                if (timer === 0) { timer = ""; }
                gui.set_text(gui.get_node(cat("hero", slot_id, "/power/text/", p)), timer);
              }
            }
          }
        }


        const offsetPos = gui.get_position(gui.get_node(cat("hero", slot_id, "/power/root/", len(hero.Powers))));
        const rootPos = gui.get_position(gui.get_node(cat("hero", slot_id, "/power/root")));
        gui.set_position(gui.get_node(cat("hero", slot_id, "/power/root")), vmath.vector3(-(offsetPos.x / 2), rootPos.y, rootPos.z));

        if (!isnil(hero["Portrait"])) {
          gui.set_texture(gui.get_node(cat("hero", slot_id, "/portrait")), hero.Portrait.texture);
          gui.play_flipbook(gui.get_node(cat("hero", slot_id, "/portrait")), hero.Portrait.flipbook);
        }
      }
    }
    if (t(herofx_party)) { herofx_party(); }
  }

  function get_gearProgress(map_id: any, dungeon_id: any, level_id: any) {
    const gear_data = actions.clone(defsave.loaded.Gear.data);
    let progress = 0;
    for (let g = 1; g <= len(gear_data); g++) {
      const gear = gear_data[g - 1];
      if (gear.map_id === map_id && gear.dungeon_id === dungeon_id && gear.level_id === level_id) {
        if (gear.Progress > progress) { progress = gear.Progress; }
      }
    }
    return Math.max(0, progress);
  }

  /* The henchman's symbol sits in front of the "xN" count under the card, so
  the count reads as "this many of these". Built once per list slot and laid
  out in the count bar's units, the pair re-centred on the bar together. The
  card's grey frame is a later sibling of the bar and would draw over a child of
  it, so the icon is parented to the frame instead and placed through the panel
  they share. */
  const SIZE_ICON = 60; // bar units; the card panel draws them at half scale
  const SIZE_ICON_GAP = 4;
  // Keyed by node (Lua userdata keys compare by identity).
  const size_icons = new Map<Node, any>();

  /* Flying pink people on hire: the purchase saves right away, while the
  displayed hireling count holds back the hired amount and steps up as each
  pawn lands on the portrait — 1 per hire up to 20, then 10s, 100s, etc. */
  const HIRE_MAX_ICONS = 20;
  const GEN_MAX_ICONS_PER_BURST = 8;
  const GEN_MAX_ACTIVE = 24;
  const GEN_ICON_SIZE = vmath.vector3(44, 44, 0);
  const GEN_FLIGHT_MIN = 0.42;
  const GEN_FLIGHT_VAR = 0.07;
  const GEN_MAX_STAGGER = 0.065;
  const GEN_MAX_LAUNCH_SPAN = 0.36;
  const GEN_FADE_START_RATE = 0.25; // completions/sec (~4s cycle): full opacity below this
  const GEN_STEADY_RATE = 0.95;     // completions/sec (~1.05s cycle): steady stream, stop showing
  const GEN_MIN_ALPHA = 0.12;
  const GEN_RECENT_WINDOW = 3.0;

  const hire_pending: Record<number, number> = {};
  const hire_target_pos: Record<number, any> = {};
  const portrait_scales = new Map<Node, any>();
  const henchmen_icon_base_y = new Map<Node, number>();
  const gen_particles: any[] = [];
  const gen_recent: Record<number, number[]> = {}; // from_henchmen_id -> recent completion timestamps

  function hire_batches(amount: number, maxIcons: number = HIRE_MAX_ICONS): number[] {
    let step = 1;
    while (Math.ceil(amount / step) > maxIcons) {
      step = step * 10;
    }
    const batches: number[] = [];
    let rem = amount;
    while (rem > 0) {
      const chunk = Math.min(step, rem);
      batches.push(chunk);
      rem = rem - chunk;
    }
    return batches;
  }

  function hire_follower_cost(henchmen_id: number, amount: number): number {
    const h = henchmen_data[henchmen_id - 1];
    if (!t(h) || !t(h.BuyCosts)) { return 0; }
    let total = 0;
    for (const [, cost] of pairs<any>(h.BuyCosts)) {
      if (cost.index === "Followers") {
        total = total + cost.baseamount * amount * actions.hire_cost_factor();
      }
    }
    return total;
  }

  function find_henchmen_item(henchmen_id: number): any {
    if (!t(dungeon_list) || !t(dungeon_list.items)) { return undefined; }
    for (let i = 1; i <= len(dungeon_list.items); i++) {
      const item = dungeon_list.items[i - 1];
      if (t(item) && t(item.data) && t(item.nodes)) {
        const hid = t(item.data.Henchmen) ? item.data.Henchmen.id : item.data.henchmen_id;
        if (hid === henchmen_id) { return item; }
      }
    }
    return undefined;
  }

  function launch_hire_fx(item: any, henchmen_id: number, amount: number, followerCost: number) {
    const batches = hire_batches(amount);
    const followerSteps: number[] = [];
    for (let i = 0; i < batches.length; i++) {
      followerSteps.push(followerCost > 0 ? followerCost * (batches[i] / amount) : 0);
    }
    const portrait = item.nodes[hash("henchmen/portrait")];
    const endPos = gui.get_screen_position(portrait);
    hire_pending[henchmen_id] = (hire_pending[henchmen_id] ?? 0) + amount;
    hire_target_pos[henchmen_id] = endPos;
    if (followerCost > 0) {
      msg.post("main:/overlay#header", "hire_followers_hold", { amount: followerCost });
    }
    msg.post("main:/overlay#guiparticles", "spawn_hire_particles", {
      henchmen_id: henchmen_id,
      endPos: endPos,
      batches: batches,
      followerSteps: followerSteps,
    });
  }

  function on_hire_land(henchmen_id: number, amount: number, intensity: number = 1) {
    const cur = hire_pending[henchmen_id] ?? 0;
    const next = Math.max(0, cur - amount);
    if (next <= 0) {
      delete hire_pending[henchmen_id];
      delete hire_target_pos[henchmen_id];
    } else {
      hire_pending[henchmen_id] = next;
    }

    const item = find_henchmen_item(henchmen_id);
    if (!t(item)) { return; }
    audio.playCascadeTick("hire");

    const sizeNode = item.nodes[hash("henchmen/size")];
    let base = count_scales.get(sizeNode);
    if (!t(base)) {
      base = gui.get_scale(sizeNode);
      count_scales.set(sizeNode, base);
    }
    gui.cancel_animation(sizeNode, "scale");
    gui.set_scale(sizeNode, vmath.mul(base, 1 + 0.45 * intensity));
    gui.animate(sizeNode, "scale", base, gui.EASING_OUTBACK, 0.22);

    const portrait = item.nodes[hash("henchmen/portrait")];
    let pBase = portrait_scales.get(portrait);
    if (!t(pBase)) {
      pBase = gui.get_scale(portrait);
      portrait_scales.set(portrait, pBase);
    }
    gui.cancel_animation(portrait, "scale");
    gui.set_scale(portrait, vmath.mul(pBase, 1 + 0.08 * intensity));
    gui.animate(portrait, "scale", pBase, gui.EASING_OUTQUAD, 0.14);
  }

  function in_dungeon_view(screenPos: any): boolean {
    const stencil = gui.get_node("dungeon/stencil");
    const sc = gui.get_screen_position(stencil);
    const [ww, wh] = window.get_size();
    const scale = Math.min(ww / DESIGN_W, wh / DESIGN_H);
    const halfH = gui.get_size(stencil).y * scale * 0.5 + 24;
    return screenPos.y >= sc.y - halfH && screenPos.y <= sc.y + halfH;
  }

  function bump_henchmen_icon(item: any) {
    const iconNode = item.nodes[hash("henchmen/icon")];
    if (!t(iconNode)) { return; }
    let baseY = henchmen_icon_base_y.get(iconNode);
    const pos = gui.get_position(iconNode);
    if (isnil(baseY)) {
      baseY = pos.y;
      henchmen_icon_base_y.set(iconNode, baseY!);
    }
    gui.cancel_animation(iconNode, "position.y");
    gui.set_position(iconNode, vmath.vector3(pos.x, baseY! + 40, pos.z));
    gui.animate(iconNode, "position.y", baseY!, gui.EASING_OUTBOUNCE, 0.5);
  }

  /* Higher-level completion: bump the generating row's hireling icon like the
  collectables, and fly the previous henchman's icon up into that previous
  henchman's portrait, grouped in powers of 10, fading as cycles speed up or
  overlap, and stopping once it becomes a steady stream. */
  function on_henchmen_generated(message: any) {
    if (message.map_id !== map_id || message.dungeon_id !== dungeon_id) { return; }
    if (heropanel.is_open()) { return; }
    const amount = message.amount;
    if (!(amount > 0)) { return; }

    const fromItem = find_henchmen_item(message.from_henchmen_id);
    if (t(fromItem) && !pause) {
      bump_henchmen_icon(fromItem);
    }

    if (t(message.steady)) { return; }
    const srcHenchmen = henchmen_data[message.from_henchmen_id - 1];
    const dstHenchmen = henchmen_data[message.to_henchmen_id - 1];
    const srcLevel = t(map_data[dungeon_id - 1]) ? map_data[dungeon_id - 1].Levels[message.from_level - 1] : undefined;
    if (!t(srcHenchmen) || !t(dstHenchmen) || !t(srcLevel) || !t(dstHenchmen.Icon)) { return; }
    if (t(srcLevel.contDamage) || t(srcHenchmen.contDamage)) { return; }

    const now = os.clock();
    const recent = gen_recent[message.from_henchmen_id] ?? [];
    recent.push(now);
    while (recent.length > 0 && now - recent[0] > GEN_RECENT_WINDOW) {
      recent.shift();
    }
    gen_recent[message.from_henchmen_id] = recent;

    const autoRate = (srcHenchmen.dps * actions.henchmen_rate(srcHenchmen)) / Math.max(0.0001, srcLevel.Health);
    const measuredRate = recent.length > 1 ? (recent.length - 1) / Math.max(0.5, now - recent[0]) : 0;
    const rate = Math.max(autoRate, measuredRate);
    if (rate >= GEN_STEADY_RATE) { return; }

    const speedAlpha = rate <= GEN_FADE_START_RATE
      ? 1
      : Math.max(0, 1 - (rate - GEN_FADE_START_RATE) / (GEN_STEADY_RATE - GEN_FADE_START_RATE));
    const room = GEN_MAX_ACTIVE - gen_particles.length;
    if (room < 1) { return; }
    const crowdAlpha = Math.max(0.15, 1 - Math.max(0, gen_particles.length - 4) / 18);
    const alpha = speedAlpha * crowdAlpha;
    if (alpha < GEN_MIN_ALPHA) { return; }

    const toItem = find_henchmen_item(message.to_henchmen_id);
    if (!t(fromItem) || !t(toItem)) { return; }
    const startPos = gui.get_screen_position(fromItem.nodes[hash("henchmen/icon")]);
    const endPos = gui.get_screen_position(toItem.nodes[hash("henchmen/portrait")]);
    if (!in_dungeon_view(startPos) || !in_dungeon_view(endPos)) { return; }

    const maxIcons = Math.min(GEN_MAX_ICONS_PER_BURST, room);
    const batches = hire_batches(amount, maxIcons);
    const count = batches.length;
    const stagger = count <= 1 ? 0 : Math.min(GEN_MAX_STAGGER, GEN_MAX_LAUNCH_SPAN / (count - 1));

    hire_pending[message.to_henchmen_id] = (hire_pending[message.to_henchmen_id] ?? 0) + amount;
    for (let i = 0; i < count; i++) {
      const fan = (i % 2 === 0 ? 1 : -1) * (0.06 + M.random() * 0.08);
      gen_particles.push({
        node: undefined,
        icon: dstHenchmen.Icon,
        from_henchmen_id: message.from_henchmen_id,
        to_henchmen_id: message.to_henchmen_id,
        step: batches[i],
        delay: i * stagger,
        elapsed: 0,
        duration: GEN_FLIGHT_MIN + M.random() * GEN_FLIGHT_VAR,
        startPos: vmath.vector3(startPos.x, startPos.y, 0),
        endPos: vmath.vector3(endPos.x, endPos.y, 0),
        endOffsetX: M.random(-12, 12),
        endOffsetY: M.random(-12, 12),
        bowFactor: -0.22 + fan,
        alpha: alpha,
        tiltSign: i % 2 === 0 ? 1 : -1,
      });
    }
  }

  // Convert a screen-pixel coordinate (from gui.get_screen_position) into
  // menu/clip (fx_parent) local coordinates. Unlike fx_local, this accounts for
  // menu/clip's PIVOT_SW origin rather than map/stencil's PIVOT_S center offset.
  function screen_to_fx(screen_pos: any) {
    const [ww, wh] = window.get_size();
    const scale = Math.min(ww / DESIGN_W, wh / DESIGN_H);
    const clip = gui.get_node("menu/clip");
    const center = gui.get_screen_position(clip);
    const size = gui.get_size(clip);
    const ox = center.x - size.x * 0.5 * scale;
    const oy = center.y - size.y * 0.5 * scale;
    return vmath.vector3((screen_pos.x - ox) / scale, (screen_pos.y - oy) / scale, 0);
  }

  function update_gen_particles(dt: number) {
    if (gen_particles.length === 0) { return; }
    for (let i = gen_particles.length - 1; i >= 0; i--) {
      const p = gen_particles[i];
      if (!t(p.node)) {
        p.delay = p.delay - dt;
        if (p.delay > 0) { continue; }
        const fromItem = find_henchmen_item(p.from_henchmen_id);
        if (t(fromItem)) {
          const liveStart = gui.get_screen_position(fromItem.nodes[hash("henchmen/icon")]);
          p.startPos = vmath.vector3(liveStart.x, liveStart.y, 0);
        }
        const node = gui.new_box_node(vmath.vector3(0, 0, 0), GEN_ICON_SIZE);
        gui.set_parent(node, fx_parent());
        fx_layer(node);
        gui.set_texture(node, p.icon.texture);
        gui.play_flipbook(node, p.icon.flipbook);
        gui.set_position(node, screen_to_fx(p.startPos));
        gui.set_scale(node, vmath.vector3(0.5, 0.5, 1));
        gui.set_color(node, vmath.vector4(1, 1, 1, p.alpha));
        p.node = node;
        p.elapsed = Math.max(0, -p.delay);
      } else {
        p.elapsed = p.elapsed + dt;
      }

      const toItem = find_henchmen_item(p.to_henchmen_id);
      if (t(toItem)) {
        const live = gui.get_screen_position(toItem.nodes[hash("henchmen/portrait")]);
        p.endPos = vmath.vector3(live.x, live.y, 0);
      }

      const u = Math.min(1, p.elapsed / p.duration);
      if (u >= 1) {
        gui.delete_node(p.node);
        gen_particles.splice(i, 1);
        on_hire_land(p.to_henchmen_id, p.step, p.alpha);
      } else {
        const e = 0.3 * u + 0.7 * u * u;
        const tx = p.endPos.x + p.endOffsetX;
        const ty = p.endPos.y + p.endOffsetY;
        const dx = tx - p.startPos.x;
        const dy = ty - p.startPos.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = -dy / dist;
        const ny = dx / dist;
        const mx = (p.startPos.x + tx) * 0.5 + nx * p.bowFactor * dist;
        const my = (p.startPos.y + ty) * 0.5 + ny * p.bowFactor * dist;
        const inv = 1 - e;
        const px = inv * inv * p.startPos.x + 2 * inv * e * mx + e * e * tx;
        const py = inv * inv * p.startPos.y + 2 * inv * e * my + e * e * ty;
        gui.set_position(p.node, screen_to_fx(vmath.vector3(px, py, 0)));

        const s = u < 0.25
          ? 0.5 + (1.05 - 0.5) * (u / 0.25)
          : 1.05 - (1.05 - 0.78) * ((u - 0.25) / 0.75);
        gui.set_scale(p.node, vmath.vector3(s, s, 1));
        gui.set_rotation(p.node, vmath.vector3(0, 0, p.tiltSign * 16 * Math.sin(u * Math.PI)));
        const a = u < 0.12 ? p.alpha * (u / 0.12) : p.alpha;
        gui.set_color(p.node, vmath.vector4(1, 1, 1, a));
      }
    }
  }

  function sync_hire_targets() {
    for (const key of Object.keys(hire_target_pos)) {
      const hid = Number(key);
      const item = find_henchmen_item(hid);
      if (!t(item)) { continue; }
      const pos = gui.get_screen_position(item.nodes[hash("henchmen/portrait")]);
      const prev = hire_target_pos[hid];
      if (!t(prev) || Math.abs(pos.x - prev.x) > 1 || Math.abs(pos.y - prev.y) > 1) {
        hire_target_pos[hid] = pos;
        msg.post("main:/overlay#guiparticles", "update_hire_target", { henchmen_id: hid, endPos: pos });
      }
    }
  }

  function clear_hire_fx() {
    for (let i = 0; i < gen_particles.length; i++) {
      if (t(gen_particles[i].node)) {
        gui.delete_node(gen_particles[i].node);
      }
    }
    gen_particles.length = 0;
    for (const k of Object.keys(gen_recent)) { delete gen_recent[Number(k)]; }
    const keys = Object.keys(hire_pending);
    if (keys.length === 0) { return; }
    for (const key of keys) {
      delete hire_pending[Number(key)];
      delete hire_target_pos[Number(key)];
    }
    msg.post("main:/overlay#guiparticles", "clear_hire_particles");
  }

  function set_size_icon(item: any, icon: any) {
    const bar = item.nodes[hash("henchmen/size/bg")];
    const frame = item.nodes[hash("henchmen/border/bg")];
    const text = item.nodes[hash("henchmen/size")];
    const barScale = gui.get_scale(bar), frameScale = gui.get_scale(frame);
    let node = size_icons.get(bar);
    if (!t(node)) {
      // Decoration: a scene out of nodes draws the count alone rather than
      // abandoning the rest of the row.
      let made: any;
      try { made = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(0, 0, 0)); } catch (e) { void e; return; }
      node = made;
      gui.set_parent(node, frame);
      size_icons.set(bar, node);
    }
    gui.set_enabled(node, !isnil(icon));
    const pos = gui.get_position(text);
    const shift = t(icon) ? (SIZE_ICON + SIZE_ICON_GAP) / 2 : 0;
    gui.set_position(text, vmath.vector3(shift, pos.y, pos.z));
    if (t(icon)) {
      const baseTextScale = count_scales.get(text) ?? gui.get_scale(text);
      const textWidth = gui.get_text_metrics_from_node(text).width * baseTextScale.x;
      const inBar = vmath.vector3(shift - textWidth / 2 - SIZE_ICON_GAP - SIZE_ICON / 2, pos.y, 0);
      const inFrame = vmath.sub(vmath.add(gui.get_position(bar), vmath.vector3(inBar.x * barScale.x, inBar.y * barScale.y, 0)), gui.get_position(frame));
      gui.set_position(node, vmath.vector3(inFrame.x / frameScale.x, inFrame.y / frameScale.y, 0));
      gui.set_size(node, vmath.vector3(SIZE_ICON * barScale.x / frameScale.x, SIZE_ICON * barScale.y / frameScale.y, 0));
      actions.set_item_icon(node, icon);
    }
  }

  function set_henchmen(item: any) {
    item.data.henchmen_id = t(item.data.henchmen_id) ? item.data.henchmen_id : item.data.Henchmen.id;

    gui.set_enabled(item.nodes[hash("henchmen/panel/bg")], !(item.data.State === "Locked" || item.data.State === "Invisible"));
    gui.set_enabled(item.nodes[hash("henchmen/progress/bg")], henchmen_data[item.data.henchmen_id - 1].Level > 0);
    gui.set_enabled(item.nodes[hash("henchmen/shadow/bg")], henchmen_data[item.data.henchmen_id - 1].Level === 0);
    gui.set_enabled(item.nodes[hash("henchmen/lock")], henchmen_data[item.data.henchmen_id - 1].Status === "Locked");
    gui.set_enabled(item.nodes[hash("henchmen/lvlupglint")], item.data.State !== "Inactive");

    gui.set_text(item.nodes[hash("henchmen/lvluptext")], S.upper(loc.get("UPGRADE_AVAILABLE")));
    const hid = item.data.Henchmen.id;
    const actualSize = henchmen_data[hid - 1].Size;
    let pending = hire_pending[hid] ?? 0;
    if (pending > actualSize) {
      pending = actualSize;
      hire_pending[hid] = pending;
    }
    const shownSize = Math.max(0, actualSize - pending);
    gui.set_text(item.nodes[hash("henchmen/size")], cat("x", actions.display_number(shownSize)));
    set_size_icon(item, henchmen_data[hid - 1].Icon);

    let upgrade = false;
    if (henchmen_data[item.data.henchmen_id - 1].Progress >= 1) {
      if (defsave.get("Stats", "Show").shopButton === true) {
        upgrade = true;
      }
    }
    if (get_gearProgress(henchmen_data[item.data.henchmen_id - 1].map_id, henchmen_data[item.data.henchmen_id - 1].dungeon_id, henchmen_data[item.data.henchmen_id - 1].level_id) >= 1) {
      if (defsave.get("Stats", "Show").shopButton === true) {
        upgrade = true;
      }
    }

    gui.set_enabled(item.nodes[hash("henchmen/lvlupbox")], upgrade);


    if (gui.get_flipbook(item.nodes[hash("henchmen/lvlupglint")]) === hash("button_glint_static")) {
      gui.play_flipbook(item.nodes[hash("henchmen/lvlupglint")], "button_glint");
    }

    gui.play_flipbook(item.nodes[hash("henchmen/portrait")], henchmen_data[item.data.henchmen_id - 1].Portrait.flipbook);
    if (henchmen_data[item.data.henchmen_id - 1].Level > 0) {
      if (henchmen_data[item.data.henchmen_id - 1].Progress < 1) {
        const lvl = henchmen_data[item.data.henchmen_id - 1].Level;
        gui.set_text(item.nodes[hash("henchmen/level")], S.upper(loc.get("HENCHMEN_LEVEL", t(lvl) ? lvl : 1)));
        const barsize = gui.get_size(item.nodes[hash("henchmen/progress/bg")]);
        let prog = 0;
        if (!isnil(henchmen_data[item.data.henchmen_id - 1].Progress)) { prog = Math.max(0, henchmen_data[item.data.henchmen_id - 1].Progress); }
        const barpos = gui.get_position(item.nodes[hash("henchmen/progress/bar")]); void barpos;
        gui.set_size(item.nodes[hash("henchmen/progress/bar")], vmath.vector3(barsize.x * prog, barsize.y, barsize.z));
      }
    }
  }

  function set_progressbar(item: any) {
    if (!pause) {
      const isDebug = sys.get_engine_info().is_debug;
      gui.set_enabled(item.nodes[hash("activate/bg")], item.data.State === "Inactive");
      gui.set_enabled(item.nodes[hash("level/bg/unlock/text")], item.data.State === "Disabled");
      gui.set_enabled(item.nodes[hash("time/count/bg")], false); //isDebug and not item.data.contDamage and item.data.State == "Active"			)
      gui.set_enabled(item.nodes[hash("level/progress/scrolling/root")], t(item.data.contDamage));
      gui.set_enabled(item.nodes[hash("level/glint")], item.data.State === "Inactive");

      if (item.data.State === "Active") {
        gui.set_position(item.nodes[hash("level/name")], dungeonLevelNamePosition);
      } else {
        const textPosition = vmath.vector3(dungeonLevelNamePosition.x + (G.dungeonActivateButtonSize.x * G.dungeonActivateButtonScale.x), dungeonLevelNamePosition.y, dungeonLevelNamePosition.z);
        gui.set_position(item.nodes[hash("level/name")], textPosition);
      }

      if (isnil(henchmen_data[item.data.henchmen_id - 1].contDamage)) { henchmen_data[item.data.henchmen_id - 1].contDamage = false; }

      if (t(update_list[cat("Flash", "-", map_id, "-", dungeon_id, "-", item.index)])) {
        const flashNode = item.nodes[hash("level/flash")];

        gui.set_color(flashNode, vmath.vector4(1, 1, 1, 0.25));
        gui.animate(flashNode, "color", vmath.vector4(1, 1, 1, 0), gui.EASING_OUTSINE, 0.2);
        update_list[cat("Flash", "-", map_id, "-", dungeon_id, "-", item.index)] = false;
      }

      if (t(vfx_list[cat("level", "-", map_id, "-", dungeon_id, "-", item.index)])) {
        const vfx = vfx_list[cat("level", "-", map_id, "-", dungeon_id, "-", item.index)];
        const vfxNode = item.nodes[hash("level/vfx")];
        gui.set_enabled(vfxNode, true);
        gui.set_texture(vfxNode, vfx.texture);
        gui.play_flipbook(vfxNode, vfx.flipbook);
        delete vfx_list[cat("level", "-", map_id, "-", dungeon_id, "-", item.index)];
      }

      if (t(vfx_list[cat("shake", "-", map_id, "-", dungeon_id, "-", item.index)])) {
        const vfx = vfx_list[cat("shake", "-", map_id, "-", dungeon_id, "-", item.index)]; void vfx;
        play_shake(item.nodes[hash("level/bg")], levelPos, 0.5, [item.nodes[hash("level/progress/stencil")], item.nodes[hash("level/glint")], item.nodes[hash("level/flash")]], [levelPos, levelPos, levelPos], 1);
        for (let r = 1; r <= len(item.data.Loot_Table); r++) {
          const resource = item.data.Loot_Table[r - 1];
          vfx_list[cat("shake", "-", resource.Option.Stat)] = true;
        }
        delete vfx_list[cat("shake", "-", map_id, "-", dungeon_id, "-", item.index)];
      }

      const stencilNode = item.nodes[hash("level/progress/stencil")];
      const barNode = item.nodes[hash("level/bg")];
      const barSize = gui.get_size(barNode);
      barSize.x = (gui.get_position(item.nodes[hash("loot/root")]).x - gui.get_position(item.nodes[hash("level/bg")]).x) / gui.get_scale(item.nodes[hash("level/bg")]).x;
      gui.set_size(item.nodes[hash("level/bg")], barSize);
      gui.set_size(item.nodes[hash("level/progress/bg")], barSize);

      const henchmenTextNode = item.nodes[hash("henchmen/icon/text")];
      const henchmenTextPos = gui.get_position(henchmenTextNode);

      const previousHenchmen = item.index > 1;
      let previousHenchmenId = 1;
      if (previousHenchmen) {
        previousHenchmenId = map_data[dungeon_id - 1].Levels[item.index - 1 - 1].Henchmen.id;
      }

      gui.set_enabled(henchmenTextNode, previousHenchmen);
      henchmenTextPos.x = gui.get_position(item.nodes[hash("level/bg")]).x + (barSize.x * gui.get_scale(item.nodes[hash("level/bg")]).x) - 25;
      gui.set_position(henchmenTextNode, henchmenTextPos);
      gui.set_text(henchmenTextNode, cat("+", actions.display_number(henchmen_data[item.data.henchmen_id - 1].Size)));

      const henchmenTextWidth = gui.get_text_metrics_from_node(henchmenTextNode).width;
      const henchmenIconNode = item.nodes[hash("henchmen/icon")];
      const henchmenIconPos = gui.get_position(henchmenIconNode);
      gui.set_position(henchmenIconNode, vmath.vector3(-henchmenTextWidth, henchmenIconPos.y, henchmenIconPos.z));
      if (t(henchmen_data[previousHenchmenId - 1].Icon)) {
        // The scene tints this node black, which suited the line sketches the
        // icons used to be; the painted symbols want their own colours.
        gui.set_color(henchmenIconNode, vmath.vector4(1, 1, 1, 1));
        actions.set_item_icon(henchmenIconNode, henchmen_data[previousHenchmenId - 1].Icon);
      }

      // Widen the action label to the free span of the bar so multi-word
      // labels sit cleanly without colliding with the "+N" crew badge.
      const nameNode = item.nodes[hash("level/name")];
      if (!t(name_sizes.get(nameNode))) { name_sizes.set(nameNode, gui.get_size(nameNode)); }
      const nameSize = vmath.vector3(name_sizes.get(nameNode));
      const barLeft = gui.get_position(barNode).x;
      const barWidth = barSize.x * gui.get_scale(barNode).x;
      const iconWidth = gui.get_size(henchmenIconNode).x * gui.get_scale(henchmenIconNode).x;
      const rightLimit = previousHenchmen
        ? (henchmenTextPos.x - henchmenTextWidth - iconWidth - 12)
        : (barLeft + barWidth - 16);
      nameSize.x = Math.max(nameSize.x, (rightLimit - gui.get_position(nameNode).x) / gui.get_scale(nameNode).x);
      gui.set_size(nameNode, nameSize);

      let progress = item.data.Damage / item.data.Health;

      if (item.data.State === "Disabled") {

        gui.set_size(stencilNode, vmath.vector3(barSize.x * progress, barSize.y, barSize.z));
        progress = 0;
        gui.set_text(item.nodes[hash("level/bg/unlock/text")], loc.get("RESOURCE_UNLOCK_MESSAGE", [actions.display_number(item.data.Prereq.amount), loc.get(resource_data[item.data.Prereq.unit].Name), loc.get(item.data.Name)]));
        gui.play_flipbook(item.nodes[hash("level/bg")], "tinyfancybutton_darkgrey");
      } else if (item.data.State === "Inactive") {

        gui.set_size(stencilNode, vmath.vector3(barSize.x * progress, barSize.y, barSize.z));

        gui.play_flipbook(item.nodes[hash("level/progress/bg")], "tinyfancybutton_grey");
        gui.set_position(item.nodes[hash("level/glint")], vmath.vector3(0, 0, 0));
        if (gui.get_flipbook(item.nodes[hash("level/glint")]) === hash("button_glint_static")) {
          gui.play_flipbook(item.nodes[hash("level/glint")], "button_glint");
        }
      } else if (item.data.State === "Active") {
        gui.play_flipbook(item.nodes[hash("level/progress/bg")], "tinyfancybutton_blue");
        gui.play_flipbook(item.nodes[hash("level/bg")], "tinyfancybutton_darkgrey");
        if (t(item.data.contDamage)) {

          const anim = gui.get_flipbook(item.nodes[hash("level/progress/scrolling/1")]);
          if (anim === hash("button_scrolling_static")) {
            for (let x = 1; x <= 9; x++) {
              gui.play_flipbook(item.nodes[hash(cat("level/progress/scrolling/", x))], "button_scrolling");
            }
          }
          gui.set_size(stencilNode, barSize);
        } else {
          if (t(henchmen_data[item.data.henchmen_id - 1].nextupdate)) {
            let debugInfo = "";
            debugInfo = cat(debugInfo, Math.floor(item.data.Damage), "/", item.data.Health);

            // Damage already landed on the level, plus what the henchman has
            // chipped off since its last tick. Both are fractions of full
            // Health, so they add: scaling the time term by the remaining
            // fraction would count the damage twice and stall the bar after
            // a hero power lands a chunk of Damage mid-cycle.
            const dps = Math.max(0.0001, henchmen_data[item.data.henchmen_id - 1].dps * actions.henchmen_rate(henchmen_data[item.data.henchmen_id - 1]));
            const damageProgress = item.data.Damage / item.data.Health;
            const elapsed = os.clock() + defsave.get("Currency", "BonusTime") - henchmen_data[item.data.henchmen_id - 1].lastupdated;
            const timeProgress = elapsed * dps / item.data.Health;
            const totalProgress = Math.min(1, Math.max(0, damageProgress + timeProgress));

            const timeRemaining = (1 - totalProgress) * item.data.Health / dps;
            const secondsRemaining = cat(Math.max(0, Math.ceil(timeRemaining * 10) / 10), "s");


            gui.set_size(stencilNode, vmath.vector3(barSize.x * totalProgress, barSize.y, barSize.z));

            if (t(isDebug)) {
              debugInfo = cat(" (", debugInfo, ") ", Math.floor(damageProgress * 10) / 10, " - ", Math.floor(timeProgress * 10) / 10, " - ", Math.floor(totalProgress * 100) / 100);
              debugInfo = cat(debugInfo, " : ", henchmen_data[item.data.henchmen_id - 1].dps);
              gui.set_text(item.nodes[hash("time/count")], cat(secondsRemaining, debugInfo));
              const textSize = gui.get_text_metrics_from_node(item.nodes[hash("time/count")]);
              const padding = Math.max(gui.get_position(item.nodes[hash("time/count")]).x, -gui.get_position(item.nodes[hash("time/count")]).x) * 2;
              const timeCountBarSize = gui.get_size(item.nodes[hash("time/count/bg")]);
              timeCountBarSize.x = textSize.width + padding;
              gui.set_size(item.nodes[hash("time/count/bg")], timeCountBarSize);
            }
          }
        }
      }
    }
  }

  const CRIT_POPUP_TIME = 1.4;
  const CRIT_POPUP_FADE = 0.5;

  function hide_node(self: any, url: any, property?: any) {
    gui.set_enabled(url, false);
  }

  function set_resources(item: any) {

    gui.set_enabled(item.nodes[hash("loot/root")], item.data.State !== "Disabled");

    if (item.data.Stat !== "Disabled") {


      for (let n = 1; n <= 5; n++) {
        gui.set_enabled(item.nodes[hash(cat("loot/icon/", n))], n <= len(item.data.Loot_Table));
        gui.set_enabled(item.nodes[hash(cat("loot/bg/", n))], n <= len(item.data.Loot_Table));
      }


      const resourceNum = Math.min(5, len(item.data.Loot_Table));
      const resourceRootPosX = gui.get_position(item.nodes[hash("loot/bg/1")]).x * resourceNum;
      gui.set_position(item.nodes[hash("loot/root")], vmath.vector3(resourceRootPos.x - (resourceRootPosX * resourceRootScale.x), resourceRootPos.y, resourceRootPos.z));

      if (!isnil(item.data.Loot_Table)) {
        for (let n = 1; n <= maxResourceSlots; n++) {
          if (n <= len(item.data.Loot_Table)) {
            const stat = item.data.Loot_Table[n - 1].Option.Stat;



            gui.set_text(item.nodes[hash(cat("loot/name/", n))], "");


            const resourceCount = resource_data[stat].Count;
            gui.set_text(item.nodes[hash(cat("loot/count/", n))], actions.display_number(resourceCount));

            if (!pause) {

              if (t(vfx_list[cat("resource", "-", stat)])) {
                const vfx = vfx_list[cat("resource", "-", stat)];
                const vfxNode = item.nodes[hash(cat("loot/vfx/", n))];
                gui.set_enabled(vfxNode, true);
                gui.set_texture(vfxNode, vfx.texture);
                gui.play_flipbook(vfxNode, vfx.flipbook);
                delete vfx_list[cat("resource", "-", stat)];
              }

              if (t(vfx_list[cat("shake", "-", stat)])) {
                const vfx = vfx_list[cat("shake", "-", stat)]; void vfx;
                gui.set_position(item.nodes[hash(cat("loot/frame/bg/", n))], vmath.vector3());
                play_shake(item.nodes[hash(cat("loot/frame/bg/", n))], lootFramePos[n - 1], 0.25, [], [], 1);
                delete vfx_list[cat("shake", "-", stat)];
              }

              const progbgNode = item.nodes[hash(cat("loot/progress/bg/", n))];
              const progbarNode = item.nodes[hash(cat("loot/progress/bar/", n))];
              const progbarSize = gui.get_size(progbgNode);
              let prog = 0;
              if (!isnil(resource_data[stat].Progress)) {
                prog = Math.max(0, resource_data[stat].Progress);
              }

              gui.set_size(progbarNode, vmath.vector3(progbarSize.x * prog, progbarSize.y, progbarSize.z));

              if (t(item.data.Loot_Table[n - 1].Option.Icon)) {

                let frameColor = "darkbrown";
                let itemColor = "brown";
                let barColor = "green";
                const itemIcon = item.data.Loot_Table[n - 1].Option.Icon;
                if (t(bonusxp_data) && t(bonusxp_data[stat])) {
                  const bonusAmount = bonusxp_data[stat].Total - bonusxp_data[stat].Collected;
                  if (bonusAmount > 0) {
                    frameColor = "green"; itemColor = "green"; barColor = "gold";
                    gui.set_enabled(item.nodes[hash(cat("loot/bonusxp/bg/", n))], true);
                    gui.set_text(item.nodes[hash(cat("loot/bonusxp/text/", n))], bonusAmount * bonusxp_data[stat].Value);
                  } else {
                    gui.set_enabled(item.nodes[hash(cat("loot/bonusxp/bg/", n))], false);
                  }
                } else {
                  gui.set_enabled(item.nodes[hash(cat("loot/bonusxp/bg/", n))], false);
                }
                gui.play_flipbook(item.nodes[hash(cat("loot/frame/bg/", n))], cat("tinyfancypanel_", frameColor));
                gui.play_flipbook(item.nodes[hash(cat("loot/item/bg/", n))], cat("tinyfancypanel_", itemColor));
                gui.play_flipbook(item.nodes[hash(cat("loot/progress/bar/", n))], cat("flatcolor_", barColor));

                actions.set_item_icon(item.nodes[hash(cat("loot/icon/", n))], itemIcon);
              }


              if (t(update_list[stat])) {
                const pos = gui.get_position(item.nodes[hash(cat("loot/icon/", n))]);
                const iconNode = item.nodes[hash(cat("loot/icon/", n))];
                const frameNode = item.nodes[hash(cat("loot/frame/bg/", n))]; void frameNode;
                const countNode = item.nodes[hash(cat("loot/count/", n))];
                const critNode = item.nodes[hash(cat("loot/crit/", n))];
                const rotation = M.random(-6, 6); void rotation;


                gui.set_position(iconNode, vmath.vector3(pos.x, resourceIconPos.y + 80, pos.z));
                gui.animate(iconNode, "position.y", resourceIconPos.y, gui.EASING_OUTBOUNCE, 0.5);


                const countPos = gui.get_position(countNode);
                gui.set_enabled(critNode, true);
                let num = update_list[stat].amount;
                if (t(update_list[stat].bonus)) {
                  if (update_list[stat].bonus > 0) {
                    G.textColor = vmath.vector4(1, 0, 0, 1);
                    num = num + update_list[stat].bonus;
                  }
                }
                let textColor = "BrightYellow";
                let startPos = 0;
                let offset = 0;
                if (num > 0) {
                  audio.playDropAdded(map_id, dungeon_id, t(item.data.contDamage));
                  gui.set_text(critNode, cat("+", actions.display_number(num)));
                  startPos = 60;
                  offset = 120;
                } else {
                  textColor = "BrightRed";
                  gui.set_text(critNode, actions.display_number(num));
                  startPos = 60;
                  offset = 120;
                }
                gui.set_color(critNode, actions.get_color(textColor));
                gui.set_position(critNode, vmath.vector3(countPos.x, countPos.y + startPos, countPos.z));
                // Long enough to read: rise, then fade out over the last half second.
                gui.animate(critNode, "position.y", countPos.y + offset, gui.EASING_OUTSINE, CRIT_POPUP_TIME, 0, hide_node);
                gui.animate(critNode, "color.w", 0, gui.EASING_INQUAD, CRIT_POPUP_FADE, CRIT_POPUP_TIME - CRIT_POPUP_FADE);


                gui.set_scale(countNode, vmath.vector3(3, 3, 3));
                gui.animate(countNode, "color", vmath.vector3(1, 1, 1), gui.EASING_OUTSINE, 0.5);
                gui.animate(countNode, "scale", vmath.vector3(1.75, 1.75, 1.75), gui.EASING_OUTSINE, 0.5);


                delete update_list[stat];
              }
            }
          }
        }
      }
    }
  }

  function getSinglePurchaseCost(initialCost: number, costBase: number, currentCount: number) {
    return initialCost * Math.pow(costBase, currentCount + 1);
  }
  void getSinglePurchaseCost;

  function getMaxNumberOfAffordableBuildings(money: number, singlePurchaseCost: number, costBase: number) {
    if (singlePurchaseCost > money) { return 0; }
    const result = Math.log(1 + ((costBase - 1) * money / singlePurchaseCost)) / Math.log(costBase);
    return result;
  }
  void getMaxNumberOfAffordableBuildings;

  function get_maxPurchasableHenchmen(henchmen_id: any) {
    let result: any = undefined;
    const continue_ = true; void continue_;
    const henchmen = henchmen_data[henchmen_id - 1];
    const costMultiplier = defsave.get("Stats", "costMultiplier"); void costMultiplier;

    if (t(henchmen.BuyCosts)) {
      for (const [, cost] of pairs<any>(henchmen.BuyCosts)) {
        let resourceTotal: any = 0;
        if (cost.savefile === "Resources") {
          resourceTotal = defsave.get(cost.savefile, cost.index).Count;
        } else if (cost.savefile === "Henchmen") {
          resourceTotal = defsave.get(cost.savefile, cost.index).Size;
        } else {
          resourceTotal = defsave.get(cost.savefile, cost.index);
        }

        const baseamount = cost.baseamount * actions.hire_cost_factor();
        if (baseamount > resourceTotal) { return 0; }

        let num = 0;

        if (cost.message_id === "update_resources") {

          num = Math.floor(resourceTotal / baseamount);
        } else if (cost.savefile === "Henchmen") {
          num = Math.floor((resourceTotal - 1) / baseamount);
        } else {
          num = Math.floor(resourceTotal / baseamount);
        }

        if (isnil(result)) { result = num; }
        if (num < result) { result = num; }
      }
    }

    result = Math.max(0, t(result) ? result : 0);
    return Math.floor(result);
  }

  function get_buyStateMaxPurchase(henchmen_id: any, num: any, state: any) {
    assert(state, "State missing");
    num = t(num) ? num : 0;
    if (num <= 0) { return 0; }
    if (state === "1") {
      num = Math.min(num, 1);
    } else if (state === "10%") {
      num = Math.ceil(num * 0.1);
    } else if (state === "25%") {
      num = Math.ceil(num * 0.25);
    } else if (state === "50%") {
      num = Math.ceil(num * 0.5);
    } else if (state === "OCD") {

      let total = 10;
      while (((henchmen_data[henchmen_id - 1].Size + num) / total) > 1) { total = total * 10; }
      let multiple = 0;
      const increment = Math.max(10, total / 10);
      while (Math.floor((henchmen_data[henchmen_id - 1].Size + num) / increment) * increment >= multiple + increment) { multiple = multiple + increment; }


      if ((multiple - henchmen_data[henchmen_id - 1].Size) <= num) {
        num = multiple - henchmen_data[henchmen_id - 1].Size;
      } else {
        num = 0;
      }
    }
    return Math.max(0, num);
  }

  function get_nextHenchmenPurchase(henchmen_id: any, num: any, state: any, maxBuy: any) {
    num = t(num) ? num : 1;

    if (state === "OCD") {
      let result = 0;
      while (result === 0) {
        result = get_buyStateMaxPurchase(henchmen_id, num, state);
        let total = 1;
        const size = henchmen_data[henchmen_id - 1].Size;
        while (((size + num) / total) > 1) { total = total * 10; }
        const increment = Math.max(1, total / 100);
        num = num + increment;
      }
      return result;
    } else {
      return get_buyStateMaxPurchase(henchmen_id, num, state);
    }
  }

  const BUYSTATE_UNLOCK_RANK = 3;

  function buystate_unlocked(): boolean {
    if (chapter0.active()) return false;
    const rank = defsave.get("Stats", "Rank");
    return t(rank) && rank >= BUYSTATE_UNLOCK_RANK;
  }

  function set_buystate(item: any) {
    const bs = defsave.get("Stats", "buyStates")[item.data.buyState - 1];
    gui.set_text(item.nodes[hash("buystate/text")], S.upper(loc.get("BUYSTATE_TEXT", [t(bs) ? bs : "1"])));
  }

  // Keyed by buybutton/bg node: remembers the scene's narrow width and the full
  // span covering buystate/bg while the buy-state toggle is locked.
  const buybutton_layouts = new Map<Node, { baseSize: any; fullWidth: number; baseTextSize: any }>();

  function layout_buybutton(item: any, showToggle: boolean) {
    const bg = item.nodes[hash("buybutton/bg")];
    const label = item.nodes[hash("buybutton/text")];
    let layout = buybutton_layouts.get(bg);
    if (!layout) {
      const baseSize = gui.get_size(bg);
      const buyPos = gui.get_position(bg);
      const buyScale = gui.get_scale(bg);
      const toggle = item.nodes[hash("buystate/bg")];
      const togglePos = gui.get_position(toggle);
      const toggleSize = gui.get_size(toggle);
      const toggleScale = gui.get_scale(toggle);
      const span = (togglePos.x + toggleSize.x * toggleScale.x - buyPos.x) / buyScale.x;
      layout = {
        baseSize: baseSize,
        fullWidth: Math.max(baseSize.x, span),
        baseTextSize: gui.get_size(label),
      };
      buybutton_layouts.set(bg, layout);
    }
    const width = showToggle ? layout.baseSize.x : layout.fullWidth;
    gui.set_size(bg, vmath.vector3(width, layout.baseSize.y, layout.baseSize.z));
    gui.set_size(label, vmath.vector3(layout.baseTextSize.x + (width - layout.baseSize.x), layout.baseTextSize.y, layout.baseTextSize.z));
  }

  /* Hire button layout: one row with "HIRE [hireling icon] X[count]" left-justified
  and the costs right-justified, each cost showing its icon above its amount
  (red when short). With nothing affordable the count reads X0, while the costs
  show the price of one. */
  const HIRE_PAD_LEFT = 16;
  const HIRE_PAD_RIGHT = 16;
  const HIRE_LEFT_SCALE = 0.88;
  const HIRE_WORD_ICON_GAP = 14;
  const HIRE_ICON_COUNT_GAP = 8;
  const HIRE_ICON_SIZE = 28;
  const HIRE_MID_GAP = 14;
  const HIRE_COST_ICON = 28;
  const HIRE_COST_GAP = 6;
  const HIRE_COST_COL_GAP = 12;
  const HIRE_COST_MIN_COL_GAP = 4;
  const HIRE_COST_MIN_COL = 34;
  const HIRE_COST_SCALE = 0.58;
  const HIRE_CENTER_Y = 8;
  const HIRE_COST_ICON_Y = 18;
  const HIRE_COST_TEXT_Y = -3;
  const HIRE_SHORT_COLOR = vmath.vector4(1, 0.45, 0.4, 1);
  const HIRE_OK_COLOR = vmath.vector4(1, 1, 1, 1);
  const HIRE_DISABLED_COLOR = vmath.vector4(1, 1, 1, 0.75);
  const ICON_DISCOVERED = vmath.vector4(1, 1, 1, 1);
  // Black at half strength: a flat silhouette that reads dark grey on the grey tab.
  const ICON_UNDISCOVERED = vmath.vector4(0, 0, 0, 0.5);
  const ICON_GREY_TEXTURE = "map"; // main has no room; the _grey frames live here
  const ICON_SIZE = vmath.vector3(52, 52, 0);
  const ICON_LIFT = 4; // centres the icon on the tab's face
  // Keyed by node (Lua userdata keys compare by identity).
  const hire_rows = new Map<Node, any>();

  function hirecost_icon(cost: any): any {
    if (cost.savefile === "Resources") {
      const r = at(resource_data, cost.index);
      return t(r) ? r.Icon : r;
    } else if (cost.savefile === "Henchmen") {
      const h = at(henchmen_data, cost.index);
      return t(h) ? h.Icon : h;
    } else if (cost.index === "Followers") {
      return { texture: "main", flipbook: "pawn" };
    }
    return undefined;
  }

  // What you have to spend, counted the way get_maxPurchasableHenchmen does.
  function hirecost_held(cost: any) {
    if (cost.savefile === "Resources") {
      return defsave.get(cost.savefile, cost.index).Count;
    } else if (cost.savefile === "Henchmen") {
      return defsave.get(cost.savefile, cost.index).Size - 1;
    } else {
      return defsave.get(cost.savefile, cost.index);
    }
  }

  // Single row: "HIRE [hireling icon] X[num]" on the left, stacked icon-over-number costs on the right.
  function set_hirecosts(item: any, nextPurchase: number, affordable: boolean) {
    const bg = item.nodes[hash("buybutton/bg")];
    const label = item.nodes[hash("buybutton/text")];
    const hench = henchmen_data[item.data.henchmen_id - 1];
    const buyCosts = hench.BuyCosts;
    const costs: any = t(buyCosts) ? buyCosts : [];
    const costCount = Math.max(1, nextPurchase);

    let row = hire_rows.get(bg);
    if (!t(row)) {
      const baseScale = gui.get_scale(label);
      const leftScale = vmath.mul(baseScale, HIRE_LEFT_SCALE);
      const textScale = vmath.mul(baseScale, HIRE_COST_SCALE);
      gui.set_pivot(label, gui.PIVOT_W);
      gui.set_line_break(label, false);
      gui.set_scale(label, leftScale);

      const hireIcon = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(HIRE_ICON_SIZE, HIRE_ICON_SIZE, 0));
      gui.set_pivot(hireIcon, gui.PIVOT_W);
      gui.set_parent(hireIcon, bg);

      const hireCount = gui.new_text_node(vmath.vector3(0, 0, 0), "");
      gui.set_font(hireCount, gui.get_font(label));
      gui.set_pivot(hireCount, gui.PIVOT_W);
      gui.set_scale(hireCount, leftScale);
      gui.set_color(hireCount, gui.get_color(label));
      gui.set_layer(hireCount, gui.get_layer(label));
      gui.set_parent(hireCount, bg);

      row = {
        slots: [],
        baseScale: baseScale,
        leftScale: leftScale,
        textScale: textScale,
        hireIcon: hireIcon,
        hireCount: hireCount,
      };
      hire_rows.set(bg, row);
    }

    // Left side: HIRE [hireling icon] X[number]
    const leftColor = affordable ? HIRE_OK_COLOR : HIRE_DISABLED_COLOR;
    gui.set_text(label, "HIRE");
    gui.set_color(label, leftColor);
    gui.set_text(row.hireCount, cat("X", actions.display_number(nextPurchase)));
    gui.set_color(row.hireCount, leftColor);
    const hasHireIcon = t(hench.Icon) && t(hench.Icon.texture) && hench.Icon.flipbook !== "";
    gui.set_enabled(row.hireIcon, hasHireIcon);

    for (let c = len(row.slots) + 1; c <= len(costs); c++) {
      const slot: any = {};
      slot.text = gui.new_text_node(vmath.vector3(0, 0, 0), "");
      gui.set_font(slot.text, gui.get_font(label));
      gui.set_pivot(slot.text, gui.PIVOT_CENTER);
      gui.set_scale(slot.text, row.textScale);
      gui.set_parent(slot.text, bg);
      slot.icon = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(HIRE_COST_ICON, HIRE_COST_ICON, 0));
      gui.set_pivot(slot.icon, gui.PIVOT_CENTER);
      gui.set_parent(slot.icon, bg);
      row.slots[c - 1] = slot;
    }

    // Fill in cost texts and icons first so we can measure the right-side block.
    let visibleSlots = 0;
    let sumColWidths = 0;
    for (let c = 1; c <= len(row.slots); c++) {
      const slot = row.slots[c - 1];
      const cost = costs[c - 1];
      const icon = t(cost) ? hirecost_icon(cost) : cost;
      slot.visible = !isnil(cost);
      slot.hasIcon = !isnil(icon);
      gui.set_enabled(slot.text, slot.visible);
      gui.set_enabled(slot.icon, slot.visible && slot.hasIcon);
      if (slot.visible) {
        const amount = Math.ceil(cost.baseamount * costCount * actions.hire_cost_factor());
        gui.set_text(slot.text, actions.display_number(amount));
        gui.set_color(slot.text, hirecost_held(cost) >= amount ? HIRE_OK_COLOR : HIRE_SHORT_COLOR);
        gui.set_scale(slot.text, row.textScale);
        if (slot.hasIcon) {
          actions.set_item_icon(slot.icon, icon);
        }
        slot.textWidth = gui.get_text_metrics_from_node(slot.text).width * row.textScale.x;
        slot.colWidth = Math.max(slot.hasIcon ? HIRE_COST_MIN_COL : 0, slot.textWidth);
        sumColWidths = sumColWidths + slot.colWidth;
        visibleSlots = visibleSlots + 1;
      }
    }

    const bgWidth = gui.get_size(bg).x;
    const availWidth = bgWidth - HIRE_PAD_LEFT - HIRE_PAD_RIGHT;
    const discounted = actions.hire_cost_factor() < 1;
    const ledgerSize = HIRE_ICON_SIZE;
    const ledgerWidth = discounted ? (ledgerSize + HIRE_COST_GAP) : 0;

    // Measure left group at default leftScale.
    gui.set_scale(label, row.leftScale);
    gui.set_scale(row.hireCount, row.leftScale);
    const hireWordW = gui.get_text_metrics_from_node(label).width * row.leftScale.x;
    const hireCountW = gui.get_text_metrics_from_node(row.hireCount).width * row.leftScale.x;
    const baseLeftW = hireWordW + (hasHireIcon ? (HIRE_WORD_ICON_GAP + HIRE_ICON_SIZE + HIRE_ICON_COUNT_GAP) : HIRE_ICON_COUNT_GAP) + hireCountW;

    // Choose column gap, shrinking it if needed before scaling the left group.
    let colGap = HIRE_COST_COL_GAP;
    let rightW = sumColWidths + Math.max(0, visibleSlots - 1) * colGap + ledgerWidth;
    if (visibleSlots > 1 && baseLeftW + HIRE_MID_GAP + rightW > availWidth) {
      const maxGaps = availWidth - baseLeftW - HIRE_MID_GAP - sumColWidths - ledgerWidth;
      colGap = Math.max(HIRE_COST_MIN_COL_GAP, maxGaps / (visibleSlots - 1));
      rightW = sumColWidths + (visibleSlots - 1) * colGap + ledgerWidth;
    }

    // If still tight (e.g. very long numbers + 4 costs + Ledger), shrink left side slightly to prevent overlap.
    let leftFactor = 1;
    if (baseLeftW > 0 && baseLeftW + HIRE_MID_GAP + rightW > availWidth) {
      leftFactor = Math.max(0.65, (availWidth - HIRE_MID_GAP - rightW) / baseLeftW);
    }
    const curLeftScale = vmath.mul(row.leftScale, leftFactor);
    const curHireIcon = HIRE_ICON_SIZE * leftFactor;
    const curWordIconGap = HIRE_WORD_ICON_GAP * leftFactor;
    const curIconCountGap = HIRE_ICON_COUNT_GAP * leftFactor;
    gui.set_scale(label, curLeftScale);
    gui.set_scale(row.hireCount, curLeftScale);
    if (hasHireIcon) {
      gui.set_size(row.hireIcon, vmath.vector3(curHireIcon, curHireIcon, 0));
      actions.set_item_icon(row.hireIcon, hench.Icon);
    }

    // Place left group left-justified.
    let lx = HIRE_PAD_LEFT;
    gui.set_position(label, vmath.vector3(lx, HIRE_CENTER_Y, 0));
    lx = lx + hireWordW * leftFactor;
    if (hasHireIcon) {
      lx = lx + curWordIconGap;
      gui.set_position(row.hireIcon, vmath.vector3(lx, HIRE_CENTER_Y, 0));
      lx = lx + curHireIcon + curIconCountGap;
    } else {
      lx = lx + curIconCountGap;
    }
    gui.set_position(row.hireCount, vmath.vector3(lx, HIRE_CENTER_Y, 0));

    // Place cost columns right-justified, icon above number.
    const costBlockW = sumColWidths + Math.max(0, visibleSlots - 1) * colGap;
    let rx = bgWidth - HIRE_PAD_RIGHT - costBlockW;

    // Ledger Goldwhistle signs off every discounted hire with his face.
    if (discounted) {
      if (!t(row.ledger)) {
        row.ledger = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(ledgerSize, ledgerSize, 0));
        gui.set_texture(row.ledger, "main");
        gui.play_flipbook(row.ledger, "patron_ledgergoldwhistle");
        gui.set_pivot(row.ledger, gui.PIVOT_E);
        gui.set_parent(row.ledger, bg);
        gui.set_layer(row.ledger, gui.get_layer(label));
      }
      gui.set_enabled(row.ledger, true);
      gui.set_position(row.ledger, vmath.vector3(rx - HIRE_COST_GAP, HIRE_CENTER_Y, 0));
    } else if (t(row.ledger)) {
      gui.set_enabled(row.ledger, false);
    }

    for (let c = 1; c <= len(row.slots); c++) {
      const slot = row.slots[c - 1];
      if (slot.visible) {
        const colCenterX = rx + slot.colWidth / 2;
        if (slot.hasIcon) {
          gui.set_position(slot.icon, vmath.vector3(colCenterX, HIRE_COST_ICON_Y, 0));
          gui.set_position(slot.text, vmath.vector3(colCenterX, HIRE_COST_TEXT_Y, 0));
        } else {
          gui.set_position(slot.text, vmath.vector3(colCenterX, HIRE_CENTER_Y, 0));
        }
        rx = rx + slot.colWidth + colGap;
      }
    }
  }

  function set_buybutton(item: any) {
    const unlocked = buystate_unlocked();
    layout_buybutton(item, unlocked);

    const bs = unlocked ? defsave.get("Stats", "buyStates")[item.data.buyState - 1] : "1";
    const buyState = t(bs) ? bs : "1";
    const maxPurchase = get_maxPurchasableHenchmen(item.data.Henchmen.id);
    const nextPurchase = get_nextHenchmenPurchase(item.data.Henchmen.id, maxPurchase, buyState, maxPurchase);

    const affordable = get_buyStateMaxPurchase(item.data.Henchmen.id, maxPurchase, buyState) > 0;
    if (affordable) {
      gui.play_flipbook(item.nodes[hash("buybutton/bg")], "tinyfancybutton_orange");
    } else {
      gui.play_flipbook(item.nodes[hash("buybutton/bg")], "tinyfancybutton_darkgrey");
    }

    gui.set_enabled(item.nodes[hash("buybutton/progress/stencil")], false);
    if (buyState === "OCD") {
      const progress = maxPurchase / nextPurchase;
      gui.set_enabled(item.nodes[hash("buybutton/progress/stencil")], progress > 0 && progress < 1);
      const barSize = gui.get_size(item.nodes[hash("buybutton/bg")]);
      gui.set_size(item.nodes[hash("buybutton/progress/stencil")], vmath.vector3(barSize.x * progress, barSize.y, barSize.z));
    }

    set_hirecosts(item, nextPurchase, affordable);
  }

  /* Unlock meter. "100 Carrots needed" alone doesn't say whether that means
  holding 100 or having collected 100 over time. It means holding them (the
  check is the current Count, and unlocking spends nothing), so show the count
  held against the amount needed. Built at runtime, one per list slot, as
  children of the slot's unlock text so they scroll and clip with it. It is
  drawn like a level's progress bar: a sliced button frame for the track and
  another, clipped to the progress, for the fill. While it shows, the text
  widens to the panel and the two sit centred in it together. */
  const UNLOCK_METER_WIDTH = 440;
  const UNLOCK_METER_HEIGHT = 40;
  const UNLOCK_METER_GAP = 12;
  const UNLOCK_TEXT_WIDTH = 680;
  // The frames are drawn at half scale, as the level bars are, so their
  // corners keep the size they have there.
  const UNLOCK_METER_SCALE = 0.5;
  const UNLOCK_METER_SLICE = vmath.vector4(16, 22, 32, 42);
  // Keyed by node (Lua userdata keys compare by identity).
  const unlock_meters = new Map<Node, any>();

  function set_unlockmeter(item: any, visible: boolean) {
    const textNode = item.nodes[hash("unlock/text")];
    let meter = unlock_meters.get(textNode);
    if (!t(meter)) {
      if (!visible) { return; }
      const scale = gui.get_scale(textNode);
      const w = UNLOCK_METER_WIDTH / UNLOCK_METER_SCALE;
      const h = UNLOCK_METER_HEIGHT / UNLOCK_METER_SCALE;
      meter = {};
      meter.scale = scale;
      meter.text_pos = gui.get_position(textNode);
      meter.text_size = gui.get_size(textNode);
      meter.back = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(w, h, 0));
      gui.set_texture(meter.back, "main");
      gui.play_flipbook(meter.back, "tinyfancybutton_grey");
      gui.set_slice9(meter.back, UNLOCK_METER_SLICE);
      gui.set_color(meter.back, vmath.vector4(0.45, 0.45, 0.45, 1));
      gui.set_scale(meter.back, vmath.vector3(UNLOCK_METER_SCALE / scale.x, UNLOCK_METER_SCALE / scale.y, 1));
      gui.set_parent(meter.back, textNode);
      meter.clip = gui.new_box_node(vmath.vector3(-w / 2, 0, 0), vmath.vector3(0, h, 0));
      gui.set_pivot(meter.clip, gui.PIVOT_W);
      gui.set_clipping_mode(meter.clip, gui.CLIPPING_MODE_STENCIL);
      gui.set_clipping_visible(meter.clip, false);
      gui.set_parent(meter.clip, meter.back);
      meter.fill = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(w, h, 0));
      gui.set_pivot(meter.fill, gui.PIVOT_W);
      gui.set_texture(meter.fill, "main");
      gui.set_slice9(meter.fill, UNLOCK_METER_SLICE);
      gui.set_parent(meter.fill, meter.clip);
      // Centred on the frame's face, which sits above its darker bottom lip.
      meter.label = gui.new_text_node(vmath.vector3(0, 15, 0), "");
      gui.set_font(meter.label, gui.get_font(textNode));
      gui.set_scale(meter.label, vmath.vector3(1.5, 1.5, 1));
      gui.set_outline(meter.label, vmath.vector4(0, 0, 0, 1));
      gui.set_parent(meter.label, meter.back);
      unlock_meters.set(textNode, meter);
    }
    gui.set_enabled(meter.back, visible);
    if (!visible) {
      gui.set_size(textNode, meter.text_size);
      gui.set_position(textNode, meter.text_pos);
      return;
    }

    const needed = item.data.Prereq.amount;
    const cnt = resource_data[item.data.Prereq.unit].Count;
    const held = t(cnt) ? cnt : 0;
    const progress = Math.min(1, Math.max(0, held / needed));
    const w = UNLOCK_METER_WIDTH / UNLOCK_METER_SCALE;
    const h = UNLOCK_METER_HEIGHT / UNLOCK_METER_SCALE;

    gui.set_size(textNode, vmath.vector3(UNLOCK_TEXT_WIDTH / meter.scale.x, meter.text_size.y, 0));
    const textHeight = gui.get_text_metrics_from_node(textNode).height * meter.scale.y;
    // Centre the text and the bar as one block on the panel's middle.
    const centre = gui.get_position(item.nodes[hash("unlock/bg")]).y;
    const block = textHeight + UNLOCK_METER_GAP + UNLOCK_METER_HEIGHT;
    gui.set_position(textNode, vmath.vector3(meter.text_pos.x, centre + block / 2 - textHeight / 2, meter.text_pos.z));
    gui.set_position(meter.back, vmath.vector3(0, -(textHeight / 2 + UNLOCK_METER_GAP + UNLOCK_METER_HEIGHT / 2) / meter.scale.y, 0));

    gui.set_size(meter.clip, vmath.vector3(w * progress, h, 0));
    gui.play_flipbook(meter.fill, progress >= 1 ? "tinyfancybutton_green" : "tinyfancybutton_orange");
    gui.set_text(meter.label, cat(actions.display_number(Math.min(held, needed)), " / ", actions.display_number(needed)));
  }


  /* An enemy row (gdd/enemy-events.md): the enemy's card with how many are
  left, a health bar that drains as the heroes' damage lands, and the loot a
  kill drops. Only the front row is fought; the rows below wait their turn in
  grey. */
  const ENEMY_BAR = "tinyfancybutton_red";
  const ENEMY_BOSS_BAR = "tinyfancybutton_purple";
  const ENEMY_WAITING_BAR = "tinyfancybutton_grey";
  const enemy_slide: any = { key: undefined, count: 0 };
  /* A hit plays as beats, each long enough to read: the hit itself (the
  power's effect), then the damage (its number, the bar sliding down), then on
  a kill the death (bar empty, the enemy reels, the count drops), and only then
  does the next enemy step up with its bar filling in. The fight underneath has
  already happened; the row just shows it in that order. */
  const BEAT_DAMAGE = 0.4; // after the hit lands
  const BAR_SLIDE = 0.4;
  const BEAT_DEATH = 1.1;
  const BEAT_NEXT = 1.8;
  const BAR_REFILL = 0.4;
  const row_beats: Record<string, any> = {}; // "map-dungeon-level" -> the beat playing on that row
  const row_shares: Record<string, any> = {}; // "map-dungeon-level" -> the health share last drawn
  let row_count: any; // a number rising off a row's bar, defined with the hero effects
  const count_scales = new Map<Node, any>(); // count text node -> its scene scale, which a kill pops from
  const BEAT_WHITE = vmath.vector4(1, 1, 1, 1);
  const BEAT_GOLD = vmath.vector4(1, 0.84, 0.3, 1);
  const name_sizes = new Map<Node, any>(); // level name node -> its scene size, which enemy rows widen

  // What is left of the front enemy's health, as a share: the Damage already on
  // the row plus what the crew's tick has done since it last landed.
  function enemy_health(item: any) {
    const enemy = henchmen_data[item.data.henchmen_id - 1];
    let done = (t(item.data.Damage) ? item.data.Damage : 0) / item.data.Health;
    if (item.data.State === "Active" && t(enemy.lastupdated) && t(enemy.dps)) {
      const dps = Math.max(0.0001, enemy.dps * actions.henchmen_rate(enemy));
      const elapsed = os.clock() + defsave.get("Currency", "BonusTime") - enemy.lastupdated;
      done = done + Math.max(0, elapsed) * dps / item.data.Health;
    }
    // A tick can be due with more than one kill in it: show the next enemy's.
    if (done >= 1) { done = done - Math.floor(done); }
    return 1 - done;
  }

  function ease(a: number, b: number, tt: number) {
    tt = Math.max(0, Math.min(1, tt));
    return a + (b - a) * (1 - (1 - tt) * (1 - tt));
  }

  // Plays the beat on a row this frame: fires each beat's effects once, and
  // returns the health share to draw, or nil when no beat is playing.
  function play_beat(item: any, rowKey: string): any {
    const beat = row_beats[rowKey];
    if (!t(beat)) { return undefined; }
    const tt = os.clock() - beat.start; // `t` in the Lua
    const nodes = item.nodes;
    const bar = nodes[hash("level/bg")];
    if (tt >= BEAT_DAMAGE && !t(beat.damaged)) {
      beat.damaged = true;
      row_count(bar, cat("-", actions.display_number(Math.floor(beat.amount + 0.5))), BEAT_WHITE, 1.2);
      update_list[cat("Flash", "-", rowKey)] = true;
    }
    if (t(beat.kill) && tt >= BEAT_DEATH && !t(beat.dead)) {
      beat.dead = true;
      beat.count = beat.left;
      const portrait = nodes[hash("henchmen/portrait")];
      gui.cancel_animation(portrait, "color");
      gui.set_color(portrait, vmath.vector4(1, 0.25, 0.25, 1));
      gui.animate(portrait, "color", vmath.vector4(1, 1, 1, 1), gui.EASING_INQUAD, BEAT_NEXT - BEAT_DEATH);
      play_shake(portrait, gui.get_position(portrait), 0.4, [], [], 1);
      const size = nodes[hash("henchmen/size")];
      let scale = count_scales.get(size);
      if (!t(scale)) {
        scale = gui.get_scale(size);
        count_scales.set(size, scale);
      }
      gui.cancel_animation(size, "scale");
      gui.set_scale(size, vmath.mul(scale, 1.6));
      gui.animate(size, "scale", scale, gui.EASING_OUTBACK, 0.35);
      if (beat.left <= 0) {
        row_count(bar, S.upper(loc.get("ENEMY_DEFEATED")), BEAT_GOLD, t(beat.boss) ? 1.4 : 1.1);
      }
    }
    const ends = t(beat.kill) ? BEAT_NEXT + BAR_REFILL : BEAT_DAMAGE + BAR_SLIDE;
    if (tt >= ends) {
      delete row_beats[rowKey];
      return undefined;
    }
    if (tt < BEAT_DAMAGE) { return beat.old; }
    if (!t(beat.kill)) { return ease(beat.old, beat.after, (tt - BEAT_DAMAGE) / BAR_SLIDE); }
    if (tt < BEAT_NEXT) { return ease(beat.old, 0, (tt - BEAT_DAMAGE) / BAR_SLIDE); }
    if (beat.left <= 0) { return 0; }
    return ease(0, enemy_health(item), (tt - BEAT_NEXT) / BAR_REFILL);
  }

  function set_enemyrow(item: any) {
    const nodes = item.nodes;
    const enemy = henchmen_data[item.data.henchmen_id - 1];
    const front = item.data.State === "Active" || item.data.State === "Dying";

    gui.set_enabled(nodes[hash("henchmen/panel/bg")], true);
    gui.set_enabled(nodes[hash("henchmen/progress/bg")], false);
    gui.set_enabled(nodes[hash("henchmen/shadow/bg")], false);
    gui.set_enabled(nodes[hash("henchmen/lock")], false);
    gui.set_enabled(nodes[hash("henchmen/lvlupglint")], false);
    gui.set_enabled(nodes[hash("henchmen/lvlupbox")], false);
    gui.play_flipbook(nodes[hash("henchmen/portrait")], enemy.Portrait.flipbook);
    const beat = row_beats[cat(map_id, "-", dungeon_id, "-", item.data.level_id)];
    gui.set_text(nodes[hash("henchmen/size")], cat("x", actions.display_number(t(beat) && t(beat.count) ? beat.count : enemy.Size)));
    // Just the count: an enemy card needs no symbol beside it.
    set_size_icon(item, undefined);

    let name = loc.get(item.data.Name);
    if (t(enemy.Boss)) { name = cat(S.upper(loc.get("ENEMY_BOSS")), ": ", name); }
    const nameNode = nodes[hash("level/name")];
    gui.set_text(nameNode, name);
    gui.set_position(nameNode, dungeonLevelNamePosition);

    gui.set_enabled(nodes[hash("activate/bg")], false);
    gui.set_enabled(nodes[hash("level/bg/unlock/text")], false);
    gui.set_enabled(nodes[hash("time/count/bg")], false);
    gui.set_enabled(nodes[hash("level/progress/scrolling/root")], false);
    gui.set_enabled(nodes[hash("level/glint")], false);
    // The "+N" crew from the row below means nothing here.
    gui.set_enabled(nodes[hash("henchmen/icon/text")], false);
    gui.set_enabled(nodes[hash("buystate/bg")], false);

    if (!pause) {
      const flash = cat("Flash", "-", map_id, "-", dungeon_id, "-", item.data.level_id);
      if (t(update_list[flash])) {
        gui.set_color(nodes[hash("level/flash")], vmath.vector4(1, 1, 1, 0.35));
        gui.animate(nodes[hash("level/flash")], "color", vmath.vector4(1, 1, 1, 0), gui.EASING_OUTSINE, 0.2);
        update_list[flash] = false;
      }
      const barNode = nodes[hash("level/bg")];
      const barSize = gui.get_size(barNode);
      barSize.x = (gui.get_position(nodes[hash("loot/root")]).x - gui.get_position(barNode).x) / gui.get_scale(barNode).x;
      gui.set_size(barNode, barSize);
      gui.set_size(nodes[hash("level/progress/bg")], barSize);
      // The name runs the bar's length, so "Giant Rats" stays on one line.
      if (!t(name_sizes.get(nameNode))) { name_sizes.set(nameNode, gui.get_size(nameNode)); }
      const nameSize = vmath.vector3(name_sizes.get(nameNode));
      nameSize.x = (barSize.x * gui.get_scale(barNode).x - 40) / gui.get_scale(nameNode).x;
      gui.set_size(nameNode, nameSize);
      gui.play_flipbook(barNode, "tinyfancybutton_darkgrey");
      gui.play_flipbook(nodes[hash("level/progress/bg")], !front ? ENEMY_WAITING_BAR : t(enemy.Boss) ? ENEMY_BOSS_BAR : ENEMY_BAR);
      // Every row shows its own health: a power can land on the rows below the
      // front too. While a hit or a kill is animating the bar, it is left alone.
      const stencil = nodes[hash("level/progress/stencil")];
      const rowKey = cat(map_id, "-", dungeon_id, "-", item.data.level_id);
      let share = play_beat(item, rowKey);
      if (!t(share)) { share = enemy_health(item); }
      row_shares[rowKey] = share;
      gui.set_size(stencil, vmath.vector3(barSize.x * share, barSize.y, barSize.z));
      // A field hero's power plays its effect on the row it hits.
      const key = cat("level", "-", map_id, "-", dungeon_id, "-", item.data.level_id);
      if (t(vfx_list[key])) {
        const vfx = vfx_list[key];
        const vfxNode = nodes[hash("level/vfx")];
        gui.set_enabled(vfxNode, true);
        gui.set_texture(vfxNode, vfx.texture);
        gui.play_flipbook(vfxNode, vfx.flipbook);
        delete vfx_list[key];
      }
      const shake = cat("shake", "-", map_id, "-", dungeon_id, "-", item.data.level_id);
      if (t(vfx_list[shake])) {
        play_shake(barNode, levelPos, 0.5, [stencil, nodes[hash("level/glint")], nodes[hash("level/flash")]], [levelPos, levelPos, levelPos], 1);
        delete vfx_list[shake];
      }
    }

    // Nothing to hire, and the fighting is the heroes' to do.
    gui.set_enabled(nodes[hash("buybutton/bg")], false);
  }

  // When a row is cleared the list closes up; the rows below slide up into
  // place rather than jumping.
  function slide_enemy_rows(list: any) {
    const key = cat(map_id, "-", dungeon_id);
    const count = len(level_list);
    if (enemy_slide.key === key && count < enemy_slide.count) {
      for (let i = 1; i <= len(list.items); i++) {
        const item = list.items[i - 1];
        const root = item.root;
        const at = gui.get_position(root);
        gui.cancel_animation(root, "position.y");
        gui.set_position(root, vmath.vector3(at.x, at.y - list.item_size.y, at.z));
        gui.animate(root, "position.y", at.y, gui.EASING_OUTBACK, 0.45);
      }
    }
    enemy_slide.key = key; enemy_slide.count = count;
  }

  // The name of the boss whose trophy opens an enemy location: the last row of
  // the location before.
  function opening_boss(location: any) {
    const before = map_data[location - 1 - 1];
    const name = t(before) ? loc.get(before.Levels[len(before.Levels) - 1].Name) : before;
    return t(name) ? name : "";
  }

  function level_bar_label(item: any): any {
    const key = item.data.Name;
    if (typeof key === "string") {
      const prefix = item.data.State === "Active" ? "LEVEL_WORKING_" : "LEVEL_ACTION_";
      const actionKey = S.gsub(key, "^LEVEL_NAME_", prefix)[0];
      if (actionKey !== key) {
        const label = loc.get(actionKey);
        if (t(label) && label !== actionKey) { return label; }
      }
    }
    return loc.get(key);
  }

  function update_dungeon(list: any) {
    dungeon_list = list;
    remember_scroll(list);
    const enemies = actions.enemy_map(map_id);
    if (t(enemies)) { slide_enemy_rows(list); }
    for (let i = 1; i <= len(list.items); i++) {
      const item = list.items[i - 1];
      // The list only hands its slots new data when its length changes, and
      // an enemy column changes rows (one cleared, the next unlocked) at the
      // same length, so each slot reads its row afresh every frame.
      if (t(enemies)) { item.data = level_list[item.index - 1]; }
      let showMeter = false;
      if (!isnil(item.data) && item.index <= len(map_data[dungeon_id - 1].Levels)) {

        gui.set_enabled(item.nodes[hash("level/display")], !(item.data.State === "Invisible" || item.data.State === "Locked" || item.data.State === "Explorable"));
        gui.set_enabled(item.nodes[hash("unlock/bg")], item.data.State === "Explorable");

        gui.set_enabled(item.nodes[hash("unlock/text")], item.data.State === "Locked" || item.data.State === "Explorable");
        if (item.data.State === "Locked") {
          if (t(enemies) && item.data.level_id === 1 && dungeon_id > 1) {
            gui.set_text(item.nodes[hash("unlock/text")], loc.get("ENEMY_UNLOCK_MESSAGE", [opening_boss(dungeon_id), loc.get(map_data[dungeon_id - 1].Name)]));
          } else {
            gui.set_text(item.nodes[hash("unlock/text")], loc.get("RESOURCE_UNLOCK_MESSAGE", [actions.display_number(item.data.Prereq.amount), loc.get(resource_data[item.data.Prereq.unit].Name), loc.get(item.data.Name)]));
          }
          showMeter = true;
        }

        if (item.data.State === "Explorable") {
          if (!t(item.data.wasClickedOpen) && resource_data[item.data.Prereq.unit].Count >= item.data.Prereq.amount) {
            gui.play_flipbook(item.nodes[hash("unlock/bg")], "tinyfancybutton_orange");
            gui.set_text(item.nodes[hash("unlock/text")], loc.get(t(enemies) && item.data.level_id === 1 ? "ENEMY_STORM" : "CLICK_TO_UNLOCK_DUNGEON_LEVEL"));
          } else {
            gui.play_flipbook(item.nodes[hash("unlock/bg")], "tinyfancypanel_darkgrey");
            gui.set_text(item.nodes[hash("unlock/text")], loc.get("RESOURCE_UNLOCK_MESSAGE", [actions.display_number(item.data.Prereq.amount), loc.get(resource_data[item.data.Prereq.unit].Name), loc.get(item.data.Name)]));
            showMeter = true;
          }
        }


        if (t(enemies) && !(item.data.State === "Invisible" || item.data.State === "Locked" || item.data.State === "Explorable")) {
          set_enemyrow(item);
          set_resources(item);
          herofx_row(item);
        } else if (!(item.data.State === "Invisible" || item.data.State === "Locked" || item.data.State === "Explorable")) {
          // The buy-state toggle unlocks at Chapter 3; until then the hire button spans its slot.
          const showBuystate = buystate_unlocked();
          gui.set_enabled(item.nodes[hash("buystate/bg")], showBuystate);
          gui.set_enabled(item.nodes[hash("buybutton/bg")], true);
          const nameNode = item.nodes[hash("level/name")];
          if (t(name_sizes.get(nameNode))) { gui.set_size(nameNode, name_sizes.get(nameNode)); }
          gui.set_text(nameNode, level_bar_label(item)); //.. " - " ..  item.data.State) --.. " " .. item.data.Damage .. "/" .. item.data.Health)
          set_henchmen(item); //set henchman portrait
          set_resources(item); //set resources
          set_progressbar(item); //set progressbar
          set_buybutton(item); //set buybutton
          if (showBuystate) { set_buystate(item); } //set buyState button
          herofx_row(item); //standing hero marks
        }
      }
      if (t(item.nodes)) { set_unlockmeter(item, showMeter); }
    }
  }

  /* Chapter 0's pointer. This screen frames its own targets (a level to
  search, a hire button, the Cellar's door) and says every step's words; the
  header frames the quest notice and the chapter button. */
  let dungeon_list: any = undefined;
  const ch0_frame = make_frame();
  const ch0_caption = make_caption(() => fx_parent(), function () {
    const [ww, wh] = window.get_size();
    return fx_local(vmath.vector3(ww / 2, wh * 0.3, 0));
  }, 620, () => fx_layer_name());

  function fx_layer_name() { return gui.get_layer(gui.get_node("dungeon/name/1")) as any; }

  function chapter0_guide() {
    const home = map_id === 1 && dungeon_id === 1 && !t(actions.event_on_map(map_id));
    const step = home ? chapter0.step((id: number) => get_maxPurchasableHenchmen(id) > 0) : undefined;
    if (!t(step)) { ch0_frame.hide(); ch0_caption.hide(); return; }
    ch0_caption.say(loc.get(step!.text));
    let target: any = undefined;
    if (t(step!.level) && t(dungeon_list)) {
      for (let i = 1; i <= len(dungeon_list.items); i++) {
        const item = dungeon_list.items[i - 1];
        if (item.index === step!.level && t(item.nodes)) {
          // A level is searched with its play button, shown while it is idle.
          const name = step!.kind === "hire" ? "buybutton/bg" : step!.kind === "explore" ? "unlock/bg" : "activate/bg";
          target = item.nodes[hash(name)];
        }
      }
    }
    if (t(target)) { ch0_frame.point(target); } else { ch0_frame.hide(); }
  }

  function refresh_herodata() {

    hero_list = [];
    const heroes = actions.clone(defsave.loaded.Hero.data);
    for (let h = 1; h <= len(heroes); h++) {
      const hero = heroes[h - 1];
      if (!isnil(hero.location)) {
        if (hero.location.map_id === map_id && hero.location.dungeon_id === dungeon_id) {
          hero.Type = "hero";
          // Heroes carry no id of their own; hero_list holds clones, so the
          // Hero.data index travels with the row instead.
          hero.hero_index = h;
          T.insert(hero_list, hero);
        }
      }
    }

    if (len(map_data) > 0) {
      update_party();
    }

  }
  function set_map_position(duration?: any) {
    duration = t(duration) ? duration : 0.5;

    const mapNode = gui.get_node("map/bg");
    let nodePos: any;
    if (t(map_data[dungeon_id - 1].MapY)) {
      // Event locations have no scene node: MapY is how far down their
      // painting the location sits, as a fraction of its height.
      const h = gui.get_size(mapNode).y;
      const pivot = gui.get_pivot(mapNode);
      const top = (pivot === gui.PIVOT_N || pivot === gui.PIVOT_NW || pivot === gui.PIVOT_NE) ? 0
        : (pivot === gui.PIVOT_S || pivot === gui.PIVOT_SW || pivot === gui.PIVOT_SE) ? h
        : h / 2;
      nodePos = vmath.vector3(0, top - map_data[dungeon_id - 1].MapY * h, 0);
    } else {
      nodePos = gui.get_position(gui.get_node(map_data[dungeon_id - 1].Node));
    }
    const offset = gui.get_size(gui.get_node("map/stencil")).y / 2;
    const mapPos = vmath.vector3(0, -nodePos.y * gui.get_scale(mapNode).y + offset, 0);
    gui.animate(mapNode, "position.y", mapPos.y, gui.EASING_INOUTSINE, duration);
  }

  function refresh_mapdata() {

    assert(map_id, "Map id missing");
    map_data = [];
    map_data = defsave.get("Map", map_id);
    assert(map_data, "Map data not loaded");
    henchmen_data = actions.clone(defsave.loaded.Henchmen.data);


    const henchman = {}; void henchman;
    for (const [, item] of pairs<any>(henchmen_data)) {
      if (item.map_id === map_id) {
        map_data[item.dungeon_id - 1].Levels[item.level_id - 1].Henchmen = item;
      }
    }

    const tabBarWidth = gui.get_size(gui.get_node("panel_title/bg")).x;
    const tabPosition = gui.get_position(gui.get_node("dungeon/tab/1"));
    let tabOffset = 0;
    for (let i = 1; i <= 5; i++) {
      const dunegonTabNode = gui.get_node(cat("dungeon/tab/", i));
      const dungeonNameNode = gui.get_node(cat("dungeon/name/", i));
      const dungeonIconNode = gui.get_node(cat("dungeon/icon/", i));
      const dunegonTabNotificationNode = gui.get_node(cat("dungeon/tab/notification/bg/", i));
      const dunegonTabNotificationTextNode = gui.get_node(cat("dungeon/tab/notification/text/", i));

      // Event maps have a single dungeon, so its tab spans the bar alone.
      // Chapter 0 shows the Farm's alone.
      gui.set_enabled(dunegonTabNode, !isnil(map_data[i - 1]) && !(chapter0.active() && i > 1));
      if (!isnil(map_data[i - 1])) {

      const unlocked = t(map_data[i - 1].Levels[0].wasClickedOpen) || map_data[i - 1].Levels[0].State === "Explorable";
      // Discovered: the level before it has been reached, so the player has
      // seen the place on the map, or they are looking at it now.
      // A chapter clears wasClickedOpen but never the first level's Level,
      // which unlock_level sets once, so it remembers earlier chapters too.
      const discovered = unlocked || i === dungeon_id || t(map_data[Math.max(1, i - 1) - 1].Levels[2].wasClickedOpen)
        || (t(map_data[i - 1].Levels[0].Level) ? map_data[i - 1].Levels[0].Level : 0) > 0;
      // The tab in focus is always tan, like every other in-focus tab.
      if (unlocked || i === dungeon_id) {
        gui.play_flipbook(dunegonTabNode, "tab_brown");
      } else {
        gui.play_flipbook(dunegonTabNode, "tab_darkgrey");
      }

      // Full colour once unlocked, greyed out while discovered but locked,
      // and a flat dark-grey silhouette before that, so no tab is blank. The
      // scene tints these nodes black, which suited the shipped line sketches,
      // so the colour is always set here.
      gui.set_enabled(dungeonIconNode, !isnil(map_data[i - 1].Icon));
      if (t(map_data[i - 1].Icon)) {
        if (unlocked || !discovered) {
          gui.set_texture(dungeonIconNode, map_data[i - 1].Icon.texture);
          gui.play_flipbook(dungeonIconNode, map_data[i - 1].Icon.flipbook);
        } else {
          gui.set_texture(dungeonIconNode, ICON_GREY_TEXTURE);
          gui.play_flipbook(dungeonIconNode, cat(map_data[i - 1].Icon.flipbook, "_grey"));
        }
        gui.set_color(dungeonIconNode, discovered ? ICON_DISCOVERED : ICON_UNDISCOVERED);
      }
      // Sized to sit inside the tab's face; at the scene's 64 units the art
      // ran down over the strip under the tabs.
      gui.set_size_mode(dungeonIconNode, gui.SIZE_MODE_MANUAL);
      gui.set_size(dungeonIconNode, ICON_SIZE);
      const iconY = dungeonNamePosition.y + ICON_LIFT;
      gui.set_enabled(dungeonNameNode, i === dungeon_id);
      gui.set_position(dunegonTabNode, vmath.vector3((tabSize.x * (i - 1)) - (tabBarWidth / 2) + tabOffset, tabPosition.y, tabPosition.z));
      const iconSize = gui.get_size(dungeonIconNode);
      if (i === dungeon_id) {
        tabOffset = tabBarWidth - (tabSize.x * Math.min(5, chapter0.active() ? 1 : len(map_data)));
        let tabName = S.upper(loc.get(map_data[i - 1].Name));
        // An enemy location shows which wave it is on.
        if (t(actions.enemy_map(map_id)) && (t(map_data[i - 1].Wave) ? map_data[i - 1].Wave : 1) > 1) {
          tabName = cat(tabName, " - ", S.upper(loc.get("ENEMY_WAVE", [map_data[i - 1].Wave])));
        }
        gui.set_text(dungeonNameNode, tabName);
        const dungeonNameNodeMetrics = gui.get_text_metrics_from_node(dungeonNameNode);
        gui.set_position(dungeonNameNode, vmath.vector3((-(dungeonNameNodeMetrics.width + dungeonNamePosition.x) / 2) + dungeonNamePosition.x + (iconSize.x / 2) + (tabOffset / 2), dungeonNamePosition.y, dungeonNamePosition.z));
        gui.set_position(dungeonIconNode, vmath.vector3(-(dungeonNamePosition.x / 2) + (iconSize.x / 2) + (tabOffset / 2) - (dungeonNameNodeMetrics.width / 2), iconY, dungeonNamePosition.z));
        gui.set_size(dunegonTabNode, vmath.vector3(tabOffset + tabSize.x, tabSize.y, tabSize.z));
      } else {
        gui.set_size(dunegonTabNode, vmath.vector3(tabSize.x, tabSize.y, tabSize.z));
        gui.set_position(dungeonIconNode, vmath.vector3((tabSize.x - iconSize.x) / 2, iconY, dungeonNamePosition.z));
      }


      let bonusCounter = 0;
      if (t(bonusxp_data)) {
        const levels = map_data[i - 1].Levels;
        for (let l = 1; l <= len(levels); l++) {
          const level = levels[l - 1];
          for (let r = 1; r <= len(level.Loot_Table); r++) {
            const resource = level.Loot_Table[r - 1];
            if (t(bonusxp_data[resource.Option.Stat])) {
              if (bonusxp_data[resource.Option.Stat].Total - bonusxp_data[resource.Option.Stat].Collected > 0) { bonusCounter = bonusCounter + 1; }
            }
          }
        }
      }
      gui.set_enabled(dunegonTabNotificationNode, bonusCounter > 0);
      const notificationPositionOffset = 4;
      const notificationPosition = gui.get_position(dunegonTabNotificationNode);
      notificationPosition.x = gui.get_size(dunegonTabNode).x - notificationPositionOffset;
      gui.set_position(dunegonTabNotificationNode, notificationPosition);
      gui.set_text(dunegonTabNotificationTextNode, bonusCounter);
      }
    }

    level_list = [];
    level_list = actions.clone(map_data[dungeon_id - 1].Levels);
    // An enemy map's cleared rows leave the list, so each row carries its
    // place in the location.
    for (let i = 1; i <= len(level_list); i++) { const level = level_list[i - 1]; level.level_id = i; }

    for (let i = len(level_list); i >= 1; i--) {
      if (level_list[i - 1].State === "Invisible") {
        const dying = enemy_dying[cat(map_id, "-", dungeon_id, "-", i)];
        if (t(dying) && os.clock() < dying) {
          level_list[i - 1].State = "Dying";
        } else {
          T.remove(level_list, i);
        }
      }
    }
  }


  /* ******************************************
            LIVE EVENTS
  ******************************************** */

  /* On an event map the map strip shows the event's own painting. The
  event's name, time left and chapter are on the header's bar. */
  const WHITE = vmath.vector4(1, 1, 1, 1);

  // The painting each map's strip shows; main-game nodes sit on the shipped one.
  const MAP_ART: Record<number, string> = { 2: "map_weremoon", 3: "map_titanswell", 4: "map_midnight", 5: "map_longnight", 6: "map_blackmaw" };
  let shown_art: any = undefined;

  // Swaps the strip's painting when the map changes. The main map's location
  // nodes are drawn on its painting, so they hide on any other.
  function show_map_art() {
    const art = t(MAP_ART[map_id]) ? MAP_ART[map_id] : "map";
    if (art === shown_art) { return; }
    shown_art = art;
    gui.play_flipbook(gui.get_node("map/bg"), art);
    gui.set_color(gui.get_node("map/bg"), WHITE);
    // loc/city is the capital's marker, which no dungeon owns.
    const markers: any[] = ["loc/city"];
    const main_map = t(defsave.loaded.Map) ? at(defsave.loaded.Map.data, 1) : defsave.loaded.Map;
    const mm = t(main_map) ? main_map : [];
    for (let d = 1; d <= len(mm); d++) {
      const dungeon = mm[d - 1];
      if (t(dungeon.Node) && dungeon.Node !== "") { T.insert(markers, dungeon.Node); }
    }
    for (let m = 1; m <= len(markers); m++) {
      const marker = markers[m - 1];
      gui.set_enabled(gui.get_node(marker), art === "map");
    }
  }

  function refresh_event_ui() {
    if (enabled && t(defsave.loaded.Map)) { show_map_art(); }
  }


  function refresh_all() {
    if (actions.tablelength(defsave.loaded) > 0) {
      if (actions.tablelength(defsave.loaded.Stats) > 0 && actions.tablelength(defsave.loaded.Currency) > 0 && actions.tablelength(defsave.loaded.Loot) > 0) {

        G.Loot = {};
        G.Loot = actions.clone(defsave.loaded.Loot.data);
        G.loot_player = G.Loot.Player;
        loot_items = G.Loot.Items;
        Stats = actions.clone(defsave.loaded.Stats.data); void Stats;
        resource_data = actions.clone(defsave.loaded.Resources.data);
        bonusxp_data = actions.clone(defsave.loaded.Currency.data.Bonusxp);


        refresh_mapdata();
        refresh_herodata();

      }
    }
    update_dungeon(gooey.dynamic_list("dungeon", "dungeon/stencil", "level/root", level_list, G.action_id, G.action, LEVEL_LIST_CONFIG));
  }

  /* ******************************************
            INPUT
  ******************************************** */

  function animate_roster(startPosition: any, endPosition: any, action: any) {
    const rosterNode = gui.get_node("panel_roster/bg");
    const duration = 0.1;
    gui.set_position(rosterNode, startPosition);
    gui.animate(rosterNode, "position.x", endPosition.x, gui.EASING_INOUTSINE, duration, 0, action);
  }

  function animate_roster_enter_left(action?: any) { animate_roster(vmath.vector3(rosterPosition.x - rosterSize.x, rosterPosition.y, rosterPosition.z), rosterPosition, action); }
  function animate_roster_enter_right(action?: any) { animate_roster(vmath.vector3(rosterPosition.x + rosterSize.x, rosterPosition.y, rosterPosition.z), rosterPosition, action); }
  function animate_roster_exit_left(action?: any) { animate_roster(rosterPosition, vmath.vector3(rosterPosition.x - rosterSize.x, rosterPosition.y, rosterPosition.z), action); }
  function animate_roster_exit_right(action?: any) { animate_roster(rosterPosition, vmath.vector3(rosterPosition.x + rosterSize.x, rosterPosition.y, rosterPosition.z), action); }

  function animate_dungeon(startPosition: any, endPosition: any, action: any) {
    const dungeonNode = gui.get_node("dungeon/stencil");
    const duration = 0.1;
    gui.set_position(dungeonNode, startPosition);
    gui.animate(dungeonNode, "position.x", endPosition.x, gui.EASING_INOUTSINE, duration, 0, action);
  }

  function animate_dungeon_enter_left(action?: any) { animate_dungeon(vmath.vector3(dungeonPosition.x - dungeonSize.x, dungeonPosition.y, dungeonPosition.z), dungeonPosition, action); }
  function animate_dungeon_enter_right(action?: any) { animate_dungeon(vmath.vector3(dungeonPosition.x + dungeonSize.x, dungeonPosition.y, dungeonPosition.z), dungeonPosition, action); }
  function animate_dungeon_exit_left(action?: any) { animate_dungeon(dungeonPosition, vmath.vector3(dungeonPosition.x - dungeonSize.x, dungeonPosition.y, dungeonPosition.z), action); }
  function animate_dungeon_exit_right(action?: any) { animate_dungeon(dungeonPosition, vmath.vector3(dungeonPosition.x + dungeonSize.x, dungeonPosition.y, dungeonPosition.z), action); }

  function reset_data() {
    clear_hire_fx();
    resource_data = loadResources();
    vfx_list = {};
    update_list = {};
    for (let i = 1; i <= maxPartySlots; i++) {
      gui.play_flipbook(gui.get_node(cat("hero", i, "/alertglint")), "button_glint");
      gui.play_flipbook(gui.get_node(cat("hero", i, "/lvlupglint")), "button_glint");
    }

    refresh_mapdata();
    msg.post(controller, "update_currentlocation", { map_id: map_id, dungeon_id: dungeon_id });
    restore_scroll();
    update_dungeon(gooey.dynamic_list("dungeon", "dungeon/stencil", "level/root", level_list, G.action_id, G.action, LEVEL_LIST_CONFIG));
  }

  // Global functions: the Lua defines these without `local`, so they live in
  // the shared global table and are looked up there at call time.
  G.on_dungeonbutton_pressed = function (num: any) {
    if (isnil(map_data[num - 1])) { return; }
    if (t(map_data[Math.max(1, num - 1) - 1].Levels[2].wasClickedOpen) || t(map_data[num - 1].Levels[0].wasClickedOpen) || map_data[num - 1].Levels[0].State === "Explorable") {
      const direction = num > dungeon_id;
      dungeon_id = num;
      audio.playUi("tab");
      audio.setLocation(map_id, dungeon_id);
      reset_data();
      for (let level_id = 1; level_id <= 5; level_id++) {
        vfx_list[cat("level", "-", map_id, "-", dungeon_id, "-", level_id)] = { texture: "main", flipbook: "electricity_bar_000" };
      }
      set_map_position();
      if (direction) {
        animate_dungeon_exit_left(function () { animate_dungeon_enter_right(); });
        animate_roster_exit_left(function () { animate_roster_enter_right(); });
      } else {
        animate_dungeon_exit_right(function () { animate_dungeon_enter_left(); });
        animate_roster_exit_right(function () { animate_roster_enter_left(); });
      }
    }
  };

  G.on_dungeon1button_pressed = function (button: any) { if (dungeon_id !== 1) { G.on_dungeonbutton_pressed(1); } };
  G.on_dungeon2button_pressed = function (button: any) { if (dungeon_id !== 2) { G.on_dungeonbutton_pressed(2); } };
  G.on_dungeon3button_pressed = function (button: any) { if (dungeon_id !== 3) { G.on_dungeonbutton_pressed(3); } };
  G.on_dungeon4button_pressed = function (button: any) { if (dungeon_id !== 4) { G.on_dungeonbutton_pressed(4); } };
  G.on_dungeon5button_pressed = function (button: any) { if (dungeon_id !== 5) { G.on_dungeonbutton_pressed(5); } };

  // A press on an enemy row: the card says what the enemy is, and storming
  // opens a location. Loot presses fall through to the shared handling. True if
  // it was handled.
  G.on_enemy_pressed = function (list: any, item: any) {
    const data = item.data, nodes = item.nodes;
    const at = list.action_pos;
    const level_id = data.level_id;
    if (data.State === "Explorable") {
      if (!t(data.wasClickedOpen) && resource_data[data.Prereq.unit].Count >= data.Prereq.amount) {
        audio.playFanfare("level_unlock");
        msg.post(controller, "explore_level", { map_id: map_id, dungeon_id: dungeon_id, level_id: level_id });
      } else {
        audio.playUi("refuse");
      }
      return true;
    }
    if (data.State !== "Active" && data.State !== "Waiting") { return true; }
    if (gui.pick_node(nodes[hash("henchmen/panel/bg")], at.x, at.y)) {
      const enemy = henchmen_data[data.henchmen_id - 1];
      msg.post(controller, "popup_message", { title: enemy.Name, text: enemy.Description });
      return true;
    }
    return !gui.pick_node(nodes[hash("loot/root")], at.x, at.y);
  };

  G.on_level_pressed = function (list: any) {
    // selected_item is a level index, not a slot: slots are recycled as the
    // list scrolls, and scrolled to its end a slot can be an empty padding
    // row, so the tapped slot is found by its index before anything is read.
    let item: any;
    for (let l = 1; l <= len(list.items); l++) {
      const level = list.items[l - 1];
      if (list.selected_item === level.index) {
        item = list.items[l - 1];
        break;
      }
    }
    if (!t(item) || !t(item.data)) { return; }
    if (t(actions.enemy_map(map_id)) && t(G.on_enemy_pressed(list, item))) { return; }
    const unlocked = buystate_unlocked();
    const bs = unlocked ? defsave.get("Stats", "buyStates")[item.data.buyState - 1] : "1";
    const state = t(bs) ? bs : "1";

    const data = item.data;
    const nodes = item.nodes;
    const maxloots = len(data.Loot_Table);
    let lootclicked = 0;
    let collectBonusxp = false;

    if (maxloots >= 1 && buttonFx.pick_node(nodes[hash("loot/frame/bg/1")], list.action_pos.x, list.action_pos.y)) {
      lootclicked = 1;
    } else if (maxloots >= 2 && buttonFx.pick_node(nodes[hash("loot/frame/bg/2")], list.action_pos.x, list.action_pos.y)) {
      lootclicked = 2;
    } else if (maxloots >= 3 && buttonFx.pick_node(nodes[hash("loot/frame/bg/3")], list.action_pos.x, list.action_pos.y)) {
      lootclicked = 3;
    } else if (maxloots >= 4 && buttonFx.pick_node(nodes[hash("loot/frame/bg/4")], list.action_pos.x, list.action_pos.y)) {
      lootclicked = 4;
    } else if (maxloots >= 5 && buttonFx.pick_node(nodes[hash("loot/frame/bg/5")], list.action_pos.x, list.action_pos.y)) {
      lootclicked = 5;
    }

    let bonusdata: any = {};

    if (buttonFx.pick_node(nodes[hash("henchmen/panel/bg")], list.action_pos.x, list.action_pos.y) && t(data.wasClickedOpen)) {
      audio.playUi("tap");
      msg.post(controller, "popup_henchmen", { henchmen_id: data.Henchmen.id });
    } else if (unlocked && buttonFx.pick_node(nodes[hash("buystate/bg")], list.action_pos.x, list.action_pos.y)) {
      audio.playUi("toggle");
      msg.post(controller, "toggle_buystate", { map_id: map_id, dungeon_id: dungeon_id, level_id: list.selected_item });
    } else if (buttonFx.pick_node(nodes[hash("buybutton/bg")], list.action_pos.x, list.action_pos.y) && t(data.wasClickedOpen)) {

      const max = get_maxPurchasableHenchmen(data.Henchmen.id);
      const total = get_buyStateMaxPurchase(data.Henchmen.id, max, state);
      if (total > 0) {
        const amount = get_buyStateMaxPurchase(data.Henchmen.id, get_maxPurchasableHenchmen(data.Henchmen.id), state);
        const followerCost = hire_follower_cost(data.Henchmen.id, amount);
        audio.playHire(amount);
        launch_hire_fx(item, data.Henchmen.id, amount, followerCost);
        msg.post(controller, "buy_henchmen", { amount: amount, henchmen_id: data.Henchmen.id });
      } else {
        audio.playUi("refuse");
      }
    } else if (lootclicked > 0 && t(data.wasClickedOpen)) {
      if (t(bonusxp_data)) {
        if (t(bonusxp_data[data.Loot_Table[lootclicked - 1].Option.Stat])) {
          bonusdata = bonusxp_data[data.Loot_Table[lootclicked - 1].Option.Stat];
          if (bonusdata.Total - bonusdata.Collected > 0) {
            collectBonusxp = true;
          } else {
            audio.playUi("tap");
            msg.post(controller, "popup_resource", { resource_id: data.Loot_Table[lootclicked - 1].Option.Stat });
          }
        }
      }
      if (collectBonusxp === true) {
        audio.playCascadeTick("xp");
        const particlespeed = 1;
        const iconNode = nodes[hash(cat("loot/icon/", lootclicked))];
        const startPos = gui.get_screen_position(iconNode);
        const numParticles = (bonusdata.Total - bonusdata.Collected) * bonusdata.Value;
        let postmsg: any = { receiver: controller, message_id: "mod_xp", message: { amount: 1 } };
        let icon: any = { texture: "reward_icons", flipbook: "reward_xp_icon" };
        // An event's items rank up into its shards, which fly to the header's
        // XP slot: during the event it shows them.
        const shards = actions.event_shards(map_id);
        if (t(shards)) {
          postmsg = { receiver: controller, message_id: "add_resource_quietly", message: { stat: shards, amount: 1 } };
          const event = actions.event_on_map(map_id);
          icon = { texture: "reward_icons", flipbook: t(event.xp_icon) ? event.xp_icon : cat("reward_", shards, "_icon") };
        }
        msg.post(controller, "spawn_particles", { num: numParticles, startPos: startPos, endTarget: "target_xp", time: particlespeed, icon: icon, postmsg: postmsg });
        msg.post(controller, "collect_bonusxp", { statName: data.Loot_Table[lootclicked - 1].Option.Stat, callback: "dungeonmine" });
      } else {

      }
    } else if (data.State === "Inactive" && (buttonFx.pick_node(nodes[hash("activate/bg")], list.action_pos.x, list.action_pos.y) || buttonFx.pick_node(nodes[hash("level/bg")], list.action_pos.x, list.action_pos.y)) && t(data.wasClickedOpen)) {
      audio.playTap(false);
      msg.post(controller, "activate_henchmen", { henchmen_id: data.henchmen_id });
    } else if (data.State === "Explorable" && !t(item.data.wasClickedOpen) && resource_data[item.data.Prereq.unit].Count >= item.data.Prereq.amount) {
      audio.playFanfare("level_unlock");
      msg.post(controller, "explore_level", { map_id: map_id, dungeon_id: dungeon_id, level_id: list.selected_item });
    }
  };

  G.on_herobutton_pressed = function (button: any, slot_id: any, action: any) {
    let hero_id: any = 0;
    for (let h = 1; h <= len(hero_list); h++) {
      const hero = hero_list[h - 1];
      if (hero.location.slot_id === slot_id) {
        hero_id = t(hero.hero_index) ? hero.hero_index : 0;
        break;
      }
    }
    if (hero_id > 0) {
      heropanel.open_detail(hero_id, slot_id);
    } else if (get_numHeroSlots() >= slot_id) {
      heropanel.open_picker(slot_id);
    }
  };

  /* ******************************************
            MESSAGES
  ******************************************** */
  /* ******************************************
            HERO EFFECTS
  ******************************************** */

  /* Every hero power is drawn where it lands (gdd/heroes-roster.md): it
  leaves the hero's card on the map, lands on a level bar, a loot icon or a
  henchman, and its numbers count while the player watches. The controllers
  send hero_fx after each power fires; herofx_play draws it. herofx_row and
  herofx_party keep the standing marks (Mossback's claw ticks, Fizzwick's
  turret, Grisla's hex, Sir Aldous's crest) up to date every frame. */

  const level_rows: any = tracked({}); // level index -> its row in the list, refreshed every frame
  const row_marks = new Map<Node, any>(); // bar node -> { tick, turret } standing marks on a row
  const slot_crests: Record<number, any> = {}; // hero slot -> Sir Aldous's crest node
  let fx_font: any = undefined;

  const FX_WHITE = vmath.vector4(1, 1, 1, 1);
  const FX_CRIMSON = vmath.vector4(0.88, 0.18, 0.24, 1);
  const FX_GHOST = vmath.vector4(0.78, 0.7, 0.9, 0.75);
  const FX_GREEN = vmath.vector4(0.5, 0.9, 0.35, 1);
  const FX_GOLD = vmath.vector4(1, 0.84, 0.3, 1);
  const FX_PINK = vmath.vector4(1, 0.62, 0.78, 1);

  /** Lua `a or b` for a value that may be nil. */
  function or_(a: any, b: any) { return t(a) ? a : b; }

  // Effects draw on the scene's text layer, the top one, so the map, the list
  // and its panels never cover them.
  // Effects hang off the map band's parent, whose transform is a plain one; the
  // scene root carries the fit scale and cannot place a node by screen position.
  function fx_parent() {
    return or_(gui.get_parent(gui.get_node("map/stencil")), gui.get_node("root"));
  }

  function fx_layer(node: any) {
    gui.set_layer(node, gui.get_layer(gui.get_node("dungeon/name/1")));
    return node;
  }

  // Screen positions convert by hand. This engine's set_screen_position gives a
  // new node NaN. The scene is drawn at the uniform fit scale, and the map
  // band's own placement against its parent gives where that parent's origin
  // sits on screen.
  function fx_local(screen_pos: any) {
    const [ww, wh] = window.get_size();
    const scale = Math.min(ww / DESIGN_W, wh / DESIGN_H);
    const map = gui.get_node("map/stencil");
    const at = gui.get_position(map), on = gui.get_screen_position(map);
    const origin = vmath.vector3(on.x - at.x * scale, on.y - at.y * scale, 0);
    return vmath.vector3((screen_pos.x - origin.x) / scale, (screen_pos.y - origin.y) / scale, 0);
  }

  function fx_box(texture: any, flipbook: any, size: number, screen_pos: any, color?: any) {
    const node = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(size, size, 0));
    gui.set_parent(node, fx_parent());
    fx_layer(node);
    gui.set_texture(node, texture);
    gui.play_flipbook(node, flipbook);
    gui.set_position(node, fx_local(screen_pos));
    if (t(color)) { gui.set_color(node, color); }
    return node;
  }

  function fx_text(text: any, screen_pos: any, color?: any, scale?: any) {
    fx_font = "title";
    const node = gui.new_text_node(vmath.vector3(0, 0, 0), text);
    gui.set_font(node, fx_font);
    gui.set_size(node, vmath.vector3(400, 60, 0));
    gui.set_parent(node, fx_parent());
    fx_layer(node);
    gui.set_color(node, or_(color, FX_WHITE));
    gui.set_outline(node, vmath.vector4(0, 0, 0, 1));
    gui.set_scale(node, vmath.vector3(or_(scale, 1), or_(scale, 1), 1));
    gui.set_position(node, fx_local(screen_pos));
    return node;
  }

  function fx_delete(self: any, node: any) { gui.delete_node(node); }

  // Fade out and go, after `delay`.
  function fx_vanish(node: any, delay?: any, duration?: any) {
    gui.animate(node, "color.w", 0, gui.EASING_INQUAD, or_(duration, 0.4), or_(delay, 0), fx_delete);
  }

  function fx_fly(node: any, to_screen: any, duration: number, delay?: any, done?: any) {
    gui.animate(node, "position", fx_local(to_screen), gui.EASING_INOUTQUAD, duration, or_(delay, 0), done);
  }

  // A number that floats up from a point and fades: the count of what changed.
  function fx_count(text: any, screen_pos: any, color: any, delay?: any, scale?: any) {
    // One animation per property: a fade-in here would be cancelled by the
    // fade-out queued below, so the count pops in by scale instead.
    const node = fx_text(text, screen_pos, color, 0.01);
    gui.animate(node, "scale", vmath.vector3(or_(scale, 1.1), or_(scale, 1.1), 1), gui.EASING_OUTBACK, 0.2, or_(delay, 0));
    const p = gui.get_position(node);
    gui.animate(node, "position.y", p.y + 60, gui.EASING_OUTSINE, 1.2, or_(delay, 0));
    fx_vanish(node, or_(delay, 0) + 0.9, 0.4);
    return node;
  }

  function slot_of(hero_id: any): any {
    for (let k = 1; k <= len(hero_list); k++) {
      const hero = hero_list[k - 1];
      if (hero.hero_index === hero_id && t(hero.location)) { return hero.location.slot_id; }
    }
    return undefined;
  }

  function hero_pos(hero_id: any) {
    const slot = slot_of(hero_id);
    if (t(slot)) { return gui.get_screen_position(gui.get_node(cat("hero", slot, "/portrait"))); }
    return gui.get_screen_position(gui.get_node("map/stencil"));
  }

  function row_node(level_id: any, name: string): any {
    const item = level_rows[level_id];
    if (t(item) && t(item.nodes)) { return item.nodes[hash(name)]; }
    return undefined;
  }

  function bar_pos(level_id: any): any {
    const node = row_node(level_id, "level/progress/bg");
    if (t(node)) { return gui.get_screen_position(node); }
    return undefined;
  }

  function loot_pos(stat: any, level_id?: any): any {
    for (const [l, item] of pairs<any>(level_rows)) {
      if ((isnil(level_id) || l === level_id) && t(item.data) && t(item.nodes)) {
        const lt = item.data.Loot_Table;
        for (let n = 1; n <= len(lt); n++) {
          const row = lt[n - 1];
          if (row.Option.Stat === stat) { return gui.get_screen_position(item.nodes[hash(cat("loot/icon/", n))]); }
        }
      }
    }
    return undefined;
  }

  // x along a bar, as a share of its length, in the bar's own space.
  function bar_x(node: any, share: number) {
    const w = gui.get_size(node).x;
    const pivot = gui.get_pivot(node);
    if (pivot === gui.PIVOT_W || pivot === gui.PIVOT_NW || pivot === gui.PIVOT_SW) { return share * w; }
    if (pivot === gui.PIVOT_E || pivot === gui.PIVOT_NE || pivot === gui.PIVOT_SE) { return (share - 1) * w; }
    return (share - 0.5) * w;
  }

  function assigned(name: any): any {
    for (let k = 1; k <= len(hero_list); k++) {
      const hero = hero_list[k - 1];
      if (hero.Name === name) { return hero; }
    }
    return undefined;
  }

  function echo_tint(node: any, message: any) {
    if (t(message.echo)) { gui.set_color(node, FX_GHOST); }
  }

  function resource_icon(stat: any): any {
    const resource = resource_data[stat];
    return t(resource) ? resource.Icon : resource;
  }

  function fly_item(stat: any, from: any, to: any, delay: any, size?: any) {
    const icon = resource_icon(stat);
    if (!t(icon) || !t(from) || !t(to)) { return; }
    const node = fx_box(icon.texture, icon.flipbook, or_(size, 56), from);
    gui.set_scale(node, vmath.vector3(0.2, 0.2, 1));
    gui.animate(node, "scale", vmath.vector3(1, 1, 1), gui.EASING_OUTBACK, 0.25, delay);
    fx_fly(node, to, 0.6, delay, fx_delete);
  }

  const herofx: Record<string, (message: any) => void> = {};

  // Grisla Hexmire: a crimson rune leaps onto every bar, which stays crimson
  // for as long as the curse lasts.
  herofx.hex = function (message: any) {
    const from = hero_pos(message.hero_id);
    const tag = cat("+", Math.floor((message.multiplier - 1) * 100 + 0.5), "%");
    for (const [l, item] of pairs<any>(level_rows)) {
      const to = bar_pos(l);
      if (t(to) && t(item.data) && t(item.data.wasClickedOpen)) {
        const rune = fx_box("power_vfx", "fx_hexrune", 70, from);
        echo_tint(rune, message);
        gui.animate(rune, "rotation.z", 360, gui.EASING_LINEAR, 0.6);
        fx_fly(rune, to, 0.5, 0, function (self: any, node: any) {
          fx_count(tag, gui.get_screen_position(node), FX_CRIMSON);
          fx_vanish(node, 0, 0.3);
        });
      }
    }
  };

  // Brakka Ironjaw: her ram slams each bar in turn, knocking out the same
  // share of every one.
  herofx.breach = function (message: any) {
    const from = hero_pos(message.hero_id);
    const ram = fx_box("power_vfx", "fx_ram", 120, from);
    echo_tint(ram, message);
    const tag = cat("-", Math.floor(message.share * 100 + 0.5), "%");
    let tt = 0; // `t` in the Lua
    const levels = or_(message.levels, []);
    for (let k = 1; k <= len(levels); k++) {
      const l = levels[k - 1];
      const bar = row_node(l, "level/bg");
      const to = bar_pos(l);
      if (t(bar) && t(to)) {
        fx_fly(ram, to, 0.18, tt);
        const chunk = gui.new_box_node(vmath.vector3(bar_x(bar, 0.5), 0, 0), vmath.vector3(gui.get_size(bar).x * message.share, gui.get_size(bar).y, 0));
        gui.set_parent(chunk, bar);
        fx_layer(chunk);
        gui.set_texture(chunk, "main");
        gui.play_flipbook(chunk, "flatcolor_red");
        gui.set_color(chunk, vmath.vector4(1, 1, 1, 0.9));
        gui.set_scale(chunk, vmath.vector3(1, 0.01, 1));
        gui.animate(chunk, "scale.y", 1, gui.EASING_OUTQUAD, 0.05, tt + 0.18);
        fx_vanish(chunk, tt + 0.5, 0.4);
        fx_count(tag, to, FX_CRIMSON, tt + 0.18);
        tt = tt + 0.25;
      }
    }
    fx_vanish(ram, tt, 0.3);
  };

  // Old Mossback: his wolf leaps from his card onto every bar it finishes.
  herofx.pounce = function (message: any) {
    const from = hero_pos(message.hero_id);
    const levels = or_(message.levels, []);
    for (let i = 1; i <= len(levels); i++) {
      const l = levels[i - 1];
      const to = bar_pos(l);
      if (t(to)) {
        const wolf = fx_box("power_vfx", "fx_wolf", 110, from);
        echo_tint(wolf, message);
        gui.animate(wolf, "scale", vmath.vector3(1.3, 1.3, 1), gui.EASING_OUTQUAD, 0.2, (i - 1) * 0.2);
        fx_fly(wolf, to, 0.4, (i - 1) * 0.2, function (self: any, node: any) { fx_vanish(node, 0.1, 0.3); });
      }
    }
  };

  // Fizzwick Cogsworth: a bolt from the turret on the bar, every second.
  herofx.turret = function (message: any) {
    const bar = row_node(message.level_id, "level/bg");
    const marks = t(bar) ? row_marks.get(bar) : bar;
    if (!(t(marks) && t(marks.turret))) { return; }
    const from = gui.get_screen_position(marks.turret);
    const to = bar_pos(message.level_id);
    const bolt = fx_box("main", "particle_blob", 18, from, FX_GOLD);
    fx_fly(bolt, to, 0.25, 0, fx_delete);
    gui.animate(marks.turret, "scale", vmath.vector3(1.12, 0.92, 1), gui.EASING_OUTQUAD, 0.08, 0, undefined, gui.PLAYBACK_ONCE_PINGPONG);
  };

  // Madame Ottoline: the common drop streams into her flask, the rare one
  // streams out into its own icon.
  herofx.transmute = function (message: any) {
    const at_ = hero_pos(message.hero_id);
    const from = loot_pos(message.from, message.from_level);
    const to = loot_pos(message.to, message.to_level);
    for (let i = 1; i <= Math.min(8, message.spent); i++) {
      const icon = resource_icon(message.from);
      if (t(icon) && t(from)) {
        const node = fx_box(icon.texture, icon.flipbook, 44, from);
        fx_fly(node, at_, 0.5, (i - 1) * 0.06, fx_delete);
      }
    }
    const puff = fx_box("power_vfx", "fx_cauldron", 90, at_);
    echo_tint(puff, message);
    gui.set_scale(puff, vmath.vector3(0.2, 0.2, 1));
    gui.animate(puff, "scale", vmath.vector3(1, 1, 1), gui.EASING_OUTBACK, 0.3, 0.55);
    fx_vanish(puff, 1.3, 0.3);
    fx_count(cat(Math.floor(message.rate + 0.5), " -> 1"), at_, FX_GREEN, 0.6);
    for (let i = 1; i <= Math.min(5, message.gain); i++) {
      fly_item(message.to, at_, to, 0.9 + (i - 1) * 0.1, 50);
    }
    if (t(to)) { fx_count(cat("+", actions.display_number(message.gain)), to, FX_GREEN, 1.4); }
    if (t(from)) { fx_count(cat("-", actions.display_number(message.spent)), from, FX_CRIMSON, 0.1); }
  };

  // Captain Hollis: a henchman marches from his card down to a row, which
  // gets a free hire.
  herofx.muster = function (message: any) {
    const from = hero_pos(message.hero_id);
    let to = row_node(message.level_id, "henchmen/panel/bg");
    to = t(to) ? gui.get_screen_position(to) : to;
    if (!t(to)) { return; }
    const hd = henchmen_data[message.henchmen_id - 1];
    const portrait = t(hd) ? hd.Portrait : hd;
    if (t(portrait)) {
      const node = fx_box(portrait.texture, portrait.flipbook, 80, from);
      echo_tint(node, message);
      fx_fly(node, to, 0.7, 0, fx_delete);
    }
    fx_count(cat("+", message.amount, " ", loc.get("HERO_POWER_FREE")), to, FX_PINK, 0.7, 1.2);
  };

  // Lady Vesper: a ghost of the hero she echoes rises from her card.
  herofx.echo = function (message: any) {
    const source = at(defsave.loaded.Hero.data, message.source);
    if (!t(source) || !t(source.Portrait)) { return; }
    const at_ = hero_pos(message.hero_id);
    const ghost = fx_box(source.Portrait.texture, source.Portrait.flipbook, 1, at_, FX_GHOST);
    gui.set_size(ghost, vmath.vector3(200, 100, 0));
    const p = gui.get_position(ghost);
    gui.animate(ghost, "position.y", p.y + 90, gui.EASING_OUTSINE, 1.2);
    fx_vanish(ghost, 0.8, 0.5);
  };

  // Thumper: a rabbit hops down the bars, and every landing hits harder.
  herofx.hop = function (message: any) {
    const rabbit = fx_box("power_vfx", "fx_rabbit", 70, hero_pos(message.hero_id));
    echo_tint(rabbit, message);
    let tt = 0; // `t` in the Lua
    const hops = or_(message.hops, []);
    for (let k = 1; k <= len(hops); k++) {
      const hop = hops[k - 1];
      const to = bar_pos(hop.level_id);
      if (t(to)) {
        fx_fly(rabbit, to, 0.3, tt);
        const p = fx_local(to);
        gui.animate(rabbit, "position.y", p.y + 50, gui.EASING_OUTSINE, 0.15, tt, undefined);
        const dust = fx_box("main", "smoke_puff_000", 40, to);
        gui.set_color(dust, vmath.vector4(1, 0.9, 0.6, 0.8));
        gui.set_scale(dust, vmath.vector3(0.01, 0.01, 1));
        gui.animate(dust, "scale", vmath.vector3(1.8, 1.8, 1), gui.EASING_OUTQUAD, 0.4, tt + 0.3);
        fx_vanish(dust, tt + 0.5, 0.3);
        fx_count(actions.display_number(hop.amount), to, FX_GOLD, tt + 0.3, 1 + Math.min(1, tt));
        tt = tt + 0.35;
      }
    }
    fx_vanish(rabbit, tt, 0.3);
  };

  // Nell Hookline: a bobber drops onto the water on the map, then each catch
  // jumps out and goes where it belongs.
  const CATCH_SPRITE: Record<string, string> = { bottle: "fx_bottle", fish: "fx_fish", chest: "fx_chest" };
  herofx.fish = function (message: any) {
    const rod = hero_pos(message.hero_id);
    let water = gui.get_screen_position(gui.get_node("map/stencil"));
    water = vmath.vector3(water.x + (rod.x < water.x ? 120 : -120), water.y - 40, 0);
    const bobber = fx_box("power_vfx", "fx_bobber", 34, rod);
    echo_tint(bobber, message);
    fx_fly(bobber, water, 0.4, 0);
    const p = fx_local(water);
    gui.animate(bobber, "position.y", p.y - 8, gui.EASING_INOUTSINE, 0.25, 0.45, undefined, gui.PLAYBACK_LOOP_PINGPONG);
    fx_vanish(bobber, 1.6, 0.2);
    const catches = or_(message.catches, []);
    for (let i = 1; i <= len(catches); i++) {
      const catch_ = catches[i - 1];
      const tt = 1.0 + (i - 1) * 0.5; // `t` in the Lua
      const splash = fx_box("main", "smoke_puff_000", 50, water, vmath.vector4(0.7, 0.85, 1, 0.9));
      gui.set_scale(splash, vmath.vector3(0.01, 0.01, 1));
      gui.animate(splash, "scale", vmath.vector3(1.6, 1.6, 1), gui.EASING_OUTQUAD, 0.4, tt);
      fx_vanish(splash, tt + 0.3, 0.3);
      if (catch_.kind === "junk" || catch_.kind === "drops") {
        const icon = resource_icon(catch_.stat);
        if (t(icon)) {
          const node = fx_box(icon.texture, icon.flipbook, 60, water);
          gui.set_scale(node, vmath.vector3(0.01, 0.01, 1));
          gui.animate(node, "scale", vmath.vector3(1, 1, 1), gui.EASING_OUTBACK, 0.3, tt);
          const lp = catch_.kind === "drops" ? loot_pos(catch_.stat) : false;
          const to = t(lp) ? lp : undefined;
          if (t(to)) {
            fx_fly(node, to, 0.6, tt + 0.4, fx_delete);
          } else {
            gui.animate(node, "position.y", p.y + 80, gui.EASING_OUTSINE, 1.0, tt + 0.3);
            fx_vanish(node, tt + 1.0, 0.4);
          }
          const nm = t(resource_data[catch_.stat]) ? loc.get(resource_data[catch_.stat].Name) : resource_data[catch_.stat];
          const name = t(nm) ? nm : "";
          fx_count(cat("+", actions.display_number(catch_.amount), " ", name), water, FX_GREEN, tt + 0.2);
        }
      } else {
        const node = fx_box("power_vfx", CATCH_SPRITE[catch_.kind], catch_.kind === "chest" ? 90 : 70, water);
        gui.set_scale(node, vmath.vector3(0.01, 0.01, 1));
        gui.animate(node, "scale", vmath.vector3(1, 1, 1), gui.EASING_OUTBACK, 0.3, tt);
        fx_vanish(node, tt + 1.2, 0.3);
        if (catch_.kind === "bottle") {
          msg.post(controller, "spawn_particles", { num: Math.min(10, catch_.amount), startPos: water, endTarget: "target_xp", time: 1, icon: { texture: "reward_icons", flipbook: "reward_xp_icon" } });
          fx_count(cat("+", catch_.amount, " XP"), water, FX_GREEN, tt + 0.2);
        } else if (catch_.kind === "fish") {
          msg.post(controller, "spawn_particles", { num: 10, startPos: water, endTarget: "target_followers", time: 1, icon: { texture: "main", flipbook: "pawn" } });
          fx_count(cat("+", actions.display_number(catch_.amount)), water, FX_GREEN, tt + 0.2);
        } else if (catch_.kind === "chest") {
          gui.animate(node, "position", fx_local(gui.get_screen_position(gui.get_node("dungeon/stencil"))), gui.EASING_OUTBACK, 0.5, tt + 0.3);
          gui.animate(node, "scale", vmath.vector3(2.2, 2.2, 1), gui.EASING_OUTBACK, 0.5, tt + 0.3);
          fx_count("+1", water, FX_GOLD, tt + 0.6, 1.6);
        }
      }
    }
  };

  // Wren Lightfoot: notes stream up from her card to the quest she sings
  // about, which the header moves on. With nothing to sing about, her lute
  // rests on her card.
  herofx.ballad = function (message: any) {
    const from = hero_pos(message.hero_id);
    if (t(message.rest)) {
      const lute = fx_box("power_vfx", "fx_lute", 50, from);
      fx_vanish(lute, 1.5, 0.4);
      return;
    }
    const top = vmath.vector3(from.x, gui.get_screen_position(gui.get_node("map/stencil")).y + 400, 0);
    for (let i = 1; i <= 6; i++) {
      const note = fx_box("power_vfx", "fx_note", 36, from);
      echo_tint(note, message);
      const to = vmath.vector3(top.x + M.random(-80, 80), top.y, 0);
      fx_fly(note, to, 0.9, (i - 1) * 0.12, fx_delete);
    }
  };

  // Seraphine Vale: her crystal ball over the loot icon, on a crit she made.
  herofx.lucky = function (message: any) {
    const at_ = loot_pos(message.stat);
    if (!t(at_)) { return; }
    const face = fx_box("main", "patron_seraphinevale", 70, vmath.vector3(at_.x, at_.y + 40, 0));
    gui.set_scale(face, vmath.vector3(0.2, 0.2, 1));
    gui.animate(face, "scale", vmath.vector3(1, 1, 1), gui.EASING_OUTBACK, 0.25);
    fx_vanish(face, 1.0, 0.3);
    fx_count(cat(loc.get("HERO_POWER_LUCKY"), " +", actions.display_number(message.amount)), at_, FX_GREEN, 0.1);
  };

  /* Enemy fights, drawn where they land: the heroes' damage floats off the bar,
  a kill pops the count, a cleared row says so, and a new wave is called out
  over the map. */
  const FX_RED = vmath.vector4(1, 0.35, 0.3, 1); void FX_RED;

  // A number that rises off an enemy row's bar and fades. It hangs off the bar
  // itself, so it lands on the row in the scrolling list.
  row_count = function (bar: any, text: any, color: any, scale: number) {
    const barScale = gui.get_scale(bar);
    const node = gui.new_text_node(vmath.vector3(bar_x(bar, 0.6), -12 / barScale.y, 0), text);
    gui.set_font(node, "title");
    gui.set_parent(node, bar);
    fx_layer(node);
    gui.set_color(node, color);
    gui.set_outline(node, vmath.vector4(0, 0, 0, 1));
    gui.set_scale(node, vmath.vector3(0.01, 0.01, 1));
    const size = vmath.vector3(scale / barScale.x, scale / barScale.y, 1);
    gui.animate(node, "scale", size, gui.EASING_OUTBACK, 0.2);
    // Rises within the bar: the list clips anything above its top row.
    gui.animate(node, "position.y", 14 / barScale.y, gui.EASING_OUTSINE, 1.0);
    fx_vanish(node, 0.7, 0.3);
  };
  G.enemy_fx = function (message: any) {
    if (message.map_id !== map_id || message.dungeon_id !== dungeon_id) { return; }
    if (message.kind === "wave") {
      audio.playEnemyWave(map_id, dungeon_id);
      const at_ = gui.get_screen_position(gui.get_node("map/stencil"));
      fx_count(S.upper(loc.get("ENEMY_NEW_WAVE", [message.wave])), at_, FX_GOLD, 0, 1.3);
      return;
    }
    const item = level_rows[message.level_id];
    if (!(t(item) && t(item.nodes) && t(item.data) && item.data.level_id === message.level_id)) { return; }
    const rowKey = cat(map_id, "-", dungeon_id, "-", message.level_id);
    const level = at(at(defsave.loaded.Map.data, map_id), dungeon_id).Levels[message.level_id - 1];
    if (message.kind === "hit") {
      audio.playEnemyHit(map_id, dungeon_id);
      row_beats[rowKey] = {
        start: os.clock(), amount: message.amount, old: or_(row_shares[rowKey], 1),
        after: Math.max(0, 1 - or_(level.Damage, 0) / level.Health),
      };
    } else if (message.kind === "kill") {
      audio.playEnemyKill(map_id, dungeon_id, t(message.boss));
      let beat = row_beats[rowKey];
      if (!t(beat)) {
        beat = { start: os.clock(), amount: 0, old: or_(row_shares[rowKey], 1), damaged: true };
        row_beats[rowKey] = beat;
      }
      beat.kill = true; beat.left = message.left; beat.boss = message.boss;
      // The count only drops at the death beat.
      beat.count = message.left + message.kills;
      if (message.left <= 0) {
        enemy_dying[rowKey] = os.clock() + ENEMY_DYING_TIME;
      }
    }
  };

  function herofx_play(message: any) {
    if (message.map_id !== map_id || message.dungeon_id !== dungeon_id) { return; }
    if (message.kind === "lucky") {
      audio.playCrit(true, map_id, dungeon_id);
    } else {
      audio.playHeroPower(String(message.kind || ""), map_id, dungeon_id);
    }
    const draw = herofx[message.kind];
    if (t(draw)) {
      let ok = true, err: any;
      try { draw(message); } catch (e) { ok = false; err = (e as Error).message; }
      // PARITY: err is the JS error message, not the Lua one (print only).
      if (!ok) { print("HEROFX", message.kind, err); }
    }
  }

  // Standing marks on a level row, every frame.
  herofx_row = function (item: any) {
    tset(level_rows, or_(item.data.level_id, item.index), item);
    const bar = item.nodes[hash("level/bg")];
    if (!t(bar)) { return; }
    const open = t(item.data.wasClickedOpen) && !t(item.data.isLocked);
    const marks = or_(row_marks.get(bar), {});
    row_marks.set(bar, marks);
    // Grisla's hex lays a crimson wash over every bar while it lasts.
    const hexed = open && actions.hex_multiplier(map_id, dungeon_id) > 1;
    if (hexed && !t(marks.hex)) {
      marks.hex = gui.new_box_node(vmath.vector3(0, 0, 0), gui.get_size(bar));
      gui.set_texture(marks.hex, "main");
      gui.play_flipbook(marks.hex, "flatcolor_red");
      gui.set_pivot(marks.hex, gui.get_pivot(bar));
      gui.set_parent(marks.hex, bar);
      fx_layer(marks.hex);
    }
    if (t(marks.hex)) {
      gui.set_enabled(marks.hex, hexed);
      if (hexed) {
        gui.set_size(marks.hex, gui.get_size(bar));
        gui.set_color(marks.hex, vmath.vector4(1, 1, 1, 0.4 + 0.15 * Math.sin(os.clock() * 6)));
      }
    }
    // Old Mossback marks how far down a bar has to be before his wolf takes it.
    const mossback = assigned("HERO_OLDMOSSBACK_NAME");
    if (t(mossback) && open) {
      const threshold = actions.hero_scale(actions.hero_power_level(mossback.hero_index), 0.10, 0.35);
      if (!t(marks.tick)) {
        marks.tick = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(18, gui.get_size(bar).y + 10, 0));
        gui.set_texture(marks.tick, "power_vfx");
        gui.play_flipbook(marks.tick, "fx_paw");
        gui.set_parent(marks.tick, bar);
        fx_layer(marks.tick);
      }
      gui.set_enabled(marks.tick, true);
      gui.set_position(marks.tick, vmath.vector3(bar_x(bar, 1 - threshold), 0, 0));
      const wounded = t(item.data.Damage) && t(item.data.Health) && item.data.Damage > 0 && (item.data.Health - item.data.Damage) / item.data.Health <= threshold;
      gui.set_size(marks.tick, wounded ? vmath.vector3(34, 34, 0) : vmath.vector3(20, 20, 0));
    } else if (t(marks.tick)) {
      gui.set_enabled(marks.tick, false);
    }
    // Fizzwick's turret sits on the deepest open level.
    const fizzwick = assigned("HERO_FIZZWICKCOGSWORTH_NAME");
    let deepest = 0;
    const levels = map_data[dungeon_id - 1].Levels;
    for (let l = 1; l <= len(levels); l++) {
      const level = levels[l - 1];
      if (!t(level.isLocked) && t(level.wasClickedOpen)) { deepest = l; }
    }
    if (t(fizzwick) && open && item.index === deepest) {
      if (!t(marks.turret)) {
        marks.turret = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(56, 56, 0));
        gui.set_texture(marks.turret, "power_vfx");
        gui.play_flipbook(marks.turret, "fx_turret");
        gui.set_parent(marks.turret, bar);
        fx_layer(marks.turret);
      }
      gui.set_enabled(marks.turret, true);
      gui.set_position(marks.turret, vmath.vector3(bar_x(bar, 1) - 10, 26, 0));
    } else if (t(marks.turret)) {
      gui.set_enabled(marks.turret, false);
    }
  };

  // Sir Aldous's crest on every other hero's card, with the levels he lends.
  // Henrietta Plough stands on the Farm's map with her rooster and the speed
  // she gives every henchman there.
  let henrietta: any = undefined;
  function herofx_henrietta() {
    const boost = actions.patron_value("HERO_HENRIETTAPLOUGH_NAME", 2, 64, 1);
    const farm = map_id === 1 && dungeon_id === 1 && boost > 1;
    if (farm && !t(henrietta)) {
      const map = gui.get_node("map/stencil");
      henrietta = { face: gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(120, 120, 0)) };
      gui.set_texture(henrietta.face, "main");
      gui.play_flipbook(henrietta.face, "patron_henriettaplough");
      gui.set_parent(henrietta.face, map);
      fx_layer(henrietta.face);
      fx_font = "title";
      henrietta.text = gui.new_text_node(vmath.vector3(0, -62, 0), "");
      gui.set_font(henrietta.text, fx_font);
      gui.set_outline(henrietta.text, vmath.vector4(0, 0, 0, 1));
      gui.set_color(henrietta.text, FX_GOLD);
      gui.set_parent(henrietta.text, henrietta.face);
      fx_layer(henrietta.text);
    }
    if (t(henrietta)) {
      gui.set_enabled(henrietta.face, farm);
      if (farm) {
        const size = gui.get_size(gui.get_node("map/stencil"));
        gui.set_position(henrietta.face, vmath.vector3(-size.x / 2 + 80, size.y / 2 - 70, 0));
        gui.set_text(henrietta.text, cat("x", actions.display_number(Math.floor(boost + 0.5))));
      }
    }
  }

  herofx_party = function () {
    herofx_henrietta();
    const lent = Math.floor(actions.patron_value("HERO_SIRALDOUSBRIGHTWATER_NAME", 1, 5, 0) + 0.5);
    for (let slot = 1; slot <= maxPartySlots; slot++) {
      let hero: any;
      for (let k = 1; k <= len(hero_list); k++) {
        const h = hero_list[k - 1];
        if (t(h.location) && h.location.slot_id === slot) { hero = h; }
      }
      let crest = slot_crests[slot];
      if (lent > 0 && t(hero)) {
        if (!t(crest)) {
          // On the slot's panel, outside the portrait's clipping.
          const panel = gui.get_node(cat("hero", slot, "/panel/bg"));
          crest = { icon: gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(56, 56, 0)) };
          gui.set_texture(crest.icon, "power_vfx");
          gui.play_flipbook(crest.icon, "fx_crest");
          gui.set_parent(crest.icon, panel);
          fx_layer(crest.icon);
          const size = gui.get_size(panel);
          gui.set_position(crest.icon, vmath.vector3(-size.x * 0.32, size.y * 0.3, 0));
          fx_font = "title";
          crest.text = gui.new_text_node(vmath.vector3(0, -26, 0), "");
          gui.set_font(crest.text, fx_font);
          gui.set_outline(crest.text, vmath.vector4(0, 0, 0, 1));
          gui.set_color(crest.text, FX_GOLD);
          gui.set_scale(crest.text, vmath.vector3(0.6, 0.6, 1));
          gui.set_parent(crest.text, crest.icon);
          fx_layer(crest.text);
          slot_crests[slot] = crest;
        }
        gui.set_enabled(crest.icon, true);
        gui.set_text(crest.text, cat("+", lent));
      } else if (t(crest)) {
        gui.set_enabled(crest.icon, false);
      }
    }
  };

  /* ******************************************
            HERO SLOTS
  ******************************************** */

  /* Tapping a hero slot opens a modal popup drawn by main/heroselect over the
  live dungeon: filled slots open hero details (with Swap / Remove), empty slots
  open the hero assignment picker. This scene stays visible behind the dimmed
  backdrop and lands hero changes with a punch animation on the slot. */
  function build_heropanel() {

    const ROSTER = "main:/menu#heroselect";
    let open = false;
    let sent: any = undefined;

    function slot_hero(slot: number) {
      for (let k = 1; k <= len(hero_list); k++) {
        const hero = hero_list[k - 1];
        if (t(hero.location) && hero.location.slot_id === slot) { return hero.hero_index; }
      }
      return 0;
    }

    function report() {
      const slots: any[] = [];
      let count = 0;
      if (t(map_data[dungeon_id - 1]) && !t(map_data[dungeon_id - 1].Levels[0].isLocked)) { count = get_numHeroSlots(); }
      for (let s = 1; s <= count; s++) {
        slots[s - 1] = { hero: slot_hero(s) };
      }
      const message = {
        map_id: map_id, dungeon_id: dungeon_id, w: screen.w, h: screen.h,
        max_slots: maxPartySlots, event: screen.event, slots: slots,
      };
      let key = cat(map_id, "|", dungeon_id, "|", Math.floor(screen.w), "|", Math.floor(screen.h), "|", count);
      for (let s = 1; s <= len(slots); s++) {
        key = cat(key, "|", slots[s - 1].hero);
      }
      if (key !== sent) {
        sent = key;
        msg.post(ROSTER, "roster_update", message);
      }
    }

    function open_modal(payload: any) {
      if (open) { return; }
      clear_hire_fx();
      open = true; sent = undefined;
      report();
      msg.post(ROSTER, "roster_open", payload);
    }

    heropanel.open = function () {
      open_modal({ mode: "picker" });
    };

    heropanel.open_detail = function (hero_id: number, slot_id: number) {
      open_modal({ mode: "detail", hero_id: hero_id, slot_id: slot_id });
    };

    heropanel.open_picker = function (slot_id: number) {
      open_modal({ mode: "picker", slot_id: slot_id });
    };

    // closed = the roster closed itself, so it needs no word back.
    heropanel.close = function (closed?: any) {
      if (!open) { return; }
      open = false;
      for (let s = 1; s <= maxPartySlots; s++) { gui.set_color(gui.get_node(cat("hero", s, "/panel/bg")), vmath.vector4(1, 1, 1, 1)); }
      if (!t(closed)) { msg.post(ROSTER, "roster_close"); }
    };

    heropanel.update = function () {
      if (open) { report(); }
    };

    heropanel.is_open = function () { return open; };

    heropanel.punch = function (slot: any) {
      const node = gui.get_node(cat("hero", slot, "/panel/bg"));
      gui.cancel_animation(node, "scale");
      const s = gui.get_scale(node);
      gui.set_scale(node, vmath.mul(s, 1.18));
      gui.animate(node, "scale", s, gui.EASING_OUTBACK, 0.35);
    };

    heropanel.fade = function (slot: any, alpha: any) {
      if (slot >= 1 && slot <= maxPartySlots) {
        gui.set_color(gui.get_node(cat("hero", slot, "/panel/bg")), vmath.vector4(1, 1, 1, alpha));
      }
    };

  }
  build_heropanel();


  // Track the pressed row button inside the dungeon dynamic list for depress + flash.
  let pressed_row_btn: Node | undefined;

  function pick_row_button(list: any, x: number, y: number): Node | undefined {
    if (!t(list) || !t(list.items) || !gui.pick_node(list.stencil, x, y)) return undefined;
    for (let i = 1; i <= len(list.items); i++) {
      const item = list.items[i - 1];
      if (!t(item) || !t(item.data) || !t(item.nodes) || !gui.is_enabled(item.root)) continue;
      if (!gui.pick_node(item.root, x, y)) continue;
      const data = item.data;
      const nodes = item.nodes;
      if (data.State === "Explorable" && !t(data.wasClickedOpen)) {
        const unlock = nodes[hash("unlock/bg")];
        if (gui.is_enabled(unlock) && buttonFx.pick_node(unlock, x, y)
          && resource_data[data.Prereq.unit]?.Count >= data.Prereq.amount) {
          return unlock;
        }
        return undefined;
      }
      if (!t(data.wasClickedOpen) || !gui.is_enabled(nodes[hash("level/display")])) return undefined;
      if (gui.is_enabled(nodes[hash("buybutton/bg")]) && buttonFx.pick_node(nodes[hash("buybutton/bg")], x, y)) {
        return nodes[hash("buybutton/bg")];
      }
      if (buystate_unlocked() && gui.is_enabled(nodes[hash("buystate/bg")]) && buttonFx.pick_node(nodes[hash("buystate/bg")], x, y)) {
        return nodes[hash("buystate/bg")];
      }
      if (data.State === "Inactive" && gui.is_enabled(nodes[hash("activate/bg")])) {
        if (buttonFx.pick_node(nodes[hash("activate/bg")], x, y)) {
          return nodes[hash("activate/bg")];
        }
        if (buttonFx.pick_node(nodes[hash("level/bg")], x, y)) {
          return nodes[hash("level/bg")];
        }
      }
      if (gui.is_enabled(nodes[hash("henchmen/panel/bg")]) && buttonFx.pick_node(nodes[hash("henchmen/panel/bg")], x, y)) {
        return nodes[hash("henchmen/panel/bg")];
      }
      const maxloots = len(data.Loot_Table);
      for (let k = 1; k <= Math.min(5, maxloots); k++) {
        const frame = nodes[hash(cat("loot/frame/bg/", k))];
        if (gui.is_enabled(frame) && buttonFx.pick_node(frame, x, y)) {
          return frame;
        }
      }
      return undefined;
    }
    return undefined;
  }

  return {
    init(self) {
      layout_screen();
      const dungeonNode = gui.get_node("dungeon/stencil");
      dungeonPosition = gui.get_position(dungeonNode);
      dungeonScale = gui.get_scale(dungeonNode);
      dungeonSize = gui.get_size(dungeonNode);

      const dungeonLevelNameNode = gui.get_node("level/name");
      dungeonLevelNamePosition = gui.get_position(dungeonLevelNameNode);

      const dungeonNameNode = gui.get_node("dungeon/name/1");
      dungeonNamePosition = gui.get_position(dungeonNameNode);

      tabSize = gui.get_size(gui.get_node("dungeon/tab/1"));

      const dungeonActivateButtonNode = gui.get_node("activate/bg");
      G.dungeonActivateButtonSize = gui.get_scale(dungeonActivateButtonNode);
      G.dungeonActivateButtonScale = gui.get_size(dungeonActivateButtonNode);

      const rosterNode = gui.get_node("panel_roster/bg");
      rosterPosition = gui.get_position(rosterNode);
      rosterScale = gui.get_scale(rosterNode);
      rosterSize = gui.get_size(rosterNode);

      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);

      resourceRootPos = gui.get_position(gui.get_node("loot/root"));
      resourceRootScale = gui.get_scale(gui.get_node("loot/root"));
      resourceIconPos = gui.get_position(gui.get_node("loot/icon/1"));
      levelPos = gui.get_position(gui.get_node("level/bg"));
      for (let i = 1; i <= 5; i++) {
        lootFramePos[i - 1] = gui.get_position(gui.get_node(cat("loot/frame/bg/", i)));
      }
      for (let i = 1; i <= maxPartySlots; i++) {
        buttonFx.bind_visual(gui.get_node(cat("hero", i, "/bg")), gui.get_node(cat("hero", i, "/panel/bg")));
      }
    },

    update(self, dt) {
      layout_screen();
      refresh_event_ui();
      if (enabled && t(defsave)) {
        refresh_all();
        sync_hire_targets();
        update_gen_particles(dt);
        heropanel.update();
        chapter0_guide();
      }
    },

    on_input(self, action_id, action) {
      if (!isnil(action_id) && enabled && active) {
        gooey.button("dungeon/tab/1", action_id, action, G.on_dungeon1button_pressed);
        gooey.button("dungeon/tab/2", action_id, action, G.on_dungeon2button_pressed);
        gooey.button("dungeon/tab/3", action_id, action, G.on_dungeon3button_pressed);
        gooey.button("dungeon/tab/4", action_id, action, G.on_dungeon4button_pressed);
        gooey.button("dungeon/tab/5", action_id, action, G.on_dungeon5button_pressed);
        // The roster takes every other press while it is open.
        if (heropanel.is_open()) { return; }

        gooey.button("hero1/bg", action_id, action, function () { G.on_herobutton_pressed(G.button, 1, action); });
        gooey.button("hero2/bg", action_id, action, function () { G.on_herobutton_pressed(G.button, 2, action); });
        gooey.button("hero3/bg", action_id, action, function () { G.on_herobutton_pressed(G.button, 3, action); });
        const list = gooey.dynamic_list("dungeon", "dungeon/stencil", "level/root", level_list, action_id, action, LEVEL_LIST_CONFIG, G.on_level_pressed, update_dungeon);
        if (action_id === hash("touch") && t(action)) {
          if (t(action.pressed)) {
            const hit = pick_row_button(list, action.x, action.y);
            if (hit) {
              pressed_row_btn = hit;
              buttonFx.press(hit);
            }
          } else if (pressed_row_btn) {
            if (t(action.released)) {
              const clicked = !t(list.have_scrolled) && buttonFx.pick_node(pressed_row_btn, action.x, action.y);
              buttonFx.release(pressed_row_btn, clicked);
              pressed_row_btn = undefined;
            } else if (t(list.have_scrolled)) {
              buttonFx.release(pressed_row_btn, false);
              pressed_row_btn = undefined;
            } else if (buttonFx.pick_node(pressed_row_btn, action.x, action.y)) {
              buttonFx.press(pressed_row_btn);
            } else {
              buttonFx.release(pressed_row_btn, false);
            }
          }
        }
      }
    },

    /* ******************************************
              MESSAGES
    ******************************************** */

    on_message(self, message_id, message, sender) {

      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        if (!enabled && pressed_row_btn) {
          buttonFx.release(pressed_row_btn, false);
          pressed_row_btn = undefined;
        }
        print(S.upper(currentPage), "set_enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        if (enabled) {
          // A finished event's items are sold first; its packs open on the way back.
          if (t(defsave) && t(defsave.get("Stats", "EventHaul"))) {
            msg.post(controller, "show_sellitems", { event_haul: true });
          } else {
            msg.post(controller, "open_pack");
          }
          resource_data = loadResources();
          vfx_list = {};
          update_list = {};
          map_id = t(message.map_id) ? message.map_id : map_id;
          dungeon_id = t(message.dungeon_id) ? message.dungeon_id : dungeon_id;
          audio.setLocation(map_id, dungeon_id);
          for (let i = 1; i <= maxPartySlots; i++) {
            gui.play_flipbook(gui.get_node(cat("hero", i, "/alertglint")), "button_glint");
            gui.play_flipbook(gui.get_node(cat("hero", i, "/lvlupglint")), "button_glint");
          }
          if (t(defsave)) { refresh_all(); }
          msg.post(controller, "update_currentlocation", { map_id: map_id, dungeon_id: dungeon_id });
          message.focus = "dungeon_mine";
          set_map_position(0);
          restore_scroll();
        } else {
          clear_hire_fx();
          heropanel.close();
          msg.post(controller, "update_currentlocation", { map_id: 0, dungeon_id: 0 });
        }
        msg.post("main:/overlay#header", "set_enabled", message);
      } else if (message_id === hash("set_active")) { active = message.active; }
      else if (message_id === hash("refresh_event")) {
        if (enabled && t(defsave)) { refresh_all(); }
      }
      else if (message_id === hash("pause")) { pause = true; }
      else if (message_id === hash("unpause")) { pause = false; }
      else if (message_id === hash("play_vfx") && enabled) {
        if (message.vfx.type === "level") {
          if (map_id === message.map_id && dungeon_id === message.dungeon_id) {
            const fb = String(message.vfx.originalflipbook || message.vfx.flipbook || "");
            if (fb.includes("electricity")) audio.playLightningRow(message.level_id, map_id, dungeon_id);
            else if (fb.includes("sword")) audio.playHeroPower("cleave", map_id, dungeon_id);
            else audio.playHeroPower("buff", map_id, dungeon_id);
            vfx_list[cat("level", "-", message.map_id, "-", message.dungeon_id, "-", message.level_id)] = message.vfx;
            vfx_list[cat("shake", "-", message.map_id, "-", message.dungeon_id, "-", message.level_id)] = message.vfx.shake;
          }
        } else if (message.vfx.type === "resource") {
          audio.playHeroPower("steal", map_id, dungeon_id);
          vfx_list[cat("resource", "-", message.resourcename)] = message.vfx;
          vfx_list[cat("shake", "-", message.resourcename)] = message.vfx.shake;
        } else if (message.vfx.type === "hero") {
          audio.playHeroPower("speedblessing", map_id, dungeon_id);
          vfx_list[cat("hero", "-", message.hero_id)] = message.vfx;
          vfx_list[cat("shake", "-", message.hero_id)] = message.vfx.shake;
        }
      } else if (message_id === hash("trigger_resource") && enabled) {
        update_list[message.resource] = { amount: message.amount, bonus: message.bonus };
        resource_data = actions.clone(defsave.loaded.Resources.data);
      } else if (message_id === hash("enemy_fx") && enabled) {
        G.enemy_fx(message);
      } else if (message_id === hash("hero_fx") && enabled) {
        herofx_play(message);
      } else if (message_id === hash("hire_land") && enabled) {
        on_hire_land(message.henchmen_id, message.amount);
      } else if (message_id === hash("henchmen_generated") && enabled) {
        on_henchmen_generated(message);
      } else if (message_id === hash("trigger_heropower") && enabled) {
        update_list[cat("Flash", "-", message.hero_id)] = true;
      } else if (message_id === hash("trigger_level") && enabled) {
        if (message.map_id === map_id && message.dungeon_id === dungeon_id) {
          if (map_id === message.map_id && dungeon_id === message.dungeon_id) {
            update_list[cat("Flash", "-", message.map_id, "-", message.dungeon_id, "-", message.level_id)] = true;
          }
        }
      } else if (message_id === hash("refresh_herodata")) {
        if (enabled && t(defsave)) { refresh_herodata(); }
      } else if (message_id === hash("refresh_mapdata")) {
        if (enabled && t(defsave)) { refresh_mapdata(); }
      } else if (message_id === hash("refresh_all")) {
        if (enabled && t(defsave)) { refresh_all(); }
      } else if (message_id === hash("roster_closed")) {
        heropanel.close(true);
      } else if (message_id === hash("roster_punch")) {
        heropanel.punch(message.slot);
      } else if (message_id === hash("roster_fade")) {
        heropanel.fade(message.slot, message.alpha);
      } else if (message_id === hash("layout_changed")) {
        restore_scroll();
      }
    },
  };
});
