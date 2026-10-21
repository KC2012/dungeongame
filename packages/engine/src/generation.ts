import { catalog, entry } from "../../content/src/index";
import { random } from "./random";
import { path, neighbors, traversable } from "./grid";
import type { Actor, State, Tile, WorldObject, Point } from "./types";
export function makeActor(
  id: string,
  name: string,
  kind: Actor["kind"],
  catalogId: string,
  x: number,
  y: number,
): Actor {
  return {
    id,
    name,
    kind,
    catalogId,
    x,
    y,
    hp: 28,
    maxHP: 28,
    focus: 9,
    maxFocus: 9,
    ap: 3,
    level: 1,
    stats: { Might: 2, Finesse: 2, Wit: 2, Nerve: 2 },
    statuses: {},
    inventory: [],
    equipment: {},
    talents: [],
    offers: [],
    cooldowns: {},
    used: {},
    downed: 0,
    downedAt: -1,
    dead: false,
    downs: 0,
    revivedFloor: 0,
    wounds: 0,
    shield: 0,
    guard: 0,
    reaction: "",
    tags: [],
    online: true,
    alert: false,
    telegraph: [],
    bossPhase: 0,
    noReward: false,
    restFloor: 0,
    bench: false,
    charges: 3,
  };
}
export function emptyTile(kind: Tile["kind"] = "wall", room = -1): Tile {
  return {
    kind,
    hp: kind === "wall" ? 8 : 0,
    cover: 0,
    tags: kind === "wall" ? ["solid", "structural", "fragile"] : [],
    elevation: 0,
    hazards: {},
    explored: false,
    room,
  };
}
export function generateFloor(s: State): void {
  s.width = 45;
  s.height = 45;
  s.tiles = Array.from({ length: 2025 }, () => emptyTile());
  s.objects = [];
  s.objective = [];
  s.alternate = [];
  s.bossDefeated = false;
  s.safeUsed = false;
  s.visited = [];
  s.deferredEvents = [];
  const templates = catalog.rooms.filter((r) => r.floor === s.floor);
  const floor = entry("floors", catalog.floors[s.floor - 1].id);
  const coords: Point[] = [
    { x: 4, y: 4 },
    { x: 18, y: 4 },
    { x: 32, y: 4 },
    { x: 32, y: 18 },
    { x: 18, y: 18 },
    { x: 4, y: 18 },
    { x: 4, y: 32 },
    { x: 18, y: 32 },
    { x: 32, y: 32 },
  ];
  const at = (x: number, y: number) => s.tiles[y * s.width + x];
  for (let room = 0; room < 9; room++) {
    const base = coords[room];
    const prefab =
      templates[
        (room + random(s, "generation", templates.length)) % templates.length
      ];
    const rotation = random(s, "generation", 4);
    for (let y = 0; y < 9; y++)
      for (let x = 0; x < 9; x++) {
        let xx = x,
          yy = y;
        for (let r = 0; r < rotation; r++) [xx, yy] = [8 - yy, xx];
        const ch = prefab.layout[yy][xx];
        const t = emptyTile(
          ch === "#" ? "wall" : ch === "+" ? "door" : "floor",
          room,
        );
        if (t.kind === "door") t.open = true;
        if (ch === "c") t.cover = 1;
        if (ch === "~") {
          t.tags = ["wet", "liquid"];
          t.hazards.water = {
            intensity: 1,
            duration: 999,
            damage: 0,
            source: "world",
          };
        }
        s.tiles[(base.y + y) * s.width + base.x + x] = t;
      }
    // A safe central cross connects all authored sockets without requiring a particular body path.
    for (let i = 0; i < 9; i++) {
      for (const [x, y] of [
        [base.x + i, base.y + 4],
        [base.x + 4, base.y + i],
      ])
        if (s.tiles[y * s.width + x].kind !== "door")
          s.tiles[y * s.width + x] = emptyTile("floor", room);
    }
    if (room > 0) {
      const a = { x: coords[room - 1].x + 4, y: coords[room - 1].y + 4 },
        b = { x: base.x + 4, y: base.y + 4 };
      let x = a.x,
        y = a.y;
      while (x !== b.x) {
        x += Math.sign(b.x - x);
        s.tiles[y * s.width + x] = emptyTile("floor");
        if (s.tiles[(y + 1) * s.width + x]?.room === -1)
          s.tiles[(y + 1) * s.width + x] = emptyTile("floor");
      }
      while (y !== b.y) {
        y += Math.sign(b.y - y);
        s.tiles[y * s.width + x] = emptyTile("floor");
      }
    }
    if (room > 0 && room < 6) {
      const hz = entry(
        "hazards",
        floor.environment[room % floor.environment.length],
      );
      const t = at(base.x + 2, base.y + 2);
      t.kind = "floor";
      t.tags = [...hz.materialTags];
      t.hazards[hz.element] = {
        intensity: hz.intensity,
        duration: hz.duration,
        damage: hz.tickDamage,
        source: hz.id,
        persistent: true,
      };
    }
  }
  // Two optional connections: a side archive can be bypassed on the lower service walk.
  if (s.counters.blockedShortcut !== s.floor) {
    for (let x = 8; x <= 36; x++)
      s.tiles[42 * s.width + x] = emptyTile("floor");
    for (let y = 36; y <= 42; y++) {
      s.tiles[y * s.width + 8] = emptyTile("floor");
      s.tiles[y * s.width + 36] = emptyTile("floor");
    }
  }
  // Every hazard archetype can appear in the optional archive across seeds.
  const optionalHazard =
    catalog.hazards[random(s, "generation", catalog.hazards.length)];
  const optionalTile = s.tiles[34 * s.width + 20];
  optionalTile.kind = "floor";
  optionalTile.tags = [...optionalHazard.materialTags];
  optionalTile.hazards[optionalHazard.element] = {
    intensity: optionalHazard.intensity,
    duration: optionalHazard.duration,
    damage: optionalHazard.tickDamage,
    source: optionalHazard.id,
    persistent: true,
  };
  // Two optional locked maintenance links; the ordinary objective route never needs them.
  for (const [x, from, to] of [
    [22, 12, 18],
    [22, 26, 32],
  ]) {
    for (let y = from; y < to; y++)
      s.tiles[y * s.width + x] = emptyTile("floor");
    const door = emptyTile("door");
    door.hp = 6;
    door.locked = true;
    door.open = false;
    s.tiles[to * s.width + x] = door;
  }
  const object = (
    id: string,
    kind: WorldObject["kind"],
    room: number,
    dx: number,
    dy: number,
    operation?: string,
  ) => {
    const p = { x: coords[room].x + dx, y: coords[room].y + dy };
    s.tiles[p.y * s.width + p.x] = emptyTile("floor", room);
    s.objects.push({
      id,
      name: id.replaceAll("_", " "),
      kind,
      ...p,
      done: false,
      hp: 8,
      maxHP: 8,
      powered: true,
      disabled: 0,
      jammed: false,
      operation,
    });
  };
  floor.requiredObjective.sources.forEach((id: string, i: number) =>
    object(id, "objective", i + 1, 4, 3, id),
  );
  floor.alternateBoss.operations.forEach((id: string, i: number) =>
    object(id, "alternate", 8, 2 + i * 2, 3, id),
  );
  object("saferoom", "safe", 6, 4, 4);
  object("descent", "exit", 8, 4, 6);
  object("hidden_archive", "secret", 7, 2, 2);
  for (let r = 0; r < 8; r++) {
    object(`cache_${r}`, "cache", r, 3, 4);
    s.objects.at(-1)!.items = [
      { id: "first_aid_pack", count: 1, durability: 12 },
      {
        id: catalog.items.filter((e) => e.tier <= Math.ceil(s.floor / 2) + 1)[
          random(
            s,
            "loot",
            catalog.items.filter((e) => e.tier <= Math.ceil(s.floor / 2) + 1)
              .length,
          )
        ].id,
        count: 1,
        durability: 12,
      },
    ];
    if (r > 0) object(`generator_${r}`, "machine", r, 6, 5);
  }
  for (const [id, a] of Object.entries(s.actors))
    if (a.kind !== "crawler") delete s.actors[id];
  let slot = 0;
  for (const a of Object.values(s.actors)) {
    a.x = 7 + (slot % 2);
    a.y = 7 + Math.floor(slot / 2);
    a.alert = false;
    a.telegraph = [];
    slot++;
  }
  const members = Object.values(s.actors).filter((a) => !a.dead).length;
  const monsters = catalog.monsters.filter((e) => e.floor === s.floor);
  for (let room = 1; room <= 5; room++) {
    const count =
      1 +
      Math.floor((members - 1) / 2) +
      (s.risks.includes("elite_next_floor") ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const m =
        monsters[
          (room + i + random(s, "generation", monsters.length)) %
            monsters.length
        ];
      const a = makeActor(
        `f${s.floor}_e${room}_${i}`,
        m.name,
        "enemy",
        m.id,
        coords[room].x + 3 + i,
        coords[room].y + 6,
      );
      a.hp = a.maxHP = Math.ceil(m.hp * (1 + 0.32 * (members - 1)));
      a.stats.armor = m.armor;
      a.tags = m.tags;
      s.actors[a.id] = a;
    }
  }
  const b = entry("bosses", floor.boss);
  const boss = makeActor(`boss_${s.floor}`, b.name, "enemy", b.id, 36, 36);
  boss.hp = boss.maxHP = Math.ceil(b.hp * (1 + 0.32 * (members - 1)));
  boss.stats.armor = b.armor;
  boss.tags = ["boss", "metal"];
  s.actors[boss.id] = boss;
  s.shop = catalog.items
    .filter((e) => e.tier <= Math.min(4, s.floor + 1) && e.kind !== "material")
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter((_, i) => i % 3 === s.floor % 3)
    .slice(0, 12)
    .map((e) => ({ id: e.id, count: 1, durability: 12 }));
  const failures = validateFloor(s);
  if (failures.length)
    throw Error(
      `Invalid generation ${s.seed}/${s.floor}: ${failures.join(",")}`,
    );
}
export function validateFloor(s: State): string[] {
  const errors: string[] = [];
  const start = { x: 7, y: 7 };
  const seen = new Set<number>([start.y * s.width + start.x]),
    queue = [start];
  for (let i = 0; i < queue.length; i++)
    for (const n of neighbors(queue[i]))
      if (traversable(s, n) && !seen.has(n.y * s.width + n.x)) {
        seen.add(n.y * s.width + n.x);
        queue.push(n);
      }
  for (const o of s.objects)
    if (!seen.has(o.y * s.width + o.x)) errors.push(`unreachable ${o.id}`);
  for (const p of [
    { x: 7, y: 7 },
    { x: 8, y: 7 },
    { x: 7, y: 8 },
    { x: 8, y: 8 },
  ])
    if (
      !seen.has(p.y * s.width + p.x) ||
      Object.values(s.tiles[p.y * s.width + p.x].hazards).some(
        (h) => h.damage > 0,
      )
    )
      errors.push("unsafe spawn");
  if (!path(s, start, { x: 36, y: 38 }).length) errors.push("no exit");
  return errors;
}
