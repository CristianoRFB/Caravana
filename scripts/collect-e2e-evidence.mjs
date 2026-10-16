import { readdir, readFile, mkdir, copyFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const destination = "docs/versions/v1-recovery-2026-10-16/screenshots";
await mkdir(destination, { recursive: true });
const manifest = { fixture: "SYNTHETIC_ONLY", environment: "Local Auth/Firestore emulators; external browser requests blocked; system fallback fonts", files: [] };
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const source = path.join(dir, item.name);
    if (item.isDirectory()) { await walk(source); continue; }
    if (!/^(financeiro-geral|portal-comprovante)-synthetic\.png$/.test(item.name)) continue;
    const viewport = source.match(/(desktop-1440|tablet-768|mobile-375|mobile-320)/)?.[1];
    if (!viewport) throw new Error("Unknown screenshot viewport.");
    const name = item.name.replace("-synthetic", `-${viewport}`);
    const target = path.join(destination, name);
    await copyFile(source, target);
    const bytes = await readFile(target);
    manifest.files.push({ path: target.replaceAll("\\", "/"), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sha256: createHash("sha256").update(bytes).digest("hex") });
  }
}
await walk("test-results");
await writeFile(path.join(destination, "manifest.json"), JSON.stringify(manifest, null, 2));
await copyFile("test-results/e2e-report.json", "docs/evidence/2026-10-16/f1-e2e-final-report.json");
console.log(JSON.stringify(manifest, null, 2));
