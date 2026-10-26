// Offline only; accepts neither user datasets nor project/endpoint/file overrides.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, copyFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { assertLabTarget, PROJECT, fixture, canonical, manifest, verifyCiphertext, compensate, coordinatedRollback } from './lib/lab-recovery.mjs';

try {
  assertLabTarget(PROJECT, '127.0.0.1:18080');
  if (process.argv.length > 3 || (process.argv[2] && !['--dry-run', '--execute-synthetic'].includes(process.argv[2]))) throw Error('FIXED_SYNTHETIC_FLAGS_REQUIRED');
  if (process.argv[2] !== '--execute-synthetic') {
    console.log(JSON.stringify({ status: 'DRY_RUN', projectId: PROJECT, source: 'BUILT_IN_FICTITIOUS_FIXTURE',
      networkRequests: 0, keyGeneration: false, filesCreated: 0, realOperationsSupported: false }));
  } else {
    const started = performance.now();
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const tool = name => path.join(root, '.firebase/tools/age-v1.3.2/age', `${name}.exe`);
    const run = (exe, args, input) => {
      const r = spawnSync(exe, args, { input, encoding: 'buffer', timeout: 15000, maxBuffer: 1024 * 1024, windowsHide: true });
      if (r.status !== 0) throw Error('SYNTHETIC_SUBPROCESS_FAILED');
      return r.stdout;
    };
    // Only ephemeral invented-test identities; never owner's identity or files.
    const identity = run(tool('age-keygen'), []);
    const wrongIdentity = run(tool('age-keygen'), []);
    try {
      const recipient = run(tool('age-keygen'), ['-y'], identity).toString('utf8').trim();
      const plaintext = Buffer.from(canonical(fixture()));
      const ciphertext = run(tool('age'), ['--encrypt', '--recipient', recipient], plaintext);
      const expected = manifest(ciphertext);
      const parent = path.join(root, '.firebase/lab-recovery');
      mkdirSync(parent, { recursive: true });
      const directory = mkdtempSync(path.join(parent, 'synthetic-'));
      writeFileSync(path.join(directory, 'backup.age'), ciphertext, { flag: 'wx' });
      writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(expected, null, 2) + '\n', { flag: 'wx' });
      copyFileSync(path.join(directory, 'backup.age'), path.join(directory, 'download.age'));
      verifyCiphertext(readFileSync(path.join(directory, 'download.age')), expected);
      const restoreStarted = performance.now();
      const restored = JSON.parse(run(process.execPath, [path.join(root, 'scripts/lab-recovery-child.mjs'), path.basename(directory)], identity));
      const restoreElapsedMs = Math.round(performance.now() - restoreStarted);
      const wrong = spawnSync(tool('age'), ['--decrypt', '--identity', '-', path.join(directory, 'download.age')],
        { input: wrongIdentity, timeout: 15000, maxBuffer: 1024 * 1024, windowsHide: true });
      const tampered = Buffer.from(ciphertext); tampered[tampered.length - 1] ^= 1;
      const tamperFile = path.join(directory, 'tampered.age'); writeFileSync(tamperFile, tampered, { flag: 'wx' });
      const tamper = spawnSync(tool('age'), ['--decrypt', '--identity', '-', tamperFile],
        { input: identity, timeout: 15000, maxBuffer: 1024 * 1024, windowsHide: true });
      if (wrong.status !== 1 || tamper.status !== 1) throw Error('NEGATIVE_CRYPTO_CHECK_FAILED');
      const ledger = [{ id: 'synthetic-payment', cents: 7500 }];
      const reversed = compensate(ledger, 'synthetic-payment', 'synthetic-reversal');
      if (canonical(compensate(reversed, 'synthetic-payment', 'synthetic-reversal')) !== canonical(reversed)) throw Error('COMPENSATION_REPLAY_FAILED');
      const before = { kind: 'LAB_SYNTHETIC_ONLY', projectId: PROJECT, config: fixture().config, ledger };
      const after = { ...before, config: Object.fromEntries(Object.keys(before.config).map(k => [k, 'synthetic-after'])) };
      const changed = { ...after, ledger: reversed };
      const rollback = coordinatedRollback(before, after, after);
      const forward = coordinatedRollback(before, changed, after);
      if (canonical(rollback.state) !== canonical(before) || forward.strategy !== 'STOP_PRESERVE_FORWARD_DATA') throw Error('ROLLBACK_FAILED');
      const report = { status: 'PASS_LOCAL_SYNTHETIC_ONLY', checkedAt: new Date().toISOString(), ageVersion: '1.3.2',
        manifest: expected, restore: restored, wrongIdentityRejected: true, authenticatedTamperRejected: true,
        compensationReplay: 'PASS', coordinatedRollback: 'PASS_MODEL_ONLY', forwardWritesPreserved: true,
        unknownFinancialTotalsPreserved: 2, syntheticRestoreElapsedMs: restoreElapsedMs,
        totalElapsedMs: Math.round(performance.now() - started), realRpo: 'UNKNOWN', realRto: 'UNKNOWN',
        networkRequests: 0, ownerIdentityCreated: false, keyFilesCreated: 0, plaintextFilesCreated: 0,
        driveTransfer: 'NOT_RUN_LOCAL_COPY_ONLY', realBackup: false, realRestore: false };
      mkdirSync(path.join(root, 'docs/operations/desktop-2026-10-26'), { recursive: true });
      writeFileSync(path.join(root, 'docs/operations/desktop-2026-10-26/lab-recovery-result.json'), JSON.stringify(report, null, 2) + '\n');
      plaintext.fill(0);
      console.log(JSON.stringify(report, null, 2));
    } finally { identity.fill(0); wrongIdentity.fill(0); }
  }
} catch {
  console.error('LAB_RECOVERY_REFUSED: verify fixed flags, demo environment and pinned local age installation. No sensitive diagnostic output.');
  process.exitCode = 1;
}
