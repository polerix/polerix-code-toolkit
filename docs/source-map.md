# Provenance & Source Map

This document establishes the line-by-line provenance of each reusable package and template in `polerix-code-toolkit`, mapping them back to their originating source repositories in `https://github.com/polerix`.

| Toolkit Package / Template | Source Repository | Originating Source Files | Source Baseline Commit | Extraction Notes |
| :--- | :--- | :--- | :--- | :--- |
| **`@polerix/navigation-math`** | [SpinnerCockpit](https://github.com/polerix/SpinnerCockpit) | `src/navigation.mjs` | `956f63e` | Pure spherical calculations, great circle distance, bearing, route interpolation, and turn-towards limits. Zero DOM dependencies. |
| **`@polerix/atlantic-date-core`** | [Squarewatch](https://github.com/polerix/Squarewatch) | `core.mjs` | `1a9aea3` | Canadian statutory and cultural holidays, `America/Halifax` DST timezone handling, deterministic pseudo-random daily rotations, and 5x5 Bingo generation. |
| **`@polerix/browser-audio-capture`** | [Cassetto](https://github.com/polerix/Cassetto) | `pcm-capture-processor.js`, `wav-encoder.mjs` | `4efdb73` | Hardened replacement for deprecated `ScriptProcessorNode`. Decouples Float32 PCM capture into an `AudioWorkletProcessor` background thread with a pure JS 16-bit WAV encoder. |
| **`@polerix/mobile-capability-gate`** | [TornadoConesVR](https://github.com/polerix/TornadoConesVR) | `js/permission.js`, `js/diagnostics.js` | `4d2c884` | iOS 13+ motion permission handshake, live coordinate stream validation, normalized fullscreen invocation, and standalone PWA detection. |
| **`templates/electron-desktop-shell`** | [Cassetto](https://github.com/polerix/Cassetto) | `main.js`, `preload.js`, `.github/workflows/build.yml` | `9035dbc` | Hardened desktop app chassis with strict context isolation, disabled node integration, safe external URL interception, and tag-gated multi-platform CI releases. |
| **`templates/vite-pages-release`** | [Touski](https://github.com/polerix/touski) & [SpinnerCockpit](https://github.com/polerix/SpinnerCockpit) | `vite.config.js`, `.github/workflows/deploy.yml` | `7fe3f51` | Production GitHub Pages deploy workflow with built-in secret scanning before artifact publishing and multi-page entrypoint rollup configuration. |
