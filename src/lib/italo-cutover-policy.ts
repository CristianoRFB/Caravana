import { ITALO_COPY_PLAN_HASH, type ExistingEventGrant } from './existing-event-grant';
const opaqueId = /^[A-Za-z0-9_-]{1,128}$/;
export interface RegistrationAlias { lookupId: string; sourceId: string; targetId: string; organizationId: 'italo'; targetCaravanId: string; copyPlanHash: string }
export function registrationAlias(value: unknown, lookupId: string, grant: ExistingEventGrant): RegistrationAlias | null {
  if (!value || typeof value !== 'object') return null;
  const a = value as RegistrationAlias;
  return a.lookupId === lookupId && a.organizationId === 'italo' && a.copyPlanHash === ITALO_COPY_PLAN_HASH
    && typeof a.sourceId === 'string' && opaqueId.test(a.sourceId)
    && typeof a.targetId === 'string' && /^[a-f0-9]{64}$/.test(a.targetId)
    && a.sourceId !== a.targetId && [a.sourceId, a.targetId].includes(lookupId)
    && a.targetCaravanId === grant.targetCaravanId ? a : null;
}
export function canonicalEvent(grant: ExistingEventGrant) {
  const source = grant.phase === 'source_active';
  return { organizationId: source ? grant.sourceOrganizationId : grant.targetOrganizationId,
    caravanId: source ? grant.sourceCaravanId : grant.targetCaravanId, slug: source ? grant.sourceSlug : grant.targetSlug };
}
