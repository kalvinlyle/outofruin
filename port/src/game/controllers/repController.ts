// controllers/repController.lua
import inspect_ from '../inspect';
import actions_ from '../actions';
import random_ from '../random/random';
import progress_ from '../progress/progress';
import saveload_ from '../saveload/saveload';
import defsave_ from '../defsave/defsave';
import { msg, hash, print } from '../../engine';
import { pairs, literal, cat, len, t, S, os, tonumber } from '../../lua';

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
const defaultStats: any = literal({
  Rank: 1,
  Rep: 0,
  adReward: 0,
  costMultiplier: 1.05,
  globalBoost: 1,
  followerRate: 1,
  questSlots: 1,
  buyState: 1,
  buyStates: ["MAX", "OCD", "50%", "25%", "10%", "1"],
  portalScrollCost: 10 / 8 * 100,
  Show: literal({ shopButton: false, nextprevButtons: false, mapButton: false, cardsButton: false, portalButton: true, discordButton: false }),
});

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

function pairLocation(data: any) {
  const map_data = defsave.loaded.Map.data;

  for (let m = 1; m <= len(map_data); m++) {
    const map = map_data[m - 1];
    for (let d = 1; d <= len(map); d++) {
      const dungeon = map[d - 1];
      for (let l = 1; l <= len(dungeon.Levels); l++) {
        const level = dungeon.Levels[l - 1];
        for (let r = 1; r <= len(level.Loot_Table); r++) {
          const row = level.Loot_Table[r - 1];
          data[row.Option.Stat].Location = literal({ map_id: m, dungeon_id: d, level_id: l });
        }
      }
    }
  }

  return data;
}

function loadResources() {
  print("REPCONTROLLER: Loading Resources JSON");
  const resources = saveload.load_from_JSON("/data/Resources.json");
  const data: any = {};
  for (let r = 1; r <= len(resources); r++) {
    const resource = resources[r - 1];
    data[resource.id] = resource;
  }
  return data;
}

function resetStats(data?: any) {
  if (isnil(data)) data = {};
  const items = loadResources();
  for (const [i, item] of pairs<any>(items)) {
    const tr = literal({
      Name: item.Name,
      Value: item.Value,
      Icon: item.Icon,
      Stat: item.id,
      Count: 0,
      totalValue: 0,
      Lifetime: 0,
      Progress: 0,
      Batchsize: item.Batchsize,
      Location: item.Location,
    });
    data[item.id] = tr;
    void i;
  }
  return data;
}

function ingestQuest(items: any, quest: any) {
  assert(items[quest.statName], cat(quest.statName, " doesn't exist in list of items."));
  quest.Stat = items[quest.statName].Name;
  quest.Name = cat(quest.Type, " ", quest.Stat);
  quest.Desc = cat(quest.Type, " ", quest.Goal, " ", quest.Stat);
  quest.Icon = items[quest.statName].Icon;
  quest.Location = items[quest.statName].Location;
  quest.Total = 0;
  if (t(quest.Lifetime)) {
    items[quest.statName].Lifetime = t(items[quest.statName].Lifetime) ? items[quest.statName].Lifetime : 0;
    quest.Total = items[quest.statName].Lifetime;
  }
  if (t(quest.Story_Int)) {
    quest.Status = "New";
  } else {
    quest.Status = "Read";
  }
  return quest;
}

function refreshRanks(data: any) {
  const items = loadResources();
  for (let r = 1; r <= len(data); r++) {
    const rep = data[r - 1];
    for (let q = 1; q <= len(rep.Quests); q++) {
      const quest = rep.Quests[q - 1];
      data[r - 1].Quests[q - 1].id = q;
      data[r - 1].Quests[q - 1] = ingestQuest(items, quest);
    }
  }
  return data;
}

function refreshQuests(data: any) {
  const items = loadResources();
  for (let q = 1; q <= len(data.Quests); q++) {
    const quest = data.Quests[q - 1];
    data.Quests[q - 1].id = q;
    data.Quests[q - 1] = ingestQuest(items, quest);
  }
  return data;
}

function trimQueststoRank(data: any, rank: any) {
  return data[rank - 1];
}

