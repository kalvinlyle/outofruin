local inspect = require('inspect')
local actions = require('actions')
local random = require('random/random')
local progress = require('progress/progress')
local saveload = require('saveload/saveload')
local defsave = require('defsave/defsave')

local productName = "OoR"
local controller	= "main:/menu#controller"
local baseHealingTime = 5

local M = {}
local curLoc = { map_id = 0, dungeon_id = 0 }

local pause = false
local pauseTimer = 0

local update_list = {}
local dungeon_regenSpeed = {
	{ map_id = 1, dungeon_id = 1, regenSpeed = 1 },
	{ map_id = 1, dungeon_id = 2, regenSpeed = 1 },
	{ map_id = 1, dungeon_id = 3, regenSpeed = 1 },
	{ map_id = 1, dungeon_id = 4, regenSpeed = 1 },
	{ map_id = 1, dungeon_id = 5, regenSpeed = 1 },
	{ map_id = 2, dungeon_id = 1, regenSpeed = 1 },
	{ map_id = 2, dungeon_id = 2, regenSpeed = 1 },
	{ map_id = 2, dungeon_id = 3, regenSpeed = 1 }
}

local attributeMap 		= {}
attributeMap.Empathy 	= "Healing"
attributeMap.Greed		= "Luck"
attributeMap.Reason		= "Wisdom"
attributeMap.Wrath		= "Attack"
attributeMap.Zeal		= "Speed"
attributeMap.Stasis		= "Defense"

local hero_portrait = { "hero_elfmercenary", "hero_dwarfdruid", "hero_goblinassassin" }

local function update_herotimer(id, p, t)
	if p == nil then p = 1 end
	if t == nil then t = 0 end
	if defsave.loaded.Hero.data[id] ~= nil then
		defsave.loaded.Hero.data[id].Timer = math.max(0, t)
		defsave.loaded.Hero.data[id].Percent = math.max(0, math.min(1, p) )
	end
	defsave.save("Hero", true)
end

local function get_regenSpeed(map_id, dungeon_id)

	local regenSpeed = 1


	for d,dungeon in pairs(dungeon_regenSpeed) do
		if map_id == dungeon.map_id and dungeon_id == dungeon.dungeon_id then
			regenSpeed = regenSpeed * dungeon_regenSpeed[d].regenSpeed
		end
	end

	return regenSpeed

end

local unassign_hero

-- Hero.data index of the hero in a slot, other than `except`.
local function hero_in_slot(map_id, dungeon_id, slot_id, except)
	for h,hero in ipairs(defsave.loaded.Hero.data) do
		local at = hero.location
		if h ~= except and at and at.map_id == map_id and at.dungeon_id == dungeon_id and at.slot_id == slot_id then return h end
	end
end

local function heroes_in_dungeon(map_id, dungeon_id)
	local count = 0
	for _,hero in ipairs(defsave.loaded.Hero.data) do
		local at = hero.location
		if at and at.map_id == map_id and at.dungeon_id == dungeon_id then count = count + 1 end
	end
	return count
end

