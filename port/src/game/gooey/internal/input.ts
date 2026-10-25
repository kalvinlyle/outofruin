// gooey/internal/input.lua
import { gui } from '../../../engine';
import { t, tracked, cat, strlen, S, format } from '../../../lua';
import core from './core';
import actions from '../actions';
import utf8 from './utf8';

const M: any = {};

const inputfields = tracked({});
const space_width: Record<string, number> = {};

const land = (a: any, b: any) => (t(a) ? b : a);
const lor = (a: any, b: any) => (t(a) ? a : b);

function get_space_width(font: any) {
  if (!t(space_width[font])) {
    const no_space = gui.get_text_metrics(font, "1", 0, false, 0, 0).width;
    const with_space = gui.get_text_metrics(font, " 1", 0, false, 0, 0).width;
    space_width[font] = with_space - no_space;
  }
  return space_width[font];
}

function get_text_width(node: any, text: string) {
  const font = gui.get_font(node);
  const scale = gui.get_scale(node);
  let result = gui.get_text_metrics(font, text, 0, false, 0, 0).width;
  // Walks bytes from the end; only ASCII spaces are counted, so code units give the same result.
  for (let i = text.length; i >= 1; i--) {
    const c = S.sub(text, i, i);
    if (c !== ' ') {
      break;
    }
    result = result + get_space_width(font);
  }
  result = result * scale.x;
  return result;
}

M.utf8_gfind = function (text: string, regex: string) {
  return utf8.gmatch(text, regex);
};

M.mask_text = function (text: string, mask?: string) {
  mask = lor(mask, "*");
  let masked_text = "";
  for (const _uchar of M.utf8_gfind(text, ".")) {
    masked_text = cat(masked_text, mask!);
  }
  return masked_text;
};

const INPUT: any = {};
INPUT.refresh = function (input: any) {
  if (t(input.refresh_fn)) input.refresh_fn(input);
};
INPUT.set_visible = function (input: any, visible: any) {
  gui.set_enabled(input.node, visible);
};
INPUT.set_text = function (input: any, text: any) {
  input.text = text;

  const current_text = cat(input.text, input.marked_text);
  if (current_text !== input.current_text) {
    input.current_text = current_text;

    if (input.keyboard_type === gui.KEYBOARD_TYPE_PASSWORD) {
      input.masked_text = M.mask_text(input.text, "*");
      input.masked_marked_text = M.mask_text(input.marked_text, "*");
    } else {
      input.masked_text = undefined;
      input.masked_marked_text = undefined;
    }

    const text = lor(input.masked_text, input.text);
    const marked_text = lor(input.masked_marked_text, input.marked_text);
    input.empty = strlen(text) === 0 && strlen(marked_text) === 0;

    input.text_width = get_text_width(input.node, text);
    input.marked_text_width = get_text_width(input.node, marked_text);
    input.total_width = input.text_width + input.marked_text_width;

    gui.set_text(input.node, cat(text, marked_text));
  }
};
INPUT.set_long_pressed_time = function (input: any, time: any) {
  input.long_pressed_time = time;
};

M.input = function (node_id: any, keyboard_type: any, action_id: any, action: any, config: any, refresh_fn?: any) {
  node_id = core.to_hash(node_id);
  const node = gui.get_node(node_id);
  if (!t(node)) throw new Error('assertion failed!');

  const [input] = core.instance(node_id, inputfields, INPUT);
  input.enabled = core.is_enabled(node);
  input.node = node;
  input.refresh_fn = refresh_fn;

  const use_marked_text = t(land(config, t(config) ? (config.use_marked_text === undefined || config.use_marked_text === null) : undefined))
    ? true
    : land(config, t(config) ? config.use_marked_text : undefined);
  // `input.text or "" .. (...)`: `..` binds tighter than `or`
  input.text = lor(input.text, cat("", lor(land(!t(use_marked_text), input.marked_text), "")));
  input.marked_text = lor(input.marked_text, "");
  input.keyboard_type = keyboard_type;

  if (!t(action)) {
    input.empty = strlen(input.text) === 0 && strlen(input.marked_text) === 0;
    input.refresh();
    return input;
  }

  core.clickable(input, action_id, action);

  if (t(input.enabled)) {
    input.deselected_now = false;
    if (t(input.released_now)) {
      input.selected = true;
      input.marked_text = "";
      gui.reset_keyboard();
      gui.show_keyboard(keyboard_type, true);
    } else if (t(input.selected) && t(action.pressed) && action_id === actions.TOUCH && !t(input.over)) {
      input.selected = false;
      input.text = cat(input.text, lor(land(!t(use_marked_text), input.marked_text), ""));
      input.marked_text = "";
      gui.hide_keyboard();
    }

    if (t(input.selected)) {
      if (action_id === actions.TEXT) {
        input.consumed = true;

        if (action.text === "\n" || action.text === "\r") {
          if (t(refresh_fn)) refresh_fn(input);
          return input;
        }
        // string.gsub(action.text, "(.)", ...) walks the UTF-8 bytes
        let hex = "";
        for (const b of new TextEncoder().encode(action.text)) {
          hex = hex + format("%02X%s", b, "");
        }

        if (!t(S.match1(hex, "EF9C8[0-3]"))) {
          if (!t(config) || !t(config.allowed_characters) || t(S.match1(action.text, config.allowed_characters))) {
            input.text = cat(input.text, action.text);
            if (t(config) && t(config.max_length)) {
              input.text = utf8.sub(input.text, 1, config.max_length);
            }
          }
          input.marked_text = "";
        }
      } else if (action_id === actions.MARKED_TEXT) {
        input.consumed = true;
        input.marked_text = lor(action.text, "");
        if (t(config) && t(config.max_length)) {
          input.marked_text = utf8.sub(input.marked_text, 1, config.max_length);
        }
      } else if (action_id === actions.BACKSPACE && (t(action.pressed) || t(action.repeated))) {
        input.consumed = true;
        input.text = utf8.sub(input.text, 1, -2);
      }
    }

    input.set_text(input.text);
  }
  if (t(refresh_fn)) refresh_fn(input);
  return input;
};

// setmetatable(M, { __call = M.input }): callers use M.input(...)
export default M;
