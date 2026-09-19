export * from './capabilities.mjs';
export * from './hidpi-canvas.mjs';
export * from './game-loop.mjs';
export * from './audio-unlock.mjs';
export * from './actions.mjs';
export * from './safe-storage.mjs';
export * from './sync-channel.mjs';
export * from './security.mjs';
export {
  attemptFullscreen,
  isStandalonePWA,
  isSecureContextAvailable,
  requestMotionPermission,
  waitForLiveOrientationData,
} from '../mobile-capability-gate/index.mjs';
