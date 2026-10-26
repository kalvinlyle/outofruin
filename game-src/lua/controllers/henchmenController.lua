local inspect = require('inspect')
local actions = require('actions')
local random = require('random/random')
local progress = require('progress/progress')
local saveload = require('saveload/saveload')
local defsave = require('defsave/defsave')

local productName = "OoR"
local controller	= "main:/menu#controller"

local M = {}
local tickSpeed = 5
local update_list = {}
local constantUpdate = {}
local intervalUpdate = {}

local pause = false
local pauseTimer = 0

local locationBoost = {
	{ 
		{ 1, 1, 1, 1, 1 },
		{ 1, 1, 1, 1, 1 },
		{ 1, 1, 1, 1, 1 },
		{ 1, 1, 1, 1, 1 },
		{ 1, 1, 1, 1, 1 }
	}
}

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

local function setDps(data)			
	-- Enemies only take damage from hero powers, never a tick of their own.
	if data.Enemy then return 0 end
	if data.Level == 0 then
		return data.Modifier.Factor * data.basespeed
	else
		return ( data.Modifier.Factor ^ data.Level ) * data.basespeed
	end
end

local function setUpdateTime(henchmen, level)
	local updateTime = 1
	if not henchmen.contDamage then
		-- Exact time left to clear the remaining health. Hero powers force an
		-- off-schedule retick every time they fire, so rounding this up would
		-- add that rounding again on every power hit and push the finish out.
		-- Henchmen load before Stats, so a timer set at boot has no boost yet.
		local dps = math.max(0.0001, henchmen.dps * actions.henchmen_rate(henchmen))
		updateTime = math.max(0.1, ( level.Health - ( level.Damage or 0 ) ) / dps)
	end
	return updateTime
end

local function set_update_list()
	update_list = {}
	local bonusTime = defsave.get("Currency", "BonusTime") or 0
	local currentTime = os.clock() + bonusTime
	for h,henchmen in ipairs(defsave.loaded.Henchmen.data) do
		if henchmen.Cards then
			if ( henchmen.Cards > 0 or henchmen.Active ) then
				if henchmen.lastupdated == nil then henchmen.lastupdated = currentTime end
				if henchmen.nextupdate == nil then
					-- An event location can be missing from a save made before it
					-- existed; the map adds it once the game starts.
					local dungeon = defsave.loaded.Map.data[henchmen.map_id] and defsave.loaded.Map.data[henchmen.map_id][henchmen.dungeon_id]
					local level = dungeon and dungeon.Levels[henchmen.level_id] or { Health = 1 }
					local updateTime = setUpdateTime(henchmen, level)
					henchmen.nextupdate = currentTime + updateTime
				end
				table.insert(update_list, { id = h, lastupdated = henchmen.lastupdated, nextupdate = henchmen.nextupdate })
			end
		end
	end
	if #update_list > 1 then
		update_list = sort_table(update_list, "nextupdate")
	end
end

local function ingestHenchmen(data)
	for i,item in ipairs(data) do
		data[i].id 				= i
		data[i].Level 			= 0
		data[i].dps 			= setDps(data[i])
		data[i].copyText 		= "0/1"
		data[i].Cards 			= 0
		data[i].Size 			= 1
		-- An enemy row starts full, and is never capped to one kill a tick
		-- the way an unlevelled henchman's damage is.
		if item.Enemy then
			data[i].Level 		= 1
			data[i].Size 		= item.EnemyCount
		end
	end
	return data
end

local function on_start(message)
	print("HENCHMENCONTROLLER: Loading Henchmen JSON")
	defsave.default_data.Henchmen = ingestHenchmen(saveload.load_from_JSON("/data/Henchmen.json"))
	defsave.load("Henchmen")
	for h,default_henchmen in ipairs(defsave.default_data.Henchmen) do
		local saved_henchmen = defsave.get("Henchmen", h)
		if saved_henchmen == nil or (default_henchmen.map_id ~= 1 and saved_henchmen.Name ~= default_henchmen.Name) then
			-- Added since this save was made, or an event slot whose
			-- henchman has changed; the event starts its run again anyway.
			saved_henchmen = actions.clone(default_henchmen)
		end
		-- Its place in the list, which event rows added since may have moved.
		saved_henchmen.id = h
		saved_henchmen.BuyCosts = default_henchmen.BuyCosts
		saved_henchmen.Icon = default_henchmen.Icon
		saved_henchmen.Portrait = default_henchmen.Portrait
		defsave.set("Henchmen", h, saved_henchmen)
	end
	if actions.tablelength(defsave.loaded.Henchmen.data) > 0 then msg.post(controller, "boot_henchmen") end
	print("HENCHMENCONTROLLER: Henchmen Loaded")
	set_update_list()
