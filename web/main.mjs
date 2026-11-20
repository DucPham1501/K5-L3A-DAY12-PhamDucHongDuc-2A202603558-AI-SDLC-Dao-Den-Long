import * as THREE from 'three';
import { Game, DT, ISLAND_RADIUS, distance, seededRandom } from '../src/core/game.mjs';

const $ = id => document.getElementById(id);
const contractResponse = await fetch('/game.contract.json');
if (!contractResponse.ok) throw new Error('Không tải được game.contract.json');
const { tuning } = await contractResponse.json();
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch {
  const message = document.createElement('section'); message.className = 'error';
  message.innerHTML = '<h1>Chưa mở được thế giới 3D</h1><p>Game cần WebGL 2. Hãy bật tăng tốc phần cứng trong trình duyệt rồi tải lại trang. Chế độ headless vẫn chạy được bằng Node.js.</p>';
  document.body.append(message);
  throw new Error('WebGL 2 unavailable');
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
$('game').append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d1529');
scene.fog = new THREE.FogExp2('#182339', 0.011);
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 240);
const hemi = new THREE.HemisphereLight('#aec9ea', '#243b3b', 1.15); scene.add(hemi);
const moon = new THREE.DirectionalLight('#b4c9f4', 1.15); moon.position.set(-18, 36, -12);
moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024);
Object.assign(moon.shadow.camera, { left: -35, right: 35, top: 35, bottom: -35, near: 1, far: 100 });
moon.shadow.bias = -0.001; scene.add(moon);
const rng = seededRandom(981);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
const materials = { grass: mat('#25443c'), rock: mat('#253747'), path: mat('#6b7d71'), wood: mat('#6e4f39'), gold: mat('#ffcf80', { emissive: '#ed9d35', emissiveIntensity: 0.7 }), dark: mat('#202036'), leaf: mat('#294f4b') };
function mesh(geometry, material, parent = scene, position = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material); m.position.set(...position); parent.add(m); return m;
}
function cylinder(parent, radiusTop, radiusBottom, height, material, pos, segments = 12) {
  return mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material, parent, pos);
}
function sphere(parent, radius, material, pos, scale = [1, 1, 1]) {
  const m = mesh(new THREE.IcosahedronGeometry(radius, 1), material, parent, pos); m.scale.set(...scale); return m;
}
function ring(parent, radius, color, y, opacity = 0.5) {
  const m = mesh(new THREE.RingGeometry(radius - 0.045, radius + 0.045, 80), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }), parent, [0, y, 0]);
  m.rotation.x = -Math.PI / 2; return m;
}
// Entire world uses original procedural geometry; decorative randomness never touches gameplay.
const island = cylinder(scene, 30, 27.5, 2.4, materials.rock, [0, -1.25, 0], 80); island.receiveShadow = true;
const ground = cylinder(scene, 30, 30, 0.25, materials.grass, [0, -0.16, 0], 96); ground.receiveShadow = true;
cylinder(scene, 24, 8, 8, mat('#1e2b3d'), [0, -6.2, 0], 16);
ring(scene, 29.6, '#9db7a0', 0.01, 0.18);
const center = cylinder(scene, 3.2, 3.2, 0.06, mat('#6b8172'), [0, 0.01, 0], 40); center.receiveShadow = true;
ring(scene, 2.7, '#e0c68d', 0.05, 0.3);
for (let arm = 0; arm < 5; arm++) {
  const a = arm * Math.PI * 2 / 5;
  for (let j = 0; j < 15; j++) {
    const r = 4 + j * 1.06;
    const p = sphere(scene, .43 + rng() * .15, materials.path, [Math.sin(a) * r, -0.03, Math.cos(a) * r], [1.3, .16, 1]);
    p.rotation.y = rng() * 3; p.receiveShadow = true;
  }
}
for (let i = 0; i < 85; i++) {
  const a = rng() * Math.PI * 2, r = 23 + rng() * 6;
  const x = Math.sin(a) * r, z = Math.cos(a) * r;
  if (i % 4 === 0) {
    const tree = new THREE.Group(); tree.position.set(x, 0, z); scene.add(tree);
    cylinder(tree, .14, .25, 2.8, materials.wood, [0, 1.3, 0], 6);
    for (let j = 0; j < 3; j++) {
      const crown = mesh(new THREE.ConeGeometry(1.5 - j * .3, 2.3, 7), materials.leaf, tree, [0, 2.4 + j * .85, 0]); crown.castShadow = true;
    }
    tree.scale.setScalar(.8 + rng() * .5);
  } else {
    sphere(scene, .35 + rng() * .7, materials.rock, [x, 0.1, z], [1, .7 + rng(), 1]);
  }
}
for (let i = 0; i < 180; i++) {
  const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * 28;
  const tuft = mesh(new THREE.ConeGeometry(.09, .35 + rng() * .3, 3), mat(i % 3 ? '#527768' : '#899a70'), scene, [Math.sin(a) * r, .15, Math.cos(a) * r]);
  tuft.rotation.z = rng() * .5;
}
// Cloud sea and stars.
const cloudMaterial = new THREE.MeshLambertMaterial({ color: '#62758b', transparent: true, opacity: .22, depthWrite: false });
const clouds = [];
for (let i = 0; i < 60; i++) {
  const a = rng() * Math.PI * 2, r = 33 + rng() * 55;
  const c = sphere(scene, 5 + rng() * 6, cloudMaterial, [Math.sin(a) * r, -6 - rng() * 6, Math.cos(a) * r], [1.8, .35, 1]); clouds.push(c);
}
const starPositions = [];
for (let i = 0; i < 550; i++) starPositions.push((rng() - .5) * 220, 35 + rng() * 70, (rng() - .5) * 220);
const starGeometry = new THREE.BufferGeometry(); starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: '#d8e2fa', size: .13, transparent: true, opacity: .75 })));
const moonOrb = mesh(new THREE.SphereGeometry(4, 24, 16), new THREE.MeshBasicMaterial({ color: '#eee3c3' }), scene, [-48, 47, -75]);

