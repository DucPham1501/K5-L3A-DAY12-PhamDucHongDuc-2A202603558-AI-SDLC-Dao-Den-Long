import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {mkdtempSync,rmSync} from 'node:fs';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
// Phase 4 verification: writes ONLY docs/proof/phase-4 (phase-1..3 proof stays untouched at their tags).
const dir='docs/proof/phase-4';mkdirSync(dir,{recursive:true});const steps=[];
function command(args,env={}){const start=performance.now(),p=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:20*1024*1024,env:{...process.env,...env}}),entry={command:['node',...args],exit_code:p.status,duration_ms:Math.round(performance.now()-start),stdout:p.stdout,stderr:p.stderr};steps.push(entry);process.stdout.write(p.stdout??'');process.stderr.write(p.stderr??'');if(p.status!==0){writeFileSync(`${dir}/verification.json`,JSON.stringify({passed:false,steps},null,2));process.exit(p.status||1);}return entry;}
command(['--test']);command(['scripts/build.mjs']);
const cases=[['dash',1,180,'dash.inputs'],['pulse',1,180,'pulse.inputs'],['fall',1,120],['launch',2,86],['charm',2,2800],['drifter',2,300],['drifter-return',2,150,'pulse.inputs'],['wind',3,2160]];
for(const[name,night,ticks,input]of cases)command(['src/headless.mjs','--seed','12','--night',String(night),'--scenario',`tests/scenarios/phase-2/${name}.json`,...(input?['--inputs',`tests/scenarios/phase-2/${input}.json`]:[]),'--ticks',String(ticks),'--snapshot-every','10','--out',`${dir}/${name}.jsonl`]);
const read=name=>readFileSync(`${dir}/${name}.jsonl`,'utf8').trim().split('\n').map(JSON.parse);
const expect=(ok,message)=>{if(!ok)throw new Error(message);};
for(const night of [1,2,3]){
 const scenario=`tests/scenarios/phase-3/dawn-night-${night}.json`;
 command(['src/headless.mjs','--seed','12','--night',String(night),'--scenario',scenario,'--ticks','60','--out',`${dir}/won-night-${night}.jsonl`]);
 expect(read(`won-night-${night}`).at(-1).state==='won',`Night ${night} win fixture failed`);
 expect(read(`won-night-${night}`).some(e=>e.name==='game_over'&&e.data.reason==='dawn_survived'),'Missing dawn_survived reason');
}
for(const[name,ticks,input]of [['fuel-out',2],['relight',60,'interact.inputs'],['refuel',60,'interact.inputs'],['drain',120],['pulse-drain',120,'../phase-2/pulse.inputs'],['no-early-win',60]]){
 command(['src/headless.mjs','--seed','12','--night','1','--scenario',`tests/scenarios/phase-3/${name}.json`,...(input?['--inputs',`tests/scenarios/phase-3/${input}.json`]:[]),'--ticks',String(ticks),'--out',`${dir}/${name}.jsonl`]);
}
expect(read('fuel-out').some(e=>e.name==='lantern_out'),'Fuel-out event missing');
expect(read('relight').some(e=>e.name==='lantern_lit'&&e.data.relight===true),'Relight event missing');
expect(read('relight').filter(e=>e.type==='snapshot').at(-1).player.capacity===12,'Capacity did not increase');
expect(read('refuel').some(e=>e.name==='refuel'&&e.data.amount===2),'Refuel failed');
expect(read('drain').some(e=>e.name==='fuel_drain')&&read('drain').some(e=>e.name==='lantern_out'),'Drain scenario failed');
expect(read('pulse-drain').at(-1).score===15,'Drain pulse must score total 15');
expect(read('no-early-win').at(-1).state==='playing','All-lit still wins early');
expect(read('dash').some(e=>e.name==='dash')&&read('dash').some(s=>s.state==='paused'),'Dash/pause scenario failed');
expect(read('fall').some(e=>e.name==='player_hit'&&e.data.by==='fall'),'Fall scenario failed');
expect(read('charm').some(e=>e.name==='charm_picked'),'Charm scenario failed');
expect(read('drifter').some(e=>e.name==='drifter_steal'),'Drifter steal scenario failed');
expect(read('drifter-return').some(e=>e.name==='drifter_drop'),'Drifter return scenario failed');
expect(read('wind').some(s=>s.type==='snapshot'&&s.wind.active),'Wind scenario failed');
const replay=['src/headless.mjs','--seed','77','--night','2','--ticks','3600','--snapshot-every','60'];
command([...replay,'--out',`${dir}/replay-a.jsonl`]);command([...replay,'--out',`${dir}/replay-b.jsonl`]);const a=readFileSync(`${dir}/replay-a.jsonl`);expect(a.equals(readFileSync(`${dir}/replay-b.jsonl`)),'Deterministic replay differs');
const benchmark=command(['src/headless.mjs','--seed','12','--night','3','--scenario','tests/scenarios/phase-2/benchmark.json','--ticks','18000','--snapshot-every','60','--out',`${dir}/benchmark.jsonl`]);
expect(read('benchmark').at(-1).ticks===18000,'Benchmark did not simulate full night');expect(benchmark.duration_ms<=30000,'Headless benchmark exceeds 30s');
// ---- Phase 4: contract v1.3, soak (same flags as soak_cmd), leaderboard export round trip ----
const contract=JSON.parse(readFileSync('game.contract.json','utf8'));expect(contract.contract_version==='1.3'&&contract.bench_cmd&&contract.soak_cmd,'Contract v1.3 fields missing');
const soakFlags=contract.soak_cmd.split(/\s+/).slice(1,-1);const soak=command([...soakFlags,'scripts/soak.mjs','--seed','7','--nights','10','--out',`${dir}/soak.json`]);
const soakReport=JSON.parse(readFileSync(`${dir}/soak.json`,'utf8'));expect(soakReport.nights===10&&soakReport.crashes===0&&soakReport.results.length===10,'Soak crashed');expect(soakReport.mem_end_mb<=1.2*soakReport.mem_start_mb,`Soak memory grew too much: ${soakReport.mem_start_mb} → ${soakReport.mem_end_mb}`);
const lbDir=mkdtempSync(path.join(os.tmpdir(),'lantern-verify-'));
try{const seedBoard=`import('./scripts/leaderboard-store.mjs').then(async s=>{await s.addEntry({name:'Mây_01',score:420,nights_won:1,seed:12},new Date('2026-11-20T10:00:00Z'));await s.addEntry({name:'Dawn',score:1800,nights_won:3,seed:12},new Date('2026-11-20T10:05:00Z'));await s.addEntry({name:'Tie_late',score:420,nights_won:1,seed:12},new Date('2026-11-20T10:09:00Z'));})`;
 command(['--input-type=module','-e',seedBoard],{LANTERN_DATA_DIR:lbDir});command(['scripts/serve.mjs','--export-leaderboard',`${dir}/leaderboard-export.json`],{LANTERN_DATA_DIR:lbDir});
 const exported=JSON.parse(readFileSync(`${dir}/leaderboard-export.json`,'utf8'));expect(JSON.stringify(exported.entries.map(e=>e.name))===JSON.stringify(['Dawn','Mây_01','Tie_late']),'Leaderboard export order wrong');
}finally{rmSync(lbDir,{recursive:true,force:true});}
const sha=data=>createHash('sha256').update(data).digest('hex');const sourceFiles=['game.contract.json','src/headless.mjs','index.html','scripts/bench.mjs','scripts/soak.mjs','scripts/serve.mjs','scripts/leaderboard-store.mjs','scripts/browser-runtime.mjs',...readdirSync('src/core').map(f=>'src/core/'+f),...readdirSync('web').map(f=>'web/'+f)];
writeFileSync(`${dir}/verification.json`,JSON.stringify({passed:true,generated_at:new Date().toISOString(),node:process.version,platform:process.platform,cpu:os.cpus()[0]?.model,determinism:{identical:true,sha256:sha(a)},headless_18000_ticks_ms:benchmark.duration_ms,benchmark_scenario:'Full Night 3 v1.2, natural enemies enabled; initial invulnerability avoids early death, wind disabled to hold position',contract_version:contract.contract_version,soak:soakReport,soak_ms:soak.duration_ms,leaderboard_export:'3 seeded entries in a temp LANTERN_DATA_DIR exported in rank order (score desc, tie → earlier first)',browser_bench:'Run separately: npm run bench (needs a desktop browser window); result committed as bench.json',source_sha256:Object.fromEntries(sourceFiles.map(f=>[f,sha(readFileSync(f))])),steps},null,2)+'\n');console.log('Phase 4 verification passed; proof saved to '+dir);
