# Publish / subscribe for shared features

One place holds the shared code (this repo). Every site subscribes to a **version**, and a robot keeps the subscriptions current.

## Publish (you, when a shared feature changes)

1. Change a package under `packages/`, add or update its tests, run `npm test`.
2. Bump the version in that package's `package.json` and the root `package.json` (semver: breaking = major).
3. `npm run registry` to regenerate `registry.json`, then commit.
4. Tag and release: `git tag v1.2.0 && git push origin v1.2.0`, then publish a GitHub Release for the tag.
   jsDelivr serves that exact tag at
   `https://cdn.jsdelivr.net/gh/polerix/polerix-code-toolkit@v1.2.0/packages/<package>/<file>`.
   Tags are treated as immutable: never move or reuse one, publish a new version instead.
5. Publishing the release triggers the **steward** (see `steward.md`), which opens bump PRs in every subscribed repo.

## Subscribe (a site)

1. Copy `templates/site-bootstrap/polerix.json` to the repo root:
   ```json
   { "toolkit": "^1.1.0", "features": ["web-core"], "steward": { "skip": [] } }
   ```
   `toolkit` is the semver range the steward may move the pin within. `^1.1.0` takes minors and patches, and a new major is only reported, never applied.
2. Import from a **pinned** tag in your HTML or JS (start from `templates/site-bootstrap/index.html`):
   ```js
   import { initAdaptive, createActions } from 'https://cdn.jsdelivr.net/gh/polerix/polerix-code-toolkit@v1.1.0/packages/web-core/index.mjs';
   ```
   The steward finds every `polerix-code-toolkit@vX.Y.Z` in the repo and rewrites it in one PR.
3. Add the CSP meta tag from the template, extended with the hosts your site really calls.

Do not import from `@main` or an unpinned URL: a bad commit would then break every site at once and you could not roll back per site.

## Features available today

| Feature | What it gives a site |
| --- | --- |
| `initAdaptive` / `detectCapabilities` | Detects touch, phone/tablet/desktop, iOS, standalone PWA, fullscreen support, safe areas, motion permission, speech, wake lock, storage, and sets `is-*` / `no-*` classes on `<html>` so CSS adapts |
| `createActions` + `bindKeyboard` / `bindButtons` / `bindStick` / `pollGamepad` | One input model. A game written against actions such as `left` and `fire` works with keyboard, on-screen buttons, virtual stick and gamepad |
| `fitCanvas` / `observeCanvas` | Sharp, container-filling canvas on HiDPI screens |
| `createLoop` | `requestAnimationFrame` loop with clamped delta time, pause, tab-visibility handling |
| `createAudioUnlock` | Web Audio that starts on iOS and Chrome (activates on `touchend`/`pointerup`, not `touchstart`) |
| `createStore` | localStorage that never throws and falls back to memory. Not for secrets |
| `createSync` | BroadcastChannel sync with a key allowlist |
| `escapeHtml`, `html`, `raw`, `safeColor`, `safeUrl` | Stop untrusted text reaching `innerHTML`, CSS and URLs |
| `buildCsp` / `cspMetaTag` | Content-Security-Policy for static pages |
| `web-core.css` | Safe-area padding, `100dvh`, 44px touch targets, touch-only/keyboard-only visibility, CRT overlay, reduced motion |

## Desktop and mobile parity: how it is meant to work

- **Detect, then adapt, never sniff per site.** Sites read classes (`is-touch`, `no-fullscreen`) or `caps`, not user agents.
- **Same actions everywhere.** Input differences live in the bindings, not in game code.
- **Degrade, don't break.** Missing APIs (fullscreen on iPhone, speech, BroadcastChannel, storage) return `false`/no-ops so the site still boots. iPhone Safari has no element fullscreen: use "Add to Home Screen" and check `caps.standalone`.
