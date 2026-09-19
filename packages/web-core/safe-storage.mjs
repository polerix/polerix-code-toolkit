// localStorage that never throws (private mode, blocked site data, quota) and falls back to memory.
// NOT for secrets. Anything in web storage is readable by any script on the page, so a single
// XSS exposes it. Base64 is encoding, not encryption. Keep tokens in memory only.

export function createStore({ namespace = '', storage = globalThis.localStorage } = {}) {
  const memory = new Map();
  const k = (key) => `${namespace}${key}`;
  let persistent = true;
  try {
    storage.setItem('__wc_probe', '1');
    storage.removeItem('__wc_probe');
  } catch { persistent = false; }

  return {
    get persistent() { return persistent; },
    get(key, fallback = null) {
      try {
        const raw = persistent ? storage.getItem(k(key)) : memory.get(k(key));
        return raw == null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    set(key, value) {
      const raw = JSON.stringify(value);
      if (persistent) {
        try { storage.setItem(k(key), raw); return true; } catch { persistent = false; }
      }
      memory.set(k(key), raw);
      return false; // saved in memory only
    },
    remove(key) {
      memory.delete(k(key));
      try { storage.removeItem(k(key)); } catch { /* ignore */ }
    },
  };
}
