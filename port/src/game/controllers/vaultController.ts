// controllers/vaultController.lua
import inspect_ from '../inspect';
import actions_ from '../actions';
import random_ from '../random/random';
import progress_ from '../progress/progress';
import defsave_ from '../defsave/defsave';
import { msg, hash } from '../../engine';
import { pairs, literal, cat, t, os, tonumber } from '../../lua';

const inspect: any = inspect_;
const actions: any = actions_;
const random: any = random_;
const progress: any = progress_;
const defsave: any = defsave_;

const productName = "OoR";
const controller = "main:/menu#controller";

const M: any = {};
const startingGold = 0;
const startingXP = 0;
const startingFollowers = 0;
const startingBonusTime = 0;
const startingPortalScrolls = 0;
const lastUpdate = 0;
const updateInterval = 1;
let followers_gain_while_away: any = -1;

function isnil(v: any): boolean { return v === undefined || v === null; }
/** Lua arithmetic operand: numbers pass, numeric strings coerce, anything else raises. */
function nn(v: any): number {
  if (typeof v === 'number') return v;
  const n = typeof v === 'string' ? tonumber(v) : undefined;
  if (n === undefined) throw new Error('attempt to perform arithmetic on a ' + (isnil(v) ? 'nil' : typeof v) + ' value');
  return n;
}

function get_newfollowers() {
  // os.clock is wall-clock time here (controller.script swaps in socket.gettime),
  // so a save with no timestamp would count every second since 1970 as time away.
  const last = defsave.get("Currency", "lastUpdate");
  if (!t(last) || last <= 0) return 0;
  const cycles = Math.floor((os.clock() + nn(defsave.get("Currency", "BonusTime")) - last) / updateInterval);
  return nn(defsave.get("Stats", "followerRate")) * cycles * nn(defsave.get("Stats", "globalBoost"));
}

function on_start(message: any) {
  defsave.load("Currency");
  if (actions.tablelength(defsave.loaded.Currency.data) === 0) {
    defsave.set("Currency", "Gold", startingGold);
    defsave.set("Currency", "Xp", startingXP);
    defsave.set("Currency", "Followers", startingFollowers);
    defsave.set("Currency", "lastUpdate", os.clock() + startingBonusTime);
    defsave.set("Currency", "BonusTime", startingBonusTime);
    defsave.set("Currency", "PortalScrolls", startingPortalScrolls);
    defsave.set("Currency", "Bonusxp", undefined);
    defsave.save("Currency", true);
    defsave.load("Currency");
    msg.post(controller, "refreshCurrency");
  }
  if (actions.tablelength(defsave.loaded.Currency.data) > 0) msg.post(controller, "boot_currency");
}

function update(message: any) {

  if (!t(defsave.get("Currency", "lastUpdate"))) defsave.set("Currency", "lastUpdate", os.clock() + nn(defsave.get("Currency", "BonusTime")));
  if (os.clock() + nn(defsave.get("Currency", "BonusTime")) > nn(defsave.get("Currency", "lastUpdate")) + updateInterval) {
    const cycles = Math.floor((os.clock() + nn(defsave.get("Currency", "BonusTime")) - nn(defsave.get("Currency", "lastUpdate"))) / updateInterval);
    const _f = defsave.get("Currency", "Followers");
    const curFollowers = t(_f) ? _f : 0;
    defsave.set("Currency", "Followers", nn(curFollowers) + get_newfollowers());
    defsave.set("Currency", "lastUpdate", os.clock() + nn(defsave.get("Currency", "BonusTime")));
    defsave.save("Currency", true);
    msg.post("main:/overlay#header", "refresh_all");
    void cycles;
  }
}

function mod_gold(amount: any) {
  defsave.set("Currency", "Gold", nn(defsave.get("Currency", "Gold")) + nn(amount));
  defsave.save("Currency", true);
  msg.post("main:/overlay#header", "refresh_all");
}

function mod_followers(amount: any) {
  defsave.set("Currency", "Followers", nn(defsave.get("Currency", "Followers")) + nn(amount));
  defsave.save("Currency", true);
  msg.post("main:/overlay#header", "refresh_all");
}

function mod_portalscroll(amount: any) {
  defsave.set("Currency", "PortalScrolls", nn(defsave.get("Currency", "PortalScrolls")) + nn(amount));
  defsave.save("Currency", true);
}

