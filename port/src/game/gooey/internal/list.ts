// gooey/internal/list.lua
import { gui, vmath } from '../../../engine';
import { t, tracked, len, M as LM } from '../../../lua';
import core from './core';
import actions from '../actions';

const M: any = {};

const static_lists = tracked({});
const dynamic_lists = tracked({});

const land = (a: any, b: any) => (t(a) ? b : a);

// Lists with config.row_height lay rows out by their own heights. A row
// shorter than the item template is a gap: its item stays hidden and untappable.
function row_is_gap(list: any, index: any): boolean {
  return (list.row_tops !== undefined && list.row_tops !== null) && (list.data[index - 1] !== undefined && list.data[index - 1] !== null)
    && list.row_tops[index + 1 - 1] - list.row_tops[index - 1] < list.item_size.y;
}

function update_variable_listitem_positions(list: any) {
  const tops = list.row_tops, count = len(list.data);
  const scroll = list.scroll_pos.y;
  let first_index = 1;
  while (first_index < count && tops[first_index + 1 - 1] <= scroll) first_index = first_index + 1;
  const n = len(list.items);
  for (let i = 1; i <= n; i++) {
    const item = list.items[i - 1];
    const index = first_index + i - 1;
    item.index = index;
    gui.set_enabled(item.root, index <= count && !row_is_gap(list, index));
    const tv = tops[index - 1];
    const top = (tv !== undefined && tv !== null) ? tv : (tops[count + 1 - 1] + (index - count - 1) * list.item_size.y);
    const item_pos = gui.get_position(item.root);
    item_pos.y = list.first_item_pos.y + scroll - top;
    gui.set_position(item.root, item_pos);
  }
}

function update_dynamic_listitem_positions(list: any) {
  if (t(list.row_tops)) return update_variable_listitem_positions(list);
  let top_i: any, top_y: any, top_x: any;
  if (t(list.horizontal)) {
    top_i = list.scroll_pos.x / list.item_size.x;
    top_x = LM.mod(list.scroll_pos.x, list.item_size.x);
  } else {
    top_i = list.scroll_pos.y / list.item_size.y;
    top_y = LM.mod(list.scroll_pos.y, list.item_size.y);
  }
  const first_index = 1 + Math.floor(top_i);
  const n = len(list.items);
  for (let i = 1; i <= n; i++) {
    const item = list.items[i - 1];
    const item_pos = gui.get_position(item.root);
    const index = first_index + i - 1;
    // Only a carousel wraps round to the start. Other lists can scroll into
    // their end padding, where the rows past the last item stay hidden.
    if (t(list.carousel)) {
      item.index = LM.mod(index - 1, len(list.data)) + 1;
    } else {
      item.index = index;
      gui.set_enabled(item.root, index <= len(list.data));
    }
    if (t(list.horizontal)) {
      item_pos.x = list.first_item_pos.x - (list.item_size.x * (i - 1)) + top_x;
    } else {
      item_pos.y = list.first_item_pos.y - (list.item_size.y * (i - 1)) + top_y;
    }
    gui.set_position(item.root, item_pos);
  }
}

function update_dynamic_listitem_data(list: any) {
  const n = len(list.items);
  for (let i = 1; i <= n; i++) {
    const item = list.items[i - 1];
    const v = list.data[item.index - 1];
    item.data = t(v) ? v : undefined;
  }
}

function update_static_listitems(items: any[], start: any, horizontal: any) {
  const item_pos = start;
  const n = len(items);
  for (let i = 1; i <= n; i++) {
    const item = items[i - 1];
    if (t(horizontal)) {
      item_pos.x = item_pos.x - item.size.x / 2;
      gui.set_position(item.root, item_pos);
      item_pos.x = item_pos.x - item.size.x / 2;
    } else {
      item_pos.y = item_pos.y - item.size.y / 2;
      gui.set_position(item.root, item_pos);
      item_pos.y = item_pos.y - item.size.y / 2;
    }
  }
}

