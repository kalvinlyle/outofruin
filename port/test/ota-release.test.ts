// The packer and the published files: what gets built, what gets refused, and
// that the app, the endpoint and the deployment agree with each other.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseRelease, checkPointers, NATIVE_VERSION_NAME } from '../../game/scripts/ota-release.mjs';
import { writeBlobs, deltaBytes, bundleFiles } from '../../game/scripts/ota-blobs.mjs';
import { writeZip } from '../../game/scripts/zip.mjs';
import { APP_ID } from '../../game/api/updates.js';
import { OTA_ORIGIN } from '../src/systems/live-updates';

const REPO = join(process.cwd(), '..');
const capConfig = JSON.parse(readFileSync(join(REPO, 'native/capacitor.config.json'), 'utf8'));

test('the committed ota-version.json is publishable', () => {
  const r = parseRelease(JSON.parse(readFileSync(join(REPO, 'game/ota-version.json'), 'utf8')));
  assert.ok(r.version);
});

test('a version at or below the shell\'s versionName is refused: no fresh install would be offered it', () => {
  assert.throws(() => parseRelease({ version: NATIVE_VERSION_NAME }), /not above/);
  assert.throws(() => parseRelease({ version: '0.9.0' }), /not above/);
});

test('pointers are checked: dotted, not ahead of the build, beta not behind public', () => {
  assert.throws(() => parseRelease({ version: '1.0.2', public: '1.0.3' }), /newer than the version being built/);
  assert.throws(() => parseRelease({ version: '1.0.3', public: '1.0.2', beta: '1.0.1' }), /behind public/);
  assert.throws(() => parseRelease({ version: '1.0.2', public: 'latest' }), /dotted/);
  const r = parseRelease({ version: '1.0.3', public: '1.0.2', beta: null });
  assert.equal(r.publicVersion, '1.0.2');
  assert.equal(r.beta, null);
  assert.equal(r.keep, 3);
  assert.equal(r.delta, true);
});

test('a pointer at a version the deployment does not host fails the build', () => {
  const hosted = [{ version: '1.0.3' }, { version: '1.0.2' }];
  assert.doesNotThrow(() => checkPointers({ publicVersion: '1.0.2', beta: '1.0.3' }, hosted));
  assert.doesNotThrow(() => checkPointers({ publicVersion: null, beta: null }, hosted));
  assert.throws(() => checkPointers({ publicVersion: '1.0.1', beta: null }, hosted), /does not host/);
  assert.throws(() => checkPointers({ publicVersion: '1.0.2', beta: '1.0.4' }, hosted), /does not host/);
});

test('blobs are content-addressed and the delta counts only changed files', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ota-blobs-'));
  const dist = join(dir, 'dist');
  mkdirSync(join(dist, 'port'), { recursive: true });
  mkdirSync(join(dist, 'ota'), { recursive: true });
  writeFileSync(join(dist, 'index.html'), '<html>');
  writeFileSync(join(dist, 'port/main.js'), 'v1');
  writeFileSync(join(dist, 'port/copy.js'), 'v1');
  writeFileSync(join(dist, 'ota/stale.zip'), 'must not be bundled');
  const a = await writeBlobs(dist, join(dir, 'out'));
  assert.deepEqual(a.map((f) => f.file_name), ['index.html', 'port/copy.js', 'port/main.js']);
  assert.equal(a[1].file_hash, a[2].file_hash, 'identical bytes are one blob');
  writeFileSync(join(dist, 'port/main.js'), 'v2');
  const b = await writeBlobs(dist, join(dir, 'out'));
  assert.deepEqual(deltaBytes(b, a), { bytes: 2, files: 1, total: a.reduce((s, f) => s + f.size, 0) });
});

const hasUnzip = (() => { try { execFileSync('unzip', ['-v'], { stdio: 'ignore' }); return true; } catch { return false; } })();

test('the zip unpacks with index.html at its root', { skip: hasUnzip ? false : 'no unzip' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ota-zip-'));
  const dist = join(dir, 'dist');
  mkdirSync(join(dist, 'port'), { recursive: true });
  writeFileSync(join(dist, 'index.html'), '<html>'.repeat(100));
  writeFileSync(join(dist, 'port/main.js'), Buffer.from([0, 1, 2, 3]));
  const zip = join(dir, 'b.zip');
  writeZip(zip, await bundleFiles(dist));
  execFileSync('unzip', ['-tq', zip]);
  execFileSync('unzip', ['-q', zip, '-d', join(dir, 'x')]);
  assert.equal(readFileSync(join(dir, 'x/index.html'), 'utf8'), '<html>'.repeat(100));
  assert.ok(existsSync(join(dir, 'x/port/main.js')));
});

test('the app, the endpoint and the shell name the same app and host', () => {
  assert.equal(capConfig.appId, APP_ID);
  const u = capConfig.plugins.CapacitorUpdater;
  assert.equal(new URL(u.updateUrl).origin, OTA_ORIGIN);
  assert.equal(new URL(u.statsUrl).origin, OTA_ORIGIN, 'device events come back to us, not to Capgo\'s cloud');
  assert.equal(capConfig.webDir, '../game/dist');
});

test('updates apply between sessions and roll back a bundle that never reports ready', () => {
  const u = capConfig.plugins.CapacitorUpdater;
  assert.equal(u.autoUpdate, true);
  assert.equal(u.directUpdate, false, 'never swap the game out mid-session');
  assert.ok(u.appReadyTimeout >= 10000);
  assert.equal(capConfig.android.webContentsDebuggingEnabled, false);
});

test('the deployment serves the staged dist, and stages before it packs', () => {
  const v = JSON.parse(readFileSync(join(REPO, 'game/vercel.json'), 'utf8'));
  assert.equal(v.outputDirectory, 'dist');
  assert.match(v.buildCommand, /stage-web\.mjs.*&&.*build-ota-bundle\.mjs/);
});
