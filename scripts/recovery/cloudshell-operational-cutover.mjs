// Official private Cloud Shell only. Explicit, finite phase transitions; no COPY.
import os from 'node:os';
import path from 'node:path';
import { readFile, writeFile, lstat, realpath } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ROOT, SOURCE, canonical, documentPath, officialAccessToken, requireThat } from './safety.mjs';
import { GoogleSource, boundedBody } from './google-source.mjs';
import { buildOperationalCutoverPlan, commitOperationalCutover, validateOperationalPlanState, operationalActivationWatermark, OPERATIONAL_LEDGER } from './tenant-operational-cutover.mjs';
import { verifyOperationalRelease } from './operational-release-check.mjs';
let attempted = false, phase = 'PREFLIGHT';
try {
  const [mode, argument, directory] = process.argv.slice(2);
  requireThat(process.argv.length === 5 && ['--preview', '--apply', '--verify'].includes(mode)
    && (mode === '--preview' ? ['prepare', 'freeze', 'activate', 'return-source'].includes(argument) : /^[a-f0-9]{64}$/.test(argument)), 'CUTOVER_EXPLICIT_PHASE_MODE_REQUIRED');
  requireThat(process.platform === 'linux' && process.env.CLOUD_SHELL === 'true' && !/lab\d|alunos?|shared|public/i.test(os.hostname() + ' ' + os.userInfo().username), 'CUTOVER_PRIVATE_CLOUD_SHELL_REQUIRED');
  requireThat(path.isAbsolute(directory) && directory.startsWith(os.homedir() + '/caravana-italo-tenant-') && path.basename(directory) === 'private' && await realpath(directory) === directory, 'CUTOVER_PRIVATE_DIRECTORY_REQUIRED');
  const privateFile = async (name, max = 64_000_000) => {
    const info = await lstat(path.join(directory, name));
    requireThat((name ? info.isFile() : info.isDirectory()) && !info.isSymbolicLink() && (info.mode & 0o077) === 0 && info.uid === process.getuid() && info.size <= max, 'CUTOVER_PRIVATE_FILE_PERMISSIONS_REQUIRED');
    return name ? readFile(path.join(directory, name)) : null;
  };
  await privateFile(''); const key = await privateFile('snapshot.key', 32); requireThat(key.length === 32, 'CUTOVER_KEY_LENGTH_REQUIRED');
  const exists = async name => { try { await lstat(path.join(directory, name)); return true; } catch (e) { if (e.code !== 'ENOENT') throw e; return false; } };
  const decrypt = async name => { const bytes = await privateFile(name); requireThat(bytes.length > 28, 'CUTOVER_CIPHERTEXT_TRUNCATED'); const d = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12)); d.setAuthTag(bytes.subarray(12, 28)); return JSON.parse(Buffer.concat([d.update(bytes.subarray(28)), d.final()])); };
  const encrypt = async (name, data) => { const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', key, iv), bytes = Buffer.concat([c.update(Buffer.from(canonical(data))), c.final()]); await writeFile(path.join(directory, name), Buffer.concat([iv, c.getAuthTag(), bytes]), { mode: 0o600, flag: 'wx' }); };
  requireThat(!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(), 'CUTOVER_CLEAN_SOURCE_REQUIRED');
  const source = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const snapshot = await decrypt('snapshot.enc'), copyPlan = await decrypt('copy-plan.enc'), activation = await decrypt('activation-plan.enc');
  requireThat(copyPlan.planHash === '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10'
    && activation.planHash === '95597e20a9fb779598abc7076b74ca2dbb49a53f491b868b312c0baeec18ebf1' && snapshot.documents.length === 24, 'CUTOVER_EXECUTED_COPY_AND_PRIVATE_ACTIVATION_REQUIRED');
  let rulesFile = 'firestore.italo-operational.rules';
  try { await lstat('firestore.platform-operational.rules'); rulesFile = 'firestore.platform-operational.rules'; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const expectedRules = createHash('sha256').update(await readFile(rulesFile)).digest('hex');
  const token = officialAccessToken('nexus7devstudio@gmail.com'), api = new GoogleSource(token);
  const metadata = await api.metadata(); requireThat(String(metadata.project.projectNumber) === '742921744156', 'CUTOVER_PROJECT_NUMBER_REQUIRED');
  const config = await api.config(), published = config.releases.find(r => r.release.name.endsWith('/cloud.firestore'));
  requireThat(published && createHash('sha256').update(published.ruleset.source.files[0].content).digest('hex') === expectedRules, 'CUTOVER_REVIEWED_OPERATIONAL_RULES_REQUIRED');
  const database = `projects/${SOURCE}/databases/(default)`;
  const request = async (verb, body) => {
    requireThat(['batchGet', 'beginTransaction', 'commit', 'rollback'].includes(verb), 'CUTOVER_FIXED_FIRESTORE_API_ONLY');
    const response = await fetch(`https://firestore.googleapis.com/v1/${database}/documents:${verb}`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000), headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return JSON.parse(await boundedBody(response));
  };
  const read = async (plan, transaction) => {
    const paths = plan.expected.map(g => ROOT + '/' + g.path), response = await request('batchGet', { documents: paths, ...(transaction ? { transaction } : {}) });
    const rows = Array.isArray(response) ? response : [response], seen = new Set(), found = [];
    for (const row of rows) { const name = row.found?.name ?? row.missing; requireThat(paths.includes(name) && !seen.has(name), 'CUTOVER_UNEXPECTED_BATCH_ENTRY'); seen.add(name); if (row.found) found.push(row.found); }
    requireThat(seen.size === paths.length, 'CUTOVER_INCOMPLETE_TRANSACTION_READ'); return found;
  };
  let plan, inventory, baseline, release;
  if (mode === '--preview') {
    phase = 'VERIFY_HOSTED_CODE_AND_CI'; release = await verifyOperationalRelease(source, expectedRules);
    await api.metadata(); inventory = await api.documents();
    const control = inventory.documents.find(d => documentPath(d.name) === OPERATIONAL_LEDGER);
    const activationHash = control?.fields?.activationOperationHash?.stringValue;
    if (activationHash && /^[a-f0-9]{64}$/.test(activationHash) && await exists('operational-watermark-' + activationHash + '.enc')) baseline = await decrypt('operational-watermark-' + activationHash + '.enc');
    if (argument !== 'freeze') { const users = await api.users(); requireThat(copyPlan.request.ownerUids.every(uid => users.some(u => u.localId === uid && u.disabled !== true)), 'CUTOVER_EXISTING_AUTH_OWNERS_REQUIRED'); }
    plan = buildOperationalCutoverPlan({ snapshot, copyPlan, activationReview: activation.review, inventory, action: argument, release, baseline, intentConfirmed: true });
    const name = 'operational-plan-' + plan.planHash + '.enc';
    if (!await exists(name)) await encrypt(name, { plan, inventory, baseline });
    requireThat(canonical((await decrypt(name)).plan) === canonical(plan), 'CUTOVER_ENCRYPTED_PLAN_READBACK_FAILED');
    console.log(JSON.stringify({ status: 'OPERATIONAL_PHASE_PREVIEW_PROTECTED', planHash: plan.planHash, action: plan.action, ...plan.summary, plannedWrites: plan.writes.length, operatorWrites: 0, personalPayloadExported: 0 }));
  } else {
    const saved = await decrypt('operational-plan-' + argument + '.enc'); plan = saved.plan;
    requireThat(plan.planHash === argument && plan.release.source === source && plan.release.rulesSha256 === expectedRules, 'CUTOVER_PLAN_RELEASE_MISMATCH');
    const reproduced = buildOperationalCutoverPlan({ snapshot, copyPlan, activationReview: activation.review, inventory: saved.inventory, action: plan.action, release: plan.release, baseline: saved.baseline,
      now: Date.parse(plan.createdAt), intentConfirmed: true });
    requireThat(canonical(reproduced) === canonical(plan), 'CUTOVER_PLAN_NOT_REPRODUCIBLE');
    if (mode === '--apply') {
      requireThat(!await exists('operational-attempt-' + argument + '.json'), 'CUTOVER_PRIOR_ATTEMPT_VERIFY_ONLY_NO_RETRY');
      requireThat(Date.now() - Date.parse(plan.createdAt) <= 300000 && Date.now() >= Date.parse(plan.createdAt), 'CUTOVER_PREVIEW_EXPIRED');
      release = await verifyOperationalRelease(source, expectedRules);
      await api.metadata(); inventory = await api.documents();
      // Rebuild the same phase from a fresh complete inventory, catching phantom
      // source/target records before entering the transaction's pinned reads.
      buildOperationalCutoverPlan({ snapshot, copyPlan, activationReview: activation.review, inventory, action: plan.action, release, baseline: saved.baseline, intentConfirmed: true });
      const users = await api.users(); if (plan.action !== 'freeze') requireThat(copyPlan.request.ownerUids.every(uid => users.some(u => u.localId === uid && u.disabled !== true)), 'CUTOVER_EXISTING_AUTH_OWNERS_REQUIRED');
      phase = 'ATOMIC_SINGLE_WRITER_PHASE';
      await commitOperationalCutover(plan, { begin: async () => (await request('beginTransaction', { options: { readWrite: {} } })).transaction,
        read: transaction => read(plan, transaction), commit: (transaction, writes) => request('commit', { transaction, writes }), rollback: transaction => request('rollback', { transaction }) }, () => {
        attempted = true; writeFileSync(path.join(directory, 'operational-attempt-' + argument + '.json'), JSON.stringify({ planHash: argument, action: plan.action, attemptedAt: new Date().toISOString(), retryCommit: false }), { mode: 0o600, flag: 'wx' });
      });
    }
    phase = 'READBACK'; const documents = await read(plan); validateOperationalPlanState(plan, documents, true);
    if (plan.action === 'activate' && plan.next.activationOperationHash === plan.operationHash) {
      const name = 'operational-watermark-' + plan.operationHash + '.enc';
      const watermark = operationalActivationWatermark(plan, documents);
      if (!await exists(name)) await encrypt(name, watermark);
      requireThat(canonical(await decrypt(name)) === canonical(watermark), 'CUTOVER_WATERMARK_CONFLICT');
    }
    await writeFile(path.join(directory, 'operational-verified-' + argument + '.json'), JSON.stringify({ planHash: argument, action: plan.action, phase: plan.next.phase, generation: plan.next.generation, verifiedAt: new Date().toISOString(), source, originalWrites: 0, copyRepeated: false }), { mode: 0o600, flag: 'wx' }).catch(e => { if (e.code !== 'EEXIST') throw e; });
    console.log(JSON.stringify({ status: 'OPERATIONAL_PHASE_READBACK_VERIFIED', planHash: argument, action: plan.action, ...plan.summary, commitAttempted: attempted,
      sourceWritable: plan.next.writerOrganizationId === 'caravana-77', targetWritable: plan.next.writerOrganizationId === 'italo', personalPayloadExported: 0 }));
  }
} catch (error) {
  console.log(JSON.stringify({ status: attempted ? 'CUTOVER_VERIFY_REQUIRED_DO_NOT_RETRY_COMMIT' : 'CUTOVER_STOP_NO_COMMIT', phase,
    reason: /^[A-Z0-9_]+$/.test(error.message) ? error.message : 'PRIVATE_DETAILS_SUPPRESSED', commitAttempted: attempted, copyRepeated: false })); process.exitCode = 1;
}
