# Effect interpreter — exact primitive contracts

Every JSON effect is validated at loading. Every call receives `(state, casterId, targetRef, effect, context, rngStream)`. Returns a new state plus ordered `GameEvent[]`. TargetRef is actor ID or tile; `party` means living party members. For each effect type, precondition errors are `UNAVAILABLE` with AP handling per MECHANICS; no effect may silently do nothing after a successful cast except a resisted/missed attack with a combat-log entry.

## Offensive / tactical effects
- `damage`: `magnitude` is base weapon/ability damage and uses standard damage procedure (accuracy, crit, mitigation) unless effect has `guaranteed:true` (environment only). `area` requires radius (default 1) and hits allies for environmental/explosive element. Nonzero elemental attacks apply designated status only where effect specifies status or environmental tag does so; no ad hoc double statuses.
- `shield`: adds temporary barrier equal to magnitude, capped at 12 per actor, expires after enemy phase; shields from the same source refresh, not stack. Target party applies all living party members at higher Focus/AP cost as listed.
- `guard`: adds guard armor magnitude for remainder of round; reaction if source action establishes `reactionGuard`.
- `push`/`pull`: forced move magnitude tiles toward/away from actor, one at a time through hazard events. Immovable/boss target max push 1 unless exposed; cannot move through walls.
- `dash`: player-defined path up to magnitude tiles, respects walls, occupancy and hazards; every tile traversed triggers hazards.
- `teleport`: relocate up to magnitude orthogonal tiles, requires visible vacant end tile; crossing walls allowed, arrival hazards trigger, no targeting through locked scenario walls for objectives.
- `apply_status`: status must be enumerated and not implied by name; magnitude indicates potency (1 typical), duration defaults 1 when absent, source tracked, refresh policy in MECHANICS.
- `set_trap`: spawn invisible-to-enemy / visible-to-party trap with magnitude damage or control charges; capacity max 3 owned traps per caster, oldest removed when replaced.
- `create_cover`: create cover occupying target tile, durability 6+magnitude*2, cannot block only mandatory route. Only valid on empty reachable tile.
- `taunt`: marks a target or area; enemy AI targets caster preferentially if caster reachable, does not override immune boss scripted objectives.

## Objects and physical world
- `spawn_hazard`: place an indexed hazard at visible target tile (or area radius default 1), using effect.element matched to hazard archetype. Instantiation has duration default 2, intensity clamps 1–3; follows INTERACTIONS.md.
- `destroy_tile`: apply magnitude as structural damage to adjacent wall/prop tile; if HP <=0 convert to rubble, recompute grid connectivity.
- `disable_machine`: disable powered target machine for two rounds or until reactivated; contributes exactly one typed objective event for newly disabled mechanism.
- `hack`: skill roll vs target DC; success changes exact machine/door/object state and produces `machine_hacked`, failure produces `hack_failed` + jam/alert, not repeated until reset.
- `repair_object`: restore target repairable object's structural integrity by magnitude, cannot heal actors or fabricate supplies.
- `enable_crafting`: mark deployed bench available only while tool held/placed, crafting uses ingredients and a recipe, not a resource generator.
- `craft_component`: non-activatable material consumed exclusively by recipes; validator recognizes it as functional ingredient rather than an actor cast.
- `conjure_object`: spawn precisely named permitted object from whitelist, max 1/caster/encounter, cannot create quest flags or currency.
- `summon`: deploy approved minion variant tagged as no-XP/no-loot, max 2/caster; lifetime 3 rounds.

