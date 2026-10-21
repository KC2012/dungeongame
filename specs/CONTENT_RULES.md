# Data contract — content catalogs

Every record contains stable snake_case `id`, unique within its catalog, readable `name`, `description`, and vocabulary-driven mechanics. All numeric changes derive from named effect types, no arbitrary compiled script in JSON. Catalogs are checked into version control; game release snapshots include catalog hash.

## Content schema strategy
`schemas/entries.schema.json` sets common structures and per-type required fields. `tools/validate.py` checks IDs, expected fields, references, thresholds, per-floor room coverage and supported effect types. For engine use generate TS types from schemas or use run-time schema validation on load. Fail build on unknown effect IDs.

## Effect DSL
Record shape `{ "type": EFFECT, "magnitude": number, "duration": number, "radius": number, "status": optionalStatus, "element": optionalElement, "target": "self|ally|enemy|tile|area|party", "tags": [] }`. Fields missing have defined defaults: magnitude=0 duration=0 radius=0. Allowed types: `damage`, `heal`, `shield`, `guard`, `dash`, `push`, `pull`, `apply_status`, `spawn_hazard`, `destroy_tile`, `teleport`, `reveal`, `summon`, `gain_resource`, `modify_stat`, `cleanse`, `hack`, `taunt`, `set_trap`, `create_cover`, `grant_item`, `modify_audience`, `trade`, `revive`, `disable_machine`, `conjure_object`, `craft_component`, `enable_crafting`, `repair_object`.

## AI types
`seek_melee`, `seek_ranged`, `guard_post`, `flanker`, `hazard_placer`, `summoner`, `support`, `charger`, `skirmisher`, `boss_script`. Each type has threat telegraphs, target selection and idle fallback; all enemy data must map to a supported behavior.

## Loot policies
- `items`: all content should be mechanically distinguished by effect, slot, range, damage type, tradeoff, or tags. No item with `effect` left empty and no other meaningful stat.
- `abilities`: 50+ structured skills (if approved count); do not show options until supported effect exists in engine.
- `monsters`: attack patterns, faction, base HP, armor, sight, behavior; telegraphed boss behavior defined by phase tables, not giant damage numbers.
- `achievements`: condition declarative, text from `broadcasts` or on-record template, cooldown once per scope.
- `events`: choice/reward/risk transparency; safe room only.
- `rooms`: floors, prefab layout and socket affordances; no unreachable mandatory door placements.

## Content versioning
Use semantic schema version field in manifest, migration functions for save versions. Catalog IDs are immutable; changing a displayed name is safe. Removing IDs used by saves requires explicit migration, not broken inventory entries.
