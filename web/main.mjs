import {Game,DT,distance} from '../src/core/game.mjs';
import {Campaign} from '../src/core/campaign.mjs';
import {validName,normalizeName} from '../src/core/leaderboard.mjs';
import {World} from './world.mjs';
import {Soundscape} from './audio.mjs';
import {defaults as defaultBindings,actions,labels as actionLabels,loadBindings,rebind,keyLabel} from './bindings.mjs';
const $=id=>document.getElementById(id);
const SEED=12;
const response=await fetch('/game.contract.json');if(!response.ok)throw new Error('Không tải được contract');const {tuning}=await response.json();
let world;try{world=new World($('game'));}catch(error){const div=document.createElement('div');div.className='error';div.textContent='Game cần WebGL 2. Bật tăng tốc phần cứng hoặc đổi trình duyệt. '+error.message;document.body.append(div);throw error;}

// ---------- Settings (browser-only; never sent to the simulation or headless) ----------
const prefersReduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
let settings={volume:.5,sensitivity:1,accessible:false,reducedMotion:prefersReduced,largeText:false,bindings:{...defaultBindings}};
try{settings={...settings,...JSON.parse(localStorage.getItem('lantern.settings')??'{}')};}catch{}
settings.volume=Math.max(0,Math.min(1,Number(settings.volume)||0));settings.sensitivity=Math.max(.2,Math.min(3,Number(settings.sensitivity)||1));
settings.accessible=settings.accessible===true;settings.reducedMotion=settings.reducedMotion===true;settings.largeText=settings.largeText===true;settings.bindings=loadBindings(settings.bindings);
function applySettings(){const root=document.documentElement;root.classList.toggle('accessible',settings.accessible);root.classList.toggle('reduced-motion',settings.reducedMotion);root.classList.toggle('large-text',settings.largeText);world.accessible=settings.accessible;world.reducedMotion=settings.reducedMotion;updateKeyLabels();}
function saveSettings(){applySettings();try{localStorage.setItem('lantern.settings',JSON.stringify(settings));}catch{}}
const B=()=>settings.bindings;
const ALIAS={ShiftLeft:'ShiftRight',ShiftRight:'ShiftLeft',ControlLeft:'ControlRight',ControlRight:'ControlLeft',AltLeft:'AltRight',AltRight:'AltLeft'};
const down=action=>keys.has(B()[action])||keys.has(ALIAS[B()[action]]);
const isAction=(code,action)=>code===B()[action]||code===ALIAS[B()[action]];
function updateKeyLabels(){const k=a=>keyLabel(B()[a]);
 $('move-keys').textContent=['forward','left','backward','right'].map(k).join(' ');$('jump-key').textContent=k('jump');$('interact-key').textContent=k('interact');$('dash-key').textContent=k('dash');$('pulse-key').textContent=k('pulse');$('pause-key').textContent=k('pause');
 $('footnote').textContent=`${['forward','left','backward','right'].map(k).join('')} di chuyển · ${k('jump')} nhảy · ${k('dash')} lướt · ${k('interact')} nạp đèn · ${k('pulse')} tỏa sáng · ${k('pause')} tạm dừng`;}

const sound=new Soundscape(settings.volume),campaign=new Campaign(),keys=new Set();
let game=new Game(tuning),screen='menu',yaw=0,accumulator=0,last=performance.now(),hudAt=0,toastUntil=0,queuedDash=false,queuedPulse=false,dragging=false,dragX=0,lastSecond=300,lastWind=false,lastWindActive=false;
let sessionRunning=false,queuedJump=false,queuedInteract=false,capturing=null;
const shadeAlerts=new Map(),lowFuel=new Set(),captions=[];
applySettings();
world.load(game.map);
const greetings=['','“Mỗi đốm sáng đều tìm được đường về. Con hãy bắt đầu từ những ngọn đèn ở Đảo Bến.”','“Cầu tre hẹp, nhưng lòng mình rộng. Bục nhảy sẽ đưa con qua biển mây — nhớ giữ ánh sáng bên mình.”','“Chuông chưa ngân vì những tầng đảo còn tối. Theo dốc lên cao, lắng nghe gió và thắp ngọn đèn cuối cùng.”'];
function toast(text,warning=false){$('toast').textContent=(warning&&settings.accessible?'⚠ ':'')+text;$('toast').classList.toggle('danger',warning);$('toast').classList.add('visible');toastUntil=performance.now()+2800;}

