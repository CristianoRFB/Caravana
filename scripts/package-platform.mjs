// Preserve the activated Italo package byte-for-byte except routing/header metadata.
import {readFile,writeFile,mkdir,lstat,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const [baseline,platform,output]=process.argv.slice(2),sha=b=>createHash('sha256').update(b).digest('hex');
const check=(x,c)=>{if(!x)throw Error(c);};
check(process.argv.length===5&&baseline&&platform&&output,'THREE_PACKAGE_DIRECTORIES_REQUIRED');
check(!execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim(),'CLEAN_SOURCE_REQUIRED');
const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),short=source.slice(0,12);
check(path.dirname(path.resolve(output))===process.cwd()&&path.basename(output)==='dist-platform-release-'+short,'ISOLATED_PLATFORM_OUTPUT_REQUIRED');
const base=JSON.parse(await readFile(path.join(baseline,'combined-release.json'))),app=JSON.parse(await readFile(path.join(platform,'platform-release.json')));
check(base.source==='e3a465f15a1bd98946f01c037734432848cd9094'&&base.requiredRulesSha256==='8ceb58325c16b02e2aedc5c1a11e13f7da92ebcf738e70bc5acfb5bff96c2454'&&app.source===source&&!app.dirty,'PINNED_OPERATIONAL_AND_CLEAN_PLATFORM_ARTIFACT_REQUIRED');
const prepared=new Map();
async function copy(root,file){check(/^[A-Za-z0-9_./-]+$/.test(file.path)&&!file.path.split('/').some(p=>p.startsWith('.')),'STATIC_PUBLIC_PATH_REQUIRED');const full=path.resolve(root,file.path);check(full.startsWith(await realpath(root)+path.sep)&&await realpath(full)===full&&(await lstat(full)).isFile(),'NO_SYMLINK_OR_ESCAPE');const b=await readFile(full);check(b.length===file.bytes&&sha(b)===file.sha256,'ARTIFACT_BYTES_REQUIRED');return b;}
for(const f of base.files)prepared.set(f.path,await copy(baseline,f));
for(const f of app.files){check(f.path==='index.html'||/^assets\/[A-Za-z0-9_-]+\.(js|css)$/.test(f.path),'PLATFORM_STATIC_ASSET_REQUIRED');prepared.set('platform-app/'+f.path,await copy(platform,f));}
prepared.set('platform-app/platform-release.json',await readFile(path.join(platform,'platform-release.json')));
prepared.set(`platform-app/entry-${short}/index.html`,prepared.get('platform-app/index.html'));
const redirects=prepared.get('_redirects').toString();check(redirects.includes('/* /entry-e3a465f15a1b/ 200'),'EXACT_EXISTING_BOOTSTRAP_ROUTING_REQUIRED');
prepared.set('_redirects',Buffer.from(`/platform-app/assets/* /platform-app/assets/:splat 200\n/platform-app/platform-release.json /platform-app/platform-release.json 200\n/platform-app/* /platform-app/entry-${short}/ 200\n/platform /platform-app/entry-${short}/ 200\n/platform/* /platform-app/entry-${short}/ 200\n`+redirects));
prepared.set('_headers',Buffer.concat([prepared.get('_headers'),Buffer.from("\n/platform*\n  Cache-Control: no-store\n  X-Robots-Tag: noindex, nofollow\n  Referrer-Policy: no-referrer\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com; img-src 'self' data: blob: https:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'\n")]));
await mkdir(output);const files=[];for(const [p,b]of prepared){await mkdir(path.dirname(path.join(output,p)),{recursive:true});await writeFile(path.join(output,p),b,{flag:'wx'});files.push({path:p,bytes:b.length,sha256:sha(b)});}
await writeFile(path.join(output,'combined-release.json'),JSON.stringify({...base,source,preservedOperationalSource:base.source,platformSource:source,platformEntry:'platform-app/index.html',requiredRulesSha256:sha(await readFile('firestore.platform-operational.rules')),files},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PRESERVED_ITALO_PLUS_PLATFORM_PACKAGE_BUILT',source,files:files.length,operationalDataWrites:0}));
