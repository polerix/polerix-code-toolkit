#!/usr/bin/env node
// Polerix steward: keeps every repo in the account tidy, secure and subscribed to shared features.
//
//   node steward/steward.mjs audit            report only (default, changes nothing)
//   node steward/steward.mjs apply            open/update one PR per repo, enable GitHub security settings
//   flags: --repo <name> (repeatable)  --no-secrets  --details (show secret locations; local use only)
//
// Guarantees: never pushes to a default branch, never deletes a repo or a branch it didn't create,
// only force-updates its own `steward/housekeeping` branch, respects `polerix.json` opt-outs,
// and a closed-unmerged PR is not reopened until the findings change.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { createClient } from './lib/github.mjs';
import { auditRepo, isFileFix } from './lib/checks.mjs';
import { scanText, isScannable } from './lib/secrets.mjs';
import { parseManifest, findPins, bumpPins, latestWithin, latestOverall, parseSemver, compareSemver } from './lib/subscribe.mjs';

const cfg = JSON.parse(fs.readFileSync(new URL('./config.json', import.meta.url)));
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { repo: { type: 'string', multiple: true }, 'no-secrets': { type: 'boolean' }, details: { type: 'boolean' } },
});
const mode = positionals[0] ?? 'audit';
if (!['audit', 'apply'].includes(mode)) { console.error('usage: steward.mjs audit|apply'); process.exit(2); }

const inCI = process.env.GITHUB_ACTIONS === 'true';
const showDetails = values.details && !inCI;
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || execFileSync('gh', ['auth', 'token']).toString().trim();
const trailer = process.env.STEWARD_COMMIT_TRAILER ? `\n\n${process.env.STEWARD_COMMIT_TRAILER}` : '';
const footer = process.env.STEWARD_PR_FOOTER ? `\n\n${process.env.STEWARD_PR_FOOTER}` : '';
const gh = createClient(token, { attribution: trailer });
const b64 = (s) => Buffer.from(s, 'base64').toString('utf8');

async function listRepos() {
  const all = await gh.paginate('/user/repos?affiliation=owner&sort=pushed');
  return all.filter((r) => r.owner.login === cfg.owner && !r.fork && !r.archived && !r.disabled && !cfg.skipRepos.includes(r.name)
    && (!values.repo || values.repo.includes(r.name)));
}

async function loadRepo(r) {
  const full = await gh.get(`/repos/${cfg.owner}/${r.name}`);
  const tree = await gh.request('GET', `/repos/${cfg.owner}/${r.name}/git/trees/${full.default_branch}?recursive=1`, undefined, { allow: [404, 409] });
  if (tree.status !== 200) return null; // empty repo
  const paths = tree.data.tree.filter((t) => t.type === 'blob').map((t) => t.path);
  const meta = { name: r.name, owner: cfg.owner, description: full.description, homepage: full.homepage, visibility: full.visibility,
    hasPages: full.has_pages, security: full.security_and_analysis, branch: full.default_branch, sizeKb: full.size, hasIssues: full.has_issues };
  return { meta, paths, truncated: tree.data.truncated };
}

async function readFile(repo, filePath) {
  const f = await gh.request('GET', `/repos/${cfg.owner}/${repo.meta.name}/contents/${encodeURI(filePath)}?ref=${repo.meta.branch}`, undefined, { allow: [404] });
  return f.status === 200 && f.data.content ? b64(f.data.content) : null;
}

