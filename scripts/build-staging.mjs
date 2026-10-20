import { build, loadEnv } from "vite";
import { readFile, writeFile, access, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { assertStagingBuild } from "./staging-target.mjs";
await access(".env.staging.local");
const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith("VITE_")));
const environment = { ...loadEnv("staging", process.cwd(), "VITE_"), ...inherited };
const target = assertStagingBuild(environment);
await build({ mode: "staging", build: { outDir: "dist-staging" } });
const files = [];
async function inventory(directory, relative = "") {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = relative ? `${relative}/${entry.name}` : entry.name; const absolute = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await inventory(absolute, path);
    else { const bytes = await readFile(absolute); files.push({ path, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }); }
  }
}
const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com; frame-src https://bdall-e3585.firebaseapp.com; frame-ancestors 'none'; form-action 'self'; base-uri 'none'; object-src 'none'";
await writeFile("dist-staging/_headers", `/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: ${csp}\n/release.json\n  Cache-Control: no-store\n`);
await inventory("dist-staging");
const source = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
await writeFile("dist-staging/release.json", JSON.stringify({ kind: "FUNCTIONAL_STAGING_CANDIDATE", ...target, source, builtAt: new Date().toISOString(), files }, null, 2) + "\n");
console.log(`Staging build verified for ${target.projectId}; ${files.length} files. No deploy executed.`);
