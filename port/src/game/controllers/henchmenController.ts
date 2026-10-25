// controllers/henchmenController.lua
import inspect_ from '../inspect';
import actions_ from '../actions';
import random_ from '../random/random';
import progress_ from '../progress/progress';
import saveload_ from '../saveload/saveload';
import defsave_ from '../defsave/defsave';
import { msg, hash, print } from '../../engine';
import { pairs, literal, cat, len, t, T, os, tonumber } from '../../lua';
import { G } from '../globals';

const inspect: any = inspect_;
const actions: any = actions_;
const random: any = random_;
const progress: any = progress_;
const saveload: any = saveload_;
const defsave: any = defsave_;

const productName = "OoR";
const controller = "main:/menu#controller";

const M: any = {};
const tickSpeed = 5;
let update_list: any[] = [];
const constantUpdate = {};
const intervalUpdate = {};

let pause = false;
let pauseTimer = 0;

const locationBoost: any[] = [
  [
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1],
  ],
];

function isnil(v: any): boolean { return v === undefined || v === null; }
function assert(v: any, message: any): any {
  if (!t(v)) throw new Error(isnil(message) ? 'assertion failed!' : String(message));
  return v;
}
/** Lua arithmetic operand: numbers pass, numeric strings coerce, anything else raises. */
function nn(v: any): number {
  if (typeof v === 'number') return v;
  const n = typeof v === 'string' ? tonumber(v) : undefined;
  if (n === undefined) throw new Error('attempt to perform arithmetic on a ' + (isnil(v) ? 'nil' : typeof v) + ' value');
  return n;
}

function sort_table(data: any, field1: any) {
  // table.sort returns nothing, so `result` is always nil.
  const result: any = T.sort(data, function (a: any, b: any) {
    if (a[field1] < b[field1]) {
      return true;
    } else {
      return false;
    }
  });
  if (!isnil(result)) data = result;
  return data;
}

function setDps(data: any) {
  if (data.Level === 0) {
    return nn(data.Modifier.Factor) * nn(data.basespeed);
  } else {
    return (Math.pow(nn(data.Modifier.Factor), nn(data.Level))) * nn(data.basespeed);
  }
}

function setUpdateTime(henchmen: any, level: any) {
  let updateTime = 1;
  if (!t(henchmen.contDamage)) {
    // Exact time left to clear the remaining health. Hero powers force an
    // off-schedule retick every time they fire, so rounding this up would
    // add that rounding again on every power hit and push the finish out.
    const dps = Math.max(0.0001, nn(henchmen.dps) * nn(defsave.get("Stats", "globalBoost")));
    updateTime = Math.max(0.1, (nn(level.Health) - nn(t(level.Damage) ? level.Damage : 0)) / dps);
  }
  return updateTime;
}

function set_update_list() {
  update_list = [];
  const _bt = defsave.get("Currency", "BonusTime");
  const bonusTime = t(_bt) ? _bt : 0;
  const currentTime = os.clock() + nn(bonusTime);
  for (let h = 1; h <= len(defsave.loaded.Henchmen.data); h++) {
    const henchmen = defsave.loaded.Henchmen.data[h - 1];
    if (t(henchmen.Cards)) {
      if ((henchmen.Cards > 0 || t(henchmen.Active))) {
        if (isnil(henchmen.lastupdated)) henchmen.lastupdated = currentTime;
        if (isnil(henchmen.nextupdate)) {
          // `level` is an undefined global here.
          const updateTime = setUpdateTime(henchmen, G.level);
          henchmen.nextupdate = currentTime + updateTime;
        }
        T.insert(update_list, literal({ id: h, lastupdated: henchmen.lastupdated, nextupdate: henchmen.nextupdate }));
      }
    }
  }
  if (len(update_list) > 1) {
    update_list = sort_table(update_list, "nextupdate");
  }
}

function ingestHenchmen(data: any) {
  for (let i = 1; i <= len(data); i++) {
    data[i - 1].id = i;
    data[i - 1].Level = 0;
    data[i - 1].dps = setDps(data[i - 1]);
    data[i - 1].copyText = "0/1";
    data[i - 1].Cards = 0;
    data[i - 1].Size = 1;
  }
  return data;
}

