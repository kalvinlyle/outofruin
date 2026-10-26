// controllers/repController.lua
import inspect_ from '../inspect';
import actions_ from '../actions';
import random_ from '../random/random';
import progress_ from '../progress/progress';
import saveload_ from '../saveload/saveload';
import defsave_ from '../defsave/defsave';
import { msg, hash, print } from '../../engine';
import { pairs, literal, cat, len, t, S, T, M as LM, os, tonumber, format, strlen, tset } from '../../lua';

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
  Show: literal({ shopButton: false, nextprevButtons: false, mapButton: false, cardsButton: false, portalButton: true }),
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
  for (const [id, resource] of pairs<any>(defsave.default_data.Resources)) {
    const saved = defsave.loaded.Resources.data[id as any];
    if (isnil(saved)) {
      defsave.loaded.Resources.data[id as any] = actions.clone(resource);
    } else {
      // A save keeps its own copy of each resource; take the art from
      // the data, so a resource whose icon changed shows the new one.
      saved.Icon = actions.clone(resource.Icon);
    }
  }
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

  for (const [r, resource] of pairs<any>(defsave.loaded.Resources.data)) {
    if (!(t(resource.Location) && resource.Location.map_id !== 1)) {
      defsave.loaded.Resources.data[r as any].Lifetime = nn(defsave.loaded.Resources.data[r as any].Lifetime) + nn(defsave.loaded.Resources.data[r as any].Count);
      defsave.loaded.Resources.data[r as any].Progress = 0;
      defsave.loaded.Resources.data[r as any].Count = 0;
      defsave.loaded.Resources.data[r as any].totalValue = 0;
    }
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

let event_progress: any; // live events, below

function update_quests(stat: any, amount: any) {
  event_progress(stat, amount);
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

// Wren Lightfoot sings about one running chapter quest that asks for her
// dungeon's drops, and pushes it on by a share of its goal.
function hero_ballad(message: any) {
  const rank = defsave.get("Stats", "Rank");
  const ranks = defsave.loaded.Ranks.data[rank - 1];
  if (!t(ranks)) return;
  const drops: any = {};
  const levels = defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels;
  for (let li = 1; li <= len(levels); li++) {
    const level = levels[li - 1];
    for (let ri = 1; ri <= len(level.Loot_Table); ri++) { const row = level.Loot_Table[ri - 1]; drops[row.Option.Stat] = true; }
  }
  const running: any[] = [], slots = actions.quest_slots(defsave.get("Stats", "questSlots"));
  for (let q = 1; q <= len(ranks.Quests); q++) {
    const quest = ranks.Quests[q - 1];
    if (len(running) < slots && quest.Status !== "Collected") {
      if (quest.Status === "Read" && t(drops[quest.statName])) T.insert(running, q);
    }
  }
  if (len(running) === 0) {
    msg.post("main:/menu#dungeonmine", "hero_fx", literal({ kind: "ballad", hero_id: message.hero_id, map_id: message.map_id, dungeon_id: message.dungeon_id, rest: true }));
    return;
  }
  const q = running[LM.random(1, len(running)) - 1];
  const quest = ranks.Quests[q - 1];
  const before = quest.Total;
  const share = actions.hero_power(message, message.at1, message.at13);
  quest.Total = Math.min(quest.Goal, quest.Total + Math.max(1, Math.ceil(quest.Goal * share)));
  if (quest.Total >= quest.Goal) quest.Status = "Completed";
  defsave.save("Ranks", true);
  msg.post("main:/menu#dungeonmine", "hero_fx", literal({ kind: "ballad", hero_id: message.hero_id, map_id: message.map_id, dungeon_id: message.dungeon_id,
    quest_id: quest.id, before: before, after: quest.Total, goal: quest.Goal, echo: !isnil(message.echo_scale) }));
  msg.post("main:/overlay#header", "hero_bonus_fx", literal({ kind: "ballad", quest_id: quest.id, before: before, after: quest.Total, goal: quest.Goal }));
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


/* Live events. Each event is an extra map on the world map (Map.json map 2
onwards) with its own locations, henchmen, gear, drops and quests. Runs follow
one fixed weekly schedule for everyone, back to back: when a run ends the next
starts at once.

Each event is a story of 100 chapters, played a part of ten at a time. A
chapter is a set of quests from the event's own quest-giver: every quest pays
out when it is collected, and collecting all of them pays the chapter's two
chests, a normal one and the event's own, and opens the next chapter. The
event's chest holds only the event's cards and shards. Finishing a part's
tenth chapter pays the event hero (the hero itself in part 1, cards for it
after that) and ends the event for the player until it comes round again,
when the next part begins. A run that ends mid-part leaves the player at the
chapter they reached, quests and all.

The event's henchmen and gear are kept from run to run; its locations, drops
and crews start again each run. Each part's goals are EVENT_GOAL_GROWTH times
the last part's, and the levels' health is set when a run starts from the
crew's strength, so a crew built up past the goals makes the numbers bigger
while a part still takes about a week.

Part 1 is written by hand. Later parts are dealt from the same pools by a
seeded generator, so every player gets the same chapters and none repeats an
earlier one. When a run ends, quests finished but not collected and the chests
of a chapter they complete are paid out, and leftover shards become gold. */
const EVENT_UNLOCK_RANK = 4;
// The schedule and the order events run in are in actions.EVENTS.
const EVENT_SHARDS_PER_GOLD = 100;
const EVENT_LEFTOVER_GOLD_MAX = 100;
const EVENT_PART_CHAPTERS = 10;
const EVENT_PARTS = 10;
const EVENT_GOAL_GROWTH = 1.5;

// A quest: { stat, goal, reward = { shards | gold | xp | cards }, intro, outro }.
// An UNLOCK quest counts the unlockdungeon stat the map posts when a location
// first opens.
function collect(stat: any, goal: any, reward: any, intro: any, outro: any) {
  return literal({ type: "QUEST_TYPE_COLLECT", stat: stat, goal: goal, reward: reward, intro: intro, outro: outro });
}
function unlock(stat: any, reward: any, intro: any, outro: any) {
  return literal({ type: "QUEST_TYPE_UNLOCK", stat: stat, goal: 1, reward: reward, intro: intro, outro: outro });
}
// An enemy event's: a row's enemies beaten (its kill stat), and a hero sent
// to a location.
function defeat(stat: any, goal: any, reward: any, intro: any, outro: any) {
  return literal({ type: "QUEST_TYPE_DEFEAT", stat: stat, goal: goal, reward: reward, intro: intro, outro: outro });
}
function send(stat: any, reward: any, intro: any, outro: any) {
  const [m, d] = S.match(stat, "assignhero(%d+)-(%d+)");
  return literal({ type: "QUEST_TYPE_SEND", stat: stat, goal: 1, reward: reward, intro: intro, outro: outro,
    label: cat("DUNGEON_NAME_", m, "_", d) });
}

// What Hazel says in the generated parts, as { intro, outro } pairs: one list
// per drop the quest asks for and one per kind of quest. A quest in the same
// place of the next part takes the next pair along, so lines come round again
// only after many weeks.
const WEREMOON_LINES: any = literal({
  mooncarrot: [
    ["The carrots are glowing again. That's either very good or very bad. Fetch them anyway!", "Still warm. I'll not ask why."],
    ["A wererabbit stole my supper. I want it back with interest. In carrots.", "That'll teach him. Probably not. But still."],
    ["Moon Carrots make the best soup. Don't tell the rabbits that's what they're for.", "Soup's on. Mind the glow."],
    ["The burrow's bursting with carrots tonight. Pull up as many as you can carry.", "Lovely and crunchy, like last time. Better, even."],
  ],
  moonclover: [
    ["Four leaves, one moon, no excuses. Bring me clover!", "Lucky me. Luckier you, if you'd seen what I saw."],
    ["I'm stuffing a mattress with Moon Clover. For luck. And for comfort, mostly comfort.", "I'll sleep like a stone. A lucky stone."],
    ["Clover by the burrow mouth glows if you whisper to it. Whisper loudly.", "There, glowing nicely. You've a gift."],
    ["Every clover's a wish. I've a lot of wishes. Get picking!", "First wish: more clover. Don't look at me like that."],
  ],
  glowworm: [
    ["The Glow Worms are shy, but they like a song. Hum something.", "Look at them glow. You must hum beautifully."],
    ["I've lost my lantern. Glow Worms will do. Lots of Glow Worms.", "Bright as noon in here. Well, a dim noon."],
    ["The worms have gone deep in the tunnels. Coax them out!", "There they are, wriggling and glowing. Bless them."],
    ["Glow Worms in a jar make a fine night light. I need a lot of nights lit.", "That's enough light for a whole winter of nights."],
  ],
  gnawedroot: [
    ["More roots gnawed. More teeth marks. Bigger teeth. Bring the evidence.", "Bigger than last time. Much bigger. Lovely."],
    ["Gnawed Roots make a good tea, if you don't mind the bite marks.", "Steeping now. Smells like burrow. Delicious."],
    ["Something's chewing through the tunnels faster every night. Collect the leftovers!", "That's a lot of chewing. I'll sleep with one eye open."],
    ["Roots, roots, gnawed roots. Fetch me a cartload.", "A fine cartload. Mind the splinters."],
  ],
  paperlantern: [
    ["The paper lanterns are drifting off again. Catch them before they reach the moon!", "Got them! The moon can find its own lanterns."],
    ["A lantern for every path to the Mere. That's a lot of paths.", "There, the paths are lit. Nobody gets lost tonight."],
    ["The lanterns keep blowing out. I need spares. Many spares.", "Enough spares for a wedding. Or a very long night."],
    ["Paper Lanterns float on the wind. Chase them down for me!", "Breathless? Good. That means you ran."],
  ],
  silverfur: [
    ["The wererabbits are moulting. Silver Fur everywhere. Sweep it up!", "Soft as moonlight. Sneezy as anything."],
    ["I'm knitting the moon a scarf. It needs a lot of Silver Fur.", "The moon will be ever so warm. Eventually."],
    ["Silver Fur fetches a fine price at the fair. Fetch it, then we'll fetch a price.", "We'll be rich! Rich in fur, anyway."],
    ["Down in the hollow they've shed their winter coats. Gather the lot.", "Itchy work, but somebody had to do it. You did."],
  ],
  moonreed: [
    ["The Moon Reeds are whistling a tune I don't like. Cut them down to size.", "Hear that? Neither do I. Much better."],
    ["Reeds for baskets, reeds for boats, reeds for roofing. Reeds!", "That's every basket, boat and roof sorted."],
    ["Moon Reeds only grow on the shore while the moon's up. Hurry!", "Just in time. The moon's winking at us."],
    ["I'm weaving a giant reed rabbit to scare the real ones. Bring me reeds.", "He's magnificent. Terrifying. A bit lopsided."],
  ],
  snailshell: [
    ["The snails have moved house again and left their shells behind. Collect them!", "Lovely spirals. I'll string them over the door."],
    ["Snail Shells make a fine rattle to scare off wererabbits. Lots of shells.", "Rattle, rattle! They hate it. Perfect."],
    ["Pick the shells off the shore before the tide takes them.", "The tide can sulk. We've got them."],
    ["Each shell has a little sea inside. I want all the little seas.", "Hold one to your ear. That's the Mere, gossiping."],
  ],
  moonlily: [
    ["The Moon Lilies are open. Pick them before the sun spoils it!", "Smell that. Moonlight and pondweed. Glorious."],
    ["Lilies for the pool, lilies for my hat, lilies for the rabbits to trip on.", "Three good uses. I'm a genius."],
    ["The Moon Pool's crowded with lilies. Thin them out a bit.", "There, the pool can breathe again."],
    ["A crown of lilies for the court's feast. A big crown. A very big feast.", "Fit for a king. Or a very smug rabbit."],
  ],
  moonwater: [
    ["Scoop up Moonwater. One sip and you dream in silver.", "Not all at once! Trust me on that."],
    ["My kettle wants Moonwater. My kettle is very demanding.", "The kettle's happy. The kettle is never happy."],
    ["The pool's brimming tonight. Bottle as much as you can.", "Enough bottles to see us through the next blood moon."],
    ["Moonwater keeps the lilies glowing. Fetch more before they fade.", "Glowing again. Good as new."],
  ],
  sunkenbell: [
    ["The sunken bells are ringing at the wrong hour. Haul them up!", "Ding, dong, mine. Much better."],
    ["A bell for every rabbit hole. That's a lot of bells.", "Now we'll hear them coming. Loudly."],
    ["The bells under the grove are rusting. Bring them up to dry.", "Shiny again. They'll ring sweeter now."],
    ["Ring every bell you can find. Keep the court awake and grumpy!", "Grumpy rabbits make mistakes. Lovely."],
  ],
  glowcap: [
    ["Glowcaps are sprouting in the grove. Don't eat them. Really, don't.", "Good. Now wash your hands. Twice."],
    ["I'm brewing something that needs a lot of Glowcaps. Don't ask what.", "It's bubbling. It's purple. It's fine."],
    ["Glowcaps light the drowned paths. Gather them for the lanterns.", "The grove's lit like a festival. Watch your step."],
    ["The Glowcaps are spreading. Pick them before they reach my garden.", "My garden is safe. My garden thanks you."],
  ],
  runepebble: [
    ["The stones are gossiping again. Collect the Rune Pebbles they drop.", "Oho! The Envoy talks in his sleep. Useful."],
    ["Rune Pebbles tell fortunes if you shake them. Fetch a bagful.", "They say you'll be rich. They always say that."],
    ["I'm building a wall of rune stones. A tiny wall. Many tiny pebbles.", "A fine tiny wall. Nobody tiny will get past."],
    ["The standing stones hum when they shed pebbles. Follow the hum!", "Humming nicely. You've a good ear."],
  ],
  thistle: [
    ["Thistles guard the stones. Pick them carefully. Carefully!", "Ouch. I said carefully."],
    ["A thistle hedge will keep the rabbits out of my garden. Lots of thistles.", "Prickly. Perfect. Ow."],
    ["Thistle tea cures everything except thistles. Pick some.", "Brewing now. Mind your fingers."],
    ["The court's thistles are taller than you this year. Trim them down.", "Now you're the tallest thing here. Congratulations."],
  ],
  brambleberry: [
    ["Bramble Berries are ripe! The knights guard them like gold.", "Delicious. Worth every scratch."],
    ["Jam! We'll make jam! The wererabbits can't resist jam.", "Sticky, sweet and a little bit of a trap."],
    ["I need berries for a pie. A pie the size of a cart.", "That's a cart-sized pie. We'll need a cart-sized fork."],
    ["Pick the brambles clean before the knights eat them all.", "The knights look hungry. And cross. Good."],
  ],
  goldenacorn: [
    ["Golden Acorns pay the court's taxes. Let's pinch the treasury.", "Shiny! The Envoy will be furious."],
    ["Plant one Golden Acorn, grow a golden oak. Plant a thousand, grow a fortune.", "That's a forest of fortune. Mind the squirrels."],
    ["The court counts its acorns every night. Let's make the count come up short.", "They'll be counting till dawn."],
    ["A sack of Golden Acorns bribes a knight. Several sacks bribe a court.", "The court's ours. For tonight, anyway."],
  ],
  moonshard: [
    ["The Throne drops Moon Shards when it shakes. Shake it hard!", "The moon's coming down to meet us. Nearly there."],
    ["Moon Shards fell in the night. Every last one, before the rabbits find them!", "Glittering. The rabbits are livid."],
    ["The Envoy keeps shards under his cushion. Shake the Throne till they fall out.", "Down they came! He's not comfy now."],
    ["One more pile of shards and the moon will owe us a favour.", "The moon owes us. I'll collect later."],
  ],
  tap: [
    ["Give it a poke. And another. Keep poking till it gives up its secrets.", "It's given up. They always give up."],
    ["Knock on every stone down there. Something's hiding.", "Whatever it was has run off. Good riddance."],
    ["The wererabbits are napping. Wake them up! Tap, tap, tap!", "Wide awake and very cross. Excellent."],
    ["My fingers are too old for this. Yours aren't. Tap away!", "Your fingers must be tired. Mine feel fine."],
  ],
  hire: [
    ["More hands, fewer rabbits. Hire a crew!", "Look at them go. Like ants. Lovely ants."],
    ["This lot works for snacks and a kind word. Hire as many as you can feed.", "That's a lot of snacks. Worth it."],
    ["The work's piling up. Get some help in!", "Now that's a crew. They'll have it done by morning."],
    ["A good crew is worth its weight in carrots. Hire more!", "Heavier than carrots, this lot. More useful, too."],
  ],
  send: [
    ["A hero would sort this place out. Send one over!", "Ah, a proper hero. Things will move now."],
    ["The crew's asking for a hero. Someone brave. Or at least someone loud.", "Brave and loud. The crew's delighted."],
    ["Send a hero in to keep the rabbits honest.", "The rabbits are being very honest now. Suspiciously honest."],
    ["No hero, no help. Send one over!", "There we go. The place feels safer already."],
  ],
  unlock: [
    ["There's a way further in. Find it and open it up!", "Open! Mind your head on the way in."],
    ["Something's down there worth finding. Break through!", "Through! Smells like adventure. And damp."],
    ["The path goes on past where we've been. Open it!", "New ground. I'll put the kettle on."],
    ["Push on deeper. The best loot is always further in.", "Deeper it is. Lovely and dark."],
  ],
});
const EVENTS: any = [
  literal({
    key: "WEREMOON",
    version: 2,
    map_id: 2,
    shards: "moonshard",
    xp_name: "Moon Shards",
    hero_id: 4,
    npc: "Hazel",
    // The deepest level the crew can reach by each chapter of a part, as
    // { location, level }, and the chapters that open a new location: part
    // 1's pacing, which the generated parts follow.
    frontier: [[1, 2], [1, 3], [2, 1], [2, 1], [2, 2], [2, 3], [3, 1], [3, 2], [3, 2], [3, 3]],
    opens: literal({ [3]: 2, [7]: 3 }),
    lines: WEREMOON_LINES,
    // Part 1. Its chests are the normal chests of every part; the event's
    // own chest and the hero come from chapter_chest.
    tiers: [
      literal({
        chest: literal({ cards: 5, xp: 20 }),
        quests: [
          collect("mooncarrot", 50, literal({ shards: 50 }), "Psst! Old Hazel here. The wererabbits are out and the carrots are glowing. Fetch me some Moon Carrots before they hop off!", "Lovely and crunchy. Here, have some shards - they're what levels up a warren crew."),
          collect("moonclover", 50, literal({ shards: 50 }), "Moon Clover grows round the burrow mouth. Four leaves, one moon. Bring me a pile!", "Lucky you. Lucky me, mostly."),
          collect("glowworm", 25, literal({ gold: 15 }), "The Root Tunnels are full of Glow Worms. Don't squash them, they're shy.", "Look at them glow! Like little night lights with opinions."),
        ],
      }),
      literal({
        chest: literal({ gold: 10, cards: 5 }),
        quests: [
          collect("gnawedroot", 200, literal({ shards: 100 }), "Something's been chewing the roots down there. Bring me the chewed bits, I want to know whose teeth.", "Big teeth. Very big teeth. Never mind."),
          collect("mooncarrot", 1000, literal({ shards: 100 }), "The wererabbits are bribable, you know. With carrots. Lots of carrots.", "That should keep them civil until Tuesday."),
          collect("silverfur", 50, literal({ xp: 25 }), "Down in Lantern Hollow they shed Silver Fur. Gather it up - it makes a cracking scarf.", "Soft as moonlight. Itchy as anything."),
        ],
      }),
      literal({
        chest: literal({ cards: 10, xp: 50 }),
        quests: [
          collect("paperlantern", 100, literal({ shards: 200 }), "Those Paper Lanterns light the way to the Silver Mere. Snatch a few!", "Now we can see where we're going. That's half the battle."),
          collect("glowworm", 2000, literal({ shards: 200 }), "More worms! The lanterns need something to glow with.", "Bright as a summer noon. Well, a summer dusk."),
          unlock("unlockdungeon2-2-1", literal({ gold: 20 }), "Follow the lanterns to the Silver Mere. The moon sleeps in its water.", "You found it! Mind your boots, it's wetter than it looks."),
        ],
      }),
      literal({
        chest: literal({ gold: 20, cards: 10 }),
        quests: [
          collect("snailshell", 500, literal({ shards: 300 }), "Snail Shells line the Reedy Shore. The snails won't mind, they've moved out.", "Pretty, aren't they? I'll string them over the door."),
          collect("moonreed", 100, literal({ shards: 300 }), "Moon Reeds whistle when the moon's up. Cut me a bundle.", "Hear that? No? You will."),
          collect("silverfur", 2000, literal({ xp: 50 }), "Winter's coming. Well, eventually. More Silver Fur, please.", "Toasty. The wererabbits look cold now. Oh well."),
        ],
      }),
      literal({
        chest: literal({ cards: 15, xp: 100 }),
        quests: [
          collect("moonwater", 1000, literal({ shards: 500 }), "Scoop up Moonwater from the pool. One sip and you'll dream in silver.", "Don't drink it all at once. Trust me."),
          collect("moonlily", 500, literal({ shards: 500 }), "The Moon Lilies open only at night. Pick them before dawn!", "Smell that. Like moonlight and pondweed."),
          collect("paperlantern", 2000, literal({ gold: 30 }), "The lanterns keep blowing out. Fetch spares.", "That's enough lanterns to light a wedding."),
        ],
      }),
      literal({
        chest: literal({ gold: 30, cards: 15 }),
        quests: [
          collect("glowcap", 1000, literal({ shards: 800 }), "The Drowned Grove sprouts Glowcaps. Don't eat them. Really, don't.", "Good. Now wash your hands."),
          collect("sunkenbell", 200, literal({ shards: 800 }), "There's an old belltower under the grove. The bells still ring at midnight. Bring them up!", "Ding! Dong! The wererabbits hate that. Perfect."),
          collect("moonreed", 3000, literal({ xp: 100 }), "I'm weaving a reed boat. Don't ask why. More reeds.", "It floats! Mostly."),
        ],
      }),
      literal({
        chest: literal({ cards: 20, xp: 200 }),
        quests: [
          unlock("unlockdungeon2-3-1", literal({ shards: 1000 }), "Past the bells lies the Wererabbit Court. That's where the trouble starts.", "You're in. Keep your voice down and your carrots close."),
          collect("thistle", 1000, literal({ shards: 1000 }), "Thistles guard the standing stones. Pick them, carefully.", "Ouch. I said carefully."),
          collect("moonlily", 5000, literal({ gold: 40 }), "The court's having a feast. Lilies for every table!", "Fancy. I wasn't invited, of course."),
        ],
      }),
      literal({
        chest: literal({ gold: 50, cards: 20 }),
        quests: [
          collect("runepebble", 300, literal({ shards: 1500 }), "The stones shed Rune Pebbles when they gossip. Collect the gossip.", "Oho! The Envoy snores. Now we know."),
          collect("brambleberry", 500, literal({ shards: 1500 }), "Bramble Berries grow round the court. The knights guard them like gold.", "Delicious. Worth every scratch."),
          collect("sunkenbell", 3000, literal({ xp: 300 }), "Ring every bell in the grove! Keep the court awake!", "They're grumpy now. Grumpy rabbits make mistakes."),
        ],
      }),
      literal({
        chest: literal({ cards: 30, xp: 500 }),
        quests: [
          collect("goldenacorn", 300, literal({ shards: 2500 }), "Golden Acorns pay the court's taxes. Let's pinch their treasury.", "Shiny! The Envoy will be furious."),
          collect("thistle", 20000, literal({ shards: 2500 }), "A thistle wall will keep them in when the moon sets. Lots of thistles.", "Prickly. Perfect."),
          collect("brambleberry", 5000, literal({ gold: 60 }), "Jam! We'll make jam! The wererabbits can't resist jam.", "Sticky, sweet and a little bit of a trap."),
        ],
      }),
      literal({
        chest: literal({ hero: true, gold: 50, cards: 50, gold_if_owned: 200 }),
        quests: [
          collect("moonshard", 50, literal({ gold: 100 }), "The Throne drops Moon Shards when it shakes. Shake it hard.", "The moon's coming down to meet us. Nearly there."),
          collect("goldenacorn", 2000, literal({ cards: 40 }), "One last bribe for the Envoy. A mountain of acorns.", "He's taken it. The court bows to you now."),
          collect("runepebble", 10000, literal({ xp: 800 }), "The stones remember everything. Make them remember you.", "They'll talk about this night for a hundred years. Someone's waiting to meet you..."),
        ],
      }),
    ],
  }),
];
const BLACKMAW_LINES: any = literal({
  ratwhisker: [
    ["Rats in the bailey, rats in the beer. Bring me their whiskers, soldier!", "That's a tidy pile of whiskers. The beer thanks you."],
    ["The quartermaster pays a copper a whisker. Get counting!", "Counted twice. Still disgusting. Well done."],
    ["A rat ate my boot. With my foot in it. Whiskers, now!", "My foot feels avenged."],
    ["The rats are back, fatter than ever. Thin them out!", "Thinner. Much thinner. Good work."],
  ],
  rustykey: [
    ["Every rat in that bailey is carrying a key. Don't ask me why. Fetch them!", "Rusty, but they turn. Mostly."],
    ["Somewhere in this keep is a door we haven't opened. Keys, lots of keys.", "One of these fits something. I'd bet my horn on it."],
    ["The old jailer lost his keys to the rats. Get them back!", "He'll be ever so pleased. Grumpy, but pleased."],
    ["Keys! Keys! I can never have enough keys!", "That's enough keys. For today."],
  ],
  batear: [
    ["Bats in the belfry and bats in my helmet. Swat them!", "My helmet's my own again. Lovely."],
    ["Bat Ears make a fine pair of earmuffs. Bring me a dozen. Or a hundred.", "Warm and toasty. Thank you, soldier."],
    ["Those bats keep swooping my sentries. Box their ears!", "The sentries can look up again."],
    ["Cloud of bats coming over the wall! Knock them down!", "Clear skies. For now."],
  ],
  batfang: [
    ["Bat Fangs, soldier. The armourer wants them for arrowheads.", "Sharp little things. The armourer's grinning."],
    ["One bat bit me on the nose. I want every fang in the keep.", "My nose is avenged. It's still sore."],
    ["Fangs for the healer. She says they're good for something. Won't say what.", "She's taken them. Didn't say thank you."],
    ["Pull the fangs out of the bats. Politely, if you can.", "Not politely, I see. Fair enough."],
  ],
  oldbone: [
    ["Those skeletons keep falling to bits. Collect the bits!", "That's a lot of bits. Mind they don't get up again."],
    ["The dog's gone mad for skeleton bones. Bring her a heap.", "She's never been happier. Look at that tail go."],
    ["Bones in the courtyard, bones in the well. Clear them out!", "Clean as a whistle. A bony whistle."],
    ["Stack the bones by the gate. Let the next lot see what's coming.", "That'll make them think twice. If they can think."],
  ],
  notchedblade: [
    ["Those skeleton guards carry decent steel under the rust. Fetch their blades!", "Bit of a polish and they'll do nicely."],
    ["Our lads need swords. The skeletons won't miss theirs.", "The lads are armed. The skeletons are not."],
    ["Notched or not, a blade's a blade. Bring them in!", "That's a whole armoury. A wobbly one."],
    ["The smith can reforge those blades. Get him plenty.", "He's hammering already. Hear that?"],
  ],
  spidersilk: [
    ["The dungeons are thick with spider silk. Gather it up, we need rope!", "Strong stuff. Sticky, but strong."],
    ["Spider Silk makes the finest bowstrings. Fetch me a mountain.", "Twang! Lovely."],
    ["Mind the webs down there. Better yet, collect them!", "You've got silk in your moustache. Good look on you."],
    ["The quartermaster's out of bandages. Silk will do. Lots of silk.", "Wrapped and ready. Don't need them, hopefully."],
  ],
  spidereye: [
    ["Spider Eyes glow in the dark. Perfect for night watch. Bring some!", "The sentries can see in the dark now. Creepy."],
    ["Eight eyes a spider, and I want every one.", "That's a lot of eyes. They're all staring at me."],
    ["The wizard wants spider eyes. Don't ask me what for.", "He cackled when he saw them. Never a good sign."],
    ["Pick the eyes off the spiders. They've plenty to spare.", "Still blinking. Ugh."],
  ],
  slimejelly: [
    ["The slimes are bubbling up the stairs. Scoop up the jelly!", "Wobbly. Green. Smells of socks."],
    ["Slime Jelly keeps the gate hinges oiled. Fetch a barrel.", "The gate's never been quieter."],
    ["Don't eat the Slime Jelly. Just collect it. I'm serious.", "You ate some, didn't you. I can tell."],
    ["Jelly! Buckets of it! The cook wants to try something.", "The cook's tried something. We'll see."],
  ],
  swallowedcoin: [
    ["Those slimes have swallowed half the keep's treasury. Get it back!", "Bit slimy. Still spends."],
    ["Every slime's got coins inside. Pop them and pocket the lot.", "That's the pay chest topped up."],
    ["The paymaster says we're broke. The slimes say otherwise.", "Paymaster's smiling. First time in years."],
    ["Gold in the slime, soldier. Fish it out!", "Wash your hands before you count it."],
  ],
  gravedust: [
    ["Ghouls leave a trail of Grave Dust. Sweep it up before it gets in the stew.", "Stew's safe. Probably."],
    ["The priest needs Grave Dust for his wards. Bring him heaps.", "He's sprinkling it everywhere. Sneezing too."],
    ["Dust, dust, everywhere dust. Bag it up!", "Bagged. Don't sneeze on it."],
    ["Grave Dust keeps the ghouls out, they say. Let's test that.", "Seems to work. Seems to."],
  ],
  ironshackle: [
    ["The ghouls are wearing our own shackles. Take them back!", "Good iron. We'll find a use for it."],
    ["Shackles for the smith. He's making something big.", "He won't say what. He's grinning though."],
    ["Every ghoul down there's dragging a chain. Free the chains!", "Clank, clank. Music to my ears."],
    ["Iron's short. Strip the shackles off the ghouls!", "That'll keep the forge going a week."],
  ],
  imphorn: [
    ["Imps! Little red pests! Bring me their horns!", "Pointy. Warm. Cheeky, even without the imp."],
    ["Imp Horns make fine drinking horns. Tiny ones. Bring lots.", "A thimble of ale each. Cheers!"],
    ["The imps are juggling fire in the throne hall. Horns, now!", "No more juggling. Good."],
    ["Snap those horns off. The imps won't miss them. Much.", "They'll grow back. Unfortunately."],
  ],
  brimstone: [
    ["Brimstone, soldier. Smelly, yellow and perfect for the catapults.", "Phew. Load the catapults."],
    ["The imps carry brimstone. Take it before they set the keep alight.", "Nothing on fire. Well, less on fire."],
    ["We need brimstone for the signal fires. Lots of it.", "The signal fires will be seen for miles."],
    ["Bring the brimstone out, but hold your nose.", "My eyes are watering. Good haul."],
  ],
  wraithwisp: [
    ["The wraiths shed wisps when you hit them. Bottle them up!", "Cold as ice. Glowing. Spooky. Lovely."],
    ["Wraith Wisps light a dark hall without smoke. Fetch plenty.", "The hall's bright as day. A ghostly day."],
    ["Catch the wisps before they drift off!", "Caught. They're sulking in their jars."],
    ["The wraiths are moaning again. Make them moan less.", "Quieter. Much quieter."],
  ],
  cursedcandle: [
    ["Cursed Candles burn blue and never go out. Snuff them out!", "Snuffed. Don't light them again."],
    ["The wraiths light their way with cursed candles. Pinch them all.", "Dark in there now. Good."],
    ["A cursed candle a day keeps the wraiths away. Allegedly.", "Allegedly. We'll see."],
    ["Bring me those candles. Carefully. Don't let them drip on you.", "They dripped on you. I said carefully."],
  ],
  blackplate: [
    ["Those Black Knights wear the best steel in the land. Strip it off them!", "Heavy. Black. Very fashionable."],
    ["The smith wants Black Plate. He'll make armour for our lads.", "The lads look ever so dashing now."],
    ["Knock the knights over and take their plate!", "They're very light now. Embarrassed, too."],
    ["Black Plate for the gate. We'll make it twice as thick.", "Nothing's getting through that."],
  ],
  knightcrest: [
    ["Every Black Knight wears a crest. Take them as trophies!", "Shiny. Proud. Ours now."],
    ["Crests for the hall. We'll hang them over the fire.", "Looks grand. Very grand."],
    ["Bring me their crests, and they'll know who beat them.", "They know now."],
    ["Crests, soldier! A wall of crests!", "That's a fine wall."],
  ],
  kill: [
    ["Clear them out, soldier! Every last one!", "That's a tidy battlefield."],
    ["They keep coming. We keep hitting. That's soldiering.", "Hit, and hit again. Well done."],
    ["Push them back! Don't let them hold the line!", "The line's ours."],
    ["Another wave, another fight. Up and at them!", "They'll think twice next time."],
  ],
  boss: [
    ["The big one's back, and angrier. Knock it down again!", "Down it goes! And it'll be back. They always are."],
    ["Beat the boss, soldier. That's an order!", "Order carried out. Splendidly."],
    ["The boss is guarding something good. Make it stop guarding.", "It's stopped. Permanently. For now."],
    ["Go in there and give that brute a bloody nose. Not literally.", "Very literally, by the look of you."],
  ],
  send: [
    ["A hero would make short work of this lot. Send one in!", "Now that's a proper hero. Things will move."],
    ["The lads are tired. Send them a hero to cheer them up.", "Cheered up and fighting harder. Good."],
    ["Need a hero at the front! Who's brave?", "Brave as anything. Good choice."],
    ["No hero, no victory. Send one over!", "Victory's closer already."],
  ],
  unlock: [
    ["There's a way deeper in. Find it and storm it!", "Through! Keep your shield up."],
    ["Break through to the next part of the keep!", "We're in. Mind the stairs."],
    ["Onwards, soldier! There's more keep to take!", "More keep, more glory."],
    ["Push on! The Blackmaw won't wait forever.", "Closer. I can smell him."],
  ],
});
// The Blackmaw Siege: an enemy event (actions.enemy_map). Its frontier is the
// deepest row the crew is fighting by each chapter of a part, as { location,
// row }; the fourth row of a location is its boss.
T.insert(EVENTS, literal({
  key: "BLACKMAW",
  version: 3,
  map_id: 6,
  shards: "siegexp",
  xp_name: "Siege XP",
  hero_id: 7,
  npc: "Brindle",
  enemies: true,
  frontier: [[1, 4], [1, 4], [2, 2], [2, 4], [2, 3], [2, 4], [3, 1], [3, 2], [3, 3], [3, 4]],
  opens: literal({ [2]: 2, [6]: 3 }),
  lines: BLACKMAW_LINES,
  tiers: [
    literal({
      chest: literal({ cards: 5, xp: 20 }),
      quests: [
        collect("ratwhisker", 40, literal({ shards: 50 }), "Sergeant Brindle, reporting! The Blackmaw's lot have taken the keep. Send a hero into the bailey and bring me the rats' whiskers!", "Ha! Good work. Here, have some Siege XP - it's what levels up your gear."),
        collect("batear", 30, literal({ shards: 50 }), "Bats over the wall! Knock them down and bring me their ears.", "That's the sky clear. For now."),
        defeat("kill6-1-4", 1, literal({ gold: 15 }), "That stone brute on the gatehouse is the Gargoyle Gatekeeper. Knock him off his perch!", "Down he goes! He'll be back with friends, mind. They always are."),
      ],
    }),
    literal({
      chest: literal({ gold: 10, cards: 5 }),
      quests: [
        collect("rustykey", 10, literal({ shards: 100 }), "Every rat down there's carrying a key. One of them opens something. Fetch them!", "Rusty, but they'll turn."),
        collect("oldbone", 120, literal({ shards: 100 }), "Skeleton guards fall to bits when you hit them. Collect the bits!", "That's a lot of bits. Mind they don't get up again."),
        unlock("unlockdungeon6-2-1", literal({ xp: 25 }), "The Gatekeeper dropped a Gatehouse Key. Use it - the dungeons are below!", "We're in. Mind the cobwebs."),
      ],
    }),
    literal({
      chest: literal({ cards: 10, xp: 50 }),
      quests: [
        collect("spidersilk", 200, literal({ shards: 200 }), "The dungeons are thick with spider silk. We need it for bowstrings!", "Twang! Lovely."),
        defeat("kill6-1-3", 24, literal({ shards: 200 }), "The skeleton guards keep coming back. Put them down again!", "Back in their boxes."),
        send("assignhero6-2", literal({ gold: 20 }), "It's dark down there. Send a hero into the dungeons.", "A hero at the front. The lads feel braver already."),
      ],
    }),
    literal({
      chest: literal({ gold: 20, cards: 10 }),
      quests: [
        collect("slimejelly", 300, literal({ shards: 300 }), "Slimes on the stairs! Scoop up the jelly before someone slips.", "Wobbly. Green. Smells of socks."),
        collect("batfang", 20, literal({ shards: 300 }), "The armourer wants bat fangs for arrowheads. Get him some.", "Sharp little things. He's grinning."),
        defeat("kill6-2-4", 2, literal({ xp: 50 }), "That treasure chest at the bottom of the dungeons? It's not a chest. It's the Great Mimic. Beat it twice!", "Twice! It won't fool anyone again. Probably."),
      ],
    }),
    literal({
      chest: literal({ cards: 15, xp: 100 }),
      quests: [
        collect("ratwhisker", 800, literal({ shards: 500 }), "The rats are back, fatter than ever. Thin them out!", "Thinner. Much thinner."),
        collect("swallowedcoin", 40, literal({ shards: 500 }), "Those slimes swallowed half the treasury. Get it back!", "Bit slimy. Still spends."),
        collect("gravedust", 300, literal({ gold: 30 }), "Ghouls leave Grave Dust everywhere. Sweep it up before it gets in the stew.", "Stew's safe. Probably."),
      ],
    }),
    literal({
      chest: literal({ gold: 30, cards: 15 }),
      quests: [
        collect("ironshackle", 40, literal({ shards: 800 }), "The ghouls are wearing our own shackles. Take them back!", "Good iron. The smith will find a use."),
        collect("spidersilk", 1500, literal({ shards: 800 }), "More silk! We're wrapping the whole wall in it.", "Sticky, but strong. The wall's a fortress now."),
        unlock("unlockdungeon6-3-1", literal({ xp: 100 }), "The Mimic coughed up a Throne Room Key. The Blackmaw's hall is up top - in we go!", "The throne hall. Keep your voice down and your shield up."),
      ],
    }),
    literal({
      chest: literal({ cards: 20, xp: 200 }),
      quests: [
        collect("imphorn", 250, literal({ shards: 1000 }), "Imps! Little red pests! Bring me their horns!", "Pointy. Warm. Cheeky, even without the imp."),
        defeat("kill6-2-3", 30, literal({ shards: 1000 }), "The ghouls are rattling their chains again. Put them down!", "Quiet down there now."),
        collect("slimejelly", 2500, literal({ gold: 40 }), "The cook wants slime jelly. Buckets of it. Don't ask.", "He's tried something. We'll see."),
      ],
    }),
    literal({
      chest: literal({ gold: 50, cards: 20 }),
      quests: [
        collect("wraithwisp", 400, literal({ shards: 1500 }), "The wraiths shed wisps when you hit them. Bottle them up!", "Cold as ice. Glowing. Lovely."),
        collect("brimstone", 40, literal({ shards: 1500 }), "Brimstone for the catapults. Smelly, yellow and perfect.", "Phew. Load the catapults."),
        defeat("kill6-2-4", 3, literal({ xp: 300 }), "The Great Mimic keeps coming back hungrier. Beat it three more times!", "It's learned its lesson. Three times over."),
      ],
    }),
    literal({
      chest: literal({ cards: 30, xp: 500 }),
      quests: [
        collect("blackplate", 400, literal({ shards: 2500 }), "The Black Knights wear the finest steel in the land. Strip it off them!", "Heavy. Black. Very fashionable."),
        collect("cursedcandle", 50, literal({ shards: 2500 }), "Cursed Candles light the Blackmaw's hall. Snuff them out!", "Dark in there now. Good."),
        collect("oldbone", 4000, literal({ gold: 60 }), "Stack the skeleton bones by the gate. Let the Blackmaw see what's coming.", "That'll make him think twice."),
      ],
    }),
    literal({
      chest: literal({ hero: true, gold: 50, cards: 50, gold_if_owned: 200 }),
      quests: [
        defeat("kill6-3-4", 2, literal({ gold: 100 }), "There he is. The Blackmaw, on his black throne. Knock him off it - twice!", "He's down! The keep is ours!"),
        collect("knightcrest", 60, literal({ cards: 40 }), "Bring me the Black Knights' crests. We'll hang them in the great hall.", "Looks grand. Very grand."),
        defeat("kill6-3-3", 30, literal({ xp: 800 }), "The Black Knights are rallying round the throne. Break them, and the keep is ours for good!", "Broken and scattered. The keep is ours! And there's someone at the gate who wants to meet you..."),
      ],
    }),
  ],
}));
// The threat events: What Sleeps in Titans Well, The Midnight Carnival and
// The Longest Night. A town sends for help and the party fights its way to the
// thing behind the trouble. Each is an enemy event built on the Blackmaw's
// part 1: the same quests at the same goals and rewards, asking for the drop
// or the enemies in the same place of its own map, in its own quest-giver's
// words. Their lines: Warden Holt, Constable Vane and Elder Osric.
const TITANSWELL_LINES: any = literal({
  soddencoin: [
    ["The drowned still carry the coins they died with. Bring them back - the widows want something to bury.", "The widows will not thank you, so I will."],
    ["Those are Greywater men walking out of the surf, with their last wages still in their pockets. Put them down and bring the silver home.", "Their families will eat this winter."],
    ["Every Sodden Coin came out of the pocket of a man I signed onto a boat. Lay the drowned to rest and bring me what they carried.", "I knew some of these faces, and I thank you for ending it."],
    ["The dead keep walking up the beach towards their own front doors. Stop them, and take the salt-black silver off them.", "The doors stayed shut tonight."],
  ],
  drownedcharm: [
    ["Every fisher here carves a charm before their first voyage, and the drowned are still wearing theirs. Cut them free and bring the charms home.", "A charm comes home even when its owner cannot."],
    ["Their mothers carved those bone fish to bring them home safe. Bring the Drowned Charms back, at least.", "Some of them came home after all."],
    ["The charms did not save them from the sea. Put the drowned down and bring the charms to the chapel.", "The chaplain has hung every one by the door."],
    ["A drowned man in the surf with his luck still round his neck. Finish it, and bring the charm to his family.", "He will not walk again."],
  ],
  horrorclaw: [
    ["Crabs the size of carts are coming up the slipway and dragging off anything that moves. Break them and bring me the claws.", "That is one less thing on the slipway."],
    ["The Pincer Horrors cut through boat hulls like bread. Take the claws off them before they start on the houses.", "The houses stand, for now."],
    ["Those claws have closed on three of my wardens this week. Break them.", "That is something to tell their families."],
    ["The things climbing out of the deep wear armour no blade was made for. Find the gap and take the claw.", "Good - now the town knows they can die."],
  ],
  shellplate: [
    ["Pincer Horror shell turns a blade better than steel. Crack it off them - the smith can make shields for the harbour wall.", "The wall will have shields by morning."],
    ["If the sea sends us armour, we will wear it. Bring me Shell Plates.", "It stinks, but it holds."],
    ["My wardens are holding the slipway with oars and boat-hooks. Strip the shells off the horrors and give them something better.", "They will stand a little longer now."],
    ["Those shells carry barnacles from depths no boat has ever reached. Bring them here - I want to know where these things are coming from.", "Deeper than any chart goes, and that frightens me."],
  ],
  ghoultooth: [
    ["Brine Ghouls wait under the jetty and drag down whoever walks it. Pull their teeth.", "The jetty is safe to walk again."],
    ["A ghoul took a girl off the rocks at dusk, in sight of her mother. Make the rest of them pay.", "It does not bring her back, but it helps."],
    ["Needle teeth, webbed hands, and they laugh as they pull you under. Bring me the teeth so the town knows they can die.", "The town has seen them, and sleeps a little easier."],
    ["The ghouls come up with the tide every night. Meet them at the waterline.", "The tide came in and nothing came with it."],
  ],
  kelpshroud: [
    ["The ghouls wear burial shrouds woven of kelp - the ones we wrapped our dead in. Take them back.", "We will bury them again, deeper."],
    ["Burial shrouds, stolen from our sea-graves by the Brine Ghouls. Take them off the ghouls.", "The chaplain will say the words twice this time."],
    ["We sink our dead at sea in kelp shrouds, as our grandmothers did, and the ghouls have been wearing them. End that.", "Some customs are worth fighting for."],
    ["Brine Ghouls drag our shrouds behind them through the surf like trophies. Take every one.", "They are ours again."],
  ],
  deepscale: [
    ["The deep-folk climb the wrecks to pick off survivors. Bring me their scales so I know what we are dealing with.", "Fish-men, so my grandmother's stories were true."],
    ["Deep-Folk Raiders came over the harbour wall last night with spears and nets. Cut them down on the reefs before they come again.", "They will think twice before climbing that wall."],
    ["Their scales are hard as horn and slick as oil. Take them anyway.", "Hard to cut, but not impossible."],
    ["There were men still alive on those wrecks when the raiders reached them. Make the reefs a place the deep-folk fear.", "Let them learn fear."],
  ],
  coralspear: [
    ["Deep-Folk Raiders hunt with spears of red coral, and they do not miss twice. Take the spears off them.", "One fewer spear pointed at Greywater."],
    ["Every Coral Spear you take is one that will not be thrown at a fishing boat. Disarm them.", "The boats can go a little further out."],
    ["That coral grows nowhere near our coast. Bring the spears in and let me see how far these raiders have come.", "Further than I would like."],
    ["The raiders broke two of my wardens' shields with those spears. Break the spears.", "Broken, every one."],
  ],
  eelhide: [
    ["Wreck Eels nest in the broken hulls and take anyone who climbs aboard. Cut them out.", "The hulls are quiet now."],
    ["An eel as long as a mast took a whole rowing boat under. Bring me its hide, and its kin's.", "Hang the hides where the town can see them."],
    ["Every warden who walks the wrecks needs boots that keep the sea out, and eel hide does. Take it from the Wreck Eels.", "The cobbler is working through the night."],
    ["The eels have been feeding off our wrecks for weeks. It is time something hunted them.", "Let them be the hunted for once."],
  ],
  eelfang: [
    ["Eel fangs are hooked so whatever they bite cannot pull free. Pull them free.", "Let them see how it feels."],
    ["A Wreck Eel holds a man under until he stops struggling. Draw its fangs.", "No more men held under."],
    ["The fishers want eel fangs for their hooks. It seems fitting - take them.", "Fitting enough."],
    ["Two hooked fangs on every eel, and every one of them has held someone under. Take them.", "Held no longer."],
  ],
  bonefetish: [
    ["The deep-folk shamans hang fetishes on the wrecks to call something up from below. Tear them down.", "Whatever they were calling did not answer."],
    ["Fish bones and shells, bound in black cord - they mean nothing to me and everything to the shamans. Take them.", "We burned them on the beach."],
    ["The shamans are praying, and I do not want to find out what answers. Break up their rites.", "The chanting has stopped."],
    ["Bone Fetishes are turning up on our own doorsteps, so the shamans have been in Greywater. Hunt them on the reefs.", "Let them pray on someone else's coast."],
  ],
  abyssink: [
    ["The shamans write their prayers in ink that glows under the water. Take it from them before they finish writing.", "Corked and locked away."],
    ["Abyss Ink comes from something very old and very large. Bring me every vial - I want none of it left on the reefs.", "The chaplain will not touch it, and neither will I."],
    ["The shamans paint the Well's eye on the wrecks in that black-green ink. Take it from them.", "The eyes are fading."],
    ["One drop of Abyss Ink on a hull and the boat goes down within the week. Seize it.", "Our boats stay afloat."],
  ],
  spawnichor: [
    ["The Well is breeding things and sending them up. Kill the spawn before they reach the shore.", "None reached the shore."],
    ["Abyssal Spawn crawl out of the water faster than we can count. Thin them out.", "Fewer than before, and that is a start."],
    ["The spawn glow under the water like drowned lanterns. Put them out.", "The water is dark again."],
    ["Their ichor eats through rope and wood alike. Bottle it, and keep it away from my boats.", "Sealed, and kept well away from the boats."],
  ],
  abyssglass: [
    ["The spawn carry shards of glowing black glass from the bottom of the Well. Take them.", "It is warm to the touch, and I do not like it."],
    ["Abyss Glass comes from the floor of the Well, where nothing should live. Bring it up and let us see it.", "It shows only the dark, looking back."],
    ["Every shard of Abyss Glass is a piece of the Well's floor. Take it out of the spawn's reach.", "The Well is a little poorer."],
    ["The fishers say the glass hums at night. Take it from the spawn before it gets into anyone's head.", "Buried in the chapel yard, under stone."],
  ],
  tentaclehook: [
    ["The Well's tentacles have a hook in every sucker, and they drag boats under by them. Tear the hooks out.", "Let it reach for us with nothing to hold."],
    ["A tentacle as thick as a tower rose out of the Well and took a boat with all hands. Make it pay.", "That is a start on what it owes."],
    ["When the tentacles rise, cut them. Bring me the hooks as proof they can be cut.", "They can be cut, then."],
    ["Those hooks have torn the bottoms out of half our fleet. Take them.", "The shipwrights will want to see these."],
  ],
  suckerpearl: [
    ["The tentacles carry pearls in their suckers, and the deep-folk worship them. Take them.", "Taken from the Well's own grip."],
    ["Sucker Pearls are the Well's tithe, taken from every ship it drags down. Take them back.", "Greywater will rebuild its boats with them."],
    ["There are pearls in those suckers, glossy as eyes. Take them before the priests do.", "The priests will go without."],
    ["Every pearl is something the Well holds dear. Take them all, and make it angry.", "Let it wake angry, and find us waiting."],
  ],
  drownedidol: [
    ["Priests of the Deep carry idols of the thing below, and the drowned kneel to them. Smash their faith.", "Broken stone, and nothing more."],
    ["The priests were Greywater men once, and they chose the Well. Take their idols away.", "They chose wrong."],
    ["Black stone idols of a many-armed thing. Bring them here and we will throw them in the smithy furnace.", "They cracked in the fire like anything else."],
    ["Every idol is a prayer to the Maw. Silence the priests and take their idols.", "The prayers have stopped."],
  ],
  deepsigil: [
    ["The priests wear bronze sigils of the Well's eye, and while they wear them the Maw hears them. Take them.", "Let it listen to silence."],
    ["I knew some of the men under those masks. Take the sigils off them - I will not have them buried with that eye.", "They will be buried as Greywater men."],
    ["The eye on those medallions is the eye of the Maw itself. Close it.", "The eye is closed."],
    ["Priests of the Deep hold up their sigils when they call the tide. Take them before the tide answers.", "The tide stayed where it was."],
  ],
  kill: [
    ["There are more of them coming out of the water. Meet them before they reach the town.", "Nothing got past."],
    ["My wardens cannot hold another night alone. Clear the way for them.", "My wardens thank you."],
    ["Every one you put down is one fewer at our doors. Go to work.", "Our doors held."],
    ["The sea keeps sending them. Keep sending them back.", "Back where they belong."],
  ],
  boss: [
    ["Something out there leads them. Find it and end it.", "It is done, and the whole town will hear of it."],
    ["Everything that comes out of the water answers to something. Go and face it.", "One less master for the drowned."],
    ["It has killed better fighters than any of us. Be better than them.", "You were."],
    ["It has come back before. Make sure it does not come back again.", "Let it stay down this time."],
  ],
  send: [
    ["Only a hero can stand against what is out there. Send me your best.", "With someone like that at the front, we have a chance."],
    ["My wardens hold the line, but they cannot lead it. Send a hero to the front.", "The wardens took heart when they saw who you sent."],
    ["I need someone at the front who will not run when the water rises. Send a hero.", "Steady as stone."],
    ["The front needs a fighter, not a fisher. Send a hero.", "They went in without looking back."],
  ],
  unlock: [
    ["We have its trophy now. Use it to push further out, where the boats stopped coming back from.", "Further out than any warden has gone in a year."],
    ["The way on is open, if you are willing to take it. I will hold the town.", "Go carefully - I mean it."],
    ["Take the trophy and go further in. Whatever is behind all this is out there.", "Closer now."],
    ["Every step further in is a step the dead will not take towards us. Push on.", "The line moves out to sea."],
  ],
});
const TITANSWELL_PART1: any = [
  ["I am Maren Holt, warden of Greywater. The drowned walk out of the surf at night - put them down, and bring back the coins they died with so the widows have something to bury.", "You came, and you stayed - that is more than most."],
  ["Something has driven the crabs of the deep up onto our beaches, and they are the size of carts. Break them before they reach the net sheds.", "Something is driving them up from below, and I want to know what."],
  ["Captain Hask went down with his ship a month ago, and now he walks the shore with a green lantern and the dead follow it. Put him down.", "His lantern still burns, and it points out to the reefs."],
  ["The drowned have stopped coming in waves, but they still come. Bring back their charms - every family in Greywater will know whose son is home.", "The chapel has a name for every charm."],
  ["The Brine Ghouls are bolder now that the Captain is gone, and they took two net-menders off the rocks last night. Pull their teeth.", "The net-menders are avenged, which is not the same as saved."],
  ["Hask's lantern burns towards the Wreck Reefs, where half our fleet lies broken. Follow it out.", "You are the first to walk the reefs since spring."],
  ["There are fish-men on the wrecks - deep-folk, my grandmother called them. Find out how many, and thin them.", "So the old stories were true."],
  ["While you were out on the reefs, the ghouls came back to the shore in numbers. Go back and drive them into the sea.", "The shore is ours again."],
  ["The deep-folk are massing on the biggest wreck on the reefs. Put a hero at the front and hold them there.", "They held, and the deep-folk broke first."],
  ["Nell Hookline, the only fisher who ever hooked the thing below and lived, says the eels are guarding the reefs for something. Cut through them and find out what.", "Nell was right, and she does not look happy about it."],
  ["The Pincer Horrors are back on the slipway, and Nell wants their shells for a hull that can take a reef. Strip them.", "Nell is building something, and she will not say what."],
  ["There is a hag on the wrecks who trades with the drowned - she bought Hask's crew from the sea, and ours with them. Face her.", "Before she sank, she laughed and said the Maw is waking."],
  ["The Hag's death has stirred the drowned again, and they are walking up the beach by the hundred. Hold the shore and bring their coins home.", "The widows' table is covered in silver, and they would trade it all."],
  ["Nell says the Maw is the thing she hooked twenty years ago, and the eels are its teeth on the reefs. Draw them.", "Nell says the Maw will feel that."],
  ["The shamans have doubled their rites since the Hag fell, and whatever they are calling is close to answering. Break them.", "The chanting stopped, but the sea has not calmed."],
  ["The shamans have been marking a path in Abyss Ink, wreck to wreck, out to the open sea. Take their ink and follow it.", "The path ends at a whirlpool where no whirlpool should be."],
  ["The deep-folk are pouring off the reefs to stop us following that path. Cut through them.", "The path is clear, even if the sea is not."],
  ["The Hag's eye sees to the bottom of the Well. Take it and go to the Well's Mouth - Nell will row you to the edge.", "You are standing where Nell lost her boat twenty years ago."],
  ["The Well is spewing things out of its mouth faster than the tide. Kill the spawn before they swim for Greywater.", "Nothing swam for Greywater tonight."],
  ["The shamans have rallied on the reefs behind you, singing to the Well. Go back and end their singing.", "Silence on the reefs at last."],
  ["The eels are coming off the reefs in a flood, as if something has called them home. Stop them before they reach the harbour.", "The harbour stands."],
  ["The Maw is reaching out of the Well now, and it took the lightship with all three keepers. Cut its reach short.", "It felt that - the whole sea shuddered."],
  ["Nell says the glowing glass is the Maw's eyes, scattered through its spawn. Take every shard and let it go blind.", "It is reaching blind now."],
  ["The Hag has come back up from the reefs, and the drowned are with her again. Put her down for good this time.", "She stays down, and the drowned stopped walking the moment she fell."],
  ["Priests of the Deep stand at the Well's rim, Greywater men who drowned and chose to stay. Take their idols and break their faith.", "I knew one of the priests by name."],
  ["Nell says the Maw hoards the pearls of every ship it sinks. Take them from its tentacles and let it know what loss is.", "Something has started to rise."],
  ["Every ghoul on the coast has come ashore at once, and the harbour wall is all that stands between them and the houses. Hold it.", "The wall held, and so did we."],
  ["The Maw is awake and rising from the Well. Nell is going in with you - finish what she started twenty years ago.", "It is sinking, and Nell watched it go without a word."],
  ["The priests are trying to call the Maw back up. Tear the sigils from them and close its eye for good.", "The eye is shut, and the sea is just the sea again."],
  ["The last of the priests are on the rim, holding the Well open. End them and let it close.", "The Well sleeps, the boats are going out, and Nell Hookline wants to come with you."],
];
const MIDNIGHT_LINES: any = literal({
  paintedmask: [
    ["The barkers wear porcelain faces and call people in by name. Break the masks and see what is underneath.", "Nothing was underneath - nothing at all."],
    ["Every Painted Mask is a smile that lured someone from Hollowmere through that arch. Take them.", "No one else gets called in tonight."],
    ["An old widow heard her dead husband calling from behind a mask, and she nearly went in. Stop the barkers.", "She is home, behind a locked door."],
    ["The barkers' masks keep smiling even as they fall. Take them anyway - I want them gone from the Midway.", "They have stopped smiling."],
  ],
  riggeddice: [
    ["The barkers play dice for your name, and their dice only show sixes. Take them.", "No more wagers on people."],
    ["Three lads from the mill lost a game to the barkers and did not come home. Take the dice that cheated them.", "Those dice will cheat no one again."],
    ["A game you cannot win is not a game, it is a trap. Seize the Rigged Dice.", "The trap is sprung, and empty."],
    ["Every time the barkers roll those bone dice, someone in Hollowmere forgets their own name. Take them.", "A mother remembered her daughter's name this morning."],
  ],
  faderibbon: [
    ["The stilt-walkers trail ribbons from the arch, and children follow them in. Cut the ribbons down.", "No child followed anything tonight."],
    ["My son tied a ribbon like that to his wrist the night before he went. Take them from the stilt-walkers.", "I keep looking for his among them."],
    ["The Stilt-Walkers bend down out of the dark and tie ribbons on the ones they choose. Take them before they choose again.", "No one was chosen tonight."],
    ["Faded ribbons hang from every booth, and every one marks someone taken. Bring them to me.", "Each one has a name now - I made sure."],
  ],
  brasswhistle: [
    ["When a stilt-walker blows its whistle, the whole Midway turns to look. Take the whistles and they hunt blind.", "Silence on the Midway."],
    ["Those brass whistles carried over the town all last night, calling. Take them.", "Hollowmere slept, for once."],
    ["The whistles call the stilt-walkers together. Take them before they gather above you.", "They came one at a time, and fell one at a time."],
    ["Every child in Hollowmere has heard those whistles in their sleep. Take them off the stilt-walkers.", "The children slept through the night."],
  ],
  puppetstring: [
    ["The puppets walk with their strings cut, but something is still pulling them. Take the strings.", "Whatever was pulling them felt that."],
    ["Living Puppets drag people into the booths by their wrists. Cut them down and bring me the strings.", "The booths are empty now."],
    ["The puppets are wearing clothes I recognise from the town. Cut them loose.", "I will give the clothes back to the families."],
    ["Those strings tie every puppet to something in the dark. Cut them.", "Cut, and the dark is a little emptier."],
  ],
  glasseye: [
    ["The puppets see with glass eyes, and what they see, the carnival sees. Put them out.", "The carnival is a little blinder."],
    ["Glass Eyes stare from every booth on the road into town. Take them so they stop watching.", "Nothing watches the road tonight but my own constables."],
    ["One of the puppets has eyes the same blue as my son's. I need to know - bring me the eyes.", "Only glass, thank the gods."],
    ["The puppets' glass eyes follow you even after they fall. Take them, and we will bury them.", "Buried, and still I feel watched."],
  ],
  fireoil: [
    ["The fire-eaters breathe a green-white fire that burns cold and never goes out. Take their oil.", "Their fire is out."],
    ["If that fire reaches Hollowmere's thatch, there will be no town left to save. Take the Fire Oil.", "The thatch is safe."],
    ["The fire-eaters drink the oil and breathe it out at anyone who comes near the ring. Take it from them.", "Corked and buried in the churchyard."],
    ["The Big Top's light comes from that oil, and it is no honest flame. Seize it.", "The tent is darker, and better for it."],
  ],
  charredtorch: [
    ["The fire-eaters light their torches from something burning under the Big Top. Put them out.", "Snuffed, every one."],
    ["Those torches lit the way for everyone who walked into the Big Top. Take them.", "No more lights on that road."],
    ["The Fire-Eaters swing their torches at anyone who tries to leave the show. Take them.", "Now people can leave."],
    ["I want every Charred Torch out of their hands and into the river. Go.", "The river hissed for an hour."],
  ],
  throwingknife: [
    ["The knife-throwers never miss - that is the act. Make them miss once.", "Once was enough."],
    ["Every Throwing Knife in the Big Top is meant for someone from Hollowmere. Take them.", "Not one of them landed."],
    ["The knife-throwers pin the audience to their seats so no one leaves before the end. Disarm them.", "The seats are empty, and the audience walked home."],
    ["They throw blindfolded and never miss. Get close and take the knives off them.", "Close enough, then."],
  ],
  velvetblindfold: [
    ["The knife-throwers wear blindfolds because they do not need eyes. Take them anyway, and let them see what is coming.", "They saw it coming."],
    ["They tie velvet blindfolds over the eyes of the ones they take. Bring every one out.", "No more blind walks into the dark."],
    ["My deputy came back from the Big Top wearing one of those blindfolds and has not spoken since. Take every one.", "He spoke this morning - one word, but he spoke."],
    ["Crimson velvet, soft as a promise. Take the blindfolds off the knife-throwers and burn them.", "Burnt, and the smoke smelled wrong."],
  ],
  shadowfur: [
    ["The beast-act is hounds made of smoke, and they track by scent. Run them down.", "The pack is thinning."],
    ["Shadow hounds came through Hollowmere last night, sniffing at doors. Bring me their fur as proof they can be stopped.", "They can be stopped."],
    ["Their fur drifts like smoke even after they fall. Gather it before it finds its way home.", "Sealed in iron, where it cannot drift."],
    ["The Shadow Hounds herd people back into the tent when they try to run. Break the pack.", "The next one who runs will make it."],
  ],
  goldbell: [
    ["Each hound wears a gold bell, and when it rings, the hound has found someone. Take the bells.", "The bells are quiet."],
    ["I have heard those gold bells under my window every night since my son went. Silence them.", "Quiet - I could almost sleep."],
    ["The bells tell the Ringmaster where his hounds are. Cut them loose and he is deaf to them.", "He is listening for bells that will not ring."],
    ["A gold bell for every hound, and a hound for every runaway. Take them.", "No more runaways hunted down."],
  ],
  signedcontract: [
    ["The contracted dead are townsfolk who signed something they never read. Take the contracts off them.", "Some of these names are ours."],
    ["Every Signed Contract is a soul the Ringmaster owns. Take them, and we will see what can be undone.", "The magistrate is reading every line."],
    ["They work the carnival long after they should have died, because a contract says so. Release them.", "Their work is done."],
    ["I found the baker's name on one of those contracts, signed in a hand that was not his. Bring me the rest.", "Every forged name will be answered for."],
  ],
  gravecoin: [
    ["The contracted dead still carry the coins we laid on their eyes. Put them to rest and bring the coins home.", "They will rest properly now."],
    ["The dead carry the coins that should have paid their passage. Put them down and give the coins to the priest.", "The priest has said the words over every one."],
    ["These dead were buried in Hollowmere's churchyard, and their graves stand empty. Bring back their grave coins.", "The graves will be filled again."],
    ["The Ringmaster pays his dead in grave coins. Take his wages back.", "His payroll is shorter tonight."],
  ],
  brassgear: [
    ["The clockwork guards never tire and never sleep. Break them open and take the gears.", "Wound down at last."],
    ["Every Brass Gear you pull is one more guard that will not stand at the wagon's door.", "The door is less guarded."],
    ["Brass soldiers, wound tight and marching. Stop them, gear by gear.", "Still, every one."],
    ["The guards march in step, all of them, as if one heart turns them. Break them apart.", "Silent, every one."],
  ],
  clockheart: [
    ["Every clockwork guard ticks with a brass heart. Stop the hearts.", "The ticking has stopped."],
    ["The Clock Hearts keep time for the whole carnival. Take them and the night might finally end.", "I swear the night is shorter."],
    ["A clockwork heart, ticking down to something. Take them before they reach it.", "Stopped before the hour."],
    ["Somewhere in those brass hearts is the key to every guard in the camp. Pull them out.", "Not one guard will wind again."],
  ],
  shadowsilk: [
    ["The acrobats drop from the dark above on silk that drinks the light. Cut them down.", "The dark above is empty."],
    ["Shadow Silk wraps whatever it falls on and carries it up into the rigging. Take it from the acrobats.", "Nothing taken up tonight."],
    ["The acrobats fly between the wagons on black silk. Bring it down.", "They will not fly again."],
    ["That silk swallows lantern light whole. Take it, and we will see them coming.", "We can see them now."],
  ],
  blackspangle: [
    ["Black spangles fall from the acrobats as they swing. Follow the trail and end them.", "The trail ends here."],
    ["The acrobats glitter black in the dark. Strip the spangles from the fallen.", "They glittered in the fire."],
    ["Every Black Spangle is a scrap of the show. Take them, and let the show end.", "The show is ending."],
    ["The acrobats were travelling folk once, who signed the wrong contract. Free them, and bring me what is left of their costumes.", "We will bury them under their own names."],
  ],
  kill: [
    ["There are more of them between us and the people who went in. Cut through.", "Through, and closer."],
    ["Every one you put down is one fewer standing between me and my son. Go.", "Closer - we are closer."],
    ["The carnival keeps sending its performers out to stop us. Stop them first.", "The performance is over for them."],
    ["They come out of the dark in a line, like an act. End the act.", "The act is over."],
  ],
  boss: [
    ["Something runs this part of the carnival. Find it and take it down.", "Down, and the lanterns dimmed when it fell."],
    ["Every act has a star, and this one has taken our people. Face it.", "The lights went out with it."],
    ["It has taken more of Hollowmere than I can bear to count. Face it.", "It will take no more."],
    ["It wears our town's fear like a costume. Tear it off.", "It is finished, and our fear with it."],
  ],
  send: [
    ["Only a hero can walk into that carnival and walk out again. Send one to the front.", "They walked in with their head up."],
    ["My constables are brave, but they are not heroes. Send me one who is.", "My constables have someone to follow now."],
    ["I need someone at the front who cannot be lured. Send a hero.", "Not lured, not even slowed."],
    ["Put a hero at the front and keep them there - nobody else comes out of there whole.", "The front holds."],
  ],
  unlock: [
    ["The trophy will get you through the next door. Go through it.", "Through, and deeper in."],
    ["Every step further in is a step closer to the ones who were taken. Push on.", "Further in than anyone has gone and come back."],
    ["The way on is open. I will keep the lanterns lit behind you.", "The lanterns are lit - go on."],
    ["Take what you won and push further in. Whatever runs all this is waiting.", "It knows we are coming now."],
  ],
});
const MIDNIGHT_PART1: any = [
  ["I am Edda Vane, constable of Hollowmere. Three nights ago my son Tam walked into a carnival that was not there the day before. Break the barkers' masks - they call people in.", "Nothing behind the masks - nothing at all."],
  ["The stilt-walkers tie ribbons on the ones they mean to take, and Tam came home with one on his wrist the night before he went. Take every ribbon they carry.", "None of them were his, not yet."],
  ["There is a thing in the hall of mirrors that walks out wearing the faces of the ones it took, and last night it wore Tam's face at my window. Face it.", "In the last shard, I saw the Big Top's open door."],
  ["The barkers are still playing dice for names on the Midway. Take the Rigged Dice before anyone else wagers their family.", "Every die shows six, of course."],
  ["The puppets are dragging stragglers off the Midway towards the Big Top. Cut the strings.", "Four came home tonight, and four is something."],
  ["The mirror shard shows the Big Top's door standing open, and the show inside never ends. Take it and go in.", "You are inside, and the music has not stopped."],
  ["The fire-eaters burn a cold fire that never goes out, and it lights the Big Top's ring. Take their oil.", "The ring is darker, and now I can see who sits in the seats."],
  ["While you were inside, the puppets came out onto the road to Hollowmere. Go back and cut them down.", "The road is clear, and so are the doors."],
  ["The ring is the heart of the Big Top, and no one has stood in it and come out. Send a hero to the front.", "They stood in the ring, and the crowd fell silent."],
  ["The knife-throwers have pinned the audience to their seats - townsfolk, all of them, too frightened to move. Take the knives.", "The audience walked out, but Tam was not among them."],
  ["The stilt-walkers are whistling up and down the Midway, calling for help from the tent. Take their whistles.", "Nobody came when they called."],
  ["The Strongman holds the tent up and the doors shut, and he has never been put down. Bring him down.", "Behind him, chained to the tent pole, was a gnome who says he built all of this."],
  ["The gnome is Fizzwick Cogsworth, and he built the carnival's clockwork under a contract he could not break. While he talks, the barkers are calling again - silence them.", "Fizzwick says he made those masks, and he will not look at them."],
  ["Fizzwick says the knife-throwers blindfold the ones they take to the wagon, so they never see the way back. Take the blindfolds.", "Now we will see the way."],
  ["The hounds hunt anyone who tries to leave the Big Top, and Fizzwick says they will hunt him now. Hunt them first.", "Fizzwick is safe, and his hands have stopped shaking."],
  ["The bells on the hounds tell the Ringmaster where everyone is, and Fizzwick wants them silent before we move. Take them.", "The Ringmaster is listening to nothing."],
  ["The fire-eaters are trying to burn the Big Top down around us to hide the way to the wagon. Take every drop of their oil.", "The tent still stands, and so do we."],
  ["The Strongman's chain fits the lock on the Ringmaster's Wagon - Fizzwick made both. Open it.", "Fizzwick says the contracts are in there, and so are the people."],
  ["The dead around the wagon are Hollowmere folk, still working under contracts they signed with their last breath. Take the contracts and let them rest.", "Tam's name is on one of them, and it is not signed."],
  ["The hounds have come back to the Big Top, hunting the people we freed. Go back and break the pack.", "Everyone we freed made it out."],
  ["The knife-throwers are covering the road to the wagon, and Fizzwick says they have a knife for each of us. Take them all.", "They ran out of knives before we ran out of nerve."],
  ["The clockwork guards are Fizzwick's work, and he knows where to strike them. Break them open.", "Fizzwick says he will never build another."],
  ["The Ringmaster pays his dead in grave coins stolen from our churchyard. Take them back.", "Every coin back on its grave."],
  ["The Strongman has risen again and stands at the wagon door with his chains. Put him down for good.", "He will not rise again, and the door stands open."],
  ["The acrobats are carrying people up into the dark above the wagon. Cut down their silk.", "Everyone who was carried up came down alive."],
  ["Fizzwick says the clock hearts keep the carnival's night going - stop them all and dawn will come. Do it.", "The sky is grey in the east for the first time in a week."],
  ["With dawn coming, every puppet on the Midway is marching on Hollowmere at once. Hold the road.", "The road held, and Hollowmere is still there."],
  ["The Ringmaster is in his wagon with Tam's contract in his hand, waiting for my son to sign it. Face him.", "His contract is ash, and my son is coming home."],
  ["The acrobats are all that is left of the show, and they are trying to drag the wagon off into the dark. Bring them down.", "The wagon stays."],
  ["The last of the acrobats are fighting to keep the carnival standing. End them, and let it vanish.", "The carnival is gone with the dawn, Tam is home, and Fizzwick wants to come with you."],
];
const LONGNIGHT_LINES: any = literal({
  winterpelt: [
    ["The winter wolves run with the raiders and pull down anyone on the pass. Take their pelts - the raiders left Fernhold nothing to keep warm by.", "The cold will not take anyone tonight."],
    ["Wolves on the pass, howling outside our doors. Thin the pack and bring the pelts down.", "The howling is further off."],
    ["Every Winter Pelt is a cloak for a family whose woodpile the raiders took. Bring them.", "The families are warm tonight."],
    ["The wolves wear raider collars. Kill them and bring their pelts down as proof the mountain can be fought.", "It can be fought."],
  ],
  wolffang: [
    ["Those wolves took the shepherd's dog, and then the shepherd. Draw their fangs.", "He would have wanted that."],
    ["The fathers of Fernhold want wolf fangs to wear when they go up the mountain. Take them.", "They wear them now."],
    ["The wolves have learned the way to our doors. Take their fangs before they teach it to their young.", "No pup will learn it now."],
    ["The raiders set the wolves on anyone who follows. Draw their teeth and follow anyway.", "Followed, and still standing."],
  ],
  goblinknife: [
    ["Frost goblins crept in with the raiders and cut every rope and harness in the village. Take their knives.", "The harnesses are being mended."],
    ["Goblin Knives are ice-steel, crude and cruel. Take them off the goblins before they come back.", "Let them come back with bare hands."],
    ["The goblins still carry the knives they held to our children. Take every one.", "Every one, and thrown in the forge."],
    ["Those little ice-blades did more harm on midwinter's eve than any axe. Take them.", "Melted down for nails."],
  ],
  stolengift: [
    ["The goblins carried off the children's midwinter gifts along with the children. Bring the gifts back - they will be waiting when the children come home.", "Under the tree, where they belong."],
    ["Every family in Fernhold had something wrapped for midwinter, and the goblins have it all. Take it back.", "Some are torn, but they are ours."],
    ["A Stolen Gift in a goblin's sack is a promise a father made to his child. Keep the promise.", "The promise is kept."],
    ["The goblins tear the gifts open and leave them in the snow. Bring back what you can.", "We will mend what they tore."],
  ],
  raiderfur: [
    ["The raider scouts move in white furs so the snow hides them. Strip the furs and they have nowhere to hide.", "Nowhere to hide now."],
    ["Scouts watch Fernhold from the ridges day and night. Put them down and bring their furs.", "The ridges are empty."],
    ["They wear white so they can stand at the edge of the village and not be seen. Take their furs.", "We can see the treeline again."],
    ["The scouts took our winter furs off our own backs. Take theirs.", "A fair trade, Fernhold says."],
  ],
  frostrune: [
    ["The scouts carry rune-stones that call the snow down on whoever follows them. Take the stones.", "The snow stopped falling."],
    ["Frost Runes glow on the stones the scouts carry, and the cold comes with them. Take the stones and break the cold.", "The cold has eased."],
    ["Every rune-stone a scout drops, the pass closes behind it. Take them and keep the way open.", "The way stays open."],
    ["Old magic, older than Fernhold. Take the Frost Runes from the scouts before they finish whatever they are writing in the snow.", "Unfinished, and it will stay that way."],
  ],
  wraithfrost: [
    ["The ice wraiths drift through the Frozen Wood and freeze the breath in your chest. Break them.", "The wood is warmer."],
    ["Wraith Frost seeps from the wraiths when they fall. Gather it before it finds someone else.", "Sealed in a jar and buried in hearth ash."],
    ["The wraiths follow the children's tracks and smooth them away. Stop them.", "The tracks are clear again."],
    ["The cold in that wood has a hunger, and it wears a shape. Put it down.", "Only cold now, and cold we can bear."],
  ],
  frozentear: [
    ["The wraiths weep tears that freeze before they fall, and some say they were lost travellers once. Free them.", "Free, and at rest."],
    ["Frozen Tears lie all through the wood where the wraiths have passed. Take them from the wraiths before they weep more.", "No more tears in the snow."],
    ["The wraiths weep for what they were. Give them an end.", "An end, and a kind one."],
    ["My wife says every frozen tear is a soul the mountain kept. Bring them home and we will thaw them by the fire.", "They melted, and the room felt lighter."],
  ],
  trollhide: [
    ["Snow trolls sleep under the drifts and wake when something walks over them. Something has to, so let it be you.", "They will not wake again."],
    ["Troll hide keeps out any cold, and our children are up there without coats. Bring the hides.", "Coats, for when the children come down."],
    ["A snow troll burst out of a drift and took the woodcutter's cart, horse and all. Hunt them down.", "The woodcutter has his answer."],
    ["The trolls guard the path through the wood for the Huntsman. Cut through them.", "The path is open."],
  ],
  trolltusk: [
    ["Troll Tusks are thick as a man's arm. Take them, and the trolls will think twice.", "They will not think at all, now."],
    ["The trolls broke down the byre doors on midwinter's eve and took our cattle. Take their tusks.", "Not the cattle back, but something."],
    ["The smith wants troll tusks for spearheads to take up the mountain. Bring them.", "The smith is hammering already."],
    ["A troll's tusk nailed over the hall door says Fernhold fights back. Bring them.", "The door is crowded with them."],
  ],
  houndcollar: [
    ["The Huntsman's hounds were bred in the ice to track children. Take their collars, and break the leash.", "No more hounds on the children's trail."],
    ["Spiked iron collars, every one stamped with the Winter King's mark. Take them off the hounds.", "Thrown in the river, mark and all."],
    ["Those hounds have the scent of every child in Fernhold. Take them off the trail.", "The trail has gone cold for them."],
    ["The Huntsman sends his hounds ahead of him. Kill them and he hunts alone.", "He hunts alone now."],
  ],
  childsmitten: [
    ["The hounds keep the mittens they find in the snow, like trophies. Take them back - their mothers want them.", "Their mothers knew every one."],
    ["Every Children's Mitten in that wood means a child went that way. Bring them, and we will know where they were taken.", "They lead up, always up."],
    ["Little red mittens, knitted by the fire for midwinter. Take them off the hounds.", "They will be warm again."],
    ["One small mitten in a hound's jaws. Take it back, and every one like it.", "The mothers are sorting them by stitch."],
  ],
  rimeiron: [
    ["The frost giants wear armour forged in the glacier's cold. Break it.", "Broken, like any other iron."],
    ["Rime Iron does not rust and does not warm. Take it from the giants, and the smith will forge something that can kill them.", "The smith says it fights her hammer."],
    ["The giants stand at every gate in the hall. Break their armour and their ranks.", "The gates are open."],
    ["Our children are behind giants clad in Rime Iron. Get through.", "Through, and closer to the children."],
  ],
  giantsring: [
    ["Frost giants wear rings big enough for a man's arm. Take them, and remember that giants can fall.", "They fall like trees."],
    ["The giants' silver rings were the Winter King's gifts. Take them, and let him see what his gifts are worth.", "Worth nothing to the dead."],
    ["Each giant wears a ring for every village it has robbed. Take the rings.", "Fernhold will be the last."],
    ["A Giant's Ring is heavy enough to drown in. Take them anyway.", "Heavy, but we will carry them."],
  ],
  glacierheart: [
    ["The ice golems are glacier carved into soldiers, with a blue heart driving each one. Take the hearts.", "The golems are just ice now."],
    ["Glacier Hearts glow in the golems' chests like lanterns. Put them out.", "Dark, and still."],
    ["The priests carved the golems from the glacier and gave them orders. Take the hearts and the orders die with them.", "No more orders, no more golems."],
    ["A golem's heart is colder than anything on the mountain. Take them before they freeze the hall solid.", "The fires can be lit."],
  ],
  rimeshard: [
    ["Ice golems shed shards sharp enough to cut through mail. Take them out of the fight.", "Gathered and buried in the snow."],
    ["Rime Shards cover the floor wherever golems have fallen. Clear the way.", "The way is clear."],
    ["Those shards are the glacier itself, and the glacier is the Winter King's. Take them.", "Taken, and melting."],
    ["The golems hurl their own ice at us. Break them before they throw again.", "Not one more thrown."],
  ],
  winterrune: [
    ["The priests of winter carve runes to make the night last forever. Take the runes and break the prayer.", "The prayer is broken."],
    ["Every Winter Rune is a word in a spell to stop the dawn. Take them.", "The spell is missing words."],
    ["The priests pray for a night without end. Take their runes and answer them with steel.", "Answered."],
    ["Bone tablets, blue runes, cold prayers. Take them from the priests before the night settles in for good.", "The night has not settled yet."],
  ],
  frozencandle: [
    ["The priests freeze candles in ice, flame and all, and every one is a midwinter light stolen from a home. Bring them back.", "The lights are coming home."],
    ["Frozen Candles still burn inside the ice. Take them from the priests and we will thaw them in Fernhold's hearths.", "Fernhold's windows are lit."],
    ["The priests keep our candles to keep our hope. Take them back.", "Hope, back in our hands."],
    ["A candle in the ice is a light the priests mean to keep from us. Take them.", "Lit, and in the windows."],
  ],
  kill: [
    ["There are more of them between us and the children. Cut through.", "Through, and climbing."],
    ["The mountain keeps sending its creatures down at us. Send them back.", "They will not come down again."],
    ["Every one you put down is one fewer guarding the children. Go.", "Fewer guards, and closer."],
    ["The night is long and they are many. Meet them anyway.", "Met, and broken."],
  ],
  boss: [
    ["Something leads them up there. Find it and bring it down.", "Fernhold will sing about this."],
    ["It has taken from Fernhold, and it will take more. Face it.", "It will take nothing more."],
    ["It stands between us and the children. Move it.", "Moved."],
    ["It thinks the mountain is its own. Show it otherwise.", "The mountain is quieter."],
  ],
  send: [
    ["Only a hero can stand in the snow up there and not be swallowed. Send one to the front.", "They stood, and the line did not break."],
    ["Fernhold's men are farmers and woodcutters. Send a hero to lead them.", "The men follow gladly."],
    ["Put a hero at the front, where the cold bites hardest.", "The cold did not stop them."],
    ["Our children cannot wait for a farmer to learn the sword. Send a hero.", "They went up without a word."],
  ],
  unlock: [
    ["The trophy you won opens the way on. Take it and climb.", "Higher, and colder."],
    ["The children are further up the mountain. Follow them.", "The tracks go on."],
    ["The way on is open, and Fernhold will keep the fires burning behind you.", "The fires are burning, and you are climbing."],
    ["Push further in - every step is a step closer to bringing them home.", "Closer now."],
  ],
});
const LONGNIGHT_PART1: any = [
  ["I am Osric, elder of Fernhold. On midwinter's eve raiders took our stores and our children. Their wolves still run on the pass - kill them, and bring the pelts down so we do not freeze.", "You came - I did not know if anyone would."],
  ["The frost goblins went into every house on midwinter's eve and held their knives to whoever stood in the way. Take those knives.", "Melted down, and the forge is lit."],
  ["The Raider Chief carried our stores up the pass himself and laughed as he went. Bring him down.", "He laughed as he fell, and said the children were never his."],
  ["With the chief dead, his wolves have turned wild and come down to the village walls. Draw their fangs.", "The walls are quiet."],
  ["Barnaby Hearth has opened his inn to the homeless, and will hold the feast there when the children are back. Clear the scouts off the ridge above his roof.", "Barnaby says the feast will wait as long as it must."],
  ["The Raider Chief's horn will open the way into the Frozen Wood, and the scouts say the children were taken through it. Sound it, and go in.", "Barnaby has taken down his axe, and he is going up the mountain with you."],
  ["The wraiths of the Frozen Wood drift over the children's tracks and freeze them away. Break them before the trail is lost.", "Barnaby found a small footprint in the snow, still fresh."],
  ["The scouts have closed the pass behind you, cutting the wood off from Fernhold. Go back and open it.", "The pass is open, and the bread wagons can reach you."],
  ["Barnaby says the trees close in where the wood is thickest, and something hunts there. Send a hero to the front.", "Your hero held the front, and Barnaby swears the Huntsman was watching."],
  ["Snow trolls are sleeping across the only path up through the wood. Wake them, and end them.", "The path is clear, and Barnaby wants the hides for the children's beds."],
  ["The goblins that fled the pass are hiding in the wood with the children's gifts. Take them back - Barnaby has a place for them by the inn's hearth.", "They are under the tree at the inn, waiting."],
  ["The Giant's Huntsman hunts what the Winter King wants, and the King wanted our children. Face him.", "He named his master before he fell - the Winter King, in the Giant's Hall."],
  ["The Huntsman's death has set the mountain howling, and the wolves are down on the pass again. Thin them.", "The pass is quiet, and the wagons got through."],
  ["Barnaby wants troll-tusk spears before anyone climbs to the Giant's Hall, and the smith agrees. Take the tusks from the trolls.", "Barnaby has his spears."],
  ["The Huntsman's hounds still have the children's scent, and they are running for the Hall to warn their master. Stop them.", "No hound reached the Hall."],
  ["Barnaby found a red mitten in a hound's jaws and knew his niece's stitching. Bring back every one the hounds are carrying.", "Barnaby has them all in his pack."],
  ["The Winter King has sent his wraiths down the mountain to freeze the wood around you. Break them.", "The wood is still passable."],
  ["The Huntsman's key opens the iron door of the Giant's Hall, and Barnaby has seen the glow of stolen fire behind it. Go in.", "Somewhere deep inside, a child is singing a Fernhold song."],
  ["Frost giants guard the halls in armour of rime iron. Break through them.", "The first hall is ours."],
  ["The Huntsman's hounds have doubled back into the wood, sniffing for the way down to Fernhold. Hunt them.", "Fernhold is safe behind you."],
  ["Trolls have come out of every drift in the wood to cut the path behind you. Clear them, or there is no way home.", "The way home is open."],
  ["The priests have woken ice golems from the glacier walls to bar the inner gate. Take their hearts.", "The inner gate is unguarded."],
  ["The frost giants are massing at the inner gate. Break their line and take their rings as Fernhold's due.", "Fernhold's due is paid, and the gate stands open."],
  ["The Winter King has raised his Huntsman from the snow and sent him to hunt the road home. Put him down for good.", "He stays down, and the road home is clear."],
  ["The priests are carving the runes that will make this night last forever, and the dawn is already late. Break them.", "The runes are broken, but the night still holds."],
  ["The golems' ice has sealed the door to the King's throne. Smash through the shards.", "Through, and the King has seen us."],
  ["The last raiders have come down off the peaks to burn Fernhold while its fighters are away. Hold the pass.", "Fernhold stands, and its fires are still lit."],
  ["The Winter King sits on his throne of ice with Fernhold's fire in his fist and our children at his feet. Face him.", "He has fallen, the fire is ours, and the children are coming home."],
  ["The priests have frozen a candle for every child, to keep them in the Hall forever. Take the candles and free them.", "The candles are lit, and the children are walking out."],
  ["The last of the priests are trying to call the night back down. End them, and let the dawn come.", "The dawn has come, the feast is laid at the inn, and Barnaby Hearth wants to march with you."],
];
// The Blackmaw's 18 row drops in place order, location by location and row
// by row; a later enemy event lists its own in the same order.
const BLACKMAW_DROPS: any = ["ratwhisker", "rustykey", "batear", "batfang", "oldbone", "notchedblade", "spidersilk", "spidereye", "slimejelly", "swallowedcoin", "gravedust", "ironshackle", "imphorn", "brimstone", "wraithwisp", "cursedcandle", "blackplate", "knightcrest"];


// A copy of `base`'s part 1 for another enemy event: every stat moves to the
// event's own map, every drop to the one in the same place, and every quest
// says the event's own lines.
function event_def_now(key: any) {
  for (let e = 1; e <= len(EVENTS); e++) {
    const event = EVENTS[e - 1];
    if (event.key === key) return event;
  }
  return undefined;
}

function retheme(base: any, def: any) {
  const swap: any = {};
  for (let i = 1; i <= len(BLACKMAW_DROPS); i++) { const id = BLACKMAW_DROPS[i - 1]; swap[id] = def.drops[i - 1]; }
  const tiers: any[] = [];
  let n = 0;
  for (let ti = 1; ti <= len(base.tiers); ti++) {
    const tier = base.tiers[ti - 1];
    const quests: any[] = [];
    for (let q = 1; q <= len(tier.quests); q++) {
      const quest = tier.quests[q - 1];
      n = n + 1;
      const sw = swap[quest.stat];
      const stat = t(sw) ? sw : S.gsub(quest.stat, cat("^(%a+)", base.map_id, "%-"), cat("%1", def.map_id, "-"))[0];
      quests[q - 1] = literal({ type: quest.type, stat: stat, goal: quest.goal, reward: quest.reward,
        intro: def.part1[n - 1][0], outro: def.part1[n - 1][1] });
    }
    tiers[ti - 1] = literal({ chest: tier.chest, quests: quests });
  }
  return literal({
    key: def.key, version: def.version, map_id: def.map_id, shards: def.xp, xp_name: def.xp_name,
    hero_id: def.hero_id, npc: def.npc, enemies: true,
    frontier: base.frontier, opens: base.opens, lines: def.lines, tiers: tiers,
  });
}

T.insert(EVENTS, retheme(event_def_now("BLACKMAW"), literal({
  key: "TITANSWELL", version: 1, map_id: 3, hero_id: 8, npc: "Holt",
  xp: "titanswellxp", xp_name: "Warden's Favour",
  drops: [
    "soddencoin", "drownedcharm", "horrorclaw", "shellplate", "ghoultooth", "kelpshroud", "deepscale", "coralspear", "eelhide", "eelfang", "bonefetish", "abyssink", "spawnichor", "abyssglass", "tentaclehook", "suckerpearl", "drownedidol", "deepsigil",
  ],
  lines: TITANSWELL_LINES, part1: TITANSWELL_PART1,
})));

T.insert(EVENTS, retheme(event_def_now("BLACKMAW"), literal({
  key: "MIDNIGHT", version: 1, map_id: 4, hero_id: 10, npc: "Vane",
  xp: "midnightxp", xp_name: "Constable's Favour",
  drops: [
    "paintedmask", "riggeddice", "faderibbon", "brasswhistle", "puppetstring", "glasseye", "fireoil", "charredtorch", "throwingknife", "velvetblindfold", "shadowfur", "goldbell", "signedcontract", "gravecoin", "brassgear", "clockheart", "shadowsilk", "blackspangle",
  ],
  lines: MIDNIGHT_LINES, part1: MIDNIGHT_PART1,
})));

T.insert(EVENTS, retheme(event_def_now("BLACKMAW"), literal({
  key: "LONGNIGHT", version: 1, map_id: 5, hero_id: 16, npc: "Osric",
  xp: "longnightxp", xp_name: "Fernhold's Favour",
  drops: [
    "winterpelt", "wolffang", "goblinknife", "stolengift", "raiderfur", "frostrune", "wraithfrost", "frozentear", "trollhide", "trolltusk", "houndcollar", "childsmitten", "rimeiron", "giantsring", "glacierheart", "rimeshard", "winterrune", "frozencandle",
  ],
  lines: LONGNIGHT_LINES, part1: LONGNIGHT_PART1,
})));

let event_lastcheck: any = 0;
let event_ready = false; // set once start_game has merged the event maps

function event_def(key: any) {
  for (let e = 1; e <= len(EVENTS); e++) {
    const event = EVENTS[e - 1];
    if (event.key === key) return event;
  }
  return undefined;
}

// The run playing now and its event, from the shared schedule.
// The run playing now and its event, from the shared schedule. The world
// map's dev menu can put any event on instead (Stats.DevEvent); the run and
// its end stay the schedule's.
function event_schedule(now: any): [any, any, any] {
  const [run, listed, ends_at] = actions.event_schedule(now);
  const dev = t(defsave.loaded.Stats) ? defsave.get("Stats", "DevEvent") : defsave.loaded.Stats;
  const chosen = event_def(t(dev) ? dev : listed.key);
  return [run, t(chosen) ? chosen : event_def(listed.key), ends_at];
}

function hero_owned(hero_id: any) {
  const hero = t(defsave.loaded.Hero) ? defsave.loaded.Hero.data[hero_id - 1] : defsave.loaded.Hero;
  return !isnil(hero) && !t(hero.Locked);
}

function part_of(chapter: any) { return Math.floor((chapter - 1) / EVENT_PART_CHAPTERS) + 1; }
function place_in_part(chapter: any) { return LM.mod(chapter - 1, EVENT_PART_CHAPTERS) + 1; }
function goal_scale(part: any) { return Math.pow(EVENT_GOAL_GROWTH, part - 1); }
function last_chapter() { return EVENT_PARTS * EVENT_PART_CHAPTERS; }

// Rounds a goal to two figures, the way the written ones read.
function nice(n: number) {
  if (n < 100) return Math.max(5, Math.floor(n / 5 + 0.5) * 5);
  const unit = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.floor(Math.floor(n / unit + 0.5) * unit + 0.5);
}

// A small generator of its own, seeded per chapter, so every player is dealt
// the same chapters and the game's own random numbers are left alone.
function chapter_random(key: any, chapter: any) {
  let seed = chapter * 7919;
  for (let i = 1; i <= strlen(key); i++) seed = LM.mod(seed * 31 + S.byte(key, i)[0], 2147483647);
  if (seed <= 0) seed = seed + 2147483646;
  return function (lo?: any, hi?: any) {
    seed = LM.mod(seed * 16807, 2147483647);
    const r = (seed - 1) / 2147483646;
    if (t(lo)) return lo + Math.floor(r * (hi - lo + 1));
    return r;
  };
}

function scale_reward(reward: any, part: any) {
  const out: any = {};
  for (const [kind, amount] of pairs<any>(reward)) {
    // XP buys card levels, which cost more as the crew grows; gold, cards and
    // shards stay as part 1 has them, so the shards still pace the hires.
    out[kind as any] = kind === "xp" ? nice(amount * Math.sqrt(goal_scale(part))) : amount;
  }
  return out;
}

function event_line(event: any, kind: any, part: any, slot: any, place: any): [any, any] {
  const lines = event.lines[kind];
  const pick = lines[LM.mod((part - 2) * 3 + slot + place, len(lines)) + 1 - 1];
  return [pick[0], pick[1]];
}

function henchman_at(map_id: any, d: any, l: any) {
  for (let h = 1; h <= len(defsave.loaded.Henchmen.data); h++) {
    const henchman = defsave.loaded.Henchmen.data[h - 1];
    if (henchman.map_id === map_id && henchman.dungeon_id === d && henchman.level_id === l) return henchman;
  }
  return undefined;
}

// The icon of a level's first drop, for quests about the level itself.
function level_icon(map_id: any, d: any, l: any) {
  const level = defsave.loaded.Map.data[map_id - 1][d - 1].Levels[l - 1];
  const resource = t(level) && t(level.Loot_Table[0]) ? defsave.loaded.Resources.data[level.Loot_Table[0].Option.Stat] : undefined;
  return t(resource) ? resource.Icon : undefined;
}

// The atlases the header's quest cards can draw from. An icon from any other
// atlas throws in the header every time it refreshes, which leaves its cards
// stale and the screen under it unresponsive.
const QUEST_CARD_TEXTURES: any = literal({ items_drops: true, main: true, lootbox: true, reward_icons: true });

// A quest's card icon: its own if the header can draw it, otherwise the first
// drop of the level the quest is about.
function quest_icon(stat: any, icon: any) {
  if (t(icon) && t(QUEST_CARD_TEXTURES[icon.texture])) return icon;
  const [m, d, l] = S.match(stat, "(%d+)-(%d+)-(%d+)$");
  if (t(m)) return level_icon(tonumber(m), tonumber(d), tonumber(l));
  return literal({ texture: "main", flipbook: "assignhero" });
}

// A quest that is not about a drop: tapping a level, hiring its crew, sending a
// hero, or opening the way on.
// (Lua 5.1 stores `a.x, a.y = 1, 2` right to left; the field order below keeps that.)
function special_quest(event: any, kind: any, part: any, slot: any, place: any, reward: any, random: any) {
  const m = event.map_id;
  let d = event.frontier[place - 1][0], l = event.frontier[place - 1][1];
  const [intro, outro] = event_line(event, kind, part, slot, place);
  const quest: any = literal({ reward: reward, intro: intro, outro: outro });
  if (kind === "tap") {
    quest.stat = cat("click", m, "-", d, "-", l); quest.type = "QUEST_TYPE_TAP";
    quest.goal = nice(100 + 20 * place + random(0, 8) * 10);
    const label = cat("LEVEL_NAME_", m, "_", d, "_", l), icon = level_icon(m, d, l);
    quest.icon = icon; quest.label = label;
    // An enemy row is named for its enemy.
    if (t(event.enemies)) quest.label = henchman_at(m, d, l).Name;
  } else if (kind === "hire") {
    // One level short of the frontier, where hires are cheaper.
    if (l > 1) { l = l - 1; } else if (d > 1) { l = 3; d = d - 1; }
    const henchman = henchman_at(m, d, l);
    quest.stat = cat("hire", m, "-", d, "-", l); quest.type = "QUEST_TYPE_HIRE";
    quest.goal = nice(10 * Math.pow(1.35, place - 1));
    quest.label = henchman.Name;
  } else if (kind === "send") {
    quest.goal = 1; quest.stat = cat("assignhero", m, "-", d); quest.type = "QUEST_TYPE_SEND";
    quest.label = cat("DUNGEON_NAME_", m, "_", d);
  } else if (kind === "kill" || kind === "boss") {
    // An enemy event's: a row of enemies beaten, or the location's boss.
    if (kind === "boss") { l = 4; } else if (l === 4) { l = 3; }
    const enemy = henchman_at(m, d, l);
    quest.stat = cat("kill", m, "-", d, "-", l); quest.type = "QUEST_TYPE_DEFEAT";
    quest.goal = kind === "boss" ? 1 + Math.floor(place / 4) : nice(enemy.EnemyCount * (1 + place / 5));
    const label = enemy.Name, icon = level_icon(m, d, l);
    quest.icon = icon; quest.label = label;
  } else {
    quest.goal = 1; quest.stat = cat("unlockdungeon", m, "-", d, "-", l); quest.type = "QUEST_TYPE_UNLOCK";
    quest.label = l === 1 ? cat("DUNGEON_NAME_", m, "_", d) : cat("LEVEL_NAME_", m, "_", d, "_", l);
    quest.icon = l > 1 ? level_icon(m, d, l) : undefined;
  }
  return quest;
}

const SPECIAL_KINDS = ["tap", "hire", "send", "unlock", "collect"];
// An enemy event has no hires and no levels to open: it asks for enemies and
// bosses beaten instead.
const ENEMY_SPECIAL_KINDS = ["kill", "send", "boss", "collect"];

// A chapter after part 1: the same place in the part asks for the same kind
// of thing as part 1 did, from drops the crew can reach by then, at this
// part's goals. Rewards are part 1's for that place.
function generate_chapter(event: any, chapter: any) {
  const part = part_of(chapter), place = place_in_part(chapter);
  const random = chapter_random(event.key, chapter);
  const written = event.tiers[place - 1];
  const pool: any[] = [];
  for (let p = Math.max(1, place - 2); p <= place; p++) {
    const qs = event.tiers[p - 1].quests;
    for (let i = 1; i <= len(qs); i++) {
      const quest = qs[i - 1];
      if (quest.type === "QUEST_TYPE_COLLECT" && (quest.stat !== event.shards || place >= 9)) {
        // Asked for earlier in the part, so the crew makes more of it by now.
        T.insert(pool, literal({ stat: quest.stat, goal: quest.goal * Math.pow(1.6, place - p) }));
      }
    }
  }
  const draw_collect = function (slot: any, reward: any, used: any) {
    let choice: any;
    for (let tries = 1; tries <= 20; tries++) {
      choice = pool[random(1, len(pool)) - 1];
      if (!t(used[choice.stat])) break;
    }
    used[choice.stat] = true;
    const [intro, outro] = event_line(event, choice.stat, part, slot, place);
    const jitter = 0.85 + random() * 0.35;
    return literal({ type: "QUEST_TYPE_COLLECT", stat: choice.stat, reward: reward,
      goal: nice(choice.goal * goal_scale(part) * jitter), intro: intro, outro: outro });
  };

  const quests: any[] = [], used: any = {};
  const kinds = t(event.enemies) ? ENEMY_SPECIAL_KINDS : SPECIAL_KINDS;
  let special = kinds[LM.mod(part + place, len(kinds)) + 1 - 1];
  // The frontier's level 1 is a new location, which the part's own opening
  // quest already asks for.
  if (special === "unlock" && event.frontier[place - 1][1] === 1) special = "tap";
  for (let slot = 1; slot <= len(written.quests); slot++) {
    const reward = scale_reward(written.quests[slot - 1].reward, part);
    if (slot === 1 && t(event.opens[place])) {
      const [intro, outro] = event_line(event, "unlock", part, slot, place);
      const d = event.opens[place];
      quests[slot - 1] = literal({ type: "QUEST_TYPE_UNLOCK", stat: cat("unlockdungeon", event.map_id, "-", d, "-1"),
        goal: 1, reward: reward, intro: intro, outro: outro, label: cat("DUNGEON_NAME_", event.map_id, "_", d) });
    } else if (slot === len(written.quests) && special !== "collect") {
      quests[slot - 1] = special_quest(event, special, part, slot, place, reward, random);
    } else {
      quests[slot - 1] = draw_collect(slot, reward, used);
    }
  }
  return quests;
}

function chapter_quests(event: any, chapter: any) {
  if (chapter <= EVENT_PART_CHAPTERS) return event.tiers[chapter - 1].quests;
  return generate_chapter(event, chapter);
}

// What a chapter's chests hold: part 1's normal chest for that place in the
// part, and the event's chest, which grows through the part. The tenth
// chapter adds the event hero: the hero itself in part 1, its cards after.
function chapter_chest(event: any, chapter: any) {
  const part = part_of(chapter), place = place_in_part(chapter);
  const written = event.tiers[place - 1].chest;
  const chest = scale_reward(literal({ gold: written.gold, cards: written.cards, xp: written.xp }), part);
  chest.event_cards = 4 + place;
  chest.event_shards = 10 * place;
  if (place === EVENT_PART_CHAPTERS) {
    if (part === 1) {
      chest.gold_if_owned = written.gold_if_owned; chest.hero = true;
    } else {
      chest.hero_cards = 10 * (part - 1);
    }
  }
  return chest;
}

const REWARD_ICONS: any = literal({
  gold: literal({ texture: "reward_icons", flipbook: "reward_gold_icon", desc: "Collect %d Gold!" }),
  xp: literal({ texture: "reward_icons", flipbook: "reward_xp_icon", desc: "Collect %d XP!" }),
  cards: literal({ texture: "lootbox", flipbook: "wood_closed", desc: "Open %d cards!" }),
});

// What a quest's reward shows. An event's XP has a reward icon of its own,
// reward_<stat>_icon.
function reward_icon(event: any, kind: any) {
  if (kind !== "shards") return REWARD_ICONS[kind];
  return literal({ texture: "reward_icons", flipbook: t(event.xp_icon) ? event.xp_icon : cat("reward_", event.shards, "_icon"), desc: cat("Collect %d ", event.xp_name, "!") });
}

/** Lua's next(t): the first key and value in pairs order. */
function lnext(tbl: any): [any, any] {
  const it = pairs<any>(tbl).next();
  return it.done ? [undefined, undefined] : [it.value[0], it.value[1]];
}

// The quest as the header and the quest popups read it: the same fields a
// chapter quest carries, plus `event` and what it pays.
function event_quest(event: any, q: any, def: any) {
  const resource = defsave.loaded.Resources.data[def.stat];
  assert(resource, cat(def.stat, " doesn't exist in list of items."));
  const [kind, amount] = lnext(def.reward);
  const reward = reward_icon(event, kind);
  let label = t(def.label) ? def.label : resource.Name;
  // Part 1's unlocks name the location they open.
  const [m, d] = S.match(def.stat, "^unlockdungeon(%d+)-(%d+)-1$");
  if (!t(def.label) && t(m)) label = cat("DUNGEON_NAME_", m, "_", d);
  return literal({
    id: q, event: true, Type: def.type, statName: def.stat,
    Stat: label, Name: cat(def.type, " ", label),
    Icon: quest_icon(def.stat, t(def.icon) ? def.icon : resource.Icon), Goal: def.goal, Total: 0, Status: "New",
    Story_Int: literal({ NPC: event.npc, Text: def.intro }),
    Story_Ext: literal({ NPC: event.npc, Text: def.outro }),
    Reward: literal({ texture: reward.texture, flipbook: reward.flipbook, desc: format(reward.desc, amount) }),
    give: def.reward,
  });
}

// An unlock, or a hero sent somewhere, can already have happened this run by
// the time the chapter asking for it opens. Counted only from then on, the
// quest could never finish, so what is already true counts straight away.
function already_done(def: any) {
  if (def.type === "QUEST_TYPE_UNLOCK") {
    const c = defsave.loaded.Resources.data[def.stat].Count;
    return t(c) ? c : 0;
  } else if (def.type === "QUEST_TYPE_SEND") {
    const [m, d] = S.match(def.stat, "assignhero(%d+)-(%d+)");
    for (let h = 1; h <= len(defsave.loaded.Hero.data); h++) {
      const hero = defsave.loaded.Hero.data[h - 1];
      if (!t(hero.Locked) && t(hero.location) && hero.location.map_id === tonumber(m) && hero.location.dungeon_id === tonumber(d)) return 1;
    }
  }
  return 0;
}

function event_open_tier(state: any, event: any, tier: any) {
  state.tier = tier;
  state.quests = [];
  if (tier > last_chapter()) return;
  const defs = chapter_quests(event, tier);
  for (let q = 1; q <= len(defs); q++) {
    const def = defs[q - 1];
    const quest = event_quest(event, q, def);
    quest.Total = Math.min(quest.Goal, already_done(def));
    state.quests[q - 1] = quest;
  }
}

// How strong the event's crew is next to a fresh one: each henchman's speed
// and its gear's haul and crits, averaged geometrically so no one level
// outweighs the rest. A fresh crew, every card at level 1 and no gear, is 1.
function crew_power(map_id: any) {
  // An enemy event's enemies keep their own health.
  if (actions.enemy_map(map_id)) return 1;
  const gear: any = {};
  for (let g = 1; g <= len(defsave.loaded.Gear.data); g++) {
    const item = defsave.loaded.Gear.data[g - 1];
    if (item.map_id === map_id) {
      const slot = cat(item.dungeon_id, "-", item.level_id);
      gear[slot] = t(gear[slot]) ? gear[slot] : {};
      gear[slot][item.Modifier.Type] = Math.pow(item.Modifier.Factor, t(item.Level) ? item.Level : 0);
    }
  }
  let logs = 0, count = 0;
  for (let h = 1; h <= len(defsave.loaded.Henchmen.data); h++) {
    const henchman = defsave.loaded.Henchmen.data[h - 1];
    if (henchman.map_id === map_id) {
      const k = gear[cat(henchman.dungeon_id, "-", henchman.level_id)];
      const kit = t(k) ? k : {};
      const speed = Math.pow(henchman.Modifier.Factor, Math.max(1, t(henchman.Level) ? henchman.Level : 1) - 1);
      const chance = Math.min(1, (t(kit.critChance) ? kit.critChance : 1) / 100);
      const crits = 1 + chance * ((t(kit.critBonus) ? kit.critBonus : 1) - 1);
      logs = logs + Math.log(speed * (t(kit.packSize) ? kit.packSize : 1) * crits);
      count = count + 1;
    }
  }
  return count > 0 ? Math.exp(logs / count) : 1;
}

// Moon Shards paid out go straight in: through update_resources they would
// count towards a quest asking for shards from the Throne.
function add_shards(event: any, amount: any) {
  const shard = defsave.loaded.Resources.data[event.shards];
  shard.Count = shard.Count + amount;
  defsave.save("Resources", true);
}

function add_reward(pack: any, reward: any, event: any) {
  pack.gold = pack.gold + (t(reward.gold) ? reward.gold : 0);
  pack.cards = pack.cards + (t(reward.cards) ? reward.cards : 0);
  pack.xp = pack.xp + (t(reward.xp) ? reward.xp : 0);
  if (t(reward.shards)) add_shards(event, reward.shards);
  if (t(reward.hero)) {
    if (hero_owned(event.hero_id)) {
      pack.gold = pack.gold + (t(reward.gold_if_owned) ? reward.gold_if_owned : 0);
    } else {
      msg.post(controller, "unlock_hero", { hero_id: event.hero_id });
    }
  }
}

function new_pack() { return literal({ gold: 0, cards: 0, xp: 0 }); }

// True if it put a pack on screen.
function give_pack(pack: any, container?: any) {
  if (pack.gold > 0 || pack.cards > 0 || pack.xp > 0) {
    // Reward packs count XP in tens.
    msg.post(controller, "gen_rewardpack", literal({ container: container, packCards: pack.cards, packGold: pack.gold, packXp: Math.ceil(pack.xp / 10) }));
    return true;
  }
  return false;
}

// The event's own chest: its cards, its shards and, at the end of a part, the
// event hero's cards. The pack screen opens one pack at a time, so when the
// normal chest is already showing this one waits its turn; the dungeon screen
// opens it as soon as the first is closed.
function give_event_chest(event: any, chest: any, show: any) {
  let hero_cards = chest.hero_cards;
  if (t(hero_cards) && !hero_owned(event.hero_id)) {
    msg.post(controller, "unlock_hero", { hero_id: event.hero_id });
    hero_cards = undefined;
  }
  msg.post(controller, "gen_eventpack", literal({ map_id: event.map_id, cards: chest.event_cards,
    shards: literal({ stat: event.shards, amount: chest.event_shards }),
    hero_id: t(hero_cards) ? event.hero_id : hero_cards, hero_cards: hero_cards, show: show }));
}

function tier_done(state: any) {
  if (len(state.quests) === 0) return false;
  for (let q = 1; q <= len(state.quests); q++) {
    const quest = state.quests[q - 1];
    if (quest.Status !== "Collected") return false;
  }
  return true;
}

// Where each event has got to, kept across runs: the chapter, its quests and
// whether this run's part is finished.
function event_remember(state: any) {
  const _s = defsave.get("Stats", "EventProgress");
  const saved = t(_s) ? _s : {};
  saved[state.key] = literal({ tier: state.tier, quests: state.quests, part_done: state.part_done, version: state.version });
  defsave.set("Stats", "EventProgress", saved);
}

function event_save(state: any) {
  defsave.set("Stats", "Event", state);
  event_remember(state);
  defsave.save("Stats", true);
  msg.post("main:/overlay#header", "refresh_all");
  msg.post("main:/menu#dungeonmine", "refresh_event");
}

// Pays a finished chapter's chests and moves on. The tenth chapter of a part
// ends the event for this run: the next chapter waits for the next one.
function finish_chapter(state: any, event: any, pack: any) {
  const chest = chapter_chest(event, state.tier);
  add_reward(pack, chest, event);
  if (place_in_part(state.tier) === EVENT_PART_CHAPTERS) {
    state.tier = state.tier + 1;
    state.quests = [];
    state.part_done = true;
  } else {
    event_open_tier(state, event, state.tier + 1);
  }
  return chest;
}

function event_read_quest(id: any) {
  const state = defsave.get("Stats", "Event");
  const quest = t(state) ? state.quests[id - 1] : state;
  if (!t(quest) || quest.Status !== "New") return;
  quest.Status = quest.Total >= quest.Goal ? "Completed" : "Read";
  event_save(state);
}

function event_collect_quest(id: any) {
  const state = defsave.get("Stats", "Event");
  const event = t(state) ? event_def(state.key) : state;
  const quest = t(state) ? state.quests[id - 1] : state;
  if (!t(event) || !t(quest) || quest.Status !== "Completed") return;
  quest.Status = "Collected";
  const pack = new_pack();
  add_reward(pack, quest.give, event);
  // The last quest of a chapter pays its own reward and the normal chest as
  // one pack: the pack screen opens one pack at a time, and a second posted
  // straight after the first left it stuck on an unopenable chest.
  let chest: any = undefined, container: any = undefined;
  if (tier_done(state)) {
    chest = finish_chapter(state, event, pack);
    container = "banded";
  }
  const shown = give_pack(pack, container);
  if (t(chest)) give_event_chest(event, chest, !shown);
  event_save(state);
}

// Counts what the event's quests ask for. Quests not yet read wait, like
// chapter quests.
event_progress = function (stat: any, amount: any) {
  const state = t(defsave.loaded.Stats) ? defsave.get("Stats", "Event") : defsave.loaded.Stats;
  if (!t(state) || !t(state.quests) || amount <= 0) return;
  let changed = false;
  for (let q = 1; q <= len(state.quests); q++) {
    const quest = state.quests[q - 1];
    if (quest.statName === stat && (quest.Status === "Read" || quest.Status === "New")) {
      quest.Total = quest.Total + amount;
      if (quest.Status === "Read" && quest.Total >= quest.Goal) quest.Status = "Completed";
      changed = true;
    }
  }
  if (changed) {
    defsave.set("Stats", "Event", state);
    defsave.save("Stats", true);
  }
};

// Pays out what the finished run earned and was not collected, and keeps the
// chapter it reached for next time.
function event_finish(state: any) {
  const event = event_def(state.key);
  if (!t(event)) return;
  const pack = new_pack();
  const qs = t(state.quests) ? state.quests : [];
  for (let q = 1; q <= len(qs); q++) {
    const quest = qs[q - 1];
    if (quest.Status === "Completed" || (quest.Total >= quest.Goal && quest.Status !== "Collected")) {
      quest.Status = "Collected";
      add_reward(pack, quest.give, event);
    }
  }
  let chest: any = undefined;
  if (t(state.tier) && state.tier <= last_chapter() && tier_done(state)) {
    chest = finish_chapter(state, event, pack);
  }
  event_remember(state);
  // The run's items are sold on a screen of their own once the dungeon screen
  // is back; event_begin clears them straight after this, so keep them here.
  const haul: any = {};
  let worth = 0;
  for (const [id, resource] of pairs<any>(defsave.loaded.Resources.data)) {
    if (id !== event.shards && resource.Value > 0 && t(resource.Location) && resource.Location.map_id === event.map_id) {
      haul[id as any] = literal({ Count: resource.Count, totalValue: resource.totalValue });
      worth = worth + resource.totalValue;
    }
  }
  if (worth > 0) defsave.set("Stats", "EventHaul", literal({ key: state.key, items: haul }));
  const leftover = defsave.loaded.Resources.data[event.shards].Count;
  pack.gold = pack.gold + Math.min(EVENT_LEFTOVER_GOLD_MAX, Math.floor(leftover / EVENT_SHARDS_PER_GOLD));
  msg.post(controller, "popup_message", literal({ title: "EVENT_OVER_TITLE", text: cat("EVENT_", event.key, "_OVER") }));
  const shown = give_pack(pack);
  if (t(chest)) give_event_chest(event, chest, !shown);
}

function event_begin(run: any, event: any, ends_at: any) {
  const state: any = literal({
    run: run, key: event.key, version: event.version, map_id: event.map_id,
    ends_at: ends_at, introSeen: false, part_done: false,
  });
  for (const [id, resource] of pairs<any>(defsave.loaded.Resources.data)) {
    if (t(resource.Location) && resource.Location.map_id === event.map_id) {
      resource.Count = 0;
      resource.Lifetime = 0;
      resource.Progress = 0;
      resource.totalValue = 0;
      // Its items start over, so their shard bonuses do too.
      const bonus = defsave.loaded.Currency.data.Bonusxp;
      if (t(bonus)) tset(bonus, id as any, undefined);
    }
  }
  defsave.save("Resources", true);
  defsave.save("Currency", true);
  // Pick up where the player left off: the chapter they reached, with its
  // quests as they were, or the first chapter of the next part.
  const _p = defsave.get("Stats", "EventProgress");
  let saved = (t(_p) ? _p : {})[event.key];
  // An enemy event's chapters saved under an older version ask for things
  // that no longer exist, so it starts again from chapter 1. Progress saved
  // before versions were kept counts as version 1.
  if (t(saved) && t(event.enemies) && (t(saved.version) ? saved.version : 1) !== event.version) saved = undefined;
  if (t(saved) && t(saved.tier) && t(saved.quests) && len(saved.quests) > 0) {
    state.quests = saved.quests; state.tier = saved.tier;
  } else {
    event_open_tier(state, event, t(saved) && t(saved.tier) ? saved.tier : 1);
  }
  state.part = part_of(Math.min(state.tier, last_chapter()));
  // The levels' health rises with the crew, less this part's goals, so a
  // stronger crew hauls bigger numbers but a part still takes the week.
  state.health_scale = Math.max(1, crew_power(event.map_id) / goal_scale(state.part));
  defsave.set("Stats", "Event", state);
  event_remember(state);
  defsave.save("Stats", true);
  msg.post(controller, "event_reset", literal({ map_id: event.map_id, health_scale: state.health_scale }));
}

function event_check() {
  if (!event_ready) return;
  const _r = defsave.get("Stats", "Rank");
  if ((t(_r) ? _r : 0) < EVENT_UNLOCK_RANK) return;
  const [run, event, ends_at] = event_schedule(os.time());
  const state = defsave.get("Stats", "Event");
  if (t(state) && state.run === run && state.key === event.key && state.version === event.version) {
    if (!t(state.checked)) {
      // Quests saved with an icon the header cannot draw get a drawable one.
      const qs = t(state.quests) ? state.quests : [];
      for (let q = 1; q <= len(qs); q++) {
        const quest = qs[q - 1];
        quest.Icon = quest_icon(quest.statName, quest.Icon);
      }
      // A run saved before progress was kept between runs: keep it now.
      state.checked = true;
      event_save(state);
    }
    return;
  }
  // A run saved before this event's content changed starts over in place,
  // with nothing paid out: its quests and locations no longer exist.
  if (t(state) && state.run !== run) {
    event_finish(state);
  } else if (t(state) && state.key !== event.key) {
    // The dev menu swapped events within a run: nothing is paid out, and
    // the event left keeps its chapter for when it is put back.
    event_remember(state);
  }
  event_begin(run, event, ends_at);
  msg.post("main:/overlay#header", "refresh_all");
}

// The world map's dev menu: put an event on now, or go back to the schedule.
function dev_event(key: any, open: any) {
  if (t(key)) defsave.set("Stats", "DevEvent", key); else defsave.set("Stats", "DevEvent", undefined);
  defsave.save("Stats", true);
  event_check();
  const state = defsave.get("Stats", "Event");
  if (t(open) && t(state)) {
    msg.post(controller, "show_dungeonmine", literal({ map_id: state.map_id, dungeon_id: 1 }));
    msg.post(controller, "event_enter");
  }
  msg.post("main:/menu#kingdom", "refresh_all");
}

const messageData: any = {};
messageData["all"] = literal({
  ["on_start"]: function (message_id: any, message: any, sender: any) { on_start(message); },
  ["start_game"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Resources.data = pairLocation(defsave.loaded.Resources.data);
    defsave.save("Resources", true);
    defsave.save("Stats", true);
    event_ready = true;
    event_check();
  },
  ["update"]: function (message_id: any, message: any, sender: any) {
    if (os.time() !== event_lastcheck) {
      event_lastcheck = os.time();
      event_check();
    }
  },
  ["event_read_quest"]: function (message_id: any, message: any, sender: any) { event_read_quest(message.id); },
  ["event_collect_quest"]: function (message_id: any, message: any, sender: any) { event_collect_quest(message.id); },
  // Shards from the event's chest, which count for no quest.
  ["add_resource_quietly"]: function (message_id: any, message: any, sender: any) {
    const resource = defsave.loaded.Resources.data[message.stat];
    resource.Count = resource.Count + message.amount;
    defsave.save("Resources", true);
    msg.post("main:/overlay#header", "refresh_all");
  },
  ["dev_event"]: function (message_id: any, message: any, sender: any) { dev_event(message.key, message.open); },
  ["event_enter"]: function (message_id: any, message: any, sender: any) {
    const state = defsave.get("Stats", "Event");
    if (t(state) && !t(state.introSeen)) {
      state.introSeen = true;
      defsave.set("Stats", "Event", state);
      defsave.save("Stats", true);
      msg.post(controller, "popup_message", literal({ title: cat("EVENT_", state.key, "_INTRO_TITLE"), text: cat("EVENT_", state.key, "_INTRO") }));
    }
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
  ["add_questslot"]: function (message_id: any, message: any, sender: any) {
    defsave.loaded.Stats.data.questSlots = Math.min(3, nn(defsave.loaded.Stats.data.questSlots) + 1);
    defsave.save("Stats", true);
    msg.post("main:/overlay#header", "refresh_all");
  },
  ["update_currentlocation"]: function (message_id: any, message: any, sender: any) {
    curLoc = literal({ map_id: message.map_id, dungeon_id: message.dungeon_id });
    // The header swaps the chapter's quests for the event's while the
    // player is on an event map. Every screen change sets it again, so a
    // stale copy in the save never shows.
    defsave.loaded.Stats.data.Location = curLoc;
    msg.post("main:/overlay#header", "refresh_all");
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
  ["hero_ballad"]: function (message_id: any, message: any, sender: any) { hero_ballad(message); },
  ["update_stats"]: function (message_id: any, message: any, sender: any) {
    update_resources(message.stat, message.amount, message.bonus);
  },		//depricate update_stats
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
      update_resources("collectxp", Math.floor(message.amount * actions.xp_factor() + 0.5));
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
M.__parity_locals = () => ({
  ENEMY_SPECIAL_KINDS, EVENTS, EVENT_GOAL_GROWTH, EVENT_LEFTOVER_GOLD_MAX, EVENT_PARTS, EVENT_PART_CHAPTERS,
  EVENT_SHARDS_PER_GOLD, EVENT_UNLOCK_RANK, QUEST_CARD_TEXTURES, REWARD_ICONS, SPECIAL_KINDS,
  curLoc, defaultStats, event_lastcheck, event_ready,
});

export default M;
