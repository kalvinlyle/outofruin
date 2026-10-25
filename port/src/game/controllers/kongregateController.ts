// controllers/kongregateController.lua
// Kongregate is gone in the port: html5.run on its JS is a no-op there, but the
// logic around every call is kept as the Lua has it.
import defsave_ from '../defsave/defsave';
import inspect_ from '../inspect';
import { msg, hash, print, sys, html5, json } from '../../engine';
import { pairs, literal, cat, len, t, tostring, os } from '../../lua';
import { G } from '../globals';

const defsave: any = defsave_;
const inspect: any = inspect_;

const controller = "main:/menu#controller";

const M: any = {};
const isDebug = sys.get_engine_info().is_debug;

M.update = function (self?: any) {
};

G.hml5 = t(html5) ? html5 : { run: function () { return; } };
let current_domain: any = undefined;

function isKongregate() {
  current_domain = t(current_domain) ? current_domain : html5.run("document.referrer;");
  return current_domain === "https://www.kongregate.com/games/megarune/out-of-ruin_preview" || current_domain === "https://www.kongregate.com/games/megarune/out-of-ruin";
}

function getKongUser(): [any, any] {
  print("KONGREGATE GET USER INFO");
  const userName = html5.run("kongregate.services.getUsername()");
  const userID = html5.run("kongregate.services.getUserId()");
  return [userName, userID];
}

function getItemList() {
  print("KONGREGATE GET ITEM LIST");
  html5.run("kongregate.mtx.requestItemList([], onReturnItemList);");
}

function getUserInfo() {
  const [userName, userID] = getKongUser();
  msg.post(controller, "set_username", { username: tostring(userName) });
  void userID;
}

function initAds() {
  print("KONGREGATE INIT ADS");
  html5.run("kongregate.mtx.addEventListener('adsAvailable', adsAvailable);");
  html5.run("kongregate.mtx.addEventListener('adsUnavailable', adsUnavailable);");
  html5.run("kongregate.mtx.addEventListener('adOpened', adOpened);");
  html5.run("kongregate.mtx.addEventListener('adCompleted', adCompleted);");
  html5.run("kongregate.mtx.addEventListener('adAbandoned', adAbandoned);");
  html5.run("kongregate.mtx.initializeIncentivizedAds();");
}

function showIncentivizedAd() {
  print("KONGREGATE SHOW INCENTIVIZED AD");
  html5.run("kongregate.mtx.showIncentivizedAd();");
}

function getPurchases() {
  html5.run(cat("kongregate.mtx.requestUserItemList('", defsave.get("Stats", "username"), "', onUserItems)"));
}

function jsListener(self: any, message_id: any, message: any) {
  if (message_id === "kongIsLoaded") {
    print("KONGREGATE IS LOADED");
    html5.run("kongregate.services.addEventListener('login', onKongregateInPageLogin);");
    if (t(defsave.get("Stats", "Rank"))) html5.run(cat("kongregate.stats.submit('current_chapter', ", defsave.get("Stats", "Rank"), " );"));
    getPurchases();
    getUserInfo();
    getItemList();

  } else if (message_id === "onKongregateInPageLogin") {
    getUserInfo();
  } else if (message_id === "onReturnItemList") {
    if (t(message.success)) {
      print("KONGREGATE ITEM LIST RETURNED");
      print(message.data);
      for (let p = 1; p <= len(message.data); p++) {
        const product = message.data[p - 1];
        print(cat("KONGREGATE PRODUCT ", p, " ", product.identifier));
        product.title = product.name;
        product.description = cat(product.description, "_KONGREGATE");
        msg.post("main:/menu#shop", "set_product", { product: product });
      }
    } else {
      print("KONGREGATE ITEM LIST FAILED");
    }
  } else if (message_id === "onPurchaseResult") {
    if (t(message.success)) {
      print("KONGREGATE PURCHASE SUCCESS");
      getPurchases();
    } else {
      print("KONGREGATE PURCHASE FAILED");
      msg.post(controller, "hide_popup");
    }
  } else if (message_id === "onUserItems") {
    if (t(message.success)) {
      print("KONGREGATE RETURN USER ITEMS RETURNED");
      const buyGoldValue: any = literal({
        buygold_1: 200,
        buygold_2: 500,
        buygold_3: 1000,
        buygold_4: 2000,
        buygold_5: 5000,
        buygold_6: 10000,
      });
      if (len(message.data) > 0) {
        const item = message.data[len(message.data) - 1];
        print(cat("KONGREGATE USER ITEM ", len(message.data), " ", item.identifier));
        msg.post(controller, "hide_popup");
        msg.post(controller, "gen_rewardpack", literal({ packCards: 0, packGold: buyGoldValue[item.identifier], packXp: 0 }));
        html5.run(cat("kongregate.mtx.useItemInstance(", item.id, ", onUseResult);"));
      }
    } else {
      msg.post(controller, "hide_popup");
      print("KONGREGATE RETURN USER ITEMS FAILED");
    }
  } else if (message_id === "adsAvailable") {
    print("KONGREGATE AD AVAILABLE");
    showIncentivizedAd();
  } else if (message_id === "adsUnavailable") {
    print("KONGREGATE AD UNAVAILABLE");

  } else if (message_id === "adOpened") {
    print("KONGREGATE AD OPENED");

  } else if (message_id === "adCompleted") {
    print("KONGREGATE AD COMPLETED");

  } else if (message_id === "adAbandoned") {
    print("KONGREGATE AD ABANDONED");

  }
}

