import { describe, expect, it } from 'vitest';
import { PRIVATE_HISTORY_BASE, privateHistoryRouteAllowed, resolvePrivateHistoryScope, scopePrivateHistoryAccess } from '../src/lib/private-history-release';
import type { TenantAccess } from '../src/lib/tenant-access';
describe('isolated private-history application release', () => {
  it('requires the reviewed tenant and subpath without changing the standard application', () => {
    expect(resolvePrivateHistoryScope(undefined, '/')).toBeNull();
    expect(resolvePrivateHistoryScope('italo', PRIVATE_HISTORY_BASE)).toBe('italo');
    expect(() => resolvePrivateHistoryScope('italo', '/')).toThrow();
    expect(() => resolvePrivateHistoryScope('other', PRIVATE_HISTORY_BASE)).toThrow();
  });
  it('never selects the legacy writer, a staff role, or a legacy-admin fallback in this private phase', () => {
    const access: TenantAccess[] = [
      { organizationId: 'caravana-77', source: 'legacy', role: 'tenant_owner' },
      { organizationId: 'italo', source: 'legacy', role: 'tenant_owner' },
      { organizationId: 'italo', source: 'membership', role: 'staff' },
      { organizationId: 'italo', source: 'membership', role: 'tenant_owner' },
    ];
    expect(scopePrivateHistoryAccess(access, 'italo')).toEqual([access[3]]);
    expect(scopePrivateHistoryAccess(access, null)).toBe(access);
    expect(scopePrivateHistoryAccess([], 'italo')).toEqual([]);
  });
  it('permits historical navigation and login while excluding public bookings and account/plan mutation routes', () => {
    for (const path of ['/admin', '/admin/login', '/admin/caravanas', '/admin/caravanas/copied-trip/passageiros', '/admin/caravanas/copied-trip/financeiro', '/admin/financeiro', '/admin/comprovantes', '/admin/check-in/copied-trip', '/admin/relatorios', '/admin/roteiros']) expect(privateHistoryRouteAllowed(path)).toBe(true);
    for (const path of ['/', '/caravana/source-trip/inscricao', '/o/italo/caravana/copied-trip', '/minha-inscricao/secret', '/conta/convites', '/platform', '/admin/plano', '/admin/equipe', '/admin/identidade', '/admin/documentos']) expect(privateHistoryRouteAllowed(path)).toBe(false);
  });
});
