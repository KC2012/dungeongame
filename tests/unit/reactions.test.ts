import { it, expect } from "vitest";
import {
  newGame,
  addCrawler,
  begin,
  makeActor,
  resolveRound,
  perform,
  tile,
  hash,
} from "../../packages/engine/src/index";
import { enqueue, environment } from "../../packages/engine/src/environment";
import { effect } from "../../packages/engine/src/effects";
import { award } from "../../packages/engine/src/events";
import { catalog } from "../../packages/content/src/index";
function setup() {
  const s = newGame(19);
  addCrawler(s, "a", "A", "night_custodian");
  addCrawler(s, "b", "B", "night_custodian");
  begin(s);
  for (const t of s.tiles) {
    t.kind = "floor";
    t.tags = [];
    t.hazards = {};
  }
  for (const id of Object.keys(s.actors))
    if (s.actors[id].kind === "enemy") delete s.actors[id];
  const a = s.actors.a,
    b = s.actors.b;
  a.x = 7;
  a.y = 7;
  b.x = 7;
  b.y = 8;
  const e = makeActor("e", "Plated rat", "enemy", "turnstile_rat", 8, 8);
  e.tags = ["metal"];
  e.hp = e.maxHP = 20;
  s.actors.e = e;
  s.phase = "PLANNING";
  return { s, a, b, e };
}
it("electric water incident: flood, circuit, plated enemy shove and protected ally", () => {
  const { s, a, b, e } = setup();
  for (const p of [
    { x: 8, y: 7 },
    { x: 9, y: 7 },
    { x: 9, y: 8 },
  ])
    tile(s, p)!.tags = ["wet"];
  e.x = 8;
  e.y = 8;
  effect(s, a, b, b, { type: "shield", magnitude: 6, target: "ally" });
  effect(s, a, e, e, { type: "push", magnitude: 1, target: "enemy" });
  enqueue(s, { x: 8, y: 7 }, "shock", 2, a.id);
  const hp = b.hp;
  environment(s);
  award(s, 1);
  expect(s.events.filter((e) => e.type === "shock_chain")).toHaveLength(1);
  expect(b.hp).toBe(hp);
  expect(s.achievements).toContain("improvised_conductor");
  expect(
    s.events.filter(
      (v) =>
        v.type === "damage" &&
        v.targetIds.includes("e") &&
        v.payload.element === "shock",
    ),
  ).toHaveLength(1);
});
it("failed trade is confirmed by capacity validation", () => {
  const { s, a, b } = setup();
  b.stats.Might = -10;
  expect(
    perform(s, a, { type: "GIVE", target: "b", id: "first_aid_pack" }),
  ).toBe(false);
  award(s, 1);
  expect(s.achievements).toContain("no_refunds");
});
it("vendor refusal is emitted by an actual attempted purchase", () => {
  const { s, a } = setup();
  s.phase = "SAFE_ROOM";
  s.credits = 0;
  s.shop = [{ id: "pulse_carbine", count: 1, durability: 12 }];
  expect(perform(s, a, { type: "BUY", id: "pulse_carbine" })).toBe(false);
  award(s, 1);
  expect(s.achievements).toContain("refund_denied");
});
it("trapped door kill comes from a triggered door trap", () => {
  const { s, a, e } = setup();
  e.hp = 1;
  tile(s, e)!.kind = "door";
  tile(s, e)!.open = true;
  tile(s, e)!.trap = { owner: a.id, damage: 5 };
  environment(s);
  expect(e.dead).toBe(true);
  expect(s.events.some((e) => e.type === "door_trap_kill")).toBe(true);
});
it("support enemy defeat uses the actual catalog AI", () => {
  const { s, a, e } = setup();
  const support = catalog.monsters.find((m) => m.ai === "support")!;
  e.catalogId = support.id;
  e.hp = 1;
  a.stats.accuracy = 1000;
  for (let i = 0; i < 10 && !e.dead; i++) {
    a.ap = 3;
    perform(s, a, { type: "ABILITY", id: "throw_debris", target: e.id });
  }
  expect(s.events.some((e) => e.type === "support_enemy_defeat")).toBe(true);
});
it("shock multi-target requires two distinct hurt entities", () => {
  const { s, a, b } = setup();
  tile(s, a)!.tags = ["wet"];
  tile(s, b)!.tags = ["wet"];
  enqueue(s, a, "shock", 2, "hazard");
  environment(s);
  award(s, 1);
  expect(s.events.some((e) => e.type === "shock_multi_target")).toBe(true);
});
it("two accepted gifts require consent for the trade-twice hook", () => {
  const { s, a, b } = setup();
  for (const id of ["water_bladder", "first_aid_pack"]) {
    perform(s, a, { type: "GIVE", target: b.id, id });
    const request = s.tradeRequests!.at(-1)!;
    expect(
      perform(s, b, { type: "TRADE", id: request.id, choice: "accept" }),
    ).toBe(true);
  }
  expect(s.events.filter((e) => e.type === "trade_twice")).toHaveLength(1);
});
