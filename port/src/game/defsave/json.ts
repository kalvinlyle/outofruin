// defsave/json.lua — rxi json.lua encoder as trimmed in the game; decode is Defold's json.decode.
import { json as engineJson, Vector3, Vector4 } from '../../engine';
import { S, T, format, tostring, pairsKeys, cat, numToStr } from '../../lua';

const json: any = { _version: "0.1.0" };

let encode: (val: any, stack?: Map<any, boolean>) => string;

const escape_char_map: Record<string, string> = {
  ["\\"]: "\\\\",
  ["\""]: "\\\"",
  ["\b"]: "\\b",
  ["\f"]: "\\f",
  ["\n"]: "\\n",
  ["\r"]: "\\r",
  ["\t"]: "\\t",
};

function escape_char(c: string) {
  return escape_char_map[c] ?? format("\\u%04x", S.byte(c)[0]);
}

function encode_nil() {
  return "null";
}

// Lua t[i] on a table that is a JS array (index i at i-1) or an object with numeric keys.
function idx(val: any, i: number) {
  return Array.isArray(val) ? val[i - 1] : val[i];
}

function isnil(v: unknown) {
  return v === undefined || v === null;
}

function encode_table(val: any, stack?: Map<any, boolean>) {
  const res: string[] = [];
  stack = stack ?? new Map();

  if (stack.get(val)) throw new Error("circular reference");

  stack.set(val, true);

  const first = idx(val, 1);
  if (!isnil(first)) {
    // ipairs
    for (let i = 1; ; i++) {
      const v = idx(val, i);
      if (isnil(v)) break;
      res.push(encode(v, stack));
    }
    stack.delete(val);
    return "[" + res.join(",") + "]";
  }
  const keys = pairsKeys(val);
  const isArr = Array.isArray(val);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const v = isArr && typeof k === "number" ? val[k - 1] : val[k as any];
    if (isnil(v)) continue;
    res.push(encode(k, stack) + ":" + encode(v, stack));
  }
  stack.delete(val);
  if (res.length === 0) return "[]";
  return "{" + res.join(",") + "}";
}

const NEEDS_ESCAPE = /[\x00-\x1f\\"]/;

function encode_string(val: string) {
  // Same result as the gsub below, without the pattern engine when nothing needs escaping.
  if (!NEEDS_ESCAPE.test(val)) return '"' + val + '"';
  return '"' + S.gsub(val, '[%z\x01-\x1f\\"]', escape_char)[0] + '"';
}

function encode_number(val: number) {
  if (val !== val || val <= -Infinity || val >= Infinity) {
    throw new Error(cat("unexpected number value '", tostring(val), "'"));
  }
  return numToStr(val); // format("%.14g", val)
}

// Defold userdata (vectors) go through tostring.
// PARITY: Defold prints vectors as "vmath.vector3(x, y, z)"; the number format inside is assumed to be %.14g. Saves never hold vectors.
function userdata_tostring(val: any) {
  if (val instanceof Vector4) return "vmath.vector4(" + [val.x, val.y, val.z, val.w].map(numToStr).join(", ") + ")";
  return "vmath.vector3(" + [val.x, val.y, val.z].map(numToStr).join(", ") + ")";
}

encode = function (val: any, stack?: Map<any, boolean>): string {
  if (isnil(val)) return encode_nil();
  if (val instanceof Vector3 || val instanceof Vector4) return userdata_tostring(val);
  switch (typeof val) {
    case "object": return encode_table(val, stack);
    case "string": return encode_string(val);
    case "number": return encode_number(val);
    case "boolean": return tostring(val);
  }
  return "";
};

json.encode = function (val: any): string {
  return encode(val);
};

json.decode = function (s: string) {
  return engineJson.decode(s);
};

export default json as { _version: string; encode(val: any): string; decode(s: string): any };
