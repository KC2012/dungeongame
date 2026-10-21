import { it, expect, describe } from "vitest";
import {
  newGame,
  addCrawler,
  begin,
  perform,
  makeActor,
  tile,
  hash,
  stat,
} from "../../packages/engine/src/index";
import {
  catalog,
  entry,
  compileEffects,
} from "../../packages/content/src/index";
import { effect } from "../../packages/engine/src/effects";
function setup() {
  const s = newGame(123);
  addCrawler(s, "a", "A", "night_custodian");
  addCrawler(s, "b", "B", "night_custodian");
  begin(s);
  for (const [id, a] of Object.entries(s.actors))
    if (a.kind !== "crawler") delete s.actors[id];
  for (const t of s.tiles) {
    t.kind = "floor";
    t.hazards = {};
    t.tags = [];
  }
  const a = s.actors.a,
    b = s.actors.b;
  a.x = 7;
  a.y = 7;
  b.x = 8;
  b.y = 7;
  a.focus = a.maxFocus = 100;
  a.stats.Might = 20;
  a.hp = 1;
  a.wounds = 1;
  a.statuses.poisoned = { duration: 3, potency: 2, source: "enemy" };
  const enemy = makeActor("e", "Enemy", "enemy", "turnstile_rat", 7, 8);
  enemy.hp = enemy.maxHP = 1000;
  s.actors.e = enemy;
  s.phase = "PLANNING";
  s.objects = [
    {
      id: "device",
      name: "Test device",
      kind: "machine",
      x: 7,
      y: 6,
      hp: 1,
      maxHP: 8,
      powered: true,
      disabled: 0,
      done: false,
      jammed: false,
    },
  ];
  return { s, a, b, enemy };
}
describe("every activatable item performs an actual engine action", () => {
  for (const item of catalog.items.filter((e) => e.kind !== "material"))
    it(item.id, () => {
      const { s, a, b, enemy } = setup();
      a.inventory = [
        { id: item.id, count: 1, durability: 12 },
        { id: "first_aid_pack", count: 1, durability: 12 },
      ];
      if (
        ["weapon", "armor", "trinket"].includes(item.kind) ||
        item.id === "courier_satchel"
      ) {
        expect(perform(s, a, { type: "EQUIP", id: item.id })).toBe(true);
        if (item.kind === "weapon") {
          for (let tries = 0; tries < 20 && enemy.hp === 1000; tries++) {
            a.ap = 3;
            expect(perform(s, a, { type: "ATTACK", target: "e" })).toBe(true);
          }
          expect(enemy.hp).toBeLessThan(1000);
        } else expect(Object.values(a.equipment)).toContain(item.id);
        return;
      }
      const f = compileEffects(item)[0];
      let target =
        f.target === "ally" ? "b" : f.target === "enemy" ? "e" : undefined;
      let p =
        f.target === "tile"
          ? { x: 7, y: 6 }
          : target
            ? s.actors[target]
            : { x: a.x, y: a.y };
      if (f.type === "revive") {
        b.hp = 0;
        b.downed = 2;
      }
      if (f.type === "destroy_tile") tile(s, p)!.kind = "wall";
      const before = hash(s);
      expect(
        perform(s, a, { type: "USE", id: item.id, target, x: p.x, y: p.y }),
        item.id,
      ).toBe(true);
      expect(hash(s)).not.toBe(before);
    });
});
describe("every authored skill has a usable reducer path", () => {
  for (const skill of catalog.abilities)
    it(skill.id, () => {
      const { s, a, b, enemy } = setup();
      a.profession =
        skill.profession === "general" ? undefined : skill.profession;
      a.inventory = [{ id: "first_aid_pack", count: 1, durability: 12 }];
      if (skill.context === "safe_room") s.phase = "SAFE_ROOM";
      const f = compileEffects(skill)[0];
      let target =
        f.target === "enemy" ? "e" : f.target === "ally" ? "b" : undefined;
      let p =
        f.target === "tile"
          ? { x: 7, y: 6 }
          : f.target === "area"
            ? { x: 7, y: 8 }
            : target
              ? s.actors[target]
              : { x: a.x, y: a.y };
      if (["dash", "teleport"].includes(f.type)) p = { x: 7, y: 6 };
      if (f.type === "revive") {
        b.hp = 0;
        b.downed = 2;
      }
      if (f.type === "destroy_tile") tile(s, p)!.kind = "wall";
      const before = hash(s);
      expect(
        perform(s, a, {
          type: "ABILITY",
          id: skill.id,
          target,
          x: p.x,
          y: p.y,
        }),
        skill.id,
      ).toBe(true);
      expect(hash(s)).not.toBe(before);
    });
});
describe("all body paths and professions change effective rules", () => {
  for (const adaptation of catalog.adaptations)
    it(adaptation.id, () => {
      const { s, a } = setup();
      s.floor = 3;
      s.phase = "SAFE_ROOM";
      const before = Object.fromEntries(
        Object.keys(adaptation.bonus).map((k) => [k, stat(a, k)]),
      );
      expect(
        perform(s, a, {
          type: "CHOOSE",
          choice: "adaptation",
          id: adaptation.id,
        }),
      ).toBe(true);
      for (const [key, n] of Object.entries(adaptation.bonus))
        expect(stat(a, key)).toBe(before[key] + Number(n));
    });
  for (const profession of catalog.professions)
    it(profession.id, () => {
      const { s, a } = setup();
      s.floor = 3;
      s.phase = "SAFE_ROOM";
      expect(
        perform(s, a, {
          type: "CHOOSE",
          choice: "profession",
          id: profession.id,
        }),
      ).toBe(true);
      const skill = catalog.abilities.find(
        (e) => e.profession === profession.id,
      )!;
      expect(skill).toBeDefined();
    });
});
