import { defineScript, gui, msg, hash, vmath, print } from '../../../engine';
import type { Vector3 } from '../../../engine';
import { t, cat, len, pairs, format, M, T, S } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import progress from '../../progress/progress';
import saveload from '../../saveload/saveload';
import gui_extra_functions from '../../gui_extra_functions/gui_extra_functions';
import audio from '../../../systems/audio';

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
  const hireParticles: any[] = [];
  const pNode = {}; void pNode;
  const targets: Record<string, any> = {};
  const pnum = 0; void pnum;

  const HIRE_ICON_SIZE = vmath.vector3(48, 48, 0);
  const HIRE_FLIGHT_MIN = 0.44;
  const HIRE_FLIGHT_VAR = 0.08;
  const HIRE_MAX_STAGGER = 0.08;
  const HIRE_MAX_LAUNCH_SPAN = 0.7;

  /* ******************************************
            FUNCTIONS
  ******************************************** */

  function clear_hire_particles() {
    for (let i = 0; i < hireParticles.length; i++) {
      if (t(hireParticles[i].node)) {
        gui.delete_node(hireParticles[i].node);
      }
    }
    hireParticles.length = 0;
    msg.post("main:/overlay#header", "hire_followers_clear");
  }

  function spawn_hire_particles(message: any) {
    const batches: number[] = message.batches;
    if (!Array.isArray(batches) || batches.length === 0) { return; }
    const followerSteps: number[] = Array.isArray(message.followerSteps) ? message.followerSteps : [];
    const count = batches.length;
    const stagger = count <= 1 ? 0 : Math.min(HIRE_MAX_STAGGER, HIRE_MAX_LAUNCH_SPAN / (count - 1));
    const endPos = vmath.vector3(message.endPos.x, message.endPos.y, 0);

    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      hireParticles.push({
        node: undefined,
        henchmen_id: message.henchmen_id,
        hireStep: batches[i],
        followerStep: followerSteps[i] ?? 0,
        delay: i * stagger,
        elapsed: 0,
        duration: HIRE_FLIGHT_MIN + M.random() * HIRE_FLIGHT_VAR,
        startPos: undefined,
        endPos: vmath.vector3(endPos.x, endPos.y, 0),
        endOffsetX: M.random(-14, 14),
        endOffsetY: M.random(-14, 14),
        bowFactor: side * (0.14 + M.random() * 0.14),
        tiltSign: side,
      });
    }
  }

  function update_hire_particles(dt: number) {
    if (hireParticles.length === 0) { return; }
    const winW = gui_extra_functions.win_x > 0 ? gui_extra_functions.win_x : 750;
    const winH = gui_extra_functions.win_y > 0 ? gui_extra_functions.win_y : 1334;
    const pad = 36;

    for (let i = hireParticles.length - 1; i >= 0; i--) {
      const p = hireParticles[i];
      if (!t(p.node)) {
        p.delay = p.delay - dt;
        if (p.delay > 0) { continue; }
        const from = targets["target_followers"] ?? vmath.vector3(winW * 0.82, winH * 0.94, 0);
        p.startPos = vmath.vector3(from.x, from.y, 0);
        p.node = gui.new_box_node(vmath.vector3(0, 0, 0), HIRE_ICON_SIZE);
        gui.set_texture(p.node, "main");
        gui.play_flipbook(p.node, "pawn");
        gui.set_screen_position(p.node, p.startPos);
        gui.set_scale(p.node, vmath.vector3(0.45, 0.45, 1));
        if (p.followerStep > 0) {
          msg.post("main:/overlay#header", "hire_followers_step", { amount: p.followerStep });
        }
        p.elapsed = Math.max(0, -p.delay);
      } else {
        p.elapsed = p.elapsed + dt;
      }

      const u = Math.min(1, p.elapsed / p.duration);
      if (u >= 1) {
        gui.delete_node(p.node);
        hireParticles.splice(i, 1);
        msg.post("main:/menu#dungeonmine", "hire_land", { henchmen_id: p.henchmen_id, amount: p.hireStep });
      } else {
        // Gentle acceleration into the portrait so each landing feels crisp.
        const e = 0.3 * u + 0.7 * u * u;
        const tx = p.endPos.x + p.endOffsetX;
        const ty = p.endPos.y + p.endOffsetY;
        const dx = tx - p.startPos.x;
        const dy = ty - p.startPos.y;
        const dist = Math.hypot(dx, dy) || 1;
        const nx = -dy / dist;
        const ny = dx / dist;
        let mx = (p.startPos.x + tx) * 0.5 + nx * p.bowFactor * dist;
        let my = (p.startPos.y + ty) * 0.5 + ny * p.bowFactor * dist;
        mx = Math.max(pad, Math.min(winW - pad, mx));
        my = Math.max(pad, Math.min(winH - pad, my));

        const inv = 1 - e;
        const px = inv * inv * p.startPos.x + 2 * inv * e * mx + e * e * tx;
        const py = inv * inv * p.startPos.y + 2 * inv * e * my + e * e * ty;
        gui.set_screen_position(p.node, vmath.vector3(px, py, 0));

        const s = u < 0.22
          ? 0.45 + (1.15 - 0.45) * (u / 0.22)
          : 1.15 - (1.15 - 0.8) * ((u - 0.22) / 0.78);
        gui.set_scale(p.node, vmath.vector3(s, s, 1));
        gui.set_rotation(p.node, vmath.vector3(0, 0, p.tiltSign * 18 * Math.sin(u * Math.PI)));
      }
    }
  }

  function kill_particle(id: number) {
    if (t(particles[id - 1])) {
      const targetName = particles[id - 1].endTargetName;
      if (targetName === "target_gold") audio.playCascadeTick("coin");
      else if (targetName === "target_xp") audio.playCascadeTick("xp");
      else if (targetName === "target_followers") audio.playCascadeTick("hire");
      if (t(particles[id - 1].postmsg)) {
        particles[id - 1].postmsg.receiver = t(particles[id - 1].postmsg.receiver) ? particles[id - 1].postmsg.receiver : controller;
        msg.post(particles[id - 1].postmsg.receiver, particles[id - 1].postmsg.message_id, particles[id - 1].postmsg.message);
      }
      gui.delete_node(particles[id - 1].node);
      T.remove(particles, id);
    }
  }

  function spawn_particle(startPos: any, endPos: any, time: any, icon: any, postmsg: any, endTargetName?: string) {
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
    particles[id - 1].endTargetName = endTargetName || "target_gold";
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
      update_hire_particles(dt);
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
          spawn_particle(message.startPos, targets[message.endTarget], message.time, message.icon, message.postmsg, message.endTarget);
        }
      } else if (message_id === hash("spawn_hire_particles")) {
        spawn_hire_particles(message);
      } else if (message_id === hash("update_hire_target")) {
        for (let i = 0; i < hireParticles.length; i++) {
          if (hireParticles[i].henchmen_id === message.henchmen_id) {
            hireParticles[i].endPos = vmath.vector3(message.endPos.x, message.endPos.y, 0);
          }
        }
      } else if (message_id === hash("clear_hire_particles")) {
        clear_hire_particles();
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
