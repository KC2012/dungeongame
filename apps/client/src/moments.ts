import type { State, GameEvent } from "../../../packages/engine/src/types";
import { catalog } from "../../../packages/content/src/index";
export type Moment = {
  title: string;
  text: string;
  action?: "character" | "safe";
  priority: number;
};
export function importantMoment(
  old: State,
  next: State,
  id: string,
  events: GameEvent[],
): Moment | undefined {
  const choices: Moment[] = [];
  if (old.phase !== "PLANNING" && next.phase === "PLANNING")
    choices.push({
      title: "THREAT DETECTED",
      text: "Plan up to 3 AP. Ready commits your plan; enemies act after the crew.",
      priority: 60,
    });
  for (const e of events) {
    if (e.type === "level_up" && e.actorId === id)
      choices.push({
        title: `LEVEL ${e.payload.level} · TALENT EARNED`,
        text: "Choose your next talent in Character.",
        action: "character",
        priority: 85,
      });
    if (e.type === "audience_threshold")
      choices.push({
        title: `AUDIENCE ${e.payload.threshold}`,
        text: "New optional bargains are available in the saferoom.",
        priority: 75,
      });
    if (e.type === "bargain")
      choices.push({
        title: "CONTRACT AMENDED",
        text: "Your chosen reward and risk now apply to the run.",
        priority: 75,
      });
    if (e.type === "downed")
      choices.push({
        title: "CRAWLER DOWN",
        text: "An adjacent ally can spend 2 AP and a medkit to revive them before the rescue window closes.",
        priority: 100,
      });
    if (e.type === "first_death")
      choices.push({
        title: "CRAWLER LOST",
        text: "Death lasts for this run. Surviving crew can continue.",
        priority: 100,
      });
    if (e.type === "alternate_boss")
      choices.push({
        title: "GUARDIAN OVERRIDDEN",
        text: "The devices resolved the encounter. Finish the terminals, collect rewards and reach the stairs.",
        priority: 95,
      });
    if (e.type === "boss_combat")
      choices.push({
        title: "GUARDIAN DEFEATED",
        text: "Collect the rewards. The stairs unlock when the floor terminals are complete.",
        priority: 95,
      });
    if (e.type === "floor_enter")
      choices.push({
        title: `FLOOR ${next.floor}`,
        text:
          next.floor === 1
            ? "Arrival. Find your footing."
            : "A new floor, new threats and new ways through.",
        priority: 65,
      });
    if (
      e.type === "loot" &&
      e.actorId === id &&
      (catalog.items.find((i) => i.id === e.payload.id)?.tier ?? 0) >= 3
    )
      choices.push({
        title: "VALUABLE EQUIPMENT RECOVERED",
        text: "Inspect its tactical use in Inventory.",
        priority: 65,
      });
    if (
      e.type === "action_performed" &&
      e.actorId === id &&
      e.payload.action === "CHOOSE"
    )
      choices.push({
        title: "CONTRACT SIGNED",
        text: `${catalog.professions.find((v) => v.id === e.payload.id)?.name ?? catalog.adaptations.find((v) => v.id === e.payload.id)?.name ?? "Your choice"} now applies to your crawler.`,
        priority: 85,
      });
  }
  for (const a of Object.values(next.actors).filter(
    (a) => a.tags.includes("boss") && !a.dead,
  )) {
    const before = old.actors[a.id];
    if (!before)
      choices.push({
        title: a.name,
        text: "Read the marked ground. Boss devices offer another resolution.",
        priority: 90,
      });
    else if (before.bossPhase !== a.bossPhase)
      choices.push({
        title: `GUARDIAN · PHASE ${a.bossPhase + 1}`,
        text: a.statuses.exposed
          ? "Its core is exposed. Watch the next attack marks."
          : "The guardian has changed its attack pattern.",
        priority: 90,
      });
  }
  const a = next.actors[id];
  if (
    a &&
    !a.dead &&
    !a.downed &&
    next.floor >= 3 &&
    next.phase === "SAFE_ROOM" &&
    (!a.profession || !a.adaptation)
  )
    choices.push({
      title: "REWRITE YOUR CONTRACT",
      text: "Choose one profession and one adaptation. These choices stay for the run.",
      action: "character",
      priority: 92,
    });
  return choices.sort((a, b) => b.priority - a.priority)[0];
}
