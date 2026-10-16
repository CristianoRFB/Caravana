let pending = 0;
const observers = new Set<() => void>();
export const pendingWrites = () => pending;
export function observePendingWrites(observer: () => void): () => void {
  observers.add(observer);
  return () => { observers.delete(observer); };
}
export async function trackWrite<T>(operation: () => Promise<T>): Promise<T> {
  pending++;
  observers.forEach((observer) => observer());
  try { return await operation(); }
  finally {
    pending--;
    observers.forEach((observer) => observer());
  }
}
