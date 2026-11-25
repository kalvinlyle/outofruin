import { defineScript, gui, msg, hash, vmath, window, print } from '../../../engine';
import { t, cat, S, M, tostring } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import actions from '../../actions';
import defsave from '../../defsave/defsave';
import loc from '../../shared/locsheets';
import buttonFx from '../../shared/button_fx';
import audio from '../../../systems/audio';

void inspect;

// Used by two components: the locals below are shared by both, as in the Lua chunk.
defineScript('/main/upgradecard/upgradecard.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "rankUp_popup";
  const controller = "main:/menu#controller";
  let enabled: any = false;
  let pause = true;
  let card: any = {};
  let source: any = {}; // the card being levelled: { type, id }
  let textPos: any = {};
  let complete_purchase_callback: any = "dungeonmine";

  const color: Record<string, string> = {
    Common: "tinyfancybutton_darkgrey",
    Wild: "tinyfancybutton_brown",
    Rare: "tinyfancybutton_green",
    Epic: "tinyfancybutton_blue",
    Legendary: "tinyfancybutton_purple",
    Exotic: "tinyfancybutton_orange",
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
  function content_top() { return screen_top() - HEADER_DEPTH; } void content_top;
  function content_bottom() { return screen_bottom() + FOOTER_TOP; } void content_bottom;

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
  } void resize;

  function layout_screen() {
    const r = screen_changed();
    if (!r) return;
    const [, h] = r;
    place("root/center", undefined, screen_bottom() + h / 2);
  }

  function unpause() {
    pause = false;
  }

  /* ******************************************
              CONFIRM
  ******************************************** */

  /* A level-up spends XP, or on an event card that event's shards, so it asks
  first: under the card is what it costs, and Upgrade or Cancel. Nothing is
  spent until Upgrade is tapped. The header is hidden on this screen, so a chip
  at the top stands in for its XP slot, showing what the player has of the
  currency being spent; on Upgrade the spend flies out of that chip into the
  card while the chip counts down, and the card takes its new level as the last
  one lands. Built at runtime, since the scene has no nodes for it. */
  const BUTTON_TEXT_W = 250;
  let stage = "idle"; // "confirm", "flying", "done"
  let confirm: any = undefined;
  let funds: any = undefined;
  let countdown: any = undefined; // the chip's count running down mid-flight
  // This script runs in more than one scene, and every instance shares these
  // locals; only the one that was shown owns the nodes built here.
  let owner: any = undefined;

  function new_text(font: string, pos: any, size: any, scale: number, parent: any) {
    const node = gui.new_text_node(pos, "");
    gui.set_font(node, font);
    gui.set_size(node, size);
    gui.set_scale(node, vmath.vector3(scale, scale, 1));
    gui.set_outline(node, vmath.vector4(0, 0, 0, 1));
    gui.set_parent(node, parent);
    return node;
  }

  function new_panel(flipbook: string, pos: any, size: any, parent: any) {
    const node = gui.new_box_node(pos, size);
    gui.set_texture(node, "main");
    gui.play_flipbook(node, flipbook);
    gui.set_slice9(node, vmath.vector4(16, 22, 32, 42));
    gui.set_parent(node, parent);
    return node;
  }

  function set_button_text(node: any, text: any) {
    gui.set_text(node, text);
    gui.set_scale(node, vmath.vector3(1, 1, 1));
    const width = gui.get_text_metrics_from_node(node).width;
    if (width > BUTTON_TEXT_W) {
      const s = BUTTON_TEXT_W / width;
      gui.set_scale(node, vmath.vector3(s, s, 1));
    }
  }

  /** string.reverse */
  function reverse(s: string): string { return s.split('').reverse().join(''); }

  // "12,500": the cost is exact here, never "12.5K".
  function full_number(n: number) {
    const digits = reverse(S.gsub(reverse(tostring(Math.floor(n))), "(%d%d%d)", "%1,")[0]);
    return S.gsub(digits, "^,", "")[0];
  }

  function build_confirm() {
    const bg = gui.get_node("upgradecard/bg");
    const top = gui.get_position(bg).y - gui.get_size(bg).y / 2 - 20;
    confirm = {};
    confirm.root = gui.new_box_node(vmath.vector3(0, top, 0), vmath.vector3(0, 0, 0));
    gui.set_parent(confirm.root, gui.get_node("root/center"));

    confirm.cost = gui.new_box_node(vmath.vector3(0, -40, 0), vmath.vector3(0, 0, 0));
    gui.set_parent(confirm.cost, confirm.root);
    confirm.icon = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(72, 72, 0));
    gui.set_parent(confirm.icon, confirm.cost);
    confirm.amount = new_text("titlex2", vmath.vector3(0, 0, 0), vmath.vector3(500, 80, 0), 0.75, confirm.cost);
    gui.set_pivot(confirm.amount, gui.PIVOT_W);

    confirm.buttons = gui.new_box_node(vmath.vector3(0, -135, 0), vmath.vector3(0, 0, 0));
    gui.set_parent(confirm.buttons, confirm.root);
    confirm.buy = new_panel("tinyfancybutton_green", vmath.vector3(-155, 0, 0), vmath.vector3(280, 95, 0), confirm.buttons);
    confirm.buyText = new_text("title", vmath.vector3(0, 8, 0), vmath.vector3(250, 40, 0), 1, confirm.buy);
    confirm.cancel = new_panel("tinyfancybutton_red", vmath.vector3(155, 0, 0), vmath.vector3(280, 95, 0), confirm.buttons);
    confirm.cancelText = new_text("title", vmath.vector3(0, 8, 0), vmath.vector3(250, 40, 0), 1, confirm.cancel);
    gui.set_enabled(confirm.root, false);

    confirm.chip = new_panel("tinyfancypanel_charcoal", vmath.vector3(0, 0, 0), vmath.vector3(300, 84, 0), gui.get_node("root/center"));
    confirm.chipIcon = gui.new_box_node(vmath.vector3(-105, 0, 0), vmath.vector3(60, 60, 0));
    gui.set_parent(confirm.chipIcon, confirm.chip);
    confirm.chipText = new_text("title", vmath.vector3(-65, 2, 0), vmath.vector3(220, 50, 0), 1, confirm.chip);
    gui.set_pivot(confirm.chipText, gui.PIVOT_W);
    gui.set_enabled(confirm.chip, false);
  }

  // The chip sits at the top of the screen, where the header's XP slot would be.
  function place_chip() {
    gui.set_position(confirm.chip, vmath.vector3(0, screen.h / 2 - 70, 0));
  }

  function set_chip(amount: number) {
    gui.set_text(confirm.chipText, full_number(amount));
  }

  function spend_icon() {
    if (t(funds.shards)) {
      const resources = defsave.loaded.Resources.data;
      return (Array.isArray(resources) && typeof funds.shards === 'number' ? resources[funds.shards - 1] : resources[funds.shards]).Icon;
    }
    return { texture: "main", flipbook: "reward_xp_icon" };
  }

  function can_afford() {
    return funds.have >= (t(card.Cost) ? card.Cost : 0);
  }

  function show_confirm() {
    if (!t(confirm)) build_confirm();
    const icon = spend_icon();
    gui.set_texture(confirm.icon, icon.texture);
    gui.play_flipbook(confirm.icon, icon.flipbook);
    gui.set_text(confirm.amount, full_number(t(card.Cost) ? card.Cost : 0));
    // Icon and number centred together as one row.
    const w = gui.get_text_metrics_from_node(confirm.amount).width * 0.75;
    const row = 72 + 14 + w;
    gui.set_position(confirm.icon, vmath.vector3(-row / 2 + 36, 0, 0));
    gui.set_position(confirm.amount, vmath.vector3(-row / 2 + 86, 0, 0));
    const ok = can_afford();
    gui.set_color(confirm.amount, ok ? vmath.vector4(1, 0.85, 0.3, 1) : vmath.vector4(1, 0.45, 0.4, 1));
    gui.set_texture(confirm.chipIcon, icon.texture);
    gui.play_flipbook(confirm.chipIcon, icon.flipbook);
    set_chip(funds.have);
    place_chip();
    gui.set_enabled(confirm.chip, true);
    gui.play_flipbook(confirm.buy, ok ? "tinyfancybutton_green" : "tinyfancybutton_grey");
    set_button_text(confirm.buyText, loc.get("UPGRADE_CONFIRM_BUTTON"));
    set_button_text(confirm.cancelText, loc.get("SHOP_CANCEL"));
    confirm.pressed = undefined;
    gui.set_enabled(confirm.buttons, true);
    gui.set_color(confirm.icon, vmath.vector4(1, 1, 1, 1));
    gui.set_enabled(confirm.root, true);
    gui.set_scale(confirm.root, vmath.vector3(0.9, 0.9, 1));
    gui.animate(confirm.root, gui.PROP_SCALE, vmath.vector3(1, 1, 1), gui.EASING_OUTBACK, 0.25);
  }

  function hide_confirm() {
    if (t(confirm)) {
      gui.set_enabled(confirm.root, false);
      gui.set_enabled(confirm.chip, false);
    }
  }

  /* ******************************************
              CARD
  ******************************************** */

  function update_card() {
    gui.set_text(gui.get_node("upgradecard/title"), loc.get("HENCHMEN_LEVEL", [card.Level]));
    if (stage === "confirm") {
      gui.set_text(gui.get_node("upgradecard/desc"), S.upper(loc.get("UPGRADE_CONFIRM_TO", [card.Level + 1])));
    } else {
      gui.set_text(gui.get_node("upgradecard/desc"), S.upper(loc.get("PERMANENT_BONUS")));
    }
    if (t(card.Portrait)) {
      gui.set_texture(gui.get_node("card/image"), card.Portrait.texture);
      gui.play_flipbook(gui.get_node("card/image"), card.Portrait.flipbook);
    } else if (t(card.Icon)) {
      gui.set_texture(gui.get_node("card/image"), card.Icon.texture);
      gui.play_flipbook(gui.get_node("card/image"), card.Icon.flipbook);
    }
    actions.fill_card_window(gui.get_node("card/image"), gui.get_node("card/image/stencil"));
    gui.set_text(gui.get_node("card/name"), loc.get(card.Name));
    gui.set_text(gui.get_node("card/text"), loc.get(card.Description));

    gui.play_flipbook(gui.get_node("card/panel/bg"), color[card.Rarity]);
  }

  function reload_card() {
    if (t(source.type) && t(source.id)) {
      const c = defsave.get(source.type, source.id);
      card = t(c) ? c : card;
    }
  }

  // The new level lands: the level text swaps out and back in, and the card bounces.
  function land_level() {
    stage = "done";
    audio.playFanfare("card_levelup");
    reload_card();
    msg.post("main:/overlay#header", "refresh_all");
    const title = gui.get_node("upgradecard/title");
    gui.animate(title, "position.x", textPos.x + 800, gui.EASING_INSINE, 0.2, 0, function () {
      update_card();
      gui.set_position(title, vmath.vector3(textPos.x - 800, textPos.y, textPos.z));
      gui.animate(title, "position.x", textPos.x, gui.EASING_OUTSINE, 0.25, 0, unpause);
    });
    const node = gui.get_node("upgradecard/bg");
    gui.cancel_animation(node, gui.PROP_SCALE);
    gui.set_scale(node, vmath.vector3(0.9, 0.9, 0.9));
    gui.animate(node, gui.PROP_SCALE, vmath.vector3(1, 1, 1), gui.EASING_OUTELASTIC, 0.75, 0);
  }

  // The spend flies out of the header's XP slot into the card: more icons the
  // more it costs, each on its own curve, and the card thumps as each arrives.
  function fly_spend() {
    const parent = gui.get_node("root/center");
    const target = gui.get_node("card/image/stencil");
    const probe = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(0, 0, 0));
    gui.set_parent(probe, parent);
    gui.set_screen_position(probe, gui.get_screen_position(target));
    const to = gui.get_position(probe);
    gui.delete_node(probe);
    const from = vmath.add(gui.get_position(confirm.chip), gui.get_position(confirm.chipIcon));

    const icon = spend_icon();
    const cost = Math.max(1, t(card.Cost) ? card.Cost : 1);
    const count = Math.max(6, Math.min(14, Math.floor(4 + 2 * Math.log10(cost))));
    let landed = 0;
    const thump = gui.get_node("upgradecard/bg");
    countdown = { from: funds.have, to: funds.have - cost, t: 0, time: (count - 1) * 0.06 + 0.2 };
    for (let i = 1; i <= count; i++) {
      const node = gui.new_box_node(from, vmath.vector3(60, 60, 0));
      gui.set_parent(node, parent);
      gui.set_texture(node, icon.texture);
      gui.play_flipbook(node, icon.flipbook);
      gui.set_scale(node, vmath.vector3(0.3, 0.3, 1));
      const delay = (i - 1) * 0.06;
      const rx = M.random(-30, 30);
      const ry = M.random(-30, 30);
      const land = vmath.add(to, vmath.vector3(rx, ry, 0));
      const time = 0.55 + M.random() * 0.15;
      gui.animate(node, "scale", vmath.vector3(1.1, 1.1, 1), gui.EASING_OUTBACK, 0.18, delay);
      // Each one bows out to alternate sides and back in, so the stream
      // fans into the card rather than dropping straight down.
      const bow = (M.mod(i, 2) === 0 ? 1 : -1) * M.random(120, 240);
      gui.animate(node, "position.x", (from.x + land.x) / 2 + bow, gui.EASING_OUTSINE, time / 2, delay, function (_self: any, n: any) {
        gui.animate(n, "position.x", land.x, gui.EASING_INSINE, time / 2);
      });
      gui.animate(node, "position.y", land.y, gui.EASING_INQUAD, time, delay, function (_self: any, n: any) {
        gui.delete_node(n);
        if (stage !== "flying") return;
        audio.playCascadeTick("xp");
        gui.cancel_animation(thump, gui.PROP_SCALE);
        gui.set_scale(thump, vmath.vector3(1, 1, 1));
        gui.animate(thump, gui.PROP_SCALE, vmath.vector3(1.03, 1.03, 1), gui.EASING_OUTQUAD, 0.05, 0, undefined, gui.PLAYBACK_ONCE_PINGPONG);
        landed = landed + 1;
        if (landed === count) {
          gui.animate(confirm.icon, "color.w", 0, gui.EASING_INQUAD, 0.3);
          gui.animate(confirm.amount, "color.w", 0, gui.EASING_INQUAD, 0.3);
          land_level();
        }
      });
    }
  }

  function on_upgrade() {
    if (!can_afford()) { audio.playUi("refuse"); return; }
    audio.playUi("tap");
    stage = "flying";
    gui.set_enabled(confirm.buttons, false);
    if (t(card.message) && t(card.message_id)) {
      msg.post(controller, card.message_id, card.message);
    }
    card.message_id = undefined;
    card.message = undefined;
    fly_spend();
  }

  function leave() {
    msg.post(controller, cat("show_", complete_purchase_callback));
  }

  function refresh_all() {
    if (t(enabled)) {
      update_card();
      if (stage === "confirm") show_confirm();
    }
  }

  /* ******************************************
  INPUT
  ******************************************** */

  function confirm_input(action_id: any, action: any) {
    if (action_id !== hash("touch")) return;
    let over: any = undefined;
    if (buttonFx.pick_node(confirm.buy, action.x, action.y)) over = "buy";
    else if (buttonFx.pick_node(confirm.cancel, action.x, action.y)) over = "cancel";
    const nodeFor = (k: any) => k === "buy" ? confirm.buy : k === "cancel" ? confirm.cancel : undefined;
    if (action.pressed) {
      confirm.pressed = over;
      const n = nodeFor(over);
      if (n) buttonFx.press(n);
    } else if (action.released) {
      const pressed = confirm.pressed;
      confirm.pressed = undefined;
      const n = nodeFor(pressed);
      if (n) buttonFx.release(n, pressed === over);
      if (pressed !== over) return;
      if (over === "buy") on_upgrade();
      else if (over === "cancel") leave();
    } else if (confirm.pressed) {
      const n = nodeFor(confirm.pressed);
      if (n) {
        if (confirm.pressed === over) buttonFx.press(n);
        else buttonFx.release(n, false);
      }
    }
  }

  return {
    init(_self) {
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      gui.set_render_order(15);
      gooey.acquire_input();
      const node = gui.get_node("upgradecard/title");
      textPos = gui.get_position(node);
    },

    on_input(self, action_id, action) {
      if (self !== owner) return;
      if (action_id !== undefined && action_id !== null && t(enabled)) {
        if (stage === "confirm" && t(confirm)) {
          confirm_input(action_id, action);
        } else if (stage === "done" && action_id === hash("touch") && action.pressed && !pause) {
          leave();
        }
      }
    },

    on_message(self, message_id, message, _sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        if (t(enabled)) {
          owner = self;
          complete_purchase_callback = t(message.message.complete_purchase_callback) ? message.message.complete_purchase_callback : "dungeonmine";
          pause = true;
          source = { type: message.type, id: message.id };
          { const c = defsave.get(message.type, message.id); card = t(c) ? c : {}; }
          card.type = message.type;
          card.message_id = t(message.message_id) ? message.message_id : undefined;
          card.message = t(message.message) ? message.message : undefined;
          card.message.callback = "upgradecard";
          funds = actions.levelup_funds(card.map_id);
          stage = "confirm";
          countdown = undefined;
          refresh_all();
          const node = gui.get_node("upgradecard/bg");
          gui.set_scale(node, vmath.vector3(0.9, 0.9, 0.9));
          gui.animate(node, gui.PROP_SCALE, vmath.vector3(1, 1, 1), gui.EASING_OUTELASTIC, 0.75, 0);
        } else {
          stage = "idle";
          countdown = undefined;
          if (self === owner) hide_confirm();
        }
        msg.post("main:/background#background", "set_enabled", { enabled: enabled, effect: { type: "stream", texture: "backgrounds", flipbook: "upgrade" } });
      } else if (message_id === hash("refresh_all")) {
        // Mid-flight the card keeps its old level until the spend lands.
        if (stage !== "flying") {
          reload_card();
          refresh_all();
        }
      }
    },

    update(self, dt) {
      layout_screen();
      if (self !== owner) return;
      if (t(confirm) && gui.is_enabled(confirm.chip)) place_chip();
      if (t(countdown)) {
        countdown.t = Math.min(countdown.time, countdown.t + dt);
        const share = countdown.t / countdown.time;
        set_chip(Math.floor(countdown.from + (countdown.to - countdown.from) * share + 0.5));
        if (share >= 1) countdown = undefined;
      }
    },
  };
});
