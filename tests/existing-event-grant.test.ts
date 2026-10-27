import { describe, it, expect } from 'vitest';
import { existingEventCapacity, existingEventGrant, ITALO_COPY_PLAN_HASH } from '../src/lib/existing-event-grant';
import { operationalRouteAllowed, resolveOperationalScope } from '../src/lib/italo-operational-scope';
const grant = () => ({ version: 'italo-operational-cutover-v1', copyPlanHash: ITALO_COPY_PLAN_HASH, sourceOrganizationId: 'caravana-77', targetOrganizationId: 'italo', sourceCaravanId: 'old', targetCaravanId: 'new', sourceSlug: 'old-trip', targetSlug: 'copied-trip', phase: 'target_active', writerOrganizationId: 'italo', generation: 3, operationalIntentConfirmed: true, everActivated: true, capacityCeiling: 60 });
const caravan = () => ({ id: 'new', organizationId: 'italo', status: 'published' as const, capacity: 60, reservedSeats: 10, importPending: false });
describe('finite existing-event compatibility without a commercial assignment', () => {
  it('allows generated Italo namespace links and existing owner routes while rejecting foreign namespaces and commercial growth screens', () => {
    expect(resolveOperationalScope(undefined, '/')).toBeNull();
    expect(() => resolveOperationalScope('italo', '/')).toThrow();
    expect(resolveOperationalScope('italo', '/tenant-italo/')).toBe('italo');
    for (const path of ['/', '/o/italo', '/o/italo/caravana/copied-trip/inscricao', '/minha-inscricao/' + 'a'.repeat(64), '/o/italo/minha-inscricao/historical-import-1', '/admin/caravanas/copied-event/financeiro']) expect(operationalRouteAllowed(path)).toBe(true);
    for (const path of ['/o/other', '/o/other/caravana/copied-trip', '/o/italo/admin', '/platform', '/admin/plano', '/admin/equipe', '/conta/convites', '/saas']) expect(operationalRouteAllowed(path)).toBe(false);
  });
  it('uses the reviewed physical capacity for precisely the existing event and never creates a plan object', () => {
    expect(existingEventCapacity(grant(), caravan())).toBe(60);
    expect(existingEventCapacity(grant(), { ...caravan(), capacity: 50 })).toBe(50);
    expect(existingEventGrant(grant())).not.toHaveProperty('planId');
  });
  it('rejects inactive, unreviewed, foreign, malformed or expanded scopes', () => {
    for (const patch of [{ phase: 'frozen' }, { phase: 'source_active' }, { phase: 'archive' }, { everActivated: false }, { operationalIntentConfirmed: false }, { targetOrganizationId: 'other' }, { sourceCaravanId: 'new' }, { capacityCeiling: 1001 }, { generation: 0 }, { copyPlanHash: 'x' }, { targetSlug: 'https://foreign.test' }]) expect(existingEventCapacity({ ...grant(), ...patch }, caravan())).toBeNull();
    for (const patch of [{ id: 'other' }, { organizationId: 'caravana-77' }, { status: 'draft' as const }, { importPending: true }, { capacity: 61 }, { reservedSeats: 61 }, { reservedSeats: -1 }]) expect(existingEventCapacity(grant(), { ...caravan(), ...patch })).toBeNull();
  });
});
