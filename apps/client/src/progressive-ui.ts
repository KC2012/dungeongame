import type { GuidanceData } from "./guidance";
import type { State } from "../../../packages/engine/src/types";
export function controlsFor(data: GuidanceData, s: State, advanced: boolean) {
  const full = advanced || !data.enabled || data.done.includes("boss"),
    done = data.done;
  const combat = full || s.phase === "PLANNING" || done.includes("combat");
  return {
    attack: combat,
    ready: combat,
    guard: full || done.includes("round"),
    dodge: full || done.includes("guard"),
    overwatch: full || done.includes("dodge"),
    inventory: full || done.includes("loot"),
    character: full || done.includes("level"),
    abilities: full || done.includes("environment") || s.floor > 1,
  };
}
