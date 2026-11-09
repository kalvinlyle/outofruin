// Mouse input as Defold 1.2.167 html5 sees it: library_glfw.js listeners on
// window, dmHID polling once per frame, dmInput binding update and the engine's
// GOActionCallback conversion to game coordinates. Touch drives the same left
// button: a phone tap's down and up arrive between two frames, so presses are
// latched until the next poll sees them.
import type { Action } from './api';
import { f } from './math32';

interface MouseState { x: number; y: number; buttons: number; wheel: number }

/** GLFW/Browser state, updated by DOM events between frames. */
const glfw = { mouseX: 0, mouseY: 0, buttons: 0, wheelPos: 0, latched: 0 };

export function installInputListeners(canvas: HTMLCanvasElement) {
  const calc = (ev: { pageX: number; pageY: number }) => {
    const rect = canvas.getBoundingClientRect();
    const cw = canvas.width, ch = canvas.height;
    const sx = window.scrollX ?? window.pageXOffset, sy = window.scrollY ?? window.pageYOffset;
    let x = ev.pageX - (sx + rect.left);
    let y = ev.pageY - (sy + rect.top);
    x = x * (cw / rect.width);
    y = y * (ch / rect.height);
    glfw.mouseX = x; glfw.mouseY = y;
  };
  const isCanvasActive = (ev: Event) => {
    let res = typeof document.activeElement === 'undefined' || document.activeElement === canvas;
    if (!res) res = ev.target === canvas;
    const t = ev.target as any;
    if (t && t.focus) t.focus();
    return res;
  };
  window.addEventListener('mousemove', (ev) => {
    calc(ev);
    if (ev.target === canvas) ev.preventDefault();
  }, true);
  const buttonChanged = (ev: MouseEvent) => {
    if (!isCanvasActive(ev)) return false;
    calc(ev);
    if (ev.target !== canvas) return false;
    ev.preventDefault();
    return true;
  };
  window.addEventListener('mousedown', (ev) => {
    if (ev.target !== canvas) return;
    glfw.buttons |= 1 << ev.button;
    glfw.latched |= 1 << ev.button;
    buttonChanged(ev);
  }, true);
  window.addEventListener('mouseup', (ev) => {
    if (!isCanvasActive(ev)) return;
    glfw.buttons &= ~(1 << ev.button);
    buttonChanged(ev);
  }, true);
  const wheel = (ev: any) => {
    if (!isCanvasActive(ev)) return;
    let delta = 0;
    if (ev.type === 'DOMMouseScroll') delta = ev.detail;
    else if (ev.type === 'mousewheel') delta = ev.wheelDelta;
    glfw.wheelPos += delta;
    if (ev.target === canvas) ev.preventDefault();
  };
  window.addEventListener('DOMMouseScroll', wheel, true);
  window.addEventListener('mousewheel', wheel, true);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // One finger is the left button. preventDefault stops the browser's
  // synthetic mouse events (a second, late press) and its scroll and zoom.
  let touchId: number | null = null;
  const find = (ev: TouchEvent) => {
    for (let i = 0; i < ev.changedTouches.length; i++) {
      if (ev.changedTouches[i].identifier === touchId) return ev.changedTouches[i];
    }
    return null;
  };
  canvas.addEventListener('touchstart', (ev) => {
    ev.preventDefault();
    if (touchId !== null) return;
    const t = ev.changedTouches[0];
    touchId = t.identifier;
    canvas.focus?.();
    calc(t);
    glfw.buttons |= 1;
    glfw.latched |= 1;
  }, { passive: false });
  canvas.addEventListener('touchmove', (ev) => {
    ev.preventDefault();
    const t = find(ev);
    if (t) calc(t);
  }, { passive: false });
  const touchEnd = (ev: TouchEvent) => {
    ev.preventDefault();
    const t = find(ev);
    if (!t) return;
    calc(t);
    glfw.buttons &= ~1;
    touchId = null;
  };
  canvas.addEventListener('touchend', touchEnd, { passive: false });
  canvas.addEventListener('touchcancel', touchEnd, { passive: false });
}

interface BindingAction {
  id: string | undefined;
  value: number; prevValue: number;
  pressed: boolean; released: boolean; repeated: boolean; repeatTimer: number;
  x: number; y: number; dx: number; dy: number; positionSet: boolean;
}

export class InputBinding {
  /** dmHashTable iteration order: bucket = hash % 64 (0, scroll_down 16, touch 19, scroll_up 44) */
  actions: BindingAction[] = [];
  triggers: { input: number; action: BindingAction }[] = [];
  prev: MouseState = { x: 0, y: 0, buttons: 0, wheel: 0 };
  repeatDelay = 0.5; repeatInterval = 0.2;