local function assign_hero(message)
	-- hero_id is the index into Hero.data. It used to be looked up by an "id"
	-- field that only unlocked heroes carried, so a hero unlocked straight from
	-- the JSON matched the first hero with no id instead of itself.
	local id = message.hero_id
	assert(defsave.loaded.Hero.data[id], "id not found in defsave.loaded.Hero.data")

	-- The hero slots screen drops a hero on any slot. A hero moved between two
	-- slots of one dungeon trades places with whoever is there and keeps its
	-- power timers; a hero from anywhere else bumps the slot's hero back to
	-- the roster, and leaves its old slot so the heroes behind it close up.
	local from = defsave.loaded.Hero.data[id].location
	local occupant = hero_in_slot(message.map_id, message.dungeon_id, message.slot_id, id)
	if from and from.map_id == message.map_id and from.dungeon_id == message.dungeon_id then
		if occupant then
			defsave.loaded.Hero.data[occupant].location.slot_id = from.slot_id
			from.slot_id = message.slot_id
		else
			-- Slots are kept packed, so an empty one is past the last hero.
			for _,hero in ipairs(defsave.loaded.Hero.data) do
				local at = hero.location
				if at and at.map_id == from.map_id and at.dungeon_id == from.dungeon_id and at.slot_id > from.slot_id then
					at.slot_id = at.slot_id - 1
				end
			end
			from.slot_id = heroes_in_dungeon(from.map_id, from.dungeon_id)
		end
		defsave.save("Hero", true)
		return
	end
	if occupant then
		unassign_hero({ hero_id = occupant })
		msg.post(controller, "clear_heroquest", { hero_id = occupant })
	end
	if from then unassign_hero({ hero_id = id }) end
	local slot_id = math.min(message.slot_id, heroes_in_dungeon(message.map_id, message.dungeon_id) + 1)

	defsave.loaded.Hero.data[id].location = { map_id = message.map_id, dungeon_id = message.dungeon_id, slot_id = slot_id }


	for p,power in ipairs(defsave.loaded.Hero.data[id].Powers) do
		defsave.loaded.Hero.data[id].Powers[p].Stage = 1
		defsave.loaded.Hero.data[id].Powers[p].lastupdate = os.clock() + defsave.get("Currency", "BonusTime")
		defsave.loaded.Hero.data[id].Powers[p].nextupdate = os.clock() + defsave.get("Currency", "BonusTime") + defsave.loaded.Hero.data[id].Powers[p].Stages[defsave.loaded.Hero.data[id].Powers[p].Stage].updatedelay
		defsave.loaded.Hero.data[id].Powers[p].regenSpeed = get_regenSpeed(message.map_id, message.dungeon_id)
	end
	defsave.save("Hero", true)
end

unassign_hero = function(message)
	local id = message.hero_id
	if id == nil or defsave.loaded.Hero.data[id] == nil then return end
	local location = defsave.loaded.Hero.data[id]["location"]


	for p,power in ipairs(defsave.loaded.Hero.data[id].Powers) do
		defsave.loaded.Hero.data[id].Powers[p].regenSpeed = 1
	end	


	if location ~= nil then
		local emptySlot = location.slot_id
		for i=emptySlot,4 do
			for h,hero in ipairs(defsave.loaded.Hero.data) do
				if hero.location ~= nil then
					if id ~= h
					and location.map_id == hero.location.map_id
					and location.dungeon_id == hero.location.dungeon_id
					and i + 1 == hero.location.slot_id then
						defsave.loaded.Hero.data[h].location.slot_id = i
					end
				end
			end
		end
	end

	defsave.loaded.Hero.data[id]["location"] = nil

	defsave.save("Hero", true)
end

local function unlock_hero(data, lvl, id)
	local newhero = { 
		id = id,
		Portrait = data.Portrait,
		Description = data.Description,
		Rarity = data.Rarity,
		Name = data.Name, Description = data.Quote,
		Level = lvl,
		Health = 10 * lvl, Damage = 0,
		Mana = 10 * lvl, Drain = 0,
		isUnlocked = true,
		Status = "Unlocked",
		Powers = data.Powers
	}

	for p,power in ipairs(newhero.Powers) do
		newhero.Powers[p].Stage = 1
	end

	return newhero
end




local function add_location(message)
	if defsave.loaded.Hero.data[message.hero_id].location then
		message.map_id = defsave.loaded.Hero.data[message.hero_id].location.map_id
		message.dungeon_id = defsave.loaded.Hero.data[message.hero_id].location.dungeon_id

		msg.post(controller, message.msg, message)
	end
end

local function send_vfx(message)
	if defsave.loaded.Hero.data[message.hero_id].location then
		message.map_id = defsave.loaded.Hero.data[message.hero_id].location.map_id
		message.dungeon_id = defsave.loaded.Hero.data[message.hero_id].location.dungeon_id
		message.hero_level = defsave.loaded.Hero.data[message.hero_id].Level
		if curLoc.map_id == message.map_id and curLoc.dungeon_id == message.dungeon_id then
			msg.post(controller, message.msg, message)
		end
	end
