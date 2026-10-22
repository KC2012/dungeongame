import { it, expect } from "vitest";
import { newGame, clone, hash } from "../../packages/engine/src/index";
import { emit } from "../../packages/engine/src/events";
import { Broadcast, selectTransmission } from "../../apps/client/src/broadcast";
it("uses actual net audience change, prioritizes systemic boss resolution, never scores locally", () => {
  const a = newGame(42),
    b = clone(a);
  b.revision++;
  b.audience = 27;
  emit(b, "shock_chain", "a", [], { tiles: 4 });
  emit(b, "alternate_boss", "a");
  const before = hash(b),
    notice = selectTransmission(a, b, b.events)!;
  expect(notice.title).toBe("Off script");
  expect(notice.delta).toBe(27);
  expect(hash(b)).toBe(before);
});
it("deduplicates snapshots, baselines reconnects and rate limits ordinary commentary", () => {
  const feed = new Broadcast(),
    a = newGame(42);
  feed.accept(a, 0);
  const b = clone(a);
  b.revision++;
  emit(b, "shock_chain");
  expect(feed.accept(b, 1)?.title).toBe("Conductive reasoning");
  expect(feed.accept(b, 100)).toBeUndefined();
  const c = clone(b);
  c.revision++;
  emit(c, "gas_ignition");
  expect(feed.accept(c, 200)).toBeUndefined();
  const d = clone(c);
  d.revision++;
  emit(d, "first_death");
  expect(feed.accept(d, 300)?.title).toBe("Crawler lost");
  feed.reset();
  expect(feed.accept(d, 8000)).toBeUndefined();
});
it("reports boring behavior only when the authority actually reduces audience", () => {
  const a = newGame(42),
    b = clone(a);
  b.counters.boringRounds = 5;
  expect(selectTransmission(a, b, [])).toBeUndefined();
  a.audience = 10;
  b.audience = 9;
  expect(selectTransmission(a, b, [])?.cause).toBe("quiet rounds");
});
it("attributes multiple achievements to the resolution rather than a single invented cause", () => {
  const feed = new Broadcast(),
    a = newGame(1);
  feed.accept(a, 0);
  const b = clone(a);
  b.revision++;
  b.audience = 12;
  emit(b, "achievement");
  emit(b, "achievement");
  feed.accept(b, 7000);
  expect(feed.audienceChange).toEqual({ delta: 12, cause: "this resolution" });
});
