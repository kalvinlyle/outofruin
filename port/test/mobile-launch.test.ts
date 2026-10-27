// The native app's build gates and server side: what each build's env.js
// carries, the production key gate, CORS for the app's origin, and the ledger
// that grants each Google Play purchase exactly once.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envScript, missingRequiredKeys } from '../../game/scripts/web-env.mjs';
import cors from '../../game/api/_cors.js';
import { alreadyGranted, markGranted, GRANTED_KEY } from '../src/systems/play-ledger';

function mockRes() {
  return {
    statusCode: 0 as number,
    body: null as any,
    headers: {} as Record<string, string>,
    ended: false,
    status(c: number) { this.statusCode = c; return this; },
    json(b: any) { this.body = b; return this; },
    setHeader(k: string, v: string) { this.headers[k] = v; },
    end() { this.ended = true; },
  };
}

test('env.js carries the build\'s keys and the web bundle version, and defaults the PostHog host to the EU', () => {
  const s = envScript({ VITE_POSTHOG_KEY: ' phc_x ', VITE_APPSFLYER_DEV_KEY: 'af' }, '1.0.4');
  const env = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
  assert.equal(env.VITE_POSTHOG_KEY, 'phc_x');
  assert.equal(env.VITE_POSTHOG_HOST, 'https://eu.i.posthog.com');
  assert.equal(env.VITE_GAME_VERSION, '1.0.4');
  assert.equal(env.VITE_SNOWPLOW_APP_ID, '', 'Snowplow stays off until it has its app_id');
});

test('a shipping build without attribution or analytics keys is refused; local builds are not', () => {
  assert.deepEqual(missingRequiredKeys({}), []);
  assert.deepEqual(missingRequiredKeys({ VERCEL_ENV: 'preview' }), []);
  assert.deepEqual(missingRequiredKeys({ VERCEL_ENV: 'production' }), ['VITE_APPSFLYER_DEV_KEY', 'VITE_POSTHOG_KEY']);
  assert.deepEqual(missingRequiredKeys({ GITHUB_ACTIONS: 'true', VITE_POSTHOG_KEY: 'phc_x' }), ['VITE_APPSFLYER_DEV_KEY']);
  assert.deepEqual(missingRequiredKeys({ GITHUB_ACTIONS: 'true', VITE_POSTHOG_KEY: 'phc_x', VITE_APPSFLYER_DEV_KEY: 'af' }), []);
});

test('the app\'s origins get CORS; any other site does not; preflights are answered', () => {
  for (const origin of ['https://localhost', 'capacitor://localhost']) {
    const res = mockRes();
    assert.equal(cors({ method: 'POST', headers: { origin } }, res), false);
    assert.equal(res.headers['Access-Control-Allow-Origin'], origin);
  }
  const other = mockRes();
  cors({ method: 'POST', headers: { origin: 'https://evil.example' } }, other);
  assert.equal(other.headers['Access-Control-Allow-Origin'], undefined);
  const pre = mockRes();
  assert.equal(cors({ method: 'OPTIONS', headers: { origin: 'https://localhost' } }, pre), true);
  assert.equal(pre.statusCode, 204);
});

// ---------------------------------------------------------------- Play purchases

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

test('a Play purchase token is granted exactly once, however often Play reports it', () => {
  const s = new MemStorage();
  assert.equal(alreadyGranted(s, 'tok-1'), false);
  markGranted(s, 'tok-1');
  assert.equal(alreadyGranted(s, 'tok-1'), true, 'found again at the next launch: no second grant');
  assert.equal(alreadyGranted(s, 'tok-2'), false, 'a new purchase of the same pack is still owed');
});

test('the ledger keeps a bounded tail and survives junk', () => {
  const s = new MemStorage();
  for (let i = 0; i < 250; i++) markGranted(s, `t${i}`);
  assert.equal(JSON.parse(s.getItem(GRANTED_KEY)!).length, 200);
  assert.equal(alreadyGranted(s, 't249'), true);
  s.setItem(GRANTED_KEY, 'not json');
  assert.equal(alreadyGranted(s, 't249'), false);
  markGranted(s, 'x');
  assert.equal(alreadyGranted(s, 'x'), true);
});
