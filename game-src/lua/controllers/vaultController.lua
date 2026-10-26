local inspect = require('inspect')
local actions = require('actions')
local random = require('random/random')
local progress = require('progress/progress')
local defsave = require('defsave/defsave')

local productName = "OoR"
local controller	= "main:/menu#controller"

local M = {}
local startingGold = 0
local startingXP = 0
local startingFollowers = 0
local startingBonusTime = 0
local startingPortalScrolls = 0
local lastUpdate = 0
local updateInterval = 1
local followers_gain_while_away = -1
local barnaby_paid = false
-- A reload or a quick app switch is not time away; without a floor every refresh
-- earned a welcome back, and its double, for a few seconds of absence.
local minTimeAway = 300

local function get_timeaway()
	-- os.clock is wall-clock time here (controller.script swaps in socket.gettime),
	-- so a save with no timestamp would count every second since 1970 as time away.
	local last = defsave.get("Currency", "lastUpdate")
	if not last or last <= 0 then return 0 end
	return os.clock() + defsave.get("Currency", "BonusTime") - last
end

local function get_newfollowers()
	local cycles = math.floor(get_timeaway() / updateInterval)
	return defsave.get("Stats", "followerRate") * cycles * defsave.get("Stats", "globalBoost")
end

local function on_start(message)
	defsave.load("Currency")
	if actions.tablelength(defsave.loaded.Currency.data) == 0 then
		defsave.set("Currency", "Gold", startingGold)
		defsave.set("Currency", "Xp", startingXP)
		defsave.set("Currency", "Followers", startingFollowers)
		defsave.set("Currency", "lastUpdate", os.clock() + startingBonusTime)
		defsave.set("Currency", "BonusTime", startingBonusTime)
		defsave.set("Currency", "PortalScrolls", startingPortalScrolls)
		defsave.set("Currency", "Bonusxp", nil)
		defsave.save("Currency", true)
		defsave.load("Currency")
		msg.post(controller, "refreshCurrency")
	end
	if actions.tablelength(defsave.loaded.Currency.data) > 0 then msg.post(controller, "boot_currency") end
end

local function update(message)

	if not defsave.get("Currency", "lastUpdate") then defsave.set("Currency", "lastUpdate", os.clock() + defsave.get("Currency", "BonusTime")) end
	if os.clock() + defsave.get("Currency", "BonusTime") > defsave.get("Currency", "lastUpdate") + updateInterval then
		local cycles = math.floor(( os.clock() + defsave.get("Currency", "BonusTime") - defsave.get("Currency", "lastUpdate") ) / updateInterval)
		local curFollowers = defsave.get("Currency", "Followers") or 0
		defsave.set("Currency", "Followers", curFollowers + get_newfollowers() )
		defsave.set("Currency", "lastUpdate", os.clock() + defsave.get("Currency", "BonusTime"))
		defsave.save("Currency", true)
		msg.post("main:/overlay#header", "refresh_all")
	end
end

local function mod_gold(amount)
	defsave.set("Currency", "Gold", defsave.get("Currency", "Gold") + amount)
	defsave.save("Currency", true)
	msg.post("main:/overlay#header", "refresh_all")
end

local function mod_followers(amount)
	defsave.set("Currency", "Followers", defsave.get("Currency", "Followers") + amount)
	defsave.save("Currency", true)
	msg.post("main:/overlay#header", "refresh_all")
end

local function mod_portalscroll(amount)
	defsave.set("Currency", "PortalScrolls", defsave.get("Currency", "PortalScrolls") + amount)
	defsave.save("Currency", true)
end

local function mod_xp(amount)
	defsave.set("Currency", "Xp", defsave.get("Currency", "Xp") + amount)
	defsave.save("Currency", true)
	msg.post("main:/overlay#header", "refresh_all")
end

local function mod_time(amount)
	defsave.set("Currency", "BonusTime", defsave.get("Currency", "BonusTime") + amount)
	defsave.save("Currency", true)
	msg.post("main:/overlay#header", "refresh_all")
end