const playerGroup = new THREE.Group(); scene.add(playerGroup);
const model = new THREE.Group(); playerGroup.add(model);
const robe = mesh(new THREE.ConeGeometry(.36, .85, 9), mat('#d28056'), model, [0, .67, 0]);
for (const x of [-.31, .31]) {
  const arm = cylinder(model, .075, .085, .45, mat('#cf8762'), [x, .83, .02], 7);
  arm.rotation.z = x > 0 ? -.15 : .15;
  sphere(model, .08, mat('#ebc19b'), [x*1.1, .61, .03]);
}
const head = sphere(model, .25, mat('#ebc19b'), [0, 1.29, 0]);
const hat = mesh(new THREE.ConeGeometry(.67, .34, 24), mat('#d8be84'), model, [0, 1.59, 0]); hat.castShadow = true;
cylinder(model, .65, .65, .035, mat('#b89a61'), [0, 1.43, 0], 24);
const legs = [];
for (const x of [-.15, .15]) {
  const leg = cylinder(model, .085, .09, .38, mat('#263b44'), [x, .19, 0], 7); legs.push(leg);
  sphere(model, .12, mat('#705143'), [x, .06, .06], [1, .55, 1.5]);
}
const heldLantern = new THREE.Group(); heldLantern.position.set(.5, .76, .13); model.add(heldLantern);
cylinder(heldLantern, .13, .13, .25, materials.gold, [0, 0, 0], 8);
cylinder(heldLantern, .14, .14, .035, materials.wood, [0, .15, 0], 8);
const playerLight = new THREE.PointLight('#ffbc67', 8, 9, 2); playerLight.position.set(0, 1.1, 0); playerGroup.add(playerLight);
const playerShadow = mesh(new THREE.CircleGeometry(.42, 24), new THREE.MeshBasicMaterial({ color: '#07121c', transparent: true, opacity: .32, depthWrite: false }), scene);
playerShadow.rotation.x = -Math.PI / 2;

