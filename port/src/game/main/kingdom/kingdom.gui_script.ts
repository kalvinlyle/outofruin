import { defineScript, gui, msg, hash, vmath, window, print } from '../../../engine';
import { t, cat, len, S } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import progress from '../../progress/progress';
import saveload from '../../saveload/saveload';

void inspect; void random; void progress;

defineScript('/main/kingdom/kingdom.gui_script', () => {
  const productName = "OoR";
  const currentPage = "kingdom";
  const controller = "main:/menu#controller";
  let enabled: any = false;

  const NODES = 31;
  let map_list: any = {};
  let xoffset = 0;
  let yoffset = 0;
  let pos: any = 0;
  let root_start_x = 0;
  let root_min_x = 0;
  let root_max_x = 0;
  let root_start_y = 0;
  let root_min_y = 0;
  let root_max_y = 0;
  const mapNodes: any[] = [];

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
    place("kingdom/clip", screen_left(), screen_bottom());
    resize("kingdom/clip", w, h);
  }

  /* ******************************************
            FUNCTIONS
  ******************************************** */

  function update_node(node: any, map_id: number) {
    if (enabled) {
      gui.set_enabled(node, false);
      if (map_list[map_id - 1] !== undefined && map_list[map_id - 1] !== null) {
        const list = map_list[map_id - 1];
        for (let i = 1; i <= len(list); i++) {
          const item = list[i - 1];
          if (t(item.enabled)) {
            gui.set_enabled(node, true);
            break;
          }
        }
      }
    }
  }

  function refresh_all() {
    if (enabled) {
      map_list = saveload.load_data(productName, "Map");
      print(cat(S.upper(currentPage), " map data loaded")); //, inspect(map_list))
      for (let i = 1; i <= NODES; i++) {
        update_node(gui.get_node(cat("tab_", i)), i);
      }
    }
  }

  /* ******************************************
            INPUT
  ******************************************** */

  function on_node_pressed(node: any, node_id: number) {
    if (node_id <= len(map_list)) {
      msg.post(controller, "show_map", { map_id: node_id });
    }
  }

  return {
    init(self) {
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);

      root_max_x = 0;
      // How far the map may be dragged: its own size less what the screen shows.
      root_min_x = root_min_x - gui.get_size(gui.get_node("kingdom/bg")).x + screen.w;
      root_max_y = 0;
      root_min_y = root_min_y - gui.get_size(gui.get_node("kingdom/bg")).y + screen.h;

      for (let i = 1; i <= NODES; i++) {
        mapNodes[i - 1] = gui.get_flipbook(gui.get_node(cat("tab_", i)));
      }
    },

    on_input(self, action_id, action) {
      if (action_id !== undefined && action_id !== null && enabled) {
        if (action_id !== undefined && action_id !== null) {
          if (action.pressed) {
            xoffset = action.screen_x;
            yoffset = action.screen_y;
            pos = gui.get_position(gui.get_node("kingdom/bg"));
            root_start_x = pos.x;
            root_start_y = pos.y;
          } else if (action.released) {
          }

          // PARITY: before the first press `pos` is the number 0; Lua errors on indexing it, JS throws TypeError on the write.
          pos.x = root_start_x + (action.screen_x - xoffset);
          pos.y = root_start_y + (action.screen_y - yoffset);
          if (pos.x < root_min_x) { pos.x = root_min_x; }
          if (pos.x > root_max_x) { pos.x = root_max_x; }
          if (pos.y < root_min_y) { pos.y = root_min_y; }
          if (pos.y > root_max_y) { pos.y = root_max_y; }
          gui.set_position(gui.get_node("kingdom/bg"), pos);
        }
        for (let i = 1; i <= NODES; i++) {
          gooey.button(cat("tab_", i), action_id, action,
            function (button: any) {
              on_node_pressed(gui.get_node(cat("tab_", i)), i);
            },
            function (button: any) {
              update_node(gui.get_node(cat("tab_", i)), i);
            });
        }
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
        if (t(enabled)) {
          msg.post("main:/overlay#header", "set_enabled", { enabled: false });
          msg.post(controller, "focus_kingdom", { status: true });
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
