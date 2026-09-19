# polerix-code-toolkit

**Hardened, reusable engineering packages and architectural templates extracted from the [Polerix](https://github.com/polerix) GitHub repository ecosystem.**

---

## 📦 Package Catalog

| Package | Version | Tests | Provenance | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`@polerix/navigation-math`** | `1.0.0` | 4 passing | [SpinnerCockpit](https://github.com/polerix/SpinnerCockpit) | Pure spherical geometry, bearing calculation, route interpolation, and vector steering math. Zero DOM dependencies. |
| **`@polerix/atlantic-date-core`** | `1.0.0` | 7 passing | [Squarewatch](https://github.com/polerix/Squarewatch) | Canadian statutory & cultural holidays, Atlantic timezone calculations (`America/Halifax`), deterministic daily rotation, and 5x5 Bingo generation. |
| **`@polerix/browser-audio-capture`** | `1.0.0` | 5 passing | [Cassetto](https://github.com/polerix/Cassetto) | AudioWorklet-based Float32 PCM audio recording primitive with pure JS 16-bit uncompressed WAV encoder. |
| **`@polerix/mobile-capability-gate`** | `1.0.0` | 9 passing | [TornadoConesVR](https://github.com/polerix/TornadoConesVR) | Zero-dependency sensor permission handshake (iOS 13+), live motion coordinate verification, normalized fullscreen, and PWA detection. |
| **`@polerix/web-core`** | `1.0.0` | 28 passing | [ChunkyMatrix](https://github.com/polerix/ChunkyMatrix), [TornadoConesVR](https://github.com/polerix/TornadoConesVR), [VK_Terminal](https://github.com/polerix/VK_Terminal), [ESPER-machine](https://github.com/polerix/ESPER-machine), [bus-broadcaster](https://github.com/polerix/bus-broadcaster) | The shared browser runtime: capability detection and adaptation, one input model for keyboard/touch/stick/gamepad, HiDPI canvas, game loop, iOS-safe audio unlock, safe storage, cross-window sync, HTML-escaping and CSP helpers, and `web-core.css`. See [publish/subscribe](docs/publish-subscribe.md). |

---

## 🛠️ Architecture Templates

| Template | Provenance | Highlights |
| :--- | :--- | :--- |
| **`templates/electron-desktop-shell`** | [Cassetto](https://github.com/polerix/Cassetto) | Hardened retro desktop chassis with strict context isolation, disabled node integration, safe external URL delegation, and tag-gated GitHub Actions multi-platform release CI. |
| **`templates/vite-pages-release`** | [Touski](https://github.com/polerix/touski) / [SpinnerCockpit](https://github.com/polerix/SpinnerCockpit) | Multi-page Vite configuration with GitHub Pages deployment workflow featuring automated pre-publish secret-leak scans. |
| **`templates/site-bootstrap`** | This repo | Single-file starting point that subscribes a site to `web-core` (pinned CDN import, CSP, adaptive classes, desktop + mobile controls) plus the `polerix.json` manifest. |

---

## 🤖 The Steward

`steward/` is a zero-dependency runner, scheduled in `.github/workflows/steward.yml`, that keeps every repo in the account tidy and secure: it opens one PR per repo for missing `.gitignore` / README / `SECURITY.md` / Dependabot and for tracked junk, enables secret scanning and push protection, bumps shared-feature pins for subscribed sites, and fails loudly (without revealing where) if it finds a secret. New repos are picked up automatically. Setup and rules: [docs/steward.md](docs/steward.md).

---

## 🧪 Verification & Testing

The toolkit utilizes Node.js's native test runner (`node --test`), requiring zero heavy testing frameworks or external build steps.

```bash
# Run all tests across all packages and the steward
npm test

# Run individual package test suites
cd packages/navigation-math && npm test
cd packages/atlantic-date-core && npm test
cd packages/browser-audio-capture && npm test
cd packages/mobile-capability-gate && npm test
```

---

## 📚 Documentation

- [Provenance & Source Map](docs/source-map.md): Line-by-line lineage connecting packages back to their original repositories.
- [Security Boundaries](docs/security-boundaries.md): Standard practices for secret key isolation, safe client bundling, untrusted-text handling and supply-chain pinning.
- [Publish / Subscribe](docs/publish-subscribe.md): How shared features are released and how sites subscribe.
- [Steward](docs/steward.md): The autonomous housekeeping runner.
- [Compatibility Matrix](docs/compatibility-matrix.md): Runtime requirements and browser support.
- [Adoption Guide](docs/adoption-guide.md): Instructions for adopting toolkit packages in other projects.

---

## 📜 License

[MIT](LICENSE) © 2026 Polerix
