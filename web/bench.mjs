// Standard benchmark scene (identical for every submission): Night 1, full lighting/effects,
// 200 wandering shades + 100 motes (seeded), L1–L3 lit at fuel 100, Mây idle at (0,0,0).
// Spawning, damage, pickup, fuel burn and night end are disabled; shades keep the normal wander rule.
import {World} from './world.mjs';
import {benchmarkScene} from '../src/core/benchmark.mjs';
import {frameMetrics} from '../src/core/metrics.mjs';
const params=new URLSearchParams(location.search),seed=Number(params.get('seed')??42),duration=Number(params.get('duration')??30),WARMUP_MS=3000;
const {tuning}=await(await fetch('/game.contract.json')).json(),scene=benchmarkScene(tuning,seed),world=new World(document.getElementById('game'));world.load(scene.game.map);
const gl=world.renderer.getContext(),info=gl.getExtension('WEBGL_debug_renderer_info'),gpu=info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):'GPU unavailable';
let first,last,measureStart,previous,acc=0;const samples=[];
window.bench={done:false,first_frame_epoch_ms:null,gpu,scene:()=>({shades:scene.game.shades.length,motes:scene.game.motes.length,states:[...new Set(scene.game.shades.map(s=>s.state))],player:scene.game.player.pos,fuels:scene.game.lanterns.filter(l=>l.lit).map(l=>l.fuel),camera:world.camera.position.toArray()})};
function frame(now){
 first??=now;const delta=last===undefined?0:(now-last)/1000;last=now;acc+=Math.min(delta,.25);while(acc>=1/60){scene.step();acc-=1/60;}
 // Camera time is wall-clock since the first bench frame: start angle 0° → (30,15,0).
 world.update(scene.game,0,delta,false,(now-first)/1000);
 if(window.bench.first_frame_epoch_ms===null)window.bench.first_frame_epoch_ms=Date.now();
 if(measureStart===undefined){if(now-first>=WARMUP_MS){measureStart=now;previous=now;window.benchPhase?.('measure');}}
 else{samples.push(now-previous);previous=now;if(now-measureStart>=duration*1000){window.bench.report={...frameMetrics(samples),measurement_ms:now-measureStart};window.bench.done=true;return;}}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
