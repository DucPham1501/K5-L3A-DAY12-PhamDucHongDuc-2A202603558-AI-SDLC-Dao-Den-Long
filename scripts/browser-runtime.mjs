import {spawn,execFile} from 'node:child_process';
import {chromium} from 'playwright-core';
export async function startServer(extra={}){
 const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'0',...extra},stdio:['ignore','pipe','pipe']});
 const url=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Server startup timeout')),10000);server.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0]);}});server.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Server exited ${code}`));});});return{server,url};
}
// Chromium flags that uncap requestAnimationFrame from the display refresh (vsync off).
export const VSYNC_OFF_ARGS=['--disable-gpu-vsync','--disable-frame-rate-limit','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--disable-background-timer-throttling'];
function browserOptions({headed=false,vsyncOff=false}={}){
 const options={headless:!headed,args:headed?['--window-size=1280,720','--window-position=40,40']:[]};if(vsyncOff)options.args.push(...VSYNC_OFF_ARGS);
 if(process.env.SOFTWARE_WEBGL==='1')options.args.push('--use-angle=swiftshader','--enable-unsafe-swiftshader');if(process.env.BROWSER_PATH)options.executablePath=process.env.BROWSER_PATH;else options.channel=process.env.BROWSER_CHANNEL??(process.platform==='win32'?'msedge':'chrome');return options;
}
export function launchBrowser(opts={}){return chromium.launch(browserOptions(opts));}
// Launch as a server so we know the browser PID and can sample the RSS of its whole process tree.
export async function launchBrowserWithPid(opts={}){const server=await chromium.launchServer(browserOptions(opts));const browser=await chromium.connect(server.wsEndpoint());return{browser,pid:server.process().pid,close:async()=>{await browser.close().catch(()=>{});await server.close().catch(()=>{});}};}
/**
 * Samples the summed resident memory (RSS / Windows working set) of `rootPid` and all descendants.
 * One long-lived sampler process (PowerShell on Windows, `ps` loop elsewhere) keeps overhead low.
 * Returns {stop():Promise<number|null>} → peak MB, or null if sampling was not possible.
 */
export function sampleTreeMemory(rootPid,intervalMs=1000){
 let peak=null,child,timer,stopped=false;const record=mb=>{if(Number.isFinite(mb)&&mb>0)peak=Math.max(peak??0,mb);};
 const sumTree=rows=>{const kids=new Map();for(const[pid,ppid,kb]of rows){if(!kids.has(ppid))kids.set(ppid,[]);kids.get(ppid).push([pid,kb]);}const self=rows.find(r=>r[0]===rootPid);let total=self?self[2]:0;const stack=[rootPid],seen=new Set([rootPid]);while(stack.length){for(const[pid,kb]of kids.get(stack.pop())??[]){if(seen.has(pid))continue;seen.add(pid);total+=kb;stack.push(pid);}}return self||seen.size>1?total/1024:NaN;};
 if(process.platform==='win32'){
  // Enumerate the process tree once (CIM is expensive), then poll only those PIDs with cheap Get-Process,
  // re-enumerating every 10 samples. The sampler runs at below-normal priority to avoid disturbing frame times.
  const script=`$ErrorActionPreference='SilentlyContinue';[System.Diagnostics.Process]::GetCurrentProcess().PriorityClass='BelowNormal';$n=0;$ids=@();while($true){if($n%10 -eq 0){$p=Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId;$m=@{};foreach($x in $p){$pp=[int]$x.ParentProcessId;if(-not $m.ContainsKey($pp)){$m[$pp]=@()};$m[$pp]+=[int]$x.ProcessId};$ids=@([int]${rootPid});$q=New-Object System.Collections.Queue;$q.Enqueue([int]${rootPid});while($q.Count){$c=[int]$q.Dequeue();foreach($k in $m[$c]){if($k -ne $c -and $ids -notcontains $k){$ids+=$k;$q.Enqueue($k)}}}};$n++;$t=(Get-Process -Id $ids | Measure-Object -Property WorkingSet64 -Sum).Sum;[Console]::Out.WriteLine($t/1MB);[Console]::Out.Flush();Start-Sleep -Milliseconds ${intervalMs}}`;
  try{child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{stdio:['ignore','pipe','ignore'],windowsHide:true});child.on('error',()=>{});child.stdout.on('data',d=>String(d).split(/\r?\n/).forEach(line=>record(Number(line))));}catch{}
 }else{
  const tick=()=>{if(stopped)return;execFile('ps',['-A','-o','pid=,ppid=,rss='],(error,out)=>{if(!error)record(sumTree(out.trim().split('\n').map(l=>l.trim().split(/\s+/).map(Number))));if(!stopped)timer=setTimeout(tick,intervalMs);});};tick();
 }
 return{stop:async()=>{stopped=true;clearTimeout(timer);child?.kill();return peak===null?null:Math.round(peak*10)/10;}};
}
