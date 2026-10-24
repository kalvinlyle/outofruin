local defsave 		= require('defsave/defsave')
local inspect 		= require('inspect')

local controller	= "main:/menu#controller"

local M = {}
local isDebug = sys.get_engine_info().is_debug

function M.update(self)
end

hml5 = html5 or { run = function() return end }
local current_domain = nil

local function isKongregate()
	current_domain = current_domain or html5.run("document.referrer;")
	return current_domain == "https://www.kongregate.com/games/megarune/out-of-ruin_preview" or current_domain == "https://www.kongregate.com/games/megarune/out-of-ruin"
end

local function getKongUser()
	print("KONGREGATE GET USER INFO")
	local userName = html5.run("kongregate.services.getUsername()")
	local userID = html5.run("kongregate.services.getUserId()")
	return userName, userID
end

local function getItemList()
	print("KONGREGATE GET ITEM LIST")
	html5.run("kongregate.mtx.requestItemList([], onReturnItemList);")
end

local function getUserInfo()
	local userName, userID = getKongUser()
	msg.post(controller, "set_username", { username = tostring(userName) })
end

local function initAds()
	print("KONGREGATE INIT ADS")
	html5.run("kongregate.mtx.addEventListener('adsAvailable', adsAvailable);")
	html5.run("kongregate.mtx.addEventListener('adsUnavailable', adsUnavailable);")
	html5.run("kongregate.mtx.addEventListener('adOpened', adOpened);")
	html5.run("kongregate.mtx.addEventListener('adCompleted', adCompleted);")
	html5.run("kongregate.mtx.addEventListener('adAbandoned', adAbandoned);")
	html5.run("kongregate.mtx.initializeIncentivizedAds();")
end

local function showIncentivizedAd()
	print("KONGREGATE SHOW INCENTIVIZED AD")
	html5.run("kongregate.mtx.showIncentivizedAd();")
end

local function getPurchases()
	html5.run("kongregate.mtx.requestUserItemList('" .. defsave.get("Stats", "username") .. "', onUserItems)")
end

