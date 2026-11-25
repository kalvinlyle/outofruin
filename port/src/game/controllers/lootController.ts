// controllers/lootController.lua
import inspect_ from '../inspect';
import actions_ from '../actions';
import random_ from '../random/random';
import progress_ from '../progress/progress';
import defsave_ from '../defsave/defsave';
import { msg, hash, print } from '../../engine';
import { pairs, literal, len, t, T, M as LM, tonumber } from '../../lua';
import { G } from '../globals';
import audio from '../../systems/audio';

const inspect: any = inspect_;
const actions: any = actions_;
const random: any = random_;
const progress: any = progress_;
const defsave: any = defsave_;

const productName = "OoR";
const controller = "main:/menu#controller";

const M: any = {};
const attFactor = 0.25;
const drawWeight: any = literal({
  Common: 1000,
  Wild: 100,
  Rare: 25,
  Epic: 5,
  Legendary: 2,
  Exotic: 1,
});

function isnil(v: any): boolean { return v === undefined || v === null; }
/** Lua arithmetic operand: numbers pass, numeric strings coerce, anything else raises. */
function nn(v: any): number {
  if (typeof v === 'number') return v;
  const n = typeof v === 'string' ? tonumber(v) : undefined;
  if (n === undefined) throw new Error('attempt to perform arithmetic on a ' + (isnil(v) ? 'nil' : typeof v) + ' value');
  return n;
}
/** `list, choice = random.table_weighted_draw(list)` — both return values. */
function weighted_draw(list: any): [any, any] {
  const [l, choice] = random.table_weighted_draw(list);
  return [l, choice];
}

function on_start(message: any) {
  defsave.load("Loot");

  if (actions.tablelength(defsave.loaded.Loot.data) > 0) msg.post(controller, "boot_loot");
  print("LOOTCONTROLLER: Loot loaded");
}

function drawable(card: any) {
  // Event henchmen (map 2 onwards) start fresh every run, so cards spent
  // on them would vanish; packs only draw for the main game.
  // A card may also be held back until a later chapter, so a hero the
  // player owns from the start cannot be levelled before then.
  return card.Status === "Unlocked" && (isnil(card.map_id) || card.map_id === 1)
    && (isnil(card.CardsFromRank) || defsave.get("Stats", "Rank") >= card.CardsFromRank);
}

// A henchman's first card waits for the one working the level above it in
// the same dungeon, so the Rat Catcher never turns up before the Farmhand.
function waits_for_earlier(card: any, data: any) {
  for (let c = 1; c <= len(data); c++) {
    const other = data[c - 1];
    if (other.map_id === card.map_id && other.dungeon_id === card.dungeon_id && other.level_id < card.level_id
      && drawable(other) && nn(t(other.Cards) ? other.Cards : 0) <= 0) return true;
  }
  return false;
}

function add_cards_to_deck(deck: any, data: any, data_type: any) {
  for (let c = 1; c <= len(data); c++) {
    const card = data[c - 1];
    if (drawable(card) && !(data_type === "henchmen" && waits_for_earlier(card, data))) {
      T.insert(deck, literal({ Weight: drawWeight[card.Rarity], Option: literal({ id: card.id, type: data_type, amount: 1 }) }));
    }
  }
  return deck;
}

function pick_card(_num?: any) {
  let deck: any[] = [];
  deck = add_cards_to_deck(deck, actions.clone(defsave.loaded.Gear.data), "gear");
  deck = add_cards_to_deck(deck, actions.clone(defsave.loaded.Henchmen.data), "henchmen");
  deck = add_cards_to_deck(deck, actions.clone(defsave.loaded.Hero.data), "hero");
  if (len(deck) > 0) return random.table_weighted(deck);
  return undefined;
}

function draw_cards(num: any, maxUniqueCards?: any, pick?: any) {
  const cards: any = {};
  let card: any = {};
  let totalCards = 0;
  let totalUnique = 0;
  maxUniqueCards = t(maxUniqueCards) ? maxUniqueCards : 9;
  pick = t(pick) ? pick : pick_card;

  while (totalCards < num) {
    card = pick(num);
    // Nothing unlocked to draw yet: stop rather than spin. The pack still
    // pays out its xp and gold.
    if (!t(card)) break;
    let duplicate = false;
    if (t(card)) {
      if (isnil(cards[card.type])) cards[card.type] = [];
      if (len(cards[card.type]) > 0) {
        for (let pc = 1; pc <= len(cards[card.type]); pc++) {
          if (card.id === cards[card.type][pc - 1].id && card.type === cards[card.type][pc - 1].type) {
            cards[card.type][pc - 1].amount = cards[card.type][pc - 1].amount + card.amount;
            duplicate = true;
            totalCards = totalCards + card.amount;
          }
        }
      }
      if (!duplicate && totalUnique < maxUniqueCards) {
        totalUnique = totalUnique + 1;
        T.insert(cards[card.type], card);
        totalCards = totalCards + card.amount;
      }
    }
  }

  return cards;
}

