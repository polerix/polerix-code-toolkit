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

---

## 🛠️ Architecture Templates

| Template | Provenance | Highlights |
| :--- | :--- | :--- |
| **`templates/electron-desktop-shell`** | [Cassetto](https://github.com/polerix/Cassetto) | Hardened retro desktop chassis with strict context isolation, disabled node integration, safe external URL delegation, and tag-gated GitHub Actions multi-platform release CI. |
| **`templates/vite-pages-release`** | [Touski](https://github.com/polerix/touski) / [SpinnerCockpit](https://github.com/polerix/SpinnerCockpit) | Multi-page Vite configuration with GitHub Pages deployment workflow featuring automated pre-publish secret-leak scans. |

---

## 🧪 Verification & Testing

The toolkit utilizes Node.js's native test runner (`node --test`), requiring zero heavy testing frameworks or external build steps.

```bash
# Run all 25 tests across all packages
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
- [Security Boundaries](docs/security-boundaries.md): Standard practices for secret key isolation and safe client bundling.
- [Compatibility Matrix](docs/compatibility-matrix.md): Runtime requirements and browser support.
- [Adoption Guide](docs/adoption-guide.md): Instructions for adopting toolkit packages in other projects.

---

## 📜 License

[MIT](LICENSE) © 2026 Polerix
