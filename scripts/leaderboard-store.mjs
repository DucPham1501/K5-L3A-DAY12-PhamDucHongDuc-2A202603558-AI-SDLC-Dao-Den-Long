import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {rankEntries,validateEntry,isoWithOffset} from '../src/core/leaderboard.mjs';
// Local disk storage that survives closing/reopening the game. Override with LANTERN_DATA_DIR.
export function dataDirectory(){return process.env.LANTERN_DATA_DIR??path.join(process.env.LOCALAPPDATA??process.env.XDG_DATA_HOME??path.join(os.homedir(),'.local','share'),'DaoDenLong');}
export function boardFile(){return path.join(dataDirectory(),'leaderboard.json');}
export async function readBoard(){try{const data=JSON.parse(await readFile(boardFile(),'utf8'));if(!Array.isArray(data.entries))throw new Error('Invalid leaderboard file');return{entries:rankEntries(data.entries)};}catch(error){if(error.code==='ENOENT')return{entries:[]};throw error;}}
let pending=Promise.resolve();
// Serialised writes: write to a temp file then rename, so a crash never leaves a half-written board.
export function addEntry(input,now=new Date()){const operation=pending.then(async()=>{const entry=validateEntry({name:input?.name,score:input?.score,nights_won:input?.nights_won,seed:input?.seed,achieved_at:isoWithOffset(now)}),board=await readBoard();board.entries=rankEntries([...board.entries,entry]);await mkdir(dataDirectory(),{recursive:true});const file=boardFile(),tmp=file+'.tmp';await writeFile(tmp,JSON.stringify(board,null,2)+'\n');await rename(tmp,file);return{...board,added:entry};});pending=operation.catch(()=>{});return operation;}
