import type { Registration } from "./types";
export function importNormalize(value: string): string {
  return value.toLowerCase().replace(/[áàâãä]/g, "a").replace(/[éèêë]/g, "e").replace(/[íìîï]/g, "i")
    .replace(/[óòôõö]/g, "o").replace(/[úùûü]/g, "u").replace(/ç/g, "c").replace(/[^a-z0-9]/g, "");
}
export function importIdentityKeys(data: Pick<Registration, "cpf" | "documentRecords" | "passengerName" | "phone" | "email">): string[] {
  const name = importNormalize(data.passengerName || "");
  return [data.cpf ? `doc_${importNormalize(data.cpf)}` : "",
    ...[0, 1, 2].map((index) => data.documentRecords?.[index]?.value ? `doc_${importNormalize(data.documentRecords[index].value)}` : ""),
    data.phone ? `phone_${name}_${data.phone.replace(/\D/g, "")}` : "",
    data.email ? `email_${name}_${importNormalize(data.email)}` : ""];
}
export async function importDigest(value: unknown): Promise<string> {
  const sorted = (item: unknown): unknown => Array.isArray(item) ? item.map(sorted) : item && typeof item === "object"
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, part]) => [key, sorted(part)])) : item;
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(sorted(value))));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
