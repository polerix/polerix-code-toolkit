import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildRegistry } from '../../scripts/build-registry.mjs';

test('registry.json is up to date with the packages on disk', () => {
  const onDisk = JSON.parse(fs.readFileSync(new URL('../../registry.json', import.meta.url)));
  assert.deepEqual(onDisk, buildRegistry());
});

test('registry lists every package and points web-core at its stylesheet', () => {
  const r = buildRegistry();
  assert.deepEqual(r.packages.map((p) => p.package), ['atlantic-date-core', 'browser-audio-capture', 'mobile-capability-gate', 'navigation-math', 'web-core']);
  assert.equal(r.packages.find((p) => p.package === 'web-core').style, 'web-core.css');
  assert.match(r.cdn, /cdn\.jsdelivr\.net\/gh\/polerix\/polerix-code-toolkit@v\{version\}/);
});
