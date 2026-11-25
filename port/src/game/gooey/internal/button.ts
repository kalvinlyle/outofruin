// gooey/internal/button.lua
import { gui } from '../../../engine';
import { t, tracked } from '../../../lua';
import core from './core';
import buttonFx from '../../shared/button_fx';
import audio from '../../../systems/audio';

const M: any = {};

const buttons = tracked({});

const BUTTON: any = {};
BUTTON.refresh = function (button: any) {
  if (t(button.refresh_fn)) button.refresh_fn(button);
};
BUTTON.set_visible = function (button: any, visible: any) {
  gui.set_enabled(button.node, visible);
};
BUTTON.set_long_pressed_time = function (button: any, time: any) {
  button.long_pressed_time = time;
};

M.button = function (node_id: any, action_id: any, action: any, fn: any, refresh_fn?: any) {
  const rawId = typeof node_id === 'string' ? node_id : '';
  node_id = core.to_hash(node_id);
  const node = gui.get_node(node_id);
  if (!t(node)) throw new Error('assertion failed!');

  const [button] = core.instance(node_id, buttons, BUTTON);
  button.enabled = core.is_enabled(node);
  button.node = node;
  button.refresh_fn = refresh_fn;

  core.clickable(button, action_id, action);
  if (!t(button.enabled)) {
    buttonFx.release(button.node, false);
  } else if (t(button.pressed_now) || (t(button.pressed) && t(button.over_now))) {
    buttonFx.press(button.node);
  } else if (t(button.pressed) && t(button.out_now)) {
    buttonFx.release(button.node, false);
  }
  if (t(button.clicked)) {
    if (rawId.includes('back') || rawId.includes('close') || rawId.includes('cancel')) {
      audio.playUi('back');
    } else if (rawId.includes('tab')) {
      audio.playUi('tab');
    } else {
      audio.playUi('tap');
    }
    fn(button);
  }

  button.refresh();
  if (t(button.released_now)) {
    buttonFx.release(button.node, t(button.clicked));
  }
  return button;
};

// setmetatable(M, { __call = M.button }): callers use M.button(...)
export default M;
