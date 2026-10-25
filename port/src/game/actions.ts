// actions.lua
import { vmath, json, sys, print } from '../engine';
import { S, T, M as LM, t, cat, tostring, format, os, pairs, len, strlen, numToStr } from '../lua';
import defsave from './defsave/defsave';

const M: any = {};

// Lua t[k] for a table that may be a JS array (index k at k-1).
function getk(tbl: any, k: any) {
  return Array.isArray(tbl) && typeof k === 'number' ? tbl[k - 1] : tbl[k];
}
function setk(tbl: any, k: any, v: any) {
  if (Array.isArray(tbl) && typeof k === 'number') tbl[k - 1] = v;
  else tbl[k] = v;
}

const colors: Record<string, any> = {};
colors.black           = vmath.vector4(        0/255,            0/255,            0/255,              1 );
colors.darkgrey        = vmath.vector4(        108/255,          106/255,          99/255,             1 );
colors.grey            = vmath.vector4(        161/255,          158/255,          148/255,            1 );
colors.darkbrown       = vmath.vector4(        109/255,          95/255,           60/255,             1 );
colors.brown           = vmath.vector4(        183/255,          159/255,          101/255,            1 );
colors.green           = vmath.vector4(        156/255,          170/255,          41/255,             1 );
colors.gold            = vmath.vector4(        240/255,          186/255,          40/255,             1 );
colors.orange          = vmath.vector4(        193/255,          114/255,          0/255,              1 );
colors.red             = vmath.vector4(        202/255,          9/255,            72/255,             1 );
colors.purple          = vmath.vector4(        166/255,          20/255,           202/255,            1 );
colors.darkblue        = vmath.vector4(        27/255,           129/255,          103/255,            1 );
colors.blue            = vmath.vector4(        35/255,           167/255,          134/255,            1 );
colors.white           = vmath.vector4(        255/255,          255/255,          255/255,            1 );

colors.brightred       = vmath.vector4(        255/255,          0/255,            0/255,              1 );
colors.brightgreen     = vmath.vector4(        0/255,            255/255,          0/255,              1 );
colors.brightblue      = vmath.vector4(        0/255,            0/255,            255/255,            1 );
colors.brightyellow    = vmath.vector4(        255/255,          255/255,          0/255,              1 );
colors.brightmagenta   = vmath.vector4(        255/255,          0/255,            255/255,            1 );
colors.brightcyan      = vmath.vector4(        0/255,            255/255,          255/255,            1 );

colors.brightgold      = vmath.vector4(        253/255,          223/255,          59/255,             1 );

/** Returns the shared palette vector itself (its w is mutated), as the Lua does. */
M.get_color = function (/*required*/name: string, /*optional*/alpha?: number) {
  name = S.lower(name); // `or "white"` never applies: string.lower errors on nil
  if (!t(Object.prototype.hasOwnProperty.call(colors, name) ? colors[name] : undefined)) throw new Error("Color does not exist in palette");
  if (t(alpha)) colors[name].w = alpha; else colors[name].w = 1;
  return colors[name];
};

