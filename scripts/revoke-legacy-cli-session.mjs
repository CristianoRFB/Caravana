import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
if(process.argv.length!==2 || process.env.FIREBASE_TOKEN)throw Error("No token or arguments accepted.");
const require=createRequire(import.meta.url);require("firebase-tools/lib/logger").logger.silent=true;
const auth=require("firebase-tools/lib/auth"),email="nexus7devstudio@gmail.com";
const account=auth.getAllAccounts().find(value=>value.user.email===email);
let remoteRevocation="NOT_PRESENT_NO_NEW_ATTEMPT";
if(account?.tokens.refresh_token){try{await auth.logout(account.tokens.refresh_token);remoteRevocation="CONFIRMED_OFFICIAL_REVOKE_RESPONSE";}catch{remoteRevocation="BLOCKED_REMOTE_REVOCATION_NOT_CONFIRMED";}}
const localRemoved=!auth.getAllAccounts().some(value=>value.user.email===email);
const result={checkedAt:new Date().toISOString(),scope:"Only the previously exposed Firebase CLI session; no Google browser accounts, Auth users, projects, IAM or other application sessions changed",localRemoved,remoteRevocation,credentialsPrinted:false,productionDataWrites:0};
await writeFile("docs/evidence/2026-10-20/legacy-cli-session-revocation.json",JSON.stringify(result,null,2)+"\n");console.log(JSON.stringify(result,null,2));if(!localRemoved||remoteRevocation.startsWith("BLOCKED"))process.exitCode=1;
