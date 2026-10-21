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
