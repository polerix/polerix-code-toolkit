#!/usr/bin/env node
// Builds registry.json: the list of features this toolkit publishes and how sites subscribe to them.
//   node scripts/build-registry.mjs           write registry.json
//   node scripts/build-registry.mjs --check   exit 1 if registry.json is stale (used by tests/CI)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CDN = 'https://cdn.jsdelivr.net/gh/polerix/polerix-code-toolkit@v{version}/packages/{package}/{file}';

export function buildRegistry() {
  const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  const packages = fs.readdirSync(path.join(root, 'packages')).sort().map((dir) => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'packages', dir, 'package.json')));
    return {
      name: pkg.name,
      package: dir,
      version: pkg.version,
      description: pkg.description,
      entry: pkg.main ?? 'index.mjs',
      ...(pkg.style ? { style: pkg.style } : {}),
    };
  });
  return { toolkitVersion: rootPkg.version, cdn: CDN, packages };
}

const file = path.join(root, 'registry.json');
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const next = JSON.stringify(buildRegistry(), null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== next) { console.error('registry.json is stale: run npm run registry'); process.exit(1); }
  } else fs.writeFileSync(file, next);
}