function on_start(message: any) {

  print("REPCONTROLLER: Loading Ranks JSON");
  defsave.default_data.Ranks = refreshRanks(saveload.load_from_JSON("/data/Ranks.json"));


  defsave.load("Ranks");
  msg.post(controller, "refreshRep");
  print("REPCONTROLLER: Ranks Loaded");
  if (actions.tablelength(defsave.loaded.Ranks.data) > 0) msg.post(controller, "boot_rep");


  defsave.default_data.Resources = resetStats();


  defsave.default_data.Stats = defaultStats;


  defsave.load("Stats");
  const _gb = defsave.get("Stats", "globalBoost");
  defsave.set("Stats", "globalBoost", t(_gb) ? _gb : defsave.default_data.Stats.globalBoost);
  const _uuid = defsave.get("Stats", "uuid");
  if (t(_uuid)) {
    defsave.default_data.Stats.uuid = _uuid;
  } else {
    // generate_uuid returns gsub's (string, count); string.upper takes the string.
    const g = actions.generate_uuid();
    defsave.default_data.Stats.uuid = S.upper(Array.isArray(g) ? g[0] : g);
  }
  defsave.set("Stats", "uuid", defsave.default_data.Stats.uuid);
  print("REPCONTROLLER: UUID ", defsave.get("Stats", "uuid"));
  defsave.load("Resources");
  print("REPCONTROLLER: Stats Loaded");
  print("REPCONTROLLER: Resources Loaded");
  msg.post(controller, "refreshStats");
  msg.post(controller, "refreshResources");
  if (actions.tablelength(defsave.loaded.Stats.data) > 0 && actions.tablelength(defsave.loaded.Resources.data) > 0) msg.post(controller, "boot_stats");
  msg.post(controller, "returntogame");
}

function complete_rank(message: any) {
  const rewards = defsave.get("Ranks", defsave.get("Stats", "Rank")).RewardMsgs;
  for (let r = 1; r <= len(rewards); r++) {
    const reward = rewards[r - 1];
    msg.post(controller, reward.post, reward.message);
  }

  defsave.set("Stats", "Rank", nn(defsave.get("Stats", "Rank")) + 1);
  defsave.set("Stats", "Rep", 0);
  if (!t(message.portal)) defsave.set("Stats", "buyState", 1);
  defsave.set("Stats", "PortalScrollCost", Math.floor(nn(defsave.get("Stats", "Rank")) * 10 / 8) * 100);
  defsave.save("Stats", true);

  for (const [r, resource] of pairs(defsave.loaded.Resources.data)) {
    defsave.loaded.Resources.data[r as any].Lifetime = nn(defsave.loaded.Resources.data[r as any].Lifetime) + nn(defsave.loaded.Resources.data[r as any].Count);
    defsave.loaded.Resources.data[r as any].Progress = 0;
    defsave.loaded.Resources.data[r as any].Count = 0;
    defsave.loaded.Resources.data[r as any].totalValue = 0;
    void resource;
  }
  defsave.save("Resources", true);

  const currentRank = defsave.get("Stats", "Rank");
  print("REPCONTROLLER: Loading Ranks JSON");
  const currentRank_data = trimQueststoRank(saveload.load_from_JSON("/data/Ranks.json"), currentRank);
  defsave.set("Ranks", currentRank, refreshQuests(currentRank_data));
  defsave.save("Ranks", true);

  msg.post("main:/overlay#header", "refresh_all");
  if (t(message.callback)) msg.post(cat("main:/menu#", message.callback), "refresh_all");
}

function collect_quest(id: any) {
  const quests = defsave.loaded.Ranks.data[defsave.loaded.Stats.data.Rank - 1].Quests;
  for (let q = 1; q <= len(quests); q++) {
    const quest = quests[q - 1];
    if (quest.id === id) {
      if (quest.Status === "Completed") {
        print("REP: quest", defsave.loaded.Ranks.data[defsave.loaded.Stats.data.Rank - 1].Quests[q - 1].Desc, "completed");
        defsave.loaded.Ranks.data[defsave.loaded.Stats.data.Rank - 1].Quests[q - 1].Status = "Collected";
        const rewards = defsave.loaded.Ranks.data[defsave.loaded.Stats.data.Rank - 1].Quests[q - 1].RewardMsgs;
        for (let r = 1; r <= len(rewards); r++) {
          const reward = rewards[r - 1];
          msg.post(controller, reward.post, reward.message);
        }
        defsave.loaded.Ranks.data[defsave.loaded.Stats.data.Rank - 1].Quests[q - 1].Status = "Collected";
        defsave.save("Ranks", true);
        defsave.set("Stats", "Rep", nn(defsave.get("Stats", "Rep")) + 1);
        defsave.save("Stats", true);
        msg.post("main:/overlay#header", "refresh_all");
      }
    }
  }
}

