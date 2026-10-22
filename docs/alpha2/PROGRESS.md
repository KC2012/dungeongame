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
