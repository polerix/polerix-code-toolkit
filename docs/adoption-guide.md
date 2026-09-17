# Adoption Guide

## Adopting in Monorepo or Workspace
In your project `package.json`:
```json
{
  "dependencies": {
    "@polerix/navigation-math": "^1.0.0",
    "@polerix/atlantic-date-core": "^1.0.0",
    "@polerix/browser-audio-capture": "^1.0.0",
    "@polerix/mobile-capability-gate": "^1.0.0"
  }
}
```

## Running Package Tests
From the root of `polerix-code-toolkit`:
```bash
npm test
```
To run tests for a single package:
```bash
cd packages/navigation-math && npm test
cd packages/atlantic-date-core && npm test
cd packages/browser-audio-capture && npm test
cd packages/mobile-capability-gate && npm test
```
