import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { detectCapabilities, adaptDocument, createAudioUnlock } from '../index.mjs';

const classList = () => { const s = new Set(); return { toggle: (c, on) => (on ? s.add(c) : s.delete(c)), has: (c) => s.has(c), s }; };
const mm = (matches) => (q) => ({ matches: matches.includes(q) });

const iphone = () => ({
  navigator: { userAgent: 'iPhone', maxTouchPoints: 5, platform: 'iPhone' }, innerWidth: 402, innerHeight: 874, devicePixelRatio: 3,
  matchMedia: mm(['(pointer: coarse)']), document: { documentElement: {} }, ontouchstart: null,
  DeviceOrientationEvent: { requestPermission() {} }, webkitAudioContext: class {}, isSecureContext: true,
  localStorage: { setItem() {}, removeItem() {} }, CSS: { supports: () => true },
});
const desktop = () => ({
  navigator: { userAgent: 'Mac', maxTouchPoints: 0, platform: 'MacIntel', getGamepads() {} }, innerWidth: 1440, innerHeight: 900, devicePixelRatio: 2,
  matchMedia: mm(['(hover: hover)']), document: { documentElement: { requestFullscreen() {} } }, AudioContext: class {}, isSecureContext: true,
  localStorage: { setItem() {}, removeItem() {} }, CSS: { supports: () => true }, BroadcastChannel: class {},
});

test('iPhone: mobile profile, no element fullscreen, needs motion permission', () => {
  const c = detectCapabilities(iphone());
  assert.equal(c.profile, 'mobile'); assert.equal(c.ios, true); assert.equal(c.touch, true);
  assert.equal(c.fullscreenElement, false); assert.equal(c.motionNeedsPermission, true);
  assert.equal(c.safeArea, true); assert.equal(c.viewport.dpr, 3);
});

test('desktop: desktop profile, hover, fullscreen, gamepad, no touch', () => {
  const c = detectCapabilities(desktop());
  assert.equal(c.profile, 'desktop'); assert.equal(c.touch, false); assert.equal(c.hover, true);
  assert.equal(c.fullscreenElement, true); assert.equal(c.gamepad, true); assert.equal(c.broadcast, true);
});

test('iPadOS reporting a Mac UA is treated as touch/tablet', () => {
  const env = { ...desktop(), navigator: { userAgent: 'Mac', platform: 'MacIntel', maxTouchPoints: 5 }, matchMedia: mm(['(pointer: coarse)']) };
  const c = detectCapabilities(env);
  assert.equal(c.ios, true); assert.equal(c.profile, 'tablet');
});

test('blocked localStorage is reported, not thrown', () => {
  const env = { ...desktop(), localStorage: { setItem() { throw new Error('x'); }, removeItem() {} } };
  assert.equal(detectCapabilities(env).storage, false);
});

test('adaptDocument sets classes and data-profile', () => {
  const cl = classList(); const doc = { documentElement: { classList: cl, dataset: {} } };
  adaptDocument(doc, detectCapabilities(iphone()));
  for (const c of ['is-touch', 'is-mobile', 'is-ios', 'no-fullscreen', 'has-safe-area']) assert.ok(cl.has(c), c);
  assert.ok(!cl.has('is-desktop')); assert.equal(doc.documentElement.dataset.profile, 'mobile');
});

test('audio unlock: retries until running, unlocks once, then detaches', async () => {
  const win = new EventEmitter(); win.addEventListener = (t, h) => win.on(t, h); win.removeEventListener = (t, h) => win.off(t, h);
  let resumes = 0;
  win.AudioContext = class {
    state = 'suspended';
    createGain() { return { gain: {}, connect() {} }; }
    createBuffer() { return {}; } createBufferSource() { return { connect() {}, start() {} }; }
    async resume() { resumes++; if (resumes >= 2) this.state = 'running'; }
  };
  const audio = createAudioUnlock({ win }); let cbs = 0; audio.onUnlock(() => cbs++);
  await win.listeners('touchend')[0](); assert.equal(audio.unlocked, false);   // first attempt not yet running
  await win.listeners('pointerup')[0](); assert.equal(audio.unlocked, true); assert.equal(cbs, 1);
  assert.equal(win.listenerCount('touchend'), 0);                               // detached after unlock
});

test('audio unlock reports unsupported without throwing', () => {
  const win = new EventEmitter(); win.addEventListener = () => {}; win.removeEventListener = () => {};
  assert.equal(createAudioUnlock({ win }).supported, false);
});
