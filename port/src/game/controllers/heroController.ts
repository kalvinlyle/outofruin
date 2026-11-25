// controllers/heroController.lua
import inspect_ from '../inspect';
import actions_ from '../actions';
import random_ from '../random/random';
import progress_ from '../progress/progress';
import saveload_ from '../saveload/saveload';
import defsave_ from '../defsave/defsave';
import chapter0 from '../chapter0/chapter0';
import { msg, hash, print } from '../../engine';
import { pairs, literal, cat, len, t, T, M as LM, os, tonumber, tset } from '../../lua';
import { G } from '../globals';
import audio from '../../systems/audio';

const inspect: any = inspect_;
const actions: any = actions_;
const random: any = random_;
const progress: any = progress_;
const saveload: any = saveload_;
const defsave: any = defsave_;

const productName = "OoR";
const controller = "main:/menu#controller";
const baseHealingTime = 5;

const M: any = {};
let curLoc: any = literal({ map_id: 0, dungeon_id: 0 });

let pause = false;
let pauseTimer = 0;

let update_list: any[] = [];
let dungeon_regenSpeed: any[] = [
  literal({ map_id: 1, dungeon_id: 1, regenSpeed: 1 }),
  literal({ map_id: 1, dungeon_id: 2, regenSpeed: 1 }),
  literal({ map_id: 1, dungeon_id: 3, regenSpeed: 1 }),
  literal({ map_id: 1, dungeon_id: 4, regenSpeed: 1 }),
  literal({ map_id: 1, dungeon_id: 5, regenSpeed: 1 }),
  literal({ map_id: 2, dungeon_id: 1, regenSpeed: 1 }),
  literal({ map_id: 2, dungeon_id: 2, regenSpeed: 1 }),
  literal({ map_id: 2, dungeon_id: 3, regenSpeed: 1 }),
];

const attributeMap: any = {};
attributeMap.Empathy = "Healing";
attributeMap.Greed = "Luck";
attributeMap.Reason = "Wisdom";
attributeMap.Wrath = "Attack";
attributeMap.Zeal = "Speed";
attributeMap.Stasis = "Defense";

const hero_portrait = ["hero_elfmercenary", "hero_dwarfdruid", "hero_goblinassassin"];

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

function update_herotimer(id: any, p?: any, tm?: any) {
  if (isnil(p)) p = 1;
  if (isnil(tm)) tm = 0;
  if (!isnil(defsave.loaded.Hero.data[id - 1])) {
    defsave.loaded.Hero.data[id - 1].Timer = Math.max(0, tm);
    defsave.loaded.Hero.data[id - 1].Percent = Math.max(0, Math.min(1, p));
  }
  defsave.save("Hero", true);
}

function get_regenSpeed(map_id: any, dungeon_id: any) {

  let regenSpeed = 1;


  for (const [d, dungeon] of pairs<any>(dungeon_regenSpeed)) {
    if (map_id === dungeon.map_id && dungeon_id === dungeon.dungeon_id) {
      regenSpeed = regenSpeed * dungeon_regenSpeed[(d as number) - 1].regenSpeed;
    }
  }

  return regenSpeed;

}

// Hero.data index of the hero in a slot, other than `except`.
function hero_in_slot(map_id: any, dungeon_id: any, slot_id: any, except: any) {
  for (let h = 1; h <= len(defsave.loaded.Hero.data); h++) {
    const hero = defsave.loaded.Hero.data[h - 1];
    const at = hero.location;
    if (h !== except && t(at) && at.map_id === map_id && at.dungeon_id === dungeon_id && at.slot_id === slot_id) return h;
  }
  return undefined;
}

function heroes_in_dungeon(map_id: any, dungeon_id: any) {
  let count = 0;
  for (let h = 1; h <= len(defsave.loaded.Hero.data); h++) {
    const hero = defsave.loaded.Hero.data[h - 1];
    const at = hero.location;
    if (t(at) && at.map_id === map_id && at.dungeon_id === dungeon_id) count = count + 1;
  }
  return count;
}

