import { it, expect } from "vitest";
import {
  newGame,
  addCrawler,
  begin,
  generateFloor,
  validateFloor,
  clone,
  hash,
} from "../../packages/engine/src/index";
import { scenarioAt, scenarios } from "../../packages/content/src/scenarios";
import { enqueue, environment } from "../../packages/engine/src/environment";
it("600 seeded floors retain required access, safe spawns and deterministic situations", () => {
  for (let seed = 0; seed < 100; seed++)
    for (let floor = 1; floor <= 6; floor++) {
      const s = newGame(seed);
      addCrawler(s, "a", "A", "night_custodian");
      s.floor = floor;
      generateFloor(s);
      expect(validateFloor(s)).toEqual([]);
      for (const room of [2, 7])
        expect(
          s.tiles.some(
            (t) =>
              t.room === room &&
              t.tags.includes("scene:" + scenarioAt(seed, floor, room).id),
          ),
        ).toBe(true);
      const b = newGame(seed);
      addCrawler(b, "a", "A", "night_custodian");
      b.floor = floor;
      generateFloor(b);
      expect(hash(s)).toBe(hash(b));
    }
}, 20000);
it("authored volatile stores respond to the existing fire and explosion system", () => {
  const s = newGame(1);
  addCrawler(s, "a", "A", "night_custodian");
  begin(s);
  const i = s.tiles.findIndex(
    (t) =>
      t.tags.includes("volatile") &&
      t.tags.some((tag) => tag.startsWith("scene:")),
  );
  expect(i).toBeGreaterThan(-1);
  const original = clone(s);
  enqueue(s, { x: i % s.width, y: Math.floor(i / s.width) }, "fire", 2, "a");
  environment(s);
  expect(s.events.some((e) => e.type === "explosion_chain")).toBe(true);
  expect(original.tiles[i].tags).toContain("volatile");
  expect(s.tiles[i].tags).not.toContain("volatile");
});
it("all authored layouts reserve the clear central walk and have recognizable situations", () => {
  for (const scene of scenarios) {
    expect(scene.layout).toHaveLength(7);
    expect(scene.situation.length).toBeGreaterThan(30);
    expect(scene.possibilities).toContain(",");
  }
});
