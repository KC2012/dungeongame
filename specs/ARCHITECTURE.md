# Technical architecture and repository layout

## Stack
TypeScript monorepo; Phaser 3 client renderer with pixel-perfect integer scale, CSS/DOM overlays; Colyseus Node server for authoritative rooms + typed messages; optional rot.js for map utilities; Vitest for pure logic; Playwright for multi-client browser smoke; JSON Schema validator via Ajv or Zod wrappers; optional SQLite only after file-based save tests. Pin versions at initialization and commit lockfile. Do not automatically install bleeding-edge incompatible versions.

## Proposed directories (for Codex-generated implementation)
```
/apps/client/src/{scene,ui,input,assets,network,accessibility}
/apps/server/src/{rooms,auth,persistence,routes}
/packages/engine/src/{state,command,turn,grid,rng,combat,effects,ai,environment,generation,achievements,loot,serialization}
/packages/content/src/{loader,definitions,validation}
/content/*.json
/tests/{unit,properties,simulation,integration,e2e,fixtures}
/docs/{mechanics,runbooks}
```

## Import firewall
- `engine` is pure, headless TypeScript: no DOM, Phaser, Colyseus, Node fs, Date.now, nondeterministic RNG, network calls. Reducers receive all needed data explicitly.
- `content` loads JSON into immutable validated catalogs, then `engine` consumes typed structures.
- `server` owns all mutation, RNG seed, rounds, saves; translates Colyseus transport into domain commands. Avoid coupling engine state to Colyseus schema classes; publish projections/deltas through adapter.
- `client` renders state snapshots and event log, plans commands; may perform path previews but not combat authoritative rolls.

## State model (`GameState` minimum)
```
{schemaVersion, contentHash, runId, seed, rngState, floor, revision, round,
 phase, audience, activeModifiers, objectiveFlags, world:{tiles,rooms,doors,hazards,objects,fog},
 actors:{byId:{id,kind,position,stats,hp,focus,ap,inventory,equipment,statuses,downedRounds,online}},
 party:{playerSlots,sharedXP,levels,choices,lootDraft,credits},
 encounter:{entities,alerts,telegraphs,spawns},
 director:{achievementCounters,earnedIds,spotlightLedger,pendingOffers},
 events:{nextId, tail}, timers, lastCheckpoint}
```
All keys stable, canonical ordering for serialization. Each turn returns immutable new state or structured patch and list of typed events; replay from seed + recorded player inputs must yield bit-for-bit same checksum.

## RNG determinism
Choose documented PRNG xoshiro128** or mulberry32 with explicit integer seed, independent named streams `generation`, `combat`, `loot`, `director`, `cosmetic`; cosmetic RNG never advances gameplay streams. Save generator states after every round. Never use floating-platform-sensitive physics.

## Content ingestion
Load/validate all JSON once at server start and bundle curated client names/descriptions. Reject unknown IDs/effects before server begins accepting lobbies. `contentHash` guards against loading old save with changed content definitions. Add a migration layer and backup first.

## Rendering
Use internal 320×180 or 480×270 reference resolution scaled integer nearest-neighbor; 16px tile art. Render camera viewport scaled for desktop; sidebar DOM HUD not constrained to low resolution. Subpixel movement prohibited; outline sprites for faction and status. If art asset missing use deterministic generated geometric glyph sprite, not an emoji fallback. Sprite atlases optional; procedural sprites built from simple pixel primitives are acceptable for v1 with consistent visual grammar.

## Audio/accessibility
Small synthesized UI tones and environmental cues optional; volume slider, mute, reduced flashing, colorblind-friendly shape codes, adjustable log text size and contrast, keyboard navigation and explicit hover descriptions. Never depend on color alone for hazard prediction.

## Local developer experience
`npm install`, `npm run dev` starts server+client locally, `npm run test` runs unit/integrity tests, `npm run e2e` launches multi-client browser tests, `npm run build` outputs single server + static web client bundle, `npm run host` starts a private game and prints localhost URL. No paid SaaS, API keys or external database mandatory.

## External access
`cloudflared tunnel --url http://localhost:PORT` makes a temporary URL for a test session; tunnel is not embedded or secretly launched. Runbook must clarify tunnel install, changing invite links, PC must remain on, reachable IP path, Windows firewall, and that Quick Tunnels are intended for testing only.

## Production resilience
State delta rate limited (events/round, not frame-by-frame), full snapshot on reconnect. Secret mismatch rejects joining; version mismatch suggests refresh. 30k rounds headless soak for leaks. Peak 4 players/50 enemies/200 tiles with status effects should resolve <=200ms on baseline modern laptop (measure, report baseline); not a claim of observed performance.
