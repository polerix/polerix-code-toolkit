# The steward: autonomous repo housekeeping

`steward/steward.mjs` audits every repo the owner has (public and private, not forks, not archived) and fixes what it safely can.
It runs as `.github/workflows/steward.yml` every Monday, whenever a toolkit release is published, and on demand.
It only uses the GitHub API. It never touches your local working copies.

## What it does

| Finding | Action |
| --- | --- |
| No `.gitignore` | PR adds a stack-aware one (Node / Python / Xcode / macOS, credentials always ignored) |
| No `README.md` | PR adds a stub from the repo description |
| No `SECURITY.md` (public repos) | PR adds a policy that points to private vulnerability reporting |
| Node / pip / Actions but no `dependabot.yml` | PR adds monthly Dependabot, one grouped PR per ecosystem (minor/patch; majors open their own). Only in repos listed in `fixScope`; elsewhere it is reported, not fixed |
| `.DS_Store`, `node_modules`, `__pycache__`, venv tracked | PR removes them from the index (files stay in history) |
| Secret scanning / push protection off (public repos) | Enables them, plus Dependabot security updates |
| Shared-feature pin behind the release | PR bumps it within the range in `polerix.json` |
| Possible secret in the default branch | **Never auto-fixed.** Fails the run so GitHub emails you. Private repos also get an issue with locations |
| Tracked `.env` / `.pem` / `id_rsa` | Flagged critical, never auto-deleted |
| No `LICENSE` | PR adds the license set in `steward/config.json` (`license`: MIT, holder, year). If the repo bundles media, fonts or saved third-party pages, the PR is flagged **Needs your review**, because MIT covers only your own work. Remove `license` from the config to go back to report-only |

`steward/config.json` can scope a check's fix with `fixScope`: `{ "dependabot-missing": ["repo-a", "repo-b"] }`. The check still runs everywhere and shows in the report as `(report only)`, but `apply` only opens a PR for it in the listed repos.

Rules it follows: one PR per repo on the branch `steward/housekeeping`; never pushes to a default branch; only ever force-updates its own branch; a PR you close is not reopened until the findings change; `{"steward": false}` in a repo's `polerix.json` (or `"skip": ["readme-missing"]`) opts out.

Public-repo safety: Actions logs on a public repo are public, so in CI the steward reports **that** a repo has a secret, never the file, line or rule. Full detail is printed only by a local `--details` run and in issues on private repos.

Limits: it scans the default branch only, not git history. Removing a secret from a file does not remove it from history: revoke it.

## One-time setup (needs you)

The workflow needs a token that can act on your other repos. `GITHUB_TOKEN` cannot, and I cannot create one for you.

1. GitHub, Settings, Developer settings, Fine-grained personal access tokens, Generate new token.
2. Resource owner: your account. Repository access: **All repositories**. Expiration: 90 days or less (calendar a renewal).
3. Repository permissions: **Contents** read/write, **Pull requests** read/write, **Issues** read/write, **Administration** read/write (needed only to enable secret scanning), **Metadata** read.
4. In this repo: Settings, Secrets and variables, Actions, New repository secret named `STEWARD_TOKEN`.
5. Run it once by hand: Actions, Steward, Run workflow, mode `audit`. Read the summary. Then run `apply`.

Pushing workflow files needs the `workflow` scope on your local `gh` login: `gh auth refresh -s workflow`.

## Running locally

```bash
node steward/steward.mjs audit --details          # report only, shows secret locations (local only)
node steward/steward.mjs apply --repo my-repo     # act on one repo
```
Set `STEWARD_COMMIT_TRAILER` / `STEWARD_PR_FOOTER` to append attribution to commits and PR bodies.

## Extending it

Add a check in `steward/lib/checks.mjs` returning a finding (optionally with a `fix`), add a test in `steward/tests/`, and it is picked up on the next run for every repo, including ones created later.
