// Builds the GitHub Release asset: release/dao-den-long-v<version>.zip
// A self-contained folder that needs only Node.js 20+ (no npm install): static game in dist/,
// the tiny local server (leaderboard API + export), headless CLI, soak test and contract.
import {cpSync,copyFileSync,mkdirSync,rmSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
if(!existsSync('dist/index.html'))throw new Error('Run npm run build first');
const pkg=JSON.parse(readFileSync('package.json','utf8')),name=`dao-den-long-v${pkg.version}`,out=`release/${name}`;
rmSync('release',{recursive:true,force:true});mkdirSync(`${out}/scripts`,{recursive:true});
cpSync('dist',`${out}/dist`,{recursive:true});cpSync('src',`${out}/src`,{recursive:true});
for(const f of['serve.mjs','leaderboard-store.mjs','soak.mjs'])copyFileSync(`scripts/${f}`,`${out}/scripts/${f}`);
for(const f of['game.contract.json','LICENSE','CREDITS.md','CHANGELOG.md','README.md'])copyFileSync(f,`${out}/${f}`);
writeFileSync(`${out}/package.json`,JSON.stringify({name:pkg.name,version:pkg.version,private:true,type:'module',engines:pkg.engines,scripts:{start:'node scripts/serve.mjs',headless:'node src/headless.mjs',soak:'node --expose-gc --max-semi-space-size=1 --no-opt scripts/soak.mjs --seed 7 --nights 10 --out soak.json'}},null,2)+'\n');
writeFileSync(`${out}/start.cmd`,'@echo off\r\necho Mo http://127.0.0.1:4173 trong trinh duyet (Ctrl+C de dung)\r\nnode scripts\serve.mjs\r\n');
writeFileSync(`${out}/start.sh`,'#!/bin/sh\necho "Open http://127.0.0.1:4173 (Ctrl+C to stop)"\ncd "$(dirname "$0")" && exec node scripts/serve.mjs\n');
writeFileSync(`${out}/CHAY-GAME.txt`,`Dao Den Long v${pkg.version}\n\nCan Node.js 20+ va trinh duyet ho tro WebGL 2. Khong can npm install.\n\n1. Giai nen thu muc nay.\n2. Chay: node scripts/serve.mjs   (hoac start.cmd tren Windows, sh start.sh tren macOS/Linux)\n3. Mo http://127.0.0.1:4173\n\nXuat bang xep hang: node scripts/serve.mjs --export-leaderboard out.json\nHeadless: node src/headless.mjs --seed 12 --night 1 --ticks 600 --out night1.jsonl\nSoak: node --expose-gc --max-semi-space-size=1 --no-opt scripts/soak.mjs --seed 7 --nights 10 --out soak.json\nBenchmark can ma nguon day du (npm ci) vi dung Playwright: xem README.md.\n`);
const zip=`release/${name}.zip`;
const r=process.platform==='win32'?spawnSync('tar',['-a','-c','-f',`${name}.zip`,name],{cwd:'release',stdio:'inherit'}):spawnSync('zip',['-qr',`${name}.zip`,name],{cwd:'release',stdio:'inherit'});
if(r.status!==0)throw new Error('zip failed');console.log(`Release package: ${zip}`);
