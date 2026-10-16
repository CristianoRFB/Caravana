type AttemptStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const key = (scope: string) => `caravana77:financial-attempt:v1:${scope}`;
export function getFinancialAttempt(scope: string, storage: AttemptStorage): string {
  try {
    const saved = storage.getItem(key(scope));
    if (saved !== null) { if (!/^[a-f0-9]{32}$/.test(saved)) throw new Error("Invalid attempt"); return saved; }
    const id = crypto.randomUUID().replaceAll("-", ""); storage.setItem(key(scope), id); return id;
  } catch { throw new Error("Não foi possível preservar a tentativa nesta aba. Confira o histórico e o armazenamento antes de iniciar outro lançamento."); }
}
export function completeFinancialAttempt(scope: string, id: string, storage: AttemptStorage) {
  // Retaining a committed ID is safe: replay reads the exact server event and never adds the amount twice.
  try { if (storage.getItem(key(scope)) === id) storage.removeItem(key(scope)); } catch { /* keep committed identity */ }
}
