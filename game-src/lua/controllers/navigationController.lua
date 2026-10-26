local inspect = require('inspect')
local actions = require('actions')
local random = require('random/random')
local progress = require('progress/progress')
local defsave = require('defsave/defsave')

local productName = "OoR"
local controller	= "main:/menu#controller"

local M = {}

local messageData = {}

local map_id = 1
local currentScreen = "boot"
local currentPopup = ""
local breadcrumb = {}
local showKingdom = true
local boot_list = {}

local function setCurrentScreen(nextScreen, message)
	if message == nil then message = {} end


	print("NAVIGATOR: moving from", currentScreen, "to", nextScreen)
	if breadcrumb[#breadcrumb] == "boot" or breadcrumb[#breadcrumb] == "mainmenu" then breadcrumb = { "mainmenu" } end
	table.insert(breadcrumb, currentScreen)
	message.enabled = false
	msg.post("main:/menu#" .. currentScreen, "set_enabled", message)
	message.enabled = true
	msg.post("main:/menu#" .. nextScreen, "set_enabled", message)
	currentScreen = nextScreen
end

local function hidePopup(popup, message)
	message.enabled = false
	msg.post("main:/popup#" .. popup, "set_enabled", message)
	msg.post("main:/overlay#header", "set_active", { active = true })
	msg.post("main:/overlay#back", "set_active", { active = true })
	msg.post("main:/menu#" .. currentScreen, "set_active", { active = true })
end

local function showPopup(popup, message)
	hidePopup(currentPopup, message)
	message.enabled = true
	msg.post("main:/popup#" .. popup, "set_enabled", message)
	msg.post("main:/overlay#header", "set_active", { active = false })
	msg.post("main:/overlay#back", "set_active", { active = false })
	msg.post("main:/menu#" .. currentScreen, "set_active", { active = false })
end

local function previousScreen(popup, message)
	if breadcrumb[#breadcrumb] == "mainmenu" then breadcrumb = { "mainmenu" } end
	print("NAVIGATOR: go back", currentScreen, breadcrumb[#breadcrumb], inspect(breadcrumb))
	if message == nil then message = {} end
	message.enabled = false
	msg.post("main:/menu#" .. currentScreen, "set_enabled", message)
	currentScreen = breadcrumb[#breadcrumb]
	message.enabled = true
	msg.post("main:/menu#" .. currentScreen, "set_enabled", message)
	table.remove(breadcrumb, #breadcrumb)
end

local function boot(bootfile)
	boot_list[bootfile] = true
	if boot_list["Map"]
	and boot_list["Hero"]
	and boot_list["Henchmen"]
	and boot_list["Stats"]
	and boot_list["Rep"]
	and boot_list["Loot"]
	and boot_list["Currency"]
	then
		setCurrentScreen("boot")
	end
end

messageData["all"] = {
	["boot_map"] = function(message_id, message, sender) 			boot("Map") end,
	["boot_hero"] = function(message_id, message, sender) 			boot("Hero") end,
	["boot_henchmen"] = function(message_id, message, sender) 		boot("Henchmen") end,
	["boot_stats"] = function(message_id, message, sender) 			boot("Stats") end,
	["boot_rep"] = function(message_id, message, sender) 			boot("Rep") end,
	["boot_loot"] = function(message_id, message, sender) 			boot("Loot") end,
	["boot_currency"] = function(message_id, message, sender) 		boot("Currency") end,
	["pause"] = function(message_id, message, sender) 				msg.post("main:/menu#dungeonmine", "pause", message) end,
	["unpause"] = function(message_id, message, sender)				msg.post("main:/menu#dungeonmine", "unpause", message) end,
	["set_particletarget"] = function(message_id, message, sender)	msg.post("main:/overlay#guiparticles", "set_particletarget", message) end,
	["spawn_particles"] = function(message_id, message, sender)		msg.post("main:/overlay#guiparticles", "spawn_particles", message) end,
	["show_previous"] = function(message_id, message, sender)		previousScreen(message) end,
	["start_game"] = function(message_id, message, sender)			
		setCurrentScreen("dungeonmine", message)
	end,
	["reset_statistics"] = function(message_id, message, sender)
		map_id = 1
		showKingdom = true
		setCurrentScreen("dungeonmine", { map_id = 1, dungeon_id = 1 })
		msg.post("main:/overlay#header", "disable_alerts")
	end,
	["show_background"] = function(message_id, message, sender) msg.post("main:/background#background", "set_enabled", message) end,

	["popup_loading"] = function(message_id, message, sender) showPopup("loading_popup", message) end,
	["popup_message"] = function(message_id, message, sender) showPopup("message_popup", message) end,
	["popup_confirm"] = function(message_id, message, sender) showPopup("confirm_popup", message) end,
	["popup_quest"] = function(message_id, message, sender) showPopup("quest_popup", message) end,
	["popup_questCollect"] = function(message_id, message, sender) showPopup("questCollect_popup", message) end,
	["popup_questOpen"] = function(message_id, message, sender) showPopup("questOpen_popup", message) end,
	["popup_questClose"] = function(message_id, message, sender) showPopup("questClose_popup", message) end,
	["popup_rankUp"] = function(message_id, message, sender) showPopup("rankUp_popup", message) end,
	["popup_resource"] = function(message_id, message, sender) showPopup("resource_popup", message) end,
	["popup_henchmen"] = function(message_id, message, sender) showPopup("henchmen_popup", message) end,
	["popup_returntogame"] = function(message_id, message, sender) 
		showPopup("returntogame_popup", message) 
	end,
	["hide_popup"] = function(message_id, message, sender) hidePopup(currentPopup, message) end,

	["show_settings"] = function(message_id, message, sender) setCurrentScreen("settings", message) end,
	["show_cards"] = function(message_id, message, sender) 
		if defsave.get("Stats", "Show").cardsButton then 
			setCurrentScreen("cards", message)
		end
	end,
	["show_home"] = function(message_id, message, sender) setCurrentScreen("roster", message) end,
	["show_quests"] = function(message_id, message, sender) setCurrentScreen("quests", message) end,
	["show_hero"] = function(message_id, message, sender) setCurrentScreen("hero", message) end,
	["show_sellitems"] = function(message_id, message, sender) setCurrentScreen("sellitems", message) end,
	["focus_kingdom"] = function(message_id, message, sender) showKingdom = message.status end,
	["show_kingdom"] = function(message_id, message, sender)
		if not showKingdom and map_id ~= nil then
			if map_id ~= nil then message.map_id = map_id end
			setCurrentScreen("map", message)
		else
			setCurrentScreen("kingdom", message)
		end
	end,
	["show_map"] = function(message_id, message, sender)
		map_id = message.map_id
		setCurrentScreen("map", message)
	end,
	["show_dungeon"] = function(message_id, message, sender) setCurrentScreen("createquest", message) end,
	["show_dungeonmine"] = function(message_id, message, sender) setCurrentScreen("dungeonmine", message) end,
	["show_item"] = function(message_id, message, sender) setCurrentScreen("item", message) end,
	["show_inventory"] = function(message_id, message, sender) setCurrentScreen("inventory", message) end,
	["show_stats"] = function(message_id, message, sender) setCurrentScreen("stats", message) end,
	["show_shop"] = function(message_id, message, sender)
		if defsave.get("Stats", "Show").shopButton then 
			setCurrentScreen("shop", message)
		end
	end,
	["show_openpack"] = function(message_id, message, sender) setCurrentScreen("openpack", message) end,
	["show_timewarp"] = function(message_id, message, sender) setCurrentScreen("timewarp", message) end,
	["show_upgradecard"] = function(message_id, message, sender) setCurrentScreen("upgradecard", message) end,
	["show_cardsunlock"] = function(message_id, message, sender) setCurrentScreen("unlockcards", message) end,
	["show_heroselect"] = function(message_id, message, sender) setCurrentScreen("heroselect", message) end,

	
	["toggle_profile"] = function(message_id, message, sender) msg.post("@system:", "toggle_profile") end
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
