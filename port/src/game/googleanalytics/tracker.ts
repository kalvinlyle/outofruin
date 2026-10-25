// googleanalytics/tracker.lua
import { sys, crash } from '../../engine';
import { S, t, cat, tostring, format, strlen } from '../../lua';
import uuid_generator from './internal/uuid';
import queue from './internal/queue';
import file from './internal/file';

const M: any = {};

const UUID_FILENAME = "__ga_uuid";

function url_encode(str: any) {
  if (t(str)) {
    str = S.gsub(str, "\n", "\r\n")[0];
    str = S.gsub(str, "([^%w %-%_%.%~])", function (c: string) { return format("%%%02X", S.byte(c)[0]); })[0];
    str = S.gsub(str, " ", "+")[0];
  }
  return str;
}

function url_decode(str: string) {
  str = S.gsub(str, "+", " ")[0];
  str = S.gsub(str, "%%(%x%x)", function (h: string) { return S.char(tonumber16(h)); })[0];
  str = S.gsub(str, "\r\n", "\n")[0];
  return str;
}
function tonumber16(h: string) { return parseInt(h, 16); }
void url_decode;

function get_uuid() {
  let [uuid] = file.load(UUID_FILENAME);
  if (!t(uuid)) {
    uuid_generator.seed();
    uuid = uuid_generator();
    file.save(UUID_FILENAME, uuid);
  }
  return uuid!;
}

function get_application_name(): string {
  return S.gsub(sys.get_config("project.title")!, " ", "_")[0];
}

function get_application_id() {
  const APPLICATION_IDS: Record<string, string | undefined> = {
    ["Android"]: sys.get_config("android.package"),
    ["iPhone OS"]: sys.get_config("ios.bundle_identifier"),
    ["Darwin"]: sys.get_config("osx.bundle_identifier"),
  };
  const system_name = sys.get_sys_info().system_name;
  const id = Object.prototype.hasOwnProperty.call(APPLICATION_IDS, system_name) ? APPLICATION_IDS[system_name] : undefined;
  return t(id) ? id! : cat(get_application_name(), system_name);
}

M.create = function (tracking_id: any) {
  const tracker: any = {
    base_params: cat("v=1&ds=app",
      "&cid=", get_uuid(),
      "&tid=", tracking_id,
      "&vp=", sys.get_config("display.width")!, "x", sys.get_config("display.height")!,
      "&ul=", sys.get_sys_info().device_language,
      "&an=", url_encode(get_application_name()),
      "&aid=", url_encode(get_application_id()),
      "&av=", (t(sys.get_config("project.version")) ? sys.get_config("project.version")! : "1.0")),
  };

  const event_params = cat(tracker.base_params, "&t=event");
  const timing_params = cat(tracker.base_params, "&t=timing");
  const screenview_params = cat(tracker.base_params, "&t=screenview");
  const exception_params = cat(tracker.base_params, "&t=exception");

  tracker.enable_crash_reporting = function (enabled: any, on_soft_crash?: any, on_hard_crash?: any) {
    if (t(enabled)) {
      sys.set_error_handler(function (source: string, message: string, traceback: string) {
        tracker.exception(message, false);
        if (t(on_soft_crash)) {
          on_soft_crash(source, message, traceback);
        }
      });
      const handle = crash.load_previous();
      if (t(handle)) {
        tracker.exception(crash.get_extra_data(handle!), true);
        if (t(on_hard_crash)) {
          on_hard_crash(handle);
        }
        crash.release(handle!);
      }
    } else {
      sys.set_error_handler(function () { });
    }
  };

  tracker.raw = function (params: any) {
    if (!(t(params) && typeof params === "string")) throw new Error("You must provide some params (of type string)");
    queue.add(params);
  };

  tracker.exception = function (description: any, is_fatal: any) {
    if (!(!t(description) || typeof description === "string")) throw new Error("Description must be nil or of type string");
    if (!(is_fatal === undefined || is_fatal === null || typeof is_fatal === "boolean")) throw new Error("Is_fatal must be nil or of type boolean");
    queue.add(cat(exception_params,
      (is_fatal !== undefined && is_fatal !== null) ? cat("&exf=", (t(is_fatal) ? "1" : "0")) : "",
      t(description) ? cat("&exd=", url_encode(description)) : ""));
  };

  tracker.event = function (category: any, action: any, label?: any, value?: any) {
    if (!(t(category) && typeof category === "string" && strlen(category) > 0)) throw new Error("You must provide a category (of type string, must not be empty)");
    if (!(t(action) && typeof action === "string" && strlen(action) > 0)) throw new Error("You must provide an action (of type string, must not be empty)");
    if (!(!t(label) || typeof label === "string")) throw new Error("Label must be nil or of type string");
    if (!(!t(value) || (typeof value === "number" && value >= 0))) throw new Error("Value must be nil or a positive number");
    queue.add(cat(event_params, "&ec=", url_encode(category), "&ea=", url_encode(action),
      t(label) ? cat("&el=", url_encode(label)) : "",
      t(value) ? cat("&ev=", tostring(value)) : ""));
  };

  tracker.screenview = function (screen_name: any) {
    if (!(t(screen_name) && typeof screen_name === "string")) throw new Error("You must specify a screen name (of type string)");
    queue.add(cat(screenview_params, "&cd=", url_encode(screen_name)));
  };

  tracker.timing = function (category: any, variable: any, time: any, label?: any) {
    if (!(t(category) && typeof category === "string")) throw new Error("You must provide a category (of type string)");
    if (!(t(variable) && typeof variable === "string")) throw new Error("You must provide a variable (of type string)");
    if (!(t(time) && typeof time === "number" && time >= 0)) throw new Error("You must provide a time (as a positive number)");
    if (!(!t(label) || typeof label === "string")) throw new Error("Label must be nil or a string");
    queue.add(cat(timing_params, "&utc=", url_encode(category), "&utv=", url_encode(variable), "&utt=", tostring(time),
      t(label) ? cat("&utl=", url_encode(label)) : ""));
  };

  return tracker;
};

export default M;
