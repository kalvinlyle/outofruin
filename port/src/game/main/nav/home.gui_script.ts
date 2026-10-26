import { defineScript, gui, msg, hash, print } from '../../../engine';
import { S } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import progress from '../../progress/progress';
import saveload from '../../saveload/saveload';

void inspect; void random; void progress; void saveload;

defineScript('/main/nav/home.gui_script', () => {
  const currentPage = "back";

  const productName = "OoR"; void productName;
  const controller = "main:/menu#controller";
  let enabled: any = false;


  /* ******************************************
            FUNCTIONS
  ******************************************** */

  /* ******************************************
            INPUT
  ******************************************** */

  function on_pressed_back(button: any) {
    msg.post(controller, "show_home");
  }

  return {
    init(self) {
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      gooey.acquire_input();
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
  };
});