// ---------- Captions / visual indicators ----------
function caption(text,kind='info',ms=4500){const now=performance.now();const same=captions.find(c=>c.text===text);if(same){same.until=now+ms;return;}captions.push({text,kind,until:now+ms});while(captions.length>4)captions.shift();renderCaptions();}
function renderCaptions(){const box=$('captions');box.replaceChildren(...captions.map(c=>{const div=document.createElement('div');div.className=`caption ${c.kind}`;div.textContent=(c.kind==='warn'||c.kind==='shade'?'⚠ ':'')+c.text;return div;}));}
function expireCaptions(now){const before=captions.length;for(let i=captions.length-1;i>=0;i--)if(captions[i].until<now)captions.splice(i,1);if(captions.length!==before)renderCaptions();}
function clearIndicators(){captions.length=0;renderCaptions();shadeAlerts.clear();lowFuel.clear();$('indicators').replaceChildren();}
function flash(){if(settings.reducedMotion)return;const el=$('flash');el.classList.add('on');setTimeout(()=>el.classList.remove('on'),60);}
// Edge-of-screen arrows for newly spawned shades (6 s). On-screen shades get a marker above them.
function updateIndicators(now){const box=$('indicators');if(screen!=='playing'){box.replaceChildren();return;}
 // Keep arrows inside the play area: below the top panels and above the inventory/abilities bar.
 const W=innerWidth,H=innerHeight,els=[],topSafe=document.querySelector('.topbar').getBoundingClientRect().bottom+40,bottomSafe=H-document.querySelector('.bottom-ui').getBoundingClientRect().top+45;
 for(const[id,until]of shadeAlerts){const s=game.shades.find(s=>s.id===id);if(!s||until<now){shadeAlerts.delete(id);continue;}
  const point=world.screenPoint(s.pos,1.2),el=document.createElement('div');el.className='shade-arrow';el.dataset.shade=id;let x,y,deg;
  if(point.visible){x=(point.x*.5+.5)*W;y=(1-(point.y*.5+.5))*H-30;deg=180;el.dataset.edge='false';}
  else{const m=Math.max(Math.abs(point.x),Math.abs(point.y))||1,nx=point.x/m,ny=point.y/m;x=Math.min(W-90,Math.max(90,(nx*.5+.5)*W));y=Math.min(H-bottomSafe,Math.max(topSafe,(1-(ny*.5+.5))*H));deg=Math.atan2(point.x,point.y)*180/Math.PI;el.dataset.edge='true';}
  el.style.left=`${x}px`;el.style.top=`${y}px`;const arrow=document.createElement('i');arrow.textContent='▲';arrow.style.transform=`rotate(${deg}deg)`;const label=document.createElement('small');label.textContent=`Bóng Mực · ${Math.round(distance(game.player.pos,s.pos))} m`;el.append(arrow,label);els.push(el);}
 box.replaceChildren(...els);}