end

local function update_henchman(henchmen, timeDiff)
	henchmen.dps = setDps(henchmen)
	-- Boosts are set per main-game level; event maps have none.
	local mapBoost = locationBoost[henchmen.map_id]
	local boost = mapBoost and mapBoost[henchmen.dungeon_id] and mapBoost[henchmen.dungeon_id][henchmen.level_id] or 1
	boost = boost * actions.henchmen_rate(henchmen)
	local amount = henchmen.dps * timeDiff * boost
	print("HENCHMENCONTROLLER: Update " .. henchmen.Name .. " damage " .. amount)
	henchmen.lastupdated = os.clock() + defsave.get("Currency", "BonusTime")
	local level = defsave.get("Map", henchmen.map_id)[henchmen.dungeon_id].Levels[henchmen.level_id]
	local updateTime = setUpdateTime(henchmen, level)
	print("Name " .. henchmen.Name .. " update " .. updateTime)
	henchmen.nextupdate = os.clock() + defsave.get("Currency", "BonusTime") + updateTime

	local message = {
		field = "Damage", 
		amount = amount, 
		henchmen_id = henchmen.id, 
		map_id = henchmen.map_id, 
		dungeon_id = henchmen.dungeon_id, 
		level_id = henchmen.level_id, 
		dps = henchmen.dps * actions.henchmen_rate(henchmen)
	}
	if henchmen.Level == 0 then message.amount = math.min( amount, level.Health ) end
	if amount > 0 then
		msg.post(controller, "mod_dungeonlevel", message )
	end
	return henchmen
end

local function update()
	if not pause then

		if #update_list > 0 then

			local currentTime = os.clock() + defsave.get("Currency", "BonusTime")

			while update_list[1].nextupdate <= os.clock() + defsave.get("Currency", "BonusTime") do
				local henchmen = defsave.get("Henchmen", update_list[1].id)
				if henchmen.lastupdated == nil then henchmen.lastupdated = currentTime end
				local timeDiff = currentTime - henchmen.lastupdated
				defsave.set("Henchmen", update_list[1].id, update_henchman(henchmen, timeDiff) )
				update_list[1].lastupdated = henchmen.lastupdated
				update_list[1].nextupdate = henchmen.nextupdate
				update_list = sort_table(update_list, "nextupdate")
			end

		end

		pauseTimer = 0
	end
end

-- Level-ups cost XP, or on an event map that event's shards.
local function spend_levelup(card)
	local shards = actions.event_shards(card.map_id)
	if shards then
		msg.post(controller, "add_resource_quietly", { stat = shards, amount = -card.Cost })
	else
		msg.post(controller, "mod_xp", { amount = -card.Cost })
	end
end

local function return_cost(level)
	local levelcost = { 0, 50, 100, 200, 300, 400, 1000, 2000, 4000, 8000, 20000, 50000, 100000 }
	if level == 0 then return 0 else return levelcost[level + 1] end
end

local function set_progress(count, level)
	local levels = { 1, 2, 5, 10, 20, 50, 100, 200, 400, 800, 1000, 2000, 5000 }
	local prevCost = levels[level] or 0
	local progress = ( count - prevCost ) / levels[level + 1]
	return progress
end

local function set_copyText(count, level)
	local levels = { 1, 2, 5, 10, 20, 50, 100, 200, 400, 800, 1000, 2000, 5000 }
	local prevCost = levels[level] or 0
	local text = ( count - prevCost ) .. "/" .. levels[level + 1]
	return text
end

