// Files the steward adds when a repo lacks them. Conservative and generic; owners edit freely.

const BASE_IGNORE = `# macOS / editors
.DS_Store
.AppleDouble
.LSOverride
.idea/
.vscode/
*.swp
*.log

# secrets: never commit
.env
.env.*
!.env.example
*.pem
*.p12
id_rsa*
`;

const NODE_IGNORE = `
# Node
node_modules/
dist/
.vite/
.cache/
coverage/
`;
const PY_IGNORE = `
# Python
__pycache__/
*.py[cod]
.venv/
venv/
.pytest_cache/
`;
const SWIFT_IGNORE = `
# Xcode / Swift
xcuserdata/
DerivedData/
.build/
*.xcuserstate
`;

export function gitignoreFor(paths) {
  let out = BASE_IGNORE;
  if (paths.some((p) => /(^|\/)package\.json$/.test(p))) out += NODE_IGNORE;
  if (paths.some((p) => /\.py$/.test(p) || /(^|\/)requirements\.txt$/.test(p))) out += PY_IGNORE;
  if (paths.some((p) => /\.(swift|xcodeproj)$/.test(p))) out += SWIFT_IGNORE;
  return out;
}

export function readmeFor(repo) {
  const lines = [`# ${repo.name}`, '', repo.description ? `> ${repo.description}` : '> A Polerix project.', ''];
  if (repo.homepage) lines.push(`Live: ${repo.homepage}`, '');
  else if (repo.hasPages) lines.push(`Live: https://${repo.owner}.github.io/${repo.name}/`, '');
  lines.push('_This README is a stub added by the Polerix steward. Edit it freely._', '');
  return lines.join('\n');
}

export function securityPolicyFor(repo) {
  return `# Security Policy

## Reporting a vulnerability

Please do not open a public issue for security problems.
Use GitHub's private reporting: https://github.com/${repo.owner}/${repo.name}/security/advisories/new

## Secrets

This project must never contain API keys, tokens or passwords in the repository.
If you find one, report it as above so it can be revoked and removed.
`;
}

export function dependabotFor(paths) {
  const eco = [];
  if (paths.some((p) => p.startsWith('.github/workflows/'))) eco.push('github-actions');
  if (paths.includes('package.json')) eco.push('npm');
  if (paths.includes('requirements.txt')) eco.push('pip');
  if (!eco.length) return null;
  // Monthly, one grouped PR per ecosystem for minor/patch; majors stay out of the group and open their own PR.
  const body = eco.map((e) => `  - package-ecosystem: "${e}"\n    directory: "/"\n    schedule:\n      interval: "monthly"\n    open-pull-requests-limit: 3\n    groups:\n      ${e === 'github-actions' ? 'actions' : e}:\n        patterns:\n          - "*"\n        update-types:\n          - "minor"\n          - "patch"`).join('\n');
  return `version: 2\nupdates:\n${body}\n`;
}

// Standard MIT text (kept verbatim so GitHub's license detection recognises it).
export function mitLicense({ year, holder }) {
  return `MIT License

Copyright (c) ${year} ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}