function assign_hero(message: any) {
  // hero_id is the index into Hero.data. It used to be looked up by an "id"
  // field that only unlocked heroes carried, so a hero unlocked straight from
  // the JSON matched the first hero with no id instead of itself.
  const id = message.hero_id;
  assert(defsave.loaded.Hero.data[id - 1], "id not found in defsave.loaded.Hero.data");

  // The hero slots screen drops a hero on any slot. A hero moved between two
  // slots of one dungeon trades places with whoever is there and keeps its
  // power timers; a hero from anywhere else bumps the slot's hero back to
  // the roster, and leaves its old slot so the heroes behind it close up.
  const from = defsave.loaded.Hero.data[id - 1].location;
  const occupant = hero_in_slot(message.map_id, message.dungeon_id, message.slot_id, id);
  if (t(from) && from.map_id === message.map_id && from.dungeon_id === message.dungeon_id) {
    if (t(occupant)) {
      defsave.loaded.Hero.data[occupant! - 1].location.slot_id = from.slot_id;
      from.slot_id = message.slot_id;
    } else {
      // Slots are kept packed, so an empty one is past the last hero.
      for (let h = 1; h <= len(defsave.loaded.Hero.data); h++) {
        const hero = defsave.loaded.Hero.data[h - 1];
        const at = hero.location;
        if (t(at) && at.map_id === from.map_id && at.dungeon_id === from.dungeon_id && at.slot_id > from.slot_id) {
          at.slot_id = at.slot_id - 1;
        }
      }
      from.slot_id = heroes_in_dungeon(from.map_id, from.dungeon_id);
    }
    defsave.save("Hero", true);
    return;
  }
  if (t(occupant)) {
    unassign_hero(literal({ hero_id: occupant }));
    msg.post(controller, "clear_heroquest", { hero_id: occupant });
  }
  if (t(from)) unassign_hero(literal({ hero_id: id }));
  const slot_id = Math.min(message.slot_id, heroes_in_dungeon(message.map_id, message.dungeon_id) + 1);

  defsave.loaded.Hero.data[id - 1].location = literal({ map_id: message.map_id, dungeon_id: message.dungeon_id, slot_id: slot_id });


  const powers = defsave.loaded.Hero.data[id - 1].Powers;
  for (let p = 1; p <= len(powers); p++) {
    defsave.loaded.Hero.data[id - 1].Powers[p - 1].Stage = 1;
    defsave.loaded.Hero.data[id - 1].Powers[p - 1].lastupdate = os.clock() + nn(defsave.get("Currency", "BonusTime"));
    defsave.loaded.Hero.data[id - 1].Powers[p - 1].nextupdate = os.clock() + nn(defsave.get("Currency", "BonusTime")) + nn(defsave.loaded.Hero.data[id - 1].Powers[p - 1].Stages[defsave.loaded.Hero.data[id - 1].Powers[p - 1].Stage - 1].updatedelay);
    defsave.loaded.Hero.data[id - 1].Powers[p - 1].regenSpeed = get_regenSpeed(message.map_id, message.dungeon_id);
  }
  defsave.save("Hero", true);
}

// Place the starter hero (Bram) in the Farm's first slot on a new game,
// or on load while Bram is still the only unlocked field hero.
function assign_starter_hero(bonusTime?: number) {
  if (chapter0.active()) return;
  const h = chapter0.hero_index();
  if (h === undefined) return;
  const hero = defsave.loaded.Hero.data[h - 1];
  if (!t(hero) || t(hero.Locked) || t(hero.location)) return;
  const bt = bonusTime !== undefined ? bonusTime : (isnil(defsave.get("Currency", "BonusTime")) ? 0 : nn(defsave.get("Currency", "BonusTime")));
  hero.location = literal({ map_id: 1, dungeon_id: 1, slot_id: 1 });
  const powers = hero.Powers;
  for (let p = 1; p <= len(powers); p++) {
    powers[p - 1].Stage = 1;
    powers[p - 1].lastupdate = os.clock() + bt;
    powers[p - 1].nextupdate = os.clock() + bt + nn(powers[p - 1].Stages[0].updatedelay);
    powers[p - 1].regenSpeed = get_regenSpeed(1, 1);
  }
  defsave.save("Hero", true);
}

function unassign_hero(message: any) {
  const id = message.hero_id;
  if (isnil(id) || isnil(defsave.loaded.Hero.data[id - 1])) return;
  const location = defsave.loaded.Hero.data[id - 1]["location"];


  const powers = defsave.loaded.Hero.data[id - 1].Powers;
  for (let p = 1; p <= len(powers); p++) {
    defsave.loaded.Hero.data[id - 1].Powers[p - 1].regenSpeed = 1;
  }


  if (!isnil(location)) {
    const emptySlot = location.slot_id;
    for (let i = nn(emptySlot); i <= 4; i++) {
      for (let h = 1; h <= len(defsave.loaded.Hero.data); h++) {
        const hero = defsave.loaded.Hero.data[h - 1];
        if (!isnil(hero.location)) {
          if (id !== h
            && location.map_id === hero.location.map_id
            && location.dungeon_id === hero.location.dungeon_id
            && i + 1 === hero.location.slot_id) {
            defsave.loaded.Hero.data[h - 1].location.slot_id = i;
          }
        }
      }
    }
  }

  // t.location = nil: the key keeps its slot in the table, as a Lua dead key does.
  defsave.loaded.Hero.data[id - 1]["location"] = undefined;

  defsave.save("Hero", true);
}

