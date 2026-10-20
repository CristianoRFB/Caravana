import { describe,expect,it } from "vitest";
import { validateHealthRelease,verifyHealthHeaders } from "../scripts/staging-health.mjs";
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
});
