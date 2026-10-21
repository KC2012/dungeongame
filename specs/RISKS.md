# Pre-mortem and design tradeoffs

| Risk | Probability/impact | Mitigation / acceptance signal |
|---|---|---|
| Co-op planning stalls | high/high | fast movement outside combat, readiness indicators, no forced global clock, bot guard disconnected, session telemetry playtest |
| One-pass request causes incomplete imitation | high/high | agent milestones with executable gates, no placeholder completions, explicit checked issue list |
| Too much content, too little difference | high/high | author effect vocabulary first; check mechanic uniqueness and interactions, cut vanity entries |
| Authoritative hosting friction | medium/high | one-command local host and documented temporary tunnel, real cross-network smoke before claiming online |
| Loss or corruption on host restart | medium/high | atomic checkpoints, backup rotation and replay hash tests |
| Environmental chain bugs | high/high | capped deterministic queue, event dedup, fuzz tests |
| Impossible procedural layouts | medium/high | connectivity validator and template fallback; seeds in CI |
| Boss tactical unfairness | medium/high | 1-turn telegraphs, minimum counterplay, two victory routes |
| Auth/invite abuse | medium/medium | unguessable secret, input validation, anonymous local data |
| Fan IP and distribution | medium/high | original names, art and script; no public franchise labeling in build; review before sharing beyond friends |
| Unbalanced solo vs four-person run | high/medium | party-size budget, separate tuning fixtures, 1-4 bots |
| Network desync | medium/high | server authoritative, stable revisions, snapshot+event hash, duplicate rejection |
| Run too long | medium/high | 7–10 room target, adjustable animation rate, fewer mandatory combats |

## Scope emergency order
If first build is in danger: drop cosmetic particles → drop extra one-off sponsor events → drop optional room variants → defer secondary alternative endings polish. Do **not** cut authoritative multiplayer, six-floor complete play, safety/recovery, environmental systems, or bosses and still call it complete.