-- Captain Hollis: free hires on a random open level of his dungeon, for a
-- henchman the player already has.
local function hero_muster(message)
	-- Hiring more enemies would only make the fight longer.
	if actions.enemy_map(message.map_id) then return end
	local open = {}
	for h,henchmen in ipairs(defsave.loaded.Henchmen.data) do
		if henchmen.map_id == message.map_id and henchmen.dungeon_id == message.dungeon_id and (henchmen.Cards or 0) > 0 then
			local level = defsave.get("Map", henchmen.map_id)[henchmen.dungeon_id].Levels[henchmen.level_id]
			if level and not level.isLocked and level.wasClickedOpen then table.insert(open, h) end
		end
	end
	if #open == 0 then return end
	local h = open[math.random(1, #open)]
	local amount = math.max(1, math.floor(actions.hero_power(message, message.at1, message.at13) + 0.5))
	local henchmen = defsave.get("Henchmen", h)
	henchmen.Size = henchmen.Size + amount
	defsave.set("Henchmen", h, henchmen)
	defsave.save("Henchmen", true)
	msg.post("main:/menu#dungeonmine", "hero_fx", { kind = "muster", hero_id = message.hero_id, map_id = message.map_id, dungeon_id = message.dungeon_id,
		level_id = henchmen.level_id, henchmen_id = h, amount = amount, echo = message.echo_scale ~= nil })
end

local messageData = {}

messageData["all"] = {
	["hero_muster"] = function(message_id, message, sender) hero_muster(message) end,
	["on_start"] = function(message_id, message, sender)
		on_start(message)
	end,
	["pause"] = function(message_id, message, sender)
		pause = true
		pauseTimer = os.clock()
	end,
	["unpause"] = function(message_id, message, sender)
		local pauseTime = os.clock() - pauseTimer
		local currentTime = os.clock() + defsave.get("Currency", "BonusTime")
		for h,henchmen in ipairs(defsave.loaded.Henchmen.data) do
			henchmen = defsave.get("Henchmen", h)
			if henchmen.Status == "Unlocked" then
				henchmen.lastupdated = henchmen.lastupdated + pauseTime or currentTime
			end
			defsave.set("Henchmen", h, henchmen)
		end
		set_update_list()
		pause = false
	end,
	["update"] = function(message_id, message, sender)
		update(message)
	end,
	-- A hero power just landed Damage on this henchman's level. Move the tick to
	-- when the remaining health actually runs out, measured from the last tick,
	-- which is exactly when the bar fills. Forcing a tick now used to work out
	-- the next one before that tick's own damage reached the level, so the tick
	-- came late by however long the henchman had been working and the bar sat
	-- full for that long; Chain Lightning hits every open level, so it showed most.
	["update_henchmen"] = function(message_id, message, sender)
		local henchmen = defsave.get("Henchmen", message.henchmen_id)
		local currentTime = os.clock() + defsave.get("Currency", "BonusTime")
		local level = defsave.get("Map", henchmen.map_id)[henchmen.dungeon_id].Levels[henchmen.level_id]
		henchmen.nextupdate = ( henchmen.lastupdated or currentTime ) + setUpdateTime(henchmen, level)
		defsave.set("Henchmen", message.henchmen_id, henchmen)
		defsave.save("Henchmen", true)
		set_update_list()
	end,
	-- An enemy map's front rows or heroes changed: the new front row's enemy
	-- starts its tick from when it stepped up, the rest stop, and a change of
	-- heroes lands what the old ones had done before the new rate starts.
	["update_allenemies"] = function(message_id, message, sender)
		local now = os.clock() + defsave.get("Currency", "BonusTime")
		for h,henchmen in ipairs(defsave.loaded.Henchmen.data) do
			if henchmen.Enemy and henchmen.map_id == message.map_id then
				local dps = setDps(henchmen)
				if henchmen.Active and dps ~= henchmen.dps then
					local level = defsave.get("Map", henchmen.map_id)[henchmen.dungeon_id].Levels[henchmen.level_id]
					local done = (henchmen.dps or 0) * actions.henchmen_rate(henchmen) * math.max(0, now - (henchmen.lastupdated or now))
					level.Damage = (level.Damage or 0) + done
					henchmen.lastupdated = now
				end
				henchmen.dps = dps
				if henchmen.Active then
					local level = defsave.get("Map", henchmen.map_id)[henchmen.dungeon_id].Levels[henchmen.level_id]
					henchmen.nextupdate = ( henchmen.lastupdated or os.clock() + defsave.get("Currency", "BonusTime") ) + setUpdateTime(henchmen, level)
				end
			end
		end
		set_update_list()
		defsave.save("Henchmen", true)
	end,
	["update_allhenchmen"] = function(message_id, message, sender)
		for h,henchmen in ipairs(defsave.loaded.Henchmen.data) do
			henchmen.nextupdate = os.clock() + defsave.get("Currency", "BonusTime")
			defsave.set("Henchmen", h, henchmen)
		end
		defsave.save("Henchmen", true)
		set_update_list()
	end,
	["reset_statistics"] = function(message_id, message, sender)
		print("HENCHMENCONTROLLER: Loading Henchmen JSON")
		defsave.default_data.Henchmen = ingestHenchmen(saveload.load_from_JSON("/data/Henchmen.json"))
		defsave.reset_to_default("Henchmen")
		set_update_list()
		defsave.save("Henchmen", true)
		msg.post(controller, "reset_mapdata")
	end,
	-- A new event run. The event's henchmen keep their cards and levels from
	-- run to run, like the main game's across chapters, and only their crews
	-- start again. One never carded yet gets its first card, so every
	-- henchman works on its own from the first hire.
	["event_reset"] = function(message_id, message, sender)
		local currentTime = os.clock() + defsave.get("Currency", "BonusTime")
		for h,henchmen in ipairs(defsave.default_data.Henchmen) do
			if henchmen.map_id == message.map_id and henchmen.Enemy then
				-- Every row back at full strength; the map starts the front one.
				local fresh = actions.clone(henchmen)
				fresh.Size = henchmen.EnemyCount
				fresh.Level = 1
				fresh.Cards = 0
				fresh.Active = false
				fresh.contDamage = false
				fresh.lastupdated = currentTime
				fresh.nextupdate = nil
				fresh.dps = setDps(fresh)
				defsave.loaded.Henchmen.data[h] = fresh
			elseif henchmen.map_id == message.map_id then
				local saved = defsave.loaded.Henchmen.data[h]
				local fresh = actions.clone(henchmen)
				fresh.Status = "Unlocked"
				fresh.Cards = math.max(1, saved and saved.Name == henchmen.Name and saved.Cards or 0)
				fresh.Level = math.max(1, saved and saved.Name == henchmen.Name and saved.Level or 0)
				fresh.Cost = return_cost(fresh.Level)
				fresh.Progress = set_progress(fresh.Cards, fresh.Level)
				fresh.copyText = set_copyText(fresh.Cards, fresh.Level)
				fresh.dps = setDps(fresh)
				fresh.Active = false
				fresh.contDamage = false
				fresh.lastupdated = currentTime
				defsave.loaded.Henchmen.data[h] = fresh
			end
		end
		set_update_list()
		defsave.save("Henchmen", true)
	end,
	["unlock_henchman"] = function(message_id, message, sender)
		local currentTime = os.clock() + defsave.get("Currency", "BonusTime")
		for h,henchmen in ipairs(defsave.loaded.Henchmen.data) do
			if henchmen.Rank == message.rank then
				print("HENCHMENCONTROLLER: Get Henchmen " .. defsave.loaded.Henchmen.data[h].Name )
				defsave.loaded.Henchmen.data[h].Status = "Unlocked"
				defsave.loaded.Henchmen.data[h].Progress = 0
				defsave.loaded.Henchmen.data[h].Cost = return_cost(defsave.loaded.Henchmen.data[h].Level)
				defsave.loaded.Henchmen.data[h].dps = setDps(defsave.loaded.Henchmen.data[h])
				defsave.loaded.Henchmen.data[h].Active = false
				defsave.loaded.Henchmen.data[h].contDamage = false
				defsave.loaded.Henchmen.data[h].lastupdated = currentTime
			end
		end
		set_update_list()
		-- No unlock celebration: the screen shows their card as if the player
		-- had been given one, but unlocking only makes it findable in packs.
		defsave.save("Henchmen", true)
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["activate_henchmen"] = function(message_id, message, sender)
		local henchmen = defsave.loaded.Henchmen.data[message.henchmen_id]
		local currentTime = os.clock() + defsave.get("Currency", "BonusTime")
		assert(message.henchmen_id, "Henchmen ID is missing")
		henchmen.lastupdated = currentTime
		henchmen.Active = true
		local level = defsave.get("Map", henchmen.map_id)[henchmen.dungeon_id].Levels[henchmen.level_id]
		updateTime = setUpdateTime(henchmen, level)
		henchmen.nextupdate = currentTime + updateTime
		set_update_list()
		msg.post(controller, "activate_level", { map_id = henchmen.map_id, dungeon_id = henchmen.dungeon_id, level_id = henchmen.level_id })
		defsave.save("Henchmen", true)
	end,
	["deactivate_henchmen"] = function(message_id, message, sender)
		assert(message.henchmen_id, "Henchmen ID is missing")
		if defsave.loaded.Henchmen.data[message.henchmen_id].Cards == 0 then
			defsave.loaded.Henchmen.data[message.henchmen_id].Active = false
			msg.post(controller, "deactivate_level", { map_id = defsave.loaded.Henchmen.data[message.henchmen_id].map_id, dungeon_id = defsave.loaded.Henchmen.data[message.henchmen_id].dungeon_id, level_id = defsave.loaded.Henchmen.data[message.henchmen_id].level_id })
		end
		set_update_list()
		defsave.save("Henchmen", true)
	end,
	["complete_rank"] = function(message_id, message, sender)
		if not message.portal then
			for h, henchmen in ipairs(defsave.loaded.Henchmen.data) do
				if henchmen.map_id == 1 then
					local henchmen = defsave.get("Henchmen", h)
					henchmen.Size = 1
					defsave.set("Henchmen", h, henchmen)
					msg.post(controller, "deactivate_henchmen", { henchmen_id = h })
				end
			end
			defsave.save("Henchmen", true)
			msg.post(controller, "deactivate_levels")
		end
	end,
	["set_contdamage"] = function(message_id, message, sender)
		assert(message.henchmen_id, "Henchmen ID is missing")
		defsave.loaded.Henchmen.data[message.henchmen_id].contDamage = true
		set_update_list()
		defsave.save("Henchmen", true)
	end,
	["mod_henchmen"] = function(message_id, message, sender)
		local henchmen = defsave.get("Henchmen", message.henchmen_id)
		henchmen.Size = henchmen.Size + message.amount
		defsave.set("Henchmen", message.henchmen_id, henchmen)
	end,
	["buy_henchmen"] = function(message_id, message, sender)
		local henchmen = defsave.get("Henchmen", message.henchmen_id)
		local costBase = defsave.get("Stats", "costMultiplier")
		if henchmen.BuyCosts then 
			for c,cost in pairs(henchmen.BuyCosts) do
				--[[
				cost.message.amount = 0
				if cost.message_id == "update_resources" then 
					local singlePurchaseCost = cost.baseamount * math.pow(costBase, henchmen.Size + 1)
					if message.amount == 1 then
						cost.message.amount = -singlePurchaseCost
					else
						cost.message.amount = -singlePurchaseCost * ((math.pow(costBase, message.amount) - 1) / (costBase - 1));
					end
					cost.message.amount = -message.amount * cost.baseamount
				end
				]]
				cost.message.amount = -cost.baseamount * message.amount * actions.hire_cost_factor()
				msg.post(controller, cost.message_id, cost.message )
			end
			henchmen.Size = henchmen.Size + message.amount
			defsave.set("Henchmen", message.henchmen_id, henchmen)
			-- Event quests can ask for hires on a level.
			if henchmen.map_id ~= 1 then
				msg.post(controller, "update_resources", { stat = "hire" .. henchmen.map_id .. "-" .. henchmen.dungeon_id .. "-" .. henchmen.level_id, amount = message.amount })
			end
		end

		defsave.save("Henchmen", true)
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["add_henchmencards"] = function(message_id, message, sender)
		local henchmen = defsave.get("Henchmen", message.henchmen_id)

		-- Active is nil until a henchman has been unlocked or deactivated once,
		-- and nil == false is false in Lua, so the very first card used to be
		-- skipped and only the second one started them working.
		if not henchmen.Active then
			msg.post(controller, "activate_henchmen", message )
		end

		henchmen.Cards = henchmen.Cards + message.amount
		if henchmen.Cards >= 1 and henchmen.Level == 0 then
			henchmen.Level = 1
		end
		henchmen.Cost = return_cost(henchmen.Level)
		henchmen.Progress = set_progress(henchmen.Cards, henchmen.Level)
		henchmen.copyText = set_copyText(henchmen.Cards, henchmen.Level)
		defsave.set("Henchmen", message.henchmen_id, henchmen)
		set_update_list()
		defsave.save("Henchmen")
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["levelup_henchmen"] = function(message_id, message, sender)
		if defsave.loaded.Henchmen.data[message.henchmen_id].Progress >= 1 then
			spend_levelup(defsave.loaded.Henchmen.data[message.henchmen_id])
			defsave.loaded.Henchmen.data[message.henchmen_id].Level = defsave.loaded.Henchmen.data[message.henchmen_id].Level + 1
			defsave.loaded.Henchmen.data[message.henchmen_id].Cost = return_cost(defsave.loaded.Henchmen.data[message.henchmen_id].Level)
			defsave.loaded.Henchmen.data[message.henchmen_id].copyText = set_copyText(defsave.loaded.Henchmen.data[message.henchmen_id].Cards, defsave.loaded.Henchmen.data[message.henchmen_id].Level)
			defsave.loaded.Henchmen.data[message.henchmen_id].Progress = set_progress(defsave.loaded.Henchmen.data[message.henchmen_id].Cards, defsave.loaded.Henchmen.data[message.henchmen_id].Level)
			defsave.save("Henchmen", true)
			set_update_list()
			if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
		end
	end
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
