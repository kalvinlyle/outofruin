// gooey/actions.lua
import { hash } from '../../engine';

const M = {
  TOUCH: hash("touch"),
  MULTITOUCH: hash("multitouch"),
  SCROLL_UP: hash("scroll_up"),
  SCROLL_DOWN: hash("scroll_down"),
  TEXT: hash("text"),
  MARKED_TEXT: hash("marked_text"),
  BACKSPACE: hash("backspace"),
};

export default M;
