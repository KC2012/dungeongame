# Six-floor design and generation grammar

## Generator shape
Room sockets assemble an abstract directed graph: entry → 5–7 mandatory rooms → saferoom → objective/boss → exit. Insert 1–3 detours with keys/caches/contracts; insert 0–1 secret per floor. Avoid infinite corridors. Place prefabs using rotations limited to 90-degree increments with matching door sockets. Carve corridors between sockets using randomized A*, then decorate from biome palette and place encounter assets based on point budget.

## Mandatory validations (run before revealing seed to player)
1. Entry to exit connected when initial door/key mechanics respected.
2. Every required key reachable before first lock; optional secret keys not part of objective route.
3. Every miniboss/boss arena has exit/revival space, cover or environmental counterplay.
4. Every door has accessible interact tile and required facing/adjacency; no spawn in walls/liquids/hazards.
5. Team spawn has >=4 safe separate tiles and first hostile begins beyond sight radius or behind telegraph.
6. No mandatory route through unavoidable lethal damage (with inventory-free initial party).
7. Number of events and map objects bounded; 100 deterministic seeds per floor in CI, 10,000 overnight.
8. If generation invalid after 20 attempts, use a hand-authored fallback layout and log seed + diagnostic; never ship broken floor.

## Key pacing
Each floor includes one *safe* room on initial route, floor-specific hazard tutorial/counterplay, two optional risk branches, 1–2 lore/choice moments, and a boss with two mechanically distinct win conditions. Enemy budget `base=[8,12,16,20,24,28] + 3*(livingPlayers-1)` encounter points split into packs; elites cost 3; fodder 1; boss excluded. Loot heals scale to surviving players, not starting player count. Boss difficulty not simply +HP.

## Floor 1: INTAKE — tutorial and believable bureaucracy
- Visual: cracked orientation halls, emergency lights, vending, pipes.
- Objective: recover 3 registration stamps scattered across two reachable branches; scan at gate; optionally hack scanner with Wit DC14.
- Introduce: 3 AP, LOS, ally moves, water+electricity, explosive cover, inspect.
- Boss: **The Compliance Marshal**, shielded automaton. Win by defeating it OR making it stamp its own termination form (pull counterweight + hack printer); every attack signaled.
- Saferoom: gain first talent, repairs, small sponsor offer.

## Floor 2: RECLAMATION — environmental economy
- Visual: recycling belts, industrial crushers, volatile bins.
- Objective: clear 2 of 3 processing contracts to receive descent token.
- Introduce: acid/metal, conveyors, corrosion, traps, consumable crafting.
- Boss: **Pallet King**. Defeat normally OR feed its reactor three correctly sorted objects; wasteful shortcuts fuel spectator hazard budget.

## Floor 3: ADAPTATION EXPO — identity moment
- Visual: bioexhibit booths and malfunctioning cosmetic chambers.
- Objective: earn entry via exhibit trial and select a profession + adaptation in saferoom, with explicit preview and confirmation.
- Introduce: transformation movement/resistance rules; profession synergies; NPC bargains with mutually exclusive costs.
- Boss: **The Specimen Curator**. Fight its articulated cage OR disable three restraint generators using environment/skill interactions.

## Floor 4: TRANSIT AUTHORITY — space and timing
- Visual: rail lines, maintenance platforms (top-down), rotating doors, scheduled power pulses.
- Objective: energize two substations to call a lift; either substation can be accessed by combat, repair or reroute.
- Introduce: rhythm-like telegraphs but purely turn-based; switching track segments, line attacks, moving obstacles.
- Boss: **Schedule Warden**. Kill within hazard cycle OR alter dispatch tables to have a service train remove it; no unavoidable timing puzzle.

## Floor 5: DEBT MARKET — pressure and choice
- Visual: debt stalls, secured vaults, predatory clerks.
- Objective: obtain three of four evidence tokens through infiltration, exchange, combat or faction favors.
- Introduce: contracts, discounts, coerced sponsorship, limited healing and harder crowd control.
- Boss: **The Receivables Choir**. Destroy its linked nodes OR expose transaction fraud by assembling two records from reachable rooms; broadcast pressure affects offers only, not hidden combat dice.

## Floor 6: SIGNAL CONTROL — final escalation
- Visual: transmitter coils, broadcast control, unstable conduits, theater seats.
- Objective: disable the Signal Engine across three clearly displayed phases: power feeds, transmitter array, Producer uplink.
- Phase each telegraphs 1 round before attacks; midfight saferoom substitute is one emergency supply cache, not a complete rest.
- Final boss: **The Signal Engine**. Win by damage+survival OR by redirecting three grounded cables and authenticating the kill-switch using Wit/gear; hybrid solutions valid.
- Ending reflects boss route and saved allies. Clear credits, epilogue, scorecards, possible unlocks.

## Rooms
`content/rooms.json` specifies floor affinity, socket count, encounter theme, props and solution opportunities. Rooms are *semantic prefabs*: renderer builds recognizable arrangements and rotates layouts; template definition is not just a name. Use `layout` 9×9 ASCII tiles (`#` wall, `.` floor, `~` liquid, `+` closed door, `^` hazard, `o` object, `c` cover), with `N/E/S/W` doors represented by socket metadata, then build a larger map by stitching.

## Encounter director budget
- Strong fights preceded by noncombat or optional cache; floor aggression raises pack behavior and elite chance, not unavoidable encounters.
- Spawns scale for 1–4 alive participants. Special summons give no repeated XP.
- Rare branches cannot gate survival-critical objects behind a single profession.
