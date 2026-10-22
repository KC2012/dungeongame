import type { GameEvent, State } from "../../../packages/engine/src/types";
export type Transmission = {
  title: string;
  text: string;
  priority: number;
  eventId: number;
  delta: number;
  cause: string;
};
const lines: Record<string, [number, string, string]> = {
  first_death: [100, "Crawler lost", "Keep the camera on. Give them a moment."],
  party_wipe: [
    100,
    "End of transmission",
    "The crew is gone. The ledger can wait.",
  ],
  alternate_boss: [
    95,
    "Off script",
    "You defeated the procedure. The guardian was merely attached to it.",
  ],
  boss_combat: [
    95,
    "Guardian down",
    "A vacancy has opened in management. Collect your compensation.",
  ],
  revive_ally: [
    90,
    "Rescue confirmed",
    "A colleague recovered. Accounting had already written them off.",
  ],
  downed: [
    90,
    "Rescue window",
    "Still alive. The crew has three rounds to make that matter.",
  ],
  audience_threshold: [
    80,
    "Audience threshold",
    "You have their attention. Optional bargains await in the saferoom.",
  ],
  gas_ignition: [
    70,
    "Unexpected chemistry",
    "The room has submitted its own tactical plan.",
  ],
  explosion_chain: [
    70,
    "Chain reaction",
    "We budgeted for one explosion. Keep the receipt.",
  ],
  shock_chain: [
    70,
    "Conductive reasoning",
    "The floor has joined the argument.",
  ],
  push_hazard_kill: [
    75,
    "Systemic defeat",
    "Excellent use of the facilities. Terrible workplace conditions.",
  ],
  secret_discovery: [
    65,
    "Unscheduled discovery",
    "That was not on the public tour.",
  ],
  bargain: [
    70,
    "Contract amended",
    "You signed. The fine print is now part of the floor.",
  ],
  floor_enter: [85, "Next floor", "New management. Familiar liability."],
  finish_floor_six: [
    100,
    "Off the air",
    "For once, the control booth has no prepared remarks.",
  ],
};
export function selectTransmission(
  before: State,
  after: State,
  events: GameEvent[],
): Transmission | undefined {
  const delta = after.audience - before.audience;
  const choices: Transmission[] = [];
  for (const e of events) {
    const line = lines[e.type];
    if (line)
      choices.push({
        priority: line[0],
        title: line[1],
        text: line[2],
        eventId: e.eventId,
        delta,
        cause: e.type.replaceAll("_", " "),
      });
    if (
      e.type === "damage" &&
      e.targetIds.some((id) => {
        const a = after.actors[id];
        return (
          a?.kind === "crawler" &&
          !a.dead &&
          !a.downed &&
          a.hp > 0 &&
          a.hp <= Math.ceil(a.maxHP / 5)
        );
      })
    )
      choices.push({
        priority: 85,
        title: "Still transmitting",
        text: "That last sliver of health is doing remarkable work.",
        eventId: e.eventId,
        delta,
        cause: "near-death survival",
      });
  }
  for (const a of Object.values(after.actors).filter(
    (a) => a.tags.includes("boss") && !a.dead && !before.actors[a.id],
  ))
    choices.push({
      priority: 85,
      title: a.name,
      text: "Floor guardian acquired. Watch the marked ground; the devices offer another way.",
      eventId: after.nextEventId,
      delta,
      cause: "guardian revealed",
    });
  if (delta < 0 && after.counters.boringRounds >= 5)
    choices.push({
      priority: 30,
      title: "Audience drifting",
      text: "The control booth is considering a very long advert.",
      eventId: after.nextEventId,
      delta,
      cause: "quiet rounds",
    });
  if (delta > 0 && !choices.length)
    choices.push({
      priority: 50,
      title: "Audience reacting",
      text: "They noticed. Your performance has entered the minutes.",
      eventId: after.nextEventId,
      delta,
      cause: "confirmed achievements / spotlight",
    });
  return choices.sort(
    (a, b) => b.priority - a.priority || a.eventId - b.eventId,
  )[0];
}
/** Local editorial rate limiting only. No scoring, unlocks, RNG, or server commands. */
export class Broadcast {
  previous?: State;
  current?: Transmission;
  lastAt = -Infinity;
  audienceChange?: { delta: number; cause: string };
  reset() {
    this.previous = undefined;
  }
  accept(next: State, now: number, guidance = false): Transmission | undefined {
    const old = this.previous;
    if (old && old.runId === next.runId && next.revision <= old.revision)
      return;
    this.previous = next;
    if (!old || old.runId !== next.runId) {
      this.current = undefined;
      this.audienceChange = undefined;
      return;
    }
    const events = next.events.filter(
      (e) => e.runId === next.runId && e.eventId >= old.nextEventId,
    );
    let selected = selectTransmission(old, next, events);
    if (
      selected?.cause === "quiet rounds" &&
      (guidance || events.some((e) => e.type === "action_rejected"))
    )
      selected = undefined;
    if (next.audience !== old.audience) {
      const earned = events.filter((e) => e.type === "achievement");
      this.audienceChange = {
        delta: next.audience - old.audience,
        cause:
          earned.length > 1
            ? "this resolution"
            : earned.length === 1
              ? String(earned[0].payload.id ?? "achievement").replaceAll(
                  "_",
                  " ",
                )
              : next.audience < old.audience
                ? "quiet rounds"
                : "spotlight",
      };
    }
    if (!selected || (now - this.lastAt < 6000 && selected.priority < 90))
      return;
    this.current = selected;
    this.lastAt = now;
    return selected;
  }
}
