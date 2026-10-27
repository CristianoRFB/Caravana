import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, type Firestore } from 'firebase/firestore';
import { buildItaloPrivateRules } from '../scripts/recovery/italo-private-rules.mjs';
let env: RulesTestEnvironment;
const copyId = 'b'.repeat(64), sourceId = 'a'.repeat(64), nonce = 'c'.repeat(64), bookingId = 'd'.repeat(64);
const owner = 'existing-owner';
const membership = { uid: owner, organizationId: 'italo', role: 'tenant_owner', status: 'active' };
const copyPlanHash = '5d3c40d91f0756f0c81903405096def7a306671159e2c3d92b04218797e0bc10';
beforeAll(async () => {
  const rules = buildItaloPrivateRules(readFileSync('tests/fixtures/production-20260929.rules'));
  expect(readFileSync('firestore.italo-private.rules', 'utf8')).toBe(rules);
  env = await initializeTestEnvironment({ projectId: 'demo-caravana77-test', firestore: { rules } });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const docs: Record<string, object> = {
      'organizations/caravana-77': { name: 'Historical synthetic source' },
      'organizations/italo': { name: 'Synthetic Italo', importPending: true },
      [`admins/${owner}`]: { organizationId: 'caravana-77' },
      [`memberships/${owner}/organizations/italo`]: membership,
      'organizations/italo/tenantActivations/private-v1': { mode: 'private_history_only', copyPlanHash },
      'caravans/source-trip': { organizationId: 'caravana-77', status: 'published', capacity: 60, reservedSeats: 1, priceCents: 7500 },
      'caravans/copied-trip': { organizationId: 'italo', status: 'draft', importPending: true, capacity: 60, reservedSeats: 1, priceCents: 7500 },
      [`registrations/${sourceId}`]: { id: sourceId, organizationId: 'caravana-77', caravanId: 'source-trip', registrationStatus: 'confirmed', paymentTotalCents: 0, amountCents: 7500 },
      [`registrations/${copyId}`]: { id: copyId, organizationId: 'italo', caravanId: 'copied-trip', registrationStatus: 'awaiting_payment', paymentStatus: 'pending', paymentTotalCents: null, amountCents: 7500 },
      [`registrations/${copyId}/proofs/current`]: { registrationId: copyId, organizationId: 'italo', caravanId: 'copied-trip', content: 'JVBERi0xLjQKU1lOVEhFVElD' },
      [`registrations/${copyId}/payments/initial`]: { registrationId: copyId, organizationId: 'italo', caravanId: 'copied-trip', amountCents: 7500 },
      'caravans/copied-trip/expenses/initial': { organizationId: 'italo', amountCents: 100 },
      'tenantSlugs/italo': { slug: 'italo', organizationId: 'italo' },
      'publicTenantSettings/italo': { slug: 'italo', organizationId: 'italo', publicName: 'Synthetic Italo' },
    };
    for (const [path, data] of Object.entries(docs)) await setDoc(doc(db, path), data);
  });
});
const authenticated = () => env.authenticatedContext(owner).firestore();
function legacyBooking(db: Firestore, id = bookingId, receipt = nonce) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'caravans/source-trip'), { reservedSeats: 2, lastReservationNonce: receipt, updatedAt: serverTimestamp() });
  batch.set(doc(db, `reservationReceipts/${receipt}`), { registrationId: id, organizationId: 'caravana-77', caravanId: 'source-trip' });
  batch.set(doc(db, `registrations/${id}`), { id, reservationNonce: receipt, organizationId: 'caravana-77', caravanId: 'source-trip', caravanName: 'Synthetic trip', passengerName: 'Synthetic Passenger', phone: '11900000000', email: '', city: '', boardingPointId: 'point', boardingPointName: 'Synthetic stop', emergencyContact: '', notes: '', amountCents: 7500, registrationStatus: 'awaiting_payment', paymentStatus: 'pending', createdAt: '2026-10-27T12:00:00.000Z' });
  return batch.commit();
}
describe('private Italo release against the exact published legacy writer', () => {
  it('reads copied drafts, unknown money and attachments with the existing owner membership', async () => {
    const db = authenticated();
    await assertSucceeds(getDoc(doc(db, 'organizations/italo')));
    const trips = await assertSucceeds(getDocs(query(collection(db, 'caravans'), where('organizationId', '==', 'italo'))));
    expect(trips.docs.map(d => d.id)).toEqual(['copied-trip']);
    const registrations = await assertSucceeds(getDocs(query(collection(db, 'registrations'), where('organizationId', '==', 'italo'))));
    expect(registrations.docs[0].data().paymentTotalCents).toBeNull();
    for (const path of [`registrations/${copyId}/proofs/current`, `registrations/${copyId}/payments/initial`, 'caravans/copied-trip/expenses/initial']) await assertSucceeds(getDoc(doc(db, path)));
    await assertSucceeds(getDocs(collection(db, `memberships/${owner}/organizations`)));
    await assertSucceeds(getDoc(doc(db, 'subscriptions/italo')));
    await assertSucceeds(getDoc(doc(db, 'documentPolicies/italo')));
  });
  it('denies public/new bearer access to the copy and cross-tenant enumeration while preserving old bearer links', async () => {
    for (const db of [env.unauthenticatedContext().firestore(), env.authenticatedContext('tenant-b').firestore()]) {
      await assertFails(getDoc(doc(db, `registrations/${copyId}`)));
      await assertFails(getDoc(doc(db, `registrations/${copyId}/proofs/current`)));
      await assertFails(getDoc(doc(db, 'caravans/copied-trip')));
      await assertFails(getDocs(collection(db, 'registrations')));
      await assertFails(getDocs(query(collection(db, 'registrations'), where('organizationId', '==', 'italo'))));
      await assertSucceeds(getDoc(doc(db, `registrations/${sourceId}`)));
      await assertSucceeds(getDoc(doc(db, 'tenantSlugs/italo')));
    }
  });
  it.each([{ status: 'revoked' }, { role: 'staff' }, { role: 'platform_owner' }, { uid: 'other' }, { organizationId: 'other' }])('denies revoked/conflicting owner data %j without legacy fallback', async patch => {
    await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), `memberships/${owner}/organizations/italo`), patch));
    await assertFails(getDoc(doc(authenticated(), `registrations/${copyId}`)));
    await assertSucceeds(getDoc(doc(authenticated(), 'organizations/caravana-77')));
  });
  it('denies copied writes, public proof replacement, self-grants and publication even with a forged legacy italo admin', async () => {
    await env.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), `admins/${owner}`), { organizationId: 'italo' }));
    const db = authenticated();
    for (const [path, patch] of [[`registrations/${copyId}`, { checkedIn: true }], ['caravans/copied-trip', { status: 'published' }], ['organizations/italo', { importPending: false }], [`memberships/${owner}/organizations/italo`, { status: 'active', role: 'platform_owner' }]] as const) await assertFails(updateDoc(doc(db, path), patch));
    await assertFails(deleteDoc(doc(db, `registrations/${copyId}`)));
    await assertFails(setDoc(doc(db, 'platformOwners/attacker'), { status: 'active' }));
    const publicDb = env.unauthenticatedContext().firestore(), batch = writeBatch(publicDb);
    batch.set(doc(publicDb, `registrations/${copyId}/proofs/current`), { registrationId: copyId, organizationId: 'italo', caravanId: 'copied-trip', contentType: 'application/pdf', fileName: 'synthetic.pdf', content: 'JVBERi0xLjQKU1lOVEhFVElD', uploadedAt: serverTimestamp() });
    batch.update(doc(publicDb, `registrations/${copyId}`), { proofId: 'current', paymentStatus: 'awaiting_review', registrationStatus: 'awaiting_review', proofUploadedAt: serverTimestamp() });
    await assertFails(batch.commit());
  });
  it('preserves a real legacy reservation transaction without inventing a subscription, and rejects replay/orphan counters', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(legacyBooking(db));
    await assertFails(legacyBooking(db));
    await assertFails(updateDoc(doc(db, 'caravans/source-trip'), { reservedSeats: 3, lastReservationNonce: 'e'.repeat(64) }));
    await env.withSecurityRulesDisabled(async context => {
      expect((await getDoc(doc(context.firestore(), 'caravans/source-trip'))).data()?.reservedSeats).toBe(2);
      expect((await getDoc(doc(context.firestore(), 'subscriptions/caravana-77'))).exists()).toBe(false);
    });
  });
  it('keeps legacy financial writes working and denies moving source documents into the copied tenant', async () => {
    const db = authenticated(), batch = writeBatch(db);
    batch.set(doc(db, `registrations/${sourceId}/payments/synthetic-payment`), { id: 'synthetic-payment', registrationId: sourceId, organizationId: 'caravana-77', caravanId: 'source-trip', amountCents: 100, method: 'pix', notes: '', status: 'active', createdAt: '2026-10-27T12:00:00.000Z', createdBy: owner });
    batch.update(doc(db, `registrations/${sourceId}`), { paymentTotalCents: 100 });
    await assertSucceeds(batch.commit());
    await assertFails(updateDoc(doc(db, `registrations/${sourceId}`), { organizationId: 'italo' }));
    await assertFails(updateDoc(doc(db, 'caravans/source-trip'), { organizationId: 'italo' }));
  });
  it('requires the operator ledger and pending-history state, and fails closed after cutover or ledger loss', async () => {
    await env.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'organizations/italo'), { importPending: false }));
    await assertFails(getDoc(doc(authenticated(), `registrations/${copyId}`)));
    await env.withSecurityRulesDisabled(async context => { await updateDoc(doc(context.firestore(), 'organizations/italo'), { importPending: true }); await deleteDoc(doc(context.firestore(), 'organizations/italo/tenantActivations/private-v1')); });
    await assertFails(getDoc(doc(authenticated(), `registrations/${copyId}`)));
  });
});