function set_inventory(map_id: any, dungeon_id: any, level: any, table: any, inventory?: any) {
  for (let n = 1; n <= len(table); n++) {
    msg.post(controller, "set_inventory", literal({ map_id: map_id, dungeon_id: dungeon_id, level: level, table: n, inventory: table[n - 1]["Inventory"] }));
  }
  void inventory;
}

function gen_rewardpack(packCards: any, packGold: any, packXp: any, container?: any) {
  container = t(container) ? container : "wood";
  const pack: any = {};
  const item_pack = {};
  const totalValue = 0;
  const packItems = 0;

  if (isnil(pack.cards)) pack.cards = {};
  const totalCards = 0;
  pack.container = container;
  pack.xp = 10 * nn(packXp);
  pack.gold = packGold;
  let maxUniqueCards = 9;
  if (pack.xp > 0) maxUniqueCards = maxUniqueCards - 1;
  if (nn(pack.gold) > 0) maxUniqueCards = maxUniqueCards - 1;
  pack.cards = draw_cards(packCards, maxUniqueCards);
  // Mother Mabb adds her own picks to every pack, kept apart so the pack
  // screen can show which cards were hers.
  const mabb = Math.floor(actions.patron_value("HERO_MOTHERMABB_NAME", 1, 3, 0) + 0.5);
  if (mabb > 0) pack.mabb = draw_cards(mabb, mabb);
  pack.resources = [];

  void item_pack; void totalValue; void packItems; void totalCards;
  return pack;

}

/* The event's own chest. It draws only from that event's henchmen and gear,
which normal packs never hold, so what the player spends on them stays theirs
from one run to the next. Rarity counts for less than in a normal pack: the
deeper locations' cards are what a crew needs to keep up with later parts. */
const EVENT_WEIGHT: any = literal({ Common: 6, Rare: 4, Epic: 3, Legendary: 2 });

function event_deck(map_id: any) {
  const deck: any[] = [];
  const kinds = [["Henchmen", "henchmen"], ["Gear", "gear"]];
  for (let k = 1; k <= len(kinds); k++) {
    const kind = kinds[k - 1];
    const data = defsave.loaded[kind[0]].data;
    for (let c = 1; c <= len(data); c++) {
      const card = data[c - 1];
      // An enemy event's rows hold its enemies, which are not cards.
      if (card.map_id === map_id && !t(card.Enemy)) {
        const w = EVENT_WEIGHT[card.Rarity];
        T.insert(deck, literal({ Weight: t(w) ? w : 1, Option: literal({ id: c, type: kind[1], amount: 1 }) }));
      }
    }
  }
  return deck;
}

function gen_eventpack(message: any) {
  const deck = event_deck(message.map_id);
  // Each event pays in a chest of its own look.
  const event = actions.event_on_map(message.map_id);
  const pack: any = literal({ container: t(event) && t(event.chest) ? event.chest : "moon", xp: 0, gold: 0, resources: [] });
  pack.cards = draw_cards(message.cards, 8, function () {
    if (len(deck) > 0) return random.table_weighted(deck);
    return undefined;
  });
  if (t(message.hero_cards) && message.hero_cards > 0) {
    pack.cards.hero = [literal({ id: message.hero_id, type: "hero", amount: message.hero_cards })];
  }
  const shards = message.shards;
  if (t(shards) && shards.amount > 0) {
    const resource = defsave.loaded.Resources.data[shards.stat];
    T.insert(pack.resources, literal({ Name: resource.Name, Description: "EVENT_CHEST_SHARDS", Icon: resource.Icon, Rarity: "Common",
      Stat: shards.stat, Total: shards.amount, amount: shards.amount, quiet: true }));
  }
  return pack;
}