const LIST: any = {};
LIST.refresh = function (list: any) {
  if (t(list.refresh_fn)) list.refresh_fn(list);
};
LIST.set_visible = function (list: any, visible: any) {
  gui.set_enabled(list.node, visible);
};
LIST.scroll_to = function (list: any, x: any, y: any) {
  list.consumed = true;
  list.scrolling = true;

  if (t(list.horizontal)) {
    list.scroll_pos.x = list.min_x + (list.max_x - list.min_x) * x;
    list.scroll.x = x;
  } else {
    list.scroll_pos.y = list.min_y + (list.max_y - list.min_y) * y;
    list.scroll.y = y;
  }
  if (t(list.static)) {
    update_static_listitems(list.items, vmath.vector3(list.scroll_pos), list.horizontal);
  } else if (t(list.dynamic)) {
    update_dynamic_listitem_positions(list);
    update_dynamic_listitem_data(list);
  }
};
LIST.set_long_pressed_time = function (list: any, time: any) {
  list.long_pressed_time = time;
};
LIST.set_carousel = function (list: any) {
  list.carousel = true;
};

function get_instance(list_id: any, stencil_id: any, refresh_fn: any, lists: any) {
  stencil_id = core.to_hash(stencil_id);
  const [list] = core.instance(stencil_id, lists, LIST);
  list.id = list_id;
  list.scroll = t(list.scroll) ? list.scroll : vmath.vector3();
  list.stencil = t(list.stencil) ? list.stencil : gui.get_node(stencil_id);
  list.stencil_size = t(list.stencil_size) ? list.stencil_size : gui.get_size(list.stencil);
  list.refresh_fn = refresh_fn;
  list.enabled = core.is_enabled(list.stencil);
  return list;
}

function handle_input(list: any, action_id: any, action: any, click_fn: any) {
  const over_stencil = gui.pick_node(list.stencil, action.x, action.y);

  const touch = action_id === actions.TOUCH;
  const scroll_up = action_id === actions.SCROLL_UP;
  const scroll_down = action_id === actions.SCROLL_DOWN;
  const pressed = land(land(touch, action.pressed), over_stencil);
  const released = land(touch, action.released);
  const action_pos = vmath.vector3(action.x, action.y, 0);
  if (t(pressed)) {
    list.pressed_pos = action_pos;
    list.action_pos = action_pos;
    list.pressed = true;
    list.have_scrolled = false;
  } else if (t(released)) {
    list.pressed = false;
  }
  list.consumed = false;

  if (over_stencil && (scroll_up || scroll_down) && !t(action.released)) {
    list.consumed = true;
    list.scrolling = true;

    // A wheel tick moves half a row, or a fifth of the visible area for
    // lists whose rows are small. Scrolling up walks towards the start of
    // the data, which is where scroll_pos is smallest.
    let item_size: any;
    if (t(list.item_size)) item_size = list.item_size;
    else if (t(list.items[0]) && t(list.items[0].size)) item_size = list.items[0].size;
    else item_size = vmath.vector3();
    const direction = scroll_up ? -1 : 1;
    if (t(list.horizontal)) {
      list.scroll_pos.x = list.scroll_pos.x + direction * Math.max(item_size.x / 2, list.stencil_size.x / 5);
    } else {
      list.scroll_pos.y = list.scroll_pos.y + direction * Math.max(item_size.y / 2, list.stencil_size.y / 5);
    }
    list.have_scrolled = true;
  } else if (t(list.pressed) && vmath.length(vmath.sub(list.pressed_pos, action_pos)) > 10) {
    list.have_scrolled = true;
    list.consumed = true;
    list.scrolling = true;
    if (t(list.horizontal)) {
      list.scroll_pos.x = list.scroll_pos.x + (action_pos.x - list.action_pos.x);
    } else {
      list.scroll_pos.y = list.scroll_pos.y + (action_pos.y - list.action_pos.y);
    }
    list.action_pos = action_pos;
  } else {
    list.scrolling = false;
  }

  if (t(list.scrolling) && !t(list.carousel)) {
    if (t(list.horizontal)) {
      list.scroll_pos.x = Math.min(list.scroll_pos.x, list.max_x);
      list.scroll_pos.x = Math.max(list.scroll_pos.x, list.min_x);
      list.scroll.x = (list.scroll_pos.x / list.max_x);
    } else {
      list.scroll_pos.y = Math.min(list.scroll_pos.y, list.max_y);
      list.scroll_pos.y = Math.max(list.scroll_pos.y, list.min_y);
      list.scroll.y = (list.scroll_pos.y / list.max_y);
    }
  }

  let over_item: any;
  const n = len(list.items);
  for (let i = 1; i <= n; i++) {
    const item = list.items[i - 1];
    if (gui.is_enabled(item.root) && gui.pick_node(item.root, action.x, action.y)) {
      list.consumed = true;
      over_item = item.index;
      break;
    }
  }

  list.out_item_now = (list.over_item !== over_item) && t(list.over_item) ? list.over_item : undefined;
  list.over_item_now = (list.over_item_now !== list.over_item) && t(over_item) ? over_item : undefined;
  list.over_item = over_item;

  list.released_item_now = undefined;
  list.pressed_item_now = undefined;
  if (t(released)) {
    list.released_item_now = list.pressed_item;
    list.pressed_item = undefined;
  }
  if (t(pressed) && list.pressed_item_now !== over_item) {
    list.pressed_item_now = over_item;
    list.pressed_item = over_item;
  } else {
    list.pressed_item_now = undefined;
  }
  if (t(list.released_item_now)) {
    if (!t(list.have_scrolled) && list.released_item_now === over_item) {
      list.selected_item = list.released_item_now;
      click_fn(list);
    }
  }
}

