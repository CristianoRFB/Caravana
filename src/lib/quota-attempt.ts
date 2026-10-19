type AttemptStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const key = (scope: string, digest: string) => `caravana77:quota-attempt:v1:${scope}:${digest}`;
// Keep command identity across an uncertain acknowledgement/reload. Store no form data or PII.
export function getQuotaAttempt(scope: string, digest: string, storage: AttemptStorage): string {
  try {
    if (!/^[a-f0-9]{64}$/.test(digest)) throw new Error("Invalid digest");
    const saved = storage.getItem(key(scope, digest));
    if (saved !== null) { if (!/^[a-f0-9]{32}$/.test(saved)) throw new Error("Invalid attempt"); return saved; }
    const id = crypto.randomUUID().replaceAll("-", ""); storage.setItem(key(scope, digest), id); return id;
  } catch { throw new Error("Não foi possível preservar esta tentativa na aba. Confira o histórico e o armazenamento antes de repetir a operação."); }
}
export function completeQuotaAttempt(scope: string, digest: string, id: string, storage: AttemptStorage) {
  try { if (storage.getItem(key(scope, digest)) === id) storage.removeItem(key(scope, digest)); } catch { /* retaining committed identity is safe */ }
}