function mod_xp(amount: any) {
  defsave.set("Currency", "Xp", nn(defsave.get("Currency", "Xp")) + nn(amount));
  defsave.save("Currency", true);
  msg.post("main:/overlay#header", "refresh_all");
}

function mod_time(amount: any) {
  defsave.set("Currency", "BonusTime", nn(defsave.get("Currency", "BonusTime")) + nn(amount));
  defsave.save("Currency", true);
  msg.post("main:/overlay#header", "refresh_all");
}

function set_bonusxp(statName: any, value: any, count: any) {
  if (nn(value) > 0 && !isnil(statName)) {
    if (isnil(defsave.loaded.Currency.data.Bonusxp)) { defsave.loaded.Currency.data.Bonusxp = {}; }
    if (isnil(defsave.loaded.Currency.data.Bonusxp[statName])) { defsave.loaded.Currency.data.Bonusxp[statName] = {}; }
    if (isnil(defsave.loaded.Currency.data.Bonusxp[statName].Value)) { defsave.loaded.Currency.data.Bonusxp[statName].Value = value; }
    if (isnil(defsave.loaded.Currency.data.Bonusxp[statName].Total)) { defsave.loaded.Currency.data.Bonusxp[statName].Total = 0; }
    if (isnil(defsave.loaded.Currency.data.Bonusxp[statName].Collected)) { defsave.loaded.Currency.data.Bonusxp[statName].Collected = 0; }
    if (isnil(defsave.loaded.Currency.data.Bonusxp[statName].Progress)) { defsave.loaded.Currency.data.Bonusxp[statName].Progress = 0; }


    let total = 10;
    let num = 0;
    while ((nn(count) / total) >= 1) {
      num = num + 1;
      total = total * 10;
    }

    const collected = Math.pow(10, nn(defsave.loaded.Currency.data.Bonusxp[statName].Collected));
    defsave.loaded.Currency.data.Bonusxp[statName].Progress = (nn(count) - collected) / ((Math.pow(10, num)) - (Math.pow(10, (num - 1))));
    defsave.loaded.Currency.data.Bonusxp[statName].Total = num;
    defsave.save("Currency", true);
  }
}

function collect_bonusxp(statName: any, callback: any, delay?: any) {
  if (isnil(defsave.loaded.Currency.data.Bonusxp[statName].Total)) { defsave.loaded.Currency.data.Bonusxp[statName].Total = 0; }
  if (isnil(defsave.loaded.Currency.data.Bonusxp[statName].Collected)) { defsave.loaded.Currency.data.Bonusxp[statName].Collected = 0; }
  const total = defsave.loaded.Currency.data.Bonusxp[statName].Total;
  const collected = defsave.loaded.Currency.data.Bonusxp[statName].Collected;
  const value = defsave.loaded.Currency.data.Bonusxp[statName].Value;
  defsave.loaded.Currency.data.Bonusxp[statName].Collected = total;
  defsave.save("Currency", true);
  if (!isnil(callback)) {
    msg.post(cat("main:/menu#", callback), "refresh_all");
  }
  void collected; void value; void delay;
}

