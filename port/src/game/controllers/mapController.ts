// controllers/mapController.lua
import inspect_ from '../inspect';
import actions_ from '../actions';
import random_ from '../random/random';
import progress_ from '../progress/progress';
import saveload_ from '../saveload/saveload';
import defsave_ from '../defsave/defsave';
import chapter0 from '../chapter0/chapter0';
import { msg, hash, print } from '../../engine';
import { pairs, literal, cat, len, t, tonumber, T, os, tset } from '../../lua';
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

const M: any = {};
let curLoc: any = literal({ map_id: 0, dungeon_id: 0 });

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

function loadResources() {
  print("MAPCONTROLLER: Loading Map JSON");
  const resources = saveload.load_from_JSON("/data/Resources.json");
  const data: any = {};
  for (let r = 1; r <= len(resources); r++) {
    const resource = resources[r - 1];
    data[resource.id] = resource;
  }
  return data;
}

function tablelength(T: any) {
  let count = 0;
  for (const _ of pairs(T)) { count = count + 1; void _; }
  return count;
}

function refresh_mapdata(map_id: any, dungeon_id: any) {
  if (curLoc.map_id === map_id && curLoc.dungeon_id === dungeon_id) {
    msg.post("main:/menu#dungeonmine", "refresh_mapdata");
  }
}

function get_isHidden(map_id: any, dungeon_id: any, level_id: any) {
  let flag: any = false;
  if (level_id > 0) {
    flag = defsave.loaded.Map.data[map_id - 1][dungeon_id - 1].Levels[level_id - 1].isHidden;
  }
  return t(flag) ? flag : false;
}

/* An enemy row opens like a level: once its prereq is held it can be
tapped open, and only the next row to open is shown, with what it needs.
An open row is the front ("Active"), waiting its turn, or gone once its
count is down to nothing. */
function enemy_levelState(map_id: any, dungeon_id: any, level_id: any, level: any, reset: any) {
  const enemy = defsave.get("Henchmen", level.henchmen_id);
  const map = t(defsave.loaded.Map) ? defsave.loaded.Map.data[map_id - 1] : defsave.loaded.Map;
  const above = level_id > 1 && t(map) && t(map[dungeon_id - 1]) ? map[dungeon_id - 1].Levels[level_id - 1 - 1] : undefined;
  const next_up = level_id === 1 || (t(above) && t(above.wasClickedOpen));
  if (defsave.get("Resources", level.Prereq.unit).Count >= level.Prereq.amount) {
    level.isHidden = false;
    level.isLocked = false;
    if (level_id === 1) msg.post(controller, "unlock_level", literal({ map_id: map_id, dungeon_id: dungeon_id }));
  } else if (t(reset)) {
    level.isHidden = true;
    level.isLocked = true;
    level.wasClickedOpen = false;
  }

  if (t(level.wasClickedOpen)) {
    if (nn(t(enemy.Size) ? enemy.Size : 0) <= 0) {
      level.State = "Invisible";
    } else if (t(enemy.Active)) {
      level.State = "Active";
    } else {
      level.State = "Waiting";
    }
  } else if (!next_up) {
    level.State = "Invisible";
  } else if (t(level.isHidden)) {
    level.State = "Locked";
  } else {
    level.State = "Explorable";
  }
  return level;
}

function set_levelState(map_id: any, dungeon_id: any, level_id: any, level: any, reset: any) {

  assert(level.henchmen_id, "level does not have henchmen_id set");
  if (actions.enemy_map(map_id)) return enemy_levelState(map_id, dungeon_id, level_id, level, reset);
  const henchmen = defsave.get("Henchmen", level.henchmen_id);

  if (defsave.get("Resources", level.Prereq.unit).Count >= level.Prereq.amount) {
    level.isHidden = false;
    level.isLocked = false;
    msg.post(controller, "unlock_level", literal({ map_id: map_id, dungeon_id: dungeon_id }));
  } else if (t(reset)) {
    level.isHidden = true;
    level.isLocked = true;
    level.wasClickedOpen = false;
  }

  if (t(level.isHidden) && t(get_isHidden(map_id, dungeon_id, level_id - 1))) {
    level.State = "Invisible";
  } else if (t(level.isHidden)) {
    level.State = "Locked";
  } else if (t(level.isLocked)) {
    level.State = "Disabled";
  } else if (t(level.wasClickedOpen) && (t(henchmen.Active) || t(henchmen.contDamage))) {
    level.State = "Active";
  } else if (t(level.wasClickedOpen)) {
    level.State = "Inactive";
  } else {
    level.State = "Explorable";
  }

  return level;
}


function ingestLevels_Live(data: any) {
  for (let m = 1; m <= len(data); m++) {
    const map = data[m - 1];
    for (let d = 1; d <= len(map); d++) {
      const dungeon = map[d - 1];
      data[m - 1][d - 1].Icon = defsave.default_data.Map[m - 1][d - 1].Icon;
      for (let l = 1; l <= len(dungeon.Levels); l++) {
        data[m - 1][d - 1].Levels[l - 1].Prereq = defsave.default_data.Map[m - 1][d - 1].Levels[l - 1].Prereq;
      }
    }
  }
  return data;
}


