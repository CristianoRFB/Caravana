import { createHash } from "node:crypto";
import { describe,expect,it } from "vitest";
import { validateHealthRelease,verifyHealthHeaders,verifyHealthAssetResponse } from "../scripts/staging-health.mjs";
const release={kind:"FUNCTIONAL_STAGING_CANDIDATE",projectId:"bdall-e3585",pagesProject:"caravana77-staging",source:"a".repeat(40),files:[{path:"assets/main-abcd.js",sha256:"f".repeat(64),bytes:100}]};
describe("credential-free fixed-target staging health guard",()=>{
  it("requires exact project/release and bounded local static assets",()=>{
    expect(validateHealthRelease(release,release.source)).toHaveLength(1);
    for(const patch of [{projectId:"caravana-af306"},{pagesProject:"caravana-77"},{source:"bad"},{files:[]},{files:[{...release.files[0],path:"assets/../../secret"}]},{files:[{...release.files[0],path:"https://outside.example/asset.js"}]},{files:[{...release.files[0],bytes:999999999}]}])expect(()=>validateHealthRelease({...release,...patch})).toThrow();
    expect(()=>validateHealthRelease(release,"b".repeat(40))).toThrow();
  });
  it("requires noindex/frame denial/CSP without unsafe eval",()=>{
    const headers=new Headers({"x-robots-tag":"noindex, nofollow","x-frame-options":"DENY","content-security-policy":"default-src 'self'; script-src 'self'"});expect(verifyHealthHeaders(headers)).toBe(true);headers.set("content-security-policy","default-src 'self'; script-src 'unsafe-eval'");expect(verifyHealthHeaders(headers)).toBe(false);
  });
  it("accepts JS/CSS only with matching type, bytes and SHA",()=>{
    for (const [path,mime] of [["assets/entry.js","text/javascript"],["assets/entry.js","application/javascript; charset=utf-8"],["assets/theme.css","text/css"]]) {
      const bytes=Buffer.from("synthetic"),asset={path,bytes:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex")};
      expect(verifyHealthAssetResponse(asset,new Headers({"content-type":mime}),bytes)).toBe(true);
      expect(verifyHealthAssetResponse(asset,new Headers({"content-type":mime}),Buffer.from("tampered"))).toBe(false);
    }
  });
  it("rejects SPA HTML fallback even when HTTP200 bytes match the supplied manifest",()=>{
    const bytes=Buffer.from("<!doctype html><div id=root></div>"),hash=createHash("sha256").update(bytes).digest("hex");
    for (const path of ["assets/missing.js","assets/missing.css"]) {
      const asset={path,bytes:bytes.length,sha256:hash};
      expect(verifyHealthAssetResponse(asset,new Headers({"content-type":"text/html; charset=utf-8"}),bytes)).toBe(false);
      expect(verifyHealthAssetResponse(asset,new Headers(),bytes)).toBe(false);
    }
  });
  it("rejects CSS served as JavaScript and JS served as CSS",()=>{
    const bytes=Buffer.from("synthetic"),hash=createHash("sha256").update(bytes).digest("hex");
    expect(verifyHealthAssetResponse({path:"assets/a.js",bytes:bytes.length,sha256:hash},new Headers({"content-type":"text/css"}),bytes)).toBe(false);
    expect(verifyHealthAssetResponse({path:"assets/a.css",bytes:bytes.length,sha256:hash},new Headers({"content-type":"application/javascript"}),bytes)).toBe(false);
  });

});