function unlock_hero(data: any, lvl: any, id: any) {
  // The Lua constructor sets Description twice (14 fields): first data.Description,
  // then data.Quote, which wins in Description's first slot.
  const newhero: any = literal({
    id: id,
    Portrait: data.Portrait,
    Description: data.Quote,
    Rarity: data.Rarity,
    Name: data.Name,
    Level: lvl,
    Health: 10 * lvl, Damage: 0,
    Mana: 10 * lvl, Drain: 0,
    isUnlocked: true,
    Status: "Unlocked",
    Powers: data.Powers,
  }, 14);

  for (let p = 1; p <= len(newhero.Powers); p++) {
    newhero.Powers[p - 1].Stage = 1;
  }

  return newhero;
}




function add_location(message: any) {
  if (t(defsave.loaded.Hero.data[message.hero_id - 1].location)) {
    message.map_id = defsave.loaded.Hero.data[message.hero_id - 1].location.map_id;
    message.dungeon_id = defsave.loaded.Hero.data[message.hero_id - 1].location.dungeon_id;

    msg.post(controller, message.msg, message);
  }
}

function send_vfx(message: any) {
  if (t(defsave.loaded.Hero.data[message.hero_id - 1].location)) {
    message.map_id = defsave.loaded.Hero.data[message.hero_id - 1].location.map_id;
    message.dungeon_id = defsave.loaded.Hero.data[message.hero_id - 1].location.dungeon_id;
    message.hero_level = defsave.loaded.Hero.data[message.hero_id - 1].Level;
    if (curLoc.map_id === message.map_id && curLoc.dungeon_id === message.dungeon_id) {
      msg.post(controller, message.msg, message);
    }
  }
}

