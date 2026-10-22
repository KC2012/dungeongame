# Alpha 3 implementation record

## A3.1 — visual language

Original 16×16 pixel recipes in apps/client/src/assets.ts generate 39 distinct crawler/enemy/guardian/object/material sprites once per Phaser scene. Asset sheet: sprite-sheet.svg, reproducible with npx tsx tools/export-sprites.ts. Objects no longer use single letters as their primary identity. Closer default 3x camera with local tactical framing, quiet fog, distinct doors/cover/pits/fragile walls and sprites for hazards. Zoom retained. Pointer conversion now uses live client-space canvas bounds and refreshed camera matrices; tested for layout/scroll/scale changes.

Validation: 549 tests passed (547 baseline + asset/pointer tests), typecheck/build passed, all 11 existing browser tests passed (53s). No simulation changes. Human visual-recognition acceptance is still unmeasured.

## A3.2 — first-run onboarding

Guidance is persisted in a versioned local profile, advances from confirmed events, and supports On/Off/Reset from title/settings. Context prompts teach quiet movement and arrival supplies, first tactical plan/Ready, defense/cover, the wet relay, inventory/progression and floor devices. Optional server-side guided Floor 1 uses existing assets/catalogs: one Turnstile Rat at the first encounter and a discharged relay connected by harmless water to a stationary Queue Warden in the next encounter. Shared geometry is decided by the host at room creation, retained in existing counters/checkpoints; guidance UI remains per-player. No new catalog entries or AP changes. Accepted actions emit a presentation receipt for teaching/recap; outcomes remain server-owned.

Validation: 553 automated tests passed, including local persistence/reset/corrupt-storage recovery and 60 deterministic guided-floor seeds with real conduction damage/stun. Build/typecheck passed. 12/13 browser scenarios passed initially; the four-crawler route fixture exposed a first-enemy placement regression, corrected to the reachable first approach. All three affected first-run/persistence/four-browser scenarios then passed. Existing untouched Alpha 2 screenshot evidence was restored; Alpha 3 tests write their own screenshots.

Still to do in later phases: progressive control disclosure, contextual defense ordering, projected plans, precise causal summaries, moments/audio and cohesive first-run playthrough. Human ten-minute comprehension is not established by automation.

## A3.3 — progressive UI and truthful plans

Default full-width map with compact crawler state and nearby actions. Versioned guidance determines basic control visibility; Advanced controls/Guidance off expose the complete command set and expert keyboard shortcuts remain available. AP pips and named/costed plan steps replace bare verbs. Pure movement/AP projection includes door opening and wet terrain, exposes a ghost endpoint, and calculates attack preview from that endpoint without rolling RNG or predicting enemy decisions. Clicking an enemy constructs an affordable approach+attack or explicitly explains the AP shortfall. Movement keys always move; Shift+arrows explicitly aim. Clicking pins inspection; Escape unpins. Parent ResizeObserver and live pointer bounds follow dynamic guidance/target panels. Inspector/log remain accessible; nested log scrolling removed.

Validation: 558 automated tests passed, including endpoint/range, AP, wet-ground, door and progressive-control tests. Build/typecheck passed. Initial browser run passed 12/14; regression checks identified a buffered-keypress validation bug (fixed, fast-input/resume check passed) and legacy four-client selectors/profiles that needed explicit experienced-mode setup after progressive disclosure. Full final browser outcome will be recorded after the corrected run. No AP budget, attack rule, reducer or network authority change in this phase.

A3.3 follow-up: buffered rapid-input/resume scenario passed. Four-browser authority/reconnect/viewport check passed (13s) after configuring all independently created legacy contexts as experienced players, updating the changed Guard label, and fixing draw priority: keyboard selection on the crawler was overpainting its gold outline. Crawler outline now draws last; sprite/target labels use explicit overlay layers. The unchanged pixel-presence assertion remains in place.

## A3.4 — cause and effect

Compact named turn outcomes sit on the map, with expandable session history. Recaps describe movement, hit/miss/damage/armor, statuses, sentries holding position, actual relay state/element, conduction, rescue, objective and alternative boss results. Full authority log remains available with internal quick-plan/room hooks filtered from the reading surface. Exact range/LOS/AP/occupancy/cooldown/Focus failures are diagnosed at the authority's actual resolution position. Refused exploration commands now increment only the snapshot revision so their explanation is delivered immediately; they still spend no turn and consume no RNG.

Electrical events carry the actual bounded network edges, rendered as source-to-target arcs; gas/explosion events carry the actual blast radius. Impact recoil is presentation-only and disabled by reduced motion. Known wet-network opportunity outlines never inspect hidden tiles. Boss telegraphs have a source link and explicit next-enemy-phase label above materials. Guidance prioritizes the relay encounter and introduces Dodge/Overwatch only in relevant contexts; guided sentry cover makes the real hit penalty inspectable.

Validation: 563 tests / 18 files passed, including causal mapping, recap dedup/reconnect, precise rejection/no-turn/RNG preservation, and hidden-network bounds. Build/typecheck passed; all 14 browser scenarios passed (~1 minute), including original four-client authority/reconnect and fast-input checks. No new elemental or combat systems. Temporary statuses created and removed inside one snapshot still require existing event records to receive a separate cue; documented as a limitation.

## A3.5 — important moments and semantic audio

Confirmed first combat, level/talent, Audience thresholds, valuable loot, bargains, boss entrance/phase/defeat/override, down/death and floor transitions receive concise notices. Floor 3 saferoom choices offer a direct Character action; notices remain dismissible and do not gate simulation. First environmental discovery receives a short Producer teaching response. Quiet-round mockery is suppressed during guidance and failed-action resolutions; scoring is untouched. Completed guidance does not force the teaching arrangement on future runs.

Optional synthesized Web Audio has distinct movement, strike/miss/hit/critical/hurt, electricity/fire/explosion, objective/danger/level, Audience/Producer/boss/loss recipes. One user-gesture-unlocked context, quiet envelopes and bounded categories consume confirmed events, replacing the old generic submission beep. Sound stays optional and disabled by default. No audio files, external dependencies or paid service.

Validation: 565 tests passed; build/typecheck passed; 14/15 browser tests passed initially. Sound testing exposed Escape being ignored while a settings checkbox had focus, leaving the drawer open; Escape now closes drawers from input/select focus, and title guidance reset clears stale drawer state. Both affected sound/unlock/mute and guidance reset scenarios passed (5.7s). The final full browser run follows A3.6. Browser tests verify tone creation/unlock/mute, not human auditory quality.
