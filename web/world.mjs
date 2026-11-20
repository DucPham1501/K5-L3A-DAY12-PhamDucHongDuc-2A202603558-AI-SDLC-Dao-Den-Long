import * as THREE from 'three';
import {P} from './palette.mjs';
import {groundHeight} from '../src/core/maps.mjs';
import {seededRandom} from '../src/core/game.mjs';
const basic=(color,extra={})=>new THREE.MeshBasicMaterial({color,...extra});
const material=(color)=>new THREE.MeshLambertMaterial({color});
export class World{
  constructor(container){
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));this.renderer.setSize(innerWidth,innerHeight);this.renderer.outputColorSpace=THREE.SRGBColorSpace;container.append(this.renderer.domElement);
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(P.sky);this.scene.fog=new THREE.FogExp2(P.fog,.007);
    this.camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.1,250);
    this.ambient=new THREE.AmbientLight('#ffffff',.15);this.scene.add(this.ambient);
    const moon=new THREE.DirectionalLight('#c2d1ff',1.1);moon.position.set(-20,50,12);this.scene.add(moon);
    this.shared={grass:material(P.grass),sand:material(P.sand),wood:material(P.wood),rock:material('#23354c'),cloud:basic(P.cloud,{transparent:true,opacity:.7}),gold:basic(P.gold),mote:basic(P.mote),halo:basic(P.halo,{transparent:true,opacity:.15,depthWrite:false}),red:material(P.red),coat:material(P.coat)};
    this.moteGeometry=new THREE.IcosahedronGeometry(.12,0);this.dynamic=new THREE.Group();this.scene.add(this.dynamic);this.visuals=new Map();this.pulses=[];this.time=0;
    this.avatar=this.makeAvatar();this.scene.add(this.avatar);this.createSky();this.camera.position.set(0,12,17);
    this.windLeaves=new THREE.InstancedMesh(new THREE.ConeGeometry(.09,.35,3),this.shared.gold,16);this.windLeaves.frustumCulled=false;this.scene.add(this.windLeaves);
    this.stats={frames:0,seconds:0,average_fps:0};
    window.addEventListener('resize',()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);});
  }
  mesh(geo,mat,parent,pos=[0,0,0]){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);parent.add(m);return m;}
  cylinder(parent,rt,rb,h,mat,pos,segments=16){return this.mesh(new THREE.CylinderGeometry(rt,rb,h,segments),mat,parent,pos);}
  orb(parent,size,mat,pos,scale=[1,1,1]){const m=this.mesh(new THREE.IcosahedronGeometry(size,1),mat,parent,pos);m.scale.set(...scale);return m;}
  ring(parent,r,color,y=.035){const mesh=this.mesh(new THREE.RingGeometry(r-.04,r+.04,48),basic(color,{transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}),parent,[0,y,0]);mesh.rotation.x=-Math.PI/2;return mesh;}
  makeAvatar(){const group=new THREE.Group(),skin=material('#E6BE91');this.cylinder(group,.19,.36,.7,this.shared.coat,[0,.65,0],10);this.orb(group,.24,skin,[0,1.19,0]);this.mesh(new THREE.ConeGeometry(.65,.35,24),this.shared.sand,group,[0,1.5,0]);this.cylinder(group,.64,.64,.025,this.shared.sand,[0,1.33,0],24);
    this.mesh(new THREE.BoxGeometry(.38,.12,.1),this.shared.red,group,[0,1.02,.16]);this.mesh(new THREE.BoxGeometry(.1,.42,.05),this.shared.red,group,[.14,.83,.22]);
    this.legs=[];for(const x of[-.14,.14]){this.legs.push(this.cylinder(group,.075,.08,.32,this.shared.wood,[x,.19,0],6));this.cylinder(group,.065,.075,.4,this.shared.coat,[x*2.2,.8,0],6);}
    this.handLamp=this.cylinder(group,.12,.12,.24,basic(P.core),[.47,.7,.1],8);this.cylinder(group,.012,.012,.55,this.shared.wood,[.47,1.09,.1],4);this.ring(group,.45,P.gold,.02);return group;
  }
  createSky(){const rng=seededRandom(720),points=[];for(let i=0;i<300;i++)points.push((rng()-.5)*230,30+rng()*70,(rng()-.5)*230);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));this.scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color:P.core,size:.14})));
    const geoCloud=new THREE.IcosahedronGeometry(1,1),clouds=new THREE.InstancedMesh(geoCloud,this.shared.cloud,45),matrix=new THREE.Matrix4();for(let i=0;i<45;i++){matrix.compose(new THREE.Vector3((rng()-.5)*200,-7-rng()*5,(rng()-.5)*150),new THREE.Quaternion(),new THREE.Vector3(8+rng()*10,1.2,5+rng()*7));clouds.setMatrixAt(i,matrix);}this.scene.add(clouds);
    this.orb(this.scene,3,basic(P.core),[-55,45,-75]);
  }
  dispose(group){const keep=new Set(Object.values(this.shared));group.traverse(o=>{if(o.geometry&&o.geometry!==this.moteGeometry)o.geometry.dispose();if(o.material&&!keep.has(o.material))o.material.dispose();});this.scene.remove(group);}
  load(map){
    if(this.terrain)this.dispose(this.terrain);this.terrain=new THREE.Group();this.scene.add(this.terrain);
    for(const o of [...this.dynamic.children]){this.dynamic.remove(o);this.dispose(o);}this.visuals.clear();this.pulses=[];this.map=map;
    for(const[cx,cz,r]of map.circles){this.cylinder(this.terrain,r,r*.9,3,this.shared.rock,[cx,-1.6,cz],64);this.cylinder(this.terrain,r,r,.15,this.shared.grass,[cx,-.075,cz],64);const rim=this.ring(this.terrain,r-.3,P.sand);rim.position.x=cx;rim.position.z=cz;}
    if(map.night===2){this.mesh(new THREE.BoxGeometry(18,.18,4),this.shared.wood,this.terrain,[35,-.09,0]);const g=new THREE.BoxGeometry(.16,.06,4.1),planks=new THREE.InstancedMesh(g,this.shared.sand,35),m=new THREE.Matrix4();for(let i=0;i<35;i++){m.makeTranslation(26+i*.52,.02,0);planks.setMatrixAt(i,m);}this.terrain.add(planks);}
    if(map.night===3){
      this.cylinder(this.terrain,8,8,6,this.shared.rock,[0,3,0],64);this.cylinder(this.terrain,8,8,.08,this.shared.grass,[0,6,0],64);
      const shape=new THREE.Shape();shape.moveTo(24,0);for(let i=1;i<=48;i++){const a=i*Math.PI/48;shape.lineTo(24*Math.cos(a),-24*Math.sin(a));}for(let i=48;i>=0;i--){const a=i*Math.PI/48;shape.lineTo(12*Math.cos(a),-12*Math.sin(a));}shape.closePath();
      const terrace=this.mesh(new THREE.ExtrudeGeometry(shape,{depth:3,bevelEnabled:false}),this.shared.grass,this.terrain);terrace.rotation.x=-Math.PI/2;
      for(const degrees of[30,150]){const a=degrees*Math.PI/180,positions=[],indices=[0,1,2,1,3,2];for(const[along,side,y]of[[30,-1.5,0],[30,1.5,0],[24,-1.5,3],[24,1.5,3]])positions.push(along*Math.cos(a)-side*Math.sin(a),y,along*Math.sin(a)+side*Math.cos(a));const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();this.mesh(geo,new THREE.MeshLambertMaterial({color:P.sand,side:THREE.DoubleSide}),this.terrain);}
      this.cylinder(this.terrain,2,2,8,this.shared.wood,[0,10,0],20);this.mesh(new THREE.ConeGeometry(2.7,1.4,8),this.shared.red,this.terrain,[0,14.7,0]);this.cylinder(this.terrain,.8,1.2,1.2,this.shared.gold,[0,13,1.6],16);
    }
    for(const pad of map.pads){const group=new THREE.Group();group.position.set(...pad.pos);this.terrain.add(group);this.cylinder(group,1,1,.08,this.shared.gold,[0,.04,0],32);this.ring(group,.7,P.red,.09);}
    // Batch decorative trees into instanced meshes: no gameplay colliders.
    const rng=seededRandom(map.night*919),count=map.circles.length*14,trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.14,.22,2,6),this.shared.wood,count),crowns=new THREE.InstancedMesh(new THREE.ConeGeometry(1.2,3.5,6),this.shared.grass,count),matrix=new THREE.Matrix4();let i=0;
    for(const[cx,cz,r]of map.circles)for(let j=0;j<14;j++){const a=rng()*Math.PI*2,x=cx+Math.cos(a)*(r-2.5),z=cz+Math.sin(a)*(r-2.5);matrix.makeTranslation(x,1,z);trunks.setMatrixAt(i,matrix);matrix.makeTranslation(x,3,z);crowns.setMatrixAt(i,matrix);i++;}this.terrain.add(trunks,crowns);
    const stones=[];for(const lamp of map.lanterns){const cx=map.night===2&&lamp[0]>40?70:0,d=Math.hypot(lamp[0]-cx,lamp[2]);for(let j=3;j<d-1;j+=1.5){const x=cx+(lamp[0]-cx)*j/d,z=lamp[2]*j/d,h=groundHeight(map,x,z);if(Number.isFinite(h)&&h===lamp[1])stones.push([x,h+.025,z]);}}
    const stepping=new THREE.InstancedMesh(new THREE.CylinderGeometry(.3,.35,.06,7),this.shared.sand,stones.length),sm=new THREE.Matrix4();stones.forEach((p,i)=>{sm.makeTranslation(...p);stepping.setMatrixAt(i,sm);});this.terrain.add(stepping);
    this.camera.position.set(map.start[0],map.start[1]+(map.night===3?18:12),map.start[2]+17);this.stats={frames:0,seconds:0,average_fps:0};
  }
  make(type,item){const group=new THREE.Group();let body,edge;
    if(type==='lamp'){this.cylinder(group,1,1.2,.12,this.shared.rock,[0,.06,0]);this.cylinder(group,.12,.16,2.8,this.shared.wood,[0,1.4,0]);this.mesh(new THREE.BoxGeometry(1.1,.12,.12),this.shared.wood,group,[.4,2.65,0]);body=this.cylinder(group,.35,.35,.8,basic(P.unlit),[.72,2.1,0],10);this.cylinder(group,.43,.43,.08,this.shared.gold,[.72,2.54,0],10);this.cylinder(group,.38,.38,.08,this.shared.wood,[.72,1.66,0],10);edge=this.ring(group,6,P.lit);edge.visible=false;}
    if(type==='shade'){body=this.orb(group,.63,basic(P.shade),[0,0,0],[1,1.15,1]);const outline=this.mesh(new THREE.IcosahedronGeometry(.66,1),basic(P.outline,{wireframe:true,transparent:true,opacity:.45}),group);outline.scale.y=1.15;for(const x of[-.17,.17])this.orb(group,.065,basic(P.outline),[x,.1,.52]);}
    if(type==='drifter'){body=this.mesh(new THREE.TorusKnotGeometry(.35,.07,32,5),basic(P.drifter),group);group.scale.set(1.6,.5,1);}
    if(type==='charm'){this.mesh(new THREE.BoxGeometry(.5,.8,.05),this.shared.gold,group,[0,.65,0]);body=this.mesh(new THREE.BoxGeometry(.4,.68,.07),this.shared.red,group,[0,.65,0]);}
    this.dynamic.add(group);const visual={group,body,edge};this.visuals.set(`${type}:${item.id}`,visual);return visual;
  }
  pulse(pos){const ring=this.ring(this.dynamic,1,P.core,0);ring.position.set(pos[0],pos[1]+.05,pos[2]);this.pulses.push({ring,age:0});}
  update(game,yaw,delta,active){
    this.time+=delta;const p=game.player;this.ambient.intensity=.15+.55*game.lanterns.filter(l=>l.lit).length/game.lanterns.length;
    this.avatar.position.set(...p.pos);this.avatar.rotation.y=Math.atan2(game.facing[0],game.facing[1]);this.avatar.visible=!game.respawnTicks&&!(game.invulnTicks>0&&Math.floor(this.time*10)%2);
    this.handLamp.rotation.z=Math.sin(this.time*6)*.1;this.legs.forEach((leg,i)=>leg.rotation.x=active&&Math.hypot(p.vel[0],p.vel[2])>.1?Math.sin(this.time*13+i*Math.PI)*.6:0);
    this.windLeaves.visible=game.wind.warning||game.wind.active;
    if(this.windLeaves.visible){const m=new THREE.Matrix4(),q=new THREE.Quaternion(),a=game.wind.dir_deg*Math.PI/180;for(let i=0;i<16;i++){const travel=(this.time*4+i*.8)%12-6;q.setFromEuler(new THREE.Euler(this.time+i,this.time*.5,1));m.compose(new THREE.Vector3(p.pos[0]+Math.cos(a)*travel+Math.sin(i)*3,p.pos[1]+1+Math.sin(this.time*2+i),p.pos[2]+Math.sin(a)*travel+Math.cos(i)*3),q,new THREE.Vector3(1,1,1));this.windLeaves.setMatrixAt(i,m);}this.windLeaves.instanceMatrix.needsUpdate=true;}
    const seen=new Set();for(const[type,list]of[['lamp',game.lanterns],['shade',game.shades],['drifter',game.drifters],['charm',game.charms]])for(const item of list){const key=`${type}:${item.id}`;seen.add(key);const v=this.visuals.get(key)??this.make(type,item);v.group.position.set(...item.pos);
      if(type==='lamp'){v.body.material.color.set(item.lit?P.lit:P.unlit);v.edge.visible=item.lit;v.edge.material.opacity=item.lit?.25+.12*Math.sin(this.time):0;}
      if(type==='shade'){v.body.material.color.set(item.state==='stunned'?P.stunned:P.shade);v.group.scale.setScalar(item.state==='spawning'?Math.max(.05,1-item.stateTicks/60):1);v.group.rotation.y=Math.atan2(p.pos[0]-item.pos[0],p.pos[2]-item.pos[2]);}
      if(type==='drifter')v.group.rotation.y=this.time*2;
      if(type==='charm'){v.group.visible=item.available;v.group.rotation.y=this.time;}
    }
    for(const[key,v]of this.visuals)if(!seen.has(key)){this.dynamic.remove(v.group);this.dispose(v.group);this.visuals.delete(key);}
    if(this.moteInstances)this.dynamic.remove(this.moteInstances);
    if(!this.moteInstances){this.moteInstances=new THREE.InstancedMesh(this.moteGeometry,this.shared.mote,200);this.moteInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);}
    if(!this.haloInstances){this.haloInstances=new THREE.InstancedMesh(this.moteGeometry,this.shared.halo,200);this.haloInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);}
    this.moteInstances.count=this.haloInstances.count=Math.min(game.motes.length,200);const matrix=new THREE.Matrix4();game.motes.slice(0,200).forEach((m,i)=>{matrix.makeTranslation(m.pos[0],m.pos[1]+.5+Math.sin(this.time*2+i)*.15,m.pos[2]);this.moteInstances.setMatrixAt(i,matrix);matrix.scale(new THREE.Vector3(3,3,3));this.haloInstances.setMatrixAt(i,matrix);});this.moteInstances.instanceMatrix.needsUpdate=true;this.haloInstances.instanceMatrix.needsUpdate=true;this.moteInstances.frustumCulled=false;this.haloInstances.frustumCulled=false;this.dynamic.add(this.moteInstances,this.haloInstances);
    for(let i=this.pulses.length-1;i>=0;i--){const v=this.pulses[i];v.age+=delta;v.ring.scale.setScalar(v.age*10+.1);v.ring.material.opacity=Math.max(0,1-v.age*2);if(v.age>.5){this.dynamic.remove(v.ring);v.ring.geometry.dispose();v.ring.material.dispose();this.pulses.splice(i,1);}}
    const a=yaw*Math.PI/180,target=new THREE.Vector3(p.pos[0],p.pos[1]+1,p.pos[2]),wanted=new THREE.Vector3(p.pos[0]+Math.sin(a)*15,p.pos[1]+11,p.pos[2]+Math.cos(a)*15);
    for(let i=1;i<=20;i++){const f=i/20,x=target.x+(wanted.x-target.x)*f,z=target.z+(wanted.z-target.z)*f;let h=groundHeight(this.map,x,z);if(this.map.night===3&&Math.hypot(x,z)<2.3)h=15.5;if(Number.isFinite(h))wanted.y=Math.max(wanted.y,target.y+(h+.5-target.y)/f);}
    this.camera.position.lerp(wanted,1-Math.exp(-delta*7));this.camera.lookAt(target);this.renderer.render(this.scene,this.camera);
    if(active){this.stats.frames++;this.stats.seconds+=delta;this.stats.average_fps=this.stats.frames/this.stats.seconds;}
  }
  screenPoint(pos){const p=new THREE.Vector3(pos[0],pos[1]+2,pos[2]).project(this.camera);return{x:p.x,y:p.y,visible:p.z<1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1};}
}
