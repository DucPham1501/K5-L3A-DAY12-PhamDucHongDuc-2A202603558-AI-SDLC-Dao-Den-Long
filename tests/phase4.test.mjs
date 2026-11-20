import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {frameMetrics} from '../src/core/metrics.mjs';
import {validName,validateEntry,rankEntries,isoWithOffset} from '../src/core/leaderboard.mjs';
import {benchmarkScene} from '../src/core/benchmark.mjs';
import {Campaign} from '../src/core/campaign.mjs';
import {defaults,validateBindings,loadBindings,rebind,keyLabel} from '../web/bindings.mjs';
const root=new URL('../',import.meta.url),contract=JSON.parse(readFileSync(new URL('game.contract.json',root)));
const node=(args,env={})=>spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',env:{...process.env,...env}});
const entry=(name,score,at,extra={})=>({name,score,nights_won:1,seed:12,achieved_at:at,...extra});

test('contract v1.3 declares bench_cmd and soak_cmd and keeps v1.2 tuning',()=>{
 assert.equal(contract.contract_version,'1.3');assert.match(contract.bench_cmd,/bench\.mjs/);assert.match(contract.soak_cmd,/soak\.mjs/);assert.match(contract.run_cmd,/serve\.mjs/);assert.equal(contract.headless_cmd,'node src/headless.mjs');
 assert.deepEqual([contract.tuning.night1_duration_s,contract.tuning.night2_duration_s,contract.tuning.night3_duration_s,contract.tuning.win_ratio,contract.tuning.fuel_max,contract.tuning.capacity_max],[240,270,300,.6,100,20]);
});
test('frame metrics follow the Ticket-04 formulas',()=>{
 const samples=[...Array(198).fill(10),40,50];const m=frameMetrics(samples);
 assert.equal(m.frames,200);assert.ok(Math.abs(m.avg_fps-1000*200/(198*10+90))<1e-9);
 // k=max(1,ceil(0.01×200))=2 → mean(50,40)=45 ms → 22.22 fps
 assert.ok(Math.abs(m.p1_low_fps-1000/45)<1e-9);assert.equal(m.frame_ms_p95,10);
 assert.equal(frameMetrics([16]).p1_low_fps,1000/16);assert.equal(frameMetrics([5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90,95,100]).frame_ms_p95,95);
 assert.throws(()=>frameMetrics([]));assert.throws(()=>frameMetrics([16,0]));assert.throws(()=>frameMetrics([NaN]));
});
test('leaderboard names: 3–12 of [A-Za-z0-9_], Vietnamese diacritics accepted as a bonus',()=>{
 for(const ok of['abc','Player_01','ABCDEFGHIJKL','Đức','Nguyễn_Văn','mây123'])assert.ok(validName(ok),ok);
 for(const bad of['ab','ABCDEFGHIJKLM','a b','a-b','abc!','😀😀😀','',null,123,'<b>x</b>'])assert.ok(!validName(bad),String(bad));
 assert.ok(validName('Đưc'.normalize('NFD').normalize('NFD')),'NFD input is normalized to NFC');
});
test('leaderboard entries need ISO 8601 with a time zone and valid ranges',()=>{
 assert.deepEqual(validateEntry(entry('abc',10,'2026-11-20T10:00:00+07:00')),entry('abc',10,'2026-11-20T10:00:00+07:00'));
 for(const bad of[entry('abc',10,'2026-11-20T10:00:00'),entry('abc',-1,'2026-11-20T10:00:00Z'),entry('abc',1.5,'2026-11-20T10:00:00Z'),entry('abc',1,'2026-11-20T10:00:00Z',{nights_won:4}),entry('abc',1,'2026-11-20T10:00:00Z',{seed:'12'}),entry('abc',1,'not a dateZ')])assert.throws(()=>validateEntry(bad));
 const iso=isoWithOffset(new Date('2026-11-20T03:04:05.006Z'));assert.match(iso,/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/);assert.equal(Date.parse(iso),Date.parse('2026-11-20T03:04:05.006Z'));
});
test('leaderboard ranks by score desc, ties by earlier achieved_at, keeps top 10',()=>{
 const list=[entry('late',50,'2026-11-20T10:00:05Z'),entry('early',50,'2026-11-20T17:00:01+07:00'),entry('top',90,'2026-11-21T00:00:00Z'),...Array.from({length:10},(_,i)=>entry(`low${i}`,i,`2026-11-20T09:00:0${i}Z`))];
 const ranked=rankEntries(list);assert.equal(ranked.length,10);assert.deepEqual(ranked.slice(0,3).map(e=>e.name),['top','early','late']);assert.ok(!ranked.some(e=>['low0','low1','low2'].includes(e.name)));
 const same='2026-11-20T10:00:00.000Z';assert.deepEqual(rankEntries([entry('first',5,same),entry('second',5,same)]).map(e=>e.name),['first','second']);
});
test('leaderboard persists on disk and --export-leaderboard writes entries in rank order',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'lantern-lb-'));const previous=process.env.LANTERN_DATA_DIR;process.env.LANTERN_DATA_DIR=dir;
 try{
  const store=await import('../scripts/leaderboard-store.mjs');
  await store.addEntry({name:'Alpha',score:300,nights_won:2,seed:12},new Date('2026-11-20T10:00:00Z'));
  await store.addEntry({name:'Beta_2',score:900,nights_won:3,seed:12},new Date('2026-11-20T10:01:00Z'));
  const added=await store.addEntry({name:'Gamma',score:300,nights_won:2,seed:12},new Date('2026-11-20T10:02:00Z'));
  assert.deepEqual(added.entries.map(e=>e.name),['Beta_2','Alpha','Gamma']);assert.match(added.added.achieved_at,/[+-]\d{2}:\d{2}$|Z$/);
  await assert.rejects(store.addEntry({name:'x',score:1,nights_won:0,seed:12}));
  const forged=await store.addEntry({name:'Hacker',score:1,nights_won:0,seed:12,achieved_at:'1999-01-01T00:00:00Z'},new Date('2026-11-20T10:03:00Z'));assert.ok(!forged.added.achieved_at.startsWith('1999'),'server sets achieved_at, not the client');
  const out=path.join(dir,'out.json');const run=node(['scripts/serve.mjs','--export-leaderboard',out],{LANTERN_DATA_DIR:dir});assert.equal(run.status,0,run.stderr);
  const exported=JSON.parse(readFileSync(out,'utf8'));assert.deepEqual(Object.keys(exported),['entries']);assert.deepEqual(exported.entries.slice(0,3).map(e=>e.name),['Beta_2','Alpha','Gamma']);
  for(const e of exported.entries)assert.deepEqual(Object.keys(e),['name','score','nights_won','achieved_at','seed']);
  assert.equal(node(['scripts/serve.mjs','--export-leaderboard'],{LANTERN_DATA_DIR:dir}).status,2);
  const empty=mkdtempSync(path.join(os.tmpdir(),'lantern-empty-'));const emptyOut=path.join(empty,'e.json');assert.equal(node(['scripts/serve.mjs','--export-leaderboard',emptyOut],{LANTERN_DATA_DIR:empty}).status,0);assert.deepEqual(JSON.parse(readFileSync(emptyOut,'utf8')),{entries:[]});rmSync(empty,{recursive:true,force:true});
  writeFileSync(path.join(dir,'leaderboard.json'),'{broken');assert.equal(node(['scripts/serve.mjs','--export-leaderboard',out],{LANTERN_DATA_DIR:dir}).status,1);
 }finally{if(previous===undefined)delete process.env.LANTERN_DATA_DIR;else process.env.LANTERN_DATA_DIR=previous;rmSync(dir,{recursive:true,force:true});}
});
test('key bindings: defaults valid, duplicates/camera keys reported, invalid saved data falls back',()=>{
 assert.ok(validateBindings(defaults));assert.equal(Object.keys(defaults).length,9);
 const dup=rebind(defaults,'jump','KeyE');assert.equal(dup.ok,false);assert.equal(dup.conflict,'interact');assert.match(dup.message,/Trùng phím/);
 assert.equal(rebind(defaults,'left','ArrowLeft').conflict,'camera');
 const ok=rebind(defaults,'jump','KeyJ');assert.equal(ok.ok,true);assert.equal(ok.bindings.jump,'KeyJ');assert.equal(defaults.jump,'Space');
 assert.deepEqual(loadBindings({...defaults,jump:'KeyE'}),defaults);assert.deepEqual(loadBindings(null),defaults);assert.deepEqual(loadBindings(ok.bindings),ok.bindings);
 assert.equal(keyLabel('KeyW'),'W');assert.equal(keyLabel('ShiftLeft'),'Shift');assert.equal(keyLabel('Escape'),'Esc');
});
test('benchmark scene: 200 wandering shades, 100 motes, L1–L3 lit at fuel 100; no spawn/damage/pickup/burn/end',()=>{
 const a=benchmarkScene(contract.tuning,42),b=benchmarkScene(contract.tuning,42),g=a.game;
 assert.equal(g.shades.length,200);assert.equal(g.motes.length,100);assert.deepEqual(g.player.pos,[0,0,0]);assert.ok(g.shades.every(s=>s.state==='wander'));
 assert.deepEqual(g.lanterns.filter(l=>l.lit).map(l=>[l.id,l.fuel]),[['L1',100],['L2',100],['L3',100]]);assert.ok(g.shades.every(s=>Math.hypot(s.pos[0],s.pos[2])<40));
 const start=g.shades.map(s=>[...s.pos]);for(let i=0;i<1800;i++){a.step();b.step();}
 assert.equal(g.shades.length,200);assert.equal(g.motes.length,100);assert.ok(g.shades.every(s=>s.state==='wander'));assert.deepEqual(g.lanterns.filter(l=>l.lit).map(l=>l.fuel),[100,100,100]);
 assert.equal(g.player.flames,3);assert.equal(g.player.carried,0);assert.equal(g.state,'playing');assert.equal(g.events.length,0);assert.equal(g.score,0);
 assert.ok(g.shades.some((s,i)=>Math.hypot(s.pos[0]-start[i][0],s.pos[2]-start[i][2])>1),'shades still move with wander');
 assert.deepEqual(g.shades.map(s=>s.pos),b.game.shades.map(s=>s.pos),'seeded scene is deterministic');
 assert.notDeepEqual(benchmarkScene(contract.tuning,7).game.shades[0].pos,benchmarkScene(contract.tuning,42).game.shades[0].pos);
});
test('soak command: one process, rotating nights, no crashes, bad args exit 2',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'lantern-soak-')),out=path.join(dir,'soak.json');
 try{const run=node(['--expose-gc','scripts/soak.mjs','--seed','7','--nights','4','--out',out]);assert.equal(run.status,0,run.stderr);const r=JSON.parse(readFileSync(out,'utf8'));
  assert.equal(r.nights,4);assert.equal(r.crashes,0);assert.equal(r.results.length,4);assert.ok(r.results.every(x=>['won','lost'].includes(x)));for(const k of['mem_start_mb','mem_end_mb','duration_s'])assert.ok(r[k]>0,k);
  assert.equal(node(['scripts/soak.mjs','--seed','x','--nights','2','--out',out]).status,2);assert.equal(node(['scripts/soak.mjs','--bogus','1']).status,2);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('bench command rejects bad arguments with exit code 2 before launching a browser',()=>{
 assert.equal(node(['scripts/bench.mjs','--seed','abc','--duration','30','--out','x.json']).status,2);assert.equal(node(['scripts/bench.mjs','--duration','-1']).status,2);assert.equal(node(['scripts/bench.mjs','--fps','1']).status,2);
});
test('campaign counts nights won for the leaderboard entry',()=>{
 const c=new Campaign();assert.equal(c.nightsWon,0);c.complete({state:'won',night:1,score:400});c.complete({state:'lost',night:2,score:99});assert.equal(c.nightsWon,1);assert.equal(c.total,400);c.reset();assert.equal(c.nightsWon,0);
});
