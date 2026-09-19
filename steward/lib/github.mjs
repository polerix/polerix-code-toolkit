// Minimal GitHub REST client (fetch only). Retries on rate limits. Zero dependencies.

export function createClient(token, { attribution = '' } = {}) {
  const base = 'https://api.github.com';
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'polerix-steward',
  };

  async function request(method, path, body, { allow = [] } = {}) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(path.startsWith('http') ? path : base + path, {
        method, headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers, body: body ? JSON.stringify(body) : undefined,
      });
      if ((res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')) && attempt < 3) {
        const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000 - Date.now();
        const wait = Number(res.headers.get('retry-after')) * 1000 || Math.min(Math.max(reset, 1000), 60_000);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (res.status === 204) return { status: 204, data: null };
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok && !allow.includes(res.status)) throw new Error(`${method} ${path} -> ${res.status} ${data?.message ?? ''}`.trim());
      return { status: res.status, data };
    }
  }

  const get = async (path, opts) => (await request('GET', path, undefined, opts)).data;

  async function paginate(path) {
    const items = [];
    for (let page = 1; ; page++) {
      const chunk = await get(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      items.push(...chunk);
      if (chunk.length < 100) return items;
    }
  }

  // One atomic commit that adds/updates/removes files, on `branch` (created or force-reset from `base`).
  async function commitChanges(owner, repo, { base, branch, adds = [], removes = [], message }) {
    const baseRef = await get(`/repos/${owner}/${repo}/git/ref/heads/${base}`);
    const baseCommit = await get(`/repos/${owner}/${repo}/git/commits/${baseRef.object.sha}`);
    const tree = [];
    for (const { path, content } of adds) {
      const blob = (await request('POST', `/repos/${owner}/${repo}/git/blobs`, { content, encoding: 'utf-8' })).data;
      tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    for (const path of removes) tree.push({ path, mode: '100644', type: 'blob', sha: null });
    const newTree = (await request('POST', `/repos/${owner}/${repo}/git/trees`, { base_tree: baseCommit.tree.sha, tree })).data;
    const commit = (await request('POST', `/repos/${owner}/${repo}/git/commits`, { message: message + attribution, tree: newTree.sha, parents: [baseRef.object.sha] })).data;
    const existing = await request('GET', `/repos/${owner}/${repo}/git/ref/heads/${branch}`, undefined, { allow: [404] });
    if (existing.status === 404) await request('POST', `/repos/${owner}/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: commit.sha });
    else await request('PATCH', `/repos/${owner}/${repo}/git/refs/heads/${branch}`, { sha: commit.sha, force: true }); // only ever our own steward branch
    return commit.sha;
  }

  return { request, get, paginate, commitChanges, attribution };
}
