import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const dir='docs/proof/phase-3';mkdirSync(dir,{recursive:true});const steps=[];
function command(args){const start=performance.now(),p=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:20*1024*1024}),entry={command:['node',...args],exit_code:p.status,duration_ms:Math.round(performance.now()-start),stdout:p.stdout,stderr:p.stderr};steps.push(entry);process.stdout.write(p.stdout??'');process.stderr.write(p.stderr??'');if(p.status!==0){writeFileSync(`${dir}/verification.json`,JSON.stringify({passed:false,steps},null,2));process.exit(p.status||1);}return entry;}
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
const sha=data=>createHash('sha256').update(data).digest('hex');const sourceFiles=['game.contract.json','src/headless.mjs','index.html',...readdirSync('src/core').map(f=>'src/core/'+f),...readdirSync('web').map(f=>'web/'+f)];
writeFileSync(`${dir}/verification.json`,JSON.stringify({passed:true,generated_at:new Date().toISOString(),node:process.version,platform:process.platform,cpu:os.cpus()[0]?.model,determinism:{identical:true,sha256:sha(a)},headless_18000_ticks_ms:benchmark.duration_ms,benchmark_scenario:'Full Night 3 v1.2, natural enemies enabled; initial invulnerability avoids early death, wind disabled to hold position',source_sha256:Object.fromEntries(sourceFiles.map(f=>[f,sha(readFileSync(f))])),steps},null,2)+'\n');console.log('Phase 3 verification passed; proof saved to '+dir);