const suffixes: string[][] = [ 
  ["", "K", "M", "B", "T", "Qa", "Qt", "Sx", "Sp", "Oc", "Nn", "Dc", "UDc", "DDc", "TDc", "QaDc", "QtDc", "SxDc", "SpDc", "ODc", 
  "NDc", "Vi", "UVi", "DVi", "TVi", "QaVi", "QtVi", "SxVi", "SpVi", "OcVi", "NnVi", "Tg", "UTg", "DTg", "TTg", "QaTg", "QtTg", "SxTg", "SpTg", "OcTg", 
  "NnTg", "Qd", "UQd", "DQd", "TQd", "QaQd", "QtQd", "SxQd", "SpQd", "OcQd", "NnQd", "Qq", "UQq", "DQq", "TQq", "QaQq", "QtQq", "SxQq", "SpQq", "OcQq", 
  "NnQq", "Sg"], 
  ["", "K", "M", "B", "T", "AA", "BB", "CC", "DD", "EE", "FF", "GG", "HH", "II", "JJ", "KK", "LL", "MM", "NN", "OO", 
  "PP", "QQ", "RR", "SS", "TT", "UU", "VV", "WW", "XX", "YY", "ZZ", "AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG", "HHH", 
  "III", "JJJ", "KKK", "LLL", "MMM", "NNN", "OOO", "PPP", "QQQ", "RRR", "SSS", "TTT", "UUU", "VVV", "WWW", "XXX", "YYY", "ZZZ"],
  ["", " thousand ", " million ", " billion ", " trillion ", " quadrillion ", " quintillion ", " sextillion ", " septillion ", " octillion ", " nonillion ", 
  " decillion ", " undecillion ", " duodecillion ", " tredecillion ", " quattuordecillion ", " quindecillion ", " sedecillion ", " septendecillion ", 
  " octodecillion ", " novemdecillion  ", " vigintillion ", " unvigintillion ", " duovigintillion ", " trevigintillion ", " quattuorvigintillion ", 
  " quinvigintillion ", " sexvigintillion ", " septenvigintillion ", " octovigintillion ", " novemvigintillion ", " trigintillion ", " untrigintillion ", 
  " duotrigintillion ", " tretrigintillion ", " quattuortrigintillion ", " quintrigintillion ", " sextrigintillion ", " septentrigintillion ", 
  " octotrigintillion ", " novemtrigintillion ", " quadragintillion ", " unquadragintillion ", " duoquadragintillion ", " trequadragintillion ", 
  " quattuorquadragintillion ", " quinquadragintillion ", " sexquadragintillion ", " septenquadragintillion ", " octoquadragintillion ", 
  " novemquadragintillion ", " quinquagintillion ", " unquinquagintillion ", " duoquinquagintillion ", " trequinquagintillion ", " quattuorquinquagintillion ", 
  " quinquinquagintillion ", " sexquinquagintillion ", " septenquinquagintillion ", " octoquinquagintillion ", " novemquinquagintillion ", " sexagintillion ", 
  " unsexagintillion ", " duosexagintillion ", " tresexagintillion ", " quattuorsexagintillion ", " quinsexagintillion ", " sexsexagintillion ", 
  " septsexagintillion ", " octosexagintillion ", " octosexagintillion ", " septuagintillion ", " unseptuagintillion ", " duoseptuagintillion ", 
  " treseptuagintillion ", " quinseptuagintillion"," sexseptuagintillion"," septseptuagintillion"," octoseptuagintillion"," novemseptuagintillion",
  " octogintillion"," unoctogintillion"," duooctogintillion"," treoctogintillion"," quattuoroctogintillion"," quinoctogintillion"," sexoctogintillion",
  " septoctogintillion"," octooctogintillion"," novemoctogintillion"," nonagintillion"," unnonagintillion"," duononagintillion", " trenonagintillion ",
  " quattuornonagintillion "," quinnonagintillion "," sexnonagintillion "," septnonagintillion "," octononagintillion "," novemnonagintillion ", " centillion"]
];

/** Returns [string, count] like string.gsub; callers want [0]. */
M.generate_uuid = function (): [string, number] {
  const template = os.date("xx%y-%Vxx%m-%dxx-7x%H-%Mxxxx-xx%Sxxxx");
  return S.gsub(template, '[xy]', function (c: string) {
    const v = (c === 'x') ? LM.random(0, 0xf) : LM.random(8, 0xb);
    return format('%x', v);
  });
};

M.load_from_JSON = function (filename: any) {
  print(cat("ACTIONS: Attemping to load ", filename));
  if (typeof filename !== "string") throw new Error("You must provide `filename` of type `string` to perform `load_from_JSON()`");
  return json.decode(sys.load_resource(filename)!);
};

M.display_number = function (num: number, type?: number, dec?: number, digits?: number): string {
  type = t(type) ? type! : 2;
  dec = t(dec) ? dec! : 1;
  digits = t(digits) ? digits! : 3;
  const negative = num < 0;

  if (negative) num = -num;

  let place = 1;
  while (num >= 1000) {
    num = num / 1000;
    place = place + 1;
  }

  const len_ = strlen(numToStr(Math.floor(num)));
  if (len_ >= digits) {
    dec = 0;
  } else {
    dec = digits - len_;
  }

  num = Math.floor(num * (Math.pow(10, dec))) / (Math.pow(10, dec));

  const list = suffixes[type - 1];
  if (list[place - 1] === undefined) {
    return cat(tostring(num), " I+", tostring(place - len(list)));
  }

  if (negative) num = -num;
  return cat(tostring(num), list[place - 1]);
};

