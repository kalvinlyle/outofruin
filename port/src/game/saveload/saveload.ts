// saveload/saveload.lua
import { sys, json, print } from '../../engine';
import { t, cat, pairs } from '../../lua';

const M: any = {};

const savefile = {};
void savefile;

// `not next(tbl)` (next errors on nil, as in Lua)
function isEmpty(tbl: any): boolean {
  if (tbl === undefined || tbl === null) throw new Error("bad argument #1 to 'next' (table expected, got nil)");
  return pairs(tbl).next().done === true;
}

M.save_to_file = function (folder: any, filename: any, table: any) {
  if (typeof folder !== "string") throw new Error("You must provide `folder` of type `string` to perform `load_data()`");
  if (typeof filename !== "string") throw new Error("You must provide `filename` of type `string` to perform `load_data()`");
  let r = true;
  const filepath = sys.get_save_file(folder, filename);
  if (!t(sys.save(filepath, table))) {
    r = false;
    print(cat("SAVELOAD: WARNING - Save data could not be written to ", filepath, filename));
  }
  return r;
};

M.load_from_JSON = function (filename: any) {
  if (typeof filename !== "string") throw new Error("You must provide `filename` of type `string` to perform `load_from_JSON()`");
  return json.decode(sys.load_resource(filename)!);
};

/** Returns the loaded table, or false when the file is empty/missing. */
M.load_from_file = function (folder: any, filename: any) {
  if (typeof folder !== "string") throw new Error("You must provide `folder` of type `string` to perform `load_from_file()`");
  if (typeof filename !== "string") throw new Error("You must provide `filename` of type `string` to perform `load_from_file()`");
  const filepath = sys.get_save_file(folder, filename);
  let table = sys.load(filepath);
  if (isEmpty(table)) {
    table = false;
    print(cat("SAVELOAD: WARNING - Save data could not be loaded from", filepath));
  }
  return table;
};

M.save_data = function (folder: any, filename: any, data: any) {
  if (typeof folder !== "string") throw new Error("You must provide `folder` of type `string` to perform `save_data()`");
  if (typeof filename !== "string") throw new Error("You must provide `filename` of type `string` to perform `save_data()`");
  M.save_to_file(folder, filename, data);
};

M.load_data = function (folder: any, filename: any, defaultdata?: any) {
  if (typeof folder !== "string") throw new Error("You must provide `folder` of type `string` to perform `load_data()`");
  if (typeof filename !== "string") throw new Error("You must provide `filename` of type `string` to perform `load_data()`");
  let data: any = {};
  if (t(M.load_from_file(folder, filename))) {
    data = M.load_from_file(folder, filename);
  } else if (defaultdata !== undefined && defaultdata !== null) {
    data = defaultdata;
    M.save_data(folder, filename, defaultdata);
  }
  return data;
};

export default M;
