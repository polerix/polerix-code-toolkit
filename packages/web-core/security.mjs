// Helpers that close the most common holes in the Polerix sites:
//  - untrusted text (chat, URLs, files, JSON) interpolated into innerHTML  -> escapeHtml / html``
//  - CSS or URL values taken from untrusted data                            -> safeColor / safeUrl
//  - missing Content-Security-Policy on static pages                        -> buildCsp

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"'`]/g, (c) => ESCAPES[c]);
}

const RAW = Symbol('wc.raw');
export const raw = (markup) => ({ [RAW]: true, markup: String(markup) });

// html`<b>${userText}</b>` escapes every interpolation unless it is wrapped in raw().
export function html(strings, ...values) {
  return strings.reduce((out, str, i) => {
    if (i === values.length) return out + str;
    const v = values[i];
    const piece = Array.isArray(v) ? v.map((x) => (x?.[RAW] ? x.markup : escapeHtml(x))).join('') : v?.[RAW] ? v.markup : escapeHtml(v);
    return out + str + piece;
  }, '');
}

// Accepts #rgb, #rrggbb, #rrggbbaa, rgb()/rgba() with numbers only. Anything else returns the fallback.
const COLOR = /^(#[0-9a-f]{3,4}|#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/i;
export function safeColor(value, fallback = '#9b59b6') {
  return typeof value === 'string' && COLOR.test(value.trim()) ? value.trim() : fallback;
}

// Returns a normalised URL string only when its protocol is allowlisted, else null.
export function safeUrl(value, { protocols = ['https:', 'http:'], base = 'https://invalid.example/' } = {}) {
  try {
    const url = new URL(String(value), base);
    return protocols.includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

const DEFAULT_CSP = {
  'default-src': ["'self'"],
  'script-src': ["'self'", 'https://cdn.jsdelivr.net/gh/polerix/'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net/gh/polerix/', 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
  'img-src': ["'self'", 'data:', 'blob:'],
  'media-src': ["'self'", 'blob:', 'data:'],
  'connect-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'none'"],
  'form-action': ["'self'"],
};

// buildCsp({ 'connect-src': ['wss://irc-ws.chat.twitch.tv'] }) extends the strict default.
// Single-file sites use inline <script>, which a strict script-src blocks. Two options:
//   scriptHashes: ['sha256-...']  allow specific inline scripts (strongest; re-hash when they change)
//   inlineScripts: true           allow all inline scripts (weaker, but connect-src/img-src/object-src/base-uri
//                                 still stop foreign script loads and most data exfiltration)
// Note: a <meta> CSP cannot set frame-ancestors; GitHub Pages sends no headers, so that is unavailable there.
export function buildCsp(extra = {}, { inlineScripts = false, scriptHashes = [] } = {}) {
  const merged = { ...DEFAULT_CSP };
  for (const [directive, sources] of Object.entries(extra)) {
    merged[directive] = [...new Set([...(merged[directive] ?? []), ...sources])];
  }
  const inline = [...(inlineScripts ? ["'unsafe-inline'"] : []), ...scriptHashes.map((h) => `'${h}'`)];
  merged['script-src'] = [...new Set([...merged['script-src'], ...inline])];
  return Object.entries(merged).map(([d, s]) => `${d} ${s.join(' ')}`).join('; ');
}

export const cspMetaTag = (extra, opts) => `<meta http-equiv="Content-Security-Policy" content="${escapeHtml(buildCsp(extra, opts))}">`;