local function set_bonusxp(statName, value, count)
	if value > 0 and statName ~= nil then
		if defsave.loaded.Currency.data.Bonusxp == nil							then 		defsave.loaded.Currency.data.Bonusxp = {} end
		if defsave.loaded.Currency.data.Bonusxp[statName] == nil				then 		defsave.loaded.Currency.data.Bonusxp[statName] = {} end
		if defsave.loaded.Currency.data.Bonusxp[statName].Value == nil			then		defsave.loaded.Currency.data.Bonusxp[statName].Value = value end
		if defsave.loaded.Currency.data.Bonusxp[statName].Total == nil			then		defsave.loaded.Currency.data.Bonusxp[statName].Total = 0 end
		if defsave.loaded.Currency.data.Bonusxp[statName].Collected == nil		then		defsave.loaded.Currency.data.Bonusxp[statName].Collected = 0 end
		if defsave.loaded.Currency.data.Bonusxp[statName].Progress == nil 		then		defsave.loaded.Currency.data.Bonusxp[statName].Progress = 0 end


		local total = 10
		local num = 0
		while (count / total) >= 1 do
			num = num + 1
			total = total * 10
		end

		local collected = 10 ^ defsave.loaded.Currency.data.Bonusxp[statName].Collected
		defsave.loaded.Currency.data.Bonusxp[statName].Progress = ( count - collected ) / ( ( 10 ^ num ) - ( 10 ^ ( num - 1 ) ) )
		defsave.loaded.Currency.data.Bonusxp[statName].Total = num
		defsave.save("Currency", true)
	end
end

local function collect_bonusxp(statName, callback, delay)
	if defsave.loaded.Currency.data.Bonusxp[statName].Total == nil 			then defsave.loaded.Currency.data.Bonusxp[statName].Total = 0		end
	if defsave.loaded.Currency.data.Bonusxp[statName].Collected == nil		then defsave.loaded.Currency.data.Bonusxp[statName].Collected = 0	end
	local total			= defsave.loaded.Currency.data.Bonusxp[statName].Total
	local collected		= defsave.loaded.Currency.data.Bonusxp[statName].Collected 
	local value			= defsave.loaded.Currency.data.Bonusxp[statName].Value
	defsave.loaded.Currency.data.Bonusxp[statName].Collected = total
	defsave.save("Currency", true)
	if callback ~= nil then
		msg.post("main:/menu#" .. callback, "refresh_all")
	end
end

