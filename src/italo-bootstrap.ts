import { existingEventGrant } from './lib/existing-event-grant';
import { italoBootstrapDecision } from './lib/italo-bootstrap-policy';
import { boundedPublicJson, publicDocument, PublicMetadataDenied } from './lib/italo-public-rest';
interface Asset { path: string; sha256: string }
interface RuntimeApp { entry: Asset; styles: Asset[] }
interface Runtime { version: 'italo-bootstrap-v1'; source: string; projectId: 'caravana-af306'; legacy: RuntimeApp; privateHistory: RuntimeApp; operational: RuntimeApp }
function asset(value: Asset, extension: 'js' | 'css') {
  if (!value || !/^[a-f0-9]{64}$/.test(value.sha256) || !new RegExp(`^/(?:tenant-italo/)?assets/[A-Za-z0-9_-]+\\.${extension}$`).test(value.path)) throw Error('Arquivo de aplicativo indisponível.');
  const bytes = value.sha256.match(/../g)!.map(pair => parseInt(pair, 16));
  return { url: value.path, integrity: 'sha256-' + btoa(String.fromCharCode(...bytes)) };
}
async function runtime(): Promise<Runtime> {
  const script = document.querySelector<HTMLScriptElement>('script[data-italo-runtime]'); const path = script?.dataset.italoRuntime;
  if (!path || !/^\/tenant-italo\/runtime-[a-f0-9]{12}\.json$/.test(path)) throw Error('Página indisponível.');
  const response = await fetch(path, { credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000) });
  const data = await boundedPublicJson(response) as Runtime;
  if (data.version !== 'italo-bootstrap-v1' || data.projectId !== 'caravana-af306' || !/^[a-f0-9]{40}$/.test(data.source)) throw Error('Versão do aplicativo indisponível.');
  for (const app of [data.legacy, data.privateHistory, data.operational]) {
    asset(app?.entry, 'js'); if (!Array.isArray(app.styles) || app.styles.length > 5) throw Error('Página indisponível.');
    app.styles.forEach(item => asset(item, 'css'));
  }
  return data;
}
function loadStyles(app: RuntimeApp) {
  for (const item of app.styles) {
    const checked = asset(item, 'css'); const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = checked.url; link.integrity = checked.integrity; link.crossOrigin = 'anonymous'; document.head.append(link);
  }
}
function loadApp(app: RuntimeApp) {
  loadStyles(app); const entry = asset(app.entry, 'js'); const script = document.createElement('script');
  script.type = 'module'; script.src = entry.url; script.integrity = entry.integrity; script.crossOrigin = 'anonymous';
  script.addEventListener('error', () => maintenance(), { once: true }); document.head.append(script);
}
function maintenance() {
  const root = document.getElementById('root'); if (!root) return;
  const main = document.createElement('main'); main.style.cssText = 'max-width:42rem;margin:4rem auto;padding:1.5rem;font-family:system-ui';
  const title = document.createElement('h1'); title.textContent = 'Estamos conferindo a disponibilidade';
  const text = document.createElement('p'); text.textContent = 'Seus dados foram preservados. Atualize esta página em alguns instantes ou fale com a organização antes de iniciar outra reserva.';
  const reload = document.createElement('button'); reload.textContent = 'Atualizar página'; reload.onclick = () => location.reload(); main.append(title, text, reload); root.replaceChildren(main);
}
async function start() {
  const config = await runtime();
  const raw = await publicDocument('publicTenantCutovers/italo');
  const grant = raw === null ? null : existingEventGrant(raw);
  if (raw !== null && !grant) throw Error('A transferência precisa ser conferida.');
  let decision = italoBootstrapDecision(grant, location.pathname);
  if (decision.kind === 'lookup') {
    const id = decision.id;
    const opaque = /^[a-f0-9]{64}$/.test(id);
    let alias: Record<string, unknown> | null;
    if (!opaque) alias = await (await import('./lib/italo-bootstrap-owner-alias')).readExistingOwnerAlias(id);
    else {
      try { alias = await publicDocument('legacyRegistrationAliases/' + id); }
      catch (cause) {
        if (!(cause instanceof PublicMetadataDenied)) throw cause;
        alias = await (await import('./lib/italo-bootstrap-owner-alias')).readExistingOwnerAlias(id);
        if (!alias) throw cause;
      }
    }
    const registration = alias === null && opaque ? await publicDocument('registrations/' + id) : null;
    decision = italoBootstrapDecision(grant, location.pathname, { alias, registration });
  }
  if (decision.kind === 'redirect') { location.replace(decision.path + location.search + location.hash); return; }
  if (decision.kind === 'maintenance') { maintenance(); return; }
  if (decision.kind === 'catalog' && grant) { loadStyles(config.legacy); await (await import('./italo-root-catalog')).renderItaloRootCatalog(grant); return; }
  if (decision.kind === 'lookup') throw Error('O vínculo da inscrição precisa ser conferido.');
  loadApp(decision.kind === 'operational' ? config.operational : decision.kind === 'private_history' ? config.privateHistory : config.legacy);
}
void start().catch(() => maintenance());
