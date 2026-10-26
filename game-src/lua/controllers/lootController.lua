local inspect = require('inspect')
local actions = require('actions')
local random = require('random/random')
local progress = require('progress/progress')
local defsave = require('defsave/defsave')

local productName = "OoR"
local controller	= "main:/menu#controller"

local M = {}
local attFactor = 0.25
local drawWeight  = { 
	Common		= 1000,
	Wild 		= 100,
	Rare 		= 25,
	Epic 		= 5,
	Legendary	= 2,
	Exotic 		= 1
}

local function on_start(message)
	defsave.load("Loot")

	if actions.tablelength(defsave.loaded.Loot.data) > 0 then msg.post(controller, "boot_loot") end
	print("LOOTCONTROLLER: Loot loaded")
end

local function add_cards_to_deck(deck, data, data_type)
	for c,card in ipairs(data) do
		-- Event henchmen (map 2 onwards) start fresh every run, so cards spent
		-- on them would vanish; packs only draw for the main game.
		-- A card may also be held back until a later chapter, so a hero the
		-- player owns from the start cannot be levelled before then.
		if card.Status == "Unlocked" and (card.map_id == nil or card.map_id == 1)
		and (card.CardsFromRank == nil or defsave.get("Stats", "Rank") >= card.CardsFromRank) then
			table.insert(deck, { Weight = drawWeight[card.Rarity], Option = { id = card.id, type = data_type, amount = 1 } } )
		end
	end
	return deck
end

local function pick_card()
	local deck = {}
	deck = add_cards_to_deck(deck, actions.clone(defsave.loaded.Gear.data), "gear")
	deck = add_cards_to_deck(deck, actions.clone(defsave.loaded.Henchmen.data), "henchmen")
	deck = add_cards_to_deck(deck, actions.clone(defsave.loaded.Hero.data), "hero")
	if #deck > 0 then return random.table_weighted(deck) end
end

local function draw_cards(num, maxUniqueCards, pick)
	local cards = {}
	local card = {}
	local totalCards = 0
	local totalUnique = 0
	maxUniqueCards = maxUniqueCards or 9
	pick = pick or pick_card
	
	while totalCards < num do
		card = pick(num)
		-- Nothing unlocked to draw yet: stop rather than spin. The pack still
		-- pays out its xp and gold.
		if not card then break end
		local duplicate = false
		if card then
			if cards[card.type] == nil then cards[card.type] = {} end
			if #cards[card.type] > 0 then
				for pc,packcard in ipairs(cards[card.type]) do
					if card.id == cards[card.type][pc].id and card.type == cards[card.type][pc].type then
						cards[card.type][pc].amount = cards[card.type][pc].amount + card.amount
						duplicate = true
						totalCards = totalCards + card.amount
					end
				end
			end
			if not duplicate and totalUnique < maxUniqueCards then
				totalUnique = totalUnique + 1
				table.insert( cards[card.type], card )
				totalCards = totalCards + card.amount
			end
		end
	end

	return cards
end

local function set_inventory(map_id, dungeon_id, level, table, inventory)
	for n=1, #table do
		msg.post(controller, "set_inventory", { map_id = map_id, dungeon_id = dungeon_id, level = level, table = n, inventory = table[n]["Inventory"] } )
	end
end

local function gen_rewardpack( packCards, packGold, packXp, container )
	container = container or "wood"
	local pack = {}
	local item_pack = {}
	local totalValue = 0
	local packItems = 0

	if pack.cards == nil then pack.cards = {} end
	local totalCards = 0
	pack.container = container
	pack.xp = 10 * packXp
	pack.gold = packGold
	local maxUniqueCards = 9
	if pack.xp > 0 then maxUniqueCards = maxUniqueCards - 1 end
	if pack.gold > 0 then maxUniqueCards = maxUniqueCards - 1 end
	pack.cards = draw_cards(packCards, maxUniqueCards)
	-- Mother Mabb adds her own picks to every pack, kept apart so the pack
	-- screen can show which cards were hers.
	local mabb = math.floor(actions.patron_value("HERO_MOTHERMABB_NAME", 1, 3, 0) + 0.5)
	if mabb > 0 then pack.mabb = draw_cards(mabb, mabb) end
	pack.resources = {}

	return pack

