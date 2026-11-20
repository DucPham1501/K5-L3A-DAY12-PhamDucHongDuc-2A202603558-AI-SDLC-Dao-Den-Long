import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Game, distance } from '../src/core/game.mjs';
import { validateInputs, validateScenario, DataError } from '../src/core/validate.mjs';

const { tuning: t } = JSON.parse(readFileSync(new URL('../game.contract.json', import.meta.url)));
const fixture = (scenario = {}) => new Game(t, { seed: 42, scenario: { random_motes: false, random_shades: false, ...scenario } });
const close = (actual, expected, epsilon = 1e-7) => assert.ok(Math.abs(actual-expected) < epsilon, `${actual} ≠ ${expected}`);
const names = events => events.map(e=>e.name);
const litOthers = ['L2','L3','L4','L5'].map(id=>({id,lit:true}));
const run = (game, ticks, input = {}) => { for(let i=0;i<ticks && game.state==='playing';i++) game.step(input); return game; };

test('tick 0: setup has no events/score; lantern patches preserve five lanterns', () => {
  const g = fixture({ player: { pos:[0,0,0], carried:4 }, motes:[[0,0,0]], lanterns:[{id:'L1',lit:true}] });
  assert.equal(g.tick,0); assert.equal(g.score,0); assert.deepEqual(g.events,[]);
  assert.equal(g.player.carried,4); assert.equal(g.lanterns.length,5); assert.equal(g.snapshot().motes_active,1);
  assert.equal(g.lanterns[0].deposited,t.lantern_cost);
});
test('fixed speed, persistent input and exact time model', () => {
  const g=fixture(); g.step({move:[0,1]}); run(g,119);
  close(g.player.pos[2],12); close(g.timeLeft,298); assert.equal(g.tick,120);
});
test('diagonal movement is normalized', () => {
  const g=fixture(); run(g,60,{move:[1,1]}); close(distance(g.player.pos,[0,0,0]),6);
});
test('camera-relative formula rotates +Z to +X at 90 degrees', () => {
  const g=fixture(); run(g,60,{move:[0,1],cam_yaw_deg:90}); close(g.player.pos[0],6); close(g.player.pos[2],0);
});
test('jump uses a rising edge, lands without auto-jumping while held', () => {
  const g=fixture(); g.step({jump:true}); assert.ok(g.player.pos[1]>0);
  run(g,120,{jump:true}); close(g.player.pos[1],0);
  g.step({jump:false}); g.step({jump:true}); assert.ok(g.player.pos[1]>0);
});
test('pickup uses XZ distance even during jump; inclusive boundary', () => {
  const g=fixture({player:{pos:[0,8,0]},motes:[[t.pickup_radius,0,0],[t.pickup_radius+.001,0,0]]});
  const e=g.step(); assert.equal(g.player.carried,1); assert.equal(g.motes.length,1);
  assert.equal(g.score,t.score.per_mote); assert.equal(e[0].tick,1);
});
test('pickup stops at capacity and does not consume excess motes', () => {
  const g=fixture({player:{carried:t.carry_capacity-1},motes:[[0,0,0],[0,0,0]]});
  g.step(); assert.equal(g.player.carried,t.carry_capacity); assert.equal(g.motes.length,1);
});
test('deposit at exact interaction boundary, partial then full, preserve overflow', () => {
  const g=fixture({player:{carried:4},lanterns:[{id:'L1',pos:[t.interact_radius,0,0]}]});
  assert.deepEqual(names(g.step({interact:true})),['deposit']); assert.equal(g.lanterns[0].deposited,4);
  g.player.carried=10; g.step({interact:true}); assert.equal(g.lanterns[0].deposited,4);
  g.step({interact:false}); const events=g.step({interact:true});
  assert.deepEqual(names(events),['deposit','lantern_lit']); assert.equal(g.player.carried,4);
  assert.equal(g.score,t.score.per_lantern);
  g.step({interact:false}); assert.deepEqual(g.step({interact:true}),[]); assert.equal(g.score,t.score.per_lantern);
});
test('deposit outside radius does nothing', () => {
  const g=fixture({player:{carried:10},lanterns:[{id:'L1',pos:[t.interact_radius+.001,0,0]}]});
  assert.deepEqual(g.step({interact:true}),[]); assert.equal(g.player.carried,10);
});
test('nearest unlit lantern is chosen when interaction ranges overlap', () => {
  const g=fixture({player:{carried:10},lanterns:[{id:'L1',pos:[1.5,0,0]},{id:'L2',pos:[1,0,0]}]});
  const events=g.step({interact:true}); assert.equal(events[0].data.lantern_id,'L2');
});
test('pulse includes exact radius, pushes, stuns and scores by affected shades', () => {
  const g=fixture({player:{carried:10},shades:[{id:'inside',pos:[t.pulse_radius,1,0]},{id:'outside',pos:[t.pulse_radius+.001,1,0]}]});
  const events=g.step({pulse:true}); const e=events.find(e=>e.name==='pulse');
  assert.deepEqual(e.data.stunned_ids,['inside']); assert.equal(g.player.carried,7);
  assert.equal(g.shades[0].state,'stunned'); close(g.shades[0].pos[0],8);
  assert.equal(g.score,t.score.per_stun);
});
test('pulse without resources does not fire; holding the button never retries', () => {
  const g=fixture({player:{carried:2}}); assert.deepEqual(g.step({pulse:true}),[]);
  g.player.carried=10; assert.deepEqual(g.step({pulse:true}),[]);
  g.step({pulse:false}); assert.equal(g.step({pulse:true})[0].name,'pulse');
});
test('pulse cooldown prevents rapid reactivation but allows action after expiry', () => {
  const g=fixture({player:{carried:20}}); g.step({pulse:true}); g.step({pulse:false});
  assert.deepEqual(g.step({pulse:true}),[]); assert.equal(g.player.carried,17);
  run(g,57,{pulse:false}); assert.equal(g.step({pulse:true})[0].name,'pulse');
});
test('stun prevents motion and contact damage; chase resumes at expiry', () => {
  const g=fixture({player:{carried:10},shades:[{pos:[0,0,0]}]}); g.step({pulse:true});
  const pos=[...g.shades[0].pos]; run(g,119,{pulse:false}); assert.deepEqual(g.shades[0].pos,pos);
  g.step(); assert.equal(g.shades[0].state,'chase'); assert.ok(g.shades[0].pos[0]<pos[0]); assert.equal(g.player.flames,3);
});
test('shade chases at declared speed', () => {
  const g=fixture({shades:[{pos:[10,0,0]}]}); run(g,60); close(g.shades[0].pos[0],10-t.shade_speed);
});
test('contact loses one flame; overlapping shades respect shared invulnerability', () => {
  const g=fixture({shades:[{pos:[0,0,0]},{pos:[0,0,0]}]});
  const e=g.step(); assert.equal(e.filter(e=>e.name==='player_hit').length,1); assert.equal(g.player.flames,2);
  run(g,89); assert.equal(g.player.flames,2); g.step(); assert.equal(g.player.flames,1);
});
test('lit lantern safe zone excludes shades and prevents damage at boundary', () => {
  const g=fixture({player:{pos:[t.safe_radius,0,0]},lanterns:[{id:'L1',pos:[0,0,0],lit:true}],shades:[{pos:[t.safe_radius,0,0]}]});
  run(g,120); assert.equal(g.player.flames,3); assert.ok(distance(g.shades[0].pos,[0,0,0])>t.safe_radius);
});
test('hit drop ratio is zero and inventory is retained', () => {
  const g=fixture({player:{carried:17},shades:[{pos:[0,0,0]}]}); const e=g.step().find(e=>e.name==='player_hit');
  assert.equal(e.data.dropped,0); assert.equal(g.player.carried,17);
});
test('zero flames ends with no_flames once and simulation freezes', () => {
  const g=fixture({player:{flames:1},shades:[{pos:[0,0,0]}]}); const events=g.step();
  assert.equal(g.state,'lost'); assert.deepEqual(events.at(-1).data,{result:'lost',reason:'no_flames'});
  assert.deepEqual(g.step(),[]); assert.equal(g.tick,1);
});
test('dawn ends at exact number of steps', () => {
  const g=fixture({time_left_s:1}); run(g,60); assert.equal(g.tick,60); assert.equal(g.timeLeft,0);
  assert.equal(g.state,'lost'); assert.equal(g.events.at(-1).data.reason,'dawn');
});
test('last lantern wins, with declared bonuses; scenario-lit lamps award nothing', () => {
  const g=fixture({player:{carried:10},lanterns:[{id:'L1',pos:[0,0,0]},...litOthers]});
  const events=g.step({interact:true}); assert.equal(g.state,'won');
  assert.deepEqual(names(events),['deposit','lantern_lit','game_over']);
  assert.equal(g.score,t.score.per_lantern+299*t.score.per_second_left+3*t.score.per_flame_left);
});
test('all-lit scenario stays playing at snapshot 0, then resolves without lighting points', () => {
  const g=fixture({lanterns:['L1',...litOthers.map(l=>l.id)].map(id=>({id,lit:true}))});
  assert.equal(g.state,'playing'); assert.equal(g.score,0); g.step(); assert.equal(g.state,'won');
  assert.equal(g.events.filter(e=>e.name==='lantern_lit').length,0);
});
test('scenario arrays replace lists; random flags prevent all later spawning', () => {
  const g=fixture({motes:[],shades:[]}); run(g,1800); assert.deepEqual(g.motes,[]); assert.deepEqual(g.shades,[]);
});
test('default random world spawns deterministic shades with events after tick 0', () => {
  const g=new Game(t,{seed:13,scenario:{player:{pos:[0,0,0]},lanterns:[{id:'L1',pos:[0,0,0],lit:true}]}});
  const count=g.shades.length; run(g,900); assert.equal(g.shades.length,count+1);
  assert.equal(g.events.find(e=>e.name==='shade_spawned').tick,900);
});
test('same seed, scenario, inputs gives byte-identical snapshots and IDs', () => {
  const simulate = () => {
    const g=new Game(t,{seed:517}); const output=[g.snapshot()];
    for(let i=0;i<200;i++) { output.push(...g.step({move:[0,1],pulse:i%70===0})); if(i%10===0) output.push(g.snapshot()); }
    return JSON.stringify(output);
  };
  assert.equal(simulate(),simulate());
});
test('explicit shade IDs cannot collide with automatic IDs', () => {
  const g=fixture({shades:[{pos:[1,0,0]},{id:'S1',pos:[2,0,0]},{pos:[3,0,0]}]});
  assert.equal(new Set(g.shades.map(s=>s.id)).size,3);
});
test('island boundary blocks outward motion without fall penalties', () => {
  const g=fixture({player:{pos:[30,0,0]}}); run(g,60,{move:[1,0]}); close(g.player.pos[0],30); assert.equal(g.player.flames,3);
});
test('snapshots round all coordinates to three decimals', () => {
  const g=fixture({player:{pos:[.123456,0,-.000001]}}); assert.deepEqual(g.snapshot().player.pos,[.123,0,0]);
});

