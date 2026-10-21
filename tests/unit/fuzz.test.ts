import { it, expect } from "vitest";
import {
  newGame,
  addCrawler,
  begin,
  emptyTile,
  makeActor,
  resolveRound,
  random,
  clone,
  hash,
} from "../../packages/engine/src/index";
import { catalog } from "../../packages/content/src/index";
import type { Action } from "../../packages/engine/src/types";
it("10,000 randomized tactical rounds preserve resources, bounds, transaction uniqueness and replay determinism", async () => {
  let s = newGame(937, "fuzz");
  for (let i = 0; i < 4; i++) {
    const a = addCrawler(s, "p" + i, "P" + i, "street_mechanic");
    a.profession = i % 2 ? "circuiter" : "field_surgeon";
    a.hp = a.maxHP = 1e9;
    a.stats.Might = 20;
    a.focus = a.maxFocus = 50;
    a.inventory = [
      { id: "mop_pole", count: 1, durability: 12 },
      { id: "first_aid_pack", count: 3, durability: 12 },
      { id: "water_bladder", count: 3, durability: 12 },
      { id: "shock_cell", count: 3, durability: 12 },
      { id: "scrap_metal", count: 2, durability: 12 },
      { id: "sterile_cloth", count: 2, durability: 12 },
      { id: "portable_bench", count: 1, durability: 12 },
    ];
  }
  begin(s);
  s.width = s.height = 9;
  s.tiles = Array.from({ length: 81 }, () => ({
    ...emptyTile("floor", 0),
    explored: true,
  }));
  s.objects = [
    {
      id: "machine",
      name: "Machine",
      kind: "machine",
      x: 5,
      y: 4,
      done: false,
      hp: 8,
      maxHP: 8,
      powered: true,
      jammed: false,
      disabled: 0,
    },
  ];
  for (const [id, a] of Object.entries(s.actors)) {
    if (a.kind === "enemy") delete s.actors[id];
    else {
      const i = Number(id[1]);
      a.x = 2 + (i % 2);
      a.y = 2 + Math.floor(i / 2);
    }
  }
  const e = makeActor("enemy", "Enemy", "enemy", "turnstile_rat", 6, 6);
  e.hp = e.maxHP = 1e9;
  s.actors.enemy = e;
  const rng = { rng: { fuzz: 12345 } };
  let outcomes = 0;
  for (let round = 0; round < 10000; round++) {
    if (round % 100 === 0)
      await new Promise<void>((resolve) => setImmediate(resolve));
    s.phase = "PLANNING";
    const plans = ["p0", "p1", "p2", "p3"].map((actorId, i) => {
      const a = s.actors[actorId];
      const commands: Action[] = [];
      for (let j = 0; j < 2; j++) {
        const choice = random(rng, "fuzz", 12),
          peer = "p" + ((i + 1) % 4),
          id = catalog.items[random(rng, "fuzz", catalog.items.length)].id;
        const actions: Action[] = [
          {
            type: "MOVE",
            x: a.x + random(rng, "fuzz", 3) - 1,
            y: a.y + random(rng, "fuzz", 3) - 1,
          },
          { type: "GUARD" },
          { type: "DODGE" },
          { type: "ATTACK", target: "enemy" },
          {
            type: "ABILITY",
            id: catalog.abilities[random(rng, "fuzz", catalog.abilities.length)]
              .id,
            target: random(rng, "fuzz", 2) ? "enemy" : peer,
            x: random(rng, "fuzz", 9),
            y: random(rng, "fuzz", 9),
          },
          { type: "ABILITY", id: "unknown_skill", target: "enemy" },
          { type: "USE", id, target: peer },
          { type: "CRAFT", id: "patch_kit" },
          { type: "GIVE", id, target: peer },
          {
            type: "TRADE",
            id:
              s.tradeRequests?.find((r) => r.to === actorId && !r.resolved)
                ?.id ?? "missing",
            choice: "accept",
          },
          { type: "INTERACT", id: "machine" },
          { type: "OVERWATCH" },
        ];
        commands.push(actions[choice]);
      }
      return { actorId, actions: commands };
    });
    const before = round % 100 === 0 ? clone(s) : undefined;
    const out = resolveRound(s, plans);
    s = out.state;
    if (before)
      expect(hash(resolveRound(before, plans.slice().reverse()).state)).toBe(
        hash(s),
      );
    outcomes += out.events.filter((e) =>
      ["cast", "move", "hit", "trade_completed", "craft_complete"].includes(
        e.type,
      ),
    ).length;
    for (const a of Object.values(s.actors)) {
      if (
        !Number.isFinite(a.hp) ||
        a.hp < 0 ||
        a.hp > a.maxHP ||
        a.focus < 0 ||
        a.focus > a.maxFocus ||
        a.ap < 0 ||
        a.ap > 3 ||
        a.inventory.some((i) => i.count < 1 || !Number.isInteger(i.count))
      )
        throw Error("Resource invariant on fuzz round " + round);
    }
    if (new Set(s.transactions).size !== s.transactions.length)
      throw Error("Duplicate transaction");
  }
  expect(outcomes).toBeGreaterThan(1000);
  expect(s.revision).toBe(10001);
}, 180000);
it("an unknown skill becomes a refunded rejection without aborting the shared round", () => {
  const s = newGame(1);
  addCrawler(s, "a", "A", "night_custodian");
  begin(s);
  s.phase = "PLANNING";
  const out = resolveRound(s, [
    {
      actorId: "a",
      actions: [{ type: "ABILITY", id: "not_a_skill" }, { type: "GUARD" }],
    },
  ]).state;
  expect(out.round).toBe(1);
  expect(out.actors.a.ap).toBe(2);
  expect(out.events.some((e) => e.type === "action_rejected")).toBe(true);
});
