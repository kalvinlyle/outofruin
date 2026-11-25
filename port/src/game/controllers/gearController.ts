// controllers/gearController.lua
import inspect_ from '../inspect';
import actions_ from '../actions';
import defsave_ from '../defsave/defsave';
import { msg, hash, print } from '../../engine';
import { pairs, literal, cat, len, T, tonumber, t } from '../../lua';

const inspect: any = inspect_;
const actions: any = actions_;
const defsave: any = defsave_;

const controller = "main:/menu#controller";

const M: any = {};
let pause = false;

function isnil(v: any): boolean { return v === undefined || v === null; }
/** Lua arithmetic operand: numbers pass, numeric strings coerce, anything else raises. */
function nn(v: any): number {
  if (typeof v === 'number') return v;
  const n = typeof v === 'string' ? tonumber(v) : undefined;
  if (n === undefined) throw new Error('attempt to perform arithmetic on a ' + (isnil(v) ? 'nil' : typeof v) + ' value');
  return n;
}

function ingestGear(data: any) {
  for (let i = 1; i <= len(data); i++) {
    data[i - 1].id = i;
    data[i - 1].Progress = 0;
    data[i - 1].Count = 0;
    data[i - 1].Level = 0;
    data[i - 1].copyText = "0/1";
    data[i - 1].Status = "Locked";
  }
  return data;
}

/* Gear.json is written into the save the first time it is read, and defsave
only falls back to the defaults when the save file is empty. A save therefore
keeps whatever the data file said on the day it was created, including the
atlas frame each piece of gear draws from -- so a player who started before
the gear art changed still asks for frames that no longer exist, and
gui.play_flipbook raises a Lua error that aborts the whole card screen.

Only the progression belongs to the save. Everything below is the data file's
to own, and is copied back over the loaded save on every start so a data
change reaches existing players. */
const DATA_FIELDS = ["Name", "Description", "Rarity", "Rank",
  "Icon", "Portrait", "Modifier", "map_id", "dungeon_id", "level_id"];

function isTable(v: any): boolean { return typeof v === "object" && v !== null; }

// Icon, Portrait and Modifier are tables, so the save is only rewritten when
// one of them actually differs rather than on every start.
// (Only a yes/no comes out, so the keys are walked in JS order.)
function same(a: any, b: any): boolean {
  if (a === b || (isnil(a) && isnil(b))) return true;
  if (!isTable(a) || !isTable(b)) return false;
  for (const k of Object.keys(a)) {
    if (isnil(a[k])) continue;
    if (!same(a[k], b[k])) return false;
  }
  for (const k of Object.keys(b)) {
    if (isnil(b[k])) continue;
    if (isnil(a[k])) return false;
  }
  return true;
}

function refresh_from_data(defaults: any) {
  const saved = defsave.loaded.Gear.data;
  if (isnil(saved)) return false;

  let changed = false;
  for (let i = 1; i <= len(defaults); i++) {
    const item = defaults[i - 1];
    if (isnil(saved[i - 1])) {
      saved[i - 1] = actions.clone(item);
      changed = true;
    } else {
      for (let f = 1; f <= len(DATA_FIELDS); f++) {
        const field = DATA_FIELDS[f - 1];
        // Portrait is absent from saves written before gear had card art,
        // so a nil on either side still has to be carried across.
        if (!same(saved[i - 1][field], item[field])) {
          saved[i - 1][field] = actions.clone(item[field]);
          changed = true;
        }
      }
      saved[i - 1].id = i;
    }
  }

  // A data file that lost entries would leave orphans behind the end.
  for (let i = len(saved); i >= len(defaults) + 1; i--) {
    saved[i - 1] = undefined;
    changed = true;
  }

  return changed;
}

function on_start(message: any) {
  print("GEARCONTROLLER: Loading Gear JSON");
  defsave.default_data.Gear = ingestGear(actions.load_from_JSON("/data/Gear.json"));
  defsave.load("Gear");
  if (refresh_from_data(defsave.default_data.Gear)) {
    print("GEARCONTROLLER: Gear refreshed from data file");
    defsave.save("Gear", true);
  }
  print("GEARCONTROLLER: Gear Loaded");
}

