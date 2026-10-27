import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, type Firestore } from 'firebase/firestore';
import { buildItaloCutoverFenceRules, CUTOVER_LEDGER_PATH } from '../scripts/recovery/italo-cutover-fence-rules.mjs';
let env: RulesTestEnvironment;
const owner = 'synthetic-operational-owner', sourceId = 'a'.repeat(64), copyId = 'b'.repeat(64);
const copyPlanHash = '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10';
function ledger(phase = 'source_active') {
  return { version: 'italo-operational-cutover-v1', copyPlanHash, sourceOrganizationId: 'caravana-77', targetOrganizationId: 'italo',
    operationalIntentConfirmed: true, generation: 1, phase, writerOrganizationId: phase === 'source_active' ? 'caravana-77' : phase === 'target_active' ? 'italo' : '' };
}
beforeAll(async () => {
  const rules = buildItaloCutoverFenceRules(readFileSync('firestore.italo-private.rules'));
  expect(readFileSync('firestore.italo-cutover-fence.rules', 'utf8')).toBe(rules);
  env = await initializeTestEnvironment({ projectId: 'demo-caravana77-test', firestore: { rules } });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    for (const [path, data] of Object.entries({
      'organizations/caravana-77': { name: 'Synthetic operational source' },
      'organizations/unrelated': { name: 'Unrelated synthetic tenant' },
      'organizations/italo': { name: 'Synthetic Italo', importPending: true },
      [`admins/${owner}`]: { organizationId: 'caravana-77' },
      [`memberships/${owner}/organizations/italo`]: { uid: owner, organizationId: 'italo', role: 'tenant_owner', status: 'active' },
      'organizations/italo/tenantActivations/private-v1': { mode: 'private_history_only', copyPlanHash },
      'caravans/source-event': { organizationId: 'caravana-77', name: 'Synthetic past-dated operational event', date: '2020-01-01', status: 'published', capacity: 60, reservedSeats: 1, priceCents: 7500 },
      'caravans/unrelated-event': { organizationId: 'unrelated', status: 'published', capacity: 60, reservedSeats: 1, priceCents: 7500 },
      'caravans/copied-event': { organizationId: 'italo', status: 'draft', importPending: true, capacity: 60, reservedSeats: 1, priceCents: 7500 },
      [`registrations/${sourceId}`]: { id: sourceId, organizationId: 'caravana-77', caravanId: 'source-event', registrationStatus: 'confirmed', paymentTotalCents: 0, amountCents: 7500 },
      [`registrations/${copyId}`]: { id: copyId, organizationId: 'italo', caravanId: 'copied-event', registrationStatus: 'awaiting_payment', paymentTotalCents: null, amountCents: 7500 },
    })) await setDoc(doc(db, path), data);
  });
});
const seedLedger = (data: object) => env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), CUTOVER_LEDGER_PATH), data));
const publicDb = () => env.unauthenticatedContext().firestore();
const ownerDb = () => env.authenticatedContext(owner).firestore();
function booking(db: Firestore, organizationId = 'caravana-77', caravanId = 'source-event', id = 'd'.repeat(64), nonce = 'c'.repeat(64)) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'caravans', caravanId), { reservedSeats: 2, lastReservationNonce: nonce, updatedAt: serverTimestamp() });
  batch.set(doc(db, 'reservationReceipts', nonce), { registrationId: id, organizationId, caravanId });
  batch.set(doc(db, 'registrations', id), { id, reservationNonce: nonce, organizationId, caravanId,
    caravanName: 'Synthetic trip', passengerName: 'Synthetic Passenger', phone: '11900000000', email: '', city: '',
    boardingPointId: 'point', boardingPointName: 'Synthetic stop', emergencyContact: '', notes: '', amountCents: 7500,
    registrationStatus: 'awaiting_payment', paymentStatus: 'pending', createdAt: '2026-10-27T12:00:00.000Z' });
  return batch.commit();
}
function payment(db: Firestore) {
  const batch = writeBatch(db);
  batch.set(doc(db, `registrations/${sourceId}/payments/new`), { id: 'new', registrationId: sourceId,
    organizationId: 'caravana-77', caravanId: 'source-event', amountCents: 100, method: 'pix', notes: '',
    status: 'active', createdAt: '2026-10-27T12:00:00.000Z', createdBy: owner });
  batch.update(doc(db, 'registrations', sourceId), { paymentTotalCents: 100 });
  return batch.commit();
}
describe('dormant Italo operational writer fence', () => {
  it('keeps the current source operational without a ledger, regardless of its past date', async () => {
    await assertSucceeds(booking(publicDb()));
    await assertSucceeds(payment(ownerDb()));
    await assertSucceeds(updateDoc(doc(ownerDb(), 'caravans/source-event'), { name: 'Still operational' }));
    await assertFails(updateDoc(doc(ownerDb(), `registrations/${copyId}`), { checkedIn: true }));
  });
  it('an explicit valid source-active generation keeps legacy booking and finance contracts intact', async () => {
    await seedLedger(ledger());
    await assertSucceeds(booking(publicDb())); await assertSucceeds(payment(ownerDb()));
    await assertSucceeds(getDoc(doc(ownerDb(), CUTOVER_LEDGER_PATH)));
  });
  it.each(['frozen', 'target_active'])('blocks the source atomically in %s while preserving both histories', async phase => {
    await seedLedger(ledger(phase));
    await assertFails(booking(publicDb())); await assertFails(payment(ownerDb()));
    await assertFails(updateDoc(doc(ownerDb(), 'caravans/source-event'), { name: 'Forbidden source edit' }));
    await assertFails(updateDoc(doc(ownerDb(), `registrations/${sourceId}`), { checkedIn: true }));
    await assertSucceeds(getDoc(doc(publicDb(), `registrations/${sourceId}`)));
    expect((await assertSucceeds(getDoc(doc(ownerDb(), `registrations/${copyId}`)))).data()?.paymentTotalCents).toBeNull();
    // This preparatory release does not pretend the target contract is ready.
    await assertFails(updateDoc(doc(ownerDb(), `registrations/${copyId}`), { checkedIn: true }));
    await env.withSecurityRulesDisabled(async c => {
      expect((await getDoc(doc(c.firestore(), 'caravans/source-event'))).data()?.reservedSeats).toBe(1);
      expect((await getDoc(doc(c.firestore(), 'registrations', 'd'.repeat(64)))).exists()).toBe(false);
      expect((await getDoc(doc(c.firestore(), `registrations/${sourceId}/payments/new`))).exists()).toBe(false);
    });
  });
  it('freezing Italo does not stop an unrelated organization', async () => {
    await seedLedger(ledger('frozen'));
    await assertSucceeds(booking(publicDb(), 'unrelated', 'unrelated-event'));
  });
  it.each([{ copyPlanHash: 'f'.repeat(64) }, { phase: 'unknown' }, { writerOrganizationId: 'italo' }, { generation: 0 }, { operationalIntentConfirmed: false }, { version: 'other' }])('fails closed for malformed/conflicting ledgers %j', async patch => {
    await seedLedger({ ...ledger(), ...patch }); await assertFails(booking(publicDb()));
  });
  it('clients cannot create, change or delete the operator ledger, or use it to bypass memberships', async () => {
    await assertFails(setDoc(doc(ownerDb(), CUTOVER_LEDGER_PATH), ledger()));
    await seedLedger(ledger());
    await assertFails(updateDoc(doc(ownerDb(), CUTOVER_LEDGER_PATH), { phase: 'target_active' }));
    await assertFails(deleteDoc(doc(ownerDb(), CUTOVER_LEDGER_PATH)));
    await assertFails(getDoc(doc(env.authenticatedContext('tenant-b').firestore(), CUTOVER_LEDGER_PATH)));
    await env.withSecurityRulesDisabled(c => updateDoc(doc(c.firestore(), `memberships/${owner}/organizations/italo`), { status: 'revoked' }));
    await assertFails(getDoc(doc(ownerDb(), CUTOVER_LEDGER_PATH)));
  });
  it('a reservation racing a freeze is either fully committed or fully denied, and subsequent source writes stop', async () => {
    const [attempt, freeze] = await Promise.allSettled([booking(publicDb()), seedLedger(ledger('frozen'))]);
    expect(freeze.status).toBe('fulfilled');
    await env.withSecurityRulesDisabled(async c => {
      const trip = (await getDoc(doc(c.firestore(), 'caravans/source-event'))).data();
      const registration = await getDoc(doc(c.firestore(), 'registrations', 'd'.repeat(64)));
      expect(registration.exists()).toBe(attempt.status === 'fulfilled');
      expect(trip?.reservedSeats).toBe(attempt.status === 'fulfilled' ? 2 : 1);
    });
    await assertFails(payment(ownerDb()));
  });
});
