# Game event vocabulary and achievement testability

Game events are server-created typed objects `{eventId, runId, round, actorId, targetIds, tile, type, tags, encounterId, payload}`. Every event type used by an achievement must have a defined source emitter and one deterministic test fixture. Use `content/achievement_events.json` for coverage: this catalog is a mapping from authored achievement conditions to emission hooks and thresholds.

## Emission hook families
- `combatDamage` emits `shock_chain`, `push_hazard_kill`, `improvised_weapon_kill`, `fragile_enemy_shatter`, `shock_multi_target`, `glass_broken`, `zero_focus_victory`.
- `physicalWorld` emits `short_circuit`, `wall_break`, `explosion_chain`, `breach_route`, `flood_room`, `gas_ignition`, `shock_machine`, `device_combo`, `extinguish_chain`, `water_push`, `slide_enemy`, `acid_fire_chain`, `machine_disable`.
- `actorState` emits `first_death`, `revive_ally`, `revive_final_round`, `poison_self`, `guard_ally`, `ally_saved`, `shock_ally_saved`, `shield_multi_ally`, `long_encounter_survival`.
- `objective` emits `alternate_boss`, `pacify_encounter`, `objective_hack`, `evidence_complete`, `scanner_bypass`, `objective_exploit`, `boss_noncombat`, `stealth_vault`, `multiple_checks`, `locked_path_bypass`, `multi_key_objective`, `finish_floor_six`, `boss_telegraph_avoid`.
- `lootEconomy` emits `failed_trade`, `vendor_refused`, `loot_low_rarity`, `trade_twice`, `refund_denied`, `craft_complete`.
- `exploration` emits `no_damage_room`, `secret_discovery`, `quick_plan`, `hard_check_success`, `room_zero_damage`, `projectile_deflected`, `door_trap_kill`, `trap_trigger_self`, `found_off_switch`.
- `meta` emits `audience_threshold`, `all_survive`, `survive_with_casualty`, `solo_win`, `four_player_win`, `four_unique_assists`.

## Hook validity rule
The matching IDs are *event names*, not methods. When an achievement is called `technically_correct` with condition `objective_exploit`, implement `objective_exploit` as a legitimately achieved objective through an alternate allowed mechanism, not by detecting arbitrary glitches. For each event, source code must document the source reducer/module and check event integrity. If a hook is unobservable in the planned game (e.g. projectile deflection where there is no deflection effect), implement the required mechanic or revise the achievement with explicit spec change.

## Emission constraints
- Win/loss events emitted once from server state transition only.
- Do not emit from render effects or HUD button click alone; emit on confirmed state transition.
- One source event can trigger several achievements but per-run/encounter uniqueness preserved.
- Achievement matcher time windows count completed rounds, never wall clock.
- Shared party events must record all contributors for recognition, with loot delegated to draft system.

## Scripted event fixture format
`{seed, initialStateFixture, commands, expectEvents:[{type,actorId?}], expectAudienceDelta, expectAchievementIds}`. Tests use these fixtures, not screenshots of a UI notice.
