import { it, expect } from "vitest";
import { Guidance, guidanceKey } from "../../apps/client/src/guidance";
import {
  newGame,
  addCrawler,
  begin,
  clone,
  microAction,
  resolveRound,
  generateFloor,
  validateFloor,
  hash,
} from "../../packages/engine/src/index";
import { enqueue, environment } from "../../packages/engine/src/environment";
const storage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
};
it("persists observed guidance, supports off/reset and recovers corrupt data", () => {
  const store = storage(),
    g = new Guidance(store);
  g.note("move");
  g.toggle(false);
  const b = new Guidance(store);
  expect(b.data).toEqual({ version: 1, enabled: false, done: ["move"] });
  b.reset();
  expect(new Guidance(store).data.done).toEqual([]);
  store.setItem(guidanceKey, "broken");
  expect(new Guidance(store).data.enabled).toBe(true);
});
it("advances through confirmed own movement and interaction without mutating authority", () => {
  const store = storage(),
    g = new Guidance(store),
    s = newGame(3);
  addCrawler(s, "a", "A", "night_custodian");
  s.counters.guidedFloor = 1;
  begin(s);
  g.accept(s, "a");
  const n = microAction(s, "a", { type: "MOVE", x: 7, y: 6 });
  const before = hash(n);
  g.accept(n, "a");
  expect(g.data.done).toContain("move");
  expect(hash(n)).toBe(before);
  expect(g.lesson(n, "a").focus).toBe("interact");
});
it("guided Floor 1 is deterministic, quiet at spawn and teaches actual conduction against an existing sentry", () => {
  for (let seed = 0; seed < 60; seed++) {
    const s = newGame(seed);
    addCrawler(s, "a", "A", "night_custodian");
    s.counters.guidedFloor = 1;
    begin(s);
    expect(validateFloor(s)).toEqual([]);
    expect(
      Object.values(s.actors).filter((a) => a.id.startsWith("f1_e1_")),
    ).toHaveLength(1);
    expect(s.actors.f1_e1_0.catalogId).toBe("turnstile_rat");
    const b = newGame(seed);
    addCrawler(b, "a", "A", "night_custodian");
    b.counters.guidedFloor = 1;
    begin(b);
    expect(hash(s)).toBe(hash(b));
    const e = s.actors.f1_e2_0;
    const hp = e.hp;
    enqueue(s, { x: 36, y: 9 }, "shock", 2, "a");
    environment(s);
    expect(e.hp).toBeLessThan(hp);
    expect(e.statuses.stunned).toBeTruthy();
    expect(s.events.some((v) => v.type === "shock_chain")).toBe(true);
  }
}, 20000);
it("unguided runs and later floors do not get tutorial arrangements; optional counters survive checkpoints", () => {
  const s = newGame(42);
  addCrawler(s, "a", "A", "night_custodian");
  s.floor = 2;
  s.counters.guidedFloor = 1;
  generateFloor(s);
  expect(s.objects.find((o) => o.id === "cache_0")?.name).toBe("cache 0");
  expect(JSON.parse(JSON.stringify(s)).counters.guidedFloor).toBe(1);
});
