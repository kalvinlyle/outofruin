local inspect = require('inspect')
local actions = require('actions')
local random = require('random/random')
local progress = require('progress/progress')
local saveload = require('saveload/saveload')
local defsave = require('defsave/defsave')

local productName = "OoR"
local controller	= "main:/menu#controller"

local M = {}
local curLoc = { map_id = 0, dungeon_id = 0 }

local function loadResources()
	print("MAPCONTROLLER: Loading Map JSON")
	local resources = saveload.load_from_JSON("/data/Resources.json")
	local data = {}
	for r,resource in ipairs(resources) do
		data[resource.id] = resource
	end
	return data
end

local function tablelength(T)
	local count = 0
	for _ in pairs(T) do count = count + 1 end
	return count
end

local function refresh_mapdata(map_id, dungeon_id)
	if curLoc.map_id == map_id and curLoc.dungeon_id == dungeon_id then
		msg.post("main:/menu#dungeonmine", "refresh_mapdata")
	end
end

local function get_isHidden(map_id, dungeon_id, level_id)
	local flag = false
	if level_id > 0 then
		flag = defsave.loaded.Map.data[map_id][dungeon_id].Levels[level_id].isHidden
	end
	return flag or false
end

--[[ An enemy row opens like a level: once its prereq is held it can be
tapped open, and only the next row to open is shown, with what it needs.
An open row is the front ("Active"), waiting its turn, or gone once its
count is down to nothing. ]]
local function enemy_levelState(map_id, dungeon_id, level_id, level, reset)
	local enemy = defsave.get("Henchmen", level.henchmen_id)
	local map = defsave.loaded.Map and defsave.loaded.Map.data[map_id]
	local above = level_id > 1 and map and map[dungeon_id] and map[dungeon_id].Levels[level_id - 1]
	local next_up = level_id == 1 or (above and above.wasClickedOpen)
	if defsave.get("Resources", level.Prereq.unit).Count >= level.Prereq.amount then
		level.isHidden = false
		level.isLocked = false
		if level_id == 1 then msg.post(controller, "unlock_level", { map_id = map_id, dungeon_id = dungeon_id }) end
	elseif reset then
		level.isHidden = true
		level.isLocked = true
		level.wasClickedOpen = false
	end

	if level.wasClickedOpen then
		if (enemy.Size or 0) <= 0 then
			level.State = "Invisible"
		elseif enemy.Active then
			level.State = "Active"
		else
			level.State = "Waiting"
		end
	elseif not next_up then
		level.State = "Invisible"
	elseif level.isHidden then
		level.State = "Locked"
	else
		level.State = "Explorable"
	end
	return level
end

local function set_levelState(map_id, dungeon_id, level_id, level, reset)

	assert(level.henchmen_id, "level does not have henchmen_id set")
	if actions.enemy_map(map_id) then return enemy_levelState(map_id, dungeon_id, level_id, level, reset) end
	local henchmen = defsave.get("Henchmen", level.henchmen_id)

	if defsave.get("Resources", level.Prereq.unit).Count >= level.Prereq.amount then
		level.isHidden = false
		level.isLocked = false
		msg.post(controller, "unlock_level", { map_id = map_id, dungeon_id = dungeon_id })
	elseif reset then
		level.isHidden = true
		level.isLocked = true
		level.wasClickedOpen = false
	end

	if level.isHidden and get_isHidden(map_id, dungeon_id, level_id - 1) then
		level.State = "Invisible"
	elseif level.isHidden then
		level.State = "Locked"
	elseif level.isLocked then
		level.State = "Disabled"
	elseif level.wasClickedOpen and ( henchmen.Active or henchmen.contDamage ) then
		level.State = "Active"
	elseif level.wasClickedOpen then
		level.State = "Inactive"
	else
		level.State = "Explorable"
	end

	return level
end


local function ingestLevels_Live(data)
	for m,map in ipairs(data) do
		for d,dungeon in ipairs(map) do
			data[m][d].Icon = defsave.default_data.Map[m][d].Icon
			for l,level in ipairs(dungeon.Levels) do
				data[m][d].Levels[l].Prereq = defsave.default_data.Map[m][d].Levels[l].Prereq
			end
		end
	end
	return data
