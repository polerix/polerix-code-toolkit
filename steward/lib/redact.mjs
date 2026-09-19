// Actions logs and step summaries on a PUBLIC repo are public. In CI, private repos are shown
// under a stable anonymous label so their names never appear. Local runs show real names.
import { createHash } from 'node:crypto';

export function displayName(name, visibility, inCI) {
  if (!inCI || visibility === 'public') return name;
  return `private-${createHash('sha1').update(name).digest('hex').slice(0, 6)}`;
}

// Error messages from the API client contain paths like /repos/owner/name/...; hide the name in CI.
export function scrubMessage(message, inCI) {
  const text = String(message);
  return inCI ? text.replace(/\/repos\/[^/\s?]+\/[^/\s?]+/g, '/repos/<owner>/<repo>') : text;
}