local messageData = {}
messageData["all"] = {
	["on_start"] = function(message_id, message, sender) on_start(message) end,
	["returntogame"] = function(message_id, message, sender)
		if followers_gain_while_away == -1 then
			followers_gain_while_away = get_timeaway() >= minTimeAway and get_newfollowers() or 0
		end
		-- Nothing earned (a brand-new game, or straight back) means nothing to welcome back to.
		if followers_gain_while_away >= 1 then
			-- Barnaby Hearth multiplies what was earned away. The base already
			-- landed with the first tick; his share is added on top.
			local hearth = actions.patron_value("HERO_BARNABYHEARTH_NAME", 2, 64, 1)
			if hearth > 1 and not barnaby_paid then
				barnaby_paid = true
				mod_followers(math.floor(followers_gain_while_away * (hearth - 1)))
			end
			msg.post(controller, "popup_returntogame", { amount = followers_gain_while_away, hearth = hearth })
		end
	end,
	["update"] = function(message_id, message, sender) update(message) end,
	["reset_statistics"] = function(message_id, message, sender)
		defsave.set("Currency", "Gold", startingGold)
		defsave.set("Currency", "Xp", startingXP)
		defsave.set("Currency", "Bonusxp", nil)
		defsave.set("Currency", "BonusTime", startingBonusTime)
		defsave.set("Currency", "PortalScrolls", startingPortalScrolls)
		defsave.set("Currency", "Followers", 0)
		defsave.set("Currency", "lastUpdate", os.clock())
		defsave.save("Currency", true)
	end,
	["ad_reward"] = function(message_id, message, sender) mod_gold(100) end,
	["purchase_cards"] = function(message_id, message, sender) 
		if defsave.get("Currency", "Gold") >= message.cost then
			mod_gold(-message.cost)
			msg.post(message.msgpost.receiver, message.msgpost.message_id, message.msgpost.message)
		else
			msg.post("main:/menu#" .. message.callback, "purchase_failed", message.msgpost)
		end
	end,
	["purchase_xp"] = function(message_id, message, sender) 
		if defsave.get("Currency", "Gold") >= message.cost then
			mod_gold(-message.cost)
			msg.post(message.msgpost.receiver, message.msgpost.message_id, message.msgpost.message)
		else
			msg.post("main:/menu#" .. message.callback, "purchase_failed", message.msgpost)
		end
	end,
	["purchase_time"] = function(message_id, message, sender) 
		if defsave.get("Currency", "Gold") >= message.cost then
			mod_gold(-message.cost)
			-- Tock's wound spring stretches every time warp.
			local spring = 1 + actions.patron_value("HERO_TOCK_NAME", 0.10, 1.0, 0)
			if message.msgpost.message.amount then message.msgpost.message.amount = message.msgpost.message.amount * spring end
			msg.post(message.msgpost.receiver, message.msgpost.message_id, message.msgpost.message)
			msg.post(controller, "show_timewarp", { amount = message.timeAmount * spring, base = message.timeAmount, spring = spring })
		else
			msg.post("main:/menu#" .. message.callback, "purchase_failed", message.msgpost)
		end
	end,
	
	["mod_gold"] = function(message_id, message, sender)
		mod_gold(message.amount)
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["mod_bonustime"] = function(message_id, message, sender)
		mod_time(message.amount)
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["mod_xp"] = function(message_id, message, sender)
		local amount = message.amount
		if amount > 0 and actions.xp_factor() > 1 then
			amount = math.floor(amount * actions.xp_factor() + 0.5)
			msg.post("main:/overlay#header", "hero_bonus_fx", { kind = "lessonplans", base = message.amount, bonus = amount - message.amount })
		end
		mod_xp(amount)
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["mod_followers"] = function(message_id, message, sender)
		mod_followers(message.amount)
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["mod_currency"] = function(message_id, message, sender)
		msg.post(controller, "mod_gold", { amount = message.gold })
		msg.post(controller, "mod_xp", { amount = message.xp })
		msg.post(controller, "mod_bonustime", { amount = message.time })
		msg.post(controller, "mod_followers", { amount = message.followers })
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["mod_portalscroll"] = function(message_id, message, sender)
		mod_portalscroll(message.amount)
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["buy_portalscroll"] = function(message_id, message, sender)
		if defsave.get("Currency", "Gold") + message.gold > 0 then 
			msg.post(controller, "mod_gold", 			{ amount = message.gold })
			msg.post(controller, "mod_portalscroll", 	{ amount = message.amount })
			if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
		end
	end,
	["use_portalscroll"] = function(message_id, message, sender)
		msg.post(controller, "mod_portalscroll", { amount = message.amount })
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["use_portalscroll"] = function(message_id, message, sender)
		msg.post(controller, "mod_portalscroll", { amount = -1 })
		if defsave.get("Currency", "PortalScrolls") >= 0 then msg.post(controller, "show_sellitems", { portal = true } ) end
		if message.callback ~= nil then msg.post("main:/menu#" .. message.callback, "refresh_all") end
	end,
	["set_bonusxp"] = function(message_id, message, sender)
		set_bonusxp(message.statName, message.value, message.count)
	end,
	["collect_bonusxp"] = function(message_id, message, sender)
		collect_bonusxp(message.statName, message.callback)
	end,
	["complete_rank"] = function(message_id, message, sender)
		if not message.portal then defsave.set("Currency", "Followers", 0) end
		if defsave.loaded.Currency.data.Bonusxp then
			for r,resource in pairs(defsave.loaded.Currency.data.Bonusxp) do
				-- An event's items keep their shard bonuses: closing a main-game
				-- chapter neither pays them out as XP nor resets them.
				local stat = defsave.loaded.Resources.data[r]
				if not (stat and stat.Location and stat.Location.map_id ~= 1) then
					if defsave.loaded.Currency.data.Bonusxp[r].Total then 
						msg.post(controller, "mod_xp", { amount = defsave.loaded.Currency.data.Bonusxp[r].Total })
					end
					defsave.loaded.Currency.data.Bonusxp[r].Total = 0
					defsave.loaded.Currency.data.Bonusxp[r].Collected = 0
					defsave.loaded.Currency.data.Bonusxp[r].Progress = 0
				end
			end
			defsave.save("Currency", true)
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