function set_levelStates(data: any, reset: any) {
  for (let m = 1; m <= len(data); m++) {
    const map = data[m - 1];
    for (let d = 1; d <= len(map); d++) {
      const dungeon = map[d - 1];
      for (let l = 1; l <= len(dungeon.Levels); l++) {
        data[m - 1][d - 1].Levels[l - 1] = set_levelState(m, d, l, data[m - 1][d - 1].Levels[l - 1], reset);
      }
    }
  }
  return data;
}

function assign_henchmen_to_levels(data: any) {

  assert(defsave.loaded.Henchmen.data, "Henchmen data not loaded");
  // By place in the list: a saved henchman's own id can be from a list
  // that has since had event rows added before it.
  for (let h = 1; h <= len(defsave.loaded.Henchmen.data); h++) {
    const henchmen = defsave.loaded.Henchmen.data[h - 1];
    data[henchmen.map_id - 1][henchmen.dungeon_id - 1].Levels[henchmen.level_id - 1].henchmen_id = h;
  }
  return data;
}

const DEFAULT_BUYSTATE = 6; // "1" in Stats.buyStates

function ingestLevels(data: any) {
  const items = loadResources();
  for (let m = 1; m <= len(data); m++) {
    const map = data[m - 1];
    for (let d = 1; d <= len(map); d++) {
      const dungeon = map[d - 1];

      for (let l = 1; l <= len(dungeon.Levels); l++) {
        const level = dungeon.Levels[l - 1];


        data[m - 1][d - 1].Levels[l - 1].isLocked = true;
        data[m - 1][d - 1].Levels[l - 1].isHidden = true;
        data[m - 1][d - 1].Levels[l - 1].buyState = DEFAULT_BUYSTATE;


        const resources = defsave.loaded.Resources.data;
        if (tablelength(resources) > 0) {
          for (let r = 1; r <= len(level.Loot_Table); r++) {
            const row = level.Loot_Table[r - 1];
            assert(items[row.Option.Stat], cat(row.Option.Stat, " doesn't exist in list of items."));
            data[m - 1][d - 1].Levels[l - 1].Loot_Table[r - 1].Option.Icon = items[row.Option.Stat].Icon;
          }
        }

      }
    }
  }

  data = assign_henchmen_to_levels(data);

  return data;
}

function on_start(message: any) {
  print("MAPCONTROLLER: Loading Map JSON");
  defsave.default_data.Map = saveload.load_from_JSON("/data/Map.json");
  defsave.load("Map");
  msg.post(controller, "refreshMap");
  if (actions.tablelength(defsave.loaded.Map.data) > 0) msg.post(controller, "boot_map");
  print("MAPCONTROLLER: Map Loaded");
}

function get_levelCrit(map_id: any, dungeon_id: any, level_id: any, type: any) {
  const gear_data = actions.clone(defsave.loaded.Gear.data);
  let total = 1;
  for (let g = 1; g <= len(gear_data); g++) {
    const gear = gear_data[g - 1];
    if (gear.Status === "Unlocked" && gear.Modifier.Type === type && gear.map_id === map_id && gear.dungeon_id === dungeon_id && gear.level_id === level_id) {
      total = Math.pow(nn(gear.Modifier.Factor), nn(gear.Level));
      break;
    }
  }
  return total;
}

/* Enemy events (gdd/enemy-events.md). A location is a column of enemy rows;
the row's henchman slot holds the enemy, and its Size is how many are left.
The crew fights the front row, the first one with enemies left: its tick lands
Damage there the way a henchman's does, and every Health's worth of it is a
kill. Damage left after the last kill of a row carries into the next row, and
when the whole column is down the next wave comes in, tougher and richer. */

function enemy_of(level: any) {
  return defsave.loaded.Henchmen.data[level.henchmen_id - 1];
}

// Rows with enemies left in a location, front first.
function front_row(dungeon: any) {
  for (let l = 1; l <= len(dungeon.Levels); l++) {
    const level = dungeon.Levels[l - 1];
    if (t(level.wasClickedOpen) && nn(t(enemy_of(level).Size) ? enemy_of(level).Size : 0) > 0) return l;
  }
  return undefined;
}

// The front row's enemy is the one the crew's tick works; every other row
// waits. The tick starts from now, so a new front row starts at full health.
function set_front(map_id: any, dungeon_id: any) {
  const dungeon = defsave.loaded.Map.data[map_id - 1][dungeon_id - 1];
  const front = front_row(dungeon);
  const now = os.clock() + nn(defsave.get("Currency", "BonusTime"));
  for (let l = 1; l <= len(dungeon.Levels); l++) {
    const level = dungeon.Levels[l - 1];
    const enemy = enemy_of(level);
    // Lua `level.wasClickedOpen and l == front`: nil while the row was never
    // opened, which clears Active rather than writing false.
    const active = t(level.wasClickedOpen) ? l === front : level.wasClickedOpen;
    if (t(active) && !t(enemy.Active)) {
      enemy.lastupdated = now;
      tset(enemy, "nextupdate", undefined);
    }
    tset(enemy, "Active", active);
    level.State = undefined;
  }
  defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false);
  msg.post(controller, "update_allenemies", literal({ map_id: map_id }));
}

