# Đảo Đèn Lồng — Phase 3

- Node.js 20+, ES modules. `npm ci`, `npm run build`, `npm start`.
- Verify with `npm run verify` (tests, deterministic replay, real CLI output, build).
- Contract source of truth: `game.contract.json`; browser and CLI import the same tuning and simulation.
- Simulation: fixed 60 Hz; tick 0 before gameplay; edge-triggered actions. Phase 2 pulse uses 3D distance; pickup/contact use XZ plus the specified height gate.
- Keep rendering, wall clocks, audio and unseeded randomness out of `src/core/`.
- Scenario setup never emits events or awards points. IDs must be deterministic.
- Invalid scenario/inputs must exit 2. Never hand-edit generated proof.
- Requirements and migration: `docs/notes/phase-3.md`, `docs/decisions/ADR-003-lantern-fuel-and-dawn.md`. Ticket-03 replaces permanent lamps, early victory and all old scores. Keep phase-1/phase-2 tags and proof unchanged.
- Runtime contract 1.2; fixed map/physics from Phase 2. Fuel uses integer 1/60 units: natural burn 1/tick, drain 5/tick/shade, no rounding until output. Burn/out precede interaction; restored safe zone precedes pulse/contact.
- No all_lit victory. At dawn require ceil(0.6×lamps), death always wins priority; durations 240/270/300. Capacity grows per actual successful light, never scenario setup/refuel.
- `npm run test:browser` runs Edge QA/FPS plus accessibility/fuel UI fixtures. `npm run verify` writes only phase-3 proof. Keep color settings out of simulation/headless.
- Phase 2 rules: natural shade spawning lasts 60 gameplay ticks, harmless, then wander; scenario shades default to wander without spawn delay. Night 2 starts [0,0,0], Night 3 [0,0,-15], both face +Z. Snapshot invuln is boolean; normal night_start event is tick 1, never setup tick 0.
- Before finishing changes, run verification; record failed checks honestly. A human reviewer should independently play the game.
- Keep this harness and evidence in Git. Do not create/push phase tags until actual checks are recorded; do not rewrite existing history.
