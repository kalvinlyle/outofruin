local ga 			= require('googleanalytics.ga')
local defsave 		= require('defsave/defsave')

local controller	= "main:/menu#controller"

local M = {}
local isDebug = sys.get_engine_info().is_debug
local uuid = 0

function M.update(self)
	ga.update()
end

function init(self)
	ga.get_default_tracker().enable_crash_reporting(true)
	uuid = defsave.get("Stats", "uuid")
end

local function screenview(screen_name)
	if not isDebug then
		ga.get_default_tracker().screenview(screen_name)
	end
end

local function event(category, action, label, value)
	if not isDebug then
		ga.get_default_tracker().event(category, action, label, value)
	end
end

local messageData = {}
messageData["all"] = {

	["popup_loading"] = function(message_id, message, sender) 		event("Screen View", "Loading Popup", 			"Engagement", 1) 	end,
	["popup_message"] = function(message_id, message, sender) 		event("Screen View", "Message Popup", 			"Engagement", 1) 	end,
	["popup_confirm"] = function(message_id, message, sender) 		event("Screen View", "Confirm Popup", 			"Engagement", 1) 	end,
	["popup_quest"] = function(message_id, message, sender) 		event("Screen View", "Quest Popup", 			"Engagement", 1) 	end,
	["popup_questCollect"] = function(message_id, message, sender) 	event("Screen View", "Quest Collect Popup", 	"Engagement", 1) 	end,
	["popup_questOpen"] = function(message_id, message, sender) 	event("Screen View", "Quest Open Popup", 		"Engagement", 1) 	end,
	["popup_questClose"] = function(message_id, message, sender) 	event("Screen View", "Quest Close Popup", 		"Engagement", 1) 	end,
	["popup_rankUp"] = function(message_id, message, sender) 		event("Screen View", "RankUp Popup", 			"Engagement", 1) 	end,
	["popup_resource"] = function(message_id, message, sender) 		event("Screen View", "Resource Popup", 			"Engagement", 1) 	end,
	["popup_henchmen"] = function(message_id, message, sender) 		event("Screen View", "Henchmen Popup", 			"Engagement", 1) 	end,
	["popup_returntogame"] = function(message_id, message, sender) 	event("Screen View", "Return To Game Popup", 	"Engagement", 1) 	end,
	["show_settings"] = function(message_id, message, sender) 		event("Screen View", "Settings Screen", 		"Engagement", 1) 	end,
	["show_cards"] = function(message_id, message, sender) 			event("Screen View", "Cards Screen", 			"Engagement", 1) 	end,
	["show_quests"] = function(message_id, message, sender) 		event("Screen View", "Quests Screen", 			"Engagement", 1) 	end,
	["show_hero"] = function(message_id, message, sender) 			event("Screen View", "Hero Screen", 			"Engagement", 1) 	end,
	["show_sellitems"] = function(message_id, message, sender) 		event("Screen View", "Sell Items Screen", 		"Engagement", 1) 	end,
	["show_kingdom"] = function(message_id, message, sender)		event("Screen View", "Kingdom Screen", 			"Engagement", 1)	end,
	["show_map"] = function(message_id, message, sender)			event("Screen View", "Map Screen", 				"Engagement", 1)	end,
	["show_dungeon"] = function(message_id, message, sender) 		event("Screen View", "Createquest Screen", 		"Engagement", 1) 	end,
	["show_dungeonmine"] = function(message_id, message, sender) 	event("Screen View", "Dungeonmine Screen", 		"Engagement", 1) 	end,
	["show_item"] = function(message_id, message, sender) 			event("Screen View", "Item Screen", 			"Engagement", 1) 	end,
	["show_inventory"] = function(message_id, message, sender) 		event("Screen View", "Inventory Screen", 		"Engagement", 1) 	end,
	["show_stats"] = function(message_id, message, sender) 			event("Screen View", "Stats Screen", 			"Engagement", 1) 	end,
	["show_shop"] = function(message_id, message, sender)			event("Screen View", "Shop Screen", 			"Engagement", 1)	end,
	["show_openpack"] = function(message_id, message, sender) 		event("Screen View", "Open Pack Screen", 		"Engagement", 1) 	end,
	["show_timewarp"] = function(message_id, message, sender) 		event("Screen View", "Timewarp Screen", 		"Engagement", 1) 	end,
	["show_upgradecard"] = function(message_id, message, sender) 	event("Screen View", "Upgrade Card Screen", 	"Engagement", 1) 	end,
	["show_cardsunlock"] = function(message_id, message, sender) 	event("Screen View", "Unlock Cards Screen", 	"Engagement", 1) 	end,
	["show_heroselect"] = function(message_id, message, sender) 	event("Screen View", "Hero Select Screen", 		"Engagement", 1) 	end,


	["on_start"] = function(message_id, message, sender) 			event("Game", "Start", "Retention", 1)					end,
	["popup_returntogame"] = function(message_id, message, sender) 	event("Game", "Return", "Retention", 1) 				end,


	["complete_rank"] = function(message_id, message, sender) 		event("Chapter Completed", "Chapter " .. message.rank, "Progression", 1) 		end,
	["collect_quest"] = function(message_id, message, sender) 		event("Quest Completed", "Quest " .. defsave.get("Stats", "Rank") .. "-" .. message.id, "Progression", 1) 			end,


	["chapter_gold"] = function(message_id, message, sender) 		event("Gold Earned", "Chapter " .. message.rank, "Economy", message.amount) 		end,


	["gen_adreward"] = function(message_id, message, sender) 		event("Shop", "Free Loot", 	"Monetization", 1) 										end,
	["purchase_gold"] = function(message_id, message, sender) 		event("Shop", "Buy Gold", 	"Monetization", message.msgpost.message.packGold)		end,
	["purchase_cards"] = function(message_id, message, sender) 		event("Shop", "Buy Cards", 	"Monetization", message.msgpost.message.packCards)		end,
	["purchase_xp"] = function(message_id, message, sender) 		event("Shop", "Buy Xp", 	"Monetization", message.msgpost.message.packXp)			end,
	["purchase_time"] = function(message_id, message, sender) 		event("Shop", "Buy Time", 	"Monetization", message.timeAmount)						end,


	["reset_statistics"] = function(message_id, message, sender) 	event("Reset Progress", "Button Pressed", "Progression", 1)		end
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