function return_cost(level: any) {
  const levels = [0, 50, 100, 200, 300, 400, 1000, 2000, 4000, 8000, 20000, 50000, 100000];
  if (level === 0) return 0; else return levels[level + 1 - 1];
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
  ["pause"]: function (message_id: any, message: any, sender: any) { pause = true; },
  ["unpause"]: function (message_id: any, message: any, sender: any) { pause = false; },
  ["reset_statistics"]: function (message_id: any, message: any, sender: any) {
    print("GEARCONTROLLER: Loading Gear JSON");
    defsave.default_data.Gear = ingestGear(actions.load_from_JSON("/data/Gear.json"));
    defsave.reset_to_default("Gear");
    defsave.save("Gear", true);
  },
  ["event_reset"]: function (message_id: any, message: any, sender: any) {
    let changed = false;
    for (let g = 1; g <= len(defsave.loaded.Gear.data); g++) {
      const gear = defsave.loaded.Gear.data[g - 1];
      if (gear.map_id === message.map_id && t(message.tier)) {
        const want = gear.Rank < message.tier ? "Unlocked" : "Locked";
        if (gear.Status !== want) {
          gear.Status = want;
          changed = true;
        }
      }
    }
    if (changed) defsave.save("Gear", true);
  },
  ["sync_event_locks"]: function (message_id: any, message: any, sender: any) {
    let changed = false;
    for (let g = 1; g <= len(defsave.loaded.Gear.data); g++) {
      const gear = defsave.loaded.Gear.data[g - 1];
      if (gear.map_id === message.map_id && t(message.tier)) {
        const want = gear.Rank < message.tier ? "Unlocked" : "Locked";
        if (gear.Status !== want) {
          gear.Status = want;
          changed = true;
        }
      }
    }
    if (changed) defsave.save("Gear", true);
  },
  ["unlock_gear"]: function (message_id: any, message: any, sender: any) {
    const gear_list: any[] = [];
    const map_id = t(message.map_id) ? message.map_id : 1;
    const list = actions.clone(defsave.loaded.Gear.data);
    for (let g = 1; g <= len(list); g++) {
      const gear = list[g - 1];
      const g_map = isnil(gear.map_id) ? 1 : gear.map_id;
      if (gear.Rank === message.rank && g_map === map_id && (map_id === 1 || gear.Status === "Locked")) {
        print(cat("GEARCONTROLLER: Get Gear ", defsave.loaded.Gear.data[g - 1].Name));
        const item = defsave.loaded.Gear.data[g - 1];
        item.Status = "Unlocked";
        item.Progress = nn(item.Count) > 0 || nn(item.Level) > 0 ? set_progress(item.Count, item.Level) : 0;
        item.copyText = set_copyText(item.Count, item.Level);
        item.Cost = return_cost(item.Level);
        T.insert(gear_list, g);
      }
    }
    if (!t(message.silent)) msg.post(controller, "show_cardsunlock", { gear_list: gear_list });
    defsave.save("Gear", true);
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["add_gearcards"]: function (message_id: any, message: any, sender: any) {
    const item = defsave.get("Gear", message.gear_id);
    item.Count = nn(item.Count) + nn(message.amount);
    // No chapter unlocks an event's gear: its first card does.
    if (item.map_id !== 1) item.Status = "Unlocked";
    if (item.Count >= 1 && item.Level === 0) {
      item.Level = 1;
    }
    item.Cost = return_cost(item.Level);
    item.Progress = set_progress(item.Count, item.Level);
    item.copyText = set_copyText(item.Count, item.Level);
    defsave.set("Gear", message.gear_id, item);
    defsave.save("Gear", true);
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["levelup_gear"]: function (message_id: any, message: any, sender: any) {
    const item = defsave.get("Gear", message.gear_id);
    if (item.Progress >= 1) {
      // Event gear levels up with the event's shards, never the main game's XP.
      const shards = actions.event_shards(item.map_id);
      if (t(shards)) {
        msg.post(controller, "add_resource_quietly", { stat: shards, amount: -nn(item.Cost) });
      } else {
        msg.post(controller, "mod_xp", { amount: -nn(item.Cost) });
      }
      item.Level = item.Level + 1;
      item.Cost = return_cost(item.Level);
      item.Progress = set_progress(item.Count, item.Level);
      item.copyText = set_copyText(item.Count, item.Level);
    }
    defsave.set("Gear", message.gear_id, item);
    defsave.save("Gear", true);
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
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

void inspect; void pause;

// Module locals the parity harness dumps (tools/port/parity/README.md, State dump format).
M.__parity_locals = () => ({ DATA_FIELDS, pause });

export default M;
