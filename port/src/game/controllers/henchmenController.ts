// controllers/henchmenController.lua
import inspect_ from '../inspect';
import actions_ from '../actions';
import random_ from '../random/random';
import progress_ from '../progress/progress';
import saveload_ from '../saveload/saveload';
import defsave_ from '../defsave/defsave';
import { msg, hash, print } from '../../engine';
import { pairs, literal, cat, len, t, T, os, tonumber, M as LM, tset } from '../../lua';
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
/** t[k] = v where v may be nil. A nil store still makes the key's node in Lua
 *  (luaH_set), which tset records on tables that track their layout. */
function nset(tbl: any, k: string, v: any) { if (isnil(v)) tset(tbl, k, undefined); else tbl[k] = v; }
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
  // Enemies only take damage from hero powers, never a tick of their own.
  if (t(data.Enemy)) return 0;
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
    // Henchmen load before Stats, so a timer set at boot has no boost yet.
    const dps = Math.max(0.0001, nn(henchmen.dps) * actions.henchmen_rate(henchmen));
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
          // An event location can be missing from a save made before it
          // existed; the map adds it once the game starts.
          const _m = defsave.loaded.Map.data[henchmen.map_id - 1];
          const dungeon = t(_m) ? _m[henchmen.dungeon_id - 1] : _m;
          const _l = t(dungeon) ? dungeon.Levels[henchmen.level_id - 1] : dungeon;
          const level = t(_l) ? _l : literal({ Health: 1 });
          const updateTime = setUpdateTime(henchmen, level);
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
    // An enemy row starts full, and is never capped to one kill a tick
    // the way an unlevelled henchman's damage is.
    const item = data[i - 1];
    if (t(item.Enemy)) {
      data[i - 1].Level = 1;
      data[i - 1].Size = item.EnemyCount;
    }
  }
  return data;
}

function on_start(message: any) {
  print("HENCHMENCONTROLLER: Loading Henchmen JSON");
  defsave.default_data.Henchmen = ingestHenchmen(saveload.load_from_JSON("/data/Henchmen.json"));
  defsave.load("Henchmen");
  for (let h = 1; h <= len(defsave.default_data.Henchmen); h++) {
    const default_henchmen = defsave.default_data.Henchmen[h - 1];
    let saved_henchmen = defsave.get("Henchmen", h);
    if (isnil(saved_henchmen) || (default_henchmen.map_id !== 1 && saved_henchmen.Name !== default_henchmen.Name)) {
      // Added since this save was made, or an event slot whose
      // henchman has changed; the event starts its run again anyway.
      saved_henchmen = actions.clone(default_henchmen);
    }
    // Its place in the list, which event rows added since may have moved.
    saved_henchmen.id = h;
    nset(saved_henchmen, "BuyCosts", default_henchmen.BuyCosts);
    nset(saved_henchmen, "Icon", default_henchmen.Icon);
    nset(saved_henchmen, "Portrait", default_henchmen.Portrait);
    defsave.set("Henchmen", h, saved_henchmen);
  }
  if (actions.tablelength(defsave.loaded.Henchmen.data) > 0) msg.post(controller, "boot_henchmen");
  print("HENCHMENCONTROLLER: Henchmen Loaded");
  set_update_list();
}

