// actions.lua
import { vmath, json, sys, print, gui, msg } from '../engine';
import { S, T, M as LM, t, cat, tostring, format, os, pairs, pairsKeys, len, strlen, numToStr, literal, tracked } from '../lua';
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

// type(v) == "table": plain objects and arrays. Vectors, nodes and URLs are userdata and are shared.
function isTable(v: any): boolean {
  if (typeof v !== "object" || v === null) return false;
  if (Array.isArray(v)) return true;
  const p = Object.getPrototypeOf(v);
  return p === Object.prototype || p === null;
}

/** Deep copy. Arrays stay arrays; keys are inserted in pairs order, as the Lua does. */
M.clone = function clone(table: any): any {
  if (!isTable(table)) return table;
  if (Array.isArray(table)) {
    const target: any[] = [];
    const n = table.length;
    for (let i = 0; i < n; i++) {
      const v = table[i];
      if (v !== undefined && v !== null) target[i] = isTable(v) ? clone(v) : v;
    }
    // Named fields of a mixed table follow the sequence in pairs order; JS lists
    // integer keys first, so the last key tells whether there are any.
    const keys = Object.keys(table);
    if (keys.length && !/^\d+$/.test(keys[keys.length - 1])) {
      for (const k of pairsKeys(table)) {
        if (typeof k === "number") continue;
        const v = table[k as any];
        if (v !== undefined && v !== null) target[k as any] = isTable(v) ? clone(v) : v;
      }
    }
    return target;
  }
  const target: any = {};
  for (const k of pairsKeys(table)) {
    const v = table[k as any];
    if (v !== undefined && v !== null) target[k as any] = isTable(v) ? clone(v) : v;
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

// Time left on a live event, coarse enough to read at a glance: "6d 23h",
// "5h 12m", then "4m 09s" in the last hour.
M.format_countdown = function (seconds: any) {
  seconds = Math.max(0, Math.floor(seconds));
  const d = Math.floor(seconds / 86400);
  const h = Math.floor(LM.mod(seconds, 86400) / 3600);
  const m = Math.floor(LM.mod(seconds, 3600) / 60);
  const s = LM.mod(seconds, 60);
  if (d > 0) return format("%dd %dh", d, h);
  if (h > 0) return format("%dh %dm", h, m);
  return format("%dm %02ds", m, s);
};

/* Drop icons ship at two sizes. The frame named after the item is the
detailed one, painted for the resource popup and the loot row where it is
shown large. The "_small" frame beside it is the same item redrawn down to a
bold silhouette and two or three colours, because the detailed art turns to
mush in the places it is only a couple of dozen units across — the hire and
unlock cost rows, where it shares a line with text. Everything roomier than
that, the quest chips and the sell grid included, wants the detail. Pick by
how big the node actually draws, so a node that is resized or rescaled later
still gets the right one. */
const SMALL_ICON_MAX = 48;
// Henchmen icons follow the same rule: "<name>_icon" is the detailed bust,
// "<name>_icon_small" the same bust simplified for the cost row and the
// producer count on each card.
const TWO_SIZE_TEXTURES: any = { items_drops: true, henchmen_portraits: true };

/* Card art comes in three shapes — hero portraits are landscape, henchmen
and gear cards are 2:3, drop icons are square — but every card window is one
fixed slot behind a stencil, sized by hand for whichever shape the screen was
first built around. Everything else then floats in the middle of a grey panel.
So measure the frame the art node is playing, scale it to cover the window,
and let the stencil crop the overflow. */

// The card nodes are SIZE_MODE_AUTO in their scenes, which is what makes
// play_flipbook report the frame's real size, but a set_size only sticks in
// SIZE_MODE_MANUAL. Changing the mode can leave a node drawing the whole atlas
// page instead of its frame, so the frame is played again after each change
// rather than trusting the engine to keep it.
M.measure_card_art = function (/*required*/node: any) {
  const frame = gui.get_flipbook(node);
  gui.set_size_mode(node, gui.SIZE_MODE_AUTO);
  gui.play_flipbook(node, frame);
  const art = gui.get_size(node);
  gui.set_size_mode(node, gui.SIZE_MODE_MANUAL);
  gui.play_flipbook(node, frame);
  return art;
};

// window is the stencil the art node is parented to, so its size is already in
// the space the art is sized and positioned in. The art's offset inside the
// window is covered as well, so a node nudged off centre never opens a gap
// along one edge.
M.fill_card_window = function (/*required*/node: any, /*required*/window: any) {
  const art = M.measure_card_art(node);
  if (art.x <= 0 || art.y <= 0) return;
  const scale = gui.get_scale(node), pos = gui.get_position(node), win = gui.get_size(window);
  const cover = Math.max((win.x + 2 * Math.abs(pos.x)) / (art.x * scale.x),
                         (win.y + 2 * Math.abs(pos.y)) / (art.y * scale.y));
  gui.set_size(node, vmath.vector3(art.x * cover, art.y * cover, art.z));
};

/* Mini icons -- anything drawn at the small-frame size, plus henchmen icons
at every size -- get a black outline so they stand out on card art and
coloured bars alike, with a white outline round that so they also read on dark
art. GUI box nodes have no outline of their own, so the icon gains a child.
Most mini frames have a baked copy, "<frame>_outlined" (tools/bake_outlines.py):
the same art with both rings round it, OUTLINE_SCALE times the frame, so one
child that size lays it exactly over the icon. Any other frame is outlined at
run time: a ring of white copies of its frame nudged out twice as far as a ring
of black ones drawn over them, then a "face" copy in the icon's own colour on
top. That costs 17 nodes against a scene's budget of at most 1024, which a
screenful of icons runs through, so it is only the fallback.
Children move, scale and hide with their parent, so callers keep treating the
icon as one node; the parent still draws, but entirely under the child. The
child takes the node's colour when the icon is set, so tint the node before
calling set_item_icon. */
const OUTLINED_TEXTURES: any = { henchmen_portraits: true };
const OUTLINE_WIDTH = 0.05;      // each ring, as a fraction of the icon's longer side
// Must match tools/bake_outlines.py.
const OUTLINE_SCALE = 1.25;
// Where each atlas's baked frames live: main has no room left on its page.
const OUTLINE_HOME: any = { main: "items_drops" };
// Playing a frame an atlas lacks is no Lua error in this engine: the node keeps
// a bad frame index and the renderer aborts. So only frames listed here are
// played as baked outlines.
// BAKED_OUTLINES: written by tools/bake_outlines.py
const BAKED_OUTLINES: any = {
  henchmen_portraits: {
    ["bell_diver_icon_small_outlined"]: true,
    ["bonecrusher_icon_small_outlined"]: true,
    ["bramble_knight_icon_small_outlined"]: true,
    ["burrow_digger_icon_small_outlined"]: true,
    ["carrot_smuggler_icon_small_outlined"]: true,
    ["deserthippie_icon_small_outlined"]: true,
    ["dwarvenmage_icon_small_outlined"]: true,
    ["farmhand_icon_small_outlined"]: true,
    ["forestranger_icon_small_outlined"]: true,
    ["goblingravedigger_icon_small_outlined"]: true,
    ["halfogrewarrior_icon_small_outlined"]: true,
    ["knightswhosaygee_icon_small_outlined"]: true,
    ["lantern_bearer_icon_small_outlined"]: true,
    ["moon_howler_icon_small_outlined"]: true,
    ["nerdylibrarian_icon_small_outlined"]: true,
    ["rabbithunter_icon_small_outlined"]: true,
    ["ratcatcher_icon_small_outlined"]: true,
    ["reed_cutter_icon_small_outlined"]: true,
    ["spiderrancher_icon_small_outlined"]: true,
    ["stone_whisperer_icon_small_outlined"]: true,
    ["tunnelpatrol_icon_small_outlined"]: true,
    ["wererabbit_envoy_icon_small_outlined"]: true,
    ["wererabbitnegotiator_icon_small_outlined"]: true,
    ["woodlandscout_icon_small_outlined"]: true,
  },
  items_drops: {
    ["abyss_glass_small_outlined"]: true,
    ["abyss_ink_small_outlined"]: true,
    ["apple_small_outlined"]: true,
    ["bat_ear_small_outlined"]: true,
    ["bat_fang_small_outlined"]: true,
    ["bat_wing_small_outlined"]: true,
    ["black_plate_small_outlined"]: true,
    ["black_spangle_small_outlined"]: true,
    ["blackmaw_fang_small_outlined"]: true,
    ["blaze_powder_small_outlined"]: true,
    ["blaze_rod_small_outlined"]: true,
    ["bone_fetish_small_outlined"]: true,
    ["bone_small_outlined"]: true,
    ["book_mouldy_small_outlined"]: true,
    ["book_small_outlined"]: true,
    ["bramble_berry_small_outlined"]: true,
    ["brass_gear_small_outlined"]: true,
    ["brass_whistle_small_outlined"]: true,
    ["brimstone_small_outlined"]: true,
    ["captains_lantern_small_outlined"]: true,
    ["carrot_small_outlined"]: true,
    ["charred_torch_small_outlined"]: true,
    ["chiefs_horn_small_outlined"]: true,
    ["childs_mitten_small_outlined"]: true,
    ["clay_ball_small_outlined"]: true,
    ["clock_heart_small_outlined"]: true,
    ["coal_small_outlined"]: true,
    ["cobweb_small_outlined"]: true,
    ["coral_spear_small_outlined"]: true,
    ["crawler_poop_small_outlined"]: true,
    ["cursed_candle_small_outlined"]: true,
    ["deep_scale_small_outlined"]: true,
    ["deep_sigil_small_outlined"]: true,
    ["dentedhelmet_small_outlined"]: true,
    ["dipped_feather_small_outlined"]: true,
    ["dragon_breath_small_outlined"]: true,
    ["dragon_egg_small_outlined"]: true,
    ["driftwood_small_outlined"]: true,
    ["drowned_charm_small_outlined"]: true,
    ["drowned_idol_small_outlined"]: true,
    ["eel_fang_small_outlined"]: true,
    ["eel_hide_small_outlined"]: true,
    ["enchanted_book_small_outlined"]: true,
    ["end_crystal_small_outlined"]: true,
    ["ender_pearl_small_outlined"]: true,
    ["faded_ribbon_small_outlined"]: true,
    ["fire_oil_small_outlined"]: true,
    ["frost_rune_small_outlined"]: true,
    ["frozen_candle_small_outlined"]: true,
    ["frozen_tear_small_outlined"]: true,
    ["gargoyle_hide_small_outlined"]: true,
    ["gatehouse_key_small_outlined"]: true,
    ["ghast_flesh_small_outlined"]: true,
    ["ghoul_flesh_small_outlined"]: true,
    ["ghoul_tooth_small_outlined"]: true,
    ["giants_ring_small_outlined"]: true,
    ["glacier_heart_small_outlined"]: true,
    ["glass_eye_small_outlined"]: true,
    ["glow_worm_small_outlined"]: true,
    ["glowcap_small_outlined"]: true,
    ["gnawed_root_small_outlined"]: true,
    ["gnoll_hide_small_outlined"]: true,
    ["goblin_knife_small_outlined"]: true,
    ["gold_bell_small_outlined"]: true,
    ["golden_acorn_small_outlined"]: true,
    ["grave_coin_small_outlined"]: true,
    ["grave_dust_small_outlined"]: true,
    ["hags_eye_small_outlined"]: true,
    ["horror_claw_small_outlined"]: true,
    ["hound_collar_small_outlined"]: true,
    ["huntsmans_key_small_outlined"]: true,
    ["imp_horn_small_outlined"]: true,
    ["iron_shackle_small_outlined"]: true,
    ["kelp_shroud_small_outlined"]: true,
    ["knight_crest_small_outlined"]: true,
    ["knowledge_book_small_outlined"]: true,
    ["kobold_eye_small_outlined"]: true,
    ["kobold_spear_small_outlined"]: true,
    ["lead_small_outlined"]: true,
    ["leather_small_outlined"]: true,
    ["magma_cream_small_outlined"]: true,
    ["maws_heart_small_outlined"]: true,
    ["mirror_shard_small_outlined"]: true,
    ["moon_carrot_small_outlined"]: true,
    ["moon_clover_small_outlined"]: true,
    ["moon_lily_small_outlined"]: true,
    ["moon_reed_small_outlined"]: true,
    ["moon_shard_small_outlined"]: true,
    ["moonwater_small_outlined"]: true,
    ["name_tag_small_outlined"]: true,
    ["nautilus_shell_small_outlined"]: true,
    ["nether_wart_small_outlined"]: true,
    ["notched_blade_small_outlined"]: true,
    ["occult_staff_small_outlined"]: true,
    ["old_bone_small_outlined"]: true,
    ["oldboot_small_outlined"]: true,
    ["orge_toe_small_outlined"]: true,
    ["painted_mask_small_outlined"]: true,
    ["paper_lantern_small_outlined"]: true,
    ["paper_small_outlined"]: true,
    ["paw_ring_small_outlined"]: true,
    ["pawn_outlined"]: true,
    ["phantom_membrane_small_outlined"]: true,
    ["pixie_wings_small_outlined"]: true,
    ["potato_small_outlined"]: true,
    ["prismarine_crystals_small_outlined"]: true,
    ["prismarine_shard_small_outlined"]: true,
    ["pumpkin_seeds_small_outlined"]: true,
    ["puppet_string_small_outlined"]: true,
    ["quartz_small_outlined"]: true,
    ["rabbit_foot_small_outlined"]: true,
    ["rabbit_hide_small_outlined"]: true,
    ["raider_fur_small_outlined"]: true,
    ["rat_tail_small_outlined"]: true,
    ["rat_whisker_small_outlined"]: true,
    ["rigged_dice_small_outlined"]: true,
    ["rime_iron_small_outlined"]: true,
    ["rime_shard_small_outlined"]: true,
    ["ringmasters_contract_small_outlined"]: true,
    ["rotten_flesh_small_outlined"]: true,
    ["rune_pebble_small_outlined"]: true,
    ["rusty_key_small_outlined"]: true,
    ["shadow_fur_small_outlined"]: true,
    ["shadow_silk_small_outlined"]: true,
    ["shell_plate_small_outlined"]: true,
    ["signed_contract_small_outlined"]: true,
    ["silver_fur_small_outlined"]: true,
    ["slime_ball_small_outlined"]: true,
    ["slime_jelly_small_outlined"]: true,
    ["snail_shell_small_outlined"]: true,
    ["snowball_small_outlined"]: true,
    ["sodden_coin_small_outlined"]: true,
    ["spawn_ichor_small_outlined"]: true,
    ["spider_eye_small_outlined"]: true,
    ["spider_silk_small_outlined"]: true,
    ["stick_small_outlined"]: true,
    ["stolen_fire_small_outlined"]: true,
    ["stolen_gift_small_outlined"]: true,
    ["strongmans_chain_small_outlined"]: true,
    ["sucker_pearl_small_outlined"]: true,
    ["sunken_bell_small_outlined"]: true,
    ["swallowed_coin_small_outlined"]: true,
    ["tentacle_hook_small_outlined"]: true,
    ["thistle_small_outlined"]: true,
    ["throneroom_key_small_outlined"]: true,
    ["throwing_knife_small_outlined"]: true,
    ["tincup_small_outlined"]: true,
    ["troll_hide_small_outlined"]: true,
    ["troll_tusk_small_outlined"]: true,
    ["turnip_small_outlined"]: true,
    ["velvet_blindfold_small_outlined"]: true,
    ["war_medal_small_outlined"]: true,
    ["wheat_seeds_small_outlined"]: true,
    ["winter_pelt_small_outlined"]: true,
    ["winter_rune_small_outlined"]: true,
    ["wolf_fang_small_outlined"]: true,
    ["wolf_paw_small_outlined"]: true,
    ["wolf_pelt_small_outlined"]: true,
    ["wraith_frost_small_outlined"]: true,
    ["wraith_wisp_small_outlined"]: true,
    ["zombie_flesh_small_outlined"]: true,
  },
};
// END BAKED_OUTLINES
// Rings drawn outermost first, eight copies each.
const OUTLINE_RINGS: any[] = [
  { color: vmath.vector4(1, 1, 1, 1), reach: 2, copies: 8 },
  { color: vmath.vector4(0, 0, 0, 1), reach: 1, copies: 8 },
];
const OUTLINE_PARTS: any[] = [];
for (let r = 1; r <= len(OUTLINE_RINGS); r++) {
  const ring = OUTLINE_RINGS[r - 1];
  for (let i = 0; i <= ring.copies - 1; i++) {
    const a = i * 2 * Math.PI / ring.copies;
    OUTLINE_PARTS[len(OUTLINE_PARTS) + 1 - 1] = {
      dir: vmath.mul(vmath.vector3(Math.cos(a), Math.sin(a), 0), ring.reach), color: ring.color };
  }
}
// Where a pivot sits in its node, as fractions of the size from the centre.
const PIVOT_AT: any = {
  [gui.PIVOT_CENTER]: vmath.vector3(0, 0, 0),
  [gui.PIVOT_N]: vmath.vector3(0, 0.5, 0),   [gui.PIVOT_S]: vmath.vector3(0, -0.5, 0),
  [gui.PIVOT_E]: vmath.vector3(0.5, 0, 0),   [gui.PIVOT_W]: vmath.vector3(-0.5, 0, 0),
  [gui.PIVOT_NE]: vmath.vector3(0.5, 0.5, 0), [gui.PIVOT_NW]: vmath.vector3(-0.5, 0.5, 0),
  [gui.PIVOT_SE]: vmath.vector3(0.5, -0.5, 0), [gui.PIVOT_SW]: vmath.vector3(-0.5, -0.5, 0),
};
// Each entry is { node = icon, scene = its gui script, baked = which kind,
// parts = child nodes or false }, searched with == rather than keyed by node:
// the engine hands out a fresh userdata for the same node each time it is
// looked up, which a table key never matches, so keying by it grew a new
// outline on every refresh until the scene ran out of nodes.
const outlines: any[] = [];

// Every gui script shares this module, and touching another scene's node is
// an error, so entries carry the scene they belong to. A scene is matched on
// its url's hashes: a release build prints every url as
// "main:<unknown>#<unknown>", so a string key made all scenes one, and each
// scene's prune threw out the others' entries and they regrew every frame.
function same_scene(a: any, b: any) {
  return a.socket === b.socket && a.path === b.path && a.fragment === b.fragment;
}

function find_outline(node: any, scene: any) {
  for (let i = 1; i <= len(outlines); i++) {
    const entry = outlines[i - 1];
    if (same_scene(entry.scene, scene) && entry.node === node) return entry;
  }
  return undefined;
}

function pcall(f: (...a: any[]) => any, ...args: any[]): boolean {
  try { f(...args); return true; } catch (e) { return false; }
}

// Forget this scene's icons whose node has since been deleted, copies and all.
// Done before every search, since comparing against a deleted node can raise.
function prune_outlines(scene: any) {
  for (let i = len(outlines); i >= 1; i--) {
    if (same_scene(outlines[i - 1].scene, scene) && !pcall(gui.get_position, outlines[i - 1].node)) {
      T.remove(outlines, i);
    }
  }
}

function copy_frame(node: any, child: any) {
  gui.set_texture(child, gui.get_texture(node));
  gui.set_size_mode(child, gui.get_size_mode(node));
  gui.play_flipbook(child, gui.get_flipbook(node));
  gui.set_size(child, gui.get_size(node));
}

function make_parts(node: any, count: number): any {
  const parts: any[] = [];
  const ok = pcall(function () {
    for (let i = 1; i <= count; i++) {
      const part = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(0, 0, 0));
      parts[i - 1] = part;
      gui.set_parent(part, node);
    }
  });
  if (ok) return parts;
  // Out of nodes: give back what was taken and leave this icon plain.
  for (let i = 1; i <= len(parts); i++) gui.delete_node(parts[i - 1]);
  return false;
}

function update_rings(node: any, parts: any[]) {
  const size = gui.get_size(node);
  const width = OUTLINE_WIDTH * Math.max(size.x, size.y);
  for (let i = 1; i <= len(parts); i++) {
    const part = parts[i - 1];
    gui.set_enabled(part, true);
    gui.set_pivot(part, gui.get_pivot(node));
    copy_frame(node, part);
    const spec = OUTLINE_PARTS[i - 1];
    if (spec) {
      gui.set_position(part, vmath.mul(spec.dir, width));
      gui.set_color(part, spec.color);
    } else {
      gui.set_position(part, vmath.vector3(0, 0, 0));
      gui.set_color(part, gui.get_color(node));
    }
  }
}

// The baked child is centred on the icon whatever the icon's pivot, since its
// rings reach out evenly on every side.
function update_baked(node: any, part: any, home: any, frame: any) {
  gui.set_texture(part, home);
  gui.set_size_mode(part, gui.SIZE_MODE_MANUAL);
  gui.play_flipbook(part, frame);
  const size = gui.get_size(node);
  const pa = PIVOT_AT[gui.get_pivot(node)];
  const at = pa !== undefined ? pa : PIVOT_AT[gui.PIVOT_CENTER];
  gui.set_pivot(part, gui.PIVOT_CENTER);
  gui.set_position(part, vmath.vector3(-at.x * size.x, -at.y * size.y, 0));
  gui.set_size(part, vmath.mul(size, OUTLINE_SCALE));
  gui.set_color(part, gui.get_color(node));
  gui.set_enabled(part, true);
}

function drop_parts(entry: any) {
  const parts = entry.parts || [];
  for (let i = 1; i <= len(parts); i++) gui.delete_node(parts[i - 1]);
  entry.parts = false;
}

// An outline is decoration, so nothing about it may take a screen down: a
// scene with no nodes to spare, or an icon the engine will not copy, just
// draws the icon without one.
function set_outline(node: any, on: any, texture: any, frame: any) {
  const scene = msg.url();
  prune_outlines(scene);
  let entry = find_outline(node, scene);
  if (!on) {
    if (entry && entry.parts) {
      for (let i = 1; i <= len(entry.parts); i++) gui.set_enabled(entry.parts[i - 1], false);
    }
    return;
  }
  if (!entry) {
    entry = { node: node, scene: scene, parts: false };
    outlines[len(outlines) + 1 - 1] = entry;
  }

  const home = t(OUTLINE_HOME[texture]) ? OUTLINE_HOME[texture] : texture;
  const baked = cat(frame, "_outlined");
  // A frame that had no baked copy for this icon is not tried again, which
  // would rebuild its rings on every refresh.
  const listed = t(BAKED_OUTLINES[home]) && t(BAKED_OUTLINES[home][baked]);
  if (listed && entry.unbaked !== cat(home, "/", baked)) {
    if (entry.baked !== true) {
      drop_parts(entry);
      entry.baked = true; entry.parts = make_parts(node, 1);
    }
    if (!entry.parts || pcall(update_baked, node, entry.parts[0], home, baked)) return;
    entry.unbaked = cat(home, "/", baked);
  }

  // No baked copy of this frame, or one this scene cannot draw.
  if (entry.baked !== false) {
    drop_parts(entry);
    entry.baked = false; entry.parts = make_parts(node, len(OUTLINE_PARTS) + 1);
  }
  if (entry.parts && !pcall(update_rings, node, entry.parts)) {
    for (let i = 1; i <= len(entry.parts); i++) gui.set_enabled(entry.parts[i - 1], false);
  }
}

// Plays the icon's frame on the node and returns the name of the frame played.
function play_icon(node: any, icon: any) {
  if (t(TWO_SIZE_TEXTURES[icon.texture])) {
    const size = gui.get_size(node), scale = gui.get_scale(node);
    if (Math.max(size.x * scale.x, size.y * scale.y) <= SMALL_ICON_MAX) {
      // The small frames are stored at half size. A node that sizes itself to
      // its frame would shrink to match, so pin the size it has now first;
      // the mode changes before the frame is played, which keeps the frame.
      if (gui.get_size_mode(node) === gui.SIZE_MODE_AUTO) {
        gui.set_size_mode(node, gui.SIZE_MODE_MANUAL);
        gui.set_size(node, size);
      }
      // An atlas without the small set still has the detailed frame, so
      // fall back to it rather than taking the screen down with us.
      if (pcall(gui.play_flipbook, node, cat(icon.flipbook, "_small"))) {
        return cat(icon.flipbook, "_small");
      }
    }
  }
  gui.play_flipbook(node, icon.flipbook);
  return icon.flipbook;
}

M.set_item_icon = function (/*required*/node: any, /*required*/icon: any) {
  if (!t(icon) || !t(icon.texture) || icon.flipbook === "") return false;
  gui.set_texture(node, icon.texture);
  const frame = play_icon(node, icon);
  const size = gui.get_size(node), scale = gui.get_scale(node);
  set_outline(node, OUTLINED_TEXTURES[icon.texture] === true
    || Math.max(size.x * scale.x, size.y * scale.y) <= SMALL_ICON_MAX, icon.texture, frame);
  return true;
};

/* Heroes come in two kinds (gdd/heroes-roster.md). A field hero is assigned
to a dungeon and its power fires there. A patron is never assigned: owning one
switches on a permanent bonus wherever that bonus applies. A patron that is
locked, or not yet levelled, counts as level 0, which every caller reads as no
bonus at all. */
const HERO_MAX_LEVEL = 13;

// True when at least one level in the dungeon has been clicked open.
M.dungeon_has_open_level = function (map_id: any, dungeon_id: any) {
  const map = t(defsave.loaded.Map) ? defsave.loaded.Map.data?.[map_id - 1] : undefined;
  const dungeon = t(map) ? map[dungeon_id - 1] : undefined;
  if (!t(dungeon) || !t(dungeon.Levels)) return false;
  for (let l = 1; l <= len(dungeon.Levels); l++) {
    const level = dungeon.Levels[l - 1];
    if (!t(level.isLocked) && t(level.wasClickedOpen)) return true;
  }
  return false;
};

M.is_patron = function (hero: any) {
  return hero !== undefined && hero !== null && hero.Kind === "Patron";
};

// Until a second field hero is unlocked, the starter hero stays in its slot
// and cannot be removed.
M.can_unassign_hero = function () {
  const heroes = t(defsave.loaded.Hero) ? defsave.loaded.Hero.data : undefined;
  if (!t(heroes)) return false;
  let count = 0;
  for (let i = 1; i <= len(heroes); i++) {
    const hero = heroes[i - 1];
    if (!t(hero.Locked) && !M.is_patron(hero)) {
      count = count + 1;
      if (count >= 2) return true;
    }
  }
  return false;
};

M.patron_level = function (name: any) {
  const heroes = t(defsave.loaded.Hero) ? defsave.loaded.Hero.data : defsave.loaded.Hero;
  if (!t(heroes)) return 0;
  for (let i = 1; i <= len(heroes); i++) {
    const hero = heroes[i - 1];
    if (hero.Name === name) {
      if (t(hero.Locked) || !t(hero.Level) || hero.Level < 1) return 0;
      return Math.min(hero.Level, HERO_MAX_LEVEL);
    }
  }
  return 0;
};

// A patron's bonus at its level, growing evenly (by the same factor each
// level) from `at1` at level 1 to `at13` at level 13. `none` when not owned.
M.patron_value = function (name: any, at1: number, at13: number, none: any) {
  const level = M.patron_level(name);
  if (level < 1) return none;
  return at1 * Math.pow(at13 / at1, (level - 1) / (HERO_MAX_LEVEL - 1));
};

// A field hero's level for its power: its own level, plus the levels Sir
// Aldous lends every other hero.
M.hero_power_level = function (hero_id: any) {
  const hero = defsave.loaded.Hero.data[hero_id - 1];
  const level = t(hero) && t(hero.Level) ? hero.Level : 1;
  return level + Math.floor(M.patron_value("HERO_SIRALDOUSBRIGHTWATER_NAME", 1, 5, 0) + 0.5);
};

// A field hero's power strength at its level, on the same even curve, scaled
// down when Lady Vesper is only echoing it.
M.hero_power = function (message: any, at1: number, at13: number) {
  return M.hero_scale(M.hero_power_level(message.hero_id), at1, at13) * (t(message.echo_scale) ? message.echo_scale : 1);
};

// A field hero's power strength at a level, on the same even curve. Levels
// Sir Aldous lends carry on up the curve past 13.
M.hero_scale = function (level: any, at1: number, at13: number) {
  level = Math.max(1, t(level) ? level : 1);
  return at1 * Math.pow(at13 / at1, (level - 1) / (HERO_MAX_LEVEL - 1));
};

/* Live state the field heroes share between the controllers and the dungeon
screen. Nothing here is saved: a hex or an echo only lasts the session. */
M.herostate = literal({
  hex: tracked({}),        // ["map-dungeon"] = { multiplier, ends }
  lastpower: tracked({}),  // ["map-dungeon"] = { hero_id, actions } of the last power fired there
});

M.hex_multiplier = function (map_id: any, dungeon_id: any) {
  const hex = M.herostate.hex[cat(map_id, "-", dungeon_id)];
  if (t(hex) && hex.ends > os.clock()) return hex.multiplier;
  return 1;
};

// Tomas Quill's lesson plans: every XP gain is worth this much more.
M.xp_factor = function () {
  return 1 + M.patron_value("HERO_TOMASQUILL_NAME", 0.20, 3.0, 0);
};

// The live events in the order they run, for the screens that list them: the
// map each is played on, the hero it pays, its XP stat (`shards`) and the
// chest it pays in. repController holds everything else about them.
M.EVENTS = [
  literal({ key: "WEREMOON", map_id: 2, hero_id: 4, shards: "moonshard", chest: "moon" }),
  // Enemy events (gdd/enemy-events.md): columns of enemies to fight through
  // rather than levels worked by henchmen. The order keeps run 1 (from 26
  // October 2026) on the Blackmaw Siege, with the threat events after it.
  literal({ key: "BLACKMAW", map_id: 6, hero_id: 7, shards: "siegexp", chest: "war", enemies: true }),
  literal({ key: "TITANSWELL", map_id: 3, hero_id: 8, shards: "titanswellxp", chest: "tidebound", enemies: true }),
  literal({ key: "MIDNIGHT", map_id: 4, hero_id: 10, shards: "midnightxp", chest: "masque", enemies: true }),
  literal({ key: "LONGNIGHT", map_id: 5, hero_id: 16, shards: "longnightxp", chest: "hearth", enemies: true }),
];

// One fixed weekly schedule for everyone, back to back, round the list above.
M.EVENT_SCHEDULE_START = 1792368000; // Monday 19 October 2026, 00:00 UTC
M.EVENT_RUN_SECONDS = 7 * 24 * 60 * 60;

// The run playing at `now`, the event it plays and when it ends.
M.event_schedule = function (now: any): [number, any, number] {
  const run = Math.floor((now - M.EVENT_SCHEDULE_START) / M.EVENT_RUN_SECONDS);
  const event = M.EVENTS[(LM.mod(run, len(M.EVENTS)) + 1) - 1];
  return [run, event, M.EVENT_SCHEDULE_START + (run + 1) * M.EVENT_RUN_SECONDS];
};

// The event after the one playing at `now`, and when it starts.
M.next_event = function (now: any): [any, number] {
  const [run, , ends_at] = M.event_schedule(now);
  return [M.EVENTS[(LM.mod(run + 1, len(M.EVENTS)) + 1) - 1], ends_at];
};

// When an event that ends at `ends_at` next comes round.
M.event_returns_at = function (ends_at: any) {
  return ends_at + (len(M.EVENTS) - 1) * M.EVENT_RUN_SECONDS;
};

M.event_on_map = function (map_id: any) {
  for (let e = 1; e <= len(M.EVENTS); e++) {
    const event = M.EVENTS[e - 1];
    if (event.map_id === map_id) return event;
  }
  return undefined;
};

// An event's shards are its XP: they pay for level-ups of its cards and are
// what its items' rank-ups give, so an event never spends the main game's XP.
// nil for the main map and for anything not on a map, like heroes.
M.event_shards = function (map_id: any) {
  const event = M.event_on_map(map_id);
  return t(event) ? event.shards : event;
};

// What a card on this map levels up with: how much the player has, the loc
// key of its name, and the event's shard stat when it is shards.
M.levelup_funds = function (map_id: any) {
  const event = M.event_on_map(map_id);
  if (t(event)) {
    const resource = defsave.loaded.Resources.data[event.shards];
    // An enemy event's XP is called XP.
    return literal({ have: resource.Count, shards: event.shards, label: t(event.enemies) ? "XP" : "SHARDS",
      name: resource.Name, need: cat("EVENT_", event.key, "_NEED_XP") });
  }
  return literal({ have: defsave.get("Currency", "Xp"), label: "XP" });
};

// Chapter quests running at once: the slots the chapter has opened (up to
// three), plus Grubb's extra notices (one, two at level 7, three at 13).
M.quest_slots = function (slots: any) {
  const level = M.patron_level("HERO_GRUBB_NAME");
  const extra = level >= 13 ? 3 : level >= 7 ? 2 : level >= 1 ? 1 : 0;
  return Math.min(3, t(slots) ? slots : 1) + extra;
};

// Ledger Goldwhistle's friends' rates: the share of a hire's cost still paid.
M.hire_cost_factor = function () {
  return 1 - M.patron_value("HERO_LEDGERGOLDWHISTLE_NAME", 0.10, 0.60, 0);
};

/* Enemy events (gdd/enemy-events.md). Each row's henchman slot holds its
enemy, with Size the count left. Nothing fights on its own: enemies only
take damage when a hero sent to the location fires its power. */
M.ENEMY_WAVE_GROWTH = 1.3;

M.enemy_map = function (map_id: any) {
  const event = M.event_on_map(map_id);
  return event !== undefined && event !== null && event.enemies === true;
};

// What a location's gear of one kind is worth: its Factor to the power of its
// level, 1 with none. An enemy map's gear is worn by the whole column.
M.enemy_gear = function (map_id: any, dungeon_id: any, kind: any) {
  // Henchmen are read in before the gear is.
  if (!(t(defsave.loaded.Gear) && t(defsave.loaded.Gear.data))) return 1;
  const data = defsave.loaded.Gear.data;
  for (let g = 1; g <= len(data); g++) {
    const gear = data[g - 1];
    if (gear.map_id === map_id && gear.dungeon_id === dungeon_id && gear.Modifier.Type === kind) {
      return Math.pow(gear.Modifier.Factor, t(gear.Level) ? gear.Level : 0);
    }
  }
  return 1;
};


// How hard a henchman works right now: the global boost, Grisla's hex on its
// dungeon, and Henrietta's bonus on the Farm. The henchmen tick, their timers
// and the dungeon screen's progress bars all read this one rate.
const FARM = { map_id: 1, dungeon_id: 1 };
M.henchmen_rate = function (henchman: any) {
  const gb = defsave.get("Stats", "globalBoost");
  let rate = (t(gb) ? gb : 1) * M.hex_multiplier(henchman.map_id, henchman.dungeon_id);
  if (henchman.map_id === FARM.map_id && henchman.dungeon_id === FARM.dungeon_id) {
    rate = rate * M.patron_value("HERO_HENRIETTAPLOUGH_NAME", 2, 64, 1);
  }
  return rate;
};


export default M;
