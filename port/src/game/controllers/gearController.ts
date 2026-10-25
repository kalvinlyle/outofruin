// controllers/gearController.lua
import inspect_ from '../inspect';
import actions_ from '../actions';
import defsave_ from '../defsave/defsave';
import { msg, hash, print } from '../../engine';
import { pairs, literal, cat, len, T, tonumber } from '../../lua';

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

function on_start(message: any) {
  print("GEARCONTROLLER: Loading Gear JSON");
  defsave.default_data.Gear = ingestGear(actions.load_from_JSON("/data/Gear.json"));
  defsave.load("Gear");
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
  ["unlock_gear"]: function (message_id: any, message: any, sender: any) {
    const gear_list: any[] = [];
    const list = actions.clone(defsave.loaded.Gear.data);
    for (let g = 1; g <= len(list); g++) {
      const gear = list[g - 1];
      if (gear.Rank === message.rank) {
        print(cat("GEARCONTROLLER: Get Gear ", defsave.loaded.Gear.data[g - 1].Name));
        defsave.loaded.Gear.data[g - 1].Status = "Unlocked";
        defsave.loaded.Gear.data[g - 1].Progress = 0;
        defsave.loaded.Gear.data[g - 1].Cost = return_cost(defsave.loaded.Gear.data[g - 1].Level);
        T.insert(gear_list, g);
      }
    }
    msg.post(controller, "show_cardsunlock", { gear_list: gear_list });
    defsave.save("Gear", true);
    if (!isnil(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
  },
  ["add_gearcards"]: function (message_id: any, message: any, sender: any) {
    const item = defsave.get("Gear", message.gear_id);
    item.Count = nn(item.Count) + nn(message.amount);
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
      msg.post(controller, "mod_xp", { amount: -nn(item.Cost) });
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

export default M;
