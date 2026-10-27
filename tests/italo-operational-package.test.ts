import { describe, expect, it } from 'vitest';
import { bootstrapHtml, operationalRedirects, runtimeApp } from '../scripts/package-italo-operational.mjs';
describe('public bootstrap package contracts', () => {
  const hash = 'a'.repeat(64), source = 'b'.repeat(12);
  const files = [{ path: '/tenant-italo/assets/main.js', sha256: hash }, { path: '/tenant-italo/assets/style.css', sha256: hash }];
  const html = '<script type="module" src="/tenant-italo/assets/main.js"></script><link rel="stylesheet" href="/tenant-italo/assets/style.css">';
  it('binds entry and styles to manifest hashes and rejects unreviewed or multiple entry scripts', () => {
    expect(runtimeApp(html, files)).toEqual({ entry: { path: files[0].path, sha256: hash }, styles: [{ path: files[1].path, sha256: hash }] });
    expect(() => runtimeApp(html.replace('assets/main.js', 'assets/missing.js'), files)).toThrow();
    expect(() => runtimeApp(html + '<script src="https://foreign.test/code.js"></script>', files)).toThrow();
    expect(() => runtimeApp(html.replace('/tenant-italo/assets/main.js', 'https://foreign.test/code.js'), files)).toThrow();
  });
  it('adds only an integrity-bound external bootstrap and a source-specific runtime descriptor', () => {
    const result = bootstrapHtml({ path: '/tenant-italo/assets/bootstrap-test.js', sha256: hash }, `/tenant-italo/runtime-${source}.json`).toString();
    expect(result).toContain('integrity="sha256-'); expect(result).toContain('data-italo-runtime=');
    expect(result).not.toContain('<script>'); expect(result).not.toContain('firebaseConfig');
    expect(() => bootstrapHtml({ path: 'https://foreign.test/code.js', sha256: hash }, `/tenant-italo/runtime-${source}.json`)).toThrow();
    expect(() => bootstrapHtml({ path: '/tenant-italo/assets/bootstrap-test.js', sha256: hash }, '/snapshot.json')).toThrow();
  });
  it('passes immutable scripts and public metadata before version-specific HTML rewrites, including warm private paths', () => {
    const routes = operationalRedirects(source, `/tenant-italo/runtime-${source}.json`);
    expect(routes.indexOf('/assets/*')).toBeLessThan(routes.indexOf('/* /entry-'));
    expect(routes.indexOf('/tenant-italo/assets/*')).toBeLessThan(routes.indexOf('/tenant-italo/* /tenant-italo/entry-'));
    expect(routes).toContain(`/tenant-italo/* /tenant-italo/entry-${source}/ 200`);
    expect(routes).toContain(`/* /entry-${source}/ 200`);
    expect(routes).not.toContain('/index.html 200');
    expect(() => operationalRedirects('../escape', '/snapshot.json')).toThrow();
  });
});
