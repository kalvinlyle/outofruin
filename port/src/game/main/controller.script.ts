// main/controller.script
import { defineScript, msg, print, sys, socket, crash, go } from '../../engine';
import { M as LM, os } from '../../lua';
import { G } from '../globals';

import ga_ from '../controllers/gaController';
import kongregate_ from '../controllers/kongregateController';
import rep_ from '../controllers/repController';
import hero_ from '../controllers/heroController';
import henchmen_ from '../controllers/henchmenController';
import gear_ from '../controllers/gearController';
import loot_ from '../controllers/lootController';
import map_ from '../controllers/mapController';
import navigation_ from '../controllers/navigationController';
import vault_ from '../controllers/vaultController';
import version_ from '../controllers/versionController';
import window_ from '../controllers/windowController';

import fps_ from '../metrics/fps';
import inspect_ from '../inspect';
import defsave_ from '../defsave/defsave';
import loc_ from '../shared/locsheets';

defineScript('/main/controller.script', () => {
  const ga: any = ga_;
  const kongregate: any = kongregate_;
  const rep: any = rep_;
  const hero: any = hero_;
  const henchmen: any = henchmen_;
  const gear: any = gear_;
  const loot: any = loot_;
  const map: any = map_;
  const navigation: any = navigation_;
  const vault: any = vault_;
  const version: any = version_;
  const window: any = window_;

  const fps: any = fps_;
  const inspect: any = inspect_;
  const defsave: any = defsave_;
  const loc: any = loc_;

  const controller = "main:/menu#controller";
  const currentPage = "controller";

  const update_tick = 0.01;
  let lastUpdated = 0;

  void inspect; void currentPage;

  return {
    init(self: any) {
      crash.set_file_path("out_of_ruin\\crash", "crash.bin");
      defsave.appname = "out_of_ruin";
      os.clock = socket.gettime;
      msg.post(".", "acquire_input_focus");
      msg.post("@render:", "use_fixed_fit_projection", { near: -1, far: 1 });
      LM.randomseed(os.time());
      LM.random(); LM.random(); LM.random();
      msg.post(controller, "on_start");
      lastUpdated = os.clock();

      loc.SHEET_KEY = "1EiopjKihWF_t27Uhx3Vw-nhxOrTqzds8orTLurE_qpQ";
      loc.SHEET_INDEX = 1;
      loc.on_load(function (content: any) {
        print("***********************");
        print(sys.get_sys_info().device_language);
        print(loc.get("GAME_TITLE"));
        void content;
      });

      void self;
    },

    // `function update()` declares no parameters, so `dt` below is the (nil) global.
    update(_self: any, _dt: number) {
      defsave.update(G.dt);
      ga.update();

      if (os.clock() >= lastUpdated + update_tick) {
        msg.post(controller, "update");
        lastUpdated = os.clock();
      }

      fps.update();
      fps.draw(undefined, go.get_world_position());
      msg.post("main:/overlay#header", "update_fps", { text: Math.floor(fps.fps() * 100) / 100 });
      msg.post("main:/menu#sellitems", "update_fps", { text: Math.floor(fps.fps() * 100) / 100 });
    },

    final(_self: any) {
      defsave.save_all();
    },

    on_message(self: any, message_id: any, message: any, sender: any) {

      map.findReceiver(message_id, message, sender);
      navigation.findReceiver(message_id, message, sender);
      hero.findReceiver(message_id, message, sender);
      henchmen.findReceiver(message_id, message, sender);
      gear.findReceiver(message_id, message, sender);
      loot.findReceiver(message_id, message, sender);
      vault.findReceiver(message_id, message, sender);

      ga.findReceiver(message_id, message, sender);
      kongregate.findReceiver(message_id, message, sender);
      rep.findReceiver(message_id, message, sender);
      version.findReceiver(message_id, message, sender);
      window.findReceiver(message_id, message, sender);
      void self;
    },
  };
});
