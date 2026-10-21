# THE CRAWL — preproduction package v1.0
**Date:** 2026-10-20. **Status:** PROPOSED DESIGN CONTRACT VALIDATED / IMPLEMENTATION NOT STARTED.

A private, unofficial, original-content Dungeon Crawler Carl fan-setting interpretation for a 1–4 player cooperative browser roguelite. Six floors, synchronous tactical rounds, systemic environments, an absurd broadcast Director, and permanent death with modest horizontal unlocks. This package is a build specification, **not** a playable game. It contains original material inside a deliberately recognizable fan premise; it is not an official adaptation or licensed asset pack.

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
No app, sprites, multiplayer deployment, automated gameplay simulation, or playtest outcomes are included. Books or paid RPG rules have not been copied or independently examined in full. Research references are publicly accessible descriptions, not proprietary game assets. This design package is implementation-ready as a *design contract*, but extensive development and validation remain.