function new_wave(map_id: any, dungeon_id: any) {
  const dungeon = defsave.loaded.Map.data[map_id - 1][dungeon_id - 1];
  dungeon.Wave = nn(t(dungeon.Wave) ? dungeon.Wave : 1) + 1;
  const growth = Math.pow(actions.ENEMY_WAVE_GROWTH, dungeon.Wave - 1);
  for (let l = 1; l <= len(dungeon.Levels); l++) {
    const level = dungeon.Levels[l - 1];
    const enemy = enemy_of(level);
    enemy.Size = enemy.EnemyCount;
    level.BaseHealth = t(level.BaseHealth) ? level.BaseHealth : level.Health;
    level.Health = Math.ceil(nn(level.BaseHealth) * growth);
    level.Damage = 0;
  }
  msg.post("main:/menu#dungeonmine", "enemy_fx", literal({ kind: "wave", map_id: map_id, dungeon_id: dungeon_id, wave: dungeon.Wave }));
}

// Settles the Damage on an enemy row: kills, their loot, and what is left
// over passed down the column.
function enemy_kills(map_id: any, dungeon_id: any, level_id: any) {
  const dungeon = defsave.loaded.Map.data[map_id - 1][dungeon_id - 1];
  const level = dungeon.Levels[level_id - 1];
  const enemy = enemy_of(level);
  level.Damage = t(level.Damage) ? level.Damage : 0;
  if (level.Damage < level.Health && nn(t(enemy.Size) ? enemy.Size : 0) > 0) return;

  const kills = Math.min(nn(t(enemy.Size) ? enemy.Size : 0), Math.floor(nn(level.Damage) / nn(level.Health)));
  if (kills > 0) {
    level.Damage = level.Damage - kills * level.Health;
    enemy.Size = enemy.Size - kills;
    const wave = Math.pow(actions.ENEMY_WAVE_GROWTH, (nn(t(dungeon.Wave) ? dungeon.Wave : 1)) - 1);
    msg.post(controller, "gen_enemyloot", literal({
      map_id: map_id, dungeon_id: dungeon_id, level_id: level_id, kills: kills,
      packSize: actions.enemy_gear(map_id, dungeon_id, "packSize") * wave,
      critChance: actions.enemy_gear(map_id, dungeon_id, "critChance"),
      critBonus: actions.enemy_gear(map_id, dungeon_id, "critBonus"),
    }));
    msg.post(controller, "update_resources", literal({ stat: cat("kill", map_id, "-", dungeon_id, "-", level_id), amount: kills }));
    msg.post("main:/menu#dungeonmine", "enemy_fx", literal({ kind: "kill", map_id: map_id, dungeon_id: dungeon_id, level_id: level_id,
      kills: kills, left: enemy.Size, boss: enemy.Boss }));
  }
  if (enemy.Size > 0) return;

  // The row is clear: what is left goes on down the column. When every
  // open row is clear, they all come back as the next wave.
  const leftover = level.Damage;
  level.Damage = 0;
  let next_row = front_row(dungeon);
  if (!t(next_row)) {
    new_wave(map_id, dungeon_id);
    next_row = front_row(dungeon);
  }
  set_front(map_id, dungeon_id);
  if (leftover > 0) {
    const after = dungeon.Levels[next_row! - 1];
    after.Damage = nn(t(after.Damage) ? after.Damage : 0) + leftover;
    enemy_kills(map_id, dungeon_id, next_row);
  }
}

function complete_dungeonlevel(message: any) {
  if (actions.enemy_map(message.map_id)) {
    enemy_kills(message.map_id, message.dungeon_id, message.level_id);
    return;
  }
  assert(message.map_id, "message.map_id");
  assert(message.dungeon_id, "message.dungeon_id");
  assert(message.level_id, "message.level_id");
  assert(message.henchmen_id, "message.henchmen_id");

  const level_data = defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1];
  const damage = level_data["Damage"];
  const health = level_data["Health"];

  message.packs = t(message.packs) ? message.packs : Math.floor(nn(damage) / nn(health));
  message.damageLimit = t(message.damageLimit) ? message.damageLimit : message.packs;

  if (level_data.Damage >= level_data.Health) {
    assert(message.henchmen_id, "Henchmen ID is missing");

    const previousLevel = defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1 - 1];
    if (t(previousLevel)) {
      const generated = nn(message.packs) * nn(defsave.get("Henchmen", message.henchmen_id).Size);
      msg.post(controller, "mod_henchmen", literal({ henchmen_id: previousLevel.henchmen_id, amount: generated }));
      if (generated > 0) {
        const steady = t(level_data.contDamage) || t(defsave.loaded.Henchmen.data[message.henchmen_id - 1].contDamage);
        msg.post("main:/menu#dungeonmine", "henchmen_generated", literal({
          map_id: message.map_id,
          dungeon_id: message.dungeon_id,
          from_level: message.level_id,
          to_level: message.level_id - 1,
          from_henchmen_id: message.henchmen_id,
          to_henchmen_id: previousLevel.henchmen_id,
          amount: generated,
          steady: steady,
        }));
      }
    }
    msg.post(controller, "deactivate_henchmen", message);
    const hData = defsave.loaded.Henchmen.data[message.henchmen_id - 1];
    const isManual = !t(hData?.Cards) || hData.Cards === 0;
    audio.playLevelClear(isManual, message.map_id, message.dungeon_id);
    message.packSize = message.level_id;

    if (!t(defsave.loaded.Henchmen.data[message.henchmen_id - 1].contDamage)) {
      defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1]["Damage"] = 0;
    }

    message.critChance = get_levelCrit(message.map_id, message.dungeon_id, message.level_id, "critChance");
    message.critBonus = get_levelCrit(message.map_id, message.dungeon_id, message.level_id, "critBonus");
    message.critLuck = get_levelCrit(message.map_id, message.dungeon_id, message.level_id, "critLuck");
    message.packSize = get_levelCrit(message.map_id, message.dungeon_id, message.level_id, "packSize");
    message.packSize = message.packSize * nn(defsave.loaded.Henchmen.data[message.henchmen_id - 1].Size);
    msg.post(controller, "gen_levelpacks", message);

    if (defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1].contDamage === false) {
      msg.post("main:/menu#dungeonmine", "trigger_level", message);
    }

    msg.post(controller, "reset_dungeonlevel", message);
    defsave.save("Map", true);
  }
}

