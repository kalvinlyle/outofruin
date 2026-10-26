// controllers/gaController.lua
import ga_ from '../googleanalytics/ga';
import defsave_ from '../defsave/defsave';
import { msg, hash, sys } from '../../engine';
import { pairs, literal, cat, t } from '../../lua';
import { G } from '../globals';

const ga: any = ga_;
const defsave: any = defsave_;

const controller = "main:/menu#controller";

const M: any = {};
const isDebug = sys.get_engine_info().is_debug;
let uuid: any = 0;

M.update = function (self?: any) {
  ga.update();
};

// `function init(self)` in a required module writes the global `init`.
G.init = function (self: any) {
  ga.get_default_tracker().enable_crash_reporting(true);
  uuid = defsave.get("Stats", "uuid");
};

function screenview(screen_name: any) {
  if (!t(isDebug)) {
    ga.get_default_tracker().screenview(screen_name);
  }
}

function event(category: any, action: any, label: any, value: any) {
  if (!t(isDebug)) {
    ga.get_default_tracker().event(category, action, label, value);
  }
}

const messageData: any = {};
// The Lua constructor lists "popup_returntogame" twice (41 fields): the key keeps
// its first slot and the second function wins.
messageData["all"] = literal({
  ["popup_loading"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Loading Popup", "Engagement", 1); },
  ["popup_message"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Message Popup", "Engagement", 1); },
  ["popup_confirm"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Confirm Popup", "Engagement", 1); },
  ["popup_quest"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Quest Popup", "Engagement", 1); },
  ["popup_questCollect"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Quest Collect Popup", "Engagement", 1); },
  ["popup_questOpen"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Quest Open Popup", "Engagement", 1); },
  ["popup_questClose"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Quest Close Popup", "Engagement", 1); },
  ["popup_rankUp"]: function (message_id: any, message: any, sender: any) { event("Screen View", "RankUp Popup", "Engagement", 1); },
  ["popup_resource"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Resource Popup", "Engagement", 1); },
  ["popup_henchmen"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Henchmen Popup", "Engagement", 1); },
  // first entry: event("Screen View", "Return To Game Popup", "Engagement", 1) — overwritten below in Lua
  ["popup_returntogame"]: function (message_id: any, message: any, sender: any) { event("Game", "Return", "Retention", 1); },
  ["show_settings"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Settings Screen", "Engagement", 1); },
  ["show_cards"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Cards Screen", "Engagement", 1); },
  ["show_quests"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Quests Screen", "Engagement", 1); },
  ["show_hero"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Hero Screen", "Engagement", 1); },
  ["show_sellitems"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Sell Items Screen", "Engagement", 1); },
  ["show_kingdom"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Kingdom Screen", "Engagement", 1); },
  ["show_map"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Map Screen", "Engagement", 1); },
  ["show_dungeon"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Createquest Screen", "Engagement", 1); },
  ["show_dungeonmine"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Dungeonmine Screen", "Engagement", 1); },
  ["show_item"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Item Screen", "Engagement", 1); },
  ["show_inventory"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Inventory Screen", "Engagement", 1); },
  ["show_stats"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Stats Screen", "Engagement", 1); },
  ["show_shop"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Shop Screen", "Engagement", 1); },
  ["show_openpack"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Open Pack Screen", "Engagement", 1); },
  ["show_timewarp"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Timewarp Screen", "Engagement", 1); },
  ["show_upgradecard"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Upgrade Card Screen", "Engagement", 1); },
  ["show_cardsunlock"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Unlock Cards Screen", "Engagement", 1); },
  ["show_heroselect"]: function (message_id: any, message: any, sender: any) { event("Screen View", "Hero Select Screen", "Engagement", 1); },

  ["on_start"]: function (message_id: any, message: any, sender: any) { event("Game", "Start", "Retention", 1); },

  ["complete_rank"]: function (message_id: any, message: any, sender: any) { event("Chapter Completed", cat("Chapter ", message.rank), "Progression", 1); },
  ["collect_quest"]: function (message_id: any, message: any, sender: any) { event("Quest Completed", cat("Quest ", defsave.get("Stats", "Rank"), "-", message.id), "Progression", 1); },

  ["chapter_gold"]: function (message_id: any, message: any, sender: any) { event("Gold Earned", cat("Chapter ", message.rank), "Economy", message.amount); },

  ["gen_adreward"]: function (message_id: any, message: any, sender: any) { event("Shop", "Free Loot", "Monetization", 1); },
  ["purchase_gold"]: function (message_id: any, message: any, sender: any) { event("Shop", "Buy Gold", "Monetization", message.msgpost.message.packGold); },
  ["purchase_cards"]: function (message_id: any, message: any, sender: any) { event("Shop", "Buy Cards", "Monetization", message.msgpost.message.packCards); },
  ["purchase_xp"]: function (message_id: any, message: any, sender: any) { event("Shop", "Buy Xp", "Monetization", message.msgpost.message.packXp); },
  ["purchase_time"]: function (message_id: any, message: any, sender: any) { event("Shop", "Buy Time", "Monetization", message.timeAmount); },

  ["reset_statistics"]: function (message_id: any, message: any, sender: any) { event("Reset Progress", "Button Pressed", "Progression", 1); },
}, 41);

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

void screenview; void uuid;

export default M;
