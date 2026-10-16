export const DOCUMENT_CONSENT_VERSION = "operational-documents-v1";
export const DEFAULT_DOCUMENT_DAYS = 90;
export type PrivateDocumentKind = "proofs" | "authorizations";
export interface DocumentPolicy { proofDays: number; authorizationDays: number; }
export interface RetentionCandidate { registrationId: string; kind: PrivateDocumentKind; days: number; uploadedAt: number; }
export function documentDays(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 3650) throw new Error("Informe um prazo entre1 e3650 dias.");
  return Number(value);
}
export function planDocumentRetention(rows: { id: string; [key: string]: unknown }[], now: number): RetentionCandidate[] {
  const candidates: RetentionCandidate[] = [];
  for (const row of rows) for (const kind of ["proofs", "authorizations"] as const) {
    const prefix = kind === "proofs" ? "proof" : "authorization";
    const timestamp = row[`${prefix}UploadedAt`] as { toMillis?: () => number } | undefined;
    const days = row[`${prefix}RetentionDays`];
    if (row[`${prefix}Id`] !== "current" || !timestamp?.toMillis || !Number.isInteger(days) || Number(days) < 1 || Number(days) > 3650) continue;
    const uploadedAt = timestamp.toMillis();
    if (Number.isFinite(uploadedAt) && now >= uploadedAt + Number(days) * 86400000) candidates.push({ registrationId: row.id, kind, days: Number(days), uploadedAt });
  }
  return candidates;
}
