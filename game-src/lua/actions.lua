local defsave = require('defsave/defsave')

local M = {}

local colors = {}
colors.black           = vmath.vector4(        0/255,            0/255,            0/255,              1 )
colors.darkgrey        = vmath.vector4(        108/255,          106/255,          99/255,             1 )
colors.grey            = vmath.vector4(        161/255,          158/255,          148/255,            1 )
colors.darkbrown       = vmath.vector4(        109/255,          95/255,           60/255,             1 )
colors.brown           = vmath.vector4(        183/255,          159/255,          101/255,            1 )
colors.green           = vmath.vector4(        156/255,          170/255,          41/255,             1 )
colors.gold            = vmath.vector4(        240/255,          186/255,          40/255,             1 )
colors.orange          = vmath.vector4(        193/255,          114/255,          0/255,              1 )
colors.red             = vmath.vector4(        202/255,          9/255,            72/255,             1 )
colors.purple          = vmath.vector4(        166/255,          20/255,           202/255,            1 )
colors.darkblue        = vmath.vector4(        27/255,           129/255,          103/255,            1 )
colors.blue            = vmath.vector4(        35/255,           167/255,          134/255,            1 )
colors.white           = vmath.vector4(        255/255,          255/255,          255/255,            1 )

colors.brightred       = vmath.vector4(        255/255,          0/255,            0/255,              1 )
colors.brightgreen     = vmath.vector4(        0/255,            255/255,          0/255,              1 )
colors.brightblue      = vmath.vector4(        0/255,            0/255,            255/255,            1 )
colors.brightyellow    = vmath.vector4(        255/255,          255/255,          0/255,              1 )
colors.brightmagenta   = vmath.vector4(        255/255,          0/255,            255/255,            1 )
colors.brightcyan      = vmath.vector4(        0/255,            255/255,          255/255,            1 )

colors.brightgold      = vmath.vector4(        253/255,          223/255,          59/255,             1 )

function M.get_color(--[[required]]name, --[[optional]]alpha)
  name = string.lower(name) or "white"
  assert(colors[name], "Color does not exist in palette")
  if alpha then colors[name].w = alpha else colors[name].w = 1 end
  return colors[name]
end

local suffixes = { 
  {"", "K", "M", "B", "T", "Qa", "Qt", "Sx", "Sp", "Oc", "Nn", "Dc", "UDc", "DDc", "TDc", "QaDc", "QtDc", "SxDc", "SpDc", "ODc", 
  "NDc", "Vi", "UVi", "DVi", "TVi", "QaVi", "QtVi", "SxVi", "SpVi", "OcVi", "NnVi", "Tg", "UTg", "DTg", "TTg", "QaTg", "QtTg", "SxTg", "SpTg", "OcTg", 
  "NnTg", "Qd", "UQd", "DQd", "TQd", "QaQd", "QtQd", "SxQd", "SpQd", "OcQd", "NnQd", "Qq", "UQq", "DQq", "TQq", "QaQq", "QtQq", "SxQq", "SpQq", "OcQq", 
  "NnQq", "Sg"}, 
  {"", "K", "M", "B", "T", "AA", "BB", "CC", "DD", "EE", "FF", "GG", "HH", "II", "JJ", "KK", "LL", "MM", "NN", "OO", 
  "PP", "QQ", "RR", "SS", "TT", "UU", "VV", "WW", "XX", "YY", "ZZ", "AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG", "HHH", 
  "III", "JJJ", "KKK", "LLL", "MMM", "NNN", "OOO", "PPP", "QQQ", "RRR", "SSS", "TTT", "UUU", "VVV", "WWW", "XXX", "YYY", "ZZZ"},
  {"", " thousand ", " million ", " billion ", " trillion ", " quadrillion ", " quintillion ", " sextillion ", " septillion ", " octillion ", " nonillion ", 
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
  " quattuornonagintillion "," quinnonagintillion "," sexnonagintillion "," septnonagintillion "," octononagintillion "," novemnonagintillion ", " centillion"}
}

function M.generate_uuid()
  local template = os.date("xx%y-%Vxx%m-%dxx-7x%H-%Mxxxx-xx%Sxxxx")
  return string.gsub(template, '[xy]', function (c)
    local v = (c == 'x') and math.random(0, 0xf) or math.random(8, 0xb)
    return string.format('%x', v)
  end)
end

function M.load_from_JSON(filename)
  print("ACTIONS: Attemping to load " .. filename)
  assert(type(filename) == "string", "You must provide `filename` of type `string` to perform `load_from_JSON()`")
  return json.decode(sys.load_resource(filename))
end

