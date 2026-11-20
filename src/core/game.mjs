import { validateScenario } from './validate.mjs';

export const DT = 1 / 60;
export const ISLAND_RADIUS = 30;
const EPS = 1e-9;
export const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const round = n => Object.is(Math.round(n * 1000) / 1000, -0) ? 0 : Math.round(n * 1000) / 1000;
const vector = p => p.map(round);
export const defaultInput = () => ({ move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false });

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export class Game {
  constructor(tuning, { seed = 12, scenario = {} } = {}) {
    validateScenario(scenario, tuning);
    this.tuning = structuredClone(tuning);
    this.rng = seededRandom(seed);
    this.tick = 0;
    this.state = 'playing';
    this.score = 0;
    this.events = [];
    this.previousInput = defaultInput();
    this.initialTime = scenario.time_left_s ?? tuning.night1_duration_s;
    this.timeLeft = this.initialTime;
    this.player = { pos: [0, 0, 0], carried: 0, flames: tuning.flames, ...structuredClone(scenario.player ?? {}) };
    this.verticalSpeed = 0;
    this.invulnUntil = 0;
    this.pulseReady = 0;
    this.lastShadeID = 0;
    this.lastMoteID = 0;
    this.randomMotes = scenario.random_motes ?? true;
    this.randomShades = scenario.random_shades ?? true;
    this.lanterns = Array.from({ length: 5 }, (_, i) => {
      const angle = i * Math.PI * 2 / 5;
      return { id: `L${i + 1}`, pos: [Math.sin(angle) * 20, 0, Math.cos(angle) * 20], deposited: 0, lit: false };
    });
    for (const patch of scenario.lanterns ?? []) {
      const l = this.lanterns.find(l => l.id === patch.id);
      Object.assign(l, structuredClone(patch));
      if (l.lit || l.deposited === tuning.lantern_cost) { l.lit = true; l.deposited = tuning.lantern_cost; }
    }
    this.motes = [];
    if ('motes' in scenario) scenario.motes.forEach(p => this.addMote(p));
    else if (this.randomMotes) {
      // A readable trail from the starting clearing to each lantern, plus seeded scatter.
      for (let i = 0; i < 5; i++) {
        const a = i * Math.PI * 2 / 5;
        for (let j = 0; j < 14; j++) {
          const r = 4 + j * 1.12;
          this.addMote([Math.sin(a) * r + (this.rng() - 0.5) * 1.5, 0, Math.cos(a) * r + (this.rng() - 0.5) * 1.5]);
        }
      }
      for (let i = 0; i < 35; i++) this.addMote(this.randomPoint(25));
    }
    const reserved = new Set((scenario.shades ?? []).filter(s => s.id).map(s => s.id));
    this.shades = [];
    if ('shades' in scenario) {
      for (const s of scenario.shades) {
        let id = s.id;
        if (!id) { do { id = `S${++this.lastShadeID}`; } while (reserved.has(id)); }
        this.shades.push({ id, pos: [...s.pos], state: 'chase', stunnedUntil: 0 });
      }
    } else if (this.randomShades) {
      for (let i = 0; i < 3; i++) this.addShade(false);
    }
  }

  randomPoint(radius) {
    const a = this.rng() * Math.PI * 2, r = Math.sqrt(this.rng()) * radius;
    return [Math.sin(a) * r, 0, Math.cos(a) * r];
  }
  addMote(pos) { this.motes.push({ id: `M${++this.lastMoteID}`, pos: [...pos] }); }
  addShade(emit = true) {
    let id;
    do { id = `S${++this.lastShadeID}`; } while (this.shades.some(s => s.id === id));
    const angle = this.rng() * Math.PI * 2;
    const s = { id, pos: [Math.sin(angle) * 27, 0, Math.cos(angle) * 27], state: 'chase', stunnedUntil: 0 };
    this.shades.push(s);
    if (emit) this.emit('shade_spawned', { id });
  }
  emit(name, data) { this.events.push({ type: 'event', tick: this.tick, name, data }); }
  isSafe(pos) { return this.lanterns.some(l => l.lit && distance(l.pos, pos) <= this.tuning.safe_radius + EPS); }
  excludeSafeZones(pos) {
    // Project onto the outside of every lit safe circle (XZ only).
    let result = [...pos];
    for (let pass = 0; pass < 8; pass++) {
      let changed = false;
      for (const l of this.lanterns) {
        if (!l.lit) continue;
        const d = distance(result, l.pos), r = this.tuning.safe_radius;
        if (d <= r) {
          const dx = d > EPS ? (result[0] - l.pos[0]) / d : 1;
          const dz = d > EPS ? (result[2] - l.pos[2]) / d : 0;
          result[0] = l.pos[0] + dx * (r + 1e-6);
          result[2] = l.pos[2] + dz * (r + 1e-6);
          changed = true;
        }
      }
      if (!changed) break;
    }
    return result;
  }
  finish(result, reason) {
    this.state = result;
    if (result === 'won') {
      this.score += Math.floor(this.timeLeft + EPS) * this.tuning.score.per_second_left;
      this.score += this.player.flames * this.tuning.score.per_flame_left;
    }
    this.emit('game_over', { result, reason });
  }

  step(patch = {}) {
    if (this.state !== 'playing') return [];
    const input = { ...this.previousInput, ...patch };
    const rising = key => input[key] && !this.previousInput[key];
    this.events = [];
    this.tick++;
    this.timeLeft = Math.max(0, this.initialTime - this.tick / 60);
    const t = this.tuning, p = this.player;
    // Terminal scenario states become game events on the first step, never during setup.
    if (p.flames <= 0) this.finish('lost', 'no_flames');
    else if (this.lanterns.every(l => l.lit)) this.finish('won', 'all_lit');
    else if (this.initialTime <= 0) this.finish('lost', 'dawn');
    if (this.state !== 'playing') { this.previousInput = structuredClone(input); return this.events; }

    let [x, z] = input.move;
    const length = Math.hypot(x, z);
    if (length > 1) { x /= length; z /= length; }
    const yaw = (input.cam_yaw_deg % 360) * Math.PI / 180;
    p.pos[0] += (x * Math.cos(yaw) + z * Math.sin(yaw)) * t.player_speed * DT;
    p.pos[2] += (-x * Math.sin(yaw) + z * Math.cos(yaw)) * t.player_speed * DT;
    const radius = Math.hypot(p.pos[0], p.pos[2]);
    // Scenario positions outside the island remain valid; only outward motion is restricted.
    const oldRadius = Math.hypot(p.pos[0] - (x * Math.cos(yaw) + z * Math.sin(yaw)) * t.player_speed * DT,
      p.pos[2] - (-x * Math.sin(yaw) + z * Math.cos(yaw)) * t.player_speed * DT);
    const limit = Math.max(ISLAND_RADIUS, oldRadius);
    if (radius > limit) { p.pos[0] *= limit / radius; p.pos[2] *= limit / radius; }
    if (rising('jump') && p.pos[1] <= EPS) this.verticalSpeed = 6;
    if (p.pos[1] > 0 || this.verticalSpeed > 0) {
      p.pos[1] = Math.max(0, p.pos[1] + this.verticalSpeed * DT);
      this.verticalSpeed -= 18 * DT;
      if (p.pos[1] === 0) this.verticalSpeed = 0;
    }
    this.motes = this.motes.filter(m => {
      if (p.carried < t.carry_capacity && distance(p.pos, m.pos) <= t.pickup_radius + EPS) {
        p.carried++;
        this.score += t.score.per_mote;
        this.emit('mote_picked', { carried: p.carried });
        return false;
      }
      return true;
    });

    if (rising('interact') && p.carried > 0) {
      const nearby = this.lanterns.filter(l => !l.lit && distance(p.pos, l.pos) <= t.interact_radius + EPS)
        .sort((a, b) => distance(p.pos, a.pos) - distance(p.pos, b.pos) || a.id.localeCompare(b.id));
      const l = nearby[0];
      if (l) {
        const amount = Math.min(p.carried, t.lantern_cost - l.deposited);
        p.carried -= amount; l.deposited += amount;
        this.emit('deposit', { lantern_id: l.id, amount, deposited: l.deposited });
        if (l.deposited >= t.lantern_cost) {
          l.lit = true;
          this.score += t.score.per_lantern;
          this.emit('lantern_lit', { lantern_id: l.id });
        }
      }
    }

    if (rising('pulse') && p.carried >= t.pulse_cost && this.tick >= this.pulseReady) {
      p.carried -= t.pulse_cost;
      this.pulseReady = this.tick + Math.round(t.pulse_cooldown_s * 60);
      const stunned_ids = [];
      for (const s of this.shades) {
        const d = distance(p.pos, s.pos);
        if (d <= t.pulse_radius + EPS) {
          s.state = 'stunned'; s.stunnedUntil = this.tick + Math.round(t.pulse_stun_s * 60);
          const dx = d > EPS ? (s.pos[0] - p.pos[0]) / d : 1;
          const dz = d > EPS ? (s.pos[2] - p.pos[2]) / d : 0;
          s.pos[0] += dx * t.pulse_push_m; s.pos[2] += dz * t.pulse_push_m;
          stunned_ids.push(s.id);
          this.score += t.score.per_stun;
        }
      }
      this.emit('pulse', { stunned_ids });
    }
    for (const s of this.shades) {
      s.pos = this.excludeSafeZones(s.pos);
      if (s.state === 'stunned' && this.tick < s.stunnedUntil) continue;
      s.state = 'chase';
      const d = distance(s.pos, p.pos);
      if (d > EPS) {
        const amount = Math.min(d, t.shade_speed * DT);
        s.pos = this.excludeSafeZones([s.pos[0] + (p.pos[0] - s.pos[0]) / d * amount, s.pos[1], s.pos[2] + (p.pos[2] - s.pos[2]) / d * amount]);
      }
      if (!this.isSafe(p.pos) && distance(p.pos, s.pos) <= t.shade_hit_radius + EPS && this.tick >= this.invulnUntil) {
        p.flames = Math.max(0, p.flames - 1);
        const dropped = Math.floor(p.carried * t.hit_drop_ratio);
        p.carried -= dropped;
        for (let i = 0; i < dropped; i++) this.addMote(p.pos);
        this.invulnUntil = this.tick + Math.round(t.invuln_s * 60);
        this.emit('player_hit', { by: 'shade', flames: p.flames, dropped });
      }
    }
    // Death has priority over simultaneous victory; victory has priority over dawn.
    if (p.flames <= 0) this.finish('lost', 'no_flames');
    else if (this.lanterns.every(l => l.lit)) this.finish('won', 'all_lit');
    else if (this.timeLeft <= EPS) this.finish('lost', 'dawn');
    if (this.state === 'playing') {
      if (this.randomShades && this.tick % 900 === 0 && this.shades.length < 8) this.addShade();
      if (this.randomMotes && this.tick % 120 === 0 && this.motes.length < 105) this.addMote(this.randomPoint(26));
    }
    this.previousInput = structuredClone(input);
    return this.events;
  }

  snapshot() {
    return { type: 'snapshot', tick: this.tick, sim_tick: this.tick, state: this.state,
      time_left_s: round(this.timeLeft), score: this.score,
      player: { pos: vector(this.player.pos), flames: this.player.flames, carried: this.player.carried },
      lanterns: this.lanterns.map(l => ({ id: l.id, pos: vector(l.pos), lit: l.lit, deposited: l.deposited })),
      shades: this.shades.map(s => ({ id: s.id, pos: vector(s.pos), state: s.state })),
      motes_active: this.motes.length, motes: this.motes.map(m => ({ id: m.id, pos: vector(m.pos) })) };
  }
  end() { return { type: 'end', ticks: this.tick, state: this.state, score: this.score }; }
}
