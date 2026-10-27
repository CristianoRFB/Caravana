import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, type Firestore } from 'firebase/firestore';
import { buildItaloOperationalRules } from '../scripts/recovery/italo-operational-rules.mjs';
import { CUTOVER_LEDGER_PATH } from '../scripts/recovery/italo-cutover-fence-rules.mjs';
import type { Caravan, Registration } from '../src/lib/types';
const runtime = vi.hoisted(() => ({ db: null as Firestore | null, auth: { currentUser: { uid: 'existing-owner' } }, firebaseConfigured: true, assertIdentityAllowed: () => {} }));
vi.mock('../src/lib/firebase', () => runtime);
vi.mock('../src/lib/italo-operational-scope', () => ({ operationalScope: 'italo' }));
import { reserveSeat, getRegistration, findCaravan, listPublishedCaravans, watchRegistration, uploadProof } from '../src/lib/data';
import { recordPassengerPayment } from '../src/lib/financial-operations';
import { toggleCheckin } from '../src/lib/registration-operations';
import { updateLimitedCaravan } from '../src/lib/quota-operations';
import { readOperationalDirectory, resolveOperationalRegistration, resolveOperationalReservationAttempt } from '../src/lib/italo-cutover-client';
import { readReservationAttempt, saveReservationAttempt } from '../src/lib/reservation-attempt';
let env: RulesTestEnvironment;
const owner = 'existing-owner', knownId = 'b'.repeat(64), unknownId = 'f'.repeat(64), originalId = 'a'.repeat(64);
const copyPlanHash = '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10';
const grant = { version: 'italo-operational-cutover-v1', copyPlanHash, sourceOrganizationId: 'caravana-77', targetOrganizationId: 'italo',
  sourceCaravanId: 'original-event', targetCaravanId: 'copied-event', sourceSlug: 'original-trip', targetSlug: 'copied-trip',
  phase: 'target_active', writerOrganizationId: 'italo', generation: 3, operationalIntentConfirmed: true, everActivated: true, capacityCeiling: 3 };
const trip = { id: 'copied-event', name: 'Synthetic operational event', organizationId: 'italo', slug: 'copied-trip', status: 'published',
  date: '2020-01-01', capacity: 3, reservedSeats: 2, priceCents: 7500, importPending: false,
  boardingPoints: [{ id: 'point', name: 'Synthetic stop', address: '', time: '06:00' }] } as Caravan;
