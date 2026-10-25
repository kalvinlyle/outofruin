// Differential tests: the Lua compat layer against a stock Lua 5.1.5 binary.
// Set LUA51 to its path; the suite is skipped when it is missing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { LuaTableLayout, pairsKeys, literal } from '../src/lua/table';
import * as S from '../src/lua/string';
import * as L from '../src/lua/lib';

const LUA = process.env.LUA51 ?? '';
const skip = !existsSync(LUA) ? 'LUA51 not set' : false;

function lua(src: string): string {
  return execFileSync(LUA, ['-'], { input: src }).toString();
}

const q = (s: string) => JSON.stringify(s); // valid Lua string literal for ASCII

// Deterministic PRNG for case generation.
let st = 12345;
const rnd = (n: number) => {
  st = (st + 0x6d2b79f5) | 0;
  let t = Math.imul(st ^ (st >>> 15), 1 | st);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (((t ^ (t >>> 14)) >>> 0) % n);
};
const words = ['gold', 'food', 'wood', 'stone', 'Farm', 'Desert', 'xp', 'Bonusxp', 'Packs', 'cards',
  'resources', 'Squire', 'HERO_DWARFDRUID_NAME', 'a', 'b', 'c', 'level1', 'level2', 'level10', 'Henchmen',
  'BuyCosts', 'dungeon_1', 'dungeon_2', 'x', 'y', 'z', 'id', 'name', 'count', 'rank'];

test('pairs order matches Lua for incremental string/number keys with deletes', { skip }, () => {
  const cases: { ops: [string, string | number][] }[] = [];
  for (let c = 0; c < 300; c++) {
    const ops: [string, string | number][] = [];
    const n = 1 + rnd(40);
    for (let i = 0; i < n; i++) {
      const r = rnd(10);
      const key: string | number = r < 6 ? words[rnd(words.length)] + (rnd(3) === 0 ? String(rnd(50)) : '')
        : r < 9 ? 1 + rnd(20) : rnd(1000) / 7;
      ops.push([rnd(8) === 0 ? 'del' : 'set', key]);
    }
    cases.push({ ops });
  }
  const k = (key: string | number) => typeof key === 'string' ? q(key) : `(${key.toPrecision(17)})`;
  let src = '';
  for (const c of cases) {
    src += 'do local t={}\n';
    for (const [op, key] of c.ops) src += `t[${k(key)}]=${op === 'set' ? 'true' : 'nil'}\n`;
    src += 'local o={} for kk in pairs(t) do o[#o+1]=type(kk)=="number" and string.format("%.17g",kk) or kk end print(table.concat(o,"|")) end\n';
  }
  const expected = lua(src).split('\n');
  cases.forEach((c, i) => {
    const t = new LuaTableLayout();
    for (const [op, key] of c.ops) op === 'set' ? t.set(key) : t.remove(key);
    const got = t.keys().map(x => typeof x === 'number' ? S.format('%.17g', x) : String(x)).join('|');
    assert.equal(got, expected[i], `case ${i}`);
  });
});

test('pairs order for constructor literals and json-like objects', { skip }, () => {
  const objs: Record<string, number>[] = [];
  for (let c = 0; c < 100; c++) {
    const o: Record<string, number> = {};
    const n = 1 + rnd(25);
    for (let i = 0; i < n; i++) o[words[rnd(words.length)] + rnd(9)] = i;
    objs.push(o);
  }
  let src = '';
  for (const o of objs) {
    src += 'do local t={' + Object.keys(o).map(kk => `[${q(kk)}]=1`).join(',') + '}\n';
    src += 'local o={} for kk in pairs(t) do o[#o+1]=kk end print(table.concat(o,"|")) end\n';
    src += 'do local t={}\n' + Object.keys(o).map(kk => `t[${q(kk)}]=1\n`).join('');
    src += 'local o={} for kk in pairs(t) do o[#o+1]=kk end print(table.concat(o,"|")) end\n';
  }
  const expected = lua(src).split('\n');
  objs.forEach((o, i) => {
    assert.equal(pairsKeys(literal({ ...o })).join('|'), expected[2 * i], `literal ${i}`);
    assert.equal(pairsKeys({ ...o }).join('|'), expected[2 * i + 1], `incremental ${i}`);
  });
});

test('tostring and string.format', { skip }, () => {
  const nums = [0, 1, -1, 0.1, 1 / 3, 2 / 3, 100 / 3, 1e15, 1e16, 123456789012345, 2 ** 53, 1e-5, 0.0001, 1.5e300,
    -2.5, 1234.5678, 99.995, 0.5, 1.5, 2.5, 0.125, 0.375, 2.675, 1e21, 5e-324, 1.0000000000000002, 4.35, 0.045, 1e100, 3.14159265358979, 12345678.9];
  const fmts = ['%d', '%5d', '%-5d|', '%05d', '%.2f', '%5.1f', '%02.f', '%g', '%.3g', '%10.4g', '%e', '%.2e', '%x', '%X',
    '%02X', '%.14g', '%s', '%+d', '% d', '%i', '%.0f', '%#.0f', '%3s|'];
  let src = '';
  for (const n of nums) {
    src += `print(tostring(${n.toPrecision(17)}))\n`;
    for (const f of fmts) {
      if (/[dixXc]/.test(f) && (n < 0 && /x|X/.test(f) || Math.abs(n) > 2 ** 31)) continue;
      src += `print((pcall(string.format, ${q(f)}, ${n.toPrecision(17)})) and string.format(${q(f)}, ${n.toPrecision(17)}) or "ERR")\n`;
    }
  }
  const expected = lua(src).split('\n');
  let line = 0;
  for (const n of nums) {
    assert.equal(S.tostring(n), expected[line++], `tostring ${n}`);
    for (const f of fmts) {
      if (/[dixXc]/.test(f) && (n < 0 && /x|X/.test(f) || Math.abs(n) > 2 ** 31)) continue;
      let got: string;
      try { got = S.format(f, n); } catch { got = 'ERR'; }
      assert.equal(got, expected[line++], `format ${f} ${n}`);
    }
  }
});

