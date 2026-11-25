#!/usr/bin/env node
// CLI wrapper: `playable-smoke ads/playable/*.html` — exits non-zero if any
// file fails the behavioral check. Used by the reusable CI workflow.
import path from 'node:path';
import { smokePlayable } from '../smoke.js';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage: playable-smoke <playable.html> [more.html...]');
  process.exit(2);
}

let failed = false;
for (const f of files) {
  const abs = path.resolve(f);
  console.log(`\n▸ smoke ${f}`);
  const { ok, failures, warnings } = await smokePlayable(abs);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  if (ok) {
    console.log('  ✓ boots, renders a canvas, makes no disallowed requests');
  } else {
    failed = true;
    for (const e of failures) console.error(`  ✗ ${e}`);
  }
}
process.exit(failed ? 1 : 0);
