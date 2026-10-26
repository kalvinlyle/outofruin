local inspect = require('inspect')
local actions = require('actions')
local defsave = require('defsave/defsave')

local controller	= "main:/menu#controller"

local M = {}
local pause = false

local function ingestGear(data)
	for i,item in ipairs(data) do
		data[i].id = i
		data[i].Progress = 0
		data[i].Count = 0
		data[i].Level = 0
		data[i].copyText = "0/1"
		data[i].Status = "Locked"
	end
	return data
end

--[[ Gear.json is written into the save the first time it is read, and defsave
only falls back to the defaults when the save file is empty. A save therefore
keeps whatever the data file said on the day it was created, including the
atlas frame each piece of gear draws from -- so a player who started before
the gear art changed still asks for frames that no longer exist, and
gui.play_flipbook raises a Lua error that aborts the whole card screen.

Only the progression belongs to the save. Everything below is the data file's
to own, and is copied back over the loaded save on every start so a data
change reaches existing players. ]]
local DATA_FIELDS = { "Name", "Description", "Rarity", "Rank",
	"Icon", "Portrait", "Modifier", "map_id", "dungeon_id", "level_id" }

-- Icon, Portrait and Modifier are tables, so the save is only rewritten when
-- one of them actually differs rather than on every start.
local function same(a, b)
	if a == b then return true end
	if type(a) ~= "table" or type(b) ~= "table" then return false end
	for k,v in pairs(a) do
		if not same(v, b[k]) then return false end
	end
	for k in pairs(b) do
		if a[k] == nil then return false end
	end
	return true
end

local function refresh_from_data(defaults)
	local saved = defsave.loaded.Gear.data
	if saved == nil then return false end

	local changed = false
	for i,item in ipairs(defaults) do
		if saved[i] == nil then
			saved[i] = actions.clone(item)
			changed = true
		else
			for _,field in ipairs(DATA_FIELDS) do
				-- Portrait is absent from saves written before gear had card art,
				-- so a nil on either side still has to be carried across.
				if not same(saved[i][field], item[field]) then
					saved[i][field] = actions.clone(item[field])
					changed = true
				end
			end
			saved[i].id = i
		end
	end

	-- A data file that lost entries would leave orphans behind the end.
	for i = #saved, #defaults + 1, -1 do
		saved[i] = nil
		changed = true
	end

	return changed
end

local function on_start(message)
	print("GEARCONTROLLER: Loading Gear JSON")
	defsave.default_data.Gear = ingestGear(actions.load_from_JSON("/data/Gear.json"))
	defsave.load("Gear")
	if refresh_from_data(defsave.default_data.Gear) then
		print("GEARCONTROLLER: Gear refreshed from data file")
		defsave.save("Gear", true)
	end
	print("GEARCONTROLLER: Gear Loaded")
end

local function return_cost(level)
	local levels = { 0, 50, 100, 200, 300, 400, 1000, 2000, 4000, 8000, 20000, 50000, 100000 }
	if level == 0 then return 0 else return levels[level + 1] end
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
	["pause"] = function(message_id, message, sender) pause = true end,
	["unpause"] = function(message_id, message, sender) pause = false end,
	["reset_statistics"] = function(message_id, message, sender)
		print("GEARCONTROLLER: Loading Gear JSON")
		defsave.default_data.Gear = ingestGear(actions.load_from_JSON("/data/Gear.json"))
		defsave.reset_to_default("Gear")
		defsave.save("Gear", true)
	end,
	["unlock_gear"] = function(message_id, message, sender)
		local gear_list = {}
		for g,gear in ipairs(actions.clone(defsave.loaded.Gear.data)) do
			if gear.Rank == message.rank then
				print("GEARCONTROLLER: Get Gear " .. defsave.loaded.Gear.data[g].Name )
				defsave.loaded.Gear.data[g].Status = "Unlocked"
				defsave.loaded.Gear.data[g].Progress = 0
				defsave.loaded.Gear.data[g].Cost = return_cost(defsave.loaded.Gear.data[g].Level)
				table.insert(gear_list, g)
			end
		end
		msg.post(controller, "show_cardsunlock", { gear_list = gear_list })
		defsave.save("Gear", true)
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["add_gearcards"] = function(message_id, message, sender)
		local item = defsave.get("Gear", message.gear_id)
		item.Count = item.Count + message.amount
		-- No chapter unlocks an event's gear: its first card does.
		if item.map_id ~= 1 then item.Status = "Unlocked" end
		if item.Count >= 1 and item.Level == 0 then
			item.Level = 1
		end
		item.Cost = return_cost(item.Level)
		item.Progress = set_progress(item.Count, item.Level)
		item.copyText = set_copyText(item.Count, item.Level)
		defsave.set("Gear", message.gear_id, item)
		defsave.save("Gear", true)
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["levelup_gear"] = function(message_id, message, sender)
		local item = defsave.get("Gear", message.gear_id)
		if item.Progress >= 1 then
			-- Event gear levels up with the event's shards, never the main game's XP.
			local shards = actions.event_shards(item.map_id)
			if shards then
				msg.post(controller, "add_resource_quietly", { stat = shards, amount = -item.Cost })
			else
				msg.post(controller, "mod_xp", { amount = -item.Cost })
			end
			item.Level = item.Level + 1
			item.Cost = return_cost(item.Level)
			item.Progress = set_progress(item.Count, item.Level)
			item.copyText = set_copyText(item.Count, item.Level)
		end
		defsave.set("Gear", message.gear_id, item)
		defsave.save("Gear", true)
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
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
