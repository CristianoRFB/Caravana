import { readFileSync } from "node:fs";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";
import type { Caravan, Registration } from "../src/lib/types";

export const testAccount = { email: "admin-a@example.test", password: "Synthetic-Only-2026" };
let syntheticAdminUid: string | undefined;
let platformTestUid: string | undefined;
export const platformTestAccount = { email: "platform.safety@example.test", password: "Synthetic-Only-2026" };

function assertSyntheticEndpoints() {
  if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:19099") {
    throw new Error("E2E seeding is restricted to the configured local demo emulators.");
  }
}

export async function patchSyntheticTrip(fields: Partial<Caravan>) {
  assertSyntheticEndpoints();
  const env = await initializeTestEnvironment({ projectId: "demo-caravana77-test" });
  try {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "caravans/ride-a"), fields, { merge: true });
    });
  } finally { await env.cleanup(); }
}

export async function patchSyntheticMembership(organizationId: "org-a" | "org-b", role: "tenant_owner" | "staff", status: "active" | "revoked" = "active") {
  assertSyntheticEndpoints();
  if (!syntheticAdminUid) throw new Error("Seed the synthetic account first.");
  const env = await initializeTestEnvironment({ projectId: "demo-caravana77-test" });
  try {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `memberships/${syntheticAdminUid}/organizations/${organizationId}`), {
        uid: syntheticAdminUid, organizationId, role, status, createdAt: "2026-10-16", updatedAt: "2026-10-16",
      });
    });
  } finally { await env.cleanup(); }
}

// This additional global identity exists ONLY in the dedicated security suite, never npm run demo.
export async function preparePlatformSecurityIdentity() {
  assertSyntheticEndpoints();
  if (!syntheticAdminUid) throw new Error("Seed the synthetic owner first.");
  const response = await fetch("http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=synthetic-api-key", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...platformTestAccount, returnSecureToken: true }),
  });
  const data = await response.json() as { localId?: string };
  if (!response.ok || !data.localId) throw new Error("Cannot prepare isolated platform security identity.");
  platformTestUid = data.localId;
  await patchPlatformSecurityStatus("active");
  return { ownerUid: syntheticAdminUid, operatorUid: platformTestUid };
}
export async function patchPlatformSecurityStatus(status: "active" | "revoked") {
  assertSyntheticEndpoints();
  if (!platformTestUid) throw new Error("Prepare the isolated platform identity first.");
  const env = await initializeTestEnvironment({ projectId: "demo-caravana77-test" });
  try {
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), `platformOwners/${platformTestUid}`), { status });
    });
  } finally { await env.cleanup(); }
}

export async function seedSyntheticEnvironment() {
  assertSyntheticEndpoints();
  const projectId = "demo-caravana77-test";
  const env = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync("firestore.rules", "utf8") } });
  await env.clearFirestore();
  const cleared = await fetch(`http://127.0.0.1:19099/emulator/v1/projects/${projectId}/accounts`, { method: "DELETE" });
  if (!cleared.ok) throw new Error("Cannot reset synthetic Auth accounts.");
  const response = await fetch("http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=synthetic-api-key", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...testAccount, returnSecureToken: true }),
  });
  if (!response.ok) throw new Error("Cannot create synthetic Auth account.");
  const { localId } = await response.json() as { localId: string };
  syntheticAdminUid = localId;
  const trip = (id: string, organizationId: string, priceCents: number): Caravan => ({
    id, organizationId, organizerName: "Organização Sintética", name: `Caravana Sintética ${id}`, slug: `sintetica-${id}`, event: "Evento fictício",
    description: "Viagem fictícia usada exclusivamente em testes locais.", date: "2026-11-05", departureTime: "06:00", returnTime: "22:00", city: "Cidade de teste", destination: "Destino de teste", address: "Local fictício",
    priceCents, capacity: 25, reservedSeats: 1, status: "published", paymentMethod: "Pix", paymentInstructions: "Siga apenas orientações da organização. Dados sintéticos, sem transação bancária.", paymentDeadline: "2026-11-04", pixKey: "CHAVE-SINTETICA-SEM-VALOR", pixReceiver: "Recebedor fictício", whatsapp: "",
    boardingPoints: [{ id: "point-a", name: "Terminal fictício", time: "06:00", address: "Local fictício" }], benefits: ["Transporte fictício"], rules: ["Dados de demonstração"], faqs: [], announcements: [],
  });
  const registration = (id: string, caravan: Caravan, paymentTotalCents: number): Registration => ({
    id, organizationId: caravan.organizationId, caravanId: caravan.id, caravanName: caravan.name, passengerName: `Pessoa Sintética ${caravan.id}`, phone: "11900000000", email: "passenger@example.test", city: "Cidade de teste", boardingPointId: "point-a", boardingPointName: "Terminal fictício", emergencyContact: "Contato fictício", notes: "Fixture sintética", amountCents: caravan.priceCents, paymentTotalCents, registrationStatus: "confirmed", paymentStatus: "approved", createdAt: "2026-10-16T12:00:00.000Z",
  });
  const trips = [trip("ride-a", "org-a", 8500), trip("ride-a2", "org-a", 12000), trip("ride-b", "org-b", 20000)];
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, `admins/${localId}`), { organizationId: "org-a", role: "admin" });
    await setDoc(doc(db, "organizations/org-a"), { name: "Organização Sintética A" });
    await setDoc(doc(db, "organizations/org-b"), { name: "Organização Sintética B" });
    for (const [index, caravan] of trips.entries()) {
      await setDoc(doc(db, `caravans/${caravan.id}`), caravan);
      const id = String.fromCharCode(97 + index).repeat(64);
      await setDoc(doc(db, `registrations/${id}`), registration(id, caravan, index === 0 ? 2500 : caravan.priceCents));
      await setDoc(doc(db, `caravans/${caravan.id}/expenses/expense-${index}`), {
        id: `expense-${index}`, organizationId: caravan.organizationId, caravanId: caravan.id, description: `Despesa sintética ${caravan.id}`, category: "transporte", amountCents: (index + 1) * 1000, date: "2026-10-16", notes: "Fixture sintética", createdAt: "2026-10-16T12:00:00.000Z", createdBy: localId,
      });
    }
  });
  return () => env.cleanup();
}