function M.display_number(num, type, dec, digits)
  type = type or 2
  dec = dec or 1
  digits = digits or 3
  local negative = num < 0

  if negative then num = -num end


  local place = 1
  while num >= 1000 do
    num = num / 1000
    place = place + 1
  end


  local len = string.len(math.floor(num))
  if len >= digits then
    dec = 0
  else
    dec = digits - len
  end


  num = math.floor(num * (10^dec) ) / (10^dec)


  if suffixes[type][place] == nil then 
    return tostring(num) .. " I+" .. tostring(place - #suffixes[type])
  end

  if negative then num = -num end
  return tostring(num) .. suffixes[type][place]

end

function M.load_all_savedata(savefile)
  assert(defsave.loaded[savefile], savefile .. " does not exist")
  local data = {}
  for n=1,#defsave.loaded[savefile].data do
    table.insert(data, defsave.get(savefile, n))
  end
  return data
end

function M.modify_field(data, id, field, value)
  if data[id] ~= nil then
    if data[id][field] == nil then
      data[id][field] = value
    else
      data[id][field] = data[id][field] + value
    end
  end
  return data
end

function M.set_field(data, id, field, value)
  if data ~= nil then
    if data[id] ~= nil then
      if data[id][field] ~= nil then 
        data[id][field] = value
      end
    end
  end
  return data
end

function M.findinlist(list, value)
  for i=1,#list,1 do
    if list[i] == value then
      return i
    end
  end
end

function M.findintable(data, field, value)
  for i,item in ipairs(data) do
    if item[field] == value then
      return i
    end
  end
end

function M.tablelength(table)
  assert(table, "no table")
  local count = 0
  for _ in pairs(table) do count = count + 1 end
  return count
end

function M.tableConcat(t1,t2)
  if #t1 > 1 then 
    for i=1,#t2 do
      t1[#t1+1] = t2[i]
    end
    return t1
  else
    return t2
  end
end

function M.clone(table)
  if type(table) ~= "table" then return table end
  local meta = getmetatable(table)
  local target = {}
  for k, v in pairs(table) do
    if type(v) == "table" then
      target[k] = M.clone(v)
    else
      target[k] = v
    end
  end
  setmetatable(target, meta)
  return target
end

function M.removefromlist(list, value)
  for i=1,#list,1 do
    if list[i] == value then
      table.remove(list, i)
    end
  end
  return list
end

function M.removefromtable(data, field, value)
  for i,item in ipairs(data) do
    if item[field] == value then
      table.remove(data, i)
    end
  end
  return data
end

function M.get_virtue(virtues, virtueName)
  local x = 0
  for k,v in ipairs(virtues) do
    if virtueName ~= nil then
      if v.Virtue == virtueName then x = v.Strength end
    else
      x = x + v.Strength
    end
  end
  return x
end

function M.gen_virtues()
  local virtues = {}
  local pairings = {
    {"Empathy", "Greed"},
    {"Reason", "Wrath"},
    {"Zeal", "Stasis"}
  }
  for x,pair in ipairs(pairings) do
    virtues[x] = {}
    virtues[x]["Virtue"] = pair[math.random(1,2)]
    virtues[x]["Strength"] = 0
  end
  return virtues
end

function M.add_virtues(virtues, num)
  for x=1,num,1 do
    local rand = math.random(1,3)
    virtues = M.modify_field(virtues, rand, "Strength", 1)
  end
  return virtues
end

-- Time left on a live event, coarse enough to read at a glance: "6d 23h",
-- "5h 12m", then "4m 09s" in the last hour.
function M.format_countdown(seconds)
  seconds = math.max(0, math.floor(seconds))
  local d = math.floor(seconds / 86400)
  local h = math.floor(seconds % 86400 / 3600)
  local m = math.floor(seconds % 3600 / 60)
  local s = seconds % 60
  if d > 0 then return string.format("%dd %dh", d, h) end
  if h > 0 then return string.format("%dh %dm", h, m) end
  return string.format("%dm %02ds", m, s)
end

--[[ Drop icons ship at two sizes. The frame named after the item is the
detailed one, painted for the resource popup and the loot row where it is
shown large. The "_small" frame beside it is the same item redrawn down to a
bold silhouette and two or three colours, because the detailed art turns to
mush in the places it is only a couple of dozen units across — the hire and
unlock cost rows, where it shares a line with text. Everything roomier than
that, the quest chips and the sell grid included, wants the detail. Pick by
how big the node actually draws, so a node that is resized or rescaled later
still gets the right one. ]]
local SMALL_ICON_MAX = 48
-- Henchmen icons follow the same rule: "<name>_icon" is the detailed bust,
-- "<name>_icon_small" the same bust simplified for the cost row and the
-- producer count on each card.
local TWO_SIZE_TEXTURES = { items_drops = true, henchmen_portraits = true }

--[[ Card art comes in three shapes — hero portraits are landscape, henchmen
and gear cards are 2:3, drop icons are square — but every card window is one
fixed slot behind a stencil, sized by hand for whichever shape the screen was
first built around. Everything else then floats in the middle of a grey panel.
So measure the frame the art node is playing, scale it to cover the window,
and let the stencil crop the overflow. ]]

-- The card nodes are SIZE_MODE_AUTO in their scenes, which is what makes
-- play_flipbook report the frame's real size, but a set_size only sticks in
-- SIZE_MODE_MANUAL. Changing the mode can leave a node drawing the whole atlas
-- page instead of its frame, so the frame is played again after each change
-- rather than trusting the engine to keep it.
function M.measure_card_art(--[[required]]node)
  local frame = gui.get_flipbook(node)
  gui.set_size_mode(node, gui.SIZE_MODE_AUTO)
  gui.play_flipbook(node, frame)
  local art = gui.get_size(node)
  gui.set_size_mode(node, gui.SIZE_MODE_MANUAL)
  gui.play_flipbook(node, frame)
  return art
end

-- window is the stencil the art node is parented to, so its size is already in
-- the space the art is sized and positioned in. The art's offset inside the
-- window is covered as well, so a node nudged off centre never opens a gap
-- along one edge.
function M.fill_card_window(--[[required]]node, --[[required]]window)
  local art = M.measure_card_art(node)
  if art.x <= 0 or art.y <= 0 then return end
  local scale, pos, win = gui.get_scale(node), gui.get_position(node), gui.get_size(window)
  local cover = math.max((win.x + 2 * math.abs(pos.x)) / (art.x * scale.x),
                         (win.y + 2 * math.abs(pos.y)) / (art.y * scale.y))
  gui.set_size(node, vmath.vector3(art.x * cover, art.y * cover, art.z))
end

--[[ Mini icons -- anything drawn at the small-frame size, plus henchmen icons
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
calling set_item_icon. ]]
local OUTLINED_TEXTURES = { henchmen_portraits = true }
local OUTLINE_WIDTH = 0.05      -- each ring, as a fraction of the icon's longer side
-- Must match tools/bake_outlines.py.
local OUTLINE_SCALE = 1.25
-- Where each atlas's baked frames live: main has no room left on its page.
local OUTLINE_HOME = { main = "items_drops" }
-- Playing a frame an atlas lacks is no Lua error in this engine: the node keeps
-- a bad frame index and the renderer aborts. So only frames listed here are
-- played as baked outlines.
-- BAKED_OUTLINES: written by tools/bake_outlines.py
local BAKED_OUTLINES = {
  henchmen_portraits = {
    ["bell_diver_icon_small_outlined"] = true,
    ["bonecrusher_icon_small_outlined"] = true,
    ["bramble_knight_icon_small_outlined"] = true,
    ["burrow_digger_icon_small_outlined"] = true,
    ["carrot_smuggler_icon_small_outlined"] = true,
    ["deserthippie_icon_small_outlined"] = true,
    ["dwarvenmage_icon_small_outlined"] = true,
    ["farmhand_icon_small_outlined"] = true,
    ["forestranger_icon_small_outlined"] = true,
    ["goblingravedigger_icon_small_outlined"] = true,
    ["halfogrewarrior_icon_small_outlined"] = true,
    ["knightswhosaygee_icon_small_outlined"] = true,
    ["lantern_bearer_icon_small_outlined"] = true,
    ["moon_howler_icon_small_outlined"] = true,
    ["nerdylibrarian_icon_small_outlined"] = true,
    ["rabbithunter_icon_small_outlined"] = true,
    ["ratcatcher_icon_small_outlined"] = true,
    ["reed_cutter_icon_small_outlined"] = true,
    ["spiderrancher_icon_small_outlined"] = true,
    ["stone_whisperer_icon_small_outlined"] = true,
    ["tunnelpatrol_icon_small_outlined"] = true,
    ["wererabbit_envoy_icon_small_outlined"] = true,
    ["wererabbitnegotiator_icon_small_outlined"] = true,
    ["woodlandscout_icon_small_outlined"] = true,
  },
  items_drops = {
    ["abyss_glass_small_outlined"] = true,
    ["abyss_ink_small_outlined"] = true,
    ["apple_small_outlined"] = true,
    ["bat_ear_small_outlined"] = true,
    ["bat_fang_small_outlined"] = true,
    ["bat_wing_small_outlined"] = true,
    ["black_plate_small_outlined"] = true,
    ["black_spangle_small_outlined"] = true,
    ["blackmaw_fang_small_outlined"] = true,
    ["blaze_powder_small_outlined"] = true,
    ["blaze_rod_small_outlined"] = true,
    ["bone_fetish_small_outlined"] = true,
    ["bone_small_outlined"] = true,
    ["book_mouldy_small_outlined"] = true,
    ["book_small_outlined"] = true,
    ["bramble_berry_small_outlined"] = true,
    ["brass_gear_small_outlined"] = true,
    ["brass_whistle_small_outlined"] = true,
    ["brimstone_small_outlined"] = true,
    ["captains_lantern_small_outlined"] = true,
    ["carrot_small_outlined"] = true,
    ["charred_torch_small_outlined"] = true,
    ["chiefs_horn_small_outlined"] = true,
    ["childs_mitten_small_outlined"] = true,
    ["clay_ball_small_outlined"] = true,
    ["clock_heart_small_outlined"] = true,
    ["coal_small_outlined"] = true,
    ["cobweb_small_outlined"] = true,
    ["coral_spear_small_outlined"] = true,
    ["crawler_poop_small_outlined"] = true,
    ["cursed_candle_small_outlined"] = true,
    ["deep_scale_small_outlined"] = true,
    ["deep_sigil_small_outlined"] = true,
    ["dentedhelmet_small_outlined"] = true,
    ["dipped_feather_small_outlined"] = true,
    ["dragon_breath_small_outlined"] = true,
    ["dragon_egg_small_outlined"] = true,
    ["driftwood_small_outlined"] = true,
    ["drowned_charm_small_outlined"] = true,
    ["drowned_idol_small_outlined"] = true,
    ["eel_fang_small_outlined"] = true,
    ["eel_hide_small_outlined"] = true,
    ["enchanted_book_small_outlined"] = true,
    ["end_crystal_small_outlined"] = true,
    ["ender_pearl_small_outlined"] = true,
    ["faded_ribbon_small_outlined"] = true,
    ["fire_oil_small_outlined"] = true,
    ["frost_rune_small_outlined"] = true,
    ["frozen_candle_small_outlined"] = true,
    ["frozen_tear_small_outlined"] = true,
    ["gargoyle_hide_small_outlined"] = true,
    ["gatehouse_key_small_outlined"] = true,
    ["ghast_flesh_small_outlined"] = true,
    ["ghoul_flesh_small_outlined"] = true,
    ["ghoul_tooth_small_outlined"] = true,
    ["giants_ring_small_outlined"] = true,
    ["glacier_heart_small_outlined"] = true,
    ["glass_eye_small_outlined"] = true,
    ["glow_worm_small_outlined"] = true,
    ["glowcap_small_outlined"] = true,
    ["gnawed_root_small_outlined"] = true,
    ["gnoll_hide_small_outlined"] = true,
    ["goblin_knife_small_outlined"] = true,
    ["gold_bell_small_outlined"] = true,
    ["golden_acorn_small_outlined"] = true,
    ["grave_coin_small_outlined"] = true,
    ["grave_dust_small_outlined"] = true,
    ["hags_eye_small_outlined"] = true,
    ["horror_claw_small_outlined"] = true,
    ["hound_collar_small_outlined"] = true,
    ["huntsmans_key_small_outlined"] = true,
    ["imp_horn_small_outlined"] = true,
    ["iron_shackle_small_outlined"] = true,
    ["kelp_shroud_small_outlined"] = true,
    ["knight_crest_small_outlined"] = true,
    ["knowledge_book_small_outlined"] = true,
    ["kobold_eye_small_outlined"] = true,
    ["kobold_spear_small_outlined"] = true,
    ["lead_small_outlined"] = true,
    ["leather_small_outlined"] = true,
    ["magma_cream_small_outlined"] = true,
    ["maws_heart_small_outlined"] = true,
    ["mirror_shard_small_outlined"] = true,
    ["moon_carrot_small_outlined"] = true,
    ["moon_clover_small_outlined"] = true,
    ["moon_lily_small_outlined"] = true,
    ["moon_reed_small_outlined"] = true,
    ["moon_shard_small_outlined"] = true,
    ["moonwater_small_outlined"] = true,
    ["name_tag_small_outlined"] = true,
    ["nautilus_shell_small_outlined"] = true,
    ["nether_wart_small_outlined"] = true,
    ["notched_blade_small_outlined"] = true,
    ["occult_staff_small_outlined"] = true,
    ["old_bone_small_outlined"] = true,
    ["oldboot_small_outlined"] = true,
    ["orge_toe_small_outlined"] = true,
    ["painted_mask_small_outlined"] = true,
    ["paper_lantern_small_outlined"] = true,
    ["paper_small_outlined"] = true,
    ["paw_ring_small_outlined"] = true,
    ["pawn_outlined"] = true,
    ["phantom_membrane_small_outlined"] = true,
    ["pixie_wings_small_outlined"] = true,
    ["potato_small_outlined"] = true,
    ["prismarine_crystals_small_outlined"] = true,
    ["prismarine_shard_small_outlined"] = true,
    ["pumpkin_seeds_small_outlined"] = true,
    ["puppet_string_small_outlined"] = true,
    ["quartz_small_outlined"] = true,
    ["rabbit_foot_small_outlined"] = true,
    ["rabbit_hide_small_outlined"] = true,
    ["raider_fur_small_outlined"] = true,
    ["rat_tail_small_outlined"] = true,
    ["rat_whisker_small_outlined"] = true,
    ["rigged_dice_small_outlined"] = true,
    ["rime_iron_small_outlined"] = true,
    ["rime_shard_small_outlined"] = true,
    ["ringmasters_contract_small_outlined"] = true,
    ["rotten_flesh_small_outlined"] = true,
    ["rune_pebble_small_outlined"] = true,
    ["rusty_key_small_outlined"] = true,
    ["shadow_fur_small_outlined"] = true,
    ["shadow_silk_small_outlined"] = true,
    ["shell_plate_small_outlined"] = true,
    ["signed_contract_small_outlined"] = true,
    ["silver_fur_small_outlined"] = true,
    ["slime_ball_small_outlined"] = true,
    ["slime_jelly_small_outlined"] = true,
    ["snail_shell_small_outlined"] = true,
    ["snowball_small_outlined"] = true,
    ["sodden_coin_small_outlined"] = true,
    ["spawn_ichor_small_outlined"] = true,
    ["spider_eye_small_outlined"] = true,
    ["spider_silk_small_outlined"] = true,
    ["stick_small_outlined"] = true,
    ["stolen_fire_small_outlined"] = true,
    ["stolen_gift_small_outlined"] = true,
    ["strongmans_chain_small_outlined"] = true,
    ["sucker_pearl_small_outlined"] = true,
    ["sunken_bell_small_outlined"] = true,
    ["swallowed_coin_small_outlined"] = true,
    ["tentacle_hook_small_outlined"] = true,
    ["thistle_small_outlined"] = true,
    ["throneroom_key_small_outlined"] = true,
    ["throwing_knife_small_outlined"] = true,
    ["tincup_small_outlined"] = true,
    ["troll_hide_small_outlined"] = true,
    ["troll_tusk_small_outlined"] = true,
    ["turnip_small_outlined"] = true,
    ["velvet_blindfold_small_outlined"] = true,
    ["war_medal_small_outlined"] = true,
    ["wheat_seeds_small_outlined"] = true,
    ["winter_pelt_small_outlined"] = true,
    ["winter_rune_small_outlined"] = true,
    ["wolf_fang_small_outlined"] = true,
    ["wolf_paw_small_outlined"] = true,
    ["wolf_pelt_small_outlined"] = true,
    ["wraith_frost_small_outlined"] = true,
    ["wraith_wisp_small_outlined"] = true,
    ["zombie_flesh_small_outlined"] = true,
  },
}
-- END BAKED_OUTLINES
-- Rings drawn outermost first, eight copies each.
local OUTLINE_RINGS = {
  { color = vmath.vector4(1, 1, 1, 1), reach = 2, copies = 8 },
  { color = vmath.vector4(0, 0, 0, 1), reach = 1, copies = 8 },
}
local OUTLINE_PARTS = {}
for _, ring in ipairs(OUTLINE_RINGS) do
  for i = 0, ring.copies - 1 do
    local a = i * 2 * math.pi / ring.copies
    OUTLINE_PARTS[#OUTLINE_PARTS + 1] = {
      dir = vmath.vector3(math.cos(a), math.sin(a), 0) * ring.reach, color = ring.color }
  end
end
-- Where a pivot sits in its node, as fractions of the size from the centre.
local PIVOT_AT = {
  [gui.PIVOT_CENTER] = vmath.vector3(0, 0, 0),
  [gui.PIVOT_N] = vmath.vector3(0, 0.5, 0),   [gui.PIVOT_S] = vmath.vector3(0, -0.5, 0),
  [gui.PIVOT_E] = vmath.vector3(0.5, 0, 0),   [gui.PIVOT_W] = vmath.vector3(-0.5, 0, 0),
  [gui.PIVOT_NE] = vmath.vector3(0.5, 0.5, 0), [gui.PIVOT_NW] = vmath.vector3(-0.5, 0.5, 0),
  [gui.PIVOT_SE] = vmath.vector3(0.5, -0.5, 0), [gui.PIVOT_SW] = vmath.vector3(-0.5, -0.5, 0),
}
-- Each entry is { node = icon, scene = its gui script, baked = which kind,
-- parts = child nodes or false }, searched with == rather than keyed by node:
-- the engine hands out a fresh userdata for the same node each time it is
-- looked up, which a table key never matches, so keying by it grew a new
-- outline on every refresh until the scene ran out of nodes.
local outlines = {}

-- Every gui script shares this module, and touching another scene's node is
-- an error, so entries carry the scene they belong to. A scene is matched on
-- its url's hashes: a release build prints every url as
-- "main:<unknown>#<unknown>", so a string key made all scenes one, and each
-- scene's prune threw out the others' entries and they regrew every frame.
local function same_scene(a, b)
  return a.socket == b.socket and a.path == b.path and a.fragment == b.fragment
end

local function find_outline(node, scene)
  for _, entry in ipairs(outlines) do
    if same_scene(entry.scene, scene) and entry.node == node then return entry end
  end
end

-- Forget this scene's icons whose node has since been deleted, copies and all.
-- Done before every search, since comparing against a deleted node can raise.
local function prune_outlines(scene)
  for i = #outlines, 1, -1 do
    if same_scene(outlines[i].scene, scene) and not pcall(gui.get_position, outlines[i].node) then
      table.remove(outlines, i)
    end
  end
end

local function copy_frame(node, child)
  gui.set_texture(child, gui.get_texture(node))
  gui.set_size_mode(child, gui.get_size_mode(node))
  gui.play_flipbook(child, gui.get_flipbook(node))
  gui.set_size(child, gui.get_size(node))
end

local function make_parts(node, count)
  local parts = {}
  local ok = pcall(function()
    for i = 1, count do
      local part = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(0, 0, 0))
      parts[i] = part
      gui.set_parent(part, node)
    end
  end)
  if ok then return parts end
  -- Out of nodes: give back what was taken and leave this icon plain.
  for _, part in ipairs(parts) do gui.delete_node(part) end
  return false
end

local function update_rings(node, parts)
  local size = gui.get_size(node)
  local width = OUTLINE_WIDTH * math.max(size.x, size.y)
  for i, part in ipairs(parts) do
    gui.set_enabled(part, true)
    gui.set_pivot(part, gui.get_pivot(node))
    copy_frame(node, part)
    local spec = OUTLINE_PARTS[i]
    if spec then
      gui.set_position(part, spec.dir * width)
      gui.set_color(part, spec.color)
    else
      gui.set_position(part, vmath.vector3(0, 0, 0))
      gui.set_color(part, gui.get_color(node))
    end
  end
end

-- The baked child is centred on the icon whatever the icon's pivot, since its
-- rings reach out evenly on every side.
local function update_baked(node, part, home, frame)
  gui.set_texture(part, home)
  gui.set_size_mode(part, gui.SIZE_MODE_MANUAL)
  gui.play_flipbook(part, frame)
  local size = gui.get_size(node)
  local at = PIVOT_AT[gui.get_pivot(node)] or PIVOT_AT[gui.PIVOT_CENTER]
  gui.set_pivot(part, gui.PIVOT_CENTER)
  gui.set_position(part, vmath.vector3(-at.x * size.x, -at.y * size.y, 0))
  gui.set_size(part, size * OUTLINE_SCALE)
  gui.set_color(part, gui.get_color(node))
  gui.set_enabled(part, true)
end

local function drop_parts(entry)
  for _, part in ipairs(entry.parts or {}) do gui.delete_node(part) end
  entry.parts = false
end

-- An outline is decoration, so nothing about it may take a screen down: a
-- scene with no nodes to spare, or an icon the engine will not copy, just
-- draws the icon without one.
local function set_outline(node, on, texture, frame)
  local scene = msg.url()
  prune_outlines(scene)
  local entry = find_outline(node, scene)
  if not on then
    if entry and entry.parts then
      for _, part in ipairs(entry.parts) do gui.set_enabled(part, false) end
    end
    return
  end
  if not entry then
    entry = { node = node, scene = scene, parts = false }
    outlines[#outlines + 1] = entry
  end

  local home = OUTLINE_HOME[texture] or texture
  local baked = frame .. "_outlined"
  -- A frame that had no baked copy for this icon is not tried again, which
  -- would rebuild its rings on every refresh.
  local listed = BAKED_OUTLINES[home] and BAKED_OUTLINES[home][baked]
  if listed and entry.unbaked ~= home .. "/" .. baked then
    if entry.baked ~= true then
      drop_parts(entry)
      entry.baked, entry.parts = true, make_parts(node, 1)
    end
    if not entry.parts or pcall(update_baked, node, entry.parts[1], home, baked) then return end
    entry.unbaked = home .. "/" .. baked
  end

  -- No baked copy of this frame, or one this scene cannot draw.
  if entry.baked ~= false then
    drop_parts(entry)
    entry.baked, entry.parts = false, make_parts(node, #OUTLINE_PARTS + 1)
  end
  if entry.parts and not pcall(update_rings, node, entry.parts) then
    for _, part in ipairs(entry.parts) do gui.set_enabled(part, false) end
  end
end

-- Plays the icon's frame on the node and returns the name of the frame played.
local function play_icon(node, icon)
  if TWO_SIZE_TEXTURES[icon.texture] then
    local size, scale = gui.get_size(node), gui.get_scale(node)
    if math.max(size.x * scale.x, size.y * scale.y) <= SMALL_ICON_MAX then
      -- The small frames are stored at half size. A node that sizes itself to
      -- its frame would shrink to match, so pin the size it has now first;
      -- the mode changes before the frame is played, which keeps the frame.
      if gui.get_size_mode(node) == gui.SIZE_MODE_AUTO then
        gui.set_size_mode(node, gui.SIZE_MODE_MANUAL)
        gui.set_size(node, size)
      end
      -- An atlas without the small set still has the detailed frame, so
      -- fall back to it rather than taking the screen down with us.
      if pcall(gui.play_flipbook, node, icon.flipbook .. "_small") then
        return icon.flipbook .. "_small"
      end
    end
  end
  gui.play_flipbook(node, icon.flipbook)
  return icon.flipbook
end

function M.set_item_icon(--[[required]]node, --[[required]]icon)
  if not icon or not icon.texture or icon.flipbook == "" then return false end
  gui.set_texture(node, icon.texture)
  local frame = play_icon(node, icon)
  local size, scale = gui.get_size(node), gui.get_scale(node)
  set_outline(node, OUTLINED_TEXTURES[icon.texture] == true
    or math.max(size.x * scale.x, size.y * scale.y) <= SMALL_ICON_MAX, icon.texture, frame)
  return true
end

--[[ Heroes come in two kinds (gdd/heroes-roster.md). A field hero is assigned
to a dungeon and its power fires there. A patron is never assigned: owning one
switches on a permanent bonus wherever that bonus applies. A patron that is
locked, or not yet levelled, counts as level 0, which every caller reads as no
bonus at all. ]]
local HERO_MAX_LEVEL = 13

function M.is_patron(hero)
  return hero ~= nil and hero.Kind == "Patron"
end

function M.patron_level(name)
  local heroes = defsave.loaded.Hero and defsave.loaded.Hero.data
  if not heroes then return 0 end
  for _, hero in ipairs(heroes) do
    if hero.Name == name then
      if hero.Locked or not hero.Level or hero.Level < 1 then return 0 end
      return math.min(hero.Level, HERO_MAX_LEVEL)
    end
  end
  return 0
end

-- A patron's bonus at its level, growing evenly (by the same factor each
-- level) from `at1` at level 1 to `at13` at level 13. `none` when not owned.
function M.patron_value(name, at1, at13, none)
  local level = M.patron_level(name)
  if level < 1 then return none end
  return at1 * (at13 / at1) ^ ((level - 1) / (HERO_MAX_LEVEL - 1))
end

-- A field hero's level for its power: its own level, plus the levels Sir
-- Aldous lends every other hero.
function M.hero_power_level(hero_id)
  local hero = defsave.loaded.Hero.data[hero_id]
  local level = hero and hero.Level or 1
  return level + math.floor(M.patron_value("HERO_SIRALDOUSBRIGHTWATER_NAME", 1, 5, 0) + 0.5)
end

-- A field hero's power strength at its level, on the same even curve, scaled
-- down when Lady Vesper is only echoing it.
function M.hero_power(message, at1, at13)
  return M.hero_scale(M.hero_power_level(message.hero_id), at1, at13) * (message.echo_scale or 1)
end

-- A field hero's power strength at a level, on the same even curve. Levels
-- Sir Aldous lends carry on up the curve past 13.
function M.hero_scale(level, at1, at13)
  level = math.max(1, level or 1)
  return at1 * (at13 / at1) ^ ((level - 1) / (HERO_MAX_LEVEL - 1))
end

--[[ Live state the field heroes share between the controllers and the dungeon
screen. Nothing here is saved: a hex or an echo only lasts the session. ]]
M.herostate = {
  hex = {},        -- ["map-dungeon"] = { multiplier, ends }
  lastpower = {},  -- ["map-dungeon"] = { hero_id, actions } of the last power fired there
}

function M.hex_multiplier(map_id, dungeon_id)
  local hex = M.herostate.hex[map_id .. "-" .. dungeon_id]
  if hex and hex.ends > os.clock() then return hex.multiplier end
  return 1
end

-- Tomas Quill's lesson plans: every XP gain is worth this much more.
function M.xp_factor()
  return 1 + M.patron_value("HERO_TOMASQUILL_NAME", 0.20, 3.0, 0)
end

-- The live events in the order they run, for the screens that list them: the
-- map each is played on, the hero it pays, its XP stat (`shards`) and the
-- chest it pays in. repController holds everything else about them.
M.EVENTS = {
  { key = "WEREMOON", map_id = 2, hero_id = 4, shards = "moonshard", chest = "moon" },
  -- Enemy events (gdd/enemy-events.md): columns of enemies to fight through
  -- rather than levels worked by henchmen. The order keeps run 1 (from 26
  -- October 2026) on the Blackmaw Siege, with the threat events after it.
  { key = "BLACKMAW", map_id = 6, hero_id = 7, shards = "siegexp", chest = "war", enemies = true },
  { key = "TITANSWELL", map_id = 3, hero_id = 8, shards = "titanswellxp", chest = "tidebound", enemies = true },
  { key = "MIDNIGHT", map_id = 4, hero_id = 10, shards = "midnightxp", chest = "masque", enemies = true },
  { key = "LONGNIGHT", map_id = 5, hero_id = 16, shards = "longnightxp", chest = "hearth", enemies = true },
}

-- One fixed weekly schedule for everyone, back to back, round the list above.
M.EVENT_SCHEDULE_START = 1792368000 -- Monday 19 October 2026, 00:00 UTC
M.EVENT_RUN_SECONDS = 7 * 24 * 60 * 60

-- The run playing at `now`, the event it plays and when it ends.
function M.event_schedule(now)
  local run = math.floor((now - M.EVENT_SCHEDULE_START) / M.EVENT_RUN_SECONDS)
  local event = M.EVENTS[(run % #M.EVENTS) + 1]
  return run, event, M.EVENT_SCHEDULE_START + (run + 1) * M.EVENT_RUN_SECONDS
end

-- The event after the one playing at `now`, and when it starts.
function M.next_event(now)
  local run, _, ends_at = M.event_schedule(now)
  return M.EVENTS[((run + 1) % #M.EVENTS) + 1], ends_at
end

-- When an event that ends at `ends_at` next comes round.
function M.event_returns_at(ends_at)
  return ends_at + (#M.EVENTS - 1) * M.EVENT_RUN_SECONDS
end

function M.event_on_map(map_id)
  for e,event in ipairs(M.EVENTS) do
    if event.map_id == map_id then return event end
  end
end

-- An event's shards are its XP: they pay for level-ups of its cards and are
-- what its items' rank-ups give, so an event never spends the main game's XP.
-- nil for the main map and for anything not on a map, like heroes.
function M.event_shards(map_id)
  local event = M.event_on_map(map_id)
  return event and event.shards
end

-- What a card on this map levels up with: how much the player has, the loc
-- key of its name, and the event's shard stat when it is shards.
function M.levelup_funds(map_id)
  local event = M.event_on_map(map_id)
  if event then
    local resource = defsave.loaded.Resources.data[event.shards]
    -- An enemy event's XP is called XP.
    return { have = resource.Count, shards = event.shards, label = event.enemies and "XP" or "SHARDS",
      name = resource.Name, need = "EVENT_" .. event.key .. "_NEED_XP" }
  end
  return { have = defsave.get("Currency", "Xp"), label = "XP" }
end

-- Chapter quests running at once: the slots the chapter has opened (up to
-- three), plus Grubb's extra notices (one, two at level 7, three at 13).
function M.quest_slots(slots)
  local level = M.patron_level("HERO_GRUBB_NAME")
  local extra = level >= 13 and 3 or level >= 7 and 2 or level >= 1 and 1 or 0
  return math.min(3, slots or 1) + extra
end

-- Ledger Goldwhistle's friends' rates: the share of a hire's cost still paid.
function M.hire_cost_factor()
  return 1 - M.patron_value("HERO_LEDGERGOLDWHISTLE_NAME", 0.10, 0.60, 0)
end

--[[ Enemy events (gdd/enemy-events.md). Each row's henchman slot holds its
enemy, with Size the count left. Nothing fights on its own: enemies only
take damage when a hero sent to the location fires its power. ]]
M.ENEMY_WAVE_GROWTH = 1.3

function M.enemy_map(map_id)
  local event = M.event_on_map(map_id)
  return event ~= nil and event.enemies == true
end

-- What a location's gear of one kind is worth: its Factor to the power of its
-- level, 1 with none. An enemy map's gear is worn by the whole column.
function M.enemy_gear(map_id, dungeon_id, kind)
  -- Henchmen are read in before the gear is.
  if not (defsave.loaded.Gear and defsave.loaded.Gear.data) then return 1 end
  for g,gear in ipairs(defsave.loaded.Gear.data) do
    if gear.map_id == map_id and gear.dungeon_id == dungeon_id and gear.Modifier.Type == kind then
      return gear.Modifier.Factor ^ (gear.Level or 0)
    end
  end
  return 1
end


-- How hard a henchman works right now: the global boost, Grisla's hex on its
-- dungeon, and Henrietta's bonus on the Farm. The henchmen tick, their timers
-- and the dungeon screen's progress bars all read this one rate.
local FARM = { map_id = 1, dungeon_id = 1 }
function M.henchmen_rate(henchman)
  local rate = (defsave.get("Stats", "globalBoost") or 1) * M.hex_multiplier(henchman.map_id, henchman.dungeon_id)
  if henchman.map_id == FARM.map_id and henchman.dungeon_id == FARM.dungeon_id then
    rate = rate * M.patron_value("HERO_HENRIETTAPLOUGH_NAME", 2, 64, 1)
  end
  return rate
end

return M
