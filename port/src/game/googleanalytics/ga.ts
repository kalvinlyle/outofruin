// googleanalytics/ga.lua
// Hits are queued but never sent (see internal/queue.ts); the tracker's
// creation still reseeds and advances math.random exactly as the Lua does.
import { sys, socket } from '../../engine';
import { t, tonumber, tostring } from '../../lua';
import tracker from './tracker';
import queue from './internal/queue';

const M: any = {
  dispatch_period: tonumber(sys.get_config("googleanalytics.dispatch_period", tostring(30 * 60))),
};

let default_tracker: any = undefined;

M.get_default_tracker = function () {
  if (!t(default_tracker)) {
    const tracking_id = sys.get_config("googleanalytics.tracking_id");
    if (!t(tracking_id)) throw new Error("You must set tracking_id in section [googleanalytics] in game.project before using this module");
    default_tracker = tracker.create(tracking_id);
  }
  return default_tracker;
};

M.dispatch = function () {
  queue.dispatch();
};

M.update = function () {
  if (M.dispatch_period <= 0) {
    return;
  }

  if (!t(queue.last_dispatch_time) || (socket.gettime() >= (queue.last_dispatch_time + M.dispatch_period))) {
    M.dispatch();
  }
};

export default M;