function reward_resource(luck: any, map_id: any, dungeon_id: any, level: any) {

  const dungeon_data = defsave.loaded.Map.data[map_id - 1][dungeon_id - 1];

  const n = Math.min(len(dungeon_data.Levels), nn(level));
  for (let i = 1; i <= n; i++) {

    let resource: any = "";
    [dungeon_data.Levels[i - 1].Loot_Table, resource] = weighted_draw(dungeon_data.Levels[i - 1].Loot_Table);
    resource.Total = Math.ceil(LM.random(resource.Min, resource.Max) + ((nn(resource.Max) - nn(resource.Min)) * (nn(luck) * attFactor)));
    set_inventory(map_id, dungeon_id, level, dungeon_data.Levels[i - 1].Loot_Table);
    msg.post(controller, "update_stats", literal({ name: resource.Name, icon: resource.Icon, stat: resource.Stat, amount: resource.Total }));
    defsave.save("Loot", true);

  }
}

function gen_levelpack(packSize: any, packValue: any, luck: any, map_id: any, dungeon_id: any, level: any) {
  const dungeon_data = defsave.loaded.Map.data[map_id - 1][dungeon_id - 1];

  const pack: any = {};
  pack.items = {};
  pack.gold = 0;
  pack.xp = 0;
  pack.resources = [];

  let resource: any = "";
  [dungeon_data.Levels[level - 1].Loot_Table, resource] = weighted_draw(dungeon_data.Levels[level - 1].Loot_Table);
  resource.Total = Math.ceil(LM.random(resource.Min, resource.Max) + ((nn(resource.Max) - nn(resource.Min)) * (nn(luck) * attFactor)));
  // `i` is an undefined global: Levels[nil] is nil and indexing it raises, as in Lua.
  set_inventory(map_id, dungeon_id, level, dungeon_data.Levels[G.i - 1].Loot_Table);
  pack.resources[0] = resource;
  return pack;

}

function sell_item(id: any) {
  const item = defsave.loaded.Loot.dataItems[actions.findintable(defsave.loaded.Loot.dataItems, "id", id) - 1];
  const tablepos = actions.findinlist(defsave.loaded.Loot.dataPlayer, id);
  msg.post(controller, "mod_gold", { amount: item["Value"] });
  msg.post("main:/overlay#header", "refresh_all");
  T.remove(defsave.loaded.Loot.dataPlayer, tablepos);
  defsave.save("Loot", true);
}

// A loot crit. Seraphine Vale adds her chance on top of the level's own, and
// a crit only she made is marked lucky, so the screen can show it was hers. A
// level with no crit gear pays nothing extra on its own crits, so hers always
// pay at least double.
function roll_crit(critChance: any, critBonus: any): [number, boolean] {
  const seraphine = actions.patron_value("HERO_SERAPHINEVALE_NAME", 5, 30, 0);
  const roll = LM.random(1, 10000);
  if (roll <= nn(critChance) * 100) return [nn(critBonus) - 1, false];
  if (roll <= (nn(critChance) + seraphine) * 100) return [Math.max(nn(critBonus), 2) - 1, true];
  return [0, false];
}

/** `resource.Bonus, resource.Lucky = roll_crit(...)`: Lua 5.1 stores right to left. */
function set_crit(resource: any, critChance: any, critBonus: any) {
  const [bonus, lucky] = roll_crit(critChance, critBonus);
  resource.Lucky = lucky;
  resource.Bonus = bonus;
}

