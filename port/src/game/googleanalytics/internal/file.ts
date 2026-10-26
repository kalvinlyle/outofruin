// googleanalytics/internal/file.lua
import { sys } from '../../../engine';
import { S, t } from '../../../lua';

const M: any = {};

// PARITY: io.open on the emscripten file system is replaced by an in-memory map that starts empty each page load; a file the original's IDBFS kept from an earlier session (e.g. __ga_uuid, which decides whether tracker.create reseeds math.random) is not modelled. The harness can preload it through `files`.
export const files = new Map<string, string>();

M.get_save_file_name = function (name: string) {
  const application_name = S.gsub(sys.get_config("project.title")!, " ", "_")[0];
  return sys.get_save_file(application_name, name);
};

/** Returns [contents] or [undefined, err]. */
M.load = function (name: any): [string | undefined, string?] {
  if (!t(name)) throw new Error("You must provide a file name");
  const filename = M.get_save_file_name(name);
  const contents = files.get(filename);
  if (contents === undefined) {
    return [undefined, filename + ": No such file or directory"];
  }
  return [contents];
};

/** Returns [true] or [undefined, err], like os.rename. */
M.save = function (name: any, data: any): [boolean | undefined, string?] {
  if (!t(name)) throw new Error("You must provide a file name");
  if (!t(data)) throw new Error("You must provide some data");
  if (typeof data !== "string") throw new Error("You can only write strings");
  const tmpname = M.get_save_file_name("__ga_tmp");
  files.set(tmpname, data);

  const filename = M.get_save_file_name(name);
  files.delete(filename);
  files.set(filename, files.get(tmpname)!);
  files.delete(tmpname);
  return [true];
};

export default M;
