import { build, loadEnv } from 'vite';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const env={...loadEnv('production',process.cwd(),'VITE_'),...process.env};
if(env.VITE_FIREBASE_PROJECT_ID!=='caravana-af306'||env.VITE_USE_EMULATORS!=='false'||env.VITE_APP_ENV!=='production'||!env.VITE_FIREBASE_API_KEY||!env.VITE_FIREBASE_APP_ID?.startsWith('1:742921744156:web:'))throw Error('EXACT_EXISTING_PRODUCTION_CONFIG_REQUIRED');
await build({mode:'production',base:'/platform-app/',define:{'import.meta.env.VITE_PRIVATE_HISTORY_TENANT':JSON.stringify(''),'import.meta.env.VITE_ITALO_OPERATIONAL_TENANT':JSON.stringify(''),'import.meta.env.VITE_PLATFORM_ONLY':JSON.stringify('true')},build:{outDir:'dist-platform'}});
const files=[];
async function scan(prefix='') {for(const item of await readdir('dist-platform/'+prefix,{withFileTypes:true})) {const p=prefix+item.name;if(!prefix&&['_headers','_redirects'].includes(p))continue;if(item.isDirectory())await scan(p+'/');else {if(p!=='index.html'&&!/^assets\/[A-Za-z0-9_-]+\.(js|css)$/.test(p))throw Error('STATIC_PLATFORM_FILES_ONLY');const b=await readFile('dist-platform/'+p);files.push({path:p,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}}}
await scan();
await writeFile('dist-platform/platform-release.json',JSON.stringify({kind:'PLATFORM_OWNER_APPLICATION',source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),dirty:!!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),projectId:'caravana-af306',files},null,2)+'\n');
