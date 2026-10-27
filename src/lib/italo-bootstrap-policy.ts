import type { ExistingEventGrant } from './existing-event-grant';
import { registrationAlias } from './italo-cutover-policy';
export type BootstrapDecision = { kind: 'legacy' | 'private_history' | 'operational' | 'catalog' | 'maintenance' }
  | { kind: 'lookup'; id: string } | { kind: 'redirect'; path: string };
export function italoBootstrapDecision(grant: ExistingEventGrant | null, pathname: string,
  lookup?: { alias: unknown; registration: { organizationId?: unknown; caravanId?: unknown } | null }): BootstrapDecision {
  const prefix = '/tenant-italo';
  const privatePath = pathname === prefix || pathname.startsWith(prefix + '/');
  const path = privatePath ? pathname.slice(prefix.length) || '/' : pathname;
  if (grant?.phase === 'frozen' && !grant.everActivated && !privatePath) return { kind: 'maintenance' };
  if (!grant || !grant.everActivated) return { kind: privatePath ? 'private_history' : 'legacy' };
  const source = grant.phase === 'source_active';
  const redirect = (path: string): BootstrapDecision => path === pathname ? { kind: 'legacy' } : { kind: 'redirect', path };
  if (privatePath && !source) return { kind: 'operational' };
  if (privatePath && /^\/admin(?:\/|$)/.test(path)) return { kind: 'private_history' };
  const trip = path.match(/^\/(?:o\/italo\/)?caravana\/([^/]+)(\/inscricao)?\/?$/);
  if (trip && [grant.sourceSlug, grant.targetSlug].includes(trip[1])) return redirect(`${source ? '' : prefix + '/o/italo'}/caravana/${source ? grant.sourceSlug : grant.targetSlug}${trip[2] || ''}`);
  const registration = path.match(/^\/(?:o\/italo\/)?minha-inscricao\/([A-Za-z0-9_-]{1,128})\/?$/);
  if (registration) {
    const id = registration[1];
    if (!lookup) return { kind: 'lookup', id };
    const alias = lookup.alias === null ? null : registrationAlias(lookup.alias, id, grant);
    if (lookup.alias !== null && !alias) throw Error('BOOTSTRAP_INVALID_ALIAS');
    if (alias) return redirect(`${source ? '' : prefix + '/o/italo'}/minha-inscricao/${source ? alias.sourceId : alias.targetId}`);
    if (!source && lookup.registration?.organizationId === 'italo' && lookup.registration.caravanId === grant.targetCaravanId)
      return { kind: 'redirect', path: `${prefix}/o/italo/minha-inscricao/${id}` };
    return { kind: privatePath ? 'private_history' : 'legacy' };
  }
  if (!source && !privatePath && path === '/') return { kind: 'catalog' };
  if (source && privatePath && (path === '/' || path === '/o/italo')) return { kind: 'redirect', path: '/' };
  return { kind: privatePath ? 'private_history' : 'legacy' };
}
