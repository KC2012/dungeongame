import type { State, Actor, Action } from "./types";
import { distance, los, tile } from "./grid";
import { entry, catalog } from "../../content/src/index";
import { stat } from "./stats";
/** Diagnostic only: perform remains the validator. Called at the actual resolution position, before an attempt. */
export function actionReason(
  s: State,
  a: Actor,
  c: Action,
  cost: number,
): string {
  if (a.dead) return "Your crawler is dead";
  if (a.downed) return "Your crawler is downed";
  if (cost > a.ap) return `Not enough AP: needs ${cost}, ${a.ap} available`;
  const target = c.target ? s.actors[c.target] : undefined,
    p = c.x !== undefined ? { x: c.x, y: c.y! } : (target ?? a);
  if (c.type === "MOVE") {
    if (distance(a, p) !== 1)
      return "That step is not adjacent to the resolved position";
    const t = tile(s, p);
    if (!t) return "That step leaves the map";
    if (t.kind === "wall") return "A wall blocks that step";
    if (t.kind === "pit") return "A pit blocks that step";
    if (t.locked)
      return "The door is locked; a key or another route is required";
    const occupant = Object.values(s.actors).find(
      (v) => v.id !== a.id && !v.dead && v.x === p.x && v.y === p.y,
    );
    if (occupant) return `${occupant.name} occupies that tile`;
  }
  if (c.type === "ATTACK" && target) {
    if (target.dead) return "The target is already dead";
    if (target.downed) return "The target is already downed";
    if (a.kind === "crawler" && target.kind === "crawler")
      return "Direct attacks on allies are unavailable";
    const w = a.equipment.weapon
        ? entry("items", a.equipment.weapon)
        : undefined,
      range = (w?.range ?? 1) + (w?.range === 1 ? stat(a, "reach") : 0);
    if (distance(a, target) > range)
      return `Target out of reach after movement: ${distance(a, target)} tiles away; ${w?.name ?? "unarmed"} reaches ${range}`;
    if (!los(s, a, target)) return "Line of sight is blocked after movement";
  }
  if (c.type === "INTERACT") {
    const o = s.objects.find((o) => o.id === c.id || o.id === c.target);
    if (o && distance(a, o) > 1)
      return `Move beside ${o.name} before interacting`;
    if (o?.done) return "This object is already completed";
  }
  if (c.type === "ABILITY") {
    const record = catalog.abilities.find((v) => v.id === c.id);
    if (!record) return "Unknown ability";
    if (a.focus < (record.focusCost ?? 0))
      return `Not enough Focus: needs ${record.focusCost}, ${a.focus} available`;
    if ((a.cooldowns[c.id!] ?? 0) > s.round)
      return "This ability is still cooling down";
  }
  return `The ${c.type.toLowerCase()} could not resolve with the current target or world state`;
}
