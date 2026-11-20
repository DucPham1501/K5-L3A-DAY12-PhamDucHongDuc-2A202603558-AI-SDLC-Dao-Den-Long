# Đảo Đèn Lồng — Phase 2

- Node.js 20+, ES modules. `npm ci`, `npm run build`, `npm start`.
- Verify with `npm run verify` (tests, deterministic replay, real CLI output, build).
- Contract source of truth: `game.contract.json`; browser and CLI import the same tuning and simulation.
- Simulation: fixed 60 Hz; tick 0 before gameplay; edge-triggered actions. Phase 2 pulse uses 3D distance; pickup/contact use XZ plus the specified height gate.
- Keep rendering, wall clocks, audio and unseeded randomness out of `src/core/`.
- Scenario setup never emits events or awards points. IDs must be deterministic.
- Invalid scenario/inputs must exit 2. Never hand-edit generated proof.
- Requirements and tie-breaking assumptions: `docs/notes/phase-2.md`. Ticket-02 replaces conflicting Phase 1 assumptions; Phase 1 is preserved at tag `phase-1`.
- Runtime contract 1.1; nights 1/2/3; enforce tick order, fixed spawn points, standard tuning and palette. Paused ticks still advance tick, never sim_tick or gameplay timers.
- `npm run test:browser` runs real Edge QA and 1280x720 FPS measurement (BROWSER_PATH supports Chromium elsewhere). `npm run verify` writes only phase-2 proof; never overwrite phase-1 evidence.
- Phase 2 rules: natural shade spawning lasts 60 gameplay ticks, harmless, then wander; scenario shades default to wander without spawn delay. Night 2 starts [0,0,0], Night 3 [0,0,-15], both face +Z. Snapshot invuln is boolean; normal night_start event is tick 1, never setup tick 0.
- Before finishing changes, run verification; record failed checks honestly. A human reviewer should independently play the game.
- Keep this harness and evidence in Git. Do not create/push phase tags until actual checks are recorded; do not rewrite existing history.
