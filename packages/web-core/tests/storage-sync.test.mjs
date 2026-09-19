import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createSync } from '../index.mjs';

const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const brokenStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };

test('store round-trips JSON with a namespace', () => {
  const s = memStorage();
  const store = createStore({ namespace: 'bb_', storage: s });
  assert.equal(store.persistent, true);
  store.set('save', { a: 1 });
  assert.deepEqual(store.get('save'), { a: 1 });
  assert.equal(s.getItem('bb_save'), '{"a":1}');
  store.remove('save');
  assert.equal(store.get('save', 'gone'), 'gone');
});

test('store never throws when storage is blocked and falls back to memory', () => {
  const store = createStore({ storage: brokenStorage });
  assert.equal(store.persistent, false);
  assert.equal(store.set('k', [1, 2]), false);
  assert.deepEqual(store.get('k'), [1, 2]);
});

test('store returns the fallback on corrupt JSON', () => {
  const s = memStorage();
  s.setItem('x', '{not json');
  assert.equal(createStore({ storage: s }).get('x', 'safe'), 'safe');
});

class FakeBC {
  static peers = new Map();
  constructor(name) { this.name = name; this.handlers = new Set(); (FakeBC.peers.get(name) ?? FakeBC.peers.set(name, new Set()).get(name)).add(this); }
  postMessage(data) { FakeBC.peers.get(this.name).forEach((p) => p !== this && p.handlers.forEach((h) => h({ data: structuredClone(data) }))); }
  addEventListener(_, h) { this.handlers.add(h); }
  removeEventListener(_, h) { this.handlers.delete(h); }
  close() { FakeBC.peers.get(this.name).delete(this); }
}

test('sync delivers only allowlisted keys and drops the rest', () => {
  const a = createSync('t', { allow: ['score', 'level'], BC: FakeBC });
  const b = createSync('t', { allow: ['score', 'level'], BC: FakeBC });
  const got = [];
  b.subscribe((p) => got.push(p));
  a.publish({ score: 5, hacked: true, level: 2 });
  assert.deepEqual(got, [{ score: 5, level: 2 }]);
});

test('sync ignores prototype-pollution keys on receive', () => {
  const b = createSync('t2', { allow: ['__proto__', 'ok'], BC: FakeBC });
  const got = [];
  b.subscribe((p) => got.push(p));
  const attacker = new FakeBC('t2');
  attacker.postMessage(JSON.parse('{"__proto__":{"polluted":1},"ok":1}'));
  assert.deepEqual(got, [{ ok: 1 }]);
  assert.equal({}.polluted, undefined);
});

test('sync degrades to a no-op when BroadcastChannel is unavailable', () => {
  const s = createSync('x', { allow: ['a'], BC: null })  // null, not undefined: undefined falls back to the global;
  assert.equal(s.supported, false);
  assert.doesNotThrow(() => { s.publish({ a: 1 }); s.subscribe(() => {})(); s.close(); });
});
