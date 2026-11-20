export class DataError extends Error {}
const fail = message => { throw new DataError(message); };
const object = (v, at) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(`${at}: expected object`);
};
const number = (v, at, min = -Infinity, max = Infinity, integer = false) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isSafeInteger(v)))
    fail(`${at}: invalid number`);
};
const bool = (v, at) => { if (typeof v !== 'boolean') fail(`${at}: expected boolean`); };
const keys = (v, allowed, at) => {
  for (const k of Object.keys(v)) if (!allowed.includes(k)) fail(`${at}.${k}: unknown field`);
};
const pos = (v, at) => {
  if (!Array.isArray(v) || v.length !== 3) fail(`${at}: expected [x,y,z]`);
  v.forEach((n, i) => number(n, `${at}[${i}]`, -1e6, 1e6));
};

export function validateInputs(data) {
  object(data, 'inputs'); keys(data, ['frames'], 'inputs');
  if (!Array.isArray(data.frames)) fail('inputs.frames: expected array');
  let last = -1;
  for (const f of data.frames) {
    object(f, 'frame'); keys(f, ['tick', 'move', 'cam_yaw_deg', 'jump', 'interact', 'pulse', 'dash'], 'frame');
    number(f.tick, 'frame.tick', 0, Number.MAX_SAFE_INTEGER, true);
    if (f.tick <= last) fail('frame ticks must be strictly increasing');
    last = f.tick;
    if ('move' in f) {
      if (!Array.isArray(f.move) || f.move.length !== 2) fail('move: expected [x,z]');
      f.move.forEach(n => number(n, 'move', -1, 1));
    }
    if ('cam_yaw_deg' in f) number(f.cam_yaw_deg, 'cam_yaw_deg');
    for (const k of ['jump', 'interact', 'pulse', 'dash']) if (k in f) bool(f[k], k);
  }
  return data;
}

export function validateScenario(data, tuning) {
  object(data, 'scenario');
  keys(data, ['player', 'random_motes', 'random_shades', 'motes', 'shades', 'lanterns', 'time_left_s'], 'scenario');
  if ('player' in data) {
    object(data.player, 'player'); keys(data.player, ['pos', 'carried', 'flames'], 'player');
    if ('pos' in data.player) pos(data.player.pos, 'player.pos');
    if ('carried' in data.player) number(data.player.carried, 'carried', 0, tuning.carry_capacity, true);
    if ('flames' in data.player) number(data.player.flames, 'flames', 0, Number.MAX_SAFE_INTEGER, true);
  }
  for (const k of ['random_motes', 'random_shades']) if (k in data) bool(data[k], k);
  if ('time_left_s' in data) number(data.time_left_s, 'time_left_s', 0, 1e9);
  for (const k of ['motes', 'shades', 'lanterns']) if (k in data && !Array.isArray(data[k])) fail(`${k}: expected array`);
  data.motes?.forEach((p, i) => pos(p, `motes[${i}]`));
  const shadeIDs = new Set();
  data.shades?.forEach((s, i) => {
    object(s, `shades[${i}]`); keys(s, ['pos', 'id'], 'shade'); pos(s.pos, 'shade.pos');
    if ('id' in s) {
      if (typeof s.id !== 'string' || !s.id.length || shadeIDs.has(s.id)) fail('shade.id: invalid or duplicate');
      shadeIDs.add(s.id);
    }
  });
  const lanternIDs = new Set();
  data.lanterns?.forEach(l => {
    object(l, 'lantern'); keys(l, ['id', 'pos', 'deposited', 'lit'], 'lantern');
    if (!/^L[1-5]$/.test(l.id) || lanternIDs.has(l.id)) fail('lantern.id: expected unique L1…L5');
    lanternIDs.add(l.id);
    if ('pos' in l) pos(l.pos, 'lantern.pos');
    if ('deposited' in l) number(l.deposited, 'deposited', 0, tuning.lantern_cost, true);
    if ('lit' in l) bool(l.lit, 'lit');
  });
  return data;
}
