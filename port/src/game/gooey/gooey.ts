// gooey/gooey.lua
import { gui, msg } from '../../engine';
import { t, len } from '../../lua';
import { G } from '../globals';
import core from './internal/core';
import checkbox from './internal/checkbox';
import button from './internal/button';
import radio from './internal/radio';
import list from './internal/list';
import input from './internal/input';
import scrollbar from './internal/scrollbar';

const M: any = {};

const groups: Record<string, any> = {};
let current_group: any = undefined;

M.is_enabled = function (node: any) {
  return core.is_enabled(node);
};

M.acquire_input = function () {
  msg.post(".", "acquire_input_focus");
};

M.release_input = function () {
  msg.post(".", "release_input_focus");
};

M.create_theme = function () {
  const theme: any = {};

  theme.is_enabled = function (component: any) {
    if (t(component.node)) {
      return M.is_enabled(component.node);
    }
  };

  theme.set_enabled = function (component: any, enabled: any) {
    if (t(component.node)) {
      gui.set_enabled(component.node, enabled);
    }
  };

  theme.acquire_input = M.acquire_input;
  theme.release_input = M.release_input;

  theme.group = M.group;

  return theme;
};

M.mask_text = function (text: any, mask?: any) {
  return input.mask_text(text, mask);
};

M.button = function (node_id: any, action_id: any, action: any, fn: any, refresh_fn?: any) {
  const b = button.button(node_id, action_id, action, fn, refresh_fn);
  if (t(current_group)) {
    current_group.components[len(current_group.components)] = b;
  }
  return b;
};

M.checkbox = function (node_id: any, action_id: any, action: any, fn: any, refresh_fn?: any) {
  const c = checkbox.checkbox(node_id, action_id, action, fn, refresh_fn);
  if (t(current_group)) {
    current_group.components[len(current_group.components)] = c;
  }
  return c;
};

M.radiogroup = function (group_id: any, action_id: any, action: any, fn: any) {
  // `refresh_fn` is an undefined global here (nil)
  return radio.group(group_id, action_id, action, fn, G.refresh_fn);
};

M.radio = function (node_id: any, group_id: any, action_id: any, action: any, fn: any, refresh_fn?: any) {
  const r = radio.button(node_id, group_id, action_id, action, fn, refresh_fn);
  if (t(current_group)) {
    current_group.components[len(current_group.components)] = r;
  }
  return r;
};

M.static_list = function (list_id: any, stencil_id: any, item_ids: any, action_id: any, action: any, config: any, fn: any, refresh_fn?: any) {
  const l = list.static(list_id, stencil_id, item_ids, action_id, action, config, fn, refresh_fn);
  if (t(current_group)) {
    current_group.components[len(current_group.components)] = l;
  }
  return l;
};

M.horizontal_static_list = function (list_id: any, stencil_id: any, item_ids: any, action_id: any, action: any, config: any, fn: any, refresh_fn?: any) {
  config = t(config) ? config : {};
  config.horizontal = true;
  return M.static_list(list_id, stencil_id, item_ids, action_id, action, config, fn, refresh_fn);
};

M.vertical_static_list = function (list_id: any, stencil_id: any, item_ids: any, action_id: any, action: any, config: any, fn: any, refresh_fn?: any) {
  return M.static_list(list_id, stencil_id, item_ids, action_id, action, config, fn, refresh_fn);
};

M.dynamic_list = function (list_id: any, stencil_id: any, item_id: any, data: any, action_id: any, action: any, config: any, fn: any, refresh_fn?: any) {
  const l = list.dynamic(list_id, stencil_id, item_id, data, action_id, action, config, fn, refresh_fn);
  if (t(current_group)) {
    current_group.components[len(current_group.components)] = l;
  }
  return l;
};

M.horizontal_dynamic_list = function (list_id: any, stencil_id: any, item_id: any, data: any, action_id: any, action: any, config: any, fn: any, refresh_fn?: any) {
  config = t(config) ? config : {};
  config.horizontal = true;
  return M.dynamic_list(list_id, stencil_id, item_id, data, action_id, action, config, fn, refresh_fn);
};

M.vertical_dynamic_list = function (list_id: any, stencil_id: any, item_id: any, data: any, action_id: any, action: any, config: any, fn: any, refresh_fn?: any) {
  return M.dynamic_list(list_id, stencil_id, item_id, data, action_id, action, config, fn, refresh_fn);
};

M.vertical_scrollbar = function (handle_id: any, bounds_id: any, action_id: any, action: any, config: any, fn: any, refresh_fn?: any) {
  // scrollbar.vertical takes (handle_id, bounds_id, action_id, action, fn, refresh_fn):
  // config lands in its fn and fn in its refresh_fn; refresh_fn is dropped, as in the Lua.
  void refresh_fn;
  const sb = scrollbar.vertical(handle_id, bounds_id, action_id, action, config, fn);
  if (t(current_group)) {
    current_group.components[len(current_group.components)] = sb;
  }
  return sb;
};

M.input = function (node_id: any, keyboard_type: any, action_id: any, action: any, config: any, refresh_fn?: any) {
  const i = input.input(node_id, keyboard_type, action_id, action, config, refresh_fn);
  if (t(current_group)) {
    current_group.components[len(current_group.components)] = i;
  }
  return i;
};

M.group = function (id: any, fn: any) {
  if (!t(id)) throw new Error("You must provide a group id");
  if (!t(fn)) throw new Error("You must provide a group function");
  groups[id] = t(groups[id]) ? groups[id] : { consumed: false, components: [] };
  const group = groups[id];

  current_group = group;
  fn();
  current_group = undefined;

  const components = group.components;
  let consumed: any = false;
  const n = len(components);
  for (let i = 1; i <= n; i++) {
    consumed = t(components[i - 1].consumed) ? components[i - 1].consumed : consumed;
    components[i - 1] = undefined;
  }
  group.consumed = consumed;
  return group;
};

export default M;
