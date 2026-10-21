# The Producer — achievements, audience and events

## Principle
An antagonist who *appears* capricious but follows disclosed rules. No server-side language-model calls. Announcements assembled from authored text records with event parameters and safe templates; deterministic selection by seed/event. Each broadcast offers inspectable mechanical context.

## Event pipeline
Action → typed `GameEvent` in append-only log → Achievement matcher (per-run counters) → audience-pressure adjustment → deferred offer generator. Matching happens after physics and before round-end snapshot. No achievement evaluates DOM or chat text. Use stable event and entity IDs.

## Broadcast categories
- Reactive achievement: unusual tool kill, noncombat boss solution, absurd injury, last-second rescue.
- Rating beat: floor entry, boss introduction, failed deal, comeback, map shortcut.
- Sponsor offer: safe-room item+cost choice, never untelegraphed in-combat gift.
- Contract complication: explicitly previewed optional risky challenge for higher reward.

## Achievement matcher vocabulary
`eventType`, `damageType`, `sourceTag`, `targetTag`, `minTargets`, `withinRounds`, `requiredCondition`, `oncePerEncounter`, `oncePerRun`, `audienceDelta`, `rewardPool`, `messageKey`. Prefer a constrained declarative condition format. If anything requires arbitrary JS in JSON, reject it.

## Audience fairness
- 0–100 meter; at 25/50/75 deferred event offers show at safe-room entrance. Not forced.
- A `spotlight` ledger throttles rewards if one player received two major rewards in a row; others get priority. Cooperative achievements share social recognition even if one inventory item assigned.
- Event offers show exact risk (e.g., +1 elite pack on next floor), benefit and expiration. Declining has no secret penalty.
- Repeated event signatures earn audience delta only once per encounter; four duplicate conduct-water kills cannot farm unlimited rewards.
- Do not spawn enemies inside currently seen safe room. The Director is never allowed to override validated player commands or change completed rolls.

## Examples of original in-game lines
- **Improvised conductor:** “An electrical engineer has filed a complaint. We will be ignoring it.”
- **Paperwork victory:** “Form 12-B has defeated an armored security unit. Our accountants request a rematch.”
- **Heroic assist:** “Against every contractual expectation, somebody helped somebody else.”
- **Accidental detonation:** “Damage to company property will be deducted from your theoretical wages.”
- **Final floor:** “Congratulations. You have advanced to the part of the process designed to terminate the process.”

## Content restrictions
No recreations of famous novel announcements, recurring copyrighted personalities, invented quotes attributed to franchise authors, real-world slurs or hateful stereotype punchlines. Log accessible and screen-reader readable; audio optional.