function play_levelvfx(vfx: any, level_id: any) {
  if (t(vfx)) {
    assert(vfx.type === "level", "wrong vfx type");
    if (isnil(vfx.originalflipbook)) vfx.originalflipbook = vfx.flipbook;
    vfx.flipbook = cat(vfx.originalflipbook, "_", level_id);
    // `message` is an undefined global here.
    msg.post("main:/menu#dungeonmine", "play_vfx", G.message);
  }
}

function damage_mapLevel(map_id: any, dungeon_id: any, level_id: any, amount: any, message: any) {
  const dungeon_data = defsave.loaded.Map.data[map_id - 1][dungeon_id - 1];
  const level_data = dungeon_data.Levels[level_id - 1];
  if (!t(level_data.isLocked) && t(level_data.wasClickedOpen)) {

    if (isnil(level_data["Damage"])) {
      defsave.loaded.Map.data[map_id - 1][dungeon_id - 1].Levels[level_id - 1]["Damage"] = 0;
    }

    defsave.loaded.Map.data[map_id - 1][dungeon_id - 1].Levels = actions.modify_field(dungeon_data.Levels, level_id, "Damage", amount);
    complete_dungeonlevel(message);
    defsave.save("Map", true);
  }
}

/* Field hero powers that hit levels (gdd/heroes-roster.md). Each lands its
damage through hit_level, the same way mod_map does, and tells the dungeon
screen what happened so it can draw it. */

function henchman_on(map_id: any, dungeon_id: any, level_id: any) {
  for (let h = 1; h <= len(defsave.loaded.Henchmen.data); h++) {
    const henchman = defsave.loaded.Henchmen.data[h - 1];
    if (henchman.map_id === map_id && henchman.dungeon_id === dungeon_id && henchman.level_id === level_id) {
      return h;
    }
  }
  return undefined;
}

function open_levels(map_id: any, dungeon_id: any) {
  const open: any[] = [];
  const levels = defsave.loaded.Map.data[map_id - 1][dungeon_id - 1].Levels;
  for (let l = 1; l <= len(levels); l++) {
    const level = levels[l - 1];
    // An enemy row that is already cleared is no longer there to hit.
    if (!t(level.isLocked) && t(level.wasClickedOpen) && level.State !== "Invisible") T.insert(open, l);
  }
  return open;
}

// A hero's blow on an enemy row shows where it lands.
function enemy_hit_fx(map_id: any, dungeon_id: any, level_id: any, amount: any) {
  if (actions.enemy_map(map_id) && amount > 0) {
    msg.post("main:/menu#dungeonmine", "enemy_fx", literal({ kind: "hit", map_id: map_id, dungeon_id: dungeon_id, level_id: level_id, amount: amount }));
  }
}

function hit_level(map_id: any, dungeon_id: any, level_id: any, amount: any, message: any) {
  const level = defsave.loaded.Map.data[map_id - 1][dungeon_id - 1].Levels[level_id - 1];
  if (isnil(level.Damage)) level.Damage = 0;
  amount = amount * actions.hex_multiplier(map_id, dungeon_id);
  level.Damage = level.Damage + amount;
  enemy_hit_fx(map_id, dungeon_id, level_id, amount);
  const hit = actions.clone(message);
  hit.level_id = level_id;
  hit.henchmen_id = henchman_on(map_id, dungeon_id, level_id);
  if (t(hit.henchmen_id)) {
    complete_dungeonlevel(hit);
    msg.post(controller, "update_henchmen", { henchmen_id: hit.henchmen_id });
  }
  return amount;
}

function hero_fx(message: any, kind: any, extra: any) {
  const fx = t(extra) ? extra : {};
  // Lua 5.1 stores a multiple assignment right to left.
  fx.dungeon_id = message.dungeon_id; fx.map_id = message.map_id; fx.hero_id = message.hero_id; fx.kind = kind;
  fx.echo = !isnil(message.echo_scale);
  msg.post("main:/menu#dungeonmine", "hero_fx", fx);
}

