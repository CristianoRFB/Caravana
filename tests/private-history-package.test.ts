import { describe, expect, it } from 'vitest';
import { publicAssetPath, validatePrivateArtifact } from '../scripts/package-italo-private.mjs';
const source = 'a'.repeat(40);
const manifest = () => ({ kind: 'ITALO_PRIVATE_HISTORY_CANDIDATE', base: '/tenant-italo/', readOnly: true, publicCutover: false, source, dirty: false, emulator: false, projectId: 'caravana-af306', pagesProject: 'caravana-77', environment: 'production', files: [{ path: '/tenant-italo/index.html', bytes: 20, sha256: 'b'.repeat(64) }] });
describe('combined private release packaging boundaries', () => {
  it('accepts the exact clean private artifact but rejects dirty, emulator, public-cutover and foreign source/target artifacts', () => {
    expect(validatePrivateArtifact(manifest(), 'production', source)).toHaveLength(1);
    for (const patch of [{ dirty: true }, { emulator: true }, { readOnly: false }, { publicCutover: true }, { source: 'c'.repeat(40) }, { projectId: 'other' }, { pagesProject: 'other' }, { base: '/' }]) expect(() => validatePrivateArtifact({ ...manifest(), ...patch }, 'production', source)).toThrow();
    expect(() => validatePrivateArtifact(manifest(), 'staging', source)).toThrow();
    expect(() => validatePrivateArtifact(manifest(), 'prod', source)).toThrow();
  });
  it('rejects traversal, absolute paths, URL schemes, encoded bypasses and duplicate or substituted assets', () => {
    for (const path of ['../snapshot.key', '.env', 'assets/.secret', 'assets/../../secret', '/index.html', 'https://host/script.js', 'assets/%2e%2e/a', 'assets//a', 'a\\b', './index.html']) expect(() => publicAssetPath(path)).toThrow();
    expect(publicAssetPath('assets/index-public.js')).toBe('assets/index-public.js');
    const m = manifest(); m.files.push(m.files[0]); expect(() => validatePrivateArtifact(m, 'production', source)).toThrow();
    for (const path of ['/index.html', '/tenant-italo/../index.html', '/tenant-italo/_worker.js', '/tenant-italo/.env', '/tenant-italo/functions.js', '/tenant-italo/private-release.json']) {
      const value = manifest(); value.files[0].path = path; expect(() => validatePrivateArtifact(value, 'production', source)).toThrow();
    }
  });
});
