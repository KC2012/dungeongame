# Current state — 2026-10-21 UTC

Version **0.1.1 LOCAL_ALPHA**. Full six-floor gameplay is implemented. **Not PLAYABLE_RC:** separate-network acceptance, a desktop performance baseline and human balance/accessibility review are outstanding. No public deployment, tunnel, paid account or purchase was made.

## Windows save compatibility patch (0.1.1)

A real Windows user reported `EPERM: operation not permitted, fsync` while creating a room. The original Linux-only validation missed this. Node cannot flush a directory handle on Windows; the save routine now skips only that directory flush on Windows. The checkpoint file is still fsynced before atomic rename on every platform, and genuine file-write/flush errors still propagate. The journal and backup/version/checksum protections remain active. Existing schema-1 saves stay compatible.

Focused verification: nine persistence tests pass, including two new Windows-branch cases that reject directory flushes, verify room checkpoints/journals/backups, and ensure a denied file flush preserves the prior save. Typecheck and production build pass. Full-suite/browser repeat and the native Windows CI job are being verified for this patch. The original 0.1.0 evidence below is retained as historical evidence rather than relabeled as Windows validation.

| Milestone | Actual implementation and evidence |
| --- | --- |
| M0 | Pinned npm workspaces, Phaser 3.90, Colyseus 0.16, Vite, Ajv, Vitest and Playwright. Python and TS validators pass all 448 entries; real two-browser lobby. |
| M1 | UI-independent deterministic reducer, named PRNG streams, canonical hashing, AP, movement/LOS, combat, statuses, inventory and event log. Independent-process replay and tactical rule tests. |
| M2 | Six 45×45 authored-prefab floor grammars, required/optional routes, fog, four safe spawns, retry/fallback. Final 60,000-layout sweep passes. Bounded environmental queue and gold interactions execute. |
| M3 | All 15 catalogs consumed. All 58 skills and active item paths exercised; eight professions, six adaptations, equipment/passives, talents, recipes, shop, traits and AI. Sixty achievement-hook fixtures, sponsors, 25 bargains, actual risks/rewards and replay-safe drafts. |
| M4 | Six unique objectives, bosses, telegraphs/health phases and alternate device routes, safe services, consent descent and final uplink/victory/defeat. Twelve boss-route fixtures; 100 assisted six-floor solo campaigns (10 alternate/90 combat), one assisted four-crawler campaign. No teleports, save resets or free objective flags in those bots. |
| M5 | Authenticated private Colyseus authority, four logical slots, plan/readiness validation, action nonces, role transfer, offline guard/parking, spectator, trading consent. Atomic versioned saves/backups/corruption recovery, actual server restart, host checkpoint export/validated fork. Four browsers agree after a tactical round. Live transport loss and unacknowledged-action recovery pass. |
| M6 | Original procedural pixel map with floor motifs, DOM HUD/log/inspector, inventory/equipment/tools, character/choices, safe services, shop/craft, offers/drafts, settings/sound, recap. Keyboard cursor/actions/focus and resolution checks; camera resize visibility regression fixed. Target previews show AP/range/LOS and engine-calculated basic hit chance, with direct area outlines and ally warnings. Full human accessibility review is pending. |
| M7 | 527 tests pass, including 10k randomized rounds. 60k generation checks, 100 assisted campaign seeds, 30k load rounds. p95 43.76ms but max 16.23s on shared virtual cloud hardware; long-tail/desktop gate unresolved. Thirty-minute four-browser repeat passed: 3,384 actions, matching final revision 3,386, zero browser errors, final heaps 7.15–7.71MiB. Human balance/run length unmeasured. |
| M8 | Local host guide, acceptance comparison, content coverage, dependency notices, CI configuration and issue list authored. Source/compiled archive, SHA-256 and local v0.1.0-local-alpha tag supplied; tested cloud install/start instructions saved as a draft, not published. No remote/published release is claimed. |

## Latest completed checks