end

--[[ The event's own chest. It draws only from that event's henchmen and gear,
which normal packs never hold, so what the player spends on them stays theirs
from one run to the next. Rarity counts for less than in a normal pack: the
deeper locations' cards are what a crew needs to keep up with later parts. ]]
local EVENT_WEIGHT = { Common = 6, Rare = 4, Epic = 3, Legendary = 2 }

local function event_deck(map_id)
	local deck = {}
	for _,kind in ipairs({ { "Henchmen", "henchmen" }, { "Gear", "gear" } }) do
		for c,card in ipairs(defsave.loaded[kind[1]].data) do
			-- An enemy event's rows hold its enemies, which are not cards.
			if card.map_id == map_id and not card.Enemy then
				table.insert(deck, { Weight = EVENT_WEIGHT[card.Rarity] or 1, Option = { id = c, type = kind[2], amount = 1 } })
			end
		end
	end
	return deck
end

local function gen_eventpack(message)
	local deck = event_deck(message.map_id)
	-- Each event pays in a chest of its own look.
	local event = actions.event_on_map(message.map_id)
	local pack = { container = event and event.chest or "moon", xp = 0, gold = 0, resources = {} }
	pack.cards = draw_cards(message.cards, 8, function()
		if #deck > 0 then return random.table_weighted(deck) end
	end)
	if message.hero_cards and message.hero_cards > 0 then
		pack.cards.hero = { { id = message.hero_id, type = "hero", amount = message.hero_cards } }
	end
	local shards = message.shards
	if shards and shards.amount > 0 then
		local resource = defsave.loaded.Resources.data[shards.stat]
		table.insert(pack.resources, { Name = resource.Name, Description = "EVENT_CHEST_SHARDS", Icon = resource.Icon, Rarity = "Common",
			Stat = shards.stat, Total = shards.amount, amount = shards.amount, quiet = true })
	end
	return pack
end

local function reward_resource(luck, map_id, dungeon_id, level)

	local dungeon_data = defsave.loaded.Map.data[map_id][dungeon_id]

	for i=1,math.min(#dungeon_data.Levels, level) do

		local resource = ""
		dungeon_data.Levels[i].Loot_Table, resource = random.table_weighted_draw( dungeon_data.Levels[i].Loot_Table )
		resource.Total = math.ceil(math.random( resource.Min, resource.Max ) + ( ( resource.Max - resource.Min ) * ( luck * attFactor ) ))
		set_inventory(map_id, dungeon_id, level, dungeon_data.Levels[i].Loot_Table)
		msg.post(controller, "update_stats", { name = resource.Name, icon = resource.Icon, stat = resource.Stat, amount = resource.Total })
		defsave.save("Loot", true)

	end
end

local function gen_levelpack(packSize, packValue, luck, map_id, dungeon_id, level)
	local dungeon_data = defsave.loaded.Map.data[map_id][dungeon_id]

	local pack = {}
	pack.items = {}
	pack.gold = 0
	pack.xp = 0
	pack.resources = {}

	local resource = ""
	dungeon_data.Levels[level].Loot_Table, resource = random.table_weighted_draw( dungeon_data.Levels[level].Loot_Table )
	resource.Total = math.ceil(math.random( resource.Min, resource.Max ) + ( ( resource.Max - resource.Min ) * ( luck * attFactor ) ))
	set_inventory(map_id, dungeon_id, level, dungeon_data.Levels[i].Loot_Table)
	pack.resources[1] = resource
	return pack

end

local function sell_item(id)
	local item = defsave.loaded.Loot.dataItems[actions.findintable(defsave.loaded.Loot.dataItems, "id", id)]
	local tablepos = actions.findinlist(defsave.loaded.Loot.dataPlayer, id)
	msg.post(controller, "mod_gold", { amount = item["Value"] })
	msg.post("main:/overlay#header", "refresh_all")
	table.remove(defsave.loaded.Loot.dataPlayer, tablepos)
	defsave.save("Loot", true)
end

-- A loot crit. Seraphine Vale adds her chance on top of the level's own, and
-- a crit only she made is marked lucky, so the screen can show it was hers. A
-- level with no crit gear pays nothing extra on its own crits, so hers always
-- pay at least double.
local function roll_crit(critChance, critBonus)
	local seraphine = actions.patron_value("HERO_SERAPHINEVALE_NAME", 5, 30, 0)
	local roll = math.random(1,10000)
	if roll <= critChance * 100 then return critBonus - 1, false end
	if roll <= (critChance + seraphine) * 100 then return math.max(critBonus, 2) - 1, true end
	return 0, false
end

local function gen_levelrewards(packSize, packValue, luck, map_id, dungeon_id, level, multiplier, critChance, critBonus, critLuck, vfx)
	multiplier = multiplier or 1
	critChance = critChance or 1
	critBonus = critBonus or 1
	critLuck = critLuck or 1

	local dungeon_data = defsave.loaded.Map.data[map_id][dungeon_id]


	local resources = {}


	local invSize = #dungeon_data.Levels[level].Loot_Table
	local fullInv = math.floor(multiplier / invSize)
	if fullInv > 0 then
		for i=1,invSize do
			for r,resource in ipairs(dungeon_data.Levels[level].Loot_Table) do
				resource = resource.Option

				resource.Bonus = 0
				resource.Bonus, resource.Lucky = roll_crit(critChance, critBonus)

				resource.Average = math.floor( ( resource.Max - resource.Min ) / 2 ) + resource.Min
				-- An enemy wave's packSize is not a whole number, so round the haul.
				resource.Total = math.floor( math.ceil(math.random( resource.Min, resource.Max ) + ( ( resource.Max - resource.Min ) * ( luck * attFactor ) ) ) * fullInv * packSize + 0.5 )
				resource.Bonus = math.floor( resource.Bonus * fullInv * packSize )
				resources[resource.Stat] = { Name = resource.Name, Total = resource.Total, Bonus = resource.Bonus, Icon = resource.Icon, Stat = resource.Stat, Lucky = resource.Lucky }
			end
		end
	end


	for i=1,multiplier - ( fullInv * invSize ) do
		local resource = ""
		dungeon_data.Levels[level].Loot_Table, resource = random.table_weighted_draw( dungeon_data.Levels[level].Loot_Table )

		resource.Bonus = 0
		resource.Bonus, resource.Lucky = roll_crit(critChance, critBonus)

		resource.Total = math.floor( math.ceil(math.random( resource.Min, resource.Max ) + ( ( resource.Max - resource.Min ) * ( luck * attFactor ) ) ) * packSize + 0.5 )
		resource.Bonus = math.floor( resource.Bonus * packSize + 0.5 )
		if resources[resource.Stat] == nil then
			resources[resource.Stat] = { Name = resource.Name, Total = resource.Total, Bonus = resource.Bonus, Icon = resource.Icon, Stat = resource.Stat, Lucky = resource.Lucky }
		else
			resources[resource.Stat].Total = resources[resource.Stat].Total + resource.Total
			resources[resource.Stat].Bonus = resources[resource.Stat].Bonus + resource.Bonus
			resources[resource.Stat].Lucky = resources[resource.Stat].Lucky or resource.Lucky
		end
	end
	set_inventory(map_id, dungeon_id, level, dungeon_data.Levels[level].Loot_Table)
	if resources ~= nil then
		local max = table.getn(resources)
		for r in next, resources do
			local resource = resources[r]
			msg.post(controller, "update_stats", { stat = resource.Stat, amount = resource.Total, bonus = resource.Bonus })
			if resource.Lucky and resource.Bonus > 0 then
				msg.post("main:/menu#dungeonmine", "hero_fx", { kind = "lucky", stat = resource.Stat, amount = resource.Bonus, map_id = map_id, dungeon_id = dungeon_id })
			end

			if vfx then
				if vfx.type == "resource" then
					local message = { resourcename = resource.Stat, map_id = map_id, dungeon_id = dungeon_id, level_id = level, vfx = vfx }
					msg.post("main:/menu#dungeonmine", "play_vfx", message )
				end
			end

		end
	end
end

--[[ An enemy kill's loot (gdd/enemy-events.md). Every kill drops the row's
first drop, so clearing a row always brings in what the next row needs; any
other drop on the table comes now and then on top, Weight in a hundred. ]]
local function gen_enemyloot(message)
	local level = defsave.loaded.Map.data[message.map_id][message.dungeon_id].Levels[message.level_id]
	for r,row in ipairs(level.Loot_Table) do
		local option = row.Option
		local total, bonus, lucky = 0, 0, false
		for k = 1, message.kills do
			if r == 1 or math.random(1, 100) <= row.Weight then
				local amount = math.random(option.Min, option.Max) * message.packSize
				local extra, isLucky = roll_crit(message.critChance, message.critBonus)
				total = total + amount
				bonus = bonus + extra * message.packSize
				lucky = lucky or (isLucky and extra > 0)
			end
		end
		total, bonus = math.floor(total + 0.5), math.floor(bonus + 0.5)
		if total > 0 then
			msg.post(controller, "update_stats", { stat = option.Stat, amount = total, bonus = bonus })
			if lucky then
				msg.post("main:/menu#dungeonmine", "hero_fx", { kind = "lucky", stat = option.Stat, amount = bonus, map_id = message.map_id, dungeon_id = message.dungeon_id })
			end
		end
	end
end

local function gen_dungeonrewards(packSize, packValue, luck, map_id, dungeon_id, multiplier, critChance, critBonus, critLuck, vfx)
	multiplier = multiplier or 1
	critChance = critChance or 1
	critBonus = critBonus or 1
	critLuck = critLuck or 1

	local dungeon_data = defsave.loaded.Map.data[map_id][dungeon_id]

	local resources = {}

	local invSize = 0
	local maxLevel = 0
	for l,level in ipairs(dungeon_data.Levels) do
		if not level.isLocked and level.wasClickedOpen then
			invSize = invSize + #level.Loot_Table
			maxLevel = maxLevel + 1
		end
	end
	
	local fullInv = math.floor(multiplier / invSize)
	if fullInv > 0 then
		for i=1,invSize do
			for l,level in ipairs(dungeon_data.Levels) do
				if l <= maxLevel then 
					for r,resource in ipairs(level.Loot_Table) do
						resource = resource.Option

						resource.Bonus = 0
						resource.Bonus, resource.Lucky = roll_crit(critChance, critBonus)

						resource.Average = math.floor( ( resource.Max - resource.Min ) / 2 ) + resource.Min
						resource.Total = math.floor( resource.Average * fullInv * packSize )
						resource.Bonus = math.floor( resource.Bonus * fullInv * packSize )
						resources[resource.Stat] = { Name = resource.Name, Total = resource.Total, Bonus = resource.Bonus, Icon = resource.Icon, Stat = resource.Stat, Lucky = resource.Lucky }
					end
				end
			end
		end
	end

	
	for i=1,multiplier - ( fullInv * invSize ) do
		local resource = {}
		
		local randlevel = math.random(1,maxLevel)
		dungeon_data.Levels[randlevel].Loot_Table, resource = random.table_weighted_draw( dungeon_data.Levels[randlevel].Loot_Table )
		resource.Level = randlevel

		resource.Bonus = 0
		resource.Bonus, resource.Lucky = roll_crit(critChance, critBonus)
		resource.Total = math.floor( math.ceil(math.random( resource.Min, resource.Max ) + ( ( resource.Max - resource.Min ) * ( luck * attFactor ) ) ) ) * packSize
		resource.Bonus = resource.Bonus * packSize

		set_inventory(map_id, dungeon_id, resource.Level, dungeon_data.Levels[resource.Level].Loot_Table)

		if resources[resource.Stat] == nil then
			resources[resource.Stat] = { Name = resource.Name, Level = resource.Level, Total = resource.Total, Bonus = resource.Bonus, Icon = resource.Icon, Stat = resource.Stat }
		else
			resources[resource.Stat].Total = resources[resource.Stat].Total + resource.Total
			resources[resource.Stat].Bonus = resources[resource.Stat].Bonus + resource.Bonus
			resources[resource.Stat].Lucky = resources[resource.Stat].Lucky or resource.Lucky
		end

	end

	if resources ~= nil then
		local max = table.getn(resources)
		for r in next, resources do
			local resource = resources[r]
			msg.post(controller, "update_stats", { stat = resource.Stat, amount = resource.Total, bonus = resource.Bonus })
			if resource.Lucky and resource.Bonus > 0 then
				msg.post("main:/menu#dungeonmine", "hero_fx", { kind = "lucky", stat = resource.Stat, amount = resource.Bonus, map_id = map_id, dungeon_id = dungeon_id })
			end

			if vfx then
				if vfx.type == "resource" then
					local message = { resourcename = resource.Stat, map_id = map_id, dungeon_id = dungeon_id, level_id = resource.Level, vfx = vfx }
					msg.post("main:/menu#dungeonmine", "play_vfx", message )
				end
			end

		end
	end
end

local function open_pack(num)
	msg.post(controller, "mod_xp", { amount = defsave.loaded.Loot.data.Packs[num].xp })
	msg.post(controller, "mod_gold", { amount = defsave.loaded.Loot.data.Packs[num].gold })
	for _,cards in ipairs({ defsave.loaded.Loot.data.Packs[num].cards, defsave.loaded.Loot.data.Packs[num].mabb }) do
		for t,type in pairs(cards) do
			for c,card in pairs(type) do
				if card.type == "henchmen" 	then 	msg.post(controller, "add_henchmencards", 	{ henchmen_id = card.id, 	amount = card.amount }) 	end
				if card.type == "gear" 		then 	msg.post(controller, "add_gearcards", 		{ gear_id = card.id, 		amount = card.amount }) 	end
				if card.type == "hero" 		then 	msg.post(controller, "add_herocards", 		{ hero_id = card.id, 		amount = card.amount }) 	end
				msg.post(controller, "collect_cards", { amount = card.amount })
			end
		end
	end
	if actions.tablelength(defsave.loaded.Loot.data.Packs[num].resources) > 0 then
		for r,resource in pairs(defsave.loaded.Loot.data.Packs[num].resources) do
			if resource.quiet then
				msg.post(controller, "add_resource_quietly", { stat = resource.Stat, amount = resource.Total })
			else
				msg.post(controller, "update_stats", { name = resource.Name, icon = resource.Icon, stat = resource.Stat, amount = resource.Total })
			end
		end
	end
	table.remove(defsave.loaded.Loot.data.Packs, num)
	defsave.save("Loot", true)
end

--[[ Field hero powers that make loot (gdd/heroes-roster.md). Each tells the
dungeon screen what it made, so the screen can fly it to where it went. ]]

local JUNK = { "oldboot", "dentedhelmet", "driftwood", "tincup" }

local function dungeon_drops(map_id, dungeon_id)
	local drops, seen = {}, {}
	for l,level in ipairs(defsave.loaded.Map.data[map_id][dungeon_id].Levels) do
		if not level.isLocked and level.wasClickedOpen then
			for _,row in ipairs(level.Loot_Table) do
				local stat = row.Option.Stat
				if not seen[stat] and defsave.loaded.Resources.data[stat] then
					seen[stat] = true
					table.insert(drops, { stat = stat, level_id = l, option = row.Option })
				end
			end
		end
	end
	return drops
end

local function pick_chest_card()
	local deck = {}
	deck = add_cards_to_deck(deck, actions.clone(defsave.loaded.Gear.data), "gear")
	deck = add_cards_to_deck(deck, actions.clone(defsave.loaded.Hero.data), "hero")
	if #deck > 0 then return random.table_weighted(deck) end
end

-- One of Nell's catches: mostly junk for the sell screen, now and then
-- something better. Her level doubles the odds of everything but junk.
local function catch_one(message, luck)
	local table_ = {
		{ kind = "junk", weight = 60 },
		{ kind = "drops", weight = 25 * luck },
		{ kind = "bottle", weight = 10 * luck },
		{ kind = "fish", weight = 4 * luck },
		{ kind = "chest", weight = 1 * luck },
	}
	local total = 0
	for _,row in ipairs(table_) do total = total + row.weight end
	local roll = math.random() * total
	local kind = "junk"
	for _,row in ipairs(table_) do
		roll = roll - row.weight
		if roll <= 0 then kind = row.kind break end
	end

	local catch = { kind = kind }
	if kind == "drops" then
		local drops = dungeon_drops(message.map_id, message.dungeon_id)
		if #drops == 0 then kind = "junk" catch.kind = kind else
			local drop = drops[math.random(1, #drops)]
			catch.stat, catch.level_id = drop.stat, drop.level_id
			catch.amount = math.random(drop.option.Min, drop.option.Max) * 3
			msg.post(controller, "update_resources", { stat = catch.stat, amount = catch.amount })
		end
	end
	if kind == "junk" then
		catch.stat = JUNK[math.random(1, #JUNK)]
		catch.amount = 1
		msg.post(controller, "update_resources", { stat = catch.stat, amount = 1 })
	elseif kind == "bottle" then
		catch.amount = math.floor(actions.hero_power(message, 5, 60) + 0.5)
		msg.post(controller, "mod_xp", { amount = catch.amount })
	elseif kind == "fish" then
		catch.amount = math.floor(60 * (defsave.get("Stats", "followerRate") or 1) * actions.hero_power(message, 1, 10))
		msg.post(controller, "mod_followers", { amount = catch.amount })
	elseif kind == "chest" then
		local card = pick_chest_card()
		if card then
			catch.card = card
			if card.type == "gear" then msg.post(controller, "add_gearcards", { gear_id = card.id, amount = 1 }) end
			if card.type == "hero" then msg.post(controller, "add_herocards", { hero_id = card.id, amount = 1 }) end
			msg.post(controller, "collect_cards", { amount = 1 })
		end
	end
	return catch
end

local function hero_fish(message)
	local casts = math.floor(actions.hero_power(message, 1, 3) + 0.5)
	local luck = actions.hero_scale(actions.hero_power_level(message.hero_id), 1, 2)
	local catches = {}
	for i = 1, casts do table.insert(catches, catch_one(message, luck)) end
	msg.post("main:/menu#dungeonmine", "hero_fx", { kind = "fish", hero_id = message.hero_id, map_id = message.map_id, dungeon_id = message.dungeon_id, catches = catches, echo = message.echo_scale ~= nil })
end

-- Madame Ottoline: part of the dungeon's most plentiful drop becomes its
-- scarcest, at her rate.
local function hero_transmute(message)
	local drops = dungeon_drops(message.map_id, message.dungeon_id)
	if #drops < 2 then return end
	local resources = defsave.loaded.Resources.data
	table.sort(drops, function(a, b) return resources[a.stat].Count > resources[b.stat].Count end)
	local common, rare = drops[1], drops[#drops]
	local share = actions.hero_power(message, message.share1, message.share13)
	local rate = actions.hero_scale(actions.hero_power_level(message.hero_id), message.rate1, message.rate13)
	local gain = math.floor(resources[common.stat].Count * share / rate)
	if gain < 1 then return end
	local spent = math.floor(gain * rate + 0.5)
	msg.post(controller, "update_resources", { stat = common.stat, amount = -spent })
	msg.post(controller, "update_resources", { stat = rare.stat, amount = gain })
	msg.post("main:/menu#dungeonmine", "hero_fx", { kind = "transmute", hero_id = message.hero_id, map_id = message.map_id, dungeon_id = message.dungeon_id,
		from = common.stat, from_level = common.level_id, spent = spent, to = rare.stat, to_level = rare.level_id, gain = gain, rate = rate, echo = message.echo_scale ~= nil })
end

local messageData = {}
messageData["all"] = {
	["hero_fish"] = function(message_id, message, sender) hero_fish(message) end,
	["hero_transmute"] = function(message_id, message, sender) hero_transmute(message) end,
	["on_start"] = function(message_id, message, sender) on_start(message) end,
	["reset_statistics"] = function(message_id, message, sender)
		defsave.set("Loot", "Items", nil)
		defsave.set("Loot", "Resources", nil)
		defsave.set("Loot", "Packs", nil)
		defsave.set("Loot", "Player", nil)
		defsave.set("Loot", "Shop", nil)
		defsave.set("Loot", "Premium", nil)
		defsave.set("Loot", "Bundles", nil)
		defsave.save("Loot", true)
	end,
	["gen_levelpack"] = function(message_id, message, sender)
		if defsave.loaded.Loot.data.Packs == nil then defsave.loaded.Loot.data.Packs = {} end
		table.insert(defsave.loaded.Loot.data.Packs, gen_levelpack(message.packSize, message.level_id * 6, 1, message.map_id, message.dungeon_id, message.level_id))
		open_pack(#defsave.loaded.Loot.data.Packs)
		msg.post("main:/overlay#header", "refresh_all")
		defsave.save("Loot", true)
	end,
	["gen_levelpacks"] = function(message_id, message, sender)
		if defsave.loaded.Loot.data.Packs == nil then defsave.loaded.Loot.data.Packs = {} end
		gen_levelrewards(message.packSize, message.level_id * 6, 1, message.map_id, message.dungeon_id, message.level_id, message.packs, message.critChance, message.critBonus, message.critLuck, message.vfx)
		msg.post("main:/overlay#header", "refresh_all")
		defsave.save("Loot", true)
	end,
	["gen_enemyloot"] = function(message_id, message, sender)
		gen_enemyloot(message)
		msg.post("main:/overlay#header", "refresh_all")
	end,
	["gen_dungeonpacks"] = function(message_id, message, sender)
		message.packSize = message.packSize or 1
		message.packvalue = message.packvalue or 0
		if defsave.loaded.Loot.data.Packs == nil then defsave.loaded.Loot.data.Packs = {} end
		gen_dungeonrewards(message.packSize, message.packvalue, 1, message.map_id, message.dungeon_id, message.packs * message.count, message.critChance, message.critBonus, message.critLuck, message.vfx)
		msg.post("main:/overlay#header", "refresh_all")
		defsave.save("Loot", true)
	end,
	["reward_resource"] = function(message_id, message, sender)
		reward_resource(message.luck, message.map_id, message.dungeon_id, message.packLevel)
	end,
	["gen_adreward"] = function(message_id, message, sender)
		msg.post( controller, "gen_rewardpack", message )
	end,
	["gen_rewardpack"] = function(message_id, message, sender)
		message.complete_purchase_callback = message.complete_purchase_callback or "dungeonmine"
		if defsave.loaded.Loot.data.Packs == nil then defsave.loaded.Loot.data.Packs = {} end
		if message.packGold		== nil and message.packValue ~= nil		then message.packGold	= message.packValue		end 
		if message.packXp		== nil and message.packLevel ~= nil		then message.packXp		= message.packLevel		end 
		if message.packCards	== nil and message.packSize ~= nil		then message.packCards	= message.packSize		end 
		table.insert(defsave.loaded.Loot.data.Packs, gen_rewardpack(message.packCards, message.packGold, message.packXp, message.container))
		defsave.save("Loot", true)
		msg.post( controller, "show_openpack", { pack_id = #defsave.loaded.Loot.data.Packs, complete_purchase_callback = message.complete_purchase_callback } )
	end,
	-- Queued behind any pack already on screen unless `show` is set; the
	-- dungeon screen opens the next waiting pack whenever it comes back.
	["gen_eventpack"] = function(message_id, message, sender)
		if defsave.loaded.Loot.data.Packs == nil then defsave.loaded.Loot.data.Packs = {} end
		table.insert(defsave.loaded.Loot.data.Packs, gen_eventpack(message))
		defsave.save("Loot", true)
		if message.show then
			msg.post(controller, "show_openpack", { pack_id = #defsave.loaded.Loot.data.Packs, complete_purchase_callback = "dungeonmine" })
		end
	end,
	["open_pack"] = function(message_id, message, sender)
		for i=1, #defsave.loaded.Loot.data.Packs do
			if defsave.loaded.Loot.data.Packs[i] ~= nil then 
				msg.post(controller, "show_openpack", { pack_id = i, callback = message.callback } )
				break
			end
		end
	end,
	["close_pack"] = function(message_id, message, sender)
		open_pack(message.pack_id)
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
