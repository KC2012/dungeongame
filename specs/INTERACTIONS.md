# Environment simulation contract

## Core principle
Implement materials and effects as orthogonal typed systems, not `if(itemId==='x')` special cases. Processing of reactions on each round is deterministic with event queue cap to avoid runaway feedback. A player must be able to inspect a tile for hazard + likely consequence.

## Material tags
`solid`, `flammable`, `conductive`, `wet`, `liquid`, `fragile`, `corrodible`, `metal`, `organic`, `opaque`, `powered`, `gas`, `ice`, `structural`, `volatile`.

## Element tags
`fire`, `water`, `shock`, `acid`, `cold`, `poison`, `blast`, `smoke`, `force`.

## Event algorithm (per round)
1. Turn player/monster commands into queued typed action events, sorted by phase, initiative, entity UUID and command index.
2. Apply direct action effects and local tile changes, enqueue neighbor propagation intents.
3. For each environment substep (maximum 4 per round), process queued intents sorted by `tileIndex`, effect-priority and sourceEntityId; dedupe an identical `(effect, tile, source, round, substep)` tuple.
4. Resolve precedence: structural collapse > liquids flow > fire/flammables > electricity/wet network > acid/corrosion > cold/freeze > poisonous gases > smoke spread. Maintain environmental cell flags, intensities 0–3, expiry round.
5. Apply tile hazards to entities occupying tiles and objects exactly once per element per phase; chained status effects can affect tiles but cannot re-trigger damage endlessly in same resolution.
6. Stop propagation after <=4 substeps and <=500 events/round; excess stays in explicit `deferredEvents` to process next round. If ceiling reached, emit diagnostic event (not silently discard).

## Interactions matrix
| Input + condition | Result | Counterplay |
|---|---|---|
| Fire + flammable | Ignites for 2 rounds; spreads cardinally at intensity>=2 to adjacent flammable | water/cold extinguish; nonflammable corridor |
| Fire + oil | Oil ignites and travels across connected oil tiles max 4/round | isolate/flush oil |
| Fire + gas | One-shot blast radius 2, destroys gas cloud, cannot recursively explode same gas tile twice | vent first; throw from cover |
| Shock + wet tile | Conductive flood fill up to 8 reachable connected wet/conductive tiles, damage 4 + intensity x2 | break circuit, leave water, insulation |
| Shock + metal entity on wet tile | +3 bonus shock damage; apply stunned | rubber armor, dry ground |
| Water + fire | Fire intensity -2, apply steam obscuring 1 round | reposition / use sight |
| Water + acid | Reduces acid intensity by 1 and spreads diluted acid 1 neighboring tile | plug valve |
| Cold + wet | Freeze tile 2 rounds, becomes slippery: movement may slide one tile | traction, fire melt |
| Acid + metal/armor | armor -2 temporarily, corrode fragile powered object | neutralizer or discard equipment |
| Blast + brittle wall | destroy wall if integrity <= blast power, drop rubble and reveal adjacent tile | alternate route; cover |
| Force + hazard | pushes target into hazard; hazard applies once on arrival | brace/shield |
| Smoke + vision | obscures LOS through thick smoke beyond one tile | wind/fan, light doesn't remove smoke |
| Poison + fire | burns poison cloud with 2-tile flash if flagged combustible | create firebreak |
| Water + powered machine | machine switches to `shorted`, creates shock at its tile unless insulated | toggle breaker first |
| Any damage + explosive barrel | barrel primes, detonates after next resolution substep unless dismantled | disarm / move away |

## Hazard properties
- Every hazard has tags, intensity, duration, tickDamage, affectedEntities, propagationMode and telegraphTag. Hazard inspect displays all six.
- No hazard can be emitted into a tile occupied by a newly joined crawler on the same resolution without an input warning and a viable exit. Boss scripted hazards must visibly mark tiles at least one turn ahead.
- Doors, blockers and walls can be damaged; any destroyed map tile triggers path and FOV recalculation.
- Liquid spreads deterministically to cardinal neighbors with lower `elevation` or equal elevation and an empty fluid level; no fluid physics simulation or real Navier-Stokes.

## Creative play / exploit policy
- Destroying optional walls allowed if critical path remains reachable; key objectives cannot be hard-destroyed unless alternate objective is offered.
- Pulling a lever with a thrown gadget permitted only if gadget has `remote_trigger` effect and target in range/LOS.
- Never permit unlimited XP, credits, Director-score or chained explosions by repeatedly toggling an inert device. Achievement events use cooldown & unique composite signature per encounter.
- Property-based tests compare random iteration order and assert identical hash/output for same seed and command set.

## Required test incident
Flood machine room; energize water; push plated miniboss into it; guard ally. Assert single conduction network, four targeted effects with logged source, no repeated chain loop, correct shield reduction, matching four-client state hashes.
