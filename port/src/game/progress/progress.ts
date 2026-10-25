// progress/progress.lua
import { timer } from '../../engine';
import { t, len, os } from '../../lua';

const M: any = {};

let bars: any[] = [];

M.clean = function () { //delete all timers if all timers have stopped
  let totalcountdown = 0;
  for (let x = 1; x <= len(bars); x++) {
    totalcountdown = totalcountdown + bars[x - 1]["countdown"];
  }
  if (totalcountdown === 0) bars = [];
};

M.cancel = function (num: number) {
  if (t(bars[num - 1])) {
    timer.cancel(bars[num - 1]["timer"]);
  }
};

M.remaining = function (num: number) {
  let remaining = 1;
  remaining = bars[num - 1]["countdown"];
  return remaining;
};

M.percent = function (num: number) {
  let percent = 1;
  percent = bars[num - 1]["countdown"] / bars[num - 1]["delay"];
  return percent;
};

M.start = function (delay: number, tick: number, repeating: any, update: (num: number) => void, action: (num: number) => void) {
  const num = len(bars) + 1;
  let ticktimer = os.clock();
  // `bars` is the module upvalue: after M.clean() replaces it, this closure indexes the new table.
  bars[num - 1] = {};
  bars[num - 1]["delay"] = delay;
  bars[num - 1]["countdown"] = delay;
  const target = bars[num - 1];
  target["timer"] = timer.delay(tick, true, function () {                  // start the timer
    const passed = Math.max(os.clock() - ticktimer, tick);                  // used either the actual time passed or the tick (for when the tick is lower than the refresh speed)
    const remaining = (bars[num - 1]["countdown"] - passed);                // what is left on the timer
    const rounded = Math.ceil(remaining * 100 / tick) / 100 * tick;         // rounded to 2 decimals past the tick accuracy
    bars[num - 1]["countdown"] = Math.max(0, rounded);                      // reduce the timer by the passedtime
    ticktimer = os.clock() + tick;                                          // reset the ticktimer
    update(num);                                                            // process the update function
    if (bars[num - 1]["countdown"] <= 0) {                                  // if delay is zero
      if (t(repeating)) {
        bars[num - 1]["countdown"] = delay;                                 // resent the delay
      } else {
        M.cancel(num);                                                      // end the timer when the countdown reaches zero
      }
      action(num);                                                          // process the action function
    }
  });
  return num;
};

export default M;
