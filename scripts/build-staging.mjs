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
await writeFile("dist-staging/_headers", "/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n");
await inventory("dist-staging");
const source = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
await writeFile("dist-staging/release.json", JSON.stringify({ kind: "FUNCTIONAL_STAGING_CANDIDATE", ...target, source, builtAt: new Date().toISOString(), files }, null, 2) + "\n");
console.log(`Staging build verified for ${target.projectId}; ${files.length} files. No deploy executed.`);