function set_mapNodes() {
  if (defsave.loaded.Stats.data.Rank <= len(defsave.loaded.Ranks.data)) {
    const quests = defsave.loaded.Ranks.data[defsave.loaded.Stats.data.Rank - 1].Quests;
    for (let q = 1; q <= len(quests); q++) {
      const quest = quests[q - 1];
      let count = 0;
      const items = defsave.loaded.Ranks.data[defsave.loaded.Stats.data.Rank - 1].Quests;
      for (let i = 1; i <= len(items); i++) {
        const item = items[i - 1];
        if (item.Status === "Read" && quest["map_id"] === item["map_id"] && quest["mapNode"] === item["mapNode"]) {
          count = count + 1;
        }
      }
      if (count === 0) msg.post(controller, "conceal_mapNode", literal({ map_id: quest["map_id"], mapNode: quest["mapNode"] }));
    }
  }
}

function update_quests(stat: any, amount: any) {
  if (defsave.loaded.Stats.data.Rank <= len(defsave.loaded.Ranks.data)) {
    const quests = defsave.loaded.Ranks.data[defsave.loaded.Stats.data.Rank - 1].Quests;
    for (let q = 1; q <= len(quests); q++) {
      let quest = quests[q - 1];
      if (quest.statName === stat && quest.Status !== "Completed" && quest.Status !== "New" && amount > 0) {
        const current_rank = defsave.get("Ranks", defsave.get("Stats", "Rank"));
        current_rank.Quests[q - 1].Total = nn(current_rank.Quests[q - 1].Total) + nn(amount);
        quest = current_rank.Quests[q - 1];
        if (quest.Total >= quest.Goal && quest.Status !== "Collected" && quest.Status !== "New") {
          current_rank.Quests[q - 1].Status = "Completed";
        }
        defsave.set("Ranks", defsave.get("Stats", "Rank"), current_rank);
      }
    }
  }
  defsave.save("Ranks", true);
  msg.post("main:/overlay#header", "refresh_all");
}

function set_stat(stat: any, amount: any) {

  if (isnil(defsave.loaded.Stats.data)) defsave.loaded.Stats.data = {};
  if (isnil(defsave.loaded.Stats.data[stat])) defsave.loaded.Stats.data[stat] = 0;
  defsave.loaded.Stats.data[stat] = amount;

  defsave.save("Stats", true);

}

function get_totalValue(name: any, count: any, power: any) {
  if (power === 0) {
    print(cat(name, " power is not greater than 0"));
    return 0;
  } else if (power === 1) {
    return count;
  } else {
    let total = power;
    let num = 0;
    while ((nn(count) / nn(total)) > 1) {
      num = num + 1;
      total = total * power;
    }
    return num;
  }
}

