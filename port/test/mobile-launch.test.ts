// The native app's server side and build gates: what each build's env.js
// carries, the production key gate, CORS for the app's origin, and the check
// that a Google Play purchase is real before its gold is granted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { envScript, missingRequiredKeys } from '../../game/scripts/web-env.mjs';
import cors from '../../game/api/_cors.js';
import claim from '../../game/api/play-claim.js';
import status from '../../game/api/status.js';

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

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const SA = JSON.stringify({ client_email: 'verify@example.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) });

/** Answer Google's token and purchases endpoints with `purchase` (or a 404 when null). */
function withGoogle(purchase: any, fn: () => Promise<void>) {
  return async () => {
    const real = globalThis.fetch;
    const seen: string[] = [];
    globalThis.fetch = (async (url: any) => {
      const u = String(url);
      seen.push(u);
      if (u.startsWith('https://oauth2.googleapis.com/token')) return new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 });
      if (purchase === null) return new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404 });
      return new Response(JSON.stringify(purchase), { status: 200 });
    }) as any;
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT = SA;
    try {
      await fn();
      assert.ok(seen.some((u) => u.includes('/applications/games.misaligned.outofruin/purchases/products/buygold_2/tokens/tok')), 'asks Google about this app, product and token');
    } finally {
      globalThis.fetch = real;
      delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;
    }
  };
}

async function ask(body: any) {
  const res = mockRes();
  await claim({ method: 'POST', headers: { origin: 'https://localhost' }, body }, res);
  return res;
}

test('a paid, unconsumed purchase is granted its pack\'s gold from packs.js', withGoogle({ purchaseState: 0, consumptionState: 0, orderId: 'GPA.1' }, async () => {
  const res = await ask({ product: 'buygold_2', token: 'tok' });
  assert.deepEqual(res.body, { status: 'granted', gold: 500 });
}));

test('an already consumed purchase grants nothing', withGoogle({ purchaseState: 0, consumptionState: 1 }, async () => {
  assert.equal((await ask({ product: 'buygold_2', token: 'tok' })).body.status, 'consumed');
}));

test('a payment that has not cleared is asked about again later', withGoogle({ purchaseState: 2, consumptionState: 0 }, async () => {
  assert.equal((await ask({ product: 'buygold_2', token: 'tok' })).body.status, 'pending');
}));

test('a cancelled, refunded or forged purchase grants nothing', withGoogle(null, async () => {
  assert.equal((await ask({ product: 'buygold_2', token: 'tok' })).body.status, 'invalid');
}));

test('an unknown product is refused before Google is asked', async () => {
  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT = SA;
  try {
    const res = await ask({ product: 'buygold_99', token: 'tok' });
    assert.equal(res.statusCode, 400);
  } finally {
    delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT;
  }
});

test('without the service account, purchases are reported unavailable rather than failing one by one', async () => {
  const res = await ask({ product: 'buygold_2', token: 'tok' });
  assert.equal(res.statusCode, 503);
  const s = mockRes();
  status({ method: 'GET', headers: {} }, s);
  assert.equal(s.body.play, false);
});
