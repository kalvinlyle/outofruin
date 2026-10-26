import { defineScript, gui, msg, hash, vmath, window, print } from '../../../engine';
import { S } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import progress from '../../progress/progress';
import saveload from '../../saveload/saveload';

void inspect; void random; void progress; void saveload;

defineScript('/main/nav/back.gui_script', () => {
  const currentPage = "back";

  const productName = "OoR"; void productName;
  const controller = "main:/menu#controller";
  let enabled: any = false;

  const message: any = {}; void message;

  /* ******************************************
            SCREEN FIT
  ******************************************** */

  /* The scene is drawn for a 750x1334 phone and Defold fits that rectangle
  into the window, so on any other shape the button floated in from the corner.
  The root goes on a plain uniform fit and the button is placed against the real
  top-left corner. The long version of this note is in main/nav/header.gui_script. */
  const DESIGN_W = 750;
  const DESIGN_H = 1334;
  const INSET = 8;

  const screen = { w: 0, h: 0 };

  function layout_screen() {
    const [ww, wh] = window.get_size();
    const scale = Math.min(ww / DESIGN_W, wh / DESIGN_H);
    const w = ww / scale, h = wh / scale;
    if (Math.abs(w - screen.w) < 1 && Math.abs(h - screen.h) < 1) { return; }
    screen.w = w; screen.h = h;
    const root = gui.get_node("root");
    gui.set_adjust_mode(root, gui.ADJUST_FIT);
    gui.set_xanchor(root, gui.ANCHOR_NONE);
    gui.set_yanchor(root, gui.ANCHOR_NONE);
    const button = gui.get_node("back/bg");
    const p = gui.get_position(button);
    gui.set_position(button, vmath.vector3((DESIGN_W - w) / 2 + INSET, (DESIGN_H + h) / 2 - INSET, p.z));
  }

  /* ******************************************
            FUNCTIONS
  ******************************************** */

  /* ******************************************
            INPUT
  ******************************************** */

  function on_pressed_back(button: any) {
    msg.post(controller, "show_previous");
  }

  return {
    init(self) {
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      gooey.acquire_input();
      gui.set_render_order(50);
    },

    on_input(self, action_id, action) {
      if (action_id !== undefined && action_id !== null && enabled) {
        const group = gooey.group("group1", function () {
          gooey.button("back/bg", action_id, action, on_pressed_back);
        });
        return group.consumed;
      }
    },

    /* ******************************************
              MESSAGES
    ******************************************** */

    on_message(self, message_id, message, sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
      }
    },

    update() {
      layout_screen();
    },
  };
});
