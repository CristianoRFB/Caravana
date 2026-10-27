import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from './firebase';
export async function readExistingOwnerAlias(id: string): Promise<Record<string, unknown> | null> {
  if (!auth || !db || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) return null;
  const current = await new Promise<boolean>((resolve, reject) => {
    const timer = setTimeout(() => { unsubscribe(); reject(Error('Não foi possível conferir sua sessão. Atualize a página.')); }, 12000);
    const unsubscribe = onAuthStateChanged(auth!, user => { clearTimeout(timer); unsubscribe(); resolve(Boolean(user)); }, cause => { clearTimeout(timer); unsubscribe(); reject(cause); });
  });
  if (!current) return null;
  try {
    const snapshot = await getDocFromServer(doc(db, 'legacyRegistrationAliases', id));
    return snapshot.exists() ? snapshot.data() : null;
  } catch (cause) {
    if ((cause as { code?: string }).code === 'permission-denied') return null;
    throw cause;
  }
}
