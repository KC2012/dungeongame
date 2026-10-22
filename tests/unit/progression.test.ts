import { it, expect } from "vitest";
import {
  newGame,
  addCrawler,
  begin,
  perform,
  resolveRound,
  makeActor,
  tile,
  hash,
  clone,
} from "../../packages/engine/src/index";
import { catalog } from "../../packages/content/src/index";
import { spawnSync } from "node:child_process";
import { playBot } from "../../tools/bot";
it("replay hash is identical in two independent Node processes", () => {
  const script = `import {newGame,addCrawler,begin,resolveRound,hash} from './packages/engine/src/index.ts';let s=newGame(123,'replay');addCrawler(s,'a','A','night_custodian');begin(s);for(let i=0;i<20;i++)s=resolveRound(s,[{actorId:'a',actions:[{type:'GUARD'}]}]).state;console.log(hash(s));`;
  const run = () =>
    spawnSync(
      "node",
      ["--import", "tsx", "--input-type=module", "-e", script],
      { encoding: "utf8" },
    );
  const a = run(),
    b = run();
  expect(a.status, a.stderr).toBe(0);
  expect(b.status, b.stderr).toBe(0);
  expect(a.stdout).toBe(b.stdout);
});
for (let floor = 1; floor <= 6; floor++)
  for (const route of ["alternate", "combat"])
    it(`floor ${floor} ${route} boss resolution uses actual actions and rewards once`, () => {
      const s = newGame(42);
      addCrawler(s, "a", "A", "night_custodian");
      s.floor = floor;
      begin(s);
      const a = s.actors.a;
      a.hp = a.maxHP = 1000;
      a.focus = a.maxFocus = 1000;
      a.stats.accuracy = 999;
      const f = catalog.floors[floor - 1];
      for (const o of s.objects
        .filter((o) => o.kind === "objective")
        .slice(0, f.requiredObjective.goal)) {
        a.x = o.x;
        a.y = o.y + 1;
        a.ap = 3;
        expect(perform(s, a, { type: "INTERACT", id: o.id })).toBe(true);
      }
      if (route === "alternate") {
        for (const o of s.objects.filter((o) => o.kind === "alternate")) {
          a.x = o.x;
          a.y = o.y - 1;
          a.ap = 3;
          expect(perform(s, a, { type: "INTERACT", id: o.id })).toBe(true);
        }
      } else {
        const boss = s.actors["boss_" + floor];
        a.x = boss.x;
        a.y = boss.y - 1;
        a.inventory.push({ id: "rail_driver", count: 1, durability: 12 });
        a.equipment.weapon = "rail_driver";
        for (let i = 0; i < 200 && !boss.dead; i++) {
          a.ap = 3;
          expect(perform(s, a, { type: "ATTACK", target: boss.id })).toBe(true);
        }
        expect(boss.dead).toBe(true);
      }
      expect(s.bossDefeated).toBe(true);
      const xp = s.xp,
        credits = s.credits;
      const boss = s.actors["boss_" + floor];
      a.ap = 3;
      expect(perform(s, a, { type: "ATTACK", target: boss.id })).toBe(false);
      expect(s.xp).toBe(xp);
      expect(s.credits).toBe(credits);
      const exit = s.objects.find((o) => o.kind === "exit")!;
      a.x = exit.x;
      a.y = exit.y + 1;
      a.ap = 3;
      expect(perform(s, a, { type: "DESCEND" })).toBe(true);
      if (floor === 6) {
        expect(s.result).toBe("VICTORY");
        const before = hash(s);
        expect(hash(resolveRound(s, []).state)).toBe(before);
      } else expect(s.floor).toBe(floor + 1);
    });