function gen_levelrewards(packSize: any, packValue: any, luck: any, map_id: any, dungeon_id: any, level: any, multiplier: any, critChance: any, critBonus: any, critLuck: any, vfx: any) {
  multiplier = t(multiplier) ? multiplier : 1;
  critChance = t(critChance) ? critChance : 1;
  critBonus = t(critBonus) ? critBonus : 1;
  critLuck = t(critLuck) ? critLuck : 1;

  const dungeon_data = defsave.loaded.Map.data[map_id - 1][dungeon_id - 1];


  const resources: any = {};


  const invSize = len(dungeon_data.Levels[level - 1].Loot_Table);
  const fullInv = Math.floor(nn(multiplier) / invSize);
  if (fullInv > 0) {
    for (let i = 1; i <= invSize; i++) {
      const lt = dungeon_data.Levels[level - 1].Loot_Table;
      for (let r = 1; r <= len(lt); r++) {
        let resource = lt[r - 1];
        resource = resource.Option;

        resource.Bonus = 0;
        set_crit(resource, critChance, critBonus);

        resource.Average = Math.floor((nn(resource.Max) - nn(resource.Min)) / 2) + nn(resource.Min);
        // An enemy wave's packSize is not a whole number, so round the haul.
        resource.Total = Math.floor(Math.ceil(LM.random(resource.Min, resource.Max) + ((nn(resource.Max) - nn(resource.Min)) * (nn(luck) * attFactor))) * fullInv * nn(packSize) + 0.5);
        resource.Bonus = Math.floor(resource.Bonus * fullInv * nn(packSize));
        resources[resource.Stat] = literal({ Name: resource.Name, Total: resource.Total, Bonus: resource.Bonus, Icon: resource.Icon, Stat: resource.Stat, Lucky: resource.Lucky });
      }
    }
  }


  const lim = nn(multiplier) - (fullInv * invSize);
  for (let i = 1; i <= lim; i++) {
    let resource: any = "";
    [dungeon_data.Levels[level - 1].Loot_Table, resource] = weighted_draw(dungeon_data.Levels[level - 1].Loot_Table);

    resource.Bonus = 0;
    set_crit(resource, critChance, critBonus);

    resource.Total = Math.floor(Math.ceil(LM.random(resource.Min, resource.Max) + ((nn(resource.Max) - nn(resource.Min)) * (nn(luck) * attFactor))) * nn(packSize) + 0.5);
    resource.Bonus = Math.floor(resource.Bonus * nn(packSize) + 0.5);
    if (isnil(resources[resource.Stat])) {
      resources[resource.Stat] = literal({ Name: resource.Name, Total: resource.Total, Bonus: resource.Bonus, Icon: resource.Icon, Stat: resource.Stat, Lucky: resource.Lucky });
    } else {
      resources[resource.Stat].Total = resources[resource.Stat].Total + resource.Total;
      resources[resource.Stat].Bonus = resources[resource.Stat].Bonus + resource.Bonus;
      resources[resource.Stat].Lucky = t(resources[resource.Stat].Lucky) ? resources[resource.Stat].Lucky : resource.Lucky;
    }
  }
  set_inventory(map_id, dungeon_id, level, dungeon_data.Levels[level - 1].Loot_Table);
  if (!isnil(resources)) {
    // local max = table.getn(resources) — unused, no side effects
    for (const [r] of pairs(resources)) {
      const resource = resources[r as any];
      msg.post(controller, "update_stats", literal({ stat: resource.Stat, amount: resource.Total, bonus: resource.Bonus }));
      if (resource.Bonus > 0) {
        audio.playCrit(t(resource.Lucky), map_id, dungeon_id);
      }
      if (t(resource.Lucky) && resource.Bonus > 0) {
        msg.post("main:/menu#dungeonmine", "hero_fx", literal({ kind: "lucky", stat: resource.Stat, amount: resource.Bonus, map_id: map_id, dungeon_id: dungeon_id }));
      }

      if (t(vfx)) {
        if (vfx.type === "resource") {
          const message = literal({ resourcename: resource.Stat, map_id: map_id, dungeon_id: dungeon_id, level_id: level, vfx: vfx });
          msg.post("main:/menu#dungeonmine", "play_vfx", message);
        }
      }

    }
  }
  void packValue; void critLuck;
}

/* An enemy kill's loot (gdd/enemy-events.md). Every kill drops the row's
first drop, so clearing a row always brings in what the next row needs; any
other drop on the table comes now and then on top, Weight in a hundred. */
function gen_enemyloot(message: any) {
  const level = defsave.loaded.Map.data[message.map_id - 1][message.dungeon_id - 1].Levels[message.level_id - 1];
  for (let r = 1; r <= len(level.Loot_Table); r++) {
    const row = level.Loot_Table[r - 1];
    const option = row.Option;
    let total = 0, bonus = 0, lucky = false;
    for (let k = 1; k <= message.kills; k++) {
      if (r === 1 || LM.random(1, 100) <= row.Weight) {
        const amount = LM.random(option.Min, option.Max) * nn(message.packSize);
        const [extra, isLucky] = roll_crit(message.critChance, message.critBonus);
        total = total + amount;
        bonus = bonus + extra * nn(message.packSize);
        lucky = lucky || (isLucky && extra > 0);
      }
    }
    total = Math.floor(total + 0.5); bonus = Math.floor(bonus + 0.5);
    if (total > 0) {
      msg.post(controller, "update_stats", literal({ stat: option.Stat, amount: total, bonus: bonus }));
      if (lucky) {
        msg.post("main:/menu#dungeonmine", "hero_fx", literal({ kind: "lucky", stat: option.Stat, amount: bonus, map_id: message.map_id, dungeon_id: message.dungeon_id }));
      }
    }
  }
}