- Python schema/reference/connectivity validation: **448 records passed**; original unittest suite **11 passed**.
- `npm run validate:content`: **448 records passed**; coverage reports zero missing achievement source mentions and explicitly separates structural from behavioral evidence.
- `npm test -- --reporter=default --reporter=json --outputFile=/tmp/crawl-final-tests.json`: **9 files, 527 passed, 0 failed/skipped**, 56.05 seconds. Includes 10,000 randomized rounds/80,000 submitted commands and independent-process deterministic replay.
- `npm run build`: **passed**, typecheck plus client/server bundles. Vite warns about the approximately 1.93MB client bundle (459KB gzip).
- `npm run e2e`: **6 passed (1.1 minutes)** on system Chromium, after the camera and target-preview changes. Two/four real browser contexts, tactical checksum agreement, reload/session identity, keyboard/resolution/crawler visibility, active-tool targeting, dropped pending action reconnect, original-nonce retry without duplicate turn. Fresh owned production host and isolated saves.
- `npx tsx tools/seed-sweep.ts`: **60,000 passed**, 10,000 per floor, 78.26 seconds; required reachability, optional locks and safe spawns.
- `npx tsx tools/campaign.ts`: **100/100 debug-assisted solo seeds reached VICTORY**, 10 alternate and 90 combat; two concurrent 50-seed partitions with the same recorded source hash. One four-crawler assisted run also reached VICTORY. Those runs precede later defensive unknown-ID/target-normalization regressions; they are not mislabeled as exact release-hash balance tests.
- `npm run soak`: **30,000 invariant/load rounds passed**, four crawlers plus 50 enemies, debug HP/armor. Median 18.92ms, p95 43.76ms, max 16,227ms; maximum observed heap 64.20MiB, no deferred events. See docs/soak-report.json and docs/performance-replay.json.

## Endurance and final handoff

- `npm run soak:browser`: **complete:true**, 1,801.48 seconds, four independent Chromium contexts, 3,384 keyboard actions, zero browser errors; all final revisions 3,386. Final GC-sampled heaps 7.71/7.55/7.15/7.55MiB. This long run started before the final targeting/camera/watchdog polish. The first failed attempt remains preserved as docs/browser-soak-initial.json and is not counted as a pass.
- Final client plus serialized-confirmation harness: **62.76 seconds**, 57 actions, zero browser errors, all four revisions 59. Separate docs/browser-soak-final-smoke.json preserves the long-run report. Six final browser scenarios also pass after the UI polish.
- Ordinary four-crawler sample: alternate seed 0 and combat seed 3 VICTORY; seed 2 DEFEAT on floor 6; seed 1 initially bot-stuck at a narrow exit. Diagnostics proved a legal step aside cleared the route. Corrected voting/parking policy repeated seed 1 to VICTORY on floor 6 in 3,624 turns without assistance. Initial outcomes and follow-up are separate reports. This is not a human win-rate estimate.
- Complete reusable setup script repeated Python checks, frozen npm install, all 527 tests and production build successfully. Cloud `install_script` and `start_skill` draft saved; no snapshot publication is claimed.

The intended M0–M8 implementation is delivered as a **local alpha**, with milestone evidence and remaining external gates explicitly separated. The tagged source, compiled host/client and notices are packaged under /workspace/artifacts; docs/RELEASE.md describes extraction and runtime-only install. No checkpoint or session token is included. Source was committed locally. The complete archive was subsequently uploaded to the existing public GitHub repository on delivery/local-alpha-zip to provide a tested HTTPS download; no game server was deployed.

Remaining acceptance work: actual separate-internet/degraded-WAN play, desktop long-tail profiling, complete human accessibility/keyboard review, friends rubric, normal solo/team balance and run-length measurement. See docs/ACCEPTANCE_REPORT.md and docs/ISSUES.md. The 16.23-second load-test maximum is retained and prevents claiming full performance certification. No reproduced core save-loss, duplication, false-victory or infinite-reaction defect remains in the executed tests.
