import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const root=new URL('../',import.meta.url);
process.chdir(fileURLToPath(root));
mkdirSync('docs/proof/phase-1',{recursive:true});
const log=[];
function command(args) {
  const start=performance.now();
  const result=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:20*1024*1024});
  const item={command:['node',...args],exit_code:result.status,duration_ms:Math.round(performance.now()-start),stdout:result.stdout,stderr:result.stderr};
  log.push(item); process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
  if(result.status!==0) {
    writeFileSync('docs/proof/phase-1/verification.json',JSON.stringify({passed:false,steps:log},null,2)+'\n');
    process.exit(result.status || 1);
  }
}
command(['--test']);
command(['scripts/build.mjs']);
command(['scripts/playthrough.mjs']);
command(['src/headless.mjs','--seed','12','--night','1','--inputs','docs/proof/phase-1/playthrough.inputs.json','--ticks','18000','--snapshot-every','60','--out','docs/proof/phase-1/playthrough.jsonl']);
const playthrough=readFileSync('docs/proof/phase-1/playthrough.jsonl','utf8').trim().split('\n').map(JSON.parse).at(-1);
if(playthrough.state!=='won') throw new Error('Normal-world playthrough did not win');
const base=['src/headless.mjs','--seed','12','--night','1','--ticks','1200'];
command([...base,'--out','docs/proof/phase-1/replay-a.jsonl']);
command([...base,'--out','docs/proof/phase-1/replay-b.jsonl']);
const a=readFileSync('docs/proof/phase-1/replay-a.jsonl'),b=readFileSync('docs/proof/phase-1/replay-b.jsonl');
if(!a.equals(b)) throw new Error('Determinism check FAILED');
command(['src/headless.mjs','--seed','12','--night','1','--scenario','tests/scenarios/last-lantern.json','--inputs','tests/scenarios/last-lantern.inputs.json','--ticks','60','--out','docs/proof/phase-1/won.jsonl']);
command(['src/headless.mjs','--seed','12','--night','1','--scenario','tests/scenarios/contact.json','--ticks','600','--out','docs/proof/phase-1/lost.jsonl']);
const sourceFiles=['game.contract.json','src/core/game.mjs','src/core/validate.mjs','src/headless.mjs','web/main.mjs','web/style.css','index.html'];
const sha256=data=>createHash('sha256').update(data).digest('hex');
const report={passed:true,generated_at:new Date().toISOString(),node:process.version,platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,
  determinism:{identical:true,sha256:sha256(a)},source_sha256:Object.fromEntries(sourceFiles.map(f=>[f,sha256(readFileSync(f))])),
  browser_visual_check:'Separate browser-qa.json and screenshots; not executed by this script',steps:log};
writeFileSync('docs/proof/phase-1/verification.json',JSON.stringify(report,null,2)+'\n');
console.log('Verification passed. Real outputs saved in docs/proof/phase-1/.');
