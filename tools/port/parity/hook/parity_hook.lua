-- Parity hook, appended to the render script of the parity variant only
-- (tools/port/parity/build_orig.py). Never shipped.
--
-- Every frame, at the end of the render script's update (the last Lua that
-- runs in an engine frame), it polls window.__parity.cmd() for commands:
--   "state"  serialise the game state and hand it to window.__parity.put(json)
--   "save"   defsave.save_all(true), so localStorage holds the live state
-- The dump is canonical JSON, documented in tools/port/parity/README.md.
--
-- It also routes Lua print to console.log, prefixed "[lua] ".

local parity_html5 = html5

local function parity_js_string(s)
	-- A JS single-quoted string literal carrying the bytes of s.
	s = s:gsub("\\", "\\\\"):gsub("'", "\\'"):gsub("\n", "\\n"):gsub("\r", "\\r")
	s = s:gsub("[%z\1-\31]", function(c) return string.format("\\x%02x", c:byte()) end)
	return "'" .. s .. "'"
end

local function parity_num(n)
	if n ~= n then return "nan" end
	if n == math.huge then return "inf" end
	if n == -math.huge then return "-inf" end
	return string.format("%.17g", n)
end

local function parity_quote(s)
	s = s:gsub('[%c"\\]', function(c)
		if c == '"' then return '\\"' end
		if c == "\\" then return "\\\\" end
		return string.format("\\u%04x", c:byte())
	end)
	return '"' .. s .. '"'
end

local parity_encode
parity_encode = function(v, stack, skip)
	local t = type(v)
	if t == "number" then
		if v ~= v or v == math.huge or v == -math.huge then return parity_quote(parity_num(v)) end
		return parity_num(v)
	elseif t == "string" then
		return parity_quote(v)
	elseif t == "boolean" then
		return tostring(v)
	elseif t == "table" then
		if stack[v] then return '"<cycle>"' end
		if skip[v] then return '"<module>"' end
		stack[v] = true
		local keys, map = {}, {}
		for k, val in pairs(v) do
			local tv = type(val)
			if tv ~= "function" and tv ~= "thread" then
				local tk, ks = type(k), nil
				if tk == "string" then ks = k
				elseif tk == "number" then ks = parity_num(k)
				elseif tk == "boolean" then ks = tostring(k)
				end
				if ks ~= nil and map[ks] == nil then
					keys[#keys + 1] = ks
					map[ks] = val
				end
			end
		end
		table.sort(keys)
		local parts = {}
		for i, ks in ipairs(keys) do
			parts[i] = parity_quote(ks) .. ":" .. parity_encode(map[ks], stack, skip)
		end
		stack[v] = nil
		return "{" .. table.concat(parts, ",") .. "}"
	else
		-- userdata (vmath, hash, url): its tostring
		return parity_quote(tostring(v))
	end
end

-- Constants that are wiring, not state: handler tables, message URLs.
local PARITY_SKIP_LOCALS = { messageData = true, controller = true, productName = true, isDebug = true }

-- Functions stored anywhere inside a table (dispatch tables of handlers).
local function parity_functions_in(t, queue, seen)
	if seen[t] then return end
	seen[t] = true
	for _, v in pairs(t) do
		if type(v) == "function" then queue[#queue + 1] = v
		elseif type(v) == "table" then parity_functions_in(v, queue, seen) end
	end
end

-- Module-level locals of a controller: every upvalue reachable from the
-- functions it exports (and the functions those reach), by name.
local function parity_locals(M, skip)
	local out, seen = {}, {}
	local queue = {}
	for _, f in pairs(M) do
		if type(f) == "function" then queue[#queue + 1] = f end
	end
	while #queue > 0 do
		local f = table.remove(queue, 1)
		if not seen[f] then
			seen[f] = true
			local i = 1
			while true do
				local name, val = debug.getupvalue(f, i)
				if name == nil then break end
				local tv = type(val)
				if tv == "function" then
					queue[#queue + 1] = val
				elseif val ~= M and not (tv == "table" and skip[val]) and not PARITY_SKIP_LOCALS[name] then
					if tv == "table" then parity_functions_in(val, queue, {}) end
					if out[name] == nil then out[name] = val end
				end
				i = i + 1
			end
		end
	end
	-- non-function fields of the module table itself
	for k, v in pairs(M) do
		if type(v) ~= "function" and type(k) == "string" and out[k] == nil then out[k] = v end
	end
	return out
end

local PARITY_CONTROLLERS = {
	gear = "controllers.gearController",
	henchmen = "controllers.henchmenController",
	hero = "controllers.heroController",
	loot = "controllers.lootController",
	map = "controllers.mapController",
	navigation = "controllers.navigationController",
	rep = "controllers.repController",
	vault = "controllers.vaultController",
}

local function parity_defsave()
	for name, m in pairs(package.loaded) do
		if type(m) == "table" and type(m.loaded) == "table" and type(m.get_file_path) == "function"
			and m.appname == "out_of_ruin" then
			return m
		end
	end
end

local function parity_state()
	local skip = {}
	for _, m in pairs(package.loaded) do
		if type(m) == "table" then skip[m] = true end
	end
	skip[_G] = true
	local state = { save = {}, controllers = {} }
	local defsave = parity_defsave()
	if defsave then
		for file, entry in pairs(defsave.loaded) do
			state.save[file] = entry.data
		end
	end
	for short, name in pairs(PARITY_CONTROLLERS) do
		local M = package.loaded[name]
		if type(M) == "table" then state.controllers[short] = parity_locals(M, skip) end
	end
	-- the state table itself is not a module; tables inside it may be
	-- defsave data, which is not a module either
	return parity_encode(state, {}, skip)
end

if parity_html5 then
	local lua_print = print
	print = function(...)
		local n = select("#", ...)
		local parts = {}
		for i = 1, n do parts[i] = tostring((select(i, ...))) end
		parity_html5.run("console.log(" .. parity_js_string("[lua] " .. table.concat(parts, "\t")) .. ")")
	end
end

local parity_render_update = update
function update(self, dt)
	parity_render_update(self, dt)
	if not parity_html5 then return end
	local cmd = parity_html5.run("(window.__parity && window.__parity.cmd()) || ''")
	if cmd == "" then return end
	if cmd:find("save", 1, true) then
		local defsave = parity_defsave()
		if defsave then defsave.save_all(true) end
	end
	if cmd:find("state", 1, true) then
		parity_html5.run("window.__parity.put(" .. parity_js_string(parity_state()) .. ")")
	end
end
