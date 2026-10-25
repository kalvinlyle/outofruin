// defsave/defsave.lua
import { sys, html5, print } from '../../engine';
import { S, t, cat, tostring, pairs, tset } from '../../lua';
import utf8 from './utf8';
import json from './json'; // used for HTML5

void utf8;

export interface DefSaveFile {
  changed: boolean;
  data: any;
}

const M: {
  autosave: boolean;
  autosave_timer: number;
  timer: number;
  changed: boolean;
  verbose: boolean;
  block_reloading: boolean;
  appname: string;
  loaded: Record<string, DefSaveFile>;
  sysinfo: Record<string, string>;
  use_default_data: boolean;
  enable_encryption: boolean;
  encryption_key: string;
  enable_obfuscation: boolean;
  obfuscation_key: string;
  default_data: Record<string, any>;
  [k: string]: any;
} = {
  autosave: false, // set to true to autosave all loaded files that are changed on a timer
  autosave_timer: 10, // amount of seconds between autosaves if changes have been made
  timer: 0, // current timer value only increases if autosave is enabled
  changed: false, // locally used but can be useful to have exposed
  verbose: true, // if true then more information will be printed such as autosaves
  block_reloading: false, // if true then files already loaded will never be overwritten with a reload
  appname: "defsave", // determines part of the path for saving files to
  loaded: {}, // list of files currently loaded
  sysinfo: sys.get_sys_info(),
  use_default_data: true, // if true will attempt to load default data from the default_data table when loading empty file
  enable_encryption: false, // if true then all data saved and loaded will be encrypted with AES - SLOWER
  encryption_key: "defsave", // pick an encryption key to use if you're using encryption
  enable_obfuscation: false, // if true then all data saved and loaded will be XOR obfuscated - FASTER
  obfuscation_key: "defsave", // pick an obfuscation key it use if you're using encryption, the longer the key for obfuscation the better
  default_data: {}, // default data to set files to if any cannnot be loaded
};

function isnil(v: unknown) {
  return v === undefined || v === null;
}

// Lua t[k]: JS arrays hold Lua index k at k-1.
function getk(tbl: any, k: any) {
  return Array.isArray(tbl) && typeof k === 'number' ? tbl[k - 1] : tbl[k];
}
function setk(tbl: any, k: any, v: any) {
  if (Array.isArray(tbl) && typeof k === 'number') tbl[k - 1] = isnil(v) ? undefined : v;
  else tset(tbl, k, v);
}

M.set_appname = function (appname: any) {
  if (typeof appname !== "string") throw new Error("DefSave: set_appname must pass a string");
  M.appname = appname;
};

M.obfuscate = function (input: string, key?: string) {
  key = t(key) ? key! : M.obfuscation_key;
  let output = "";
  let key_iterator = 1;

  const input_length = input.length;
  const key_length = key.length;

  for (let i = 1; i <= input_length; i++) {
    const character = S.byte(S.sub(input, i, i))[0];
    if (key_iterator >= key_length + 1) key_iterator = 1; // cycle
    const key_byte = S.byte(S.sub(key, key_iterator, key_iterator))[0];
    output = output + S.char(character ^ key_byte);

    key_iterator = key_iterator + 1;
  }
  return output;
};

/** Deep copy. Arrays stay arrays; keys are inserted in pairs order, as the Lua does. */
function clone(tbl: any): any {
  // deep-copy a table
  if (typeof tbl !== "object" || tbl === null) return tbl;
  const target: any = Array.isArray(tbl) ? [] : {};
  for (const [k, v] of pairs(tbl)) {
    if (typeof v === "object" && v !== null) {
      setk(target, k, clone(v));
    } else {
      setk(target, k, v);
    }
  }
  if (Array.isArray(tbl)) {
    // named fields of a mixed table (pairs over a JS array only walks the sequence)
    for (const k of Object.keys(tbl)) {
      if (!/^\d+$/.test(k)) target[k] = typeof tbl[k] === "object" && tbl[k] !== null ? clone(tbl[k]) : tbl[k];
    }
  }
  return target;
}

function copy(tbl: any): any {
  // shallow-copy a table
  if (typeof tbl !== "object" || tbl === null) return tbl;
  const target: any = Array.isArray(tbl) ? [] : {};
  for (const [k, v] of pairs(tbl)) setk(target, k, v);
  return target;
}
void copy;

M.get_file_path = function (file: any): string | undefined {
  if (M.appname === "defsave") {
    print("DefSave: You need to set a non-default appname to defsave.appname");
  }
  if (isnil(file)) {
    print("DefSave: Warning attempting to get a path for a nil file");
    return undefined;
  }
  if (M.sysinfo.system_name === "Linux") {
    const appname = cat("config/", tostring(M.appname));
    return sys.get_save_file(appname, file);
  }
  if (t(html5)) {
    return cat(M.appname, "_", file);
  }
  return sys.get_save_file(M.appname, file);
};

