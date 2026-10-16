import { DEMO_ACCOUNTS } from "../src/lib/demo-identities.ts";

export function assertDemoSeedEnvironment() {
  if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:18080" || process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:19099" ||
      (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== "demo-caravana77-test")) {
    throw new Error("Demo seed is restricted to the exact local Auth/Firestore emulators and demo-caravana77-test.");
  }
}

export async function seedDemoAccounts() {
  assertDemoSeedEnvironment();
  // SDK imports happen only after the endpoint guard. No production credentials or ADC.
  const { initializeTestEnvironment } = await import("@firebase/rules-unit-testing");
  const { doc, runTransaction } = await import("firebase/firestore");
  const accounts = {};
  for (const [key, account] of Object.entries(DEMO_ACCOUNTS)) {
    const request = async (action) => {
      const response = await fetch(`http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:${action}?key=synthetic-api-key`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: account.email, password: account.password, returnSecureToken: true }),
      });
      return { ok: response.ok, body: await response.json() };
    };
    let result = await request("signUp");
    if (!result.ok && result.body.error?.message === "EMAIL_EXISTS") result = await request("signInWithPassword");
    if (!result.ok || typeof result.body.localId !== "string") throw new Error(`Cannot prepare demo account ${account.email}; existing credentials are never reset.`);
    accounts[key] = { uid: result.body.localId, email: account.email, role: account.role };
    // Do not persist or print idToken/refreshToken returned by Auth.
  }
  const env = await initializeTestEnvironment({ projectId: "demo-caravana77-test" });
  const ids = { passenger: "d".repeat(64), pending: "e".repeat(64), other: "f".repeat(64) };
  const documents = [];
  const add = (path, data, identityFields = []) => documents.push({ path, data, identityFields });
  const at = "2026-10-16T12:00:00.000Z";
  const pdf = Buffer.from("%PDF-1.4\nCOMPROVANTE FICTICIO SEM VALOR BANCARIO").toString("base64");
  for (const [suffix, owner] of [["a", accounts.owner], ["b", accounts.ownerB]]) {
    const organizationId = `demo-org-${suffix}`;
    const caravanId = `demo-ride-${suffix}`;
    add(`organizations/${organizationId}`, { name: `Organizadora Demonstrativa ${suffix.toUpperCase()}`, status: "active", synthetic: true }, ["synthetic"]);
    add(`memberships/${owner.uid}/organizations/${organizationId}`, { uid: owner.uid, organizationId, role: "tenant_owner", status: "active", createdAt: at, updatedAt: at }, ["uid", "organizationId", "role", "status"]);
    add(`profiles/${owner.uid}`, { displayName: `Admin de demonstração ${suffix.toUpperCase()}`, role: "tenant_owner", synthetic: true }, ["role", "synthetic"]);
    add(`caravans/${caravanId}`, {
      id: caravanId, organizationId, organizerName: `Organizadora Demonstrativa ${suffix.toUpperCase()}`, name: `Viagem demonstrativa ${suffix.toUpperCase()}`, slug: `demonstracao-${suffix}`, event: "Evento fictício", description: "Ambiente local com dados inteiramente fictícios.",
      status: "published", date: "2026-12-15", departureTime: "06:00", returnTime: "22:00", city: "Cidade fictícia", destination: "Destino fictício", address: "Local fictício", capacity: 25, reservedSeats: suffix === "a" ? 2 : 1, priceCents: 8500,
      paymentMethod: "Pix", paymentInstructions: "Demonstração: nenhum pagamento deve ser realizado. Envie somente arquivos fictícios para experimentar a conferência manual.", paymentDeadline: "2026-12-14", pixKey: "DEMONSTRACAO-NAO-PAGAR", pixReceiver: "Recebedor fictício", whatsapp: "",
      boardingPoints: [{ id: "demo-point", name: "Terminal fictício", address: "Local fictício", time: "06:00" }], benefits: [], rules: ["Demonstração sem valor real"], faqs: [], announcements: [],
    }, ["organizationId", "slug"]);
    const registrationIds = suffix === "a" ? [ids.passenger, ids.pending] : [ids.other];
    for (const id of registrationIds) {
      const pending = id === ids.pending;
      add(`registrations/${id}`, { id, organizationId, caravanId, caravanName: `Viagem demonstrativa ${suffix.toUpperCase()}`, passengerName: pending ? "Pessoa fictícia aguardando análise" : suffix === "a" ? "Passageiro de demonstração" : "Passageiro fictício B", phone: "11900000000", email: id === ids.passenger ? DEMO_ACCOUNTS.passenger.email : "", city: "Cidade fictícia", boardingPointId: "demo-point", boardingPointName: "Terminal fictício", emergencyContact: "Contato fictício", notes: "SYNTHETIC_ONLY", amountCents: 8500, paymentTotalCents: pending ? 0 : 2500, registrationStatus: pending ? "awaiting_review" : "confirmed", paymentStatus: pending ? "awaiting_review" : "approved", proofId: "current", createdAt: at }, ["organizationId", "caravanId", "notes"]);
      add(`registrations/${id}/proofs/current`, { registrationId: id, organizationId, caravanId, contentType: "application/pdf", fileName: "comprovante-ficticio.pdf", content: pdf, uploadedAt: new Date(at) }, ["organizationId", "registrationId"]);
      if (!pending) add(`registrations/${id}/payments/demo-payment`, { id: "demo-payment", registrationId: id, organizationId, caravanId, amountCents: 2500, method: "pix", notes: "Lançamento fictício, nenhum dinheiro movimentado", status: "active", createdAt: at, createdBy: owner.uid, paymentDate: "2026-10-16" }, ["organizationId", "registrationId"]);
    }
    add(`caravans/${caravanId}/expenses/demo-expense`, { id: "demo-expense", organizationId, caravanId, description: "Despesa demonstrativa", category: "transporte", amountCents: 1000, date: "2026-10-16", notes: "Valor fictício", createdAt: at, createdBy: owner.uid }, ["organizationId", "caravanId"]);
  }
  add(`profiles/${accounts.passenger.uid}`, { displayName: "Passageiro de demonstração", role: "passenger", synthetic: true, registrationIds: [ids.passenger] }, ["role", "synthetic"]);
  let created = 0;
  try {
    // Elevated fixture preparation only; the running application signs in normally and uses Rules.
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await runTransaction(db, async (transaction) => {
        const snapshots = [];
        for (const item of documents) snapshots.push(await transaction.get(doc(db, item.path)));
        for (let index = 0; index < documents.length; index++) {
          const item = documents[index];
          const existing = snapshots[index];
          if (existing.exists()) {
            for (const field of item.identityFields) if (existing.data()[field] !== item.data[field]) throw new Error(`Demo fixture conflict at ${item.path}; no existing permissions or records were overwritten.`);
          }
        }
        let additions = 0;
        for (let index = 0; index < documents.length; index++) {
          if (!snapshots[index].exists()) { transaction.set(doc(db, documents[index].path), documents[index].data); additions++; }
        }
        created = additions;
      });
    });
  } finally { await env.cleanup(); }
  return { source: "SYNTHETIC_ONLY", projectId: "demo-caravana77-test", accounts, registrationIds: ids, created, preserved: documents.length - created, platformOwnersCreated: 0 };
}
