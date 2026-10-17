import { doc, getDocFromServer, onSnapshot, serverTimestamp, type Unsubscribe } from "firebase/firestore";
import { auth, db } from "./firebase";
import { runTransaction } from "./tracked-firestore";
import { validateTenantBranding, validTenantSlug, type TenantBranding } from "./tenant-branding";
export const brandingOperationId = () => crypto.randomUUID().replaceAll("-", "");
export function watchTenantBranding(organizationId: string, callback: (value: TenantBranding | null) => void, fail: (error: Error) => void): Unsubscribe {
  if (!db) throw new Error("Firebase não está configurado.");
  return onSnapshot(doc(db, "publicTenantSettings", organizationId), (snapshot) => {
    try { callback(snapshot.exists() ? validateTenantBranding(snapshot.data() as TenantBranding) : null); } catch { fail(new Error("A configuração pública desta organização é inválida.")); }
  }, fail);
}
export async function resolveTenantSlug(slug: string): Promise<string | null> {
  if (!db || !validTenantSlug(slug)) return null;
  const alias = await getDocFromServer(doc(db, "tenantSlugs", slug));
  const organizationId = alias.data()?.organizationId;
  if (!alias.exists() || alias.data()?.slug !== slug || typeof organizationId !== "string") return null;
  const settings = await getDocFromServer(doc(db, "publicTenantSettings", organizationId));
  if (!settings.exists() || settings.data().slug !== slug || settings.data().organizationId !== organizationId) return null;
  return organizationId;
}
export async function saveTenantBranding(input: TenantBranding, operationId = brandingOperationId()) {
  if (!db || !auth?.currentUser) throw new Error("Entre com a conta da organização.");
  if (!/^[a-f0-9]{32}$/.test(operationId)) throw new Error("Operação inválida.");
  const data = validateTenantBranding(input); const actorUid = auth.currentUser.uid; const database = db;
  const ref = doc(database, "publicTenantSettings", data.organizationId); const alias = doc(database, "tenantSlugs", data.slug); const audit = doc(database, "tenantBrandOperations", operationId);
  await runTransaction(database, async (tx) => {
    const [existing, current, binding] = await Promise.all([tx.get(audit), tx.get(ref), tx.get(alias)]);
    if (existing.exists()) {
      const old = existing.data(); const fields = Object.keys(data) as (keyof TenantBranding)[];
      if (old.actorUid !== actorUid || old.organizationId !== data.organizationId || fields.some((key) => old.settings?.[key] !== data[key])) throw new Error("Operação já utilizada com outros dados.");
      return;
    }
    if (current.exists() && current.data().slug !== data.slug) throw new Error("O endereço público já foi definido. Ele é preservado para manter os links compartilhados.");
    if (binding.exists() && binding.data().organizationId !== data.organizationId) throw new Error("Este endereço público já pertence a outra organização.");
    const settings = { ...data, updatedAt: serverTimestamp(), lastBrandOperationId: operationId };
    tx.set(ref, settings);
    if (!binding.exists()) tx.set(alias, { slug: data.slug, organizationId: data.organizationId });
    tx.set(audit, { organizationId: data.organizationId, actorUid, at: serverTimestamp(), action: "branding_saved", slug: data.slug, settings });
  });
}