// One tarball download per repo, extracted to a temp dir, scanned, then deleted.
async function scanSecrets(repo) {
  if (repo.meta.sizeKb > cfg.maxRepoSizeKbForSecretScan) return { skipped: true, hits: [] };
  const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${repo.meta.name}/tarball/${repo.meta.branch}`, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'polerix-steward' } });
  if (!res.ok) return { skipped: true, hits: [] };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'steward-'));
  try {
    const tgz = path.join(dir, 'r.tgz');
    fs.writeFileSync(tgz, Buffer.from(await res.arrayBuffer()));
    fs.mkdirSync(path.join(dir, 'x'));
    execFileSync('tar', ['-xzf', tgz, '-C', path.join(dir, 'x'), '--strip-components=1']);
    const hits = [];
    const walk = (d, rel = '') => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name), r = rel ? `${rel}/${e.name}` : e.name;
        if (e.isSymbolicLink()) continue;
        if (e.isDirectory()) { walk(p, r); continue; }
        if (!isScannable(r, fs.statSync(p).size)) continue;
        if ((cfg.secretIgnore?.[repo.meta.name] ?? []).includes(r)) continue;
        for (const h of scanText(fs.readFileSync(p, 'utf8'))) hits.push({ path: r, ...h });
      }
    };
    walk(path.join(dir, 'x'));
    return { skipped: false, hits };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

async function planSubscription(repo, manifest, toolkitTags) {
  if (!manifest?.toolkit) return { findings: [], adds: [] };
  const target = latestWithin(toolkitTags, manifest.toolkit);
  const newest = latestOverall(toolkitTags);
  const findings = [], adds = [];
  const candidates = repo.paths.filter((p) => /\.(html?|m?js)$/.test(p) && !/(^|\/)(node_modules|dist|docs\/assets)\//.test(p)).slice(0, 60);
  let pinnedVersion = null;
  for (const p of candidates) {
    const text = await readFile(repo, p);
    if (!text || !findPins(text).length) continue;
    pinnedVersion = findPins(text)[0];
    const next = target && bumpPins(text, target);
    if (next) adds.push({ path: p, content: next });
  }
  if (adds.length) findings.push({ id: 'subscription-outdated', severity: 'low', message: `Shared toolkit pin ${pinnedVersion} -> ${target} (within ${manifest.toolkit})`, fix: { add: adds } });
  if (newest && target && compareSemver(newest, target) > 0) findings.push({ id: 'subscription-major-available', severity: 'info', message: `Toolkit ${newest} is outside subscribed range ${manifest.toolkit}` });
  return { findings, adds };
}

async function auditAll() {
  const tags = (await gh.paginate(`/repos/${cfg.owner}/${cfg.toolkitRepo}/tags`).catch(() => [])).map((t) => t.name).filter((n) => parseSemver(n));
  const results = [];
  for (const r of await listRepos()) {
    const repo = await loadRepo(r);
    if (!repo) { results.push({ name: r.name, empty: true, findings: [] }); continue; }
    let manifest = null;
    if (repo.paths.includes('polerix.json')) manifest = parseManifest(await readFile(repo, 'polerix.json') ?? '');
    const skip = manifest?.skip ?? [];
    const findings = auditRepo({ meta: repo.meta, paths: repo.paths, skip });
    const sub = skip === 'all' ? { findings: [] } : await planSubscription(repo, manifest, tags);
    findings.push(...sub.findings.filter((f) => skip === 'all' || !skip.includes(f.id)));
    let secrets = { skipped: true, hits: [] };
    if (!values['no-secrets'] && skip !== 'all' && !skip.includes('secret-scan')) secrets = await scanSecrets(repo);
    if (secrets.hits.length) findings.push({ id: 'secret-scan', severity: 'critical', message: `${secrets.hits.length} possible secret(s) in the default branch`, secrets: secrets.hits });
    results.push({ name: r.name, meta: repo.meta, findings, subscribed: Boolean(manifest?.toolkit), optOut: skip === 'all' });
  }
  return results;
}

function fileChangesFor(res) {
  const adds = [], removes = [];
  for (const f of res.findings.filter(isFileFix)) {
    if (f.fix.add) (Array.isArray(f.fix.add) ? f.fix.add : [f.fix.add]).forEach((a) => adds.push(a));
    if (f.fix.remove) removes.push(...f.fix.remove);
  }
  // a later add of the same path (e.g. subscription bump) wins
  const byPath = new Map(adds.map((a) => [a.path, a]));
  return { adds: [...byPath.values()], removes: [...new Set(removes)].filter((p) => !byPath.has(p)) };
}

async function applyRepo(res) {
  const notes = [];
  const { adds, removes } = fileChangesFor(res);
  const ids = res.findings.filter(isFileFix).map((f) => f.id).sort();
  if (adds.length || removes.length) {
    const marker = `<!-- steward:ids=${ids.join(',')} -->`;
    const prs = await gh.get(`/repos/${cfg.owner}/${res.name}/pulls?head=${cfg.owner}:${cfg.branch}&state=all&per_page=10`);
    const open = prs.find((p) => p.state === 'open');
    const declined = prs.find((p) => p.state === 'closed' && !p.merged_at && p.body?.includes(marker));
    if (declined && !open) { notes.push('skipped: same findings were declined earlier'); }
    else {
      const body = [`Automated housekeeping by the Polerix steward.`, '',
        ...res.findings.filter(isFileFix).map((f) => `- **${f.id}**: ${f.message}`), '',
        'Review, then merge or close. Closing declines these findings until they change.', marker].join('\n') + footer;
      await gh.commitChanges(cfg.owner, res.name, { base: res.meta.branch, branch: cfg.branch, adds, removes, message: `chore(steward): ${ids.join(', ')}` });
      if (open) { await gh.request('PATCH', `/repos/${cfg.owner}/${res.name}/pulls/${open.number}`, { body }); notes.push(`updated PR #${open.number}`); }
      else {
        const pr = (await gh.request('POST', `/repos/${cfg.owner}/${res.name}/pulls`, { title: 'chore: steward housekeeping', head: cfg.branch, base: res.meta.branch, body })).data;
        notes.push(`opened PR #${pr.number}`);
      }
    }
  }
  if (res.findings.some((f) => f.fix?.api === 'secret-scanning')) {
    try {
      await gh.request('PATCH', `/repos/${cfg.owner}/${res.name}`, { security_and_analysis: { secret_scanning: { status: 'enabled' }, secret_scanning_push_protection: { status: 'enabled' } } });
      await gh.request('PUT', `/repos/${cfg.owner}/${res.name}/vulnerability-alerts`, undefined, { allow: [204] });
      await gh.request('PUT', `/repos/${cfg.owner}/${res.name}/automated-security-fixes`, undefined, { allow: [204] });
      notes.push('enabled secret scanning + push protection + Dependabot security updates');
    } catch (e) { notes.push(`settings: ${e.message}`); }
  }
  // Secret locations go in an issue only on PRIVATE repos; a public issue would point attackers at the leak.
  const secret = res.findings.find((f) => f.id === 'secret-scan');
  if (secret && res.meta.visibility !== 'public' && res.meta.hasIssues) {
    const title = 'Steward: possible secrets committed';
    const body = ['Revoke/rotate first, then remove from the repo. Removing a line does not remove it from git history.', '',
      ...secret.secrets.map((s) => `- \`${s.path}:${s.line}\` (${s.rule})`)].join('\n') + footer;
    const issues = (await gh.get(`/repos/${cfg.owner}/${res.name}/issues?state=open&per_page=100`)).filter((i) => !i.pull_request);
    const found = issues.find((i) => i.title === title);
    if (found) await gh.request('PATCH', `/repos/${cfg.owner}/${res.name}/issues/${found.number}`, { body });
    else await gh.request('POST', `/repos/${cfg.owner}/${res.name}/issues`, { title, body });
    notes.push('issue updated');
  }
  return notes;
}

