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

### 4. Untrusted Text Never Reaches `innerHTML`
- Chat messages, usernames, colours, URLs, file names, imported JSON and query strings are attacker-controlled. Interpolating them into `innerHTML` lets any visitor (or any chat viewer) run script in the page.
- Use `textContent`, or `escapeHtml` / `html` from `@polerix/web-core`; validate CSS values with `safeColor` and links with `safeUrl`.
- Origin of this rule: bus-broadcaster rendered Twitch chat text unescaped, in the same origin that stores the OBS password and Twitch token.

### 5. Secrets Never Live in Web Storage or Markup
- `localStorage` is readable by any script on the origin. `btoa()` is encoding, not encryption. Keep tokens in memory for the session, or behind a server-side proxy.
- Never give a password/token `<input>` a default `value`.
- Anything ever committed, even for one commit, must be treated as leaked: **revoke it first**, then remove it. Removing a line does not remove it from git history or clones.

### 6. Supply Chain
- Pin GitHub Actions to full commit SHAs with the version in a trailing comment. Give workflows `permissions: contents: read` unless a job needs more.
- Import shared code only from an exact toolkit tag (`@vX.Y.Z`), never `@main` or an unpinned URL. Tags are immutable: publish a new version instead of moving one.
- Ship a Content-Security-Policy on every static page (`buildCsp` / `cspMetaTag`). Prefer `scriptHashes` over `inlineScripts`.
- Enable GitHub secret scanning and push protection on every public repo. The steward (`docs/steward.md`) enforces this. Note GitHub does not recognise every token format (it did not flag a Twitch OAuth token), so the steward runs its own scan as well.
