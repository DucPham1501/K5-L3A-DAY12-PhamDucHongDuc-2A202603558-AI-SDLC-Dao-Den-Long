// Phase 4 browser QA (Edge/Chromium, 1280×720). Writes docs/proof/phase-4/browser-qa.json + screenshots.
// Keeps the Phase 2–3 regression checks and adds Ticket-04: font sizes, large text, key rebinding,
// captions/indicators, reduced motion and the local leaderboard (UI → disk → CLI export).
import {chromium} from 'playwright-core';
import {spawn,spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));const dir='docs/proof/phase-4';mkdirSync(dir,{recursive:true});
const dataDir=mkdtempSync(path.join(os.tmpdir(),'lantern-qa-')),PORT='4175',URL_=`http://127.0.0.1:${PORT}`;
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT,LANTERN_DATA_DIR:dataDir},stdio:'pipe'});let browser;const errors=[],checks=[],fps=[];
const options={headless:true};if(process.env.SOFTWARE_WEBGL==='1')options.args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'];if(process.env.BROWSER_PATH)options.executablePath=process.env.BROWSER_PATH;else options.channel='msedge';
const fixture=async(context,scenario)=>{const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(`globalThis.__qaScenario=${scenario};`);
 await page.route('**/src/core/game.mjs',async route=>{const response=await route.fetch();const body=(await response.text()).replace('validateScenario(scenario,tuning,night);','scenario=globalThis.__qaScenario?.(night)??scenario;validateScenario(scenario,tuning,night);');await route.fulfill({response,body});});
 await page.goto(URL_,{waitUntil:'networkidle'});return page;};
