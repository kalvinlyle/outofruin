// controllers/navigationController.lua
import inspect_ from '../inspect';
import actions_ from '../actions';
import random_ from '../random/random';
import progress_ from '../progress/progress';
import defsave_ from '../defsave/defsave';
import { msg, hash, print, sys, html5 } from '../../engine';
import { pairs, literal, cat, len, t, T } from '../../lua';
import audio from '../../systems/audio';

const inspect: any = inspect_;
const actions: any = actions_;
const random: any = random_;
const progress: any = progress_;
const defsave: any = defsave_;

const productName = "OoR";
const controller = "main:/menu#controller";

const M: any = {};

const messageData: any = {};

let map_id: any = 1;
let currentScreen: any = "boot";
const currentPopup: any = "";
let breadcrumb: any[] = [];
let showKingdom: any = true;
const boot_list: any = {};

function isnil(v: any): boolean { return v === undefined || v === null; }

function setCurrentScreen(nextScreen: any, message?: any) {
  if (isnil(message)) message = {};


  print("NAVIGATOR: moving from", currentScreen, "to", nextScreen);
  if (breadcrumb[len(breadcrumb) - 1] === "boot" || breadcrumb[len(breadcrumb) - 1] === "mainmenu") breadcrumb = ["mainmenu"];
  T.insert(breadcrumb, currentScreen);
  message.enabled = false;
  msg.post(cat("main:/menu#", currentScreen), "set_enabled", message);
  message.enabled = true;
  msg.post(cat("main:/menu#", nextScreen), "set_enabled", message);
  currentScreen = nextScreen;
  audio.setScreen(String(nextScreen || ""));
  if (nextScreen === "kingdom" || nextScreen === "map") {
    audio.playFanfare("worldmap");
  }
}

function hidePopup(popup: any, message: any) {
  message.enabled = false;
  msg.post(cat("main:/popup#", popup), "set_enabled", message);
  msg.post("main:/overlay#header", "set_active", { active: true });
  msg.post("main:/overlay#back", "set_active", { active: true });
  msg.post(cat("main:/menu#", currentScreen), "set_active", { active: true });
  audio.setPopupOpen(false);
}

function showPopup(popup: any, message: any) {
  hidePopup(currentPopup, message);
  message.enabled = true;
  msg.post(cat("main:/popup#", popup), "set_enabled", message);
  msg.post("main:/overlay#header", "set_active", { active: false });
  msg.post("main:/overlay#back", "set_active", { active: false });
  msg.post(cat("main:/menu#", currentScreen), "set_active", { active: false });
  audio.setPopupOpen(true);
}

function previousScreen(popup: any, message?: any) {
  if (breadcrumb[len(breadcrumb) - 1] === "mainmenu") breadcrumb = ["mainmenu"];
  print("NAVIGATOR: go back", currentScreen, breadcrumb[len(breadcrumb) - 1], inspect(breadcrumb));
  if (isnil(message)) message = {};
  message.enabled = false;
  msg.post(cat("main:/menu#", currentScreen), "set_enabled", message);
  currentScreen = breadcrumb[len(breadcrumb) - 1];
  message.enabled = true;
  msg.post(cat("main:/menu#", currentScreen), "set_enabled", message);
  T.remove(breadcrumb, len(breadcrumb));
  audio.setScreen(String(currentScreen || ""));
}

function boot(bootfile: any) {
  boot_list[bootfile] = true;
  if (t(boot_list["Map"])
    && t(boot_list["Hero"])
    && t(boot_list["Henchmen"])
    && t(boot_list["Stats"])
    && t(boot_list["Rep"])
    && t(boot_list["Loot"])
    && t(boot_list["Currency"])
  ) {
    setCurrentScreen("boot");
  }
}

