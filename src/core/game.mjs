import { validateScenario } from './validate.mjs';
import { getMap,groundHeight,canMove } from './maps.mjs';
export const DT=1/60,ISLAND_RADIUS=40;
const E=1e-8;
export const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const dist3=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const r=n=>{const x=Math.round(n*1000)/1000;return Object.is(x,-0)?0:x;};
const vec=p=>p.map(r);
const dir=(a,b)=>{const d=distance(a,b);return d>E?[(a[0]-b[0])/d,(a[2]-b[2])/d]:[1,0];};
const idSort=(a,b)=>a.id.localeCompare(b.id,'en',{numeric:true});
export const defaultInput=()=>({move:[0,0],cam_yaw_deg:0,jump:false,dash:false,interact:false,pulse:false,pause:false});
export function seededRandom(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)|0;let x=s;x=Math.imul(x^x>>>15,x|1);x^=x+Math.imul(x^x>>>7,x|61);return((x^x>>>14)>>>0)/4294967296;};}
export class Game{
  constructor(tuning,{seed=12,night=1,scenario={}}={}){
    validateScenario(scenario,tuning,night);this.tuning=structuredClone(tuning);this.night=night;this.map=getMap(night);this.rng=seededRandom(seed);
    this.tick=0;this.simTick=0;this.state='playing';this.score=0;this.events=[];this.previousInput=defaultInput();this.started=false;
    this.initialTime=scenario.time_left_s??tuning[`night${night}_duration_s`];this.timeLeft=this.initialTime;
    const sp=scenario.player??{};this.successfulLights=sp.successful_lights??0;this.player={pos:[...(sp.pos??this.map.start)],vel:[0,0,0],carried:sp.carried??0,flames:sp.flames??3,grounded:false};
    this.player.grounded=Math.abs(this.player.pos[1]-groundHeight(this.map,this.player.pos[0],this.player.pos[2]))<E;
    this.invulnTicks=sp.invuln_ticks??0;this.dashCD=sp.dash_cd_ticks??0;this.pulseCD=sp.pulse_cd_ticks??0;this.charmTicks=sp.charm_ticks??0;
    this.dashTicks=0;this.dashDir=[0,1];this.facing=[0,1];this.launch=null;this.respawnTicks=0;this.padLocked=false;
    this.lastMoteID=0;this.lastShadeID=0;this.lastDrifterID=0;
    this.randomMotes=scenario.random_motes??true;this.randomShades=scenario.random_shades??true;this.randomDrifters=scenario.random_drifters??true;
    this.windEnabled=scenario.wind_enabled??true;this.wind={active:false,dir_deg:0,warning:false};
    this.lanterns=this.map.lanterns.map((pos,i)=>({id:`L${i+1}`,pos:[...pos],deposited:0,lit:false,fuelUnits:0,ever_lit:false,relit_count:0}));
    for(const v of scenario.lanterns??[]){const l=this.lanterns.find(l=>l.id===v.id);const{fuel,...patch}=structuredClone(v);Object.assign(l,patch);
      const cost=this.lightCost(l);if(l.lit||l.deposited===cost){l.lit=true;l.ever_lit=true;l.deposited=cost;l.fuelUnits=Math.round((fuel??tuning.fuel_max)*60);}
    }
    for(const l of this.lanterns)Object.defineProperty(l,'fuel',{get(){return this.fuelUnits/60;}});
    this.motes=[];
    if(scenario.motes)scenario.motes.forEach(p=>this.addMote(p));
    else if(this.randomMotes){const points=[...this.map.motePoints];for(let i=points.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[points[i],points[j]]=[points[j],points[i]];}points.slice(0,20).forEach(p=>this.addMote(p));}
    const reserved=new Set((scenario.shades??[]).map(s=>s.id).filter(Boolean));
    this.shades=(scenario.shades??[]).map(s=>{let id=s.id;if(!id){do{id=`S${++this.lastShadeID}`;}while(reserved.has(id));}return{id,pos:[...s.pos],state:s.state??'wander',stateTicks:s.state_ticks_left??((s.state==='stunned')?120:0),target_lantern_id:s.target_lantern_id,drainTicks:0,pushTicks:0,pushDir:[1,0],recoilDir:[1,0],born:-1};});
    const drifterIDs=new Set((scenario.drifters??[]).map(d=>d.id).filter(Boolean));
    this.drifters=(scenario.drifters??[]).map(d=>{let id=d.id;if(!id){do{id=`D${++this.lastDrifterID}`;}while(drifterIDs.has(id));drifterIDs.add(id);}return{id,pos:[...d.pos],state:d.state??'idle',stolen:d.stolen??0,stateTicks:d.state_ticks_left??(d.state==='flee'?240:0),born:-1};});
    this.usedDrifterIDs=drifterIDs;
    for(const s of this.shades){const h=groundHeight(this.map,s.pos[0],s.pos[2]);s.hover=s.pos[1]-(Number.isFinite(h)?h:0);}
    this.charms=(scenario.charms??this.map.charms).map(c=>({id:c.id,pos:[...(c.pos??this.map.charms.find(m=>m.id===c.id)?.pos??[0,0,0])],available:c.available??true,respawnTicks:c.respawn_ticks??Math.round((c.respawn_s??0)*60)}));
  }
  emit(name,data={}){this.events.push({type:'event',tick:this.tick,name,data});}
  get capacity(){return Math.min(this.tuning.capacity_max,this.tuning.carry_capacity+2*this.successfulLights);}
  get requiredLit(){return Math.ceil(this.tuning.win_ratio*this.lanterns.length);}
  lightCost(l){return l.ever_lit?this.tuning.relight_cost:this.tuning.lantern_cost;}
  fuelValue(l){return Math.round(l.fuelUnits/6)/10;}
  safeLantern(l){return l.lit&&l.fuelUnits>=this.tuning.low_fuel_threshold*60;}
  accepts(l){return !l.lit||l.fuelUnits<this.tuning.fuel_max*60;}
  addMote(pos,kind='random',ttl=0){this.motes.push({id:`M${++this.lastMoteID}`,pos:[...pos],kind,ttl,born:this.simTick});}
  dropMotes(amount,pos,ring=true){for(let i=0;i<amount;i++){const a=this.rng()*Math.PI*2,rad=ring?1.5+this.rng():0;const x=pos[0]+Math.cos(a)*rad,z=pos[2]+Math.sin(a)*rad;const h=groundHeight(this.map,x,z);this.addMote([x,Number.isFinite(h)?h:pos[1],z],'dropped',480);}}
  safe(pos){return this.lanterns.some(l=>this.safeLantern(l)&&distance(pos,l.pos)<=this.tuning.safe_radius+E);}
  projectSafe(pos){let q=[...pos];for(let pass=0;pass<12;pass++){let changed=false;for(const l of this.lanterns){if(!this.safeLantern(l))continue;const d=distance(q,l.pos);if(d<6-E){const v=dir(q,l.pos);q[0]=l.pos[0]+v[0]*6;q[2]=l.pos[2]+v[1]*6;changed=true;}}if(!changed)break;}return q;}
  moveShade(s,dx,dz){let to=[s.pos[0]+dx,s.pos[1],s.pos[2]+dz];const h=groundHeight(this.map,to[0],to[2]);
    if(!Number.isFinite(h)||!canMove(this.map,[s.pos[0],s.pos[1]-.8,s.pos[2]],[to[0],s.pos[1]-.8,to[2]]))return;
    to[1]=h+(s.hover??.8);s.pos=this.projectSafe(to);
  }
  finish(state,reason){this.state=state;if(state==='won'){this.score+=this.lanterns.filter(l=>l.lit).reduce((sum,l)=>sum+this.tuning.score.per_lit_at_dawn+Math.floor(l.fuelUnits/60)*this.tuning.score.per_fuel_at_dawn,0);this.score+=this.player.flames*this.tuning.score.per_flame_left;}this.emit('game_over',{result:state,reason});}
  decrement(){
    this.timeLeft=Math.max(0,this.initialTime-this.simTick/60);
    for(const key of ['invulnTicks','dashCD','pulseCD','charmTicks'])this[key]=Math.max(0,this[key]-1);
    for(const s of this.shades){s.justRecovered=false;s.stateTicks=Math.max(0,s.stateTicks-1);if(['spawning','stunned'].includes(s.state)&&s.stateTicks===0){s.state='wander';s.justRecovered=true;}}
    for(const d of this.drifters)if(d.state==='flee'){d.stateTicks--;if(d.stateTicks<=0)d.state='removed';}
    this.drifters=this.drifters.filter(d=>d.state!=='removed');
    for(const m of this.motes)if(m.kind==='dropped')m.ttl--;this.motes=this.motes.filter(m=>m.kind!=='dropped'||m.ttl>0);
    for(const c of this.charms)if(!c.available){c.respawnTicks=Math.max(0,c.respawnTicks-1);if(c.respawnTicks===0)c.available=true;}
    this.burnFuel();
    if(this.night===3&&this.windEnabled){const phase=this.simTick%1800;if(phase===1680)this.wind.dir_deg=this.rng()*360;this.wind.warning=phase>=1680;this.wind.active=this.simTick>=1800&&phase<300;}
  }
  burnFuel(){
    const drains=[];
    for(const l of this.lanterns)if(l.lit)l.fuelUnits-=this.tuning.fuel_decay_per_s;
    for(const s of this.shades){if(s.state!=='drain')continue;const l=this.lanterns.find(l=>l.id===s.target_lantern_id);
      if(l?.lit&&distance(s.pos,l.pos)<=2+E&&l.fuelUnits<this.tuning.low_fuel_threshold*60){l.fuelUnits-=this.tuning.drain_per_s;s.drainTicks=(s.drainTicks??0)+1;if(s.drainTicks%60===0)drains.push({l,s});}
    }
    for(const l of this.lanterns)l.fuelUnits=Math.max(0,l.fuelUnits);
    for(const{l,s}of drains)this.emit('fuel_drain',{lantern_id:l.id,shade_id:s.id,fuel:this.fuelValue(l)});
    for(const l of this.lanterns)if(l.lit&&l.fuelUnits===0){l.lit=false;l.deposited=0;l.ever_lit=true;this.emit('lantern_out',{lantern_id:l.id});}
  }
  movePlayer(input,rising){
    const p=this.player,t=this.tuning;this.dashingThisStep=false;
    if(this.respawnTicks>0){this.respawnTicks--;if(this.respawnTicks===0){p.pos=[...this.map.start];p.vel=[0,0,0];p.grounded=true;this.invulnTicks=90;this.launch=null;this.dashTicks=0;}return;}
    let [x,z]=input.move;const norm=Math.max(1,Math.hypot(x,z));x/=norm;z/=norm;const a=input.cam_yaw_deg*Math.PI/180;
    const v=[x*Math.cos(a)+z*Math.sin(a),-x*Math.sin(a)+z*Math.cos(a)];if(Math.hypot(...v)>E)this.facing=[...v];
    if(rising('jump')&&p.grounded){p.vel[1]=7;p.grounded=false;}
    const onPad=this.map.pads.find(pad=>distance(p.pos,pad.pos)<=1+E&&Math.abs(p.pos[1]-pad.pos[1])<.12);
    if(onPad&&p.grounded&&!this.padLocked){const v=dir(onPad.target,onPad.pos);this.launch=[v[0]*onPad.speed,v[1]*onPad.speed];p.vel[1]=onPad.vy;p.grounded=false;this.padLocked=true;}
    if(!onPad)this.padLocked=false;
    if(rising('dash')&&this.dashTicks===0&&(this.dashCD===0||this.charmTicks>0)){this.dashTicks=12;const launchSpeed=this.launch?Math.hypot(...this.launch):0;this.dashDir=launchSpeed>E?this.launch.map(v=>v/launchSpeed):[...this.facing];this.dashCD=this.charmTicks>0?0:90;this.emit('dash');}
    const dashing=this.dashTicks>0,old=[...p.pos];this.dashingThisStep=dashing;
    const speed=this.charmTicks>0?7.2:t.player_speed;
    p.vel[0]=dashing?this.dashDir[0]*14:this.launch?this.launch[0]:v[0]*speed;
    p.vel[2]=dashing?this.dashDir[1]*14:this.launch?this.launch[1]:v[1]*speed;
    if(this.wind.active){const a=this.wind.dir_deg*Math.PI/180;p.vel[0]+=Math.cos(a)*2;p.vel[2]+=Math.sin(a)*2;}
    let to=[p.pos[0]+p.vel[0]*DT,p.pos[1],p.pos[2]+p.vel[2]*DT];
    if(canMove(this.map,p.pos,to)){p.pos[0]=to[0];p.pos[2]=to[2];}else{p.vel[0]=0;p.vel[2]=0;}
    const ground=groundHeight(this.map,p.pos[0],p.pos[2]);
    if(p.grounded){if(Number.isFinite(ground)&&Math.abs(ground-p.pos[1])<=.17){p.pos[1]=ground;p.vel[1]=0;}else p.grounded=false;}
    if(!p.grounded&&!dashing){const nextY=p.pos[1]+p.vel[1]*DT-10*DT*DT;p.vel[1]-=20*DT;
      if(Number.isFinite(ground)&&p.vel[1]<=0&&old[1]>=ground-E&&nextY<=ground){p.pos[1]=ground;p.vel[1]=0;p.grounded=true;this.launch=null;}else p.pos[1]=nextY;
    }
    if(dashing)this.dashTicks--;
    if(p.pos[1]<-10){const lost=p.carried;p.carried=0;p.flames=Math.max(0,p.flames-1);p.vel=[0,0,0];this.launch=null;this.dashTicks=0;this.emit('player_hit',{by:'fall',flames:p.flames,dropped:0,lost});if(p.flames>0)this.respawnTicks=60;}
  }
  collect(){const p=this.player;if(this.respawnTicks||p.flames<=0)return;
    this.motes=this.motes.filter(m=>{if(m.born<this.simTick&&p.carried<this.capacity&&distance(p.pos,m.pos)<=1+E&&Math.abs(p.pos[1]-m.pos[1])<=1.5+E){p.carried++;this.emit('mote_picked',{carried:p.carried});return false;}return true;});
    for(const c of this.charms)if(c.available&&distance(p.pos,c.pos)<=1+E&&Math.abs(p.pos[1]-c.pos[1])<=1.5+E){this.charmTicks=600;this.dashCD=0;c.available=false;c.respawnTicks=2700;this.emit('charm_picked',{charm_id:c.id,charm_ticks:600});}
  }
  interact(){const p=this.player;if(this.respawnTicks||p.flames<=0)return;const l=this.lanterns.filter(l=>this.accepts(l)&&distance(p.pos,l.pos)<=2+E).sort((a,b)=>distance(p.pos,a.pos)-distance(p.pos,b.pos)||idSort(a,b))[0];
    if(!l||!p.carried)return;
    if(l.lit){const amount=Math.min(p.carried,Math.ceil((this.tuning.fuel_max*60-l.fuelUnits)/(this.tuning.fuel_per_mote*60)));if(!amount)return;p.carried-=amount;l.fuelUnits=Math.min(this.tuning.fuel_max*60,l.fuelUnits+amount*this.tuning.fuel_per_mote*60);this.score+=amount*this.tuning.score.per_deposit;this.emit('refuel',{lantern_id:l.id,amount,fuel:this.fuelValue(l)});return;}
    const cost=this.lightCost(l),amount=Math.min(p.carried,cost-l.deposited);p.carried-=amount;l.deposited+=amount;this.score+=amount*this.tuning.score.per_deposit;this.emit('deposit',{lantern_id:l.id,amount,deposited:l.deposited});
    if(l.deposited===cost){const relight=l.ever_lit;l.lit=true;l.fuelUnits=this.tuning.fuel_max*60;l.ever_lit=true;if(relight)l.relit_count++;this.successfulLights++;this.score+=relight?this.tuning.score.per_relight:this.tuning.score.per_lantern;this.emit('lantern_lit',{lantern_id:l.id,relight});}
  }
  pulse(){const p=this.player;if(this.respawnTicks||p.flames<=0||p.carried<3||this.pulseCD)return;p.carried-=3;this.pulseCD=180;const center=[p.pos[0],p.pos[1]+.8,p.pos[2]],stunned_ids=[];
    for(const s of this.shades)if(dist3(s.pos,center)<=5+E){const draining=s.state==='drain';s.state='stunned';s.stateTicks=120;s.pushTicks=15;s.pushDir=dir(s.pos,p.pos);s.drainTicks=0;stunned_ids.push(s.id);this.score+=draining?this.tuning.score.per_drain_stun:this.tuning.score.per_stun;}
    for(const d of this.drifters)if(dist3(d.pos,center)<=5+E){if(d.state==='chase'){d.state='flee';d.stateTicks=240;}else if(d.state==='flee'&&d.stolen>0){const amount=d.stolen;this.dropMotes(amount,d.pos,false);d.stolen=0;d.stateTicks=120;this.emit('drifter_drop',{drifter_id:d.id,amount});}}
    this.emit('pulse',{stunned_ids});
  }
  enemies(){const p=this.player;
    for(const s of this.shades){if(s.state==='spawning')continue;
      if(s.state==='stunned'){if(s.pushTicks>0){this.moveShade(s,s.pushDir[0]*4/15,s.pushDir[1]*4/15);s.pushTicks--;}continue;}
      if(s.state==='recoil'){this.moveShade(s,s.recoilDir[0]*2/60,s.recoilDir[1]*2/60);if(s.stateTicks===0)s.state='wander';continue;}
      const d=distance(s.pos,p.pos);
      if(s.state==='drain'){const l=this.lanterns.find(l=>l.id===s.target_lantern_id);if(d<=6){s.state='chase';s.drainTicks=0;}else if(!l?.lit||this.safeLantern(l)||distance(s.pos,l.pos)>2+E){s.state='wander';s.drainTicks=0;continue;}else continue;}
      if(s.justRecovered)continue;
      if(s.state==='chase'&&d>18)s.state='wander';else if(s.state==='wander'&&d<=12)s.state='chase';
      let target;
      if(s.state==='wander'){const weak=this.lanterns.filter(l=>l.lit&&l.fuelUnits<this.tuning.low_fuel_threshold*60);const candidates=weak.length?weak:this.lanterns.filter(l=>!l.lit);target=candidates.sort((a,b)=>distance(s.pos,a.pos)-distance(s.pos,b.pos)||idSort(a,b))[0];s.target_lantern_id=target?.id;
        if(target?.lit&&distance(s.pos,target.pos)<=2+E){s.state='drain';s.drainTicks=0;continue;}}
      const v=s.state==='chase'?(d>E?dir(p.pos,s.pos):[0,0]):target?(distance(s.pos,target.pos)>E?dir(target.pos,s.pos):[0,0]):[Math.cos(this.simTick/180+Number(s.id.replace(/\D/g,''))),Math.sin(this.simTick/180+Number(s.id.replace(/\D/g,'')))];
      const speed=s.state==='chase'?(this.night===3?4.5:4):1;this.moveShade(s,v[0]*speed*DT,v[1]*speed*DT);
      if(s.state==='wander'&&target?.lit&&distance(s.pos,target.pos)<=2+E){s.state='drain';s.drainTicks=0;}
    }
    for(const d of this.drifters){if(d.born===this.simTick)continue;const delta=distance(p.pos,d.pos);
      if(d.state!=='flee')d.state=p.carried>=5&&delta<=15?'chase':'idle';
      const v=d.state==='flee'?dir(d.pos,p.pos):d.state==='chase'?(delta>E?dir(p.pos,d.pos):[0,0]):[Math.cos(this.simTick/120),Math.sin(this.simTick/120)];
      const speed=d.state==='idle'?2:7;d.pos[0]+=v[0]*speed*DT;d.pos[2]+=v[1]*speed*DT;
    }
  }
  contacts(){const p=this.player;if(this.respawnTicks||p.flames<=0)return;
    for(const d of [...this.drifters].sort(idSort))if(d.state==='chase'&&distance(d.pos,p.pos)<=1.2+E){const amount=Math.min(3,p.carried);p.carried-=amount;d.stolen=amount;d.state='flee';d.stateTicks=240;this.emit('drifter_steal',{drifter_id:d.id,amount,carried:p.carried});}
    if(this.invulnTicks||this.safe(p.pos))return;
    for(const s of [...this.shades].sort(idSort))if(['wander','chase'].includes(s.state)&&!s.safeEjected&&distance(s.pos,p.pos)<=1+E&&Math.abs(s.pos[1]-p.pos[1])<=1.5+E){
      p.flames--;const dropped=Math.floor(p.carried/2);p.carried-=dropped;this.dropMotes(dropped,p.pos);this.invulnTicks=90;s.state='recoil';s.stateTicks=60;s.recoilDir=dir(s.pos,p.pos);this.emit('player_hit',{by:'shade',flames:p.flames,dropped});break;
    }
  }
  spawn(){
    if(this.randomMotes&&this.simTick%240===0&&this.motes.length<30){const free=this.map.motePoints.filter(p=>!this.motes.some(m=>m.kind==='random'&&distance(p,m.pos)<.01&&Math.abs(p[1]-m.pos[1])<.01));if(free.length)this.addMote(free[Math.floor(this.rng()*free.length)]);}
    if(this.randomShades&&(this.simTick===300||(this.simTick>300&&(this.simTick-300)%this.map.shadeInterval===0))){for(let i=0;i<(this.simTick===300?2:1)&&this.shades.length<this.map.shadeMax;i++){
      const free=this.map.shadePoints.filter(p=>distance(p,this.player.pos)>=15-E&&!this.safe(p)&&!this.shades.some(s=>distance(s.pos,p)<1));if(!free.length)break;const point=free[Math.floor(this.rng()*free.length)];let id;do{id=`S${++this.lastShadeID}`;}while(this.shades.some(s=>s.id===id));
      this.shades.push({id,pos:[point[0],point[1]+.8,point[2]],state:'spawning',stateTicks:60,pushTicks:0,pushDir:[1,0],recoilDir:[1,0],born:this.simTick});this.emit('shade_spawned',{id});
    }}
    if(this.night>1&&this.randomDrifters&&this.simTick%1200===0&&this.drifters.length<2){const p=this.map.shadePoints[Math.floor(this.rng()*this.map.shadePoints.length)];let id;do{id=`D${++this.lastDrifterID}`;}while(this.usedDrifterIDs.has(id));this.usedDrifterIDs.add(id);this.drifters.push({id,pos:[p[0],p[1]+.8,p[2]],state:'idle',stolen:0,stateTicks:0,born:this.simTick});}
  }
  step(patch={}){
    if(['won','lost'].includes(this.state))return[];const input={...this.previousInput,...patch},rising=k=>input[k]&&!this.previousInput[k];this.events=[];this.tick++;
    if(rising('pause')){this.state=this.state==='paused'?'playing':'paused';this.emit(this.state==='paused'?'paused':'resumed');}
    if(this.state==='paused'){this.previousInput=structuredClone(input);return this.events;}
    this.simTick++;if(!this.started){this.started=true;this.emit('night_start',{night:this.night});}
    this.decrement();this.movePlayer(input,rising);this.collect();if(rising('interact'))this.interact();
    for(const s of this.shades){s.safeEjected=false;const next=this.projectSafe(s.pos);if(distance(next,s.pos)>E){s.pos=next;s.safeEjected=true;}}
    if(rising('pulse'))this.pulse();this.enemies();this.contacts();this.spawn();
    if(this.player.flames<=0)this.finish('lost','no_flames');else if(this.timeLeft<=E)this.finish(this.lanterns.filter(l=>l.lit).length>=this.requiredLit?'won':'lost',this.lanterns.filter(l=>l.lit).length>=this.requiredLit?'dawn_survived':'dawn');
    this.previousInput=structuredClone(input);return this.events;
  }
  snapshot(){return{type:'snapshot',tick:this.tick,sim_tick:this.simTick,night:this.night,state:this.state,time_left_s:r(this.timeLeft),score:this.score,wind:{active:this.wind.active,dir_deg:r(this.wind.dir_deg)},
    player:{pos:vec(this.player.pos),vel:vec(this.player.vel.map((v,i)=>i===1&&this.dashingThisStep?0:v)),grounded:this.player.grounded,flames:this.player.flames,carried:this.player.carried,capacity:this.capacity,invuln:this.invulnTicks>0,dash_cd_s:r(this.dashCD/60),pulse_cd_s:r(this.pulseCD/60),charm_s:r(this.charmTicks/60)},
    lanterns:this.lanterns.map(l=>({id:l.id,pos:vec(l.pos),lit:l.lit,deposited:l.deposited,fuel:l.lit?this.fuelValue(l):0,ever_lit:l.ever_lit,relit_count:l.relit_count})),shades:this.shades.map(s=>({id:s.id,pos:vec(s.pos),state:s.state})),motes_active:this.motes.length,
    motes:this.motes.map(m=>({id:m.id,pos:vec(m.pos),kind:m.kind,ttl_s:m.kind==='dropped'?r(m.ttl/60):null})),
    drifters:this.drifters.map(d=>({id:d.id,pos:vec(d.pos),state:d.state,stolen:d.stolen})),charms:this.charms.map(c=>({id:c.id,available:c.available,respawn_s:r(c.respawnTicks/60)}))};}
  end(){return{type:'end',ticks:this.tick,state:this.state,score:this.score};}
}
