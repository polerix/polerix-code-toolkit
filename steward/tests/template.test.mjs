import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as webCore from '../../packages/web-core/index.mjs';
import { buildCsp } from '../../packages/web-core/security.mjs';
import { findPins, parseManifest } from '../lib/subscribe.mjs';
import { scanText } from '../lib/secrets.mjs';

const html = fs.readFileSync(new URL('../../templates/site-bootstrap/index.html', import.meta.url), 'utf8');

test('site-bootstrap imports only symbols web-core really exports', () => {
  const names = html.match(/import \{([^}]+)\} from 'https:\/\/cdn\.jsdelivr\.net[^']*web-core\/index\.mjs'/)[1].split(',').map((s) => s.trim()).filter(Boolean);
  assert.ok(names.length >= 8);
  for (const n of names) assert.equal(typeof webCore[n], 'function', `${n} missing from web-core`);
});

test('site-bootstrap CSP equals buildCsp output and pins every toolkit URL to the same tag', () => {
  const meta = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.equal(meta, buildCsp({}, { inlineScripts: true }));
  const pins = findPins(html);
  assert.ok(pins.length >= 2);
  assert.equal(new Set(pins).size, 1);
  assert.equal(pins[0], JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url))).version);
});

test('site-bootstrap manifest parses, its range admits the pinned version, and the template has no secrets', () => {
  const m = parseManifest(fs.readFileSync(new URL('../../templates/site-bootstrap/polerix.json', import.meta.url), 'utf8'));
  assert.equal(m.toolkit, '^1.1.0');
  assert.deepEqual(scanText(html), []);
});
