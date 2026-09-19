// Publish/subscribe for shared features.
//  Publish : tag a release of polerix-code-toolkit (vX.Y.Z). jsDelivr serves that exact tag.
//  Subscribe: a site lists what it wants in polerix.json and pins a tag in its HTML/JS:
//      import { initAdaptive } from 'https://cdn.jsdelivr.net/gh/polerix/polerix-code-toolkit@v1.0.0/packages/web-core/index.mjs';
//  The steward bumps pins inside the subscribed semver range and opens a PR.

export const PIN_RE = /(polerix-code-toolkit@v?)(\d+\.\d+\.\d+)/g;

export function parseSemver(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(v).trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function compareSemver(a, b) {
  const x = parseSemver(a), y = parseSemver(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

// Supports "^1", "^1.2.0" (same major), "~1.2.0" (same minor), "1.2.3" (exact).
export function satisfies(version, range) {
  const v = parseSemver(version);
  if (!v) return false;
  const r = String(range).trim();
  const base = parseSemver(/^[\^~]?\d+$/.test(r.replace(/^[\^~]/, '')) ? `${r.replace(/^[\^~]/, '')}.0.0` : r.replace(/^[\^~]/, ''));
  if (!base) return false;
  if (r.startsWith('^')) return v[0] === base[0] && compareSemver(version, base.join('.')) >= 0;
  if (r.startsWith('~')) return v[0] === base[0] && v[1] === base[1] && v[2] >= base[2];
  return compareSemver(version, base.join('.')) === 0;
}

export function latestWithin(tags, range) {
  return tags.filter((t) => parseSemver(t) && satisfies(t, range)).sort(compareSemver).pop() ?? null;
}

export function latestOverall(tags) {
  return tags.filter((t) => parseSemver(t)).sort(compareSemver).pop() ?? null;
}

// Returns rewritten text, or null if nothing changed.
export function bumpPins(text, targetVersion) {
  const target = targetVersion.replace(/^v/, '');
  let changed = false;
  const out = text.replace(PIN_RE, (whole, prefix, current) => {
    if (current === target) return whole;
    changed = true;
    return `${prefix}${target}`;
  });
  return changed ? out : null;
}

export function findPins(text) {
  return [...text.matchAll(PIN_RE)].map((m) => m[2]);
}

// polerix.json: { "toolkit": "^1.0.0", "features": ["web-core"], "steward": { "skip": ["readme-missing"] } }
export function parseManifest(json) {
  try {
    const m = JSON.parse(json);
    return {
      toolkit: typeof m.toolkit === 'string' ? m.toolkit : null,
      features: Array.isArray(m.features) ? m.features.filter((f) => typeof f === 'string') : [],
      skip: m.steward === false ? 'all' : Array.isArray(m.steward?.skip) ? m.steward.skip : [],
    };
  } catch { return null; }
}
