import { it, expect } from "vitest";
import {
  newGame,
  addCrawler,
  begin,
  clone,
  makeActor,
  hash,
} from "../../packages/engine/src/index";
import {
  projectPlan,
  attackPreview,
  approachAttack,
} from "../../apps/client/src/planning";
import { controlsFor } from "../../apps/client/src/progressive-ui";
function fixture() {
  const s = newGame(9);
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
    e: makeActor("e", "Rat", "enemy", "turnstile_rat", 11, 7),
  };
  s.actors.a.x = 7;
  s.actors.a.y = 7;
  s.phase = "PLANNING";
  return s;
}
it("projects attack reach from queued endpoint without mutating state/RNG", () => {
  const s = fixture(),
    before = hash(s),
    plan = projectPlan(s, "a", [
      { type: "MOVE", x: 8, y: 7 },
      { type: "MOVE", x: 9, y: 7 },
    ]);
  expect(plan.actor.x).toBe(9);
  expect(plan.remaining).toBe(1);
  expect(attackPreview(s, plan.actor, s.actors.e).chance).toBeGreaterThan(0);
  expect(attackPreview(s, s.actors.a, s.actors.e).chance).toBeUndefined();
  expect(hash(s)).toBe(before);
});
it("constructs a reachable move/attack plan and explains unaffordable approaches", () => {
  const s = fixture();
  const plan = approachAttack(s, "a", [], s.actors.e);
  expect(plan.actions.map((c) => c.type)).toEqual(["MOVE", "MOVE", "ATTACK"]);
  expect(projectPlan(s, "a", plan.actions).spent).toBe(3);
  s.actors.e.x = 13;
  expect(approachAttack(s, "a", [], s.actors.e).problem).toContain(
    "Move closer this round",
  );
});
it("counts wet terrain and attack weapon costs honestly", () => {
  const s = fixture();
  s.tiles[7 * s.width + 8].tags = ["wet"];
  s.actors.a.equipment.weapon = "slug_thrower";
  const p = projectPlan(s, "a", [
    { type: "MOVE", x: 8, y: 7 },
    { type: "ATTACK", target: "e" },
  ]);
  expect(p.spent).toBe(4);
  expect(p.steps.map((v) => v.cost)).toEqual([2, 2]);
});
it("reveals contextual controls and keeps all mechanics available through advanced/off", () => {
  const s = fixture(),
    data = { version: 1 as const, enabled: true, done: [] };
  s.phase = "EXPLORATION";
  expect(controlsFor(data, s, false).attack).toBe(false);
  s.phase = "PLANNING";
  expect(controlsFor(data, s, false).attack).toBe(true);
  expect(controlsFor(data, s, false).abilities).toBe(false);
  expect(Object.values(controlsFor(data, s, true)).every(Boolean)).toBe(true);
  expect(
    Object.values(controlsFor({ ...data, enabled: false }, s, false)).every(
      Boolean,
    ),
  ).toBe(true);
});

it("models opening a closed door before stepping through it, without changing the live tile", () => {
  const s = fixture(),
    door = s.tiles[7 * s.width + 8];
  door.kind = "door";
  door.open = false;
  const p = projectPlan(s, "a", [
    { type: "MOVE", x: 8, y: 7 },
    { type: "MOVE", x: 8, y: 7 },
  ]);
  expect(p.actor.x).toBe(8);
  expect(p.view.tiles[7 * s.width + 8].open).toBe(true);
  expect(door.open).toBe(false);
  expect(p.spent).toBe(2);
});
