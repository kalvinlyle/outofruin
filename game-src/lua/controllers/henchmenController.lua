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
		local dps = math.max(0.0001, henchmen.dps * defsave.get("Stats", "globalBoost"))
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
	end
	return data
end

local function on_start(message)
	print("HENCHMENCONTROLLER: Loading Henchmen JSON")
	defsave.default_data.Henchmen = ingestHenchmen(saveload.load_from_JSON("/data/Henchmen.json"))
	defsave.load("Henchmen")
	for h,default_henchmen in ipairs(defsave.default_data.Henchmen) do
		local saved_henchmen = defsave.get("Henchmen", h)
		saved_henchmen.BuyCosts = default_henchmen.BuyCosts
		saved_henchmen.Icon = default_henchmen.Icon
		defsave.set("Henchmen", h, saved_henchmen)
	end
	if actions.tablelength(defsave.loaded.Henchmen.data) > 0 then msg.post(controller, "boot_henchmen") end
	print("HENCHMENCONTROLLER: Henchmen Loaded")
	set_update_list()
end

local function update_henchman(henchmen, timeDiff)
	henchmen.dps = setDps(henchmen)
	local boost = locationBoost[henchmen.map_id][henchmen.dungeon_id][henchmen.level_id] or 1
	boost = boost * defsave.get("Stats", "globalBoost")
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
		dps = henchmen.dps * defsave.get("Stats", "globalBoost")
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

local messageData = {}

messageData["all"] = {
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
	["update_henchmen"] = function(message_id, message, sender)
		local henchmen = defsave.get("Henchmen", message.henchmen_id)
		henchmen.nextupdate = os.clock() + defsave.get("Currency", "BonusTime")
		defsave.set("Henchmen", message.henchmen_id, henchmen)
		defsave.save("Henchmen", true)
		set_update_list()
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
	["unlock_henchman"] = function(message_id, message, sender)
		local henchmen_list = {}
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
				table.insert(henchmen_list, h)
			end
		end
		set_update_list()
		msg.post(controller, "show_cardsunlock", { henchmen_list = henchmen_list })
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
				local henchmen = defsave.get("Henchmen", h)
				henchmen.Size = 1
				defsave.set("Henchmen", h, henchmen)
				msg.post(controller, "deactivate_henchmen", { henchmen_id = h })
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
				cost.message.amount = -cost.baseamount * message.amount
				msg.post(controller, cost.message_id, cost.message )
			end
			henchmen.Size = henchmen.Size + message.amount
			defsave.set("Henchmen", message.henchmen_id, henchmen)
		end

		defsave.save("Henchmen", true)
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["add_henchmencards"] = function(message_id, message, sender)
		local henchmen = defsave.get("Henchmen", message.henchmen_id)

		if henchmen.Active == false then
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
			msg.post(controller, "mod_xp", { amount = -defsave.loaded.Henchmen.data[message.henchmen_id].Cost })
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
