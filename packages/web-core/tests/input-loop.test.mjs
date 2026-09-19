import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createActions, bindKeyboard, bindButtons, bindStick, stickVector, pollGamepad, createLoop, fitCanvas } from '../index.mjs';

class Target extends EventEmitter {
  addEventListener(t, h) { this.on(t, h); } removeEventListener(t, h) { this.off(t, h); }
}

test('actions: press/release/axis/onChange', () => {
  const a = createActions(); const log = [];
  a.onChange((n, p) => log.push([n, p]));
  a.press('left'); a.press('left'); a.press('right');
  assert.equal(a.axis('left', 'right'), 0);
  a.release('left');
  assert.equal(a.axis('left', 'right'), 1);
  assert.deepEqual(log, [['left', true], ['right', true], ['left', false]]);
});

test('keyboard maps keys to actions, ignores typing, and releases on blur', () => {
  const a = createActions(); const t = new Target();
  bindKeyboard(a, { ArrowLeft: 'left', Space: 'fire' }, t);
  t.emit('keydown', { code: 'ArrowLeft', target: { tagName: 'BODY' }, preventDefault() {} });
  assert.equal(a.isDown('left'), true);
  t.emit('keydown', { code: 'Space', target: { tagName: 'INPUT' }, preventDefault() {} });
  assert.equal(a.isDown('fire'), false);
  t.emit('blur');
  assert.equal(a.isDown('left'), false);
});

test('buttons: data-action elements press on pointerdown and release on pointerup', () => {
  const el = Object.assign(new Target(), { dataset: { action: 'fire' }, style: {} });
  const root = { querySelectorAll: () => [el] };
  const a = createActions(); bindButtons(a, root);
  el.emit('pointerdown', { preventDefault() {} });
  assert.equal(a.isDown('fire'), true);
  el.emit('pointerup');
  assert.equal(a.isDown('fire'), false);
});

test('stickVector clamps, applies the deadzone and normalises', () => {
  assert.deepEqual(stickVector(3, 3, 70, 0.15), { x: 0, y: 0, magnitude: 0 });
  const full = stickVector(700, 0, 70);
  assert.equal(full.magnitude, 1); assert.equal(full.x, 1);   // normalised to -1..1, not pixels
  const half = stickVector(35, 0, 70);
  assert.equal(half.magnitude, 0.5);
});

test('stick drives the same actions the keyboard does', () => {
  const el = Object.assign(new Target(), { style: {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }), setPointerCapture() {} });
  const a = createActions(); bindStick(a, el, { maxRadius: 50 });
  el.emit('pointerdown', { pointerId: 1, clientX: 100, clientY: 50, preventDefault() {} });
  assert.equal(a.isDown('right'), true); assert.equal(a.isDown('left'), false);
  el.emit('pointerup', { pointerId: 1 });
  assert.equal(a.isDown('right'), false);
});

test('gamepad poll maps buttons and axes to actions', () => {
  const a = createActions();
  const pad = { buttons: [{ pressed: true }], axes: [-1, 0] };
  assert.equal(pollGamepad(a, { 0: 'fire' }, { getGamepads: () => [pad] }), true);
  assert.equal(a.isDown('fire'), true); assert.equal(a.isDown('left'), true);
  assert.equal(pollGamepad(a, {}, { getGamepads: () => [null] }), false);
});

test('loop clamps dt, skips update while paused, and stops', () => {
  let queue = []; const raf = (cb) => { queue.push(cb); return queue.length; };
  const dts = []; let renders = 0;
  const loop = createLoop({ update: (dt) => dts.push(dt), render: () => renders++, raf, caf: () => { queue = []; }, doc: null });
  loop.start();
  const step = (t) => { const cb = queue.shift(); cb(t); };
  step(1000); step(1016); step(5000);          // first dt=0, normal, then a huge gap clamps to 0.05
  assert.deepEqual(dts.map((d) => +d.toFixed(3)), [0, 0.016, 0.05]);
  loop.pause(); step(5016);
  assert.equal(dts.length, 3); assert.equal(renders, 4);
  loop.stop(); assert.equal(loop.running, false);
});

test('fitCanvas scales the backing store by dpr, caps it, and keeps drawing in CSS px', () => {
  const canvas = { parentElement: { getBoundingClientRect: () => ({ width: 300, height: 200 }) } };
  let t; const ctx = { setTransform: (...a) => { t = a; } };
  assert.deepEqual(fitCanvas(canvas, ctx, { dpr: 2 }), { cssW: 300, cssH: 200, dpr: 2 });
  assert.equal(canvas.width, 600); assert.equal(canvas.height, 400); assert.deepEqual(t, [2, 0, 0, 2, 0, 0]);
  assert.equal(fitCanvas(canvas, ctx, { dpr: 5 }).dpr, 3);
});
