import { describe, it, expect } from "vitest";
import {
  newGame,
  addCrawler,
  begin,
  resolveRound,
  microAction,
  clone,
  hash,
  random,
  seedNumber,
  path,
  los,
  distance,
  tile,
  walkable,
  generateFloor,
  validateFloor,
  makeActor,
  perform,
  canCarry,
  consume,
  give,
} from "../../packages/engine/src/index";
import { accuracy, hurt, push, status } from "../../packages/engine/src/combat";
import { environment, enqueue } from "../../packages/engine/src/environment";
import { effect, revive } from "../../packages/engine/src/effects";
import { emit, award } from "../../packages/engine/src/events";
import {
  catalog,
  compileEffects,
  entry,
  validateCatalog,
  traitModifiers,
  backgroundModifiers,
} from "../../packages/content/src/index";
import type { State, Actor, Action } from "../../packages/engine/src/types";
function fixture() {
  const s = newGame(42);
  const a = addCrawler(s, "a", "A", "night_custodian");
  const b = addCrawler(s, "b", "B", "street_mechanic");
  begin(s);
  for (const id of Object.keys(s.actors))
    if (s.actors[id].kind === "enemy") delete s.actors[id];
  for (const t of s.tiles) {
    t.hazards = {};
    if (t.kind === "wall") t.kind = "floor";
  }
  s.phase = "PLANNING";
  a.x = 7;
  a.y = 7;
  b.x = 8;
  b.y = 7;
  return { s, a, b };
}
function enemy(s: State, x = 9, y = 7) {
  const e = makeActor("e", "Rat", "enemy", "turnstile_rat", x, y);
  e.hp = e.maxHP = 100;
  s.actors.e = e;
  return e;
}
describe("determinism", () => {
  it("replays identical commands to identical state", () => {
    const { s } = fixture();
    const plans = [{ actorId: "a", actions: [{ type: "GUARD" } as Action] }];
    expect(hash(resolveRound(s, plans).state)).toBe(
      hash(resolveRound(s, plans).state),
    );
  });
  it("does not mutate input state", () => {
    const { s } = fixture(),
      before = hash(s);
    resolveRound(s, [
      { actorId: "a", actions: [{ type: "MOVE", x: 6, y: 7 }] },
    ]);
    expect(hash(s)).toBe(before);
  });
  it("named streams are independent", () => {
    const a = newGame(1),
      b = clone(a);
    random(a, "cosmetic", 100);
    expect(random(a, "combat", 100)).toBe(random(b, "combat", 100));
  });
  it("seed changes generation", () => {
    const a = newGame(1),
      b = newGame(2);
    addCrawler(a, "a", "A", "night_custodian");
    addCrawler(b, "a", "A", "night_custodian");
    begin(a);
    begin(b);
    expect(hash(a.tiles)).not.toBe(hash(b.tiles));
  });
  it("canonical hash ignores property insertion order", () =>
    expect(hash({ a: 1, b: 2 })).toBe(hash({ b: 2, a: 1 })));
  it("command changes resulting hash", () => {
    const { s } = fixture();
    expect(hash(resolveRound(s, []).state)).not.toBe(
      hash(
        resolveRound(s, [
          { actorId: "a", actions: [{ type: "MOVE", x: 6, y: 7 }] },
        ]).state,
      ),
    );
  });
  it("plan iteration order does not change results", () => {
    const { s } = fixture();
    const plans = [
      { actorId: "a", actions: [{ type: "MOVE", x: 6, y: 7 } as Action] },
      { actorId: "b", actions: [{ type: "MOVE", x: 9, y: 7 } as Action] },
    ];
    expect(hash(resolveRound(s, plans).state)).toBe(
      hash(resolveRound(s, plans.reverse()).state),
    );
  });
});
describe("grid and AP", () => {
  it("uses four way distance", () =>
    expect(distance({ x: 1, y: 1 }, { x: 2, y: 2 })).toBe(2));
  it("rejects diagonal steps", () => {
    const { s, a } = fixture();
    expect(perform(s, a, { type: "MOVE", x: 6, y: 6 })).toBe(false);
    expect(a.ap).toBe(3);
  });
  it("charges one AP for floor", () => {
    const { s, a } = fixture();
    expect(perform(s, a, { type: "MOVE", x: 6, y: 7 })).toBe(true);
    expect(a.ap).toBe(2);
  });
  it("water costs two AP", () => {
    const { s, a } = fixture();
    tile(s, { x: 6, y: 7 })!.tags = ["wet"];
    perform(s, a, { type: "MOVE", x: 6, y: 7 });
    expect(a.ap).toBe(1);
  });
  it("rubble costs two AP", () => {
    const { s, a } = fixture();
    tile(s, { x: 6, y: 7 })!.kind = "rubble";
    perform(s, a, { type: "MOVE", x: 6, y: 7 });
    expect(a.ap).toBe(1);
  });
  it("rejects AP overspend", () => {
    const { s, a } = fixture();
    a.ap = 0;
    expect(perform(s, a, { type: "GUARD" })).toBe(false);
  });
  it("does not stack actors", () => {
    const { s, a, b } = fixture();
    expect(perform(s, a, { type: "MOVE", x: b.x, y: b.y })).toBe(false);
  });
  it("one claimant wins contested cell", () => {
    const { s, a, b } = fixture();
    a.x = 6;
    b.x = 8;
    const r = resolveRound(s, [
      { actorId: "a", actions: [{ type: "MOVE", x: 7, y: 7 }] },
      { actorId: "b", actions: [{ type: "MOVE", x: 7, y: 7 }] },
    ]).state;
    expect(
      Object.values(r.actors).filter((a) => a.x === 7 && a.y === 7),
    ).toHaveLength(1);
    expect(r.events.some((e) => e.type === "action_rejected")).toBe(true);
  });
  it("explicit allied swap succeeds", () => {
    const { s, a, b } = fixture();
    const r = resolveRound(s, [
      { actorId: "a", actions: [{ type: "MOVE", x: b.x, y: b.y, swap: "b" }] },
      { actorId: "b", actions: [{ type: "MOVE", x: a.x, y: a.y, swap: "a" }] },
    ]).state;
    expect(r.actors.a.x).toBe(8);
    expect(r.actors.b.x).toBe(7);
  });
  it("closed door opens before moving", () => {
    const { s, a } = fixture();
    const t = tile(s, { x: 6, y: 7 })!;
    t.kind = "door";
    t.open = false;
    expect(perform(s, a, { type: "MOVE", x: 6, y: 7 })).toBe(true);
    expect(a.x).toBe(7);
    expect(t.open).toBe(true);
  });
  it("locked door blocks movement", () => {
    const { s, a } = fixture();
    const t = tile(s, { x: 6, y: 7 })!;
    t.kind = "door";
    t.open = false;
    t.locked = true;
    expect(perform(s, a, { type: "MOVE", x: 6, y: 7 })).toBe(false);
  });
  it("finds paths without entering walls", () => {
    const { s } = fixture();
    tile(s, { x: 7, y: 6 })!.kind = "wall";
    const p = path(s, { x: 7, y: 7 }, { x: 7, y: 5 });
    expect(p).not.toContainEqual({ x: 7, y: 6 });
    expect(p.length).toBeGreaterThan(2);
  });
  it("rejects shots through paired corner walls", () => {
    const { s } = fixture();
    tile(s, { x: 8, y: 7 })!.kind = "wall";
    tile(s, { x: 7, y: 8 })!.kind = "wall";
    expect(los(s, { x: 7, y: 7 }, { x: 8, y: 8 })).toBe(false);
  });
  it("allows clear line of sight", () => {
    const { s } = fixture();
    expect(los(s, { x: 7, y: 7 }, { x: 12, y: 7 })).toBe(true);
  });
  it("thick smoke obscures sight", () => {
    const { s } = fixture();
    tile(s, { x: 9, y: 7 })!.hazards.smoke = {
      intensity: 2,
      duration: 2,
      damage: 0,
      source: "test",
    };
    expect(los(s, { x: 7, y: 7 }, { x: 12, y: 7 })).toBe(false);
  });
});
describe("combat and recovery", () => {
  it("accuracy clamps at 95", () => {
    const { a, b } = fixture();
    expect(accuracy(a, b, 999)).toBe(95);
  });
  it("accuracy clamps at 10", () => {
    const { a, b } = fixture();
    expect(accuracy(a, b, -999)).toBe(10);
  });
  it("cover subtracts eight per level", () => {
    const { a, b } = fixture();
    expect(accuracy(a, b, 0, 2)).toBe(accuracy(a, b) - 16);
  });
  it("armor and guard contribute to mitigation", () => {
    const { s, a } = fixture();
    perform(s, a, { type: "GUARD" });
    expect(a.guard).toBe(2);
  });
  it("barrier absorbs damage before HP", () => {
    const { s, a } = fixture();
    a.shield = 4;
    const hp = a.hp;
    hurt(s, a, 6, "physical", "e");
    expect(a.hp).toBe(hp - 2);
    expect(a.shield).toBe(0);
  });
  it("resistance reduces elemental damage", () => {
    const { s, a } = fixture();
    a.stats.fireResist = 3;
    const hp = a.hp;
    hurt(s, a, 5, "fire", "e");
    expect(a.hp).toBe(hp - 2);
  });
  it("immunity deals zero damage", () => {
    const { s, a } = fixture();
    a.stats.fireResist = 999;
    const hp = a.hp;
    hurt(s, a, 5, "fire", "e");
    expect(a.hp).toBe(hp);
  });
  it("first zero HP enters downed window", () => {
    const { s, a } = fixture();
    hurt(s, a, 999, "physical", "e");
    expect(a.downed).toBe(3);
    expect(a.dead).toBe(false);
  });
  it("second down before rest is fatal", () => {
    const { s, a } = fixture();
    a.downs = 1;
    hurt(s, a, 999, "physical", "e");
    expect(a.dead).toBe(true);
  });
  it("revive consumes kit and applies wound", () => {
    const { s, a, b } = fixture();
    b.hp = 0;
    b.downed = 1;
    expect(revive(s, a, b)).toBe(true);
    expect(b.hp).toBe(Math.ceil(b.maxHP * 0.2));
    expect(b.wounds).toBe(1);
    expect(a.inventory.some((i) => i.id === "first_aid_pack")).toBe(false);
    expect(s.events.some((e) => e.type === "revive_final_round")).toBe(true);
  });
  it("revive rejects healthy target", () => {
    const { s, a, b } = fixture();
    expect(revive(s, a, b)).toBe(false);
  });
  it("revive rejects second revival in same floor", () => {
    const { s, a, b } = fixture();
    b.downed = 2;
    b.revivedFloor = s.floor;
    expect(revive(s, a, b)).toBe(false);
  });
  it("full party down ends immediately", () => {
    const { s, a, b } = fixture();
    hurt(s, a, 999, "physical", "e");
    hurt(s, b, 999, "physical", "e");
    expect(resolveRound(s, []).state.result).toBe("DEFEAT");
  });
  it("damage never makes HP negative", () => {
    const { s, a } = fixture();
    hurt(s, a, 9999, "fire", "e");
    expect(a.hp).toBe(0);
  });
  it("direct attacks cannot hit allies", () => {
    const { s, a, b } = fixture();
    expect(perform(s, a, { type: "ATTACK", target: b.id })).toBe(false);
  });
  it("out of range attack refunds AP", () => {
    const { s, a } = fixture();
    enemy(s, 20, 20);
    expect(perform(s, a, { type: "ATTACK", target: "e" })).toBe(false);
    expect(a.ap).toBe(3);
  });
  it("status refreshes duration without stacking potency", () => {
    const { a } = fixture();
    status(a, "burning", 2, 3, "e");
    status(a, "burning", 2, 3, "e");
    expect(a.statuses.burning).toMatchObject({
      duration: 2,
      potency: 3,
      source: "e",
    });
  });
  it("push collides with wall for bounded damage", () => {
    const { s, a } = fixture();
    const e = enemy(s, 8, 7);
    delete s.actors.b;
    tile(s, { x: 9, y: 7 })!.kind = "wall";
    push(s, a, e, 2);
    expect(e.hp).toBe(96);
    expect(e.x).toBe(8);
  });
  it("dead enemies reward XP once", () => {
    const { s, a } = fixture(),
      e = enemy(s);
    hurt(s, e, 999, "physical", a.id);
    const xp = s.xp;
    hurt(s, e, 999, "physical", a.id);
    expect(s.xp).toBe(xp);
  });
  it("no-XP summons do not farm progression", () => {
    const { s, a } = fixture(),
      e = enemy(s);
    e.noReward = true;
    hurt(s, e, 999, "physical", a.id);
    expect(s.xp).toBe(0);
  });
  it("result forbids further rounds", () => {
    const { s } = fixture();
    s.phase = "RESULT";
    s.result = "VICTORY";
    expect(hash(resolveRound(s, []).state)).toBe(hash(s));
  });
});
describe("inventory and services", () => {
  it("unknown content fails closed", () =>
    expect(() => entry("items", "bad")).toThrow());
  it("weight limit prevents overfill", () => {
    const { s, a } = fixture();
    expect(give(s, a, "ceramic_plate", 99)).toBe(false);
  });
  it("consumption cannot go negative", () => {
    const { a } = fixture();
    expect(consume(a, "scrap_metal")).toBe(false);
  });
  it("rest heals only once per floor", () => {
    const { s, a } = fixture();
    s.phase = "SAFE_ROOM";
    a.hp = 1;
    expect(perform(s, a, { type: "REST" })).toBe(true);
    const hp = a.hp;
    expect(perform(s, a, { type: "REST" })).toBe(false);
    expect(a.hp).toBe(hp);
  });
  it("rest preserves wounds", () => {
    const { s, a } = fixture();
    s.phase = "SAFE_ROOM";
    a.wounds = 1;
    perform(s, a, { type: "REST" });
    expect(a.wounds).toBe(1);
  });
  it("medic charges scaled price", () => {
    const { s, a } = fixture();
    s.phase = "SAFE_ROOM";
    a.wounds = 1;
    perform(s, a, { type: "MEDIC" });
    expect(a.wounds).toBe(0);
    expect(s.credits).toBe(7);
  });
  it("profession unavailable before floor three", () => {
    const { s, a } = fixture();
    s.phase = "SAFE_ROOM";
    expect(
      perform(s, a, { type: "CHOOSE", id: "breaker", choice: "profession" }),
    ).toBe(false);
  });
  it("profession persists and cannot be replaced", () => {
    const { s, a } = fixture();
    s.phase = "SAFE_ROOM";
    s.floor = 3;
    expect(
      perform(s, a, { type: "CHOOSE", id: "breaker", choice: "profession" }),
    ).toBe(true);
    expect(
      perform(s, a, { type: "CHOOSE", id: "broker", choice: "profession" }),
    ).toBe(false);
  });
  it("crafting consumes actual ingredients", () => {
    const { s, a } = fixture();
    s.phase = "SAFE_ROOM";
    a.inventory = [];
    give(s, a, "sterile_cloth");
    give(s, a, "scrap_metal");
    expect(perform(s, a, { type: "CRAFT", id: "patch_kit" })).toBe(true);
    expect(a.inventory.map((i) => i.id)).toEqual(["first_aid_pack"]);
    expect(s.events.some((e) => e.type === "craft_complete")).toBe(true);
  });
  it("missing crafting input rejects transaction", () => {
    const { s, a } = fixture();
    s.phase = "SAFE_ROOM";
    const before = hash(a.inventory);
    expect(perform(s, a, { type: "CRAFT", id: "patch_kit" })).toBe(false);
    expect(hash(a.inventory)).toBe(before);
  });
  it("unaffordable purchases do not change inventory", () => {
    const { s, a } = fixture();
    s.phase = "SAFE_ROOM";
    s.credits = 0;
    s.shop = [{ id: "ceramic_plate", count: 1, durability: 12 }];
    expect(perform(s, a, { type: "BUY", id: "ceramic_plate" })).toBe(false);
  });
  it("free healing unavailable during quiet exploration without supplies", () => {
    const { s, a, b } = fixture();
    s.phase = "EXPLORATION";
    a.inventory = [];
    expect(
      perform(s, a, { type: "ABILITY", id: "emergency_bandage", target: "b" }),
    ).toBe(false);
  });
  it("achievement rewards cannot be farmed in same scope", () => {
    const { s } = fixture();
    emit(s, "shock_chain", "a", [], {}, { x: 7, y: 7 });
    award(s, 1);
    const audience = s.audience;
    const first = s.nextEventId;
    emit(s, "shock_chain", "a", [], {}, { x: 7, y: 7 });
    award(s, first);
    expect(s.audience).toBe(audience);
  });
  it("ability outside profession is rejected", () => {
    const { s, a } = fixture();
    expect(
      perform(s, a, { type: "ABILITY", id: "hammer_fall", target: "b" }),
    ).toBe(false);
  });
  it("party shield is capped at twelve", () => {
    const { s, a } = fixture();
    effect(s, a, a, a, { type: "shield", target: "self", magnitude: 100 });
    expect(a.shield).toBe(12);
  });
});
describe("environment gold incidents", () => {
  it("water extinguishes fire", () => {
    const { s } = fixture();
    const p = { x: 15, y: 15 };
    tile(s, p)!.hazards.fire = {
      intensity: 2,
      duration: 3,
      damage: 2,
      source: "e",
    };
    enqueue(s, p, "water", 1, "a");
    environment(s);
    expect(tile(s, p)!.hazards.fire).toBeUndefined();
    expect(s.events.some((e) => e.type === "extinguish_chain")).toBe(true);
  });
  it("cold freezes water", () => {
    const { s } = fixture();
    const p = { x: 15, y: 15 };
    tile(s, p)!.tags = ["wet"];
    enqueue(s, p, "cold", 2, "a");
    environment(s);
    expect(tile(s, p)!.tags).toContain("ice");
  });
  it("blast breaches brittle walls", () => {
    const { s } = fixture();
    const p = { x: 15, y: 15 };
    tile(s, p)!.kind = "wall";
    tile(s, p)!.hp = 4;
    enqueue(s, p, "blast", 2, "a", 6);
    environment(s);
    expect(tile(s, p)!.kind).toBe("rubble");
  });
  it("gas ignites once and is consumed", () => {
    const { s } = fixture();
    const p = { x: 15, y: 15 };
    tile(s, p)!.tags = ["gas"];
    enqueue(s, p, "fire", 2, "a");
    environment(s);
    expect(tile(s, p)!.tags).not.toContain("gas");
    expect(s.events.filter((e) => e.type === "gas_ignition")).toHaveLength(1);
  });
  it("shock network is bounded at eight cells", () => {
    const { s } = fixture();
    for (let x = 10; x < 25; x++) tile(s, { x, y: 15 })!.tags = ["wet"];
    enqueue(s, { x: 10, y: 15 }, "shock", 2, "a");
    environment(s);
    expect(s.tiles.filter((t) => t.hazards.shock).length).toBeLessThanOrEqual(
      8,
    );
    expect(s.events.some((e) => e.type === "shock_chain")).toBe(true);
  });
  it("dry ally is safe from a wet network", () => {
    const { s, a, b } = fixture();
    a.x = 15;
    a.y = 15;
    b.x = 15;
    b.y = 17;
    tile(s, a)!.tags = ["wet"];
    tile(s, { x: 16, y: 15 })!.tags = ["wet"];
    const hp = b.hp;
    enqueue(s, a, "shock", 2, "e");
    environment(s);
    expect(b.hp).toBe(hp);
  });
  it("wet metal receives conductive bonus", () => {
    const { s, a } = fixture();
    a.tags = ["metal"];
    tile(s, a)!.tags = ["wet"];
    const hp = a.hp;
    hurt(s, a, 6, "shock", "e", true);
    expect(a.hp).toBe(hp - 9);
  });
  it("environmental damage can hit allies", () => {
    const { s, a } = fixture();
    const hp = a.hp;
    enqueue(s, a, "blast", 1, "b", 4);
    environment(s);
    expect(a.hp).toBe(hp - 4);
  });
  it("water shorts powered machines", () => {
    const { s } = fixture();
    const o = s.objects.find((o) => o.kind === "machine")!;
    enqueue(s, o, "water", 1, "a");
    environment(s);
    expect(o.powered).toBe(false);
    expect(s.events.some((e) => e.type === "short_circuit")).toBe(true);
  });
  it("budget overflow is deferred and diagnosed", () => {
    const { s } = fixture();
    for (let y = 0; y < 30; y++)
      for (let x = 0; x < 30; x++) enqueue(s, { x, y }, "smoke", 1, "a");
    environment(s);
    expect(s.deferredEvents.length).toBeGreaterThan(0);
    expect(s.events.some((e) => e.type === "environment_budget")).toBe(true);
  });
});
describe("catalog contracts", () => {
  it("validates all authored content and references", () =>
    expect(validateCatalog()).toEqual([]));
  for (const kind of ["items", "abilities"])
    for (const e of catalog[kind])
      it(`compiles ${kind}:${e.id} exhaustively`, () => {
        const effects = compileEffects(e);
        expect(effects.length).toBeGreaterThan(0);
        for (const f of effects) {
          if (f.type === "modify_stat") expect(f.stat).toBeTruthy();
          if (f.type === "apply_status") expect(f.status).toBeTruthy();
        }
        if (kind === "items") expect(traitModifiers[e.trait]).toBeDefined();
      });
  for (const bg of catalog.backgrounds)
    it(`supports background ${bg.id}`, () => {
      const s = newGame(1);
      const a = addCrawler(s, "a", "A", bg.id);
      expect(a.hp).toBe(20 + 4 * a.stats.Might);
      expect(backgroundModifiers[bg.trait]).toBeDefined();
    });
});
describe("procedural seed sweep", () => {
  for (let floor = 1; floor <= 6; floor++)
    it(`100 deterministic connected floor ${floor} layouts`, () => {
      for (let seed = 0; seed < 100; seed++) {
        const s = newGame(seed);
        addCrawler(s, "a", "A", "night_custodian");
        s.floor = floor;
        generateFloor(s);
        expect(validateFloor(s)).toEqual([]);
        expect(s.objects.filter((o) => o.kind === "alternate")).toHaveLength(
          catalog.floors[floor - 1].alternateBoss.operations.length,
        );
      }
    }, 20000);
});