messageData["all"] = literal({
  ["boot_map"]: function (message_id: any, message: any, sender: any) { boot("Map"); },
  ["boot_hero"]: function (message_id: any, message: any, sender: any) { boot("Hero"); },
  ["boot_henchmen"]: function (message_id: any, message: any, sender: any) { boot("Henchmen"); },
  ["boot_stats"]: function (message_id: any, message: any, sender: any) { boot("Stats"); },
  ["boot_rep"]: function (message_id: any, message: any, sender: any) { boot("Rep"); },
  ["boot_loot"]: function (message_id: any, message: any, sender: any) { boot("Loot"); },
  ["boot_currency"]: function (message_id: any, message: any, sender: any) { boot("Currency"); },
  ["pause"]: function (message_id: any, message: any, sender: any) { msg.post("main:/menu#dungeonmine", "pause", message); },
  ["unpause"]: function (message_id: any, message: any, sender: any) { msg.post("main:/menu#dungeonmine", "unpause", message); },
  ["set_particletarget"]: function (message_id: any, message: any, sender: any) { msg.post("main:/overlay#guiparticles", "set_particletarget", message); },
  ["spawn_particles"]: function (message_id: any, message: any, sender: any) { msg.post("main:/overlay#guiparticles", "spawn_particles", message); },
  // The message lands in previousScreen's `popup` parameter; its `message` is nil.
  ["show_previous"]: function (message_id: any, message: any, sender: any) { previousScreen(message); },
  ["start_game"]: function (message_id: any, message: any, sender: any) {
    setCurrentScreen("dungeonmine", message);
  },
  ["reset_statistics"]: function (message_id: any, message: any, sender: any) {
    map_id = 1;
    showKingdom = true;
    setCurrentScreen("dungeonmine", literal({ map_id: 1, dungeon_id: 1 }));
    msg.post("main:/overlay#header", "disable_alerts");
  },
  ["show_background"]: function (message_id: any, message: any, sender: any) { msg.post("main:/background#background", "set_enabled", message); },

  ["popup_loading"]: function (message_id: any, message: any, sender: any) { showPopup("loading_popup", message); },
  ["popup_message"]: function (message_id: any, message: any, sender: any) { showPopup("message_popup", message); },
  ["popup_confirm"]: function (message_id: any, message: any, sender: any) { showPopup("confirm_popup", message); },
  ["popup_quest"]: function (message_id: any, message: any, sender: any) { showPopup("quest_popup", message); },
  ["popup_questCollect"]: function (message_id: any, message: any, sender: any) { showPopup("questCollect_popup", message); },
  ["popup_questOpen"]: function (message_id: any, message: any, sender: any) { showPopup("questOpen_popup", message); },
  ["popup_questClose"]: function (message_id: any, message: any, sender: any) { showPopup("questClose_popup", message); },
  ["popup_rankUp"]: function (message_id: any, message: any, sender: any) { showPopup("rankUp_popup", message); },
  ["popup_resource"]: function (message_id: any, message: any, sender: any) { showPopup("resource_popup", message); },
  ["popup_henchmen"]: function (message_id: any, message: any, sender: any) { showPopup("henchmen_popup", message); },
  ["popup_returntogame"]: function (message_id: any, message: any, sender: any) {
    showPopup("returntogame_popup", message);
  },
  ["hide_popup"]: function (message_id: any, message: any, sender: any) { hidePopup(currentPopup, message); },

  ["show_settings"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("settings", message); },
  ["show_cards"]: function (message_id: any, message: any, sender: any) {
    if (t(defsave.get("Stats", "Show").cardsButton)) {
      setCurrentScreen("cards", message);
    }
  },
  ["show_home"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("roster", message); },
  ["show_quests"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("quests", message); },
  ["show_hero"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("hero", message); },
  ["show_sellitems"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("sellitems", message); },
  ["focus_kingdom"]: function (message_id: any, message: any, sender: any) { showKingdom = message.status; },
  ["show_kingdom"]: function (message_id: any, message: any, sender: any) {
    if (!t(showKingdom) && !isnil(map_id)) {
      if (!isnil(map_id)) message.map_id = map_id;
      setCurrentScreen("map", message);
    } else {
      setCurrentScreen("kingdom", message);
    }
  },
  ["show_map"]: function (message_id: any, message: any, sender: any) {
    map_id = message.map_id;
    setCurrentScreen("map", message);
  },
  ["show_dungeon"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("createquest", message); },
  ["show_dungeonmine"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("dungeonmine", message); },
  ["show_item"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("item", message); },
  ["show_inventory"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("inventory", message); },
  ["show_stats"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("stats", message); },
  ["show_shop"]: function (message_id: any, message: any, sender: any) {
    if (t(defsave.get("Stats", "Show").shopButton)) {
      setCurrentScreen("shop", message);
    }
  },
  ["show_openpack"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("openpack", message); },
  ["show_timewarp"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("timewarp", message); },
  ["show_upgradecard"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("upgradecard", message); },
  ["show_cardsunlock"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("unlockcards", message); },
  ["show_heroselect"]: function (message_id: any, message: any, sender: any) { setCurrentScreen("heroselect", message); },


  ["toggle_profile"]: function (message_id: any, message: any, sender: any) { msg.post("@system:", "toggle_profile"); },
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

void actions; void random; void progress; void productName; void controller;

// Module locals the parity harness dumps (tools/port/parity/README.md, State dump format).
M.__parity_locals = () => ({ boot_list, breadcrumb, currentPopup, currentScreen, map_id, showKingdom });

export default M;
