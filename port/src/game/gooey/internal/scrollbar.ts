// gooey/internal/scrollbar.lua
import { gui, vmath } from '../../../engine';
import { t, tracked } from '../../../lua';
import { G } from '../../globals';
import core from './core';

const M: any = {};

const scrollbars = tracked({});

const SCROLLBAR: any = {};
SCROLLBAR.refresh = function (scrollbar: any) {
  // `button` is an undefined global in the Lua, so refresh_fn receives nil.
  if (t(scrollbar.refresh_fn)) scrollbar.refresh_fn(G.button);
};
SCROLLBAR.scroll_to = function (scrollbar: any, x: any, y: any) {
  if (!t(scrollbar)) throw new Error('assertion failed!');
  if (!t(x)) throw new Error('assertion failed!');
  if (!t(y)) throw new Error('assertion failed!');
  const handle_pos = gui.get_position(scrollbar.node);

  x = core.clamp(x, 0, 1);
  y = core.clamp(y, 0, 1);
  if (t(scrollbar.vertical)) {
    const adjusted_height = (scrollbar.bounds_size.y - scrollbar.handle_size.y);
    const offset_y = t(scrollbar.vertical) ? (scrollbar.handle_size.y / 2) : 0;
    handle_pos.y = offset_y + adjusted_height - y * adjusted_height;
  } else {
    const adjusted_width = (scrollbar.bounds_size.x - scrollbar.handle_size.x);
    const offset_x = t(scrollbar.vertical) ? 0 : (scrollbar.handle_size.x / 2);
    handle_pos.x = offset_x + adjusted_width - x * adjusted_width;
  }
  gui.set_position(scrollbar.node, handle_pos);
  scrollbar.scroll.y = y;
};
SCROLLBAR.set_visible = function (scrollbar: any, visible: any) {
  gui.set_enabled(scrollbar.node, visible);
};
SCROLLBAR.set_long_pressed_time = function (scrollbar: any, time: any) {
  scrollbar.long_pressed_time = time;
};

M.vertical = function (handle_id: any, bounds_id: any, action_id: any, action: any, fn: any, refresh_fn?: any) {
  handle_id = core.to_hash(handle_id);
  bounds_id = core.to_hash(bounds_id);
  const handle = gui.get_node(handle_id);
  const bounds = gui.get_node(bounds_id);
  if (!t(handle)) throw new Error('assertion failed!');
  if (!t(bounds)) throw new Error('assertion failed!');
  const [scrollbar] = core.instance(handle_id, scrollbars, SCROLLBAR);
  scrollbar.scroll = t(scrollbar.scroll) ? scrollbar.scroll : vmath.vector3(0, 0, 0);
  scrollbar.vertical = true;

  const handle_size = gui.get_size(handle);
  const bounds_size = gui.get_size(bounds);

  scrollbar.enabled = core.is_enabled(handle);
  scrollbar.node = handle;
  scrollbar.bounds = bounds;
  scrollbar.bounds_size = bounds_size;
  scrollbar.handle_size = handle_size;

  if (t(action)) {
    scrollbar.refresh_fn = refresh_fn;

    const action_pos = vmath.vector3(action.x, action.y, 0);

    core.clickable(scrollbar, action_id, action);
    if (t(scrollbar.pressed_now) || t(scrollbar.pressed)) {
      const bounds_pos = core.get_root_position(bounds);
      const size = bounds_size.y - handle_size.y;
      const ratio = (size - (action_pos.y - bounds_pos.y - (scrollbar.handle_size.y / 2))) / size;
      SCROLLBAR.scroll_to(scrollbar, 0, ratio);
      fn(scrollbar);
    }
  } else {
    SCROLLBAR.scroll_to(scrollbar, 0, scrollbar.scroll.y);
  }

  scrollbar.refresh();
  return scrollbar;
};

// setmetatable(M, { __call = M.scrollbar }): M.scrollbar is nil in the Lua, so calling the module errors.
export default M;
