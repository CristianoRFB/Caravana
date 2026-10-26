import os from 'node:os';
import path from 'node:path';
import { realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

export const SOURCE = 'caravana-af306';
export const RESTORE = 'demo-caravana77-recovery';
export const ROOT = `projects/${SOURCE}/databases/(default)/documents`;
export const canonical = value => JSON.stringify(value, (_key, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
export function requireThat(condition, code) { if (!condition) throw Error(code); }
export function documentPath(name) {
  requireThat(typeof name === 'string' && name.startsWith(ROOT + '/'), 'FOREIGN_DOCUMENT');
  const parts = name.slice(ROOT.length + 1).split('/');
  requireThat(parts.length % 2 === 0 && parts.every(p => p && !['.', '..'].includes(p) && !/[\x00-\x1f]/.test(p)), 'INVALID_DOCUMENT_PATH');
  return parts.join('/');
}
export const encoded = value => value.split('/').map(encodeURIComponent).join('/');
export function privateFacts(facts) {
  requireThat(!/lab\d|alunos?|shared|public/i.test(facts.hostname + ' ' + facts.username), 'SHARED_DEVICE_REFUSED');
  requireThat(facts.platform === 'win32' && facts.ownerAttestedPrivate === true && facts.encrypted === true,
    'PRIVATE_ENCRYPTED_WINDOWS_REQUIRED');
}
export function outsideRepo(candidate, repo) {
  const resolved = realpathSync(candidate), relative = path.relative(realpathSync(repo), resolved);
  requireThat(relative.startsWith('..' + path.sep) || path.isAbsolute(relative), 'PRIVATE_PATH_INSIDE_REPOSITORY');
  return resolved;
}
export function requirePrivateDevice(directory, attested) {
  // Host restriction runs BEFORE reading private configuration or credentials.
  const facts = { hostname: os.hostname(), username: os.userInfo().username, platform: process.platform,
    ownerAttestedPrivate: attested, encrypted: false };
  requireThat(!/lab\d|alunos?|shared|public/i.test(facts.hostname + ' ' + facts.username), 'SHARED_DEVICE_REFUSED');
  const drive = path.parse(realpathSync(directory)).root;
  requireThat(/^[A-Za-z]:\\$/.test(drive), 'LOCAL_ENCRYPTED_DRIVE_REQUIRED');
  const result = spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command',
    `$v=Get-BitLockerVolume -MountPoint '${drive.slice(0, 2)}' -ErrorAction Stop; [bool]($v.ProtectionStatus -eq 'On' -and $v.VolumeStatus -eq 'FullyEncrypted')`],
  { encoding: 'utf8', timeout: 15000, windowsHide: true });
  facts.encrypted = result.status === 0 && result.stdout.trim() === 'True';
  privateFacts(facts);
}
export function officialAccessToken(expectedPrincipal) {
  requireThat(typeof expectedPrincipal === 'string' && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(expectedPrincipal), 'OWNER_IDENTITY_REQUIRED');
  const run = args => {
    // gcloud is a .cmd launcher on Windows. Every argument is fixed or the
    // validated email above; no shell metacharacters or secret arguments.
    const r = spawnSync('gcloud', args, { encoding: 'utf8', timeout: 20000, windowsHide: true, shell: process.platform==='win32' });
    requireThat(r.status === 0, 'OFFICIAL_AUTH_UNAVAILABLE'); return r.stdout.trim();
  };
  requireThat(run(['auth', 'list', '--filter=status:ACTIVE', '--format=value(account)']) === expectedPrincipal, 'OWNER_IDENTITY_MISMATCH');
  const token = run(['auth', 'print-access-token', `--account=${expectedPrincipal}`]);
  requireThat(token.length > 20 && !/\s/.test(token), 'OFFICIAL_AUTH_UNAVAILABLE');
  return token;
}
export function assertRestoreTarget(project, origins) {
  requireThat(project === RESTORE && canonical(origins) === canonical({ firestore: 'http://127.0.0.1:18081', auth: 'http://127.0.0.1:19098', storage: 'http://127.0.0.1:19198' }), 'RESTORE_DEMO_LOOPBACK_ONLY');
}