/* Off Kongregate, gold is sold through Stripe. game/store.js does the web
side (OOR_STORE); this keeps the shop's prices from it, starts checkouts and
hands over the gold once a payment is confirmed. Granting waits for the game
to have started, so a purchase confirmed during boot isn't lost. */
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

function load_Kongregate(self: any) {
  print("KONGREGATE LOAD");
  G.jstodef.add_listener(jsListener);
  html5.run("loadKongregate();");
}

const messageData: any = {};
messageData["all"] = literal({
  ["on_start"]: function (message_id: any, message: any, sender: any) {
    // PARITY: jstodef is a native extension global; the port has none unless the engine sets G.jstodef, so this takes the store branch without calling isKongregate() first.
    if (t(G.jstodef) && t(html5) && isKongregate()) {
      print("KONGREGATE START");
      load_Kongregate(message);
    } else {
      store_products();
    }
  },
  ["show_rewarded_ad"]: function (message_id: any, message: any, sender: any) {
    showIncentivizedAd();
  },
  ["reset_statistics"]: function (message_id: any, message: any, sender: any) {
    if (t(html5) && isKongregate()) {
      print("KONGREGATE RESET STATISTICS");
      html5.run("kongregate.stats.submit('current_chapter', 1);");
    }
  },
  ["start_game"]: function (message_id: any, message: any, sender: any) {
    store.started = true;
  },
  ["update"]: function (message_id: any, message: any, sender: any) {
    store_poll();
  },
  ["purchase_gold"]: function (message_id: any, message: any, sender: any) {
    if (t(html5) && !isKongregate()) {
      print(cat("STORE: checkout ", message.identifier));
      msg.post(controller, "popup_loading");
      store_run(cat("OOR_STORE.buy('", message.identifier, "')"));
    } else if (t(html5) && isKongregate()) {
      if (G.username !== "Guest") {
        print(cat("KONGREGATE PURCHASE ITEM: ", message.identifier));
        msg.post(controller, "popup_loading");
        html5.run(cat("kongregate.mtx.purchaseItems(['", message.identifier, "'], onPurchaseResult);"));

      } else {
        html5.run("kongregate.services.showRegistrationBox();");


      }
    }
  },
  ["complete_rank"]: function (message_id: any, message: any, sender: any) {
    if (t(html5) && isKongregate()) {
      print(cat("KONGREGATE COMPLETE CHAPTER: ", message.rank));
      html5.run(cat("kongregate.stats.submit('current_chapter', ", message.rank, ");"));
      html5.run(cat("kongregate.stats.submit('max_chapter', ", message.rank, ");"));
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

void inspect; void isDebug; void initAds;

export default M;
