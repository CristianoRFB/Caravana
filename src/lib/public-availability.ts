import type { Caravan } from "./types";
import type { PublicEntitlements } from "./commercial-data";

export interface PublicAvailability {
  availableSeats: number | null;
  capacityLimit: number | null;
  canReserve: boolean;
  label: string;
}
// Display projection only. Reservation transactions and Rules remain authoritative.
export function publicAvailability(
  caravan: Pick<Caravan, "status" | "capacity" | "reservedSeats">,
  policy: PublicEntitlements | null,
  suspended: boolean,
  confirmed: boolean,
  now = Date.now(),
  existingCapacity: number | null = null,
): PublicAvailability {
  const unavailable = (label: string): PublicAvailability => ({ availableSeats: null, capacityLimit: null, canReserve: false, label });
  if (!confirmed) return unavailable("Confirmando vagas…");
  if (!policy && !suspended && caravan.status === 'published' && Number.isSafeInteger(existingCapacity)
    && existingCapacity === caravan.capacity && caravan.capacity > 0 && Number.isSafeInteger(caravan.reservedSeats)
    && caravan.reservedSeats >= 0 && caravan.reservedSeats <= caravan.capacity) {
    const availableSeats = caravan.capacity - caravan.reservedSeats;
    return { availableSeats, capacityLimit: caravan.capacity, canReserve: availableSeats > 0,
      label: availableSeats ? `${availableSeats} ${availableSeats === 1 ? 'vaga disponível' : 'vagas disponíveis'}` : 'Vagas esgotadas' };
  }
  if (suspended || !policy?.growthEnabled || (policy.growthUntil && policy.growthUntil.toMillis() <= now) || caravan.status !== "published") return unavailable("Novas reservas indisponíveis no momento");
  const limit = policy.limits?.passengersPerCaravan;
  if (![limit, caravan.capacity, caravan.reservedSeats].every(Number.isSafeInteger) || limit < 1 || caravan.capacity < 1 || caravan.reservedSeats < 0) return unavailable("Vagas indisponíveis para consulta");
  const capacityLimit = Math.min(caravan.capacity, limit);
  const availableSeats = Math.max(0, capacityLimit - caravan.reservedSeats);
  return { availableSeats, capacityLimit, canReserve: availableSeats > 0, label: availableSeats ? `${availableSeats} ${availableSeats === 1 ? "vaga disponível" : "vagas disponíveis"}` : "Vagas esgotadas" };
}
