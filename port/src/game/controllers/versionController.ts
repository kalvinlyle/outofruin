// controllers/versionController.lua
import defsave_ from '../defsave/defsave';
import { msg, hash, print } from '../../engine';
import { pairs, literal, cat, os } from '../../lua';

const defsave: any = defsave_;

const productName = "OoR";
const controller = "main:/menu#controller";

const M: any = {};
const currentVersion = 0.16;

function on_start(message: any) {
  defsave.load("Info");
  if (currentVersion !== defsave.get("Info", "currentVersion")) {
    print("Save file version outdated, resetting statistics");
    defsave.set("Info", "buildDate", os.date("%d-%m-%Y", os.time()));
    defsave.set("Info", "buildTime", os.date("%H:%M:%S", os.time()));
    defsave.set("Info", "currentVersion", currentVersion);
    defsave.save("Info", true);
    defsave.load("Info");
    msg.post(controller, "reset_statistics");
  }
  defsave.save("Info");
  print(cat("Current Version ", defsave.get("Info", "currentVersion"), " built on ", defsave.get("Info", "buildDate"), " at ", defsave.get("Info", "buildTime")));
}

const messageData: any = {};
messageData["all"] = literal({
  ["on_start"]: function (message_id: any, message: any, sender: any) { on_start(message); },
});

function urlEq(a: any, b: any): boolean {
  return a === b || (a != null && b != null && typeof a === 'object' && typeof b === 'object'
    && a.socket === b.socket && a.path === b.path && a.fragment === b.fragment);
}

M.findReceiver = function (message_id: any, message: any, sender: any) {
  for (const [u, url] of pairs(messageData)) {                       // look up the sender in the data set
    if (urlEq(sender, msg.url(u as string)) || u === "all") {          // find the sender
      for (const [a, action] of pairs<any>(url)) {                      // look up the message
        if (message_id === hash(a as string) || a === "all") {          // find the message
          action(message_id, message, sender);                         // run the function from the table
        }
      }
    }
  }
};

void productName;

export default M;
