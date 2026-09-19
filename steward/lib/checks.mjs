// Pure audit logic: given a repo's file list and metadata, return findings.
// A finding may carry a `fix`: { add: {path, content} } | { remove: path } | { api: 'secret-scanning' }.

import { gitignoreFor, readmeFor, securityPolicyFor, dependabotFor } from './templates.mjs';

const JUNK = /(^|\/)(\.DS_Store|__pycache__\/.*|node_modules\/.*|\.venv\/.*|venv\/.*)$/;
const SECRET_FILE = /(^|\/)(\.env(\.(?!example$)[^/]+)?|[^/]*\.pem|[^/]*\.p12|id_rsa[^/]*)$/;

export function auditRepo({ meta, paths, skip = [] }) {
  const out = [];
  const add = (f) => { if (skip !== 'all' && !skip.includes(f.id)) out.push(f); };
  const has = (re) => paths.some((p) => re.test(p));

  if (!paths.includes('.gitignore')) {
    add({ id: 'gitignore-missing', severity: 'medium', message: 'No .gitignore', fix: { add: { path: '.gitignore', content: gitignoreFor(paths) } } });
  }
  if (!has(/^readme(\.md|\.txt)?$/i)) {
    add({ id: 'readme-missing', severity: 'low', message: 'No README', fix: { add: { path: 'README.md', content: readmeFor(meta) } } });
  }
  if (!has(/^(\.github\/)?security\.md$/i) && meta.visibility === 'public') {
    add({ id: 'security-policy-missing', severity: 'low', message: 'No SECURITY.md', fix: { add: { path: 'SECURITY.md', content: securityPolicyFor(meta) } } });
  }
  if (!paths.includes('.github/dependabot.yml')) {
    const content = dependabotFor(paths);
    if (content) add({ id: 'dependabot-missing', severity: 'low', message: 'No Dependabot config for detected ecosystems', fix: { add: { path: '.github/dependabot.yml', content } } });
  }
  if (!has(/^licen[cs]e(\.md|\.txt)?$/i)) {
    add({ id: 'license-missing', severity: 'info', message: 'No LICENSE (owner decision, not auto-added)' });
  }

  const secretFiles = paths.filter((p) => SECRET_FILE.test(p));
  if (secretFiles.length) {
    add({ id: 'secret-file-tracked', severity: 'critical', message: `Tracked credential-like files: ${secretFiles.slice(0, 5).join(', ')}` });
  }
  const junk = paths.filter((p) => JUNK.test(p) && !SECRET_FILE.test(p));
  if (junk.length) {
    add({ id: 'junk-tracked', severity: 'medium', message: `${junk.length} tracked files that belong in .gitignore (.DS_Store, node_modules, __pycache__, venv)`, fix: { remove: junk } });
  }

  if (meta.visibility === 'public' && meta.security) {
    const s = meta.security;
    if (s.secret_scanning?.status !== 'enabled' || s.secret_scanning_push_protection?.status !== 'enabled') {
      add({ id: 'settings-secret-scanning', severity: 'medium', message: 'GitHub secret scanning / push protection not both enabled', fix: { api: 'secret-scanning' } });
    }
  }
  return out;
}

const DEPENDENCY_PATH = /(^|\/)(node_modules|\.venv|venv)\//;
export const isDependencyPath = (p) => DEPENDENCY_PATH.test(p);
// True when site source loads something from a dependency folder (so deleting it would break the site).
export const textReferencesDeps = (text) => /(^|[^\w-])(\.\/|\/|\.\.\/)?node_modules\//.test(text);

export const isFileFix = (f) => Boolean(f.fix?.add || f.fix?.remove);
