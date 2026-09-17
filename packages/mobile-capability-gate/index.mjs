/**
 * Mobile Capability Gate
 *
 * Progressive sensor permission detection, live sensor validation,
 * normalized fullscreen activation, and standalone PWA detection.
 *
 * Extracted from TornadoConesVR.
 */

export async function requestMotionPermission(deviceOrientationEvent = globalThis.DeviceOrientationEvent) {
  if (typeof deviceOrientationEvent !== 'undefined' && typeof deviceOrientationEvent.requestPermission === 'function') {
    try {
      const result = await deviceOrientationEvent.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }
  return typeof deviceOrientationEvent !== 'undefined';
}

export function waitForLiveOrientationData(timeoutMs = 2500, eventTarget = globalThis) {
  return new Promise((resolve) => {
    if (!eventTarget || typeof eventTarget.addEventListener !== 'function') {
      resolve(false);
      return;
    }

    let done = false;
    const handler = (e) => {
      if (e && (e.alpha !== null || e.beta !== null || e.gamma !== null)) {
        if (!done) {
          done = true;
          cleanup();
          resolve(true);
        }
      }
    };

    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        cleanup();
        resolve(false);
      }
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      eventTarget.removeEventListener('deviceorientation', handler);
    }

    eventTarget.addEventListener('deviceorientation', handler);
  });
}

export function attemptFullscreen(element = globalThis.document?.documentElement) {
  if (!element) {
    return Promise.reject(new Error('No DOM element available for fullscreen request.'));
  }

  const request =
    element.requestFullscreen ||
    element.webkitRequestFullscreen ||
    element.webkitRequestFullScreen ||
    element.mozRequestFullScreen ||
    element.msRequestFullscreen;

  if (!request) {
    return Promise.reject(new Error('Fullscreen API is not supported in this environment.'));
  }

  try {
    const result = request.call(element);
    return result && typeof result.then === 'function' ? result : Promise.resolve();
  } catch (err) {
    return Promise.reject(err);
  }
}

export function isStandalonePWA(nav = globalThis.navigator, matchMediaFn = globalThis.matchMedia) {
  if (nav && 'standalone' in nav && nav.standalone) {
    return true; // iOS Safari standalone web app
  }
  if (typeof matchMediaFn === 'function') {
    return matchMediaFn('(display-mode: standalone)').matches;
  }
  return false;
}

export function isSecureContextAvailable(ctx = globalThis.isSecureContext) {
  return Boolean(ctx);
}
