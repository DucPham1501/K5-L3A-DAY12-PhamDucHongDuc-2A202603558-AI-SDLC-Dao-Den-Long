export class DataError extends Error {}
const fail=m=>{throw new DataError(m);};
const obj=(v,n)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail(`${n}: expected object`);};
const keys=(v,list,n)=>{for(const k of Object.keys(v))if(!list.includes(k))fail(`${n}.${k}: unknown field`);};
const num=(v,n,min=-Infinity,max=Infinity,int=false)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||(int&&!Number.isSafeInteger(v)))fail(`${n}: invalid number`);};
const bool=(v,n)=>{if(typeof v!=='boolean')fail(`${n}: expected boolean`);};
const pos=(v,n)=>{if(!Array.isArray(v)||v.length!==3)fail(`${n}: expected [x,y,z]`);v.forEach(x=>num(x,n,-1e6,1e6));};
export function validateInputs(data) {
  obj(data,'inputs');keys(data,['frames'],'inputs');if(!Array.isArray(data.frames))fail('frames: expected array');
  let last=-1;
  for(const f of data.frames){obj(f,'frame');keys(f,['tick','move','cam_yaw_deg','jump','dash','interact','pulse','pause'],'frame');num(f.tick,'tick',0,Number.MAX_SAFE_INTEGER,true);if(f.tick<=last)fail('frame ticks must strictly increase');last=f.tick;
    if('move'in f){if(!Array.isArray(f.move)||f.move.length!==2)fail('move: expected [x,z]');f.move.forEach(x=>num(x,'move',-1,1));}
    if('cam_yaw_deg'in f)num(f.cam_yaw_deg,'cam_yaw_deg');
    for(const k of ['jump','dash','interact','pulse','pause'])if(k in f)bool(f[k],k);
  }return data;
}
export function validateScenario(data,t,night=1){
  obj(data,'scenario');keys(data,['player','random_motes','random_shades','random_drifters','wind_enabled','motes','shades','lanterns','drifters','charms','time_left_s'],'scenario');
  if('player'in data){obj(data.player,'player');keys(data.player,['pos','carried','flames','invuln_ticks','dash_cd_ticks','pulse_cd_ticks','charm_ticks','successful_lights'],'player');
    if('pos'in data.player)pos(data.player.pos,'player.pos');
    if('successful_lights'in data.player)num(data.player.successful_lights,'successful_lights',0,Number.MAX_SAFE_INTEGER,true);
    const capacity=Math.min(t.capacity_max,t.carry_capacity+2*(data.player.successful_lights??0));
    for(const k of ['carried','flames','invuln_ticks','dash_cd_ticks','pulse_cd_ticks','charm_ticks'])if(k in data.player)num(data.player[k],k,0,k==='carried'?capacity:Number.MAX_SAFE_INTEGER,true);
  }
  for(const k of ['random_motes','random_shades','random_drifters','wind_enabled'])if(k in data)bool(data[k],k);
  if('time_left_s'in data)num(data.time_left_s,'time_left_s',0,1e9);
  for(const k of ['motes','shades','lanterns','drifters','charms'])if(k in data&&!Array.isArray(data[k]))fail(`${k}: expected array`);
  data.motes?.forEach(p=>pos(p,'mote.pos'));
  for(const type of ['shades','drifters','charms','lanterns']){
    const ids=new Set();for(const v of data[type]??[]){obj(v,type);
      const allowed=type==='shades'?['id','pos','state','state_ticks_left','target_lantern_id']:type==='drifters'?['id','pos','state','stolen','state_ticks_left']:type==='charms'?['id','pos','available','respawn_s','respawn_ticks']:['id','pos','lit','deposited','fuel','ever_lit'];keys(v,allowed,type);
      if('id'in v){if(typeof v.id!=='string'||!v.id||ids.has(v.id))fail(`${type}: invalid/duplicate id`);ids.add(v.id);}
      if(type==='lanterns'&&(!/^L[1-7]$/.test(v.id)||Number(v.id.slice(1))>night+4))fail('invalid lantern id');
      if('pos'in v)pos(v.pos,`${type}.pos`);else if(type==='shades'||type==='drifters')fail(`${type}.pos required`);
      if('state'in v && !(type==='shades'?['spawning','wander','chase','recoil','stunned','drain']:['idle','chase','flee','removed']).includes(v.state))fail('invalid state');
      if('target_lantern_id'in v&&(!/^L[1-7]$/.test(v.target_lantern_id)||Number(v.target_lantern_id.slice(1))>night+4))fail('invalid target_lantern_id');
      if('fuel'in v)num(v.fuel,'fuel',0,t.fuel_max);
      for(const k of ['state_ticks_left','stolen','respawn_ticks'])if(k in v)num(v[k],k,0,Number.MAX_SAFE_INTEGER,true);
      if('respawn_s'in v)num(v.respawn_s,'respawn_s',0,1e9);
      if('deposited'in v)num(v.deposited,'deposited',0,t.lantern_cost,true);
      for(const k of ['lit','available','ever_lit'])if(k in v)bool(v[k],k);
      if(type==='charms'&&(!v.id||(!v.pos&&!['C1','C2'].includes(v.id))))fail('charm requires known id or pos');
    }
  }return data;
}