function add_location_randomlevel(message: any) {
  if (t(defsave.loaded.Hero.data[message.hero_id - 1].location)) {
    message.map_id = defsave.loaded.Hero.data[message.hero_id - 1].location.map_id;
    message.dungeon_id = defsave.loaded.Hero.data[message.hero_id - 1].location.dungeon_id;
    message.hero_level = defsave.loaded.Hero.data[message.hero_id - 1].Level;

    const levels_data = actions.clone(defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels);
    const numlevels = len(levels_data);
    let maxlevel = 1;

    for (let n = 1; n <= numlevels; n++) {
      if (t(levels_data[n - 1].Locked)) {
        maxlevel = n - 1;
        break;
      }
    }
    message.level_id = LM.random(1, maxlevel);
    message.level_id = Math.ceil(message.level_id);

    msg.post(controller, message.msg, message);
  }
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

function mod_regenSpeed(message: any) {
  const mod_amount = message.mod_amount;
  const map_id = message.map_id;
  const dungeon_id = message.dungeon_id;
  const hero_id = message.hero_id;


  for (const [d, dungeon] of pairs<any>(dungeon_regenSpeed)) {
    if (map_id === dungeon.map_id && dungeon_id === dungeon.dungeon_id) {
      dungeon_regenSpeed[(d as number) - 1].regenSpeed = Math.max(1, dungeon_regenSpeed[(d as number) - 1].regenSpeed * nn(mod_amount));
    }
  }


  for (let h = 1; h <= len(defsave.loaded.Hero.data); h++) {
    const hero = defsave.loaded.Hero.data[h - 1];
    if (t(hero.location)) {
      if (h !== hero_id && hero.location.map_id === map_id && hero.location.dungeon_id === dungeon_id) {
        for (let p = 1; p <= len(hero.Powers); p++) {
          const power = hero.Powers[p - 1];

          defsave.loaded.Hero.data[h - 1].Powers[p - 1].regenSpeed = Math.max(1, nn(defsave.loaded.Hero.data[h - 1].Powers[p - 1].regenSpeed) * nn(mod_amount));
          defsave.loaded.Hero.data[h - 1].Powers[p - 1].nextupdate = ((nn(power.nextupdate) - os.clock() + nn(defsave.get("Currency", "BonusTime"))) / nn(mod_amount)) + os.clock() + nn(defsave.get("Currency", "BonusTime"));

          for (const [u, update] of pairs<any>(update_list)) {
            if (update.hero_id === h && update.power_id === p) {
              update_list[(u as number) - 1].nextupdate = defsave.loaded.Hero.data[h - 1].Powers[p - 1].nextupdate;
              break;
            }
          }
        }
      }
    }
  }

  if (len(update_list) > 1) {
    update_list = sort_table(update_list, "nextupdate");
  }

  if (t(defsave.loaded.Hero.data[hero_id - 1].location)) {
    if (curLoc.map_id === defsave.loaded.Hero.data[hero_id - 1].location.map_id && curLoc.dungeon_id === defsave.loaded.Hero.data[hero_id - 1].location.dungeon_id) {
      msg.post("main:/menu#dungeonmine", "refresh_herodata");
    }
  }
  defsave.save("Hero", true);
}

// Sir Aldous, the Legendary patron: every other hero's power counts as this
// many levels higher.
function old_master_bonus() {
  return Math.floor(actions.patron_value("HERO_SIRALDOUSBRIGHTWATER_NAME", 1, 5, 0) + 0.5);
}

// A power Lady Vesper can repeat. The Cleric's blessing flips a speed boost on
// and off, so a repeat of one half would leave it stuck; the turret fires every
// second and would always be the last power; and an echo never echoes itself.
const NOT_echoable: any = literal({ mod_regenspeed_dungeon: true, hero_turret: true, hero_echo: true });
function echoable(message: any) {
  return !isnil(message) && !isnil(message.msg) && !t(NOT_echoable[message.msg]);
}

function echo_power(message: any) {
  const key = cat(message.map_id, "-", message.dungeon_id);
  const last = actions.herostate.lastpower[key];
  if (!t(last) || last.hero_id === message.hero_id) return;
  const vesper = defsave.loaded.Hero.data[message.hero_id - 1];
  const scale = actions.hero_scale(nn(vesper.Level) + old_master_bonus(), message.at1, message.at13);
  msg.post("main:/menu#dungeonmine", "hero_fx", literal({ kind: "echo", hero_id: message.hero_id, source: last.hero_id, map_id: message.map_id, dungeon_id: message.dungeon_id }));
  for (let i = 1; i <= len(last.actions); i++) {
    const action = last.actions[i - 1];
    const repeat_message = actions.clone(action.message);
    repeat_message.hero_id = message.hero_id;
    repeat_message.echo_scale = scale;
    if (t(repeat_message.amount)) repeat_message.amount = nn(repeat_message.amount) * scale;
    if (t(repeat_message.packs)) repeat_message.packs = Math.max(1, Math.floor(nn(repeat_message.packs) * scale + 0.5));
    msg.post(controller, action.action, repeat_message);
  }
}

// hero_id is the Hero.data index. It used to be read off hero_data.id, which
// only heroes unlocked through unlock_hero ever had, so a hero unlocked from
// the JSON dispatched its power actions with a nil hero_id and threw.
function update_heropower(hero_data: any, power_id: any, timediff: any, hero_id: any) {
  const power = hero_data.Powers[power_id - 1];


  const action_list: any = {};
  let count = 0;

  if (isnil(power.nextupdate)) power.nextupdate = os.clock() + nn(defsave.get("Currency", "BonusTime"));



  while (power.nextupdate < os.clock() + nn(defsave.get("Currency", "BonusTime"))) {

    if (t(power.Stages[power.Stage - 1].actions)) {
      if (isnil(action_list[power.Stage])) action_list[power.Stage] = {};
      for (const [a, action] of pairs<any>(power.Stages[power.Stage - 1].actions)) {
        action_list[power.Stage][a as any] = literal({ action: action.action, message: action.message });
      }
    }

    if (power.Stage + 1 > len(power.Stages)) {
      power.Stage = 1;
      count = count + (nn(hero_data.Powers[power_id - 1].Level) * (nn(hero_data.Level) + old_master_bonus()));
    } else {
      power.Stage = power.Stage + 1;
    }



    let updateDelay = nn(power.Stages[power.Stage - 1].updatedelay) / nn(power.regenSpeed);
    updateDelay = Math.max(0, updateDelay);

    power.nextupdate = power.nextupdate + updateDelay;

  }

  print(cat("HEROCONTROLLER: Update ", hero_data.Name, " count ", count));

  const fired: any[] = [];
  for (const [s, stage] of pairs<any>(action_list)) {
    for (const [a, action] of pairs<any>(stage)) {
      if (t(action)) {
        action.message.hero_id = hero_id;
        action.message.count = count;
        msg.post(controller, action.action, action.message);
        if (echoable(action.message)) T.insert(fired, actions.clone(action));
      }
      void a;
    }
    void s;
  }
  // Lady Vesper repeats whatever power last fired in her dungeon.
  if (len(fired) > 0 && t(hero_data.location) && t(hero_data.location.map_id)) {
    tset(actions.herostate.lastpower, cat(hero_data.location.map_id, "-", hero_data.location.dungeon_id), literal({ hero_id: hero_id, actions: fired }));
  }

  power.lastupdate = os.clock() + nn(defsave.get("Currency", "BonusTime"));

  return power;
}


function set_updatelist() {
  update_list = [];
  for (let h = 1; h <= len(defsave.loaded.Hero.data); h++) {
    const hero = defsave.loaded.Hero.data[h - 1];
    if (t(hero.location) && actions.dungeon_has_open_level(hero.location.map_id, hero.location.dungeon_id)) {
      for (let p = 1; p <= len(hero.Powers); p++) {
        const power = hero.Powers[p - 1];
        if (isnil(power.lastupdate)) {
          defsave.loaded.Hero.data[h - 1].Powers[p - 1] = update_heropower(defsave.loaded.Hero.data[h - 1], p, 0, h);
        }
        T.insert(update_list, literal({ hero_id: h, power_id: p, nextupdate: defsave.loaded.Hero.data[h - 1].Powers[p - 1].nextupdate }));
      }
    }
  }
  if (len(update_list) > 1) {
    update_list = sort_table(update_list, "nextupdate");
  }
}

function return_cost(level: any) {
  const levelcost = [0, 50, 100, 200, 300, 400, 1000, 2000, 4000, 8000, 20000, 50000, 100000];
  if (level === 0) return 0; else return levelcost[level + 1 - 1];
}

function set_progress(count: any, level: any) {
  count = t(count) ? count : 0;
  level = t(level) ? level : 0;
  const levels = [1, 2, 5, 10, 20, 50, 100, 200, 400, 800, 1000, 2000, 5000];
  const prevCost = levels[level - 1] ?? 0;
  const progress = (nn(count) - prevCost) / nn(levels[level + 1 - 1]);
  return progress;
}

function set_copyText(count: any, level: any) {
  count = t(count) ? count : 0;
  level = Math.max(1, nn(level));
  const levels = [1, 2, 5, 10, 20, 50, 100, 200, 400, 800, 1000, 2000, 5000];
  const prevCost = levels[level - 1 - 1] ?? 0;
  const text = cat(nn(count) - prevCost, "/", levels[level + 1 - 1]);
  return text;
}

/** t[k] = v where v may be nil. A nil store still makes the key's node in Lua
 *  (luaH_set), which tset records on tables that track their layout. */
function nset(tbl: any, k: string, v: any) { if (isnil(v)) tset(tbl, k, undefined); else tbl[k] = v; }

function ingest_hero(hero: any, id: any) {
  const default_hero = saveload.load_from_JSON("/data/Heroes.json")[id - 1];
  hero.Rank = default_hero.Rank;
  hero.Name = default_hero.Name;
  nset(hero, "Rarity", default_hero.Rarity);
  nset(hero, "Kind", default_hero.Kind);
  nset(hero, "Bonus", default_hero.Bonus);
  nset(hero, "Portrait", default_hero.Portrait);
  if (isnil(hero.Level)) { hero.Level = 0; }
  if (isnil(hero.Cards)) { hero.Cards = 1; }
  if (isnil(hero.Cost)) { hero.Cost = return_cost(hero.Level); }
  if (isnil(hero.Progress)) { hero.Progress = 0; }
  if (isnil(hero.copyText)) { hero.copyText = set_copyText(hero.Cards, hero.Level); }
  if (isnil(hero.Mana)) { hero.Mana = 10 * nn(hero.Level); }
  if (isnil(hero.Drain)) { hero.Drain = 0; }
  // PARITY: Powers is a sequence; this adds a hash key `Stage` to it (a mixed table). The lua runtime's pairs over a JS array skips it, so clones/saves that walk Powers with pairs drop it where Lua keeps it.
  if (!t(hero.Powers.Stage)) { hero.Powers.Stage = 1; }
  if (isnil(hero.isUnlocked)) {
    hero.isUnlocked = false;
    if (hero.Status === "Unlocked") hero.isUnlocked = true;
  }
  for (let p = 1; p <= len(hero.Powers); p++) {
    if (!t(hero.Powers[p - 1].Level)) hero.Powers[p - 1].Level = 1;
    if (!t(hero.Powers[p - 1].Cards)) hero.Powers[p - 1].Cards = 1;
    hero.Powers[p - 1].Stages = default_hero.Powers[p - 1].Stages;
  }
  return hero;
}

function ingest_heroes(data: any) {
  for (let h = 1; h <= len(data); h++) {
    const hero = data[h - 1];
    data[h - 1] = ingest_hero(hero, h);
  }
  return data;
}

function on_start(message: any) {
  print("HEROCONTROLLER: Loading Hero JSON");
  defsave.default_data.Hero = ingest_heroes(saveload.load_from_JSON("/data/Heroes.json"));
  defsave.load("Hero");
  // Heroes added to the game after this save was made join it locked, in
  // the same order as Heroes.json, since a hero's index is its id.
  for (let h = len(defsave.loaded.Hero.data) + 1; h <= len(defsave.default_data.Hero); h++) {
    defsave.loaded.Hero.data[h - 1] = actions.clone(defsave.default_data.Hero[h - 1]);
  }
  defsave.loaded.Hero.data = ingest_heroes(defsave.loaded.Hero.data);
  defsave.save("Hero", true);

  chapter0.lock_hero();
  msg.post(controller, "refreshHero");
  if (actions.tablelength(defsave.loaded.Hero.data) > 0) msg.post(controller, "boot_hero");

  print("HEROCONTROLLER: Hero loaded");
  set_updatelist();
}


function update(_message?: any) {
  if (!pause) {

    if (len(update_list) === 0) {
      set_updatelist();
    }

    if (len(update_list) > 0) {
      if (os.clock() + nn(defsave.get("Currency", "BonusTime")) >= update_list[0].nextupdate) {

        const hero_id = update_list[0].hero_id;
        const power_id = update_list[0].power_id;
        const hero = defsave.loaded.Hero.data[hero_id - 1];
        if (!t(hero.location) || !actions.dungeon_has_open_level(hero.location.map_id, hero.location.dungeon_id)) {
          set_updatelist();
          return;
        }
        const timediff = os.clock() + nn(defsave.get("Currency", "BonusTime")) - nn(update_list[0].nextupdate);
        defsave.loaded.Hero.data[hero_id - 1].Powers[power_id - 1] = update_heropower(defsave.loaded.Hero.data[hero_id - 1], power_id, timediff, hero_id);
        if (t(defsave.loaded.Hero.data[hero_id - 1].location)) {
          if (curLoc.map_id === defsave.loaded.Hero.data[hero_id - 1].location.map_id && curLoc.dungeon_id === defsave.loaded.Hero.data[hero_id - 1].location.dungeon_id) {
            msg.post("main:/menu#dungeonmine", "refresh_herodata");
          }
          if (curLoc.map_id === defsave.loaded.Hero.data[hero_id - 1].location.map_id && curLoc.dungeon_id === defsave.loaded.Hero.data[hero_id - 1].location.dungeon_id) {
            msg.post("main:/menu#dungeonmine", "trigger_heropower", { hero_id: hero_id });
          }
        }
        update_list[0].nextupdate = defsave.loaded.Hero.data[hero_id - 1].Powers[power_id - 1].nextupdate;
        update_list = sort_table(update_list, "nextupdate");
        defsave.save("Hero", true);
      }
    }
  }
}

const messageData: any = {};

messageData["all"] = literal({
  ["on_start"]: function (message_id: any, message: any, sender: any) {
    on_start(message);
  },
  ["start_game"]: function (message_id: any, message: any, sender: any) {
    if (!actions.can_unassign_hero()) {
      assign_starter_hero();
      set_updatelist();
    }
  },
  ["update"]: function (message_id: any, message: any, sender: any) {
    update(message);
  },
  ["pause"]: function (message_id: any, message: any, sender: any) {
    pause = true;
    pauseTimer = os.clock();
  },
  ["unpause"]: function (message_id: any, message: any, sender: any) {
    const pauseTime = os.clock() - pauseTimer;
    for (let h = 1; h <= len(defsave.loaded.Hero.data); h++) {
      let hero = defsave.loaded.Hero.data[h - 1];
      hero = defsave.get("Hero", h);
      if (!t(hero.Locked)) {
        for (let p = 1; p <= len(hero.Powers); p++) {
          if (t(hero.Powers[p - 1].lastupdate)) { hero.Powers[p - 1].lastupdate = nn(hero.Powers[p - 1].lastupdate) + pauseTime; }
          if (t(hero.Powers[p - 1].nextupdate)) { hero.Powers[p - 1].nextupdate = nn(hero.Powers[p - 1].nextupdate) + pauseTime; }
        }
      }
      defsave.set("Hero", h, hero);
    }
    set_updatelist();
    pause = false;
  },
  ["reset_statistics"]: function (message_id: any, message: any, sender: any) {
    defsave.reset_to_default("Hero");
    chapter0.lock_hero();
    dungeon_regenSpeed = [
      literal({ map_id: 1, dungeon_id: 1, regenSpeed: 1 }),
      literal({ map_id: 1, dungeon_id: 2, regenSpeed: 1 }),
      literal({ map_id: 1, dungeon_id: 3, regenSpeed: 1 }),
      literal({ map_id: 1, dungeon_id: 4, regenSpeed: 1 }),
      literal({ map_id: 1, dungeon_id: 5, regenSpeed: 1 }),
      literal({ map_id: 2, dungeon_id: 1, regenSpeed: 1 }),
      literal({ map_id: 2, dungeon_id: 2, regenSpeed: 1 }),
      literal({ map_id: 2, dungeon_id: 3, regenSpeed: 1 }),
    ];
    assign_starter_hero(0);
    defsave.save("Hero", true);
    set_updatelist();
  },
  ["update_currentlocation"]: function (message_id: any, message: any, sender: any) {
    curLoc = literal({ map_id: message.map_id, dungeon_id: message.dungeon_id });
  },
  ["unlock_hero"]: function (message_id: any, message: any, sender: any) {
    const hero_list: any[] = [];
    let h = 1;
    if (t(message.hero_id)) {
      // A specific hero, e.g. an event reward, rather than the next in line.
      h = message.hero_id;
      if (!t(defsave.loaded.Hero.data[h - 1].Locked)) return;
    } else {
      while (!t(defsave.loaded.Hero.data[h - 1].Locked)) {
        h = h + 1;
      }
    }
    defsave.loaded.Hero.data[h - 1] = unlock_hero(defsave.loaded.Hero.data[h - 1], 1, h);
    defsave.loaded.Hero.data[h - 1].Cost = return_cost(defsave.loaded.Hero.data[h - 1].Level);
    defsave.loaded.Hero.data[h - 1].Progress = set_progress(defsave.loaded.Hero.data[h - 1].Cards, defsave.loaded.Hero.data[h - 1].Level);
    defsave.loaded.Hero.data[h - 1].copyText = set_copyText(defsave.loaded.Hero.data[h - 1].Cards, defsave.loaded.Hero.data[h - 1].Level);
    defsave.loaded.Hero.data[h - 1].Locked = false;
    defsave.save("Hero", true);
    T.insert(hero_list, h);
    audio.playFanfare("hero_unlock");
    msg.post(controller, "show_cardsunlock", { hero_list: hero_list });
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["mod_herobuff"]: function (message_id: any, message: any, sender: any) {
    const id = message.hero_id;
    defsave.loaded.Hero.data = actions.modify_field(defsave.loaded.Hero.data, id, cat(attributeMap[message.virtue], "_Buff"), message.amount);
    // set_heroPower is a global nobody defines: the call raises, as in Lua.
    defsave.loaded.Hero.data[id - 1] = G.set_heroPower(defsave.loaded.Hero.data[id - 1]);
    defsave.save("Hero", true);
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["mod_hero"]: function (message_id: any, message: any, sender: any) {
    const id = message.hero_id;
    defsave.loaded.Hero.data = actions.modify_field(defsave.loaded.Hero.data, id, message.field, message.amount);
    defsave.save("Hero", true);
    msg.post("main:/menu#hero", "refresh_all");
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["add_herocards"]: function (message_id: any, message: any, sender: any) {
    const hero = defsave.get("Hero", message.hero_id);

    if (hero.Active === false) {
      msg.post(controller, "activate_hero", message);
    }

    // `a + b or b`: the sum is never nil, so the `or` never applies.
    hero.Cards = nn(hero.Cards) + nn(message.amount);
    if (hero.Cards >= 1 && hero.Level === 0) {
      hero.Level = 1;
    }
    hero.Cost = return_cost(hero.Level);
    hero.Progress = set_progress(hero.Cards, hero.Level);
    hero.copyText = set_copyText(hero.Cards, hero.Level);
    defsave.set("Hero", message.hero_id, hero);
    set_updatelist();
    defsave.save("Hero");
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["levelup_hero"]: function (message_id: any, message: any, sender: any) {
    if (defsave.loaded.Hero.data[message.hero_id - 1].Progress >= 1) {
      // `id` is not local here: it writes the global.
      G.id = message.hero_id;
      msg.post(controller, "mod_xp", { amount: -nn(defsave.loaded.Hero.data[G.id - 1].Cost) });
      defsave.loaded.Hero.data[G.id - 1].Level = defsave.loaded.Hero.data[G.id - 1].Level + 1;
      defsave.loaded.Hero.data[G.id - 1].Cost = return_cost(defsave.loaded.Hero.data[G.id - 1].Level);
      defsave.loaded.Hero.data[G.id - 1].Progress = set_progress(defsave.loaded.Hero.data[G.id - 1].Cards, defsave.loaded.Hero.data[G.id - 1].Level);
      defsave.loaded.Hero.data[G.id - 1].copyText = set_copyText(defsave.loaded.Hero.data[G.id - 1].Cards, defsave.loaded.Hero.data[G.id - 1].Level);
      defsave.save("Hero", true);
      set_updatelist();
      if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
    }
  },
  ["assign_hero"]: function (message_id: any, message: any, sender: any) {
    assign_hero(message);
    set_updatelist();
  },
  ["unassign_hero"]: function (message_id: any, message: any, sender: any) {
    if (!actions.can_unassign_hero()) return;
    unassign_hero(message);
    set_updatelist();
    msg.post(controller, "clear_heroquest", { hero_id: message.hero_id });
  },
  ["complete_rank"]: function (message_id: any, message: any, sender: any) {
    // Every main-story hero leaves its slot when a chapter closes, portal or
    // not; heroes working an event map stay where they are. While only the
    // starter hero is unlocked, keep it in its slot.
    if (actions.can_unassign_hero()) {
      for (let h = 1; h <= len(defsave.loaded.Hero.data); h++) {
        const hero = defsave.loaded.Hero.data[h - 1];
        if (!isnil(hero.location) && !t(actions.event_on_map(hero.location.map_id))) {
          unassign_hero(literal({ hero_id: h }));
          msg.post(controller, "clear_heroquest", { hero_id: h });
        }
      }
    }
    set_updatelist();
    // Event maps keep their regen boosts along with their heroes.
    if (!t(message.portal)) {
      for (let i = 1; i <= len(dungeon_regenSpeed); i++) {
        const dungeon = dungeon_regenSpeed[i - 1];
        if (!t(actions.event_on_map(dungeon.map_id))) dungeon.regenSpeed = 1;
      }
    }
  },
  ["explore_level"]: function (message_id: any, message: any, sender: any) {
    // Start power cooldowns for heroes stationed here once an area is opened.
    const now = os.clock() + nn(defsave.get("Currency", "BonusTime"));
    let started = false;
    for (let h = 1; h <= len(defsave.loaded.Hero.data); h++) {
      const hero = defsave.loaded.Hero.data[h - 1];
      if (t(hero.location) && hero.location.map_id === message.map_id && hero.location.dungeon_id === message.dungeon_id) {
        const already_active = update_list.some((u: any) => u.hero_id === h);
        if (!already_active) {
          for (let p = 1; p <= len(hero.Powers); p++) {
            const power = hero.Powers[p - 1];
            power.Stage = 1;
            power.regenSpeed = get_regenSpeed(message.map_id, message.dungeon_id);
            power.lastupdate = now;
            power.nextupdate = now + nn(power.Stages[0].updatedelay) / nn(power.regenSpeed);
          }
          started = true;
        }
      }
    }
    if (started) {
      defsave.save("Hero", true);
      set_updatelist();
      if (curLoc.map_id === message.map_id && curLoc.dungeon_id === message.dungeon_id) {
        msg.post("main:/menu#dungeonmine", "refresh_herodata");
      }
    }
  },
  ["event_reset"]: function (message_id: any, message: any, sender: any) {
    set_updatelist();
  },
  ["set_hero"]: function (message_id: any, message: any, sender: any) {
    const id = message.hero_id;
    defsave.loaded.Hero.data = actions.set_field(defsave.loaded.Hero.data, id, message.field, message.amount);
    defsave.save("Hero", true);
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },



  ["add_location"]: function (message_id: any, message: any, sender: any) { add_location(message); },
  ["hero_echo"]: function (message_id: any, message: any, sender: any) { echo_power(message); },
  ["send_vfx"]: function (message_id: any, message: any, sender: any) { send_vfx(message); },
  ["add_location_randomlevel"]: function (message_id: any, message: any, sender: any) { add_location_randomlevel(message); },
  ["mod_regenspeed_dungeon"]: function (message_id: any, message: any, sender: any) { mod_regenSpeed(message); },

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

void inspect; void random; void progress; void productName; void baseHealingTime;
void hero_portrait; void update_herotimer;

// Module locals the parity harness dumps (tools/port/parity/README.md, State dump format).
M.__parity_locals = () => ({ NOT_echoable, attributeMap, curLoc, dungeon_regenSpeed, pause, pauseTimer, update_list });

export default M;
