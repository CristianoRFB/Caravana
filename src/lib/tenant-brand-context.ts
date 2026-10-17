import { createContext, useContext } from "react";
import type { TenantBranding } from "./tenant-branding";
export interface TenantBrandState { organizationId: string; tenantSlug: string; branding: TenantBranding | null }
export const TenantBrandContext = createContext<TenantBrandState>({ organizationId: "", tenantSlug: "", branding: null });
export const useTenantBrand = () => useContext(TenantBrandContext);
