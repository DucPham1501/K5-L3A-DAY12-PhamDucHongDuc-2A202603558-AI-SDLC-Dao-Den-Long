// Validate a clean install and an extracted release using isolated leaderboard data.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const project=process.cwd(),clean=process.argv[2];
if(!clean)throw new Error('Usage: node scripts/submission-smoke.mjs <clean-install-folder>');
const unpack=mkdtempSync(path.join(tmpdir(),'lantern-release-'));
const archive=path.join(project,'release/dao-den-long-v1.0.0.zip');
const extract=spawnSync('tar',['-xf',archive,'-C',unpack],{encoding:'utf8'});
assert.equal(extract.status,0,extract.stderr);
const release=path.join(unpack,'dao-den-long-v1.0.0');
const checks=[];
for(const [label,folder,port] of [['clean-install',clean,4181],['release-zip',release,4182]]){
 const dataDir=mkdtempSync(path.join(tmpdir(),'lantern-board-'));
 const env={...process.env,PORT:String(port),LANTERN_DATA_DIR:dataDir};
 const server=spawn(process.execPath,['scripts/serve.mjs'],{cwd:folder,env,stdio:'pipe'});
 let serverError='';server.on('error',e=>serverError=e.message);
 try{
  let ready=false;
  for(let i=0;i<60;i++){try{ready=(await fetch(`http://127.0.0.1:${port}`)).ok;}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100));}
  assert.ok(ready,serverError||`${label}: server did not start`);
  const script=await (await fetch(`http://127.0.0.1:${port}/web/main.mjs`)).text();
  assert.ok(script.includes('Chọn level'));
  assert.deepEqual(await (await fetch(`http://127.0.0.1:${port}/api/leaderboard`)).json(),{entries:[]});
  const output=path.join(dataDir,'headless.jsonl');
  const headless=spawnSync(process.execPath,['src/headless.mjs','--seed','12','--night','3','--ticks','120','--out',output],{cwd:folder,encoding:'utf8',env});
  assert.equal(headless.status,0,headless.stderr);
  const records=readFileSync(output,'utf8').trim().split('\n').map(s=>JSON.parse(s));
  assert.equal(records[0].night,3);
  const exported=path.join(dataDir,'board-export.json');
  const exportRun=spawnSync(process.execPath,['scripts/serve.mjs','--export-leaderboard',exported],{cwd:folder,encoding:'utf8',env});
  assert.equal(exportRun.status,0,exportRun.stderr);
  assert.deepEqual(JSON.parse(readFileSync(exported,'utf8')),{entries:[]});
  const sourceFile=path.join(folder,label==='release-zip'?'dist/web/main.mjs':'web/main.mjs');
  assert.equal(readFileSync(sourceFile,'utf8'),readFileSync(path.join(project,'web/main.mjs'),'utf8'));
  checks.push({label,folder,passed:true,http:200,level_selector:true,headless_night:3,headless_records:records.length,leaderboard:'isolated empty board + CLI export',source_matches:true});
 }finally{server.kill();}
}
writeFileSync('docs/submission-smoke.json',JSON.stringify({generated_at:new Date().toISOString(),checks,note:'Clean local clone overlaid with current working source before npm ci/build; release ZIP extracted separately. Temporary folders kept for inspection.'},null,2)+'\n');
console.log(JSON.stringify(checks,null,2));
