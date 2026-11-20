// Ticket-04 benchmark: node scripts/bench.mjs --seed 42 --duration 30 --out bench.json
// Opens a real 1280×720 browser window (not fullscreen), vsync disabled via Chromium flags,
// loads the standard Night-1 scene (200 wandering shades, 100 motes, L1–L3 lit at fuel 100),
// 3 s warm-up, then measures exactly --duration seconds and exits 0.
import {writeFileSync} from 'node:fs';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {startServer,launchBrowserWithPid,sampleTreeMemory} from './browser-runtime.mjs';
// load_ms is measured from process start (Node's time origin), not from when this module ran.
const processStart=performance.timeOrigin;
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
function usage(message){process.stderr.write(`${message}\nUsage: node scripts/bench.mjs --seed INT --duration SECONDS --out bench.json\n`);process.exit(2);}
const args=process.argv.slice(2),o={};for(let i=0;i<args.length;i+=2){if(!['--seed','--duration','--out'].includes(args[i])||args[i+1]===undefined||args[i]in o)usage('Invalid benchmark arguments');o[args[i]]=args[i+1];}
const seed=Number(o['--seed']??42),duration=Number(o['--duration']??30),out=o['--out']??'bench.json';
if(!Number.isSafeInteger(seed)||!Number.isFinite(duration)||duration<=0||duration>3600)usage('Seed must be an integer and duration a positive number of seconds');
const vsyncOff=process.env.BENCH_VSYNC!=='on';
let runtime,server,memory;
try{
 const started=await startServer();server=started.server;
 runtime=await launchBrowserWithPid({headed:true,vsyncOff});const {browser}=runtime;
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.exposeFunction('benchPhase',phase=>{if(phase==='measure'&&process.env.BENCH_MEMORY!=='off')memory=sampleTreeMemory(runtime.pid,2000);});
 await page.goto(`${started.url}/web/bench.html?seed=${seed}&duration=${duration}`,{waitUntil:'load'});
 await page.waitForFunction(()=>window.bench?.done,{},{timeout:(duration+60)*1000,polling:500});
 const peak=await memory?.stop()??null;
 const data=await page.evaluate(()=>({report:window.bench.report,first:window.bench.first_frame_epoch_ms,scene:window.bench.scene(),gpu:window.bench.gpu}));if(errors.length)throw new Error(errors.join('\n'));
 if(data.scene.shades!==200||data.scene.motes!==100||data.scene.states.some(s=>s!=='wander')||data.scene.fuels.length!==3||data.scene.fuels.some(f=>f!==100))throw new Error('Benchmark scene violated contract: '+JSON.stringify(data.scene));
 const r=n=>Math.round(n*100)/100;
 const report={contract_version:'1.3',avg_fps:r(data.report.avg_fps),p1_low_fps:r(data.report.p1_low_fps),frame_ms_p95:r(data.report.frame_ms_p95),frames:data.report.frames,load_ms:Math.round(data.first-processStart),peak_mem_mb:peak,vsync_off:vsyncOff,
  renderer:`Three.js 0.170.0 / WebGL2 / ${browser.browserType().name()} ${browser.version()} (${data.gpu})`,os:`${os.type()} ${os.release()} ${os.arch()} · ${os.cpus()[0]?.model?.trim()} · ${Math.round(os.totalmem()/1073741824)} GB RAM`,
  measurement_ms:r(data.report.measurement_ms)};
 writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}catch(error){process.stderr.write(`Benchmark failed: ${error.stack??error.message}\n`);process.exitCode=1;}
finally{await memory?.stop();await runtime?.close();server?.kill();}
