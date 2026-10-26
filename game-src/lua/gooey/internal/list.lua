local core = require "gooey.internal.core"
local actions = require "gooey.actions"

local M = {}

local static_lists = {}
local dynamic_lists = {}



-- Lists with config.row_height lay rows out by their own heights. A row
-- shorter than the item template is a gap: its item stays hidden and untappable.
local function row_is_gap(list, index)
	return list.row_tops ~= nil and list.data[index] ~= nil
		and list.row_tops[index + 1] - list.row_tops[index] < list.item_size.y
end

local function update_variable_listitem_positions(list)
	local tops, count = list.row_tops, #list.data
	local scroll = list.scroll_pos.y
	local first_index = 1
	while first_index < count and tops[first_index + 1] <= scroll do first_index = first_index + 1 end
	for i=1,#list.items do
		local item = list.items[i]
		local index = first_index + i - 1
		item.index = index
		gui.set_enabled(item.root, index <= count and not row_is_gap(list, index))
		local top = tops[index] or (tops[count + 1] + (index - count - 1) * list.item_size.y)
		local item_pos = gui.get_position(item.root)
		item_pos.y = list.first_item_pos.y + scroll - top
		gui.set_position(item.root, item_pos)
	end
end

local function update_dynamic_listitem_positions(list)
	if list.row_tops then return update_variable_listitem_positions(list) end
	local top_i, top_y, top_x
	if list.horizontal then
		top_i = list.scroll_pos.x / list.item_size.x
		top_x = list.scroll_pos.x % list.item_size.x
	else
		top_i = list.scroll_pos.y / list.item_size.y
		top_y = list.scroll_pos.y % list.item_size.y
	end
	local first_index = 1 + math.floor(top_i)
	for i=1,#list.items do
		local item = list.items[i]
		local item_pos = gui.get_position(item.root)
		local index = first_index + i - 1
		-- Only a carousel wraps round to the start. Other lists can scroll into
		-- their end padding, where the rows past the last item stay hidden.
		if list.carousel then
			item.index = ((index - 1) % #list.data) + 1
		else
			item.index = index
			gui.set_enabled(item.root, index <= #list.data)
		end
		if list.horizontal then
			item_pos.x = list.first_item_pos.x - (list.item_size.x * (i - 1)) + top_x
		else
			item_pos.y = list.first_item_pos.y - (list.item_size.y * (i - 1)) + top_y
		end
		gui.set_position(item.root, item_pos)
	end
end


local function update_dynamic_listitem_data(list)
	for i=1,#list.items do
		local item = list.items[i]
		item.data = list.data[item.index] or nil
	end
end

local function update_static_listitems(items, start, horizontal)
	local item_pos = start
	for i=1,#items do
		local item = items[i]
		if horizontal then
			item_pos.x = item_pos.x - item.size.x / 2
			gui.set_position(item.root, item_pos)
			item_pos.x = item_pos.x - item.size.x / 2
		else
			item_pos.y = item_pos.y - item.size.y / 2
			gui.set_position(item.root, item_pos)
			item_pos.y = item_pos.y - item.size.y / 2
		end
	end
end



local LIST = {}
function LIST.refresh(list)
	if list.refresh_fn then list.refresh_fn(list) end
end
function LIST.set_visible(list, visible)
	gui.set_enabled(list.node, visible)
end
function LIST.scroll_to(list, x, y)
	list.consumed = true
	list.scrolling = true

	if list.horizontal then
		list.scroll_pos.x = list.min_x + (list.max_x - list.min_x) * x
		list.scroll.x = x
	else
		list.scroll_pos.y = list.min_y + (list.max_y - list.min_y) * y
		list.scroll.y = y
	end
	if list.static then
		update_static_listitems(list.items, vmath.vector3(list.scroll_pos), list.horizontal)
	elseif list.dynamic then
		update_dynamic_listitem_positions(list)
		update_dynamic_listitem_data(list)
	end
end
function LIST.set_long_pressed_time(list, time)
	list.long_pressed_time = time
end
function LIST.set_carousel(list)
	list.carousel = true
end


local function get_instance(list_id, stencil_id, refresh_fn, lists)
	stencil_id = core.to_hash(stencil_id)
	local list = core.instance(stencil_id, lists, LIST)
	list.id = list_id
	list.scroll = list.scroll or vmath.vector3()
	list.stencil = list.stencil or gui.get_node(stencil_id)
	list.stencil_size = list.stencil_size or gui.get_size(list.stencil)
	list.refresh_fn = refresh_fn
	list.enabled = core.is_enabled(list.stencil)
	return list
end


local function handle_input(list, action_id, action, click_fn)
	local over_stencil = gui.pick_node(list.stencil, action.x, action.y)

	local touch = action_id == actions.TOUCH
	local scroll_up = action_id == actions.SCROLL_UP
	local scroll_down = action_id == actions.SCROLL_DOWN
	local pressed = touch and action.pressed and over_stencil
	local released = touch and action.released
	local action_pos = vmath.vector3(action.x, action.y, 0)
	if pressed then
		list.pressed_pos = action_pos
		list.action_pos = action_pos
		list.pressed = true
		list.have_scrolled = false
	elseif released then
		list.pressed = false
	end
	list.consumed = false


	if over_stencil and (scroll_up or scroll_down) and not action.released then
		list.consumed = true
		list.scrolling = true

		-- A wheel tick moves half a row, or a fifth of the visible area for
		-- lists whose rows are small. Scrolling up walks towards the start of
		-- the data, which is where scroll_pos is smallest.
		local item_size = list.item_size or (list.items[1] and list.items[1].size) or vmath.vector3()
		local direction = scroll_up and -1 or 1
		if list.horizontal then
			list.scroll_pos.x = list.scroll_pos.x + direction * math.max(item_size.x / 2, list.stencil_size.x / 5)
		else
			list.scroll_pos.y = list.scroll_pos.y + direction * math.max(item_size.y / 2, list.stencil_size.y / 5)
		end
		list.have_scrolled = true

	elseif list.pressed and vmath.length(list.pressed_pos - action_pos) > 10 then
		list.have_scrolled = true
		list.consumed = true
		list.scrolling = true
		if list.horizontal then
			list.scroll_pos.x = list.scroll_pos.x + (action_pos.x - list.action_pos.x)
		else
			list.scroll_pos.y = list.scroll_pos.y + (action_pos.y - list.action_pos.y)
		end
		list.action_pos = action_pos
	else
		list.scrolling = false
	end

	if list.scrolling and not list.carousel then
		if list.horizontal then
			list.scroll_pos.x = math.min(list.scroll_pos.x, list.max_x)
			list.scroll_pos.x = math.max(list.scroll_pos.x, list.min_x)
			list.scroll.x = (list.scroll_pos.x / list.max_x)
		else
			list.scroll_pos.y = math.min(list.scroll_pos.y, list.max_y)
			list.scroll_pos.y = math.max(list.scroll_pos.y, list.min_y)
			list.scroll.y = (list.scroll_pos.y / list.max_y)
		end
	end


	local over_item
	for i=1,#list.items do
		local item = list.items[i]
		if gui.is_enabled(item.root) and gui.pick_node(item.root, action.x, action.y) then
			list.consumed = true
			over_item = item.index
			break
		end
	end


	list.out_item_now = (list.over_item ~= over_item) and list.over_item or nil
	list.over_item_now = (list.over_item_now ~= list.over_item) and over_item or nil
	list.over_item = over_item


	list.released_item_now = nil
	list.pressed_item_now = nil
	if released then
		list.released_item_now = list.pressed_item
		list.pressed_item = nil
	end
	if pressed and list.pressed_item_now ~= over_item then
		list.pressed_item_now = over_item
		list.pressed_item = over_item
	else
		list.pressed_item_now = nil
	end
	if list.released_item_now then
		if not list.have_scrolled and list.released_item_now == over_item then
			list.selected_item = list.released_item_now
			click_fn(list)
		end
	end
end



function M.static(list_id, stencil_id, item_ids, action_id, action, config, fn, refresh_fn)
	local list = get_instance(list_id, stencil_id, refresh_fn, static_lists)
	list.static = true
	list.horizontal = config and config.horizontal
	list.carousel = config and config.carousel
	assert(not list.carousel, "You cannot create a carousel from a static list")


	if not list.items then
		list.items = {}
		for i,item_id in ipairs(item_ids) do
			local node = gui.get_node(item_id)
			list.items[i] = {
				root = node,
				nodes = { [core.to_hash(item_id)] = node },
				index = i,
				size = gui.get_size(node),
			}
			gui.set_parent(node, list.stencil)
		end
		update_static_listitems(list.items, vmath.vector3(0), list.horizontal)

		local last_item = list.items[#list.items].root
		local total_dimension, list_dimension
		if list.horizontal then
			total_dimension = last_item and (math.abs(gui.get_position(last_item).x) + gui.get_size(last_item).x / 2) or 0
			list_dimension = gui.get_size(list.stencil).x
			list.min_x = 0
			list.max_x = total_dimension - list_dimension
		else
			total_dimension = last_item and (math.abs(gui.get_position(last_item).y) + gui.get_size(last_item).y / 2) or 0
			list_dimension = gui.get_size(list.stencil).y
			list.min_y = 0
			list.max_y = total_dimension - list_dimension
		end

		list.scroll_pos = vmath.vector3(0)
	end

	if #list.items == 0 then
		if refresh_fn then refresh_fn(list) end
		return list
	end

	if not action_id and not action then
		if refresh_fn then refresh_fn(list) end
		return list
	end

	if list.enabled then
		handle_input(list, action_id, action, fn)


		if list.scrolling then
			update_static_listitems(list.items, vmath.vector3(list.scroll_pos), list.horizontal)
		end
	end
	if refresh_fn then refresh_fn(list) end
	return list
end



function M.dynamic(list_id, stencil_id, item_id, data, action_id, action, config, fn, refresh_fn)

	local list = get_instance(list_id, stencil_id, refresh_fn, dynamic_lists)
	list.dynamic = true
	list.horizontal = config and config.horizontal
	list.carousel = config and config.carousel
	-- Extra scroll room past the last item, for content drawn below it
	list.end_padding = config and config.end_padding or 0
	list.row_height = config and config.row_height
	list.data = data


	if not list.items then
		item_id = core.to_hash(item_id)
		local item_node = gui.get_node(item_id)
		local item_pos = gui.get_position(item_node)
		local item_size = gui.get_size(item_node)
		list.items = {}
		list.item_size = item_size
		list.scroll_pos = vmath.vector3(0)
		list.first_item_pos = vmath.vector3(item_pos)
		list.data_size = nil

		local item_count
		if list.horizontal then
			item_count = (math.ceil(list.stencil_size.x / item_size.x) + 1)
		else
			item_count = (math.ceil(list.stencil_size.y / item_size.y) + 1)
		end
		-- Short rows let more of them show at once.
		item_count = item_count + (config and config.spare_items or 0)
		for i=1,item_count do
			local nodes = gui.clone_tree(item_node)
			list.items[i] = {
				root = nodes[item_id],
				nodes = nodes,
				index = i,
				size = gui.get_size(nodes[item_id]),
				data = data[i] or ""
			}
			local pos
			if list.horizontal then
				pos = (item_pos - vmath.vector3(item_size.x * (i - 1), 0, 0))
			else
				pos = (item_pos - vmath.vector3(0, item_size.y * (i - 1), 0))
			end
			gui.set_position(list.items[i].root, pos)
		end
		gui.delete_node(item_node)
	end



	-- Row heights can change without the row count changing, so lay them out on every call.
	local layout_changed = false
	if list.row_height and not list.horizontal then
		local tops, top = {}, 0
		for i=1,#data do
			tops[i] = top
			top = top + list.row_height(data[i], i)
		end
		tops[#data + 1] = top
		local old = list.row_tops
		layout_changed = not old or #old ~= #tops or old[#old] ~= top
		list.row_tops = tops
	else
		list.row_tops = nil
	end

	local data_size_changed = list.data_size ~= #data or layout_changed
	if not list.data_size or data_size_changed then
		list.data_size = #data
		list.min_y = 0
		list.min_x = 0
		local length_y = list.row_tops and list.row_tops[#data + 1] or (#data * list.item_size.y)
		list.max_y = length_y + list.end_padding - list.stencil_size.y
		list.max_x = (#data * list.item_size.x) + list.end_padding - list.stencil_size.x
		list.selected_item = nil


		if #data < #list.items then
			for i=1,#list.items do
				local item = list.items[i]
				item.index = i
				gui.set_enabled(item.root, (i <= #data))
			end
			list.scroll_pos.y = 0
			list.scroll_pos.x = 0
			update_dynamic_listitem_positions(list)


		else
			local first_index = list.items[1].index
			if (first_index + #list.items) > #data then
				first_index = #data - #list.items + 1
			end
			for i=1,#list.items do
				local item = list.items[i]
				item.index = first_index + i -1
				gui.set_enabled(item.root, true)
			end
			if not list.carousel then
				list.scroll_pos.y = math.max(list.min_y, math.min(list.scroll_pos.y, math.max(list.min_y, list.max_y)))
				list.scroll_pos.x = math.max(list.min_x, math.min(list.scroll_pos.x, math.max(list.min_x, list.max_x)))
				update_dynamic_listitem_positions(list)
			end
		end
	end


	if list.data_size == 0 then
		if refresh_fn then refresh_fn(list) end
		return list
	end

	if list.enabled and (action_id or action) then
		handle_input(list, action_id, action, fn)


		if list.scrolling then
			update_dynamic_listitem_positions(list)
		end
	end

	update_dynamic_listitem_data(list)

	if refresh_fn then refresh_fn(list) end

	return list
end

setmetatable(M, {
	__call = function(_, ...)
		return M.static(...)
	end
})

return M
