// metrics/fps.lua
import { vmath, msg, socket } from '../../engine';
import { T, t, len, format } from '../../lua';

const M: any = {};

M.POSITION = vmath.vector3(10, 20, 0);
M.FORMAT = "FPS %.2f";

M.create = function (samples?: number) {
  samples = t(samples) ? samples : 60;

  const instance: any = {};

  const frames: number[] = [];

  let fps = 0;

  instance.update = function () {
    T.insert(frames, socket.gettime());
    if (len(frames) === samples! + 1) {
      T.remove(frames, 1);
      fps = 1 / ((frames[len(frames) - 1] - frames[0]) / (len(frames) - 1));
    }
  };

  instance.fps = function () {
    return fps;
  };

  instance.draw = function (fmt?: string, position?: any) {
    fmt = t(fmt) ? fmt : M.FORMAT;
    position = t(position) ? position : M.POSITION;
    msg.post("@render:", "draw_text", { text: format(fmt!, fps), position: position });
  };

  return instance;
};

const singleton = M.create();

M.update = function () {
  singleton.update();
};

M.fps = function () {
  return singleton.fps();
};

M.draw = function (fmt?: string, position?: any) {
  singleton.draw(fmt, position);
};

export default M;
