import { it, expect } from "vitest";
import {
  newGame,
  addCrawler,
  begin,
  makeActor,
  clone,
  hash,
  actionCost,
} from "../../packages/engine/src/index";
import { emit } from "../../packages/engine/src/events";
import { actionReason } from "../../packages/engine/src/action-reasons";
import {
  explainResolution,
  ResolutionFeed,
} from "../../apps/client/src/resolution";
import { knownConduction } from "../../apps/client/src/opportunities";
function fixture() {
  const s = newGame(42);
  addCrawler(s, "a", "A", "night_custodian");
  begin(s);
  s.tiles.forEach((t) => {
    t.kind = "floor";
    t.explored = true;
    t.hazards = {};
    t.tags = [];
  });
  s.actors = {
    a: s.actors.a,
    e: makeActor("e", "Queue Warden", "enemy", "queue_warden", 10, 7),
  };
  s.actors.a.x = 7;
  s.actors.a.y = 7;
  s.actors.a.ap = 3;
  return s;
}
it("explains actual attack reach and AP failure instead of a generic rejection", () => {
  const s = fixture();
  expect(
    actionReason(s, s.actors.a, { type: "ATTACK", target: "e" }, 1),
  ).toContain("out of reach");
  s.actors.a.ap = 0;
  expect(
    actionReason(s, s.actors.a, { type: "ATTACK", target: "e" }, 1),
  ).toContain("Not enough AP");
});
it("turn summary names causes, actual damage, miss and stationary sentry behavior", () => {
  const s = fixture(),
    n = clone(s);
  emit(n, "damage", "a", ["e"], { amount: 4, element: "physical" }, n.actors.e);
  emit(n, "hit", "a", ["e"], { armor: 2, crit: false }, n.actors.e);
  emit(n, "miss", "e", ["a"], { chance: 70 }, n.actors.a);
  const before = hash(n),
    lines = explainResolution(s, n, "a", n.events);
  expect(lines.join(" ")).toContain("You hit Queue Warden for 4");
  expect(lines.join(" ")).toContain("held its post");
  expect(lines.join(" ")).toContain("70% hit chance");
  expect(hash(n)).toBe(before);
});
it("recap baselines resumed snapshots and keeps meaningful history, not repeated repaint hooks", () => {
  const f = new ResolutionFeed(),
    s = fixture();
  f.accept(s, "a");
  expect(f.history).toEqual([]);
  const n = clone(s);
  n.revision++;
  emit(n, "action_rejected", "a", [], { reason: "Target out of reach" });
  f.accept(n, "a");
  expect(f.current[0]).toContain("Target out of reach");
  f.accept(n, "a");
  expect(f.history).toHaveLength(1);
  f.reset();
  f.accept(n, "a");
  expect(f.history).toEqual([]);
});
it("network opportunity previews bound work and never reveal unobserved wet tiles", () => {
  const s = fixture();
  for (const t of s.tiles) t.tags = ["wet"];
  s.tiles[7 * s.width + 8].explored = false;
  const nodes = knownConduction(s, { x: 7, y: 7 });
  expect(nodes.length).toBeLessThanOrEqual(8);
  expect(nodes).not.toContainEqual({ x: 8, y: 7 });
  expect(knownConduction(s, { x: 8, y: 7 })).toEqual([]);
});

it("a refused exploration action publishes its explanation without advancing the world turn", async () => {
  const { microAction } = await import("../../packages/engine/src/index");
  const s = fixture();
  s.phase = "EXPLORATION";
  s.tiles[6 * s.width + 7].kind = "wall";
  const n = microAction(s, "a", { type: "MOVE", x: 7, y: 6 });
  expect(n.round).toBe(s.round);
  expect(n.turns).toBe(s.turns);
  expect(n.rng).toEqual(s.rng);
  expect(n.revision).toBe(s.revision + 1);
  expect(n.events.at(-1)?.payload.reason).toContain("wall");
});
