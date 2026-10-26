import { defineScript, gui, hash, vmath, print } from '../../../engine';
import { cat, S } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import saveload from '../../saveload/saveload';

void gooey; void inspect; void saveload;

defineScript('/main/background/background.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "background";
  const controller = "main:/menu#controller"; void controller;
  let enabled: any = false;

  return {
    init(self) {
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      gui.set_render_order(-15);

      const nodes: any = {};
      const streamSpeed = 5;
      const tunnelSpeed = 1;
      const tunnelScale = 50;

      nodes.stream1 = gui.get_node("stream/bg/1");
      nodes.stream2 = gui.get_node("stream/bg/2");

      gui.animate(nodes.stream1, "position.y", 1334, gui.EASING_LINEAR, streamSpeed, 0, undefined, gui.PLAYBACK_LOOP_FORWARD);
      gui.animate(nodes.stream2, "position.y", 0, gui.EASING_LINEAR, streamSpeed, 0, undefined, gui.PLAYBACK_LOOP_FORWARD);

      nodes.tunnel1 = gui.get_node("tunnel/bg/1");
      nodes.tunnel2 = gui.get_node("tunnel/bg/2");

      gui.set_color(nodes.tunnel1, vmath.vector4(1, 1, 1, 0.5));
      gui.set_color(nodes.tunnel2, vmath.vector4(1, 1, 1, 0.5));

      gui.animate(nodes.tunnel1, "color", vmath.vector4(1, 1, 1, 0), gui.EASING_LINEAR, tunnelSpeed, 0, undefined, gui.PLAYBACK_LOOP_FORWARD);
      gui.animate(nodes.tunnel2, "color", vmath.vector4(1, 1, 1, 0), gui.EASING_LINEAR, tunnelSpeed, tunnelSpeed / 2, undefined, gui.PLAYBACK_LOOP_FORWARD);

      gui.animate(nodes.tunnel1, "scale", tunnelScale, gui.EASING_LINEAR, tunnelSpeed, 0, undefined, gui.PLAYBACK_LOOP_FORWARD);
      gui.animate(nodes.tunnel2, "scale", tunnelScale, gui.EASING_LINEAR, tunnelSpeed, tunnelSpeed / 2, undefined, gui.PLAYBACK_LOOP_FORWARD);
    },

    /* ******************************************
    MESSAGES
    ******************************************** */

    on_message(self, message_id, message, sender) {
      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);

        gui.set_enabled(gui.get_node("root"), enabled);
        gui.set_enabled(gui.get_node("effects/stream/root"), false);
        gui.set_enabled(gui.get_node("effects/tunnel/root"), false);
        if (message.effect) {
          gui.set_enabled(gui.get_node(cat("effects/", message.effect.type, "/root")), true);

          gui.set_texture(gui.get_node(cat(message.effect.type, "/bg/1")), message.effect.texture);
          gui.set_texture(gui.get_node(cat(message.effect.type, "/bg/2")), message.effect.texture);

          gui.play_flipbook(gui.get_node(cat(message.effect.type, "/bg/1")), message.effect.flipbook);
          gui.play_flipbook(gui.get_node(cat(message.effect.type, "/bg/2")), message.effect.flipbook);
        }
      }
    },
  };
});