function update_resources(stat: any, amount: any, bonus?: any) {
  assert(defsave.loaded.Resources.data[stat], cat(stat, " does not exist in the Resource list"));


  defsave.loaded.Resources.data[stat].Count = Math.floor(nn(defsave.loaded.Resources.data[stat].Count) + nn(amount));
  if (t(bonus)) {
    defsave.loaded.Resources.data[stat].Count = Math.floor(nn(defsave.loaded.Resources.data[stat].Count) + nn(bonus));
  }

  if (isnil(defsave.loaded.Resources.data[stat].Icon.flipbook)) {
    let x = 0;
    print("REPCONTROLLER: Loading Items JSON");
    const itemlist = saveload.load_from_JSON("/data/Items.json");
    for (let n = 1; n <= len(itemlist); n++) {
      if (itemlist[n - 1].id === defsave.loaded.Resources.data[stat].Stat) {
        x = n;
        break;
      }
    }
    assert(x !== 0, cat("item '", defsave.loaded.Resources.data[stat].Stat, "' could not be found in the list"));
    defsave.loaded.Resources.data[stat].Icon = itemlist[x - 1].Icon;
  }

  const resource = defsave.loaded.Resources.data[stat];
  resource.Power = get_totalValue(resource.Name, resource.Count, resource.Batchsize);
  defsave.loaded.Resources.data[stat].totalValue = nn(resource.Power) * nn(resource.Value);


  let total = 10;
  let bonusStage = 0;
  while ((resource.Count / total) >= 1) {
    bonusStage = bonusStage + 1;
    total = total * 10;
  }

  let progress = 0;

  const min = Math.pow(10, bonusStage);
  const max = Math.pow(10, (bonusStage + 1));
  progress = (resource.Count - min) / (max - min);

  defsave.loaded.Resources.data[stat].Progress = progress;

  if (amount > 0) {
    msg.post(controller, "set_bonusxp", literal({ statName: resource.Stat, value: resource.Value, count: resource.Count }));
  }

  defsave.save("Resources", true);

  if (t(bonus)) {
    update_quests(stat, nn(amount) + nn(bonus));
  } else {
    update_quests(stat, amount);
  }

  if (amount > 0) {
    msg.post(controller, "unlock_levels", { resource_id: resource.Stat });
  }

  if (resource.Value > 0 && curLoc.map_id === resource.Location.map_id && curLoc.dungeon_id === resource.Location.dungeon_id) {
    msg.post("main:/menu#dungeonmine", "trigger_resource", literal({ resource: stat, amount: amount, bonus: bonus }));
  }
  msg.post("main:/overlay#header", "refresh_all");
}

function set_questStatus(rank: any, id: any, status: any) {
  defsave.loaded.Ranks.data[rank - 1].Quests[id - 1].Status = status;
  if (defsave.loaded.Ranks.data[rank - 1].Quests[id - 1].Total >= defsave.loaded.Ranks.data[rank - 1].Quests[id - 1].Goal) {
    defsave.loaded.Ranks.data[rank - 1].Quests[id - 1].Status = "Completed";
  }
  defsave.save("Ranks", true);
  msg.post("main:/overlay#header", "refresh_all");
}

