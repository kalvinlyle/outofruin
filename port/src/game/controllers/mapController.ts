// controllers/mapController.lua
import inspect_ from '../inspect';
import actions_ from '../actions';
import random_ from '../random/random';
import progress_ from '../progress/progress';
import saveload_ from '../saveload/saveload';
import defsave_ from '../defsave/defsave';
import { msg, hash, print } from '../../engine';
import { pairs, literal, cat, len, t, tonumber } from '../../lua';
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

function set_levelState(map_id: any, dungeon_id: any, level_id: any, level: any, reset: any) {

  assert(level.henchmen_id, "level does not have henchmen_id set");
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
  for (let h = 1; h <= len(defsave.loaded.Henchmen.data); h++) {
    const henchmen = defsave.loaded.Henchmen.data[h - 1];
    data[henchmen.map_id - 1][henchmen.dungeon_id - 1].Levels[henchmen.level_id - 1].henchmen_id = henchmen.id;
  }
  return data;
}

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
        data[m - 1][d - 1].Levels[l - 1].buyState = 1;


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
    if (gear.Modifier.Type === type && gear.map_id === map_id && gear.dungeon_id === dungeon_id && gear.level_id === level_id) {
      total = Math.pow(nn(gear.Modifier.Factor), nn(gear.Level));
      break;
    }
  }
  return total;
}

function complete_dungeonlevel(message: any) {
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
      msg.post(controller, "mod_henchmen", literal({ henchmen_id: previousLevel.henchmen_id, amount: nn(message.packs) * nn(defsave.get("Henchmen", message.henchmen_id).Size) }));
    }
    msg.post(controller, "deactivate_henchmen", message);
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

/** math.min(a, b) raises on a non-number argument. */
function luamin(a: any, b: any): number {
  if (typeof a !== 'number' || typeof b !== 'number') throw new Error("bad argument to 'min' (number expected)");
  return Math.min(a, b);
}

const messageData: any = {};
messageData["all"] = literal({
  ["on_start"]: function (message_id: any, message: any, sender: any) {
    on_start(message);
  },
  ["start_game"]: function (message_id: any, message: any, sender: any) {
    if (actions.tablelength(defsave.loaded.Henchmen.data) > 0 && actions.tablelength(defsave.loaded.Resources.data) > 0) {

      print("DEBUG: MAP: start_game");
      defsave.default_data.Map = ingestLevels(defsave.default_data.Map);
      defsave.default_data.Map = set_levelStates(defsave.default_data.Map, false);

      defsave.load("Map");
      print("DEBUG: MAP: start_game");
      defsave.loaded.Map.data = assign_henchmen_to_levels(defsave.loaded.Map.data);
      defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false);
      defsave.loaded.Map.data = ingestLevels_Live(defsave.loaded.Map.data);

      defsave.save("Map", true);
    }
  },
  ["complete_rank"]: function (message_id: any, message: any, sender: any) {
    if (!t(message.portal)) {
      const maps = actions.clone(defsave.loaded.Map.data);
      for (let m = 1; m <= len(maps); m++) {
        const map = maps[m - 1];
        for (let d = 1; d <= len(map); d++) {
          const dungeon = map[d - 1];
          for (let l = 1; l <= len(dungeon.Levels); l++) {
            defsave.loaded.Map.data[m - 1][d - 1].Levels[l - 1].wasClickedOpen = false;
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

    defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels = actions.modify_field(dungeon_data.Levels, message.level_id, message.field, nn(message.amount) * nn(message.count));

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
    if (henchmen.dps >= level_data["Health"] && !t(level_data.contDamage)) {
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


          defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels = actions.modify_field(dungeon_data.Levels, level, message.field, nn(message.amount) * nn(message.count));
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

          assert(message.henchmen_id, "Henchmen ID is missing");
          complete_dungeonlevel(message);
          msg.post(controller, "update_henchmen", { henchmen_id: message.henchmen_id });

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
    const map_data = defsave.get("Map", message.map_id);
    defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1].wasClickedOpen = true;
    defsave.set("Map", message.map_id, set_levelStates(defsave.loaded.Map.data, false)[message.map_id - 1]);
    defsave.save("Map", true);
    refresh_mapdata(message.map_id, message.dungeon_id);
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
M.__parity_locals = () => ({ curLoc });

export default M;
