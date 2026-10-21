# Quality-assurance specification

## Mandatory automated layers

### Schema and data validation
- Every catalog JSON syntactically valid; unique IDs; known effect/status/material/AI type; valid ability references; bosses defined per floor; reachable room quotas; no dead content references.
- `python tools/validate.py` must pass before implementation starts and be integrated as `npm run validate:content` after implementation.

### Unit reducer tests
- Seeded RNG reproducible across process restarts and OS.
- 3 AP budget, no negative resources, invalid action/refund, max ranges, supercover LOS, no corner shot, terrain move costs, concurrent tile claims, player swaps, elite scaling.
- Damage exact expected result for hit/miss, crit, mitigation, status and cover; no `NaN`, HP <= max, death transitions once.
- Environmental queue respects priority, max 4 substeps, 500 event budget, no duplicate damage on same tile/element in one tick, no unbounded chain reaction.
- Revive once per floor, second-down death, expired down timer, all-downed wipe, party XP share and achievement idempotency.

### Property / fuzz tests
- >=100 seeds/floor per PR. For each seed assert objective accessible, equipment never spawns off-map, 4 safe initial spawn tiles, required keys before locks, boss counterplay reachable, all tiles valid, no isolated mandatory room. Overnight >=10,000 seeds/floor.
- Random generated commands for 10,000 rounds: no reducer throw, no negative inventory/count, no non-terminating event chain, no reused reward transaction.
- Deterministic replay: same seed+input sequence yields identical serialized state hash across independent processes. Mutate one command and assert hash differs when state effect expected.

### Integration networking
- Two and four real browser sessions via Playwright: join, ready, all clients see same canonical revision, item picked once, invalid command rejected, loot assigned once, disconnect and reconnect, restart and resume.
- Host client leaves → reassignment; host **server** process ends → all clients pause, not migrate to another host. Resume checkpoint when server comes back.
- Malformed payload >32KB, invalid invite, wrong version, stale nonce, forged actorId, unknown effect, malicious nickname rejected safely.

### Structured gameplay bot
- Headless bot can complete all six floors with built-in debug command assistance (not cheat mode exposed to public) for 100 deterministic test seeds, invoking boss alternate victory paths on at least 10.
- Run early critical incident: flood generator, apply current, shove enemy, guard ally, validate visible chain and one achievement.
- Never claim realistic player win rate on bot results; humans play differently.

### UX performance
- 4-player online smoke with actual remote tunnel, different machines/networks; simulate 250ms RTT, 3% packet loss, tab hidden, reconnect, host sleep; explicit recovery feedback.
- Viewport 1280×720 and 1920×1080, keyboard-only accessibility smoke, text legibility, no clipping; 30 minutes play while monitoring memory; 100% interactive visible controls either function or are disabled with explanation.
- Track median and p95 turn-resolve times; target p95 <200ms for 4 players + 50 enemies on a standard desktop, excluding network animation. Record actual hardware.

## Gold scenarios (deterministic fixtures)
1. **Electric water**: wet tiles chain 8 max, metal target extra damage, dry ally safe.
2. **Destroy the wall**: blast opens route, path and FOV refresh.
3. **Team collision**: two move into same tile; initiative tie resolved actor ID; one remains, no stack.
4. **Falling friend**: downed timer 1, healer acts this round, survives; without healer death after round.
5. **Paper victory**: floor-1 alternate boss resolution requires actual interacting devices; grants same floor transition as combat.
6. **Replay duplicate**: resend `SUBMIT_PLAN`, `PICK_REWARD`; no duplicate inventory or achievement.
7. **Mid-boss restart**: snapshot restores telegraph countdown, HP, RNG and player plans without reroll.
8. **Difficult seed**: every floor route remains navigable with all optional doors locked.
9. **Offline friend**: disconnect during ready phase; active players can progress safely and reconnect later.
10. **Finale**: all six floors, credits then no extra resolution or duplicated unlock.

## Defect thresholds
P0/blocker: crash, lost save, inability to join, duplication, false victory, unpassable floor, infinite loop, major gameplay system inert. P1: significant combat imbalance, misleading warning, UI inaccessible, routine desync. P2: minor UI polish, rare cosmetic effects. No P0 or P1 for `RELEASE_CANDIDATE` label.
