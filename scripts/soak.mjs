import {readFileSync,writeFileSync} from 'node:fs';
import {Game,seededRandom} from '../src/core/game.mjs';
// Ticket-04 soak: 10 consecutive headless nights (1→2→3 rotating) in ONE process. Night index i (0-based)
// uses seed+i. Seeded random input: new direction every 30 ticks; per tick 5% jump, 3% dash, 2% pulse, 10% interact.
function usage(message){process.stderr.write(`${message}
Usage: node scripts/soak.mjs --seed INT --nights POSITIVE_INT --out soak.json
`);process.exit(2);}
const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i+=2){if(!['--seed','--nights','--out'].includes(args[i])||args[i+1]===undefined||args[i]in options)usage('Invalid soak arguments');options[args[i]]=args[i+1];}
const seed=Number(options['--seed']??7),nights=Number(options['--nights']??10);if(!Number.isSafeInteger(seed)||!Number.isSafeInteger(nights)||nights<1||nights>1000)usage('Seed must be an integer and nights a positive integer');options['--out']??='soak.json';
const {tuning}=JSON.parse(readFileSync(new URL('../game.contract.json',import.meta.url)));const begin=performance.now();
let current=new Game(tuning,{seed,night:1});global.gc?.();const mem_start_mb=process.memoryUsage.rss()/1048576,results=[];let crashes=0;
for(let i=0;i<nights;i++){
 try{
  if(i>0){current=new Game(tuning,{seed:seed+i,night:i%3+1});global.gc?.();}
  const rng=seededRandom(seed+i);let move=[0,0];const limit=tuning[`night${i%3+1}_duration_s`]*60;
  for(let k=0;k<limit&&current.state==='playing';k++){
   if(k%30===0){const angle=rng()*Math.PI*2;move=[Math.cos(angle),Math.sin(angle)];}
   current.step({move,jump:rng()<.05,dash:rng()<.03,pulse:rng()<.02,interact:rng()<.1});
  }
  results.push(current.state);
 }catch(error){crashes++;results.push('crashed');process.stderr.write(`Night ${i+1}: ${error.message}\n`);}
}
current=null;global.gc?.();current=new Game(tuning,{seed:seed+nights,night:nights%3+1});global.gc?.();
const report={nights,crashes,results,mem_start_mb,mem_end_mb:process.memoryUsage.rss()/1048576,duration_s:(performance.now()-begin)/1000};
writeFileSync(options['--out'],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(crashes)process.exitCode=1;
