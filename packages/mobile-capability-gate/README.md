# @polerix/mobile-capability-gate

Zero-dependency mobile device capability gate, sensor permission handshake, and fullscreen normalizer.

Extracted from [TornadoConesVR](https://github.com/polerix/TornadoConesVR).

## Installation

```bash
npm install @polerix/mobile-capability-gate
```

## Functions

- `requestMotionPermission()`: Handles iOS `DeviceOrientationEvent.requestPermission()` with standard Web fallback. Must be called within a user gesture.
- `waitForLiveOrientationData(timeoutMs, target)`: Verifies that sensors are not only supported but actively emitting coordinate streams.
- `attemptFullscreen(element)`: Normalizes prefixed `requestFullscreen` implementations across WebKit, Blink, and Gecko.
- `isStandalonePWA(navigator, matchMedia)`: Detects if running in home screen / standalone PWA mode.
