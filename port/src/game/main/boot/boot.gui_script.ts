import { defineScript, gui, msg, hash, print } from '../../../engine';
import { S } from '../../../lua';
import random from '../../random/random';
import progress from '../../progress/progress';
import saveload from '../../saveload/saveload';

void random; void saveload;

defineScript('/main/boot/boot.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "boot";

  const controller = "main:/menu#controller";
  let enabled: any = false;

  return {
    init(self) {
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);

      progress.start(0, 0.0001, false, function () {
      }, function () {
        print(S.upper(currentPage), "start game");
        msg.post(controller, "start_game");
      });
    },

    on_message(self, message_id, message, sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
      }
    },
  };
});