function gen_dungeonrewards(packSize: any, packValue: any, luck: any, map_id: any, dungeon_id: any, multiplier: any, critChance: any, critBonus: any, critLuck: any, vfx: any) {
  multiplier = t(multiplier) ? multiplier : 1;
  critChance = t(critChance) ? critChance : 1;
  critBonus = t(critBonus) ? critBonus : 1;
  critLuck = t(critLuck) ? critLuck : 1;

  const dungeon_data = defsave.loaded.Map.data[map_id - 1][dungeon_id - 1];

  const resources: any = {};

  let invSize = 0;
  let maxLevel = 0;
  for (let l = 1; l <= len(dungeon_data.Levels); l++) {
    const level = dungeon_data.Levels[l - 1];
    if (!t(level.isLocked) && t(level.wasClickedOpen)) {
      invSize = invSize + len(level.Loot_Table);
      maxLevel = maxLevel + 1;
    }
  }

  const fullInv = Math.floor(nn(multiplier) / invSize);
  if (fullInv > 0) {
    for (let i = 1; i <= invSize; i++) {
      for (let l = 1; l <= len(dungeon_data.Levels); l++) {
        const level = dungeon_data.Levels[l - 1];
        if (l <= maxLevel) {
          for (let r = 1; r <= len(level.Loot_Table); r++) {
            let resource = level.Loot_Table[r - 1];
            resource = resource.Option;

            resource.Bonus = 0;
            set_crit(resource, critChance, critBonus);

            resource.Average = Math.floor((nn(resource.Max) - nn(resource.Min)) / 2) + nn(resource.Min);
            resource.Total = Math.floor(resource.Average * fullInv * nn(packSize));
            resource.Bonus = Math.floor(resource.Bonus * fullInv * nn(packSize));
            resources[resource.Stat] = literal({ Name: resource.Name, Total: resource.Total, Bonus: resource.Bonus, Icon: resource.Icon, Stat: resource.Stat, Lucky: resource.Lucky });
          }
        }
      }
    }
  }


  const lim = nn(multiplier) - (fullInv * invSize);
  for (let i = 1; i <= lim; i++) {
    let resource: any = {};

    const randlevel = LM.random(1, maxLevel);
    [dungeon_data.Levels[randlevel - 1].Loot_Table, resource] = weighted_draw(dungeon_data.Levels[randlevel - 1].Loot_Table);
    resource.Level = randlevel;

    resource.Bonus = 0;
    set_crit(resource, critChance, critBonus);
    resource.Total = Math.floor(Math.ceil(LM.random(resource.Min, resource.Max) + ((nn(resource.Max) - nn(resource.Min)) * (nn(luck) * attFactor)))) * nn(packSize);
    resource.Bonus = resource.Bonus * nn(packSize);

    set_inventory(map_id, dungeon_id, resource.Level, dungeon_data.Levels[resource.Level - 1].Loot_Table);

    if (isnil(resources[resource.Stat])) {
      resources[resource.Stat] = literal({ Name: resource.Name, Level: resource.Level, Total: resource.Total, Bonus: resource.Bonus, Icon: resource.Icon, Stat: resource.Stat });
    } else {
      resources[resource.Stat].Total = resources[resource.Stat].Total + resource.Total;
      resources[resource.Stat].Bonus = resources[resource.Stat].Bonus + resource.Bonus;
      resources[resource.Stat].Lucky = t(resources[resource.Stat].Lucky) ? resources[resource.Stat].Lucky : resource.Lucky;
    }

  }

  if (!isnil(resources)) {
    // local max = table.getn(resources) — unused, no side effects
    for (const [r] of pairs(resources)) {
      const resource = resources[r as any];
      msg.post(controller, "update_stats", literal({ stat: resource.Stat, amount: resource.Total, bonus: resource.Bonus }));
      if (resource.Bonus > 0) {
        audio.playCrit(t(resource.Lucky), map_id, dungeon_id);
      }
      if (t(resource.Lucky) && resource.Bonus > 0) {
        msg.post("main:/menu#dungeonmine", "hero_fx", literal({ kind: "lucky", stat: resource.Stat, amount: resource.Bonus, map_id: map_id, dungeon_id: dungeon_id }));
      }

      if (t(vfx)) {
        if (vfx.type === "resource") {
          const message = literal({ resourcename: resource.Stat, map_id: map_id, dungeon_id: dungeon_id, level_id: resource.Level, vfx: vfx });
          msg.post("main:/menu#dungeonmine", "play_vfx", message);
        }
      }

    }
  }
  void packValue; void critLuck;
}

