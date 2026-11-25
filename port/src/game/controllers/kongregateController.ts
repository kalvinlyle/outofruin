// controllers/kongregateController.lua
// Store bridge for gold purchases via window.OOR_STORE (Stripe on web in
// game/store.js, Play Billing on Android in port/src/systems/play-store.ts).
// Filename kept for translate_check.py parity with the original Lua module.
import { msg, hash, print, html5, json } from '../../engine';
import { pairs, literal, cat, t, os } from '../../lua';

const controller = "main:/menu#controller";

const M: any = {};

M.update = function (self?: any) {
  void self;
};

/* Gold is sold through window.OOR_STORE (game/store.js on web, play-store.ts on
Android); this keeps the shop's prices from it, starts checkouts and hands over
the gold once a payment is confirmed. Granting waits for the game to have
started, so a purchase confirmed during boot isn't lost. */
const STORE_POLL_INTERVAL = 0.5;
const store = { started: false, nextPoll: 0 };

function store_run(js: any): any {
  if (!t(html5)) return "";
  const r = html5.run(cat("window.OOR_STORE ? ", js, " : ''"));
  return t(r) ? r : "";
}

function store_products() {
  for (let i = 1; i <= 6; i++) {
    msg.post("main:/menu#shop", "set_product", { product: literal({ name: cat("BUYGOLD_", i, "_TEXT"), description: cat("BUYGOLD_", i, "_DESC"), identifier: cat("buygold_", i), price: store_run(cat("OOR_STORE.price('buygold_", i, "')")) }) });
  }
}

function store_poll() {
  if (!store.started || os.clock() < store.nextPoll) return;
  store.nextPoll = os.clock() + STORE_POLL_INTERVAL;
  const event = store_run("OOR_STORE.take()");
  if (event === "") return;
  let ok: boolean;
  let data: any;
  try { data = json.decode(event); ok = true; } catch (e) { ok = false; data = e; }
  if (!ok || typeof data !== 'object' || data === null) return;
  if (t(data.products)) {
    store_products();
    return;
  }
  msg.post(controller, "hide_popup");
  if (t(data.gold)) {
    print(cat("STORE: granting ", data.gold, " gold"));
    msg.post(controller, "gen_rewardpack", literal({ packCards: 0, packGold: data.gold, packXp: 0 }));
  } else if (t(data.error)) {
    msg.post(controller, "popup_message", literal({ title: "SHOP_PURCHASE_FAILED_TITLE", text: "SHOP_PURCHASE_FAILED_MESSAGE" }));
  }
}

const messageData: any = {};
messageData["all"] = literal({
  ["on_start"]: function () {
    store_products();
  },
  ["start_game"]: function () {
    store.started = true;
  },
  ["update"]: function () {
    store_poll();
  },
  ["purchase_gold"]: function (_message_id: any, message: any) {
    if (t(html5)) {
      print(cat("STORE: checkout ", message.identifier));
      msg.post(controller, "popup_loading");
      store_run(cat("OOR_STORE.buy('", message.identifier, "')"));
    }
  },
});

function urlEq(a: any, b: any): boolean {
  return a === b || (a != null && b != null && typeof a === 'object' && typeof b === 'object'
    && a.socket === b.socket && a.path === b.path && a.fragment === b.fragment);
}

M.findReceiver = function (message_id: any, message: any, sender: any) {
  for (const [u, url] of pairs(messageData)) {                       // look up the sender in the data set
    if (urlEq(sender, msg.url(u as string)) || u === "all") {          // find the sender
      for (const [a, action] of pairs<any>(url)) {                      // look up the message
        if (message_id === hash(a as string) || a === "all") {          // find the message
          action(message_id, message, sender);                         // run the function from the table
        }
      }
    }
  }
};

export default M;
