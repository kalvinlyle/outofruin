import { defineScript, gui, msg, hash, vmath, window, sys, print } from '../../../engine';
import type { Node } from '../../../engine';
import { t, cat, len, pairs, os, M, S, T } from '../../../lua';
import { G } from '../../globals';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import progress from '../../progress/progress';
import saveload from '../../saveload/saveload';
import defsave from '../../defsave/defsave';
import actions from '../../actions';
import loc from '../../shared/locsheets';

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
  let resource_data: any = {};
  let bonusxp_data: any = {};
  let henchmen_data: any = [];
  let update_list: any = {};
  let vfx_list: any = {};

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

  function scroll_key() {
    return cat(map_id, "-", dungeon_id);
  }

  function remember_scroll(list: any) {
    scroll_memory[scroll_key()] = list.scroll.y;
  }

  function restore_scroll() {
    const list = gooey.dynamic_list("dungeon", "dungeon/stencil", "level/root", level_list);
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
  widens the bands and scales the map art up to cover. */
  const DESIGN_W = 750;
  const DESIGN_H = 1334;

  const HEADER_DEPTH = 255.5; // how far the top bar reaches down from the top edge
  const FOOTER_TOP = 105; void FOOTER_TOP; // underside of the content, over the bottom bar
  const TITLE_DROP = 81.5; // tab strip, below the top bar
  const MAP_DROP = 73.5; // map, below the top bar
  const MAP_H = 325;
  const MAP_SHARE = 0.25; // of the height a tall window adds, the rest is list
  const LIST_BOTTOM = 80; // the list runs a little under the bottom bar
  const TAB_LEFT = -375; void TAB_LEFT; // first tab, from the middle of a 750 wide strip

  const screen = { w: 0, h: 0 };

  function screen_size(): [number, number] {
    const [ww, wh] = window.get_size();
    const scale = Math.min(ww / DESIGN_W, wh / DESIGN_H);
    return [ww / scale, wh / scale];
  }

  function layout_screen() {
    const [w, h] = screen_size();
    if (Math.abs(w - screen.w) < 1 && Math.abs(h - screen.h) < 1) { return; }
    screen.w = w; screen.h = h;

    const root = gui.get_node("root");
    gui.set_adjust_mode(root, gui.ADJUST_FIT);
    gui.set_xanchor(root, gui.ANCHOR_NONE);
    gui.set_yanchor(root, gui.ANCHOR_NONE);

    const clip = gui.get_node("menu/clip");
    gui.set_position(clip, vmath.vector3((DESIGN_W - w) / 2, (DESIGN_H - h) / 2, 0));
    gui.set_size(clip, vmath.vector3(w, h, 0));

    const top = h - HEADER_DEPTH;
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
    gui.set_position(map, vmath.vector3(w / 2, map_y, 0));
    gui.set_size(map, vmath.vector3(w, map_h, 0));
    // The map art is a fixed drawing, so it is scaled up rather than stretched.
    const cover = Math.max(1, w / DESIGN_W);
    gui.set_scale(gui.get_node("map/bg"), vmath.vector3(cover, cover, 1));

    for (const id of ["dungeon/root", "dungeon/stencil"]) {
      const node = gui.get_node(id);
      gui.set_size(node, vmath.vector3(w, map_y - LIST_BOTTOM, 0));
    }
    const list = gui.get_node("dungeon/root");
    gui.set_position(list, vmath.vector3(w / 2, map_y, 0));
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
      if (isnil(hero.location) && !t(hero.Locked)) {
        unassignedHeroes = unassignedHeroes + 1;
      } else if (!isnil(hero.location)) {
        if (isnil(hero.location.map_id)
          || isnil(hero.location.dungeon_id)) {
          unassignedHeroes = unassignedHeroes + 1;
        } else if (hero.location.map_id === map_id
          && hero.location.dungeon_id === dungeon_id) {
          assignedHeroes = assignedHeroes + 1;
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
        gui.set_enabled(gui.get_node(cat("hero", slot_id, "/unassign/bg")), slot_id <= len(hero_list));
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

        for (let p = 1; p <= maxPowerSlots; p++) {
          gui.set_enabled(gui.get_node(cat("hero", slot_id, "/power/root/", p)), t(hero.Powers[p - 1]));
          if (t(hero.Powers[p - 1])) {
            const power = hero.Powers[p - 1];
            gui.set_texture(gui.get_node(cat("hero", slot_id, "/power/icon/bg/", p)), power.Stages[power.Stage - 1].Icon.texture);
            gui.play_flipbook(gui.get_node(cat("hero", slot_id, "/power/icon/bg/", p)), power.Stages[power.Stage - 1].Icon.flipbook);

            if (!pause) {

              let prog = 1 - ((os.clock() + defsave.get("Currency", "BonusTime") - power.lastupdate) / (power.nextupdate - power.lastupdate));
              if (prog < 0) { prog = 0; }
              if (prog > 1) { prog = 1; }
              const size = gui.get_size(gui.get_node(cat("hero", slot_id, "/power/icon/bg/", p)));
              gui.set_size(gui.get_node(cat("hero", slot_id, "/power/timer/bg/", p)), vmath.vector3(size.x, size.y * prog, size.z));


              if (t(update_list[cat("Flash", "-", hero.id)])) {
                const flashNode = gui.get_node(cat("hero", slot_id, "/power/timer/bg/", p));
                gui.set_enabled(flashNode, true);
                gui.set_color(flashNode, vmath.vector4(1, 1, 1, 1));
                gui.animate(flashNode, "color", vmath.vector4(0, 0, 0, 0.5), gui.EASING_OUTSINE, 0.2);
                update_list[cat("Flash", "-", hero.id)] = false;
              }


              let timer: any = Math.max(0, Math.floor(power.nextupdate - os.clock() - defsave.get("Currency", "BonusTime")));
              if (timer === 0) { timer = ""; }
              gui.set_text(gui.get_node(cat("hero", slot_id, "/power/text/", p)), timer);
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

  function set_henchmen(item: any) {
    item.data.henchmen_id = t(item.data.henchmen_id) ? item.data.henchmen_id : item.data.Henchmen.id;

    gui.set_enabled(item.nodes[hash("henchmen/panel/bg")], !(item.data.State === "Locked" || item.data.State === "Invisible"));
    gui.set_enabled(item.nodes[hash("henchmen/progress/bg")], henchmen_data[item.data.henchmen_id - 1].Level > 0);
    gui.set_enabled(item.nodes[hash("henchmen/shadow/bg")], henchmen_data[item.data.henchmen_id - 1].Level === 0);
    gui.set_enabled(item.nodes[hash("henchmen/lock")], henchmen_data[item.data.henchmen_id - 1].Status === "Locked");
    gui.set_enabled(item.nodes[hash("henchmen/lvlupglint")], item.data.State !== "Inactive");

    gui.set_text(item.nodes[hash("henchmen/lvluptext")], S.upper(loc.get("UPGRADE_AVAILABLE")));
    gui.set_text(item.nodes[hash("henchmen/size")], cat("x", actions.display_number(henchmen_data[item.data.Henchmen.id - 1].Size)));

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
        gui.set_texture(henchmenIconNode, henchmen_data[previousHenchmenId - 1].Icon.texture);
        gui.play_flipbook(henchmenIconNode, henchmen_data[previousHenchmenId - 1].Icon.flipbook);
      }

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
            const dps = Math.max(0.0001, henchmen_data[item.data.henchmen_id - 1].dps * defsave.get("Stats", "globalBoost"));
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
                const itemTexture = item.data.Loot_Table[n - 1].Option.Icon.texture;
                const itemFlipbook = item.data.Loot_Table[n - 1].Option.Icon.flipbook;
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

                gui.set_texture(item.nodes[hash(cat("loot/icon/", n))], itemTexture);
                gui.play_flipbook(item.nodes[hash(cat("loot/icon/", n))], itemFlipbook);
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

        if (cost.baseamount > resourceTotal) { return 0; }

        let num = 0;

        if (cost.message_id === "update_resources") {

          num = Math.floor(resourceTotal / cost.baseamount);
        } else if (cost.savefile === "Henchmen") {
          num = Math.floor((resourceTotal - 1) / cost.baseamount);
        } else {
          num = Math.floor(resourceTotal / cost.baseamount);
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

  function set_buystate(item: any) {
    gui.set_text(item.nodes[hash("buystate/text")], S.upper(loc.get("BUYSTATE_TEXT", [defsave.get("Stats", "buyStates")[item.data.buyState - 1]])));
  }

  /* Hire costs. The button said what you'd hire but never what it costs, so
  the price sits on its right: amount and icon per cost, red when you're short.
  Each hire costs baseamount of everything in BuyCosts (buy_henchmen in the
  henchmen controller). With nothing affordable the button reads "Hire 0", so
  the row then shows the price of one. */
  const HIRE_COST_ICON = 26;
  const HIRE_COST_GAP = 4;
  const HIRE_COST_SPACING = 18;
  const HIRE_COST_SCALE = 0.62;
  const HIRE_LABEL_RAISE = 11;
  const HIRE_ROW_DROP = 17;
  const HIRE_SHORT_COLOR = vmath.vector4(1, 0.45, 0.4, 1);
  const HIRE_OK_COLOR = vmath.vector4(1, 1, 1, 1);
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

  // Two lines: what you hire on top, what it costs underneath, both centred.
  function set_hirecosts(item: any, count: number) {
    const bg = item.nodes[hash("buybutton/bg")];
    const label = item.nodes[hash("buybutton/text")];
    const buyCosts = henchmen_data[item.data.henchmen_id - 1].BuyCosts;
    const costs: any = t(buyCosts) ? buyCosts : [];

    let row = hire_rows.get(bg);
    if (!t(row)) {
      const labelPos = gui.get_position(label);
      row = { slots: [], labelPos: labelPos, textScale: vmath.mul(gui.get_scale(label), HIRE_COST_SCALE) };
      gui.set_position(label, vmath.vector3(labelPos.x, labelPos.y + HIRE_LABEL_RAISE, labelPos.z));
      hire_rows.set(bg, row);
    }

    for (let c = len(row.slots) + 1; c <= len(costs); c++) {
      const slot: any = {};
      slot.text = gui.new_text_node(vmath.vector3(0, 0, 0), "");
      gui.set_font(slot.text, gui.get_font(label));
      gui.set_pivot(slot.text, gui.PIVOT_W);
      gui.set_scale(slot.text, row.textScale);
      gui.set_parent(slot.text, bg);
      slot.icon = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(HIRE_COST_ICON, HIRE_COST_ICON, 0));
      gui.set_pivot(slot.icon, gui.PIVOT_W);
      gui.set_parent(slot.icon, bg);
      row.slots[c - 1] = slot;
    }

    // Fill in texts first, so the row can be measured and centred.
    let width = 0;
    for (let c = 1; c <= len(row.slots); c++) {
      const slot = row.slots[c - 1];
      const cost = costs[c - 1];
      const icon = t(cost) ? hirecost_icon(cost) : cost;
      slot.visible = !isnil(cost);
      slot.hasIcon = !isnil(icon);
      gui.set_enabled(slot.text, slot.visible);
      gui.set_enabled(slot.icon, slot.visible && slot.hasIcon);
      if (slot.visible) {
        const amount = cost.baseamount * count;
        gui.set_text(slot.text, actions.display_number(amount));
        gui.set_color(slot.text, hirecost_held(cost) >= amount ? HIRE_OK_COLOR : HIRE_SHORT_COLOR);
        if (slot.hasIcon) {
          gui.set_texture(slot.icon, icon.texture);
          gui.play_flipbook(slot.icon, icon.flipbook);
        }
        slot.textWidth = gui.get_text_metrics_from_node(slot.text).width * row.textScale.x;
        width = width + slot.textWidth + (slot.hasIcon ? (HIRE_COST_GAP + HIRE_COST_ICON) : 0);
        if (c < len(costs)) { width = width + HIRE_COST_SPACING; }
      }
    }

    let x = row.labelPos.x - width / 2;
    const y = row.labelPos.y - HIRE_ROW_DROP;
    for (let c = 1; c <= len(row.slots); c++) {
      const slot = row.slots[c - 1];
      if (slot.visible) {
        gui.set_position(slot.text, vmath.vector3(x, y, 0));
        x = x + slot.textWidth;
        if (slot.hasIcon) {
          gui.set_position(slot.icon, vmath.vector3(x + HIRE_COST_GAP, y, 0));
          x = x + HIRE_COST_GAP + HIRE_COST_ICON;
        }
        x = x + HIRE_COST_SPACING;
      }
    }
  }

  function set_buybutton(item: any) {

    const bs = defsave.get("Stats", "buyStates")[item.data.buyState - 1];
    const buyState = t(bs) ? bs : "Max";
    const maxPurchase = get_maxPurchasableHenchmen(item.data.Henchmen.id);
    const nextPurchase = get_nextHenchmenPurchase(item.data.Henchmen.id, maxPurchase, buyState, maxPurchase);

    if (get_buyStateMaxPurchase(item.data.Henchmen.id, maxPurchase, buyState) > 0) {
      gui.play_flipbook(item.nodes[hash("buybutton/bg")], "tinyfancybutton_orange");
    } else {
      gui.play_flipbook(item.nodes[hash("buybutton/bg")], "tinyfancybutton_darkgrey");
    }

    gui.set_enabled(item.nodes[hash("buybutton/progress/stencil")], false);
    if (defsave.get("Stats", "buyStates")[item.data.buyState - 1] === "OCD") {
      const progress = maxPurchase / nextPurchase;
      gui.set_enabled(item.nodes[hash("buybutton/progress/stencil")], progress > 0 && progress < 1);
      const barSize = gui.get_size(item.nodes[hash("buybutton/bg")]);
      gui.set_size(item.nodes[hash("buybutton/progress/stencil")], vmath.vector3(barSize.x * progress, barSize.y, barSize.z));
    }

    gui.set_text(item.nodes[hash("buybutton/text")], loc.get("BUY_HENCHMEN_TEXT", [actions.display_number(nextPurchase), loc.get(henchmen_data[item.data.henchmen_id - 1].Name)])); //.. " \n Max:" ..  maxPurchase .. " Next:" .. nextPurchase)
    set_hirecosts(item, Math.max(1, nextPurchase));
  }

  /* Unlock meter. "100 Carrots needed" alone doesn't say whether that means
  holding 100 or having collected 100 over time. It means holding them (the
  check is the current Count, and unlocking spends nothing), so show the count
  held against the amount needed. Built at runtime, one per list slot, as
  children of the slot's unlock text so they scroll and clip with it. */
  const UNLOCK_METER_WIDTH = 360;
  const UNLOCK_METER_HEIGHT = 30;
  const UNLOCK_METER_GAP = 14;
  // Keyed by node (Lua userdata keys compare by identity).
  const unlock_meters = new Map<Node, any>();

  function set_unlockmeter(item: any, visible: boolean) {
    const textNode = item.nodes[hash("unlock/text")];
    let meter = unlock_meters.get(textNode);
    if (!t(meter)) {
      if (!visible) { return; }
      const scale = gui.get_scale(textNode);
      meter = {};
      meter.back = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(UNLOCK_METER_WIDTH / scale.x, UNLOCK_METER_HEIGHT / scale.y, 0));
      gui.set_parent(meter.back, textNode);
      gui.set_color(meter.back, vmath.vector4(0, 0, 0, 0.55));
      meter.fill = gui.new_box_node(vmath.vector3(-UNLOCK_METER_WIDTH / scale.x / 2, 0, 0), vmath.vector3(0, UNLOCK_METER_HEIGHT / scale.y, 0));
      gui.set_pivot(meter.fill, gui.PIVOT_W);
      gui.set_parent(meter.fill, meter.back);
      meter.label = gui.new_text_node(vmath.vector3(0, 0, 0), "");
      gui.set_font(meter.label, gui.get_font(textNode));
      gui.set_scale(meter.label, vmath.vector3(0.75, 0.75, 1));
      gui.set_parent(meter.label, meter.back);
      meter.scale = scale;
      unlock_meters.set(textNode, meter);
    }
    gui.set_enabled(meter.back, visible);
    if (!visible) { return; }

    const needed = item.data.Prereq.amount;
    const cnt = resource_data[item.data.Prereq.unit].Count;
    const held = t(cnt) ? cnt : 0;
    const progress = Math.min(1, Math.max(0, held / needed));
    const textHeight = gui.get_text_metrics_from_node(textNode).height;
    gui.set_position(meter.back, vmath.vector3(0, -(textHeight / 2 + (UNLOCK_METER_GAP + UNLOCK_METER_HEIGHT / 2) / meter.scale.y), 0));
    gui.set_size(meter.fill, vmath.vector3(UNLOCK_METER_WIDTH / meter.scale.x * progress, UNLOCK_METER_HEIGHT / meter.scale.y, 0));
    gui.set_color(meter.fill, progress >= 1 ? vmath.vector4(0.36, 0.78, 0.29, 1) : vmath.vector4(0.96, 0.62, 0.15, 1));
    gui.set_text(meter.label, cat(actions.display_number(Math.min(held, needed)), " / ", actions.display_number(needed)));
  }

  function update_dungeon(list: any) {
    remember_scroll(list);
    for (let i = 1; i <= len(list.items); i++) {
      const item = list.items[i - 1];
      let showMeter = false;
      if (!isnil(item.data) && item.index <= len(map_data[dungeon_id - 1].Levels)) {

        gui.set_enabled(item.nodes[hash("level/display")], !(item.data.State === "Invisible" || item.data.State === "Locked" || item.data.State === "Explorable"));
        gui.set_enabled(item.nodes[hash("unlock/bg")], item.data.State === "Explorable");

        gui.set_enabled(item.nodes[hash("unlock/text")], item.data.State === "Locked" || item.data.State === "Explorable");
        if (item.data.State === "Locked") {
          gui.set_text(item.nodes[hash("unlock/text")], loc.get("RESOURCE_UNLOCK_MESSAGE", [actions.display_number(item.data.Prereq.amount), loc.get(resource_data[item.data.Prereq.unit].Name), loc.get(item.data.Name)]));
          showMeter = true;
        }

        if (item.data.State === "Explorable") {
          if (!t(item.data.wasClickedOpen) && resource_data[item.data.Prereq.unit].Count >= item.data.Prereq.amount) {
            gui.play_flipbook(item.nodes[hash("unlock/bg")], "tinyfancybutton_orange");
            gui.set_text(item.nodes[hash("unlock/text")], loc.get("CLICK_TO_UNLOCK_DUNGEON_LEVEL"));
          } else {
            gui.play_flipbook(item.nodes[hash("unlock/bg")], "tinyfancypanel_darkgrey");
            gui.set_text(item.nodes[hash("unlock/text")], loc.get("RESOURCE_UNLOCK_MESSAGE", [actions.display_number(item.data.Prereq.amount), loc.get(resource_data[item.data.Prereq.unit].Name), loc.get(item.data.Name)]));
            showMeter = true;
          }
        }


        if (!(item.data.State === "Invisible" || item.data.State === "Locked" || item.data.State === "Explorable")) {
          gui.set_text(item.nodes[hash("level/name")], loc.get(item.data.Name)); //.. " - " ..  item.data.State) --.. " " .. item.data.Damage .. "/" .. item.data.Health)
          set_henchmen(item); //set henchman portrait
          set_resources(item); //set resources
          set_progressbar(item); //set progressbar
          set_buybutton(item); //set buybutton
          set_buystate(item); //set buyState button
        }
      }
      if (t(item.nodes)) { set_unlockmeter(item, showMeter); }
    }
  }

  function refresh_herodata() {

    hero_list = [];
    const heroes = actions.clone(defsave.loaded.Hero.data);
    for (let h = 1; h <= len(heroes); h++) {
      const hero = heroes[h - 1];
      if (!isnil(hero.location)) {
        if (hero.location.map_id === map_id && hero.location.dungeon_id === dungeon_id) {
          hero.Type = "hero";
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
    const dungeonNode = gui.get_node(map_data[dungeon_id - 1].Node);
    const nodePos = gui.get_position(dungeonNode);
    const offset = gui.get_size(gui.get_node("map/stencil")).y / 2;
    const mapPos = vmath.vector3(0, -nodePos.y + offset, 0);
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
      map_data[item.dungeon_id - 1].Levels[item.level_id - 1].Henchmen = item;
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

      if (t(map_data[i - 1].Levels[0].wasClickedOpen) || map_data[i - 1].Levels[0].State === "Explorable") {
        gui.play_flipbook(dunegonTabNode, "tab_brown");
      } else {
        gui.play_flipbook(dunegonTabNode, "tab_darkgrey");
      }

      gui.set_enabled(dungeonIconNode, t(map_data[Math.max(1, i - 1) - 1].Levels[2].wasClickedOpen) || t(map_data[i - 1].Levels[0].wasClickedOpen) || map_data[i - 1].Levels[0].State === "Explorable");
      gui.set_enabled(dungeonNameNode, i === dungeon_id);
      gui.set_position(dunegonTabNode, vmath.vector3((tabSize.x * (i - 1)) - (tabBarWidth / 2) + tabOffset, tabPosition.y, tabPosition.z));
      const iconSize = gui.get_size(dungeonIconNode);
      if (i === dungeon_id) {
        tabOffset = tabBarWidth - (tabSize.x * 5);
        gui.set_text(dungeonNameNode, S.upper(loc.get(map_data[i - 1].Name)));
        const dungeonNameNodeMetrics = gui.get_text_metrics_from_node(dungeonNameNode);
        gui.set_position(dungeonNameNode, vmath.vector3((-(dungeonNameNodeMetrics.width + dungeonNamePosition.x) / 2) + dungeonNamePosition.x + (iconSize.x / 2) + (tabOffset / 2), dungeonNamePosition.y, dungeonNamePosition.z));
        gui.set_position(dungeonIconNode, vmath.vector3(-(dungeonNamePosition.x / 2) + (iconSize.x / 2) + (tabOffset / 2) - (dungeonNameNodeMetrics.width / 2), dungeonNamePosition.y, dungeonNamePosition.z));
        gui.set_size(dunegonTabNode, vmath.vector3(tabOffset + tabSize.x, tabSize.y, tabSize.z));
      } else {
        gui.set_size(dunegonTabNode, vmath.vector3(tabSize.x, tabSize.y, tabSize.z));
        gui.set_position(dungeonIconNode, vmath.vector3((tabSize.x - iconSize.x) / 2, dungeonNamePosition.y, dungeonNamePosition.z));
      }
      if (t(map_data[i - 1].Icon)) {
        gui.set_texture(dungeonIconNode, map_data[i - 1].Icon.texture);
        gui.play_flipbook(dungeonIconNode, map_data[i - 1].Icon.flipbook);
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

    level_list = [];
    level_list = actions.clone(map_data[dungeon_id - 1].Levels);

    for (let i = len(level_list); i >= 1; i--) {
      if (level_list[i - 1].State === "Invisible") {
        T.remove(level_list, i);
      }
    }
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
    update_dungeon(gooey.dynamic_list("dungeon", "dungeon/stencil", "level/root", level_list, G.action_id, G.action));
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
    update_dungeon(gooey.dynamic_list("dungeon", "dungeon/stencil", "level/root", level_list, G.action_id, G.action));
  }

  // Global functions: the Lua defines these without `local`, so they live in
  // the shared global table and are looked up there at call time.
  G.on_dungeonbutton_pressed = function (num: any) {
    if (t(map_data[Math.max(1, num - 1) - 1].Levels[2].wasClickedOpen) || t(map_data[num - 1].Levels[0].wasClickedOpen) || map_data[num - 1].Levels[0].State === "Explorable") {
      const direction = num > dungeon_id;
      dungeon_id = num;
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

  G.on_level_pressed = function (list: any) {
    let item = list.items[list.selected_item - 1];
    const state = defsave.get("Stats", "buyStates")[item.data.buyState - 1];

    for (let l = 1; l <= len(list.items); l++) {
      const level = list.items[l - 1];
      if (list.selected_item === level.index) {
        item = list.items[l - 1];
        break;
      }
    }

    const data = item.data;
    const nodes = item.nodes;
    const maxloots = len(data.Loot_Table);
    let lootclicked = 0;
    let collectBonusxp = false;

    if (maxloots >= 1 && gui.pick_node(nodes[hash("loot/frame/bg/1")], list.action_pos.x, list.action_pos.y)) {
      lootclicked = 1;
    } else if (maxloots >= 2 && gui.pick_node(nodes[hash("loot/frame/bg/2")], list.action_pos.x, list.action_pos.y)) {
      lootclicked = 2;
    } else if (maxloots >= 3 && gui.pick_node(nodes[hash("loot/frame/bg/3")], list.action_pos.x, list.action_pos.y)) {
      lootclicked = 3;
    } else if (maxloots >= 4 && gui.pick_node(nodes[hash("loot/frame/bg/4")], list.action_pos.x, list.action_pos.y)) {
      lootclicked = 4;
    } else if (maxloots >= 5 && gui.pick_node(nodes[hash("loot/frame/bg/5")], list.action_pos.x, list.action_pos.y)) {
      lootclicked = 5;
    }

    let bonusdata: any = {};

    if (gui.pick_node(nodes[hash("henchmen/panel/bg")], list.action_pos.x, list.action_pos.y) && t(data.wasClickedOpen)) {
      msg.post(controller, "popup_henchmen", { henchmen_id: data.Henchmen.id });
    } else if (gui.pick_node(nodes[hash("buystate/bg")], list.action_pos.x, list.action_pos.y)) {
      msg.post(controller, "toggle_buystate", { map_id: map_id, dungeon_id: dungeon_id, level_id: list.selected_item });
    } else if (gui.pick_node(nodes[hash("buybutton/bg")], list.action_pos.x, list.action_pos.y) && t(data.wasClickedOpen)) {

      const max = get_maxPurchasableHenchmen(data.Henchmen.id);
      const total = get_buyStateMaxPurchase(data.Henchmen.id, max, state);
      if (total > 0) {
        const amount = get_buyStateMaxPurchase(data.Henchmen.id, get_maxPurchasableHenchmen(data.Henchmen.id), state);
        msg.post(controller, "buy_henchmen", { amount: amount, henchmen_id: data.Henchmen.id });
      }
    } else if (lootclicked > 0 && t(data.wasClickedOpen)) {
      if (t(bonusxp_data)) {
        if (t(bonusxp_data[data.Loot_Table[lootclicked - 1].Option.Stat])) {
          bonusdata = bonusxp_data[data.Loot_Table[lootclicked - 1].Option.Stat];
          if (bonusdata.Total - bonusdata.Collected > 0) {
            collectBonusxp = true;
          } else {
            msg.post(controller, "popup_resource", { resource_id: data.Loot_Table[lootclicked - 1].Option.Stat });
          }
        }
      }
      if (collectBonusxp === true) {
        const particlespeed = 1;
        const iconNode = nodes[hash(cat("loot/icon/", lootclicked))];
        const startPos = gui.get_screen_position(iconNode);
        const numParticles = (bonusdata.Total - bonusdata.Collected) * bonusdata.Value;
        const postmsg = { receiver: controller, message_id: "mod_xp", message: { amount: 1 } };
        msg.post(controller, "spawn_particles", { num: numParticles, startPos: startPos, endTarget: "target_xp", time: particlespeed, icon: { texture: "reward_icons", flipbook: "reward_xp_icon" }, postmsg: postmsg });
        msg.post(controller, "collect_bonusxp", { statName: data.Loot_Table[lootclicked - 1].Option.Stat, callback: "dungeonmine" });
      } else {

      }
    } else if (data.State === "Inactive" && gui.pick_node(nodes[hash("activate/bg")], list.action_pos.x, list.action_pos.y) && t(data.wasClickedOpen)) {
      msg.post(controller, "activate_henchmen", { henchmen_id: data.henchmen_id });
    } else if (data.State === "Explorable" && !t(item.data.wasClickedOpen) && resource_data[item.data.Prereq.unit].Count >= item.data.Prereq.amount) {
      msg.post(controller, "explore_level", { map_id: map_id, dungeon_id: dungeon_id, level_id: list.selected_item });
    }
  };

  G.on_herobutton_pressed = function (button: any, slot_id: any, action: any) {
    let hero_id: any = 0;
    for (let h = 1; h <= len(hero_list); h++) {
      const hero = hero_list[h - 1];
      if (hero.location.slot_id === slot_id) {
        hero_id = hero.id;
        break;
      }
    }
    if (gui.pick_node(gui.get_node(cat("hero", slot_id, "/unassign/bg")), action.x, action.y)) {
      msg.post(controller, "unassign_hero", { hero_id: hero_id });
    } else {
      if (get_numHeroSlots() >= slot_id) {
        if (hero_id === 0) {
          msg.post(controller, "show_heroselect", { map_id: map_id, dungeon_id: dungeon_id, slot_id: slot_id });
        }
      }
    }
  };

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
    },

    update(self, dt) {
      layout_screen();
      if (enabled && t(defsave)) {
        refresh_all();
      }
    },

    on_input(self, action_id, action) {
      if (!isnil(action_id) && enabled && active) {
        gooey.button("dungeon/tab/1", action_id, action, G.on_dungeon1button_pressed);
        gooey.button("dungeon/tab/2", action_id, action, G.on_dungeon2button_pressed);
        gooey.button("dungeon/tab/3", action_id, action, G.on_dungeon3button_pressed);
        gooey.button("dungeon/tab/4", action_id, action, G.on_dungeon4button_pressed);
        gooey.button("dungeon/tab/5", action_id, action, G.on_dungeon5button_pressed);

        gooey.button("hero1/bg", action_id, action, function () { G.on_herobutton_pressed(G.button, 1, action); });
        gooey.button("hero2/bg", action_id, action, function () { G.on_herobutton_pressed(G.button, 2, action); });
        gooey.button("hero3/bg", action_id, action, function () { G.on_herobutton_pressed(G.button, 3, action); });
        gooey.dynamic_list("dungeon", "dungeon/stencil", "level/root", level_list, action_id, action, undefined, G.on_level_pressed, update_dungeon);
      }
    },

    /* ******************************************
              MESSAGES
    ******************************************** */

    on_message(self, message_id, message, sender) {

      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "set_enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        if (enabled) {
          msg.post(controller, "open_pack");
          resource_data = loadResources();
          vfx_list = {};
          update_list = {};
          map_id = t(message.map_id) ? message.map_id : map_id;
          dungeon_id = t(message.dungeon_id) ? message.dungeon_id : dungeon_id;
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
          msg.post(controller, "update_currentlocation", { map_id: 0, dungeon_id: 0 });
        }
        msg.post("main:/overlay#header", "set_enabled", message);
      } else if (message_id === hash("set_active")) { active = message.active; }
      else if (message_id === hash("pause")) { pause = true; }
      else if (message_id === hash("unpause")) { pause = false; }
      else if (message_id === hash("play_vfx") && enabled) {
        if (message.vfx.type === "level") {
          if (map_id === message.map_id && dungeon_id === message.dungeon_id) {
            vfx_list[cat("level", "-", message.map_id, "-", message.dungeon_id, "-", message.level_id)] = message.vfx;
            vfx_list[cat("shake", "-", message.map_id, "-", message.dungeon_id, "-", message.level_id)] = message.vfx.shake;
          }
        } else if (message.vfx.type === "resource") {
          vfx_list[cat("resource", "-", message.resourcename)] = message.vfx;
          vfx_list[cat("shake", "-", message.resourcename)] = message.vfx.shake;
        } else if (message.vfx.type === "hero") {
          vfx_list[cat("hero", "-", message.hero_id)] = message.vfx;
          vfx_list[cat("shake", "-", message.hero_id)] = message.vfx.shake;
        }
      } else if (message_id === hash("trigger_resource") && enabled) {
        update_list[message.resource] = { amount: message.amount, bonus: message.bonus };
        resource_data = actions.clone(defsave.loaded.Resources.data);
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
      } else if (message_id === hash("layout_changed")) {
        restore_scroll();
      }
    },
  };
});