function open_pack(num: any) {
  msg.post(controller, "mod_xp", { amount: defsave.loaded.Loot.data.Packs[num - 1].xp });
  msg.post(controller, "mod_gold", { amount: defsave.loaded.Loot.data.Packs[num - 1].gold });
  const lists = [defsave.loaded.Loot.data.Packs[num - 1].cards, defsave.loaded.Loot.data.Packs[num - 1].mabb];
  for (let li = 1; li <= len(lists); li++) {
    const cards = lists[li - 1];
    for (const [tk, type] of pairs<any>(cards)) {
      for (const [c, card] of pairs<any>(type)) {
        if (card.type === "henchmen") { msg.post(controller, "add_henchmencards", literal({ henchmen_id: card.id, amount: card.amount })); }
        if (card.type === "gear") { msg.post(controller, "add_gearcards", literal({ gear_id: card.id, amount: card.amount })); }
        if (card.type === "hero") { msg.post(controller, "add_herocards", literal({ hero_id: card.id, amount: card.amount })); }
        msg.post(controller, "collect_cards", { amount: card.amount });
        void c;
      }
      void tk;
    }
  }
  if (actions.tablelength(defsave.loaded.Loot.data.Packs[num - 1].resources) > 0) {
    for (const [r, resource] of pairs<any>(defsave.loaded.Loot.data.Packs[num - 1].resources)) {
      if (t(resource.quiet)) {
        msg.post(controller, "add_resource_quietly", literal({ stat: resource.Stat, amount: resource.Total }));
      } else {
        msg.post(controller, "update_stats", literal({ name: resource.Name, icon: resource.Icon, stat: resource.Stat, amount: resource.Total }));
      }
      void r;
    }
  }
  T.remove(defsave.loaded.Loot.data.Packs, num);
  defsave.save("Loot", true);
}

/* Field hero powers that make loot (gdd/heroes-roster.md). Each tells the
dungeon screen what it made, so the screen can fly it to where it went. */

const JUNK = ["oldboot", "dentedhelmet", "driftwood", "tincup"];

function dungeon_drops(map_id: any, dungeon_id: any) {
  const drops: any[] = [], seen: any = {};
  const levels = defsave.loaded.Map.data[map_id - 1][dungeon_id - 1].Levels;
  for (let l = 1; l <= len(levels); l++) {
    const level = levels[l - 1];
    if (!t(level.isLocked) && t(level.wasClickedOpen)) {
      for (let r = 1; r <= len(level.Loot_Table); r++) {
        const row = level.Loot_Table[r - 1];
        const stat = row.Option.Stat;
        if (!t(seen[stat]) && t(defsave.loaded.Resources.data[stat])) {
          seen[stat] = true;
          T.insert(drops, literal({ stat: stat, level_id: l, option: row.Option }));
        }
      }
    }
  }
  return drops;
}

function pick_chest_card() {
  let deck: any[] = [];
  deck = add_cards_to_deck(deck, actions.clone(defsave.loaded.Gear.data), "gear");
  deck = add_cards_to_deck(deck, actions.clone(defsave.loaded.Hero.data), "hero");
  if (len(deck) > 0) return random.table_weighted(deck);
  return undefined;
}

