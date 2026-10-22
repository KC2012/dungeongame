import { it, expect } from "vitest";
import {
  newGame,
  addCrawler,
  begin,
  clone,
  hash,
} from "../../packages/engine/src/index";
import { emit } from "../../packages/engine/src/events";
import { importantMoment } from "../../apps/client/src/moments";
import { resolutionSounds, soundRecipes } from "../../apps/client/src/audio";
it("earned progression and Floor 3 choices surface real actionable moments", () => {
  const s = newGame(4);
  addCrawler(s, "a", "A", "night_custodian");
  begin(s);
  const n = clone(s);
  n.floor = 3;
  n.phase = "SAFE_ROOM";
  const before = hash(n);
  expect(importantMoment(s, n, "a", [])?.action).toBe("character");
  expect(hash(n)).toBe(before);
  n.phase = "EXPLORATION";
  const e = emit(n, "level_up", "a", [], { level: 2 });
  expect(importantMoment(s, n, "a", [e])?.title).toContain("LEVEL 2");
});
it("semantic sounds are distinct, bounded and prioritize urgent actual outcomes", () => {
  const s = newGame(4);
  const events = [
    emit(s, "move", "a"),
    emit(s, "hit", "a", ["e"], { crit: true }),
    emit(s, "shock_chain"),
    emit(s, "first_death"),
  ];
  expect(resolutionSounds(events, "a")).toEqual([
    "loss",
    "critical",
    "electricity",
  ]);
  expect(soundRecipes.move.frequencies).not.toEqual(
    soundRecipes.hit.frequencies,
  );
  expect(resolutionSounds([], "a")).toEqual([]);
});
