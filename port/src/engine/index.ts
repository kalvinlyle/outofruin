// Engine entry for game code. Every export here mirrors a Defold global with the
// same name (Defold 1.2.167 semantics).
import type { GuiApi, MsgApi, VmathApi, SysApi, Hash, Url, ScriptFactory } from './api';
import * as A from './apis';
export * from './api';

export const gui: GuiApi & Record<string, any> = A.gui;
export const msg: MsgApi = A.msg;
export const vmath: VmathApi & Record<string, any> = A.vmath;
export const sys: SysApi & Record<string, any> = A.sys;

export function hash(s: string | Hash): Hash { return s; }

/** print / pprint */
export const print: (...args: unknown[]) => void = A.print;
export const pprint: (v: unknown) => void = A.pprint;

export const window: {
  get_size(): [number, number];
  set_listener(fn: (self: any, event: Hash, data: any) => void): void;
  readonly WINDOW_EVENT_FOCUS_LOST: any; readonly WINDOW_EVENT_FOCUS_GAINED: any; readonly WINDOW_EVENT_RESIZED: any;
} & Record<string, any> = A.windowApi;

/** html5.run(code): evaluates JS in the page and returns the result as a string. */
export const html5: { run(code: string): string } = A.html5;

/** Defold json: decode builds tables in document order; null decodes to nil. 1.2.167 has no encode. */
export const json: { decode(s: string): any; encode(v: any): string } = A.json;

export const socket: { gettime(): number } = A.socket;

export const timer: {
  delay(seconds: number, repeating: boolean, cb: (self: any, handle: number, time_elapsed: number) => void): number;
  cancel(handle: number): boolean;
  readonly INVALID_TIMER_HANDLE: number;
} = A.timer;

export const go: {
  get_world_position(id?: string | Hash): import('./api').Vector3;
  readonly EASING_LINEAR: number; readonly EASING_OUTELASTIC: number; readonly EASING_INBACK: number;
} & Record<string, any> = A.go;

/** http.request(url, method, callback(self, id, response), headers?, post_data?, options?) */
export const http: {
  request(url: string, method: string, callback: (self: any, id: any, response: { status: number; response: string; headers: Record<string, string> }) => void,
          headers?: Record<string, string>, post_data?: string, options?: { timeout?: number }): void;
} = A.http;

/** The jstodef native extension: JS calls JsToDef.send(id, msg); listeners get (self, id, msg). */
export const jstodef: { add_listener(fn: (self: any, message_id: string, message: any) => void): void; remove_listener(fn: any): void } = A.jstodef;

/** No-op native extensions in the port. */
export const crash = {
  set_file_path(_a: string, _b: string): void {},
  load_previous(): number | undefined { return undefined; },
  release(_h: number): void {},
  get_extra_data(_h: number): string { return ''; },
};

/** The emscripten /data file system (IndexedDB "/data" / "FILE_DATA"), for io.open emulation. */
export const idbfs = A.idbfs;

/** Register a script file under its Defold resource path, e.g. "/main/kingdom/kingdom.gui_script". */
export const scripts = new Map<string, ScriptFactory>();
export function defineScript(path: string, factory: ScriptFactory): void {
  scripts.set(path, factory);
}

/**
 * Parity hooks the game side can install: `state()` returns the canonical
 * state object (see tools/port/parity/README.md), `save()` runs
 * defsave.save_all(true). The engine calls them at the end of the frame.
 */
export const parityHooks: { state?: () => any; save?: () => void } = {};

export type { Url };
