import { defineScript, gui, msg, hash, vmath, window, print } from '../../../engine';
import { t, cat, S, T, M, pairs } from '../../../lua';
import { G } from '../../globals';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import actions from '../../actions';
import saveload from '../../saveload/saveload';
import defsave from '../../defsave/defsave';
import loc from '../../shared/locsheets';

void saveload; void loc;

function assert(v: unknown, m?: string): void {
  if (!t(v)) throw new Error(m ?? 'assertion failed!');
}

defineScript('/main/sellitems/sellitems.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "sellitems";
  const controller = "main:/menu#controller";
  let enabled: any = false;
  let portal: any = false;

  let resource_data: any = {};
  let resource_nodes: any = {};
  // Integer keys assigned in ascending order, possibly with gaps: a plain
  // object so `pairs` replays Lua's layout.
  let inventory: Record<number, any> = {};

  let itemNode: any = {};
  let itemSize: any = {};
  let invNode: any = {};
  let invPos: any = {};
  let invSize: any = {};
  let framePos: any = {};
  let shadowColor: any = {};

  let invPadding = 0;
  let numRows = 0;
  let numCols = 0;

  const Gold = 0; void Gold;
  let bonusGold = 0;
  let invValue = 0;

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

  function screen_left() { return (DESIGN_W - screen.w) / 2; }
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
    const [w, h] = r;
    place("background", screen_left(), screen_bottom());
    resize("background", w, h);

    // Currency strip under the header, inventory filling down to the footer.
    place("currency/bg", undefined, screen_top() - 89);
    const frame = screen_top() - 114;
    place("inventory/frame", screen_left() + 25, frame);
    resize("inventory/frame", w - 50, frame - (content_bottom() + 40));
    const inner = screen_top() - 137;
    place("inventory/bg", screen_left() + 50, inner);
    resize("inventory/bg", w - 100, inner - (content_bottom() + 20));

    place("panel_bottom/bg", undefined, screen_bottom() - 20);
    resize("panel_bottom/bg", w + 150, undefined);
  }

  /* ******************************************
              FUNCTIONS
  ******************************************** */

  function update_item(slot: any) {
    assert(slot.item, cat(S.upper(currentPage), ": Item data missing"));

    gui.set_text(slot.nodes[hash("item/text")], actions.display_number(slot.item.Count));
    gui.set_enabled(slot.nodes[hash("item/text")], slot.item.Count > 0);

    gui.set_text(slot.nodes[hash("item/value")], cat(actions.display_number(slot.item.totalValue), " gold"));
    gui.set_color(slot.nodes[hash("item/value")], actions.get_color("brightgold"));
    gui.set_enabled(slot.nodes[hash("item/value")], slot.item.totalValue > 0 && slot.item.Count > 0);

    if (slot.item.totalValue > 0 && slot.item.Count > 0) {
      gui.play_flipbook(slot.nodes[hash("item/icon/bg")], "tinyfancypanel_gold");
      gui.play_flipbook(slot.nodes[hash("item/frame/bg")], "tinyfancypanel_gold");
    } else {
      gui.play_flipbook(slot.nodes[hash("item/icon/bg")], "tinyfancypanel_grey");
      gui.play_flipbook(slot.nodes[hash("item/frame/bg")], "tinyfancypanel_darkgrey");
    }

    if (slot.item.Lifetime + slot.item.Count > 0) {
      gui.set_enabled(slot.nodes[hash("item/unknown")], false);
      gui.set_enabled(slot.nodes[hash("item/icon")], true);
      gui.set_texture(slot.nodes[hash("item/icon")], slot.item.Icon.texture);
      gui.play_flipbook(slot.nodes[hash("item/icon")], slot.item.Icon.flipbook);

      gui.set_enabled(slot.nodes[hash("item/icon/shadow")], true);
      gui.set_texture(slot.nodes[hash("item/icon/shadow")], slot.item.Icon.texture);
      gui.play_flipbook(slot.nodes[hash("item/icon/shadow")], slot.item.Icon.flipbook);
    } else {
      gui.set_enabled(slot.nodes[hash("item/unknown")], true);
      gui.set_enabled(slot.nodes[hash("item/icon")], false);
      gui.set_enabled(slot.nodes[hash("item/icon/shadow")], false);
    }
  }

  function set_itempos(slot: any) {
    const row = Math.floor(slot.num / numCols);
    const col = slot.num - (row * numCols);

    slot.item.pos = vmath.vector3(invPos.x + (col * itemSize.x) + invPadding, invPos.y - (row * itemSize.y) - invPadding, 1);
    gui.set_position(slot.nodes[hash("item/bg")], slot.item.pos);

    const yPos = framePos.y + M.random(250, 750);
    const duration = M.random(1, 4) / 5;
    gui.set_position(slot.nodes[hash("item/frame/bg")], vmath.vector3(framePos.x, yPos, framePos.z));
    gui.animate(slot.nodes[hash("item/frame/bg")], "position.y", framePos.y, gui.EASING_OUTBOUNCE, duration);

    gui.set_color(slot.nodes[hash("item/shadow/bg")], vmath.vector4(shadowColor.x, shadowColor.y, shadowColor.z, 0));
    gui.animate(slot.nodes[hash("item/shadow/bg")], "color", vmath.vector4(shadowColor.x, shadowColor.y, shadowColor.z, 0.5), gui.EASING_OUTBOUNCE, duration);
    gui.set_scale(slot.nodes[hash("item/shadow/bg")], vmath.vector3(1, 1, 1));
    gui.animate(slot.nodes[hash("item/shadow/bg")], "scale", vmath.vector3(2, 2, 2), gui.EASING_OUTBOUNCE, duration);

    const rotation = M.random(-10, 10);
    gui.set_rotation(slot.nodes[hash("item/shadow/bg")], vmath.vector3(0, 0, rotation - 6));
    gui.set_rotation(slot.nodes[hash("item/frame/bg")], vmath.vector3(0, 0, rotation));

    return slot;
  }

  function delete_nodes(node_list: any) {
    if (node_list !== undefined && node_list !== null) {
      // PARITY: Lua iterates clone_tree's hash-keyed table in pointer-hash order; here pairs over the engine's table.
      for (const [, node] of pairs(node_list)) {
        gui.delete_node(node as any);
      }
      node_list = {};
    }
    return node_list;
  }

  function createSlot(slot: any, item: any) {
    slot.nodes = delete_nodes(slot.nodes);
    slot.nodes = gui.clone_tree(itemNode);
    slot.item = item;
    gui.set_enabled(slot.nodes[hash("item/bg")], true);
    return slot;
  }

  function update_inventory(data: any, nodes: any): [any, any] {
    let num = 0;
    for (const [i_, item] of pairs<any>(data)) {
      const i = i_ as number;
      if (item.Value > 0) {
        if (inventory[i] === undefined || inventory[i] === null) inventory[i] = {};
        inventory[i].num = num;
        inventory[i] = createSlot(inventory[i], item);
        inventory[i] = set_itempos(inventory[i]);
        update_item(inventory[i]);
        invValue = invValue + item.totalValue;
        num = num + 1;
      }
    }
    return [data, nodes];
  }

  function sort_cards(data: any[], field1: string, field2: string, direction: any) {
    direction = t(direction) ? direction : true;
    T.sort(data, (a: any, b: any) => {
      assert(a[field1], cat("field ", field1, " does not exist in ", a.Name));
      assert(a[field2], cat("field ", field2, " does not exist in ", a.Name));
      assert(b[field1], cat("field ", field1, " does not exist in ", b.Name));
      assert(b[field2], cat("field ", field2, " does not exist in ", b.Name));
      if (a[field1] < b[field1]) {
        return direction;
      } else if (a[field1] > b[field1]) {
        return !t(direction);
      } else {
        return a[field2] < b[field2];
      }
    });
    return data;
  }

  function refresh_all() {
    if (t(enabled)) {
      G.Currency = actions.clone(defsave.loaded.Currency.data);
      gui.set_text(gui.get_node("gold/total"), G.Currency.Gold + bonusGold);
      gui.set_text(gui.get_node("xp/total"), G.Currency.Xp);
      gui.set_text(gui.get_node("followers/total"), actions.display_number(defsave.get("Currency", "Followers")));

      resource_data = actions.clone(defsave.loaded.Resources.data);
      resource_data = sort_cards(resource_data, "Name", "totalValue", true);
      [resource_data, resource_nodes] = update_inventory(resource_data, resource_nodes);
    }
  }

  /* ******************************************
              INPUT
  ******************************************** */

  function on_itembutton_pressed(num: number) {
    const particlespeed = 1;
    const iconNode = inventory[num].nodes[hash("item/frame/bg")];
    const startPos = gui.get_screen_position(iconNode);
    const numParticles = inventory[num].item.totalValue;

    const postmsg = { receiver: "main:/menu#sellitems", message_id: "mod_bonusGold", message: { amount: 1 } };
    msg.post(controller, "spawn_particles", { num: numParticles, startPos: startPos, endTarget: "target_gold", time: particlespeed, icon: { texture: "main", flipbook: "coin_spin" }, postmsg: postmsg });

    invValue = invValue - inventory[num].item.totalValue;
    inventory[num].item.totalValue = 0;
    gui.set_text(inventory[num].nodes[hash("item/value")], "");

    gui.set_text(inventory[num].nodes[hash("item/text")], "0");
    gui.play_flipbook(inventory[num].nodes[hash("item/frame/bg")], "tinyfancypanel_darkbrown");
    gui.play_flipbook(inventory[num].nodes[hash("item/icon/bg")], "tinyfancypanel_brown");
  }

  function update_button(button: any) {
    if (invValue > 0) {
      gui.play_flipbook(button.node, "tinyfancybutton_grey");
    } else {
      gui.play_flipbook(button.node, "tinyfancybutton_orange");
    }
  }

  function on_button_pressed(_button?: any) {
    if (t(enabled) && invValue <= 0) {
      for (const [s] of pairs(inventory)) {
        inventory[s as number].nodes = delete_nodes(inventory[s as number].nodes);
      }
      inventory = {};
      msg.post(controller, "mod_gold", { amount: bonusGold });
      msg.post(controller, "chapter_gold", { amount: bonusGold, rank: defsave.get("Stats", "Rank") });
      msg.post(controller, "complete_rank", { callback: "dungeonmine", rank: defsave.get("Stats", "Rank"), portal: portal });
      msg.post(controller, "show_dungeonmine", { map_id: 1, dungeon_id: 1 });
    }
  }

  return {
    init(_self) {
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      itemNode = gui.get_node("item/bg");
      gui.set_enabled(itemNode, false);
      itemSize = gui.get_size(itemNode);
      invNode = gui.get_node("inventory/bg");
      invPos = gui.get_position(invNode);
      invSize = gui.get_size(invNode);
      shadowColor = gui.get_color(gui.get_node("item/shadow/bg"));
      framePos = gui.get_position(gui.get_node("item/frame/bg"));
      numRows = Math.floor(invSize.y / itemSize.y); void numRows;
      numCols = Math.floor(invSize.x / itemSize.x);
      invPadding = (invSize.x - (itemSize.x * numCols)) / 2;
    },

    on_input(_self, action_id, action) {
      if (action_id !== undefined && action_id !== null && t(enabled) && action.pressed) {
        for (const [n_] of pairs(inventory)) {
          const n = n_ as number;
          assert(inventory[n].nodes[hash("item/bg")], cat("node missing for ", inventory[n].item.Name, inspect(inventory[n])));
          const node = inventory[n].nodes[hash("item/bg")];
          const pos = gui.get_position(node); void pos;
          if (gui.pick_node(node, action.x, action.y) && inventory[n].item.Count > 0) {
            on_itembutton_pressed(n);
          }
        }
      }
      gooey.button("button/bg", action_id, action, on_button_pressed, update_button);
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        if (t(enabled)) {
          msg.post(controller, "pause");
        } else {
          msg.post(controller, "unpause");
        }
        portal = t(message.portal) ? message.portal : false;
        refresh_all();
      } else if (message_id === hash("refresh_all")) {
        refresh_all();
      } else if (message_id === hash("mod_bonusGold")) {
        bonusGold = bonusGold + message.amount;
        gui.set_text(gui.get_node("gold/total"), G.Currency.Gold + bonusGold);
      } else if (message_id === hash("update_fps")) {
        gui.set_text(gui.get_node("fps/text"), cat("fps: ", message.text));
      }
    },

    update(_self, _dt) {
      layout_screen();
    },
  };
});