it("consent-based trade cannot duplicate or force an item", () => {
  const s = newGame(1);
  const a = addCrawler(s, "a", "A", "night_custodian"),
    b = addCrawler(s, "b", "B", "street_mechanic");
  begin(s);
  a.x = 7;
  a.y = 7;
  b.x = 8;
  b.y = 7;
  expect(
    perform(s, a, { type: "GIVE", id: "first_aid_pack", target: "b" }),
  ).toBe(true);
  expect(a.inventory.some((i) => i.id === "first_aid_pack")).toBe(true);
  const request = s.tradeRequests![0];
  expect(
    perform(s, b, { type: "TRADE", id: request.id, choice: "accept" }),
  ).toBe(true);
  expect(a.inventory.some((i) => i.id === "first_aid_pack")).toBe(false);
  expect(
    perform(s, b, { type: "TRADE", id: request.id, choice: "accept" }),
  ).toBe(false);
});
it("placed hazards remain until encountered or disabled", () => {
  const s = newGame(1);
  addCrawler(s, "a", "A", "night_custodian");
  begin(s);
  const hazard = s.tiles.find((t) =>
    Object.values(t.hazards).some((h) => h.persistent),
  )!;
  const before = hash(hazard.hazards);
  for (let i = 0; i < 10; i++) {
    const r = resolveRound(s, []).state;
    Object.assign(s, r);
  }
  expect(hash(hazard.hazards)).toBe(before);
});
it("new stun survives into next planning AP budget", () => {
  const s = newGame(1);
  const a = addCrawler(s, "a", "A", "night_custodian");
  begin(s);
  for (const [id, v] of Object.entries(s.actors))
    if (v.kind === "enemy") delete s.actors[id];
  s.phase = "PLANNING";
  tile(s, a)!.tags = ["wet"];
  s.deferredEvents.push({
    x: a.x,
    y: a.y,
    element: "shock",
    damage: 1,
    duration: 2,
    intensity: 2,
    source: "hazard",
    step: 0,
  });
  const first = resolveRound(s, []).state;
  expect(first.actors.a.statuses.stunned).toBeDefined();
  const second = resolveRound(first, []).state;
  expect(second.actors.a.ap).toBe(2);
});
it("safe room cannot freeze combat while another crawler is elsewhere", () => {
  const s = newGame(1);
  const a = addCrawler(s, "a", "A", "night_custodian"),
    b = addCrawler(s, "b", "B", "street_mechanic");
  begin(s);
  for (const id of Object.keys(s.actors))
    if (s.actors[id].kind === "enemy") delete s.actors[id];
  const safe = s.objects.find((o) => o.kind === "safe")!;
  a.x = safe.x;
  a.y = safe.y - 1;
  expect(perform(s, a, { type: "INTERACT", id: safe.id })).toBe(false);
  expect(s.phase).not.toBe("SAFE_ROOM");
  b.x = safe.x;
  b.y = safe.y + 1;
  expect(perform(s, a, { type: "INTERACT", id: safe.id })).toBe(true);
});
it("crew descent requires every connected living crawler to vote", () => {
  const s = newGame(1);
  const a = addCrawler(s, "a", "A", "night_custodian"),
    b = addCrawler(s, "b", "B", "street_mechanic");
  begin(s);
  s.phase = "SAFE_ROOM";
  s.bossDefeated = true;
  s.objective = ["a", "b", "c"];
  expect(perform(s, a, { type: "DESCEND" })).toBe(true);
  expect(s.floor).toBe(1);
  expect(perform(s, b, { type: "DESCEND" })).toBe(true);
  expect(s.floor).toBe(2);
});
it("a deferred fluid wave terminates instead of circulating forever", () => {
  const s = newGame(1);
  addCrawler(s, "a", "A", "night_custodian");
  begin(s);
  for (const t of s.tiles) {
    t.kind = "floor";
    t.hazards = {};
  }
  s.deferredEvents = [
    {
      x: 20,
      y: 20,
      element: "water",
      intensity: 2,
      source: "test",
      duration: 2,
      damage: 0,
      step: 0,
    },
  ];
  let current = s;
  for (let i = 0; i < 10; i++) {
    current = resolveRound(current, []).state;
  }
  expect(current.deferredEvents).toHaveLength(0);
});
it("a follower may enter an ally tile when that ally clears its endpoint", () => {
  const s = newGame(1);
  const a = addCrawler(s, "a", "A", "night_custodian"),
    b = addCrawler(s, "b", "B", "street_mechanic");
  begin(s);
  for (const t of s.tiles) {
    t.kind = "floor";
    t.hazards = {};
  }
  for (const [id, v] of Object.entries(s.actors))
    if (v.kind === "enemy") delete s.actors[id];
  a.x = 5;
  a.y = 5;
  b.x = 6;
  b.y = 5;
  a.stats.Finesse = 100;
  b.stats.Finesse = 1;
  s.phase = "PLANNING";
  const out = resolveRound(s, [
    { actorId: a.id, actions: [{ type: "MOVE", x: 6, y: 5 }] },
    { actorId: b.id, actions: [{ type: "MOVE", x: 7, y: 5 }] },
  ]).state;
  expect(out.actors.a.x).toBe(6);
  expect(out.actors.b.x).toBe(7);
});
it("crossing a fire tile deals one exposure even after leaving it", () => {
  const s = newGame(1);
  const a = addCrawler(s, "a", "A", "night_custodian");
  begin(s);
  for (const t of s.tiles) {
    t.kind = "floor";
    t.hazards = {};
  }
  for (const [id, v] of Object.entries(s.actors))
    if (v.kind === "enemy") delete s.actors[id];
  a.x = 5;
  a.y = 5;
  a.maxHP = a.hp = 100;
  s.phase = "PLANNING";
  tile(s, { x: 6, y: 5 })!.hazards.fire = {
    damage: 4,
    intensity: 1,
    duration: 2,
    source: "fixture",
  };
  const out = resolveRound(s, [
    {
      actorId: a.id,
      actions: [
        { type: "MOVE", x: 6, y: 5 },
        { type: "MOVE", x: 7, y: 5 },
      ],
    },
  ]).state;
  expect(out.actors.a.hp).toBe(96);
  expect(out.actors.a.statuses.burning).toBeDefined();
});
it("arrival plus standing on the same hazard never double-damages a round", () => {
  const s = newGame(1);
  const a = addCrawler(s, "a", "A", "night_custodian");
  begin(s);
  for (const t of s.tiles) {
    t.kind = "floor";
    t.hazards = {};
  }
  for (const [id, v] of Object.entries(s.actors))
    if (v.kind === "enemy") delete s.actors[id];
  a.x = 5;
  a.y = 5;
  a.maxHP = a.hp = 100;
  s.phase = "PLANNING";
  tile(s, { x: 6, y: 5 })!.hazards.fire = {
    damage: 4,
    intensity: 1,
    duration: 2,
    source: "fixture",
  };
  const out = resolveRound(s, [
    { actorId: a.id, actions: [{ type: "MOVE", x: 6, y: 5 }] },
  ]).state;
  expect(out.actors.a.hp).toBe(96);
});
it("a refreshed stun still reduces AP in the next round", () => {
  const s = newGame(1);
  const a = addCrawler(s, "a", "A", "night_custodian");
  begin(s);
  for (const t of s.tiles) {
    t.kind = "floor";
    t.hazards = {};
  }
  for (const [id, v] of Object.entries(s.actors))
    if (v.kind === "enemy") delete s.actors[id];
  a.hp = a.maxHP = 100;
  s.phase = "PLANNING";
  tile(s, a)!.tags = ["wet"];
  tile(s, a)!.hazards.shock = {
    intensity: 2,
    duration: 3,
    damage: 1,
    source: "fixture",
  };
  let current = resolveRound(s, []).state;
  current = resolveRound(current, []).state;
  expect(current.actors.a.statuses.stunned).toBeDefined();
  current = resolveRound(current, []).state;
  expect(current.actors.a.ap).toBe(2);
});
it("the hand-authored fallback preserves connected objectives and four safe spawns", async () => {
  const { fallbackFloor, validateFloor } = await import(
    "../../packages/engine/src/generation"
  );
  const s = newGame(9);
  for (let i = 0; i < 4; i++)
    addCrawler(s, "p" + i, "P" + i, "night_custodian");
  s.floor = 4;
  begin(s);
  fallbackFloor(s, "forced validation fixture");
  expect(validateFloor(s)).toEqual([]);
  expect(
    s.events.some(
      (e) => e.type === "generation_fallback" && e.payload.seed === 9,
    ),
  ).toBe(true);
});
