// googleanalytics/internal/uuid.lua (Tieske's uuid.lua)
// Kept in full: tracker.create calls seed() and new(), which reseed and
// advance the shared math.random generator.
import { socket } from '../../../engine';
import { S, M as LM, t, tonumber, cat, strlen } from '../../../lua';

const M: any = {};

const bitsize = 32;  // bitsize assumed for Lua VM. See randomseed function below.
const lua_version = tonumber(S.match1("Lua 5.1", "%d%.*%d*"))!;  // grab Lua version used (_VERSION is "Lua 5.1")

const MATRIX_AND = [[0, 0], [0, 1]];
const MATRIX_OR = [[0, 1], [1, 1]];
const HEXES = '0123456789abcdef';

const math_floor = Math.floor;
const math_random = LM.random;
const math_abs = Math.abs;
const string_sub = S.sub;
const to_number = tonumber;

function BITWISE(x: number, y: number, matrix: number[][]) {
  let z = 0;
  let pow = 1;
  while (x > 0 || y > 0) {
    z = z + (matrix[LM.mod(x, 2)][LM.mod(y, 2)] * pow);
    pow = pow * 2;
    x = math_floor(x / 2);
    y = math_floor(y / 2);
  }
  return z;
}

function INT2HEX(x: number) {
  let s = '';
  const base = 16;
  let d: number;
  while (x > 0) {
    d = LM.mod(x, base) + 1;
    x = math_floor(x / base);
    s = string_sub(HEXES, d, d) + s;
  }
  while (strlen(s) < 2) s = "0" + s;
  return s;
}

M.new = function (hwaddr?: any) {
  // the 16 math.random calls happen in table-constructor order
  const bytes: number[] = [
    math_random(0, 255),
    math_random(0, 255),
    math_random(0, 255),
    math_random(0, 255),
    math_random(0, 255),
    math_random(0, 255),
    math_random(0, 255),
    math_random(0, 255),
    math_random(0, 255),
    math_random(0, 255),
    math_random(0, 255),
    math_random(0, 255),
    math_random(0, 255),
    math_random(0, 255),
    math_random(0, 255),
    math_random(0, 255),
  ];

  if (t(hwaddr)) {
    if (typeof hwaddr !== "string") throw new Error(cat("Expected hex string, got ", typeof hwaddr));

    let i = strlen(hwaddr);
    const str: string = hwaddr;
    hwaddr = "";
    while (i > 0 && strlen(hwaddr) < 12) {
      const c = S.lower(S.sub(str, i, i));
      if (t(S.find(HEXES, c, 1, true)[0])) {
        hwaddr = c + hwaddr;
      }
      i = i - 1;
    }
    if (strlen(hwaddr) !== 12) throw new Error(cat("Provided string did not contain at least 12 hex characters, retrieved '", hwaddr, "' from '", str, "'"));

    bytes[10] = to_number(S.sub(hwaddr, 1, 2), 16)!;
    bytes[11] = to_number(S.sub(hwaddr, 3, 4), 16)!;
    bytes[12] = to_number(S.sub(hwaddr, 5, 6), 16)!;
    bytes[13] = to_number(S.sub(hwaddr, 7, 8), 16)!;
    bytes[14] = to_number(S.sub(hwaddr, 9, 10), 16)!;
    bytes[15] = to_number(S.sub(hwaddr, 11, 12), 16)!;
  }

  bytes[6] = BITWISE(bytes[6], 0x0f, MATRIX_AND);
  bytes[6] = BITWISE(bytes[6], 0x40, MATRIX_OR);

  bytes[8] = BITWISE(bytes[6], 0x3f, MATRIX_AND);
  bytes[8] = BITWISE(bytes[6], 0x80, MATRIX_OR);
  return INT2HEX(bytes[0]) + INT2HEX(bytes[1]) + INT2HEX(bytes[2]) + INT2HEX(bytes[3]) + "-" +
    INT2HEX(bytes[4]) + INT2HEX(bytes[5]) + "-" +
    INT2HEX(bytes[6]) + INT2HEX(bytes[7]) + "-" +
    INT2HEX(bytes[8]) + INT2HEX(bytes[9]) + "-" +
    INT2HEX(bytes[10]) + INT2HEX(bytes[11]) + INT2HEX(bytes[12]) + INT2HEX(bytes[13]) + INT2HEX(bytes[14]) + INT2HEX(bytes[15]);
};

M.randomseed = function (seed: number) {
  seed = math_floor(math_abs(seed));
  if (seed >= (Math.pow(2, bitsize))) {
    seed = seed - math_floor(seed / Math.pow(2, bitsize)) * (Math.pow(2, bitsize));
  }
  if (lua_version < 5.2) {
    LM.randomseed(seed - Math.pow(2, bitsize - 1));
  } else {
    LM.randomseed(seed);
  }
  return seed;
};

M.seed = function () {
  // PARITY: assumes package.loaded["socket"] is set in Defold (luaL_register of luasocket fills it), so the seed is socket.gettime()*10000, not os.time().
  return M.randomseed(socket.gettime() * 10000);
};

// setmetatable(M, { __call = function(self, hwaddr) return self.new(hwaddr) end })
const uuid: ((hwaddr?: any) => string) & typeof M = Object.assign((hwaddr?: any) => M.new(hwaddr), M);
export default uuid;
