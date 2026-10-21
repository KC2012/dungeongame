import { it, expect } from "vitest";
import { catalog } from "../../packages/content/src/index";
import {
  newGame,
  addCrawler,
  begin,
  makeActor,
  perform,
  resolveRound,
  tile,
  clone,
  random,
} from "../../packages/engine/src/index";
import type { State, Actor, Action } from "../../packages/engine/src/types";
import { effect } from "../../packages/engine/src/effects";
import { hurt, attack, status, push } from "../../packages/engine/src/combat";
import { environment, enqueue } from "../../packages/engine/src/environment";
import { award } from "../../packages/engine/src/events";
function setup(players = 2) {
  const s = newGame(3);
  for (let i = 0; i < players; i++)
    addCrawler(s, "p" + i, "Actor " + i, "street_mechanic");
  begin(s);
  for (const t of s.tiles) {
    t.kind = "floor";
    t.hazards = {};
    t.tags = [];
    t.room = 0;
  }
  for (const [id, a] of Object.entries(s.actors))
    if (a.kind !== "crawler") delete s.actors[id];
  const party = Object.values(s.actors);
  party.forEach((a, i) => {
    a.x = 5 + (i % 2);
    a.y = 5 + Math.floor(i / 2);
    a.hp = a.maxHP = 100;
    a.inventory = [];
    a.equipment = { weapon: "mop_pole" };
    a.inventory.push({ id: "mop_pole", count: 1, durability: 12 });
    a.stats.accuracy = 1000;
    a.focus = a.maxFocus = 50;
    a.ap = 3;
  });
  const a = party[0],
    b = party[1] ?? a;
  const e = makeActor("enemy", "Enemy", "enemy", "turnstile_rat", 7, 5);
  e.hp = e.maxHP = 1;
  s.actors[e.id] = e;
  s.objects = [];
  s.phase = "PLANNING";
  s.events = [];
  s.nextEventId = 1;
  return { s, a, b, e, party };
}
function obj(
  s: State,
  id: string,
  kind: "machine" | "objective" | "alternate" | "secret" | "cache",
  x = 5,
  y = 4,
) {
  const o = {
    id,
    name: id,
    kind,
    x,
    y,
    operation: id,
    done: false,
    hp: 8,
    maxHP: 8,
    powered: true,
    disabled: 0,
    jammed: false,
  };
  s.objects.push(o);
  return o;
}
function finish(s: State) {
  award(s, 1);
  return s;
}
function alt() {
  const { s, a } = setup();
  s.objective = [...catalog.floors[0].requiredObjective.sources];
  const operations = catalog.floors[0].alternateBoss.operations;
  operations.forEach((id: string, i: number) =>
    obj(s, id, "alternate", 5 + i, 4 + i),
  );
  const boss = makeActor(
    "boss",
    "Marshal",
    "enemy",
    catalog.floors[0].boss,
    8,
    8,
  );
  boss.tags = ["boss"];
  s.actors.boss = boss;
  for (const id of operations) {
    a.ap = 3;
    expect(perform(s, a, { type: "INTERACT", id })).toBe(true);
  }
  return finish(s);
}
function killed(kind = "normal") {
  const { s, a, e, party } = setup();
  if (kind === "support")
    e.catalogId = catalog.monsters.find((e) => e.ai === "support")!.id;
  if (kind === "frozen") status(e, "chilled", 2, 1, a.id);
  if (kind === "zero") party.forEach((v) => (v.focus = 0));
  if (kind === "long") s.counters.encounterStart = s.round - 21;
  hurt(s, e, 10, "physical", a.id, true);
  return finish(s);
}
function circuit() {
  const { s, a, e } = setup();
  a.x = 5;
  a.y = 5;
  e.x = 6;
  e.y = 5;
  e.hp = 100;
  tile(s, a)!.tags = ["wet"];
  tile(s, e)!.tags = ["wet"];
  enqueue(s, a, "shock", 2, a.id);
  environment(s);
  return finish(s);
}
function shorted() {
  const { s, a } = setup();
  const machine = obj(s, "machine", "machine");
  enqueue(s, machine, "water", 1, a.id);
  environment(s);
  return finish(s);
}
function breach() {
  const { s, a } = setup();
  const p = { x: 8, y: 8 };
  tile(s, p)!.kind = "wall";
  tile(s, p)!.hp = 1;
  enqueue(s, p, "blast", 1, a.id, 8);
  environment(s);
  return finish(s);
}
function ignition(gas = false, acid = false) {
  const { s, a } = setup(),
    p = { x: 8, y: 8 };
  tile(s, p)!.tags = [gas ? "gas" : "volatile"];
  if (acid)
    tile(s, p)!.hazards.acid = {
      intensity: 2,
      duration: 3,
      damage: 3,
      source: "acid",
    };
  enqueue(s, p, "fire", 2, a.id);
  environment(s);
  return finish(s);
}
function hack() {
  const { s, a } = setup();
  const o = obj(s, "scanner_hack", "objective");
  a.stats.Wit = 30;
  while (true) {
    const draft = clone(s);
    if (random(draft, "combat", 20) !== 0) break;
    random(s, "combat", 20);
  }
  expect(
    effect(s, a, undefined, o, { type: "hack", magnitude: 2, target: "tile" }),
  ).toBe(true);
  return finish(s);
}
function objective(floor = 1, count = 0, id = "scanner_hack") {
  const { s, a } = setup();
  s.floor = floor;
  s.objective = catalog.floors[floor - 1].requiredObjective.sources.slice(
    0,
    count,
  );
  const o = obj(s, id, "objective");
  expect(perform(s, a, { type: "INTERACT", id: o.id })).toBe(true);
  return finish(s);
}
function shielded(shock = false) {
  const { s, a, b } = setup();
  a.hp = 5;
  effect(s, b, a, a, { type: "shield", magnitude: 5, target: "ally" });
  hurt(s, a, 9, shock ? "shock" : "physical", "enemy", true);
  expect(a.hp).toBe(1);
  return finish(s);
}
function victory(players = 1, casualty = false) {
  const { s, party } = setup(players);
  s.phase = "SAFE_ROOM";
  s.floor = 6;
  s.objective = ["disable_feed", "break_array", "sever_uplink"];
  s.bossDefeated = true;
  if (casualty) {
    party.at(-1)!.dead = true;
    party.at(-1)!.hp = 0;
  }
  for (const actor of party.filter((v) => !v.dead)) {
    actor.ap = 3;
    perform(s, actor, { type: "DESCEND" });
  }
  expect(s.result).toBe("VICTORY");
  return finish(s);
}
function revive(last = false) {
  const { s, a, b } = setup();
  b.hp = 0;
  b.downed = last ? 1 : 2;
  a.inventory.push({ id: "first_aid_pack", count: 1, durability: 12 });
  expect(perform(s, a, { type: "REVIVE", target: b.id })).toBe(true);
  return finish(s);
}
const fixtures: Record<string, () => State> = {
  shock_chain: circuit,
  shock_multi_target: circuit,
  short_circuit: shorted,
  shock_machine: shorted,
  wall_break: breach,
  breach_route: breach,
  alternate_boss: alt,
  pacify_encounter: alt,
  boss_noncombat: alt,
  no_damage_room: () => killed(),
  room_zero_damage: () => killed(),
  zero_focus_victory: () => killed("zero"),
  support_enemy_defeat: () => killed("support"),
  fragile_enemy_shatter: () => killed("frozen"),
  long_encounter_survival: () => killed("long"),
  explosion_chain: () => ignition(),
  gas_ignition: () => ignition(true),
  acid_fire_chain: () => ignition(true, true),
  objective_hack: hack,
  objective_exploit: hack,
  hard_check_success: hack,
  scanner_bypass: () => objective(),
  multiple_checks: () => objective(1, 1, "warden_override"),
  multi_key_objective: () => objective(1, 2, "warden_override"),
  evidence_complete: () => objective(5, 2, "broker_favor"),
  stealth_vault: () => objective(5, 0, "ledger_vault"),
  ally_saved: () => shielded(),
  guard_ally: () => shielded(),
  shock_ally_saved: () => shielded(true),
  revive_ally: () => revive(),
  revive_final_round: () => revive(true),
  finish_floor_six: () => victory(),
  solo_win: () => victory(),
  all_survive: () => victory(4),
  four_player_win: () => victory(4),
  survive_with_casualty: () => victory(4, true),
  first_death: () => {
    const { s, a } = setup();
    a.downs = 1;
    hurt(s, a, 999, "physical", "enemy", true);
    return finish(s);
  },
  failed_trade: () => {
    const { s, a, b } = setup();
    a.inventory.push({ id: "first_aid_pack", count: 1, durability: 12 });
    b.stats.Might = -10;
    perform(s, a, { type: "GIVE", id: "first_aid_pack", target: b.id });
    return finish(s);
  },
  vendor_refused: () => {
    const { s, a } = setup();
    s.phase = "SAFE_ROOM";
    s.credits = 0;
    perform(s, a, { type: "BUY", id: "pulse_carbine" });
    return finish(s);
  },
  flood_room: () => {
    const { s, a } = setup();
    enqueue(s, { x: 8, y: 8 }, "water", 2, a.id);
    environment(s);
    return finish(s);
  },
  trap_trigger_self: () => {
    const { s, a } = setup();
    tile(s, a)!.hazards.physical = {
      intensity: 1,
      duration: 2,
      damage: 4,
      source: "spiked_grate",
    };
    environment(s);
    return finish(s);
  },
  machine_disable: () => {
    const { s, a } = setup();
    const o = obj(s, "machine", "machine");
    effect(s, a, undefined, o, {
      type: "disable_machine",
      magnitude: 1,
      target: "tile",
    });
    return finish(s);
  },
  shield_multi_ally: () => {
    const { s, a } = setup();
    effect(s, a, undefined, a, {
      type: "shield",
      target: "party",
      magnitude: 5,
    });
    return finish(s);
  },
  quick_plan: () => {
    const { s, a, b } = setup();
    return resolveRound(s, [
      { actorId: a.id, actions: [{ type: "GUARD" }] },
      { actorId: b.id, actions: [{ type: "GUARD" }] },
    ]).state;
  },
  push_hazard_kill: () => {
    const { s, a, e } = setup();
    a.x = 6;
    a.y = 5;
    tile(s, { x: 8, y: 5 })!.hazards.fire = {
      intensity: 1,
      duration: 2,
      damage: 4,
      source: a.id,
    };
    push(s, a, e, 1);
    return finish(s);
  },
  poison_self: () => {
    const { s, a } = setup();
    enqueue(s, a, "poison", 1, a.id);
    environment(s);
    return finish(s);
  },
  secret_discovery: () => {
    const { s, a } = setup();
    obj(s, "hidden_archive", "secret");
    perform(s, a, { type: "INTERACT", id: "hidden_archive" });
    return finish(s);
  },
  improvised_weapon_kill: () => {
    const { s, a, e } = setup();
    for (let n = 0; n < 20 && !e.dead; n++) {
      a.ap = 3;
      perform(s, a, { type: "ATTACK", target: e.id });
    }
    return finish(s);
  },
  device_combo: () => alt(),
  loot_low_rarity: () => {
    const { s, a } = setup();
    const o = obj(s, "cache", "cache") as any;
    o.items = [{ id: "first_aid_pack", count: 1, durability: 12 }];
    perform(s, a, { type: "INTERACT", id: o.id });
    return finish(s);
  },
  audience_threshold: () => {
    const s = circuit();
    s.achievementKeys = [];
    s.achievements = [];
    s.counters = {};
    s.audience = 24;
    return finish(s);
  },
  projectile_deflected: () => {
    const { s, a, e } = setup();
    a.stats.dodge = 1000;
    a.equipment.offhand = "riot_shield";
    a.reaction = "GUARD";
    for (
      let n = 0;
      n < 20 && !s.events.some((e) => e.type === "projectile_deflected");
      n++
    )
      attack(s, e, a, 2, "physical", 5);
    return finish(s);
  },
  door_trap_kill: () => {
    const { s, a, e } = setup();
    const t = tile(s, e)!;
    t.kind = "door";
    t.open = true;
    t.trap = { owner: a.id, damage: 9 };
    environment(s);
    return finish(s);
  },
  extinguish_chain: () => {
    const { s, a } = setup();
    const p = { x: 8, y: 8 };
    tile(s, p)!.hazards.fire = {
      intensity: 2,
      duration: 2,
      damage: 2,
      source: "world",
    };
    enqueue(s, p, "water", 1, a.id);
    environment(s);
    return finish(s);
  },
  trade_twice: () => {
    const { s, a, b } = setup();
    for (const id of ["first_aid_pack", "water_bladder"]) {
      a.inventory.push({ id, count: 1, durability: 12 });
      a.ap = 3;
      b.ap = 3;
      perform(s, a, { type: "GIVE", id, target: b.id });
      perform(s, b, {
        type: "TRADE",
        id: s.tradeRequests!.at(-1)!.id,
        choice: "accept",
      });
    }
    return finish(s);
  },
  locked_path_bypass: () => {
    const { s, a } = setup();
    const p = { x: 5, y: 4 };
    const t = tile(s, p)!;
    t.kind = "door";
    t.locked = true;
    t.open = false;
    a.inventory.push({ id: "badge_fragment", count: 1, durability: 12 });
    perform(s, a, { type: "MOVE", ...p });
    return finish(s);
  },
  slide_enemy: () => {
    const { s, a, e } = setup();
    a.x = 6;
    tile(s, { x: 8, y: 5 })!.tags = ["ice"];
    push(s, a, e, 1);
    return finish(s);
  },
  boss_telegraph_avoid: () => {
    const { s, a } = setup();
    s.objective = [...catalog.floors[0].requiredObjective.sources];
    const boss = makeActor(
      "boss",
      "Marshal",
      "enemy",
      catalog.floors[0].boss,
      8,
      8,
    );
    boss.hp = boss.maxHP = 95;
    boss.tags = ["boss"];
    boss.alert = true;
    boss.telegraph = [{ x: 1, y: 1 }];
    s.actors.boss = boss;
    return resolveRound(s, [{ actorId: a.id, actions: [{ type: "GUARD" }] }])
      .state;
  },
  water_push: () => {
    const { s, a, e } = setup();
    a.inventory.push({ id: "water_bladder", count: 1, durability: 12 });
    perform(s, a, { type: "USE", id: "water_bladder", x: 8, y: 5 });
    push(s, s.actors[a.id], s.actors[e.id], 1);
    return finish(s);
  },
  four_unique_assists: () => {
    const { s, party } = setup(4);
    party.forEach((a, i) =>
      effect(s, a, party[(i + 1) % 4], party[(i + 1) % 4], {
        type: "shield",
        target: "ally",
        magnitude: 5,
      }),
    );
    return finish(s);
  },
};
for (const hook of catalog.achievement_events)
  it(`achievement hook ${hook.id}: confirmed source and authored reward`, () => {
    const fixture = fixtures[hook.id];
    expect(fixture, hook.id + " has no fixture").toBeDefined();
    const state = fixture();
    expect(
      state.events.some((e) => e.type === hook.id),
      hook.id + " has no confirmed outcome",
    ).toBe(true);
    expect(
      state.achievements,
      hook.id + " failed to match its authored achievement",
    ).toContain(hook.achievement);
  });
