import type { Caravan } from "./lib/types";
import { usePublicAvailability } from "./lib/use-public-availability";

export default function PublicSeatCount({ caravan }: { caravan: Caravan }) {
  return <span>{usePublicAvailability(caravan).label}</span>;
}