const begin=async(page,night=1)=>{await page.getByRole('button',{name:'Bắt đầu hành trình'}).click();await page.getByRole('button',{name:`Vào Đêm ${night}`}).click();};
// Every visible text node at 1280×720 must render ≥ min px.
const smallText=(page,min)=>page.evaluate(min=>{const bad=[],walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode;if(!n.textContent.trim())continue;const el=n.parentElement;if(el.closest('[hidden]')||el.closest('script,style'))continue;const st=getComputedStyle(el),r=el.getBoundingClientRect();if(r.width===0||st.display==='none'||st.visibility==='hidden')continue;const fs=parseFloat(st.fontSize);if(fs<min-.01)bad.push({text:n.textContent.trim().slice(0,30),fs});}return bad;},min);
const layout=page=>page.evaluate(()=>{const ids=['.health-panel','.clock-panel','.score-panel','.map-panel','.inventory','.abilities','.controls'],boxes=ids.map(s=>[s,document.querySelector(s).getBoundingClientRect()]).filter(([,r])=>r.width>0);const out=[],overlaps=[];for(const[s,r]of boxes)if(r.left<0||r.top<0||r.right>innerWidth+.5||r.bottom>innerHeight+.5)out.push(s);for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const[a,ra]=boxes[i],[b,rb]=boxes[j];if(ra.left<rb.right&&rb.left<ra.right&&ra.top<rb.bottom&&rb.top<ra.bottom)overlaps.push(`${a}×${b}`);}return{out,overlaps};});
try{
 for(let i=0;i<50;i++){try{if((await fetch(URL_)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch(options);const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
 // ---- Regression: three maps, movement, pause, FPS; Phase 4 shade indicator on Night 1 ----
 for(let night=1;night<=3;night++){
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  if(night>1)await page.route('**/campaign.mjs',async route=>{const response=await route.fetch();const body=(await response.text()).replace('this.night=1;',`this.night=${night};`);await route.fulfill({response,body});});
  await page.goto(URL_,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.lanternGame);
  if(night===1){await page.screenshot({path:`${dir}/menu.png`});assert.deepEqual(await smallText(page,18),[],'menu text below 18px');}
  await begin(page,night);await page.waitForFunction(()=>window.lanternGame.snapshot().sim_tick>=3);
  const initial=await page.evaluate(()=>window.lanternGame.snapshot());assert.equal(initial.night,night);
  await page.keyboard.down('KeyD');await page.waitForTimeout(400);await page.keyboard.up('KeyD');const moved=await page.evaluate(()=>window.lanternGame.snapshot());assert.ok(moved.player.pos[0]>initial.player.pos[0]);
  await page.keyboard.press('ShiftLeft');await page.waitForTimeout(100);await page.keyboard.down('Space');await page.waitForTimeout(80);await page.keyboard.up('Space');
  await page.waitForFunction(()=>window.lanternGame.snapshot().sim_tick>=330);
  if(night===1){
   const caps=await page.evaluate(()=>window.lanternGame.captions());assert.ok(caps.some(c=>c.kind==='shade'&&c.text.includes('Bóng Mực xuất hiện')),'missing shade caption');
   const arrows=await page.evaluate(()=>window.lanternGame.indicators());assert.ok(arrows.length>=1,'missing shade arrow');
   assert.deepEqual(await smallText(page,18),[],'HUD text below 18px');const l=await layout(page);assert.deepEqual(l,{out:[],overlaps:[]},'HUD layout overflow/overlap');
   await page.screenshot({path:`${dir}/shade-indicator.png`});checks.push(`Night 1 natural spawn at sim_tick 300: caption "Bóng Mực xuất hiện" + ${arrows.length} direction arrow(s) (edge: ${arrows.map(a=>a.edge).join(',')}); all HUD text ≥18px, panels inside 1280×720 without overlap`);
  }
  await page.waitForFunction(()=>window.lanternGame.snapshot().sim_tick>=420);
  const measured=await page.evaluate(()=>new Promise(resolve=>{const begin=performance.now();let frames=0;function count(now){frames++;if(now-begin>=2500)resolve({fps:frames*1000/(now-begin),frames,elapsed_ms:now-begin});else requestAnimationFrame(count);}requestAnimationFrame(count);}));fps.push({night,...measured,shades:await page.evaluate(()=>window.lanternGame.snapshot().shades.length),draw_calls:await page.evaluate(()=>window.lanternGame.rendererInfo().calls)});
  await page.screenshot({path:`${dir}/night-${night}.png`});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>window.lanternGame.paused);const paused=await page.evaluate(()=>window.lanternGame.snapshot());await page.waitForTimeout(200);const later=await page.evaluate(()=>window.lanternGame.snapshot());assert.equal(later.sim_tick,paused.sim_tick);assert.ok(later.tick>paused.tick);
  if(night===1){await page.getByRole('button',{name:'Cài đặt',exact:true}).click();await page.getByLabel('Âm lượng',{exact:true}).fill('35');await page.getByLabel('Độ nhạy chuột',{exact:true}).fill('140');await page.getByLabel('Bảng màu dễ phân biệt',{exact:true}).check();await page.getByRole('button',{name:'Quay lại'}).click();await page.getByRole('button',{name:'Tiếp tục',exact:true}).click();await page.waitForFunction(()=>window.lanternGame.visuals().some(v=>v.id.startsWith('shade:')&&v.accent==='#00b3ff'));await page.screenshot({path:`${dir}/accessible.png`});await page.keyboard.press('Escape');await page.getByRole('button',{name:'Chơi lại Đêm',exact:true}).click();await page.waitForFunction(()=>window.lanternGame.screen==='playing');checks.push('pause tick/sim_tick, settings, blue shade accents and retry UI');}
  checks.push(`Night ${night} map and movement; screenshot captured.`);await page.close();
 }
 const settingsPage=await context.newPage();await settingsPage.goto(URL_);await settingsPage.waitForFunction(()=>window.lanternGame);const persisted=await settingsPage.evaluate(()=>window.lanternGame.settings());assert.equal(persisted.volume,.35);assert.equal(persisted.sensitivity,1.4);assert.equal(persisted.accessible,true);await settingsPage.close();checks.push('volume, sensitivity and accessible setting persist across page opens');
 // ---- Key rebinding: duplicate warning, assign, persist, works in game, restore defaults ----
 const keysPage=await context.newPage();keysPage.on('pageerror',e=>errors.push(e.message));await keysPage.goto(URL_,{waitUntil:'networkidle'});await keysPage.getByRole('button',{name:'Cài đặt',exact:true}).click();
 for(const label of['Đi tới','Đi lùi','Sang trái','Sang phải','Nhảy','Lướt','Tương tác','Tỏa sáng','Tạm dừng'])await keysPage.getByRole('button',{name:`Đổi phím ${label}`,exact:true}).waitFor();
 await keysPage.getByRole('button',{name:'Đổi phím Nhảy',exact:true}).click();await keysPage.keyboard.press('KeyE');assert.match(await keysPage.locator('#binding-message').textContent(),/Trùng phím: E đang dùng cho “Tương tác”/);assert.equal(await keysPage.evaluate(()=>window.lanternGame.settings().bindings.jump),'Space');
 await keysPage.screenshot({path:`${dir}/rebind-conflict.png`});await keysPage.keyboard.press('KeyJ');assert.equal(await keysPage.evaluate(()=>window.lanternGame.settings().bindings.jump),'KeyJ');
 await keysPage.getByRole('button',{name:'Đổi phím Đi tới',exact:true}).click();await keysPage.keyboard.press('KeyI');
 await keysPage.getByRole('button',{name:'Đổi phím Tạm dừng',exact:true}).click();await keysPage.keyboard.press('KeyP');
 assert.deepEqual(await smallText(keysPage,18),[],'settings text below 18px');await keysPage.screenshot({path:`${dir}/settings.png`});await keysPage.close();
 const keysGame=await context.newPage();keysGame.on('pageerror',e=>errors.push(e.message));await keysGame.goto(URL_,{waitUntil:'networkidle'});assert.equal(await keysGame.evaluate(()=>window.lanternGame.settings().bindings.jump),'KeyJ','binding not persisted');
 await begin(keysGame);await keysGame.waitForFunction(()=>window.lanternGame.snapshot().sim_tick>=3);assert.equal(await keysGame.locator('#jump-key').textContent(),'J');
 const z0=await keysGame.evaluate(()=>window.lanternGame.snapshot().player.pos[2]);await keysGame.keyboard.down('KeyI');await keysGame.waitForTimeout(300);await keysGame.keyboard.up('KeyI');assert.ok(await keysGame.evaluate(()=>window.lanternGame.snapshot().player.pos[2])<z0-.5,'rebound forward key did not move');
 await keysGame.keyboard.down('KeyW');await keysGame.waitForTimeout(200);await keysGame.keyboard.up('KeyW');
 await keysGame.keyboard.press('KeyJ');await keysGame.waitForFunction(()=>window.lanternGame.snapshot().player.pos[1]>.1,null,{timeout:2000});
 await keysGame.keyboard.press('Escape');await keysGame.waitForTimeout(150);assert.equal(await keysGame.evaluate(()=>window.lanternGame.paused),false,'old pause key still pauses');await keysGame.keyboard.press('KeyP');await keysGame.waitForFunction(()=>window.lanternGame.paused);
 await keysGame.getByRole('button',{name:'Cài đặt',exact:true}).click();await keysGame.getByRole('button',{name:'Khôi phục mặc định'}).click();assert.equal(await keysGame.evaluate(()=>JSON.stringify(window.lanternGame.settings().bindings)),JSON.stringify({forward:'KeyW',backward:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',dash:'ShiftLeft',interact:'KeyE',pulse:'KeyQ',pause:'Escape'}));await keysGame.close();
 checks.push('rebinding all 9 actions available; duplicate key E for Jump reported and rejected; J/I/P assigned, persisted across reload, drive jump/forward/pause in game; "Khôi phục mặc định" restores defaults');
 // ---- Large text ×1.25 and reduced motion ----
 const a11y=await context.newPage();a11y.on('pageerror',e=>errors.push(e.message));await a11y.goto(URL_,{waitUntil:'networkidle'});await a11y.getByRole('button',{name:'Cài đặt',exact:true}).click();await a11y.getByLabel('Chữ lớn (×1,25)').check();await a11y.getByLabel(/Giảm chuyển động/).check();
 assert.deepEqual(await smallText(a11y,22.5),[],'large text not ×1.25');await a11y.getByRole('button',{name:'Quay lại'}).click();await begin(a11y);await a11y.waitForFunction(()=>window.lanternGame.snapshot().sim_tick>=3);
 assert.deepEqual(await smallText(a11y,22.5),[],'large HUD text not ×1.25');const big=await layout(a11y);assert.deepEqual(big.out,[],'large-text HUD leaves viewport');
 assert.equal(await a11y.locator('#flash').evaluate(el=>getComputedStyle(el).display),'none');await a11y.screenshot({path:`${dir}/large-text.png`});await a11y.close();
 checks.push(`"Chữ lớn" scales every visible text to ≥22.5px (18×1.25) on menu, settings and HUD; HUD stays inside viewport (overlaps: ${big.overlaps.join(', ')||'none'}). Reduced motion hides the screen flash layer`);
 // ---- Fuel fixture (Phase 3) + low-fuel caption; reduced-motion variant keeps lamp steady with ⚠ icon ----
 const fuelScenario=`()=>({time_left_s:20,random_motes:false,random_shades:false,player:{carried:5},lanterns:[{id:'L1',pos:[0,0,1.8],ever_lit:true},{id:'L2',pos:[4,0,0],lit:true,fuel:20},{id:'L3',pos:[-4,0,0],lit:true,fuel:80}]})`;
 const fuel=await fixture(context,fuelScenario);await fuel.evaluate(()=>{const s=JSON.parse(localStorage.getItem('lantern.settings'));s.reducedMotion=false;s.largeText=false;localStorage.setItem('lantern.settings',JSON.stringify(s));});await fuel.reload({waitUntil:'networkidle'});await begin(fuel);await fuel.waitForFunction(()=>window.lanternGame.visuals().some(v=>v.id==='lamp:L1'));
 const unlit=await fuel.evaluate(()=>window.lanternGame.visuals().find(v=>v.id==='lamp:L1'));assert.equal(unlit.scale_y,.8);assert.equal(unlit.tear,true);assert.equal(unlit.fuel_bar,false);assert.equal(await fuel.evaluate(()=>window.lanternGame.visuals().find(v=>v.id==='lamp:L2').warning_icon),true);
 assert.ok((await fuel.locator('#clock').textContent()).includes('⚠'));assert.equal(await fuel.locator('#clock').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
 await fuel.waitForFunction(()=>window.lanternGame.captions().some(c=>c.text.startsWith('L2 sắp cạn dầu')));assert.match(await fuel.locator('#low-fuel').textContent(),/L2/);
 await fuel.screenshot({path:`${dir}/fuel-before-fixture.png`});await fuel.keyboard.press('KeyE');await fuel.waitForFunction(()=>window.lanternGame.snapshot().player.capacity===12);
 const relit=await fuel.evaluate(()=>window.lanternGame.visuals().find(v=>v.id==='lamp:L1'));assert.equal(relit.scale_y,1);assert.equal(relit.tear,false);assert.equal(relit.fuel_bar,true);
 const sampleOpacity=p=>p.evaluate(()=>new Promise(resolve=>{const values=new Set(),start=performance.now();function sample(){const v=window.lanternGame.visuals().find(v=>v.id==='lamp:L2');values.add(v.opacity);if(performance.now()-start>=1100)resolve([...values]);else requestAnimationFrame(sample);}sample();}));
 const blink=await sampleOpacity(fuel);assert.ok(blink.includes(.3)&&blink.includes(1));
 assert.equal(await fuel.locator('#carried').textContent(),'0 / 12');await fuel.screenshot({path:`${dir}/fuel-after-fixture.png`});await fuel.close();
 const calm=await fixture(context,fuelScenario);await calm.evaluate(()=>{const s=JSON.parse(localStorage.getItem('lantern.settings'));s.reducedMotion=true;s.accessible=false;localStorage.setItem('lantern.settings',JSON.stringify(s));});await calm.reload({waitUntil:'networkidle'});await begin(calm);await calm.waitForFunction(()=>window.lanternGame.visuals().some(v=>v.id==='lamp:L2'));
 assert.deepEqual(await sampleOpacity(calm),[1],'reduced motion must not blink');assert.equal(await calm.evaluate(()=>window.lanternGame.visuals().find(v=>v.id==='lamp:L2').warning_icon),true);await calm.close();
 checks.push('20s fuel fixture: torn/collapsed unlit lamp, relight restores shape/bar, 1Hz low-fuel opacity, capacity HUD, caption "L2 sắp cạn dầu" + HUD low-fuel list; with reduced motion the lamp does not blink and shows ⚠ instead');
 // ---- Last 10 s caption ----
 const final=await fixture(context,`()=>({time_left_s:11.5,random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false,lanterns:[{id:'L1',lit:true},{id:'L2',lit:true},{id:'L3',lit:true}]})`);await begin(final);
 await final.waitForFunction(()=>window.lanternGame.captions().some(c=>c.text.startsWith('10 giây cuối')),null,{timeout:6000});await final.locator('#clock.final').waitFor({timeout:2000});await final.screenshot({path:`${dir}/final-seconds.png`});await final.close();checks.push('time_left 11.5 s fixture: caption "10 giây cuối" and boxed red clock at ≤10 s');
 // ---- Wind warning caption (Night 3, warning at sim_tick 1680) ----
 const windPage=await context.newPage();windPage.on('pageerror',e=>errors.push(e.message));await windPage.addInitScript('globalThis.__qaScenario=()=>({random_shades:false,random_drifters:false,random_motes:false});');
 await windPage.route('**/src/core/game.mjs',async route=>{const response=await route.fetch();const body=(await response.text()).replace('validateScenario(scenario,tuning,night);','scenario=globalThis.__qaScenario?.(night)??scenario;validateScenario(scenario,tuning,night);');await route.fulfill({response,body});});
 await windPage.route('**/campaign.mjs',async route=>{const response=await route.fetch();const body=(await response.text()).replace('this.night=1;','this.night=3;');await route.fulfill({response,body});});
 await windPage.goto(URL_,{waitUntil:'networkidle'});await begin(windPage,3);await windPage.waitForFunction(()=>window.lanternGame.snapshot().sim_tick>=1685,null,{timeout:60000});
 assert.ok(await windPage.evaluate(()=>window.lanternGame.captions().some(c=>c.text.startsWith('Gió mạnh sắp thổi'))),'missing wind caption');assert.match(await windPage.locator('#wind-status').textContent(),/gió mạnh sắp tới/);await windPage.screenshot({path:`${dir}/wind-warning.png`});await windPage.close();
 checks.push('Night 3 (no enemies fixture) at sim_tick 1680: caption "Gió mạnh sắp thổi" + HUD wind status');
 // ---- Dawn chain (Phase 3) + leaderboard entry after Bình Minh ----
 const chain=await fixture(context,`night=>({time_left_s:.1,random_motes:false,random_shades:false,random_drifters:false,wind_enabled:false,lanterns:Array.from({length:night+4},(_,i)=>({id:'L'+(i+1),lit:true}))})`);
 await chain.getByRole('button',{name:'Bắt đầu hành trình'}).click();for(let n=1;n<=3;n++){await chain.getByRole('button',{name:`Vào Đêm ${n}`}).click();if(n<3)await chain.getByRole('button',{name:'Đêm tiếp theo'}).click();else await chain.getByRole('button',{name:'Hành trình mới'}).waitFor();}
 assert.equal(await chain.evaluate(()=>window.lanternGame.screen),'dawn');const scores=await chain.evaluate(()=>window.lanternGame.campaign());assert.equal(scores.total,scores.scores.reduce((a,b)=>a+b,0));assert.ok(scores.scores.every(s=>s>0));assert.equal(scores.nights_won,3);
 await chain.locator('#player-name').fill('Bình_Minh');await chain.getByRole('button',{name:'Lưu điểm'}).click();await chain.waitForFunction(()=>document.querySelector('#name-message')?.textContent.includes('hạng 1'));await chain.screenshot({path:`${dir}/dawn-leaderboard.png`});await chain.close();
 checks.push(`dawn fixture (0.1 s, preset lamps) reaches Bình Minh, total ${scores.total} = sum of won nights, 3/3 nights; name form saves "Bình_Minh" (Vietnamese name) at rank 1`);
 // ---- Loss → invalid name rejected → valid name saved → leaderboard screen after reopening → CLI export ----
 const loss=await fixture(context,`()=>({random_motes:false,random_shades:false,random_drifters:false,time_left_s:.1})`);await begin(loss);await loss.locator('#player-name').waitFor();assert.equal(await loss.evaluate(()=>window.lanternGame.snapshot().state),'lost');assert.equal(await loss.evaluate(()=>window.lanternGame.campaign().total),0);
 await loss.locator('#player-name').fill('ab');await loss.getByRole('button',{name:'Lưu điểm'}).click();assert.match(await loss.locator('#name-message').textContent(),/3–12 ký tự/);
 await loss.locator('#player-name').fill('QA_Tester');await loss.getByRole('button',{name:'Lưu điểm'}).click();await loss.waitForFunction(()=>document.querySelector('#name-message')?.textContent.startsWith('Đã lưu'));assert.equal(await loss.locator('#saved-board tr.mine td').nth(1).textContent(),'QA_Tester');
 await loss.getByRole('button',{name:'Chơi lại Đêm',exact:true}).click();await loss.getByRole('button',{name:'Chơi lại Đêm',exact:true}).waitFor();assert.equal(await loss.evaluate(()=>window.lanternGame.campaign().total),0);await loss.close();
 const board=await context.newPage();board.on('pageerror',e=>errors.push(e.message));await board.goto(URL_,{waitUntil:'networkidle'});await board.getByRole('button',{name:'Bảng xếp hạng'}).click();await board.locator('#leaderboard-table').waitFor();
 const rows=await board.locator('#leaderboard-table tbody tr td:nth-child(2)').allTextContents();assert.deepEqual(rows,['Bình_Minh','QA_Tester']);assert.deepEqual(await smallText(board,18),[]);await board.screenshot({path:`${dir}/leaderboard.png`});await board.close();
 const exportFile=`${dir}/leaderboard-ui-export.json`,run=spawnSync(process.execPath,['scripts/serve.mjs','--export-leaderboard',exportFile],{encoding:'utf8',env:{...process.env,LANTERN_DATA_DIR:dataDir}});assert.equal(run.status,0,run.stderr);
 const exported=JSON.parse(readFileSync(exportFile,'utf8'));assert.deepEqual(exported.entries.map(e=>[e.name,e.score>0,e.nights_won,e.seed]),[['Bình_Minh',true,3,12],['QA_Tester',false,0,12]]);assert.ok(exported.entries.every(e=>/[+-]\d{2}:\d{2}$/.test(e.achieved_at)));
 checks.push('loss fixture: name "ab" rejected with message, "QA_Tester" saved (score 0, 0 nights); retry adds no score; reopened page → menu "Bảng xếp hạng" lists both in order; CLI --export-leaderboard reads the same disk file in the same order');
 assert.deepEqual(errors,[]);const page=await context.newPage();await page.goto(URL_);await page.waitForFunction(()=>window.lanternGame);const gpu=await page.evaluate(()=>{const c=document.querySelector('#game canvas'),gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';});await page.close();
 if(process.env.SOFTWARE_WEBGL!=='1')assert.ok(fps.every(f=>f.fps>=30),'Average FPS below required 30');
 const report={passed:true,generated_at:new Date().toISOString(),browser:browser.version(),cpu:os.cpus()[0]?.model,viewport:'1280x720',gpu,checks,page_errors:errors,fps,meets_30fps:fps.every(f=>f.fps>=30),notes:'Headless QA (not the windowed benchmark). Fixtures are marked; they test UI/rules, not a manual three-night victory. Leaderboard used a temporary LANTERN_DATA_DIR.'};writeFileSync(`${dir}/browser-qa.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}catch(error){writeFileSync(`${dir}/browser-qa.json`,JSON.stringify({passed:false,error:error.message,checks,page_errors:errors,fps},null,2));throw error;}finally{await browser?.close();server.kill();rmSync(dataDir,{recursive:true,force:true});}