end


local function set_levelStates(data, reset)
	for m,map in ipairs(data) do
		for d,dungeon in ipairs(map) do
			for l,level in ipairs(dungeon.Levels) do
				data[m][d].Levels[l] = set_levelState(m, d, l, data[m][d].Levels[l], reset)
			end
		end
	end
	return data
end

local function assign_henchmen_to_levels(data)

	assert(defsave.loaded.Henchmen.data, "Henchmen data not loaded")
	-- By place in the list: a saved henchman's own id can be from a list
	-- that has since had event rows added before it.
	for h, henchmen in ipairs(defsave.loaded.Henchmen.data) do
		data[henchmen.map_id][henchmen.dungeon_id].Levels[henchmen.level_id].henchmen_id = h
	end
	return data
end

local function ingestLevels(data)
	local items = loadResources()
	for m,map in ipairs(data) do
		for d,dungeon in ipairs(map) do

			for l,level in ipairs(dungeon.Levels) do


				data[m][d].Levels[l].isLocked = true
				data[m][d].Levels[l].isHidden = true
				data[m][d].Levels[l].buyState = 1
				

				local resources = defsave.loaded.Resources.data
				if tablelength(resources) > 0 then
					for r,row in ipairs(level.Loot_Table) do
						assert(items[row.Option.Stat], row.Option.Stat .. " doesn't exist in list of items.")
						data[m][d].Levels[l].Loot_Table[r].Option.Icon = items[row.Option.Stat].Icon
					end
				end
				
			end
		end
	end

	data = assign_henchmen_to_levels(data)
	
	return data
end

local function on_start(message)
	print("MAPCONTROLLER: Loading Map JSON")
	defsave.default_data.Map = saveload.load_from_JSON("/data/Map.json")
	defsave.load("Map")
	msg.post(controller, "refreshMap")
	if actions.tablelength(defsave.loaded.Map.data) > 0 then msg.post(controller, "boot_map") end
	print("MAPCONTROLLER: Map Loaded")
end

local function get_levelCrit(map_id, dungeon_id, level_id, type)
	local gear_data = actions.clone(defsave.loaded.Gear.data)
	local total = 1
	for g,gear in ipairs(gear_data) do
		if gear.Modifier.Type == type and gear.map_id == map_id and gear.dungeon_id == dungeon_id and gear.level_id == level_id then
			total = gear.Modifier.Factor ^ gear.Level
			break
		end
	end
	return total
end

--[[ Enemy events (gdd/enemy-events.md). A location is a column of enemy rows;
the row's henchman slot holds the enemy, and its Size is how many are left.
The crew fights the front row, the first one with enemies left: its tick lands
Damage there the way a henchman's does, and every Health's worth of it is a
kill. Damage left after the last kill of a row carries into the next row, and
when the whole column is down the next wave comes in, tougher and richer. ]]

local function enemy_of(level)
	return defsave.loaded.Henchmen.data[level.henchmen_id]
end

-- Rows with enemies left in a location, front first.
local function front_row(dungeon)
	for l,level in ipairs(dungeon.Levels) do
		if level.wasClickedOpen and (enemy_of(level).Size or 0) > 0 then return l end
	end
end

-- The front row's enemy is the one the crew's tick works; every other row
-- waits. The tick starts from now, so a new front row starts at full health.
local function set_front(map_id, dungeon_id)
	local dungeon = defsave.loaded.Map.data[map_id][dungeon_id]
	local front = front_row(dungeon)
	local now = os.clock() + defsave.get("Currency", "BonusTime")
	for l,level in ipairs(dungeon.Levels) do
		local enemy = enemy_of(level)
		local active = level.wasClickedOpen and l == front
		if active and not enemy.Active then
			enemy.lastupdated = now
			enemy.nextupdate = nil
		end
		enemy.Active = active
		level.State = nil
	end
	defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false)
	msg.post(controller, "update_allenemies", { map_id = map_id })
end

