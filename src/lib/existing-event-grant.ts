import type { Caravan } from './types';
export const ITALO_COPY_PLAN_HASH = '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10';
export interface ExistingEventGrant {
  version: 'italo-operational-cutover-v1';
  copyPlanHash: string;
  sourceOrganizationId: 'caravana-77'; targetOrganizationId: 'italo';
  sourceCaravanId: string; targetCaravanId: string; sourceSlug: string; targetSlug: string;
  phase: 'source_active' | 'frozen' | 'target_active'; generation: number;
  writerOrganizationId: 'caravana-77' | 'italo' | '';
  operationalIntentConfirmed: true; everActivated: boolean; capacityCeiling: number;
}
export function existingEventGrant(value: unknown): ExistingEventGrant | null {
  if (!value || typeof value !== 'object') return null;
  const g = value as Record<string, unknown>;
  const id = (v: unknown) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v);
  const slug = (v: unknown) => typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,159}$/.test(v);
  if (g.version !== 'italo-operational-cutover-v1' || g.copyPlanHash !== ITALO_COPY_PLAN_HASH
    || g.sourceOrganizationId !== 'caravana-77' || g.targetOrganizationId !== 'italo'
    || !id(g.sourceCaravanId) || !id(g.targetCaravanId) || g.sourceCaravanId === g.targetCaravanId
    || !slug(g.sourceSlug) || !slug(g.targetSlug) || g.sourceSlug === g.targetSlug
    || !['source_active', 'frozen', 'target_active'].includes(String(g.phase))
    || g.writerOrganizationId !== (g.phase === 'source_active' ? 'caravana-77' : g.phase === 'target_active' ? 'italo' : '')
    || (g.phase === 'target_active' && g.everActivated !== true)
    || !Number.isSafeInteger(g.generation) || (g.generation as number) < 1
    || g.operationalIntentConfirmed !== true || typeof g.everActivated !== 'boolean'
    || !Number.isSafeInteger(g.capacityCeiling) || (g.capacityCeiling as number) < 1 || (g.capacityCeiling as number) > 1000) return null;
  return g as unknown as ExistingEventGrant;
}
// This is an existing physical event's capacity, not a subscription/plan projection.
export function existingEventCapacity(value: unknown, caravan: Pick<Caravan, 'id' | 'organizationId' | 'status' | 'capacity' | 'reservedSeats' | 'importPending'>): number | null {
  const grant = existingEventGrant(value);
  if (!grant || !grant.everActivated || grant.phase !== 'target_active' || caravan.id !== grant.targetCaravanId
    || caravan.organizationId !== 'italo' || caravan.status !== 'published' || caravan.importPending === true
    || !Number.isSafeInteger(caravan.capacity) || caravan.capacity < 1 || caravan.capacity > grant.capacityCeiling
    || !Number.isSafeInteger(caravan.reservedSeats) || caravan.reservedSeats < 0 || caravan.reservedSeats > caravan.capacity) return null;
  return caravan.capacity;
}
