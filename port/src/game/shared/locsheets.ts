// shared/locsheets.lua
import * as engine from '../../engine';
import { sys, json, print } from '../../engine';
import { S, T, t, cat, pairs, len } from '../../lua';

const loc: any = {};

loc.SHEET_KEY = "1t-2XMabwtjwObXM70OmpXTrevM3IKQYmzCw-bt01udI";
loc.SHEET_INDEX = 1;
loc.content = {};

let LOADED = false;
let CALLBACKS: any[] = [];

loc.PARSE_FUNC = function (response: any, content: any) {
  const reserved_keys: Record<string, string> = { id: "reserved", category: "reserved", updated: "reserved", link: "reserved", content: "reserved", title: "reserved" };
  const json_string = S.gsub(S.gsub(response.response, "gsx", "")[0], "%$", "")[0];
  const data = json.decode(json_string);
  for (const [, v] of pairs<any>(data.feed.entry)) {
    for (const [kk, vv] of pairs<any>(v)) {
      const rk = Object.prototype.hasOwnProperty.call(reserved_keys, kk as any) ? reserved_keys[kk as string] : undefined;
      if (rk === undefined && kk !== "key") {
        if (content[v.key.t] === undefined || content[v.key.t] === null) {
          content[v.key.t] = {};
        }
        content[v.key.t][kk as any] = vv.t;
      }
    }
  }
};

function http_result(_self: any, _id: any, response: any) {
  loc.PARSE_FUNC(response, loc.content);
  LOADED = true;
  for (let i = 1; i <= len(CALLBACKS); i++) {
    CALLBACKS[i - 1](loc.content);
  }
  CALLBACKS = [];
}

loc.on_load = function (callback: (content: any) => void) {
  if (LOADED) {
    callback(loc.content);
  } else {
    T.insert(CALLBACKS, callback);
    const url = cat("https://spreadsheets.google.com/feeds/list/", loc.SHEET_KEY, "/", loc.SHEET_INDEX, "/public/values?alt=json");
    print(url);
    // PARITY: Defold's http module is not in the engine API yet; this calls engine.http.request(url, method, callback) when the engine provides it.
    (engine as any).http.request(url, "GET", http_result);
  }
};

/**
 * Returns the localised string, `key` when the key is unknown, or undefined
 * when the key exists but has no entry for the language.
 */
// PARITY: on the substitution path the Lua returns string.gsub's two values; only the string is returned here (a caller expanding it last in an argument list or table constructor would also get the count).
loc.get = function (key: any, /*optional*/table?: any): any {
  let lang = S.sub(sys.get_sys_info().device_language, 1, 2);
  const word_list: Record<string, any> = {};
  if (t(loc.content[key])) {
    if (loc.content[key][lang] === "") lang = "en";
    if (t(loc.content[key][lang])) {
      if (t(table)) {
        if (typeof table !== "object") {
          word_list["%1"] = table;
        } else {
          for (let w = 1; w <= len(table); w++) {
            word_list[cat("%", w)] = table[w - 1];
          }
        }
        return S.gsub(loc.content[key][lang], "[^%s]+", word_list)[0];
      } else {
        return loc.content[key][lang];
      }
    }
    return undefined;
  } else {
    return key;
  }
};

export default loc;
