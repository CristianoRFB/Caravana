export type TenantRole = "tenant_owner" | "staff";
export type MembershipStatus = "active" | "revoked";

export interface Membership {
  uid: string;
  organizationId: string;
  role: TenantRole;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  legacySourcePath?: string;
}

export function membershipPath(uid: string, organizationId: string): string {
  if (![uid, organizationId].every((part) => part.length > 0 && part.length <= 1500 && !part.includes("/") && ![".", ".."].includes(part))) {
    throw new Error("UID e organização devem ser IDs de documento válidos.");
  }
  // Nested IDs avoid ambiguous concatenations and preserve existing IDs verbatim.
  return `memberships/${uid}/organizations/${organizationId}`;
}

export function isActiveMembership(value: unknown, uid: string, organizationId: string): value is Membership {
  if (typeof value !== "object" || value === null) return false;
  const membership = value as Partial<Membership>;
  return membership.uid === uid && membership.organizationId === organizationId && membership.status === "active" && ["tenant_owner", "staff"].includes(membership.role || "");
}