test('invalid frame/scenario formats rejected with DataError', () => {
  const invalidInputs=[{}, {frames:[{tick:1},{tick:1}]}, {frames:[{tick:2},{tick:1}]}, {frames:[{tick:-1}]}, {frames:[{tick:0,move:[2,0]}]}, {frames:[{tick:0,pulse:1}]}, {frames:[{tick:0,move:[0]}]}, {frames:[{tick:0,cam_yaw_deg:Infinity}]}];
  for(const input of invalidInputs) assert.throws(()=>validateInputs(input),DataError);
  for(const s of [{random_motes:1},{player:{carried:21}},{player:{pos:[0,0]}},{lanterns:[{id:'L6'}]},{shades:[{id:'x',pos:[0,0,0]},{id:'x',pos:[0,0,0]}]},{time_left_s:-1}])
    assert.throws(()=>validateScenario(s,t),DataError);
});

const root = new URL('../', import.meta.url);
test('real CLI: no GPU, fixed ticks, events, snapshots and final end record', () => {
  const dir=mkdtempSync(path.join(os.tmpdir(),'lantern-cli-'));
  try {
    const scenario=path.join(dir,'scenario.json'), inputs=path.join(dir,'inputs.json'), output=path.join(dir,'out.jsonl');
    writeFileSync(scenario,JSON.stringify({random_motes:false,random_shades:false,motes:[[0,0,0]]}));
    writeFileSync(inputs,JSON.stringify({frames:[{tick:0,move:[0,1]},{tick:2,move:[0,0]}]}));
    const result=spawnSync(process.execPath,['src/headless.mjs','--seed','42','--night','1','--scenario',scenario,'--inputs',inputs,'--ticks','7','--snapshot-every','3','--out',output],{cwd:root,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const lines=readFileSync(output,'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(lines.filter(l=>l.type==='snapshot').map(l=>l.tick),[0,3,6,7]);
    assert.equal(lines[0].player.carried,0); assert.equal(lines[1].name,'mote_picked'); assert.equal(lines[1].tick,1);
    assert.equal(lines.at(-1).type,'end'); assert.equal(lines.at(-1).ticks,7);
    close(lines.at(-2).player.pos[2],.2);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
test('real CLI: invalid JSON and invalid schema return exit 2, errors to stderr', () => {
  const dir=mkdtempSync(path.join(os.tmpdir(),'lantern-invalid-'));
  try {
    const input=path.join(dir,'inputs.json');
    for(const text of ['{bad','{"frames":[{"tick":0,"pulse":1}]}']) {
      writeFileSync(input,text);
      const result=spawnSync(process.execPath,['src/headless.mjs','--seed','1','--night','1','--inputs',input,'--ticks','1','--out',path.join(dir,'out.jsonl')],{cwd:root,encoding:'utf8'});
      assert.equal(result.status,2); assert.ok(result.stderr.length>0); assert.equal(result.stdout,'');
    }
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
test('real CLI: zero ticks produces snapshot 0 then end; unsupported night fails', () => {
  const dir=mkdtempSync(path.join(os.tmpdir(),'lantern-zero-'));
  try {
    const output=path.join(dir,'out.jsonl');
    const args=['src/headless.mjs','--seed','-1','--night','1','--ticks','0','--out',output];
    assert.equal(spawnSync(process.execPath,args,{cwd:root}).status,0);
    const lines=readFileSync(output,'utf8').trim().split('\n').map(JSON.parse);
    assert.equal(lines.length,2); assert.equal(lines[1].ticks,0);
    args[4]='2'; assert.equal(spawnSync(process.execPath,args,{cwd:root}).status,1);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
