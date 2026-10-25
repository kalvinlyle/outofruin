import { defineScript, gui, msg, hash, vmath, print } from '../../../engine';
import type { Vector3 } from '../../../engine';
import { t, cat, len, pairs, format, M, T, S } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import progress from '../../progress/progress';
import saveload from '../../saveload/saveload';
import gui_extra_functions from '../../gui_extra_functions/gui_extra_functions';

void gooey; void inspect; void random; void progress; void saveload;

// PARITY: Defold's vector3 __concat metamethod; format assumed "%s[%f, %f, %f]" via lua_pushfstring (%.14g). Only reaches print.
function concat_vector3(s: string, v: Vector3): string {
  return format("%s[%.14g, %.14g, %.14g]", s, v.x, v.y, v.z);
}

defineScript('/main/nav/guiparticles.gui_script', () => {
  const currentPage = "back";

  const productName = "OoR"; void productName;
  const controller = "main:/menu#controller";
  let enabled: any = true;

  let particles: any[] = [];
  const pNode = {}; void pNode;
  const targets: Record<string, any> = {};
  const pnum = 0; void pnum;

  /* ******************************************
            FUNCTIONS
  ******************************************** */

  function kill_particle(id: number) {
    if (t(particles[id - 1])) {
      if (t(particles[id - 1].postmsg)) {
        particles[id - 1].postmsg.receiver = t(particles[id - 1].postmsg.receiver) ? particles[id - 1].postmsg.receiver : controller;
        msg.post(particles[id - 1].postmsg.receiver, particles[id - 1].postmsg.message_id, particles[id - 1].postmsg.message);
      }
      gui.delete_node(particles[id - 1].node);
      T.remove(particles, id);
    }
  }

  function spawn_particle(startPos: any, endPos: any, time: any, icon: any, postmsg: any) {
    startPos = t(startPos) ? startPos : vmath.vector3(375, 667, 0);
    const size = vmath.vector3(50, 50, 50);
    const curve = 750;
    const midPos = vmath.vector3(M.random(startPos.x - curve, startPos.x + curve), M.random(startPos.y - curve, startPos.y + curve), 0);
    time = M.random(time, time * 1.2);
    if (len(particles) === 0) { particles = []; }
    const particle = {}; void particle;
    const id = len(particles) + 1;

    particles[id - 1] = {};
    particles[id - 1].node = gui.new_box_node(startPos, size);
    particles[id - 1].startPos = startPos;
    particles[id - 1].midPos = midPos;
    particles[id - 1].endPos = t(endPos) ? endPos : targets["target_gold"];
    particles[id - 1].t = time;
    particles[id - 1].time = time;
    particles[id - 1].postmsg = postmsg;

    const rotation = M.random(-1, 1);
    gui.animate(particles[id - 1].node, "rotation.z", 360 * rotation, gui.EASING_LINEAR, time);
    gui.set_texture(particles[id - 1].node, icon.texture);
    gui.play_flipbook(particles[id - 1].node, icon.flipbook);
  }

  return {
    update(self, dt) {
      if (particles) {
        for (const [p, particle] of pairs(particles)) {
          particle.t = particle.t - dt;
          const time_passed = particle.t / particle.time;
          if (particle.t > 0) {
            const target_position = vmath.lerp(time_passed, particle.endPos, particle.midPos);
            const updated_particle_position = vmath.lerp(time_passed, target_position, particle.startPos);
            gui.set_screen_position(particles[(p as number) - 1].node, updated_particle_position);
          } else {
            kill_particle(p as number);
          }
        }
      }
    },

    init(self) {
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      msg.post("@render:", "get_dimensions", { callback: "main:/overlay#guiparticles" });
      gui_extra_functions.init();
      gui.set_render_order(15);
    },

    /* debug input code to see if particles are working correctly
    function on_input(self, action_id, action) ... (commented out in the Lua)
    */

    /* ******************************************
              MESSAGES
    ******************************************** */

    on_message(self, message_id, message, sender) {
      if (message_id === hash("set_enabled")) {
        msg.post("main:/overlay#header", "get_particletargets");
      } else if (message_id === hash("spawn_particles")) {
        for (let i = 1; i <= message.num; i++) {
          spawn_particle(message.startPos, targets[message.endTarget], message.time, message.icon, message.postmsg);
        }
      } else if (message_id === hash("set_particletarget")) {
        const targetNode = gui.get_node(message.name);
        gui.set_screen_position(targetNode, vmath.vector3(message.pos.x, message.pos.y, 0));
        print(concat_vector3("TARGET POSITION", gui.get_position(targetNode)));
        const targetpos = gui.get_position(targetNode);
        gui.set_position(gui.get_node(cat("test_", message.name)), vmath.vector3(targetpos.x, targetpos.y, 0));
        targets[message.name] = vmath.vector3(message.pos.x, message.pos.y, 0);
      } else if (message_id === hash("window_dimensions")) {
        gui_extra_functions.update_coef(message.width, message.height);
        msg.post("main:/overlay#header", "get_particletargets");
      }
    },
  };
});