M.load_all_savedata = function (savefile: any) {
  if (!t(defsave.loaded[savefile])) throw new Error(cat(savefile, " does not exist"));
  const data: any[] = [];
  const n = len(defsave.loaded[savefile].data);
  for (let i = 1; i <= n; i++) {
    T.insert(data, defsave.get(savefile, i));
  }
  return data;
};

M.modify_field = function (data: any, id: any, field: any, value: any) {
  const row = getk(data, id);
  if (row !== undefined && row !== null) {
    if (row[field] === undefined || row[field] === null) {
      row[field] = value;
    } else {
      row[field] = row[field] + value;
    }
  }
  return data;
};

M.set_field = function (data: any, id: any, field: any, value: any) {
  if (data !== undefined && data !== null) {
    const row = getk(data, id);
    if (row !== undefined && row !== null) {
      if (row[field] !== undefined && row[field] !== null) {
        row[field] = value;
      }
    }
  }
  return data;
};

/** Returns the 1-based Lua index, or undefined. */
M.findinlist = function (list: any[], value: any) {
  const n = len(list);
  for (let i = 1; i <= n; i++) {
    if (list[i - 1] === value) {
      return i;
    }
  }
  return undefined;
};

/** Returns the 1-based Lua index, or undefined. */
M.findintable = function (data: any[], field: any, value: any) {
  for (let i = 1; i <= len(data); i++) {
    const item = data[i - 1];
    if (item[field] === value) {
      return i;
    }
  }
  return undefined;
};

M.tablelength = function (table: any) {
  if (!t(table)) throw new Error("no table");
  let count = 0;
  for (const _ of pairs(table)) count = count + 1;
  return count;
};

M.tableConcat = function (t1: any[], t2: any[]) {
  if (len(t1) > 1) {
    const n = len(t2);
    for (let i = 1; i <= n; i++) {
      t1[len(t1)] = t2[i - 1];
    }
    return t1;
  } else {
    return t2;
  }
};

/** Deep copy. Arrays stay arrays; keys are inserted in pairs order, as the Lua does. */
M.clone = function (table: any): any {
  if (typeof table !== "object" || table === null) return table;
  const target: any = Array.isArray(table) ? [] : {};
  for (const [k, v] of pairs(table)) {
    if (typeof v === "object" && v !== null) {
      setk(target, k, M.clone(v));
    } else {
      setk(target, k, v);
    }
  }
  if (Array.isArray(table)) {
    // named fields of a mixed table (pairs over a JS array only walks the sequence)
    for (const k of Object.keys(table)) {
      if (!/^\d+$/.test(k)) target[k] = typeof table[k] === "object" && table[k] !== null ? M.clone(table[k]) : table[k];
    }
  }
  return target;
};

M.removefromlist = function (list: any[], value: any) {
  const n = len(list);
  for (let i = 1; i <= n; i++) {
    if (list[i - 1] === value) {
      T.remove(list, i);
    }
  }
  return list;
};

M.removefromtable = function (data: any[], field: any, value: any) {
  // ipairs re-reads data[i] each step, so removals shift what it sees
  for (let i = 1; ; i++) {
    const item = data[i - 1];
    if (item === undefined || item === null) break;
    if (item[field] === value) {
      T.remove(data, i);
    }
  }
  return data;
};

M.get_virtue = function (virtues: any[], virtueName?: any) {
  let x = 0;
  for (let k = 1; k <= len(virtues); k++) {
    const v = virtues[k - 1];
    if (virtueName !== undefined && virtueName !== null) {
      if (v.Virtue === virtueName) x = v.Strength;
    } else {
      x = x + v.Strength;
    }
  }
  return x;
};

M.gen_virtues = function () {
  const virtues: any[] = [];
  const pairings = [
    ["Empathy", "Greed"],
    ["Reason", "Wrath"],
    ["Zeal", "Stasis"],
  ];
  for (let x = 1; x <= len(pairings); x++) {
    const pair = pairings[x - 1];
    virtues[x - 1] = {};
    virtues[x - 1]["Virtue"] = pair[LM.random(1, 2) - 1];
    virtues[x - 1]["Strength"] = 0;
  }
  return virtues;
};

M.add_virtues = function (virtues: any, num: number) {
  for (let x = 1; x <= num; x++) {
    const rand = LM.random(1, 3);
    virtues = M.modify_field(virtues, rand, "Strength", 1);
  }
  return virtues;
};

export default M;