local function new_wave(map_id, dungeon_id)
	local dungeon = defsave.loaded.Map.data[map_id][dungeon_id]
	dungeon.Wave = (dungeon.Wave or 1) + 1
	local growth = actions.ENEMY_WAVE_GROWTH ^ (dungeon.Wave - 1)
	for l,level in ipairs(dungeon.Levels) do
		local enemy = enemy_of(level)
		enemy.Size = enemy.EnemyCount
		level.BaseHealth = level.BaseHealth or level.Health
		level.Health = math.ceil(level.BaseHealth * growth)
		level.Damage = 0
	end
	msg.post("main:/menu#dungeonmine", "enemy_fx", { kind = "wave", map_id = map_id, dungeon_id = dungeon_id, wave = dungeon.Wave })
end

-- Settles the Damage on an enemy row: kills, their loot, and what is left
-- over passed down the column.
local function enemy_kills(map_id, dungeon_id, level_id)
	local dungeon = defsave.loaded.Map.data[map_id][dungeon_id]
	local level = dungeon.Levels[level_id]
	local enemy = enemy_of(level)
	level.Damage = level.Damage or 0
	if level.Damage < level.Health and (enemy.Size or 0) > 0 then return end

	local kills = math.min(enemy.Size or 0, math.floor(level.Damage / level.Health))
	if kills > 0 then
		level.Damage = level.Damage - kills * level.Health
		enemy.Size = enemy.Size - kills
		local wave = actions.ENEMY_WAVE_GROWTH ^ ((dungeon.Wave or 1) - 1)
		msg.post(controller, "gen_enemyloot", {
			map_id = map_id, dungeon_id = dungeon_id, level_id = level_id, kills = kills,
			packSize = actions.enemy_gear(map_id, dungeon_id, "packSize") * wave,
			critChance = actions.enemy_gear(map_id, dungeon_id, "critChance"),
			critBonus = actions.enemy_gear(map_id, dungeon_id, "critBonus"),
		})
		msg.post(controller, "update_resources", { stat = "kill" .. map_id .. "-" .. dungeon_id .. "-" .. level_id, amount = kills })
		msg.post("main:/menu#dungeonmine", "enemy_fx", { kind = "kill", map_id = map_id, dungeon_id = dungeon_id, level_id = level_id,
			kills = kills, left = enemy.Size, boss = enemy.Boss })
	end
	if enemy.Size > 0 then return end

	-- The row is clear: what is left goes on down the column. When every
	-- open row is clear, they all come back as the next wave.
	local leftover = level.Damage
	level.Damage = 0
	local next_row = front_row(dungeon)
	if not next_row then
		new_wave(map_id, dungeon_id)
		next_row = front_row(dungeon)
	end
	set_front(map_id, dungeon_id)
	if leftover > 0 then
		local after = dungeon.Levels[next_row]
		after.Damage = (after.Damage or 0) + leftover
		enemy_kills(map_id, dungeon_id, next_row)
	end
end

local function complete_dungeonlevel(message)
	if actions.enemy_map(message.map_id) then
		enemy_kills(message.map_id, message.dungeon_id, message.level_id)
		return
	end
	assert(message.map_id, 			"message.map_id"		)
	assert(message.dungeon_id, 		"message.dungeon_id"	)
	assert(message.level_id, 		"message.level_id"		)
	assert(message.henchmen_id, 	"message.henchmen_id"	)
	
	local level_data = defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id]
	local damage = level_data["Damage"]
	local health = level_data["Health"]
	
	message.packs = message.packs or math.floor(damage/health)
	message.damageLimit = message.damageLimit or message.packs
	
	if level_data.Damage >= level_data.Health then
		assert(message.henchmen_id, "Henchmen ID is missing")

		local previousLevel = defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id-1]
		if previousLevel then
			msg.post(controller, "mod_henchmen", { henchmen_id = previousLevel.henchmen_id, amount = message.packs * defsave.get("Henchmen", message.henchmen_id).Size })
		end
		msg.post(controller, "deactivate_henchmen", message)
		message.packSize = message.level_id
		
		if not defsave.loaded.Henchmen.data[message.henchmen_id].contDamage then
			defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id]["Damage"] = 0
		end

		message.critChance 	= get_levelCrit(message.map_id, message.dungeon_id, message.level_id, "critChance")
		message.critBonus 	= get_levelCrit(message.map_id, message.dungeon_id, message.level_id, "critBonus")
		message.critLuck 	= get_levelCrit(message.map_id, message.dungeon_id, message.level_id, "critLuck")
		message.packSize 	= get_levelCrit(message.map_id, message.dungeon_id, message.level_id, "packSize")
		message.packSize	= message.packSize * defsave.loaded.Henchmen.data[message.henchmen_id].Size
		msg.post(controller, "gen_levelpacks", message)

		if defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id].contDamage == false then
			msg.post("main:/menu#dungeonmine", "trigger_level", message)
		end
		
		msg.post( controller, "reset_dungeonlevel", message)
		defsave.save("Map", true)
	end