local function jsListener(self, message_id, message)
	if message_id == "kongIsLoaded" then
		print("KONGREGATE IS LOADED")
		html5.run("kongregate.services.addEventListener('login', onKongregateInPageLogin);")
		if defsave.get("Stats", "Rank") then html5.run("kongregate.stats.submit('current_chapter', " .. defsave.get("Stats", "Rank") .. " );") end
		getPurchases()
		getUserInfo()
		getItemList()

	elseif message_id == "onKongregateInPageLogin" then
		getUserInfo()
	elseif message_id == "onReturnItemList" then
		if message.success then
			print("KONGREGATE ITEM LIST RETURNED")
			print(message.data)
			for p,product in ipairs(message.data) do
				print("KONGREGATE PRODUCT " .. p .. " " .. product.identifier)
				product.title = product.name
				product.description = product.description .. "_KONGREGATE"
				msg.post("main:/menu#shop", "set_product", { product = product })
			end
		else
			print("KONGREGATE ITEM LIST FAILED")
		end
	elseif message_id == "onPurchaseResult" then
		if message.success then
			print("KONGREGATE PURCHASE SUCCESS")
			getPurchases()
		else
			print("KONGREGATE PURCHASE FAILED")
			msg.post(controller, "hide_popup")
		end
	elseif message_id == "onUserItems" then
		if message.success then
			print("KONGREGATE RETURN USER ITEMS RETURNED")
			local buyGoldValue = {
				buygold_1 = 200,
				buygold_2 = 500,
				buygold_3 = 1000,
				buygold_4 = 2000,
				buygold_5 = 5000,
				buygold_6 = 10000
			}
			if #message.data > 0 then
				local item = message.data[#message.data]
				print("KONGREGATE USER ITEM " .. #message.data .. " " .. item.identifier)
				msg.post(controller, "hide_popup")
				msg.post(controller, "gen_rewardpack", { packCards = 0, packGold = buyGoldValue[item.identifier], packXp = 0 })
				html5.run("kongregate.mtx.useItemInstance(" .. item.id .. ", onUseResult);")
			end
		else
			msg.post(controller, "hide_popup")
			print("KONGREGATE RETURN USER ITEMS FAILED")
		end
	elseif message_id == "adsAvailable" then
		print("KONGREGATE AD AVAILABLE")
		showIncentivizedAd()
	elseif message_id == "adsUnavailable" then
		print("KONGREGATE AD UNAVAILABLE")

	elseif message_id == "adOpened" then
		print("KONGREGATE AD OPENED")

	elseif message_id == "adCompleted" then
		print("KONGREGATE AD COMPLETED")


	elseif message_id == "adAbandoned" then
		print("KONGREGATE AD ABANDONED")

	end
end

--[[ Off Kongregate, gold is sold through Stripe. game/store.js does the web
side (OOR_STORE); this keeps the shop's prices from it, starts checkouts and
hands over the gold once a payment is confirmed. Granting waits for the game
to have started, so a purchase confirmed during boot isn't lost. ]]
local STORE_POLL_INTERVAL = 0.5
local store = { started = false, nextPoll = 0 }

local function store_run(js)
	if not html5 then return "" end
	return html5.run("window.OOR_STORE ? " .. js .. " : ''") or ""
end

local function store_products()
	for i = 1, 6 do
		msg.post("main:/menu#shop", "set_product", { product = { name = "BUYGOLD_" .. i .. "_TEXT", description = "BUYGOLD_" .. i .. "_DESC", identifier = "buygold_" .. i, price = store_run("OOR_STORE.price('buygold_" .. i .. "')") } })
	end
end

local function store_poll()
	if not store.started or os.clock() < store.nextPoll then return end
	store.nextPoll = os.clock() + STORE_POLL_INTERVAL
	local event = store_run("OOR_STORE.take()")
	if event == "" then return end
	local ok, data = pcall(json.decode, event)
	if not ok or type(data) ~= "table" then return end
	if data.products then
		store_products()
		return
	end
	msg.post(controller, "hide_popup")
	if data.gold then
		print("STORE: granting " .. data.gold .. " gold")
		msg.post(controller, "gen_rewardpack", { packCards = 0, packGold = data.gold, packXp = 0 })
	elseif data.error then
		msg.post(controller, "popup_message", { title = "SHOP_PURCHASE_FAILED_TITLE", text = "SHOP_PURCHASE_FAILED_MESSAGE" })
	end
end

local function load_Kongregate(self)
	print("KONGREGATE LOAD")
	jstodef.add_listener(jsListener)
	html5.run("loadKongregate();")
end

local messageData = {}
messageData["all"] = {
	["on_start"] = function(message_id, message, sender)
		if jstodef and html5 and isKongregate() then
			print("KONGREGATE START")
			load_Kongregate(message)
		else
			store_products()
		end
	end,
	["show_rewarded_ad"] = function(message_id, message, sender)
		showIncentivizedAd()
	end,
	["reset_statistics"] = function(message_id, message, sender)
		if html5 and isKongregate() then
			print("KONGREGATE RESET STATISTICS")
			html5.run("kongregate.stats.submit('current_chapter', 1);")
		end
	end,
	["start_game"] = function(message_id, message, sender)
		store.started = true
	end,
	["update"] = function(message_id, message, sender)
		store_poll()
	end,
	["purchase_gold"] = function(message_id, message, sender)
		if html5 and not isKongregate() then
			print("STORE: checkout " .. message.identifier)
			msg.post(controller, "popup_loading")
			store_run("OOR_STORE.buy('" .. message.identifier .. "')")
		elseif html5 and isKongregate() then
			if username ~= "Guest" then
				print("KONGREGATE PURCHASE ITEM: " .. message.identifier)
				msg.post(controller, "popup_loading")
				html5.run("kongregate.mtx.purchaseItems(['" .. message.identifier .. "'], onPurchaseResult);")

			else
				html5.run("kongregate.services.showRegistrationBox();")


			end
		end
	end,
	["complete_rank"] = function(message_id, message, sender) 
		if html5 and isKongregate() then 
			print("KONGREGATE COMPLETE CHAPTER: " .. message.rank)
			html5.run("kongregate.stats.submit('current_chapter', " .. message.rank .. ");")
			html5.run("kongregate.stats.submit('max_chapter', " .. message.rank .. ");")
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