const lanternMeshes = new Map(), moteMeshes = new Map(), shadeMeshes = new Map();
const moteGeometry = new THREE.IcosahedronGeometry(.105, 1);
const moteMaterial = new THREE.MeshBasicMaterial({ color: '#ffdc86' });
const haloMaterial = new THREE.MeshBasicMaterial({ color: '#ffc860', transparent: true, opacity: .08, depthWrite: false });
function makeLantern(l) {
  const group = new THREE.Group(); scene.add(group); group.position.set(...l.pos);
  cylinder(group, 1.1, 1.25, .15, materials.rock, [0, .075, 0], 16);
  cylinder(group, .13, .18, 2.5, materials.wood, [0, 1.25, 0]);
  const crossbar = mesh(new THREE.BoxGeometry(1.3, .13, .15), materials.wood, group, [.4, 2.55, 0]);
  const bodyMaterial = mat('#626b61', { emissive: '#ffad43', emissiveIntensity: .03 });
  const lamp = cylinder(group, .4, .4, .85, bodyMaterial, [.78, 1.98, 0], 12);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    cylinder(group, .018, .018, .88, materials.wood, [.78 + Math.cos(a) * .405, 1.98, Math.sin(a) * .405], 4);
  }
  cylinder(group, .49, .49, .10, materials.wood, [.78, 2.44, 0], 12);
  cylinder(group, .44, .44, .10, materials.wood, [.78, 1.53, 0], 12);
  const light = new THREE.PointLight('#ffbe65', 0, 18, 2); light.position.set(.78, 2.1, 0); group.add(light);
  const safe = mesh(new THREE.CircleGeometry(tuning.safe_radius, 64), new THREE.MeshBasicMaterial({ color: '#ffc875', transparent: true, opacity: 0, depthWrite: false }), group, [0, .015, 0]); safe.rotation.x = -Math.PI / 2;
  const edge = ring(group, tuning.safe_radius, '#ffcd78', .025, 0);
  return { group, bodyMaterial, light, safe, edge, crossbar, lamp, lit: false };
}
function makeShade(s) {
  const group = new THREE.Group(); scene.add(group);
  const material = mat('#242039', { emissive: '#4d2764', emissiveIntensity: .3 });
  sphere(group, .57, material, [0, .8, 0], [1, 1.2, 1]);
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: '#d1a6fa' });
  sphere(group, .065, eyeMaterial, [-.17, 1, .48]); sphere(group, .065, eyeMaterial, [.17, 1, .48]);
  for (let i = 0; i < 5; i++) sphere(group, .17, material, [(i - 2) * .19, .3, 0], [1, 1.6, 1]);
  return { group, material };
}

