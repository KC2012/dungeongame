import type { State, GameEvent } from "./types";
import { emit } from "./events";
import { living, stat } from "./stats";
import { tile } from "./grid";
/** Derived hooks consume confirmed reducer events; they never infer outcomes from client requests. */
export function deriveEvents(s: State, from: number) {
  const current = s.events.filter((e) => e.eventId >= from);
  const party = living(s);
  const derived = new Set<string>();
  const add = (
    type: string,
    e?: GameEvent,
    payload: Record<string, unknown> = {},
  ) => {
    const key = type + ":" + (e?.actorId ?? "");
    if (derived.has(key)) return;
    derived.add(key);
    emit(s, type, e?.actorId ?? "", e?.targetIds ?? [], payload, e?.tile);
  };
  const shocks = current.filter(
    (e) =>
      e.type === "damage" &&
      e.payload.element === "shock" &&
      e.payload.amount > 0,
  );
  if (new Set(shocks.flatMap((e) => e.targetIds)).size >= 2)
    add("shock_multi_target", shocks[0]);
  for (const e of current) {
    if (e.type === "damage") {
      for (const id of e.targetIds) {
        const a = s.actors[id];
        if (a?.kind === "crawler") {
          const room = tile(s, a)?.room ?? -1;
          s.counters[`room_damage:${s.floor}:${room}`] =
            (s.counters[`room_damage:${s.floor}:${room}`] ?? 0) +
            e.payload.amount;
          if (e.actorId === id && e.payload.element === "poison")
            add("poison_self", e);
        }
        if (a?.dead && a.statuses.chilled && e.payload.element === "physical")
          add("fragile_enemy_shatter", e);
        if (a?.hp === 1 && e.payload.absorbed > 0) add("ally_saved", e);
      }
    }
    if (e.type === "shield" && e.actorId !== e.targetIds[0]) {
      const ids = Object.values(s.actors)
        .filter((a) => a.kind === "crawler")
        .map((a) => a.id)
        .sort();
      const index = ids.indexOf(e.actorId);
      const key = `assist:${s.floor}`;
      s.counters[key] = (s.counters[key] ?? 0) | (1 << index);
      if (ids.length === 4 && s.counters[key] === 15)
        add("four_unique_assists", e);
    }
    if (
      e.type === "cast" &&
      e.payload.id === "water_bladder" &&
      current.some((v) => v.type === "push")
    )
      add("water_push", e);
    if (e.type === "enemy_defeated") {
      const room = e.tile ? (tile(s, e.tile)?.room ?? -1) : -1;
      const enemies = Object.values(s.actors).filter(
        (a) => a.kind === "enemy" && !a.dead && tile(s, a)?.room === room,
      );
      if (!enemies.length) {
        if (!s.counters[`room_damage:${s.floor}:${room}`]) {
          add("no_damage_room", e);
          add("room_zero_damage", e);
        }
        if (party.length && party.every((a) => a.focus === 0))
          add("zero_focus_victory", e);
      }
    }
    if (e.type === "objective") {
      const id = e.payload.id as string;
      if (id?.includes("hack") || id?.includes("router"))
        add("objective_hack", e);
      if (id === "scanner_hack") add("scanner_bypass", e);
      if (
        id === "ledger_vault" &&
        !current.some((v) => v.type === "damage" && v.actorId === e.actorId)
      )
        add("stealth_vault", e);
      if (s.objective.length >= 3) add("multi_key_objective", e);
      if (s.objective.length >= 2) add("multiple_checks", e);
    }
    if (e.type === "machine_hacked") {
      add("objective_exploit", e);
      if (current.some((v) => v.type === "machine_disable"))
        add("device_combo", e);
      if (e.payload.wasLocked) add("locked_path_bypass", e);
    }
    if (
      e.type === "wall_break" &&
      current.some((v) => v.type === "machine_disable")
    )
      add("device_combo", e);
    if (e.type === "alternate_boss") add("pacify_encounter", e);
    if (e.type === "shield_multi_ally") add("guard_ally", e);
    if (e.type === "push" && e.tile && tile(s, e.tile)?.tags.includes("ice"))
      add("slide_enemy", e);
    if (e.type === "short_circuit") add("shock_machine", e);
    if (e.type === "gas_ignition" && e.tile && tile(s, e.tile)?.hazards.acid)
      add("acid_fire_chain", e);
  }
  const encounters = current.filter(
    (e) => e.type === "enemy_defeated" || e.type === "alternate_boss",
  );
  if (encounters.length) {
    const start = s.counters.encounterStart ?? s.round;
    if (s.round - start >= 20) add("long_encounter_survival", encounters[0]);
    delete s.counters.encounterStart;
  } else if (s.phase === "PLANNING" && s.counters.encounterStart === undefined)
    s.counters.encounterStart = s.round;
  for (const e of current.filter((e) =>
    [
      "shock_chain",
      "revive_ally",
      "alternate_boss",
      "wall_break",
      "secret_discovery",
    ].includes(e.type),
  )) {
    const actor = s.actors[e.actorId];
    if (actor && stat(actor, "spotlight")) {
      const key = `spotlight:${e.encounterId}:${actor.id}`;
      if (!s.transactions.includes(key)) {
        s.transactions.push(key);
        s.audience = Math.min(100, s.audience + stat(actor, "spotlight"));
      }
    }
  }
}
