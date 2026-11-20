// Read-only Git/source audit; never prints secret values or edits historical proof.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const git=(args)=>{const r=spawnSync('git',['-c',`safe.directory=${process.cwd().replaceAll('\\','/')}`,...args],{encoding:'utf8',maxBuffer:32*1024*1024});if(r.status!==0)throw new Error(`git ${args[0]} failed: ${r.stderr}`);return r.stdout;};
const hash=s=>createHash('sha256').update(s).digest('hex');
const phases=[];
for(let n=1;n<=4;n++){
 const tag=`phase-${n}`,commit=git(['rev-parse',`${tag}^{commit}`]).trim();
 const report=JSON.parse(git(['show',`${tag}:docs/proof/${tag}/verification.json`]));
 const mismatches=[];
 for(const [file,expected] of Object.entries(report.source_sha256??{})){
  const source=git(['show',`${tag}:${file}`]);
  // Working-tree line endings may differ from canonical Git blobs on Windows.
  if(![source,source.replace(/\r?\n/g,'\r\n'),source.replaceAll('\r\n','\n')].some(s=>hash(s)===expected))mismatches.push(file);
 }
 const browser=JSON.parse(git(['show',`${tag}:docs/proof/${tag}/browser-qa.json`]));
 phases.push({tag,commit,verification_passed:report.passed,browser_passed:browser.passed,source_hash_mismatches:mismatches});
}
const commits=git(['rev-list','--all']).trim().split('\n');
const objects=git(['rev-list','--objects','--all']).trim().split('\n');
const sensitivePaths=objects.map(s=>s.slice(s.indexOf(' ')+1)).filter(p=>/(^|\/)(\.env(?:\..*)?|id_rsa|id_ed25519|credentials(?:\.json)?|.*\.pem|.*\.p12)$/i.test(p)&&!p.endsWith('.env.example'));
const suspicious=[];
const pattern='(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9_-]{32,}|AKIA[A-Z0-9]{16}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)';
for(const commit of commits){
 const r=spawnSync('git',['-c',`safe.directory=${process.cwd().replaceAll('\\','/')}`,'grep','-I','-l','-E',pattern,commit,'--',':(exclude)scripts/submission-audit.mjs'],{encoding:'utf8',maxBuffer:32*1024*1024});
 if(r.status===0)suspicious.push(...r.stdout.trim().split('\n'));
 else if(r.status!==1)throw new Error('History secret-pattern scan failed');
}
const current=JSON.parse(readFileSync('docs/proof/phase-4/verification.json','utf8'));
const currentMismatches=Object.entries(current.source_sha256).filter(([p,h])=>!existsSync(p)||hash(readFileSync(p))!==h).map(([p])=>p);
const report={generated_at:new Date().toISOString(),phases,history_scan:{commits_checked:commits.length,sensitive_paths:[...new Set(sensitivePaths)],suspicious_file_references:suspicious,scope:'Common credential filenames and key patterns in reachable Git history; heuristic, not a guarantee.'},current_source_hash_mismatches:currentMismatches,required_files:['README.md','LICENSE','CREDITS.md','CHANGELOG.md','AGENTS.md','game.contract.json','docs/notes/retro.md','docs/demo/demo.mp4'].map(file=>({file,exists:existsSync(file)}))};
writeFileSync('docs/submission-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
