# Current state — 2026-10-21 UTC

Version **0.1.0 LOCAL_ALPHA**. Full six-floor gameplay is implemented. **Not PLAYABLE_RC:** separate-network acceptance, a desktop performance baseline and human balance/accessibility review are outstanding. No public deployment, tunnel, paid account or purchase was made.

| Milestone | Actual implementation and evidence |
| --- | --- |
| M0 | Pinned npm workspaces, Phaser 3.90, Colyseus 0.16, Vite, Ajv, Vitest and Playwright. Python and TS validators pass all 448 entries; real two-browser lobby. |
| M1 | UI-independent deterministic reducer, named PRNG streams, canonical hashing, AP, movement/LOS, combat, statuses, inventory and event log. Independent-process replay and tactical rule tests. |
| M2 | Six 45×45 authored-prefab floor grammars, required/optional routes, fog, four safe spawns, retry/fallback. Final 60,000-layout sweep passes. Bounded environmental queue and gold interactions execute. |
| M3 | All 15 catalogs consumed. All 58 skills and active item paths exercised; eight professions, six adaptations, equipment/passives, talents, recipes, shop, traits and AI. Sixty achievement-hook fixtures, sponsors, 25 bargains, actual risks/rewards and replay-safe drafts. |
| M4 | Six unique objectives, bosses, telegraphs/health phases and alternate device routes, safe services, consent descent and final uplink/victory/defeat. Twelve boss-route fixtures; 100 assisted six-floor solo campaigns (10 alternate/90 combat), one assisted four-crawler campaign. No teleports, save resets or free objective flags in those bots. |
| M5 | Authenticated private Colyseus authority, four logical slots, plan/readiness validation, action nonces, role transfer, offline guard/parking, spectator, trading consent. Atomic versioned saves/backups/corruption recovery, actual server restart, host checkpoint export/validated fork. Four browsers agree after a tactical round. Live transport loss and unacknowledged-action recovery pass. |
| M6 | Original procedural pixel map with floor motifs, DOM HUD/log/inspector, inventory/equipment/tools, character/choices, safe services, shop/craft, offers/drafts, settings/sound, recap. Keyboard cursor/actions/focus and resolution checks; camera resize visibility regression fixed. Full human accessibility review is pending. |
| M7 | 527 tests pass, including 10k randomized rounds. 60k generation checks, 100 assisted campaign seeds, 30k load rounds. p95 43.76ms but max 16.23s on shared virtual cloud hardware; long-tail/desktop gate unresolved. Thirty-minute four-browser repeat endurance run is currently finishing; do not count a partial file as passed. Human balance/run length unmeasured. |
| M8 | Local host guide, acceptance comparison, content coverage, dependency notices, CI configuration and issue list authored. Final artifact/tag and endurance outcome are the remaining packaging steps at this checkpoint. No remote/published release is claimed. |

## Latest completed checks

- Python schema/reference/connectivity validation: **448 records passed**; original unittest suite **11 passed**.
- `npm run validate:content`: **448 records passed**; coverage reports zero missing achievement source mentions and explicitly separates structural from behavioral evidence.
- `npm test -- --reporter=default --reporter=json --outputFile=/tmp/crawl-final-tests.json`: **9 files, 527 passed, 0 failed/skipped**, 56.05 seconds. Includes 10,000 randomized rounds/80,000 submitted commands and independent-process deterministic replay.
- `npm run build`: **passed**, typecheck plus client/server bundles. Vite warns about the approximately 1.93MB client bundle (459KB gzip).
- `npm run e2e`: **6 passed, 59.3 seconds** on system Chromium, after the camera fix. Two/four real browser contexts, tactical checksum agreement, reload/session identity, keyboard/resolution/crawler visibility, active-tool targeting, dropped pending action reconnect, original-nonce retry without duplicate turn. Fresh owned production host and isolated saves.
- `npx tsx tools/seed-sweep.ts`: **60,000 passed**, 10,000 per floor, 78.26 seconds; required reachability, optional locks and safe spawns.
- `npx tsx tools/campaign.ts`: **100/100 debug-assisted solo seeds reached VICTORY**, 10 alternate and 90 combat; two concurrent 50-seed partitions with the same recorded source hash. One four-crawler assisted run also reached VICTORY. Those runs precede later defensive unknown-ID/target-normalization regressions; they are not mislabeled as exact release-hash balance tests.
- `npm run soak`: **30,000 invariant/load rounds passed**, four crawlers plus 50 enemies, debug HP/armor. Median 18.92ms, p95 43.76ms, max 16,227ms; maximum observed heap 64.20MiB, no deferred events. See docs/soak-report.json and docs/performance-replay.json.

## Important limits and continuation

The first browser soak stalled after approximately 23 minutes and is preserved as docs/browser-soak-initial.json, not a pass. The repeat currently has advancing revisions and stable renderer heaps; only `complete:true` establishes its final result. The harness now waits for confirmed revisions between inputs and supports separate output paths.

Ordinary solo bots won one alternate seed and lost three combat seeds on floors 2–3. This tiny sample cannot establish human difficulty. Remote internet, degraded WAN, desktop timing, full accessibility and friends rubric remain external acceptance work. See docs/ACCEPTANCE_REPORT.md and docs/ISSUES.md.

Next autonomous steps: finish endurance evidence, run a short final-harness check with a separate output, update this checkpoint, commit M6–M8, create a local version tag and source/compiled artifact with checksum, and save the updated reusable cloud setup/start instructions. No public deployment or push.
