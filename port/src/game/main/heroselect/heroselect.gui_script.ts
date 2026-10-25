import { defineScript, gui, msg, hash, vmath, window, print } from '../../../engine';
import { t, cat, len, S, T } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import progress from '../../progress/progress';
import defsave from '../../defsave/defsave';
import loc from '../../shared/locsheets';

void inspect; void random; void progress;

defineScript('/main/heroselect/heroselect.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "heroselect";

  const controller = "main:/menu#controller";
  let enabled: any = false;

  let hero_list: any[] = [];
  const quests_list: any = {}; void quests_list;
  let selected_list: any = {}; void selected_list;

  let map_id: any = 1;
  let dungeon_id: any = 0;
  let slot_id: any = 0;
  let hero_id: any = 0;

  let bar_size: any = 0; void bar_size;
  const dungeon: any = undefined; void dungeon;
  let gold: any = 0; void gold;

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
    const top = screen_top() - 129;
    place("heroselect/root", undefined, top);
    resize("heroselect/root", w, top - (content_bottom() - 25));
    resize("heroselect/stencil", w, top - (content_bottom() + 25));
    place("panel_bottom/bg", undefined, screen_bottom() - 20);
    resize("panel_bottom/bg", w + 150, undefined);
  }

  /* ******************************************
              FUNCTIONS
  ******************************************** */

  function setbutton_fancy(node: any, colour: string) {
    gui.play_flipbook(node, cat("tinyfancybutton_", colour));
  }

  function setbutton_panel(node: any, colour: string) {
    gui.play_flipbook(node, cat("tinyfancypanel_", colour));
  } void setbutton_panel;

  function update_assignhero(_button?: any) {
    const node = gui.get_node("quest/bg");
    setbutton_fancy(node, "grey");
    if (hero_id > 0) {
      setbutton_fancy(node, "orange");
    }
  } void update_assignhero;

  function update_heroselect(list: any) {
    const templistitems: any[] = [];
    for (let i = 1; i <= len(hero_list); i++) {
      T.insert(templistitems, list.items[i - 1]);
    }
    for (let i = 1; i <= len(templistitems); i++) {
      const item = templistitems[i - 1];
      if (item.data !== undefined && item.data !== null && t(enabled)) {
        if (item.data.Name !== "") {
          gui.set_enabled(item.nodes[hash("heroselect/panel/bg")], true);
          gui.set_text(item.nodes[hash("heroselect/panel/text")], loc.get(item.data.Name));
          gui.set_text(item.nodes[hash("heroselect/level/text")], loc.get("HERO_LEVEL", item.data.Level));
          gui.play_flipbook(item.nodes[hash("heroselect/portrait")], item.data.Portrait.flipbook);

          const panelBgNode = item.nodes[hash("hero/bg")];
          const progressBgNode = item.nodes[hash("heroselect/progress/bg")];
          const costBgNode = item.nodes[hash("heroselect/cost/bg")]; void costBgNode;
          const progressStatusNode = item.nodes[hash("heroselect/progress/status")]; void progressStatusNode;
          const progressTimeNode = item.nodes[hash("heroselect/progress/time")]; void progressTimeNode;
          const progressBarNode = item.nodes[hash("heroselect/progress/bar")]; void progressBarNode;

          if (hero_list[i - 1] !== undefined && hero_list[i - 1] !== null) {
            list.items[i - 1].active = true;
            gui.set_enabled(progressBgNode, false);
            if (hero_id !== item.data.id) setbutton_fancy(panelBgNode, "grey");
            else if (hero_id === item.data.id) setbutton_fancy(panelBgNode, "blue");
          }
        } else {
          gui.set_enabled(item.nodes[hash("heroselect/panel/bg")], false);
        }
      }
    }
  }

  function on_assignhero_pressed() {
    if (hero_id !== 0) {
      msg.post(controller, "assign_hero", { dungeon_id: dungeon_id, map_id: map_id, hero_id: hero_id, slot_id: slot_id });
      msg.post(controller, "show_dungeonmine");
    }
  } void on_assignhero_pressed;

  function on_hero_pressed(list: any) {
    hero_id = list.data[list.selected_item - 1].id;
    msg.post(controller, "assign_hero", { dungeon_id: dungeon_id, map_id: map_id, hero_id: hero_id, slot_id: slot_id });
    msg.post(controller, "show_dungeonmine");
  }

  function set_nodeHeight(node_: string, num: number, nodeHeight: number, max: number) {
    const node = gui.get_node(node_);
    const nodeSize = gui.get_size(node);
    const ySize = Math.min(max, nodeHeight * num);
    gui.set_size(node, vmath.vector3(nodeSize.x, ySize, nodeSize.z));
  } void set_nodeHeight;

  function refresh_all() {
    gui.set_enabled(gui.get_node("quest/bg"), false);
    gold = defsave.loaded.Currency.data.Gold;

    hero_list = [];

    const heroes = defsave.loaded.Hero.data;
    for (let h = 1; h <= len(heroes); h++) {
      const hero = heroes[h - 1];
      if (!t(hero.Locked) && (hero.location === undefined || hero.location === null)) {
        T.insert(hero_list, hero);
      }
    }

    /*
    local temp = saveload.load_data(productName, "Quests")

    quests_list = {}
    for k,v in ipairs(temp) do
      if v.Stages ~= nil then
        if v.Stage < #v.Stages or ( v.Stage == #v.Stages and v.Stages[v.Stage].Remaining > 0 ) then
          table.insert(quests_list, v)
        end
      end
    end
    */
  }

  return {
    init(_self) {
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      bar_size = gui.get_size(gui.get_node("heroselect/progress/bg"));
      gui.set_render_order(5);
    },

    update(_self, _dt) {
      layout_screen();
      if (t(enabled)) {
        refresh_all();
        if (hero_list !== undefined && hero_list !== null) {
          update_heroselect(gooey.dynamic_list("heroselect/panel/bg", "heroselect/stencil", "heroselect/panel/bg", hero_list));
        }
      }
    },

    on_input(_self, action_id, action) {
      if (action_id !== undefined && action_id !== null && t(enabled)) {
        gooey.dynamic_list("heroselect/panel/bg", "heroselect/stencil", "heroselect/panel/bg", hero_list, action_id, action, undefined, on_hero_pressed, update_heroselect);
      }
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "set_enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        msg.post("main:/background#background", "set_enabled", { enabled: enabled });
        if (t(enabled)) {
          selected_list = {};
          map_id = message.map_id;
          dungeon_id = message.dungeon_id;
          slot_id = message.slot_id;
          hero_id = 0;
          const node = gui.get_node("quest/bg");
          setbutton_fancy(node, "grey");
          refresh_all();
        }
        msg.post("main:/overlay#back", "set_enabled", { enabled: message.enabled });
      } else if (message_id === hash("refresh_all")) {
        hero_id = 0;
        const node = gui.get_node("quest/bg");
        setbutton_fancy(node, "grey");
        refresh_all();
      }
    },
  };
});