const hero_powers: any = literal({
  // Grisla Hexmire: every level here takes more damage, for a while.
  hero_hex: function (message: any) {
    const multiplier = actions.hero_power(message, message.at1, message.at13);
    const key = cat(message.map_id, "-", message.dungeon_id);
    tset(actions.herostate.hex, key, literal({ multiplier: multiplier, ends: os.clock() + nn(message.duration) }));
    for (let h = 1; h <= len(defsave.loaded.Henchmen.data); h++) {
      const henchman = defsave.loaded.Henchmen.data[h - 1];
      if (henchman.map_id === message.map_id && henchman.dungeon_id === message.dungeon_id && t(henchman.Active)) {
        msg.post(controller, "update_henchmen", { henchmen_id: h });
      }
    }
    hero_fx(message, "hex", literal({ multiplier: multiplier, duration: message.duration }));
  },
  // Brakka Ironjaw: the same share of every level's full health.
  hero_breach: function (message: any) {
    const share = actions.hero_power(message, message.at1, message.at13);
    const hits: any[] = [];
    const open = open_levels(message.map_id, message.dungeon_id);
    for (let i = 1; i <= len(open); i++) {
      const l = open[i - 1];
      const level = defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[l - 1];
      hit_level(message.map_id, message.dungeon_id, l, nn(level.Health) * share, message);
      T.insert(hits, l);
    }
    hero_fx(message, "breach", literal({ levels: hits, share: share }));
  },
  // Old Mossback: finishes every level below his threshold.
  hero_pounce: function (message: any) {
    const threshold = Math.min(0.95, actions.hero_power(message, message.at1, message.at13));
    const hits: any[] = [];
    const open = open_levels(message.map_id, message.dungeon_id);
    for (let i = 1; i <= len(open); i++) {
      const l = open[i - 1];
      const level = defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[l - 1];
      const damage = t(level.Damage) ? level.Damage : 0;
      if (!t(level.contDamage) && damage > 0 && (level.Health - damage) / level.Health <= threshold) {
        hit_level(message.map_id, message.dungeon_id, l, level.Health - damage, message);
        T.insert(hits, l);
      }
    }
    hero_fx(message, "pounce", literal({ levels: hits, threshold: threshold }));
  },
  // Fizzwick Cogsworth: steady damage on the deepest open level, every second.
  hero_turret: function (message: any) {
    const open = open_levels(message.map_id, message.dungeon_id);
    const l = open[len(open) - 1];
    if (!t(l)) return;
    const dps = actions.hero_power(message, message.at1, message.at13) * actions.enemy_damage_multiplier(message.map_id);
    const landed = hit_level(message.map_id, message.dungeon_id, l, dps, message);
    hero_fx(message, "turret", literal({ level_id: l, amount: landed }));
  },
  // Thumper: hops down the open levels, doubling at every landing.
  hero_hop: function (message: any) {
    const base = actions.hero_power(message, message.at1, message.at13) * actions.enemy_damage_multiplier(message.map_id);
    const hops: any[] = [];
    const open = open_levels(message.map_id, message.dungeon_id);
    for (let i = 1; i <= len(open); i++) {
      const l = open[i - 1];
      const landed = hit_level(message.map_id, message.dungeon_id, l, base * Math.pow(2, i - 1), message);
      T.insert(hops, literal({ level_id: l, amount: landed }));
    }
    hero_fx(message, "hop", literal({ hops: hops }));
  },
});

/** math.min(a, b) raises on a non-number argument. */
function luamin(a: any, b: any): number {
  if (typeof a !== 'number' || typeof b !== 'number') throw new Error("bad argument to 'min' (number expected)");
  return Math.min(a, b);
}

