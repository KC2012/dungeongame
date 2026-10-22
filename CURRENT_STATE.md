# THE CRAWL — Alpha 2 local presentation build

Version **0.2.0 LOCAL_ALPHA**, 2026-10-21 Pacific. The A2.1–A2.5 implementation passes are delivered on `alpha2/make-the-game-visible`. New-player comprehension and full release acceptance are not yet human-validated. No public deployment, tunnel, purchase, paid service, push or remote release.

Alpha 1 is preserved at `alpha1-import-baseline` (`41d79ba`) and in the untouched original uploaded ZIP/extraction. See [baseline](docs/alpha2/BASELINE.md) for its SHA-256 and the missing-original-history caveat. Historical Alpha 1 performance/campaign/endurance reports remain under docs; they are not relabeled as Alpha 2 results.

| Milestone | Delivered |
| --- | --- |
| A2.1 | Confirmed client timeline, sequenced movement, melee/ranged/impact/miss/critical/armor/shield/damage/heal/status/collision/down/death/revive/ability feedback, environmental reactions and stronger boss danger tiles. Reduced motion; no input gating. |
| A2.2 | Four authored micro-situations inserted into existing procedural rooms using existing mechanics; readable materials, containers, power states and room plaques. Protected central paths/objects/actors. |
| A2.3 | Enemy role glyphs/silhouettes, tactics/weaknesses, guardian crests/phase cues and HUD, tactical item hints and two-stage Floor 3 identity choices. |
| A2.4 | Original short Producer reactions, priority/cooldown/mute, actual Audience score/change and event anchoring; scoring rules unchanged. |
| A2.5 | Wider map, reversible map focus, contextual readout and exact targeting feedback, collapsible expert panels with all detailed information retained. Parent-resize regression fixed. |

## Actual current checks

- Repeated full reusable setup: frozen `npm ci`, Python venv/pinned jsonschema dependencies, both validators, Python tests, full npm suite and production build succeeded.
- `npm test`: **547 passed, 14 files, zero failed/skipped**, 28.95s. Includes 10,000 randomized rounds, independent-process replay, all existing content behavior, progression, save/reconnect and authority/network suites, plus presentation regressions.
- Python: **11 passed**; both validators: **448 catalog records passed**.
- `npm run build`: typecheck and client/server bundles passed; existing ~1.95MB client-bundle warning remains.
- `npm run e2e`: **11 passed**, 48.2s. Original two/four-browser authority and reconnect/nonce checks, choice lockout, settings, actual Phaser event presentation, map-focus resize/expert access, input during effects and no historical replay on resume.
- New generation check: **600 seeded floors** repeated for deterministic hashes, object/exit reachability and safe spawns. Two assisted six-floor campaigns won through alternate/combat routes. No human balance inference.
- Direct Alpha 1/2 combat comparison: **1,000 cases** with identical non-event state, RNG and event type/order. Event payload enrichment and newly generated scenarios intentionally differ.
- Screenshots and compact machine-readable evidence: [Alpha 2 report](docs/ALPHA2.md), [phase record](docs/alpha2/PROGRESS.md), [test summary](docs/alpha2/test-summary.json).

## Boundaries and remaining work

The deterministic core, authority, tactical planning and existing progression remain in place. Simulation-facing edits are authored situation placement and presentation metadata, including accurate capped healing. Schema-1 saves remain supported; existing floors are not retroactively changed. Use matching host/client versions, and back up saves when switching versions.

Dense chain labels can still crowd; states applied and expired inside one snapshot may lack separate visual cues; guardians still share a lightweight base silhouette with floor/phase marks. Human first-time-player readability, accessibility/tone/balance, separate-network multiplayer, desktop long-tail profiling and new endurance testing remain outstanding. Alpha 1's 16.23s worst-case load maximum is not recertified or hidden. Recommendations and exact launch/test instructions are in docs/ALPHA2.md.

Next task: observe first-time players explaining world feedback, then prioritize missed causal links and dense-feedback placement before expanding content.

Production 0.2.0 health/HTML/assets/catalog smoke passed after version alignment; local host is running on port 2567 with isolated `.data/alpha2-local` saves. Reusable cloud `install_script` and `start_skill` draft saved successfully. Snapshot publication and restoration in a new task have not been performed. Review/save Environment settings and publish the environment if a reusable cloud snapshot is desired.

Alpha 3 branch alpha3/make-the-game-understandable; Alpha 2 preserved at alpha2-known-good. A3.1 delivered original readable pixel recipes, closer camera and live-bounds pointer conversion. 549 tests and 11 browser checks passed. See docs/alpha3/AUDIT.md and PROGRESS.md. Alpha 3 is in progress.

A3.2: persisted On/Off/Reset guidance and opt-in host-authoritative teaching arrangement on Floor 1. 553 unit/integration tests passed; guided-floor conduction tested across 60 seeds. Browser first-run, reset and four-client route pass after correcting first-enemy placement. Alpha 3 remains in progress.
