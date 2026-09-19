import test from 'node:test';
import assert from 'node:assert/strict';
import { scanText, isScannable } from '../lib/secrets.mjs';
import { auditRepo } from '../lib/checks.mjs';
import { gitignoreFor, readmeFor, dependabotFor, securityPolicyFor } from '../lib/templates.mjs';
import { parseSemver, compareSemver, satisfies, latestWithin, latestOverall, bumpPins, findPins, parseManifest } from '../lib/subscribe.mjs';

const meta = (o = {}) => ({ name: 'demo', owner: 'polerix', description: 'A demo', visibility: 'public', hasPages: true, security: { secret_scanning: { status: 'enabled' }, secret_scanning_push_protection: { status: 'enabled' } }, ...o });

test('secrets: detects known formats and never returns the value', () => {
  const fake = 'oauth:' + 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5';
  const hits = scanText(`line1\nconst t = "${fake}";\n<input id="x" type="password" value="hunter2hunter2">`);
  assert.deepEqual(hits.map((h) => [h.line, h.rule]), [[2, 'twitch-oauth-token'], [3, 'password-input-default']]);
  assert.ok(!JSON.stringify(hits).includes('a1b2c3'));
  assert.ok(!JSON.stringify(hits).includes('hunter2'));
});

test('secrets: placeholders, empty defaults and minified lines are ignored', () => {
  assert.deepEqual(scanText('<input type="password" value="">'), []);
  assert.deepEqual(scanText('token = "sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx"'), []);
  assert.deepEqual(scanText('a'.repeat(6000) + 'AKIAABCDEFGHIJKLMNOP'), []);
  assert.equal(scanText('k=AKIAABCDEFGHIJKLMNOP').length, 1);
});

test('secrets: scannable paths skip vendored/minified/binary', () => {
  assert.equal(isScannable('src/main.js', 100), true);
  for (const p of ['node_modules/x/index.js', '.venv/lib/a.py', 'dist/app.js', 'app.min.js', 'logo.png']) assert.equal(isScannable(p, 100), false, p);
  assert.equal(isScannable('big.js', 900_000), false);
});

test('checks: a bare repo gets the standard fixes', () => {
  const ids = auditRepo({ meta: meta(), paths: ['index.html', 'package.json'] }).map((f) => f.id);
  assert.deepEqual(ids, ['gitignore-missing', 'readme-missing', 'security-policy-missing', 'dependabot-missing', 'license-missing']);
});

test('checks: tracked junk is removed but credential files are only flagged, never auto-deleted', () => {
  const f = auditRepo({ meta: meta(), paths: ['.gitignore', 'README.md', 'SECURITY.md', 'LICENSE', '.DS_Store', 'a/.DS_Store', 'node_modules/x/y.js', '.env', 'k.pem', '.env.example'] });
  const junk = f.find((x) => x.id === 'junk-tracked');
  assert.deepEqual(junk.fix.remove.sort(), ['.DS_Store', 'a/.DS_Store', 'node_modules/x/y.js']);
  const sec = f.find((x) => x.id === 'secret-file-tracked');
  assert.ok(sec.message.includes('.env') && sec.message.includes('k.pem') && !sec.message.includes('.env.example'));
  assert.equal(sec.fix, undefined);
});

test('checks: skip list and full opt-out are honoured', () => {
  const paths = ['index.html'];
  assert.ok(!auditRepo({ meta: meta(), paths, skip: ['readme-missing'] }).some((f) => f.id === 'readme-missing'));
  assert.deepEqual(auditRepo({ meta: meta(), paths, skip: 'all' }), []);
});

test('checks: private repos do not get SECURITY.md; settings finding only when scanning is off', () => {
  assert.ok(!auditRepo({ meta: meta({ visibility: 'private' }), paths: ['a'] }).some((f) => f.id === 'security-policy-missing'));
  const off = meta({ security: { secret_scanning: { status: 'disabled' } } });
  assert.ok(auditRepo({ meta: off, paths: ['.gitignore'] }).some((f) => f.id === 'settings-secret-scanning'));
});

test('templates: stack-aware gitignore, readme, dependabot', () => {
  const g = gitignoreFor(['package.json', 'a.py', 'App.swift']);
  for (const s of ['node_modules/', '__pycache__/', 'xcuserdata/', '.env', '.DS_Store']) assert.ok(g.includes(s), s);
  assert.ok(!gitignoreFor(['index.html']).includes('node_modules'));
  assert.match(readmeFor({ name: 'demo', owner: 'polerix', description: 'A demo', hasPages: true }), /github\.io\/demo/);
  assert.equal(dependabotFor(['index.html']), null);
  assert.match(dependabotFor(['package.json', '.github/workflows/ci.yml']), /github-actions[\s\S]*npm/);
  assert.match(securityPolicyFor({ owner: 'polerix', name: 'demo' }), /advisories\/new/);
});

test('semver: ranges, latest-within-range, major stays out of ^1', () => {
  assert.equal(compareSemver('1.10.0', '1.9.9') > 0, true);
  assert.equal(satisfies('1.4.2', '^1'), true);
  assert.equal(satisfies('2.0.0', '^1'), false);
  assert.equal(satisfies('1.2.9', '~1.2.0'), true);
  assert.equal(satisfies('1.3.0', '~1.2.0'), false);
  assert.equal(satisfies('1.0.1', '1.0.0'), false);
  const tags = ['v1.0.0', 'v1.2.0', 'v1.10.0', 'v2.0.0', 'junk'];
  assert.equal(latestWithin(tags, '^1'), 'v1.10.0');
  assert.equal(latestOverall(tags), 'v2.0.0');
});

test('pins: bump only toolkit pins, leave everything else, report no-op as null', () => {
  const src = `import a from 'https://cdn.jsdelivr.net/gh/polerix/polerix-code-toolkit@v1.0.0/packages/web-core/index.mjs';\nimport b from 'https://cdn.jsdelivr.net/npm/three@0.160.0/x.js';`;
  const out = bumpPins(src, 'v1.2.0');
  assert.match(out, /polerix-code-toolkit@v1\.2\.0/);
  assert.match(out, /three@0\.160\.0/);
  assert.equal(bumpPins(out, '1.2.0'), null);
  assert.deepEqual(findPins(src), ['1.0.0']);
});

test('manifest parsing: valid, opt-out, malformed', () => {
  assert.deepEqual(parseManifest('{"toolkit":"^1","features":["web-core"],"steward":{"skip":["readme-missing"]}}'), { toolkit: '^1', features: ['web-core'], skip: ['readme-missing'] });
  assert.equal(parseManifest('{"steward":false}').skip, 'all');
  assert.equal(parseManifest('{nope'), null);
});
