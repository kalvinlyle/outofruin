// controllers/lootController.lua
import inspect_ from '../inspect';
import actions_ from '../actions';
import random_ from '../random/random';
import progress_ from '../progress/progress';
import defsave_ from '../defsave/defsave';
import { msg, hash, print } from '../../engine';
import { pairs, literal, len, t, T, M as LM, tonumber } from '../../lua';
import { G } from '../globals';

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

function add_cards_to_deck(deck: any, data: any, data_type: any) {
  for (let c = 1; c <= len(data); c++) {
    const card = data[c - 1];
    if (card.Status === "Unlocked") {
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

function draw_cards(num: any, maxUniqueCards?: any) {
  const cards: any = {};
  let card: any = {};
  let totalCards = 0;
  let totalUnique = 0;
  maxUniqueCards = t(maxUniqueCards) ? maxUniqueCards : 9;

  while (totalCards < num) {
    card = pick_card(num);
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
  pack.resources = [];

  void item_pack; void totalValue; void packItems; void totalCards;
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
        if (LM.random(1, 10000) <= nn(critChance) * 100) resource.Bonus = nn(critBonus) - 1;

        resource.Average = Math.floor((nn(resource.Max) - nn(resource.Min)) / 2) + nn(resource.Min);
        resource.Total = Math.floor(Math.ceil(LM.random(resource.Min, resource.Max) + ((nn(resource.Max) - nn(resource.Min)) * (nn(luck) * attFactor)))) * fullInv * nn(packSize);
        resource.Bonus = Math.floor(resource.Bonus * fullInv * nn(packSize));
        resources[resource.Stat] = literal({ Name: resource.Name, Total: resource.Total, Bonus: resource.Bonus, Icon: resource.Icon, Stat: resource.Stat });
      }
    }
  }


  const lim = nn(multiplier) - (fullInv * invSize);
  for (let i = 1; i <= lim; i++) {
    let resource: any = "";
    [dungeon_data.Levels[level - 1].Loot_Table, resource] = weighted_draw(dungeon_data.Levels[level - 1].Loot_Table);

    resource.Bonus = 0;
    if (LM.random(1, 10000) <= nn(critChance) * 100) resource.Bonus = nn(critBonus) - 1;

    resource.Total = Math.floor(Math.ceil(LM.random(resource.Min, resource.Max) + ((nn(resource.Max) - nn(resource.Min)) * (nn(luck) * attFactor)))) * nn(packSize);
    resource.Bonus = resource.Bonus * nn(packSize);
    if (isnil(resources[resource.Stat])) {
      resources[resource.Stat] = literal({ Name: resource.Name, Total: resource.Total, Bonus: resource.Bonus, Icon: resource.Icon, Stat: resource.Stat });
    } else {
      resources[resource.Stat].Total = resources[resource.Stat].Total + resource.Total;
      resources[resource.Stat].Bonus = resources[resource.Stat].Bonus + resource.Bonus;
    }
  }
  set_inventory(map_id, dungeon_id, level, dungeon_data.Levels[level - 1].Loot_Table);
  if (!isnil(resources)) {
    // local max = table.getn(resources) — unused, no side effects
    for (const [r] of pairs(resources)) {
      const resource = resources[r as any];
      msg.post(controller, "update_stats", literal({ stat: resource.Stat, amount: resource.Total, bonus: resource.Bonus }));

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
            if (LM.random(1, 10000) <= nn(critChance) * 100) resource.Bonus = nn(critBonus) - 1;

            resource.Average = Math.floor((nn(resource.Max) - nn(resource.Min)) / 2) + nn(resource.Min);
            resource.Total = Math.floor(resource.Average * fullInv * nn(packSize));
            resource.Bonus = Math.floor(resource.Bonus * fullInv * nn(packSize));
            resources[resource.Stat] = literal({ Name: resource.Name, Total: resource.Total, Bonus: resource.Bonus, Icon: resource.Icon, Stat: resource.Stat });
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
    if (LM.random(1, 10000) <= nn(critChance) * 100) resource.Bonus = nn(critBonus) - 1;
    resource.Total = Math.floor(Math.ceil(LM.random(resource.Min, resource.Max) + ((nn(resource.Max) - nn(resource.Min)) * (nn(luck) * attFactor)))) * nn(packSize);
    resource.Bonus = resource.Bonus * nn(packSize);

    set_inventory(map_id, dungeon_id, resource.Level, dungeon_data.Levels[resource.Level - 1].Loot_Table);

    if (isnil(resources[resource.Stat])) {
      resources[resource.Stat] = literal({ Name: resource.Name, Level: resource.Level, Total: resource.Total, Bonus: resource.Bonus, Icon: resource.Icon, Stat: resource.Stat });
    } else {
      resources[resource.Stat].Total = resources[resource.Stat].Total + resource.Total;
      resources[resource.Stat].Bonus = resources[resource.Stat].Bonus + resource.Bonus;
    }

  }

  if (!isnil(resources)) {
    // local max = table.getn(resources) — unused, no side effects
    for (const [r] of pairs(resources)) {
      const resource = resources[r as any];
      msg.post(controller, "update_stats", literal({ stat: resource.Stat, amount: resource.Total, bonus: resource.Bonus }));

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
  if (!isnil(defsave.loaded.Loot.data.Packs[num - 1].cards)) {
    for (const [tk, type] of pairs<any>(defsave.loaded.Loot.data.Packs[num - 1].cards)) {
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
      msg.post(controller, "update_stats", literal({ name: resource.Name, icon: resource.Icon, stat: resource.Stat, amount: resource.Total }));
      void r;
    }
  }
  T.remove(defsave.loaded.Loot.data.Packs, num);
  defsave.save("Loot", true);
}

const messageData: any = {};
messageData["all"] = literal({
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
  ["open_pack"]: function (message_id: any, message: any, sender: any) {
    const n = len(defsave.loaded.Loot.data.Packs);
    for (let i = 1; i <= n; i++) {
      if (!isnil(defsave.loaded.Loot.data.Packs[i - 1])) {
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

export default M;
