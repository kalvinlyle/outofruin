import { defineScript, gui, msg, hash, vmath, window, sys, print } from '../../../engine';
import { t, len, S, T } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import progress_ from '../../progress/progress';
import saveload from '../../saveload/saveload';
import loc from '../../shared/locsheets';
import { isNative, betaEnabled, setBetaEnabled, otaStatus } from '../../../systems/live-updates';

void inspect; void random; void progress_; void saveload;

defineScript('/main/settings/settings.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "settings";
  const controller = "main:/menu#controller";
  let enabled: any = false;
  let active: any = true;

  let options_list: any[] = [];
  const options: any[] = [
    {
      listText: "hold to reset progress",
      navigationMessage: "reset_statistics",
      message: {},
      debug: false,
    },
    {
      listText: "toggle profiler",
      navigationMessage: "toggle_profile",
      message: {},
      debug: true,
    },
    {
      listText: "reset free loot timer",
      navigationMessage: "free_loot",
      message: {},
      debug: true,
    },
    {
      listText: "get 10,000 gold",
      navigationMessage: "mod_gold",
      message: { amount: 10000 },
      debug: true,
    },
    {
      listText: "unlock a hero",
      navigationMessage: "unlock_hero",
      message: {},
      debug: true,
    },
    {
      listText: "trigger rank up sequence",
      navigationMessage: "show_sellitems",
      message: {},
      debug: true,
    },
    {
      listText: "trigger rank up portal",
      navigationMessage: "show_sellitems",
      message: { portal: true },
      debug: true,
    },
    {
      listText: "cancel global boost",
      navigationMessage: "cancel_globalBoost",
      message: {},
      debug: true,
    },
    {
      listText: "double global boost",
      navigationMessage: "double_globalBoost",
      message: {},
      debug: true,
    },
    {
      listText: "show cards button",
      navigationMessage: "show_cardsbutton",
      message: {},
      debug: true,
    },
    {
      listText: "show shop button",
      navigationMessage: "show_shopbutton",
      message: {},
      debug: true,
    },
  ];

  /* Reset progress is irreversible, so it takes a deliberate hold and then a
  confirmation, never a single tap. The fill makes the wait visible: without it
  three seconds of nothing reads as a dead button and the player lets go at two. */
  const RESET_HOLD_TIME = 3;
  const RESET_HINT_TIME = 2;
  const TOUCH = hash("touch");
  const reset: { holding: boolean; t: number; item: any; fill: any; hint: number } = { holding: false, t: 0, item: undefined, fill: undefined, hint: 0 };

  function reset_item(list: any) {
    for (let i = 1; i <= len(list.items); i++) {
      const item = list.items[i - 1];
      if (item.data !== undefined && item.data !== null && item.data.navigationMessage === "reset_statistics") return item;
    }
    return undefined;
  }

  function set_resetfill(progress: number) {
    if (!t(reset.item)) return;
    const root = reset.item.nodes[hash("options/listitem")];
    const size = gui.get_size(root);
    if (!t(reset.fill)) {
      reset.fill = gui.new_box_node(vmath.vector3(-size.x / 2, 0, 0), vmath.vector3(0, size.y, 0));
      gui.set_pivot(reset.fill, gui.PIVOT_W);
      gui.set_color(reset.fill, vmath.vector4(0.89, 0.29, 0.29, 0.55));
      gui.set_parent(reset.fill, root);
      gui.move_below(reset.fill, reset.item.nodes[hash("options/listitem/text")]);
    }
    gui.set_enabled(reset.fill, progress > 0);
    gui.set_size(reset.fill, vmath.vector3(size.x * progress, size.y, 0));
  }

  function end_hold() {
    reset.holding = false;
    reset.t = 0;
    set_resetfill(0);
  }

  function start_hold(item: any) {
    reset.holding = true;
    reset.t = 0;
    reset.hint = 0;
    reset.item = item;
    gui.set_text(item.nodes[hash("options/listitem/text")], item.data.listText);
  }

  function abort_hold() {
    if (!reset.holding) return;
    end_hold();
    // Letting go early has to say why nothing happened.
    gui.set_text(reset.item.nodes[hash("options/listitem/text")], "keep holding for 3 seconds");
    reset.hint = RESET_HINT_TIME;
  }

  function open_confirm() {
    end_hold();
    msg.post(controller, "popup_confirm", {
      title: loc.get("RESET_PROGRESS_CONFIRM_TITLE"),
      text: loc.get("RESET_PROGRESS_CONFIRM_MESSAGE"),
      msgpost: { message_id: "reset_statistics", message: {} },
    });
  }

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
    // Title bar under the header, option list filling down to the footer.
    const navbar = content_top() - 55.5;
    place("navbar/bg", undefined, navbar);
    resize("navbar/bg", w, undefined);
    resize("options/stencil", w, (navbar - 35) - (content_bottom() - 7));
  }

  function update_optionText(list: any) {
    for (let i = 1; i <= len(list.items); i++) {
      const item = list.items[i - 1];
      if (item.data !== undefined && item.data !== null) {
        const text = item.nodes[hash("options/listitem/text")];
        gui.set_text(text, item.data.listText); // .. ":" ..  item.index)
      }
    }
  }

  function refresh_all() {
    options_list = [];
    const isDebug = sys.get_engine_info().is_debug;
    for (let o = 1; o <= len(options); o++) {
      const option = options[o - 1];
      if (t(isDebug) || (!t(isDebug) && !t(option.debug))) {
        T.insert(options_list, option);
      }
    }
    // Native app only: live updates have no meaning in a browser, which always runs the latest build.
    if (isNative()) {
      T.insert(options_list, { listText: "beta updates: " + (betaEnabled() ? "on" : "off"), navigationMessage: "toggle_beta", message: {}, local: true });
      if (otaStatus.version) {
        const channel = otaStatus.channel ? " - " + otaStatus.channel : "";
        T.insert(options_list, { listText: "version " + otaStatus.version + channel, navigationMessage: "none", message: {}, local: true });
      }
    }
    update_optionText(gooey.dynamic_list("options", "options/stencil", "options/listitem", options_list));
  }

  function on_item_selected(list: any) {
    if (list.items[list.selected_item - 1].data !== undefined && list.items[list.selected_item - 1].data !== null) {
      // Reset is driven by the hold in on_input, never by a tap.
      if (list.items[list.selected_item - 1].data.navigationMessage === "reset_statistics") return;
      // Port-only rows, handled here rather than by the menu controller.
      if (list.items[list.selected_item - 1].data.local) {
        if (list.items[list.selected_item - 1].data.navigationMessage === "toggle_beta") {
          void setBetaEnabled(!betaEnabled()).then(() => { if (t(enabled)) refresh_all(); });
        }
        return;
      }
      if (!t(list.items[list.selected_item - 1].data.disabled)) {
        msg.post("main:/menu#controller", list.items[list.selected_item - 1].data.navigationMessage, list.items[list.selected_item - 1].data.message);
      }
    }
  }

  return {
    init(_self) {
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      gui.set_render_order(15);
    },

    update(_self, dt) {
      layout_screen();
      if (reset.holding) {
        reset.t = reset.t + dt;
        set_resetfill(Math.min(1, reset.t / RESET_HOLD_TIME));
        if (reset.t >= RESET_HOLD_TIME) open_confirm();
      } else if (reset.hint > 0) {
        reset.hint = reset.hint - dt;
        if (reset.hint <= 0 && t(reset.item)) {
          gui.set_text(reset.item.nodes[hash("options/listitem/text")], reset.item.data.listText);
        }
      }
    },

    on_input(_self, action_id, action) {
      if (t(enabled) && t(active)) {
        gooey.button("navbar/backbutton/bg", action_id, action, () => { msg.post(controller, "show_dungeonmine"); });
        const list = gooey.dynamic_list("options", "options/stencil", "options/listitem", options_list, action_id, action, undefined, on_item_selected);
        if (action_id === TOUCH) {
          const item = reset_item(list);
          const over = item !== undefined && gui.pick_node(item.nodes[hash("options/listitem")], action.x, action.y);
          if (action.pressed && over) {
            start_hold(item);
          } else if (action.released || (reset.holding && !over)) {
            // Releasing, or sliding off (which is also how the list scrolls), ends the hold.
            abort_hold();
          }
        }
      } else if (reset.holding) {
        end_hold();
      }
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        if (t(enabled)) {
          refresh_all();
          message.focus = "settings";
        }
        msg.post("main:/background#background", "set_enabled", message);
        msg.post("main:/overlay#header", "set_enabled", message);
      } else if (message_id === hash("set_active")) {
        active = message.active;
      } else if (message_id === hash("refresh_all")) {
        if (t(enabled)) refresh_all();
      } else if (message_id === hash("layout_changed")) {
        gooey.dynamic_list("options", "options/stencil", "options/listitem", options_list).scroll_to(0, 0);
        update_optionText(gooey.dynamic_list("options", "options/stencil", "options/listitem", options_list));
      }
    },
  };
});
