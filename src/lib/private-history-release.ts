import type { TenantAccess } from './tenant-access';

export const PRIVATE_HISTORY_BASE = '/tenant-italo/';
export function resolvePrivateHistoryScope(scope: string | undefined, base: string): 'italo' | null {
  if (!scope) return null;
  if (scope !== 'italo' || base !== PRIVATE_HISTORY_BASE) throw new Error('Acesso histórico exige o tenant e o endereço de publicação revisados.');
  return 'italo';
}
export function scopePrivateHistoryAccess(available: TenantAccess[], scope: 'italo' | null): TenantAccess[] {
  return scope ? available.filter(item => item.organizationId === scope && item.source === 'membership' && item.role === 'tenant_owner') : available;
}
export function privateHistoryRouteAllowed(pathname: string): boolean {
  return /^\/admin(?:\/login|\/caravanas(?:\/[^/]+\/(?:passageiros|financeiro))?|\/financeiro|\/comprovantes|\/check-in(?:\/[^/]+)?|\/relatorios|\/roteiros|\/diagnostico)?\/?$/.test(pathname);
}
export const privateHistoryScope = resolvePrivateHistoryScope(import.meta.env.VITE_PRIVATE_HISTORY_TENANT, import.meta.env.BASE_URL);
