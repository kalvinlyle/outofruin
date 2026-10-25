// random/random.lua
import { len, M as LM } from '../../lua';

const M: any = {};

M.table = function (list: any[]) { // roll an option from a list in a weighted table formatted { Weight = num, Option = { table } }
  const range = len(list);                 // table range
  const roll = LM.random(1, range);        // random selection
  const choice = list[roll - 1];           // find result in table

  return choice;
};

/** Returns [list, choice] (Lua multiple returns). */
M.table_weighted_draw = function (list: any[]): [any[], any] { // roll an option from a list in a weighted table formatted { Weight = num, Volume = num, Inventory = num, Option = { table } }
  let range = 0;
  let totalInventory = 0;

  for (let n = 1; n <= len(list); n++) {
    totalInventory = totalInventory + list[n - 1]["Inventory"];
  }

  for (let n = 1; n <= len(list); n++) {
    if (totalInventory === 0) list[n - 1]["Inventory"] = list[n - 1]["Volume"];
    if (list[n - 1]["Inventory"] > 0) range = range + list[n - 1]["Weight"];
  }

  let roll = LM.random(1, range);

  let choice: any = {};
  for (let n = 1; n <= len(list); n++) {
    if (list[n - 1]["Inventory"] > 0) {
      choice = list[n - 1]["Option"];
      if (roll <= list[n - 1]["Weight"]) {
        list[n - 1]["Inventory"] = list[n - 1]["Inventory"] - 1;
        break;
      }
      roll = roll - list[n - 1]["Weight"];
    }
  }

  return [list, choice];
};

M.table_weighted = function (list: any[]) { // roll an option from a list in a weighted table formatted { Weight = num, Option = { table } }
  let range = 0;

  for (let n = 1; n <= len(list); n++) {
    range = range + list[n - 1]["Weight"];
  }

  let roll = LM.random(1, range);

  let choice: any = {};
  for (let n = 1; n <= len(list); n++) {
    choice = list[n - 1]["Option"];
    if (roll <= list[n - 1]["Weight"]) break;
    roll = roll - list[n - 1]["Weight"];
  }

  return choice;
};

M.dice_exploding = function (list: any[]) { // roll an option from a list in a weighted table formatted { Die = num, Explode = num, Option = { table } }
  let roll = 0;
  const range = 100;
  let choice: any = {};
  void range;

  for (let num = 1; num <= len(list); num++) {
    roll = LM.random(1, list[num - 1].Die);
    choice = list[num - 1].Option;
    if (roll < list[num - 1].Explode) {
      break;
    }
  }

  return choice;
};

export default M;