// One of Nell's catches: mostly junk for the sell screen, now and then
// something better. Her level doubles the odds of everything but junk.
function catch_one(message: any, luck: any) {
  const table_ = [
    literal({ kind: "junk", weight: 60 }),
    literal({ kind: "drops", weight: 25 * luck }),
    literal({ kind: "bottle", weight: 10 * luck }),
    literal({ kind: "fish", weight: 4 * luck }),
    literal({ kind: "chest", weight: 1 * luck }),
  ];
  let total = 0;
  for (let i = 1; i <= len(table_); i++) total = total + table_[i - 1].weight;
  let roll = LM.random() * total;
  let kind = "junk";
  for (let i = 1; i <= len(table_); i++) {
    const row = table_[i - 1];
    roll = roll - row.weight;
    if (roll <= 0) { kind = row.kind; break; }
  }

  const catch_: any = literal({ kind: kind });
  if (kind === "drops") {
    const drops = dungeon_drops(message.map_id, message.dungeon_id);
    if (len(drops) === 0) { kind = "junk"; catch_.kind = kind; } else {
      const drop = drops[LM.random(1, len(drops)) - 1];
      // Lua 5.1 stores a multiple assignment right to left.
      catch_.level_id = drop.level_id; catch_.stat = drop.stat;
      catch_.amount = LM.random(drop.option.Min, drop.option.Max) * 3;
      msg.post(controller, "update_resources", literal({ stat: catch_.stat, amount: catch_.amount }));
    }
  }
  if (kind === "junk") {
    catch_.stat = JUNK[LM.random(1, len(JUNK)) - 1];
    catch_.amount = 1;
    msg.post(controller, "update_resources", literal({ stat: catch_.stat, amount: 1 }));
  } else if (kind === "bottle") {
    catch_.amount = Math.floor(actions.hero_power(message, 5, 60) + 0.5);
    msg.post(controller, "mod_xp", { amount: catch_.amount });
  } else if (kind === "fish") {
    const fr = defsave.get("Stats", "followerRate");
    catch_.amount = Math.floor(60 * nn(t(fr) ? fr : 1) * actions.hero_power(message, 1, 10));
    msg.post(controller, "mod_followers", { amount: catch_.amount });
  } else if (kind === "chest") {
    const card = pick_chest_card();
    if (t(card)) {
      catch_.card = card;
      if (card.type === "gear") msg.post(controller, "add_gearcards", literal({ gear_id: card.id, amount: 1 }));
      if (card.type === "hero") msg.post(controller, "add_herocards", literal({ hero_id: card.id, amount: 1 }));
      msg.post(controller, "collect_cards", { amount: 1 });
    }
  }
  return catch_;
}

function hero_fish(message: any) {
  const casts = Math.floor(actions.hero_power(message, 1, 3) + 0.5);
  const luck = actions.hero_scale(actions.hero_power_level(message.hero_id), 1, 2);
  const catches: any[] = [];
  for (let i = 1; i <= casts; i++) T.insert(catches, catch_one(message, luck));
  msg.post("main:/menu#dungeonmine", "hero_fx", literal({ kind: "fish", hero_id: message.hero_id, map_id: message.map_id, dungeon_id: message.dungeon_id, catches: catches, echo: !isnil(message.echo_scale) }));
}

// Madame Ottoline: part of the dungeon's most plentiful drop becomes its
// scarcest, at her rate.
function hero_transmute(message: any) {
  const drops = dungeon_drops(message.map_id, message.dungeon_id);
  if (len(drops) < 2) return;
  const resources = defsave.loaded.Resources.data;
  T.sort(drops, function (a: any, b: any) { return resources[a.stat].Count > resources[b.stat].Count; });
  const common = drops[0], rare = drops[len(drops) - 1];
  const share = actions.hero_power(message, message.share1, message.share13);
  const rate = actions.hero_scale(actions.hero_power_level(message.hero_id), message.rate1, message.rate13);
  const gain = Math.floor(nn(resources[common.stat].Count) * share / rate);
  if (gain < 1) return;
  const spent = Math.floor(gain * rate + 0.5);
  msg.post(controller, "update_resources", literal({ stat: common.stat, amount: -spent }));
  msg.post(controller, "update_resources", literal({ stat: rare.stat, amount: gain }));
  msg.post("main:/menu#dungeonmine", "hero_fx", literal({ kind: "transmute", hero_id: message.hero_id, map_id: message.map_id, dungeon_id: message.dungeon_id,
    from: common.stat, from_level: common.level_id, spent: spent, to: rare.stat, to_level: rare.level_id, gain: gain, rate: rate, echo: !isnil(message.echo_scale) }));
}