end

local function add_location_randomlevel(message)
	if defsave.loaded.Hero.data[message.hero_id].location then
		message.map_id = defsave.loaded.Hero.data[message.hero_id].location.map_id
		message.dungeon_id = defsave.loaded.Hero.data[message.hero_id].location.dungeon_id
		message.hero_level = defsave.loaded.Hero.data[message.hero_id].Level
		
		local levels_data = actions.clone(defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels)
		local numlevels = #levels_data
		local maxlevel = 1

		for n=1,numlevels do
			if levels_data[n].Locked then
				maxlevel = n - 1
				break
			end
		end
		message.level_id = math.random(1, maxlevel)
		message.level_id = math.ceil(message.level_id)
		
		msg.post(controller, message.msg, message)
	end
end



local function sort_table(data, field1)
	local result = table.sort(data, function(a,b)
		if a[field1] < b[field1] then 
			return true
		else
			return false
		end
	end)
	if result ~= nil then data = result end
	return data
end

local function mod_regenSpeed(message)
	local mod_amount = message.mod_amount
	local map_id = message.map_id
	local dungeon_id = message.dungeon_id
	local hero_id = message.hero_id


	for d,dungeon in pairs(dungeon_regenSpeed) do
		if map_id == dungeon.map_id and dungeon_id == dungeon.dungeon_id then
			dungeon_regenSpeed[d].regenSpeed = math.max( 1, dungeon_regenSpeed[d].regenSpeed * mod_amount )
		end
	end


	for h, hero in ipairs(defsave.loaded.Hero.data) do
		if hero.location then
			if h ~= hero_id and hero.location.map_id == map_id and hero.location.dungeon_id == dungeon_id then
				for p, power in ipairs(hero.Powers) do

					defsave.loaded.Hero.data[h].Powers[p].regenSpeed = math.max( 1, defsave.loaded.Hero.data[h].Powers[p].regenSpeed * mod_amount )
					defsave.loaded.Hero.data[h].Powers[p].nextupdate = ( ( power.nextupdate - os.clock() + defsave.get("Currency", "BonusTime") ) / mod_amount ) + os.clock() + defsave.get("Currency", "BonusTime")

					for u,update in pairs(update_list) do
						if update.hero_id == h and update.power_id == p then
							update_list[u].nextupdate = defsave.loaded.Hero.data[h].Powers[p].nextupdate
							break
						end
					end
				end
			end
		end
	end

	if #update_list > 1 then
		update_list = sort_table(update_list, "nextupdate")
	end

	if defsave.loaded.Hero.data[hero_id].location then
		if curLoc.map_id == defsave.loaded.Hero.data[hero_id].location.map_id and curLoc.dungeon_id == defsave.loaded.Hero.data[hero_id].location.dungeon_id then
			msg.post("main:/menu#dungeonmine", "refresh_herodata")
		end
	end
	defsave.save("Hero", true)
end

-- Sir Aldous, the Legendary patron: every other hero's power counts as this
-- many levels higher.
local function old_master_bonus()
	return math.floor(actions.patron_value("HERO_SIRALDOUSBRIGHTWATER_NAME", 1, 5, 0) + 0.5)
end

-- A power Lady Vesper can repeat. The Cleric's blessing flips a speed boost on
-- and off, so a repeat of one half would leave it stuck; the turret fires every
-- second and would always be the last power; and an echo never echoes itself.
local NOT_echoable = { mod_regenspeed_dungeon = true, hero_turret = true, hero_echo = true }
local function echoable(message)
	return message ~= nil and message.msg ~= nil and not NOT_echoable[message.msg]
end