let game = new Game(tuning), started = false, paused = true, yaw = 0;
let accumulator = 0, last = performance.now(), elapsed = 0, nextHUD = 0, toastUntil = 0, facing = 0;
let dragging = false, dragX = 0, overlayMode = 'start';
const keys = new Set(), pulseRings = [];
const mini = $('minimap').getContext('2d');
const cameraTarget = new THREE.Vector3();
const cameraDesired = new THREE.Vector3();
let audio;
function chime(won = false) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    [523, 659, 784, ...(won ? [1046] : [])].forEach((frequency, i) => {
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      const time = audio.currentTime + i * .13;
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(.045, time + .02); gain.gain.exponentialRampToValueAtTime(.0001, time + .7);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(time); oscillator.stop(time + .75);
    });
  } catch { /* Audio is optional; simulation remains unchanged. */ }
}
function toast(text) { $('toast').textContent = text; $('toast').classList.add('visible'); toastUntil = performance.now() + 2600; }
function pulseVisual() {
  const group = new THREE.Group(); group.position.set(game.player.pos[0], .06, game.player.pos[2]); scene.add(group);
  const r = ring(group, 1, '#ffe0a0', 0, .9); pulseRings.push({ group, ring: r, age: 0 });
}
function handleEvents(events) {
  for (const e of events) {
    if (e.name === 'lantern_lit') { chime(); toast('Một ngọn đèn đã sáng. Đảo Bến ấm hơn một chút.'); }
    if (e.name === 'deposit' && !events.some(e => e.name === 'lantern_lit')) toast(`Đã nạp ${e.data.amount} đom đóm. Đèn còn cần ${tuning.lantern_cost - e.data.deposited}.`);
    if (e.name === 'pulse') { pulseVisual(); if (e.data.stunned_ids.length) toast('Ánh sáng đã xua Bóng Mực!'); }
    if (e.name === 'player_hit') toast('Bóng Mực chạm vào Mây! Tìm nơi sáng hoặc nhấn Q.');
    if (e.name === 'game_over') showEnd();
  }
}
function updateHUD() {
  const p = game.player, lit = game.lanterns.filter(l => l.lit).length;
  $('carried').textContent = p.carried; $('carry-meter').style.width = `${p.carried / tuning.carry_capacity * 100}%`;
  $('score').textContent = String(game.score).padStart(4, '0');
  $('health').innerHTML = Array.from({ length: tuning.flames }, (_, i) => `<span class="${i < p.flames ? '' : 'empty'}">✦</span>`).join(' ');
  $('clock').textContent = `${String(Math.floor(Math.ceil(game.timeLeft) / 60)).padStart(2, '0')}:${String(Math.ceil(game.timeLeft) % 60).padStart(2, '0')}`;
  $('clock').style.color = game.timeLeft < 45 ? '#f1a4a2' : '';
  $('lit-count').textContent = `${lit} / 5 đèn đã sáng`;
  $('lantern-progress').innerHTML = game.lanterns.map(l => `<span class="lantern-token ${l.lit ? 'lit' : ''}" title="${l.id}: ${l.deposited}/${tuning.lantern_cost}">♧</span>`).join('');
  const cooldown = Math.max(0, (game.pulseReady - game.tick) / 60);
  $('pulse-button').classList.toggle('ready', p.carried >= tuning.pulse_cost && cooldown === 0);
  $('pulse-status').textContent = cooldown > 0 ? `Hồi sáng ${cooldown.toFixed(1)}s` : p.carried >= tuning.pulse_cost ? 'Sẵn sàng · tốn 3 đom đóm' : 'Cần 3 đom đóm';
  const l = game.lanterns.filter(l => !l.lit && distance(p.pos, l.pos) <= tuning.interact_radius).sort((a,b) => distance(p.pos,a.pos)-distance(p.pos,b.pos))[0];
  $('interaction').hidden = !l || paused;
  if (l) $('interaction').lastElementChild.textContent = p.carried ? `Nạp ${Math.min(p.carried, tuning.lantern_cost-l.deposited)} đom đóm · ${l.id}` : `${l.id} còn cần ${tuning.lantern_cost-l.deposited} đom đóm`;
  drawMap();
}
function drawMap() {
  const c = mini; c.clearRect(0, 0, 200, 200);
  const xy = p => [100 + p[0] * 2.8, 100 + p[2] * 2.8];
  c.fillStyle = '#1b343c'; c.beginPath(); c.arc(100, 100, 84, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#75948944'; c.lineWidth = 1; c.stroke();
  c.strokeStyle = '#b0c4be18'; c.beginPath(); c.moveTo(15,100); c.lineTo(185,100); c.moveTo(100,15); c.lineTo(100,185); c.stroke();
  c.fillStyle = '#d2bf8066'; for (const m of game.motes) { const [x,y] = xy(m.pos); c.fillRect(x,y,1.4,1.4); }
  for (const l of game.lanterns) {
    const [x,y] = xy(l.pos); c.fillStyle = l.lit ? '#ffd18c22' : '#0000'; c.beginPath(); c.arc(x,y,tuning.safe_radius*2.8,0,7); c.fill();
    c.fillStyle = l.lit ? '#ffda91' : '#8e979b'; c.save(); c.translate(x,y); c.rotate(Math.PI/4); c.fillRect(-3.5,-3.5,7,7); c.restore();
  }
  c.fillStyle = '#b09ae9'; for (const s of game.shades) { const [x,y] = xy(s.pos); c.beginPath(); c.arc(x,y,2.7,0,7); c.fill(); }
  const [x,y] = xy(game.player.pos); c.fillStyle = '#f0f4f1'; c.beginPath(); c.arc(x,y,4,0,7); c.fill();
  c.strokeStyle = '#ffffff88'; c.beginPath(); c.moveTo(x,y); c.lineTo(x-Math.sin(yaw*Math.PI/180)*11,y-Math.cos(yaw*Math.PI/180)*11); c.stroke();
}
function setOverlay(mode, title, copy, button) {
  overlayMode = mode; paused = true; keys.clear(); $('overlay').hidden = false;
  $('modal-title').innerHTML = title; $('modal-copy').textContent = copy;
  $('primary-button').innerHTML = `${button}<span>✦</span>`;
  $('modal-details').hidden = mode === 'end';
  $('interaction').hidden = true;
}
function showEnd() {
  const won = game.state === 'won'; if (won) chime(true);
  $('modal-kicker').textContent = won ? 'BÌNH YÊN ĐÃ TRỞ VỀ' : 'HẸN GẶP LẠI, NGƯỜI GIỮ ĐÈN';
  setOverlay('end', won ? 'Năm ngọn đèn.<br>Một hòn đảo thức giấc.' : 'Một đốm sáng nhỏ<br>vẫn chờ Mây trở lại.',
    `${won ? 'Bạn đã thắp sáng Đảo Bến!' : game.player.flames === 0 ? 'Mây đã cạn ngọn lửa. Hãy tận dụng vùng an toàn quanh đèn.' : 'Bình minh đã tới trước khi thắp đủ đèn.'} Điểm: ${game.score} · Đèn: ${game.lanterns.filter(l=>l.lit).length}/5.`, 'Chơi lại Đêm 1');
}
function clearDynamic() {
  const sharedMaterials = new Set([...Object.values(materials), moteMaterial, haloMaterial]);
  for (const map of [moteMeshes, shadeMeshes, lanternMeshes]) {
    for (const item of map.values()) {
      const object = item.group ?? item; scene.remove(object);
      object.traverse(child => {
        if (child.geometry && child.geometry !== moteGeometry) child.geometry.dispose();
        if (child.material && !sharedMaterials.has(child.material)) child.material.dispose();
      });
    }
    map.clear();
  }
  for (const item of pulseRings) { scene.remove(item.group); item.ring.geometry.dispose(); item.ring.material.dispose(); } pulseRings.length = 0;
}
function reset() {
  clearDynamic(); game = new Game(tuning, { seed: 12 }); accumulator = 0; facing = 0; yaw = 0;
  playerGroup.position.set(0,0,0); camera.position.set(0,10,14); updateHUD();
}
$('primary-button').addEventListener('click', () => {
  if (overlayMode === 'end') reset();
  started = true; paused = false; accumulator = 0; last = performance.now(); $('overlay').hidden = true;
  if (overlayMode === 'start') toast('Đi theo đom đóm vàng. Đến gần đèn và nhấn E.');
});
function pause(help = false) {
  if (!started || game.state !== 'playing') return;
  if (paused) { paused = false; $('overlay').hidden = true; accumulator = 0; return; }
  $('modal-kicker').textContent = help ? 'SỔ TAY NGƯỜI GIỮ ĐÈN' : 'NGHỈ CHÂN MỘT CHÚT';
  setOverlay('pause', help ? 'Giữ lấy ánh sáng.' : 'Biển mây đang đợi.', 'Mỗi đèn cần 10 đom đóm. Mây mang tối đa 20. Tỏa sáng tốn 3 đom đóm; đèn đã sáng tạo vùng an toàn. Thắp đủ 5 đèn trước bình minh.', 'Tiếp tục hành trình');
}
$('pause-button').onclick = () => pause(); $('help-button').onclick = () => pause(true);
$('pulse-button').onclick = () => {
  if (paused || game.state !== 'playing') return;
  if (game.player.carried < tuning.pulse_cost) toast('Cần ít nhất 3 đom đóm để tỏa sáng.');
  queuedPulse = true;
};
let queuedPulse = false;
const relevant = ['KeyW','KeyA','KeyS','KeyD','Space','KeyE','KeyQ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'];
window.addEventListener('keydown', e => {
  if (relevant.includes(e.code)) e.preventDefault();
  if (e.code === 'Escape' && !e.repeat) pause();
  if (e.code === 'KeyH' && !e.repeat) pause(true);
  if (!paused) keys.add(e.code);
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); if (started && !paused && game.state === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && started && !paused && game.state === 'playing') pause(); });
renderer.domElement.addEventListener('pointerdown', e => { dragging = true; dragX = e.clientX; renderer.domElement.setPointerCapture(e.pointerId); });
renderer.domElement.addEventListener('pointermove', e => { if (dragging && !paused) { yaw -= (e.clientX - dragX) * .3; dragX = e.clientX; } });
renderer.domElement.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