M.static = function (list_id: any, stencil_id: any, item_ids: any[], action_id: any, action: any, config: any, fn: any, refresh_fn?: any) {
  const list = get_instance(list_id, stencil_id, refresh_fn, static_lists);
  list.static = true;
  list.horizontal = t(config) ? config.horizontal : config;
  list.carousel = t(config) ? config.carousel : config;
  if (t(list.carousel)) throw new Error("You cannot create a carousel from a static list");

  if (!t(list.items)) {
    list.items = [];
    for (let i = 1; i <= len(item_ids); i++) {
      const item_id = item_ids[i - 1];
      const node = gui.get_node(item_id);
      const nodes: any = {};
      nodes[core.to_hash(item_id)] = node;
      list.items[i - 1] = {
        root: node,
        nodes: nodes,
        index: i,
        size: gui.get_size(node),
      };
      gui.set_parent(node, list.stencil);
    }
    update_static_listitems(list.items, vmath.vector3(0), list.horizontal);

    // list.items[#list.items] errors in Lua when there are no items; items[-1] is undefined here and throws the same way.
    const last_item = list.items[len(list.items) - 1].root;
    let total_dimension: any, list_dimension: any;
    if (t(list.horizontal)) {
      total_dimension = t(last_item) ? (Math.abs(gui.get_position(last_item).x) + gui.get_size(last_item).x / 2) : 0;
      list_dimension = gui.get_size(list.stencil).x;
      list.min_x = 0;
      list.max_x = total_dimension - list_dimension;
    } else {
      total_dimension = t(last_item) ? (Math.abs(gui.get_position(last_item).y) + gui.get_size(last_item).y / 2) : 0;
      list_dimension = gui.get_size(list.stencil).y;
      list.min_y = 0;
      list.max_y = total_dimension - list_dimension;
    }

    list.scroll_pos = vmath.vector3(0);
  }

  if (len(list.items) === 0) {
    if (t(refresh_fn)) refresh_fn(list);
    return list;
  }

  if (!t(action_id) && !t(action)) {
    if (t(refresh_fn)) refresh_fn(list);
    return list;
  }

  if (t(list.enabled)) {
    handle_input(list, action_id, action, fn);

    if (t(list.scrolling)) {
      update_static_listitems(list.items, vmath.vector3(list.scroll_pos), list.horizontal);
    }
  }
  if (t(refresh_fn)) refresh_fn(list);
  return list;
};

