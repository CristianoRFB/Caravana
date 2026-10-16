import { collection, getDocsFromServer } from "firebase/firestore";
import { db } from "./firebase";
import { diagnoseFinancialLedger } from "./financial-diagnostics";
import type { PassengerPayment, Registration } from "./types";
export async function inspectFinancialLedger(registrations: Registration[]) {
  if (!db) throw new Error("Firebase não está configurado.");
  const database = db; const payments: PassengerPayment[] = [];
  // Bound concurrency and server reads; no downloads of proof/authorization and no writes/backfill.
  for (let offset = 0; offset < registrations.length; offset += 5) {
    const batch = await Promise.all(registrations.slice(offset, offset + 5).map((reg) => getDocsFromServer(collection(database, "registrations", reg.id, "payments"))));
    for (const snapshot of batch) payments.push(...snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as PassengerPayment));
  }
  return diagnoseFinancialLedger(registrations, payments);
}
