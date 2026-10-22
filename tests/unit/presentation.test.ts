import { describe, it, expect } from "vitest";
import {
  newGame,
  addCrawler,
  begin,
  clone,
  hash,
  makeActor,
} from "../../packages/engine/src/index";
import { emit } from "../../packages/engine/src/events";
import { attack, status } from "../../packages/engine/src/combat";
import {
  PresentationStream,
  visualCues,
} from "../../apps/client/src/presentation";
function fixture() {
  const s = newGame(42);
  addCrawler(s, "a", "A", "night_custodian");
  begin(s);
  s.actors = {
    a: s.actors.a,
    e: makeActor("e", "Rat", "enemy", "turnstile_rat", 10, 8),
  };
  s.actors.a.x = 8;
  s.actors.a.y = 8;
  s.tiles.forEach((t) => {
    t.explored = true;
    t.kind = "floor";
    t.hazards = {};
  });
  return s;
}
describe("confirmed visual stream", () => {
  it("baselines initial, resumed, changed floor and changed run snapshots without replay", () => {
    const stream = new PresentationStream(),
      s = fixture();
    expect(stream.accept(s)).toEqual([]);
    const n = clone(s);
    n.revision++;
    emit(n, "damage", "a", ["e"], { amount: 4, element: "fire" }, n.actors.e);
    expect(stream.accept(n).some((c) => c.label === "−4")).toBe(true);
    expect(stream.accept(n)).toEqual([]);
    expect(stream.accept(s)).toEqual([]);
    stream.reset();
    expect(stream.accept(n)).toEqual([]);
    const floor = clone(n);
    floor.floor++;
    floor.revision++;
    expect(stream.accept(floor)).toEqual([]);
    const run = clone(floor);
    run.runId = "other";
    expect(stream.accept(run)).toEqual([]);
  });
  it("never mutates snapshots or consumes simulation RNG", () => {
    const s = fixture(),
      n = clone(s);
    n.revision++;
    n.actors.a.x++;
    emit(n, "move", "a", [], {}, n.actors.a);
    status(n.actors.e, "burning", 2, 3, "a");
    const before = [hash(s), hash(n)];
    const cues = visualCues(s, n, n.events);
    expect(cues.some((c) => c.kind === "move" && c.from?.x === 8)).toBe(true);
    expect(cues.some((c) => c.label === "BURNING")).toBe(true);
    expect([hash(s), hash(n)]).toEqual(before);
  });
  it("presents ranged travel before damage and displays misses, shields and armor separately", () => {
    const s = fixture(),
      n = clone(s);
    emit(
      n,
      "damage",
      "a",
      ["e"],
      { amount: 4, absorbed: 2, element: "physical" },
      n.actors.e,
    );
    emit(
      n,
      "hit",
      "a",
      ["e"],
      { crit: true, armor: 3, range: 5, origin: s.actors.a },
      n.actors.e,
    );
    emit(n, "miss", "e", ["a"], { range: 1 }, n.actors.a);
    const cues = visualCues(s, n, n.events);
    expect(cues.find((c) => c.label === "−4")!.delay).toBeGreaterThan(
      cues.find((c) => c.label === "CRITICAL")!.delay,
    );
    for (const label of ["CRITICAL", "ARMOR −3", "SHIELD 2", "MISS"])
      expect(cues.some((c) => c.label === label)).toBe(true);
  });
  it("does not leak unexplored positions or turn newly visible statuses into new applications", () => {
    const s = fixture(),
      n = clone(s);
    delete s.actors.e;
    n.tiles[n.actors.e.y * n.width + n.actors.e.x].explored = false;
    status(n.actors.e, "burning", 2, 3, "a");
    emit(n, "damage", "a", ["e"], { amount: 9 }, n.actors.e);
    expect(visualCues(s, n, n.events)).toEqual([]);
  });
  it("shows environmental changes and caps burst work", () => {
    const s = fixture(),
      n = clone(s);
    for (const t of n.tiles)
      t.hazards.shock = {
        intensity: 2,
        duration: 2,
        damage: 6,
        source: "world",
      };
    const cues = visualCues(s, n, []);
    expect(cues.length).toBe(160);
    expect(cues.every((c) => c.kind === "arc")).toBe(true);
  });
  it("combat cues carry authority origins and armor without extra RNG draws", () => {
    const a = fixture(),
      b = clone(a);
    attack(a, a.actors.a, a.actors.e, 5, "physical", 5);
    attack(b, b.actors.a, b.actors.e, 5, "physical", 5);
    expect(hash(a)).toBe(hash(b));
    const event = a.events.find((e) => e.type === "hit" || e.type === "miss")!;
    expect(event.payload.origin).toEqual({ x: 8, y: 8 });
    expect(event.payload.range).toBe(5);
  });
});
