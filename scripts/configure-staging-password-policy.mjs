import { stagingAdmin } from "./staging-admin.mjs";
import { readFile,writeFile } from "node:fs/promises";
const admin=await stagingAdmin(),path=`/projects/${admin.projectId}/config`;
const fixture=JSON.parse(await readFile(".firebase/staging-accounts.json","utf8"));
if(fixture.projectId!==admin.projectId||Object.values(fixture.accounts).some(account=>!account.email.endsWith("@caravana77.invalid")||account.password.length<12))throw Error("Only existing strong synthetic accounts accepted; no password changes performed.");
const current=await admin.request("authConfig","get",path);
if(current.passwordPolicyConfig)throw Error("Existing policy requires explicit comparison; no automatic replacement.");
// Field names verified against the live official v2 discovery schema; the
// prose guide still shows a different shape which this API rejects (HTTP400).
const passwordPolicyConfig={passwordPolicyEnforcementState:"ENFORCE",forceUpgradeOnSignin:false,passwordPolicyVersions:[{customStrengthOptions:{minPasswordLength:12,maxPasswordLength:4096}}]};
await admin.request("authConfig","patch",path,{passwordPolicyConfig},{updateMask:"passwordPolicyConfig"});
const after=await admin.request("authConfig","get",path);
const report={checkedAt:new Date().toISOString(),projectId:admin.projectId,passwordPolicyConfig:after.passwordPolicyConfig,configurationScope:"passwordPolicyConfig only",existingPasswordsChanged:false,productionAccess:false,billingEnabled:false,reference:"https://docs.cloud.google.com/identity-platform/docs/password-policy"};
if(!report.passwordPolicyConfig)throw Error("Password policy read-back absent");
await writeFile("docs/evidence/2026-10-20/final-staging-password-policy.json",JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report,null,2));
