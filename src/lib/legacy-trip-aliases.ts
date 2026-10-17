export interface LegacyPublicTrip { id: string; organizationId: string; slug: string; status: string }
export interface LegacyTripAlias { caravanId: string; organizationId: string }
export interface LegacyAliasPlan { creates: Record<string, LegacyTripAlias>; unchanged: string[]; conflicts: { slug: string; reason: string }[] }
// Pure simulation over an explicitly supplied legacy inventory. No SDK, network, backfill or deletion.
export function planLegacyTripAliases(trips: LegacyPublicTrip[], existing: Record<string, LegacyTripAlias>): LegacyAliasPlan {
  const result: LegacyAliasPlan = { creates: {}, unchanged: [], conflicts: [] };
  const grouped = new Map<string, LegacyPublicTrip[]>();
  for (const trip of trips) {
    if (trip.status !== "published") continue;
    if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(trip.slug) || !trip.id || !trip.organizationId || [trip.id, trip.organizationId].some((id) => id.includes("/") || [".", ".."].includes(id))) { result.conflicts.push({ slug: trip.slug || "", reason: "Inventário possui endereço ou IDs inválidos." }); continue; }
    grouped.set(trip.slug, [...(grouped.get(trip.slug) || []), trip]);
  }
  for (const [slug, candidates] of Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    const unique = new Map(candidates.map((trip) => [`${trip.organizationId}/${trip.id}`, trip]));
    if (unique.size !== 1) { result.conflicts.push({ slug, reason: "Mais de um destino no inventário legado; exige revisão humana." }); continue; }
    const trip = candidates[0]; const desired = { caravanId: trip.id, organizationId: trip.organizationId };
    if (Object.hasOwn(existing, slug)) {
      if (existing[slug].caravanId === trip.id && existing[slug].organizationId === trip.organizationId) result.unchanged.push(slug);
      else result.conflicts.push({ slug, reason: "Alias existente aponta outro destino; não substituir." });
    } else result.creates[slug] = desired;
  }
  return result;
}