function update_henchman(henchmen: any, timeDiff: any) {
  henchmen.dps = setDps(henchmen);
  // Boosts are set per main-game level; event maps have none.
  const mapBoost = locationBoost[henchmen.map_id - 1];
  const _b = t(mapBoost) && t(mapBoost[henchmen.dungeon_id - 1]) ? mapBoost[henchmen.dungeon_id - 1][henchmen.level_id - 1] : undefined;
  let boost = t(_b) ? _b : 1;
  boost = boost * actions.henchmen_rate(henchmen);
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
    dps: henchmen.dps * actions.henchmen_rate(henchmen),
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

// Level-ups cost XP, or on an event map that event's shards.
function spend_levelup(card: any) {
  const shards = actions.event_shards(card.map_id);
  if (t(shards)) {
    msg.post(controller, "add_resource_quietly", { stat: shards, amount: -nn(card.Cost) });
  } else {
    msg.post(controller, "mod_xp", { amount: -nn(card.Cost) });
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

// Captain Hollis: free hires on a random open level of his dungeon, for a
// henchman the player already has.
function hero_muster(message: any) {
  // Hiring more enemies would only make the fight longer.
  if (actions.enemy_map(message.map_id)) return;
  const open: any[] = [];
  for (let h = 1; h <= len(defsave.loaded.Henchmen.data); h++) {
    const henchmen = defsave.loaded.Henchmen.data[h - 1];
    if (henchmen.map_id === message.map_id && henchmen.dungeon_id === message.dungeon_id && nn(t(henchmen.Cards) ? henchmen.Cards : 0) > 0) {
      const level = defsave.get("Map", henchmen.map_id)[henchmen.dungeon_id - 1].Levels[henchmen.level_id - 1];
      if (t(level) && !t(level.isLocked) && t(level.wasClickedOpen)) T.insert(open, h);
    }
  }
  if (len(open) === 0) return;
  const h = open[LM.random(1, len(open)) - 1];
  const amount = Math.max(1, Math.floor(actions.hero_power(message, message.at1, message.at13) + 0.5));
  const henchmen = defsave.get("Henchmen", h);
  henchmen.Size = nn(henchmen.Size) + amount;
  defsave.set("Henchmen", h, henchmen);
  defsave.save("Henchmen", true);
  msg.post("main:/menu#dungeonmine", "hero_fx", literal({ kind: "muster", hero_id: message.hero_id, map_id: message.map_id, dungeon_id: message.dungeon_id,
    level_id: henchmen.level_id, henchmen_id: h, amount: amount, echo: !isnil(message.echo_scale) }));
}

const messageData: any = {};

messageData["all"] = literal({
  ["hero_muster"]: function (message_id: any, message: any, sender: any) { hero_muster(message); },
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
  // A hero power just landed Damage on this henchman's level. Move the tick to
  // when the remaining health actually runs out, measured from the last tick,
  // which is exactly when the bar fills. Forcing a tick now used to work out
  // the next one before that tick's own damage reached the level, so the tick
  // came late by however long the henchman had been working and the bar sat
  // full for that long; Chain Lightning hits every open level, so it showed most.
  ["update_henchmen"]: function (message_id: any, message: any, sender: any) {
    const henchmen = defsave.get("Henchmen", message.henchmen_id);
    const currentTime = os.clock() + nn(defsave.get("Currency", "BonusTime"));
    const level = defsave.get("Map", henchmen.map_id)[henchmen.dungeon_id - 1].Levels[henchmen.level_id - 1];
    henchmen.nextupdate = nn(t(henchmen.lastupdated) ? henchmen.lastupdated : currentTime) + setUpdateTime(henchmen, level);
    defsave.set("Henchmen", message.henchmen_id, henchmen);
    defsave.save("Henchmen", true);
    set_update_list();
  },
  // An enemy map's front rows or heroes changed: the new front row's enemy
  // starts its tick from when it stepped up, the rest stop, and a change of
  // heroes lands what the old ones had done before the new rate starts.
  ["update_allenemies"]: function (message_id: any, message: any, sender: any) {
    const now = os.clock() + nn(defsave.get("Currency", "BonusTime"));
    for (let h = 1; h <= len(defsave.loaded.Henchmen.data); h++) {
      const henchmen = defsave.loaded.Henchmen.data[h - 1];
      if (t(henchmen.Enemy) && henchmen.map_id === message.map_id) {
        const dps = setDps(henchmen);
        if (t(henchmen.Active) && dps !== henchmen.dps) {
          const level = defsave.get("Map", henchmen.map_id)[henchmen.dungeon_id - 1].Levels[henchmen.level_id - 1];
          const done = nn(t(henchmen.dps) ? henchmen.dps : 0) * actions.henchmen_rate(henchmen) * Math.max(0, now - nn(t(henchmen.lastupdated) ? henchmen.lastupdated : now));
          level.Damage = nn(t(level.Damage) ? level.Damage : 0) + done;
          henchmen.lastupdated = now;
        }
        henchmen.dps = dps;
        if (t(henchmen.Active)) {
          const level = defsave.get("Map", henchmen.map_id)[henchmen.dungeon_id - 1].Levels[henchmen.level_id - 1];
          henchmen.nextupdate = nn(t(henchmen.lastupdated) ? henchmen.lastupdated : os.clock() + nn(defsave.get("Currency", "BonusTime"))) + setUpdateTime(henchmen, level);
        }
      }
    }
    set_update_list();
    defsave.save("Henchmen", true);
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
  // A new event run. The event's henchmen keep their cards and levels from
  // run to run, like the main game's across chapters, and only their crews
  // start again. One never carded yet gets its first card, so every
  // henchman works on its own from the first hire.
  ["event_reset"]: function (message_id: any, message: any, sender: any) {
    const currentTime = os.clock() + nn(defsave.get("Currency", "BonusTime"));
    for (let h = 1; h <= len(defsave.default_data.Henchmen); h++) {
      const henchmen = defsave.default_data.Henchmen[h - 1];
      if (henchmen.map_id === message.map_id && t(henchmen.Enemy)) {
        // Every row back at full strength; the map starts the front one.
        const fresh = actions.clone(henchmen);
        fresh.Size = henchmen.EnemyCount;
        fresh.Level = 1;
        fresh.Cards = 0;
        fresh.Active = false;
        fresh.contDamage = false;
        fresh.lastupdated = currentTime;
        fresh.nextupdate = undefined;
        fresh.dps = setDps(fresh);
        defsave.loaded.Henchmen.data[h - 1] = fresh;
      } else if (henchmen.map_id === message.map_id) {
        const saved = defsave.loaded.Henchmen.data[h - 1];
        const fresh = actions.clone(henchmen);
        fresh.Status = "Unlocked";
        fresh.Cards = Math.max(1, t(saved) && saved.Name === henchmen.Name && t(saved.Cards) ? saved.Cards : 0);
        fresh.Level = Math.max(1, t(saved) && saved.Name === henchmen.Name && t(saved.Level) ? saved.Level : 0);
        fresh.Cost = return_cost(fresh.Level);
        fresh.Progress = set_progress(fresh.Cards, fresh.Level);
        fresh.copyText = set_copyText(fresh.Cards, fresh.Level);
        fresh.dps = setDps(fresh);
        fresh.Active = false;
        fresh.contDamage = false;
        fresh.lastupdated = currentTime;
        defsave.loaded.Henchmen.data[h - 1] = fresh;
      }
    }
    set_update_list();
    defsave.save("Henchmen", true);
  },
  ["unlock_henchman"]: function (message_id: any, message: any, sender: any) {
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
      }
    }
    set_update_list();
    // No unlock celebration: the screen shows their card as if the player
    // had been given one, but unlocking only makes it findable in packs.
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
        const outer = defsave.loaded.Henchmen.data[h - 1];
        if (outer.map_id === 1) {
          const henchmen = defsave.get("Henchmen", h);
          henchmen.Size = 1;
          defsave.set("Henchmen", h, henchmen);
          msg.post(controller, "deactivate_henchmen", { henchmen_id: h });
        }
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
        cost.message.amount = -nn(cost.baseamount) * nn(message.amount) * actions.hire_cost_factor();
        msg.post(controller, cost.message_id, cost.message);
        void c;
      }
      henchmen.Size = nn(henchmen.Size) + nn(message.amount);
      defsave.set("Henchmen", message.henchmen_id, henchmen);
      // Event quests can ask for hires on a level.
      if (henchmen.map_id !== 1) {
        msg.post(controller, "update_resources", { stat: cat("hire", henchmen.map_id, "-", henchmen.dungeon_id, "-", henchmen.level_id), amount: message.amount });
      }
    }

    defsave.save("Henchmen", true);
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
    void costBase;
  },
  ["add_henchmencards"]: function (message_id: any, message: any, sender: any) {
    const henchmen = defsave.get("Henchmen", message.henchmen_id);

    // Active is nil until a henchman has been unlocked or deactivated once,
    // and nil == false is false in Lua, so the very first card used to be
    // skipped and only the second one started them working.
    if (!t(henchmen.Active)) {
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
      spend_levelup(defsave.loaded.Henchmen.data[message.henchmen_id - 1]);
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

// Module locals the parity harness dumps (tools/port/parity/README.md, State dump format).
M.__parity_locals = () => ({ locationBoost, pause, pauseTimer, update_list });

export default M;