function on_start(message: any) {
  print("HENCHMENCONTROLLER: Loading Henchmen JSON");
  defsave.default_data.Henchmen = ingestHenchmen(saveload.load_from_JSON("/data/Henchmen.json"));
  defsave.load("Henchmen");
  for (let h = 1; h <= len(defsave.default_data.Henchmen); h++) {
    const default_henchmen = defsave.default_data.Henchmen[h - 1];
    const saved_henchmen = defsave.get("Henchmen", h);
    saved_henchmen.BuyCosts = default_henchmen.BuyCosts;
    saved_henchmen.Icon = default_henchmen.Icon;
    defsave.set("Henchmen", h, saved_henchmen);
  }
  if (actions.tablelength(defsave.loaded.Henchmen.data) > 0) msg.post(controller, "boot_henchmen");
  print("HENCHMENCONTROLLER: Henchmen Loaded");
  set_update_list();
}

function update_henchman(henchmen: any, timeDiff: any) {
  henchmen.dps = setDps(henchmen);
  const _b = locationBoost[henchmen.map_id - 1][henchmen.dungeon_id - 1][henchmen.level_id - 1];
  let boost = t(_b) ? _b : 1;
  boost = boost * nn(defsave.get("Stats", "globalBoost"));
  const amount = henchmen.dps * nn(timeDiff) * boost;
  print(cat("HENCHMENCONTROLLER: Update ", henchmen.Name, " damage ", amount));
  henchmen.lastupdated = os.clock() + nn(defsave.get("Currency", "BonusTime"));
  const level = defsave.get("Map", henchmen.map_id)[henchmen.dungeon_id - 1].Levels[henchmen.level_id - 1];
  const updateTime = setUpdateTime(henchmen, level);
  print(cat("Name ", henchmen.Name, " update ", updateTime));
  henchmen.nextupdate = os.clock() + nn(defsave.get("Currency", "BonusTime")) + updateTime;

  const message = literal({
    field: "Damage",
    amount: amount,
    henchmen_id: henchmen.id,
    map_id: henchmen.map_id,
    dungeon_id: henchmen.dungeon_id,
    level_id: henchmen.level_id,
    dps: henchmen.dps * nn(defsave.get("Stats", "globalBoost")),
  });
  if (henchmen.Level === 0) message.amount = Math.min(amount, nn(level.Health));
  if (amount > 0) {
    msg.post(controller, "mod_dungeonlevel", message);
  }
  return henchmen;
}

function update(_message?: any) {
  if (!pause) {

    if (len(update_list) > 0) {

      const currentTime = os.clock() + nn(defsave.get("Currency", "BonusTime"));

      while (nn(update_list[0].nextupdate) <= os.clock() + nn(defsave.get("Currency", "BonusTime"))) {
        const henchmen = defsave.get("Henchmen", update_list[0].id);
        if (isnil(henchmen.lastupdated)) henchmen.lastupdated = currentTime;
        const timeDiff = currentTime - nn(henchmen.lastupdated);
        defsave.set("Henchmen", update_list[0].id, update_henchman(henchmen, timeDiff));
        update_list[0].lastupdated = henchmen.lastupdated;
        update_list[0].nextupdate = henchmen.nextupdate;
        update_list = sort_table(update_list, "nextupdate");
      }

    }

    pauseTimer = 0;
  }
}

function return_cost(level: any) {
  const levelcost = [0, 50, 100, 200, 300, 400, 1000, 2000, 4000, 8000, 20000, 50000, 100000];
  if (level === 0) return 0; else return levelcost[level + 1 - 1];
}

function set_progress(count: any, level: any) {
  const levels = [1, 2, 5, 10, 20, 50, 100, 200, 400, 800, 1000, 2000, 5000];
  const prevCost = levels[level - 1] ?? 0;
  const progress = (nn(count) - prevCost) / nn(levels[level + 1 - 1]);
  return progress;
}

function set_copyText(count: any, level: any) {
  const levels = [1, 2, 5, 10, 20, 50, 100, 200, 400, 800, 1000, 2000, 5000];
  const prevCost = levels[level - 1] ?? 0;
  const text = cat(nn(count) - prevCost, "/", levels[level + 1 - 1]);
  return text;
}

const messageData: any = {};