local function echo_power(message)
	local key = message.map_id .. "-" .. message.dungeon_id
	local last = actions.herostate.lastpower[key]
	if not last or last.hero_id == message.hero_id then return end
	local vesper = defsave.loaded.Hero.data[message.hero_id]
	local scale = actions.hero_scale(vesper.Level + old_master_bonus(), message.at1, message.at13)
	msg.post("main:/menu#dungeonmine", "hero_fx", { kind = "echo", hero_id = message.hero_id, source = last.hero_id, map_id = message.map_id, dungeon_id = message.dungeon_id })
	for _, action in ipairs(last.actions) do
		local repeat_message = actions.clone(action.message)
		repeat_message.hero_id = message.hero_id
		repeat_message.echo_scale = scale
		if repeat_message.amount then repeat_message.amount = repeat_message.amount * scale end
		if repeat_message.packs then repeat_message.packs = math.max(1, math.floor(repeat_message.packs * scale + 0.5)) end
		msg.post(controller, action.action, repeat_message)
	end
end

-- hero_id is the Hero.data index. It used to be read off hero_data.id, which
-- only heroes unlocked through unlock_hero ever had, so a hero unlocked from
-- the JSON dispatched its power actions with a nil hero_id and threw.
local function update_heropower(hero_data, power_id, timediff, hero_id)
	local power = hero_data.Powers[power_id]
	

	local action_list = {}
	local count = 0

	if power.nextupdate == nil then power.nextupdate = os.clock() + defsave.get("Currency", "BonusTime") end



	while power.nextupdate < os.clock() + defsave.get("Currency", "BonusTime") do

		if power.Stages[power.Stage].actions then
			if action_list[power.Stage] == nil then action_list[power.Stage] = {} end
			for a,action in pairs(power.Stages[power.Stage].actions) do
				action_list[power.Stage][a] = { action = action.action, message = action.message }
			end
		end

		if power.Stage + 1 > #power.Stages then
			power.Stage = 1
			count = count + ( hero_data.Powers[power_id].Level * ( hero_data.Level + old_master_bonus() ) )
		else
			power.Stage = power.Stage + 1
		end



		local updateDelay = power.Stages[power.Stage].updatedelay / power.regenSpeed
		updateDelay = math.max(0, updateDelay )

		power.nextupdate = power.nextupdate + updateDelay

	end

	print("HEROCONTROLLER: Update " .. hero_data.Name .. " count " ..  count)

	local fired = {}
	for s,stage in pairs(action_list) do
		for a,action in pairs(stage) do
			if action then
				action.message.hero_id = hero_id
				action.message.count = count
				msg.post(controller, action.action, action.message )
				if echoable(action.message) then table.insert(fired, actions.clone(action)) end
			end
		end
	end
	-- Lady Vesper repeats whatever power last fired in her dungeon.
	if #fired > 0 and hero_data.location and hero_data.location.map_id then
		actions.herostate.lastpower[hero_data.location.map_id .. "-" .. hero_data.location.dungeon_id] = { hero_id = hero_id, actions = fired }
	end

	power.lastupdate = os.clock() + defsave.get("Currency", "BonusTime")

	return power
end


local function set_updatelist()
	update_list = {}
	for h,hero in ipairs(defsave.loaded.Hero.data) do
		if hero.location then
			for p,power in ipairs(hero.Powers) do 
				if power.lastupdate == nil then 
					defsave.loaded.Hero.data[h].Powers[p] = update_heropower(defsave.loaded.Hero.data[h], p, 0, h)
				end
				table.insert(update_list, { hero_id = h, power_id = p, nextupdate = defsave.loaded.Hero.data[h].Powers[p].nextupdate })
			end
		end
	end
	if #update_list > 1 then
		update_list = sort_table(update_list, "nextupdate")
	end
end

local function return_cost(level)
	local levelcost = { 0, 50, 100, 200, 300, 400, 1000, 2000, 4000, 8000, 20000, 50000, 100000 }
	if level == 0 then return 0 else return levelcost[level + 1] end
end

local function set_progress(count, level)
	count = count or 0
	level = level or 0
	local levels = { 1, 2, 5, 10, 20, 50, 100, 200, 400, 800, 1000, 2000, 5000 }
	local prevCost = levels[level] or 0
	local progress = ( count - prevCost ) / levels[level + 1]
	return progress
end

