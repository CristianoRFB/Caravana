export function chooseTenant(available: { organizationId: string }[], selected: string | null, preferred: string | null): string | null {
  if (available.some((item) => item.organizationId === selected)) return selected;
  if (available.some((item) => item.organizationId === preferred)) return preferred;
  return available[0]?.organizationId || null;
}
export const tenantPreferenceKey = (uid: string) => `caravana77:tenant:v1:${uid}`;
