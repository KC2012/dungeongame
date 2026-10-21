# Codex implementation campaign — ordered milestones

## M0 Bootstrap and validation
Initialize TypeScript monorepo, Phaser, Colyseus, Vitest, Playwright; pinned package-lock; expose npm commands; port `tools/validate.py` to TS/Ajv. Create CURRENT_STATE.md and issue tracker. Gate: local browser displays real server lobby, two clients in same room, catalog validator passes.

## M1 Headless engine
Typed state, seeded named RNG streams, grid, LOS/path, actors, AP, hit/damage/status, round reducer, event log, deterministic hash and save encoding. Gate: >=50 focused unit tests and deterministic replay; no UI dependencies in core.

## M2 Procedural floors and environmental simulation
Implement room-template generator, mandatory graph validation, fallback, fog, traps, material tags, queued reactions. Gate: 100 valid seeds/floor, 10 gold interaction tests, no unbounded reactions.

## M3 Content and character progression
Load all catalogs, implement effect interpreter and AI behaviors, all backgrounds/adaptations/professions, leveling, items, loot, achievements, sponsor offers. Gate: catalog coverage report shows each record has an executable route; targeted content effect tests.

## M4 Six floor objectives and bosses
Script floor-specific objectives in typed state, boss phase behaviors and alternate solution checks; all floors traversable. Gate: headless scripted test completes all six floors with no save/recovery shortcuts, both boss routes per floor tested.

## M5 True online cooperative session
Colyseus room authority, player plans/readiness, inventory transaction semantics, reconnect and checkpoint replay, role transfer, spectator. Gate: 4 independent browser windows same round/checksum, dup packet tests, kill/restart/resume.

## M6 Presentation and usability
Pixel sprite atlas or generated deterministic geometric sprites, tile maps, HUD, log, combat preview, inventory, class/adaptation screens, safe room, boss telegraphs, settings and sound. Gate: no inert visible UI; keyboard-only and resolution tests pass.

## M7 Balancing and performance
100 seeds/floor + 10k overnight as available, four-bot/one-bot tuning, 30k-round soak, performance logs, accessibility pass, bug fixes; record sample win rates without asserting representativeness. Gate: 0 P0/P1 issues, all checks in ACCEPTANCE with evidence.

## M8 Deliver release candidate
Document npm install/build/dev/host, temporary tunnel steps, provide complete source, compiled bundle, test report, known limitations, sample lobby link instructions, version tag. No deployment or paid registration without approval.

## Cross-cutting engineering rules
- Short commits with test commands; use a tracking checklist each milestone.
- If context limits interrupt development, snapshot CURRENT_STATE and exact next commands, don't repeatedly redesign.
- No giant refactor of working game unless a tested issue requires it.
- If actual cross-network Quick Tunnel unavailable, report it explicitly as an unverified prerequisite and label release `LOCAL_ALPHA`, not `PLAYABLE_RC`.
- Do not fabricate passing tests, file creation, deployment or stakeholder acceptance.
