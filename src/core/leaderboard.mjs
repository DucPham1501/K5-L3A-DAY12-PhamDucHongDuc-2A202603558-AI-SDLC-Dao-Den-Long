// Pure leaderboard rules shared by the browser, server and CLI export. No I/O here.
export const MAX_ENTRIES=10;
// Required: 3–12 characters of [A-Za-z0-9_]. Bonus: Vietnamese letters with diacritics (NFC).
const VIETNAMESE='ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝàáâãèéêìíòóôõùúýĂăĐđĨĩŨũƠơƯưẠ-ỹ';
const NAME=new RegExp(`^[A-Za-z0-9_${VIETNAMESE}]{3,12}$`,'u');
export function normalizeName(name){return typeof name==='string'?name.normalize('NFC'):name;}
export function validName(name){return typeof name==='string'&&NAME.test(normalizeName(name));}
const ISO_WITH_ZONE=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
export function validateEntry(entry){
 if(!entry||!validName(entry.name)||!Number.isSafeInteger(entry.score)||entry.score<0||!Number.isInteger(entry.nights_won)||entry.nights_won<0||entry.nights_won>3||!Number.isSafeInteger(entry.seed)||typeof entry.achieved_at!=='string'||!ISO_WITH_ZONE.test(entry.achieved_at)||!Number.isFinite(Date.parse(entry.achieved_at)))throw new Error('Invalid leaderboard entry');
 return {name:normalizeName(entry.name),score:entry.score,nights_won:entry.nights_won,achieved_at:entry.achieved_at,seed:entry.seed};
}
// Score descending; equal score → whoever achieved it first ranks higher. Array.sort is stable,
// so entries with identical timestamps keep their insertion order (earlier submission first).
export function rankEntries(entries){return entries.map(validateEntry).sort((a,b)=>b.score-a.score||Date.parse(a.achieved_at)-Date.parse(b.achieved_at)).slice(0,MAX_ENTRIES);}
// ISO 8601 with the local UTC offset, e.g. 2026-11-20T21:05:09.120+07:00.
export function isoWithOffset(date=new Date()){
 const pad=(n,w=2)=>String(Math.abs(n)).padStart(w,'0'),offset=-date.getTimezoneOffset(),sign=offset>=0?'+':'-';
 return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(),3)}${sign}${pad(Math.trunc(offset/60))}:${pad(offset%60)}`;
}