  constructor(binding: any, repeatDelay: number, repeatInterval: number) {
    this.repeatDelay = f(repeatDelay); this.repeatInterval = f(repeatInterval);
    const mk = (id: string | undefined): BindingAction => ({ id, value: 0, prevValue: 0, pressed: false, released: false, repeated: false, repeatTimer: 0, x: 0, y: 0, dx: 0, dy: 0, positionSet: false });
    const byId = new Map<string, BindingAction>();
    const order: Record<string, number> = { scroll_down: 16, touch: 19, scroll_up: 44 };
    const all: [number, BindingAction][] = [[0, mk(undefined)]];
    for (const t of binding.mouse_trigger ?? []) {
      let a = byId.get(t.action);
      if (!a) { a = mk(t.action); byId.set(t.action, a); all.push([order[t.action] ?? 63, a]); }
      this.triggers.push({ input: t.input, action: a });
    }
    all.sort((p, q) => p[0] - q[0]);
    this.actions = all.map((p) => p[1]);
  }

  /** dmHID::Update + dmInput::UpdateBinding */
  update(dt: number) {
    for (const a of this.actions) { a.prevValue = a.value; a.value = 0; a.positionSet = false; }
    // a press released before this poll still counts as down for one frame
    const packet: MouseState = { x: toI32(glfw.mouseX), y: toI32(glfw.mouseY), buttons: glfw.buttons | glfw.latched, wheel: toI32(glfw.wheelPos) };
    glfw.latched = 0;
    const ctx = { x: packet.x, y: packet.y, dx: packet.x - this.prev.x, dy: packet.y - this.prev.y, positionSet: true };
    for (const t of this.triggers) {
      let v = 0;
      if (t.input === 0) v = packet.wheel - this.prev.wheel;          // MOUSE_WHEEL_UP
      else if (t.input === 1) v = -(packet.wheel - this.prev.wheel);  // MOUSE_WHEEL_DOWN
      else {
        // input enum: MOUSE_BUTTON_LEFT/MIDDLE/RIGHT = 2/3/4, MOUSE_BUTTON_1.. = 5.. -> hid button index
        const btn = t.input >= 5 ? t.input - 5 : t.input === 2 ? 0 : t.input === 3 ? 2 : 1;
        const dom = btn === 1 ? 2 : btn === 2 ? 1 : btn; // glfwGetMouseButton applies DOMtoGLFWButton
        v = (packet.buttons & (1 << dom)) ? 1 : 0;
      }
      v = Math.min(Math.max(v, 0), 1);
      if (Math.abs(t.action.value) < Math.abs(v)) t.action.value = v;
    }
    this.prev = packet;
    for (const a of this.actions) {
      a.pressed = a.prevValue === 0 && a.value > 0;
      a.released = a.prevValue > 0 && a.value === 0;
      a.repeated = false;
      if (a.value > 0) {
        if (a.pressed) { a.repeated = true; a.repeatTimer = this.repeatDelay; }
        else {
          a.repeatTimer = f(a.repeatTimer - dt);
          if (a.repeatTimer <= 0) { a.repeated = true; a.repeatTimer = f(a.repeatTimer + this.repeatInterval); }
        }
      }
      if (!a.positionSet) { a.x = ctx.x; a.y = ctx.y; a.dx = ctx.dx; a.dy = ctx.dy; a.positionSet = ctx.positionSet; }
    }
  }

  /** dmInput::ForEachActive + GOActionCallback */
  activeActions(physW: number, physH: number, projW: number, projH: number, windowHeight: number): { id: string | undefined; make: () => Action }[] {
    const out: { id: string | undefined; make: () => Action }[] = [];
    const wr = f(f(1 / physW) * projW), hr = f(f(1 / physH) * projH);
    for (const a of this.actions) {
      let active = a.value !== 0 || a.pressed || a.released;
      active = active || (a.id === undefined && (a.dx !== 0 || a.dy !== 0));
      if (!active) continue;
      const x = f(f(a.x + 0.5) * wr);
      const y = f(projH - f(f(a.y + 0.5) * hr));
      const dx = f(a.dx * wr);
      const dy = f(-a.dy * hr);
      const sx = a.x, sy = windowHeight - a.y, sdx = a.dx, sdy = -a.dy;
      const { id, value, pressed, released, repeated, positionSet } = a;
      out.push({
        id,
        make: () => {
          const t: any = {};
          if (id !== undefined) { t.value = value; t.pressed = pressed; t.released = released; t.repeated = repeated; }
          if (positionSet) {
            t.x = x; t.y = y; t.dx = dx; t.dy = dy;
            t.screen_x = sx; t.screen_y = sy; t.screen_dx = sdx; t.screen_dy = sdy;
          }
          return t as Action;
        },
      });
    }
    return out;
  }
}

function toI32(v: number): number { return v | 0; }
