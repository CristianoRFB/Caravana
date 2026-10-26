// Read-only production adapter. Network is injectable for synthetic tests only.
import { SOURCE, ROOT, encoded, documentPath, requireThat, canonical } from './safety.mjs';
import { createHash } from 'node:crypto';
const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
export async function boundedBody(response, max = 4 * 1024 * 1024) {
  requireThat(response.status === 200, `READ_HTTP_${response.status}`);
  const chunks = []; let size = 0;
  for await (const part of response.body) {
    size += part.length;
    if (size > max) { await response.body.cancel?.().catch(() => {}); throw Error('RESPONSE_BOUND'); }
    chunks.push(Buffer.from(part));
  }
  return Buffer.concat(chunks);
}
export class GoogleSource {
  constructor(token, fetcher = fetch) { this.token = token; this.fetcher = fetcher; this.calls = 0; }
  async request(service, resource, query = {}, body) {
    requireThat(typeof resource==='string'&&resource.split('/').every(p=>p&&!['.','..'].includes(p)&&!/[\x00-\x1f]/.test(p)),'SOURCE_PATH_REFUSED');
    const services = { firebase: ['firebase.googleapis.com', 'v1beta1'], firestore: ['firestore.googleapis.com', 'v1'],
      auth: ['identitytoolkit.googleapis.com', 'v1'], authConfig: ['identitytoolkit.googleapis.com', 'admin/v2'],
      billing: ['cloudbilling.googleapis.com', 'v1'], rules: ['firebaserules.googleapis.com', 'v1'], storage: ['storage.googleapis.com', 'storage/v1'] };
    requireThat(Object.hasOwn(services, service), 'SERVICE_REFUSED');
    const projectPrefix = `projects/${SOURCE}`;
    const projectResource = resource === projectPrefix || resource.startsWith(projectPrefix + '/');
    const storageResource = service === 'storage' && (resource === 'b' && query.project === SOURCE || /^b\/[^/]+\/(?:o(?:\/[^/]+)?|iam)$/.test(resource) && this.buckets?.has(decodeURIComponent(resource.split('/')[1])));
    requireThat(projectResource || storageResource, 'SOURCE_TARGET_REFUSED');
    requireThat(body === undefined || service === 'firestore' && resource.endsWith(':listCollectionIds'), 'SOURCE_MUTATION_REFUSED');
    if (++this.calls > 20000) throw Error('REQUEST_BOUND');
    const [host, version] = services[service];
    const u = new URL(`https://${host}/${version}/${service === 'storage' ? resource : encoded(resource).replace(/%3A(listCollectionIds|batchGet)$/, ':$1')}`);
    for (const [k, v] of Object.entries(query)) if (v !== undefined) u.searchParams.set(k, String(v));
    const r = await this.fetcher(u, { method: body === undefined ? 'GET' : 'POST', redirect: 'error',
      signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${this.token}`, ...(['auth','authConfig'].includes(service)?{'x-goog-user-project':SOURCE}:{}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    // Object media remains a bounded stream; never JSON-decode or log it.
    if (service === 'storage' && query.alt === 'media') { requireThat(r.status === 200, `OBJECT_HTTP_${r.status}`); return r; }
    return { data: JSON.parse((await boundedBody(r)).toString('utf8')), date: r.headers.get('date') };
  }
  async pages(service, resource, key, query = {}, body) {
    const values = [], tokens = new Set(); let token;
    for (let n = 0; n < 200; n++) {
      const result = await this.request(service, resource, body ? query : { ...query, ...(token ? { [service === 'auth' ? 'nextPageToken' : 'pageToken']: token } : {}) },
        body ? { ...body, ...(token ? { pageToken: token } : {}) } : undefined);
      const list = result.data[key] || []; requireThat(Array.isArray(list), 'INVALID_PAGE'); values.push(...list);
      requireThat(values.length <= 15000, 'ITEM_BOUND');
      requireThat(Buffer.byteLength(canonical(values))<=64*1024*1024,'PAGE_MEMORY_BOUND');
      token = result.data.nextPageToken;
      if (!token) return values;
      requireThat(typeof token === 'string' && !tokens.has(token), 'PAGINATION_LOOP'); tokens.add(token);
    }
    throw Error('PAGE_BOUND');
  }
  async metadata() {
    const prefix = `projects/${SOURCE}`;
    const project = await this.request('firebase', prefix);
    requireThat(project.data.projectId === SOURCE && project.data.state === 'ACTIVE', 'PROJECT_MISMATCH');
    const billing = (await this.request('billing', prefix + '/billingInfo')).data;
    const database = (await this.request('firestore', prefix + '/databases/(default)')).data;
    requireThat(billing.billingEnabled === false && !billing.billingAccountName && database.freeTier === true && database.type === 'FIRESTORE_NATIVE' && database.databaseEdition === 'STANDARD', 'ZERO_BUDGET_STANDARD_REQUIRED');
    requireThat(project.date && Math.abs(Date.now() - Date.parse(project.date)) < 60000, 'SERVER_CLOCK_REQUIRED');
    this.readTime = new Date(Date.parse(project.date) - 5000).toISOString();
    return { project: project.data, billing, database };
  }
  async config() {
    const prefix = `projects/${SOURCE}`;
    const auth = (await this.request('authConfig', prefix + '/config')).data;
    // Tenant-specific Auth requires a separate supported recovery design.
    requireThat(auth.multiTenant?.allowTenants !== true, 'AUTH_MULTI_TENANT_UNSUPPORTED');
    const indexes = await this.pages('firestore', prefix + '/databases/(default)/collectionGroups/-/indexes', 'indexes', { pageSize: 0 });
    const releases = [];
    // Storage releases are bucket-specific. Discover/paginate all releases;
    // never assume a generic firebase.storage release or infer absence from404.
    const discovered=await this.pages('rules',prefix+'/releases','releases',{pageSize:100});
    requireThat(discovered.some(r=>r.name===prefix+'/releases/cloud.firestore'),'FIRESTORE_RELEASE_REQUIRED');
    requireThat(new Set(discovered.map(r=>r.name)).size===discovered.length,'DUPLICATE_RULE_RELEASE');
    for (const release of discovered) {
      requireThat(release.name?.startsWith(prefix+'/releases/'),'RELEASE_TARGET_MISMATCH');
      requireThat(release.rulesetName?.startsWith(prefix + '/rulesets/'), 'RULESET_TARGET_MISMATCH');
      releases.push({ release, ruleset: (await this.request('rules', release.rulesetName)).data });
    }
    return { auth, indexes, releases };
  }
  async users() { return this.pages('auth', `projects/${SOURCE}/accounts:batchGet`, 'users', { maxResults: 1000 }); }
  async documents() {
    requireThat(this.readTime, 'SNAPSHOT_REQUIRED');
    const documents = [], missing = [], visited = new Set(); let bytes = 0;
    const walk = async (parent, depth) => {
      requireThat(depth <= 20 && visited.size <= 15000, 'TRAVERSAL_BOUND');
      requireThat(!visited.has(parent), 'TRAVERSAL_LOOP'); visited.add(parent);
      const collections = await this.pages('firestore', parent + ':listCollectionIds', 'collectionIds', {}, { readTime: this.readTime, pageSize: 100 });
      requireThat(new Set(collections).size === collections.length, 'DUPLICATE_COLLECTION');
      for (const id of collections) {
        requireThat(typeof id === 'string' && id && !id.includes('/') && !['.', '..'].includes(id), 'COLLECTION_REFUSED');
        const page = await this.pages('firestore', parent + '/' + id, 'documents', { pageSize: 100, showMissing: true, readTime: this.readTime });
        for (const doc of page) {
          documentPath(doc.name);
          requireThat(doc.name.startsWith(parent + '/' + id + '/') && doc.name.split('/').length === parent.split('/').length + 2, 'DOCUMENT_PARENT_MISMATCH');
          bytes += Buffer.byteLength(canonical(doc)); requireThat(bytes <= 64 * 1024 * 1024, 'INVENTORY_MEMORY_BOUND');
          if (doc.createTime) { requireThat(doc.updateTime && Date.parse(doc.updateTime) <= Date.parse(this.readTime), 'SNAPSHOT_INCONSISTENT'); documents.push(doc); }
          else { requireThat(!doc.fields && !doc.updateTime, 'INVALID_MISSING_DOCUMENT'); missing.push(doc.name); }
          await walk(doc.name, depth + 1);
        }
      }
    };
    await walk(ROOT, 0);
    requireThat(new Set(documents.map(d => d.name)).size === documents.length, 'DUPLICATE_DOCUMENT');
    return { documents, missing, readTime: this.readTime };
  }
  async objects() {
    const buckets = await this.pages('storage', 'b', 'items', { project: SOURCE, maxResults: 100 });
    this.buckets = new Set(buckets.map(b => b.name));
    requireThat(this.buckets.size === buckets.length, 'DUPLICATE_BUCKET');
    const objects = [];
    for (const b of buckets) {
      requireThat(String(b.projectNumber) === String(this.projectNumber), 'BUCKET_PROJECT_MISMATCH');
      b.iamPolicy=(await this.request('storage',`b/${encodeURIComponent(b.name)}/iam`)).data;
      const items = await this.pages('storage', `b/${encodeURIComponent(b.name)}/o`, 'items', { maxResults: 100, versions: true, projection: 'full' });
      for (const o of items) {
        requireThat(o.bucket === b.name && typeof o.name === 'string' && /^\d+$/.test(o.generation) && /^\d+$/.test(o.metageneration) && /^\d+$/.test(o.size), 'INVALID_OBJECT_METADATA');
        requireThat(!o.customerEncryption, 'CUSTOMER_KEY_OBJECT_UNSUPPORTED');
        requireThat(Number.isSafeInteger(Number(o.size))&&Number(o.size)<=64*1024*1024,'OBJECT_SIZE_BOUND');objects.push(o);
      }
    }
    return { buckets, objects };
  }
  async *bytes(object) {
    const response = await this.request('storage', `b/${encodeURIComponent(object.bucket)}/o/${encodeURIComponent(object.name)}`,
      { alt: 'media', generation: object.generation, ifGenerationMatch: object.generation, ifMetagenerationMatch: object.metageneration });
    let bytes = 0;
    for await (const chunk of response.body) {
      bytes += chunk.length; requireThat(bytes <= Number(object.size) && bytes <= 64 * 1024 * 1024, 'OBJECT_BYTE_BOUND'); yield Buffer.from(chunk);
    }
    requireThat(bytes === Number(object.size), 'TRUNCATED_OBJECT');
  }
  async collect() {
    const metadata = await this.metadata(); this.projectNumber = metadata.project.projectNumber;
    const config = await this.config(), users = await this.users(), tree = await this.documents(), storage = await this.objects();
    const estimate=Buffer.byteLength(canonical({metadata,config,users,tree,storage}))+storage.objects.reduce((n,o)=>n+Number(o.size)*4/3,0);
    requireThat(estimate<=96*1024*1024,'ARCHIVE_MEMORY_BUDGET');
    requireThat(users.every(u => typeof u.localId === 'string') && new Set(users.map(u => u.localId)).size === users.length, 'INVALID_AUTH_USERS');
    this.baseline = hash({ config, users: [...users].sort((a,b) => a.localId.localeCompare(b.localId)), storage });
    return { metadata, config, users, ...tree, ...storage };
  }
  async verifyStable() {
    requireThat(Date.now() - Date.parse(this.readTime) < 50 * 60 * 1000, 'SNAPSHOT_EXPIRED');
    const config = await this.config(), users = await this.users(), storage = await this.objects();
    requireThat(hash({ config, users: [...users].sort((a,b) => a.localId.localeCompare(b.localId)), storage }) === this.baseline, 'NON_FIRESTORE_DRIFT');
    // Compare a fresh fixed-time Firestore scan to catch post-snapshot writes.
    const originalTime = this.readTime; await this.metadata();
    const latest = await this.documents(); this.readTime = originalTime;
    return latest;
  }
}
