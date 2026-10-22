# THE CRAWL — Alpha 3 local candidate

Version **0.3.0 LOCAL_ALPHA_CANDIDATE**, 2026-10-22 Pacific. Development branch `alpha3/make-the-game-understandable`; source tag `v0.3.0-local-alpha`. The playable implementation passes A3.1–A3.6 are delivered. Human first-time comprehension remains unverified; do not call the zero-knowledge acceptance gate passed.

Alpha 2 is preserved at `alpha2-known-good` / `v0.2.0-local-alpha`, commit `e31bf5450dd43470080884c134c27e7346d1c9ee`. Alpha 1 remains at `alpha1-import-baseline` (`41d79ba`), with its original upload preserved. No merge, public deployment, tunnel, spending or paid services. A separate delivery branch carries the downloadable package using the previously authorized GitHub delivery channel; `main` is not changed.

| Milestone | Delivered |
| --- | --- |
| A3.1 | 39 original generated pixel sprites, closer camera/tactical framing, visual hierarchy, live pointer/camera mapping. |
| A3.2 | Persisted Guidance On/Off/Reset; real Floor 1 movement/supplies, one forgiving rat, dry-path relay/wet sentry lesson; contextual defense/cover/equipment/progression/objectives. |
| A3.3 | Map focus by default; progressive/Advanced controls; AP pips, named costed plans, projected movement/doors/endpoint and affordable approach+attack; movement keys always move, Shift aims; pinned inspection. |
| A3.4 | Named on-map causal outcomes/history; specific authoritative rejection reasons; actual electrical arcs/blast bounds; recoil and stronger guardian source/area/timing; known-network opportunities. |
| A3.5 | Earned moments and Floor 3 choice shortcuts; selective Producer discovery response; optional confirmed-event semantic audio with gesture unlock/mute. |
| A3.6 | Two real browser first-combat/relay routes; zoom/scroll/resize inspection regression; stable hover geometry, smaller stacked effect captions, stale-notice and settings Escape fixes; first-time human protocol. |

Actual final checks: **565 npm tests in 19 files passed** (33.39s), **18 browser scenarios passed** (1.7m), **11 Python tests passed**, both validators passed **448 records**, typecheck/client/server production build passed. Two assisted six-floor campaigns won by alternate/combat routes; those are not balance evidence. Existing 600-floor generation regression, 60 guided seeds, fuzz/replay/content/network/persistence checks remain active. Stable-build full browser run has zero failures/skips. An earlier browser run was interrupted by rebuilding its served assets; that run is not presented as passing.

Evidence: [Alpha 3 report and launch](docs/ALPHA3.md), [phase history](docs/alpha3/PROGRESS.md), [machine-readable test summary](docs/alpha3/test-summary.json), [manual first-time protocol](docs/alpha3/FIRST_TIME_PLAYTEST.md), [asset sheet](docs/alpha3/sprite-sheet.svg), and screenshots under `docs/alpha3`. Original Alpha 2 evidence is retained under `docs/alpha2` without relabeling.

The deterministic core and authoritative multiplayer remain in place. Simulation-facing edits are opt-in guided Floor 1 placement/stats using existing content, action receipts/environment metadata, precise failures, and a refused exploration action publishing a revision without spending a turn or RNG. Existing save schema/nonce/reconnect rules remain supported. Old saved floors are not rearranged; back up saves and use matching host/client builds. See the report for these boundaries and planner assumptions.

Known limits: complex item/ability/boss-device rules still rely on text; dense feedback and short viewports need more human polish; brief within-snapshot statuses may lack cues; planner assumes current equipment and stationary other actors; browser audio checks do not assess auditory quality. No new WAN, human balance/accessibility, Windows runtime, long endurance or desktop profiling certification. Existing ~1.98 MB bundle warning remains. No novice human has validated independent ten-minute understanding.

Cloud instance: production 0.3.0 health/HTML/assets/catalog smoke passed on loopback **2568**, isolated `.data/alpha3-local` saves. Port 2567 may still serve the preserved Alpha 2 process; no unknown host was stopped. The onboarding skill's reusable `install_script` and `start_skill` draft were updated for Alpha 3 and saved, not published or restored into a new task. Processes must restart after snapshot restoration. Local desktop launch defaults to 2567; see the report.

Next work: observe three first-time players using the included protocol, fix repeated recognition/plan/cause failures, then test late-floor complexity and mixed-experience multiplayer. Prefer this evidence over expanding catalogs.
