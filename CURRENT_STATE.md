# Current state — 2026-10-20

Version: 0.1.0 local alpha in active implementation. **Not PLAYABLE_RC.**

## Implemented checkpoint
- Pinned TypeScript workspaces; Phaser 3.90 client, Colyseus 0.16 authoritative server, Vite build, Ajv content loader, Vitest and Playwright.
- Server-backed 1–4 player private lobby; invitation secret, per-player session token, server-only command execution, AP action queues and readiness.
- Headless seeded engine: movement, LOS/pathfinding, basic combat, inventory, effects, environmental queue, progression, floor objectives, boss telegraphs, saferoom actions and run endings. These systems still require full integration/balance verification.
- Authored JSON content loaded; named trait/compiler tables. Compilation coverage is not proof every behavior is complete.
- Six-floor room-template generator and connectivity checks; functional canvas map and DOM controls.
- Atomic checksummed checkpoints with three backups, corrupt-file preservation and recovery; session plans/nonces retained.

## Evidence at this checkpoint
- `npm run validate:content`: 448 entries validated with Ajv and reference checks.
- `npm test`: 244 tests passed (includes 600 floor-generation seeds). Initial save/hash regression corrected.
- `npm run build`: TypeScript check and production client/server build passed.
- `npm run e2e`: 2 tests passed using system Chromium, including two independent browser contexts in one real Colyseus lobby and confirmed movement; settings tested at 1280×720 and 1920×1080.
- Python content validator passed before implementation.

## Remaining milestone work
- M0 lobby gate demonstrated. M1/M2 core and generator exist; extend deterministic replay, system scenarios and validation.
- M3: verify actual effect/trait behaviors and event emitters, not only compiler coverage.
- M4: demonstrate complete runs, both victory routes per boss, solo/team balance.
- M5: four-browser tactical round, malformed/duplicate packets, reconnect and actual host process restart.
- M6: full keyboard and gameplay flows; currently pass only title/settings and basic map/inventory smoke.
- M7: seed fuzz, 30k-round soak, performance measurements and defect remediation.
- M8: hosting docs, coverage report, actual acceptance comparison and local release artifact.
- Separate-internet testing requires actual separate networks and remains unverified. No public deployment or tunnel started.

Continue implementation autonomously. Do not claim completion from this checkpoint.

## M3–M5 checkpoint update

- All 58 authored skills and all non-material items now pass an actual reducer action path, with profession/adaptation selection tests. Added explicit bargain rewards/risks, Director hooks, quest-item device use, consent-based trading, persistent fixtures, cooldown correction, elemental weaknesses and summoned-unit limits.
- Real hacking/disabling operates objective devices; alternate and physical device routes share one implementation. Bosses expose telegraphed health phases, two victory routes, and final stage ordering.
- `npm test`: **420 passed**, including 12 boss-route cases, independent-process replay, last-round revive, electric-water incident, real trade refusal/consent, atomic save corruption recovery, and actual server-process restart.
- `npm run e2e`: **3 passed** at the last browser checkpoint, including four independent browser contexts committing a tactical round with matching hashes and reconnecting to the same character. UI changes since that run are queued for a fresh build/browser check.
- Both six-floor debug-assisted campaigns (combat and alternate, seed 42) reached VICTORY through ordinary actions. A 100-seed assisted sweep is running; do not describe it as passed until its result file is complete.
- 60,000 generation checks passed before the last optional-door addition; rerun after that addition.
- 30k-round load/invariant test in progress. Short benchmark of the typed-array path search produced the same final checksum as the earlier search; observed median ~20ms and p95 ~26ms over 200 rounds under concurrent load. Full report remains pending.
- Ordinary bots have reached floor 6 but do not yet establish a reliable normal-play win rate. Balance and broad gameplay UX still need review. `PLAYABLE_RC` remains unachieved; remote separate-network acceptance is untested.
