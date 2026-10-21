# AGENTS.md — autonomous development instructions

You are implementing the complete six-floor tactical co-op roguelite defined in this repository. This is a game, not a mockup, and a working interface is not evidence the underlying mechanics work.

Read in order: README.md, DECISIONS.md, specs/MECHANICS.md, specs/INTERACTIONS.md, specs/MULTIPLAYER.md, specs/ARCHITECTURE.md, specs/DUNGEON.md, specs/CONTENT_RULES.md, specs/TESTING.md, specs/ACCEPTANCE.md, content/manifest.json, IMPLEMENTATION.md.

## Guardrails
- Preserve deterministic pure core; multiplayer server is authoritative.
- Consume JSON catalog. Do not replace content with static labels or silently omit entries.
- Build genuine multiplayer from the beginning (one local single-player mode is a server room with one human).
- Keep versioned durable saves; never overwrite a corrupt file or migrate without backup.
- Use original art and dialogue; no copyrighted novel text or characters, no paid external tools.
- Make every interactive button functional or explicitly unavailable; no mock controls.
- Test each module, run automated suites and record actual test commands/results.
- If API versions differ from docs, verify installed package APIs; pin versions; report adaptation.
- Log and explicitly disclose unfinished issues, no fake completion. Never claim cross-network successful unless tested over actual separate internet connections.
- Keep commits scoped to milestones with short descriptions, and maintain `CURRENT_STATE.md` with exact tests, blockers, feature completion, and version.

## Definition of success
`PLAYABLE_RC` requires EVERY gate in specs/ACCEPTANCE.md. User wants one coordinated build effort; avoid interruptions for nonblocking aesthetic choices, use DECISIONS.md defaults. Stop only for unavailable credentials/access or a fundamental uncrossable architectural issue; otherwise choose best documented alternative and continue.
