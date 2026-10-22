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
