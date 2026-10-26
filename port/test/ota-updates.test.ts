// The update endpoint decides, for every launch of every installed app, whether
// to hand over a new web bundle. Both failure directions are silent: too eager
// and every app re-downloads what it runs, too shy and a fix never leaves the
// server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import handler from '../../game/api/updates.js';
import stats from '../../game/api/stats.js';
import { isNewer, bundleRunsOn } from '../../game/api/_version.js';

test('isNewer: strictly newer, compared numerically', () => {
  assert.equal(isNewer('1.0.2', '1.0.1'), true);
  assert.equal(isNewer('1.1.0', '1.0.99'), true);
  assert.equal(isNewer('1.0.1', '1.0.1'), false, 'equal must be false, or every launch re-downloads');
  assert.equal(isNewer('1.0.9', '1.0.10'), false, 'numeric, not string, compare');
  assert.equal(isNewer('1.0', '1.0.0'), false);
  assert.equal(isNewer('1.0.1', 'garbage'), true, 'junk reads as ancient, so the device is not stranded');
});

test('bundleRunsOn: the native floor', () => {
  assert.equal(bundleRunsOn({}, '1.0'), true);
  assert.equal(bundleRunsOn({ min_native: '1.1' }, '1.0'), false);
  assert.equal(bundleRunsOn({ min_native: '1.1' }, '1.1'), true);
  assert.equal(bundleRunsOn({ min_native: '1.1' }, undefined), true, 'an unreadable shell version is allowed');
});

function mockRes() {
  return {
    statusCode: 0 as number,
    body: null as any,
    status(c: number) { this.statusCode = c; return this; },
    json(b: any) { this.body = b; return this; },
  };
}

function withIndex(index: any) {
  const p = join(mkdtempSync(join(tmpdir(), 'ota-test-')), 'index.json');
  writeFileSync(p, JSON.stringify(index));
  return p;
}

const bundle = (version: string, extra: any = {}) => ({
  version,
  path: `/ota/out-of-ruin-${version}.zip`,
  checksum: 'abc',
  files: [
    { file_name: 'index.html', file_hash: 'aaa', size: 10 },
    { file_name: 'port/main.js', file_hash: 'bbb', size: 20 },
  ],
  ...extra,
});

async function ask(indexPath: string, body: any) {
  process.env.OTA_INDEX_PATH = indexPath;
  const res = mockRes();
  await handler({ method: 'POST', headers: { host: 'example.test', 'x-forwarded-proto': 'https' }, body }, res);
  delete process.env.OTA_INDEX_PATH;
  return res.body;
}

test('an opted-in player gets the beta, with a per-file manifest on this host', async () => {
  const out = await ask(withIndex({ beta: '1.0.2', public: null, bundles: [bundle('1.0.2')] }), { version_name: '1.0', custom_id: 'beta' });
  assert.equal(out.version, '1.0.2');
  assert.equal(out.url, 'https://example.test/ota/out-of-ruin-1.0.2.zip');
  assert.deepEqual(out.manifest[1], { file_name: 'port/main.js', file_hash: 'bbb', download_url: 'https://example.test/ota/blobs/bbb' });
});

test('nobody else gets a beta', async () => {
  const out = await ask(withIndex({ beta: '1.0.2', public: null, bundles: [bundle('1.0.2')] }), { version_name: '1.0' });
  assert.equal(out.url, undefined);
});

test('with no beta running, opted-in players get the public release', async () => {
  const out = await ask(withIndex({ beta: null, public: '1.0.2', bundles: [bundle('1.0.2')] }), { version_name: '1.0', custom_id: 'beta' });
  assert.equal(out.version, '1.0.2');
});

test('public need not be the newest hosted version: that is a rollback', async () => {
  const out = await ask(withIndex({ beta: '1.0.3', public: '1.0.2', bundles: [bundle('1.0.3'), bundle('1.0.2')] }), { version_name: '1.0' });
  assert.equal(out.version, '1.0.2');
});

test('a pointer at an unhosted version serves nothing, never a 404 download', async () => {
  const out = await ask(withIndex({ public: '1.0.1', bundles: [bundle('1.0.2')] }), { version_name: '1.0' });
  assert.equal(out.url, undefined);
});

test('an app already on the bundle is told it is up to date', async () => {
  const out = await ask(withIndex({ public: '1.0.2', bundles: [bundle('1.0.2')] }), { version_name: '1.0.2' });
  assert.equal(out.message, 'up to date');
});

test('a shell below the bundle\'s native floor is held back', async () => {
  const out = await ask(withIndex({ public: '1.0.2', bundles: [bundle('1.0.2', { min_native: '1.1' })] }), { version_name: '1.0', version_build: '1.0' });
  assert.equal(out.message, 'app update required');
});

test('delta off serves the zip alone', async () => {
  const out = await ask(withIndex({ delta: false, public: '1.0.2', bundles: [bundle('1.0.2')] }), { version_name: '1.0' });
  assert.equal(out.version, '1.0.2');
  assert.equal(out.manifest, undefined);
});

test('another app id gets nothing; a JSON string body is parsed', async () => {
  const idx = withIndex({ public: '1.0.2', bundles: [bundle('1.0.2')] });
  assert.equal((await ask(idx, { version_name: '1.0', app_id: 'com.other' })).message, 'unknown app');
  assert.equal((await ask(idx, JSON.stringify({ version_name: '1.0' }))).version, '1.0.2');
});

test('a missing index is no-update, never a 500; GET is refused', async () => {
  const out = await ask('/nonexistent/index.json', { version_name: '1.0' });
  assert.equal(out.message, 'no update available');
  const res = mockRes();
  await handler({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});

test('the stats endpoint answers 200 to anything', async () => {
  for (const body of [{ action: 'download_fail', version_name: '1.0.2' }, 'not json', undefined]) {
    const res = mockRes();
    await stats({ method: 'POST', body }, res);
    assert.equal(res.statusCode, 200);
  }
});
