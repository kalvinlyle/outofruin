import { defineScript, gui, msg, hash, vmath, window, print } from '../../../engine';
import { t, cat, len, pairs, os, S, T } from '../../../lua';
import { G } from '../../globals';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import actions from '../../actions';
import progress from '../../progress/progress';
import saveload from '../../saveload/saveload';
import defsave from '../../defsave/defsave';
import loc from '../../shared/locsheets';
import gui_extra_functions from '../../gui_extra_functions/gui_extra_functions';

void inspect; void random; void progress; void saveload;

function assert(v: unknown, m?: string): void {
  if (!t(v)) throw new Error(m ?? 'assertion failed!');
}

/** A Lua `<`/`<=` operand: comparing nil (or a table) with a number raises an error. */
function num(v: any): number {
  if (typeof v !== 'number') throw new Error('attempt to compare ' + (v === undefined || v === null ? 'nil' : typeof v) + ' with number');
  return v;
}

function isnil(v: unknown): boolean { return v === undefined || v === null; }

defineScript('/main/nav/header.gui_script', () => {
  const productName = "OoR"; void productName;
  const currentPage = "header";
  let Stats: any = {};
  let Ranks: any = [];
  let Quests: any[] = [];
  let activeQuests: any[] = [];

  const controller = "main:/menu#controller";
  let enabled: any = false;
  let active: any = true;
  let buttonNode: any, labelNode: any; void buttonNode; void labelNode;
  const nuggetNodes: any[] = [];
  let shopalertPos: any = {};
  const shopVisible = false; void shopVisible;
  let cardAlertPos: any = 0;

  let focus: any = "roster";
  const packTotal = 0; void packTotal;

  let questWidth: any;
  let questPos: any;
  const isAnimating: any[] = [];

  // The Start Chapter button sits where the quest cards are. Once the chapter's
  // rep target is met the leftover quests are optional, so they make way for
  // the button instead of drawing over it.
  function rankup_ready(): boolean {
    return !isnil(Stats.Rank) && !isnil(Ranks[Stats.Rank - 1]) && num(Stats.Rank) < len(Ranks) && num(Stats.Rep) >= Ranks[Stats.Rank - 1].RepNeeded;
  }

  /* ******************************************
            SCREEN FIT
  ******************************************** */

  /* The scene is drawn for a 750x1334 phone. Defold scales that rectangle
  uniformly to fit the window and leaves whatever is left over as margin, so on
  any other shape the chrome floats away from the edges (or, with the scene's
  authored stretch modes, smears to meet them). Putting the scene root on a
  plain uniform fit and then placing the chrome against the real screen edges
  keeps the art undistorted and the bars where they belong, on anything from a
  21:9 phone to a 4:3 tablet. Everything below the root inherits a reference
  scale of 1, so their own adjust modes and anchors no longer apply. */
  const DESIGN_W = 750;
  const DESIGN_H = 1334;

  const screen = { w: 0, h: 0 };

  // The screen in design units: wider than DESIGN_W on a squat window, taller
  // than DESIGN_H on a long one.
  function screen_size(): [number, number] {
    const [ww, wh] = window.get_size();
    const scale = Math.min(ww / DESIGN_W, wh / DESIGN_H);
    return [ww / scale, wh / scale];
  }

  function move_x(id: string, x: number) {
    const node = gui.get_node(id);
    const p = gui.get_position(node);
    p.x = x;
    gui.set_position(node, p);
  }

  function layout_screen() {
    const [w, h] = screen_size();
    if (Math.abs(w - screen.w) < 1 && Math.abs(h - screen.h) < 1) { return; }
    screen.w = w; screen.h = h;

    const root = gui.get_node("root");
    gui.set_adjust_mode(root, gui.ADJUST_FIT);
    gui.set_xanchor(root, gui.ANCHOR_NONE);
    gui.set_yanchor(root, gui.ANCHOR_NONE);

    // The clip box becomes the screen, so its children are laid out in
    // 0..w, 0..h with the origin on the screen's bottom left corner.
    const clip = gui.get_node("menu/clip");
    gui.set_position(clip, vmath.vector3((DESIGN_W - w) / 2, (DESIGN_H - h) / 2, 0));
    gui.set_size(clip, vmath.vector3(w, h, 0));

    // Top bar, pinned to the top edge and widened to cover it. It is drawn at
    // half scale, hence the doubled sizes, and overhangs each side by 25.
    const top = gui.get_node("panel_top/bg");
    gui.set_position(top, vmath.vector3(w / 2, h + 3, 0));
    gui.set_size(top, vmath.vector3((w + 50) * 2, -517, 0));
    gui.set_size(gui.get_node("progress/bg"), vmath.vector3(w * 2 + 50, 280, 0));

    // Rank banner keeps to the left edge; the three currencies share the rest.
    move_x("rank_banner/bg", -w + 112);
    gui.set_size(gui.get_node("currency/bg"), vmath.vector3((w - 150) * 2, 225, 0));
    const spread = (w - 150) / 600;
    move_x("gold/bg", -388 * spread);
    move_x("xp/bg", -1 * spread);
    move_x("followers/bg", 386 * spread);

    // Bottom bar, pinned to the bottom edge, with its button clusters pushed
    // out to the sides.
    const bottom = gui.get_node("panel_bottom/bg");
    gui.set_position(bottom, vmath.vector3(w / 2 + 1, -20, 0));
    gui.set_size(bottom, vmath.vector3(w + 150, 125, 0));
    move_x("buttons/right/root", w / 2);
    move_x("buttons/left/root", -w / 2);
  }

  /* ******************************************
            FUNCTIONS
  ******************************************** */

  function update_list(list: any) {
    for (const [ik, item] of pairs<any>(list.items)) {
      const i = ik as number;
      if (!isnil(item.data)) {
        const questNode = item.nodes[hash("quest/bg")];
        const collectNode = item.nodes[hash("collect/bg")];
        const glintNode = item.nodes[hash("collect/glint")];
        const newNode = item.nodes[hash("new/bg")];
        const iconNode = item.nodes[hash("quest/icon")];
        const titleNode = item.nodes[hash("quest/text")];
        const detailNode = item.nodes[hash("quest/resource")];
        const progressBgNode = item.nodes[hash("quest/progress/bg")];
        const progressFillNode = item.nodes[hash("quest/progress/fill")];
        const totalNode = item.nodes[hash("quest/progress/text")];
        const prizeNode = item.nodes[hash("collect/prize/icon")];

        if (item.data.Status === "Completed") {
          gui.set_enabled(collectNode, true);
          gui.set_enabled(questNode, false);
          gui.set_enabled(newNode, false);

          if (gui.get_flipbook(glintNode) === hash("button_glint_static")) {
            gui.play_flipbook(glintNode, "button_glint");
          }
          if (!isnil(item.data.Reward)) {
            gui.set_texture(prizeNode, item.data.Reward.texture);
            gui.play_flipbook(prizeNode, item.data.Reward.flipbook);
          }
        } else if (item.data.Status === "New") {
          gui.set_enabled(collectNode, false);
          gui.set_enabled(questNode, false);
          gui.set_enabled(newNode, true);

          if (!t(isAnimating[i - 1])) {
            isAnimating[i - 1] = true;
            gui.animate(newNode, "scale", vmath.vector3(1, 1, 1), gui.EASING_OUTBOUNCE, 1, (4 - i) / 9, undefined, gui.PLAYBACK_LOOP_FORWARD);
          }

        } else {
          gui.set_enabled(collectNode, false);
          gui.set_enabled(questNode, true);
          gui.set_enabled(newNode, false);


          if (!isnil(item.data.Name)) {
            gui.set_text(titleNode, S.upper(loc.get(item.data.Type)));
            gui.set_text(detailNode, S.upper(loc.get(item.data.Stat)));
          }

          if (!isnil(item.data.Icon) && item.data.Icon !== "") {
            gui.set_texture(iconNode, item.data.Icon.texture);
            gui.play_flipbook(iconNode, item.data.Icon.flipbook);
          }

          if (!isnil(item.data.Total) && !isnil(item.data.Goal)) {
            let progPercent = 0;
            progPercent = Math.max(0, Math.floor(item.data.Total) / item.data.Goal);
            const progSize = gui.get_size(progressBgNode);
            gui.set_size(progressFillNode, vmath.vector3(progSize.x * progPercent, progSize.y, progSize.z));
            gui.set_text(totalNode, cat(actions.display_number(Math.floor(item.data.Total)), "/", actions.display_number(item.data.Goal)));
          }
        }
      }
    }
  }

  function cleanup() {
    // ipairs stops at the first nil, so it ends right after clearing slot 2.
    for (let n = 1; ; n++) {
      const nugget = nuggetNodes[n - 1];
      if (isnil(nugget)) break;
      if (n > 1) {
        gui.delete_node(nuggetNodes[n - 1]);
        nuggetNodes[n - 1] = undefined;
      }
    }
  }

  function refresh_all() {

    if (t(defsave.get("Stats", "username"))) {
      gui.set_text(gui.get_node("username/text"), defsave.get("Stats", "username"));
    }

    if (actions.tablelength(defsave.loaded.Currency) > 0) {

      const currency = actions.clone(defsave.loaded.Currency.data);
      gui.set_text(gui.get_node("gold/total"), actions.display_number(currency.Gold));
      gui.set_text(gui.get_node("xp/total"), actions.display_number(currency.Xp));
      gui.set_text(gui.get_node("followers/total"), actions.display_number(defsave.get("Currency", "Followers")));

    }

    if (actions.tablelength(defsave.loaded.Stats) > 0) {

      Stats = actions.clone(defsave.loaded.Stats.data);
      Ranks = actions.clone(defsave.loaded.Ranks.data);
      if (Stats.Rank === len(Ranks) + 1) {
        gui.set_text(gui.get_node("rank/text"), loc.get("CHAPTER_MAX"));
      } else {
        gui.set_text(gui.get_node("rank/text"), Stats.Rank);
      }

      Quests = [];
      activeQuests = [];

      if (num(Stats.Rank) <= len(Ranks)) {
        assert(Ranks[Stats.Rank - 1].Quests, "quests missing");
        const rq = Ranks[Stats.Rank - 1].Quests;
        for (let q = 1; q <= len(rq); q++) {
          const quest = rq[q - 1];
          T.insert(Quests, quest);
          if (len(activeQuests) < num(Stats.questSlots) && quest.Status !== "Collected") {
            T.insert(activeQuests, 1, quest);

          }
        }
      }
      gui.set_enabled(gui.get_node("shop/bg"), t(Stats.Show.shopButton));
      gui.set_enabled(gui.get_node("mapbutton/bg"), t(Stats.Show.mapButton));
      gui.set_enabled(gui.get_node("cards/bg"), t(Stats.Show.cardsButton));
      gui.set_enabled(gui.get_node("discord/bg"), t(Stats.Show.discordButton));


      questPos = gui.get_position(gui.get_node("quests/root"));
      G.questScale = gui.get_scale(gui.get_node("quests/root"));

      gui.set_position(gui.get_node("quests/root"), vmath.vector3(questWidth * len(activeQuests) * G.questScale.x, questPos.y, questPos.z));
      update_list(gooey.horizontal_dynamic_list("quests", "quests/root", "quests/item", activeQuests, G.action_id, G.action, undefined, function () { }, function () { }, true));


      const shopAlert = gui.get_node("shop/alert");
      if (os.time(os.date("!*t")) >= num(Stats.adReward)) {
        gui.set_enabled(shopAlert, true);
      } else {
        gui.set_enabled(shopAlert, false);
      }


      const cardsAlertText = gui.get_node("cards/alert/text");
      let all_cards: any = [];
      all_cards = actions.tableConcat(all_cards, actions.load_all_savedata("Hero"));
      all_cards = actions.tableConcat(all_cards, actions.load_all_savedata("Henchmen"));
      all_cards = actions.tableConcat(all_cards, actions.load_all_savedata("Gear"));

      let numAlerts = 0;
      for (let c = 1; c <= len(all_cards); c++) {
        const card = all_cards[c - 1];
        card.Progress = t(card.Progress) ? card.Progress : 0;
        if (card.Progress >= 1 && card.Status === "Unlocked") { numAlerts = numAlerts + 1; }
      }

      gui.set_text(cardsAlertText, numAlerts);

      const cardsAlert = gui.get_node("cards/alert/bg");
      gui.set_enabled(cardsAlert, numAlerts > 0);
      if (cardAlertPos === 0) {
        gui.set_color(cardsAlert, actions.get_color("red"));
        cardAlertPos = gui.get_position(cardsAlert);
      }

      gui.set_enabled(gui.get_node("rankup/bg"), false);
      gui.set_enabled(gui.get_node("portal/bg"), false);
      if (num(Stats.Rank) < len(Ranks)) {
        gui.play_flipbook(gui.get_node("rankup/glint"), "button_glint");
        gui.set_text(gui.get_node("rankup/text"), S.upper(loc.get("CHAPTER_NEXT", Stats.Rank + 1)));
        gui.set_enabled(gui.get_node("rankup/bg"), num(Stats.Rep) >= Ranks[Stats.Rank - 1].RepNeeded);
        const posNode = "rankup/bg";
        const pos = gui.get_position(gui.get_node(posNode));
        const rootNode = gui.get_node("rankup/root");
        const rootPos = gui.get_position(rootNode);
        const rootScale = gui.get_scale(rootNode);
        gui.set_position(rootNode, vmath.vector3(-pos.x / 2 * rootScale.x, rootPos.y, rootPos.z));
      }
      gui.set_enabled(gui.get_node("quests/root"), !rankup_ready());

      if (t(Ranks[Stats.Rank - 1])) {
        if (Stats.Rank >= len(Ranks) && Stats.Rank >= Ranks[Stats.Rank - 1].RepNeeded) {
          gui.set_text(gui.get_node("rank/text"), loc.get("CHAPTER_MAX"));
        } else {
          gui.set_text(gui.get_node("rank/text"), Stats.Rank);
        }
      } else {
        gui.set_text(gui.get_node("rank/text"), loc.get("CHAPTER_MAX"));
      }


      let rankQuests = 0;
      if (Stats.Rank <= len(Ranks)) { rankQuests = Ranks[Stats.Rank - 1].RepNeeded; }
      if (rankQuests === 0) {
        gui.set_enabled(gui.get_node("rankprogress/back/bg"), false);
        gui.set_enabled(gui.get_node("rankprogress/bg"), false);
        gui.set_enabled(gui.get_node("rankprogress/text"), false);
      } else {
        gui.set_enabled(gui.get_node("rankprogress/back/bg"), true);
        gui.set_enabled(gui.get_node("rankprogress/bg"), true);
        gui.set_enabled(gui.get_node("rankprogress/text"), true);
        const rankProgText = gui.get_node("rankprogress/text");
        const rankProgWidth = gui.get_size(gui.get_node("rankprogress/back/bg")).x - (gui.get_position(gui.get_node("rankprogress/bg")).x * 2);
        const rankNuggetWidth = rankProgWidth / rankQuests;
        const rankNuggetNode = gui.get_node("rankprogress/bg");
        const rankNuggetSize = gui.get_size(rankNuggetNode);
        gui.set_size(rankNuggetNode, vmath.vector3(rankNuggetWidth, rankNuggetSize.y, rankNuggetSize.z));
        let nuggetPos = gui.get_position(rankNuggetNode);
        let completedQuests = 0;
        let collectedQuests = 0;
        for (let q = 1; q <= len(Quests); q++) {
          const quest = Quests[q - 1];
          if (quest.Status === "Completed") { completedQuests = completedQuests + 1; }
          if (quest.Status === "Collected") { collectedQuests = collectedQuests + 1; }
        }

        const emptyColor = "progress_bar_section_darkgrey";
        const activeColor = "progress_bar_section_grey";
        const completedColor = "progress_bar_section_green";
        const collectedColor = "progress_bar_section_gold";

        for (let i = 1; i <= rankQuests; i++) {
          if (i === 1) {
            nuggetNodes[i - 1] = rankNuggetNode;
          } else {
            if (isnil(nuggetNodes[i - 1])) { nuggetNodes[i - 1] = gui.clone(rankNuggetNode); }
            gui.set_position(nuggetNodes[i - 1], vmath.vector3(nuggetPos.x + rankNuggetWidth, nuggetPos.y, nuggetPos.z));
            gui.set_size(nuggetNodes[i - 1], vmath.vector3(rankNuggetWidth, rankNuggetSize.y, rankNuggetSize.z));
          }
          nuggetPos = gui.get_position(nuggetNodes[i - 1]);

          if (i <= collectedQuests) {
            gui.play_flipbook(nuggetNodes[i - 1], collectedColor);
          } else if (i <= collectedQuests + completedQuests) {
            gui.play_flipbook(nuggetNodes[i - 1], completedColor);
          } else if (i <= collectedQuests + len(activeQuests)) {
            gui.play_flipbook(nuggetNodes[i - 1], activeColor);
          } else {
            gui.play_flipbook(nuggetNodes[i - 1], emptyColor);
          }
        }
        gui.set_text(rankProgText, cat(Stats.Rep, "/", rankQuests));
      }
    }

  }

  /* ******************************************
            INPUT
  ******************************************** */

  function update_button(button: any) { }

  function on_pressed_rankup(item: any) {
    cleanup();
    msg.post(controller, "popup_confirm", { title: loc.get("CONFIRM_CHAPTER_CLOSE_TITLE"), text: loc.get("CONFIRM_CHAPTER_CLOSE_MESSAGE"), msgpost: { message_id: "show_sellitems", message: { portal: false } } });
  }

  function on_pressed_portal(item: any) {
    if (defsave.get("Currency", "PortalScrolls") > 0) {
      cleanup();
      msg.post(controller, "use_portalscroll");
    } else if (defsave.get("Currency", "Gold") > defsave.get("Stats", "portalScrollCost")) {
      cleanup();
      msg.post(controller, "buy_portalscroll", { gold: -defsave.get("Stats", "portalScrollCost"), amount: 1 });
      msg.post(controller, "use_portalscroll");
    } else {
      msg.post(controller, "show_shop");
    }
  }

  function on_pressed_quest(item: any) {
    const sel = () => item.data[item.selected_item - 1];
    if (sel().Status === "New" && !isnil(sel().Story_Int)) {

      msg.post(controller, "popup_questOpen", { id: sel().id });
    } else if (sel().Status === "New" && isnil(sel().Story_Int)) {
      msg.post(controller, "read_quest", { rank: Stats.Rank, id: sel().id });
    } else if (sel().Status === "Completed" && !isnil(sel().Story_Ext)) {
      msg.post(controller, "popup_questClose", { id: sel().id });
    } else if (sel().Status === "Completed" && isnil(sel().Story_Ext)) {
      msg.post(controller, "popup_questCollect", { id: sel().id });
      refresh_all();
    }
  }

  function on_pressed_footerbutton(item: any) {
    if (focus !== item) {
      msg.post(controller, cat("show_", item), { focus: item });
    } else {
      msg.post(controller, "show_dungeonmine");
    }
  }

  function on_pressed_footersettings(button: any) { on_pressed_footerbutton("settings"); }
  function on_pressed_footershop(button: any) { on_pressed_footerbutton("shop"); }
  function on_pressed_footercards(button: any) { on_pressed_footerbutton("cards"); }
  function on_pressed_footerdiscord(button: any) { msg.post(controller, "social_discord"); }
  function on_pressed_footerquest(button: any) { msg.post(controller, "show_kingdom"); }

  /* ******************************************
            MESSAGES
  ******************************************** */

  function set_particletargets() {
    const target_xp_pos = gui.get_screen_position(gui.get_node("xp/icon"));
    print(target_xp_pos);
    const target_gold_pos = gui.get_screen_position(gui.get_node("gold/icon"));
    const target_followers_pos = gui.get_screen_position(gui.get_node("followers/icon"));
    msg.post(controller, "set_particletarget", { name: "target_xp", pos: target_xp_pos });
    msg.post(controller, "set_particletarget", { name: "target_gold", pos: target_gold_pos });
    msg.post(controller, "set_particletarget", { name: "target_followers", pos: target_followers_pos });
  }

  return {
    init(self) {
      layout_screen();
      questWidth = gui.get_size(gui.get_node("quests/item")).x / 2;
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);
      gooey.acquire_input();
      gui_extra_functions.init();
      shopalertPos = gui.get_position(gui.get_node("shop/alert"));
      gui.set_render_order(10);
      isAnimating[0] = false;
      isAnimating[1] = false;
      isAnimating[2] = false;

      gui.set_color(gui.get_node("rank/title"), actions.get_color("gold", 0.75));
      gui.set_color(gui.get_node("rank/text"), actions.get_color("gold", 0.75));
    },

    update(self, dt) {
      layout_screen();
      if (enabled) {

        const shopicon = gui.get_node("shop/icon");
        const shopalert = gui.get_node("shop/alert");
        const iconPos = gui.get_position(shopicon);
        const alertPos = gui.get_position(shopalert);
        if (!isnil(Stats.adReward)) {
          if (os.time(os.date("!*t")) >= num(Stats.adReward) && iconPos.y === 0) {

            gui.set_position(shopicon, vmath.vector3(iconPos.x, 22, iconPos.z));
            gui.animate(shopicon, "position.y", 0.5, gui.EASING_OUTBOUNCE, 0.5);

            gui.set_position(shopalert, vmath.vector3(alertPos.x, shopalertPos.y + 20, alertPos.z));
            gui.animate(shopalert, "position.y", shopalertPos.y, gui.EASING_OUTBOUNCE, 0.5);

            gui.set_rotation(shopalert, vmath.vector3(0, 0, -15));
            gui.animate(shopalert, "rotation.z", 0, gui.EASING_OUTELASTIC, 0.5);
          }
          if (iconPos.y === 0.5) {
            gui.animate(shopicon, "position.y", 0, gui.EASING_OUTBOUNCE, 1);
          }
        }
      }
    },

    on_input(self, action_id, action) {
      if (!isnil(action_id) && enabled && active) {

        if (num(Stats.Rank) <= len(Ranks)) {
          if (num(Stats.Rep) >= Ranks[Stats.Rank - 1].RepNeeded) {
            gooey.button("rankup/bg", action_id, action, on_pressed_rankup, update_button);
            gooey.button("portal/bg", action_id, action, on_pressed_portal, update_button);
          }
        }

        if (!rankup_ready()) {
          gooey.horizontal_dynamic_list("quests", "quests/root", "quests/item", activeQuests, action_id, action, undefined, on_pressed_quest, update_list);
        }

        gooey.button("discord/bg", action_id, action, on_pressed_footerdiscord, update_button);
        gooey.button("cards/bg", action_id, action, on_pressed_footercards, update_button);
        gooey.button("mapbutton/bg", action_id, action, on_pressed_footerquest, update_button);
        gooey.button("shop/bg", action_id, action, on_pressed_footershop, update_button);
        gooey.button("settings/bg", action_id, action, on_pressed_footersettings, update_button);

      }
    },

    on_message(self, message_id, message, sender) {

      if (message_id === hash("set_enabled")) {
        enabled = message.enabled;
        print(S.upper(currentPage), "enabled", enabled);
        gui.set_enabled(gui.get_node("root"), enabled);
        active = true;
        if (enabled) {
          if (!isnil(message.focus)) { focus = message.focus; }
          if (t(defsave)) { refresh_all(); }
          set_particletargets();
        }
      } else if (message_id === hash("get_particletargets")) {
        set_particletargets();
      } else if (message_id === hash("set_active")) {
        active = message.active;
        if (enabled && t(defsave)) { refresh_all(); }
      } else if (message_id === hash("set_platform")) {
        gui.set_text(gui.get_node("platform/text"), cat("platform: ", message.platform));
      } else if (message_id === hash("update_fps")) {
        gui.set_text(gui.get_node("fps/text"), cat("fps: ", message.text));
        if (enabled && t(defsave)) { refresh_all(); }
      } else if (message_id === hash("refresh_all")) {
        if (enabled && t(defsave)) { refresh_all(); }
      } else if (message_id === hash("window_dimensions")) {
        gui_extra_functions.update_coef(message.width, message.height);
        // `targets` is an unset global here (guiparticles keeps its own local), so pairs(nil) raises.
        if (isnil(G.targets)) throw new Error("bad argument #1 to 'pairs' (table expected, got nil)");
        for (const [tk, target] of pairs(G.targets)) {
          void target;
          G.targets[tk as any] = gui.get_position(gui.get_node(tk as string));
        }
        set_particletargets();
      } else if (message_id === hash("window_resized")) {
        msg.post("@render:", "get_dimensions", { callback: "main:/overlay#header" });
        set_particletargets();
      } else if (message_id === hash("layout_changed")) {
        gooey.horizontal_dynamic_list("quests", "quests/root", "quests/item", activeQuests, G.action_id, G.action).scroll_to(0, 0);
        set_particletargets();
      }
    },
  };
});
