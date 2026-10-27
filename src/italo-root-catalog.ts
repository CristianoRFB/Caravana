import type { ExistingEventGrant } from './lib/existing-event-grant';
import { boundedPublicJson, decodePublicFields, publicDocuments } from './lib/italo-public-rest';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); e.textContent = text; if (className) e.className = className; return e;
}
function link(text: string, href: string, className: string) { const a = element('a', text, className); a.href = href; return a; }
export async function renderItaloRootCatalog(grant: ExistingEventGrant) {
  const response = await fetch(publicDocuments + ':runQuery', { method: 'POST', credentials: 'omit', redirect: 'error', cache: 'no-store',
    signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'caravans' }], where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } } }, limit: 501 } }) });
  const rows = await boundedPublicJson(response);
  if (!Array.isArray(rows) || rows.length > 500) throw Error('A agenda precisa ser conferida. Tente novamente.');
  const root = document.getElementById('root'); if (!root) throw Error('Página indisponível.');
  const header = element('header', '', 'topbar'); const nav = element('nav', '', 'topbar-inner');
  nav.append(link('CARAVANA 77', '/', 'brand'), link('Área da equipe', '/admin/login', 'button button-outline')); header.append(nav);
  const main = element('main'); const hero = element('section', '', 'hero'); const inner = element('div', '', 'hero-inner'); const copy = element('div', '', 'hero-copy');
  copy.append(element('div', 'CULTURA · VIAGENS · PESSOAS', 'eyebrow'), element('h1', 'Mais que viagens, grandes histórias.'), element('p', 'Caravanas organizadas para você chegar junto, viver o evento e voltar com lembranças novas.'), link('Encontrar minha próxima viagem', '#eventos', 'button button-primary button-large'));
  inner.append(copy); hero.append(inner); main.append(hero);
  const section = element('section', '', 'content-section index-events'); section.id = 'eventos';
  section.append(element('h2', 'Tem lugar pra você na próxima história.'), element('p', 'Vagas e detalhes são atualizados pela organização de cada caravana.'));
  const grid = element('div', '', 'public-trip-grid');
  for (const row of rows) {
    if (!row?.document) continue;
    const raw = row.document as { name?: string }; const id = raw.name?.split('/').at(-1);
    if (!id || id === grant.sourceCaravanId) continue;
    const trip = decodePublicFields(raw);
    if (trip.status !== 'published' || typeof trip.slug !== 'string' || !/^[a-z0-9][a-z0-9-]{0,159}$/.test(trip.slug) || typeof trip.name !== 'string' || trip.name.length > 120) throw Error('Há um endereço de viagem que precisa ser conferido.');
    const target = id === grant.targetCaravanId && trip.organizationId === 'italo';
    if (id === grant.targetCaravanId && !target) throw Error('A caravana precisa ser conferida.');
    const card = link('', `${target ? '/tenant-italo/o/italo' : ''}/caravana/${encodeURIComponent(trip.slug)}`, 'public-trip-card');
    card.append(element('div', typeof trip.organizerName === 'string' ? trip.organizerName : 'CARAVANA 77', 'public-trip-art'));
    const body = element('div', '', 'public-trip-content'); body.append(element('h3', trip.name));
    if (typeof trip.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(trip.date)) body.append(element('p', new Date(trip.date + 'T12:00:00').toLocaleDateString('pt-BR')));
    if (typeof trip.destination === 'string') body.append(element('p', trip.destination));
    const price = Number.isSafeInteger(trip.priceCents) && (trip.priceCents as number) >= 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((trip.priceCents as number) / 100) : 'Consulte a organização';
    body.append(element('strong', price), element('p', target && grant.phase === 'frozen' ? 'Reservas temporariamente em conferência' : 'Ver detalhes e disponibilidade'));
    card.append(body); grid.append(card);
  }
  section.append(grid.childElementCount ? grid : element('p', 'As próximas caravanas aparecerão aqui assim que estiverem disponíveis.', 'empty-box'));
  main.append(section); root.replaceChildren(header, main, element('footer', 'Caravana 77 · Cultura, viagens e pessoas.', 'footer'));
}
