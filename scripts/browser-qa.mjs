import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../',import.meta.url)));
mkdirSync('docs/proof/phase-1',{recursive:true});
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'4175'},stdio:'pipe'});
let browser;
const errors=[], failedRequests=[], checks=[];
try {
  for(let i=0;i<50;i++) {
    try { if((await fetch('http://127.0.0.1:4175')).ok) break; } catch {}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  const options={headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']};
  if(process.env.BROWSER_PATH) options.executablePath=process.env.BROWSER_PATH;
  else options.channel='msedge';
  browser=await chromium.launch(options);
  const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()}));
  await page.goto('http://127.0.0.1:4175',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.lanternGame?.snapshot().tick===0);
  await page.screenshot({path:'docs/proof/phase-1/title.png'});
  checks.push('title overlay and WebGL renderer initialized, tick 0');
  await page.getByRole('button',{name:'Bắt đầu hành trình'}).click();
  await page.waitForFunction(()=>window.lanternGame.snapshot().tick>=5);
  const before=await page.evaluate(()=>window.lanternGame.snapshot());
  await page.keyboard.down('KeyS'); await page.waitForTimeout(700); await page.keyboard.up('KeyS');
  const after=await page.evaluate(()=>window.lanternGame.snapshot());
  assert.ok(after.player.pos[2]>before.player.pos[2]);
  checks.push('keyboard movement changes shared simulation position');
  await page.keyboard.down('Space');
  await page.waitForFunction(()=>window.lanternGame.snapshot().player.pos[1]>0);
  await page.keyboard.up('Space'); checks.push('Space triggers jump');
  await page.keyboard.press('Escape');
  const paused=await page.evaluate(()=>window.lanternGame.snapshot().tick);
  await page.waitForTimeout(250); assert.equal(await page.evaluate(()=>window.lanternGame.snapshot().tick),paused);
  checks.push('pause freezes gameplay ticks');
  await page.getByRole('button',{name:'Tiếp tục hành trình'}).click();
  await page.waitForFunction(t=>window.lanternGame.snapshot().tick>t,paused);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.up('ArrowRight');
  await page.screenshot({path:'docs/proof/phase-1/gameplay.png'});
  checks.push('resume works; HUD, minimap and orbit captured');
  const render=await page.evaluate(()=>window.lanternGame.rendererInfo());
  assert.ok(render.calls>0 && render.triangles>0);
  await page.getByRole('button',{name:'Hướng dẫn'}).click();
  await page.getByRole('button',{name:'Tiếp tục hành trình'}).waitFor(); checks.push('help panel works');
  await page.setViewportSize({width:700,height:850});
  await page.screenshot({path:'docs/proof/phase-1/compact.png'}); checks.push('compact layout captured at 700×850');
  // UI-only fixture: shorten dawn via intercepted tuning; production files stay unchanged.
  const terminalPage=await browser.newPage({viewport:{width:1200,height:800}});
  terminalPage.on('pageerror',e=>errors.push(e.message));
  await terminalPage.route('**/game.contract.json',async route=>{
    const response=await route.fetch(); const data=await response.json();
    data.tuning.night1_duration_s=.1;
    await route.fulfill({response,json:data});
  });
  await terminalPage.goto('http://127.0.0.1:4175',{waitUntil:'networkidle'});
  await terminalPage.getByRole('button',{name:'Bắt đầu hành trình'}).click();
  await terminalPage.getByRole('button',{name:'Chơi lại Đêm 1'}).waitFor();
  assert.equal(await terminalPage.evaluate(()=>window.lanternGame.snapshot().state),'lost');
  await terminalPage.getByRole('button',{name:'Chơi lại Đêm 1'}).click();
  await terminalPage.getByRole('button',{name:'Chơi lại Đêm 1'}).waitFor();
  assert.equal(await terminalPage.evaluate(()=>window.lanternGame.snapshot().tick),6);
  checks.push('dawn end overlay and restart tested with explicitly shortened 0.1s UI fixture; production tuning unchanged');
  await terminalPage.close();
  assert.deepEqual(errors,[]); assert.deepEqual(failedRequests,[]);
  writeFileSync('docs/proof/phase-1/browser-qa.json',JSON.stringify({passed:true,generated_at:new Date().toISOString(),browser:browser.version(),renderer:'software SwiftShader; not a hardware FPS benchmark',checks,render,page_errors:errors,failed_requests:failedRequests},null,2)+'\n');
  console.log(JSON.stringify({passed:true,checks,render}));
} catch(error) {
  writeFileSync('docs/proof/phase-1/browser-qa.json',JSON.stringify({passed:false,error:error.message,page_errors:errors,failed_requests:failedRequests,checks},null,2)+'\n');
  throw error;
} finally { await browser?.close(); server.kill(); }
