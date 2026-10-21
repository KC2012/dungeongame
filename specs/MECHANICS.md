# Mechanical specification — normative v1

All values are starting **proposed** balance constants, not playtested. Content data can override them only through typed modifiers. Implement one pure reducer `resolveRound(state, commands, rng) -> {state, events}` used by server and headless tests.

## Grid and visibility
- Orthogonal square grid, 4-way movement by default. Diagonals disallowed for movement and melee; LOS ray can cross diagonal tile centers using supercover grid algorithm. No corner shooting through two solid adjacent walls.
- Every crawler has facing only cosmetically; no facing damage bonus. Basic sight radius 8 tiles, obscured by solid walls or thick smoke; explored tiles retained in party fog-of-war. Dark rooms reduce radius to 4 without light source. Allies share explored tiles, not current enemy positions unless spotted by one ally (server visibility mask).
- Move one tile costs 1 AP (terrain: rubble +1 AP; water +1 AP unless amphibious; moving through ally permitted if their *resolved* endpoint clears it). Occupied solid tiles prohibit final placement.
- Door open: 1 AP; close: 1 AP; locked doors require key, 2 AP lockpick skill check or destructible tile.

## Turns (phase machine)
`LOBBY -> EXPLORATION -> PLANNING -> RESOLVING -> [PLANNING|SAFE_ROOM|RESULT]`.
- To avoid needless micro-turns, while no enemy is alerted and no active timed hazard is present, party can explore using short commands as immediate **server-confirmed micro-actions**; exploration actions still advance world tick and can trigger traps. First hostile detection or environmental threat shifts to combat planning before attacks occur.
- In combat each alive crawler receives 3 AP, 1 reaction, with 0 unused AP carrying over. Commands are queued locally as up to 3 AP of intentions; no player executes anything until all active connected players Ready, or the host invokes `Force Ready` after seeing 45 seconds of no response (host-forced wait commands apply to unready). No timer by default otherwise. Disconnect autopilots guard after 30 seconds offline. The actor can unready and edit until commit.
- Command envelope `{runId,round,actorId,nonce,actions:[...]}`. Validate AP, inventory, targets, visibility, reach, phase and monotonic nonce server-side. Invalid actions become WAIT for the **specific invalid action**, report reason and refund its AP from initial planning budget; no rerouting to an alternate target.
- RESOLUTION: (0) snapshot accepted commands; (1) status start-of-round upkeep and DOT; (2) initiative ordering; (3) movement one step per queued movement action for all actors in initiative order, collision rules; (4) non-movement actions in initiative order while AP remains; (5) environmental propagation in fixed priority; (6) enemy AI takes its per-round AP actions in initiative order using resulting state; (7) end-of-round duration timers, boss clocks, downed/death checks, achievements, floor transitions; (8) append event log and deterministic state hash.
- Initiative = `10 + Finesse + speedMod + seeded d6`, newly rolled once each round for every entity; ties resolved by immutable actor UUID ascending. Players and enemies are resolved in phases as above (enemy intentions telegraphed from previous round); enemy attacks always occur in phase 6, so no hidden enemy attacks mid-player queue.
- Simultaneous movement collisions: first successful initiative claimant enters contested cell; losing move consumes 0 AP and becomes WAIT; swaps between allied actors allowed only if both issued explicit swap target and edges do not cross hazards; enemy/crawler swap prohibited. Explicitly do not allow stacking.
- Reactions (block, overwatch) set as actions costing 1 AP, trigger during enemy phase at most once; no infinite interrupts.
- Newly discovered hostile during exploration cannot attack until players receive at least one PLANNING phase (no surprise damage). Boss telegraphs one full round ahead.

