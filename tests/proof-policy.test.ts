import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PROOF_POLICY, validateProofFile } from "../src/lib/proof-policy";

describe("proof policy", () => {
  it("uses the same binary/base64 boundary in the upload policy and both rules files", () => {
    expect(PROOF_POLICY.maxBase64Characters).toBe(819200);
    expect(readFileSync("firestore.rules", "utf8")).toContain(`content.size() <= ${PROOF_POLICY.maxBase64Characters}`);
    expect(readFileSync("storage.rules", "utf8")).toContain("request.resource.size <= 600 * 1024");
  });

  it("rejects empty files, unsupported types and content with a misleading PDF header", async () => {
    await expect(validateProofFile(new File([], "empty.pdf", { type: "application/pdf" }))).rejects.toThrow("vazio");
    await expect(validateProofFile(new File(["%PDF-1.4"], "wrong.txt", { type: "text/plain" }))).rejects.toThrow("JPG, PNG ou PDF");
    await expect(validateProofFile(new File(["html content %PDF-1.4"], "wrong.pdf", { type: "application/pdf" }))).rejects.toThrow("conteúdo");
    await expect(validateProofFile(new File([new Uint8Array(PROOF_POLICY.maxBytes + 1)], "big.pdf", { type: "application/pdf" }))).rejects.toThrow(PROOF_POLICY.displayLimit);
  });
});
