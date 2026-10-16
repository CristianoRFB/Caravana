const maxBytes = 600 * 1024;
const mimeTypes = ["image/jpeg", "image/png", "application/pdf"] as const;

export const PROOF_POLICY = {
  maxBytes,
  maxBase64Characters: Math.ceil(maxBytes / 3) * 4,
  displayLimit: "600 KB",
  mimeTypes,
  accept: mimeTypes.join(","),
} as const;

export async function validateProofFile(file: File): Promise<Uint8Array> {
  if (!PROOF_POLICY.mimeTypes.some((type) => type === file.type)) {
    throw new Error("Envie um arquivo JPG, PNG ou PDF.");
  }
  if (file.size === 0) throw new Error("O arquivo está vazio.");
  if (file.size > PROOF_POLICY.maxBytes) {
    throw new Error(`O comprovante deve ter no máximo ${PROOF_POLICY.displayLimit}.`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf = new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  if (bytes.length !== file.size ||
      (file.type === "application/pdf" && !isPdf) ||
      (file.type === "image/jpeg" && !isJpeg) ||
      (file.type === "image/png" && !isPng)) {
    throw new Error("O conteúdo do arquivo não corresponde ao tipo informado.");
  }
  return bytes;
}
