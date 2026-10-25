// controllers/windowController.lua
import { msg, hash } from '../../engine';
import { pairs, literal } from '../../lua';

const productName = "OoR";
const controller = "main:/menu#controller";

const M: any = {};

function on_start(message: any) {
}

const messageData: any = {};
messageData["all"] = literal({
  ["on_start"]: function (message_id: any, message: any, sender: any) { on_start(message); },
  ["window_resized"]: function (message_id: any, message: any, sender: any) {
    msg.post("@render:", "get_dimensions", { callback: "main:/overlay#guiparticles" });
  },
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

void productName; void controller;

export default M;
