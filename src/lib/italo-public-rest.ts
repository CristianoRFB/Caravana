// Only unauthenticated public metadata and an already-known portal capability.
// No credentials, backend keys, SDK sessions or diagnostics are sent here.
export const publicDocuments = 'https://firestore.googleapis.com/v1/projects/caravana-af306/databases/(default)/documents';
export class PublicMetadataDenied extends Error {}
export async function boundedPublicJson(response: Response): Promise<unknown> {
  if (!response.ok) throw Error('Não foi possível confirmar a disponibilidade. Tente novamente.');
  if (!response.body) throw Error('Resposta indisponível.');
  const reader = response.body.getReader(); const parts: Uint8Array[] = []; let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      total += value.length;
      if (total > 2_000_000) throw Error('A agenda precisa ser conferida pela organização.');
      parts.push(value);
    }
  } catch (cause) { await reader.cancel().catch(() => {}); throw cause; }
  const result = new Uint8Array(total); let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return JSON.parse(new TextDecoder().decode(result));
}
export function decodePublicFields(raw: unknown): Record<string, unknown> {
  const decode = (value: unknown, depth = 0): unknown => {
    if (depth > 12 || !value || typeof value !== 'object') throw Error('Resposta inválida.');
    const v = value as Record<string, unknown>;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) { const n = Number(v.integerValue); if (!Number.isSafeInteger(n)) throw Error('Contador inválido.'); return n; }
    if ('doubleValue' in v) { if (typeof v.doubleValue !== 'number' || !Number.isFinite(v.doubleValue)) throw Error('Valor inválido.'); return v.doubleValue; }
    if ('booleanValue' in v) return v.booleanValue;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return v.timestampValue;
    if ('mapValue' in v) return decodeFields((v.mapValue as { fields?: unknown }).fields ?? {}, depth + 1);
    if ('arrayValue' in v) {
      const values = (v.arrayValue as { values?: unknown[] }).values ?? [];
      if (!Array.isArray(values) || values.length > 500) throw Error('Lista inválida.');
      return values.map(item => decode(item, depth + 1));
    }
    throw Error('Formato de dados indisponível.');
  };
  const decodeFields = (fields: unknown, depth: number): Record<string, unknown> => {
    if (!fields || typeof fields !== 'object' || Array.isArray(fields) || Object.keys(fields).length > 200) throw Error('Resposta inválida.');
    return Object.fromEntries(Object.entries(fields).map(([key, v]) => [key, decode(v, depth)]));
  };
  const doc = raw as { fields?: unknown };
  return decodeFields(doc?.fields ?? {}, 0);
}
export async function publicDocument(path: string): Promise<Record<string, unknown> | null> {
  if (!/^(publicTenantCutovers\/italo|legacyRegistrationAliases\/[a-f0-9]{64}|registrations\/[a-f0-9]{64})$/.test(path)) throw Error('Endereço público inválido.');
  const response = await fetch(publicDocuments + '/' + path, { credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (response.status === 404) return null;
  if (response.status === 403) throw new PublicMetadataDenied('Este endereço requer a conta da organização.');
  return decodePublicFields(await boundedPublicJson(response));
}