end

local function play_levelvfx(vfx, level_id)
	if vfx then
		assert(vfx.type == "level", "wrong vfx type")
		if vfx.originalflipbook == nil then vfx.originalflipbook = vfx.flipbook end
		vfx.flipbook = vfx.originalflipbook .. "_" .. level_id
		msg.post("main:/menu#dungeonmine", "play_vfx", message )
	end
end

local function damage_mapLevel(map_id, dungeon_id, level_id, amount, message)
	local dungeon_data = defsave.loaded.Map.data[map_id][dungeon_id]
	local level_data = dungeon_data.Levels[level_id]
	if not level_data.isLocked and level_data.wasClickedOpen then

		if level_data["Damage"] == nil then
			defsave.loaded.Map.data[map_id][dungeon_id].Levels[level_id]["Damage"] = 0
		end

		defsave.loaded.Map.data[map_id][dungeon_id].Levels = actions.modify_field(dungeon_data.Levels, level_id, "Damage", amount)
		complete_dungeonlevel(message)
		defsave.save("Map", true)
	end
end

--[[ Field hero powers that hit levels (gdd/heroes-roster.md). Each lands its
damage through hit_level, the same way mod_map does, and tells the dungeon
screen what happened so it can draw it. ]]

local function henchman_on(map_id, dungeon_id, level_id)
	for h,henchman in ipairs(defsave.loaded.Henchmen.data) do
		if henchman.map_id == map_id and henchman.dungeon_id == dungeon_id and henchman.level_id == level_id then
			return h
		end
	end
end

local function open_levels(map_id, dungeon_id)
	local open = {}
	for l,level in ipairs(defsave.loaded.Map.data[map_id][dungeon_id].Levels) do
		-- An enemy row that is already cleared is no longer there to hit.
		if not level.isLocked and level.wasClickedOpen and level.State ~= "Invisible" then table.insert(open, l) end
	end
	return open
end

-- A hero's blow on an enemy row shows where it lands.
local function enemy_hit_fx(map_id, dungeon_id, level_id, amount)
	if actions.enemy_map(map_id) and amount > 0 then
		msg.post("main:/menu#dungeonmine", "enemy_fx", { kind = "hit", map_id = map_id, dungeon_id = dungeon_id, level_id = level_id, amount = amount })
	end
end

local function hit_level(map_id, dungeon_id, level_id, amount, message)
	local level = defsave.loaded.Map.data[map_id][dungeon_id].Levels[level_id]
	if level.Damage == nil then level.Damage = 0 end
	amount = amount * actions.hex_multiplier(map_id, dungeon_id)
	level.Damage = level.Damage + amount
	enemy_hit_fx(map_id, dungeon_id, level_id, amount)
	local hit = actions.clone(message)
	hit.level_id = level_id
	hit.henchmen_id = henchman_on(map_id, dungeon_id, level_id)
	if hit.henchmen_id then
		complete_dungeonlevel(hit)
		msg.post(controller, "update_henchmen", { henchmen_id = hit.henchmen_id })
	end
	return amount
end

local function hero_fx(message, kind, extra)
	local fx = extra or {}
	fx.kind, fx.hero_id, fx.map_id, fx.dungeon_id = kind, message.hero_id, message.map_id, message.dungeon_id
	fx.echo = message.echo_scale ~= nil
	msg.post("main:/menu#dungeonmine", "hero_fx", fx)
end