const messageData: any = {};
messageData["all"] = literal({
  ["hero_fish"]: function (message_id: any, message: any, sender: any) { hero_fish(message); },
  ["hero_transmute"]: function (message_id: any, message: any, sender: any) { hero_transmute(message); },
  ["on_start"]: function (message_id: any, message: any, sender: any) { on_start(message); },
  ["reset_statistics"]: function (message_id: any, message: any, sender: any) {
    defsave.set("Loot", "Items", undefined);
    defsave.set("Loot", "Resources", undefined);
    defsave.set("Loot", "Packs", undefined);
    defsave.set("Loot", "Player", undefined);
    defsave.set("Loot", "Shop", undefined);
    defsave.set("Loot", "Premium", undefined);
    defsave.set("Loot", "Bundles", undefined);
    defsave.save("Loot", true);
  },
  ["gen_levelpack"]: function (message_id: any, message: any, sender: any) {
    if (isnil(defsave.loaded.Loot.data.Packs)) defsave.loaded.Loot.data.Packs = [];
    T.insert(defsave.loaded.Loot.data.Packs, gen_levelpack(message.packSize, nn(message.level_id) * 6, 1, message.map_id, message.dungeon_id, message.level_id));
    open_pack(len(defsave.loaded.Loot.data.Packs));
    msg.post("main:/overlay#header", "refresh_all");
    defsave.save("Loot", true);
  },
  ["gen_levelpacks"]: function (message_id: any, message: any, sender: any) {
    if (isnil(defsave.loaded.Loot.data.Packs)) defsave.loaded.Loot.data.Packs = [];
    gen_levelrewards(message.packSize, nn(message.level_id) * 6, 1, message.map_id, message.dungeon_id, message.level_id, message.packs, message.critChance, message.critBonus, message.critLuck, message.vfx);
    msg.post("main:/overlay#header", "refresh_all");
    defsave.save("Loot", true);
  },
  ["gen_enemyloot"]: function (message_id: any, message: any, sender: any) {
    gen_enemyloot(message);
    msg.post("main:/overlay#header", "refresh_all");
  },
  ["gen_dungeonpacks"]: function (message_id: any, message: any, sender: any) {
    message.packSize = t(message.packSize) ? message.packSize : 1;
    message.packvalue = t(message.packvalue) ? message.packvalue : 0;
    if (isnil(defsave.loaded.Loot.data.Packs)) defsave.loaded.Loot.data.Packs = [];
    gen_dungeonrewards(message.packSize, message.packvalue, 1, message.map_id, message.dungeon_id, nn(message.packs) * nn(message.count), message.critChance, message.critBonus, message.critLuck, message.vfx);
    msg.post("main:/overlay#header", "refresh_all");
    defsave.save("Loot", true);
  },
  ["reward_resource"]: function (message_id: any, message: any, sender: any) {
    reward_resource(message.luck, message.map_id, message.dungeon_id, message.packLevel);
  },
  ["gen_adreward"]: function (message_id: any, message: any, sender: any) {
    msg.post(controller, "gen_rewardpack", message);
  },
  ["gen_rewardpack"]: function (message_id: any, message: any, sender: any) {
    message.complete_purchase_callback = t(message.complete_purchase_callback) ? message.complete_purchase_callback : "dungeonmine";
    if (isnil(defsave.loaded.Loot.data.Packs)) defsave.loaded.Loot.data.Packs = [];
    if (isnil(message.packGold) && !isnil(message.packValue)) { message.packGold = message.packValue; }
    if (isnil(message.packXp) && !isnil(message.packLevel)) { message.packXp = message.packLevel; }
    if (isnil(message.packCards) && !isnil(message.packSize)) { message.packCards = message.packSize; }
    T.insert(defsave.loaded.Loot.data.Packs, gen_rewardpack(message.packCards, message.packGold, message.packXp, message.container));
    defsave.save("Loot", true);
    msg.post(controller, "show_openpack", literal({ pack_id: len(defsave.loaded.Loot.data.Packs), complete_purchase_callback: message.complete_purchase_callback }));
  },
  // Queued behind any pack already on screen unless `show` is set; the
  // dungeon screen opens the next waiting pack whenever it comes back.
  ["gen_eventpack"]: function (message_id: any, message: any, sender: any) {
    if (isnil(defsave.loaded.Loot.data.Packs)) defsave.loaded.Loot.data.Packs = [];
    T.insert(defsave.loaded.Loot.data.Packs, gen_eventpack(message));
    defsave.save("Loot", true);
    if (t(message.show)) {
      msg.post(controller, "show_openpack", literal({ pack_id: len(defsave.loaded.Loot.data.Packs), complete_purchase_callback: "dungeonmine" }));
    }
  },
  ["open_pack"]: function (message_id: any, message: any, sender: any) {
    const packs = defsave.loaded.Loot?.data?.Packs;
    if (isnil(packs)) return;
    const n = len(packs);
    for (let i = 1; i <= n; i++) {
      if (!isnil(packs[i - 1])) {
        msg.post(controller, "show_openpack", literal({ pack_id: i, callback: message.callback }));
        break;
      }
    }
  },
  ["close_pack"]: function (message_id: any, message: any, sender: any) {
    open_pack(message.pack_id);
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

void inspect; void progress; void productName; void sell_item;

// Module locals the parity harness dumps (tools/port/parity/README.md, State dump format).
M.__parity_locals = () => ({ EVENT_WEIGHT, JUNK, attFactor, drawWeight });

export default M;
