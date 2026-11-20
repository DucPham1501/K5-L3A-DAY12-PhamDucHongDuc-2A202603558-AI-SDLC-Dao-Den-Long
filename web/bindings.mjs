// Rebindable controls. Pure helpers so Node tests can import this file without a browser.
export const defaults={forward:'KeyW',backward:'KeyS',left:'KeyA',right:'KeyD',jump:'Space',dash:'ShiftLeft',interact:'KeyE',pulse:'KeyQ',pause:'Escape'};
export const actions=Object.keys(defaults);
export const labels={forward:'Đi tới',backward:'Đi lùi',left:'Sang trái',right:'Sang phải',jump:'Nhảy',dash:'Lướt',interact:'Tương tác',pulse:'Tỏa sáng',pause:'Tạm dừng'};
// Camera keys stay fixed; binding them to an action would make one key do two things.
export const reserved={ArrowLeft:'Xoay camera trái',ArrowRight:'Xoay camera phải'};
const VALID=/^[A-Za-z0-9]+$/;
export function validateBindings(value){return actions.every(k=>typeof value?.[k]==='string'&&VALID.test(value[k])&&!(value[k]in reserved))&&new Set(actions.map(k=>value[k])).size===actions.length;}
export function loadBindings(raw){return validateBindings(raw)?Object.fromEntries(actions.map(k=>[k,raw[k]])):{...defaults};}
// Returns {ok:true,bindings} or {ok:false,conflict,message}; never silently steals another action's key.
export function rebind(bindings,action,code){
 if(!actions.includes(action))return{ok:false,message:`Hành động không hợp lệ: ${action}`};
 if(typeof code!=='string'||!VALID.test(code))return{ok:false,message:'Phím này không gán được.'};
 if(code in reserved)return{ok:false,conflict:'camera',message:`Phím ${keyLabel(code)} đang dùng để ${reserved[code].toLowerCase()}.`};
 const conflict=actions.find(k=>k!==action&&bindings[k]===code);
 if(conflict)return{ok:false,conflict,message:`Trùng phím: ${keyLabel(code)} đang dùng cho “${labels[conflict]}”. Hãy chọn phím khác.`};
 return{ok:true,bindings:{...bindings,[action]:code}};
}
export function keyLabel(code){return String(code).replace(/^Key/,'').replace(/^Digit/,'').replace(/^Numpad/,'Num ').replace(/^Arrow(.*)$/,(_,d)=>({Up:'↑',Down:'↓',Left:'←',Right:'→'})[d]??d).replace(/^Shift(Left|Right)$/,'Shift').replace(/^Control(Left|Right)$/,'Ctrl').replace(/^Alt(Left|Right)$/,'Alt').replace('Escape','Esc').replace('Space','Space');}