local function set_copyText(count, level)
	count = count or 0
	level = math.max(1, level)
	local levels = { 1, 2, 5, 10, 20, 50, 100, 200, 400, 800, 1000, 2000, 5000 }
	local prevCost = levels[level - 1] or 0
	local text = ( count - prevCost ) .. "/" .. levels[level + 1]
	return text
end

local function ingest_hero(hero, id)
	local default_hero = saveload.load_from_JSON("/data/Heroes.json")[id]
	hero.Rank = default_hero.Rank
	hero.Name = default_hero.Name
	hero.Rarity = default_hero.Rarity
	hero.Kind = default_hero.Kind
	hero.Bonus = default_hero.Bonus
	hero.Portrait = default_hero.Portrait
	if hero.Level == nil			then hero.Level 			= 0 end
	if hero.Cards == nil			then hero.Cards 			= 1 end
	if hero.Cost == nil				then hero.Cost 			= return_cost(hero.Level) end
	if hero.Progress == nil			then hero.Progress 		= 0 end
	if hero.copyText == nil			then hero.copyText 		= set_copyText(hero.Cards, hero.Level) end
	if hero.Mana == nil				then hero.Mana	 		= 10 * hero.Level end
	if hero.Drain == nil			then hero.Drain 			= 0 end
	if not hero.Powers.Stage 	then hero.Powers.Stage 	= 1 end
	if hero.isUnlocked == nil 	then 
		hero.isUnlocked = false
		if hero.Status == "Unlocked" then hero.isUnlocked = true end
	end
	for p,power in ipairs(hero.Powers) do 
		if not hero.Powers[p].Level then hero.Powers[p].Level = 1 end
		if not hero.Powers[p].Cards then hero.Powers[p].Cards = 1 end
		hero.Powers[p].Stages = default_hero.Powers[p].Stages
	end
	return hero
end

local function ingest_heroes(data)
	for h,hero in ipairs(data) do
		data[h] = ingest_hero(hero, h)
	end
	return data
end

local function on_start(message)
	print("HEROCONTROLLER: Loading Hero JSON")
	defsave.default_data.Hero = ingest_heroes(saveload.load_from_JSON("/data/Heroes.json"))
	defsave.load("Hero")
	-- Heroes added to the game after this save was made join it locked, in
	-- the same order as Heroes.json, since a hero's index is its id.
	for h = #defsave.loaded.Hero.data + 1, #defsave.default_data.Hero do
		defsave.loaded.Hero.data[h] = actions.clone(defsave.default_data.Hero[h])
	end
	defsave.loaded.Hero.data = ingest_heroes(defsave.loaded.Hero.data)
	defsave.save("Hero", true)

	msg.post(controller, "refreshHero")
	if actions.tablelength(defsave.loaded.Hero.data) > 0 then msg.post(controller, "boot_hero") end

	print("HEROCONTROLLER: Hero loaded")
	set_updatelist()
end


local function update()
	if not pause then

		if #update_list == 0 then
			set_updatelist()
		end

		if #update_list > 0 then
			if os.clock() + defsave.get("Currency", "BonusTime") >= update_list[1].nextupdate then

				local hero_id = update_list[1].hero_id
				local power_id = update_list[1].power_id
				local timediff = os.clock() + defsave.get("Currency", "BonusTime") - update_list[1].nextupdate
				defsave.loaded.Hero.data[hero_id].Powers[power_id] = update_heropower(defsave.loaded.Hero.data[hero_id], power_id, timediff, hero_id)
				if defsave.loaded.Hero.data[hero_id].location then
					if curLoc.map_id == defsave.loaded.Hero.data[hero_id].location.map_id and curLoc.dungeon_id == defsave.loaded.Hero.data[hero_id].location.dungeon_id then
						msg.post("main:/menu#dungeonmine", "refresh_herodata")
					end
					if curLoc.map_id == defsave.loaded.Hero.data[hero_id].location.map_id and curLoc.dungeon_id == defsave.loaded.Hero.data[hero_id].location.dungeon_id then
						msg.post("main:/menu#dungeonmine", "trigger_heropower", { hero_id = hero_id } )
					end
				end
				update_list[1].nextupdate = defsave.loaded.Hero.data[hero_id].Powers[power_id].nextupdate
				update_list = sort_table(update_list, "nextupdate")
				defsave.save("Hero", true)
			end
		end
	end
