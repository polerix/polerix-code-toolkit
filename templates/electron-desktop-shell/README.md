# Electron Desktop Shell Template

Hardened portable desktop app chassis derived from [Cassetto](https://github.com/polerix/Cassetto).

## Security Features

- `contextIsolation: true` and `nodeIntegration: false` strictly enforced.
- Minimal `preload.js` bridge exposing only safe window control methods.
- External URLs intercepted and opened via system default browser.
- Tag-gated GitHub Actions workflow preventing release overwrites on standard branch pushes.