const messageData: any = {};
messageData["all"] = literal({
  ["hero_hex"]: function (message_id: any, message: any, sender: any) { hero_powers.hero_hex(message); defsave.save("Map", true); },
  ["hero_breach"]: function (message_id: any, message: any, sender: any) { hero_powers.hero_breach(message); defsave.save("Map", true); },
  ["hero_pounce"]: function (message_id: any, message: any, sender: any) { hero_powers.hero_pounce(message); defsave.save("Map", true); },
  ["hero_turret"]: function (message_id: any, message: any, sender: any) { hero_powers.hero_turret(message); defsave.save("Map", true); },

  ["hero_hop"]: function (message_id: any, message: any, sender: any) { hero_powers.hero_hop(message); defsave.save("Map", true); },
  ["on_start"]: function (message_id: any, message: any, sender: any) {
    on_start(message);
  },
  ["start_game"]: function (message_id: any, message: any, sender: any) {
    if (actions.tablelength(defsave.loaded.Henchmen.data) > 0 && actions.tablelength(defsave.loaded.Resources.data) > 0) {

      print("DEBUG: MAP: start_game");
      // Saves made before an event map existed don't have it yet. The
      // default level states below already read the saved map, so it goes
      // in first, and again after the reload.
      // An event map whose locations or levels have changed since the
      // save is replaced too: the event starts its run again with it.
      const same_shape = function (saved: any, deflt: any) {
        if (len(saved) !== len(deflt)) return false;
        for (let d = 1; d <= len(deflt); d++) {
          const dungeon = deflt[d - 1];
          if (len(saved[d - 1].Levels) !== len(dungeon.Levels) || saved[d - 1].Name !== dungeon.Name) return false;
          // An event remade on the same map keeps its location names.
          for (let l = 1; l <= len(dungeon.Levels); l++) {
            const level = dungeon.Levels[l - 1];
            if (saved[d - 1].Levels[l - 1].Name !== level.Name) return false;
          }
        }
        return true;
      };
      const add_missing_maps = function () {
        for (let m = 2; m <= len(defsave.default_data.Map); m++) {
          const saved = defsave.loaded.Map.data[m - 1];
          if (isnil(saved) || !same_shape(saved, defsave.default_data.Map[m - 1])) {
            defsave.loaded.Map.data[m - 1] = actions.clone(defsave.default_data.Map[m - 1]);
          }
        }
      };
      add_missing_maps();
      defsave.default_data.Map = ingestLevels(defsave.default_data.Map);
      defsave.default_data.Map = set_levelStates(defsave.default_data.Map, false);

      defsave.load("Map");
      print("DEBUG: MAP: start_game");
      add_missing_maps();
      defsave.loaded.Map.data = assign_henchmen_to_levels(defsave.loaded.Map.data);
      defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false);
      defsave.loaded.Map.data = ingestLevels_Live(defsave.loaded.Map.data);

      defsave.save("Map", true);
    }
  },
  ["complete_rank"]: function (message_id: any, message: any, sender: any) {
    const unlockingBuystate = message.rank === 2;
    if (!t(message.portal) || unlockingBuystate) {
      const maps = actions.clone(defsave.loaded.Map.data);
      for (let m = 1; m <= len(maps); m++) {
        const map = maps[m - 1];
        if (m !== 1) break;
        for (let d = 1; d <= len(map); d++) {
          const dungeon = map[d - 1];
          for (let l = 1; l <= len(dungeon.Levels); l++) {
            if (!t(message.portal)) {
              defsave.loaded.Map.data[m - 1][d - 1].Levels[l - 1].wasClickedOpen = false;
            }
            if (unlockingBuystate) {
              defsave.loaded.Map.data[m - 1][d - 1].Levels[l - 1].buyState = DEFAULT_BUYSTATE;
            }
          }
        }
      }
      defsave.save("Map", true);
    }
  },
  ["reset_mapdata"]: function (message_id: any, message: any, sender: any) {
    print("DEBUG: MAP: reset_mapdata");
    defsave.default_data.Map = ingestLevels(defsave.default_data.Map);
    defsave.default_data.Map = set_levelStates(defsave.default_data.Map, true);
    defsave.reset_to_default("Map");
    defsave.save("Map", true);
  },
  ["event_reset"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Map.data[message.map_id - 1] = actions.clone(defsave.default_data.Map[message.map_id - 1]);
    // The run's health, set from the event crew's strength (repController).
    const scale = t(message.health_scale) ? message.health_scale : 1;
    const map = defsave.loaded.Map.data[message.map_id - 1];
    for (let d = 1; d <= len(map); d++) {
      const dungeon = map[d - 1];
      dungeon.Wave = 1;
      dungeon.Level = d === 1 ? 1 : 0;
      for (let l = 1; l <= len(dungeon.Levels); l++) {
        const level = dungeon.Levels[l - 1];
        level.Level = (d === 1 && l === 1) ? 1 : 0;
        level.Health = Math.ceil(nn(level.Health) * scale);
        // An enemy wave's health grows from the run's own.
        level.BaseHealth = level.Health;
      }
    }
    defsave.loaded.Map.data = assign_henchmen_to_levels(defsave.loaded.Map.data);
    for (let d = 1; d <= len(map); d++) {
      const dungeon = map[d - 1];
      for (let l = 1; l <= len(dungeon.Levels); l++) {
        dungeon.Levels[l - 1] = set_levelState(message.map_id, d, l, dungeon.Levels[l - 1], true);
      }
    }
    defsave.save("Map", true);
    refresh_mapdata(message.map_id, 1);
  },
  ["event_chapter_reset"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Map.data[message.map_id - 1] = actions.clone(defsave.default_data.Map[message.map_id - 1]);
    const scale = t(message.health_scale) ? message.health_scale : 1;
    const map = defsave.loaded.Map.data[message.map_id - 1];
    for (let d = 1; d <= len(map); d++) {
      const dungeon = map[d - 1];
      dungeon.Wave = 1;
      dungeon.Level = d === 1 ? 1 : 0;
      for (let l = 1; l <= len(dungeon.Levels); l++) {
        const level = dungeon.Levels[l - 1];
        level.Level = (d === 1 && l === 1) ? 1 : 0;
        level.Health = Math.ceil(nn(level.Health) * scale);
        level.BaseHealth = level.Health;
      }
    }
    defsave.loaded.Map.data = assign_henchmen_to_levels(defsave.loaded.Map.data);
    for (let d = 1; d <= len(map); d++) {
      const dungeon = map[d - 1];
      for (let l = 1; l <= len(dungeon.Levels); l++) {
        dungeon.Levels[l - 1] = set_levelState(message.map_id, d, l, dungeon.Levels[l - 1], true);
      }
    }
    defsave.save("Map", true);
    refresh_mapdata(message.map_id, 1);
  },
  ["update_currentlocation"]: function (message_id: any, message: any, sender: any) {
    curLoc = literal({ map_id: message.map_id, dungeon_id: message.dungeon_id });
  },
  ["set_inventory"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level - 1].Loot_Table[message.table - 1].Inventory = message.inventory;
    defsave.save("Map", true);
    msg.post("main:/menu#map", "refresh_all");
  },
  ["mod_maxdungeonlevel"]: function (message_id: any, message: any, sender: any) {
    const dungeon_data = defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1];
    message.count = t(message.count) ? message.count : 1;
    message.level_id = 0;


    const lim = luamin(len(dungeon_data.Levels), tonumber(message.hero_level));
    for (let num = 1; num <= lim; num++) {
      if (!t(dungeon_data.Levels[num - 1].isLocked) && t(dungeon_data.Levels[num - 1].wasClickedOpen)) {
        message.level_id = num;
      }
    }

    const landed = nn(message.amount) * nn(message.count) * actions.hex_multiplier(message.map_id, message.dungeon_id) * actions.enemy_damage_multiplier(message.map_id);
    defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels = actions.modify_field(dungeon_data.Levels, message.level_id, message.field, landed);
    enemy_hit_fx(message.map_id, message.dungeon_id, message.level_id, landed);

    if (t(message.vfx)) {
      if (isnil(message.vfx.originalflipbook)) message.vfx.originalflipbook = message.vfx.flipbook;
      message.vfx.flipbook = cat(message.vfx.originalflipbook, "_", message.level_id);
      msg.post("main:/menu#dungeonmine", "play_vfx", message);
    }


    const henchmen_data = defsave.loaded.Henchmen.data;
    for (let h = 1; h <= len(henchmen_data); h++) {
      const henchman = henchmen_data[h - 1];
      if (henchman.map_id === message.map_id
        && henchman.dungeon_id === message.dungeon_id
        && henchman.level_id === message.level_id) {
        message.henchmen_id = h;
        break;
      }
    }

    assert(message.henchmen_id, "Henchmen ID is missing");
    complete_dungeonlevel(message);

    defsave.save("Map", true);

    msg.post(controller, "update_henchmen", { henchmen_id: message.henchmen_id });
  },
  ["mod_dungeonlevel"]: function (message_id: any, message: any, sender: any) {
    const dungeon_data = defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1];
    const level_data = dungeon_data.Levels[message.level_id - 1];

    const henchmen = defsave.get("Henchmen", message.henchmen_id);
    // Enemies are fought one at a time, however strong the crew.
    if (henchmen.dps >= level_data["Health"] && !t(level_data.contDamage) && !t(henchmen.Enemy)) {
      level_data.contDamage = true;
      level_data.State = "Active";
      msg.post(controller, "set_contdamage", { henchmen_id: message.henchmen_id });
    }

    damage_mapLevel(message.map_id, message.dungeon_id, message.level_id, message.amount, message);
    play_levelvfx(message.vfx, message.level_id);

  },
  ["mod_map"]: function (message_id: any, message: any, sender: any) {
    message.count = t(message.count) ? message.count : 1;


    if (isnil(message.herolevel)) message.herolevel = 1;
    const stats = defsave.loaded.Stats.data;
    const henchmen_data = defsave.loaded.Henchmen.data;
    const dungeon_data = defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1];


    for (let level = luamin(len(dungeon_data.Levels), tonumber(message.hero_level)); level >= 1; level--) {

      if (!t(dungeon_data.Levels[level - 1].isLocked) && t(dungeon_data.Levels[level - 1].wasClickedOpen)) {

        if (!isnil(dungeon_data.Levels[level - 1])) {



          if (isnil(dungeon_data.Levels[level - 1]["Damage"])) { dungeon_data.Levels[level - 1]["Damage"] = 0; }


          const landed = nn(message.amount) * nn(message.count) * actions.hex_multiplier(message.map_id, message.dungeon_id) * actions.enemy_damage_multiplier(message.map_id);
          defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels = actions.modify_field(dungeon_data.Levels, level, message.field, landed);
          enemy_hit_fx(message.map_id, message.dungeon_id, level, landed);
          message.level_id = level;

          if (t(message.vfx)) {
            if (message.vfx.type === "level") {
              if (isnil(message.vfx.originalflipbook)) message.vfx.originalflipbook = message.vfx.flipbook;
              message.vfx.flipbook = cat(message.vfx.originalflipbook, "_", level);
              msg.post("main:/menu#dungeonmine", "play_vfx", message);
            }
          }


          for (let h = 1; h <= len(henchmen_data); h++) {
            const henchman = henchmen_data[h - 1];
            if (henchman.map_id === message.map_id
              && henchman.dungeon_id === message.dungeon_id
              && henchman.level_id === level) {
              message.henchmen_id = h;
              break;
            }
          }

          // A hero can damage a level before any henchman works it,
          // so there may be no one to credit. The damage still lands.
          if (t(message.henchmen_id)) {
            complete_dungeonlevel(message);
            msg.post(controller, "update_henchmen", { henchmen_id: message.henchmen_id });
          }

        }
      }
    }
    defsave.save("Map", true);
    void stats;
  },
  ["disable_level"]: function (message_id: any, message: any, sender: any) {
    print("MAP: disable_level");
    defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1].State = "Disabled";
    defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false);
    defsave.save("Map", true);
    refresh_mapdata(message.map_id, message.dungeon_id);
  },
  ["enable_level"]: function (message_id: any, message: any, sender: any) {
    print("MAP: enable_level");
    defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1].State = "Inactive";
    defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false);
    defsave.save("Map", true);
    refresh_mapdata(message.map_id, message.dungeon_id);
  },
  ["deactivate_levels"]: function (message_id: any, message: any, sender: any) {
    print("MAP: deactivate_levels");
    for (let m = 1; m <= len(defsave.loaded.Map.data); m++) {
      const map = defsave.loaded.Map.data[m - 1];
      if (m !== 1) break;
      for (let d = 1; d <= len(map); d++) {
        const dungeon = map[d - 1];
        for (let l = 1; l <= len(dungeon.Levels); l++) {
          defsave.loaded.Map.data[m - 1][d - 1].Levels[l - 1].Damage = 0;
        }
      }
    }
    defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false);
    defsave.save("Map", true);
    refresh_mapdata(message.map_id, message.dungeon_id);
  },
  ["activate_level"]: function (message_id: any, message: any, sender: any) {
    print("DEBUG: MAP: activate_level");
    defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1].State = "Active";
    defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false);
    defsave.save("Map", true);
    refresh_mapdata(message.map_id, message.dungeon_id);
  },
  ["deactivate_level"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1].Damage = 0;
    defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1] = set_levelState(message.map_id, message.dungeon_id, message.level_id, defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1], false);
    defsave.save("Map", true);
    refresh_mapdata(message.map_id, message.dungeon_id);
  },
  ["explore_level"]: function (message_id: any, message: any, sender: any) {
    print("DEBUG: MAP: explore_level");
    // An enemy row opens into the fight; its health already follows the wave.
    if (actions.enemy_map(message.map_id)) {
      defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1].wasClickedOpen = true;
      set_front(message.map_id, message.dungeon_id);
      defsave.save("Map", true);
      refresh_mapdata(message.map_id, message.dungeon_id);
      if (message.level_id > 1) {
        msg.post(controller, "update_resources", { stat: cat("unlockdungeon", message.map_id, "-", message.dungeon_id, "-", message.level_id), amount: 1 });
      }
      return;
    }
    const map_data = defsave.get("Map", message.map_id);
    defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1].wasClickedOpen = true;
    defsave.set("Map", message.map_id, set_levelStates(defsave.loaded.Map.data, false)[message.map_id - 1]);
    defsave.save("Map", true);
    refresh_mapdata(message.map_id, message.dungeon_id);
    // Chapter 0 asks for the Cellar, and generated event chapters ask for
    // deeper levels, which unlock_level otherwise only records for level 1.
    if ((chapter0.active() || message.map_id !== 1) && message.level_id > 1) {
      msg.post(controller, "update_resources", { stat: cat("unlockdungeon", message.map_id, "-", message.dungeon_id, "-", message.level_id), amount: 1 });
    }
    void map_data;
  },
  ["unlock_level"]: function (message_id: any, message: any, sender: any) {
    if (defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Level === 0) {
      defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Level = 1;
      if (defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[0].Level === 0) {
        defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[0].Level = 1;
        defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[0].State = "Inactive";

        msg.post(controller, "unlock_dungeon", literal({ map_id: message.map_id, dungeon_id: message.dungeon_id, dungeonlevel: 1 }));
      }
      defsave.save("Map", true);
      refresh_mapdata(message.map_id, message.dungeon_id);
    }
  },
  ["unlock_levels"]: function (message_id: any, message: any, sender: any) {
    print("DEBUG: MAP: unlock_levels");
    defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false);
  },
  ["reset_dungeonlevel"]: function (message_id: any, message: any, sender: any) {
    const id = actions.findintable(defsave.loaded.Map.data[message.map_id - 1], "id", message.dungeon_id);
    if (!isnil(defsave.loaded.Map.data[message.map_id - 1][id - 1].Levels[message.level_id - 1])) {
      const damage = defsave.loaded.Map.data[message.map_id - 1][id - 1].Levels[message.level_id - 1]["Damage"];
      const health = defsave.loaded.Map.data[message.map_id - 1][id - 1].Levels[message.level_id - 1]["Health"];
      const fullDamage = Math.floor(nn(damage) / nn(health));


      /*
      if fullDamage >= 1 then
        defsave.loaded.Map.data[message.map_id][id].Levels[message.level_id]["Damage"] = 0
      else
        defsave.loaded.Map.data[message.map_id][id].Levels[message.level_id]["Damage"] = damage - ( health * fullDamage )
      end
      */

      defsave.loaded.Map.data[message.map_id - 1][id - 1].Levels[message.level_id - 1]["Damage"] = damage - (health * fullDamage);

    }
    refresh_mapdata(message.map_id, message.dungeon_id);
    defsave.save("Map", true);
  },
  ["toggle_buystate"]: function (message_id: any, message: any, sender: any) {
    if (t(message.map_id) && t(message.dungeon_id) && t(message.level_id)) {
      let state = nn(defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1]["buyState"]) + 1;
      if (state > len(defsave.get("Stats", "buyStates"))) state = 1;
      defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1]["buyState"] = state;
      defsave.save("Map", true);
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

void inspect; void random; void progress; void productName;

// Module locals the parity harness dumps (tools/port/parity/README.md, State dump format).
M.__parity_locals = () => ({ curLoc, hero_powers });

export default M;
