export function resolveOperationalScope(scope: string | undefined, base: string): 'italo' | null {
  if (!scope) return null;
  if (scope !== 'italo' || base !== '/tenant-italo/') throw Error('Operação do Ítalo exige o tenant e o endereço revisados.');
  return 'italo';
}
export const operationalScope = resolveOperationalScope(import.meta.env.VITE_ITALO_OPERATIONAL_TENANT, import.meta.env.BASE_URL);
export function operationalRouteAllowed(path: string): boolean {
  const publicPath = path === '/o/italo' || path === '/o/italo/' ? '/' : path.startsWith('/o/italo/') ? path.slice('/o/italo'.length) : path;
  return /^\/(?:caravana\/[^/]+(?:\/inscricao)?|minha-inscricao\/[A-Za-z0-9_-]{1,128})\/?$/.test(publicPath)
    || /^\/admin(?:\/login|\/caravanas(?:\/[^/]+\/(?:passageiros|financeiro))?|\/financeiro|\/comprovantes|\/check-in(?:\/[^/]+)?|\/relatorios|\/roteiros|\/diagnostico)?\/?$/.test(path)
    || publicPath === '/';
}
