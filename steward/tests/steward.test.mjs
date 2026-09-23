import test from 'node:test';
import assert from 'node:assert/strict';
const FAKE_AWS = 'AKIA' + 'ABCDEFGHIJKLMNOP'; // assembled at runtime so the steward's own scan doesn't flag this file
import { scanText, isScannable } from '../lib/secrets.mjs';
import { auditRepo, isDependencyPath, textReferencesDeps } from '../lib/checks.mjs';
import { gitignoreFor, readmeFor, dependabotFor, securityPolicyFor } from '../lib/templates.mjs';
import { scopeFixes } from '../lib/checks.mjs';
import { parseSemver, compareSemver, satisfies, latestWithin, latestOverall, bumpPins, findPins, parseManifest } from '../lib/subscribe.mjs';

const meta = (o = {}) => ({ name: 'demo', owner: 'polerix', description: 'A demo', visibility: 'public', hasPages: true, security: { secret_scanning: { status: 'enabled' }, secret_scanning_push_protection: { status: 'enabled' } }, ...o });

test('secrets: detects known formats and never returns the value', () => {
  const fake = 'oauth:' + 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5';
  const hits = scanText(`line1\nconst t = "${fake}";\n<input id="x" type="${'pass' + 'word'}" value="hunter2hunter2">`);
  assert.deepEqual(hits.map((h) => [h.line, h.rule]), [[2, 'twitch-oauth-token'], [3, 'password-input-default']]);
  assert.ok(!JSON.stringify(hits).includes('a1b2c3'));
  assert.ok(!JSON.stringify(hits).includes('hunter2'));
});

