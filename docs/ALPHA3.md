# THE CRAWL — Alpha 3 local candidate

Version **0.3.0 LOCAL_ALPHA**, developed on `alpha3/make-the-game-understandable`. Alpha 2 is preserved at `alpha2-known-good` / `v0.2.0-local-alpha`, commit `e31bf5450dd43470080884c134c27e7346d1c9ee`. Alpha 1 remains at `alpha1-import-baseline`. No merge, public deployment, tunnel, purchases or paid services were used.

This is a working six-floor build with the Alpha 3 implementation passes. The acceptance claim that a novice understands the game independently remains **pending a human playtest**. Automated success is not evidence of that claim. The detailed [audit](alpha3/AUDIT.md), [phase record](alpha3/PROGRESS.md), [user brief](alpha3/BRIEF.md), and [first-time checklist](alpha3/FIRST_TIME_PLAYTEST.md) are retained.

## Launch and test

From the extracted repository root, with Node.js 22+ and npm:

```sh
npm ci
npm run build
npm run host
```

Open **http://127.0.0.1:2567** in a desktop browser. Create a private room, choose Guidance On and begin. A release ZIP also includes `dist`; after `npm ci --omit=dev`, `npm run host` can use that prebuilt bundle. Building from source needs dev dependencies. Opening `index.html` directly cannot run the authoritative server.

Use a fresh `DATA_DIR` for a new test, or back up your complete existing directory before upgrading. Example on Bash: `DATA_DIR=.data/alpha3-local npm run host`. Use matching host/client versions. Saves keep the existing versioned schema; existing saved floors are not rearranged. Guided generation is chosen for a new room by its host; other players' UI guidance is local to their browser.

```sh
npm run validate:content
npm test
npm run build
npm run e2e
python -m unittest discover -s tests -p 'test_*.py'
python tools/validate.py
npx tsx tools/export-sprites.ts
```

Browser tests need Chromium. In this environment `/usr/bin/chromium` is used; set `CHROMIUM_PATH` elsewhere. They own an isolated local host on port 2570 and `.data/e2e` checkpoints. Never point the test data directory at a valued run. For formal Python schema checks, install `jsonschema==4.26.0` in a virtual environment. The cloud setup already provides `/workspace/.venvs/dungeongame`. Full hosting, saves and reconnect details remain in [HOSTING.md](HOSTING.md).

## Milestones delivered

| Phase | Working changes | Evidence / boundaries |
| --- | --- | --- |
| A3.1 — visual language | Original 16×16 crawler, enemy-role, six guardian, machinery, supplies and material sprites; distinct terrain/doors/fragile walls; closer default zoom and tactical camera framing; fresh pointer/camera conversion. | [Asset sheet](alpha3/sprite-sheet.svg), [pinned tile at 1920](alpha3/pinned-inspection-1920.png). Human recognition is not measured. |
| A3.2 — first run | Persisted contextual guidance; quiet arrival/supplies, forgiving existing rat, existing relay/water/sentry encounter; contextual defense, cover, equipment, progression and objectives. | [First supplies](alpha3/first-run-supplies.png), [real relay encounter](alpha3/wet-relay-264461152.png). Opt-in host-authoritative teaching arrangement only on new Floor 1. |
| A3.3 — progressive UI | Full-width map by default; context/advanced controls; AP pips and named costs; movement/door/AP projection and ghost endpoint; affordable approach+attack or explicit shortfall; consistent move keys and pinned inspection. | [Advanced controls](alpha3/advanced-controls.png). Attack preview assumes other actors remain where they are; current equipment is used. |
| A3.4 — cause and effect | Named compact outcome recap/history; specific authority-side failures; actual electrical-network edges and blast bounds; impacts/recoil; known conduction preview; clearer guardian source/timing/area. | [First combat](alpha3/first-combat-1234.png), [wet relay](alpha3/wet-relay-1234.png). Animation never changes outcomes or delays commands. |
| A3.5 — important moments | Confirmed combat/progression/boss/Audience/floor notices and choice shortcuts; selective teaching Producer; optional distinct synthesized sound categories. | [Character development](alpha3/a23-crawler-development.png), [Producer discovery](alpha3/wet-relay-264461152.png). Sound starts muted; browser gesture unlock required. |
| A3.6 — integrated testing/polish | Real UI walkthroughs on two seeds; inspection across scroll/zoom/resize; fixed hover-induced camera resize, Escape from settings focus, stale notices, and oversized/colliding effect captions. | [1280 inspection](alpha3/pinned-inspection-1280.png), browser tests and [manual protocol](alpha3/FIRST_TIME_PLAYTEST.md). Actual zero-knowledge human test remains outstanding. |

## First-run sequence and controls

The player begins in a quiet real room. Move with WASD/arrows or click floor. Approach and open arrival supplies. Encountering the first rat switches into planning: queue movement and/or attack, inspect the costed steps, then Ready [R]. Move costs are terrain-dependent; the weapon determines attack cost. AP is still 3, with existing status modifiers. Invalid authoritative actions refund AP and explain the actual failure.

