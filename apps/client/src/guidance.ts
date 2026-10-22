import { catalog } from "../../../packages/content/src/index";
import type { State } from "../../../packages/engine/src/types";
export const lessons = [
  "move",
  "interact",
  "combat",
  "round",
  "guard",
  "dodge",
  "overwatch",
  "cover",
  "environment",
  "loot",
  "level",
  "objective",
  "boss",
] as const;
export type Lesson = (typeof lessons)[number];
export type GuidanceData = { version: 1; enabled: boolean; done: Lesson[] };
export const guidanceKey = "concourse.guidance.v1";
export interface GuidanceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export class Guidance {
  data: GuidanceData = { version: 1, enabled: true, done: [] };
  previous?: State;
  constructor(private storage: GuidanceStorage) {
    try {
      const d = JSON.parse(storage.getItem(guidanceKey) ?? "null");
      if (
        d?.version === 1 &&
        typeof d.enabled === "boolean" &&
        Array.isArray(d.done)
      )
        this.data = {
          version: 1,
          enabled: d.enabled,
          done: d.done.filter((x: Lesson) => lessons.includes(x)),
        };
    } catch {}
  }
  save() {
    try {
      this.storage.setItem(guidanceKey, JSON.stringify(this.data));
    } catch {}
  }
  note(lesson: Lesson) {
    if (!this.data.done.includes(lesson)) {
      this.data.done.push(lesson);
      this.save();
    }
  }
  toggle(on: boolean) {
    this.data.enabled = on;
    this.save();
  }
  reset() {
    this.data = { version: 1, enabled: true, done: [] };
    this.save();
  }
  accept(next: State, id: string) {
    const old = this.previous;
    this.previous = next;
    if (!old || old.runId !== next.runId || next.revision <= old.revision)
      return;
    const events = next.events.filter((e) => e.eventId >= old.nextEventId);
    if (next.phase === "PLANNING") this.note("combat");
    if (old.phase === "PLANNING" && next.round > old.round) this.note("round");
    for (const e of events) {
      if (e.actorId === id) {
        if (e.type === "move") this.note("move");
        if (
          [
            "loot",
            "door",
            "found_off_switch",
            "objective",
            "device_combo",
          ].includes(e.type)
        )
          this.note("interact");
        if (e.type === "loot") this.note("loot");
        if (e.type === "level_up") this.note("level");
        if (e.type === "objective") this.note("objective");
        if (e.type === "action_performed") {
          const action = e.payload.action;
          if (action === "GUARD") this.note("guard");
          if (action === "DODGE") this.note("dodge");
          if (action === "OVERWATCH") this.note("overwatch");
        }
      }
      if (
        [
          "shock_chain",
          "gas_ignition",
          "explosion_chain",
          "water_push",
        ].includes(e.type)
      )
        this.note("environment");
      if (["boss_combat", "alternate_boss"].includes(e.type)) this.note("boss");
    }
  }
  lesson(s: State, id: string): { title: string; text: string; focus: Lesson } {
    const done = this.data.done,
      has = (v: Lesson) => done.includes(v),
      a = s.actors[id];
    if (s.phase === "PLANNING" && !has("round"))
      return {
        title: "Threat detected · plan, then Ready",
        text: "You have 3 AP. Each step usually costs 1; your weapon shows its attack cost. Queue a plan, then Ready to let the crew and enemies resolve.",
        focus: "combat",
      };
    if (!has("move"))
      return {
        title: "Your first steps",
        text: "Move with WASD, arrows, or click a clear floor tile. The gold helmet is your crawler.",
        focus: "move",
      };
    if (!has("interact") && s.phase !== "PLANNING")
      return {
        title: "Open the arrival supplies",
        text: "The wooden supply crate is beside the starting area. Approach it, then click it or use Open supplies below.",
        focus: "interact",
      };
    const room = a ? s.tiles[a.y * s.width + a.x]?.room : -1;
    if (room === 2 && !has("environment"))
      return {
        title: "The room itself is a weapon",
        text: "Blue water connects the discharged relay to a stationary sentry. Activating the relay sends electricity through wet ground. Stay on the dry walkway.",
        focus: "environment",
      };
    if (s.phase === "PLANNING" && has("round") && !has("guard"))
      return {
        title: "Spend the last point on defense",
        text: "Guard costs 1 AP and gives +2 armor for the enemy phase. It pairs with a 2-AP attack. Queued actions are still editable.",
        focus: "guard",
      };
    const ranged = Object.values(s.actors).some(
      (v) =>
        v.kind === "enemy" &&
        !v.dead &&
        ["seek_ranged", "skirmisher"].includes(
          catalog.monsters.find((m) => m.id === v.catalogId)?.ai,
        ),
    );
    if (has("round") && has("guard") && ranged && !has("dodge"))
      return {
        title: "Avoid one normal attack",
        text: "Dodge costs 1 AP and reduces the chance that the next normal attack hits you. It does not cancel a boss area strike: leave marked ground for those.",
        focus: "dodge",
      };
    const weapon = catalog.items.find((v) => v.id === a?.equipment.weapon);
    if (
      has("round") &&
      has("guard") &&
      (weapon?.range ?? 1) > 2 &&
      !has("overwatch")
    )
      return {
        title: "Watch an approach",
        text: "Overwatch reserves one reaction attack with your equipped weapon. Keep the enemy inside your weapon's range and line of sight.",
        focus: "overwatch",
      };
    if (has("round") && !has("cover"))
      return {
        title: "Use the room as cover",
        text: "Low barricades reduce hit chance for a target standing on them. Select a target to see the cover penalty before you commit.",
        focus: "cover",
      };
    if (has("loot") && !has("level"))
      return {
        title: "Examine what you found",
        text: "Inventory [I] shows equipment, tools and consumables. Open an item to see what it lets you do, then return to the floor.",
        focus: "loot",
      };
    if (has("level") && !has("objective"))
      return {
        title: "Your crawler is developing",
        text: "Character [C] contains earned talent choices. Work toward the floor terminals; the guardian also has a device-based solution.",
        focus: "level",
      };
    return {
      title: s.bossDefeated
        ? "Floor cleared · prepare to descend"
        : "Find a way past the guardian",
      text: "Complete the floor terminals, then defeat the guardian or operate its boss devices. The stairs open when both are resolved. Advanced controls are always available.",
      focus: "objective",
    };
  }
}
