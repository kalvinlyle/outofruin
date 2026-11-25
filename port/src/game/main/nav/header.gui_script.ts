import { defineScript, gui, msg, hash, vmath, window, print } from '../../../engine';
import { t, cat, len, pairs, literal, os, S, T } from '../../../lua';
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
import chapter0 from '../../chapter0/chapter0';
import { make_frame } from '../../chapter0/guide';
import buttonFx from '../../shared/button_fx';

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
  let rankTitle: any;
  const isAnimating: any[] = [];

  // The Map button is how players move between the main game and live events,
  // so it appears when events unlock and counts down the current run.
  let mapTimerNode: any;

  // The Start Chapter button sits where the quest cards are. Once the chapter's
  // rep target is met the leftover quests are optional, so they make way for
  // the button instead of drawing over it.
  // On an event map the quest cards and the progress bar belong to the event:
  // its current tier's quests, counted towards that tier instead of the chapter.
  function event_here(): boolean {
    const event = Stats.Event;
    return !isnil(event) && !isnil(event.quests) && !isnil(Stats.Location) && Stats.Location.map_id === event.map_id;
  }

  // Chapter 0 runs on Rank 1 but is shown as chapter 0.
  function shown_rank(): number { return chapter0.active() ? 0 : Stats.Rank; }

  /* Chapter 0's frame on the quest notice and the chapter button; the
  dungeon screen says the words. */
  const ch0_frame = make_frame();
  function chapter0_guide() {
    const step = event_here() ? undefined : chapter0.step(() => false);
    let target: any = undefined;
    if (t(step) && step!.kind === "rankup") {
      target = gui.get_node("rankup/bg");
    } else if (t(step) && (step!.kind === "quest" || step!.kind === "collect")) {
      for (const [, item] of pairs<any>(quest_items)) {
        if (t(item.data) && t(item.nodes) && item.data.Status === (step!.kind === "quest" ? "New" : "Completed")) {
          target = item.nodes[hash(step!.kind === "quest" ? "new/bg" : "collect/bg")];
        }
      }
    }
    if (t(target) && gui.is_enabled(target)) { ch0_frame.point(target); } else { ch0_frame.hide(); }
  }

  function rankup_ready(): boolean {
    return !event_here() && !isnil(Stats.Rank) && !isnil(Ranks[Stats.Rank - 1]) && num(Stats.Rank) < len(Ranks) && num(Stats.Rep) >= Ranks[Stats.Rank - 1].RepNeeded;
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
    // The wood plank behind the quest cards runs the full width too, with its
    // ragged ends past the edges.
    gui.set_size(gui.get_node("wood_top/bg"), vmath.vector3(w + 50, 135, 0));

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

    if (t(enabled)) { set_particletargets(); }
  }

  /* ******************************************
            FUNCTIONS
  ******************************************** */

  /* On an event map the chapter book and the bar under it belong to the
  event: its own book, and a bar in its colour with the event's name, the time
  left in the run and how far the current chapter has got, right under the book
  so it reads as the chapter's. The quest cards move down to make room, and the
  dungeon screen starts lower by the same EVENT_BAR_H. Books are frames in the
  items_drops atlas; only frames listed here are ever played, since playing one
  the atlas lacks takes the renderer down. */
  const EVENT_STYLE: any = {
    // book: a 9-slice frame and its margins, drawn into the scene's 110x135 node
    WEREMOON: { book: "chapter_book_weremoon_slice9", slice: vmath.vector4(50, 66, 50, 66), panel: "tinyfancypanel_red" },
    TITANSWELL: { book: "chapter_book_titanswell_slice9", slice: vmath.vector4(50, 66, 50, 66), panel: "tinyfancypanel_darkblue" },
    MIDNIGHT: { book: "chapter_book_midnight_slice9", slice: vmath.vector4(50, 66, 50, 66), panel: "tinyfancypanel_purple" },
    LONGNIGHT: { book: "chapter_book_longnight_slice9", slice: vmath.vector4(50, 66, 50, 66), panel: "tinyfancypanel_blue" },
    BLACKMAW: { book: "chapter_book_blackmaw_slice9", slice: vmath.vector4(50, 66, 50, 66), panel: "tinyfancypanel_gold" },
  };
  const EVENT_BAR_H = 52;
  const EVENT_BAR_TOP = 128;	// where the top panel ends, from the top edge
  let shown_book: any = undefined;
  let book_slice: any = undefined;
  let event_bar: any = undefined;
  let bar_shift = 0;
  const SHIFTED = ["wood_top/bg", "quests/root", "rankup/root"];
  const shifted_y: any = {};

  function event_style(): any {
    return event_here() ? EVENT_STYLE[Stats.Event.key] : undefined;
  }

  function show_chapter_book() {
    const node = gui.get_node("rank_banner/bg");
    const style = event_style();
    const book = t(style) ? cat("items_drops/", style.book) : "main/chapter_book";
    if (book === shown_book) { return; }
    if (!t(shown_book)) {
      // The node keeps the size the scene gives it whichever frame it draws.
      const size = gui.get_size(node);
      gui.set_size_mode(node, gui.SIZE_MODE_MANUAL);
      gui.set_size(node, size);
      book_slice = gui.get_slice9(node);
    }
    shown_book = book;
    // Each book is a 9-slice stretched to the node, with margins for its frame.
    gui.set_slice9(node, t(style) ? style.slice : book_slice);
    gui.set_texture(node, t(style) ? "items_drops" : "main");
    gui.play_flipbook(node, t(style) ? style.book : "chapter_book");
  }

  function bar_text(scale: number, pivot: any) {
    const node = gui.new_text_node(vmath.vector3(0, 3, 0), "");
    gui.set_font(node, "title");
    gui.set_scale(node, vmath.vector3(scale, scale, 1));
    gui.set_size(node, vmath.vector3(900, 40, 0));
    gui.set_pivot(node, pivot);
    gui.set_parent(node, event_bar.bg);
    return node;
  }

  // The name, the time left and the chapter share the bar's width: the time
  // sits in the room between the other two, and all three shrink together when
  // a long event name would run into it.
  const BAR_SCALES: any = literal({ name: 0.62, timer: 0.55, chapter: 0.62 });
  const BAR_EDGE = 20;
  const BAR_GAP = 16;

  function fit_event_bar(w: number) {
    const widths: any = {}; let total = 0;
    for (const [part_, scale] of pairs<any>(BAR_SCALES)) { const part = part_ as string;
      widths[part] = gui.get_text_metrics_from_node(event_bar[part]).width * scale;
      total = total + widths[part];
    }
    const room = w - 2 * BAR_EDGE - 2 * BAR_GAP;
    const f = Math.min(1, room / Math.max(total, 1));
    for (const [part_, scale] of pairs<any>(BAR_SCALES)) { const part = part_ as string;
      gui.set_scale(event_bar[part], vmath.vector3(scale * f, scale * f, 1));
    }
    const left = -w / 2 + BAR_EDGE + widths.name * f;
    const right = w / 2 - BAR_EDGE - widths.chapter * f;
    gui.set_position(event_bar.timer, vmath.vector3((left + right) / 2, 3, 0));
  }

  function build_event_bar() {
    const top = gui.get_node("panel_top/bg");
    event_bar = {};
    event_bar.bg = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(DESIGN_W, EVENT_BAR_H, 0));
    gui.set_texture(event_bar.bg, "main");
    gui.play_flipbook(event_bar.bg, "tinyfancypanel_charcoal");
    gui.set_slice9(event_bar.bg, vmath.vector4(16, 22, 32, 42));
    gui.set_parent(event_bar.bg, gui.get_parent(top));
    // Under the top panel, so the book hangs over the bar's edge.
    gui.move_below(event_bar.bg, top);
    event_bar.name = bar_text(BAR_SCALES.name, gui.PIVOT_W);
    event_bar.timer = bar_text(BAR_SCALES.timer, gui.PIVOT_CENTER);
    event_bar.chapter = bar_text(BAR_SCALES.chapter, gui.PIVOT_E);
    for (let k = 1; k <= len(SHIFTED); k++) { const id = SHIFTED[k - 1]; shifted_y[id] = gui.get_position(gui.get_node(id)).y; }
  }

  // Moves the quest cards down by the bar's height, in the top panel's units.
  function shift_quests(on: boolean) {
    const shift = on ? EVENT_BAR_H / gui.get_scale(gui.get_node("panel_top/bg")).y : 0;
    if (shift === bar_shift) { return; }
    bar_shift = shift;
    for (let k = 1; k <= len(SHIFTED); k++) {
      const id = SHIFTED[k - 1];
      const node = gui.get_node(id);
      const p = gui.get_position(node);
      p.y = shifted_y[id] - shift;
      gui.set_position(node, p);
    }
  }

  function refresh_event_bar() {
    if (!t(event_bar)) { build_event_bar(); }
    const style = event_style();
    gui.set_enabled(event_bar.bg, !isnil(style));
    shift_quests(!isnil(style));
    if (!t(style)) { return; }
    const event = Stats.Event;
    const w = screen.w, h = screen.h;
    gui.play_flipbook(event_bar.bg, style.panel);
    gui.set_position(event_bar.bg, vmath.vector3(w / 2, h - EVENT_BAR_TOP - EVENT_BAR_H / 2, 0));
    gui.set_size(event_bar.bg, vmath.vector3(w + 10, EVENT_BAR_H, 0));
    gui.set_position(event_bar.name, vmath.vector3(-w / 2 + 20, 3, 0));
    gui.set_position(event_bar.chapter, vmath.vector3(w / 2 - 20, 3, 0));
    gui.set_text(event_bar.name, S.upper(loc.get(cat("EVENT_", event.key, "_NAME"))));
    const countdown = actions.format_countdown(event.ends_at - os.time());
    const quests = t(event.quests) ? event.quests : [];
    let done = 0;
    for (let q = 1; q <= len(quests); q++) {
      const quest = quests[q - 1];
      if (quest.Status === "Collected") { done = done + 1; }
    }
    // A finished part counts down to the next one instead.
    if (len(quests) > 0) {
      gui.set_text(event_bar.timer, loc.get("EVENT_ENDS_IN", [countdown]));
      gui.set_text(event_bar.chapter, loc.get("EVENT_QUEST_TIER", [event.tier, done, len(quests)]));
    } else if (t(event.part_done)) {
      // The next part comes with this event's next run, after the others'.
      const back = actions.format_countdown(actions.event_returns_at(event.ends_at) - os.time());
      gui.set_text(event_bar.timer, loc.get("EVENT_NEXT_PART_IN", [back]));
      gui.set_text(event_bar.chapter, loc.get("EVENT_PART_DONE", [Math.floor((event.tier - 2) / 10) + 1]));
    } else {
      gui.set_text(event_bar.timer, loc.get("EVENT_ENDS_IN", [countdown]));
      gui.set_text(event_bar.chapter, loc.get("EVENT_COMPLETE"));
    }
    fit_event_bar(w);
  }

  /* Patron heroes show up in the header when their bonus lands
  (gdd/heroes-roster.md): Tomas Quill writes his share under every XP gain,
  Grubb tags the quest notices he nailed up, and Wren Lightfoot's song moves a
  quest's bar on. */
  let quest_items: any = [];
  const grubb_tags = new Map<any, any>();
  let hfx_font: any = undefined;

  function hfx_text(text: any, screen_pos: any, color: any) {
    hfx_font = t(hfx_font) ? hfx_font : gui.get_font(gui.get_node("xp/total"));
    const node = gui.new_text_node(vmath.vector3(0, 0, 0), text);
    gui.set_font(node, hfx_font);
    gui.set_parent(node, gui.get_node("root"));
    gui.set_outline(node, vmath.vector4(0, 0, 0, 1));
    gui.set_color(node, color);
    gui.set_screen_position(node, screen_pos);
    const p = gui.get_position(node);
    gui.animate(node, "position.y", p.y - 50, gui.EASING_OUTSINE, 1.4);
    gui.animate(node, "color.w", 0, gui.EASING_INQUAD, 0.4, 1.2, function (self: any, n: any) { gui.delete_node(n); });
    return node;
  }

  function hfx_face(flipbook: any, screen_pos: any) {
    const node = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(70, 70, 0));
    gui.set_parent(node, gui.get_node("root"));
    gui.set_texture(node, "main");
    gui.play_flipbook(node, flipbook);
    gui.set_screen_position(node, screen_pos);
    gui.set_scale(node, vmath.vector3(0.2, 0.2, 1));
    gui.animate(node, "scale", vmath.vector3(1, 1, 1), gui.EASING_OUTBACK, 0.25);
    gui.animate(node, "color.w", 0, gui.EASING_INQUAD, 0.3, 1.3, function (self: any, n: any) { gui.delete_node(n); });
    return node;
  }

  function hero_bonus_fx(message: any) {
    if (message.kind === "lessonplans") {
      const at = gui.get_screen_position(gui.get_node("xp/icon"));
      hfx_face("patron_tomasquill", vmath.vector3(at.x - 60, at.y - 50, 0));
      hfx_text(loc.get("HERO_BONUS_LESSONPLANS", [actions.display_number(message.bonus)]), vmath.vector3(at.x, at.y - 60, 0), vmath.vector4(1, 0.62, 0.78, 1));
    } else if (message.kind === "ballad") {
      for (const [, item] of pairs<any>(quest_items)) {
        if (t(item.data) && item.data.id === message.quest_id && t(item.nodes)) {
          const card = item.nodes[hash("quest/bg")];
          gui.animate(card, "scale", vmath.mul(gui.get_scale(card), 1.12), gui.EASING_OUTQUAD, 0.15, 0, undefined, gui.PLAYBACK_ONCE_PINGPONG);
          const at = gui.get_screen_position(card);
          hfx_text(cat("+", actions.display_number(message.after - message.before)), vmath.vector3(at.x, at.y + 30, 0), vmath.vector4(1, 0.84, 0.3, 1));
        }
      }
    }
  }

  function update_list(list: any) {

    quest_items = list.items;
    for (const [ik, item] of pairs<any>(list.items)) {
      const i = ik as number;
      if (!isnil(item.data)) {
        const questNode = item.nodes[hash("quest/bg")];
        const bg = item.nodes[hash("quest/bg")];
        let tag = grubb_tags.get(bg);
        if (t(item.data.grubb)) {
          if (!t(tag)) {
            tag = gui.new_box_node(vmath.vector3(0, 0, 0), vmath.vector3(44, 44, 0));
            gui.set_texture(tag, "main");
            gui.play_flipbook(tag, "patron_grubb");
            gui.set_parent(tag, bg);
            gui.set_position(tag, vmath.vector3(gui.get_size(bg).x * 0.4, gui.get_size(bg).y * 0.4, 0));
            grubb_tags.set(bg, tag);
          }
          gui.set_enabled(tag, true);
        } else if (t(tag)) {
          gui.set_enabled(tag, false);
        }
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
            actions.set_item_icon(prizeNode, item.data.Reward);
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

          // An icon from an atlas this scene lacks throws; one bad quest
          // must not stop the rest of the header refreshing.
          if (!isnil(item.data.Icon) && item.data.Icon !== "") {
            try { actions.set_item_icon(iconNode, item.data.Icon); } catch (e) { void e; }
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

  // On an event map the XP slot shows the event's shards, which are its XP:
  // its cards level up with them and its items' rank-ups pay them.
  let xp_icon_art: any = undefined;
  let shown_xp_art: any = undefined;
  function show_xp_slot() {
    const where = defsave.get("Stats", "Location");
    const shards = t(where) ? actions.event_shards(where.map_id) : where;
    const icon = gui.get_node("xp/icon");
    if (!t(xp_icon_art)) {
      gui.set_size_mode(icon, gui.SIZE_MODE_MANUAL);
      xp_icon_art = { texture: gui.get_texture(icon), flipbook: gui.get_flipbook(icon) };
    }
    let art = xp_icon_art;
    if (t(shards)) {
      const resource = defsave.loaded.Resources.data[shards];
      art = resource.Icon;
      gui.set_text(gui.get_node("xp/total"), actions.display_number(resource.Count));
    }
    if (art !== shown_xp_art) {
      shown_xp_art = art;
      gui.set_texture(icon, art.texture);
      gui.play_flipbook(icon, art.flipbook);
    }
  }

  let followers_pending = 0;
  let followers_icon_base_scale: any = undefined;

  function update_followers_text() {
    if (t(defsave) && actions.tablelength(defsave.loaded.Currency) > 0) {
      const actual = defsave.get("Currency", "Followers");
      const shown = Math.max(0, (t(actual) ? actual : 0) + followers_pending);
      gui.set_text(gui.get_node("followers/total"), actions.display_number(shown));
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
      update_followers_text();

    }

    show_xp_slot();

    if (actions.tablelength(defsave.loaded.Stats) > 0) {

      Stats = actions.clone(defsave.loaded.Stats.data);
      Ranks = actions.clone(defsave.loaded.Ranks.data);
      if (Stats.Rank === len(Ranks) + 1) {
        gui.set_text(gui.get_node("rank/text"), loc.get("CHAPTER_MAX"));
      } else {
        gui.set_text(gui.get_node("rank/text"), shown_rank());
      }

      Quests = [];
      activeQuests = [];

      if (event_here()) {
        const eq = Stats.Event.quests;
        for (let q = 1; q <= len(eq); q++) {
          const quest = eq[q - 1];
          T.insert(Quests, quest);
          if (quest.Status !== "Collected") { T.insert(activeQuests, 1, quest); }
        }
      } else if (num(Stats.Rank) <= len(Ranks)) {
        assert(Ranks[Stats.Rank - 1].Quests, "quests missing");
        const rq = Ranks[Stats.Rank - 1].Quests;
        for (let q = 1; q <= len(rq); q++) {
          const quest = rq[q - 1];
          T.insert(Quests, quest);
          if (len(activeQuests) < num(actions.quest_slots(Stats.questSlots)) && quest.Status !== "Collected") {
            // Past the chapter's own slots, the notice is one Grubb put up.
            quest.grubb = len(activeQuests) >= Math.min(3, t(Stats.questSlots) ? Stats.questSlots : 1);
            T.insert(activeQuests, 1, quest);

          }
        }
      }
      gui.set_enabled(gui.get_node("shop/bg"), t(Stats.Show.shopButton));
      gui.set_enabled(gui.get_node("mapbutton/bg"), t(Stats.Show.mapButton) || !isnil(Stats.Event));
      gui.set_enabled(gui.get_node("cards/bg"), t(Stats.Show.cardsButton));
      gui.set_enabled(gui.get_node("discord/bg"), false);


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
        gui.set_text(gui.get_node("rankup/text"), S.upper(loc.get("CHAPTER_NEXT", shown_rank() + 1)));
        gui.set_enabled(gui.get_node("rankup/bg"), rankup_ready());
        const posNode = "rankup/bg";
        const pos = gui.get_position(gui.get_node(posNode));
        const rootNode = gui.get_node("rankup/root");
        const rootPos = gui.get_position(rootNode);
        const rootScale = gui.get_scale(rootNode);
        gui.set_position(rootNode, vmath.vector3(-pos.x / 2 * rootScale.x, rootPos.y, rootPos.z));
      }
      // Chapter 0's quests appear with its first hire.
      gui.set_enabled(gui.get_node("quests/root"), !rankup_ready() && chapter0.quests_shown());

      if (t(Ranks[Stats.Rank - 1])) {
        if (Stats.Rank >= len(Ranks) && Stats.Rank >= Ranks[Stats.Rank - 1].RepNeeded) {
          gui.set_text(gui.get_node("rank/text"), loc.get("CHAPTER_MAX"));
        } else {
          gui.set_text(gui.get_node("rank/text"), shown_rank());
        }
      } else {
        gui.set_text(gui.get_node("rank/text"), loc.get("CHAPTER_MAX"));
      }


      let rankQuests = 0;
      let rankRep = Stats.Rep;
      if (isnil(rankTitle)) { rankTitle = gui.get_text(gui.get_node("rank/title")); }
      gui.set_text(gui.get_node("rank/title"), event_here() ? S.upper(loc.get("EVENT_TIER_LABEL")) : rankTitle);
      show_chapter_book();
      if (event_here()) {
        rankQuests = len(Stats.Event.quests);
        rankRep = 0;
        const eq = Stats.Event.quests;
        for (let q = 1; q <= len(eq); q++) {
          const quest = eq[q - 1];
          if (quest.Status === "Collected") { rankRep = rankRep + 1; }
        }
        // A finished part shows the chapter that finished it until the next run.
        const first = rankQuests > 0 ? Stats.Event.tier : false;
        const chapter = t(first) ? first : (t(Stats.Event.part_done) ? Stats.Event.tier - 1 : undefined);
        gui.set_text(gui.get_node("rank/text"), t(chapter) ? chapter : loc.get("CHAPTER_MAX"));
      } else if (Stats.Rank <= len(Ranks)) { rankQuests = Ranks[Stats.Rank - 1].RepNeeded; }
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
        gui.set_text(rankProgText, cat(rankRep, "/", rankQuests));
      }
    }

  }

  /* ******************************************
            INPUT
  ******************************************** */

  function update_button(button: any) { }

  function on_pressed_rankup(item: any) {
    cleanup();
    // Chapter 0 has nothing to sell: it closes straight into Chapter 1.
    if (chapter0.active()) {
      msg.post(controller, "popup_confirm", { title: loc.get("CH0_CLOSE_TITLE"), text: loc.get("CH0_CLOSE_MESSAGE"), msgpost: { message_id: "complete_rank", message: { callback: "dungeonmine", rank: 0, portal: false, chapter0: true } } });
      return;
    }
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
    const quest = item.data[item.selected_item - 1];
    if (t(quest.event)) {
      // Event quests always carry their quest-giver's lines.
      if (quest.Status === "New") {
        msg.post(controller, "popup_questOpen", { id: quest.id, event: true });
      } else if (quest.Status === "Completed") {
        msg.post(controller, "popup_questClose", { id: quest.id, event: true });
      }
      return;
    }
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
  function on_pressed_footerquest(button: any) {
    msg.post(controller, "focus_kingdom", { status: true });
    msg.post(controller, "show_kingdom");
  }

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
      // The Kongregate build's frame counter and username: nothing a player should see.
      gui.set_enabled(gui.get_node("fps/text"), false);
      gui.set_enabled(gui.get_node("username/text"), false);
      // The scene draws the XP star at 60x60, larger than the 45x45 coin and
      // pawn beside it; match it to them.
      const goldIcon = gui.get_node("gold/icon");
      const xpIcon = gui.get_node("xp/icon");
      gui.set_size(xpIcon, gui.get_size(goldIcon));
      gui.set_position(xpIcon, gui.get_position(goldIcon));
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

      mapTimerNode = gui.new_text_node(vmath.vector3(0, -22, 0), "");
      gui.set_font(mapTimerNode, "body");
      gui.set_size(mapTimerNode, vmath.vector3(220, 30, 0));
      gui.set_color(mapTimerNode, actions.get_color("red", 1));
      gui.set_parent(mapTimerNode, gui.get_node("mapbutton/bg"));

      buttonFx.bind_visual(gui.get_node("cards/bg"), gui.get_node("cards/icon"));
      buttonFx.bind_visual(gui.get_node("shop/bg"), gui.get_node("shop/icon"));
    },

    update(self, dt) {
      layout_screen();
      if (enabled) {
        refresh_event_bar();
        chapter0_guide();
        if (t(Stats.Event)) {
          gui.set_text(mapTimerNode, actions.format_countdown(Stats.Event.ends_at - os.time()));
        } else {
          gui.set_text(mapTimerNode, "");
        }

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

        if (num(Stats.Rank) <= len(Ranks) && !event_here()) {
          if (num(Stats.Rep) >= Ranks[Stats.Rank - 1].RepNeeded) {
            gooey.button("rankup/bg", action_id, action, on_pressed_rankup, update_button);
            gooey.button("portal/bg", action_id, action, on_pressed_portal, update_button);
          }
        }

        if (!rankup_ready()) {
          gooey.horizontal_dynamic_list("quests", "quests/root", "quests/item", activeQuests, action_id, action, undefined, on_pressed_quest, update_list);
        }

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
      } else if (message_id === hash("hero_bonus_fx")) {
        hero_bonus_fx(message);
      } else if (message_id === hash("hire_followers_hold")) {
        followers_pending = followers_pending + (t(message.amount) ? message.amount : 0);
      } else if (message_id === hash("hire_followers_step")) {
        followers_pending = Math.max(0, followers_pending - (t(message.amount) ? message.amount : 0));
        if (followers_pending < 1e-6) { followers_pending = 0; }
        update_followers_text();
        const icon = gui.get_node("followers/icon");
        if (!t(followers_icon_base_scale)) { followers_icon_base_scale = gui.get_scale(icon); }
        gui.cancel_animation(icon, "scale");
        gui.set_scale(icon, vmath.mul(followers_icon_base_scale, 1.18));
        gui.animate(icon, "scale", followers_icon_base_scale, gui.EASING_OUTBACK, 0.16);
      } else if (message_id === hash("hire_followers_clear")) {
        followers_pending = 0;
        update_followers_text();
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