function modal(mode,kicker,title,copy,actionList,detail=''){
 screen=mode;capturing=null;keys.clear();queuedJump=false;queuedInteract=false;queuedDash=false;queuedPulse=false;$('overlay').hidden=false;$('modal-kicker').textContent=kicker;$('modal-title').textContent=title;$('modal-copy').textContent=copy;$('modal-detail').innerHTML=detail;$('modal-actions').replaceChildren();
 actionList.forEach(([label,action,secondary])=>{const b=document.createElement('button');b.textContent=label;b.className=secondary?'secondary':'primary';b.onclick=action;$('modal-actions').append(b);});sound.setPlaying(false);
}
function prepare(night){sessionRunning=false;game=new Game(tuning,{night,seed:SEED});world.load(game.map);yaw=0;accumulator=0;lastSecond=Math.ceil(game.timeLeft);lastWind=false;lastWindActive=false;queuedDash=false;queuedPulse=false;clearIndicators();updateHUD();}
function menu(){
 sessionRunning=false;
 $('hud').hidden=true;modal('menu','MỘT CHÚT SÁNG, MỘT MIỀN BÌNH YÊN','Đảo Đèn Lồng','Ba hòn đảo. Một người giữ đèn nhỏ. Cùng Mây mang ánh sáng trở về trước bình minh.',[['Bắt đầu hành trình',()=>{campaign.reset();intro();}],['Bảng xếp hạng',()=>showLeaderboard(menu),true],['Cài đặt',()=>showSettings('menu'),true],['Hướng dẫn',()=>help('menu'),true]],'<div class="detail">Đảo Bến · Đảo Cau · Đảo Chuông<br>Thu gom đom đóm, thắp đèn và giữ đủ đèn sáng tới bình minh.</div>');
}
function intro(){prepare(campaign.night);$('hud').hidden=true;modal('intro',`ĐÊM ${game.night} · LỜI ÔNG ĐĂNG`,game.map.name,greetings[game.night],[[`Vào Đêm ${game.night}`,start],['Về menu',menu,true]],`<div class="detail">Giữ ít nhất ${game.requiredLit}/${game.lanterns.length} đèn sáng tới bình minh · ${game.initialTime} giây · 3 Ngọn Lửa<br>Đèn cháy 100 giây nếu không châm. Dưới 30 dầu mất vùng an toàn. Thắp lại cần 5 đom đóm.</div>`);}
async function start(){await sound.start();sessionRunning=true;screen='playing';$('overlay').hidden=true;$('hud').hidden=false;sound.setPlaying(true);accumulator=0;last=performance.now();}
function pause(){
 if(!['playing','pause','settings','help'].includes(screen)||['won','lost'].includes(game.state))return;
 if(game.state!=='paused'){game.step({pause:true});game.step({pause:false});}
 modal('pause',`ĐÊM ${game.night} · ${game.map.name.toUpperCase()}`,'Nghỉ chân một chút','Biển mây sẽ đợi. Các bộ đếm và thế giới đang được tạm dừng.',[['Tiếp tục',resume],['Chơi lại Đêm',()=>{prepare(campaign.night);start();},true],['Cài đặt',()=>showSettings('pause'),true],['Về menu',menu,true]]);
}
function resume(){if(game.state==='paused'){game.step({pause:true});game.step({pause:false});}screen='playing';$('overlay').hidden=true;sound.setPlaying(true);accumulator=0;}