local hero_powers = {
	-- Grisla Hexmire: every level here takes more damage, for a while.
	hero_hex = function(message)
		local multiplier = actions.hero_power(message, message.at1, message.at13)
		local key = message.map_id .. "-" .. message.dungeon_id
		actions.herostate.hex[key] = { multiplier = multiplier, ends = os.clock() + message.duration }
		for h,henchman in ipairs(defsave.loaded.Henchmen.data) do
			if henchman.map_id == message.map_id and henchman.dungeon_id == message.dungeon_id and henchman.Active then
				msg.post(controller, "update_henchmen", { henchmen_id = h })
			end
		end
		hero_fx(message, "hex", { multiplier = multiplier, duration = message.duration })
	end,
	-- Brakka Ironjaw: the same share of every level's full health.
	hero_breach = function(message)
		local share = actions.hero_power(message, message.at1, message.at13)
		local hits = {}
		for _,l in ipairs(open_levels(message.map_id, message.dungeon_id)) do
			local level = defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[l]
			hit_level(message.map_id, message.dungeon_id, l, level.Health * share, message)
			table.insert(hits, l)
		end
		hero_fx(message, "breach", { levels = hits, share = share })
	end,
	-- Old Mossback: finishes every level below his threshold.
	hero_pounce = function(message)
		local threshold = math.min(0.95, actions.hero_power(message, message.at1, message.at13))
		local hits = {}
		for _,l in ipairs(open_levels(message.map_id, message.dungeon_id)) do
			local level = defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[l]
			local damage = level.Damage or 0
			if not level.contDamage and damage > 0 and (level.Health - damage) / level.Health <= threshold then
				hit_level(message.map_id, message.dungeon_id, l, level.Health - damage, message)
				table.insert(hits, l)
			end
		end
		hero_fx(message, "pounce", { levels = hits, threshold = threshold })
	end,
	-- Fizzwick Cogsworth: steady damage on the deepest open level, every second.
	hero_turret = function(message)
		local open = open_levels(message.map_id, message.dungeon_id)
		local l = open[#open]
		if not l then return end
		local dps = actions.hero_power(message, message.at1, message.at13)
		local landed = hit_level(message.map_id, message.dungeon_id, l, dps, message)
		hero_fx(message, "turret", { level_id = l, amount = landed })
	end,
	-- Thumper: hops down the open levels, doubling at every landing.
	hero_hop = function(message)
		local base = actions.hero_power(message, message.at1, message.at13)
		local hops = {}
		for i,l in ipairs(open_levels(message.map_id, message.dungeon_id)) do
			local landed = hit_level(message.map_id, message.dungeon_id, l, base * 2 ^ (i - 1), message)
			table.insert(hops, { level_id = l, amount = landed })
		end
		hero_fx(message, "hop", { hops = hops })
	end,
}

local messageData = {}
messageData["all"] = {
	["hero_hex"] = function(message_id, message, sender) hero_powers.hero_hex(message) defsave.save("Map", true) end,
	["hero_breach"] = function(message_id, message, sender) hero_powers.hero_breach(message) defsave.save("Map", true) end,
	["hero_pounce"] = function(message_id, message, sender) hero_powers.hero_pounce(message) defsave.save("Map", true) end,
	["hero_turret"] = function(message_id, message, sender) hero_powers.hero_turret(message) defsave.save("Map", true) end,

	["hero_hop"] = function(message_id, message, sender) hero_powers.hero_hop(message) defsave.save("Map", true) end,
	["on_start"] = function(message_id, message, sender)
		on_start(message)
	end,
	["start_game"] = function(message_id, message, sender)
		if actions.tablelength(defsave.loaded.Henchmen.data) > 0 and actions.tablelength(defsave.loaded.Resources.data) > 0 then

			print("DEBUG: MAP: start_game")
			-- Saves made before an event map existed don't have it yet. The
			-- default level states below already read the saved map, so it goes
			-- in first, and again after the reload.
			-- An event map whose locations or levels have changed since the
			-- save is replaced too: the event starts its run again with it.
			local function same_shape(saved, default)
				if #saved ~= #default then return false end
				for d,dungeon in ipairs(default) do
					if #saved[d].Levels ~= #dungeon.Levels or saved[d].Name ~= dungeon.Name then return false end
					-- An event remade on the same map keeps its location names.
					for l,level in ipairs(dungeon.Levels) do
						if saved[d].Levels[l].Name ~= level.Name then return false end
					end
				end
				return true
			end
			local function add_missing_maps()
				for m = 2, #defsave.default_data.Map do
					local saved = defsave.loaded.Map.data[m]
					if saved == nil or not same_shape(saved, defsave.default_data.Map[m]) then
						defsave.loaded.Map.data[m] = actions.clone(defsave.default_data.Map[m])
					end
				end
			end
			add_missing_maps()
			defsave.default_data.Map = ingestLevels(defsave.default_data.Map)
			defsave.default_data.Map = set_levelStates(defsave.default_data.Map, false)

			defsave.load("Map")
			print("DEBUG: MAP: start_game")
			add_missing_maps()
			defsave.loaded.Map.data = assign_henchmen_to_levels(defsave.loaded.Map.data)
			defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false)
			defsave.loaded.Map.data = ingestLevels_Live(defsave.loaded.Map.data)

			defsave.save("Map", true)
		end
	end,
	["complete_rank"] = function(message_id, message, sender)
		if not message.portal then
			for m,map in ipairs(actions.clone(defsave.loaded.Map.data)) do
				if m ~= 1 then break end
				for d,dungeon in ipairs(map) do
					for l,level in ipairs(dungeon.Levels) do
						defsave.loaded.Map.data[m][d].Levels[l].wasClickedOpen = false
					end
				end
			end
			defsave.save("Map", true)
		end
	end,
	["reset_mapdata"] = function(message_id, message, sender)
		print("DEBUG: MAP: reset_mapdata")
		defsave.default_data.Map = ingestLevels(defsave.default_data.Map)
		defsave.default_data.Map = set_levelStates(defsave.default_data.Map, true)
		defsave.reset_to_default("Map")
		defsave.save("Map", true)
	end,
	["event_reset"] = function(message_id, message, sender)
		defsave.loaded.Map.data[message.map_id] = actions.clone(defsave.default_data.Map[message.map_id])
		-- The run's health, set from the event crew's strength (repController).
		local scale = message.health_scale or 1
		for d,dungeon in ipairs(defsave.loaded.Map.data[message.map_id]) do
			dungeon.Wave = 1
			for l,level in ipairs(dungeon.Levels) do
				level.Health = math.ceil(level.Health * scale)
				-- An enemy wave's health grows from the run's own.
				level.BaseHealth = level.Health
			end
		end
		defsave.loaded.Map.data = assign_henchmen_to_levels(defsave.loaded.Map.data)
		defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false)
		defsave.save("Map", true)
		refresh_mapdata(message.map_id, 1)
	end,
	["update_currentlocation"] = function(message_id, message, sender)
		curLoc = { map_id = message.map_id, dungeon_id = message.dungeon_id }
	end,
	["set_inventory"] = function(message_id, message, sender)
		defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level].Loot_Table[message.table].Inventory = message.inventory
		defsave.save("Map", true)
		msg.post("main:/menu#map", "refresh_all")
	end,
	["mod_maxdungeonlevel"] = function(message_id, message, sender)
		local dungeon_data = defsave.loaded.Map.data[message.map_id][message.dungeon_id]
		message.count = message.count or 1
		message.level_id = 0
		

		for num=1, math.min(#dungeon_data.Levels, tonumber(message.hero_level)) do
			if not dungeon_data.Levels[num].isLocked and dungeon_data.Levels[num].wasClickedOpen then 
				message.level_id = num
			end
		end

		local landed = message.amount * message.count * actions.hex_multiplier(message.map_id, message.dungeon_id)
		defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels = actions.modify_field(dungeon_data.Levels, message.level_id, message.field, landed)
		enemy_hit_fx(message.map_id, message.dungeon_id, message.level_id, landed)

		if message.vfx then
			if message.vfx.originalflipbook == nil then message.vfx.originalflipbook = message.vfx.flipbook end
			message.vfx.flipbook = message.vfx.originalflipbook .. "_" .. message.level_id
			msg.post("main:/menu#dungeonmine", "play_vfx", message )
		end


		local henchmen_data = defsave.loaded.Henchmen.data
		for h,henchman in ipairs(henchmen_data) do
			if henchman.map_id == message.map_id
			and henchman.dungeon_id == message.dungeon_id
			and henchman.level_id == message.level_id then
				message.henchmen_id = h
				break
			end
		end

		assert(message.henchmen_id, "Henchmen ID is missing")
		complete_dungeonlevel(message)
		
		defsave.save("Map", true)

		msg.post(controller, "update_henchmen", {henchmen_id = message.henchmen_id})
	end,
	["mod_dungeonlevel"] = function(message_id, message, sender)
		local dungeon_data = defsave.loaded.Map.data[message.map_id][message.dungeon_id]
		local level_data = dungeon_data.Levels[message.level_id]

		local henchmen = defsave.get("Henchmen", message.henchmen_id)
		-- Enemies are fought one at a time, however strong the crew.
		if henchmen.dps >= level_data["Health"] and not level_data.contDamage and not henchmen.Enemy then
			level_data.contDamage = true
			level_data.State = "Active"
			msg.post(controller, "set_contdamage", { henchmen_id = message.henchmen_id } )
		end

		damage_mapLevel(message.map_id, message.dungeon_id, message.level_id, message.amount, message)
		play_levelvfx(message.vfx, message.level_id)

	end,
	["mod_map"] = function(message_id, message, sender)
		message.count = message.count or 1


		if message.herolevel == nil then message.herolevel = 1 end
		local stats = defsave.loaded.Stats.data
		local henchmen_data = defsave.loaded.Henchmen.data
		local dungeon_data = defsave.loaded.Map.data[message.map_id][message.dungeon_id]


		for level = math.min(#dungeon_data.Levels, tonumber(message.hero_level)), 1, -1 do

			if not dungeon_data.Levels[level].isLocked and dungeon_data.Levels[level].wasClickedOpen then
				
				if dungeon_data.Levels[level] ~= nil then
					

						
						if dungeon_data.Levels[level]["Damage"] == nil then dungeon_data.Levels[level]["Damage"] = 0 end


						local landed = message.amount * message.count * actions.hex_multiplier(message.map_id, message.dungeon_id)
						defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels = actions.modify_field(dungeon_data.Levels, level, message.field, landed)
						enemy_hit_fx(message.map_id, message.dungeon_id, level, landed)
						message.level_id = level

						if message.vfx then
							if message.vfx.type == "level" then
								if message.vfx.originalflipbook == nil then message.vfx.originalflipbook = message.vfx.flipbook end
								message.vfx.flipbook = message.vfx.originalflipbook .. "_" .. level
								msg.post("main:/menu#dungeonmine", "play_vfx", message )
							end
						end


						for h,henchman in ipairs(henchmen_data) do
							if henchman.map_id == message.map_id
							and henchman.dungeon_id == message.dungeon_id
							and henchman.level_id == level then
								message.henchmen_id = h
								break
							end
						end

						-- A hero can damage a level before any henchman works it,
						-- so there may be no one to credit. The damage still lands.
						if message.henchmen_id then
							complete_dungeonlevel(message)
							msg.post(controller, "update_henchmen", {henchmen_id = message.henchmen_id})
						end

				end
			end
		end
		defsave.save("Map", true)
	end,
	["disable_level"] = function(message_id, message, sender)
		print("MAP: disable_level")
		defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id].State = "Disabled"
		defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false)
		defsave.save("Map", true)
		refresh_mapdata(message.map_id, message.dungeon_id)
	end,
	["enable_level"] = function(message_id, message, sender)
		print("MAP: enable_level")
		defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id].State = "Inactive"
		defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false)
		defsave.save("Map", true)
		refresh_mapdata(message.map_id, message.dungeon_id)
	end,
	["deactivate_levels"] = function(message_id, message, sender)
		print("MAP: deactivate_levels")
		for m,map in ipairs(defsave.loaded.Map.data) do
			if m ~= 1 then break end
			for d,dungeon in ipairs(map) do
				for l,level in ipairs(dungeon.Levels) do
					defsave.loaded.Map.data[m][d].Levels[l].Damage = 0
				end
			end
		end
		defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false)
		defsave.save("Map", true)
		refresh_mapdata(message.map_id, message.dungeon_id)
	end,
	["activate_level"] = function(message_id, message, sender)
		print("DEBUG: MAP: activate_level")
		defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id].State = "Active"
		defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false)
		defsave.save("Map", true)
		refresh_mapdata(message.map_id, message.dungeon_id)
	end,
	["deactivate_level"] = function(message_id, message, sender)
		defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id].Damage = 0
		defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id] = set_levelState(message.map_id, message.dungeon_id, message.level_id, defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id], false)
		defsave.save("Map", true)
		refresh_mapdata(message.map_id, message.dungeon_id)
	end,
	["explore_level"] = function(message_id, message, sender)
		print("DEBUG: MAP: explore_level")
		-- An enemy row opens into the fight; its health already follows the wave.
		if actions.enemy_map(message.map_id) then
			defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id].wasClickedOpen = true
			set_front(message.map_id, message.dungeon_id)
			defsave.save("Map", true)
			refresh_mapdata(message.map_id, message.dungeon_id)
			return
		end
		local map_data = defsave.get("Map", message.map_id)
		defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id].wasClickedOpen = true
		defsave.set("Map", message.map_id, set_levelStates(defsave.loaded.Map.data, false)[message.map_id] )
		defsave.save("Map", true)
		refresh_mapdata(message.map_id, message.dungeon_id)
	end,
	["unlock_level"] = function(message_id, message, sender)
		if defsave.loaded.Map.data[message.map_id][message.dungeon_id].Level == 0 then 
			defsave.loaded.Map.data[message.map_id][message.dungeon_id].Level = 1
			if defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[1].Level == 0 then 
				defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[1].Level = 1				
				defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[1].State = "Inactive"

				msg.post(controller, "unlock_dungeon", { map_id = message.map_id, dungeon_id = message.dungeon_id, dungeonlevel = 1 })
			end
			defsave.save("Map", true)
			refresh_mapdata(message.map_id, message.dungeon_id)
		end
	end,	
	["unlock_levels"] = function(message_id, message, sender)
		print("DEBUG: MAP: unlock_levels")
		defsave.loaded.Map.data = set_levelStates(defsave.loaded.Map.data, false)
	end,
	["reset_dungeonlevel"] = function(message_id, message, sender)
		local id = actions.findintable(defsave.loaded.Map.data[message.map_id], "id", message.dungeon_id)
		if defsave.loaded.Map.data[message.map_id][id].Levels[message.level_id] ~= nil then
			local damage = defsave.loaded.Map.data[message.map_id][id].Levels[message.level_id]["Damage"]
			local health = defsave.loaded.Map.data[message.map_id][id].Levels[message.level_id]["Health"]
			local fullDamage = math.floor(damage/health)


			--[[
			if fullDamage >= 1 then
				defsave.loaded.Map.data[message.map_id][id].Levels[message.level_id]["Damage"] = 0
			else
				defsave.loaded.Map.data[message.map_id][id].Levels[message.level_id]["Damage"] = damage - ( health * fullDamage )
			end
			]]

			defsave.loaded.Map.data[message.map_id][id].Levels[message.level_id]["Damage"] = damage - ( health * fullDamage )

		end
		refresh_mapdata(message.map_id, message.dungeon_id)
		defsave.save("Map", true)
	end,
	["toggle_buystate"] = function(message_id, message, sender)
		if message.map_id and message.dungeon_id and message.level_id then
			local state = defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id]["buyState"] + 1
			if state > #defsave.get("Stats", "buyStates") then state = 1 end
			defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id]["buyState"] = state
			defsave.save("Map", true)
		end
	end
}

function M.findReceiver(message_id, message, sender)
	for u, url in pairs(messageData) do							-- look up the sender in the data set 
		if sender == msg.url(u) or u == "all" then				-- find the sender
			for a, action in pairs(url) do						-- look up the message
				if message_id == hash(a) or a == "all" then		-- find the message
					action(message_id, message, sender)								-- run the function from the table
				end
			end
		end
	end
end

return M
