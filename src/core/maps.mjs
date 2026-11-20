const E=1e-7;
export const radial=(cx,cz,r,count,start=0,y=0)=>Array.from({length:count},(_,i)=>{
  const a=(start+i*360/count)*Math.PI/180; return [cx+r*Math.cos(a),y,cz+r*Math.sin(a)];
});
export function getMap(night) {
  const map={night,name:['','Đảo Bến','Đảo Cau','Đảo Chuông'][night],start:night===3?[0,0,-15]:[0,0,0],pads:[],charms:[]};
  if(night===1) Object.assign(map,{circles:[[0,0,40]],lanterns:[[0,0,25],[23.8,0,7.7],[14.7,0,-20.2],[-14.7,0,-20.2],[-23.8,0,7.7]],motePoints:[...radial(0,0,12,8),...radial(0,0,33,16)],shadePoints:radial(0,0,37,12,15),shadeInterval:480,shadeMax:6});
  else if(night===2) Object.assign(map,{circles:[[0,0,28],[70,0,28]],bridge:[26,44,-2,2],lanterns:[[0,0,20],[17,0,-10],[-17,0,-10],[70,0,20],[87,0,-10],[53,0,-10]],motePoints:[...radial(0,0,10,4),...radial(0,0,22,8),...radial(70,0,10,4),...radial(70,0,22,8)],shadePoints:[...radial(0,0,26,8,22.5),...radial(70,0,26,8,22.5)],shadeInterval:420,shadeMax:8,pads:[{pos:[20,0,18],target:[70,0,0],vy:14,speed:24},{pos:[50,0,-18],target:[0,0,0],vy:14,speed:24}],charms:[{id:'C1',pos:[35,0,0]}]});
  else if(night===3) Object.assign(map,{circles:[[0,0,45]],lanterns:[[0,6,6],[18,3,10],[-18,3,10],[35,0,-10],[-35,0,-10],[20,0,-35],[-20,0,-35]],motePoints:[...radial(0,0,34,18),...Array.from({length:8},(_,i)=>{const a=(20+i*20)*Math.PI/180;return [18*Math.cos(a),3,18*Math.sin(a)];}),...radial(0,0,5,4,45,6)],shadePoints:radial(0,0,43,16),shadeInterval:360,shadeMax:10,pads:[{pos:[0,3,13],target:[0,3,0],vy:12,speed:8}],charms:[{id:'C1',pos:[30,0,25]},{id:'C2',pos:[-30,0,25]}]});
  else throw new Error('night must be 1, 2 or 3');
  return map;
}
export function rampHeight(map,x,z) {
  if(map.night!==3) return null;
  const r=Math.hypot(x,z);
  for(const degrees of [30,150]) {
    const a=degrees*Math.PI/180,along=x*Math.cos(a)+z*Math.sin(a),across=-x*Math.sin(a)+z*Math.cos(a);
    if(Math.abs(across)<=1.5+E && along>=24-E && along<=30+E && r>=24-E) return Math.max(0,Math.min(3,(30-along)/2));
  }
  return null;
}
export function groundHeight(map,x,z) {
  if(map.night===2) {
    if(map.circles.some(([cx,cz,r])=>Math.hypot(x-cx,z-cz)<=r+E) || (x>=26-E&&x<=44+E&&Math.abs(z)<=2+E)) return 0;
    return -Infinity;
  }
  const r=Math.hypot(x,z); if(r>map.circles[0][2]+E) return -Infinity;
  if(map.night===3) {
    if(r<=8+E) return 6;
    if(z>0 && r>=12-E && r<=24+E) return 3;
    const ramp=rampHeight(map,x,z); if(ramp!==null) return ramp;
  }
  return 0;
}
export function towerBlocked(map,x,y,z) {return map.night===3 && Math.hypot(x,z)<2-E && y<14-E;}
// Static walls stop horizontal travel; stepping off a ledge is permitted.
export function canMove(map,from,to) {
  if(towerBlocked(map,to[0],to[1],to[2])) return false;
  const h=groundHeight(map,to[0],to[2]),old=groundHeight(map,from[0],from[2]);
  const ramp=rampHeight(map,to[0],to[2])!==null || rampHeight(map,from[0],from[2])!==null;
  return h<=from[1]+(ramp?.16:.035)+E || h===-Infinity || (old===h && from[1]>=h-E);
}
