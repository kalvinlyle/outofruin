import { defineScript, gui, msg, hash, vmath, window, print } from '../../../engine';
import { t, cat, len, S } from '../../../lua';
import { G } from '../../globals';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import progress from '../../progress/progress';
import saveload from '../../saveload/saveload';

void inspect; void random; void progress;

defineScript('/main/map/map.gui_script', () => {
  const productName = "OoR";
  const currentPage = "map";
  const controller = "main:/menu#controller";
  let enabled: any = false;

  let map_id: any = 1;
  let map_data: any = {};
  let quest_data: any = {};

  let xoffset = 0;
  let pos: any = 0;
  let root_start_x = 0;
  let root_min_x = 0;
  let root_max_x = 0;

  const mapnodes = [
    "dungeon_1", "dungeon_2", "dungeon_3", "dungeon_4", "dungeon_5", "dungeon_6", "dungeon_7", "dungeon_8", "dungeon_9",
  ];
  void mapnodes;

  const mappaths = [
    "path_1x2", "path_1x4",
    "path_2x3", "path_2x4", "path_2x5",
    "path_3x5", "path_3x6",
    "path_4x5", "path_4x7",
    "path_5x6", "path_5x7", "path_5x8",
    "path_6x8", "path_6x9",
    "path_7x8",
    "path_8x9",
  ];
  void mappaths;

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
  function screen_changed(): [number | undefined, number | undefined] {
    const [ww, wh] = window.get_size();
    const scale = Math.min(ww / DESIGN_W, wh / DESIGN_H);
    const w = ww / scale, h = wh / scale;
    if (Math.abs(w - screen.w) < 1 && Math.abs(h - screen.h) < 1) { return [undefined, undefined]; }
    screen.w = w; screen.h = h;
    const root = gui.get_node("root");
    gui.set_adjust_mode(root, gui.ADJUST_FIT);
    gui.set_xanchor(root, gui.ANCHOR_NONE);
    gui.set_yanchor(root, gui.ANCHOR_NONE);
    return [w, h];
  }

  function screen_left() { return (DESIGN_W - screen.w) / 2; }
  function screen_bottom() { return (DESIGN_H - screen.h) / 2; }
  function screen_top() { return screen_bottom() + screen.h; }
  function content_top() { return screen_top() - HEADER_DEPTH; }
  function content_bottom() { return screen_bottom() + FOOTER_TOP; }
  void content_top; void content_bottom;

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
    const [w, h] = screen_changed();
    if (!t(w)) { return; }
    place("map/clip", screen_left(), screen_bottom());
    resize("map/clip", w, h);
    // The map is one drawing, so it is scaled to cover rather than stretched.
    const cover = Math.max(w! / DESIGN_W, h! / DESIGN_H);
    gui.set_scale(gui.get_node("map/bg"), vmath.vector3(cover, cover, 1));
    place("map/bg", screen_left(), screen_bottom());
  }

  /* ******************************************
            FUNCTIONS
  ******************************************** */

  function refresh_all() {
    if (enabled) {
      const Stats = saveload.load_data(productName, "Stats");
      const Rep = saveload.load_data(productName, "Rep");

      quest_data = Rep[Stats.Rank - 1].Bounties;

      map_data = saveload.load_data(productName, "Map")[map_id - 1];
      print(cat(S.upper(currentPage), " dungeon data loaded")); //, inspect(map_data))
      for (let i = 1; i <= len(map_data); i++) {
        gui.set_enabled(gui.get_node(cat(map_data[i - 1]["Node"], "/tab")), t(map_data[i - 1]["enabled"]));
        if (map_data[i - 1].Levels[0]["Damage"] === 0 && map_data[i - 1].Level === 1) {
          gui.play_flipbook(gui.get_node(cat(map_data[i - 1]["Node"], "/tab")), "tab_explore");
        } else {
          let match = false;
          for (let n = 1; n <= len(quest_data); n++) {
            if (quest_data[n - 1]["mapNode"] === map_data[i - 1]["Node"] && quest_data[n - 1]["Status"] === "Read") {
              match = true;
              break;
            }
          }

          if (match) {
            gui.play_flipbook(gui.get_node(cat(map_data[i - 1]["Node"], "/tab")), "tab_quest");
          } else {
            gui.play_flipbook(gui.get_node(cat(map_data[i - 1]["Node"], "/tab")), "tab_open");
          }
        }
      }
    }
  }

  /* ******************************************
            INPUT
  ******************************************** */

  function on_mapbutton_pressed(nodeid: number) {
    msg.post(controller, "show_dungeonmine", { map_id: map_id, dungeon_id: nodeid });
  }

  function on_kingdom_pressed(list: any) {
    msg.post(controller, "focus_kingdom", { status: true });
    msg.post(controller, "show_kingdom", { map_id: map_id });
  }

  function on_farm_pressed(list: any) { on_mapbutton_pressed(1); }
  function on_desertruin_pressed(list: any) { on_mapbutton_pressed(2); }
  function on_forestruin_pressed(list: any) { on_mapbutton_pressed(3); }
  function on_mountainruin_pressed(list: any) { on_mapbutton_pressed(4); }
  function on_ancientmine_pressed(list: any) { on_mapbutton_pressed(5); }

  return {
    init(self) {
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);

      root_max_x = gui.get_position(gui.get_node("map/bg")).x;
      // How far the map may be dragged: its own size less what the screen shows.
      root_min_x = root_min_x - gui.get_size(gui.get_node("map/bg")).x * gui.get_scale(gui.get_node("map/bg")).x + screen.w;
    },

    on_input(self, action_id, action) {
      if (action_id !== undefined && action_id !== null && enabled) {
        if (action.pressed) {
          xoffset = action.screen_x;
          pos = gui.get_position(gui.get_node("map/bg"));
          root_start_x = pos.x;
        } else if (action.released) {
        }
        // PARITY: before the first press `pos` is the number 0; Lua errors on indexing it, JS throws TypeError on the write.
        pos.x = root_start_x + (action.screen_x - xoffset);
        if (pos.x < root_min_x) { pos.x = root_min_x; }
        if (pos.x > root_max_x) { pos.x = root_max_x; }
        gui.set_position(gui.get_node("map/bg"), pos);
        gooey.button("kingdom/bg", action_id, action, on_kingdom_pressed);
        gooey.button("loc/farm/tab", action_id, action, on_farm_pressed, G.update_farm_button);
        gooey.button("loc/desert_ruin/tab", action_id, action, on_desertruin_pressed, G.update_desertruin_button);
        gooey.button("loc/forest_ruin/tab", action_id, action, on_forestruin_pressed, G.update_forestruin_button);
        gooey.button("loc/mountain_ruin/tab", action_id, action, on_mountainruin_pressed, G.update_mountainruin_button);
        gooey.button("loc/mine/tab", action_id, action, on_ancientmine_pressed, G.update_ancientmine_button);
      }
    },

    /* ******************************************
    MESSAGES
    ******************************************** */

    on_message(self, message_id, message, sender) {
      if (message_id === hash("set_enabled")) {
        print(S.upper(currentPage), "enabled", enabled);
        enabled = message.enabled;
        gui.set_enabled(gui.get_node("root"), enabled);
        if (enabled) {
          msg.post("main:/overlay#nav", "set_enabled", { enabled: false });

          if (message.map_id !== undefined && message.map_id !== null) { map_id = message.map_id; }
          msg.post(controller, "focus_kingdom", { status: false });
          refresh_all();
        }
        msg.post("main:/overlay#back", "set_enabled", { enabled: message.enabled });
      } else if (message_id === hash("refresh_all")) {
        refresh_all();
      }
    },

    update(self, dt) {
      layout_screen();
    },
  };
});
