import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { Game, distance } from '../src/core/game.mjs';
const {tuning:t}=JSON.parse(readFileSync(new URL('../game.contract.json',import.meta.url)));
const g=new Game(t,{seed:12});
const frames=[];
let lastPulse=false, lastInteract=false, target;
for(let k=0;k<18000 && g.state==='playing';k++) {
  const p=g.player;
  const lamps=g.lanterns.filter(l=>!l.lit).sort((a,b)=>distance(p.pos,a.pos)-distance(p.pos,b.pos));
  const lamp=lamps[0];
  if(!lamp) break;
  const canDeposit=p.carried>=t.lantern_cost-lamp.deposited;
  if(canDeposit) target=lamp;
  else if(!target || !g.motes.includes(target)) target=g.motes.toSorted((a,b)=>distance(p.pos,a.pos)-distance(p.pos,b.pos))[0];
  if(!target) target=lamp;
  const d=distance(p.pos,target.pos), dx=target.pos[0]-p.pos[0], dz=target.pos[2]-p.pos[2];
  const interact=!lastInteract && distance(p.pos,lamp.pos)<=t.interact_radius-.1 && p.carried>0;
  const pulse=!lastPulse && p.carried>=t.pulse_cost && g.tick>=g.pulseReady && g.shades.some(s=>s.state!=='stunned' && distance(p.pos,s.pos)<3.7);
  const frame={tick:k,move:d>.2?[dx/d,dz/d]:[0,0],interact,pulse};
  frames.push(frame); g.step(frame); lastPulse=pulse; lastInteract=interact;
  if(target===lamp && lamp.lit) target=undefined;
}
mkdirSync('docs/proof/phase-1',{recursive:true});
writeFileSync('docs/proof/phase-1/playthrough.inputs.json',JSON.stringify({frames})+'\n');
writeFileSync('docs/proof/phase-1/playthrough-summary.json',JSON.stringify({seed:12,description:'Automated controller; normal initial world, no scenario overrides or state mutations',...g.end(),lanterns:g.lanterns.map(l=>({id:l.id,lit:l.lit})),flames:g.player.flames},null,2)+'\n');
console.log(JSON.stringify(g.end()));
if(g.state!=='won') process.exitCode=1;