// ---------- Settings screen: audio, camera, accessibility, key bindings ----------
function checkbox(id,text,key){const label=document.createElement('label');label.className='setting accessible-option';const input=document.createElement('input');input.type='checkbox';input.id=id;input.checked=settings[key];input.onchange=()=>{settings[key]=input.checked;saveSettings();};label.append(input,document.createTextNode(text));return label;}
function showSettings(back){modal('settings','TÙY CHỈNH HÀNH TRÌNH','Cài đặt','Âm thanh, camera, hỗ trợ tiếp cận và phím điều khiển. Mọi lựa chọn được lưu trên máy này.',[['Quay lại',()=>back==='pause'?pause():menu()]],`<label class="setting"><span>Âm lượng <output id="volume-value">${Math.round(settings.volume*100)}%</output></span><input id="volume" aria-label="Âm lượng" type="range" min="0" max="100" value="${settings.volume*100}"></label><label class="setting"><span>Độ nhạy chuột <output id="sensitivity-value">${settings.sensitivity.toFixed(1)}</output></span><input id="sensitivity" aria-label="Độ nhạy chuột" type="range" min="20" max="300" value="${settings.sensitivity*100}"></label>`);
 const detail=$('modal-detail');detail.append(checkbox('accessible-colors','Bảng màu dễ phân biệt','accessible'),checkbox('reduced-motion','Giảm chuyển động (tắt rung camera, chớp màn hình)','reducedMotion'),checkbox('large-text','Chữ lớn (×1,25)','largeText'));
 for(const id of['volume','sensitivity'])$(id).oninput=()=>{settings[id]=Number($(id).value)/100;$(id+'-value').textContent=id==='volume'?`${Math.round(settings.volume*100)}%`:settings.sensitivity.toFixed(1);sound.setVolume(settings.volume);saveSettings();};
 const title=document.createElement('div');title.className='section-title';title.textContent='Phím điều khiển';const grid=document.createElement('div');grid.className='bindings';grid.id='bindings';const message=document.createElement('div');message.className='binding-message';message.id='binding-message';message.setAttribute('role','status');message.setAttribute('aria-live','polite');
 const reset=document.createElement('button');reset.className='secondary';reset.id='reset-bindings';reset.textContent='Khôi phục mặc định';reset.onclick=()=>{settings.bindings={...defaultBindings};capturing=null;saveSettings();renderBindings();setBindingMessage('Đã khôi phục phím mặc định.');};
 detail.append(title,grid,message,reset);renderBindings();
}
function setBindingMessage(text,warn=false){const el=$('binding-message');if(!el)return;el.textContent=(warn?'⚠ ':'')+text;el.classList.toggle('warn',warn);}
function renderBindings(){const grid=$('bindings');if(!grid)return;grid.replaceChildren(...actions.map(action=>{const row=document.createElement('div');row.className='binding';const name=document.createElement('span');name.textContent=actionLabels[action];const button=document.createElement('button');button.dataset.action=action;button.setAttribute('aria-label',`Đổi phím ${actionLabels[action]}`);button.textContent=capturing===action?'Nhấn phím…':keyLabel(B()[action]);button.classList.toggle('capturing',capturing===action);button.onclick=()=>{capturing=capturing===action?null:action;renderBindings();if(capturing)setBindingMessage(`Nhấn phím mới cho “${actionLabels[action]}” (bấm lại nút để hủy).`);};row.append(name,button);return row;}));}
function captureKey(e){e.preventDefault();const action=capturing,result=rebind(B(),action,e.code);if(!result.ok){setBindingMessage(result.message,true);return;}settings.bindings=result.bindings;capturing=null;saveSettings();renderBindings();setBindingMessage(`Đã gán ${keyLabel(e.code)} cho “${actionLabels[action]}”.`);}

function help(back){if(back==='playing'){pause();back='pause';}const k=a=>keyLabel(B()[a]);modal('help','SỔ TAY NGƯỜI GIỮ ĐÈN','Giữ đảo sáng tới bình minh','Cần 3/5, 4/6 hoặc 5/7 đèn sáng khi hết giờ. Thắp hết đèn không kết thúc sớm. Mỗi lần thắp tăng sức chứa 2, tối đa 20.',[['Quay lại',()=>back==='pause'?pause():menu()]],`<div class="detail">${k('forward')}${k('left')}${k('backward')}${k('right')}: đi · ${k('jump')}: nhảy · ${k('dash')}: lướt<br>${k('interact')}: thắp/châm dầu · ${k('pulse')}: tỏa sáng · ${k('pause')}: tạm dừng · ← →: camera<br>Đèn mới cần 10, thắp lại cần 5; một đom đóm châm 10 dầu. Dầu dưới 30: mất vùng an toàn và bị Bóng Mực hút.<br>Phụ đề cảnh báo Bóng Mực mới (mũi tên ở mép màn hình), gió, 10 giây cuối và đèn yếu.</div>`);}

