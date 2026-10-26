// Deliberate, create-only historical copy. Does not cut over the application.
import os from 'node:os';
import path from 'node:path';
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { GoogleSource, boundedBody } from './google-source.mjs';
import { SOURCE, ROOT, canonical, officialAccessToken, requireThat } from './safety.mjs';
import { planTenantCopy, validateTenantCopyPlan, tenantCopyHash } from './tenant-copy.mjs';

const mode = process.argv[2];
const directory = process.argv[3];
let phase = 'PRECHECK', commitAttempted = false;
try {
  requireThat(['--plan', '--apply-copy-to-italo', '--verify'].includes(mode) && process.argv.length === 4, 'COPY_EXPLICIT_MODE_REQUIRED');
  requireThat(process.platform === 'linux' && process.env.CLOUD_SHELL === 'true' && !/lab\d|alunos?|shared|public/i.test(os.hostname()+' '+os.userInfo().username), 'COPY_GOOGLE_CLOUD_SHELL_REQUIRED');
  requireThat(path.isAbsolute(directory) && directory.startsWith(os.homedir() + '/caravana-italo-tenant-') && path.basename(directory) === 'private', 'COPY_PRIVATE_DIRECTORY_REQUIRED');
  const info = await lstat(directory);
  requireThat(info.isDirectory() && !info.isSymbolicLink() && (info.mode & 0o077) === 0, 'COPY_PRIVATE_DIRECTORY_PERMISSIONS');
  const keyPath = path.join(directory, 'snapshot.key'), keyInfo = await lstat(keyPath);
  requireThat(keyInfo.isFile() && !keyInfo.isSymbolicLink() && (keyInfo.mode & 0o077) === 0, 'COPY_PRIVATE_KEY_PERMISSIONS');
  const key = await readFile(keyPath); requireThat(key.length === 32, 'COPY_KEY_LENGTH');
  const decrypt = async name => {
    const bytes = await readFile(path.join(directory, name));
    const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]));
  };
  const encrypt = async (name, value) => {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
    const bytes = Buffer.concat([cipher.update(Buffer.from(canonical(value))), cipher.final()]);
    await writeFile(path.join(directory, name), Buffer.concat([iv, cipher.getAuthTag(), bytes]), { mode: 0o600, flag: 'wx' });
  };
  const tree = await decrypt('snapshot.enc');
  const plan = mode === '--plan' ? planTenantCopy(tree, { sourceOrganizationId: 'caravana-77', targetOrganizationId: 'italo', targetName: 'Ítalo' }) : await decrypt('copy-plan.enc');
  validateTenantCopyPlan(tree, plan);
  requireThat(plan.sourceOrganizationId === 'caravana-77' && plan.targetOrganizationId === 'italo' && plan.projectId === SOURCE, 'COPY_EXACT_TARGET_REQUIRED');
  if (mode === '--plan') {
    await encrypt('copy-plan.enc', plan);
    requireThat(tenantCopyHash(await decrypt('copy-plan.enc')) === tenantCopyHash(plan), 'COPY_ENCRYPTED_PLAN_READBACK_FAILED');
    console.log(JSON.stringify({ status: 'COPY_PLAN_REVIEWABLE', planHash: plan.planHash, ...plan.summary, originalDocuments: plan.expectedSource.length }));
  } else {
    const token = officialAccessToken('nexus7devstudio@gmail.com');
    const api = async (suffix, body) => {
      const response = await fetch('https://firestore.googleapis.com/v1/' + suffix, {
        method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (response.status !== 200) throw Error(`COPY_API_HTTP_${response.status}`);
      return JSON.parse((await boundedBody(response)).toString('utf8'));
    };
    const database = `projects/${SOURCE}/databases/(default)`;
    const auditPath = `organizations/italo/tenantCopies/${plan.planHash.slice(0, 32)}`;
    const audit = { name: `${ROOT}/${auditPath}`, fields: {
      version: { stringValue: 'pending-tenant-copy-v1' }, sourceOrganizationId: { stringValue: 'caravana-77' },
      targetOrganizationId: { stringValue: 'italo' }, sourceReadTime: { timestampValue: tree.readTime },
      planHash: { stringValue: plan.planHash }, copiedDocuments: { integerValue: String(plan.summary.copiedDocuments) },
      sourcePreserved: { booleanValue: true }, accessActivated: { booleanValue: false }, publicCutover: { booleanValue: false },
      unknownFinancialTotals: { integerValue: String(plan.summary.unknownFinancialTotals) },
    } };
    const writes = [...plan.creates.map(({ update, currentDocument }) => ({ update, currentDocument })), { update: audit, currentDocument: { exists: false } }];
    const sourceEntries = new Map(tree.documents.map(document => [document.name, document]));
    const targets = new Map(writes.map(write => [write.update.name, write.update]));
    const readSet = [...sourceEntries.keys(), ...targets.keys()];
    const batch = async transaction => {
      const result = await api(`${database}/documents:batchGet`, { documents: readSet, ...(transaction ? { transaction } : {}) });
      const rows = Array.isArray(result) ? result : [result];
      const entries = new Map();
      for (const row of rows) {
        const name = row.found?.name || row.missing;
        requireThat(readSet.includes(name) && !entries.has(name), 'COPY_INVALID_BATCH_GET'); entries.set(name, row.found || null);
      }
      requireThat(entries.size === readSet.length, 'COPY_INCOMPLETE_BATCH_GET');
      return entries;
    };
    const originalsUnchanged = entries => {
      for (const [name, original] of sourceEntries) requireThat(tenantCopyHash(entries.get(name)) === tenantCopyHash(original), 'COPY_SOURCE_VERSION_CHANGED');
    };
    const copiedExactly = entries => {
      for (const [name, target] of targets) requireThat(entries.get(name) && canonical(entries.get(name).fields) === canonical(target.fields), 'COPY_TARGET_READBACK_MISMATCH');
    };
    if (mode === '--apply-copy-to-italo') {
      phase = 'SOURCE_RECHECK';
      const source = new GoogleSource(token), current = await source.collect(), fresh = await source.verifyStable();
      const sorted = values => [...values].sort((a,b) => a.name.localeCompare(b.name));
      requireThat(tenantCopyHash(sorted(current.documents)) === tenantCopyHash(sorted(tree.documents)) && tenantCopyHash(sorted(fresh.documents)) === tenantCopyHash(sorted(tree.documents)), 'COPY_COMPLETE_SOURCE_DRIFT');
      requireThat(tenantCopyHash(current.users) === tenantCopyHash(tree.users) && tenantCopyHash(current.config) === tenantCopyHash(tree.config) && current.objects.length === 0 && tree.objects.length === 0, 'COPY_AUTH_CONFIG_OR_OBJECT_DRIFT');
      phase = 'ATOMIC_CREATE';
      const { transaction } = await api(`${database}/documents:beginTransaction`, { options: { readWrite: {} } });
      requireThat(typeof transaction === 'string' && transaction.length > 10, 'COPY_TRANSACTION_REQUIRED');
      try {
        const entries = await batch(transaction); originalsUnchanged(entries);
        requireThat([...targets.keys()].every(name => entries.get(name) === null), 'COPY_TARGET_EXISTS_NO_OVERWRITE');
        commitAttempted = true;
        const result = await api(`${database}/documents:commit`, { transaction, writes });
        requireThat(result.writeResults?.length === writes.length && result.commitTime, 'COPY_COMMIT_RECEIPT_INCOMPLETE');
      } catch (error) {
        if (!commitAttempted) await api(`${database}/documents:rollback`, { transaction }).catch(() => {});
        throw error;
      }
    }
    phase = 'READBACK';
    const entries = await batch(); originalsUnchanged(entries); copiedExactly(entries);
    const report = { status: 'ITALO_TENANT_COPY_VERIFIED', sourceProject: SOURCE, sourceOrganizationId: 'caravana-77', targetOrganizationId: 'italo',
      planHash: plan.planHash, sourceReadTime: tree.readTime, copiedDocuments: plan.summary.copiedDocuments, tenantCompanions: plan.creates.length - plan.summary.copiedDocuments,
      auditDocuments: 1, totalCreatedDocuments: writes.length, caravans: plan.summary.caravans, registrations: plan.summary.registrations,
      existingAuthUsersRetained: tree.users.length, owners: plan.summary.owners, unknownFinancialTotalsRetained: plan.summary.unknownFinancialTotals,
      verifiedFinancialTotals: plan.summary.verifiedFinancialTotals, originalDocumentsUnchanged: sourceEntries.size,
      originalWrites: 0, authWrites: 0, ruleWrites: 0, frontendDeploys: 0, accessActivated: false, publicCutover: false,
      verifiedAt: new Date().toISOString() };
    await writeFile(path.join(directory, `copy-result-${mode === '--verify' ? 'verify' : 'apply'}.json`), canonical(report), { mode: 0o600, flag: 'wx' });
    console.log(JSON.stringify(report));
  }
} catch (error) {
  console.error(JSON.stringify({ status: commitAttempted ? 'COPY_VERIFY_REQUIRED_DO_NOT_RETRY_COMMIT' : 'COPY_STOP_NO_WRITES', phase,
    reason: /^[A-Z0-9_]+$/.test(error.message) ? error.message : 'PRIVATE_DETAILS_SUPPRESSED', commitAttempted }));
  process.exitCode = 1;
}
