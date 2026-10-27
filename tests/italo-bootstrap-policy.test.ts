import { describe, expect, it } from 'vitest';
import { existingEventGrant, ITALO_COPY_PLAN_HASH } from '../src/lib/existing-event-grant';
import { italoBootstrapDecision } from '../src/lib/italo-bootstrap-policy';
const active = existingEventGrant({ version: 'italo-operational-cutover-v1', copyPlanHash: ITALO_COPY_PLAN_HASH, sourceOrganizationId: 'caravana-77', targetOrganizationId: 'italo',
  sourceCaravanId: 'old', targetCaravanId: 'copied', sourceSlug: 'old-trip', targetSlug: 'copied-trip', phase: 'target_active', writerOrganizationId: 'italo', generation: 3,
  operationalIntentConfirmed: true, everActivated: true, capacityCeiling: 60 })!;
const sourceId = 'a'.repeat(64), targetId = 'b'.repeat(64);
const alias = (id: string) => ({ lookupId: id, sourceId, targetId, organizationId: 'italo', targetCaravanId: 'copied', copyPlanHash: ITALO_COPY_PLAN_HASH });
describe('root bootstrap policy without a Firebase app or real data', () => {
  it('preserves the public source and private viewer while preparation has not activated the target', () => {
    for (const grant of [null, { ...active, everActivated: false, phase: 'source_active' as const, writerOrganizationId: 'caravana-77' as const }]) {
      expect(italoBootstrapDecision(grant, '/caravana/old-trip')).toEqual({ kind: 'legacy' });
      expect(italoBootstrapDecision(grant, '/admin/login')).toEqual({ kind: 'legacy' });
      expect(italoBootstrapDecision(grant, '/tenant-italo/admin/login')).toEqual({ kind: 'private_history' });
    }
  });
  it('routes only the existing event, filters the root catalog and keeps the operational target during a freeze', () => {
    for (const g of [active, { ...active, phase: 'frozen' as const, writerOrganizationId: '' as const }]) {
      expect(italoBootstrapDecision(g, '/caravana/old-trip/inscricao')).toEqual({ kind: 'redirect', path: '/tenant-italo/o/italo/caravana/copied-trip/inscricao' });
      expect(italoBootstrapDecision(g, '/caravana/copied-trip')).toEqual({ kind: 'redirect', path: '/tenant-italo/o/italo/caravana/copied-trip' });
      expect(italoBootstrapDecision(g, '/tenant-italo/admin')).toEqual({ kind: 'operational' });
      expect(italoBootstrapDecision(g, '/')).toEqual({ kind: 'catalog' });
      expect(italoBootstrapDecision(g, '/caravana/another-client')).toEqual({ kind: 'legacy' });
      expect(italoBootstrapDecision(g, '/admin/login')).toEqual({ kind: 'legacy' });
    }
  });
  it('resolves opaque historical links and new target links, without guessing ownership of other registrations', () => {
    expect(italoBootstrapDecision(active, '/minha-inscricao/' + sourceId)).toEqual({ kind: 'lookup', id: sourceId });
    expect(italoBootstrapDecision(active, '/minha-inscricao/' + sourceId, { alias: alias(sourceId), registration: null })).toEqual({ kind: 'redirect', path: '/tenant-italo/o/italo/minha-inscricao/' + targetId });
    expect(italoBootstrapDecision(active, '/minha-inscricao/' + targetId, { alias: null, registration: { organizationId: 'italo', caravanId: 'copied' } })).toEqual({ kind: 'redirect', path: '/tenant-italo/o/italo/minha-inscricao/' + targetId });
    expect(italoBootstrapDecision(active, '/minha-inscricao/' + targetId, { alias: null, registration: { organizationId: 'other', caravanId: 'other' } })).toEqual({ kind: 'legacy' });
    expect(() => italoBootstrapDecision(active, '/minha-inscricao/' + sourceId, { alias: { ...alias(sourceId), targetCaravanId: 'other' }, registration: null })).toThrow();
  });
  it('a permitted pretraffic return routes both directions back to source and preserves the private viewer', () => {
    const source = { ...active, phase: 'source_active' as const, writerOrganizationId: 'caravana-77' as const };
    expect(italoBootstrapDecision(source, '/minha-inscricao/' + targetId, { alias: alias(targetId), registration: null })).toEqual({ kind: 'redirect', path: '/minha-inscricao/' + sourceId });
    expect(italoBootstrapDecision(source, '/tenant-italo/minha-inscricao/' + targetId, { alias: alias(targetId), registration: null })).toEqual({ kind: 'redirect', path: '/minha-inscricao/' + sourceId });
    expect(italoBootstrapDecision(source, '/tenant-italo/admin')).toEqual({ kind: 'private_history' });
    expect(italoBootstrapDecision(source, '/tenant-italo/')).toEqual({ kind: 'redirect', path: '/' });
    expect(italoBootstrapDecision(source, '/minha-inscricao/' + sourceId, { alias: alias(sourceId), registration: null })).toEqual({ kind: 'legacy' });
    expect(italoBootstrapDecision({ ...active, phase: 'frozen', writerOrganizationId: '', everActivated: false }, '/caravana/old-trip')).toEqual({ kind: 'maintenance' });
  });
});