// ---------- Leaderboard ----------
async function fetchBoard(){const r=await fetch('/api/leaderboard',{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}
function boardTable(entries,highlight){if(!entries.length){const p=document.createElement('p');p.textContent='Chưa có điểm nào. Hãy là người đầu tiên!';return p;}
 const table=document.createElement('table');table.className='leaderboard';table.id='leaderboard-table';const head=table.createTHead().insertRow();['#','Tên','Điểm','Đêm thắng','Ngày'].forEach((t,j)=>{const th=document.createElement('th');th.textContent=t;if(j!==1&&j!==4)th.style.textAlign='right';head.append(th);});
 const body=table.createTBody();entries.forEach((e,i)=>{const row=body.insertRow();if(highlight&&e.name===highlight.name&&e.achieved_at===highlight.achieved_at)row.className='mine';const cells=[i+1,e.name,e.score.toLocaleString('vi-VN'),`${e.nights_won}/3`,new Date(e.achieved_at).toLocaleDateString('vi-VN')];cells.forEach((v,j)=>{const td=row.insertCell();td.textContent=v;if(j!==1&&j!==4)td.className='num';});});return table;}
async function showLeaderboard(back){modal('leaderboard','TOP 10 NGƯỜI GIỮ ĐÈN','Bảng xếp hạng','Điểm là tổng các Đêm đã thắng trong một hành trình. Bằng điểm thì ai đạt trước đứng trên.',[['Quay lại',back]],'<div id="board" class="detail">Đang tải…</div>');
 try{const {entries}=await fetchBoard();if(screen==='leaderboard')$('board').replaceChildren(boardTable(entries));}catch(error){if(screen==='leaderboard')$('board').textContent=`Không đọc được bảng xếp hạng (${error.message}). Hãy chạy game bằng npm start.`;}}
function nameForm(){const wrap=document.createElement('div');wrap.className='detail';const label=document.createElement('label');label.htmlFor='player-name';label.textContent='Lưu điểm vào bảng xếp hạng — tên 3–12 ký tự (chữ, số, _; có dấu được):';
 const form=document.createElement('form');form.className='name-form';const input=document.createElement('input');input.id='player-name';input.maxLength=12;input.autocomplete='nickname';input.spellcheck=false;input.value=localStorage.getItem('lantern.name')??'';const button=document.createElement('button');button.type='submit';button.className='primary';button.textContent='Lưu điểm';form.append(input,button);
 const message=document.createElement('div');message.className='form-message';message.id='name-message';message.setAttribute('role','status');const board=document.createElement('div');board.id='saved-board';
 const entry={score:campaign.total,nights_won:campaign.nightsWon,seed:SEED};
 form.onsubmit=async event=>{event.preventDefault();const name=normalizeName(input.value.trim());if(!validName(name)){message.textContent='⚠ Tên cần 3–12 ký tự gồm chữ, số hoặc dấu gạch dưới.';message.className='form-message warn';input.focus();return;}
  button.disabled=true;input.disabled=true;message.className='form-message';message.textContent='Đang lưu…';
  try{const r=await fetch('/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,...entry})});const data=await r.json();if(!r.ok)throw new Error(data.error??`HTTP ${r.status}`);try{localStorage.setItem('lantern.name',name);}catch{}
   const rank=data.entries.findIndex(e=>e.name===data.added.name&&e.achieved_at===data.added.achieved_at);message.textContent=rank>=0?`Đã lưu! Bạn đứng hạng ${rank+1}.`:'Đã lưu, nhưng điểm chưa vào top 10.';board.replaceChildren(boardTable(data.entries,data.added));}
  catch(error){button.disabled=false;input.disabled=false;message.className='form-message warn';message.textContent=`⚠ Không lưu được (${error.message}).`;}};
 wrap.append(label,form,message,board);return wrap;}

function result(){sound.setPlaying(false);const won=game.state==='won';sound.effect(won?'won':'lost');if(won)campaign.complete(game);clearIndicators();
 if(won&&game.night===3){modal('dawn','BA HÒN ĐẢO ĐÃ THỨC GIẤC','Bình Minh','Ông Đăng: “Con thấy không, những đốm sáng nhỏ đã giữ lại cả một bầu trời.”',[['Hành trình mới',()=>{campaign.reset();intro();}],['Bảng xếp hạng',()=>showLeaderboard(menu),true],['Về menu',menu,true]],`<div class="result-number">${campaign.total.toLocaleString('vi-VN')}</div><p>Tổng điểm ba Đêm đã thắng</p>`);$('modal-detail').append(nameForm());return;}
 const reason=won?'Bạn đã giữ đủ đèn sáng tới bình minh. Một hòn đảo khác đang chờ Mây.':game.player.flames<=0?'Mây đã cạn Ngọn Lửa. Hãy tận dụng đèn đủ dầu, lướt và tỏa sáng.':`Bình minh đã tới nhưng chưa đủ ${game.requiredLit} đèn sáng. Hãy châm dầu trước khi đèn tắt.`;
 modal('result',`KẾT QUẢ ĐÊM ${game.night}`,won?'Một hòn đảo đã sáng.':'Ánh sáng vẫn đang đợi.',reason,won?[[`Đêm tiếp theo`,()=>{campaign.next();intro();}],['Về menu',menu,true]]:[['Chơi lại Đêm',()=>{prepare(campaign.night);start();}],['Về menu',menu,true]],`<div class="result-number">${game.score}</div><p>Điểm Đêm này · Tổng đã thắng: ${campaign.total} · ${campaign.nightsWon}/3 Đêm</p>`);
 if(!won)$('modal-detail').append(nameForm());
}
function handleEvents(list){for(const e of list){sound.effect(e.name);
 if(e.name==='pulse')world.pulse(game.player.pos);
 if(e.name==='lantern_lit')toast(e.data.relight?'Đèn đã được thắp lại. Sức chứa tăng!':'Một ngọn đèn mới đã sáng. Sức chứa tăng!');
 if(e.name==='refuel')toast(`Đã châm ${e.data.amount} đom đóm · dầu ${e.data.fuel}/100`);
 if(e.name==='lantern_out'){toast(`${e.data.lantern_id} đã cạn dầu. Cần 5 đom đóm thắp lại.`,true);caption(`${e.data.lantern_id} đã tắt vì cạn dầu`,'warn');}
 if(e.name==='player_hit'){toast(e.data.by==='fall'?'Mây rơi khỏi đảo. Hồi sinh sau 1 giây.':'Mây bị chạm! Lùi về đèn đủ dầu.',true);world.shake();flash();}
 if(e.name==='shade_spawned'){shadeAlerts.set(e.data.id,performance.now()+6000);caption('Bóng Mực xuất hiện — xem mũi tên ở mép màn hình','shade');}
 if(e.name==='drifter_steal')toast(`Gió Lạc vừa cướp ${e.data.amount} đom đóm!`,true);
 if(e.name==='drifter_drop')toast('Ánh sáng đã được trả lại. Mau nhặt lấy!');
 if(e.name==='charm_picked')toast('Bùa Gió: chạy nhanh và lướt không hồi trong 10 giây.');
 if(e.name==='game_over')result();}}
function updateLowFuel(){const low=game.lanterns.filter(l=>l.lit&&l.fuel<tuning.low_fuel_threshold);for(const l of low)if(!lowFuel.has(l.id)){lowFuel.add(l.id);caption(`${l.id} sắp cạn dầu (${Math.floor(l.fuel)}/100) — mất vùng an toàn`,'warn');}
 for(const id of[...lowFuel])if(!low.some(l=>l.id===id))lowFuel.delete(id);$('low-fuel').textContent=low.length?`⚠ Dầu yếu: ${low.map(l=>`${l.id} ${Math.floor(l.fuel)}`).join(' · ')}`:'';}
function updateHUD(){const p=game.player,lit=game.lanterns.filter(l=>l.lit).length;
 $('chapter').textContent=`ĐÊM ${game.night} · ${game.map.name.toUpperCase()}`;$('health').innerHTML=Array.from({length:3},(_,i)=>`<span class="${i<p.flames?'':'empty'}">✦</span>`).join(' ');$('lit-count').textContent=`${lit} / ${game.lanterns.length} đèn · cần ${game.requiredLit}`;$('score').textContent=game.score;$('carried').textContent=`${p.carried} / ${game.capacity}`;
 $('mote-slots').innerHTML=Array.from({length:game.capacity},(_,i)=>`<i class="slot ${i<p.carried?'full':''}"></i>`).join('');const seconds=Math.ceil(game.timeLeft);$('clock').textContent=`${(settings.accessible&&game.timeLeft<=30)||game.timeLeft<=10?'⚠ ':''}${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;$('clock').classList.toggle('urgent',game.timeLeft<=30);$('clock').classList.toggle('final',game.timeLeft<=10);
 $('charm-status').textContent=game.charmTicks?`Bùa Gió ${(game.charmTicks/60).toFixed(1)}s`:'';$('dash-status').textContent=game.charmTicks?'Bùa Gió':game.dashCD?`${(game.dashCD/60).toFixed(1)}s`:'Sẵn sàng';$('pulse-status').textContent=game.pulseCD?`${(game.pulseCD/60).toFixed(1)}s`:'3 đom đóm';$('dash-button').classList.toggle('ready',!game.dashCD||game.charmTicks>0);$('pulse-button').classList.toggle('ready',!game.pulseCD&&p.carried>=3);
 $('wind-status').textContent=game.wind.warning?'⚠ Lá bay… gió mạnh sắp tới!':game.wind.active?'Gió mạnh · cẩn thận mép đảo':'';
 updateLowFuel();
 const nearest=game.lanterns.filter(l=>game.accepts(l)).sort((a,b)=>distance(p.pos,a.pos)-distance(p.pos,b.pos)||a.id.localeCompare(b.id))[0],ik=keyLabel(B().interact);$('interaction').hidden=screen!=='playing'||!nearest||distance(p.pos,nearest.pos)>2;if(nearest)$('interaction').textContent=nearest.lit?`${ik} — Châm dầu (${nearest.fuel.toFixed(1)}/100)`:`${ik} — ${nearest.ever_lit?'Thắp lại':'Nạp ánh sáng'} (${nearest.deposited}/${game.lightCost(nearest)})`;
 if(nearest){const point=world.screenPoint(nearest.pos);$('direction').hidden=point.visible||screen!=='playing';$('direction-arrow').style.transform=`rotate(${Math.atan2(point.x,point.y)*180/Math.PI}deg)`;$('direction-text').textContent=`${nearest.id} · ${Math.round(distance(p.pos,nearest.pos))} m`;}else $('direction').hidden=true;
 drawMap();
}
function drawMap(){const c=$('minimap').getContext('2d'),night=game.night,scale=night===2?1.4:1.65,cx=night===2?35:0,xy=p=>[100+(p[0]-cx)*scale,80+p[2]*scale];c.clearRect(0,0,200,160);c.fillStyle='#2F5D50';for(const[x,z,r]of game.map.circles){const[a,b]=xy([x,0,z]);c.beginPath();c.arc(a,b,r*scale,0,Math.PI*2);c.fill();}if(night===2){const[x,y]=xy([26,0,-2]);c.fillStyle='#C9B48A';c.fillRect(x,y,18*scale,4*scale);}for(const l of game.lanterns){const[x,y]=xy(l.pos);c.fillStyle=l.lit?'#FFB347':'#5B5F6E';c.fillRect(x-3,y-3,6,6);}c.fillStyle='#FFF6C2';for(const m of game.motes){const[x,y]=xy(m.pos);c.fillRect(x,y,1.5,1.5);}c.fillStyle=settings.accessible?'#00B3FF':'#7A3CFF';for(const s of game.shades){const[x,y]=xy(s.pos);c.beginPath();c.arc(x,y,2.5,0,7);c.fill();}c.fillStyle='#8FA3B8';for(const d of game.drifters){const[x,y]=xy(d.pos);c.fillRect(x-2,y-2,4,4);}const[x,y]=xy(game.player.pos);c.fillStyle='#F5F1E6';c.beginPath();c.arc(x,y,3.5,0,7);c.fill();}
$('pause-button').onclick=()=>pause();$('help-button').onclick=()=>help('playing');$('dash-button').onclick=()=>queuedDash=true;$('pulse-button').onclick=()=>queuedPulse=true;
window.addEventListener('keydown',e=>{
 if(capturing&&screen==='settings'){captureKey(e);return;}
 if(e.target instanceof HTMLInputElement&&e.target.type!=='checkbox'&&e.target.type!=='range')return; // typing a leaderboard name
 if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)||(screen==='playing'&&Object.values(B()).includes(e.code)))e.preventDefault();
 if(!e.repeat&&(isAction(e.code,'pause')||(e.code==='Escape'&&screen==='pause'))){if(screen==='playing')pause();else if(screen==='pause')resume();return;}
 if(screen==='playing'){keys.add(e.code);if(!e.repeat){if(isAction(e.code,'jump'))queuedJump=true;if(isAction(e.code,'interact'))queuedInteract=true;if(isAction(e.code,'pulse'))queuedPulse=true;if(isAction(e.code,'dash'))queuedDash=true;}}
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(screen==='playing')pause();});
world.renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;dragX=e.clientX;world.renderer.domElement.setPointerCapture(e.pointerId);});world.renderer.domElement.addEventListener('pointermove',e=>{if(dragging&&screen==='playing'){yaw-=(e.clientX-dragX)*.3*settings.sensitivity;dragX=e.clientX;}});world.renderer.domElement.addEventListener('pointerup',()=>dragging=false);
function animate(now){requestAnimationFrame(animate);const raw=(now-last)/1000,delta=Math.min(raw,.25);last=now;
 if(sessionRunning&&['playing','pause','settings','help'].includes(screen)&&(game.state==='playing'||game.state==='paused')){accumulator+=delta;if(screen==='playing'){if(keys.has('ArrowLeft'))yaw+=delta*85;if(keys.has('ArrowRight'))yaw-=delta*85;}
  while(accumulator>=DT){const previousGround=game.player.grounded,previousY=game.player.pos[1],playing=screen==='playing';const move=playing?[(down('right')?1:0)-(down('left')?1:0),(down('backward')?1:0)-(down('forward')?1:0)]:[0,0];handleEvents(game.step({move,cam_yaw_deg:yaw,jump:playing&&(down('jump')||queuedJump),dash:playing&&(down('dash')||queuedDash),interact:playing&&(down('interact')||queuedInteract),pulse:playing&&(down('pulse')||queuedPulse),pause:false}));if(previousGround&&game.player.pos[1]>previousY)sound.effect('jump');queuedJump=false;queuedInteract=false;queuedDash=false;queuedPulse=false;accumulator-=DT;if(['won','lost'].includes(game.state))break;}
 }
 if(screen==='playing'){const sec=Math.ceil(game.timeLeft);if(sec!==lastSecond){if(sec<=10&&sec>0)sound.effect('countdown');if(sec===10&&lastSecond>10)caption(`10 giây cuối! Cần ${game.requiredLit} đèn sáng khi bình minh tới`,'warn',6000);lastSecond=sec;}
  if(game.wind.warning&&!lastWind){sound.effect('wind');caption('Gió mạnh sắp thổi — tránh xa mép đảo','warn');}lastWind=game.wind.warning;
  if(game.wind.active&&!lastWindActive)caption('Gió đang thổi mạnh','warn',3000);lastWindActive=game.wind.active;}
 world.update(game,yaw,delta,screen==='playing');updateIndicators(now);if(now>hudAt){updateHUD();hudAt=now+100;}if(now>toastUntil)$('toast').classList.remove('visible');expireCaptions(now);
}
menu();updateHUD();requestAnimationFrame(animate);
window.lanternGame={snapshot:()=>game.snapshot(),rendererInfo:()=>({calls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,...world.stats}),visuals:()=>world.describe(),settings:()=>structuredClone(settings),campaign:()=>({night:campaign.night,total:campaign.total,scores:[...campaign.scores],nights_won:campaign.nightsWon}),captions:()=>captions.map(c=>({text:c.text,kind:c.kind})),indicators:()=>[...document.querySelectorAll('#indicators .shade-arrow')].map(el=>({shade:el.dataset.shade,edge:el.dataset.edge==='true'})),get screen(){return screen;},get paused(){return game.state==='paused';}};