end

local messageData = {}

messageData["all"] = {
	["on_start"] = function(message_id, message, sender)
		on_start(message)
	end,
	["update"] = function(message_id, message, sender)
		update(message)
	end,
	["pause"] = function(message_id, message, sender)
		pause = true
		pauseTimer = os.clock()
	end,
	["unpause"] = function(message_id, message, sender)
		local pauseTime = os.clock() - pauseTimer
		for h,hero in ipairs(defsave.loaded.Hero.data) do
			hero = defsave.get("Hero", h)
			if not hero.Locked then
				for p,power in ipairs(hero.Powers) do
					if hero.Powers[p].lastupdate then	hero.Powers[p].lastupdate = hero.Powers[p].lastupdate + pauseTime		end
					if hero.Powers[p].nextupdate then	hero.Powers[p].nextupdate = hero.Powers[p].nextupdate + pauseTime		end
				end
			end
			defsave.set("Hero", h, hero)
		end
		set_updatelist()
		pause = false
	end,
	["reset_statistics"] = function(message_id, message, sender)
		defsave.reset_to_default("Hero")
		dungeon_regenSpeed = {
			{ map_id = 1, dungeon_id = 1, regenSpeed = 1 },
			{ map_id = 1, dungeon_id = 2, regenSpeed = 1 },
			{ map_id = 1, dungeon_id = 3, regenSpeed = 1 },
			{ map_id = 1, dungeon_id = 4, regenSpeed = 1 },
			{ map_id = 1, dungeon_id = 5, regenSpeed = 1 },
			{ map_id = 2, dungeon_id = 1, regenSpeed = 1 },
			{ map_id = 2, dungeon_id = 2, regenSpeed = 1 },
			{ map_id = 2, dungeon_id = 3, regenSpeed = 1 }
		}
		set_updatelist()
	end,
	["update_currentlocation"] = function(message_id, message, sender)
		curLoc = { map_id = message.map_id, dungeon_id = message.dungeon_id }
	end,
	["unlock_hero"] = function(message_id, message, sender)
		local hero_list = {}
		local h = 1
		if message.hero_id then
			-- A specific hero, e.g. an event reward, rather than the next in line.
			h = message.hero_id
			if not defsave.loaded.Hero.data[h].Locked then return end
		else
			while not defsave.loaded.Hero.data[h].Locked do
				h = h + 1
			end
		end
		defsave.loaded.Hero.data[h] 			= unlock_hero(defsave.loaded.Hero.data[h], 1, h)
		defsave.loaded.Hero.data[h].Cost 		= return_cost(defsave.loaded.Hero.data[h].Level)
		defsave.loaded.Hero.data[h].Progress 	= set_progress(defsave.loaded.Hero.data[h].Cards, defsave.loaded.Hero.data[h].Level)
		defsave.loaded.Hero.data[h].copyText 	= set_copyText(defsave.loaded.Hero.data[h].Cards, defsave.loaded.Hero.data[h].Level)
		defsave.loaded.Hero.data[h].Locked 		= false
		defsave.save("Hero", true)
		table.insert(hero_list, h)
		msg.post(controller, "show_cardsunlock", { hero_list = hero_list })
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["mod_herobuff"] = function(message_id, message, sender) 
		local id = message.hero_id
		defsave.loaded.Hero.data = actions.modify_field(defsave.loaded.Hero.data, id, attributeMap[message.virtue] .. "_Buff", message.amount)
		defsave.loaded.Hero.data[id] = set_heroPower(defsave.loaded.Hero.data[id])
		defsave.save("Hero", true)
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["mod_hero"] = function(message_id, message, sender) 
		local id = message.hero_id
		defsave.loaded.Hero.data = actions.modify_field(defsave.loaded.Hero.data, id, message.field, message.amount)
		defsave.save("Hero", true)
		msg.post("main:/menu#hero", "refresh_all")
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["add_herocards"] = function(message_id, message, sender)
		local hero = defsave.get("Hero", message.hero_id)

		if hero.Active == false then
			msg.post(controller, "activate_hero", message )
		end

		hero.Cards = hero.Cards + message.amount or message.amount
		if hero.Cards >= 1 and hero.Level == 0 then
			hero.Level = 1
		end
		hero.Cost = return_cost(hero.Level)
		hero.Progress = set_progress(hero.Cards, hero.Level)
		hero.copyText = set_copyText(hero.Cards, hero.Level)
		defsave.set("Hero", message.hero_id, hero)
		set_updatelist()
		defsave.save("Hero")
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["levelup_hero"] = function(message_id, message, sender)
		if defsave.loaded.Hero.data[message.hero_id].Progress >= 1 then
			id = message.hero_id
			msg.post(controller, "mod_xp", { amount = -defsave.loaded.Hero.data[id].Cost })
			defsave.loaded.Hero.data[id].Level 		= defsave.loaded.Hero.data[id].Level + 1
			defsave.loaded.Hero.data[id].Cost 		= return_cost(defsave.loaded.Hero.data[id].Level)
			defsave.loaded.Hero.data[id].Progress 	= set_progress(defsave.loaded.Hero.data[id].Cards, defsave.loaded.Hero.data[id].Level)
			defsave.loaded.Hero.data[id].copyText 	= set_copyText(defsave.loaded.Hero.data[id].Cards, defsave.loaded.Hero.data[id].Level)
			defsave.save("Hero", true)
			set_updatelist()
			if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
		end
	end,
	["assign_hero"] = function(message_id, message, sender)
		assign_hero(message)
		set_updatelist()
	end,
	["unassign_hero"] = function(message_id, message, sender)
		unassign_hero(message)
		set_updatelist()
		msg.post(controller, "clear_heroquest", { hero_id = message.hero_id })
	end,
	["complete_rank"] = function(message_id, message, sender)
		-- Every main-story hero leaves its slot when a chapter closes, portal or
		-- not; heroes working an event map stay where they are. The shipped
		-- loop keyed on an "id" field that only some heroes carry, so the rest
		-- stayed in their slots.
		for h,hero in ipairs(defsave.loaded.Hero.data) do
			if hero.location ~= nil and not actions.event_on_map(hero.location.map_id) then
				unassign_hero({ hero_id = h })
				msg.post(controller, "clear_heroquest", { hero_id = h })
			end
		end
		set_updatelist()
		-- Event maps keep their regen boosts along with their heroes.
		if not message.portal then
			for _,dungeon in ipairs(dungeon_regenSpeed) do
				if not actions.event_on_map(dungeon.map_id) then dungeon.regenSpeed = 1 end
			end
		end
	end,
	["set_hero"] = function(message_id, message, sender)
		local id = message.hero_id
		defsave.loaded.Hero.data = actions.set_field(defsave.loaded.Hero.data, id, message.field, message.amount)
		defsave.save("Hero", true)
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,



	["add_location"] = function(message_id, message, sender) add_location(message) end,
	["hero_echo"] = function(message_id, message, sender) echo_power(message) end,
	["send_vfx"] = function(message_id, message, sender) send_vfx(message) end,
	["add_location_randomlevel"] = function(message_id, message, sender) add_location_randomlevel(message) end,
	["mod_regenspeed_dungeon"] = function(message_id, message, sender) mod_regenSpeed(message) end

}

function M.findReceiver(message_id, message, sender)
	for u, url in pairs(messageData) do							-- look up the sender in the data set 
		if sender == msg.url(u) or u == "all" then				-- find the sender
				for a, action in pairs(url) do						-- look up the message
				if message_id == hash(a) or a == "all" then		-- find the message
					action(message_id, message, sender)			-- run the function from the table
				end
			end
		end
	end
end

return M