test('secrets: placeholders, empty defaults and minified lines are ignored', () => {
  assert.deepEqual(scanText('<input type="password" value="">'), []);
  assert.deepEqual(scanText('token = "sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx"'), []);
  assert.deepEqual(scanText('a'.repeat(6000) + '' + FAKE_AWS + ''), []);
  assert.equal(scanText('k=' + FAKE_AWS + '').length, 1);
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

test('dependency guard: recognises dependency folders and site code that loads from them', () => {
  for (const p of ['node_modules/a/b.js', 'x/node_modules/a.js', '.venv/lib/x.py', 'sub/venv/y.py']) assert.equal(isDependencyPath(p), true, p);
  for (const p of ['src/venv.js', 'images/.DS_Store', 'node_modules_notes.md']) assert.equal(isDependencyPath(p), false, p);
  assert.equal(textReferencesDeps('<script src="./node_modules/three/build/three.js"></script>'), true);
  assert.equal(textReferencesDeps("import x from '/node_modules/x/index.js'"), true);
  assert.equal(textReferencesDeps('const a = 1; // no deps here'), false);
  assert.equal(textReferencesDeps('"node_modules/@esbuild/aix-ppc64": {'), true); // lockfiles are excluded by extension filter, not here
});

test('redact: private repo names are anonymised in CI only, public names and local runs are untouched', async () => {
  const { displayName } = await import('../lib/redact.mjs');
  assert.equal(displayName('secret-project', 'public', true), 'secret-project');
  assert.equal(displayName('secret-project', 'private', false), 'secret-project');
  const a = displayName('secret-project', 'private', true);
  assert.match(a, /^private-[0-9a-f]{6}$/);
  assert.ok(!a.includes('secret'));
  assert.equal(a, displayName('secret-project', 'private', true));      // stable across runs
  assert.notEqual(a, displayName('other-project', 'private', true));
  assert.match(displayName('x', 'internal', true), /^private-/);         // anything not public is hidden
});

test('scrubMessage hides repo names in CI error text only', async () => {
  const { scrubMessage } = await import('../lib/redact.mjs');
  const msg = 'GET /repos/polerix/secret-project/git/trees/main?recursive=1 -> 500 boom';
  assert.equal(scrubMessage(msg, true), 'GET /repos/<owner>/<repo>/git/trees/main?recursive=1 -> 500 boom');
  assert.equal(scrubMessage(msg, false), msg);
  assert.ok(!scrubMessage(msg, true).includes('secret-project'));
});

test('license: added when configured, held for review if the repo bundles third-party media, report-only otherwise', async () => {
  const { thirdPartyPaths } = await import('../lib/checks.mjs');
  const { mitLicense } = await import('../lib/templates.mjs');
  const lic = { spdx: 'MIT', holder: 'Polerix', year: 2026 };
  const base = ['.gitignore', 'README.md', 'SECURITY.md', 'index.html'];
  const plain = auditRepo({ meta: meta(), paths: base, license: lic }).find((f) => f.id === 'license-missing');
  assert.equal(plain.fix.add.path, 'LICENSE'); assert.equal(plain.needsReview, false);
  assert.match(plain.fix.add.content, /^MIT License\n\nCopyright \(c\) 2026 Polerix\n/);
  assert.match(plain.fix.add.content, /THE SOFTWARE IS PROVIDED "AS IS"/);
  const media = auditRepo({ meta: meta(), paths: [...base, 'font.ttf', 'music/track.mp3'], license: lic }).find((f) => f.id === 'license-missing');
  assert.equal(media.needsReview, true); assert.match(media.reviewNote, /font\.ttf/);
  assert.equal(auditRepo({ meta: meta(), paths: base }).find((f) => f.id === 'license-missing').fix, undefined);
  assert.ok(!auditRepo({ meta: meta(), paths: [...base, 'LICENSE'], license: lic }).some((f) => f.id === 'license-missing'));
  assert.deepEqual(thirdPartyPaths(['a.js', 'Site_files/x.js', 'x.MP4', 'old/_legacy_dump/y.js']).sort(), ['Site_files/x.js', 'old/_legacy_dump/y.js', 'x.MP4'].sort());
  assert.ok(mitLicense(lic).endsWith('SOFTWARE.\n'));
});

test('scopeFixes: a scoped check keeps its fix only in the listed repos and is report-only elsewhere', () => {
  const finding = { id: 'dependabot-missing', severity: 'low', message: 'x', fix: { add: { path: '.github/dependabot.yml', content: 'c' } } };
  const other = { id: 'readme-missing', severity: 'low', message: 'y', fix: { add: { path: 'README.md', content: 'r' } } };
  const scope = { 'dependabot-missing': ['touski'] };
  const inList = scopeFixes([finding, other], 'touski', scope);
  assert.ok(inList[0].fix && !inList[0].reportOnly);
  const outside = scopeFixes([finding, other], 'pdp1173-sim', scope);
  assert.equal(outside[0].id, 'dependabot-missing');
  assert.equal(outside[0].fix, undefined);
  assert.equal(outside[0].reportOnly, true);
  assert.deepEqual(outside[1], other, 'unscoped checks are untouched');
  assert.ok(!('fix' in outside[0]) && finding.fix, 'input is not mutated');
  assert.deepEqual(scopeFixes([finding], 'anything', {}), [finding], 'no scope configured, no change');
  assert.deepEqual(scopeFixes([finding], 'anything'), [finding]);
});

test('dependabot template: monthly, one grouped PR per ecosystem, majors excluded, limit 3', () => {
  const y = dependabotFor(['package.json', 'requirements.txt', '.github/workflows/ci.yml']);
  assert.equal((y.match(/interval: "monthly"/g) || []).length, 3);
  assert.ok(!/weekly/.test(y));
  assert.equal((y.match(/open-pull-requests-limit: 3/g) || []).length, 3);
  assert.equal((y.match(/update-types:\n\s+- "minor"\n\s+- "patch"/g) || []).length, 3);
  assert.ok(!/major/.test(y.replace(/^.*#.*$/gm, '')), 'majors are never listed in a group');
  assert.match(y, /groups:\n\s+actions:/);
});
