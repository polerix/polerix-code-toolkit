# site-bootstrap

Copy `index.html` and `polerix.json` into a site to subscribe it to the shared features in `@polerix/web-core`.

What you get with no further work:
- desktop and mobile controls that drive the same named actions (keyboard, on-screen buttons, virtual stick, gamepad)
- capability detection with document classes (`is-touch`, `is-mobile`, `no-fullscreen`, `has-safe-area` ...) so CSS adapts
- a HiDPI canvas that fills its container, a loop with a clamped delta time, audio that unlocks on iOS
- a Content-Security-Policy (meta tag) and HTML-escaping helpers
- version-pinned imports that the steward keeps current via PR

`polerix.json`: `toolkit` is the semver range the steward may bump within. Opt a repo out of steward management with `{"steward": false}`.

The imports use `@v1.1.0` tags, so this template only works once the toolkit has a published `v1.1.0` release (see `docs/publish-subscribe.md`).
