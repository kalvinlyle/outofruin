// googleanalytics/internal/queue.lua
import { sys, socket, json, print } from '../../../engine';
import * as engine from '../../../engine';
import { T, t, tonumber, tostring, format, cat, len, strlen } from '../../../lua';
import file from './file';
import json_encode from './json_encode';
import user_agent from './user_agent';

const M: any = {
  last_dispatch_time: undefined,
  last_save_time: undefined,
  minimum_save_period: tonumber(sys.get_config("googleanalytics.queue_save_period", tostring(5 * 60))),
};

const MAX_HITS_PER_PAYLOAD = 20;          // A maximum of 20 hits can be specified per request.
const MAX_HIT_SIZE = 8 * 1024;            // No single hit payload can be greater than 8K bytes.
const MAX_TOTAL_PAYLOAD_SIZE = 16 * 1024; // The total size of all hit payloads cannot be greater than 16K bytes.

const QUEUE_FILENAME = "__ga_queue";

let q: any[] = [];

const [queue_data] = file.load(QUEUE_FILENAME);
if (t(queue_data)) {
  // pcall(json.decode, json) decodes the json module table itself, which errors,
  // so err is set and q stays empty.
  let err: any;
  try {
    json.decode(json as any);
    err = "json.decode: string expected";
  } catch (e) {
    err = e;
  }
  if (!t(err)) {
    q = [];
  }
}

function sort() {
  T.sort(q, function (a: any, b: any) {
    return a.time < b.time;
  });
}

M.log = function (..._args: any[]) {
};

if (sys.get_config("googleanalytics.verbose") === "1") {
  M.log = function (s: string, ...rest: any[]) {
    if (rest.length > 0) {
      print(format(s, ...rest));
    } else {
      print(s);
    }
  };
}

M.add = function (params: any) {
  if (!t(params)) throw new Error("You must provide params");
  if (strlen(params) <= MAX_HIT_SIZE) {
    T.insert(q, { time: socket.gettime(), params: params });
  }

  if (len(q) > 0 && (!t(M.last_save_time) || (socket.gettime() >= (M.last_save_time + M.minimum_save_period)))) {
    let ok = true, err: any;
    try {
      const [r, e] = file.save(QUEUE_FILENAME, json_encode.encode(q));
      if (!t(r)) throw new Error(e ?? "assertion failed!");
    } catch (e) {
      ok = false;
      err = e;
    }
    if (!ok) {
      M.log("ERR: Something went wrong while saving Google Analytics data", err);
      M.dispatch();
      q = [];
      return;
    }
    M.last_save_time = socket.gettime();
  }
};

M.dispatch = function () {
  M.last_dispatch_time = socket.gettime();
  if (len(q) === 0) {
    M.log("Nothing to send");
    return;
  }

  const hits_to_retry: any[] = [];
  while (len(q) > 0) {
    const hits_in_flight: any[] = [];
    const payload: string[] = [];
    let payload_size = 0;
    const n = Math.min(MAX_HITS_PER_PAYLOAD, len(q));
    for (let _ = 1; _ <= n; _++) {
      const hit = q[0];
      const queue_time = Math.floor((socket.gettime() - hit.time) * 1000);
      const qt = cat("&qt=", tostring(queue_time));
      const hit_size = strlen(hit.params) + strlen(qt);
      if (payload_size + hit_size <= MAX_TOTAL_PAYLOAD_SIZE) {
        const data = T.remove(q, 1);
        T.insert(hits_in_flight, data);
        payload[len(payload)] = cat(data.params, qt);
        payload_size = payload_size + hit_size;
      }
    }

    if (len(payload) > 0) {
      const post_data = T.concat(payload, "\n");
      const headers = { ["User-Agent"]: user_agent.get() };
      M.log("Sending %d hit(s) to Google Analytics", len(hits_in_flight));
      // PARITY: hits are not sent; the response callback (which only re-queues failed hits) never runs, as for a successful request.
      const http = (engine as any).http;
      void http; void post_data; void headers;
    }
  }

  if (len(hits_to_retry) > 0) {
    for (let i = 1; i <= len(hits_to_retry); i++) {
      q[len(q)] = hits_to_retry[i - 1];
    }
    sort();
  }
};

export default M;
