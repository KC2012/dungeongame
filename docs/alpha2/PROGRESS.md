# Alpha 2 milestone record

## A2.1 — confirmed visual combat language

Implemented a client-only bounded timeline: movement interpolation, melee slash, ranged tracer, miss/critical callouts, impact/damage, shield/armor feedback, heal/shield rings, status deltas and persistent map glyphs, knockback trails, down/death/revive markers, ability activation, fire/water/shock/cold/acid/poison/smoke hazard onset, ignition/explosion/breach/steam/ice and conduction callouts. Crosshatched boss danger tiles persist until the authority clears them. No camera shake or flashing. Reduced-motion setting keeps feedback stationary.

Combat event payloads now include attack origin/range and effective armor mitigation. Damage calculation, RNG sequence, AP and outcome rules are preserved. The adapter does not invoke reducers or mutate snapshots. First/resumed snapshots establish a baseline; duplicate/older revisions and repaints do not replay history. Floor/run changes clear effects. Maximum 160 live effects; short effects never gate input or network acknowledgements.

Validation: full suite 535 passed (529 existing + 6 presentation regressions); production build/typecheck passed; all six existing production browser tests passed. A separate actual-Phaser fixture passed after correcting two harness issues (wrong perform signature and premature Scene event access). Screenshots in this directory show real engine-driven combat, conduction/telegraphs and stationary downing feedback, not mock screenshots. The fixture is development/test-only and not part of the production client.

Remaining: dense chains can still crowd small labels; before/after status deltas cannot display statuses applied and expired entirely inside one authority update. An unseen source never gets an invented tracer. Newer snapshots take priority over unfinished local animation. No new WAN or human readability certification is claimed.

## A2.2 — authored situations in procedural floors

Four small authored situations (flooded relay, volatile stores, abandoned checkpoint, sealed spill) insert into one encounter room and one optional discovery room per floor. Deterministic seed selection, unchanged room sockets and protected dry cross/object/actor positions. Uses existing water/conduction, gas ignition, volatile materials, cover, brittle wall, acid, machine and cache rules; no new systems or extra catalog filler. Recognizable map plaques, visible containers/oil/ice, power-state machine glyphs and contextual situation descriptions. Existing saves load without new required fields; new floors receive the situations.

Validation: 538 tests pass; 600 seeded floors checked twice for identical hashes, safe spawns and all object/exit reachability; actual volatile ignition/explosion test. Two assisted six-floor campaigns reached VICTORY (one alternate route, one combat), report a22-campaign.json. All 7 browser scenarios pass; a22-flooded-relay.png shows the actual generated room rendered by Phaser. Production build/typecheck and 448-record content validation pass.

Limitations: four reusable situations, not the entire example list; no suspended-load physics or new puzzle subsystem. Situation selection changes newly generated floor content, but not the deterministic generation contract. Previously serialized floors are not retroactively decorated. Human balance remains unmeasured.

## A2.3 — enemy, loot, boss and crawler identity

Enemies now use tactical-role glyphs and silhouettes: ranged triangles/barrels, broad sentries, support crosses, summoner crests and distinct melee/flanker/skirmisher marks. Inspector identifies actual AI role and catalog weakness. Bosses use large crested bodies, floor crest counts and phase pips; confirmed entrance/phase changes generate map cues, and a visible boss HUD shows current HP/phase, next-enemy-phase warning and alternative-device progress. Combat and systemic defeat retain different visual callouts. Existing items receive concise tactical-use hints; no stat creep, catalog expansion or rule changes. Floor 3 character choices now form a two-stage contract station with ability previews, selected-state feedback, exact modifiers and original server gating.

Validation: production build passed; 540 tests passed (including all existing suites and catalog-role/opportunity regressions). Browser evidence and final phase results recorded below after execution. No AI, item, boss or progression rule was rewritten. The AI role is a behavioral hint, not a prediction of a secretly committed command.

Limitations: silhouettes are lightweight glyph/pixel shapes, not bespoke animated sprite art. Six bosses share a guardian silhouette with floor crests; unique hand-animated boss bodies remain a presentation opportunity. Actual floor-3 selection correctness is covered by the existing progression suite; the browser regression checks the real character UI and pre-floor-3 lockout.

A2.3 browser outcome: all 8 passed (41.3s), including real character-screen choice lockout, item mechanics, actual Phaser role/guardian rendering and existing two/four-client/reconnect scenarios. Screenshots: a23-enemy-roles.png and a23-crawler-development.png.

## A2.4 — Producer and Audience

Original, short Producer transmissions select confirmed chain reactions, rescues, near-death survival, deaths, discoveries, threshold crossings, bargains, boss entrances/defeats/systemic resolutions and floor transitions. Six-second ordinary-comment cooldown; critical loss/rescue/boss outcomes may interrupt. Latest line remains readable rather than disappearing on a timer. A mute control persists with settings. Audience meter displays actual authority score and net change, attributed to the earned achievement, multiple-event resolution, spotlight or quiet-round decay. Map feedback anchors actual net Audience change at a confirmed event participant where available. No client scoring or new Director rules.

Validation: full suite 544 passed, build/typecheck passed, all 9 browser tests passed (44.6s), including mute/reduced-motion persistence and engine-driven Producer reaction rendering. Additional attribution and snapshot-movement refinements verified by targeted presentation/broadcast suites. Screenshot a24-producer-reaction.png is from the actual engine/Phaser harness. Existing AI movements without explicit move events now also interpolate from confirmed snapshot deltas.

Limitations: ordinary comments can be suppressed by rate limiting; the full Transmission Log remains authoritative detail. No generated voices, remote model, paid service or new narrative dependency. Human review of repetition/tone is pending.
