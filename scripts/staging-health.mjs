import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const origin="https://caravana77-staging.pages.dev";
export function validateHealthRelease(release,expectedSource) {
  if(release?.kind!=="FUNCTIONAL_STAGING_CANDIDATE" || release.projectId!=="bdall-e3585" || release.pagesProject!=="caravana77-staging" || !/^[a-f0-9]{40}$/.test(release.source) || (expectedSource && release.source!==expectedSource))throw Error("Staging release identity mismatch.");
  if(!Array.isArray(release.files) || release.files.length>80)throw Error("Invalid bounded artifact inventory.");
  const assets=release.files.filter(file=>file.path.startsWith("assets/"));
  if(!assets.length || assets.some(file=>!/^assets\/[a-zA-Z0-9._-]+$/.test(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes<1 || file.bytes>5000000))throw Error("Unsafe or oversized artifact reference.");
  return assets;
}
export function verifyHealthHeaders(headers) {
  return headers.get("x-robots-tag")?.includes("noindex")===true && headers.get("x-frame-options")==="DENY" && (headers.get("content-security-policy")||"").includes("default-src 'self'") && !(headers.get("content-security-policy")||"").includes("unsafe-eval");
}
export function verifyHealthAssetResponse(asset, headers, bytes) {
  const mime = (headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  const expected = asset.path.endsWith(".js") ? ["application/javascript", "text/javascript"]
    : asset.path.endsWith(".css") ? ["text/css"] : null;
  if (expected && !expected.includes(mime)) return false;
  return bytes.length === asset.bytes && createHash("sha256").update(bytes).digest("hex") === asset.sha256;
}
// Bound bytes while receiving, including decoded/chunked responses that omit or
// misstate Content-Length. Never retain an unbounded arrayBuffer/JSON body.
export async function readBoundedHealthBody(response, limit) {
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 5000000) throw Error("Invalid health body bound.");
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader(), chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) throw Error("Public staging response exceeds its byte bound.");
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, total);
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}
export async function stagingHealth(expectedSource) {
  const get=async path=>{const response=await fetch(origin+path,{redirect:"error",signal:AbortSignal.timeout(15000)});if(response.status!==200)throw Error(`Public staging resource returned HTTP ${response.status}.`);return response;};
  const html=await get("/admin/login");
  await readBoundedHealthBody(html,524288);
  const release=JSON.parse((await readBoundedHealthBody(await get("/release.json"),65536)).toString("utf8")),assets=validateHealthRelease(release,expectedSource);
  if(!verifyHealthHeaders(html.headers))throw Error("Required staging security headers missing.");
  const checked=[];
  for(const asset of assets){const response=await get('/'+asset.path);const bytes=await readBoundedHealthBody(response,asset.bytes);const hash=createHash("sha256").update(bytes).digest("hex");if(!verifyHealthAssetResponse(asset,response.headers,bytes))throw Error("Deployed browser artifact content type or bytes differ from its manifest.");checked.push({path:asset.path,bytes:bytes.length,sha256:hash});}
  const report={checkedAt:new Date().toISOString(),status:"PASS_PUBLIC_STAGING_ARTIFACTS",source:release.source,projectId:release.projectId,pagesProject:release.pagesProject,securityHeaders:"PASS",assetContentTypesVerified:true,assets:checked,authenticatedJourneysVerified:false,productionAccess:false,credentialsUsed:false,privateDataRead:false};
  await mkdir("docs/evidence/2026-10-20",{recursive:true});await writeFile(`docs/evidence/2026-10-20/staging-health-${release.source.slice(0,7)}.json`,JSON.stringify(report,null,2)+"\n");return report;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try { if(process.argv.length>3 || (process.argv[2] && !/^[a-f0-9]{40}$/.test(process.argv[2])))throw Error("Only an optional exact expected source SHA is accepted; target cannot be overridden.");const report=await stagingHealth(process.argv[2]);console.log(`Staging public health PASS: ${report.source}, ${report.assets.length} exact assets. No Auth/Firestore document requests.`); }
  catch(error){console.error(error.message);process.exitCode=1;}
}