const messageData: any = {};
// The Lua constructor lists "use_portalscroll" twice (20 fields): the key keeps
// its first slot and the second function wins.
messageData["all"] = literal({
  ["on_start"]: function (message_id: any, message: any, sender: any) { on_start(message); },
  ["returntogame"]: function (message_id: any, message: any, sender: any) {
    if (followers_gain_while_away === -1) {
      followers_gain_while_away = get_newfollowers();
    }
    // Nothing earned (a brand-new game, or straight back) means nothing to welcome back to.
    if (followers_gain_while_away >= 1) {
      msg.post(controller, "popup_returntogame", { amount: followers_gain_while_away });
    }
  },
  ["update"]: function (message_id: any, message: any, sender: any) { update(message); },
  ["reset_statistics"]: function (message_id: any, message: any, sender: any) {
    defsave.set("Currency", "Gold", startingGold);
    defsave.set("Currency", "Xp", startingXP);
    defsave.set("Currency", "Bonusxp", undefined);
    defsave.set("Currency", "BonusTime", startingBonusTime);
    defsave.set("Currency", "PortalScrolls", startingPortalScrolls);
    defsave.set("Currency", "Followers", 0);
    defsave.set("Currency", "lastUpdate", os.clock());
    defsave.save("Currency", true);
  },
  ["ad_reward"]: function (message_id: any, message: any, sender: any) { mod_gold(100); },
  ["purchase_cards"]: function (message_id: any, message: any, sender: any) {
    if (defsave.get("Currency", "Gold") >= message.cost) {
      mod_gold(-nn(message.cost));
      msg.post(message.msgpost.receiver, message.msgpost.message_id, message.msgpost.message);
    } else {
      msg.post(cat("main:/menu#", message.callback), "purchase_failed", message.msgpost);
    }
  },
  ["purchase_xp"]: function (message_id: any, message: any, sender: any) {
    if (defsave.get("Currency", "Gold") >= message.cost) {
      mod_gold(-nn(message.cost));
      msg.post(message.msgpost.receiver, message.msgpost.message_id, message.msgpost.message);
    } else {
      msg.post(cat("main:/menu#", message.callback), "purchase_failed", message.msgpost);
    }
  },
  ["purchase_time"]: function (message_id: any, message: any, sender: any) {
    if (defsave.get("Currency", "Gold") >= message.cost) {
      mod_gold(-nn(message.cost));
      msg.post(message.msgpost.receiver, message.msgpost.message_id, message.msgpost.message);
      msg.post(controller, "show_timewarp", { amount: message.timeAmount });
    } else {
      msg.post(cat("main:/menu#", message.callback), "purchase_failed", message.msgpost);
    }
  },

  ["mod_gold"]: function (message_id: any, message: any, sender: any) {
    mod_gold(message.amount);
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["mod_bonustime"]: function (message_id: any, message: any, sender: any) {
    mod_time(message.amount);
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["mod_xp"]: function (message_id: any, message: any, sender: any) {
    mod_xp(message.amount);
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["mod_followers"]: function (message_id: any, message: any, sender: any) {
    mod_followers(message.amount);
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["mod_currency"]: function (message_id: any, message: any, sender: any) {
    msg.post(controller, "mod_gold", { amount: message.gold });
    msg.post(controller, "mod_xp", { amount: message.xp });
    msg.post(controller, "mod_bonustime", { amount: message.time });
    msg.post(controller, "mod_followers", { amount: message.followers });
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["mod_portalscroll"]: function (message_id: any, message: any, sender: any) {
    mod_portalscroll(message.amount);
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["buy_portalscroll"]: function (message_id: any, message: any, sender: any) {
    if (nn(defsave.get("Currency", "Gold")) + nn(message.gold) > 0) {
      msg.post(controller, "mod_gold", { amount: message.gold });
      msg.post(controller, "mod_portalscroll", { amount: message.amount });
      if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
    }
  },
  // first entry: posts mod_portalscroll { amount = message.amount } — overwritten below in Lua
  ["use_portalscroll"]: function (message_id: any, message: any, sender: any) {
    msg.post(controller, "mod_portalscroll", { amount: -1 });
    if (defsave.get("Currency", "PortalScrolls") >= 0) msg.post(controller, "show_sellitems", { portal: true });
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["set_bonusxp"]: function (message_id: any, message: any, sender: any) {
    set_bonusxp(message.statName, message.value, message.count);
  },
  ["collect_bonusxp"]: function (message_id: any, message: any, sender: any) {
    collect_bonusxp(message.statName, message.callback);
  },
  ["complete_rank"]: function (message_id: any, message: any, sender: any) {
    if (!t(message.portal)) defsave.set("Currency", "Followers", 0);
    if (t(defsave.loaded.Currency.data.Bonusxp)) {
      for (const [r, resource] of pairs(defsave.loaded.Currency.data.Bonusxp)) {

        if (t(defsave.loaded.Currency.data.Bonusxp[r as any].Total)) {
          msg.post(controller, "mod_xp", { amount: defsave.loaded.Currency.data.Bonusxp[r as any].Total });
        }
        defsave.loaded.Currency.data.Bonusxp[r as any].Total = 0;
        defsave.loaded.Currency.data.Bonusxp[r as any].Collected = 0;
        defsave.loaded.Currency.data.Bonusxp[r as any].Progress = 0;
        void resource;
      }
      defsave.save("Currency", true);
    }
  },
}, 20);

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

void inspect; void random; void progress; void productName; void lastUpdate;

export default M;
