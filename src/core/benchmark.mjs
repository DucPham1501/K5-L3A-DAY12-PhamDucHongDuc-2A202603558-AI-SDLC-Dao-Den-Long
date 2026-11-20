import {Game,seededRandom} from './game.mjs';
export const BENCH_SHADES=200,BENCH_MOTES=100;
// Even spread over the Night-1 island (radius 40) with a golden-angle spiral; the seed only rotates it.
export function spreadPoints(rng,count,y,radius=39){const phase=rng()*Math.PI*2;return Array.from({length:count},(_,i)=>{const a=i*Math.PI*(3-Math.sqrt(5))+phase,r=radius*Math.sqrt((i+.5)/count);return[r*Math.cos(a),y,r*Math.sin(a)];});}
export function benchmarkScene(tuning,seed=42){
 const rng=seededRandom(seed);
 const game=new Game(tuning,{seed,night:1,scenario:{random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false,player:{pos:[0,0,0]},motes:spreadPoints(rng,BENCH_MOTES,0),shades:spreadPoints(rng,BENCH_SHADES,.8).map((pos,i)=>({id:`S${i+1}`,pos,state:'wander'})),lanterns:['L1','L2','L3'].map(id=>({id,lit:true,fuel:100}))}});
 // Bench step: only shade movement with the normal wander rule. No spawning, damage, pickup, fuel burn or night end.
 return{game,step(){game.tick++;game.simTick++;for(const shade of game.shades){shade.pos=game.projectSafe(shade.pos);game.wander(shade);}}};
}
