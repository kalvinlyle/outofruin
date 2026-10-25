// gooey/internal/checkbox.lua
import { gui, hash } from '../../../engine';
import { t, tracked } from '../../../lua';
import core from './core';

const M: any = {};

M.TOUCH = hash("touch");

const checkboxes = tracked({});

const land = (a: any, b: any) => (t(a) ? b : a);
const lor = (a: any, b: any) => (t(a) ? a : b);

const CHECKBOX: any = {};
CHECKBOX.set_checked = function (checkbox: any, checked: any) {
  checkbox.checked = checked;
  if (t(checkbox.refresh_fn)) checkbox.refresh_fn(checkbox);
};
CHECKBOX.set_visible = function (checkbox: any, visible: any) {
  gui.set_enabled(checkbox.node, visible);
};
CHECKBOX.refresh = function (checkbox: any) {
  if (t(checkbox.refresh_fn)) checkbox.refresh_fn(checkbox);
};
CHECKBOX.set_long_pressed_time = function (checkbox: any, time: any) {
  checkbox.long_pressed_time = time;
};

M.checkbox = function (node_id: any, action_id: any, action: any, fn: any, refresh_fn?: any) {
  node_id = core.to_hash(node_id);
  const node = gui.get_node(node_id);
  if (!t(node)) throw new Error('assertion failed!');

  const [checkbox] = core.instance(node_id, checkboxes, CHECKBOX);
  checkbox.enabled = core.is_enabled(node);
  checkbox.node = node;
  checkbox.refresh_fn = refresh_fn;

  core.clickable(checkbox, action_id, action);
  checkbox.checked_now = lor(land(checkbox.clicked, !t(checkbox.checked)), false);
  checkbox.unchecked_now = lor(land(checkbox.clicked, checkbox.checked), false);
  if (t(checkbox.clicked)) {
    checkbox.checked = !t(checkbox.checked);
    fn(checkbox);
  }

  checkbox.refresh();
  return checkbox;
};

// setmetatable(M, { __call = M.checkbox }): callers use M.checkbox(...)
export default M;
