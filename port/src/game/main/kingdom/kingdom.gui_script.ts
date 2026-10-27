import { defineScript, gui, msg, hash, vmath, window, html5, print } from '../../../engine';
import { Capacitor } from '@capacitor/core';
import { t, cat, len, pairs, literal, tracked, tset, tostring, os, S, T } from '../../../lua';
import gooey from '../../gooey/gooey';
import inspect from '../../inspect';
import random from '../../random/random';
import progress from '../../progress/progress';
import saveload from '../../saveload/saveload';
import defsave from '../../defsave/defsave';
import actions from '../../actions';
import loc from '../../shared/locsheets';

void gooey; void inspect; void random; void progress;

function isnil(v: unknown): boolean { return v === undefined || v === null; }

defineScript('/main/kingdom/kingdom.gui_script', () => {
  const productName = "OoR";
  const currentPage = "kingdom";
  const controller = "main:/menu#controller";
  let enabled: any = false;

  const NODES = 31;
  let map_list: any = {}; void map_list;
  const mapNodes: any[] = [];

  /* The world map is how players move between the main game (map 1) and live
  events (map 2 onwards). Map 1's pin is always there and returns to the player's
  lands; an event's pin shows while it runs, with its name and time left. The
  next event's place shows a "Something stirs" pin counting down to its start,
  which says only a little of what is coming. */
  const MAIN_MAP = 1;
  const pins: any = tracked({});
  const STIRS = "stirs"; // the pins key of the next event's pin

  // The world-map location each map's pin and "!" tab hang off.
  // Night of the Wererabbit on the Stonetalon Cliffs, What Sleeps in Titans
  // Well on its shore, The Midnight Carnival outside a Sylvir Coast town, The
  // Longest Night in the Titan Mountains, The Blackmaw Siege at the top of
  // them. Each event's place is near enough the next one's that a phone frames
  // the live pin and "Something stirs" together.
  const MAP_NODE: Record<number, number> = { 1: 1, 2: 2, 3: 7, 4: 3, 5: 20, 6: 30 };
  const EVENT_PANEL: Record<string, string> = {
    WEREMOON: "tinyfancypanel_red", TITANSWELL: "tinyfancypanel_darkblue",
    MIDNIGHT: "tinyfancypanel_purple", LONGNIGHT: "tinyfancypanel_blue", BLACKMAW: "tinyfancypanel_gold",
  };
  const STIRS_PANEL = "tinyfancypanel_darkgrey";

  function map_of_node(node: number): any {
    for (const [map_id, n] of pairs<any>(MAP_NODE)) {
      if (n === node) { return map_id; }
    }
    return undefined;
  }

  function new_text(font: any, pos: any, size: any, scale: number, parent: any) {
    const node = gui.new_text_node(pos, "");
    gui.set_font(node, font);
    gui.set_size(node, size);
    gui.set_scale(node, vmath.vector3(scale, scale, 1));
    gui.set_parent(node, parent);
    return node;
  }

  function new_panel(flipbook: any, pos: any, size: any, parent: any) {
    const node = gui.new_box_node(pos, size);
    gui.set_texture(node, "main");
    gui.play_flipbook(node, flipbook);
    gui.set_slice9(node, vmath.vector4(16, 22, 32, 42));
    gui.set_parent(node, parent);
    return node;
  }

  // A pin's box grows to its text, and the text shrinks only past the widest box.
  const PIN_Y = 128;
  const PIN_H = 90;
  const PIN_MIN_W = 240;
  const PIN_MAX_W = 560;
  const PIN_PAD = 56;
  const TITLE_SCALE = 0.5;
  const TIMER_SCALE = 0.9;

  const PIN_BELOW_Y = -88; // under the location instead, when two pins would collide

  // Pins hang off holders added after every location, on the top layer, so
  // they draw over the other locations.
  function build_pin(key: any, map_id: any, flipbook: any) {
    const pin: any = { map_id: map_id };
    const at = gui.get_position(gui.get_node(cat("node_", MAP_NODE[map_id])));
    pin.holder = gui.new_box_node(vmath.vector3(at.x, at.y, 0), vmath.vector3(0, 0, 0));
    gui.set_parent(pin.holder, gui.get_node("kingdom/bg"));
    pin.bg = new_panel(flipbook, vmath.vector3(0, PIN_Y, 0), vmath.vector3(PIN_MIN_W, PIN_H, 0), pin.holder);
    pin.title = new_text("title", vmath.vector3(0, 14, 0), vmath.vector3(620, 40, 0), TITLE_SCALE, pin.bg);
    pin.timer = new_text("font", vmath.vector3(0, -20, 0), vmath.vector3(560, 36, 0), TIMER_SCALE, pin.bg);
    for (const node of [pin.bg, pin.title, pin.timer]) { gui.set_layer(node, "Tabs"); }
    tset(pins, key, pin);
  }

  // Moves the stirs pin to the next event's place.
  function move_pin(pin: any, map_id: any) {
    if (pin.map_id === map_id) { return; }
    pin.map_id = map_id;
    const at = gui.get_position(gui.get_node(cat("node_", MAP_NODE[map_id])));
    gui.set_position(pin.holder, vmath.vector3(at.x, at.y, 0));
  }

  function fit_pin(pin: any) {
    const timed = gui.get_text(pin.timer) !== "";
    const title_w = gui.get_text_metrics_from_node(pin.title).width * TITLE_SCALE;
    const timer_w = timed ? gui.get_text_metrics_from_node(pin.timer).width * TIMER_SCALE : 0;
    const w = Math.max(PIN_MIN_W, Math.min(PIN_MAX_W, Math.max(title_w, timer_w) + PIN_PAD));
    const room = w - PIN_PAD;
    const title = TITLE_SCALE * Math.min(1, room / Math.max(title_w, 1));
    const timer = TIMER_SCALE * Math.min(1, room / Math.max(timer_w, 1));
    gui.set_size(pin.bg, vmath.vector3(w, PIN_H, 0));
    gui.set_scale(pin.title, vmath.vector3(title, title, 1));
    gui.set_scale(pin.timer, vmath.vector3(timer, timer, 1));
    gui.set_position(pin.title, vmath.vector3(0, timed ? 14 : 4, 0));
  }

  function current_event(): any {
    return t(defsave.loaded.Stats) ? defsave.get("Stats", "Event") : defsave.loaded.Stats;
  }

  /* The dev menu, bottom left, only on a local dev server. "All events live"
  puts every event's pin up at once; tapping one that is not the live event
  makes it the live event (repController's dev_event) and opens it, without
  paying anything out, and each event keeps its chapter. Turning it off goes back
  to the schedule. */
  const DEV_HOSTS: Record<string, boolean> = { localhost: true, ["127.0.0.1"]: true, ["[::1]"]: true };
  const DEV_KEY = "DevAllEvents";
  let dev: any = undefined; // the menu's nodes, on a dev server only

  function dev_all_events(): any {
    return t(dev) && !isnil(defsave.loaded.Stats) && defsave.get("Stats", DEV_KEY) === true;
  }

  // The event after the live one, while it is still to come.
  function next_event(): any[] {
    const event = current_event();
    if (!t(event)) { return [undefined]; }
    const [upcoming, starts_at] = actions.next_event(os.time());
    if (upcoming.map_id === event.map_id) { return [undefined]; }
    return [upcoming, starts_at];
  }

  function refresh_pins() {
    const event = current_event();
    gui.set_text(pins[MAIN_MAP].title, S.upper(loc.get("WORLDMAP_HOME")));
    gui.set_text(pins[MAIN_MAP].timer, "");
    for (const [key, pin] of pairs<any>(pins)) {
      if (key !== MAIN_MAP && key !== STIRS) {
        const live = !isnil(event) && event.map_id === key;
        gui.set_enabled(pin.bg, live || t(dev_all_events()));
        if (!live && t(dev_all_events())) {
          const listed = actions.event_on_map(key);
          gui.set_text(pin.title, S.upper(loc.get(cat("EVENT_", listed.key, "_NAME"))));
          gui.set_text(pin.timer, "Dev: tap to play");
        } else if (live) {
          gui.set_text(pin.title, S.upper(loc.get(cat("EVENT_", event.key, "_NAME"))));
          let countdown = actions.format_countdown(event.ends_at - os.time());
          if (t(event.part_done)) {
            // The next part comes with this event's next run, after the others'.
            countdown = actions.format_countdown(actions.event_returns_at(event.ends_at) - os.time());
          }
          gui.set_text(pin.timer, loc.get(t(event.part_done) ? "EVENT_NEXT_PART_IN" : "EVENT_ENDS_IN", [countdown]));
        }
      }
    }
    const stirs = pins[STIRS];
    let [upcoming, starts_at] = next_event();
    if (t(dev_all_events())) { upcoming = undefined; }
    gui.set_enabled(stirs.bg, !isnil(upcoming));
    if (t(upcoming)) {
      move_pin(stirs, upcoming.map_id);
      gui.set_text(stirs.title, S.upper(loc.get("WORLDMAP_STIRS")));
      gui.set_text(stirs.timer, loc.get("WORLDMAP_STIRS_IN", [actions.format_countdown(starts_at - os.time())]));
    }
    for (const [, pin] of pairs<any>(pins)) { fit_pin(pin); }
  }

  /* ******************************************
            SCREEN FIT
  ******************************************** */

  /* The scene is drawn for a 750x1334 phone and Defold fits that rectangle
  into the window, so on any other shape the room left over turns into margin
  and anything full bleed stops reaching the edges. The root goes on a plain
  uniform fit, and the parts that have to touch an edge are placed against the
  real one. The long version of this note is in main/nav/header.gui_script. */
  const DESIGN_W = 750;
  const DESIGN_H = 1334;
  const HEADER_DEPTH = 255.5; // underside of the header's top bar, from the top edge
  const FOOTER_TOP = 105; // top of the header's bottom bar, from the bottom edge

  const screen: any = { w: 0, h: 0 };

  // The screen in design units, or nil if it has not changed since last call.
  function screen_changed(): [number | undefined, number | undefined] {
    const [ww, wh] = window.get_size();
    const scale = Math.min(ww / DESIGN_W, wh / DESIGN_H);
    const w = ww / scale, h = wh / scale;
    screen.scale = scale;
    if (Math.abs(w - screen.w) < 1 && Math.abs(h - screen.h) < 1) { return [undefined, undefined]; }
    screen.w = w; screen.h = h;
    const root = gui.get_node("root");
    gui.set_adjust_mode(root, gui.ADJUST_FIT);
    gui.set_xanchor(root, gui.ANCHOR_NONE);
    gui.set_yanchor(root, gui.ANCHOR_NONE);
    return [w, h];
  }

  function screen_left() { return (DESIGN_W - screen.w) / 2; }
  function screen_bottom() { return (DESIGN_H - screen.h) / 2; }
  function screen_top() { return screen_bottom() + screen.h; }
  function content_top() { return screen_top() - HEADER_DEPTH; }
  function content_bottom() { return screen_bottom() + FOOTER_TOP; }
  void content_top; void content_bottom;

  function place(id: string, x?: number, y?: number) {
    const node = gui.get_node(id);
    const p = gui.get_position(node);
    gui.set_position(node, vmath.vector3(t(x) ? x : p.x, t(y) ? y : p.y, p.z));
    return node;
  }

  function resize(id: string, w?: number, h?: number) {
    const node = gui.get_node(id);
    const s = gui.get_size(node);
    gui.set_size(node, vmath.vector3(t(w) ? w : s.x, t(h) ? h : s.y, s.z));
    return node;
  }

  let apply_view: any;

  function layout_screen() {
    const [w, h] = screen_changed();
    if (!t(w)) { return; }
    place("kingdom/clip", screen_left(), screen_bottom());
    resize("kingdom/clip", w, h);
    if (t(apply_view)) { apply_view(); }
  }

  /* ******************************************
            VIEW
  ******************************************** */

  /* The map opens framed on the pins (the player's lands and the live event),
  and the player can drag it and zoom it with a pinch or the mouse wheel. It
  never zooms out past the drawing's edges. The view is kept in the save as the
  zoom and the map point at the middle of the screen, so it comes back the same
  on any screen shape. */
  const MAX_ZOOM = 2;
  const FIT_MAX_ZOOM = 1; // framing the pins never zooms in past the art's own size
  const WHEEL_STEP = 1.15;
  const FIT_MARGIN = 24; // room left round the framed pins
  const FIT_TOP = 170; // the back button's corner
  const TAP_SLOP = 12; // how far a press may wander and still be a tap
  const VIEW_KEY = "WorldMapView";

  const SCROLL_UP = hash("scroll_up");
  const SCROLL_DOWN = hash("scroll_down");
  const MULTITOUCH = hash("multitouch");

  let view: any = undefined; // { zoom, x, y }, x and y in map units
  let drag: any = undefined;
  let pinch: any = undefined;

  // A live pin as its map point and the room its label and icon take round it.
  function pin_item(pin: any) {
    const p = gui.get_position(gui.get_node(cat("node_", MAP_NODE[pin.map_id])));
    const half = gui.get_size(pin.bg).x / 2;
    return { x: p.x, y: p.y, l: half, r: half, b: 40, t: PIN_Y + PIN_H / 2 };
  }

  // Screen extent of the items along one axis at a zoom: lowest edge, highest edge.
  function span(items: any[], zoom: number, axis: string, lo: string, hi: string): [number, number] {
    let a = Infinity, b = -Infinity;
    for (let k = 1; k <= len(items); k++) {
      const item = items[k - 1];
      a = Math.min(a, item[axis] * zoom - item[lo]);
      b = Math.max(b, item[axis] * zoom + item[hi]);
    }
    return [a, b];
  }

  function min_zoom() {
    const size = gui.get_size(gui.get_node("kingdom/bg"));
    return Math.max(screen.w / size.x, screen.h / size.y);
  }

  // The largest zoom that fits the pins in the room under the back button,
  // looking at their middle. If they can't all fit, the live event's pin and
  // the "Something stirs" pin are framed without home, and if even those two
  // can't, the live event's alone.
  function fit_view() {
    const all: any[] = []; let event: any = undefined, stirs: any = undefined;
    for (const [key, pin] of pairs<any>(pins)) {
      if (gui.is_enabled(pin.bg)) {
        const item = pin_item(pin);
        T.insert(all, item);
        if (key === STIRS) { stirs = item; } else if (key !== MAIN_MAP) { event = item; }
      }
    }
    const w = screen.w - 2 * FIT_MARGIN;
    const h = screen.h - FIT_MARGIN - FIT_TOP;
    function fits(items: any[], zoom: number) {
      const [x0, x1] = span(items, zoom, "x", "l", "r");
      const [y0, y1] = span(items, zoom, "y", "b", "t");
      return x1 - x0 <= w && y1 - y0 <= h;
    }
    let items = all;
    if (t(event) && !fits(all, min_zoom())) {
      items = (t(stirs) && fits([event, stirs], min_zoom())) ? [event, stirs] : [event];
    }
    let lo = min_zoom(), hi = FIT_MAX_ZOOM;
    if (fits(items, hi)) {
      lo = hi;
    } else {
      for (let k = 1; k <= 30; k++) {
        const mid = (lo + hi) / 2;
        if (fits(items, mid)) { lo = mid; } else { hi = mid; }
      }
    }
    const zoom = Math.max(lo, min_zoom());
    const [x0, x1] = span(items, zoom, "x", "l", "r");
    const [y0, y1] = span(items, zoom, "y", "b", "t");
    let cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2 + (FIT_TOP - FIT_MARGIN) / 2;
    if (t(event)) {
      // Slide just far enough to bring the event's whole pin on screen.
      cx = Math.max(event.x * zoom + event.r - w / 2, Math.min(event.x * zoom - event.l + w / 2, cx));
    }
    return literal({ zoom: zoom, x: cx / zoom, y: cy / zoom });
  }

  // Every pin sits above its location; the home pin drops below its own when
  // that would cover the event's.
  function place_pins() {
    const home = pins[MAIN_MAP];
    const zoom = view.zoom;
    let below = false;
    for (const [key, pin] of pairs<any>(pins)) {
      gui.set_scale(pin.holder, vmath.vector3(1 / zoom, 1 / zoom, 1));
      if (key !== MAIN_MAP && gui.is_enabled(pin.bg)) {
        const a = gui.get_position(home.holder), b = gui.get_position(pin.holder);
        const w = (gui.get_size(home.bg).x + gui.get_size(pin.bg).x) / 2;
        below = below || (Math.abs(a.x - b.x) * zoom < w && Math.abs(a.y - b.y) * zoom < PIN_H);
      }
    }
    gui.set_position(home.bg, vmath.vector3(0, below ? PIN_BELOW_Y : PIN_Y, 0));
  }

  // The map can't be dragged or zoomed past its edges.
  function clamp_axis(origin: number, length: number, room: number) {
    return Math.max(room - length, Math.min(0, origin));
  }

  apply_view = function () {
    if (!t(view)) { return; }
    const bg = gui.get_node("kingdom/bg");
    const size = gui.get_size(bg);
    const zoom = Math.max(min_zoom(), Math.min(MAX_ZOOM, view.zoom));
    const x = clamp_axis(screen.w / 2 - view.x * zoom, size.x * zoom, screen.w);
    const y = clamp_axis(screen.h / 2 - view.y * zoom, size.y * zoom, screen.h);
    view.zoom = zoom;
    view.x = (screen.w / 2 - x) / zoom;
    view.y = (screen.h / 2 - y) / zoom;
    gui.set_position(bg, vmath.vector3(x, y, 0));
    gui.set_scale(bg, vmath.vector3(zoom, zoom, 1));
    place_pins();
  };

  // Which pins are up, and where: a saved view is only kept while they are the
  // same, so a new event or a new "Something stirs" is framed when it appears.
  function pins_shown() {
    const shown: any[] = [];
    for (const [key, pin] of pairs<any>(pins)) {
      if (gui.is_enabled(pin.bg)) { T.insert(shown, cat(tostring(key), "@", pin.map_id)); }
    }
    T.sort(shown);
    return T.concat(shown, ",");
  }

  function remember_view() {
    if (t(view) && t(defsave.loaded.Stats)) {
      view.pins = pins_shown();
      defsave.set("Stats", VIEW_KEY, view);
      defsave.save("Stats");
    }
  }

  function restore_view() {
    let saved: any = defsave.loaded.Stats;
    if (t(saved)) { saved = defsave.key_exists("Stats", VIEW_KEY); }
    if (t(saved)) { saved = defsave.get("Stats", VIEW_KEY); }
    if (t(saved) && t(saved.zoom) && saved.pins === pins_shown()) {
      view = literal({ zoom: saved.zoom, x: saved.x, y: saved.y });
    } else {
      view = fit_view();
      remember_view();
    }
    apply_view();
  }

  // A window position in screen units from the screen's bottom-left corner.
  function to_screen(x: number, y: number): [number, number] {
    return [x / screen.scale, y / screen.scale];
  }

  // Zooms so the map point under (sx, sy) stays there.
  function zoom_at(sx: number, sy: number, zoom: number, mx?: any, my?: any) {
    if (!t(mx)) {
      const x = screen.w / 2 - view.x * view.zoom;
      const y = screen.h / 2 - view.y * view.zoom;
      mx = (sx - x) / view.zoom; my = (sy - y) / view.zoom;
    }
    view.zoom = Math.max(min_zoom(), Math.min(MAX_ZOOM, zoom));
    view.x = mx + (screen.w / 2 - sx) / view.zoom;
    view.y = my + (screen.h / 2 - sy) / view.zoom;
    apply_view();
  }

  /* ******************************************
            FUNCTIONS
  ******************************************** */

  function update_node(node: any, map_id: any) {
    if (enabled) {
      const event = current_event();
      const shown = !isnil(map_id) && ((!isnil(event) && event.map_id === map_id) || (t(dev_all_events()) && !isnil(actions.event_on_map(map_id))));
      gui.set_enabled(node, map_id === MAIN_MAP || shown);
    }
  }

  function refresh_all() {
    if (enabled) {
      map_list = saveload.load_data(productName, "Map");
      print(cat(S.upper(currentPage), " map data loaded")); //, inspect(map_list))
      for (let i = 1; i <= NODES; i++) {
        update_node(gui.get_node(cat("tab_", i)), map_of_node(i));
      }
    }
  }

  /* ******************************************
            INPUT
  ******************************************** */

  function on_map_pressed(map_id: any) {
    const event = current_event();
    if (map_id === MAIN_MAP) {
      msg.post(controller, "show_dungeonmine", { map_id: MAIN_MAP });
    } else if (!isnil(event) && event.map_id === map_id) {
      msg.post(controller, "show_dungeonmine", { map_id: map_id, dungeon_id: 1 });
      msg.post(controller, "event_enter");
    } else if (t(dev_all_events()) && t(actions.event_on_map(map_id))) {
      msg.post(controller, "dev_event", { key: actions.event_on_map(map_id).key, open: true });
    }
  }

  // The next event's pin hints at what is coming.
  function on_stirs_pressed() {
    const [upcoming] = next_event();
    if (t(upcoming)) {
      msg.post(controller, "popup_message", { title: "WORLDMAP_STIRS_TITLE", text: cat("EVENT_", upcoming.key, "_TEASER") });
    }
  }

  const DEV_BUTTON_W = 120, DEV_BUTTON_H = 64;
  const DEV_ROW_W = 400, DEV_ROW_H = 64;
  const DEV_MARGIN = 24;

  function build_dev_menu() {
    dev = false;
    let ok = true, host: any;
    try { host = html5.run("location.hostname"); } catch (e) { void e; ok = false; }
    // The native app also serves the game from https://localhost, and it is not a dev server.
    if (!ok || !t(DEV_HOSTS[host]) || Capacitor.isNativePlatform()) { return; }
    const clip = gui.get_node("kingdom/clip");
    dev = { open: false };
    dev.button = new_panel("tinyfancypanel_charcoal", vmath.vector3(0, 0, 0), vmath.vector3(DEV_BUTTON_W, DEV_BUTTON_H, 0), clip);
    dev.label = new_text("title", vmath.vector3(0, 2, 0), vmath.vector3(200, 40, 0), 0.5, dev.button);
    gui.set_text(dev.label, "DEV");
    dev.row = new_panel("tinyfancypanel_darkgrey", vmath.vector3(0, 0, 0), vmath.vector3(DEV_ROW_W, DEV_ROW_H, 0), clip);
    dev.row_label = new_text("title", vmath.vector3(0, 2, 0), vmath.vector3(DEV_ROW_W * 2, 40, 0), 0.45, dev.row);
    for (const node of [dev.button, dev.label, dev.row, dev.row_label]) { gui.set_layer(node, "Tabs"); }
  }

  // The button sits in the screen's bottom-left corner, the menu above it.
  function layout_dev_menu() {
    if (!t(dev)) { return; }
    gui.set_position(dev.button, vmath.vector3(DEV_MARGIN + DEV_BUTTON_W / 2, DEV_MARGIN + DEV_BUTTON_H / 2, 0));
    gui.set_position(dev.row, vmath.vector3(DEV_MARGIN + DEV_ROW_W / 2, DEV_MARGIN * 1.5 + DEV_BUTTON_H + DEV_ROW_H / 2, 0));
    gui.set_enabled(dev.row, dev.open);
    gui.set_text(dev.row_label, cat("ALL EVENTS LIVE: ", t(dev_all_events()) ? "ON" : "OFF"));
    gui.play_flipbook(dev.row, t(dev_all_events()) ? "tinyfancypanel_green" : "tinyfancypanel_darkgrey");
  }

  function toggle_all_events() {
    const on = !t(dev_all_events());
    defsave.set("Stats", DEV_KEY, on);
    defsave.save("Stats", true);
    // Off goes back to the event the schedule says is on.
    if (!on && t(defsave.get("Stats", "DevEvent"))) {
      msg.post(controller, "dev_event", { key: undefined });
    }
    refresh_all();
    refresh_pins();
    view = fit_view();
    remember_view();
    apply_view();
    layout_dev_menu();
  }

  // True if the tap was on the dev menu.
  function on_dev_tap(action: any) {
    if (!t(dev)) { return false; }
    if (gui.pick_node(dev.button, action.x, action.y)) {
      dev.open = !dev.open;
      layout_dev_menu();
      return true;
    } else if (dev.open && gui.pick_node(dev.row, action.x, action.y)) {
      toggle_all_events();
      return true;
    }
    return false;
  }

  // A tap opens the map under it: a pin's label or its "!" tab.
  function on_tap(action: any) {
    if (on_dev_tap(action)) { return; }
    for (const [key, pin] of pairs<any>(pins)) {
      if (gui.is_enabled(pin.bg) && gui.pick_node(pin.bg, action.x, action.y)) {
        if (key === STIRS) { on_stirs_pressed(); } else { on_map_pressed(key); }
        return;
      }
    }
    for (let i = 1; i <= NODES; i++) {
      const tab = gui.get_node(cat("tab_", i));
      if (gui.is_enabled(tab) && gui.pick_node(tab, action.x, action.y)) {
        on_map_pressed(map_of_node(i));
        return;
      }
    }
  }

  function on_pinch(touches: any[]) {
    const a = touches[0], b = touches[1];
    const [ax, ay] = to_screen(a.screen_x, a.screen_y);
    const [bx, by] = to_screen(b.screen_x, b.screen_y);
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const d = Math.max(1, Math.sqrt(Math.pow(ax - bx, 2) + Math.pow(ay - by, 2)));
    if (!t(pinch)) {
      const x = screen.w / 2 - view.x * view.zoom;
      const y = screen.h / 2 - view.y * view.zoom;
      pinch = { d: d, zoom: view.zoom, x: (mx - x) / view.zoom, y: (my - y) / view.zoom };
    }
    zoom_at(mx, my, pinch.zoom * d / pinch.d, pinch.x, pinch.y);
    if (t(drag)) { drag.moved = true; }
  }

  return {
    init(self) {
      layout_screen();
      print(S.upper(currentPage), "init", enabled);
      gui.set_enabled(gui.get_node("root"), enabled);

      for (let i = 1; i <= NODES; i++) {
        mapNodes[i - 1] = gui.get_flipbook(gui.get_node(cat("tab_", i)));
      }
      build_pin(MAIN_MAP, MAIN_MAP, "tinyfancypanel_charcoal");
      const EVENTS = actions.EVENTS;
      for (let e = 1; e <= len(EVENTS); e++) {
        const event = EVENTS[e - 1];
        build_pin(event.map_id, event.map_id, EVENT_PANEL[event.key]);
      }
      build_pin(STIRS, actions.EVENTS[0].map_id, STIRS_PANEL);
    },

    on_input(self, action_id, action) {
      if (isnil(action_id) || !enabled || !t(view)) { return; }
      if (action_id === SCROLL_UP || action_id === SCROLL_DOWN) {
        const [sx, sy] = to_screen(action.screen_x, action.screen_y);
        zoom_at(sx, sy, view.zoom * (action_id === SCROLL_UP ? WHEEL_STEP : 1 / WHEEL_STEP));
        remember_view();
      } else if (action_id === MULTITOUCH) {
        const touches: any[] = [];
        const list = t(action.touch) ? action.touch : [];
        for (let k = 1; k <= len(list); k++) {
          const tch = list[k - 1]; // `t` in the Lua
          if (!t(tch.released)) { T.insert(touches, tch); }
        }
        if (len(touches) >= 2) {
          on_pinch(touches);
        } else if (t(pinch)) {
          pinch = undefined;
          drag = undefined;
          remember_view();
        }
      } else {
        const [sx, sy] = to_screen(action.screen_x, action.screen_y);
        if (t(action.pressed) || !t(drag)) {
          drag = { sx: sx, sy: sy, x: view.x, y: view.y, moved: !t(action.pressed) };
        } else if (!t(pinch)) {
          if (Math.abs(sx - drag.sx) > TAP_SLOP || Math.abs(sy - drag.sy) > TAP_SLOP) { drag.moved = true; }
          if (drag.moved) {
            view.x = drag.x - (sx - drag.sx) / view.zoom;
            view.y = drag.y - (sy - drag.sy) / view.zoom;
            apply_view();
          }
        }
        if (t(action.released)) {
          if (!drag.moved && !t(pinch)) { on_tap(action); }
          drag = undefined;
          remember_view();
        }
      }
    },

    /* ******************************************
    MESSAGES
    ******************************************** */

    on_message(self, message_id, message, sender) {
      if (message_id === hash("set_enabled")) {
        print(S.upper(currentPage), "enabled", enabled);
        enabled = message.enabled;
        gui.set_enabled(gui.get_node("root"), enabled);
        if (t(enabled)) {
          msg.post("main:/overlay#header", "set_enabled", { enabled: false });
          msg.post(controller, "focus_kingdom", { status: true });
          // Built on first open: during boot the page is not ready for it.
          if (isnil(dev)) {
            try { build_dev_menu(); } catch (e) {
              // PARITY: the printed error is the JS message, not the Lua one.
              print("KINGDOM dev menu", (e as Error).message); dev = false;
            }
          }
          refresh_all();
          refresh_pins();
          restore_view();
          layout_dev_menu();
        }
        msg.post("main:/overlay#back", "set_enabled", { enabled: message.enabled });
      } else if (message_id === hash("refresh_all")) {
        refresh_all();
        if (t(enabled)) {
          refresh_pins();
          layout_dev_menu();
        }
      }
    },

    update(self, dt) {
      layout_screen();
      if (t(enabled)) { refresh_pins(); }
    },
  };
});
