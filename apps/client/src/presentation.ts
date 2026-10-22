import type {
  GameEvent,
  Point,
  State,
} from "../../../packages/engine/src/types";

export const ink: Record<string, number> = {
  physical: 0xf0d5a1,
  fire: 0xf49b55,
  shock: 0xf7e77d,
  water: 0x7fbad6,
  acid: 0xb7dc73,
  poison: 0xc4a3de,
  cold: 0xb1ebef,
  smoke: 0xb8c2b6,
  blast: 0xffc484,
  force: 0xd4bcf1,
  psychic: 0xd4bcf1,
  heal: 0xa9e6a0,
};
export type VisualCue = {
  key: string;
  kind: "move" | "strike" | "impact" | "ring" | "arc" | "burst" | "text";
  at: Point;
  from?: Point;
  label: string;
  color: number;
  delay: number;
  duration: number;
  actorId?: string;
};
const point = (p: Point): Point => ({ x: p.x, y: p.y });
const equal = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
const explored = (s: State, p?: Point): p is Point =>
  !!p &&
  p.x >= 0 &&
  p.y >= 0 &&
  p.x < s.width &&
  p.y < s.height &&
  !!s.tiles[p.y * s.width + p.x]?.explored;

/** Pure projection adapter. Never calls the reducer, draws RNG, or writes authority state. */
export function visualCues(
  before: State,
  after: State,
  events: GameEvent[],
): VisualCue[] {
  const cues: VisualCue[] = [];
  const movementSteps = new Map<string, number>();
  const positions = new Map(
    Object.values(before.actors).map((a) => [a.id, point(a)]),
  );
  const add = (
    e: GameEvent,
    kind: VisualCue["kind"],
    at: Point | undefined,
    label: string,
    color = ink.physical,
    from?: Point,
    delay = 0,
  ) => {
    if (!explored(after, at)) return;
    cues.push({
      key: `${e.runId}:${e.eventId}:${cues.length}`,
      kind,
      at: point(at),
      from: explored(after, from) ? point(from) : undefined,
      label,
      color,
      delay,
      duration: kind === "move" ? 160 : kind === "strike" ? 260 : 900,
      actorId: kind === "move" ? e.actorId : undefined,
    });
    return cues[cues.length - 1];
  };
  for (const e of events) {
    const source = after.actors[e.actorId] ?? before.actors[e.actorId];
    const target =
      after.actors[e.targetIds[0]] ?? before.actors[e.targetIds[0]];
    if (e.targetIds.length && !target) continue;
    const at = e.tile ?? target ?? source;
    const color = ink[e.payload.element] ?? ink.physical;
    const delay = Math.min(420, cues.length * 16);
    if (["move", "push", "pull", "conveyor", "slide"].includes(e.type)) {
      const id =
        e.type === "move" || e.type === "slide" ? e.actorId : e.targetIds[0];
      const actor = after.actors[id];
      const old = e.payload.from ?? positions.get(id);
      if (actor && old && at && !equal(old, at)) {
        const motion = add(
          e,
          "move",
          at,
          e.type === "move" ? "" : e.type.toUpperCase(),
          ink.force,
          old,
          (movementSteps.get(id) ?? 0) * 160,
        );
        movementSteps.set(id, (movementSteps.get(id) ?? 0) + 1);
        if (motion) motion.actorId = id;
        positions.set(id, point(at));
      }
      if (e.payload.collision)
        add(e, "impact", at, "COLLISION", ink.physical, undefined, 200);
    } else if (e.type === "hit" || e.type === "miss") {
      // The reducer emits hit after damage. Delay associated damage below to give a readable cue -> travel -> impact sequence.
      if (source && target) {
        const from = e.payload.origin ?? positions.get(source.id) ?? source;
        const ranged = (e.payload.range ?? 1) > 2;
        add(
          e,
          ranged ? "arc" : "strike",
          at,
          e.type === "miss" ? "MISS" : e.payload.crit ? "CRITICAL" : "",
          e.type === "miss" ? 0xc7cab9 : color,
          from,
          delay,
        );
        if (e.payload.armor > 0 && e.type === "hit")
          add(
            e,
            "text",
            at,
            `ARMOR −${e.payload.armor}`,
            0xb4c7cf,
            undefined,
            delay + 280,
          );
      }
    } else if (e.type === "damage") {
      // A hazard source is an ID, not necessarily an actor. Do not draw invented projectile paths.
      const hit = events.find(
        (v) =>
          v.type === "hit" &&
          v.actorId === e.actorId &&
          v.targetIds[0] === e.targetIds[0] &&
          v.eventId > e.eventId &&
          v.eventId <= e.eventId + 5,
      );
      add(
        e,
        "impact",
        at,
        e.payload.amount ? `−${e.payload.amount}` : "BLOCK",
        color,
        undefined,
        hit ? Math.min(420, (cues.length + 1) * 16) + 260 : delay,
      );
      if (e.payload.absorbed)
        add(
          e,
          "text",
          at,
          `SHIELD ${e.payload.absorbed}`,
          0xa6d3e5,
          undefined,
          delay + 400,
        );
    } else if (e.type === "heal" || e.type === "shield") {
      add(
        e,
        "ring",
        at,
        `${e.type === "heal" ? "+" : "SHIELD "}${e.type === "shield" ? (e.payload.total ?? e.payload.amount) : e.payload.amount}`,
        e.type === "heal" ? ink.heal : ink.water,
        undefined,
        delay,
      );
    } else if (e.type === "cast") {
      add(
        e,
        "ring",
        source,
        e.payload.id.replaceAll("_", " ").toUpperCase(),
        ink.psychic,
        undefined,
        0,
      );
    } else if (
      [
        "downed",
        "first_death",
        "enemy_defeated",
        "revive_ally",
        "braced",
        "resisted",
      ].includes(e.type)
    ) {
      add(
        e,
        "ring",
        at,
        {
          downed: "DOWN · 3 ROUNDS",
          first_death: "CRAWLER LOST",
          enemy_defeated: "DEFEATED",
          revive_ally: "REVIVED",
          braced: "BRACED",
          resisted: "IMMUNE",
        }[e.type]!,
        e.type === "revive_ally" ? ink.heal : ink.blast,
        undefined,
        delay + 300,
      );
    } else {
      const env: Record<string, [VisualCue["kind"], string, number]> = {
        wall_break: ["burst", "BREACH", ink.physical],
        gas_ignition: ["burst", "GAS IGNITED", ink.fire],
        explosion_chain: ["burst", "EXPLOSION", ink.blast],
        shock_chain: [
          "arc",
          `CONDUCTION · ${e.payload.tiles} TILES`,
          ink.shock,
        ],
        short_circuit: ["arc", "SHORT CIRCUIT", ink.shock],
        freeze: ["ring", "ICE", ink.cold],
        extinguish_chain: ["ring", "STEAM", ink.smoke],
        pit_fall: ["burst", "FALL", ink.force],
        device_combo: ["ring", "DEVICE ACTIVE", ink.psychic],
        objective: ["ring", "OBJECTIVE", ink.heal],
        alternate_boss: ["burst", "SYSTEM OVERRIDDEN", ink.heal],
        boss_combat: ["burst", "BOSS DEFEATED", ink.blast],
      };
      const v = env[e.type];
      if (v) add(e, v[0], at, v[1], v[2], undefined, delay);
    }
  }
  for (const a of Object.values(after.actors).filter(
    (a) => a.tags.includes("boss") && !a.dead,
  )) {
    const old = before.actors[a.id];
    if (!old || old.bossPhase !== a.bossPhase)
      add(
        { runId: after.runId, eventId: after.nextEventId } as GameEvent,
        "ring",
        a,
        !old ? a.name.toUpperCase() : `PHASE ${a.bossPhase + 1}`,
        ink.blast,
      );
  }
  // State deltas cover systems that do not emit individual status/hazard events.
  for (const a of Object.values(after.actors)) {
    const old = before.actors[a.id];
    if (!old) continue; // newly visible does not mean newly applied
    if (
      !equal(old, a) &&
      !cues.some((c) => c.kind === "move" && c.actorId === a.id)
    ) {
      add(
        {
          runId: after.runId,
          eventId: after.nextEventId,
          actorId: a.id,
        } as GameEvent,
        "move",
        a,
        "",
        ink.physical,
        old,
      );
    }
    for (const [name, status] of Object.entries(a.statuses))
      if (!old.statuses[name] || old.statuses[name].serial !== status.serial)
        add(
          { runId: after.runId, eventId: after.nextEventId } as GameEvent,
          "text",
          a,
          name.toUpperCase(),
          ink[
            {
              burning: "fire",
              poisoned: "poison",
              corroded: "acid",
              chilled: "cold",
              stunned: "shock",
            }[name] ?? "psychic"
          ],
          undefined,
          350,
        );
  }
  for (let i = 0; i < after.tiles.length; i++) {
    const t = after.tiles[i],
      old = before.tiles[i];
    if (!old?.explored || !t.explored) continue;
    const location = { x: i % after.width, y: Math.floor(i / after.width) };
    if (old.kind === "wall" && t.hp < old.hp)
      add(
        { runId: after.runId, eventId: after.nextEventId } as GameEvent,
        "burst",
        location,
        t.kind === "wall" ? `STRUCTURE −${old.hp - t.hp}` : "BREACH",
        ink.physical,
      );

    for (const [element, h] of Object.entries(t.hazards)) {
      if (old.hazards[element] && old.hazards[element].intensity >= h.intensity)
        continue;
      const at = { x: i % after.width, y: Math.floor(i / after.width) };
      add(
        { runId: after.runId, eventId: after.nextEventId } as GameEvent,
        element === "shock" ? "arc" : "ring",
        at,
        "",
        ink[element],
        undefined,
        Math.min(500, (i % 8) * 40),
      );
    }
  }
  const delta = after.audience - before.audience;
  if (delta) {
    const cause =
      events.find((e) => e.type === "achievement") ??
      events.find((e) => e.type === "shock_chain" || e.type === "revive_ally");
    const at = cause
      ? (after.actors[cause.targetIds[0]] ??
        after.actors[cause.actorId] ??
        cause.tile)
      : undefined;
    if (at)
      add(
        { runId: after.runId, eventId: after.nextEventId } as GameEvent,
        "text",
        at,
        `AUDIENCE ${delta > 0 ? "+" : ""}${delta}`,
        ink.heal,
        undefined,
        500,
      );
  }
  return cues.slice(0, 160);
}

/** First snapshot/reconnect is a baseline. Repaints, duplicate and older revisions never replay events. */
export class PresentationStream {
  previous?: State;
  highWater = 0;
  reset() {
    this.previous = undefined;
    this.highWater = 0;
  }
  accept(next: State): VisualCue[] {
    const old = this.previous;
    if (old && old.runId === next.runId && next.revision < old.revision)
      return [];
    if (old && old.runId === next.runId && next.revision === old.revision)
      return [];
    const fresh = old && old.runId === next.runId && old.floor === next.floor;
    const events = fresh
      ? next.events.filter(
          (e) => e.runId === next.runId && e.eventId >= this.highWater,
        )
      : [];
    const result = fresh ? visualCues(old, next, events) : [];
    this.previous = next;
    this.highWater = next.nextEventId;
    return result;
  }
}
