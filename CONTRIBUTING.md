# Contributing to Polerix Code Toolkit

## Principles
1. **Decoupled Primitives**: Packages must remain pure and self-contained with minimal external dependencies.
2. **Automated Verification**: Every new function or package must include tests runnable with `node --test`.
3. **No Credential Bundling**: Secret keys, environment variables intended for backend use, and raw API tokens must never be embedded into client package code.
4. **Retro Aesthetic Preservation**: Templates must respect the visual identities and styling conventions established in the Polerix portfolio.
