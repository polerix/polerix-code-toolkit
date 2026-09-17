import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import {
  requestMotionPermission,
  waitForLiveOrientationData,
  attemptFullscreen,
  isStandalonePWA,
  isSecureContextAvailable
} from '../index.mjs';

test('requestMotionPermission: returns true when permission is granted', async () => {
  const mockDOE = {
    requestPermission: async () => 'granted'
  };
  const granted = await requestMotionPermission(mockDOE);
  assert.equal(granted, true);
});

test('requestMotionPermission: returns false when permission is denied or throws', async () => {
  const mockDenied = {
    requestPermission: async () => 'denied'
  };
  assert.equal(await requestMotionPermission(mockDenied), false);

  const mockError = {
    requestPermission: async () => { throw new Error('Security Error'); }
  };
  assert.equal(await requestMotionPermission(mockError), false);
});

test('requestMotionPermission: falls back gracefully on non-iOS browsers', async () => {
  const mockStandard = {}; // Exists but has no requestPermission
  assert.equal(await requestMotionPermission(mockStandard), true);
  assert.equal(await requestMotionPermission(undefined), false);
});

test('waitForLiveOrientationData: resolves true when event with non-null coords fires', async () => {
  class MockTarget extends EventEmitter {
    addEventListener(type, listener) { this.on(type, listener); }
    removeEventListener(type, listener) { this.removeListener(type, listener); }
  }

  const target = new MockTarget();
  const promise = waitForLiveOrientationData(500, target);
  setTimeout(() => {
    target.emit('deviceorientation', { alpha: 10, beta: 20, gamma: 30 });
  }, 10);

  const result = await promise;
  assert.equal(result, true);
});

test('waitForLiveOrientationData: times out and resolves false if no data arrives', async () => {
  class MockTarget extends EventEmitter {
    addEventListener(type, listener) { this.on(type, listener); }
    removeEventListener(type, listener) { this.removeListener(type, listener); }
  }

  const target = new MockTarget();
  const result = await waitForLiveOrientationData(50, target);
  assert.equal(result, false);
});

test('attemptFullscreen: normalizes prefixed APIs and legacy synchronous implementations', async () => {
  let called = false;
  const mockEl = {
    webkitRequestFullscreen: function() {
      called = true;
      return null; // Old WebKit returned undefined/null, not a Promise
    }
  };

  await attemptFullscreen(mockEl);
  assert.equal(called, true);
});

test('attemptFullscreen: rejects cleanly when no fullscreen API exists', async () => {
  await assert.rejects(
    async () => { await attemptFullscreen({}); },
    /Fullscreen API is not supported/
  );
});

test('isStandalonePWA: detects iOS standalone or display-mode match', () => {
  assert.equal(isStandalonePWA({ standalone: true }, () => ({ matches: false })), true);
  assert.equal(isStandalonePWA({ standalone: false }, (q) => ({ matches: q.includes('standalone') })), true);
  assert.equal(isStandalonePWA({}, () => ({ matches: false })), false);
});

test('isSecureContextAvailable: validates secure context flag', () => {
  assert.equal(isSecureContextAvailable(true), true);
  assert.equal(isSecureContextAvailable(false), false);
});
