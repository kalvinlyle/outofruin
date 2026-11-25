import { defineScript, gui, msg, hash, vmath, window, print } from '../../../engine';
import { t, cat, len, S, T, os, tostring, tonumber, format } from '../../../lua';
import { G } from '../../globals';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import progress from '../../progress/progress';
import defsave from '../../defsave/defsave';
import actions from '../../actions';
import loc from '../../shared/locsheets';
import buttonFx from '../../shared/button_fx';
import audio from '../../../systems/audio';

void inspect; void random; void progress;

/** string.reverse */
function reverse(s: string): string { return s.split('').reverse().join(''); }

/** `a and b or c`, evaluating b and c lazily and once, as Lua does. */
function ao<B, C>(a: unknown, b: () => B, c: () => C): B | C {
  if (t(a)) { const v = b(); if (t(v)) return v; }
  return c();
}

defineScript('/main/shop/shop.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "shop";
  let Stats: any = {};
  const product_list: any[] = [];

  const controller = "main:/menu#controller";
  let enabled: any = false;
  let active: any = true;
  let adReady = true;
  let rewardReady = false;
  let complete_purchase_callback: any = "dungeonmine";

  const TOUCH = hash("touch");
  const SCROLL_UP = hash("scroll_up");
  const SCROLL_DOWN = hash("scroll_down");

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

  /* ******************************************
              CATALOGUE
  ******************************************** */

  /* Every item, in grid order. The amounts and gold costs are the ones the
  purchase messages actually use; the old card labels came from the loc sheet
  and had drifted (1,000 XP said 50 gold, but cost 60). */
  const CARD_ROWS = [
    ["buyCards1", "buyCards2", "buyCards3"],
    ["buyXp1", "buyXp2", "buyXp3"],
    ["buyTime1", "buyTime2", "buyTime3"],
    ["buyGold1", "buyGold2", "buyGold3"],
    ["buyGold4", "buyGold5", "buyGold6"],
  ];

  const CARDS = [{ amount: 75, cost: 250 }, { amount: 150, cost: 750 }, { amount: 250, cost: 2500 }];
  const XP = [{ amount: 1000, cost: 60 }, { amount: 10000, cost: 500 }, { amount: 100000, cost: 4500 }];
  const TIME = [{ hours: 1, cost: 50 }, { hours: 4, cost: 150 }, { hours: 24, cost: 750 }];
  const GOLD = [200, 500, 1000, 2000, 5000, 10000];

  /* ******************************************
              LAYOUT
  ******************************************** */

  /* Three columns across the whole width, with the free-loot banner above
  them. That is taller than the space between the navbar and the footer, so
  the grid scrolls: drag anywhere in it. The cards keep their art; they're
  just reparented into a clipping node and scaled up. */
  const SHOP_MARGIN = 12;
  const SHOP_GAP = 12;
  const NAVBAR_DROP = 41.5; // title bar, below the header
  const VIEW_DROP = 83.5; // top of the grid, below the header
  const VIEW_SINK = 5; // bottom of the grid, below the footer's top edge
  const DRAG_THRESHOLD = 12;

  const layout: { clip: any; items: any[]; scroll: number; maxScroll: number; wheelStep?: number } = { clip: undefined, items: [], scroll: 0, maxScroll: 0 };

  /* The title and the close button keep their design inset from the bar's
  ends, so they ride out to the screen edges as the bar widens. */
  let navbarDesign: any = undefined;

  function place_navbar(y: number, w: number) {
    const navbar = gui.get_node("navbar/bg");
    const title = gui.get_node("navbar/title");
    const close = gui.get_node("navbar/backbutton/bg");
    const p = gui.get_position(navbar);
    const s = gui.get_size(navbar);
    if (!t(navbarDesign)) {
      navbarDesign = { w: s.x, title: gui.get_position(title), close: gui.get_position(close) };
    }
    gui.set_position(navbar, vmath.vector3(p.x, y, p.z));
    gui.set_size(navbar, vmath.vector3(w, s.y, s.z));
    const shift = (w - navbarDesign.w) / 2;
    gui.set_position(title, vmath.add(navbarDesign.title, vmath.vector3(-shift, 0, 0)));
    gui.set_position(close, vmath.add(navbarDesign.close, vmath.vector3(shift, 0, 0)));
  }
  const drag: { active: any; moved: boolean; startY: number; startScroll: number } = { active: false, moved: false, startY: 0, startScroll: 0 };

  function apply_scroll() {
    for (let i = 1; i <= len(layout.items); i++) {
      const item = layout.items[i - 1];
      gui.set_position(item.node, vmath.vector3(item.x, item.y + layout.scroll, 0));
    }
  }

  /* Laid out against the screen, so it is rebuilt whenever that changes:
  the clipping box is made once and everything inside is measured again. */
  function build_layout() {
    const bg = gui.get_node("background/bg");
    const bgPos = gui.get_position(bg);
    const viewTop = content_top() - VIEW_DROP;
    const viewBottom = content_bottom() - VIEW_SINK;
    const viewHeight = viewTop - viewBottom;
    const width = screen.w - SHOP_MARGIN * 2;

    const clip = t(layout.clip) ? layout.clip : gui.new_box_node(vmath.vector3(0), vmath.vector3(0));
    gui.set_position(clip, vmath.vector3(0, (viewTop + viewBottom) / 2 - bgPos.y, 0));
    gui.set_size(clip, vmath.vector3(screen.w, viewHeight, 0));
    gui.set_parent(clip, bg);
    gui.set_clipping_mode(clip, gui.CLIPPING_MODE_STENCIL);
    gui.set_clipping_visible(clip, false);

    layout.items = [];
    let top = viewHeight / 2 - SHOP_MARGIN;

    const reward = gui.get_node("rewardbutton/bg");
    const rewardSize = gui.get_size(reward);
    const rewardScale = width / rewardSize.x;
    gui.set_parent(reward, clip);
    gui.set_scale(reward, vmath.vector3(rewardScale, rewardScale, 1));
    T.insert(layout.items, { node: reward, x: 0, y: top - rewardSize.y * rewardScale / 2 });
    top = top - rewardSize.y * rewardScale - SHOP_GAP;

    const cardSize = gui.get_size(gui.get_node("buyCards1/bg"));
    const cardWidth = (width - SHOP_GAP * 2) / 3;
    const cardScale = cardWidth / cardSize.x;
    const cardHeight = cardSize.y * cardScale;
    for (let r = 1; r <= len(CARD_ROWS); r++) {
      const row = CARD_ROWS[r - 1];
      for (let c = 1; c <= len(row); c++) {
        const name = row[c - 1];
        const node = gui.get_node(cat(name, "/bg"));
        gui.set_parent(node, clip);
        gui.set_scale(node, vmath.vector3(cardScale, cardScale, 1));
        const x = -width / 2 + cardWidth / 2 + (c - 1) * (cardWidth + SHOP_GAP);
        T.insert(layout.items, { node: node, x: x, y: top - cardHeight / 2 });
      }
      top = top - cardHeight - SHOP_GAP;
    }

    const contentHeight = viewHeight / 2 - top - SHOP_GAP + SHOP_MARGIN;
    layout.maxScroll = Math.max(0, contentHeight - viewHeight);
    layout.wheelStep = Math.max(cardHeight / 2, viewHeight / 5);
    layout.clip = clip;
    apply_scroll();
  }

  const info: any = { open: false, item: undefined, pressed: undefined };

  function layout_screen() {
    const r = screen_changed();
    if (!r) return;
    const [w, h] = r;
    const bg = gui.get_node("background/bg");
    gui.set_position(bg, vmath.vector3(DESIGN_W / 2, screen_bottom() + h / 2, 0));
    gui.set_size(bg, vmath.vector3(w, h, 0));
    if (t(info.dim)) gui.set_size(info.dim, vmath.vector3(w, h, 0));
    place_navbar(content_top() - NAVBAR_DROP, w);
    if (t(layout.clip)) build_layout();
  }

  function in_view(action: any) {
    return layout.clip !== undefined && layout.clip !== null && gui.pick_node(layout.clip, action.x, action.y);
  }

  /* ******************************************
              INFO PAGE
  ******************************************** */

  /* Tapping an item never buys it. It opens this page: what the item is,
  what it does, what it costs, and a Buy button that does the purchase. */
  const BUTTON_TEXT_W = 250; // label room inside a button, before it shrinks to fit

  function new_text(font: string, pos: any, size: any, scale: number, parent: any) {
    const node = gui.new_text_node(pos, "");
    gui.set_font(node, font);
    gui.set_size(node, size);
    gui.set_scale(node, vmath.vector3(scale, scale, 1));
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

  function build_info() {
    info.dim = gui.new_box_node(vmath.vector3(DESIGN_W / 2, DESIGN_H / 2, 0), vmath.vector3(screen.w, screen.h, 0));
    gui.set_color(info.dim, vmath.vector4(0, 0, 0, 0.75));
    gui.set_parent(info.dim, gui.get_node("root"));

    info.panel = new_panel("tinyfancypanel_charcoal", vmath.vector3(0, 40, 0), vmath.vector3(660, 620, 0), info.dim);
    info.header = new_panel("tinyfancypanel_gold", vmath.vector3(0, 250, 0), vmath.vector3(620, 80, 0), info.panel);
    info.title = new_text("title", vmath.vector3(0, 6, 0), vmath.vector3(560, 60, 0), 1, info.header);

    info.icon = gui.new_box_node(vmath.vector3(0, 115, 0), vmath.vector3(128, 128, 0));
    gui.set_parent(info.icon, info.panel);

    info.inset = new_panel("tinyfancypanel_grey", vmath.vector3(0, -40, 0), vmath.vector3(620, 150, 0), info.panel);
    info.body = new_text("body", vmath.vector3(0, 4, 0), vmath.vector3(580, 130, 0), 1, info.inset);
    gui.set_line_break(info.body, true);

    info.price = new_text("title", vmath.vector3(0, -150, 0), vmath.vector3(600, 50, 0), 0.9, info.panel);

    info.buy = new_panel("tinyfancybutton_green", vmath.vector3(-155, -240, 0), vmath.vector3(280, 85, 0), info.panel);
    info.buyText = new_text("title", vmath.vector3(0, 10, 0), vmath.vector3(250, 40, 0), 1, info.buy);
    info.cancel = new_panel("tinyfancybutton_red", vmath.vector3(155, -240, 0), vmath.vector3(280, 85, 0), info.panel);
    info.cancelText = new_text("title", vmath.vector3(0, 10, 0), vmath.vector3(250, 40, 0), 1, info.cancel);

    gui.set_enabled(info.dim, false);
  }

  function close_info() {
    info.open = false;
    info.item = undefined;
    info.pressed = undefined;
    gui.set_enabled(info.dim, false);
  }

  // Gold items are affordable or not; real-money items need a price from the store.
  function info_canbuy(item: any): boolean {
    if (t(item.gold)) return defsave.get("Currency", "Gold") >= item.gold;
    return item.price !== undefined && item.price !== null && item.price !== "";
  }

  // "10,000" rather than display_number's "10K": an info page has room to be exact.
  function full_number(n: number) {
    const digits = reverse(S.gsub(reverse(tostring(Math.floor(n))), "(%d%d%d)", "%1,")[0]);
    return S.gsub(digits, "^,", "")[0];
  }

  // Sets a button label, shrinking it if the translation runs wider than the button.
  function set_button_text(node: any, text: any) {
    gui.set_text(node, text);
    gui.set_scale(node, vmath.vector3(1, 1, 1));
    const width = gui.get_text_metrics_from_node(node).width;
    if (width > BUTTON_TEXT_W) {
      const s = BUTTON_TEXT_W / width;
      gui.set_scale(node, vmath.vector3(s, s, 1));
    }
  }

  function refresh_info() {
    const item = info.item;
    if (!t(item)) return;
    gui.set_text(info.title, item.title);
    gui.set_text(info.body, item.body);
    const icon = gui.get_node(cat(item.card, "/icon"));
    gui.set_texture(info.icon, gui.get_texture(icon));
    gui.play_flipbook(info.icon, gui.get_flipbook(icon));

    const canBuy = info_canbuy(item);
    if (t(item.gold)) {
      gui.set_text(info.price, loc.get("SHOP_PRICE_GOLD", [full_number(item.gold)]));
      gui.set_color(info.price, canBuy ? vmath.vector4(1, 0.85, 0.3, 1) : vmath.vector4(1, 0.45, 0.4, 1));
      set_button_text(info.buyText, ao(canBuy, () => loc.get("SHOP_BUY"), () => loc.get("SHOP_BUY_GOLD")));
    } else {
      gui.set_text(info.price, ao(canBuy, () => item.price, () => loc.get("SHOP_UNAVAILABLE")));
      gui.set_color(info.price, vmath.vector4(1, 0.85, 0.3, 1));
      set_button_text(info.buyText, ao(canBuy, () => loc.get("SHOP_BUY_FOR", [item.price]), () => loc.get("SHOP_BUY")));
    }
    const short = t(item.gold) ? !canBuy : item.gold;
    gui.play_flipbook(info.buy, canBuy ? "tinyfancybutton_green" : t(short) ? "tinyfancybutton_gold" : "tinyfancybutton_grey");
    set_button_text(info.cancelText, loc.get("SHOP_CANCEL"));
  }

  function open_info(item: any) {
    info.item = item;
    info.open = true;
    info.pressed = undefined;
    gui.set_enabled(info.dim, true);
    refresh_info();
    gui.set_scale(info.panel, vmath.vector3(0.9, 0.9, 1));
    gui.animate(info.panel, gui.PROP_SCALE, vmath.vector3(1, 1, 1), gui.EASING_OUTBACK, 0.25);
  }

  function info_input(action_id: any, action: any) {
    if (action_id !== TOUCH) return;
    let over: any = undefined;
    if (buttonFx.pick_node(info.buy, action.x, action.y)) over = "buy";
    else if (buttonFx.pick_node(info.cancel, action.x, action.y)) over = "cancel";
    else if (!gui.pick_node(info.panel, action.x, action.y)) over = "outside";
    const nodeFor = (k: any) => k === "buy" ? info.buy : k === "cancel" ? info.cancel : undefined;

    if (action.pressed) {
      info.pressed = over;
      const n = nodeFor(over);
      if (n) buttonFx.press(n);
    } else if (action.released) {
      const pressed = info.pressed;
      info.pressed = undefined;
      const n = nodeFor(pressed);
      if (n) buttonFx.release(n, pressed === over);
      if (pressed !== over) return;
      if (over === "buy") {
        const item = info.item;
        if (info_canbuy(item)) {
          audio.playUi("purchase");
          close_info();
          item.buy();
        } else if (t(item.gold)) {
          audio.playUi("refuse");
          info.buy_gold(item.gold);
        } else {
          audio.playUi("refuse");
        }
      } else if (over === "cancel" || over === "outside") {
        audio.playUi("back");
        close_info();
      }
    } else if (info.pressed) {
      const n = nodeFor(info.pressed);
      if (n) {
        if (info.pressed === over) buttonFx.press(n);
        else buttonFx.release(n, false);
      }
    }
  }

  /* ******************************************
              SHOP
  ******************************************** */

  function update_button(_button?: any) {
    if (rewardReady && adReady) {
      gui.play_flipbook(gui.get_node("rewardbutton/bg"), "tinyfancybutton_gold");
    } else {
      gui.play_flipbook(gui.get_node("rewardbutton/bg"), "tinyfancybutton_grey");
    }
  }

  function gold_price(i: number): string {
    const product = product_list[i - 1];
    return t(product) && t(product.price) ? tostring(product.price) : "";
  }

  function refresh_all() {
    Stats = defsave.loaded.Stats.data;
    if (Stats.adReward === undefined || Stats.adReward === null) Stats.adReward = 0;
    rewardReady = os.time(os.date("!*t")) >= Stats.adReward;

    gui.set_text(gui.get_node("navbar/title"), loc.get("SCREENNAME_SHOP"));
    gui.set_text(gui.get_node("rewardbutton/text"), loc.get("REWARDBUTTON_TEXT"));

    for (let i = 1; i <= 3; i++) {
      gui.set_text(gui.get_node(cat("buyCards", i, "/text")), loc.get(cat("BUYCARDS_", i, "_TEXT")));
      gui.set_text(gui.get_node(cat("buyCards", i, "/desc")), loc.get("SHOP_BUY_FOR_GOLD", [actions.display_number(CARDS[i - 1].cost)]));

      gui.set_text(gui.get_node(cat("buyXp", i, "/text")), loc.get(cat("BUYXP_", i, "_TEXT")));
      gui.set_text(gui.get_node(cat("buyXp", i, "/desc")), loc.get("SHOP_BUY_FOR_GOLD", [actions.display_number(XP[i - 1].cost)]));

      gui.set_text(gui.get_node(cat("buyTime", i, "/text")), loc.get(cat("BUYTIME_", i, "_TEXT")));
      gui.set_text(gui.get_node(cat("buyTime", i, "/desc")), loc.get("SHOP_BUY_FOR_GOLD", [actions.display_number(TIME[i - 1].cost)]));
    }

    for (let i = 1; i <= 6; i++) {
      gui.set_text(gui.get_node(cat("buyGold", i, "/text")), loc.get(cat("BUYGOLD_", i, "_TEXT")));
      const price = gold_price(i);
      gui.set_text(gui.get_node(cat("buyGold", i, "/desc")), ao(price !== "", () => loc.get(cat("BUYGOLD_", i, "_DESC"), [price]), () => loc.get("SHOP_UNAVAILABLE")));
    }

    // `action_id` and `action` are unset globals here in the Lua (nil).
    update_button(gooey.button("rewardbutton/bg", G.action_id, G.action));
    if (info.open) refresh_info();
  }

  function SecondsToClock(seconds_: any) {
    const seconds = tonumber(seconds_)!;

    if (seconds <= 0) {
      return "00:00:00";
    } else {
      G.hours = format("%02.f", Math.floor(seconds / 3600));
      G.mins = format("%02.f", Math.floor(seconds / 60 - (tonumber(G.hours)! * 60)));
      G.secs = format("%02.f", Math.floor(seconds - tonumber(G.hours)! * 3600 - tonumber(G.mins)! * 60));
      return cat(G.hours, ":", G.mins, ":", G.secs);
    }
  }

  function buycards(cardAmount: number, cost: number) {
    msg.post(controller, "purchase_cards", {
      cost: cost, callback: "shop",
      msgpost: {
        receiver: controller, message_id: "gen_rewardpack",
        message: { packCards: cardAmount, packGold: 0, packXp: 0, complete_purchase_callback: complete_purchase_callback },
      },
    });
  }

  function buyxp(xpAmount: number, cost: number) {
    msg.post(controller, "purchase_xp", {
      cost: cost, callback: "shop",
      msgpost: {
        receiver: controller, message_id: "gen_rewardpack",
        message: { packCards: 0, packGold: 0, packXp: xpAmount / 10, complete_purchase_callback: complete_purchase_callback },
      },
    });
  }

  function buygold(product_number: number) {
    const product = product_list[product_number - 1];
    if (!t(product)) return;
    print(cat("BUY GOLD PRESSED: ", product.identifier));
    msg.post(controller, "purchase_gold", { identifier: product.identifier, msgpost: { message: { packGold: GOLD[product_number - 1] } } });
  }

  function buytime(timeAmount: number, cost: number) {
    msg.post(controller, "purchase_time", {
      cost: cost, timeAmount: timeAmount, callback: "shop",
      msgpost: {
        receiver: controller, message_id: "mod_bonustime",
        message: { amount: timeAmount * 60 * 60 },
      },
    });
  }

  function on_pressed_reward(_button?: any) {
    print("Reward button pressed!!!");
    if (adReady && rewardReady) {
      msg.post(controller, "gen_adreward", { packCards: Stats.Rank, packGold: Stats.Rank, packXp: Stats.Rank, complete_purchase_callback: complete_purchase_callback });
    }
  }

  // The info page for the card that was tapped.
  function shop_item(card: string): any {
    const [kind, i_] = S.match(card, "^buy(%a+)(%d)$");
    const i = tonumber(i_)!;
    if (kind === "Cards") {
      const pack = CARDS[i - 1];
      return {
        card: card, title: loc.get(cat("BUYCARDS_", i, "_TEXT")), gold: pack.cost,
        body: loc.get("SHOP_INFO_CARDS", [full_number(pack.amount)]),
        buy: () => { buycards(pack.amount, pack.cost); },
      };
    } else if (kind === "Xp") {
      const pack = XP[i - 1];
      return {
        card: card, title: loc.get(cat("BUYXP_", i, "_TEXT")), gold: pack.cost,
        body: loc.get("SHOP_INFO_XP", [full_number(pack.amount)]),
        buy: () => { buyxp(pack.amount, pack.cost); },
      };
    } else if (kind === "Time") {
      const pack = TIME[i - 1];
      return {
        card: card, title: loc.get(cat("BUYTIME_", i, "_TEXT")), gold: pack.cost,
        body: loc.get("SHOP_INFO_TIME", [ao(pack.hours === 1, () => loc.get("SHOP_ONE_HOUR"), () => loc.get("SHOP_HOURS", [pack.hours]))]),
        buy: () => { buytime(pack.hours, pack.cost); },
      };
    } else if (kind === "Gold") {
      return {
        card: card, title: loc.get(cat("BUYGOLD_", i, "_TEXT")), price: gold_price(i),
        body: loc.get("SHOP_INFO_GOLD", [full_number(GOLD[i - 1])]),
        buy: () => { buygold(i); },
      };
    }
    return undefined;
  }

  // Too little gold: switch the page to the smallest gold pack that covers the
  // shortfall, or the biggest one if none does.
  info.buy_gold = function (cost: number) {
    const need = cost - defsave.get("Currency", "Gold");
    let pick = len(GOLD);
    for (let i = 1; i <= len(GOLD); i++) {
      const amount = GOLD[i - 1];
      if (amount >= need) { pick = i; break; }
    }
    open_info(shop_item(cat("buyGold", pick)));
  };

  return {
    init(_self) {
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      gui.set_render_order(15);
      gui.set_color(gui.get_node("navbar/title"), actions.get_color("darkbrown"));
      build_layout();
      build_info();
    },

    update(_self, _dt) {
      layout_screen();
      if (t(enabled) && t(active)) {
        rewardReady = os.time(os.date("!*t")) >= Stats.adReward;
        let timeRemaining = "";
        if (!rewardReady) {
          timeRemaining = SecondsToClock(Stats.adReward - os.time(os.date("!*t")));
        }
        gui.set_text(gui.get_node("rewardbutton/counter"), timeRemaining);
      }
    },

    on_input(_self, action_id, action) {
      if (action_id === undefined || action_id === null || !t(enabled) || !t(active)) return;

      if (info.open) {
        info_input(action_id, action);
        return;
      }

      gooey.button("navbar/backbutton/bg", action_id, action, () => { msg.post(controller, "show_dungeonmine"); });

      // A wheel tick over the grid moves half a row, as in the dungeon list.
      if (action_id === SCROLL_UP || action_id === SCROLL_DOWN) {
        if (action.released || !t(in_view(action))) return;
        const direction = action_id === SCROLL_UP ? -1 : 1;
        layout.scroll = Math.max(0, Math.min(layout.maxScroll, layout.scroll + direction * (t(layout.wheelStep) ? layout.wheelStep! : 0)));
        apply_scroll();
        return;
      }

      if (action_id === TOUCH) {
        if (action.pressed) {
          drag.active = in_view(action);
          drag.moved = false;
          drag.startY = action.y;
          drag.startScroll = layout.scroll;
        } else if (t(drag.active)) {
          const dy = action.y - drag.startY;
          if (Math.abs(dy) > DRAG_THRESHOLD) drag.moved = true;
          if (drag.moved) {
            layout.scroll = Math.max(0, Math.min(layout.maxScroll, drag.startScroll + dy));
            apply_scroll();
          }
        }
      }

      // A drag scrolls; only a tap inside the visible grid opens an item.
      if (!drag.moved && (action_id !== TOUCH || t(in_view(action)))) {
        gooey.button("rewardbutton/bg", action_id, action, on_pressed_reward, update_button);
        for (let r = 1; r <= len(CARD_ROWS); r++) {
          const row = CARD_ROWS[r - 1];
          for (let c = 1; c <= len(row); c++) {
            const card = row[c - 1];
            gooey.button(cat(card, "/bg"), action_id, action, () => { open_info(shop_item(card)); });
          }
        }
      }

      if (action_id === TOUCH && action.released) {
        drag.active = false;
        drag.moved = false;
      }
    },

    on_message(_self, message_id, message, _sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        if (t(enabled)) {
          complete_purchase_callback = t(message.complete_purchase_callback) ? message.complete_purchase_callback : "dungeonmine";
          layout.scroll = 0;
          apply_scroll();
          refresh_all();
          message.focus = "shop";
          print("SHOP: requesting products");
          if (actions.tablelength(product_list) === 0) {
            msg.post(controller, "get_products", { callback: "shop" });
          }
        } else {
          close_info();
        }
        msg.post("main:/background#background", "set_enabled", message);
        msg.post("main:/overlay#header", "set_enabled", message);
      } else if (message_id === hash("set_active")) {
        active = message.active;
        if (t(enabled) && t(defsave)) refresh_all();
      } else if (message_id === hash("set_product")) {
        print(cat("SHOP: products received ", message.product.name, " ", message.product.identifier));
        // Keyed by pack, so a refreshed price replaces the old one rather than piling up.
        const n = tonumber(S.match1(message.product.identifier, "(%d+)$"));
        if (n !== undefined) product_list[n - 1] = message.product; else T.insert(product_list, message.product);
        refresh_all();
      } else if (message_id === hash("ad_ready")) {
        print("SHOP: Ad is ready");
        adReady = true;
        if (rewardReady) {
          msg.post("main:/overlay#nav", "set_alert", { focus: "shop", state: true });
        }
        refresh_all();
      }
    },
  };
});
