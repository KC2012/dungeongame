import type { State, GameEvent } from "../../../packages/engine/src/types";
import { catalog } from "../../../packages/content/src/index";
export function explainResolution(
  before: State,
  after: State,
  id: string,
  events: GameEvent[],
): string[] {
  const name = (key: string) =>
    key === id
      ? "You"
      : (after.actors[key]?.name ??
        before.actors[key]?.name ??
        catalog.hazards.find((h) => h.id === key)?.name ??
        "The environment");
  const lines: string[] = [],
    paired = new Set<number>();
  for (const e of events.filter((e) => e.type === "hit")) {
    const damage = events
      .filter(
        (v) =>
          v.type === "damage" &&
          v.eventId < e.eventId &&
          v.actorId === e.actorId &&
          v.targetIds[0] === e.targetIds[0],
      )
      .at(-1);
    if (damage) {
      paired.add(damage.eventId);
      lines.push(
        `${name(e.actorId)} ${e.payload.crit ? "critically hit" : "hit"} ${name(e.targetIds[0])} for ${damage.payload.amount} damage${e.payload.armor ? ` (${e.payload.armor} blocked by armor)` : ""}${damage.payload.absorbed ? `; shield absorbed ${damage.payload.absorbed}` : ""}.`,
      );
    }
  }
  const moved = new Map<string, number>();
  for (const e of events) {
    const target = name(e.targetIds[0]),
      source = name(e.actorId);
    if (e.type === "move")
      moved.set(e.actorId, (moved.get(e.actorId) ?? 0) + 1);
    if (e.type === "damage" && !paired.has(e.eventId))
      lines.push(
        `${source}${e.actorId === id ? "r" : "'s"} ${e.payload.element ?? ""} effect dealt ${e.payload.amount} damage to ${target}${e.payload.absorbed ? `; shield absorbed ${e.payload.absorbed}` : ""}.`,
      );
    if (e.type === "miss")
      lines.push(
        `${source} missed ${target}${e.payload.chance !== undefined ? ` (${e.payload.chance}% hit chance)` : ""}.`,
      );
    if (e.type === "action_rejected")
      lines.unshift(`${source}: ${e.payload.reason}.`);
    if (e.type === "heal")
      lines.push(`${source} restored ${e.payload.amount} HP to ${target}.`);
    if (e.type === "downed")
      lines.push(`${target} is down. Rescue within 3 rounds.`);
    if (e.type === "first_death")
      lines.push(
        `${target === "The environment" ? source : target} died. Death lasts for this run.`,
      );
    if (e.type === "enemy_defeated") lines.push(`${target} was defeated.`);
    if (e.type === "revive_ally") lines.push(`${source} revived ${target}.`);
    if (e.type === "found_off_switch")
      lines.push(
        `${source} ${e.payload.powered ? "activated" : "switched off"} ${after.objects.find((o) => o.id === e.payload.id)?.name ?? "the relay"}. ${e.payload.element === "shock" ? "Electricity entered the connected wet ground." : "Water spread; water alone does no damage."}`,
      );
    if (e.type === "shock_chain")
      lines.push(
        `Electricity conducted through ${e.payload.tiles} connected tiles.`,
      );
    if (e.type === "gas_ignition")
      lines.push("Fire ignited the gas, causing a blast.");
    if (e.type === "wall_break")
      lines.push("A brittle wall broke, opening a route.");
    if (e.type === "freeze") lines.push("Wet ground froze into slippery ice.");
    if (e.type === "extinguish_chain")
      lines.push("Water extinguished fire and created obscuring steam.");
    if (e.type === "objective") lines.push("A floor terminal was completed.");
    if (e.type === "alternate_boss")
      lines.push(
        "The boss devices resolved the encounter without a conventional kill.",
      );
    if (e.type === "action_performed" && e.payload.action === "GUARD")
      lines.push(
        `${source} guarded: +${e.payload.armor ?? 2} armor during the enemy phase.`,
      );
    if (e.type === "action_performed" && e.payload.action === "DODGE")
      lines.push(`${source} prepared to dodge one normal attack.`);
    if (e.type === "action_performed" && e.payload.action === "OVERWATCH")
      lines.push(`${source} prepared one reaction shot.`);
  }
  for (const [key, count] of moved)
    lines.unshift(
      `${name(key)} moved ${count} ${count === 1 ? "tile" : "tiles"}.`,
    );
  for (const a of Object.values(after.actors)) {
    const old = before.actors[a.id];
    if (!old) continue;
    for (const [status, value] of Object.entries(a.statuses))
      if (
        status !== "lifetime" &&
        (!old.statuses[status] || old.statuses[status].serial !== value.serial)
      )
        lines.push(
          `${name(a.id)} is ${status.toUpperCase()} (${value.duration} ${value.duration === 1 ? "round" : "rounds"} remaining).`,
        );
    if (
      a.kind === "enemy" &&
      !a.dead &&
      a.x === old.x &&
      a.y === old.y &&
      catalog.monsters.find((m) => m.id === a.catalogId)?.ai === "guard_post" &&
      events.some((e) => e.actorId === id && e.targetIds.includes(a.id))
    )
      lines.push(`${a.name} held its post. This sentry does not chase.`);
  }
  if (after.audience !== before.audience)
    lines.push(
      `Audience ${after.audience > before.audience ? "+" : ""}${after.audience - before.audience} for this resolution.`,
    );
  return [...new Set(lines)];
}
export class ResolutionFeed {
  previous?: State;
  current: string[] = [];
  history: { round: number; lines: string[] }[] = [];
  reset() {
    this.previous = undefined;
  }
  accept(next: State, id: string) {
    const old = this.previous;
    if (old && old.runId === next.runId && next.revision <= old.revision)
      return;
    this.previous = next;
    if (!old || old.runId !== next.runId) {
      this.current = [];
      this.history = [];
      return;
    }
    const fresh = next.events.filter((e) => e.eventId >= old.nextEventId);
    const lines = explainResolution(old, next, id, fresh);
    if (lines.length) {
      this.current = lines;
      this.history.unshift({ round: next.round, lines });
      this.history = this.history.slice(0, 80);
    }
  }
}
