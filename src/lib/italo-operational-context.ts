import { createContext, useContext } from 'react';
import type { ExistingEventGrant } from './existing-event-grant';
import { operationalScope } from './italo-operational-scope';
export interface OperationalState { confirmed: boolean; grant: ExistingEventGrant | null; readOnly: boolean }
export const OperationalContext = createContext<OperationalState>({ confirmed: !operationalScope, grant: null, readOnly: Boolean(operationalScope) });
export const useItaloOperational = () => useContext(OperationalContext);