M.load = function (file: any) {
  print(cat("Defsave: Attempting to load ", file));
  if (isnil(file)) {
    print("DefSave: Warning no file specified when attempting to load");
    return undefined;
  }

  const path = M.get_file_path(file);

  if (isnil(path)) {
    print("DefSave: Warning path returned when attempting to load is nil");
    return undefined;
  }

  if (!isnil(M.loaded[file])) {
    if (M.block_reloading === false) {
      print(cat("DefSave: Warning the file ", file, " was already loaded and will be reloaded possibly overwriting changes"));
    } else {
      print("DefSave: Warning attempt to reload already file has been blocked");
      return true;
    }
  }

  let loaded_file: any;
  if (t(html5)) {
    // Same JS source as the Lua long string (the newline after `[[` is dropped by Lua).
    loaded_file = json.decode(html5.run(
      "\t\t\twindow.localStorage.getItem('" + path + "') || '{}'\n\t\t"
    ));
  } else {
    loaded_file = sys.load(path!);
  }

  let empty = false;

  // next(loaded_file) == nil (errors on a nil table, as in Lua)
  if (isnil(loaded_file)) throw new Error("bad argument #1 to 'next' (table expected, got nil)");
  if (pairs(loaded_file).next().done) {
    if (M.verbose) print(cat("DefSave: Loaded file '", file, "' is empty"));
    empty = true;
  }

  if (M.use_default_data && empty) {
    if (M.reset_to_default(file)) {
      return true;
    }
  } else if (empty) {
    print(cat("DefSave: The ", file, " is loaded but it was empty"));
    M.loaded[file] = {} as DefSaveFile;
    M.loaded[file].changed = true;
    M.changed = true;
    M.loaded[file].data = {};
    return true;
  }

  M.loaded[file] = {} as DefSaveFile;
  M.loaded[file].changed = false;
  M.loaded[file].data = loaded_file;

  if (M.verbose) print(cat("DefSave: The file '", file, "' was successfully loaded"));

  return true;
};

M.save = function (file: any, force?: any) {
  print(cat("DefSave: Attempting to save ", file));
  force = t(force) ? force : false;

  if (isnil(M.loaded[file])) {
    print("DefSave: Warning attempt to save a file which could not be found in loaded list");
    return undefined;
  }

  if (M.loaded[file].changed === false && force === false) {
    if (M.verbose) print(cat("DefSave: File '", file, "' is unchanged so not saving, set force flag to true to force saving if changed flag is false"));
    return true;
  }

  const path = M.get_file_path(file);

  let is_save_successful: any;
  if (t(html5)) {
    // PARITY: kept as in the Lua: "\'" is just "'" in Lua, so this gsub changes nothing, and the
    // JSON goes into a single-quoted JS literal unescaped (JS then unescapes its backslash sequences;
    // an apostrophe in the data breaks the statement).
    const encoded_data = S.gsub(json.encode(M.loaded[file].data), "'", "'")[0]; // escape ' characters
    html5.run(
      "      window.localStorage.setItem('" + path + "', '" + encoded_data + "')\n    "
    );
    is_save_successful = true;
  } else {
    is_save_successful = sys.save(path!, M.loaded[file].data);
  }

  if (t(is_save_successful)) {
    if (M.verbose) print(cat("DefSave: File '", tostring(file), "' has been saved to the path '", path!, "'"));
    M.loaded[file].changed = false;
    return true;
  } else {
    print(cat("DefSave: Something went wrong when attempting to save the file '", tostring(file), "' to the path '", path!, "'"));
    return undefined;
  }
};

M.save_all = function (force?: any) {
  force = t(force) ? force : false;
  for (const [key] of pairs(M.loaded)) {
    M.save(key, force);
    M.changed = false;
  }
};

M.get = function (file: any, key: any): any {
  if (!isnil(M.loaded[file])) {
    if (!isnil(getk(M.loaded[file].data, key))) {
      const value = clone(getk(M.loaded[file].data, key));
      return value;
    } else {
      print(cat("DefSave: Warning when attempting to get a key '", key, "' of file '", tostring(file), "' the key was nil"));
      return undefined;
    }
  } else {
    print(cat("DefSave: Warning when attempting to get a key '", key, "' the file '", tostring(file), "' could not be found in loaded list"));
    return undefined;
  }
};

M.set = function (file: any, key: any, value: any) {
  if (!isnil(M.loaded[file])) {
    value = clone(value); // decouple from original table if value is a table
    // PARITY: setting a key to nil deletes it from the JS object; re-adding it later appends it to insertion order, where Lua would reuse its dead slot.
    setk(M.loaded[file].data, key, value);
    M.loaded[file].changed = true;
    M.changed = true;
    return true;
  } else {
    print(cat("DefSave: Warning when attempting to set a key '", key, "' the file '", tostring(file), "' could not be found in loaded list"));
    return undefined;
  }
};

M.key_exists = function (file: any, key: any) {
  if (!isnil(M.loaded[file])) {
    if (!isnil(getk(M.loaded[file].data, key))) {
      return true;
    }
    return undefined;
  } else {
    return false;
  }
};

M.isset = function (file: any, key: any) {
  return M.key_exists(file, key);
};

M.reset_to_default = function (file: any) {
  if (!isnil(M.default_data[file])) {
    M.loaded[file] = {} as DefSaveFile;
    M.loaded[file].changed = true;
    M.changed = true;
    M.loaded[file].data = clone(M.default_data[file]);
    if (M.verbose) print(cat("DefSave: Successfully set the file '", file, "' to its default state"));
    return true;
  } else {
    print(cat("DefSave: There is no default file set for '", file, "' so setting it to empty"));
    M.loaded[file] = {} as DefSaveFile;
    M.loaded[file].changed = true;
    M.changed = true;
    M.loaded[file].data = {};
    return true;
  }
};

M.is_loaded = function (file: any) {
  if (!isnil(M.loaded[file])) {
    return true;
  } else {
    return false;
  }
};

M.update = function (dt?: number) {
  if (M.autosave === true) {
    if (isnil(dt)) {
      print("DefSave: You must pass dt to defsave.update");
    }
    M.timer = M.timer + dt!;

    if (M.timer >= M.autosave_timer) {
      if (M.changed === true) {
        M.save_all();
        if (M.verbose) print("DefSave: Autosaved All Changed Files");
      }
      M.timer = M.timer - M.autosave_timer;
    }
  }
};

M.final = function () {
  M.save_all();
};

export default M;
