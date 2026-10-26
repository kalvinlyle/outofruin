// gooey/internal/radio.lua
import { gui } from '../../../engine';
import { t, tracked, pairs, len, T } from '../../../lua';
import core from './core';

const M: any = {};

const radiobuttons = tracked({});

const groups = tracked({});

const land = (a: any, b: any) => (t(a) ? b : a);
const lor = (a: any, b: any) => (t(a) ? a : b);

const RADIOBUTTON: any = {};
RADIOBUTTON.set_selected = function (radio: any, selected: any) {
  radio.selected = selected;
  if (t(radio.refresh_fn)) radio.refresh_fn(radio);
};
RADIOBUTTON.refresh = function (radio: any) {
  if (t(radio.refresh_fn)) {
    radio.refresh_fn(radio);
  }
};
RADIOBUTTON.set_visible = function (radio: any, visible: any) {
  gui.set_enabled(radio.node, visible);
};
RADIOBUTTON.set_long_pressed_time = function (radio: any, time: any) {
  radio.long_pressed_time = time;
};

M.button = function (node_id: any, group_id: any, action_id: any, action: any, fn: any, refresh_fn?: any) {
  node_id = core.to_hash(node_id);
  group_id = core.to_hash(group_id);
  const node = gui.get_node(node_id);
  if (!t(node)) throw new Error('assertion failed!');

  const [radio] = core.instance(node_id, radiobuttons, RADIOBUTTON);
  radio.enabled = core.is_enabled(node);
  radio.node = node;
  radio.group = t(group_id) ? core.to_key(group_id) : group_id;
  radio.refresh_fn = refresh_fn;

  core.clickable(radio, action_id, action);
  radio.deselected_now = false;
  radio.selected_now = lor(land(radio.clicked, !t(radio.selected)), false);
  if (t(radio.clicked)) {
    radio.selected = true;
    fn(radio);
  }

  radio.refresh();
  return radio;
};

M.group = function (group_id_: any, action_id: any, action: any, fn: any, _refresh_fn?: any) {
  const group_id = core.to_hash(group_id_);

  fn(group_id, action_id, action);

  const [group] = core.instance(group_id, groups);
  for (const [k] of pairs(group)) {
    group[(k as number) - 1] = undefined;
  }

  let selected_radio: any;
  const group_key = core.to_key(group_id);
  for (let [, radio] of pairs<any>(radiobuttons)) {
    radio = radio.data;
    if (radio.group === group_key) {
      if (t(radio.selected_now)) {
        selected_radio = radio;
      }
      T.insert(group, radio);
    }
  }

  if (t(selected_radio)) {
    for (let i = 1; i <= len(group); i++) {
      const radio = group[i - 1];
      if (radio !== selected_radio) {
        radio.deselected_now = radio.selected;
        radio.selected = false;
        radio.refresh();
      }
    }
  }
  return group;
};

// setmetatable(M, { __call = M.button }): callers use M.button(...)
export default M;
