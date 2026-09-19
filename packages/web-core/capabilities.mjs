// Detect what the current browser can do, then adapt the document to it.
// Every function takes the global environment as a parameter so it can be tested in Node.

import { attemptFullscreen, isStandalonePWA } from '../mobile-capability-gate/index.mjs';

const PHONE_SHORT_SIDE_PX = 600;

export function detectCapabilities(env = globalThis) {
  const nav = env.navigator ?? {};
  const doc = env.document;
  const mm = (q) => (typeof env.matchMedia === 'function' ? Boolean(env.matchMedia(q).matches) : false);

  const ua = nav.userAgent || '';
  const touchPoints = nav.maxTouchPoints || 0;
  const coarsePointer = mm('(pointer: coarse)');
  const touch = touchPoints > 0 || coarsePointer || 'ontouchstart' in env;
  // iPadOS Safari reports a Mac user agent, so fall back to touch points.
  const ios = /iPhone|iPad|iPod/.test(ua) || (nav.platform === 'MacIntel' && touchPoints > 1);
  const shortSide = Math.min(env.innerWidth || Infinity, env.innerHeight || Infinity);

  let profile = 'desktop';
  if (touch && (coarsePointer || ios)) profile = shortSide < PHONE_SHORT_SIDE_PX ? 'mobile' : 'tablet';

  const root = doc?.documentElement;
  const fullscreenElement = Boolean(
    root && (root.requestFullscreen || root.webkitRequestFullscreen || root.webkitRequestFullScreen ||
             root.mozRequestFullScreen || root.msRequestFullscreen)
  );

  let storage = false;
  try {
    env.localStorage.setItem('__wc_probe', '1');
    env.localStorage.removeItem('__wc_probe');
    storage = true;
  } catch { /* blocked or unavailable */ }

  return {
    profile,
    touch,
    coarsePointer,
    hover: mm('(hover: hover)'),
    ios,
    standalone: isStandalonePWA(nav, env.matchMedia ? env.matchMedia.bind(env) : undefined),
    fullscreenElement,          // false on iPhone Safari: fall back to Add to Home Screen
    safeArea: Boolean(env.CSS?.supports?.('padding-top: env(safe-area-inset-top)')),
    motionNeedsPermission: typeof env.DeviceOrientationEvent?.requestPermission === 'function',
    speech: Boolean(env.SpeechRecognition || env.webkitSpeechRecognition),
    wakeLock: 'wakeLock' in nav,
    webAudio: Boolean(env.AudioContext || env.webkitAudioContext),
    gamepad: typeof nav.getGamepads === 'function',
    broadcast: typeof env.BroadcastChannel === 'function',
    serviceWorker: 'serviceWorker' in nav,
    secureContext: Boolean(env.isSecureContext),
    storage,
    reducedMotion: mm('(prefers-reduced-motion: reduce)'),
    viewport: { width: env.innerWidth || 0, height: env.innerHeight || 0, dpr: env.devicePixelRatio || 1 },
  };
}

// Reflect capabilities as classes/data on <html> so CSS can adapt without JS.
export function adaptDocument(doc, caps) {
  const root = doc.documentElement;
  const flags = {
    'is-touch': caps.touch,
    'no-touch': !caps.touch,
    'is-mobile': caps.profile === 'mobile',
    'is-tablet': caps.profile === 'tablet',
    'is-desktop': caps.profile === 'desktop',
    'is-ios': caps.ios,
    'is-standalone': caps.standalone,
    'has-safe-area': caps.safeArea,
    'no-fullscreen': !caps.fullscreenElement,
    'no-storage': !caps.storage,
    'reduced-motion': caps.reducedMotion,
  };
  for (const [cls, on] of Object.entries(flags)) root.classList.toggle(cls, Boolean(on));
  root.dataset.profile = caps.profile;
  return caps;
}

// Re-detect when the window is resized or rotated (debounced). Returns an unsubscribe function.
export function watchCapabilities(env, onChange, delayMs = 150) {
  let timer = null;
  const handler = () => {
    clearTimeout(timer);
    timer = setTimeout(() => onChange(detectCapabilities(env)), delayMs);
  };
  env.addEventListener('resize', handler);
  env.addEventListener('orientationchange', handler);
  return () => {
    clearTimeout(timer);
    env.removeEventListener('resize', handler);
    env.removeEventListener('orientationchange', handler);
  };
}

// One call for the common case.
export function initAdaptive(env = globalThis) {
  const caps = adaptDocument(env.document, detectCapabilities(env));
  const stop = watchCapabilities(env, (next) => adaptDocument(env.document, next));
  return { caps, stop, requestFullscreen: () => attemptFullscreen(env.document.documentElement) };
}