## Knowledge, resources and recovery
- `reveal`: reveal target/area hidden objects and resistances within magnitude tiles; does not reveal fogged hostiles across walls, cannot bypass boss phase.
- `heal`: restore HP min(maxHP,currentHP+magnitude), not wounds. Self/ally/party target rules enforce range. Emergency Bandage has Focus cost and must not give infinite net healing during exploration: requires `medicalSupplies` charge or only usable when an alerted enemy is present. The same constraint applies to free direct-heal abilities.
- `revive`: target must be DOWNED, within adjacency and 3-round window, caster spends 2 AP plus one medkit unless effect has `freeMedkitRevive:true`; once per target per floor. Returns target at 20% HP and one wound.
- `cleanse`: remove up to magnitude listed removable statuses; wound only removed if effect has `clearsWound:true` and consumes wound seal.
- `gain_resource`: explicit resourceKind `focus|credits|scrap|medicalSupplies|audience`; normal resource gain on skill activation restricted to once per floor if currency-like; defaults to focus only for medical/stamina items. Credit-generation ability once/floor as catalog.
- `modify_stat`: requires `stat` key or a `passiveTag` resolved from a named `traitModifiers` table; duration specified or permanent while equipped. No generic arbitrary multiplier and no auto-trigger on non-equippable material.
- `modify_audience`: exactly once per qualified Director event or once/floor usage tag; clamp 0–100, cannot trigger recursive achievements from its own update.
- `trade`: safe-room trade/vendor context only, unique `(seller,buyer,item,transactionId)` atomic operation; must not create new item/currency or stack discount after same action.
- `grant_item`: requires catalog item ID and source reward record, granted once per reward transaction, cap inventory or send to safe-room overflow chest; never lost silently.

## Allowed elemental/status defaults
- Fire → burning on direct hit if explicitly `status` or attack flag `ignite`.
- Shock → stunned only if source lists stun (not every shock damage instance).
- Acid → corroded if acid intensity>=2 or explicit status.
- Cold → chilled from hazard intensity>=2 or explicit status.
- Poison → poisoned from hazard or explicit status.
- Physical/blast/force/water/smoke/psychic do not automatically inflict status without a tag.

## Effect data normalization step
The current authored catalog provides named `trait`/`passiveTag` shorthand and often only `{type,magnitude,target}`. **M0/M3 must compile this shorthand to the exact runtime shape**, e.g. passive `fire_ward` → `{type:'modify_stat',stat:'resist.fire',magnitude:2,trigger:'equipped'}`; `pull` weapon → attach `{type:'pull',magnitude:1,target:'enemy'}` on successful attack. This compiler is not yet implemented; do not pretend each catalog already supplies all triggers/durations/stat paths. The compiler must be exhaustive, with unit tests for every distinct shorthand trait.

## Named trait mapping (required)
`reach`:+1 melee reach; `bleed`: poisoned-like physical DOT 2x2 rounds; `breach`: structural +4; `machine`: hack +2; `pin`: slowed 1 round; `loud`: adjacent packs alert; `armor_pierce`: bypass 2 armor; `pull`: pull 1; `conductive`: shock uses wet network; `battery`: consumes 1 charge, +2 damage; `corrode`: apply corroded; `ignite`: burning; `freeze`: chilled; `fragile`: item loses 1 durability every 3 attacks; `ricochet`: one bounce to second enemy half damage; `cloud`: hazard radius 1; `line`: continue to one target beyond; `push`: push 1; `stun`: stunned; `fire_ward`:+2 fire resist; `poison_ward`:+2 poison resist; `cold_ward`:+2 cold resist; `insulating`:+4 shock resist; `heavy`:-1 speed, +1 armor; `metal`: conductive tag; `regrowth`: +1 HP at start of every third round; `knockback_resist`: ignore first forced move per round; `accuracy`:+5 percentage points; `dodge`: attackers -10 hit chance; `taunt`: start encounter with +1 threat; `braced`: guard +1; `discount`: shop prices -5% once; `spotlight`: +2 audience on first qualifying event/room; `stealth`: enemy sight -1 against holder; `revival`: medical kit consume -1 once per floor; `visibility`: party LOS +1; `capacity`: +2 carrying weight; `document`: hack paperwork +2; `repair`: repair object +3; `craft`: enables recipes; `disarm`: machine disable +2; `unlock`: locks +2; `inspect`: reveal info; `light`: sight +2 dark rooms; `shortcut`: temporary cover/bridge; `healing`: heals HP; `focus`: restores Focus; `wound`: clears one wound; `cleanse`: removes negative status; `resource`: gain fixed 1 shock charge; `wet`: creates water; `flammable`: creates oil; `slow`: status chilled; `hack`: brief device disable; `cover`: create cover; `cloud`: poison/smoke area as item element; `quest`: tracked by objective state only; `craft_component_only`: consumed by recipe; `protect`: shield; `wound` overrides generic cleanse if item used.

## Content review concern
Some trait names are shorthand across categories. Editor/compiler tests must prove every catalog item has a meaningful runtime use; numerical field presence is insufficient. If any shorthand can't be implemented faithfully, rewrite the catalog entry, not the acceptance criteria.
