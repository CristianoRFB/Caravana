// Read-only next-phase inventory. No APPLY, copy, freeze, Rules or Auth writes.
import os from 'node:os';
import path from 'node:path';
import { readFile, writeFile, lstat, realpath } from 'node:fs/promises';
import { createDecipheriv, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { officialAccessToken, requireThat } from './safety.mjs';
import { GoogleSource } from './google-source.mjs';
import { inspectCutoverInventory } from './tenant-cutover-preflight.mjs';

try {
  const [mode, directory] = process.argv.slice(2);
  requireThat(process.argv.length === 4 && mode === '--preview', 'CUTOVER_INVENTORY_PREVIEW_ONLY');
  requireThat(process.platform === 'linux' && process.env.CLOUD_SHELL === 'true'
    && !/lab\d|alunos?|shared|public/i.test(os.hostname() + ' ' + os.userInfo().username), 'PRIVATE_CLOUD_SHELL_REQUIRED');
  requireThat(path.isAbsolute(directory) && directory.startsWith(os.homedir() + '/caravana-italo-tenant-')
    && path.basename(directory) === 'private' && await realpath(directory) === directory, 'CUTOVER_PRIVATE_DIRECTORY_REQUIRED');
  const privateFile = async (name, max = 64000000) => {
    const info = await lstat(path.join(directory, name));
    requireThat((name ? info.isFile() : info.isDirectory()) && !info.isSymbolicLink()
      && (info.mode & 0o077) === 0 && info.uid === process.getuid() && info.size <= max, 'CUTOVER_PRIVATE_FILE_PERMISSIONS_REQUIRED');
    return name ? readFile(path.join(directory, name)) : null;
  };
  await privateFile('');
  requireThat(!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(), 'CUTOVER_CLEAN_SOURCE_REQUIRED');
  const source = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const key = await privateFile('snapshot.key', 32); requireThat(key.length === 32, 'CUTOVER_KEY_LENGTH_REQUIRED');
  const decrypt = async name => {
    const bytes = await privateFile(name); requireThat(bytes.length > 28, 'CUTOVER_CIPHERTEXT_TRUNCATED');
    const d = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12)); d.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(bytes.subarray(28)), d.final()]));
  };
  const snapshot = await decrypt('snapshot.enc'), copyPlan = await decrypt('copy-plan.enc'), activationPlan = await decrypt('activation-plan.enc');
  requireThat(copyPlan.planHash === '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10'
    && activationPlan.planHash === '95597e20a9fb779598abc7076b74ca2dbb49a53f491b868b312c0baeec18ebf1', 'CUTOVER_EXECUTED_COPY_AND_ACTIVATION_REQUIRED');
  const api = new GoogleSource(officialAccessToken('nexus7devstudio@gmail.com'));
  const metadata = await api.metadata(); requireThat(String(metadata.project.projectNumber) === '742921744156', 'CUTOVER_PROJECT_NUMBER_REQUIRED');
  const users = await api.users(); requireThat(copyPlan.request.ownerUids.every(uid => users.some(u => u.localId === uid && u.disabled !== true)), 'CUTOVER_EXISTING_OWNERS_REQUIRED');
  const config = await api.config(), release = config.releases.find(r => r.release.name.endsWith('/cloud.firestore'));
  requireThat(release && createHash('sha256').update(release.ruleset.source.files[0].content).digest('hex')
    === '77307820aa8878c3d5349b7c15d3ef4b232e9199d56ff59f657bc29bb3fc7c8f', 'CUTOVER_EXPECTED_PRIVATE_RULES_REQUIRED');
  // Full fixed-time metadata traversal catches new source records that the
  // activation verifier's pinned-path read intentionally cannot discover.
  await api.metadata();
  const inventory = await api.documents();
  const result = inspectCutoverInventory(snapshot, copyPlan, activationPlan, inventory);
  const evidence = { ...result, codeSource: source, activeRuleset: release.release.rulesetName,
    existingOwners: copyPlan.request.ownerUids.length, operatorWrites: 0, personalPayloadExported: 0 };
  await writeFile(path.join(directory, 'cutover-inventory-preview-' + Date.now() + '.json'), JSON.stringify(evidence), { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify(evidence));
  if (result.issues.length) process.exitCode = 2;
} catch (error) {
  console.log(JSON.stringify({ status: 'STOP', reason: /^[A-Z0-9_]+$/.test(error.message) ? error.message : 'PRIVATE_DETAILS_SUPPRESSED', operatorWrites: 0, copyRepeated: false }));
  process.exitCode = 1;
}