function renderWorld(delta) {
  const p = game.player, litCount = game.lanterns.filter(l => l.lit).length;
  hemi.intensity = 1.15 + litCount * .18;
  playerGroup.position.set(...p.pos); model.rotation.y = facing;
  const moving = !paused && (keys.has('KeyW') || keys.has('KeyS') || keys.has('KeyA') || keys.has('KeyD'));
  legs.forEach((leg,i) => { leg.rotation.x = moving ? Math.sin(elapsed * 13 + i * Math.PI) * .65 : 0; });
  heldLantern.rotation.z = Math.sin(elapsed * (moving ? 9 : 2)) * (moving ? .14 : .04);
  robe.rotation.z = moving ? Math.sin(elapsed*13)*.025 : 0;
  model.visible = !(game.tick < game.invulnUntil && Math.floor(elapsed * 12) % 2);
  playerShadow.position.set(p.pos[0], .025, p.pos[2]); playerShadow.scale.setScalar(1 / (1 + p.pos[1] * .3));
  for (const l of game.lanterns) {
    if (!lanternMeshes.has(l.id)) lanternMeshes.set(l.id, makeLantern(l));
    const visual = lanternMeshes.get(l.id);
    visual.bodyMaterial.emissiveIntensity = THREE.MathUtils.damp(visual.bodyMaterial.emissiveIntensity, l.lit ? 2.3 : .04 + l.deposited / tuning.lantern_cost * .6, 4, delta);
    visual.light.intensity = THREE.MathUtils.damp(visual.light.intensity, l.lit ? 38 : 0, 2.5, delta);
    visual.safe.material.opacity = THREE.MathUtils.damp(visual.safe.material.opacity, l.lit ? .075 : 0, 2, delta);
    visual.edge.material.opacity = THREE.MathUtils.damp(visual.edge.material.opacity, l.lit ? .35 : 0, 2, delta);
  }
  const activeMotes = new Set(game.motes.map(m=>m.id));
  for (const [id, m] of moteMeshes) if (!activeMotes.has(id)) { scene.remove(m); moteMeshes.delete(id); }
  for (const m of game.motes) {
    if (!moteMeshes.has(m.id)) {
      const group = new THREE.Group(); scene.add(group);
      mesh(moteGeometry, moteMaterial, group);
      mesh(moteGeometry, haloMaterial, group).scale.setScalar(4);
      moteMeshes.set(m.id, group);
    }
    const visual = moteMeshes.get(m.id), phase = Number(m.id.slice(1)) * 2.37;
    visual.position.set(m.pos[0] + Math.sin(elapsed*1.5+phase)*.12, m.pos[1] + .65 + Math.sin(elapsed*2+phase)*.22, m.pos[2]);
  }
  for (const s of game.shades) {
    if (!shadeMeshes.has(s.id)) shadeMeshes.set(s.id, makeShade(s));
    const visual = shadeMeshes.get(s.id);
    visual.group.position.set(s.pos[0], s.pos[1] + Math.sin(elapsed*3+s.id.length)*.1, s.pos[2]);
    visual.group.rotation.y = Math.atan2(p.pos[0]-s.pos[0],p.pos[2]-s.pos[2]);
    visual.material.emissive.set(s.state === 'stunned' ? '#aa955f' : '#4d2764');
    visual.group.rotation.z = s.state === 'stunned' ? Math.sin(elapsed*16)*.15 : 0;
  }
  for (let i = pulseRings.length-1; i>=0; i--) {
    const pulse = pulseRings[i]; pulse.age += delta; pulse.group.scale.setScalar(.3+pulse.age*tuning.pulse_radius*2);
    pulse.ring.material.opacity = Math.max(0, 1-pulse.age*1.7);
    if (pulse.age > .6) { scene.remove(pulse.group); pulse.ring.geometry.dispose(); pulse.ring.material.dispose(); pulseRings.splice(i,1); }
  }
  const r = yaw * Math.PI/180;
  cameraTarget.set(p.pos[0], p.pos[1] + 1, p.pos[2]);
  cameraDesired.set(p.pos[0]+Math.sin(r)*11.5, p.pos[1]+9, p.pos[2]+Math.cos(r)*11.5);
  camera.position.lerp(cameraDesired, 1-Math.exp(-delta*6)); camera.lookAt(cameraTarget);
  clouds.forEach((c,i) => { c.position.y += Math.sin(elapsed*.12+i)*delta*.025; });
  renderer.render(scene,camera);
}
function animate(now) {
  requestAnimationFrame(animate);
  const delta = Math.min((now-last)/1000,.1); last = now; elapsed += delta;
  if (!paused && game.state === 'playing') {
    accumulator += delta;
    if (keys.has('ArrowLeft')) yaw += delta*85;
    if (keys.has('ArrowRight')) yaw -= delta*85;
    while (accumulator >= DT && !paused) {
      const move = [(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0), (keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)];
      if (move[0] || move[1]) { const a = yaw*Math.PI/180; facing = Math.atan2(move[0]*Math.cos(a)+move[1]*Math.sin(a),-move[0]*Math.sin(a)+move[1]*Math.cos(a)); }
      handleEvents(game.step({ move, cam_yaw_deg: yaw, jump: keys.has('Space'), interact: keys.has('KeyE'), pulse: keys.has('KeyQ') || queuedPulse }));
      queuedPulse = false; accumulator -= DT;
    }
  }
  if (now > nextHUD) { updateHUD(); nextHUD = now+100; }
  if (now > toastUntil) $('toast').classList.remove('visible');
  renderWorld(delta);
}
camera.position.set(0,10,14); updateHUD(); requestAnimationFrame(animate);
// Read-only diagnostics for manual QA; mutations still go through the shared simulation.
window.lanternGame = { snapshot: () => game.snapshot(), rendererInfo: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }), get paused() { return paused; } };
