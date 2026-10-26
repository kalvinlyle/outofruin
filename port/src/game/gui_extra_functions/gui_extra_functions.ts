// gui_extra_functions/gui_extra_functions.lua
import { gui, vmath, sys, hash } from '../../engine';
import { t, tonumber, pairs } from '../../lua';

const M: any = {
  inited: false,
  win_x: 0,
  win_y: 0,
  layouts: {},
  default_layout: undefined,
};

const EMPTY = hash("");

// layout[gui.ADJUST_FIT] etc. are numeric keys; config_x/config_y may be the
// strings sys.get_config returns, which Lua arithmetic coerces.
function recalculate_layout(layout: any) {
  const fit = layout[gui.ADJUST_FIT], zoom = layout[gui.ADJUST_ZOOM], stretch = layout[gui.ADJUST_STRETCH];
  const config_x = () => tonumber(layout.config_x)!;
  const config_y = () => tonumber(layout.config_y)!;
  const sx = M.win_x / config_x(), sy = M.win_y / config_y();
  let scale = Math.min(sx, sy);
  fit.sx = scale;
  fit.sy = scale;
  fit.ox = (M.win_x - config_x() * scale) * 0.5 / scale;
  fit.oy = (M.win_y - config_y() * scale) * 0.5 / scale;

  scale = Math.max(sx, sy);
  zoom.sx = scale;
  zoom.sy = scale;
  zoom.ox = (M.win_x - config_x() * scale) * 0.5 / scale;
  zoom.oy = (M.win_y - config_y() * scale) * 0.5 / scale;

  stretch.sx = sx;
  stretch.sy = sy;
  return layout;
}

function get_layout(name: any) {
  if (!t(name) || name === EMPTY) return undefined;

  let layout = M.layouts[name];
  if (!t(layout)) {
    const l: any = {
      config_x: 0,
      config_y: 0,
    };
    l[gui.ADJUST_FIT] = {
      sx: 0,
      sy: 0,
      ox: 0,
      oy: 0,
    };
    l[gui.ADJUST_ZOOM] = {
      sx: 0,
      sy: 0,
      ox: 0,
      oy: 0,
    };
    l[gui.ADJUST_STRETCH] = {
      sx: 0,
      sy: 0,
      ox: 0,
      oy: 0,
    };
    M.layouts[name] = l;
    layout = M.layouts[name];
  }
  return layout;
}

M.update_coef = function (width: number, height: number) {
  M.win_x = width;
  M.win_y = height;
  for (const [, v] of pairs(M.layouts)) {
    recalculate_layout(v);
  }
};

function screen_to_gui(pos: any, adj_mode: any, anch_x: boolean, anch_y: boolean, layout: any) {
  const adj = layout[adj_mode];
  if (anch_x) {
    pos.x = pos.x / layout[gui.ADJUST_STRETCH].sx;
  } else {
    pos.x = pos.x / adj.sx - adj.ox;
  }
  if (anch_y) {
    pos.y = pos.y / layout[gui.ADJUST_STRETCH].sy;
  } else {
    pos.y = pos.y / adj.sy - adj.oy;
  }
}

function set_screen_position(node: any, screen_position: any) {
  const parent = gui.get_parent(node);
  gui.set_parent(node, undefined);
  const mode = gui.get_adjust_mode(node);
  const anch_x = gui.get_xanchor(node) !== gui.ANCHOR_NONE ? true : false;
  const anch_y = gui.get_yanchor(node) !== gui.ANCHOR_NONE ? true : false;

  const layout = get_layout(gui.get_layout()) ?? M.default_layout;
  const converted_v = vmath.vector3(screen_position);
  screen_to_gui(converted_v, mode, anch_x, anch_y, layout);
  gui.set_position(node, converted_v);
  gui.set_parent(node, parent, true);
}

/** Note the argument order: (screen_position, node), unlike the engine's declared gui.screen_pos_to_node_pos. */
function screen_pos_to_node_pos(screen_position: any, node: any) {
  const position_before = gui.get_position(node);
  const parent = gui.get_parent(node);
  gui.set_parent(node, undefined);
  const mode = gui.get_adjust_mode(node);
  const anch_x = gui.get_xanchor(node) !== gui.ANCHOR_NONE ? true : false;
  const anch_y = gui.get_yanchor(node) !== gui.ANCHOR_NONE ? true : false;

  const layout = get_layout(gui.get_layout()) ?? M.default_layout;
  const converted_v = vmath.vector3(screen_position);
  screen_to_gui(converted_v, mode, anch_x, anch_y, layout);
  gui.set_position(node, converted_v);
  gui.set_parent(node, parent, true);
  const result_position = gui.get_position(node);
  gui.set_position(node, position_before);
  return result_position;
}

M.init = function (layouts?: any) {
  if (M.inited) return;
  M.inited = true;
  let layout: any;
  if (t(layouts)) {
    for (const [k, v] of pairs<any>(layouts)) {
      layout = get_layout(k);
      layout.config_x = v.width;
      layout.config_y = v.height;
      recalculate_layout(layout);
    }
  }

  M.default_layout = get_layout(hash("_default_layout"));
  M.default_layout.config_x = sys.get_config("display.width");
  M.default_layout.config_y = sys.get_config("display.height");
  recalculate_layout(M.default_layout);

  // _G.gui.set_screen_position / _G.gui.screen_pos_to_node_pos are replaced for every script.
  (gui as any).set_screen_position = set_screen_position;
  (gui as any).screen_pos_to_node_pos = screen_pos_to_node_pos;
};

export default M;
