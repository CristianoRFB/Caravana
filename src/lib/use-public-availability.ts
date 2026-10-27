import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import type { Caravan } from "./types";
import type { PublicEntitlements } from "./commercial-data";
import { publicAvailability } from "./public-availability";
import { existingEventCapacity } from './existing-event-grant';

export function usePublicAvailability(caravan: Caravan | null) {
  const organizationId = caravan?.organizationId || "";
  const caravanId = caravan?.id || "";
  const key = `${organizationId}:${caravanId}`;
  const [state, setState] = useState<{ key: string; policy?: PublicEntitlements | null; suspended?: boolean; trip?: Caravan; directory?: unknown; directoryConfirmed?: boolean; error?: boolean }>({ key: "" });
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!db || !organizationId || !caravanId) return;
    let active = true;
    let policy: PublicEntitlements | null | undefined;
    let suspended: boolean | undefined;
    let trip: Caravan | undefined;
    let error = false;
    let directory: unknown, directoryConfirmed = organizationId !== 'italo';
    let stopDirectory: (() => void) | undefined;
    const publish = () => { if (active) setState({ key, policy, suspended, trip, directory, directoryConfirmed, error }); };
    const fail = () => { error = true; publish(); };
    const stops = [
      onSnapshot(doc(db, "tenantEntitlements", organizationId), { includeMetadataChanges: true }, (snapshot) => {
        policy = !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites ? snapshot.exists() ? snapshot.data() as PublicEntitlements : null : undefined;
        if (policy !== undefined && policy !== null) {
          stopDirectory?.(); stopDirectory = undefined; directory = undefined; directoryConfirmed = true;
        } else if (policy === null && organizationId === 'italo' && !stopDirectory) {
          directoryConfirmed = false;
          stopDirectory = onSnapshot(doc(db!, 'publicTenantCutovers', 'italo'), { includeMetadataChanges: true }, directorySnapshot => {
            directoryConfirmed = !directorySnapshot.metadata.fromCache && !directorySnapshot.metadata.hasPendingWrites;
            directory = directoryConfirmed ? directorySnapshot.data() : undefined; publish();
          }, () => { directory = undefined; directoryConfirmed = true; publish(); });
        }
        publish();
      }, fail),
      onSnapshot(doc(db, "organizationAvailability", organizationId), { includeMetadataChanges: true }, (snapshot) => {
        suspended = !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites ? snapshot.data()?.status === "suspended" : undefined;
        publish();
      }, fail),
      onSnapshot(doc(db, "caravans", caravanId), { includeMetadataChanges: true }, (snapshot) => {
        trip = !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites && snapshot.exists() && snapshot.data().organizationId === organizationId ? { ...snapshot.data(), id: snapshot.id } as Caravan : undefined;
        publish();
      }, fail),
    ];
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { active = false; stopDirectory?.(); stops.forEach((stop) => stop()); clearInterval(timer); };
  }, [key, organizationId, caravanId]);
  const confirmed = state.key === key && state.policy !== undefined && state.suspended !== undefined && state.trip !== undefined
    && (state.policy !== null || state.directoryConfirmed === true);
  if (state.key === key && state.error) return { availableSeats: null, capacityLimit: null, canReserve: false, label: "Não foi possível confirmar as vagas" };
  const existingCapacity = state.directoryConfirmed && state.trip ? existingEventCapacity(state.directory, state.trip) : null;
  return publicAvailability(state.trip || caravan || { capacity: 0, reservedSeats: 0, status: "draft" }, state.policy || null, state.suspended || false, confirmed, now, existingCapacity);
}
