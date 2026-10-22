# Alpha 3 implementation record

## A3.1 — visual language

Original 16×16 pixel recipes in apps/client/src/assets.ts generate 39 distinct crawler/enemy/guardian/object/material sprites once per Phaser scene. Asset sheet: sprite-sheet.svg, reproducible with npx tsx tools/export-sprites.ts. Objects no longer use single letters as their primary identity. Closer default 3x camera with local tactical framing, quiet fog, distinct doors/cover/pits/fragile walls and sprites for hazards. Zoom retained. Pointer conversion now uses live client-space canvas bounds and refreshed camera matrices; tested for layout/scroll/scale changes.

Validation: 549 tests passed (547 baseline + asset/pointer tests), typecheck/build passed, all 11 existing browser tests passed (53s). No simulation changes. Human visual-recognition acceptance is still unmeasured.

## A3.2 — first-run onboarding

Guidance is persisted in a versioned local profile, advances from confirmed events, and supports On/Off/Reset from title/settings. Context prompts teach quiet movement and arrival supplies, first tactical plan/Ready, defense/cover, the wet relay, inventory/progression and floor devices. Optional server-side guided Floor 1 uses existing assets/catalogs: one Turnstile Rat at the first encounter and a discharged relay connected by harmless water to a stationary Queue Warden in the next encounter. Shared geometry is decided by the host at room creation, retained in existing counters/checkpoints; guidance UI remains per-player. No new catalog entries or AP changes. Accepted actions emit a presentation receipt for teaching/recap; outcomes remain server-owned.

Validation: 553 automated tests passed, including local persistence/reset/corrupt-storage recovery and 60 deterministic guided-floor seeds with real conduction damage/stun. Build/typecheck passed. 12/13 browser scenarios passed initially; the four-crawler route fixture exposed a first-enemy placement regression, corrected to the reachable first approach. All three affected first-run/persistence/four-browser scenarios then passed. Existing untouched Alpha 2 screenshot evidence was restored; Alpha 3 tests write their own screenshots.

Still to do in later phases: progressive control disclosure, contextual defense ordering, projected plans, precise causal summaries, moments/audio and cohesive first-run playthrough. Human ten-minute comprehension is not established by automation.
