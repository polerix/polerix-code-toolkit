# Security Boundaries & Credential Isolation

## Core Rules

### 1. Zero Secret Bundling in Client Assets
- **Vite Prefix Rule**: Never prefix secret API keys with `VITE_` (e.g. `VITE_ANTHROPIC_API_KEY`). Any environment variable with the `VITE_` prefix is baked into static JavaScript files during `vite build`, exposing credentials to anyone inspecting network requests or page source.
- **Backend Adapter Pattern**: As established in [ADR-001](https://github.com/polerix/touski/blob/master/docs/ADR-001-api-architecture.md), static client applications (like those on GitHub Pages) must delegate sensitive API calls to a serverless proxy or companion sidecar.
- **Pre-Deploy CI Verification**: The `vite-pages-release` template includes an automated secret scanning step in GitHub Actions:
  ```bash
  ! grep -rn "sk-" dist/
  ! grep -rn "VITE_ANTHROPIC" dist/
  ```

### 2. Electron Security Boundary
- **Process Isolation**: Always enforce `contextIsolation: true` and `nodeIntegration: false`.
- **Minimal Surface**: Expose only explicit, fine-grained methods via `contextBridge.exposeInMainWorld()`. Never expose raw `ipcRenderer.send` or `ipcRenderer.on`.
- **Navigation Lockdown**: Intercept all new window creation events via `webContents.setWindowOpenHandler` and delegate external URLs to `shell.openExternal(url)` with `{ action: 'deny' }`.

### 3. Non-Destructive Automation
- **Opt-In Mutation**: Synchronization and release scripts must default to non-destructive inspection (`--dry-run` or `--plan`).
- **Gated Publishing**: GitHub Actions release workflows must trigger only on version tags (`refs/tags/v*`), never on standard branch pushes.