test('patterns: find, match, gsub, gmatch', { skip }, () => {
  const subjects = ['hello world from Lua', 'HERO_DWARFDRUID_NAME', '  trim me  ', 'key=value, k2=v2',
    '1,234,567', 'abc123def456', '(nested (parens)) end', 'a.b.c', '', 'x', '%d percent', 'THE (quick) fox',
    'level_10_boss', '2020-04-23T10:00:00', 'Gold: 1500', 'one two  three'];
  const pats = ['%a+', '%d+', '^%s*(.-)%s*$', '(%w+)=(%w+)', '%.', '[%a_]+', '%((.-)%)', '%b()', '()ll()', '^(%u)',
    '[^,]+', 'o', '%s+', '(%d)(%d)', '[aeiou]', '%f[%w]%w+', '.-', '[%-_]', '^$', '(h)(e)(l)', '%p'];
  let src = '';
  const cases: [string, string][] = [];
  for (const s of subjects) for (const p of pats) {
    cases.push([s, p]);
    src += `do local s,p=${q(s)},${q(p)}
local r={string.find(s,p)} local o={} for i=1,select('#',unpack(r)) do o[#o+1]=tostring(r[i]) end print(table.concat(o,","))
r={string.match(s,p)} o={} for i=1,#r do o[#o+1]=tostring(r[i]) end print(table.concat(o,","))
local g,n=string.gsub(s,p,"<%0>") print(g.."#"..n)
g,n=string.gsub(s,p,function(a) return a and string.upper(tostring(a)) end) print(g.."#"..n)
o={} for a,b in string.gmatch(s,p) do o[#o+1]=tostring(a)..(b and ("/"..tostring(b)) or "") end print(table.concat(o,";")) end\n`;
  }
  const expected = lua(src).split('\n');
  let line = 0;
  for (const [s, p] of cases) {
    const f = S.find(s, p);
    const fo = f[0] === undefined ? '' : f.map(S.tostring).join(',');
    assert.equal(fo, expected[line++], `find ${q(s)} ${q(p)}`);
    const m = S.match(s, p);
    assert.equal(m[0] === undefined ? '' : m.map(S.tostring).join(','), expected[line++], `match ${q(s)} ${q(p)}`);
    const [g, n] = S.gsub(s, p, '<%0>');
    assert.equal(g + '#' + n, expected[line++], `gsub ${q(s)} ${q(p)}`);
    const [g2, n2] = S.gsub(s, p, (a: any) => a === undefined ? a : S.upper(S.tostring(a)));
    assert.equal(g2 + '#' + n2, expected[line++], `gsub fn ${q(s)} ${q(p)}`);
    const o: string[] = [];
    for (const [a, b] of S.gmatch(s, p)) o.push(S.tostring(a) + (b !== undefined ? '/' + S.tostring(b) : ''));
    assert.equal(o.join(';'), expected[line++], `gmatch ${q(s)} ${q(p)}`);
  }
});

test('table.sort with ties matches auxsort', { skip }, () => {
  const arrays: { v: number; id: number }[][] = [];
  for (let c = 0; c < 200; c++) {
    const n = rnd(60);
    arrays.push(Array.from({ length: n }, (_, id) => ({ v: rnd(6), id })));
  }
  let src = '';
  for (const a of arrays) {
    src += 'do local t={' + a.map(x => `{v=${x.v},id=${x.id}}`).join(',') + '}\n';
    src += 'table.sort(t,function(x,y) return x.v<y.v end) local o={} for i=1,#t do o[i]=t[i].id end print(table.concat(o,",")) end\n';
  }
  const expected = lua(src).split('\n');
  arrays.forEach((a, i) => {
    L.sort(a, (x, y) => x.v < y.v);
    assert.equal(a.map(x => x.id).join(','), expected[i], `sort ${i}`);
  });
});

test('table.insert/remove', { skip }, () => {
  const t: number[] = [];
  L.insert(t, 5); L.insert(t, 1, 3); L.insert(t, 2, 4); L.insert(t, 6);
  assert.deepEqual(t, [3, 4, 5, 6]);
  assert.equal(L.remove(t, 1), 3);
  assert.equal(L.remove(t), 6);
  assert.deepEqual(t, [4, 5]);
  assert.equal(L.mod(-5, 3), 1);
  assert.equal(L.mod(5.5, 2), 1.5);
});

test('math.random is Defold\'s LCG', () => {
  // Measured in the shipped engine: randomseed(42) then random(1, 1000000) x3, then random().
  L.randomseed(42);
  assert.deepEqual([L.random(1, 1000000), L.random(1, 1000000), L.random(1, 1000000)], [5341, 12208, 545319]);
  assert.equal(L.random(), 0.917236328125);
});