messageData["all"] = literal({
  ["on_start"]: function (message_id: any, message: any, sender: any) {
    on_start(message);
  },
  ["pause"]: function (message_id: any, message: any, sender: any) {
    pause = true;
    pauseTimer = os.clock();
  },
  ["unpause"]: function (message_id: any, message: any, sender: any) {
    const pauseTime = os.clock() - pauseTimer;
    const currentTime = os.clock() + nn(defsave.get("Currency", "BonusTime"));
    for (let h = 1; h <= len(defsave.loaded.Henchmen.data); h++) {
      let henchmen = defsave.loaded.Henchmen.data[h - 1];
      henchmen = defsave.get("Henchmen", h);
      if (henchmen.Status === "Unlocked") {
        // `a + b or c`: the sum is never nil, so the `or` never applies.
        henchmen.lastupdated = nn(henchmen.lastupdated) + pauseTime;
      }
      defsave.set("Henchmen", h, henchmen);
    }
    set_update_list();
    pause = false;
    void currentTime;
  },
  ["update"]: function (message_id: any, message: any, sender: any) {
    update(message);
  },
  ["update_henchmen"]: function (message_id: any, message: any, sender: any) {
    const henchmen = defsave.get("Henchmen", message.henchmen_id);
    henchmen.nextupdate = os.clock() + nn(defsave.get("Currency", "BonusTime"));
    defsave.set("Henchmen", message.henchmen_id, henchmen);
    defsave.save("Henchmen", true);
    set_update_list();
  },
  ["update_allhenchmen"]: function (message_id: any, message: any, sender: any) {
    for (let h = 1; h <= len(defsave.loaded.Henchmen.data); h++) {
      const henchmen = defsave.loaded.Henchmen.data[h - 1];
      henchmen.nextupdate = os.clock() + nn(defsave.get("Currency", "BonusTime"));
      defsave.set("Henchmen", h, henchmen);
    }
    defsave.save("Henchmen", true);
    set_update_list();
  },
  ["reset_statistics"]: function (message_id: any, message: any, sender: any) {
    print("HENCHMENCONTROLLER: Loading Henchmen JSON");
    defsave.default_data.Henchmen = ingestHenchmen(saveload.load_from_JSON("/data/Henchmen.json"));
    defsave.reset_to_default("Henchmen");
    set_update_list();
    defsave.save("Henchmen", true);
    msg.post(controller, "reset_mapdata");
  },
  ["unlock_henchman"]: function (message_id: any, message: any, sender: any) {
    const henchmen_list: any[] = [];
    const currentTime = os.clock() + nn(defsave.get("Currency", "BonusTime"));
    for (let h = 1; h <= len(defsave.loaded.Henchmen.data); h++) {
      const henchmen = defsave.loaded.Henchmen.data[h - 1];
      if (henchmen.Rank === message.rank) {
        print(cat("HENCHMENCONTROLLER: Get Henchmen ", defsave.loaded.Henchmen.data[h - 1].Name));
        defsave.loaded.Henchmen.data[h - 1].Status = "Unlocked";
        defsave.loaded.Henchmen.data[h - 1].Progress = 0;
        defsave.loaded.Henchmen.data[h - 1].Cost = return_cost(defsave.loaded.Henchmen.data[h - 1].Level);
        defsave.loaded.Henchmen.data[h - 1].dps = setDps(defsave.loaded.Henchmen.data[h - 1]);
        defsave.loaded.Henchmen.data[h - 1].Active = false;
        defsave.loaded.Henchmen.data[h - 1].contDamage = false;
        defsave.loaded.Henchmen.data[h - 1].lastupdated = currentTime;
        T.insert(henchmen_list, h);
      }
    }
    set_update_list();
    msg.post(controller, "show_cardsunlock", { henchmen_list: henchmen_list });
    defsave.save("Henchmen", true);
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["activate_henchmen"]: function (message_id: any, message: any, sender: any) {
    const henchmen = defsave.loaded.Henchmen.data[message.henchmen_id - 1];
    const currentTime = os.clock() + nn(defsave.get("Currency", "BonusTime"));
    assert(message.henchmen_id, "Henchmen ID is missing");
    henchmen.lastupdated = currentTime;
    henchmen.Active = true;
    const level = defsave.get("Map", henchmen.map_id)[henchmen.dungeon_id - 1].Levels[henchmen.level_id - 1];
    // `updateTime` is not local here: it writes the global.
    G.updateTime = setUpdateTime(henchmen, level);
    henchmen.nextupdate = currentTime + G.updateTime;
    set_update_list();
    msg.post(controller, "activate_level", literal({ map_id: henchmen.map_id, dungeon_id: henchmen.dungeon_id, level_id: henchmen.level_id }));
    defsave.save("Henchmen", true);
  },
  ["deactivate_henchmen"]: function (message_id: any, message: any, sender: any) {
    assert(message.henchmen_id, "Henchmen ID is missing");
    if (defsave.loaded.Henchmen.data[message.henchmen_id - 1].Cards === 0) {
      defsave.loaded.Henchmen.data[message.henchmen_id - 1].Active = false;
      msg.post(controller, "deactivate_level", literal({ map_id: defsave.loaded.Henchmen.data[message.henchmen_id - 1].map_id, dungeon_id: defsave.loaded.Henchmen.data[message.henchmen_id - 1].dungeon_id, level_id: defsave.loaded.Henchmen.data[message.henchmen_id - 1].level_id }));
    }
    set_update_list();
    defsave.save("Henchmen", true);
  },
  ["complete_rank"]: function (message_id: any, message: any, sender: any) {
    if (!t(message.portal)) {
      for (let h = 1; h <= len(defsave.loaded.Henchmen.data); h++) {
        const henchmen = defsave.get("Henchmen", h);
        henchmen.Size = 1;
        defsave.set("Henchmen", h, henchmen);
        msg.post(controller, "deactivate_henchmen", { henchmen_id: h });
      }
      defsave.save("Henchmen", true);
      msg.post(controller, "deactivate_levels");
    }
  },
  ["set_contdamage"]: function (message_id: any, message: any, sender: any) {
    assert(message.henchmen_id, "Henchmen ID is missing");
    defsave.loaded.Henchmen.data[message.henchmen_id - 1].contDamage = true;
    set_update_list();
    defsave.save("Henchmen", true);
  },
  ["mod_henchmen"]: function (message_id: any, message: any, sender: any) {
    const henchmen = defsave.get("Henchmen", message.henchmen_id);
    henchmen.Size = nn(henchmen.Size) + nn(message.amount);
    defsave.set("Henchmen", message.henchmen_id, henchmen);
  },
  ["buy_henchmen"]: function (message_id: any, message: any, sender: any) {
    const henchmen = defsave.get("Henchmen", message.henchmen_id);
    const costBase = defsave.get("Stats", "costMultiplier");
    if (t(henchmen.BuyCosts)) {
      for (const [c, cost] of pairs<any>(henchmen.BuyCosts)) {
        /*
        cost.message.amount = 0
        if cost.message_id == "update_resources" then
          local singlePurchaseCost = cost.baseamount * math.pow(costBase, henchmen.Size + 1)
          if message.amount == 1 then
            cost.message.amount = -singlePurchaseCost
          else
            cost.message.amount = -singlePurchaseCost * ((math.pow(costBase, message.amount) - 1) / (costBase - 1));
          end
          cost.message.amount = -message.amount * cost.baseamount
        end
        */
        cost.message.amount = -nn(cost.baseamount) * nn(message.amount);
        msg.post(controller, cost.message_id, cost.message);
        void c;
      }
      henchmen.Size = nn(henchmen.Size) + nn(message.amount);
      defsave.set("Henchmen", message.henchmen_id, henchmen);
    }

    defsave.save("Henchmen", true);
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
    void costBase;
  },
  ["add_henchmencards"]: function (message_id: any, message: any, sender: any) {
    const henchmen = defsave.get("Henchmen", message.henchmen_id);

    if (henchmen.Active === false) {
      msg.post(controller, "activate_henchmen", message);
    }

    henchmen.Cards = nn(henchmen.Cards) + nn(message.amount);
    if (henchmen.Cards >= 1 && henchmen.Level === 0) {
      henchmen.Level = 1;
    }
    henchmen.Cost = return_cost(henchmen.Level);
    henchmen.Progress = set_progress(henchmen.Cards, henchmen.Level);
    henchmen.copyText = set_copyText(henchmen.Cards, henchmen.Level);
    defsave.set("Henchmen", message.henchmen_id, henchmen);
    set_update_list();
    defsave.save("Henchmen");
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["levelup_henchmen"]: function (message_id: any, message: any, sender: any) {
    if (defsave.loaded.Henchmen.data[message.henchmen_id - 1].Progress >= 1) {
      msg.post(controller, "mod_xp", { amount: -nn(defsave.loaded.Henchmen.data[message.henchmen_id - 1].Cost) });
      defsave.loaded.Henchmen.data[message.henchmen_id - 1].Level = defsave.loaded.Henchmen.data[message.henchmen_id - 1].Level + 1;
      defsave.loaded.Henchmen.data[message.henchmen_id - 1].Cost = return_cost(defsave.loaded.Henchmen.data[message.henchmen_id - 1].Level);
      defsave.loaded.Henchmen.data[message.henchmen_id - 1].copyText = set_copyText(defsave.loaded.Henchmen.data[message.henchmen_id - 1].Cards, defsave.loaded.Henchmen.data[message.henchmen_id - 1].Level);
      defsave.loaded.Henchmen.data[message.henchmen_id - 1].Progress = set_progress(defsave.loaded.Henchmen.data[message.henchmen_id - 1].Cards, defsave.loaded.Henchmen.data[message.henchmen_id - 1].Level);
      defsave.save("Henchmen", true);
      set_update_list();
      if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
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

void inspect; void random; void progress; void productName; void tickSpeed;
void constantUpdate; void intervalUpdate;

export default M;
