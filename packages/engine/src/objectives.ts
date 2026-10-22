import type { State, Actor, WorldObject } from "./types";
import { catalog } from "../../content/src/index";
import { emit } from "./events";
export function activateObjective(
  s: State,
  a: Actor,
  o: WorldObject,
  method = "physical",
): boolean {
  if (o.done) return false;
  const floor = catalog.floors[s.floor - 1];
  if (o.kind === "objective") {
    if (
      s.floor === 6 &&
      floor.requiredObjective.sources.indexOf(o.operation) > s.objective.length
    )
      return false;
    o.done = true;
    s.objective.push(o.operation!);
    s.xp += 8;
    emit(s, "objective", a.id, [], { id: o.id, method }, o);
    if (method !== "physical")
      emit(s, "objective_hack", a.id, [], { id: o.id, method }, o);
    if (s.floor === 5 && s.objective.length >= 3)
      emit(s, "evidence_complete", a.id, [], {}, o);
    if (s.floor === 6)
      emit(s, "uplink_stage", a.id, [], { phase: s.objective.length }, o);
    return true;
  }
  if (o.kind === "alternate") {
    if (
      s.objective.length < floor.requiredObjective.goal ||
      floor.alternateBoss.operations.indexOf(o.operation) > s.alternate.length
    )
      return false;
    o.done = true;
    s.alternate.push(o.operation!);
    emit(s, "device_combo", a.id, [], { id: o.id, method }, o);
    if (s.alternate.length >= floor.alternateBoss.goal) {
      s.bossDefeated = true;
      const boss = Object.values(s.actors).find((v) => v.tags.includes("boss"));
      if (boss) {
        boss.dead = true;
        boss.hp = 0;
        boss.telegraph = [];
      }
      s.floorRoutes[s.floor - 1] = "alternate";
      s.xp += 25;
      s.credits += 20;
      emit(s, "alternate_boss", a.id, [], { method }, o);
      emit(s, "boss_noncombat", a.id, [], { method }, o);
    }
    return true;
  }
  return false;
}
