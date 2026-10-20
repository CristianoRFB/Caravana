import { build } from "vite";
import { rename, rm, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
await build({ configFile: "vite.preview.config.ts" });
await rename("dist-public-preview/public-preview/index.html", "dist-public-preview/index.html");
await rm("dist-public-preview/public-preview", { recursive: true });
const files = [];
for (const file of ["index.html", ...(await readdir("dist-public-preview/assets")).map((name) => `assets/${name}`)]) {
  if (file.endsWith(".css")) {
    const css = await readFile(`dist-public-preview/${file}`, "utf8");
    await writeFile(`dist-public-preview/${file}`, css.replace(/@import[^;]+;/g, ""));
  }
  const bytes = await readFile(`dist-public-preview/${file}`);
  if (/caravana-af306|firestore\.googleapis|identitytoolkit\.googleapis|securetoken\.googleapis|initializeApp|apiKey:/.test(bytes.toString())) throw new Error(`Backend dependency in public preview: ${file}`);
  files.push({ path: file, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
}
await writeFile("dist-public-preview/_headers", "/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; font-src 'self'; frame-ancestors 'none'; form-action 'none'; base-uri 'none'\n");
await writeFile("dist-public-preview/release.json", JSON.stringify({ kind: "PUBLIC_LANDING_PREVIEW_ONLY", backend: false, files }, null, 2) + "\n");
console.log(`Public preview verified: ${files.length} files; no Firebase runtime/configuration.`);
