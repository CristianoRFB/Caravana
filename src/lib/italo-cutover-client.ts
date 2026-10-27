import { doc, getDocFromServer, type Firestore } from 'firebase/firestore';
import { existingEventGrant, ITALO_COPY_PLAN_HASH, type ExistingEventGrant } from './existing-event-grant';
import { getReservationAttempt, readReservationAttempt, saveReservationAttempt, type ReservationAttempt } from './reservation-attempt';

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
export async function readOperationalDirectory(database: Firestore): Promise<ExistingEventGrant> {
  const snapshot = await getDocFromServer(doc(database, 'publicTenantCutovers', 'italo'));
  const grant = existingEventGrant(snapshot.data());
  if (!grant || !grant.everActivated) throw Error('A transferência está em preparação. Consulte a organização antes de reservar.');
  return grant;
}
export async function resolveOperationalRegistration(database: Firestore, id: string, grant: ExistingEventGrant): Promise<string> {
  if (!opaqueId.test(id)) throw Error('Endereço de inscrição inválido.');
  const snapshot = await getDocFromServer(doc(database, 'legacyRegistrationAliases', id));
  if (!snapshot.exists()) return id; // New target records have no historical alias.
  const alias = registrationAlias(snapshot.data(), id, grant);
  if (!alias) throw Error('O vínculo histórico desta inscrição precisa ser conferido pela organização.');
  return grant.phase === 'source_active' ? alias.sourceId : alias.targetId;
}
export async function resolveOperationalReservationAttempt(
  database: Firestore, grant: ExistingEventGrant, caravanId: string,
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
): Promise<{ attempt: ReservationAttempt; existingRegistrationId: string | null }> {
  if (grant.phase !== 'target_active' || caravanId !== grant.targetCaravanId) throw Error('As reservas estão temporariamente em conferência. Tente novamente após a confirmação da organização.');
  const current = readReservationAttempt(caravanId, storage);
  if (current) return { attempt: current, existingRegistrationId: null };
  const previous = readReservationAttempt(grant.sourceCaravanId, storage);
  if (!previous) return { attempt: getReservationAttempt(caravanId, storage), existingRegistrationId: null };
  const canonicalId = await resolveOperationalRegistration(database, previous.registrationId, grant);
  if (canonicalId !== previous.registrationId) return { attempt: previous, existingRegistrationId: canonicalId };
  // A cutover with no historical alias must never silently create a second
  // registration. The known-ID server read distinguishes an uncommitted retry.
  const known = await getDocFromServer(doc(database, 'registrations', previous.registrationId));
  if (known.exists()) {
    const data = known.data();
    if (data.organizationId === 'italo' && data.caravanId === caravanId) return { attempt: previous, existingRegistrationId: previous.registrationId };
    throw Error('A reserva anterior precisa ser conciliada pela organização. Nenhuma nova inscrição foi criada.');
  }
  // Preserve both copies until confirmed; a storage error prevents the write.
  saveReservationAttempt(caravanId, previous, storage);
  return { attempt: previous, existingRegistrationId: null };
}
