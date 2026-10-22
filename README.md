# THE CRAWL — The Concourse

**ALPHA 2 · 0.2.0 · LOCAL_ALPHA.** An implemented, server-authoritative six-floor tactical browser co-op game for 1–4 crawlers, based on the original design package below. This is an unofficial private fan-setting interpretation with original playable characters, writing, floors and procedural pixel art.

```sh
npm ci
npm run build
npm run host
```

Use Node.js 22+; commands run from the repository root. The default host binds loopback port 2567. Create or join a private room in a desktop browser. No accounts, paid services, public deployment or tunnel are required.

Alpha 2 makes confirmed combat, environmental reactions, enemy roles, boss danger and Audience feedback visible in the dungeon. See [Alpha 2 delivery, evidence and limitations](docs/ALPHA2.md).

See [local hosting and controls](docs/HOSTING.md), [current implementation and actual test evidence](CURRENT_STATE.md), [known issues](docs/ISSUES.md), and [acceptance comparison](docs/ACCEPTANCE_REPORT.md), and [local release contents](docs/RELEASE.md). `PLAYABLE_RC` is not claimed: separate-network testing and human balance/accessibility acceptance remain required.

Development commands: `npm run dev`, `npm run validate:content`, `npm test`, `npm run e2e`, `npm run typecheck`. The original Python validator and 11 preproduction tests remain available. All 448 authored records are loaded; compilation coverage and actual tested action paths are reported separately.

## Original design contract

The documents and catalogs below define the game's rules and initial proposed balance. They are retained for traceability; the original preproduction status is superseded by CURRENT_STATE.md. They do not establish that every release gate has been passed.

## Read in order
1. `DECISIONS.md` — scope and hard decisions.
2. `research/RESEARCH.md` and `research/MECHANIC_TRACEABILITY.md` — verified references and traceable adaptations.
3. `specs/GAME_BIBLE.md` and `specs/SETTING_COMPATIBILITY.md` — setting boundaries, game pillars, loop, floor-by-floor experience.
4. `specs/MECHANICS.md` — executable rules in prose (source of truth for calculations).
5. `specs/INTERACTIONS.md`, `specs/EFFECT_ENGINE.md` — environment and all effect-primitives/contracts.
6. `specs/DUNGEON.md` — generation constraints and six-floor progression.
7. `specs/DIRECTOR.md`, `specs/EVENT_CONTRACT.md` — achievements, pressure, hooks, rewards and fairness.
8. `specs/MULTIPLAYER.md`, `specs/DEPLOYMENT_RUNBOOK.md`, `specs/ARCHITECTURE.md`, `specs/UI_UX.md`, `specs/CONTENT_RULES.md`.
9. `content/*.json` — unique IDs and structured content entries, intended for direct consumption after schema validation.
10. `schemas/*.json` — draft-07 JSON Schemas; `tools/validate.py` checks schemas and reference integrity.
11. `specs/TESTING.md`, `specs/ACCEPTANCE.md`, `specs/RISKS.md`.
12. `AGENTS.md`, `IMPLEMENTATION.md`, `CURRENT_STATE.md`, `prompts/CODEX_HANDOFF.md`.

## Locked decisions
- Combat: simultaneous cooperative planning, deterministic server-ordered resolution; **not** real-time attacks.
- Play: one to four people on separate computers in a shared online room, solo also supported.
- Release: six-floor complete run with final victory or defeat; 75–120 minutes desired for an experienced group (a balance target, not a verified estimate).
- Art: low-resolution top-down tiles and distinct readable icons, no dependence on AI art, no licensed sprites.
- Private/noncommercial, but no assumption that nonprofit guarantees an IP exception.

## Design-data status
- All JSON records are authored design proposals, **not** playtested balance.
- Every ability, item, monster, achievement and hazard maps to a deliberately small named effect/AI vocabulary. The code must implement the **vocabulary**, not bespoke per-item scripting.
- If the catalog count contradicts aspirational numbers mentioned in earlier discussion, this repository's exact records define the implemented scope. Do not generate filler to hit marketing targets.
- An acceptance gate prevents claiming COMPLETE while mechanics, content, reconnect, boss logic, and four-client tests are missing.

## Run validation
`python tools/validate.py` from repository root. Requires Python 3; optional `jsonschema` package to run formal schema checks, with built-in integrity checks always available.

## Honest limits
The original package contained no app. The current local alpha includes the app and automated simulations; no public multiplayer deployment or human playtest outcomes are claimed. Books or paid RPG rules have not been copied or independently examined in full. Research references are publicly accessible descriptions, not proprietary game assets. This design package is implementation-ready as a *design contract*, and human balance and external acceptance remain required.
