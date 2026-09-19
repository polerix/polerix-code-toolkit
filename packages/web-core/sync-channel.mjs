// Cross-window state sync over BroadcastChannel with a key allowlist.
// Only allowlisted plain-data keys are sent or applied, so another same-origin page can't
// overwrite arbitrary state (functions, __proto__, etc.).

const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

export function createSync(name, { allow, BC = globalThis.BroadcastChannel } = {}) {
  const allowed = new Set(allow);
  const clean = (patch) => {
    const out = {};
    if (!patch || typeof patch !== 'object') return out;
    for (const key of Object.keys(patch)) {
      if (allowed.has(key) && !FORBIDDEN.has(key) && typeof patch[key] !== 'function') out[key] = patch[key];
    }
    return out;
  };
  if (typeof BC !== 'function') {
    return { supported: false, publish() {}, subscribe() { return () => {}; }, close() {} };
  }
  const channel = new BC(name);
  return {
    supported: true,
    publish(patch) { channel.postMessage(clean(patch)); },
    subscribe(cb) {
      const handler = (e) => { const patch = clean(e.data); if (Object.keys(patch).length) cb(patch); };
      channel.addEventListener('message', handler);
      return () => channel.removeEventListener('message', handler);
    },
    close() { channel.close(); },
  };
}
