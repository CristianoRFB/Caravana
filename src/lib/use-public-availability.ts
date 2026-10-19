import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import type { Caravan } from "./types";
import type { PublicEntitlements } from "./commercial-data";
import { publicAvailability } from "./public-availability";

export function usePublicAvailability(caravan: Caravan | null) {
  const organizationId = caravan?.organizationId || "";
  const caravanId = caravan?.id || "";
  const key = `${organizationId}:${caravanId}`;
  const [state, setState] = useState<{ key: string; policy?: PublicEntitlements | null; suspended?: boolean; trip?: Caravan; error?: boolean }>({ key: "" });
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!db || !organizationId || !caravanId) return;
    let active = true;
    let policy: PublicEntitlements | null | undefined;
    let suspended: boolean | undefined;
    let trip: Caravan | undefined;
    let error = false;
    const publish = () => { if (active) setState({ key, policy, suspended, trip, error }); };
    const fail = () => { error = true; publish(); };
    const stops = [
      onSnapshot(doc(db, "tenantEntitlements", organizationId), { includeMetadataChanges: true }, (snapshot) => {
        policy = !snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites ? snapshot.exists() ? snapshot.data() as PublicEntitlements : null : undefined;
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
    return () => { active = false; stops.forEach((stop) => stop()); clearInterval(timer); };
  }, [key, organizationId, caravanId]);
  const confirmed = state.key === key && state.policy !== undefined && state.suspended !== undefined && state.trip !== undefined;
  if (state.key === key && state.error) return { availableSeats: null, capacityLimit: null, canReserve: false, label: "Não foi possível confirmar as vagas" };
  return publicAvailability(state.trip || caravan || { capacity: 0, reservedSeats: 0, status: "draft" }, state.policy || null, state.suspended || false, confirmed, now);
}