const passenger = { passengerName: 'Synthetic Passenger', phone: '11900000000', email: '', city: '', boardingPointId: 'point', boardingPointName: 'Synthetic stop', emergencyContact: '', notes: '' };
beforeAll(async () => {
  const rules = buildItaloOperationalRules(readFileSync('firestore.italo-private.rules'), readFileSync('firestore.rules'));
  expect(readFileSync('firestore.italo-operational.rules', 'utf8')).toBe(rules);
  env = await initializeTestEnvironment({ projectId: 'demo-caravana77-test', firestore: { rules } });
});
afterAll(async () => { runtime.db = null; await env?.cleanup(); });
beforeEach(async () => {
  runtime.db = null; await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c => {
    for (const [path, data] of Object.entries({
      'organizations/caravana-77': { name: 'Synthetic source' },
      'organizations/italo': { name: 'Synthetic Italo', importPending: false, status: 'active' },
      [`admins/${owner}`]: { organizationId: 'caravana-77' },
      [`memberships/${owner}/organizations/italo`]: { uid: owner, organizationId: 'italo', role: 'tenant_owner', status: 'active' },
      'organizations/italo/tenantActivations/private-v1': { mode: 'private_history_only', copyPlanHash },
      [CUTOVER_LEDGER_PATH]: grant,
      'publicTenantCutovers/italo': grant,
      'organizationAvailability/italo': { organizationId: 'italo', status: 'active' },
      'tenantUsage/italo': { organizationId: 'italo', version: 'commercial-v1', publishedCaravans: 1, activeMembers: 2, activeOwners: 2 },
      'caravans/original-event': { ...trip, id: 'original-event', organizationId: 'caravana-77', slug: 'original-trip' },
      'caravans/copied-event': trip,
      [`registrations/${originalId}`]: { id: originalId, organizationId: 'caravana-77', caravanId: 'original-event', registrationStatus: 'confirmed', paymentStatus: 'approved', paymentTotalCents: 0, amountCents: 7500 },
      [`registrations/${knownId}`]: { id: knownId, organizationId: 'italo', caravanId: 'copied-event', registrationStatus: 'confirmed', paymentStatus: 'approved', paymentTotalCents: 0, amountCents: 7500 },
      [`registrations/${unknownId}`]: { id: unknownId, organizationId: 'italo', caravanId: 'copied-event', registrationStatus: 'awaiting_payment', paymentStatus: 'pending', paymentTotalCents: null, amountCents: 7500 },
      [`registrations/${knownId}/proofs/current`]: { registrationId: knownId, organizationId: 'italo', caravanId: 'copied-event', content: 'JVBERi0xLjQKU1lOVEhFVElD', contentType: 'application/pdf' },
      ...Object.fromEntries([originalId, knownId].map(lookupId => [`legacyRegistrationAliases/${lookupId}`, { lookupId, sourceId: originalId, targetId: knownId, organizationId: 'italo', targetCaravanId: 'copied-event', copyPlanHash }])),
    })) await setDoc(doc(c.firestore(), path), data);
  });
});
const privileged = () => env.authenticatedContext(owner).firestore();
const registration = (id = knownId) => ({ id, organizationId: 'italo', caravanId: 'copied-event', registrationStatus: 'confirmed', paymentStatus: 'approved', paymentTotalCents: id === unknownId ? null : 0, amountCents: 7500 } as Registration);
describe('scoped operational target alongside the frozen legacy source', () => {
  it('the published-app data facade resolves the historical slug and registration, including its live subscription', async () => {
    runtime.db = env.unauthenticatedContext().firestore();
    expect((await findCaravan('original-trip', 'italo'))?.id).toBe(trip.id);
    expect((await findCaravan('copied-trip', 'italo'))?.id).toBe(trip.id);
    expect(await findCaravan('unrelated-trip', 'italo')).toBeNull();
    expect((await listPublishedCaravans('italo')).map(c => c.id)).toEqual([trip.id]);
    expect((await getRegistration(originalId))?.id).toBe(knownId);
    const seen = await new Promise<Registration | null>((resolve, reject) => {
      const unsubscribe = watchRegistration(originalId, reg => { unsubscribe(); resolve(reg); }, reject);
    });
    expect(seen?.id).toBe(knownId);
    expect(seen?.paymentTotalCents).toBe(0);
    expect((await getRegistration(unknownId))?.paymentTotalCents).toBeNull();
  });
  it('edits the existing event and archives/republishes it with idempotent audit and consistent usage, without a subscription', async () => {
    runtime.db = privileged();
    await updateLimitedCaravan(trip.id, { name: 'Updated synthetic event', boardingPoints: trip.boardingPoints, announcements: [{ title: 'Synthetic notice', body: 'Operational update' }] }, '6'.repeat(32));
    await updateLimitedCaravan(trip.id, { name: 'Updated synthetic event', boardingPoints: trip.boardingPoints, announcements: [{ title: 'Synthetic notice', body: 'Operational update' }] }, '6'.repeat(32));
    await updateLimitedCaravan(trip.id, { status: 'archived' }, '7'.repeat(32));
    expect((await getDoc(doc(runtime.db, 'tenantUsage/italo'))).data()?.publishedCaravans).toBe(0);
    await updateLimitedCaravan(trip.id, { status: 'published' }, '8'.repeat(32));
    expect((await getDoc(doc(runtime.db, 'tenantUsage/italo'))).data()).toMatchObject({ publishedCaravans: 1, activeMembers: 2, activeOwners: 2 });
    await expect(updateLimitedCaravan(trip.id, { capacity: 4 }, '9'.repeat(32))).rejects.toThrow();
    await expect(updateLimitedCaravan(trip.id, { name: 'x'.repeat(121) }, 'a'.repeat(32))).rejects.toThrow();
    await expect(updateLimitedCaravan(trip.id, { slug: 'new-unreviewed-link' }, 'b'.repeat(32))).rejects.toThrow();
    await expect(updateLimitedCaravan(trip.id, { boardingPoints: [{ ...trip.boardingPoints[0], name: 'x'.repeat(121) }] }, 'c'.repeat(32))).rejects.toThrow();
    await assertFails(updateDoc(doc(runtime.db, 'tenantUsage/italo'), { activeMembers: 3 }));
    await assertFails(updateDoc(doc(runtime.db, 'caravans/copied-event'), { name: 'Missing audit' }));
    expect((await getDoc(doc(runtime.db, 'caravans/copied-event'))).data()).toMatchObject({ name: 'Updated synthetic event', status: 'published', reservedSeats: 2 });
  });
  it('resolves both old and new known links to the target without public enumeration or stale source reads', async () => {
    const publicDb = env.unauthenticatedContext().firestore();
    const directory = await readOperationalDirectory(publicDb);
    expect(await resolveOperationalRegistration(publicDb, originalId, directory)).toBe(knownId);
    expect(await resolveOperationalRegistration(publicDb, knownId, directory)).toBe(knownId);
    await assertSucceeds(getDoc(doc(publicDb, 'registrations', knownId)));
    await assertFails(getDoc(doc(publicDb, 'registrations', originalId)));
    await assertFails(getDocs(collection(publicDb, 'legacyRegistrationAliases')));
    await assertFails(getDocs(collection(publicDb, 'registrations')));
    await assertFails(getDoc(doc(publicDb, `registrations/${knownId}/proofs/current`)));
    await assertFails(setDoc(doc(publicDb, 'legacyRegistrationAliases', originalId), {}));
  });
  it('preserves a pending source reservation attempt and resumes a committed one without another seat', async () => {
    const values = new Map<string, string>();
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
    const publicDb = env.unauthenticatedContext().firestore(), directory = await readOperationalDirectory(publicDb);
    const committed = { registrationId: originalId, reservationNonce: 'c'.repeat(64) };
    saveReservationAttempt('original-event', committed, storage);
    const resumed = await resolveOperationalReservationAttempt(publicDb, directory, trip.id, storage);
    expect(resumed.existingRegistrationId).toBe(knownId);
    expect(readReservationAttempt(trip.id, storage)).toBeNull();
    values.clear();
    const uncommitted = { registrationId: 'd'.repeat(64), reservationNonce: 'c'.repeat(64) };
    saveReservationAttempt('original-event', uncommitted, storage);
    const pending = await resolveOperationalReservationAttempt(publicDb, directory, trip.id, storage);
    expect(pending).toEqual({ attempt: uncommitted, existingRegistrationId: null });
    expect(readReservationAttempt(trip.id, storage)).toEqual(uncommitted);
    expect(readReservationAttempt('original-event', storage)).toEqual(uncommitted);
    runtime.db = publicDb;
    await reserveSeat(trip, passenger, pending.attempt);
    await reserveSeat(trip, passenger, pending.attempt);
    expect((await getDoc(doc(publicDb, 'caravans/copied-event'))).data()?.reservedSeats).toBe(3);
  });
  it('stops a source committed attempt without an alias and rejects a malformed mapping', async () => {
    const publicDb = env.unauthenticatedContext().firestore(), directory = await readOperationalDirectory(publicDb);
    const attempt = { registrationId: originalId, reservationNonce: 'c'.repeat(64) };
    const values = new Map<string, string>();
    const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
    saveReservationAttempt('original-event', attempt, storage);
    await env.withSecurityRulesDisabled(c => deleteDoc(doc(c.firestore(), 'legacyRegistrationAliases', originalId)));
    await expect(resolveOperationalReservationAttempt(publicDb, directory, trip.id, storage)).rejects.toThrow();
    expect(readReservationAttempt(trip.id, storage)).toBeNull();
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'legacyRegistrationAliases', originalId), { lookupId: originalId, sourceId: originalId, targetId: knownId, organizationId: 'other', targetCaravanId: 'copied-event', copyPlanHash }));
    await expect(resolveOperationalRegistration(publicDb, originalId, directory)).rejects.toThrow();
  });
  it('keeps non-capability historical IDs owner-only and denies the legacy fallback after revocation', async () => {
    const privateId = 'historical-import-1';
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'legacyRegistrationAliases', privateId), { lookupId: privateId, sourceId: privateId, targetId: knownId, organizationId: 'italo', targetCaravanId: 'copied-event', copyPlanHash }));
    const publicDb = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(publicDb, 'legacyRegistrationAliases', privateId)));
    expect(await resolveOperationalRegistration(privileged(), privateId, await readOperationalDirectory(privileged()))).toBe(knownId);
    await assertSucceeds(getDoc(doc(privileged(), 'registrations', originalId)));
    await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), `memberships/${owner}/organizations/italo`), { status: 'revoked' }));
    await assertFails(getDoc(doc(privileged(), 'legacyRegistrationAliases', privateId)));
    await assertFails(getDoc(doc(privileged(), 'registrations', originalId)));
  });
  it('uses the real reservation SDK without a subscription, rejects replay duplication and stops at the existing capacity', async () => {
    runtime.db = env.unauthenticatedContext().firestore();
    const attempt = { registrationId: 'd'.repeat(64), reservationNonce: 'c'.repeat(64) };
    expect(await reserveSeat(trip, passenger, attempt)).toBe(attempt.registrationId);
    expect(await reserveSeat(trip, passenger, attempt)).toBe(attempt.registrationId);
    await expect(reserveSeat(trip, { ...passenger, passengerName: 'Different request' }, attempt)).rejects.toThrow();
    await expect(reserveSeat(trip, passenger, { registrationId: 'e'.repeat(64), reservationNonce: '9'.repeat(64) })).rejects.toThrow();
    await env.withSecurityRulesDisabled(async c => {
      expect((await getDoc(doc(c.firestore(), 'caravans/copied-event'))).data()?.reservedSeats).toBe(3);
      expect((await getDoc(doc(c.firestore(), 'caravans/original-event'))).data()?.reservedSeats).toBe(2);
      expect((await getDoc(doc(c.firestore(), 'subscriptions/italo'))).exists()).toBe(false);
      expect((await getDoc(doc(c.firestore(), 'tenantEntitlements/italo'))).exists()).toBe(false);
    });
  });
  it('records an audited payment idempotently through the existing SDK while UNKNOWN remains unfilled', async () => {
    runtime.db = privileged();
    const input = { amountCents: 100, method: 'pix' as const, notes: '' }, operation = '1'.repeat(32);
    await recordPassengerPayment(registration(), input, operation);
    await recordPassengerPayment(registration(), input, operation);
    expect((await getDoc(doc(runtime.db, 'registrations', knownId))).data()?.paymentTotalCents).toBe(100);
    await expect(recordPassengerPayment(registration(unknownId), input, '2'.repeat(32))).rejects.toThrow();
    expect((await getDoc(doc(runtime.db, 'registrations', unknownId))).data()?.paymentTotalCents).toBeNull();
  });
  it('accepts a real portal SDK proof upload without exposing private proofs and blocks further uploads during a freeze', async () => {
    runtime.db = env.unauthenticatedContext().firestore();
    const file = new File(['%PDF-1.4\nSYNTHETIC'], 'synthetic.pdf', { type: 'application/pdf' });
    const reg = registration(unknownId);
    await uploadProof(reg, file);
    expect((await getDoc(doc(runtime.db, 'registrations', unknownId))).data()?.paymentStatus).toBe('awaiting_review');
    expect((await getDoc(doc(runtime.db, 'registrations', unknownId))).data()?.paymentTotalCents).toBeNull();
    await assertFails(getDoc(doc(runtime.db, `registrations/${unknownId}/proofs/current`)));
    await assertSucceeds(getDoc(doc(privileged(), `registrations/${unknownId}/proofs/current`)));
    await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), CUTOVER_LEDGER_PATH), { phase: 'frozen', writerOrganizationId: '', generation: 4 }));
    await expect(uploadProof(reg, file)).rejects.toThrow();
  });
  it('operates check-in through its audited SDK and keeps source edits and new commercial caravans denied', async () => {
    runtime.db = privileged();
    await toggleCheckin(registration(), true, '3'.repeat(32));
    await toggleCheckin(registration(), true, '3'.repeat(32));
    expect((await getDoc(doc(runtime.db, 'registrations', knownId))).data()?.checkedInBy).toBe(owner);
    await assertFails(updateDoc(doc(runtime.db, 'registrations', originalId), { checkedInAt: null }));
    await assertFails(setDoc(doc(runtime.db, 'caravans/new-growth'), { ...trip, id: 'new-growth', reservedSeats: 0 }));
    await assertFails(updateDoc(doc(runtime.db, 'caravans/copied-event'), { capacity: 4 }));
  });
  it('does not expose private proofs, enumeration or owner operations to tenant B or a revoked membership', async () => {
    const other = env.authenticatedContext('tenant-b').firestore();
    await assertFails(getDoc(doc(other, `registrations/${knownId}/proofs/current`)));
    await assertFails(updateDoc(doc(other, 'registrations', knownId), { checkedInBy: 'tenant-b' }));
    await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), `memberships/${owner}/organizations/italo`), { status: 'revoked' }));
    await assertFails(getDoc(doc(privileged(), `registrations/${knownId}/proofs/current`)));
  });
  it('a frozen target preserves owner history and blocks new operations after forward traffic', async () => {
    runtime.db = privileged(); await recordPassengerPayment(registration(), { amountCents: 100, method: 'pix', notes: '' }, '4'.repeat(32));
    await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), CUTOVER_LEDGER_PATH), { phase: 'frozen', writerOrganizationId: '', generation: 4 }));
    expect((await assertSucceeds(getDoc(doc(privileged(), 'registrations', knownId)))).data()?.paymentTotalCents).toBe(100);
    const publicDb = env.unauthenticatedContext().firestore();
    expect((await assertSucceeds(getDoc(doc(publicDb, 'registrations', knownId)))).data()?.paymentTotalCents).toBe(100);
    await assertFails(getDoc(doc(publicDb, 'registrations', originalId)));
    await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), 'registrations', knownId), { portalAccessRevoked: true }));
    await assertFails(getDoc(doc(publicDb, 'registrations', knownId)));
    await expect(recordPassengerPayment(registration(), { amountCents: 100, method: 'pix', notes: '' }, '5'.repeat(32))).rejects.toThrow();
    await assertFails(updateDoc(doc(privileged(), 'registrations', originalId), { paymentTotalCents: 100 }));
  });
});
