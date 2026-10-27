import { useEffect, useState, type ReactNode } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { existingEventGrant } from './existing-event-grant';
import { operationalScope } from './italo-operational-scope';
import { OperationalContext, type OperationalState } from './italo-operational-context';
export function ItaloOperationalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OperationalState>({ confirmed: !operationalScope, grant: null, readOnly: Boolean(operationalScope) });
  useEffect(() => {
    if (!operationalScope || !db) return;
    return onSnapshot(doc(db, 'publicTenantCutovers', 'italo'), { includeMetadataChanges: true }, snapshot => {
      const confirmed = !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites;
      const grant = confirmed ? existingEventGrant(snapshot.data()) : null;
      setState({ confirmed, grant, readOnly: !confirmed || !grant?.everActivated || grant.phase !== 'target_active' });
    }, () => setState({ confirmed: false, grant: null, readOnly: true }));
  }, []);
  return <OperationalContext.Provider value={state}>{children}</OperationalContext.Provider>;
}