Clicking an enemy queues an affordable approach plus attack when possible. If both cannot fit, the game says how much movement and attack cost; it does not quietly spend a partial approach for that click. You can intentionally move closer and Ready this round. Movement keys always move; Shift + arrows aims; Space confirms the selected target. Undo removes the last queued step; Escape cancels selection/unpins inspection.

Guard appears after the first resolved round. Dodge is introduced when an ordinary ranged enemy is relevant; Overwatch when a ranged equipped weapon makes sense. Cover is taught through a real cover penalty in the target preview. The next teaching room has a discharged relay, visibly connected water and a stationary armored sentry: activation conducts shock, damages/stuns the sentry and earns an actual Audience reaction. The dry walkway is the safe approach. Switching the powered relay off spreads water; water alone does no damage.

Inventory unlocks after loot, Character after progression, and abilities later in guidance. Prompts are contextual rather than a forced sequence: entering the relay room prioritizes its physical lesson. Floor terminals, guardian devices, ordinary/alternative resolution and stairs remain the existing loop. Profession/adaptation become prominent in the Floor 3 saferoom. Guidance completes after a boss resolution and is not forced on every future run.

Settings offers Guidance On/Off/Reset; the title also offers On/Off. Reset before creating a new room to repeat the authored first-floor arrangement. Resetting guidance in a live run changes prompts, not its saved dungeon. Advanced controls immediately restores the full command surface. Expert hotkeys remain available throughout. Show panels restores crew, floor objective, Inspector and complete available authority log. F inspects without spending AP; click pins the tile and Escape releases it. Hover changes do not resize the map. All outcomes / history expands the compact turn recap.

## Assets

`apps/client/src/assets.ts` contains 39 original deterministic 16×16 pixel recipes and their palette. Phaser generates the canvas textures once per scene; no asset host or network art service is involved. `tools/export-sprites.ts` regenerates the standalone `docs/alpha3/sprite-sheet.svg`. Terrain is drawn with restrained pixel geometry in `map.ts`. Combat effects use the existing confirmed-event adapter and client timeline, with screen-sized captions that stack above nearby outcomes. Audio is synthesized by `audio.ts`; there are no audio downloads or licensed files.

## Engineering boundaries

The server remains authoritative. Presentation consumes snapshots/events; AP, hit rolls, enemy AI, damage, progression, multiplayer ready/nonce rules and combat phase ordering remain intact. Local plan projection does not execute attacks or consume RNG. Simulation-facing changes are deliberately limited: opt-in deterministic Floor 1 placement/stats using existing content; successful-action receipts; actual relay state/element and conduction-edge/blast-radius metadata; precise rejection reasons; and publishing a revision for refused exploration input without advancing turn or RNG. Tests cover these boundaries.

Guidance state is versioned localStorage and is independent of save identity. The host's existing counters persist whether its current Floor 1 was generated for guidance. Catalog count stays **448**, with no expanded enemy/item/profession catalogs. Existing unguided floors and old saves retain their existing generated layouts. Cross-version whole-state hashes need not match because event metadata and guided layout differ; seeded reproducibility within this version is tested.

## Remaining weaknesses and unverified acceptance

- No actual novice human has completed the zero-knowledge protocol. The browser walkthrough knows coordinates, reads saved authority state for routing, and follows a scripted strategy; it is a real input/outcome regression, not a substitute for that playtest.
- Guidance still uses concise written prompts, and the recap is written confirmation. Complex items, abilities, crafting, alternate boss device order and profession/adaptation choices still benefit heavily from text and exact Inspector/Character details.
- Dense chain reactions can still crowd a small viewport. Caption spacing reduces overlap but does not solve every edge case; labels may leave the visible map near its upper edge. At short desktop heights the command area may need page scrolling. A full touch/mobile pass is not claimed.
- The planner assumes current equipment and stationary other actors. It projects local movement, doors and AP, not knockback, ally movement, queued gear swaps, attacks or future environmental outcomes. It says that assumptions apply. The authority can reject a previously viable plan after other actors change the world.
- Dodge/Overwatch are contextual and may be learned after Floor 1 depending on enemies/equipment. Guidance progress indicates observed events, not proof the human understood them. Joining an experienced host does not force the teaching layout.
- Some brief statuses created and removed inside one snapshot may lack a separate cue if no status event exists. Long authority history is bounded by existing event retention; the new readable session recap retains 80 resolutions and is reset on reconnect.
- Browser tests verify audio unlock, tone creation and mute, not sound quality. Reduced motion is retained; a formal accessibility/color-vision review has not been performed.
- No new WAN, packet-loss, human balance, run-duration, long endurance or desktop GPU profiling certification. The existing ~1.98 MB client bundle warning remains. Assisted campaigns are explicitly not balance tests.

Next iteration: observe three first-time players, fix repeated recognition/cause/plan failures, then test late-floor complexity and mixed-experience co-op guidance. Prefer a better tactical preview for queued equipment changes and a stronger dense-feedback layout over catalog expansion. These are presentation priorities for Alpha 4; Alpha 3 human acceptance must be evaluated first.

Exact automated counts, commands and build hashes are recorded in `docs/alpha3/test-summary.json` and the release manifest. Milestone commits are recorded in `docs/alpha3/PROGRESS.md`; the release tag and packaged delivery manifest identify the exact final source commit without a self-referential Git hash in this file.
