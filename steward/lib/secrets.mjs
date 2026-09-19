// Find likely secrets in text. Reports line + rule name only, NEVER the matched value,
// so reports and issues are safe to publish.

const RULES = [
  ['anthropic-key', /sk-ant-[A-Za-z0-9_-]{20,}/],
  ['openai-style-key', /\bsk-[A-Za-z0-9]{32,}/],
  ['github-token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/],
  ['aws-access-key', /\bAKIA[0-9A-Z]{16}\b/],
  ['google-api-key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ['twitch-oauth-token', /\boauth:[a-z0-9]{30}\b/],
  ['private-key', /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  // <input type="password" ... value="something"> with a real default value
  ['password-input-default', /<input\b[^>]*type=["']password["'][^>]*\bvalue=["'][^"']{6,}["']/i],
];
const PLACEHOLDER = /(x{4,}|\*{3,}|your[_-]?|example|placeholder|changeme|<[^>]+>|\$\{)/i;

export function scanText(text) {
  const hits = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 5000) continue; // minified blobs are noise
    for (const [rule, re] of RULES) {
      const m = line.match(re);
      if (m && !PLACEHOLDER.test(m[0])) hits.push({ line: i + 1, rule });
    }
  }
  return hits;
}

const SKIP_DIR = /(^|\/)(node_modules|\.git|\.venv|venv|dist|build|__pycache__|site-packages|_legacy_dump|cesium|vendor)\//;
const TEXT_EXT = /\.(html?|m?js|cjs|ts|tsx|jsx|py|sh|json|ya?ml|md|txt|env|cfg|ini|toml|css|swift)$/i;

export function isScannable(path, size = 0) {
  return TEXT_EXT.test(path) && !SKIP_DIR.test(path) && !/\.min\./.test(path) && size < 400_000;
}
