import { captureDiagnosticContext, recordDiagnosticFailure } from "./diagnostics";
let pending = 0;
const observers = new Set<() => void>();
export const pendingWrites = () => pending;
export function observePendingWrites(observer: () => void): () => void {
  observers.add(observer);
  return () => { observers.delete(observer); };
}
export async function trackWrite<T>(operation: () => Promise<T>): Promise<T> {
  const diagnosticContext = captureDiagnosticContext();
  pending++;
  observers.forEach((observer) => observer());
  try { return await operation(); }
  catch (cause) { recordDiagnosticFailure(cause,"operation",diagnosticContext); throw cause; }
  finally {
    pending--;
    observers.forEach((observer) => observer());
  }
}