const messageData: any = {};
messageData["all"] = literal({
  ["on_start"]: function (message_id: any, message: any, sender: any) { on_start(message); },
  ["start_game"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Resources.data = pairLocation(defsave.loaded.Resources.data);
    defsave.save("Resources", true);
    defsave.save("Stats", true);
  },
  ["reset_statistics"]: function (message_id: any, message: any, sender: any) {
    defsave.reset_to_default("Ranks");
    defsave.reset_to_default("Stats");
    defsave.reset_to_default("Resources");
    msg.post(controller, "reset_mapdata");
    msg.post("main:/overlay#header", "refresh_all");
  },
  ["show_shopbutton"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Stats.data.Show.shopButton = true;
    defsave.save("Stats", true);
    msg.post("main:/overlay#header", "refresh_all");
  },
  ["show_nextprevbuttons"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Stats.data.Show.nextprevButtons = true;
    defsave.save("Stats", true);
    msg.post("main:/menu#dungeonmine", "refresh_all");
  },
  ["show_mapbutton"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Stats.data.Show.mapButton = true;
    defsave.save("Stats", true);
    msg.post("main:/overlay#header", "refresh_all");
  },
  ["show_cardsbutton"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Stats.data.Show.cardsButton = true;
    defsave.save("Stats", true);
    msg.post("main:/overlay#header", "refresh_all");
  },
  ["show_portalbutton"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Stats.data.Show.portalButton = true;
    defsave.save("Stats", true);
    msg.post("main:/overlay#header", "refresh_all");
  },
  ["show_discordbutton"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Stats.data.Show.discordButton = true;
    defsave.save("Stats", true);
    msg.post("main:/overlay#header", "refresh_all");
  },
  ["add_questslot"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Stats.data.questSlots = Math.min(3, nn(defsave.loaded.Stats.data.questSlots) + 1);
    defsave.save("Stats", true);
    msg.post("main:/overlay#header", "refresh_all");
  },
  ["update_currentlocation"]: function (message_id: any, message: any, sender: any) {
    curLoc = literal({ map_id: message.map_id, dungeon_id: message.dungeon_id });
  },
  ["gen_adreward"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Stats.data.adReward = os.time(os.date("!*t")) + (2 * 60 * 60);
    defsave.save("Stats", true);
  },
  ["ad_reward"]: function (message_id: any, message: any, sender: any) { set_stat("adReward", os.time(os.date("!*t")) + (4 * 60 * 60)); },
  ["read_quest"]: function (message_id: any, message: any, sender: any) {
    assert(message.id, "Quest id is missing");
    set_questStatus(message.rank, message.id, "Read");

  },
  ["update_resources"]: function (message_id: any, message: any, sender: any) { update_resources(message.stat, message.amount, message.bonus); },
  ["update_stats"]: function (message_id: any, message: any, sender: any) { update_resources(message.stat, message.amount, message.bonus); },		//depricate update_stats
  ["collect_quest"]: function (message_id: any, message: any, sender: any) { collect_quest(message.id); },
  ["complete_rank"]: function (message_id: any, message: any, sender: any) { complete_rank(message); },
  ["free_loot"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Stats.data.adReward = 0;
    defsave.save("Stats", true);
    msg.post(controller, "show_shop");
  },
  ["toggle_buystate"]: function (message_id: any, message: any, sender: any) {
    if (!t(message.map_id) && !t(message.dungeon_id) && !t(message.level_id)) {
      let state = nn(defsave.get("Stats", "buyState")) + 1;
      if (state > len(defsave.get("Stats", "buyStates"))) state = 1;
      defsave.set("Stats", "buyState", state);
      defsave.save("Stats", true);
    }
  },
  ["cancel_globalBoost"]: function (message_id: any, message: any, sender: any) {
    defsave.set("Stats", "globalBoost", 1);
    msg.post(controller, "update_allhenchmen");
  },
  ["double_globalBoost"]: function (message_id: any, message: any, sender: any) {
    defsave.set("Stats", "globalBoost", nn(defsave.get("Stats", "globalBoost")) * 2);
    msg.post(controller, "update_allhenchmen");
  },
  ["set_username"]: function (message_id: any, message: any, sender: any) {
    defsave.set("Stats", "username", message.username);
  },



  ["mod_xp"]: function (message_id: any, message: any, sender: any) {
    if (message.amount > 0) {
      update_resources("collectxp", message.amount);
    } else if (message.amount < 0) {
      update_resources("spendxp", -message.amount);
    }
  },
  ["mod_gold"]: function (message_id: any, message: any, sender: any) {
    if (message.amount > 0) {
      update_resources("collectgold", message.amount);
    } else if (message.amount < 0) {
      update_resources("spendgold", -message.amount);
    }
  },
  ["mod_bonustime"]: function (message_id: any, message: any, sender: any) {
    update_resources("collecttime", message.amount);
  },
  ["unlock_dungeon"]: function (message_id: any, message: any, sender: any) {
    update_resources(cat("unlockdungeon", message.map_id, "-", message.dungeon_id, "-", message.dungeonlevel), 1);
  },
  ["collect_cards"]: function (message_id: any, message: any, sender: any) {
    update_resources("collectcard", message.amount);
  },
  ["sell_item"]: function (message_id: any, message: any, sender: any) {
    update_resources("sellitem", 1);
  },
  ["equip_item"]: function (message_id: any, message: any, sender: any) {
    update_resources("equipitem", 1);
  },
  ["unequip_item"]: function (message_id: any, message: any, sender: any) {
    update_resources("unequipitem", 1);
  },
  ["levelup_hero"]: function (message_id: any, message: any, sender: any) {
    update_resources("leveluphero", 1);
  },
  ["levelup_henchmen"]: function (message_id: any, message: any, sender: any) {
    update_resources("upgradecard", 1);
  },
  ["levelup_gear"]: function (message_id: any, message: any, sender: any) {
    update_resources("upgradecard", 1);
  },
  ["assign_hero"]: function (message_id: any, message: any, sender: any) {
    update_resources(cat("assignhero", message.map_id, "-", message.dungeon_id), 1);
  },
  ["unassign_hero"]: function (message_id: any, message: any, sender: any) {
    update_resources("unassignhero", 1);
  },
  ["click_level"]: function (message_id: any, message: any, sender: any) {
    update_resources("click", 1);
    update_resources(cat("click", message.map_id, "-", message.dungeon_id, "-", message.dungeonlevel), 1);
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

void inspect; void random; void progress; void productName; void set_mapNodes;

// Module locals the parity harness dumps (tools/port/parity/README.md, State dump format).
M.__parity_locals = () => ({ curLoc, defaultStats });

export default M;