## Combat
- Attributes start at 2 each; background distributes +2 in one attribute, +1 in another, -1 in one, minimum 1 maximum 5 before floor-3 choices. Level maximum 8. HP max = `20 + 4*Might + 4*(level-1)`; Focus max = `5 + 2*Wit`; each round recover 1 Focus if not using a special ability; two-item hotbar plus inventory.
- Normal attack costs 2 AP; light weapon 1 AP but -2 base damage. Melee range 1 orthogonal; ranged weapon nominal ranges 4–8 depending catalog; firing line must have LOS.
- Accuracy percentage = clamp(10,95, `70 + 5*(Finesse-2) + weaponAccuracy + targetStatusModifier - 8*coverLevel - 7*rangeBeyondOptimal`). Critical occurs if hit roll <= `5 + weaponCrit` (maximum 25), multiplies raw pre-armor damage by 1.5 rounded down.
- Damage = max(1, floor((baseDamage + Might melee or Wit tech modifier + affixes + seeded d4) * critMultiplier) - armor - resistanceFlat); damage type physical/fire/shock/acid/cold/poison/psychic; immunity is explicitly defined as resistance 999, not conventional armor. Cover levels 0/1/2 penalize hit only; solid cover blocks LOS.
- Defense: reaction `guard` +2 armor through enemy phase; `dodge` +20 accuracy penalty against one next attack; shield blocks 3 physical damage until next round. All defenses are bounded and distinct.
- Attack into adjacent ally is prohibited by target validation, but line/cone/AoE and conductive hazards can affect allies. Friendly fire is ON for environmental damage and explosives; direct targeted attacks on allies OFF. Warn UI before confirming an area action projected to hit allies. Never require griefing.
- Damage types have statuses: fire = burning 3 for 2 rounds; acid = corroded -2 armor 2 rounds; cold = chilled -1 move AP next round; shock = stunned -1 AP next round, no full stunlock; poison = 2 DOT for 3; psychic = confused: -15 accuracy one round. Same status refreshes duration, does not stack potency; exceptions explicit in catalog.
- Knockback pushes one tile per magnitude until blocked, takes 2 collision damage per stopped tile, falls into pits only if pit tile exists, no off-map displacement.

## Core stats and advancement
- Entire team earns XP from encounters/objectives/reveals; thresholds at cumulative [0,20,45,75,110,150,195,245] for levels 1–8. No XP from endlessly summoned enemies after first spawn per room.
- At each level all living crawlers choose one of three offered talents (from eligible catalogs), no duplicate nonstackable talents; +4 max HP automatically. On floor 3 saferoom pick 1 profession and 1 adaptation. If already dead, no new picks.
- Skill challenges: d20 + relevant attribute + skill rank(0..3) versus DC 10 standard, 14 hard, 18 very hard. Natural 1 automatic failure and 20 success; challenge attempts cannot be infinitely repeated on same object: failure changes state (`jammed`, `alert`, `spent`) unless specific renewable affordance.

## Loot, trade, crafting
- Currency `credits`; floor boss grants team credits. Items have weight and stack sizes. Inventory 10 slots, carry limit = `10 + 3*Might` weight. Equipment slots weapon, armor, trinket x2, offhand; one-use kits do not require equipped slot. Crafting only at saferoom or with portable bench, spend recipes/components and 2 AP during exploration.
- Loot piles: ownership-neutral, but in multiplayer manual pick-up has deterministic claim order and item is removed atomically; bosses use an explicit round-robin pick draft or `give to` choice. Player may freely pass.
- Saferoom rest recovers 35% max HP and all Focus, clears most short statuses but **not wounds**; service medic heals one wound at cost scaling by floor. Each saferoom permits one full rest per floor, stopping rest-spam.
- Vendor stock seeded per run/floor from tier weights, rerolls prohibited for free. Shop pricing = `basePrice * (1 + .10*(floor-1))` rounded up; selling 40% current nominal price. Limited inventory prevents farming.

## Downed/dead edge cases
- At first zero HP: downed for remaining 3 full round boundaries; downed has no AP, remains targetable, may be stabilized by another crawler with 2 AP adjacent and a medkit consumed, returning with ceil(0.2 * max HP) and one `wound`. If no kit, healer talent may revive; all such rules consume action.
- Second zero-HP down before the next rest, or countdown expires, causes DEAD. Dead is permanent for the run, corpse loot can be recovered by teammates unless destroyed. If a downed player's cooldown reaches 0 after enemy phase, allied planned revival must have been resolved already that round.
- If all crawlers are downed and no allied action remains to revive, defeat immediately; no interminable three-round countdown. A disconnected player remains an actor for that run and can be revived.
- A player's logout never kills their character. A crawler who stays disconnected >5 minutes guards while combat continues; host can park them at the safe room on entry. Dead players can watch and ping but never receive XP/loot.

## Director pressure and balance
- Audience score 0–100. Novel systemic kills +8, multi-element combos +5, repeated spam +0, heroic rescues +4, safe boring turns -1 after 5. Thresholds at 25/50/75 unlock **choice of** discretionary risk/reward events at saferoom; never spawn untelegraphed instant-death hazards.
- Every run has at least 1 heal source per 3 mandatory encounters per active player; boss rooms always spawn appropriate counterplay object(s). Large team enemy HP scaling `1 + .32*(players-1)` and mob pack count `base + floor((players-1)/2)`; no percentage scaling to instant-kill status effects.

## Win
Floor-6 climax objective: destroy or reroute the Signal Engine over 3 telegraphed phases. After final condition satisfied, show survivors, memorial, favorite achievement, run seed, turns, duration, and unlocked content. Only server may mark victory; reconnect never duplicates it.