function report(results) {
  const lines = [`# Steward ${mode} report`, '', `${results.length} repos checked.`, '',
    '| Repo | Findings | Subscribed |', '| --- | --- | --- |'];
  for (const r of results) {
    if (r.empty) continue;
    const items = r.findings.map((f) => {
      if (f.id === 'secret-scan') {
        const detail = showDetails || r.meta.visibility !== 'public' ? ` (${f.secrets.map((s) => `${s.path}:${s.line} ${s.rule}`).join('; ')})` : '';
        return `**${f.id}** x${f.secrets.length}${detail}`;
      }
      return f.id;
    });
    lines.push(`| ${r.name} | ${items.join(', ') || 'clean'} | ${r.subscribed ? 'yes' : r.optOut ? 'opted out' : 'no'} |`);
  }
  const text = lines.join('\n');
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n');
  return text;
}

const results = await auditAll();
if (mode === 'apply') {
  for (const r of results.filter((x) => x.findings.length)) {
    const notes = await applyRepo(r);
    if (notes.length) console.error(`${r.name}: ${notes.join('; ')}`);
  }
}
console.log(report(results));
// Non-zero on critical findings so GitHub emails the owner without the log revealing locations.
const critical = results.filter((r) => r.findings.some((f) => f.severity === 'critical'));
if (critical.length) console.error(`CRITICAL findings in: ${critical.map((r) => r.name).join(', ')}`);
process.exit(critical.length && inCI ? 1 : 0);