M.dynamic = function (list_id: any, stencil_id: any, item_id: any, data: any[], action_id: any, action: any, config: any, fn: any, refresh_fn?: any) {
  const list = get_instance(list_id, stencil_id, refresh_fn, dynamic_lists);
  list.dynamic = true;
  list.horizontal = t(config) ? config.horizontal : config;
  list.carousel = t(config) ? config.carousel : config;
  // Extra scroll room past the last item, for content drawn below it
  list.end_padding = t(config) && t(config.end_padding) ? config.end_padding : 0;
  list.row_height = t(config) ? config.row_height : config;
  list.data = data;

  if (!t(list.items)) {
    item_id = core.to_hash(item_id);
    const item_node = gui.get_node(item_id);
    const item_pos = gui.get_position(item_node);
    const item_size = gui.get_size(item_node);
    list.items = [];
    list.item_size = item_size;
    list.scroll_pos = vmath.vector3(0);
    list.first_item_pos = vmath.vector3(item_pos);
    list.data_size = undefined;

    let item_count: number;
    if (t(list.horizontal)) {
      item_count = (Math.ceil(list.stencil_size.x / item_size.x) + 1);
    } else {
      item_count = (Math.ceil(list.stencil_size.y / item_size.y) + 1);
    }
    // Short rows let more of them show at once.
    item_count = item_count + (t(config) && t(config.spare_items) ? config.spare_items : 0);
    for (let i = 1; i <= item_count; i++) {
      const nodes = gui.clone_tree(item_node);
      const d = data[i - 1];
      list.items[i - 1] = {
        root: nodes[item_id],
        nodes: nodes,
        index: i,
        size: gui.get_size(nodes[item_id]),
        data: t(d) ? d : "",
      };
      let pos: any;
      if (t(list.horizontal)) {
        pos = vmath.sub(item_pos, vmath.vector3(item_size.x * (i - 1), 0, 0));
      } else {
        pos = vmath.sub(item_pos, vmath.vector3(0, item_size.y * (i - 1), 0));
      }
      gui.set_position(list.items[i - 1].root, pos);
    }
    gui.delete_node(item_node);
  }

  // Row heights can change without the row count changing, so lay them out on every call.
  let layout_changed = false;
  if (t(list.row_height) && !t(list.horizontal)) {
    const tops: any[] = [];
    let top = 0;
    for (let i = 1; i <= len(data); i++) {
      tops[i - 1] = top;
      top = top + list.row_height(data[i - 1], i);
    }
    tops[len(data) + 1 - 1] = top;
    const old = list.row_tops;
    layout_changed = !t(old) || len(old) !== len(tops) || old[len(old) - 1] !== top;
    list.row_tops = tops;
  } else {
    list.row_tops = undefined;
  }

  const data_size_changed = list.data_size !== len(data) || layout_changed;
  if (!t(list.data_size) || data_size_changed) {
    list.data_size = len(data);
    list.min_y = 0;
    list.min_x = 0;
    const length_y = t(list.row_tops) ? list.row_tops[len(data) + 1 - 1] : (len(data) * list.item_size.y);
    list.max_y = length_y + list.end_padding - list.stencil_size.y;
    list.max_x = (len(data) * list.item_size.x) + list.end_padding - list.stencil_size.x;
    list.selected_item = undefined;

    if (len(data) < len(list.items)) {
      const n = len(list.items);
      for (let i = 1; i <= n; i++) {
        const item = list.items[i - 1];
        item.index = i;
        gui.set_enabled(item.root, (i <= len(data)));
      }
      list.scroll_pos.y = 0;
      list.scroll_pos.x = 0;
      update_dynamic_listitem_positions(list);
    } else {
      let first_index = list.items[0].index;
      if ((first_index + len(list.items)) > len(data)) {
        first_index = len(data) - len(list.items) + 1;
      }
      const n = len(list.items);
      for (let i = 1; i <= n; i++) {
        const item = list.items[i - 1];
        item.index = first_index + i - 1;
        gui.set_enabled(item.root, true);
      }
      if (!t(list.carousel)) {
        list.scroll_pos.y = Math.max(list.min_y, Math.min(list.scroll_pos.y, Math.max(list.min_y, list.max_y)));
        list.scroll_pos.x = Math.max(list.min_x, Math.min(list.scroll_pos.x, Math.max(list.min_x, list.max_x)));
        update_dynamic_listitem_positions(list);
      }
    }
  }

  if (list.data_size === 0) {
    if (t(refresh_fn)) refresh_fn(list);
    return list;
  }

  if (t(list.enabled) && (t(action_id) || t(action))) {
    handle_input(list, action_id, action, fn);

    if (t(list.scrolling)) {
      update_dynamic_listitem_positions(list);
    }
  }

  update_dynamic_listitem_data(list);

  if (t(refresh_fn)) refresh_fn(list);

  return list;
};

// setmetatable(M, { __call = M.static }): callers use M.static(...)
export default M;
