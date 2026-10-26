// Separate process: verifies the downloaded ciphertext before decrypting to RAM.
import { readFileSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertLabTarget, PROJECT, canonical, sha256, verifyCiphertext, validateFixture, restoreStep } from './lib/lab-recovery.mjs';

try {
  assertLabTarget(PROJECT, '127.0.0.1:18080');
  if (process.argv.length !== 3 || !/^synthetic-[a-zA-Z0-9]+$/.test(process.argv[2])) throw Error('FIXED_RUN_REQUIRED');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const parent = realpathSync(path.join(root, '.firebase/lab-recovery'));
  const directory = realpathSync(path.join(parent, process.argv[2]));
  if (path.dirname(directory) !== parent) throw Error('UNSAFE_RUN_PATH');
  const ciphertext = readFileSync(path.join(directory, 'download.age'));
  const expected = JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  verifyCiphertext(ciphertext, expected);
  const identity = readFileSync(0);
  if (identity.length > 2048) throw Error('IDENTITY_BOUND');
  const executable = path.join(root, '.firebase/tools/age-v1.3.2/age/age.exe');
  const result = spawnSync(executable, ['--decrypt', '--identity', '-', path.join(directory, 'download.age')],
    { input: identity, encoding: 'buffer', maxBuffer: 1024 * 1024, timeout: 15000, windowsHide: true });
  identity.fill(0);
  if (result.status !== 0) throw Error('DECRYPT_FAILED');
  const value = JSON.parse(result.stdout.toString('utf8'));
  result.stdout.fill(0);
  validateFixture(value);
  if (sha256(canonical(value)) !== expected.contentSha256) throw Error('CONTENT_MISMATCH');
  const interrupted = restoreStep([], value, 2);
  const resumed = restoreStep(interrupted.snapshot, value, 100);
  const replay = restoreStep(resumed.snapshot, value, 100);
  if (replay.created !== 0 || resumed.remaining !== 0) throw Error('RESTORE_INCOMPLETE');
  console.log(JSON.stringify({ status: 'PASS_SYNTHETIC_INDEPENDENT_PROCESS', restoredItems: resumed.snapshot.length,
    contentSha256: expected.contentSha256, interruptedAfter: interrupted.created, replayCreates: replay.created,
    realRestore: false, authPasswordsTested: false, aclEnforcementTested: false }));
} catch {
  console.error('SYNTHETIC_RESTORE_REFUSED');
  process.exitCode = 1;
}
